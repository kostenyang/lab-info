# m06 — VKS on VLAN-backed VPC, air-gap, **no VCFMS**（2026-10-13 起）

目標：在沒有 VCF Management Services（VCFMS / VSP）的 VCF 9.1.1 管理網域上，用 VLAN-backed VPC 啟用 Supervisor + VKS，air-gap（內部 Harbor + 本機匯入 VKr）。
文件全部以 vSphere Client / VCF Installer UI 截圖為主，只有中止 bring-up 與驗證用 CLI。
成品要整合進 kostenyang/vks-airgap-novcfms（PUBLIC，不放密碼）。

## 盤點（2026-10-13，outer-inventory-20261013.txt 在 E:\9.1\m04）
- host .95：32 核 / 1 TB；只開 m05 三台（36 vCPU）就 CPU 75% → **m06 bring-up 前先把 m05 正常關機**
- datastore free：ForNFS 4456 GB、wdblue4t 1850 GB、samsung4t 1249 GB
- m03 / m04 已關機；m02 / w01 nested host 已不存在
- 10.0.1.195-249 無 DNS、ping 全不通；VLAN 6 192.168.16.0/24（RouterOS ether5，gw .254）ARP 空；RouterOS 無 NAT 規則（只讀確認，沒改）

## IP 規劃（mgmt 10.0.0.0/23，gw 10.0.0.1，DNS 10.0.0.200，NTP 10.0.1.254）
| 名稱 | IP | 備註 |
|---|---|---|
| vcf-m06-esx01..03 | 10.0.1.195-197 | 20 vCPU / 80 GB，cache 60 / capacity 2400 GB（OSA，spec FTT0；精靈用完整 spec 檢查資源） |
| vcf-m06-vc01 | 10.0.1.198 | |
| vcf-m06-nsx01（VIP）/ nsx01a | 10.0.1.199 / .200 | |
| vcf-m06-sddcm01 | 10.0.1.201 | |
| vcf-m06-ops01 / opsc01 / lic01 / fleet01 / vsp01 / shared01 / vidb | 10.0.1.202-208 | **只為了通過 spec validation，不會部署**（#272 中止） |
| vcf-m06-vna01a | 10.0.1.209 | VNA Large |
| VSP pool（spec 用，不部署） | 10.0.1.210-221 | |
| Supervisor mgmt | 10.0.1.222-226 | |
| vMotion / vSAN | 192.168.65.0/24 / 192.168.66.0/24（VLAN 0，.11-.20） | |
| VPC external（VLAN 6） | 192.168.16.0/24，gw 192.168.16.254 | External IP block 同網段，排除 .240-.254 |
| Installer | vcf-m04-inst01 10.0.1.135（沿用，已有 9.1.1 binaries） | |
| Harbor | harbor01.home.lab 10.0.0.86（沿用，project vks-apps） | |

## 進度
- [x] DNS A/PTR（10-13 11:2x，15 筆）
- [x] m05 正常關機（Stop-M05.ps1；Supervisor CP 名稱含括號 Get-VM 失敗 → 直接外層 guest shutdown nested ESXi）
- [x] nested ESXi ×3（capacity 線上擴到 3600 GB：UI 精靈固定 FTT=1，Grow-M06Disk.ps1）
- [x] installer 開機、確認 depot / binaries（9.1.1 全部 SUCCESSFUL；VCFA 延後）
- [x] bring-up（UI 精靈截圖 01-30）11:54 DEPLOY → vC 12:22 → SDDCM 12:52 → cluster 13:22 → NSX 14:08 → **14:09:32 觸發中止**（#273 已 IN_PROGRESS）
- [x] 中止後驗證：installer COMPLETED_WITH_FAILURE（M5 4/14）、SDDCM VSP_BOOTSTRAP task Failed（Bootstrap VCF Services Platform FAILED，restart 後曾 resume）、inner vC 只 3 VM；30 分鐘 post-check 乾淨
- [x] 步驟 0（截圖 m06-vks 01-26）：🔴 vks-ftt0 的 K8s Compliant Name 用 fill 不會自動帶 → 手動填；nested ESX SSH 關著 → VLAN6 ping 用 PowerCLI Get-EsxCli -V2
- [x] TGW + VNA（VLAN 6）（截圖 30-39）VNA NODE_READY
- [x] VKr Local CL 匯入（截圖 40-47）11.79 GB
- [x] Supervisor（VPC）14:57→15:22 RUNNING，API 192.168.16.5（截圖 50-59）🔴 精靈 input 用 name=、Cluster deployment 是 role=tab
- [x] Container Registries（截圖 60-62）+ K8s Service library vkr-local（63-65）→ KR v1.36.2 READY
- [x] Namespace vks-lab（66-72）+ SubnetSet public（80-82）
- [x] VKS 叢集 16:08→16:13 Available（CP .50 / worker .51），截圖 83-93；ClusterClass v3.7.0 在 vmware-system-vks-public
- [x] 驗證：nginx 從 Harbor 拉 + LB 192.168.16.33；docker.io ImagePullBackOff；Harbor pulls 2→3（95）
- [x] README + docx（71 頁）→ kostenyang/vks-airgap-novcfms `ui-step-by-step/vpc-airgap-novcfms`，PR #1 commit d7cd83d

