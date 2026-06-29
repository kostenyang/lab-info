# Incident 2026-06-29 — VCFA appliance 不穩 / region-quota 失敗 根因 = outer 叢集 CPU 超賣;批次 vMotion 害 nested ESXi PSOD

## TL;DR
VCFA(VCF Automation)provider 的 **org region-quota 一直失敗、provider portal 時通時斷**,根因**不是 VCFA 的 bug**,而是 appliance 所在的 **outer `SELAB-Cluster` CPU 嚴重超賣(4.3x,三組人的 nested lab 同時跑)** → vcf-m02 的 nested ESXi 搶不到 CPU → 處理不了 nested vSAN I/O(寫延遲 122–442ms)→ etcd 達不到 `<10ms` fsync → VCFA 單節點 k8s 控制平面死亡螺旋 → Event Broker(kafka)起不來 → quota activity 栽掉。
修法(只動自己、不碰別組/共用 policy):**CPU+disk shares 調 High、nested ESXi 改 FTT=0、把 vcf-m02 固定到專用 host**。load 從 **456 → 67**。
**血的教訓**:後續為淨空 host 一次批次驅逐多台別組重 VM,瞬間 load 尖峰把一台 nested ESXi **PSOD**,連帶打掛整個 VCFA。→ **4 台 nested ESXi 絕不批次 vMotion**。

## 環境座標
- appliance:`kosten-vcf91-vcfa-platform-*`(管理 IP **192.168.114.80**,單節點 k8s 跑整個 VCFA);provider portal `https://kosten-vcf91-auto.rtolab.local/provider/`(DNS → **.77**,org=`system`、admin/`VMware1!VMware1!`)。
- inner cluster `vcf-m02-cl01`,4 台 nested ESXi host `kosten-vcf91-esx01~04`(.14/.15/.16/.17)。
- outer:`SELAB-Cluster`,vCenter **172.16.10.100**(SSO `administrator@vmwaresso.taiwan` / `381VMware1!admin`);nested ESXi VM = `vcf-m02-esx01~04-91`,磁碟在 `vsanDatastore-RTO`。

## 怎麼登 appliance 除錯(cheatsheet)
- **SSH 帳號只有 `vmware-system-user`**(密碼 `VMware1!VMware1!`);`root`/`admin` 的 SSH 都被拒(keyboard-interactive denied)。登入後 `sudo` 拿 root。
- 從 Windows 用 Posh-SSH:`New-SSHSession -ComputerName 192.168.114.80 -Credential (vmware-system-user/VMware1!VMware1!) -AcceptKey -Force`
- kubectl=`/usr/local/bin/kubectl`,kubeconfig=`/etc/kubernetes/admin.conf`(要 sudo):
  ```bash
  K="echo VMware1!VMware1! | sudo -S kubectl --kubeconfig=/etc/kubernetes/admin.conf"
  uptime                                                   # load(>24 即超賣;曾飆 456/584)
  eval $K get pods -A | awk '{print $4}'|sort|uniq -c      # pod 相位統計
  eval $K get pods -A | grep -vE "Running|Completed"       # 不健康的
  eval $K get pods -n kube-system | grep -E "etcd|apiserver|kube-vip"  # 控制平面 restart 數
  ```
- **注意**:load 高到 ~300+ 時 SSH/kubectl 會直接 timeout(apiserver 餵不動)——這時的 `CreateContainerConfigError`/`ImagePullBackOff`/CrashLoop 都是 overload 下游症狀,**別硬戳**,等 load 降會自癒。

## 除錯流程 SOP(症狀 → 根因 決策樹)
> VCFA provider 503/時通時斷、region-quota 失敗、pod 一堆 CrashLoop/CreateContainerError 時,**照順序**走,不要先去戳 pod。

1. **量 appliance load**(SSH 進 .80,`uptime`)。
   - load ≫ 24(本案曾 300~584)→ 是 overload,**往下找根因,別動 pod**。SSH/kubectl 若直接 timeout = apiserver 已被餵不動,更證明 overload。
2. **看控制平面**(`kubectl get pods -n kube-system | grep -E "etcd|apiserver|kube-vip"`)。
   - etcd/apiserver restart 數狂跳(本案 9 天 700~900 次)→ 控制平面死亡螺旋,根因在儲存/CPU。
3. **量磁碟延遲**(`iostat -x 1 2`)。
   - write `await` ≫ 10ms(本案 122~442ms)→ nested vSAN 太慢 → 根因在 **outer**,跳第 4 步。
