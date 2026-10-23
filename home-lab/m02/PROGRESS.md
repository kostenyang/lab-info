# m02（重部）— VLAN-backed VPC + VNA + VKS worker eth1 走 NFS VLAN（2026-10-17 起）

使用者指示（10-17）：「整個移掉 m06，用 m02 來部；用 VPC VLAN + VNA + worknode 走 NFS 另一個 VLAN；step by step cut 圖」「VKS 那邊再卡圖就好」
AskUserQuestion 決定：**不部 VCFMS**（照 m06：NSX 完成後中止 #272）；外部連線 **VLAN 8 / 192.168.32.0/20**（gw 192.168.47.254 已在 RouterOS）。
NFS：VKS worker **eth1（VPC VLAN subnet，VLAN 7）+ NFS CSI 直掛 nfs-vks01 192.168.17.20**（cust 糾正版，不是 ESXi datastore）。
Harbor 沿用 harbor01.home.lab（VLAN 8 無 NAT，image 只能從 Harbor 拉）。截圖只做 VKS 段：E:\9.1\doc-shots\m02-vks\。

## 規劃值（DNS home.lab 既有舊 m02 記錄沿用）
| 名稱 | IP | 備註 |
|---|---|---|
| vcf-m02-esx01..03 | 10.0.1.14-16 | 20 vCPU / 80 GB，cache 60 / capacity 3600 GB；外層 .95，ds ForNFS / wdblue4t / ForNFS |
| vcf-m02-vc01 | 10.0.1.19 | |
| vcf-m02-sddcm01 | 10.0.1.18 | |
| vcf-m02-nsx01 / nsx01a | 10.0.1.21 / 10.0.1.20 | |
| vcf-m02-ops01 / opsc01 / fleet01 | 10.0.1.22 / 24 / 23 | spec 用，不部署 |
| vcf-m02-vsp01 / shared01 / vidb / license | 10.0.0.172 / 173 / 174 / 175 | spec 用，不部署 |
| VSP pool | 10.0.1.210-221 | spec 用（沿用 m06 範圍，m06 DNS 已刪） |
| vcf-m02-vna01a | 10.0.1.28 | VNA Large（10-17 新增 A/PTR） |
| Supervisor mgmt | 10.0.1.222-226 | 10-17 ping 確認空（.45-.49 有舊 w01 PTR，避開） |
| vMotion / vSAN | 192.168.65.0/24 / 192.168.66.0/24（照 m06） | |
| External（VLAN 8） | 192.168.32.0/20，gw 192.168.47.254；block 排除 35-39、44-47、32.35-32.255 | SubnetSet nodes 依序拿 33.0/24… |
| NFS VLAN 7 | 192.168.17.0/24；NAS .20；VKS eth1 由 VLAN subnet static IP 配 | DVC Dedicated to Subnet / L2 |
| Installer | vcf-m04-inst01 10.0.1.135（沿用） | |

## 進度
- [x] 0. 拆 m06：15:5x 外層 vcf-m06-esx01-03 power off + destroy；harbor01 / nfs-vks01 / installer 保留
- [x] 1. nested ESXi ×3（Deploy-NestedESXi.ps1 -Set m02）
- [x] 2. DNS 補 vna01a；m06 記錄清掉
- [x] 3. bring-up spec（m06 spec 改名/改 IP）→ validation → deploy → NSX 完成後中止（abort watcher）
- [x] 4. VKS 段（截圖）：storage policy FTT0 → TGW+VNA（VLAN 8 /20）→ VKr Local CL → Supervisor → Registry/K8s Service → DVC nas-vlan7 + block + VLAN subnet(API) → Namespace Networks 分享 → ns/SubnetSet → 叢集 eth1 → NFS CSI → 驗證
- [x] 4b. **部署服務 demo（使用者 10-17 追加）**：kubectl 指令：Deployment（Harbor image）+ Service LoadBalancer + PVC RWX（NFS CSI）+ curl VIP，指令與輸出進文件
- [x] 5. README + docx → kostenyang/vcf-vks-airgap-nfs-vlan 新資料夾 m02-vlan-vpc-vna-nfs-eth1（PR #1，branch docs/m02-vlan-vpc-vna-nfs-eth1，commit 6bd848d）