## 精靈紀錄（截圖 E:\9.1\doc-shots\m06-bringup）
- Deployment Paths = Deploy a new VCF fleet；Existing Component 只勾「VCF Automation 之後再接」
- Size = Simple / Small；Network = VM mgmt 用 ESX mgmt、VCF mgmt 用 VM mgmt、**VLAN backed VPC**（Distributed）；Storage = vSAN OSA
- Review Prerequisites：52 vCPU / 155 GB / 6748 GB（其中 VCF management services 28/58/2900 —— 不會部署）
- VLAN backed VPC 的 Networks 頁**沒有** TGW / external 欄位（Day-0 不設，之後在 vCenter UI Setup Network Connectivity）
- Storage 頁 FTT 固定 1
- 🔑 9.1.1 greenfield milestone 順序：vCenter → SDDC Manager → vSphere cluster → NSX → **VCF Management Platform（#271/#272 起頭，=VSP bootstrap）** → Ops → VCF Management Services
  m04 實測 #271 在 NSX 完成後 1.5 分鐘開始 → 觸發點正確；abort_watcher_m06.py 另加「NSX milestone 已完成」+ 忽略 PREVALIDATION_* 雙保險
Supervisor FINISH 14:57:06
Supervisor RUNNING 15:22（14:57 FINISH，25 分）

## 現況（10-13 16:2x）
- m06 開著：vC/SDDCM/NSX/VNA/Supervisor/VKS vks-cl01 + demo ns（nginx-lb .33、pull-test pods）
- m05 關機中（Stop-M05.ps1）；installer vcf-m04-inst01 開著

## T2（10-13 晚）外掛 NAS 做 PV，走 VLAN 7（使用者：「兩個都做，新建一台 NFS VM 放 VLAN 7」）
- NAS：`nfs-vks01` 192.168.17.20（外層 VLAN7 pg、ForNFS、Ubuntu 22.04 cloud image 重新下載 E:\9.1\nfs-offline\vks-nfs\dl\；bundle 只裝 10/102 個 deb）；export /export/vks-ds、/export/vks-rwx（192.168.17.0/24、no_root_squash）
- 做法 1 ✅：nas-vlan7 pg + 三台 vmk3 .21-.23（MTU 1500）+ NFS3 datastore `nas-vks-ds`（Vmknic binding vmk3）+ tag vks-storage/nas + policy `vks-nas` + ns 加 storage → PVC RWO Bound，FCD 在 NAS
- 做法 2 ✅：NSX External Connection `nas-vlan7`（DVC、Dedicated to Subnet、Layer 2 → ENABLED_L2）+ IP block 排除 .1-.63 + VPC subnet **API** 建（id nas-vlan7-sn，static IP）→ vC Namespace Networks ADD（CR nas-vlan7）→ vks-cl02 eth1（.64/.65/.66）→ csi-driver-nfs v4.13.4（Harbor project csi）→ RWX 跨兩 worker
- 🔴 坑：UI 建的 VLAN subnet 沒 static IP（eth1 無 IP、事後改不了）；L2 Only 選不到 DVC（要 Public）；DVC ENABLED_L2 不能接 TGW；kubectl 建 vlanConnectionName 被 webhook 擋；LCI NEW SUBNET 無 VLAN 選項
- 文件：kostenyang/vks-airgap-novcfms PR #1 commit 34c150f `ui-step-by-step/vpc-nas-pv/`（docx 35 頁）
- 現況：vks-cl01（RWO demo ns nas-demo）、vks-cl02（3 節點：CP + 2 worker，rwx-demo）都還在

