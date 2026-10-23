# m04 / m05:實測「Deploy a new VCF Instance」(加進既有 fleet)

> 開始 2026-10-08。狀態檔(plan + context + tasks 合一)。**不寫任何密碼**,密碼見 memory `vcf91-lab-password-scheme`(lab 標準密碼)。

## 目標
回答「VCF Installer 的 **Deploy a new VCF Instance**(radio `worload-type-VCF_EXTEND`)接既有 fleet 時,
會不會部新的 vCenter」,並且在 lab 實際跑完一次。

## 範圍
- **In**:新建 fleet `m04`(greenfield,VCFA 延後)→ 用 Installer 的 *Deploy a new VCF Instance* 部 `m05` 接進 m04 fleet
  → 驗證 m05 有自己的 vCenter / NSX / SDDC Manager、並出現在 m04 的 VCF Operations。
- **Out**:**m03 不碰**(使用者 10-08 指示「m03 另有用途,別碰」,含 `vcf-m03-inst01`、m03 DNS、192.168.35-38)。
  不裝 VCFA、不做 Supervisor/VKS、不動外層網路/路由器。
- **Done when**:m05 部署 COMPLETED;m04 Ops 看得到兩個 VCF instance;記錄精靈每一步要填什麼、是否會部 vCenter。

## 決策(+理由)
| # | 決策 | 理由 |
|---|---|---|
| D1 | 不用 m03 當 fleet,另建 m04 | 使用者指示 m03 別碰;m02/w01 已不存在(10-08 govc 確認 pool 空、IP 全不通) |
| D2 | m04 = 3 台 × 20 vCPU / 72 GB,capacity 2400 GB;m05 = 3 台 × 8 vCPU / 40 GB,capacity 1000 GB | Simple 模式 vSAN 最少 3 台;installer 需求(m03 實測 Simple/Small 不含 VCFA)≈ 52 vCPU / 155 GB / 6.4 TB。外層 .95 m03 已吃 593 GB,加兩套峰值約 945/1048 GB |
| D3 | 網路照 m03:全部 VLAN 0 同一個 L2,vMotion/vSAN/TEP/DTGW 用不同 /24,gateway 填 .1(**實際不存在**) | m03 就是這樣跑起來的;192.168.35-38.1「ping 得到」是路由迴圈的 TTL expired,路由器上沒有這些位址 |
| D4 | 新 installer `vcf-m04-inst01`,不重用 m03-inst01 | m03 別碰 |
| D5 | m04 greenfield 走 Installer **API**(spec 改自 m03 greenfield);m05 extend 走 **UI 精靈** | m04 只是前置;m05 才是實測對象,要看精靈每一步 |
| D6 | depot 用 `https://10.0.0.61`(**IP,不能用 FQDN**) | 見 memory vcf911-installer-depot-fqdn-rejected |
| D7 | NTP 10.0.1.254 | AD 時間快 176 s |
| D8 | **m05 改 3 台 × 12 vCPU / 64 GB,capacity 1500 GB**(取代 D2 的 8/40/1000) | 使用者 10-08:之後的 **VKS step-by-step 做在 m05**;Supervisor+FLB+VKS cluster 約再吃 40 GB |
| D9 | 成品(m05 實測 + VKS step-by-step)推到 **<private-lab-repo>** | 使用者 10-08 指定;23:13 已接受邀請(private,push=true),clone 在 `E:\9.1\<private-lab-repo-clone>` |
| D10 | **VKS 照 <private-lab-repo> `vks/README.md` 的配方**:VLAN-backed VPC(TEP-less)+ VNA **Large** + Supervisor「VCF Networking with VPC」+ Public SubnetSet → m05 的 NSX 盡量 Day-0 就 `overlayVtepSpec.vtepType=NO_IP`(精靈沒選項就改 JSON spec) | 使用者 10-08:「這個 git 是拿來在我的 lab 做 VKS step by step 文件用」。該 repo 實測 VNA Small 會讓 Supervisor 卡 GatewayConnectionReady=False;External IP block 必須等於閘道整個 /24 |
| D12 | **m05 主機最終 3 × 12 vCPU / 80 GB,capacity 2400 GB**(取代 D2/D8) | 精靈 Prerequisites:Simple/Small 新 instance 要 46 vCPU / 135 GB / 6462 GB(NSX 6/24、SDDCM 4/16、vC 4/21、Cloud proxy 4/16、**VCF mgmt services 28/58**)+ VKS 約 50 GB;外層扣掉其他後約剩 237 GB |
| D11 | VKS 對外 VLAN **待定**(候選 VLAN 5 = 192.168.15.0/24,gw .254 在 RouterOS ether4,m02 時代 VKS 用過)→ 到 VKS 階段再跟使用者確認 | 使用者正在處理 RouterOS,不憑印象挑 |

## IP / FQDN(home.lab,mgmt 10.0.0.0/23 gw 10.0.0.1,DNS 10.0.0.200)
10-08 確認 10.0.1.115-189 無 DNS A/PTR、ping 不通。**避開 10.0.1.78-109**(m03 的 VSP / VCFA pool,沒有 DNS 但在用)。

| m04 | IP | m05 | IP |
|---|---|---|---|
| vcf-m04-esx01 | 10.0.1.121 | vcf-m05-esx01 | 10.0.1.161 |
| vcf-m04-esx02 | 10.0.1.122 | vcf-m05-esx02 | 10.0.1.162 |
| vcf-m04-esx03 | 10.0.1.123 | vcf-m05-esx03 | 10.0.1.163 |
| vcf-m04-vc01 | 10.0.1.124 | vcf-m05-vc01 | 10.0.1.164 |
| vcf-m04-nsx01 (VIP) | 10.0.1.125 | vcf-m05-nsx01 (VIP) | 10.0.1.165 |
| vcf-m04-nsx01a | 10.0.1.126 | vcf-m05-nsx01a | 10.0.1.166 |
| vcf-m04-sddcm01 | 10.0.1.127 | vcf-m05-sddcm01 | 10.0.1.167 |
| vcf-m04-ops01 | 10.0.1.128 | vcf-m05-opsc01(Cloud proxy) | 10.0.1.168 |
| | | vcf-m05-shared01(instance components) | 10.0.1.169 |
| | | vcf-m05-vsp01(VCF services runtime) | 10.0.1.170 |
| | | m05 VSP IP pool(12 個) | 10.0.1.171-182 |
| vcf-m04-opsc01 | 10.0.1.129 | | |
| vcf-m04-lic01 | 10.0.1.130 | | |
| vcf-m04-fleet01 | 10.0.1.131 | | |
| vcf-m04-vsp01 | 10.0.1.132 | | |
| vcf-m04-shared01 | 10.0.1.133 | | |
| vcf-m04-vidb | 10.0.1.134 | | |
| vcf-m04-inst01 | 10.0.1.135 | | |
| VSP IP pool | 10.0.1.140-155 | | |

| 用途(VLAN 0) | m04 | m05 |
|---|---|---|
| vMotion | 192.168.45.0/24 (.11-.20) | 192.168.55.0/24 (.11-.20) |
| vSAN | 192.168.46.0/24 (.11-.20) | 192.168.56.0/24 (.11-.20) |
| NSX TEP | 192.168.47.0/24 (.11-.30) | 192.168.57.0/24 (.11-.30) |
| DTGW external | 192.168.48.0/24 | 192.168.58.0/24 |