## 紀錄
- 10-17 15:5x 拆 m06 完成（host .95 CPU 32% / MEM 24.7%）；DNS 刪 17 筆 vcf-m06-*，加 vcf-m02-vna01a 10.0.1.28；Deploy-NestedESXi.ps1 加 m02 set（cap 3600）背景跑中；m02-spec.json 從 installer GET /v1/sddcs/{id}/spec 的 m06 spec 轉出（純 DNS 名稱、FTT 改 0、thumbprint 待補）
- 10-17 21:2x nested ESXi ×3 UP（10.0.1.14-16）；esx03 開機後憑證重生 → 第一次 validation thumbprint 不符，重抓後 validation **COMPLETED WARNING**（vMotion/vSAN gw 不回應=預期、CPU 65 核建議）\n- 10-17 21:3x **deploy 送出 sddcId f02b1ea6-a692-42e0-ae60-b9969508f288**；abort_watcher_m02.py 背景監看（LAB_PASSWORD env）
- 4b 準備：manifests/web-demo.yaml + web-demo-commands.md（NFS RWX 內容 + 3 nginx + LB；部署/改內容/scale/rollout/刪除）
- 21:4x scripts/ 從 cust/scripts（s1–s7）+ m06（r3_cluster_a eth1、r2_pg、pw_vc/pw_frame/lci/pw_nsx）複製並改成 m02：vCenter UUID 用 env `VCUUID`、Supervisor id 用 env `SVID`、NSX 密碼 env `NSXPW`；截圖到 E:\9.1\doc-shots\m02-vks\
- 23:20:41 watcher 觸發（Deploy VCF Management Services via SDDC Manager IN_PROGRESS）→ installer domainmanager stop（failed=正常，同 m06）→ SDDCM restart → 刪 VSP VM → start；30 分鐘 post-check 背景跑中。bring-up 21:33→23:19 NSX 完成＝1h46m
- 23:2x VKS 0xx：vks-ftt0 policy（UI，截圖 010–017，OSA 要先關 ESA Auto-RAID）；SDDC-DPortGroup-VM-Mgmt 安全性 Accept（PowerCLI，lab 限定）
- 23:2x 1xx：TGW + VNA 精靈（VLAN 8 / gw 192.168.47.254/20 / block **vks-ext-block** 192.168.32.0/20 一開始就 excluded 32.35–32.255、35–39、44–47 / VNA vks-vna Large 10.0.1.28）→ **TEPless 主機精靈直接 DEPLOY 成功**（m06 那次被 TEP 擋）；23:40 VNA UP；截圖 110–120
- 23:3x 2xx：Content Library vkr-local（Local）+ Import item 4 檔；🔴 Playwright over CDP 不能傳 >50MB → 用 CDP `DOM.setFileInputFiles` 給本機路徑（s2_vkr_upload.py）；23:40 上傳完成 6.3 GB；截圖 210–220
- 23:4x 6xx（NFS VLAN，NSX UI）：External Connection nas-vlan7（Distributed VLAN + Dedicated to Subnet 開關要點 label、Layer 2、VLAN 7、gw 192.168.17.254/24 → 自動 nas-vlan7-block-x3S1q8TqnR）；block excluded 192.168.17.1-63；截圖 610–614；NSX CEIP 對話框取消勾選
- 23:4x installer post-check 乾淨（COMPLETED_WITH_FAILURE、無 VSP VM）
- 23:5x 3xx：Supervisor vcf-m02-sv01 FINISH（mgmt 10.0.1.222-226、vz-01、vks-ftt0、Service CIDR 172.29.0.0/16），截圖 310–318；等 RUNNING
- 23:52 abort watcher post-check DONE（30 分鐘無重送、無 VSP VM）；Supervisor id cb688102-20c5-4bef-9224-d229ecaa3102 CONFIGURING
- 00:09 Supervisor RUNNING（FINISH 23:5x → 約 20 分），API VIP **192.168.32.5**；k8s WARNING=No node accepting vSphere Pods（不影響 VKS）
- 00:1x 4xx Container Registries harbor01（ClusterRegistryConfig image-registry-9d2f110e21479f4d1）+ K8s Service ADD vkr-local → KR v1.36.2 READY；截圖 410–415；Supervisor kubeconfig E:\9.1\m02\kube\sv.kubeconfig
- 00:1x 5xx ns vks-lab（Create a VPC、subnet size 256 → VPC vks-lab_1na6e）截圖 510–517；ns storage vks-ftt0 + VM class ×3 截圖 520–523
- 🔴 00:1x **Resources 分頁只有「安裝 Consumption Interface」**：cci-ns-controller-manager（vSphere Pod）Pending，因為 vLCM ClusterApplySolution（裝 spherelet）每分鐘失敗「A general system error」→ vum log：`CheckHostHealth ... overall_health_not_green: vSAN health test 'NVMe device is VMware certified'`（nested NVMe 不在 HCL）
  → 修法（nested 限定）：scripts/vsan_silence_nvme_hcl.py 靜音 nvmeonhcl + perfsvcstatus → 下一輪 ApplySolution success（2m57s）→ 3 台 ESXi 變 agent node、cci-ns Running。**這步要在 Supervisor 精靈之前做**（文件放進前置準備）