## T3（10-13 晚）重做：VCF + air-gap + VNA/VPC + NFS 單獨 VLAN（使用者：「把原有的 vks 拆掉重做、不走 vcfms、走外面 harbor、一步一步 cut 圖、單獨的 git 資料夾」；重點：NFS 流量不要過 VNA → 採做法 1 ESXi NFS datastore）
- 拆：vks-cl01/02 → Namespace Networks 分享 → ns vks-lab → Supervisor → NSX（nas-vlan7 subnet/DVC/block、VNA/DVC6/vks-block/profile）→ zone vz-01 → CL vkr-local → NFS datastore/vmk3/pg nas-vlan7/tag/policy vks-nas
- 保留：English 偏好、vSAN 靜音、vks-ftt0、VM-Mgmt pg 安全性、nfs-vks01、harbor01（外部）
- 截圖：E:\9.1\doc-shots\m06-r2\；文件：repo 新資料夾（branch + PR）
- 10-13 22:46 Supervisor 拆完 → NSX(profile/attachment/DVC6/vks-block/VNA)API 拆 → zone vz-01、CL vkr-local 刪
- r2 重做(截圖 E:\9.1\doc-shots\m06-r2,1xx 儲存/2xx TGW+VKr/3xx Supervisor/4xx registry+ns+subnetset/5xx 叢集):
  - 22:48-23:04 pg nas-vlan7(第一次 VLAN 填錯 → 刪掉重建)、vmk3 .21-.23、NFS3 nas-vks-ds(Vmknic binding vmk3)、tag vks-storage/nas、policy vks-nas
  - 23:05 TGW+VNA DEPLOY → 23:20 VNA SUCCESS;23:09 VKr 上傳 → 23:17 完成(item 名 photon-5-amd64-v1.36.2---vmware.2-vkr.3,KR 照樣生)
  - 23:24 Supervisor FINISH → 23:54 RUNNING,API 192.168.16.3
  - Container Registries harbor01、K8s Service vkr-local、ns vks-lab(vks-ftt0+vks-nas、3 VM class)、SubnetSet public
  - 00:09 叢集 FINISH 被 webhook 擋 variables[networks] → 00:10 dry-run 過 → 再按 FINISH;精靈 defaultStorageClass=vks-nas
  - 🔴 坑:回頭展開 General Settings 會把 Node Network / Node Pools 自訂值重設
- 文件:repo branch vcf-vpc-airgap-nfs,資料夾 vcf-vpc-airgap-nfs/(README 寫到步驟 8)
  - 00:17 vks-cl01 Available(CP .50 / worker .51);驗證:nginx(Harbor)LB .33、docker.io 拉不到、PVC vks-nas → NAS fcd;guest 預設 SC vks-nas
  - 🔑 NFS 路徑證明:Pod 寫 1 GiB → NAS rx 1025 MiB、worker vdisk write 1074 MB、VNA net 0.7 MB;對照組經 LB(nas-http-lb .34)下載 → VNA 1083 MB
  - 文件 PR #2 https://github.com/kostenyang/vks-airgap-novcfms/pull/2(commit 3ed7434,docx 60 頁)

## T4（10-14）客戶場景主線改成「VKS 自己掛 NFS」（使用者：vks 節點不會走 nfs vmk、和 esxi 沒關係 → 主線=VKS secondary NIC eth1 + NFS CSI，在 m06 重做重截圖）
- repo：kostenyang/vcf-vks-airgap-nfs-vlan（public，不寫客戶名）Part C 主線要換掉；ESXi datastore 那條不是此場景
- blog 依據：DTGW 不需 Edge、N-S 在 ESXi 上分散式；VNA=DTGW 有狀態服務（LB/NAT）；VCF 9.1 VKS secondary NIC 對應 VPC VLAN/subnet，用途含 direct access to NFS storage
- 實測（10-14 10:31）：worker 從 Harbor 拉 430 MB image → VNA 2 MB（一般 VPC 流量不經 VNA）；LB 對照 VNA 1083 MB
- 計畫：拆 vks-cl01/demo/nas-demo → ns vks-lab → 做法1物件（policy vks-nas/datastore/tag/vmk3/pg nas-vlan7）→ 重建 ns（只 vks-ftt0）+ SubnetSet public（截圖）
  → NSX DVC nas-vlan7（VLAN7、Dedicated to Subnet）+ IP block（排除 .1-.63）→ VPC subnet（API，static IP）→ Namespace Networks ADD → 叢集 eth1 → NFS CSI（Harbor csi 已有 image）→ RWX + 流量驗證