外層:host 10.0.0.95,portgroup `Trunk-Nobinding`,folder `VCF`。
nested ESXi OVA `E:\9.1\Nested_ESXi9.1.0.0_Appliance_Template_v1.0.ova`(m03 greenfield 用 9.1.0 主機直接成功)。
Installer OVA `E:\9.1\VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova`。

## 任務
- [x] T1 DNS 正反解(m04 15 筆 + m05 7 筆)+ 驗證 —— 22 筆 BAD=0(`dns.log`)
- [x] T2 等 m03 關機完成 —— 15:10 只剩 vcf-m03-vc01;外層 .95 CPU 18% / mem 593 GB(free 445 GB)
- [x] T3 部 vcf-m04-inst01 + 3 台 m04 nested ESXi —— 15:18 全開機,443 + token OK
- [x] T4 installer 接 depot ✅、下載 9.1.1 binaries 15 個(不含 VRA)—— 15:45 全 SUCCESSFUL(約 22 分)
- [x] T5 m04 greenfield(第一輪失敗,見地雷):installer timeout 調校 ✅(15:39,`inst-timeouts.log`)→ validation `COMPLETED WARNING` ✅
      → **15:48 送出 deploy,sddcId `22e07f8f-9f5e-4ae3-8523-3a7106e0d205`**(318 subtasks,7 milestones)
      監看:`watch-sddc.sh` → `watch-sddc.log`;若倒在「Install VMCA Certificate on SDDC Manager」→ 見 vcf9.1-lab/CLAUDE.md ed25519 修法,修完 `PATCH /v1/sddcs/{id}` retry
- [x] **T5b 第二輪(10-09 07:06 起)** ✅ **14:50 COMPLETED_WITH_SUCCESS**(sddcId `083361a7-89c0-43ae-b86b-fcbd14c9ee71`,07:37→14:50 = 7h13m,Identity Broker 這次沒卡):`Remove-M04.ps1` 刪 4 台(round1 log 在 `round1/`)→ 重部 installer + 3 台主機
      (**加 CPU 保留 16 GHz/台**)→ `pipeline-m04.sh` 全自動:depot → binaries → timeout → spec → validation(有 FAILED 就停)→ deploy → `watch-sddc.sh`
      (同一子任務 >100 分鐘不動會以 STUCK 結束)。log:`pipeline-m04.log` / `watch-sddc.log`
- [x] T6 部 3 台 m05 nested ESXi(14:53;後改 80 GB / capacity 3200 GB,見 D12 與精靈紀錄)
- [x] T7 Installer 精靈 *Deploy a new VCF Instance* → **10-10 08:54 COMPLETED_WITH_SUCCESS**(id `3f45b2ca…`;10-09 15:18 送出,中間 3 次 UI Retry,見地雷)
- [x] T8 驗證 ✅:m05 SDDCM API → 網域 `vcf-m05` MANAGEMENT ACTIVE、**vCenter `vcf-m05-vc01` 9.1.1(新部)**、NSX `vcf-m05-nsx01`、SDDCM 9.1.1、主機仍 9.1.0(installer 不升主機);m04 Ops suite-api:`VcfAdapter` = vcf-m04-instance + vcf-m05-instance、VCFDomain vcf-m04/vcf-m05 同一個 VCF World,vCenter/NSX/VMSP/Cloud proxy adapter 各兩份;UI Build→Lifecycle→VCF Instances 列兩個(截圖 43-46);installer 完成頁 Next Steps 指向 `vcf-m04-ops01`
- [ ] T9 寫結論(memory + 這份)
- [ ] T10 m05 上做 Supervisor(VDS+FLB)+ VKS guest cluster,邊做邊截圖(CDP)→ VKS step-by-step 文件
      配方參考 memory `vcf911-vks-supervisor-flb`、既有成品 `E:\9.1\VCF911-VKS-AirGap-StepByStep.docx`
- [ ] T11 成品推 <private-lab-repo>(先確認 kostenyang 有 write 權限)

## 驗證指令
- DNS:`Resolve-DnsName vcf-m04-vc01.home.lab` + `Resolve-DnsName 10.0.1.124`(每筆正反解)
- 部署:installer `GET /v1/sddcs/{id}` status

## 外部狀況
- 10-08 使用者:「我有一個 RouterOS 在處理」→ **不要動路由器**;m04/m05 只依賴它的 NTP(10.0.1.254)。
  送 deploy 前先確認 NTP 有回應(`w32tm /stripchart /computer:10.0.1.254 /samples:2 /dataonly`)。

## 地雷
### 地雷 10-08 — installer API 設 offline depot 回 401(帳密明明對)
- 帳密欄位名是 **`offlineAccount`**,不是 `vmwareAccount`,也不是放在 `depotConfiguration` 裡 → 放錯地方 installer 送出的請求**根本沒帶 auth**
  (depot nginx access.log 的 user 欄是 `-`,UA `Apache-HttpClient/5.6.1 (Java/21.0.11)`)
- 自簽憑證:`depotConfiguration.trustedCertificates: [PEM]`,否則 `LCM_OFFLINE_DEPOT_HTTPS_TLS_ERROR`
- ✅ 正解 body:`{"offlineAccount":{"username","password"},"depotConfiguration":{"isOfflineDepot":true,"url":"https://10.0.0.61","trustedCertificates":[pem]}}`
  → `DEPOT_CONNECTION_SUCCESSFUL`(欄位從 UI bundle `/vcf-installer-ui/main-*.js` 反查)
- binaries 清單:`GET /v1/releases/VCF/release-components?imageType=INSTALL&automatedInstall=true`;下載 `PATCH /v1/bundles/{id}` `{"bundleDownloadSpec":{"downloadNow":true}}`

### 地雷 10-08 — 第一輪 m04 卡在「Install Identity Broker using Fleet Lifecycle」(6/7 milestone,304/317)
- 時間線:21:59 開始 → 22:44 Fleet LCM task `01a11bd0…` 第一次 FAILED(Internal errors 空白)→ 之後每 6-14 分重試,7 輪全敗
- 重試錯誤:`Component install rejected: an install task for "vidb" is already active (task: install-component-dm2u4…).
  This task was submitted by a Conductor retry while the original was queued and will not be executed.` +
  `step persist_sddc_lcm_components_ref / persist_vsp_component_task_ref ... Duplicate key f5d1cdb7-…(vidb component id)`
- 實際狀態:VSP 上 vidb **已裝好**(Component `vidb` Running、workflow `install-component-dm2u4…` Succeeded、vidb-service/postgres Running)
- 根因:**SDDC LCM DB**(`vcf-sddc-lcm-db-1` primary / `vcfsddclcmdb.public.component`)vidb 有**兩筆**同 component_id
  (`01a11c05-bc38…` / `01a11c05-bc43…`,UUIDv7 差幾 ms)= KB 439260「安裝任務被執行兩次」。Fleet LCM DB 反而沒有 vidb 列。
- 可行修法(未執行):刪掉其中一筆重複列 → 讓下一輪重試寫入成功。**使用者選擇不改 DB,整套 m04 重部**(10-09 00:xx)。
- 查法備忘:SSH `vmware-system-user@<VSP CP>`(10.0.1.142)→ sudo + `KUBECONFIG=/etc/kubernetes/admin.conf`;helper `vsp-ssh.py`