- 00:3x 53x SubnetSet nodes（Public/256）截圖 530–533（🔴 NEW SUBNETSET 對話框載入慢，s6 等 36 秒不夠）
- 00:3x 6xx NFS：NSX API 建 subnet nas-vlan7-sn（VPC vks-lab_1na6e、vlan_connection nas-vlan7、static IP、DISCONNECTED）HTTP 200 → cli/20-nsx-subnet-api.txt；NSX UI 截圖 620
- 00:4x Namespace Networks ADD（Project Default / VPC vks-lab_1na6e / Subnet 打字「nas」才列出 / CR Name nas-vlan7 / Usage 不勾）→ Subnet CR nas-vlan7（vlanConnectionName nas-vlan7、static IP）cli/21-subnet-cr.txt；截圖 630–632；🔴 清空 Project 欄會變必填錯誤→取消重開
- 🔑 Namespace Networks 頁 External IP block 可用範圍：32.32–32.34、33.0–34.255、40.0–43.255（系統段只用掉 32.0–31）
- 00:42 7xx 叢集 vks-cl01 FINISH（LCI Custom：best-effort-small、eth0 nodes SubnetSet、**ADD ADDITIONAL NETWORK → Additional | eth1 → nas-vlan7 (Subnet)**、Pods 100.112.0.0/18、Services 100.80.0.0/13、CP 1、node pool 改名 vks-cl01-np-1 + Replicas 2）；YAML 存 manifests/vks-cl01-ui-generated.yaml（secondary eth1 在）；截圖 700–710
  - s7_cluster.py 加 --stop-at-network；Node pool Edit 對話框 Replicas 是 number input；NEXT/FINISH 用 JS 點最穩
- 00:51 叢集 Available（FINISH 00:42 → 約 9 分）；subnetports：CP eth0 33.2/eth1 17.64、workers 33.3/17.65、33.4/17.66 → cli/23；guest kubeconfig = CAPI secret vks-cl01-kubeconfig（E:\9.1\m02\kube\vks-cl01.kubeconfig）
- 00:52 NFS CSI（Harbor csi project）+ SC nas-nfs-rwx → cli/25；worker 路由：NAS 走 eth1 直連、Harbor 走 eth0 via 33.1 → cli/26；RWX 兩 worker 同寫 shared.log、mount clientaddr=17.66 → cli/27
- 🔴 NAS `ss` 多出 192.168.33.3:938、17.66:966、17.65:702 → **m06 硬關機留下的殘留 session**（同樣 IP；閒置 3.5h / 77h；node conntrack 沒有）→ `sudo ss -K dst ...` 清；之後只剩 17.65:778、17.66:706 → cli/28；probe PVC 證明 controller provisioning 走 eth1（cli/29）
- 🔴🔑 **VIP 配置規則 = IP block 裡最小的可用單一 IP**：
  1) 排除從 32.35 起 → 系統段剩 32.32–32.34 → 叢集 API VIP 32.32、web-lb 32.33
  2) 改從 32.33 起排除（PATCH 要帶 **cidrs + visibility**，少 visibility 回 520051 誤導訊息「visibility and CIDR cannot be updated」）→ web-lb 拿 **34.0**（第二個 /24 還沒被 SubnetSet 用）
  3) 再排除 34.0/24（預留給下一個 namespace）→ web-lb **40.0** ✅
  → 結論：沒有「VIP 專區」設定；要讓 VIP 落 40.0/22，必須把系統段剩餘 IP（32.32–32.255）與「預留但尚未使用的 SubnetSet /24」都排除，等開新 namespace 前再把那段 /24 解除排除。cust 那次 VIP 落 40.x 只是因為 33/34 剛好都被 stg/dev 用掉