- 截圖：E:\9.1\doc-shots\m06-r3\
- 10-14 r3 完成：NSX DVC nas-vlan7（ENABLED_L2）+ block 排除 .1-.63 + subnet nas-vlan7-sn（API，VPC vks-lab_cw1ha）+ Namespace Networks 分享 + vks-cl01（eth1 .64-.66，CP1+W2，10 分）+ NFS CSI + nas-nfs-rwx
  - 實測：Pod 寫 1 GiB → NAS 1025 MiB、worker vNIC 4001(eth1) 1079.5 MB、4000(eth0) 0、VNA 0.7 MB；NAS ss 只有 .65/.66
  - repo kostenyang/vcf-vks-airgap-nfs-vlan main b553013（docx 85 頁）；ESXi datastore 物件已從 m06 拆除
  - 現況：vks-cl01 + demo（nginx-lb .33、pull-test）+ rwx-demo 都還在

## T5（10-14）客戶投影片 CIDR 驗證：Service 100.64.0.0/13 共用 / Pod 100.96.0.0/18，實跑 VLAN VPC 與 overlay VPC
- 事實（10-14 查 m06 NSX 10.0.1.199）：TGW default transit_subnets=100.64.0.0/21；VPC vks-lab_cw1ha 內建 `_services` Private subnet=100.64.32.0/24 → 投影片 Service 段 100.64.0.0/13 把這兩段都包進去
- m06 ESXi transport node 只在 VLAN TZ（c2cdd34b6884），沒有 overlay TZ / TEP → overlay VPC 在 m06 要先加 TEP 才能測
- 測試 1（VLAN-backed VPC）：ns vks-lab 建 `vks-cidr-vlan`（CP1+W1，best-effort-small，primary=SubnetSet public），manifest E:\9.1\m06\cidr-test\vks-cidr-vlan.yaml
- 測試 2（overlay VPC）：待定（需 m06 加 overlay TZ+TEP，或另一套環境）
- ✅ 測試 1 結果（10-14 18:57 apply → 19:04 Available，7 分）：webhook dry-run 過；nodes podCIDR 100.96.0.0/24、100.96.1.0/24；svc kubernetes 100.64.0.1 / kube-dns 100.64.0.10；Antrea encap、serviceCIDR 100.64.0.0/13
  - 通過：pod→ClusterIP、DNS（FQDN）、跨節點 pod（worker→CP coredns 9153）、pod→Harbor 401、LB VIP 192.168.16.35 外部 curl 200（LB 來源 = VNA 192.168.16.7，不是 100.64.32.x）
  - 節點 default gw = VPC subnet DR 192.168.16.49；節點與 pod 都 ping 不到 100.64.1.1 / 100.64.32.1（node 走 eth0 出去沒回應；pod 被 service CIDR 吃掉）→ 無功能影響
  - 證據 cidr-test/vlan-00-cluster-evidence.txt、vlan-01-lb-source-dns.txt；叢集 vks-cidr-vlan + ns demo 還在（待使用者決定留/刪）
- 🔴 測試 2 blocker：m06 Supervisor networkStack=**VLANBackedVPC**，webhook 直接擋 `AccessMode other than Public/L2Only is not supported for VLANBackedVPC`；default_private_cidrs=[]；主機無 TEP。
  → overlay VPC 必須：NSX 主機加 TEP（VLAN 9 pool、MTU 已 9000 OK）+ private TGW IP block 進 profile + **停用 m06 Supervisor 重新以 overlay VPC 啟用**（會拆掉 r3 的 vks-cl01/NFS CSI 示範）；9.1.1 DTGW overlay VPC 本 lab 從未做過
- 10-14 19:1x 使用者裁示：拆 m06 Supervisor 重做 overlay（FULL_STACK_VPC）；測試叢集與 vks-cl01 已刪（19:17 clusters=0）
  - 9.1.1 API enum NetworkStack：VLAN_BACKED_VPC（TEPless）/ FULL_STACK_VPC（TEP 模式）；wizard 第 1 頁沒有選項 → 推測由 NSX 側（TEP + private TGW block）決定
  - NSX 已建：ip-pool vks-tep-pool（192.168.19.100-110/24 gw .254）、uplink profile vks-tep-uplink（transport VLAN 9，uplink-1 active / uplink-2 standby）、ip-block vks-private 172.26.0.0/16 PRIVATE
  - 進行中：profile default 加 private_tgw_ip_blocks；TNP c950678c 加 TEP（StaticIpPoolSpec）；刪 ns vks-lab → disable Supervisor → 重新啟用