### 地雷 10-09 — m05 倒在「Configure vSphere cluster → Enable Default vSAN Storage Policies」(18:06 COMPLETED_WITH_FAILURE)
- installer:`SDDC_INITIALIZE_SUBTASK_FAILED_ERRORS ... 'Default storage policy compliance check failed'`(子任務在 m05 SDDC Manager 上跑 08:57Z→10:01Z,等了 1 小時)
- m05 SDDC Manager log(`EnableVsanPoliciesAction`):`vcf-m05-sddcm01` 的 Hard disk 4(vm-18:2003)`vsanHealthStatus=reduced_availability_with_active_rebuild` → nonCompliant
  = 套上 `vcf-m05-cl01 vSAN Storage Policy`(**FTT=1**,精靈固定)後的 resync 還沒跑完。nested vSAN resync 很慢(1 小時後還剩 10 GB)
- 處理:**不改 policy**(VCF 自己建的 FTT=1 policy,改了之後的 compliance 檢查可能再撞),等 resync 完 → UI 進度頁 Retry
- `m05-ftt0-when-ready.sh` 因偵測到 FAILED 而沒有套用 FTT=0(正確)
- 教訓:**精靈部 3 台 vSAN OSA 只能 FTT=1;要 FTT=0 得走 JSON spec**(m04 就是 JSON spec `failuresToTolerate: 0`,沒遇到這步問題)

### 地雷 10-09 — m05 VSP bootstrap 被外層 CPU 餓住(20:56 監看 STUCK)
- 18:15 UI「RETRY AND PROCEED WITH DEPLOYMENT」續跑 OK(vSAN policy 那步過了)→ 19:10 進「Monitor VCF Management Services Deployment Task」
  = m05 SDDC Manager 的 VSP_BOOTSTRAP「Creating VCF services runtime vcf-m05-vsp01」→ 子任務「Bootstrap VCF Services Platform」1h46m 後 m05 只有 `bootstrap-vm`,還沒有 VSP 節點
- 外層 .95:**CPU 97.4%**(m04 三台 ~44 GHz 有保留 16 GHz/台、m05 ~24 GHz 無保留、m03 四台只開 vC 也吃 ~14.5 GHz)、MEM 949/1024 GB(只有閒置的 m03-esx01 被 swap 1.5 GB / 壓縮 6 GB)
- 處置(只動 m04/m05):**m04 CPU 保留 16→8 GHz/台;m05 CPU 保留 12 GHz/台 + shares High + 記憶體保留 64 GB/台**(保留總和 CPU 60 GHz < 80)
- 對照:m04 同一步 01:24Z→02:57Z = 1h33m(那時 m04 有 48 GHz 保留)
- 教訓:**同一台實體機上第二套 VSP 正在 bootstrap 時,前一套的 VSP 待機也吃 ~40 GHz**;要嘛兩套錯開、要嘛先把保留讓給正在部署的那套

### 地雷 10-09 23:00 — m05 VSP bootstrap 失敗:CPU 餓 → 假失敗 → 清理排隊 → 自動重送撞 IP
- 時間線(UTC):11:10 開始 → 12:05 bootstrap VM 5480 還沒起 → **12:36 install API 回 `InternalServerError`** → SDDCM 判失敗、送 `delete-vsp-cluster`
  → 但第一次 install 其實還在跑,13:10 起照樣長出 `vcf-m05-vsp01-d7rzn/cp6vw`;delete 一直 Queued(30 分 timeout ×2)、刪 bootstrap VM 時 vC session `NotAuthenticated`
  → 13:13/13:47 重 clone 撞「bootstrap-vm-bteAd3 already exists」→ **14:56 自動重送 install → INIT0001「IP 10.0.1.172 is already in use (pingable)」** → 15:00 FAILED
- 錯誤在 **m05 SDDC Manager** 的 domainmanager.log(`LocalProcess ERROR` 行),installer 只看到空的 `PUBLIC_VSP_CLUSTER_BOOTSTRAP_FAILED_DETAILED`
- 處置(23:04-23:10):① m05 SDDCM 套 timeout(`Set-InstallerTimeouts.ps1 -VmName vcf-m05-sddcm01 -Vc vcf-m05-vc01...`)
  ② `Remove-M05VspLeftovers.ps1` 刪 bootstrap-vm-bteAd3 + vsp01-cp6vw + vsp01-d7rzn → .171-.182 全不通
  ③ CPU 保留 m04 4 GHz/台、m05 16 GHz/台(High)④ UI「RETRY AND PROCEED WITH DEPLOYMENT」→ IN_PROGRESS
- 教訓:**SDDC Manager 的 timeout 也要套(兩台都要)**;VSP 失敗後 retry 前一定要清 bootstrap-vm / vsp 節點 / pool IP

### 地雷 10-10 05:36 — m05「Configure Lifecycle Components」失敗:**我把 m04 餓死了**
- 第二次 retry:VSP bootstrap 01:26 過(約 2h16m)→ Register cert → Deploy Lifecycle Components(1h46m)→ **Configure Lifecycle Components 跑 2h09m 後失敗**
- installer:`Error occurred while getting certificate chain for 'vcf-m04-fleet01.home.lab:443'` → `PUBLIC_LCM_COMPONENTS_CONFIGURE_FAILED`
  (同時有 `svc-account-mgmt/service-account ... ALREADY_EXISTS`、`getSystemInfo` 3 次失敗)
- 根因:m04 CPU 保留被我壓到 4 GHz/台 → m04 VSP worker `vcf-m04-vsp01-wjhd9`(10.0.1.143)load 30-44、containerd 建容器全部 `context deadline exceeded` /
  `failed to reserve container name` → 22 個 pod `CreateContainerError`,含 **envoy-gateway**(fleet01 / vsp01 的入口)→ fleet01 連不上
- 處置:CPU 保留改 **m04 / m05 各 10 GHz/台**(🔴 要先降 m05 再升 m04,否則 host admission 擋「insufficient CPU」)
  → wjhd9 `systemctl restart containerd` + `kubelet` → 8 分鐘內卡住 pod 22→2、fleet01 回 404(正常)→ 05:5x UI 第三次 Retry
- 教訓:**擴充 instance 的後半段(Lifecycle Components / Join Ops)要 fleet 那邊健康**;CPU 不能只讓給正在部的那套

### 第一次 validation(15:23,binaries 未下載完)
只有 `Versions and Bundles` FAILED(FAILED_TO_RETRIEVE_COMPONENT_BINARY,預期);WARNING:cores 建議 65、storage 建議 8435 GB、
vMotion/vSAN gateway 不回應(預期,D3)、installer NTP 尚未同步(開機初期,07:26 已 `*10.0.1.254` offset 1.3 ms)。
ESX Host Configuration / DNS / vSAN disks / Network / NSX overlay 全 SUCCEEDED → 9.1.0 nested 主機可直接用。

