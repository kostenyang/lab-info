# context.md — 關鍵路徑 / 決策 / 現況

## 關鍵檔案路徑
| 用途 | 路徑 |
|---|---|
| 開場必讀 runbook | `E:\9.1\vcf9.1-lab\CLAUDE.md`(所有硬性坑) |
| bring-up spec | `E:\9.1\vcf9.1-lab\layer2-bringup\generated-bringup.json`(version 9.1.0.0,vspClusterSpec+vcfAutomationSpec) |
| nested ESXi 部署 | `E:\9.1\vcf9.1-lab\layer1-nested\Deploy-NestedESXi-And-Installer.ps1`(NTP/ForNFS/host95 已改) |
| VSP 前配方 | `E:\9.1\vcf9.1-lab\nested-workarounds\Apply-VspRecipe.ps1`(FTT0+timeout+reservation)+ `Set-VsanFtt0.ps1` |
| bring-up 監控 | `E:\9.1\vcf9.1-lab\layer2-bringup\Monitor-Bringup.ps1`(pwsh 跑,寫 bringup-monitor.log) |
| SDDC Manager sshd 自動修 | `E:\9.1\vcf9.1-lab\nested-workarounds\Watch-SddcMgrSshdFix.ps1` |
| depot builder | `E:\9.1\My-VcfDepot.v3.ps1` / `E:\9.1\my-vcfdepot.sh`(已推 git) |
| Broadcom token | `E:\9.1\.broadcom-token` |

## 座標 / 帳密
- 外層 vCenter `10.0.0.101`(administrator@vsphere.local / `<redacted>`),host 10.0.0.95(1024GB)
- Installer `10.0.1.4`(admin@local / `VMware1!VMware1!`;root guest-ops `VMware1!VMware1!`)
- 內層 vCenter `10.0.1.19`、SDDC Manager `10.0.1.18`、VSP `vcf-m02-vsp01`(root `VMware1!VMware1!`)
- nested ESXi `10.0.1.14-17`(root `VMware1!VMware1!`),VM 名 `vcf-m02-esx0N-91`
- depot `10.0.0.61`(root `<redacted>`)、download VM `vcf9dltool 10.0.0.32`(root `<redacted>`)
- mgmt 網段 10.0.0.0/23 在 **VLAN 2**(MGMT portgroup);gw 10.0.0.1;DNS/AD 10.0.0.200
- **RouterOS 10.0.1.254**(原 lab NTP,曾死;要修回)

## 決策 + 理由
- **乾淨重跑 > retry**:憑證步失敗會讓 SDDC Manager 的 Initialize task 進 `TA_TASK_CAN_NOT_BE_RETRIED` 死態,retry 只重讀快取。全新 bring-up(新 workflow id)才能重跑建帳號+憑證。
- **nested 放 ForNFS**(host95 本機 SSD)不放外層 vSAN:nested vSAN 寫入快 ~10x,VSP/etcd 才撐得住。
- **promiscuous ON 非 MAC learning**:untagged mgmt vmk0 在 trunk 上要靠 promiscuous 洪泛;MAC learning 實測連不到。
- **NTP 暫用 10.0.0.200**:原 spec 的 10.0.1.254 死了;但 200(AD)偏 +173s → 憑證步時鐘坑(見下)。
- **sshd 早修(watcher)**:SDDC Manager OVA sshd 硬化砍了 ed25519(domainmanager 要)+ ssh-rsa(operationsmanager 要);要在憑證步前補,否則半初始化。
- **VSP 只需 FTT=0 + 仍要 timeout**:ForNFS 快碟降低壓力,但 retry.max 坑跟儲存無關,照套。