4. **連 outer vCenter 172.16.10.100** 量三件事:
   - 叢集 CPU 超賣率(總 vCPU ÷ 實體核;本案 4.3x)+ 各 host CPU%(83~100% 即滿)。
   - nested ESXi VM 的 **CPU ready %**(`Get-Stat cpu.ready.summation`;>5~10% 即搶不到 CPU,本案 33%)。
   - outer vSAN 容量(排除滿載)+ 預設 policy **FTT**(=1 則寫入翻倍)。
5. **確診 = outer CPU 超賣 / nested ESXi 餓 CPU** → 套修法:CPU+disk shares High、nested ESXi FTT=0、固定到專用 host(見下節)。load 應快速下降。
6. **若某台 nested ESXi `guestToolsNotRunning` / inner host `NotResponding`** → PSOD/halt。查該 VM 事件有無 `The CPU has been disabled by the guest operating system` → outer `Restart-VM`(硬 reset)救回,等它 ping→443→inner Connected。
7. **修完別急著重啟 pod** → load 一降,`CreateContainerConfigError`/`ImagePullBackOff`/CrashLoop 會隨控制平面穩定自癒(kubelet 自動重試)。provider 回 302 = 已癒。

## 根因診斷(從 outer vCenter 量)
- `SELAB-Cluster` 6×16=96 實體核,卻開 **409 vCPU = 4.3x**,6 台全 83–100% 滿。三組 lab:`vcf-m02-esx*`、`ESXi9-01~03`、`Sean-ESXi-01~06`。
- vcf-m02 nested ESXi **CPU ready 高到 33%**(esx04)→ 餵不動 vSAN I/O → appliance iostat 寫延遲 122–442ms(etcd 要 `<10ms`)。
- VCFA 控制平面 crash-loop:etcd/apiserver/kube-vip 9 天重啟 700–900 次。
- outer `vsanDatastore-RTO` 容量其實 OK(72%,非滿)；outer 預設 policy 是 **FTT=1**(每筆 nested 寫入翻倍)。

## 修法(已實施)
1. **CPU shares → High**(`Set-VMResourceConfiguration -CpuSharesLevel High`,48000)
2. **disk shares → High**(reconfig `device.shares.level=high`)
3. **nested ESXi 改 FTT=0**:建自訂 policy `vcf-m02-nested-FTT0`(`VSAN.hostFailuresToTolerate=0`)套 home+disks → outer 寫入砍半(只套自己 4 台,不動共用 default)。
→ appliance load **456 → 67**;esx CPU ready 33%→0–5%;控制平面停止 crash-loop。
4. **固定 host + 關 DRS 自動化**:4 台設 per-VM DRS=Disabled;mandatory affinity `rtolab-vms-4`→host .4、`rtolab-vms-10`→host .10(各 2 台);把 .10 加入 `rtolab-dedicated-hosts`(MustNotRunOn 擋別組),.6 釋出。
   - **DRS 是 Manual 模式** → 規則違規不自動修,要 `Get-DrsRecommendation | Apply-DrsRecommendation`。

## 憑證根治(provider portal HSTS + NotSignatureValid)
appliance 復原會重簽 portal 憑證(CN=VCFA、由 inner vC VMCA 簽、SAN 含主機名 OK);但 client 的 Windows `LocalMachine\Root` 殘留**同 subject 舊 thumbprint 的 VMCA**(歷次重建留下)→ `X509Chain` 抓到舊的 → leaf `NotSignatureValid` + HSTS 擋住。
**修**:① `Invoke-WebRequest https://192.168.114.11/certs/download.zip -SkipCertificateCheck` 取現役根；② 移除舊 thumbprint;③ `Import-Certificate -CertStoreLocation Cert:\LocalMachine\Root` 匯入現役;④ Chrome 重啟。

## ⚠️ PSOD 事件 + 鐵則
為把別組 Sean-* 淨空出 .10,一次 `Apply-DrsRecommendation` 批次驅逐多台重 VM → 瞬間 load 衝 **340/429** → `vcf-m02-esx04-91` 的 nested ESXi **PSOD**(VM 事件 `The CPU has been disabled by the guest operating system`)→ inner host 掉線 → VCFA provider 503 + Ops/platform DOWN + 一串 vSAN/HA 紅告警。
**救法**:`.10` load 退後,outer `Restart-VM vcf-m02-esx04-91`(硬 reset;guest 已 halt,graceful 無效)→ ESXi 重開回 inner 叢集(約 8–16 分,先 ping 通再 443/hostd 起)→ 服務陸續自癒。
**鐵則**:**這 4 台 nested ESXi 不批次 vMotion、不隨便 vMotion**。非搬不可:確認目的 host CPU<60%、一次一台、等前一台 inner host 回 Connected + vSAN 健康再動下一台;趕別組 lab 也一台一台、看著 load。