## m05 精靈實測紀錄(10-09,vcf-m04-inst01,截圖 `E:\9.1\doc-shots\m05-extend\`)
| 步驟 | 看到的 / 選的 |
|---|---|
| 首頁 | 「Previous deployment completed successfully」→ 同一台 installer 可以再部(01) |
| DEPLOYMENT WIZARD → VMware Cloud Foundation | (02/03) |
| Introduction → Deployment Paths | 三選一,選 **Deploy a new VCF Instance**(`#worload-type-VCF_EXTEND`)。Details 圖:**Existing VCF Fleet / Existing VCF Operations / Existing VCF Automation (optional)** + Additional VCF Instance(Management Domain:VCF Management、**vCenter**、NSX Manager、SDDC Manager、vSphere cluster)(04/05) |
| Plan 1 Existing Component | **只剩**「I have an existing vCenter instance」+「registered with NSX Manager」;**沒有 Ops 選項**(Ops 用 fleet 的)。不勾 → 部新 vCenter(06) |
| Plan 2 Size Options | 預設 HA:mgmt services 32/62、NSX Medium 18/72(3 節點)、Cloud proxy 4/16、vC 4/21。改 **Simple**(select `deploymentSize=single`)→ mgmt services 16/34、NSX 6/24(07/08) |
| Plan 3 Network Options | CUSTOMIZE:VM mgmt = **Use ESX management network**、VCF mgmt = Use VM management network、**VPC = VLAN backed VPC**(選了之後 Gateway Connectivity 消失,只能 Distributed)(09/10) |
| Plan 4 Storage | vSAN,architecture 改 **vSAN OSA**(預設 ESA)(11) |
| Plan 5 Review Prerequisites | 3 hosts / 46 vCPU / 135 GB / 6462 GB / 4 VLANs;FQDN:vCenter、Cloud proxy、SDDC Manager、VCF mgmt services 2 FQDN + 12 IP;vSAN/vMotion 各 ≥3 IP(12-15) |
| Prepare 1 General | Version 9.1.1.0、instance `vcf-m05-instance`、網域 `vcf-m05`、關 CEIP、**關 Autogenerate passwords**(16) |
| Prepare 2 Hosts | 3 台 FQDN + root 密碼 → CONFIRM ALL FINGERPRINTS → NEXT 跳「Resource Requirements Warning:符合需求但不到 20% 餘裕」→ YES, PROCEED(17-19)。🔴 Capacity Overview 那排數字是**需求**不是主機容量,旁邊的「Insufficient Resources」紅字會誤導 |
| Prepare 3 Networks | ESX mgmt VLAN 0 / `10.0.0.1/23`;VCF mgmt services pool `10.0.1.171-10.0.1.182`;vMotion VLAN0 192.168.55.1/24 .11-.20;vSAN VLAN0 192.168.56.1/24 .11-.20(20) |
| Prepare 4 VCF Management | **Existing VCF Operations:Primary node FQDN `vcf-m04-ops01.home.lab` + admin 密碼 → CONNECT** → 指紋框要勾「Confirm Thumbprint」+「I acknowledge」→「Successfully detected VCF Operations」+ 提示 fleet 沒有 VCFA(deferred)。再填 m05 自己的 **Cloud Proxy** `vcf-m05-opsc01`、**Instance components FQDN** `vcf-m05-shared01`、**VCF services runtime FQDN** `vcf-m05-vsp01`(21-24) |
| Prepare 5 vCenter | **新 vCenter FQDN `vcf-m05-vc01.home.lab`**、dc `vcf-m05-dc01`、cluster `vcf-m05-cl01`、SSO vsphere.local(25)← **證實會部新 vCenter** |
| Prepare 6 Storage | vSAN OSA,**FTT 固定 1 不能改**(26)→ 部署中用 `m05-ftt0-when-ready.sh` 套 FTT=0 |
| Prepare 7 Distributed Switch | Default profile:單一 VDS `vcf-m05-cl01-vds01` MTU 9000、vmnic0/1;VLAN backed → **沒有 TEP 欄位**(27/28) |
| Prepare 8 NSX | VIP `vcf-m05-nsx01`、appliance `vcf-m05-nsx01a`(29) |
| Prepare 9 SDDC Manager | 「Installer 不在管理網域主機上 → 會另外部一台 SDDC Manager」`vcf-m05-sddcm01`(30) |
| Deploy Review | JSON:`workflowType: VCF_EXTEND`、`vcfOperationsSpec.useExistingDeployment: true`、`vcenterSpec.useExistingDeployment: false`、`nsxtSpec.overlayVtepSpec.vtepType: NO_IP`;無 vidb / licenseServer / fleetLcm spec(31/32,`deployment-spec-m05-wizard.json`) |
| Validate | 第一次 13 成功 3 警告,其中「**Insufficient Storage 3600 < 4562 GB**」(FTT=1 → 7200/2)→ 線上把 capacity 碟擴到 3200 GB + govc rescan → 重跑只剩建議值警告(33-35) |
| Deploy | ACKNOWLEDGE ALL WARNINGS → DEPLOY(🔴 用 role=button name=DEPLOY 會點到左側「Validate & Deploy」步驟,要用 innerText 完全等於 DEPLOY)→ **15:18 開始,id `3f45b2ca-8896-467d-8498-c832549da02c`**(36/37);監看 `watch-m05.log` |

## ✅ 結論(T9,10-10)
**「用既有 VCF Operations 能不能讓 Installer 部 vCenter?」**
- 走 **Deploy a new VCF fleet + converge 既有 Ops**:**不會**。勾既有 Ops 會強制連帶既有 vCenter(10-05 m03 實測)。
- 走 **Deploy a new VCF Instance**(既有 Ops 必須已經是某個 fleet 的 Ops):**會**。精靈 Prepare 第 5 步要你填新 vCenter FQDN,
  spec `vcenterSpec.useExistingDeployment=false`、`vcfOperationsSpec.useExistingDeployment=true`、`workflowType=VCF_EXTEND`;
  實際部出 vCenter + NSX + SDDC Manager + Cloud proxy + 這個 instance 自己的 VCF management services(VSP),並 Join 到 fleet 的 Ops。
- 前提:**單獨一台 vROps 不算 fleet** → 要先有一個 fleet(m04 = greenfield 建的)。vROps 8.x 要先升 VCF Ops 9.1。
- 成本(Simple/Small):46 vCPU / 135 GB / 6462 GB / 3 台;lab 實際 3 × 12 vCPU / 80 GB / 3200 GB。
- 時間:m04 greenfield 7h13m;m05 新 instance 約 17.5h(含 3 次 retry,真正卡點都是外層 CPU)。

## T10 VKS on m05(VLAN-backed VPC,照 <private-lab-repo> vks/README.md)— 10-10 開始,截圖 `E:\9.1\doc-shots\m05-vks\`
### 電源 / 資源(使用者 10-10 指示)
- **m03 整套關機**(16:02 vC guest shutdown → 4 台 ESXi + inst01)、**m04 整套關機**(16:09-16:30 `Stop-M04.ps1`:VSP→Ops→Lic→NSX→SDDCM→vC→ESXi,全 guest 無硬關)
- .95 上 4 台小 VM 關機:vcf-m01-cb01-conv / vcf9depot2 / vcf9dltool / vcd-nfs01(10-11 使用者裁示:**不理它們**,維持關機、不用開回)
- .95 → CPU 43.5/80 GHz、MEM 304/1024 GB;m05 CPU 保留 16 GHz/台、MEM 保留 64 GB/台
- 開回 m04 時反向:ESXi → vC → SDDCM → NSX → Lic → Ops → collector → VSP(VSP 開機後 20-40 分)
### 規劃值
| 項目 | 值 |
|---|---|
| 對外 VLAN | **5**,gateway `192.168.15.254/24`(RouterOS ether4);10-10 實測 m05-esx03 臨時 vmk ping .254 3/3 後已刪 |
| External IP Block | `vks-block` = 192.168.15.0/24,排除 .240-.254 |
| VNA | cluster `vks-vna`,**Large**,1 節點 `vcf-m05-vna01a` 10.0.1.183/23(DNS A+PTR 已建),PG `SDDC-DPortGroup-VM-Mgmt` |
| Supervisor 管理 IP | 10.0.1.184-188 |
| Storage policy | `vsan-ftt0`(FTT=0 + forceProvisioning,PowerCLI 建) |
| VKr | 訂閱 `http://10.0.0.61:8888/PROD/COMP/VKR/lib.json`(v1.36.2 / v1.35.6 photon) |
### 步驟紀錄
- 準備:vSAN health 非綠 3 項(nvmeonhcl / perfsvcstatus / vsanenablesupportinsight)靜音 → green
- Step 1(16:4x)vCenter → Networks → Transit Gateways → **SETUP NETWORK CONNECTIVITY**(NSX plugin iframe):
  p1 Distributed VLAN Connection → p2 Prerequisites 勾 Select All(含「外部 gateway 關 ICMP redirect」— RouterOS 使用者在處理,未改)→ VLAN 5 / `192.168.15.254/24` /
  External IP Blocks ⋮ → Create New → `vks-block` → p3 VNA cluster `vks-vna` Form Factor **Large**(選項 Small 2/4、Medium 4/8、Large 8/32、XL 16/64)+ ADD node → p4 Review → Deploy
  → TGW = Distributed VLAN / `Distributed-vlan-connection-5`,VNA transport node `2fd747d8…` VM_DEPLOYMENT_IN_PROGRESS