## 目前狀態(2026-07-13 更新)
### ✅ bring-up 完成 + CA + VNA
- **c9732a7d = COMPLETED_WITH_SUCCESS(318)**,整套含 VCFA 起來。VCFA console `https://vcf-m02-auto-vip.home.lab/automation`(VIP 10.0.0.170)HTTP 200。
- **CA 重新信任**:抓 vCenter `/certs/download.zip` 2 根(VCF Broadcom 根 `EF4C8ABA…`、VMCA `79E70A39…`)→ 匯入 jumpbox LocalMachine\Root,5/5 endpoint 驗證通。檔在 `E:\9.1\vcf-ca\vc-certs\certs\win\`。⚠ Chrome 要完全重啟才生效。
- **VNA 完成**:`vna-cl01`+`vcf-m02-vna01`(10.0.0.181)UP/VTEP UP。新環境 ID:CM `9f3063e0`、Overlay TZ `7edb4eaa`、cluster domain-c9、ds datastore-15、pg dvportgroup-24(MoRef 竟與舊 labinfo 相同=決定性分配)。

### ⏳ VKS 給 VCFA(進行中)
- supervisor-service TKG/CCI/Velero 都 ACTIVATED;但無 namespace、user Supervisor 未啟用。
- domain-c9 傳統 edge 相容性=false(預期,走 **VPC/DTGW 路徑**非 edge)。Default TGW(100.64.0.0/21)+ Day0 External 10.0.0.0/23 + Default VPC Connectivity Profile 都在。
- **下一步走 vCenter Workload Management UI(VPC 路徑)啟用 Supervisor** = 同時產出「cut 圖」。卡在 **Chrome 要重啟讀新 CA** 才能驅動 UI。
- 關鍵路徑:playbook `vcf9.1-lab/layer3-postbringup/vna-vpc-deploy-api.md`;NSX 10.0.1.20(admin/VMware1!VMware1!);VNA API base `/policy/api/v1/infra/sites/default/enforcement-points/default/virtual-network-appliance-clusters`。

### ✅ NTP/路由根治(2026-07-12)
- RouterOS 10.0.1.254 修好:7 gateway 全通 + NTP server 服務正確 Google 時間;AD 200 快 +176s(憑證坑根因)。spec/deploy/CLAUDE.md/記憶已全指 254(留給**未來重建**)。MAC 已 reset-mac 回 orig(見記憶 [[vcf91-routeros-lab-router]])。

### 🎯 c9732a7d 保住不重部(關鍵決策)—— 07-13 08:3x = 313/319
- **`c9732a7d-...` = 313/319,IN_PROGRESS**,越過憑證牆 + VSP + Operations,現在 **VCFA 部署中**(`Install Service Using Fleet lifecycle`,auto-platform-qj29d 已開機建 container volume)。剩 5 收尾任務。
- 已起 VM:vc01/nsx01a/sddcm01/vsp01×4(全綠 0 alarm)/ops01/opsc01/license/**auto-platform(VCFA)**。
- etcd 健康鐵證:VSP 越過 281 沒卡 + VCFA 能在 Supervisor 上建 container volume(需 k8s API+etcd 可寫)。
- 決策:**不打掉重來**(會丟 270/319 + 3-4h)。c9732a7d 用 NTP=200(+176s)但**一致偏移**,appliance 間簽 cert 無偏差,不影響跑完。
- ✅ **FTT=0 已套 + reapply 到所有現有 VM**(2026-07-12,抓在 VSP 剛起第一台時)→ etcd 單寫撐得住。timeout(retry.max=240)**故意沒套**(會 restart domainmanager 打斷 VSP monitor);VSP 若撞 retry.max=60 失敗才補。
- 監控點:installer `10.0.1.4` GET /v1/sddcs/c9732a7d;內層 vC `10.0.1.19` VSP 事件。VSP done≈281 後**絕不刪 VSP VM**。

### 🔴 VKS/Supervisor 啟用 saga(2026-07-14)—— NSX VPC 路徑撞牆,決定改 VDS
第 3 次 activate user Supervisor(vcf-m02-sup01,NSX VPC 路徑)後卡 CONFIGURING ~18h。CP VM 內部**其實全健康**(逐一修好 6 個 WCP 骨牌坑,見記憶 [[vcf91-supervisor-cpvm-portgroup]]):
1. coredns :53 被 systemd-resolved stub 占用 → 關 DNSStubListener 2. zone-operator secret `wcp-zoneop-sa-vc-auth` 不存在→401,用 vmop SA 憑證建 3. CSI 無 AvailabilityZone→手建 domain-c9 4. CSI 缺 supervisor-id(wcp-cluster-config 取正確值)5. coredns liveness :8082 vs health :8080→Corefile 改 :8082 6. WCP wedge→`service-control --restart wcp`。
- **修完 6 坑 all pods Running,但 config_status 仍 CONFIGURING。最終天花板**:CP VM 無 eth1(workload NIC)= `system` VPCNetworkConfiguration `GatewayConnectionReady=False`(shared VPC 建不出)。根因:**Day0 Default TGW 沒綁 VNA cluster**(VNA 是事後 API 補的),TGW 編輯視窗**不能補 VNA**(vSphere+NSX 兩邊都試過)。
- **查證**:VCF 9.1 官方支援 Distributed TGW+VNA 給 Supervisor(不需 edge),但 VNA 要在**建 TGW 時**選,或走官方「Setup Network Connectivity」精靈。純 API 手做 VNA 會漏這關聯。TGW 物件在 API 沒 VNA 欄位→刪重建不保證修好,且刪 Day0 system TGW 風險=重 bring-up→**決定不刪**。
- **🎯 新方向(2026-07-14 使用者拍板):Supervisor 改用 VDS 網路(vSphere networking)**,避開整個 NSX VPC/VNA gateway connection 坑。要查文件確認 VCF 9.1 的 VDS Supervisor 前提(LB=NSX ALB/Avi 或 HAProxy?workload portgroup?),測試可行再 deactivate 現卡住的 NSX-path Supervisor、改 VDS 重 activate。授權「盡量試,大不了重裝」。
- 現存資產:GARP daemon 預埋(/tmp/garp-*.sh,解 API-VIP-unset)、decrypt.ps1(取 CP VM 密碼)、wcpprobe/wcpstate.ps1(查 config_status)。

### ✅ VDS Supervisor 正解(2026-07-14 研究定案):Foundation Load Balancer + VDS
- **VCF 9.1 新 Foundation Load Balancer(FLB)= 內嵌 vCenter 的原生輕量 L4 LB,不需 NSX**。純 VDS 路徑避開 NSX VPC/VNA/TGW 整坨坑。([官方](https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/deploying-vsphere-supervisor-with-foundation-load-balancer/deploy-a-supervisor-with-foundation-load-balancer-and-vds-networking.html))
- FLB VM:Small 2vCPU/4GB/8GB,單台(HA=2 台)。精靈 Step1 選「vSphere Distributed Switch」+「Foundation Load Balancer」。
- 三網路:①Mgmt(現有,5 連續 IP,沿用 .182-.186)②Workload(VDS portgroup + K8s service CIDR)③LB(Virtual Server VIP 網段 + Transit;One Arm 合併)。
- 其他 LB 選項:Avi(重,要 Controller+SE)/ HAProxy(還支援)。**選 FLB(最輕、原生)**。
- **執行**:deactivate NSX-VPC Supervisor → 盤點 workload portgroup + LB 網段 → 重跑 Activate 精靈選 VDS+FLB → FLB 部一台 → Supervisor 起。授權「盡量試,大不了重裝」。

### ✅ VDS+FLB Activate 精靈「完整驗證配方」(2026-07-15)——照填即可
已 deactivate 舊 NSX Supervisor(cluster domain-c9 消失)。已建 workload PG **`SDDC-Workload-VM`**(dvportgroup-190,VLAN0,安全策略放寬 forged/mac/promiscuous)。精靈路徑:Supervisor Management → GET STARTED。**⚠ vSphere session 會逾時(~30-60min),逾時精靈資料全失、要重登重跑,所以動作要快、少停頓。** 8 步驟填值:
1. **vCenter & Network**:Networking stack = **vSphere Distributed Switch (VDS)**;Load Balancer Type = **Foundation Load Balancer**(下拉 combobox,用 form_input 選)
2. **Supervisor location**:name `vcf-m02-sup01`;VSPHERE ZONE DEPLOYMENT;選 zone **domain-c9**;HA 關(單 CP)
3. **Storage**:三個都 `vSAN Default Storage Policy`
4. **Management Network**:IP mode **Static**;Network 多選下拉點「Show options」捲到選 **SDDC-DPortGroup-VM-Mgmt**;IP `10.0.0.182-10.0.0.186`;mask `255.255.254.0`;gw `10.0.0.1`;DNS `10.0.0.200`;search `home.lab`;NTP `10.0.0.200`
5. **Workload Network**:IP mode **Static**;Port Group radio = **SDDC-Workload-VM**;K8s Services CIDR `10.96.0.0/23`(預設);IP range `10.0.1.32-10.0.1.63`;mask `255.255.254.0`;gw `10.0.0.1`;DNS/NTP `10.0.0.200`
6. **Load Balancer(FLB)**:name `flb-vcf-m02-sup01`;topology **One Arm**;Size **Small**;HA **1**;Management Network → ASSIGN → 對話框:IP mode Static、Quick Filter 打 `SDDC-DPort` 選 SDDC-DPortGroup-VM-Mgmt、IP range `10.0.0.187-10.0.0.188`、mask `255.255.254.0`、gw `10.0.0.1`、DNS `10.0.0.200`、OK;Virtual Server Network(= sddc-workload-vm)的 **Virtual IP Address Range** `10.0.1.64-10.0.1.95`(VIP,不可與 workload node 32-63 重疊)
7. **Advanced**:Control Plane Size **Small**
8. **Ready to complete** → FINISH
- ⚠ 網段全在 flat 10.0.0.0/23(mgmt+workload 同 subnet 不同 PG,VLAN0);若 wizard/部署擋 flat 再改 workload 獨立 VLAN。form_input 語法:`{ref, value}` 單一(非 elements 陣列);多選網路要點「Show options」捲清單。
