# tasks.md — VCF 9.1 重建待辦

## 基建(已完成)
- [x] 外層 vSAN 事故後,nested 全打掉重建(根因:vSAN 無冗餘)
- [x] offline depot 重建(vcf9depot 10.0.0.61,nginx HTTPS+auth,95 binaries)
- [x] depot builder script（My-VcfDepot v3 .ps1 + my-vcfdepot.sh，已推 git）
- [x] 客戶 rundown（DEPOT_RUNDOWN.md，已推 git）
- [x] 下載 VM vcf9dltool 10.0.0.32（pwsh 已裝，備完整 depot 用）

## 這輪乾淨 bring-up（c9732a7d，07-13 08:3x = 313/319 收尾中）
- [x] 4 台 nested ESXi 乾淨重部（ForNFS/host95）
- [x] 記憶體保留 128GB×4 + Trunk-Nobinding promiscuous ON
- [x] 4 台可達（ping+443）
- [x] POST 全新 bring-up（sddcId c9732a7d）
- [x] validation 過 → vCenter ✅ → SDDC Manager ✅
- [x] SDDC Manager sshd 自動修（watcher，ed25519+ssh-rsa）
- [x] **憑證步過關**（當初時鐘 hack 有效通過；後續 NTP 已根治指 254）
- [x] NSX 部署 ✅
- [x] **VSP 里程碑**：搶在第一台 VSP VM 時套 FTT=0 + reapply（etcd 單寫）
- [x] VSP done 越過 281：4 節點 rn6fp/lfzb5/chknx/xrn88 全綠、tools running、0 alarm（絕不刪）
- [x] VCF Operations（ops01）+ Collector（opsc01）+ License 部署 ✅
- [x] **VCFA 部署完成**（auto-platform-qj29d，VIP 10.0.0.170）
- [x] 收尾任務全過
- [x] **bring-up status = COMPLETED_WITH_SUCCESS（318 任務全綠）** 🎉
- [x] VCFA console 驗證：https://vcf-m02-auto-vip.home.lab/automation → HTTP 200「VCF Automation」；SDDC `/ui` + Ops 200 都通
- [ ] VCFA console 可登入驗證

## NTP 基建（根治時鐘偏移）✅ 2026-07-12 完成
- [x] 登入 RouterOS 10.0.1.254（API port 8728，Set-RouterOS.ps1）
- [x] 路由：7 個 gateway 全通（ether2-8 = 192.168.13-19.254/24）
- [x] NTP client 同步 Google（216.239.35.0/.4 = 正確 UTC）
- [x] NTP server 起（裝 ntp-6.47.7.npk + reboot + enable）→ w32tm 實測回應 offset
- [x] web access：www(80) 已開；winbox(8291)/ssh(22)/api(8728) 都在
- [x] 確認根因：AD 10.0.0.200 快 +176s；254 正確 → spec/nested/installer NTP 全指 254
- [ ] BGP：待 NSX 部好拿 T0 peer IP + AS（阻塞中）