- 19:56 Supervisor 移除完成（svc-* ns 卡 Zone finalizer 約 15 分後自行清掉；RBAC 不讓 admin patch zone）
- 🔑 overlay 切換四步（全 NSX API，lab-only）：
  1. TGW `span.span_path` 從 sddc-span 改成 default span → TGW state `network_stack` 立刻 VLAN_BACKED_VPC→FULL_STACK_VPC
  2. VNA cluster `advanced_configuration.ha_over_management_interface=false`（⚠ PATCH 要帶齊 overlay_transport_zone_path/high_availability_profile，且 appliance_form_factor 要一起帶否則變 MEDIUM）
  3. profile 加 `private_tgw_ip_blocks`（vks-private 172.26.0.0/16）
  4. profile `service_gateway.nat_config.enable_default_snat=true`（精靈「One incompatibility found: Auto SNAT must be enabled」）
- 精靈第 5 頁 FULL_STACK 多出「Private (Transit Gateway) IP Blocks」表 + 「Private (VPC) CIDRs」欄（預設 172.30.0.0/16，不可與 private TGW block 重疊）；20:1x FINISH（vcf-m06-sv02，截圖 E:\9.1\doc-shots\m06-overlay\）
- 20:37 overlay Supervisor vcf-m06-sv02 RUNNING（FINISH→RUNNING 約 25 分）；API 192.168.16.3；CP VM eth1=172.30.0.2（kube-system VPC Private subnet 172.30.0.0/29，overlay）；主機 Geneve tunnel UP（.100/.101/.102）
- 後置全 API/kubectl：ClusterRegistryConfig（admin 直接 apply 可以，不必走 UI）、PATCH clusters/domain-c9 default_kubernetes_service_content_library → KR 5 秒 READY、POST namespaces/instances/v2 建 vks-ov（vks-ftt0 + 3 VM class）
- vks-ov networkInfo：networkStack=FullStackVPC、privateIPs 172.30.0.0/16、defaultSNATIP 192.168.16.7；SubnetSet vm-default(Private)/pod-default(PrivateTGW)
- 🔴 ClusterClass v3.7.0 的 `networks` 變數在新 Supervisor 上 12 分鐘後仍未出現 → 改用不帶 networks 變數的 manifest（cidr-test/vks-cidr-overlay-nonet.yaml，走預設 vm-default）20:50 apply
- 20:57 overlay 測試叢集 `vks-cidr-overlay`（CP 172.30.0.2 / W 172.30.0.3，Private subnet 172.30.0.0/27）6.5 分 Available；podCIDR 100.96.0.0/24、100.96.1.0/24；svc 100.64.0.1 / kube-dns 100.64.0.10；LB VIP 192.168.16.9（external block）
- 🔴 直接 `kubectl apply` ClusterRegistryConfig 會被 vmware-system-imageregistry controller **刪掉**（來源是 vCenter 的 Container Registries 設定）→ 節點 x509 unknown authority；改用叢集變數 `osConfiguration.trust.additionalTrustedCAs`（JSON patch add）21:03 → 節點 rollout
- ✅ 21:1x overlay 測試結果：CA rollout 後（新節點 172.30.0.4/.5，podCIDR 100.96.3.0/24、100.96.2.0/24）ClusterIP、DNS FQDN、跨節點 pod（worker→CP coredns 9153）、pod→Harbor 401（經 VPC SNAT 192.168.16.7）、LB VIP 192.168.16.9 外部 curl 200 全通
  - 🔑 overlay 與 VLAN 的差別：LB（VNA）打 NodePort 的來源 IP = **100.64.32.3（VPC _services 子網）**，落在投影片 Service CIDR 100.64.0.0/13 內；externalTrafficPolicy=Local 時 pod 直接看到 client 100.64.32.3 **仍回得去**（conntrack 反向 NAT），http 200 ×3
  - guest cluster 沒有任何 endpoint 指向 100.64.32.x（supervisor svc endpoint = 192.168.16.3）→ 無功能衝突
  - 證據 cidr-test/overlay-0[1-5]-*.txt；截圖 E:\9.1\doc-shots\m06-overlay\