- Step 1 ✅ 16:49 VNA `NODE_READY`;TGW Success;NSX:Distributed-vlan-connection-5(vlan 5, gw 192.168.15.254/24)、Default VPC Connectivity Profile ext=`vks-block`、service gateway=`vks-vna`(截圖 19)
- Step 2(16:5x)Supervisor Management → GET STARTED(路由 `/ui/app/workload-platform`,🔴 Git Bash 要 `MSYS_NO_PATHCONV=1`)
  1 VCF Networking with VPC → 2 CLUSTER DEPLOYMENT:`vcf-m05-sv01`、CP HA 關、`vcf-m05-cl01`、zone `vz-01` → 3 三個 policy 都 `vsan-ftt0`
  → 4 Mgmt:Static、`SDDC-DPortGroup-VM-Mgmt`、**IP Addresses 要填範圍** `10.0.1.184-10.0.1.188`、/23、gw 10.0.0.1、DNS 10.0.0.200、search home.lab、NTP 10.0.1.254
  → 5 Workload(自動 VPC):Project Default、Default VPC Connectivity Profile、vks-block、Service CIDR 172.29.0.0/16、DNS/NTP 同上
  → 6 CP size **small**(4/16)、API DNS 不填 → 7 FINISH(截圖 21-31)
  前置:`SDDC-DPortGroup-VM-Mgmt` 開 promiscuous/forged/macchanges(nested,lab 筆記 vcf91-supervisor-cpvm-portgroup)、vSAN health 靜音、HA+DRS Fully Automated ✅
  監看 `watch-sv.sh` → `watch-sv.log`
- Step 2 ✅ **17:39 Supervisor `vcf-m05-sv01` RUNNING / READY**(16:54 → 17:39,約 45 分)
  - 16:54-17:23 CONFIGURING → 17:23 **ERROR**(`Need 2 net devices`、`Waiting for API Master IP assignment`、Pinniped/coredns 起不來)→ 17:27 自己回 CONFIGURING → 17:39 RUNNING
  - 卡的時候在 CP(10.0.1.184,`decryptK8Pwd.py` 取密碼;🔴 guest-ops 指令要 `MSYS_NO_PATHCONV=1`)看到:system VPC `GatewayConnectionReady=False reason=GatewayConnectionNotSet`、`AutoSnatEnabled=False (SNAT not supported in TEP-less mode)`;
    kube-apiserver 被 CPU 餓到重啟 → nsx-operator leader election lost。CP small(4 vCPU)load 13.9,所在 esx03 26.6/30 GHz;**CP VM 不能手動 vMotion**(Resource.ColdMigrate 權限拒)。沒有改任何東西,等它收斂就好了
  - 結果:API VIP **192.168.15.5**(vks-block 配,VNA LB)、mgmt endpoint 10.0.1.184、CP workload NIC 192.168.15.10;esx01-03 都成 agent 節點
  - 本機實測:`https://192.168.15.5` 200、`:6443` 401、ping TTL 61 ✅(截圖 32)
- Step 3 ✅ Content Library `vkr-depot`(Subscribed,URL `http://10.0.0.61:8888/PROD/COMP/VKR/lib.json`,immediately,不套 security policy,vsan datastore)
  17:39 建 → 17:49 兩個 VKr cached(11.9 GB + 7.9 GB)(截圖 33-39)
- Step 4 ✅ Namespace `vks-lab`(Supervisor vcf-m05-sv01、zone vz-01)→ ADD STORAGE `vsan-ftt0` → ADD VM CLASS best-effort-xsmall/small/medium
  → Kubernetes Service「ADD LIBRARY」= 跳到 **Supervisor → Configure → General → Kubernetes Service → ADD** → 選 vkr-depot
  (🔴 第一次勾選看似沒生效,但 API `content_libraries=[{supervisor_services:[kubernetes.vmware.com], content_library: vkr-depot}]` 已寫入;重開對話框會變 No items found)
  → **KR 自動生成**:v1.35.6 / v1.36.2 READY+COMPATIBLE、OSImage 兩個(截圖 40-52)
  🔑 **推翻 memory vcf911-vks-supervisor-flb 的「KR 只有舊 API default_kubernetes_service_content_library 會生」**:這次 9.1.1 只用 UI 新欄位 content_libraries 就生出來了(舊欄位仍空)
- Step 5 ✅ SubnetSet `public`(kubectl,`vks/subnetset-public.yaml`,Public / 16 / DHCPDeactivated)→ Ready
  🔴 namespace「Resources」分頁的 **LCI(Local Consumption Interface,com.vmware.cci-ns 9.1.2.0)外掛一直空白**:直接開外掛 URL 停在 Loading...、`config.json` 404 → UI 建 SubnetSet / VKS 精靈都用不了,改走 kubectl
  登入:`kubectl vsphere login --server=192.168.15.5 -u administrator@vsphere.local --insecure-skip-tls-verify`(KUBECONFIG=E:\9.1\m04\vks\kubeconfig;工具 E:\9.1\tools\vks\bin)
- Step 6(18:0x)VKS cluster `vks-cl01`(`vks/vks-cl01.yaml`):builtin-generic-v3.7.0、v1.36.2+vmware.2-vkr.3、CP best-effort-medium ×1、worker best-effort-small ×1、vsan-ftt0、networks→SubnetSet public
  🔴 第一次被 capi webhook connection refused(capi-controller 剛重啟,重試即可)
  🔴 **pods CIDR 不能用 192.168.0.0/16**:`intersects with NSX-VPC reserved range (192.168.15.0/24)` → 改 10.244.0.0/16 → created(Provisioned)
  指令與輸出:`E:\9.1\m04\vks\0*-*.txt`
- Step 6 ✅ **18:21 vks-cl01 Available**(~16 分):CP 192.168.15.50(best-effort-medium)、worker 192.168.15.51(best-effort-small)、Photon、v1.36.2、CP VIP 192.168.15.32
  guest cluster:`kubectl vsphere login ... --tanzu-kubernetes-cluster-namespace vks-lab --tanzu-kubernetes-cluster-name vks-cl01` → 2 nodes Ready、系統 pod 全 Running
