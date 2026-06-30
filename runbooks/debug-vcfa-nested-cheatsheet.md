# rtolab — VCFA / nested lab 除錯指令速查

> 怎麼用指令除錯 VCFA(provider 503 / region-quota 失敗 / pod 一堆異常)+ 怎麼查底層 outer 資源。
> 背景根因(outer SELAB-Cluster CPU 超賣 → nested ESXi 餓 CPU → etcd 死亡螺旋)見 git 歷史,這份只放**可直接複製的指令**。

## A. 登入 appliance 除錯(.80,單節點 k8s)
- SSH 帳號**只有** `vmware-system-user` / `VMware1!VMware1!`;`root`/`admin` 的 SSH 都被拒。登入後 `sudo` 拿 root。
- 從 Windows 用 Posh-SSH:
  ```powershell
  $cred = New-Object PSCredential('vmware-system-user',(ConvertTo-SecureString 'VMware1!VMware1!' -AsPlainText -Force))
  $s = New-SSHSession -ComputerName 192.168.114.80 -Credential $cred -AcceptKey -Force
  ```
- kubectl 在 `/usr/local/bin/kubectl`,kubeconfig=`/etc/kubernetes/admin.conf`(要 sudo):
  ```bash
  K="echo VMware1!VMware1! | sudo -S kubectl --kubeconfig=/etc/kubernetes/admin.conf"
  uptime                                                # load(>24 即超賣;曾飆 456/584)
  eval $K get pods -A | awk '{print $4}'|sort|uniq -c   # pod 相位統計
  eval $K get pods -A | grep -vE "Running|Completed"    # 看不健康的 pod
  eval $K get pods -n kube-system | grep -E "etcd|apiserver|kube-vip"  # 控制平面 restart 數
  eval $K describe pod -n prelude <pod>                 # 看某 pod 卡的原因(缺 secret/image…)
  iostat -x 1 2                                         # 磁碟 write await(>10ms = 儲存太慢)
  ```
- **load 高到 ~300+ 時 SSH/kubectl 會直接 timeout**(apiserver 餵不動)。此時 `CreateContainerConfigError`/`ImagePullBackOff`/CrashLoop **都是 overload 下游症狀,別硬戳**,等 load 降會自癒(provider 回 302 = 好了)。

## B. 查底層 outer(vCenter 172.16.10.100)
- 連線:`Connect-VIServer 172.16.10.100 -User administrator@vmwaresso.taiwan -Password 381VMware1!admin`
- **叢集 CPU 超賣率**(>1 即超賣,本案曾 4.3x):
  ```powershell
  $cl=Get-Cluster 'SELAB-Cluster'; $on=Get-VM -Location $cl|?{$_.PowerState -eq 'PoweredOn'}
  ($on|measure NumCpu -Sum).Sum / (Get-VMHost -Location $cl|measure NumCpu -Sum).Sum
  Get-VMHost -Location $cl | %{ '{0} {1:P0}' -f $_.Name,($_.CpuUsageMhz/$_.CpuTotalMhz) }   # 各 host CPU%
  ```
- **nested ESXi CPU ready**(>5~10% = 搶不到實體 CPU,本案曾 33%):
  ```powershell
  Get-VM 'vcf-m02-esx*-91' | %{ $r=Get-Stat $_ -Stat cpu.ready.summation -Realtime -MaxSamples 3
    '{0} ready~{1:N1}% host={2}' -f $_.Name,(($r|measure Value -Average).Average/200),$_.VMHost.Name }
  ```
- **outer vSAN 容量 + 預設 policy FTT**(FTT=1 則每筆 nested 寫入翻倍):
  ```powershell
  Get-Datastore vsanDatastore-RTO | %{ '{0:P0} used' -f (1-$_.FreeSpaceGB/$_.CapacityGB) }
  (Get-SpbmStoragePolicy 'vSAN Default Storage Policy').AnyOfRuleSets.AllOfRules   # 看 hostFailuresToTolerate
  ```
- **抓 nested ESXi PSOD/掉線**:outer VM `guestToolsNotRunning` + inner host(192.168.114.11)`NotResponding`;VM 事件出現 `The CPU has been disabled by the guest operating system` = PSOD → outer `Restart-VM 'vcf-m02-esxXX-91'`(硬 reset;guest 已 halt,graceful 無效),等它 ping→443→inner Connected。

## A2. nested ESXi PSOD/掉線後,VCFA pod 卡 `CreateContainerError` / `ContainerCreating`(死掛載)
nested ESXi(host）PSOD 或掉線後,跑在它上面的 CSI 磁碟掛載會變**死掛載**(node 回來後仍 `input/output error`),VCFA 的 kafka/rabbitmq/postgres 等有 PVC 的 pod 會卡住、**不會自癒**(可重試上萬次數小時)。
- **判斷**:`kubectl describe pod` 看到 `FailedMount ... stat .../csi.vsphere.vmware.com/<hash>/globalmount: input/output error`(關鍵是 **globalmount** = node 層 staging 掛載死掉)。`kubectl get pvc` 通常還是 Bound(底層 vSAN 物件 esx04 回來後已恢復,只是 node 掛載 stale)。
- **修(外科,免重開整台)**:SSH 進 appliance,掃描所有 csi globalmount,把 `stat` 卡住/IO-error 的 **lazy 強制卸載**,CSI 會自動重 stage 乾淨的:
  ```bash
  for m in $(mount | grep csi.vsphere.vmware.com | grep globalmount | awk '{print $3}'); do
    timeout 5 stat "$m" >/dev/null 2>&1 || { echo "wedged: $m"; echo PW | sudo -S umount -f -l "$m"; }
  done
  ```
  (2026-06-29 esx04 PSOD 後實測:**22 個 globalmount 全 wedge**,清完 kafka/rabbitmq/resource-manager 全部自己 Running,Event Broker 復活 → org/quota 才能建。)
- 若 pod 已被 `--force --grace-period=0` 刪過仍卡 `ContainerCreating`,清掉 globalmount 後它會自己掛上;`resource-manager` 等下游等 kafka/rabbitmq 起來就自動好,頑固的再 `kubectl delete pod` 踢出 backoff。

## C. 除錯順序(SOP,症狀→根因)
1. `uptime` 量 load → ≫24 = overload,別動 pod
2. 控制平面 restart 數狂跳 → 死亡螺旋(根因在儲存/CPU)
3. `iostat -x` write await ≫10ms → nested vSAN 太慢 → 跳去查 outer(B 段)
4. outer:CPU 超賣率 / nested ESXi CPU ready / vSAN 容量+FTT
5. 確診 outer CPU 超賣 → 修:CPU+disk shares High、nested ESXi FTT=0、固定到專用 host
6. nested ESXi `guestToolsNotRunning` → PSOD → `Restart-VM` 硬重啟救回
7. 修完**別急著重啟 pod** → load 降後自癒,provider 回 302