- 現況：m06 = **overlay(FULL_STACK) Supervisor vcf-m06-sv02**（API 192.168.16.3）+ ns vks-ov + 叢集 vks-cidr-overlay（demo ns：nginx-lb VIP 192.168.16.9）都還在；r3 的 VLAN-backed 環境已不存在（TGW span 已改 default span、主機有 TEP）
- 10-15 08:22 測試叢集 vks-cidr-overlay 已刪（含 demo ns、LB VIP 192.168.16.9）；ns vks-ov 與 overlay Supervisor vcf-m06-sv02 保留

## T6（10-15）投影片 cust_VKS_VPC 審查 + 「>100 節點」「1000 節點」「VNA 上限」實測（m06 overlay Supervisor）
- 投影片事實錯誤：VKS ≥3.7.2 才支援 VLAN-backed（lab 9.1.1 內建 3.7.0 可）、worker 用 shared subnet 需明確指定（實際是 SubnetSet 自動切）、第 2 頁單一 /20 跨兩 DC vs 第 5 頁 DC2 獨立 CIDR 矛盾、「直接走實體閘道」（實際 gw 是 VPC subnet DR）
- Pod CIDR 超載實測：vks-cap pods /22 開 5 節點 → 第 5 節點 podCIDR 空、事件 CIDRNotAvailable、antrea-agent not ready、pod FailedCreatePodSandBox；Supervisor/CAPI 仍報 Available=True（靜默失敗）。證據 cidr-test/cap-01/02
- 🔴 CP 用 best-effort-xsmall（2 vCPU/2 GB）5 節點 10 分鐘後 apiserver 餓死（TCP handshake timeout、etcd members 讀不到）→ 重建 vks-lb（CP small、worker xsmall）
- KCM 只有 --cluster-cidr，沒有 node-cidr-mask-size 可調 → 每節點固定 /24；1000 節點需 /14 以上
- SubnetSet ipv4SubnetSize 256/1024/4096 dry-run 都過；namespace 預設 /27（defaultSubnetSize 32）
- 🔑 VNA LB 實測數字（NSX usage API）：每個 namespace VPC 的 LB 預設 **SMALL = 20 VS / 60 pool / 400 member**，吃 VNA Large 10 credit（總 400）；**MEDIUM = 100 VS / 300 pool / 2400 member**，吃 100 credit；**LARGE 被拒**（VNA Large 單節點已有兩個系統 SMALL，容量不足 → LARGE 要獨占整台）
- relax_scale_validation=true：SMALL 建 26 個 VS 不擋，usage 130% severity RED，26 VS 全 UP；每個 pool member = 全部 worker（含拿不到 podCIDR 的節點）
- VPC LB 物件 principal identity 擁有，admin PATCH 要 `X-Allow-Overwrite: true`（lab）；vCenter namespace API 沒有 LB size 欄位（文件：auto-created VPC 固定 SMALL；可改傳 pre-created VPC）
- 現況：vks-ov VPC LB 已被改成 MEDIUM；叢集 vks-lb（CP small + 4 xsmall，pods /22）+ ns lbtest 25 個 LB svc 還在；等 CA rollout 後測 externalTrafficPolicy Local 的 member 數
- 🔑 LARGE 實作成功（20:35–20:43）：NSX 端改 MEDIUM 會被 Supervisor 改回 SMALL；vks-vna 加第二節點 vna01b 變 active/standby（每個 LB 兩台各佔 credit，LARGE 仍放不下，而且 HA cluster 不准移除成員）→ 另建 **獨立 VNA cluster vks-vna2**（vcf-m06-vna02a 10.0.1.211，記憶體不保留、SDDCM 已關機騰空間）+ connectivity profile `vks-large`（edge_cluster_paths=vks-vna2）+ **pre-created VPC `vks-large`**（private 172.31.0.0/16，attachments/default 掛 profile）+ `vpc-lbs/default size=LARGE` → **1000 VS / 3000 pool / 12000 member，佔整台 VNA Large 100%**；namespace `vks-large` 用 `network_spec.vpc_network.vpc` 指預建 VPC（default_subnet_size 256）→ 叢集 vks-lg Available，kube-api VS 落在 vna02a，size 維持 LARGE。證據 cidr-test/lb-11-large-dedicated-vna.txt
- 現況：vks-vna（vna01a+vna01b HA）、vks-vna2（vna02a）、ns vks-ov（vks-lb + 25 LB svc）、ns vks-large（vks-lg）、SDDCM 關機