- Step 7 驗證:nginx 示範兩個坑 → ① **PSA restricted** 擋 root 容器(要 nginx-unprivileged + securityContext)② **ImagePullBackOff**:節點在 VLAN-backed VPC,無 SNAT、lab 無對外 NAT → 要私有 registry
  改用 <private> 做法:LoadBalancer Service → 叢集 CoreDNS(TCP 53)→ **VIP 192.168.15.34**,本機 `nslookup -vc kubernetes.default.svc.cluster.local 192.168.15.34` → 10.96.0.1 ✅
  vSphere Client 截圖 56-59(cluster Available、namespace VMs、VPC Subnets:`public-eb4f3751` 2 VMs、VPCs)
- [x] T10 VKS ✅(10-10 16:3x → 18:4x)— 文件 `<private-lab-repo>` PR #1(branch `docs/m05-new-instance-vks-step-by-step`,commit 547aa43)
- [x] T11 成品推 <private-lab-repo>:`vcf-installer/new-instance-step-by-step/`(33 圖 + redacted spec)、`vks/m05-step-by-step/`(46 圖 + manifests + cli/)、README 目錄表 → **PR 待使用者 merge**
### 現況(10-10 18:5x)
- 開著:m05 全套(含 Supervisor vcf-m05-sv01、VNA vks-vna、VKS vks-cl01、demo svc coredns-lb-demo);.95 上 m03 / m04 / 4 台小 VM 關機中
- m04 關機時 m05 的 Ops(fleet)看不到 m05;要開回 m04 照 Stop-M04.ps1 註解的反向順序