## CA 重新信任（2026-07-13）✅
- [x] 重部後整套走新 VMCA/CA → 抓 vCenter `/certs/download.zip` 2 張根（VCF Broadcom 根 `EF4C8ABA…` + VMCA `79E70A39…`）
- [x] 匯入 jumpbox LocalMachine\Root，5/5 endpoint 不跳過憑證檢查全過（vc/sddc/nsx/ops/vcfa）
- [x] CA 檔存 `E:\9.1\vcf-ca\vc-certs\certs\win\`（給別台機器裝）
- [ ] ⚠ Chrome 要**完全重啟**才讀到新 CA（執行中匯入無效）；別台機器要另裝 CA + DNS 指 10.0.0.200

## Day-2：VNA + VKS 給 VCFA（2026-07-13 進行中）
- [x] **VNA 部署**：`vna-cl01`(SMALL/VPC_SERVICES) + `vcf-m02-vna01`(10.0.0.181) → cluster UP、VTEP_STATE_UP、ping OK（NSX Policy API，playbook `vna-vpc-deploy-api.md`）
- [x] 全新環境 ID 重抓：CM `9f3063e0`、Overlay TZ `overlay-tz-mgmt-nsxt`(7edb4eaa)、cluster domain-c9、ds datastore-15、pg dvportgroup-24
- [x] Default TGW 已存在(100.64.0.0/21)、Day0 External block 10.0.0.0/23、Default VPC Connectivity Profile
- [x] 確認 supervisor-service：TKG(tkg) + CCI(cci-ns=VCFA消費) + Velero 都 ACTIVATED
- [~] ~~啟用 user Supervisor（NSX VPC/DTGW 路徑）~~ **撞牆放棄**：3 次都卡 GatewayConnectionReady=False（Day0 TGW 沒綁 VNA，編輯補不了、刪重建風險=重bring-up）。6 個 WCP 骨牌坑已修好（記憶 [[vcf91-supervisor-cpvm-portgroup]]）但最終 workload VPC 起不來。

### 🔄 改走 VDS + Foundation Load Balancer（2026-07-14 pivot，避開 NSX VPC）
- [x] 研究定案：VCF 9.1 FLB = 內嵌 vCenter 原生輕量 L4 LB，**不需 NSX**（純 VDS）
- [x] **deactivate NSX-VPC Supervisor**（cluster domain-c9 消失）
- [x] 網路規劃定案：mgmt=10.0.0.0/23、**workload=192.168.15.0/24(VLAN5,gw 192.168.15.254=RouterOS ether4)**——flat /23 驗證擋 mgmt/workload 子網重疊,改 workload 獨立 routed 子網
- [x] SDDC-Workload-VM port group 改 **VLAN 5**（PowerCLI ReconfigureDVPortgroup）
- [x] **重跑 Activate 精靈 → VDS + Foundation Load Balancer,8 步全填,FINISH 成功送出** 🎉
  - mgmt Static SDDC-DPortGroup-VM-Mgmt 10.0.0.182-186;workload Static SDDC-Workload-VM(VLAN5)192.168.15.32-63/gw .254;FLB Small/OneArm/HA1,mgmt flb-mgmt-net 10.0.0.187-188,VS VIP 192.168.15.64-95
- [x] **監控 FLB VM 部署 + Supervisor config_status → RUNNING** 🎉🎉🎉
  - **config_status=RUNNING**（2026-07-15 21:43）;flb-vcf-m02-sup01 + SupervisorControlPlaneVM 都 PoweredOn/tools running
  - **VLAN5 workload 網路驗證通過**：CP VM 拿到 api_servers=192.168.15.32(workload NIC eth1)+ 10.0.0.182/183(mgmt);api_server_management_endpoint=10.0.0.182
  - k8s_status=WARNING「No node accepting vSphere Pods」= 非致命(單CP+VDS 的 PodVM 限制),不影響 VKS/TKG guest cluster

## Day-2 續：VKS guest cluster（VDS Supervisor 已 RUNNING）
- [ ] 指派 TKr content library（見 vks-airgap-tkr-upload.md：本地 CL + import k8s-v1.30.1 OVA）
- [ ] 建 vSphere Namespace + VM Class + storage
- [ ] 開 VKS guest cluster → Available（kubectl 可連）
- [ ] 接 VCFA Container Service 消費
- [ ] cut 圖：VDS Supervisor / FLB / VKS / VCFA
- [ ] 建 vSphere Namespace + TKr content library（見 vks-airgap-tkr-upload.md）+ storage/VM class
- [ ] 開 VKS guest cluster → Available
- [ ] 接 VCFA Container Service 消費
- [ ] **cut 圖**：VDS Supervisor / FLB / VKS / VCFA UI

## 收尾
- [x] bring-up 坑寫進 vcf9.1-lab/CLAUDE.md + 記憶（NTP/MAC/FTT/成功配方）
- [x] plan.md / context.md / tasks.md 放 E:\9.1\（本檔，隨進度更新）