- 01:0x 部署服務 demo（manifests/web-demo.yaml）：PVC RWX + seed Job + nginx ×3 + LB；改一次內容三個 Pod 一起變、scale 5、rollout restart → cli/30；VIP 192.168.40.0
- 截圖 711（Available）、810 Subnets（nas-vlan7 VLAN Extension）、811 VM Load Balancers
- 01:2x 文件：E:\9.1\m02\doc\（README 587 行、83 圖、scripts/manifests/cli/m02-spec.json 已去密碼、無客戶名）→ docx 57 頁 + PDF，QA 過（拿掉手寫目錄：Word 編號會把 0. 變 1.；ASCII 圖改英文避免中文全形錯位）；複本 E:\9.1\deliver\m02-vks-vlanvpc-vna-nfs\
- [x] 10-19 使用者選 kostenyang/vcf-vks-airgap-nfs-vlan 開新資料夾 → PR #1 https://github.com/kostenyang/vcf-vks-airgap-nfs-vlan/pull/1（mergeable、無 CI）

## License Hub 2.0 on m02（2026-10-19，使用者：「基於 m02 deploy lic hub 最新版」）
最新版 = **2.0 build 25630952**（TechDocs release notes 只有這一版，2026-08-05 GA；本機 OVA E:\9.1\License-Hub-2.0.0.0.0.25630952.ova）
| 項目 | 值 |
|---|---|
| VM / FQDN | vcf-m02-lichub01 / vcf-m02-lichub01.home.lab → 10.0.0.182（A+PTR 10-19 新增） |
| IP Pool / Kafka | 10.0.0.183-10.0.0.184；vcf-m02-lichub01-kafka.home.lab → 10.0.0.184（A+PTR） |
| 網路 | SDDC-DPortGroup-VM-Mgmt，10.0.0.0/23 gw 10.0.0.1，DNS 10.0.0.200，NTP 10.0.1.254，內部 CIDR 10.10.0.0/16 |
| 位置 | vcf-m02-vc01 / vcf-m02-cl01（DRS fullyAutomated、HA admCtl on）/ vcf-m02-cl01-ds-vsan01 thin |
| 腳本 | E:\9.1\license-hub-20\scripts\deploy-lichub2-m02.sh（不 --powerOn → 清 reservation → 開機）；log m02\lichub\deploy.out |
- 舊的 lichub01（外層 .97 / 10.0.0.77）仍在跑，沒動
- 09:10 ovftool Completed successfully → 清 reservation（0/0）→ 開機（落 vcf-m02-esx03）；5480 302 @+1m、443 403 @+6m、**302 @+7m**
- 09:19 驗證全過 → m02\lichub\verify-20261019.txt（repo 複本 docs/verify-m02-20261019.txt）；/lh-appliance/info = DEPLOYED/HEALTHY/2.0.0.0.0.25630952，version-summary target=null
- 帳密：admin / audit / root(grub) 全 VMware1!VMware1!（lab 標準）；未註冊（同 lichub01，只有 Get Started + Support Bundle）
- 10:00 step-by-step 文件：license-hub-20\m02-step-by-step\（27 頁 docx/PDF，37 圖）；精靈同值走到 Ready to complete 後 CANCEL（暫時把 VM 改名 -live 再改回）；appliance EULA 經使用者同意已接受