## T12 VKS 全 UI 重做(使用者 10-11:「VKS 部分在 m05 拆掉重做」+「SubnetSet/VKS cluster 都要以 UI 為主」+「沒 CUT 的都要做」)
- 範圍:m05 instance 保留;停 Supervisor、拆 VNA / Transit Gateway 連線設定 → 從準備步驟開始全部 UI 重做截圖(新截圖資料夾 `E:\9.1\doc-shots\m05-vks-ui\`)
- ✅ **LCI 空白根因(10-11)**:vSphere Client 語言 = zh-TW(My Preferences → Language 是 Browser Default,登入時瀏覽器是 zh-TW)
  → 外掛 `getUserLanguage()` 把 zh-TW 對成 `zh_TW`,但外掛只有 en/es/fr/ja 語系檔 → transloco 永遠不出畫面,cci-root 只剩 `<!---->`
  → **修法:右上使用者 → My Preferences → Language → Specify a language → English → SAVE → 重新整理**,Resources 分頁立刻出現(VM / Kubernetes / Container / VM Image / Network / Volume 卡片)
  - 只改 Chrome `--lang=en-US --accept-lang` 不夠(session 的 client locale 仍是 zh-TW);`start-cdp-chrome.ps1` 已加 `-Lang` 參數
  - 截圖:`m05-vks/zz-pref-lang-en.png`、`zz-lci-en2.png`
- ✅ 拆除(10-11 18:16-18:40,API/kubectl,不需截圖):guest 刪 coredns-lb-demo → `kubectl delete cluster vks-cl01`(30 秒)→ DELETE namespace vks-lab
  → Supervisor disable(`POST /api/vcenter/namespace-management/clusters/domain-c9?action=disable`,18:19→18:31,中途 kubernetes_status 跳 WARNING/ERROR 屬正常)
  → NSX:VPC connectivity profile default PATCH(🔴 PATCH 要帶 `transit_gateway_path` 否則 400)`external_ip_blocks=[]`、`service_gateway.enable=false`
  → DELETE TGW attachment → DELETE distributed-vlan-connection → DELETE ip-block vks-block → DELETE VNA cluster vks-vna(VNA VM + vna-seg PG 一起消失)
  → 刪 CL vkr-depot;PG 安全性改回 Reject;vSAN 3 項取消靜音
  - 🔴 `vsan-ftt0` 刪不掉:`still associated with 2 entities`,但 CNS 22 個 volume 都不是這個 policy、UI VM Compliance 也是 0 → PBM 殘留;**改名 `zz-stale-vsan-ftt0`**,UI 新建 **`vks-ftt0`**(避免 K8s compliant name 撞名)
  - 🔴 改 PG 安全性時 esx03 VDS outOfSync:`DvsApplyOperationFault` port 23/33/35 `vob.fssvec.Ioctl.file.failed`(.dvsData 寫入暫時失敗)→ Rectify + 再 toggle 一次 forged 就恢復 up
- ✅ 步驟 0 UI 重做(截圖 `m05-vks-ui/00-26`):語言 English、DRS/HA、vSAN Skyline Health 3 項 SILENCE ALERT、VM Storage Policy `vks-ftt0`(🔑 OSA 叢集要先關 **vSAN ESA Auto-RAID** 開關才有 FTT 選項)、PG Security 三個 Accept、
  VLAN 5 測試:New Distributed Port Group `tmp-vlan5-test`(VLAN 5)→ esx03 ADD NETWORKING vmk3 192.168.15.240/24 → `esxcli network diag ping -I vmk3` 3/3 → UI 移除 vmk3 + 刪 PG;DNS nslookup(`vks-ui/00-*.txt`)
- ✅ 步驟 1 UI(19:08-19:23,截圖 27-40):Virtual Private Clouds → GO TO NETWORK CONNECTIVITY(= vCenter → Networks → Transit Gateways)→ SETUP NETWORK CONNECTIVITY
  → Distributed VLAN Connection → Prerequisites Select All → VLAN 5、Gateway CIDR `192.168.15.254/24`(🔴 是 tag 輸入,要按 Enter)→ IP Blocks ⋮ Create New `vks-block` 192.168.15.0/24 排除 .240-.254
  → VNA `vks-vna` Large + ADD node `vcf-m05-vna01a.home.lab`/vcf-m05-cl01/vsan/Static `10.0.1.183/23` gw 10.0.0.1/SDDC-DPortGroup-VM-Mgmt → DEPLOY 19:15 → NODE_READY ≤19:23
  - 🔑 9.1.1 VNA transport node `resource_type=VirtualNetworkAppliance`(`?node_types=EdgeNode` 查不到)
- 步驟 2 UI(截圖 41-49):舊 zone `vz-01` 還在(停 Supervisor 不會刪)→ API 先 `zones/cluster/vz-01/associations?action=remove` 再 DELETE zone → CLUSTER DEPLOYMENT 重新建 vz-01
  → 精靈同上次(vks-ftt0 ×3、Static 10.0.1.184-188、Network combobox 要點 ▼ 才有選項)→ **FINISH 19:34**,`watch-sv.sh` 監看
- 步驟 3 UI(截圖 50-56):Content Library `vkr-depot` Subscribed → 19:33 建立、Sync 開始
- ✅ 步驟 2 **20:04 Supervisor RUNNING/READY**(19:34→20:04,30 分,這次沒出 ERROR);API VIP 192.168.15.5、mgmt 10.0.1.184;443=200、6443=401(截圖 58)
- ✅ 步驟 3 vkr-depot 19:33 建 → 19:41 兩個 VKr cached(截圖 57)
- ✅ 步驟 4 UI(截圖 59-70):NEW NAMESPACE vks-lab → ADD STORAGE vks-ftt0 → ADD VM CLASS xsmall/small/medium → ADD LIBRARY 跳 Supervisor Configure → General → Kubernetes Service → ADD(🔴 ADD 是 link 樣式,get_by_role 抓不到)→ vkr-depot
  → KR 兩個 READY/COMPATIBLE 秒生(`vks-ui/02-kr.txt`)
- ✅ 步驟 5 UI(截圖 71-75):Resources(LCI,English 後正常)→ Network GO TO SERVICE → SubnetSets → NEW SUBNETSET `public` / Public / 16 IPs / DHCP None → Success(`vks-ui/03-subnetset.txt`)
- 步驟 6 UI(截圖 76-87):Kubernetes CREATE CLUSTER → Custom Configuration → General(vks-cl01、v3.7.0、v1.36.2、medium、vks-ftt0、Network → Primary eth0 → Use custom primary network → public (Subnet Set);Pods CIDR 預設 10.95.0.0/16 不撞)
  → Control plane 1 × Photon 5 → Node pools Edit:改名 vks-cl01-np-1、Overrides → VM class best-effort-small → Review(YAML 存 `vks-ui/vks-cl01-ui-generated.yaml`)
  → 🔴 20:17 FINISH 被擋:`spec.topology.variables[networks] ... variable is not defined`
    原因:ClusterClass builtin-generic-v3.7.0 `status.variables` 沒有 networks(VariablesReady 12:00:38Z,早於 runtime-extension 12:01:36Z 起來、也可能早於 capability `supports_vks_multi_networks`)
    ClusterClass 有 reserved label 不能 annotate 觸發 reconcile;先等 CAPI resync(預設 10m)
  → 20:22 ClusterClass `status.variables` 自己出現 networks(CAPI resync)→ 同一精靈頁再 FINISH 成功 → **20:38 vks-cl01 Available**(CP 192.168.15.50 medium、worker .51 small、API VIP .32)
- ✅ 步驟 7:guest login、2 nodes Ready、系統 pod 全 Running;coredns-lb-demo VIP **192.168.15.33**,10.0.0.200 nslookup OK;LCI Network → Services 看得到兩個 LB(截圖 88-94,CLI `vks-ui/04-06`)
- ✅ **T12 完成(10-11 20:4x)**:文件推 <private-lab-repo> PR #1 第 2 個 commit `134fa89`(vks/m05-step-by-step 全換:94 圖 + cli/ + UI 產生的 vks-cl01.yaml),PR 說明已更新
### 現況(10-11 20:5x)
- m05:Supervisor vcf-m05-sv01 RUNNING、VNA vks-vna、ns vks-lab、SubnetSet public、vks-cl01 Available、coredns-lb-demo 在跑;storage policy `vks-ftt0`(新)+ `zz-stale-vsan-ftt0`(PBM 殘留刪不掉)
- vSphere Client(administrator@vsphere.local)語言偏好已改 **English**;CDP Chrome 以 `-Lang en-US` 啟動
- m03 / m04 / .95 上 4 台小 VM 仍關機(4 台小 VM:使用者 10-11 說不理它們,維持現狀)

## T13 VKS air-gap 版(使用者 10-11:「VKS 全拆,斷網重做」+ 管理網段不擋、以內部來源為準 + 獨立 Harbor VM + 同意下載)
- 現況實測(RouterOS ping):VLAN 5 src 192.168.15.254 → 8.8.8.8 **100% loss**(上游 10.0.0.1 沒 NAT 這段)= VKS 資料面本來就斷網;
  管理網段 10.0.x 可出網且**不經 RouterOS**(m05 gw=10.0.0.1)。RouterOS 無 NAT/無 filter,default → 10.0.0.1。使用者選不擋管理網段
- 規劃:Harbor VM(管理網路,offline installer + Docker static,自簽 CA)→ image 走「本機 pull 成 tar → 搬進 → push」→ VKS 全拆重做
  VKr 改 **Local Content Library + 匯入檔案**(不靠 http 訂閱)→ Supervisor Container Registries 加 Harbor CA → VKS 叢集信任 Harbor CA → 從 Harbor 部署 nginx + LB
- 文件:<private-lab-repo> `vks/m05-airgap-step-by-step/`,截圖 `E:\9.1\doc-shots\m05-vks-airgap\`
- ✅ 拆除(10-11 22:03-22:17):LB/叢集/ns → Supervisor disable(13 分)→ NSX profile/attachment/DVC/vks-block/VNA → zone vz-01(先解關聯)→ CL vkr-depot;保留叢集層準備(vks-ftt0、PG 安全性、vSAN 靜音、English)
- ✅ Harbor VM `harbor01.home.lab` 10.0.0.86(clone ubuntu2004temp,.97/SSD3/VM Network,4 vCPU/8 GB,+100 GB /data;root=template 密碼 <redacted>;DNS A+PTR 已建)
  - 🔴 GitHub release 下載只有 30-50 KB/s(offline installer 713 MB 不可行)→ 改:Docker Hub pull goharbor/* 12 個 image → `docker save` 761 MB tar → rmi → `docker load`(= offline installer 內容)+ online installer 腳本(12 KB)
  - 🔑 Harbor 2.15 沒有 redis-photon,改 **valkey-photon**;image 清單從 prepare 的 docker-compose.yml.jinja 撈
  - Docker 29.9.0 靜態包 + compose v5.6.0(`E:\9.1\airgap\scripts\install-docker-static.sh`);自簽 CA(`make-harbor-certs.sh`,CA 公鑰 `E:\9.1\airgap\harbor01-ca.crt`)
  - **harbor01 自己斷網**:iptables OUTPUT + DOCKER-USER 只放私有網段(`airgap-egress-block.sh` + systemd airgap-egress.service);不裝 Trivy(要上網抓 DB)
  - Harbor v2.15.4 安裝成功(9 容器 healthy),admin / lab 標準密碼;UI 建 public project `vks-apps`
  - 測試 image:本機 `pull-image-tar.py`(registry API → docker-archive tar,不需 docker)→ SFTP → `docker load` → push `vks-apps/nginx-unprivileged:1.30.4-alpine`、`vks-apps/busybox:1.37.0`
- 截圖 `doc-shots/m05-vks-airgap/10-15`(Harbor UI);使用者 10-11 再叮嚀:**文件以 UI 為主,只有指令的才用 CLI**
- ✅ Step 1 UI(22:28 DEPLOY → 22:44 VNA NODE_READY,16 分,和 VKr 上傳同時跑較慢)截圖 20-29
- ✅ VKr Local CL `vkr-local`(UI,截圖 40-47):Import item → Local file → 選 .ovf/.vmdk/.mf/.cert 4 檔 → item 名 `ob-25650988-photon-5-amd64-v1.36.2---vmware.2-vkr.3` → 上傳 ~3 分 → 11.87 GB
  - 🔴 Playwright over CDP `set_input_files` 限 50 MB → 改 CDP `DOM.setFileInputFiles`(瀏覽器直接讀本機路徑)
  - VKr 檔從 depot `http://10.0.0.61:8888/PROD/COMP/VKR/<item>/` 複製到 `E:\9.1\airgap\staging\vkr\`,.mf SHA256 校驗 OK
- Step 2 Supervisor UI(截圖 30-38)FINISH 22:52,watch-sv.sh 背景
- ✅ Step 2 **23:42 Supervisor RUNNING**(22:52→23:42,50 分;比 UI 版慢,中途 k8s ERROR→WARNING→READY 屬正常)
- ✅ Supervisor → Configure → **Container Registries → ADD REGISTRY** harbor01 / harbor01.home.lab / TLS Certificate 貼 Harbor CA(無帳密、不設 default)
  → 頁面原文:「Settings applied here will be honored for Supervisor Services, Pods, and VKS clusters」→ Supervisor 產生 `ClusterRegistryConfig image-registry-…`(server=harbor01.home.lab, caCerts)
  → 🔑 **VKS 叢集不用另設 trust 變數 / user-trusted-ca-secret**,節點直接信任 Harbor
- ✅ ns vks-lab + vks-ftt0 + VM class ×3 + K8s Service library **vkr-local** → KR v1.36.2 秒生(`vks-airgap/02-kr.txt`)
- ✅ SubnetSet public(🔴 LCI 的 NEW SUBNETSET 對話框在另一個 `…/modals/modals.html` iframe)
- ✅ ClusterClass `networks` 23:57 出現(Running 後 15 分)→ 00:02 LCI CREATE CLUSTER(同 UI 版)→ **00:18 vks-cl01 Available**(CP .50、worker .51)
- ✅ 驗證:`nginx-harbor.yaml`(harbor01.home.lab/vks-apps/nginx-unprivileged)2/2 Running、LB **192.168.15.33** curl OK;
  反向測試 `pull-test.yaml`:docker.io busybox **ImagePullBackOff**(registry-1.docker.io 逾時)、Harbor busybox Completed 並能 wget nginx-lb;Harbor UI pulls 計數 +1
- ✅ **T13 完成(10-12 00:4x)**:文件 <private-lab-repo> PR #1 第 3 個 commit `cef58fd` → `vks/m05-airgap-step-by-step/`(59 圖、cli/、scripts/、manifests、harbor.yml.example 密碼遮蔽);repo 索引 + UI 版 README 加連結;PR 說明已更新
### 現況(10-12 00:4x)
- m05:Supervisor vcf-m05-sv01 RUNNING、VNA vks-vna、ns vks-lab、SubnetSet public、vks-cl01 Available、demo ns(nginx ×2 + nginx-lb 192.168.15.33、from-dockerhub 失敗 pod、from-harbor Completed)
- CL:`vkr-local`(Local,v1.36.2);Supervisor Container Registry harbor01
- harbor01(外層 .97/SSD3)開機中,iptables 斷網;staging 檔在 `E:\9.1\airgap\staging\`(docker/compose/harbor installer、image tar、VKr 3.3 GB)

## T14 VKS on VDS + Foundation Load Balancer(UI step-by-step,一般版)— 使用者 10-12:「m05 拆 VPC 版改做 FLB」
- 規劃:Supervisor 用 **VDS** networking + **Foundation LB**(不用 NSX VPC / VNA);mgmt Static 10.0.1.184-188;workload = 新 dvpg VLAN 5(192.168.15.0/24,gw .254);
  FLB One Arm Small、mgmt 網路另取名、VIP 192.168.15.64-95;VKr 用訂閱 vkr-depot(內部 depot);驗證 CoreDNS LB
- 參考:m02 09-22 VDS+FLB 實測(memory vcf911-vks-supervisor-flb:workload Network Name 要小寫 RFC1123、spherelet 被 vSAN health 擋)
- 截圖 `E:\9.1\doc-shots\m05-vks-flb\`,文件 <private-lab-repo> `vks/m05-flb-step-by-step/` + docx
- ✅ 拆 VPC/air-gap 版(17:24-17:52):demo ns、叢集、ns、Supervisor disable(17:32→17:51)、NSX profile/attachment/DVC/vks-block/VNA、zone、CL vkr-local
- ✅ 準備:UI 建 dvpg **vks-workload-vlan5**(VLAN 5、Customize default policies → Security 三個 Accept;名稱小寫避開 RFC1123 坑)截圖 01-05
- ✅ Supervisor(VDS + FLB)UI 截圖 10-22:Step1 VDS + Load Balancer Type = **Foundation Load Balancer** → CLUSTER DEPLOYMENT vcf-m05-sv01/vz-01 → vks-ftt0 ×3
  → Mgmt Static 10.0.1.184-188 → Workload Static pg vks-workload-vlan5、Network Name 自動帶(小寫 OK)、services 10.96.0.0/23 預設、IP 192.168.15.32-63/24 gw .254
  → LB:flb-vcf-m05-sv01、One Arm、Small、**HA 改 1**(選項 1=SINGLE_NODE / 2=ACTIVE_PASSIVE)、Management Network ASSIGN:Static、SDDC-DPortGroup-VM-Mgmt、名稱 **flb-mgmt-net**、10.0.1.193-194(說明寫「Two IP addresses」)、VIP **192.168.15.64-95**
  → FINISH 17:59 → **18:40 RUNNING**(41 分);API VIP **192.168.15.64**;FLB VM 2 vCPU/4 GB,NIC workload 192.168.15.33 + mgmt 10.0.1.193
- ✅ CL vkr-depot(訂閱)UI 截圖 30-35;ns vks-lab(Default Network = vks-workload-vlan5)+ storage/VM class/library 截圖 40-46;KR 兩個 READY
- 🔑 VDS 模式 ClusterClass **沒有 networks 變數**(正常,不用 SubnetSet),LCI 精靈 Custom config 不動 Node Network → YAML 無 networks
- 叢集 LCI 送出 18:50(截圖 73-81)
- ✅ **19:05 vks-cl01 Available**(CP .37、worker .38);CoreDNS LB VIP **192.168.15.67**,nslookup OK;FLB 配 VIP:.64 sv API、.65 mgmt-image-proxy、.66 叢集 API、.67 demo;FLB Health Healthy(截圖 82-84)
- ✅ 文件 `vks/m05-flb-step-by-step/`(43 圖)commit **d997bbd** 已推 PR #1;docx `E:\9.1\deliver\vks-m05\VKS-VDS-FLB-UI-Step-by-Step.docx`(30 頁)
## T15 FLB air-gap 版(使用者 10-12:「要 air gap 版 再來一次」)— 拆 → harbor01 + Local CL 匯入 VKr + Supervisor(VDS+FLB)+ Container Registries + Harbor 部署 + Docker Hub 反向測試
- ✅ T15 拆(19:12-19:26)→ vkr-local UI 匯入(19:14-19:20,5 分)→ Supervisor VDS+FLB UI(19:32 FINISH → **20:07 RUNNING**,35 分)
  → Container Registries harbor01 → ns vks-lab + vkr-local(KR v1.36.2)→ LCI 叢集 20:18 → **20:28 Available**(10 分,.37/.38)
  → nginx from Harbor 2/2、LB **192.168.15.67** curl OK;docker.io ImagePullBackOff、Harbor Completed;Harbor pulls 1→2
  - 🔴 flb_sv.py:Supervisor 精靈欄位是 `name=` 屬性(不是 formcontrolname);FLB「ASSIGN」按鈕 accessible name = `Management Network Assign`
  - 🔴 vSphere Client 跳「Plugin … deployed. Refresh the browser」橫幅會把版面下移 → 座標點擊前先關橫幅
- ✅ 文件 `vks/m05-flb-airgap-step-by-step/`(42 圖)commit **5b56f92**;PR 說明加第 4、5 節;docx `VKS-VDS-FLB-Airgap-UI-Step-by-Step.docx`(29 頁)
### 現況(10-12 20:4x)
- m05:Supervisor VDS+FLB(API .64、FLB VM 10.0.1.193)、ns vks-lab、vks-cl01 Available、demo ns(nginx-lb .67 + pull-test pods);CL vkr-local;Container Registry harbor01
- 四份文件 + 四份 docx 都在 PR #1 / `E:\9.1\deliver\vks-m05\`
