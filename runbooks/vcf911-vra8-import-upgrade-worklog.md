# vRA 8 + vROps 8 → VCF 9.1 Import 測試

> 狀態檔（對抗 context 壓縮）。最後更新 2026-09-04。
> 使用者要「把 vRA 8 / vROps 8 import 進 VCF 9.1」並產出 UI 截圖 + 實測 import。

## 目標
1. **vRA 8.18 → VCF Automation 9.1**：用 vra9 當來源，實測 import + 截圖。
2. **Aria Operations 8.18.6 → VCF Operations 9.1**：用 vrops 當來源，實測 import + 截圖。
兩條都從 nested VCF Operations (10.0.1.22) 驅動。

## 「import」的真相（agent 查證，2026-09-04）
- **不是** Cloud Assembly 輕量精靈。是 **VCF Operations 驅動的 blue-green 升級**：
  路徑 `VCF Operations → Build → Lifecycle → VCF Management → Upgrade`。
- 前置：來源要先 **import 成 VCF Operations 管理的實例**，才看得到 Upgrade。
- 機制：另建一整套新 VCFA 9.1 cluster（要獨立 IP pool + FQDN）→ 從**開機中的來源** live 匯出
  （vCenter 快照 + SSH export DB）→ stage 9 才關舊來源 → 灌新 cluster → 切 FQDN。
- **來源必須開機+健康**（8 stage 都 live 讀），到 stage 9 才 power off。
- 版本：來源需 **8.18.1+**；目標 **9.1.0 就支援**（不必 9.1.1）。
- 網路前置：VCFA 是 9.1.0.0200（<0400）→ 新 runtime 要**專用 /29（8 IP）+ 專用 FQDN**（FQDN 解到 pool 外）。
- 還要：depot 下載 9.1.0 upgrade binaries + **Migration Service Engine**。
- 不搬：truststore（事後補 CA）、SSO（vIDM→VCF Identity Broker 另做）；逐物件清單官方未明列。
- 來源：`techdocs.broadcom.com .../phase-3-import-and-upgrade-aria-automation-8-to-vcf-automation-9`
  + VCF blog「Aria Automation 8.18.1 → VCF Automation 9.1 deep dive」。

## vROps 真相（agent 查證，2026-09-05）— 跟 vRA 完全不同！
- Operations **沒有 import 精靈**。是 **in-place PAK 升級**：登入 vrops 的 `/admin` UI →
  `Software Update → Install a Software Update` → 上傳 **VCF Operations 9.1.1.0 的 PAK** → Install。
- **appliance-local**，官方**不要求**被監控 vCenter 在 fleet 內 → 外層 standalone vrops(.111) **可行**，
  不必碰 nested fleet。結果是一套 standalone VCF Operations 9.1（除非另用 cloud proxy 併入 VCF instance）。
- 來源需 8.18.x（8.18.6 ✅）；目標 PAK 文件寫 **9.1.1.0**。
- 前置：升級前**先 snapshot + 備份自訂內容**；vCenter 整合欄位要乾淨 IP/FQDN(無斜線)；cert SAN 含節點+VIP。
- 內容(dashboard/policy/super metric/MP/歷史資料)因 in-place 留在同一台，官方叫你自己備份，沒逐項 migrate 表。
- 需要 binary：**Operations 9.1.1.0 PAK**（Broadcom Support Portal 下載；air-gap 要先弄到手）。
- 來源：techdocs `.../upgrade-backup-and-restore/install-a-software-update` + VCF Ops 9.1.1.0 release notes。

## 🔴 重大結論：兩條線可行性天差地別
- **vROps**：in-place PAK，**可行且乾淨**，能做真實測試 + 真截圖。不必動 nested fleet。
- **vRA**：blue-green fleet import，driven by nested VCF Operations(10.0.1.22)，但來源 vra9 在**外層 vCenter**
  → nested VCF Ops 無法對外層 VM 做快照/管理（除非把外層 vCenter 併進 fleet=不可行）。
  **真實跑完 end-to-end 在此拓樸很可能不可行**，最多走精靈+precheck 截圖（且 precheck 大概會卡在
  「instance 未 import 進 VCF Operations」）。需先驗證 nested VCF Ops 能否接受「外部 vCenter 憑證」。

## 🔴 (舊)關鍵可行性風險（待驗）
來源 vra9(.168) / vrops(.111) 都在**外層 vCenter 10.0.0.101**，而驅動 import 的是 **nested VCF
Operations 10.0.1.22**，其 fleet 只含 nested vCenter (vcf-m02-vc01 10.0.1.19)。
外層 vCenter **不在 nested fleet 內**。import 需要 VCF Operations 能對來源 VM 做 vCenter 快照 + SSH，
**若強制要求來源 vCenter 已在 fleet 內 → 這條路可能不可行**（不可能把外層 vCenter 併進 nested fleet，
它跑著整個 lab）。→ vROps research agent 已明確要求查這點。網路面 10.0.1.x↔10.0.0.x 有 RouterOS 路由，應可達。

## 目前狀態（VM 電源）
| VM | IP | 角色 | 狀態 |
|---|---|---|---|
| vra9 | 10.0.0.168 | **vRA import 來源** | ✅ 開機、API 健康、已補測試資料 |
| vidm9 | 10.0.0.167 | vra9 的 identity | ✅ 開機健康(302) |
| vrops | 10.0.0.111 | **vROps import 來源** | ✅ 開機、8.18.6、UI 200 |
| vra / vidm / vrlcm | .203/.202/.201 | 原本這套(真實資料) | ⚫ 已依使用者指示關機 |

## vra9 測試資料（2026-09-04 盤點+補）
- cloud account `vc-labvc8`(vCenter 10.0.0.101)、cloud zone `vc-labvc8 / Datacenter`
- project `vra9-lab`(id f860de7a-1aba-4c74-bc80-0d88b70b9de9)
- 藍圖：ubuntu-medium、centos7-small、**MIGRATION-TEST-20260904**(標記,id 2bf15e3b-...,含 migrationMarker 屬性)
- deployment：1 個(既有)
- API helper：`E:\8\deploy\vra9-api.sh`（admin/VMware1!VMware1! System Domain）；refs `vra9-refs.sh`

## 工具/存取
- govc：`E:\9.1\tools\govc.exe`，`GOVC_URL=https://10.0.0.101 administrator@vsphere.local/VMware1! GOVC_INSECURE=1`
  🔴 Git-Bash 要 `MSYS_NO_PATHCONV=1` 否則 `/Datacenter` 被改寫成 `C:/Program Files/Git/...`
- 截圖：CDP live 存本機 PNG（見 memory vcf91-browser-screenshot-to-file / doc-screenshots-use-cdp）
- nested VCF Operations 入口 10.0.1.22（走 FQDN/Host header，直打 IP 404）

## vROps 執行細節（PAK 就緒後照跑）
- **PAK 檔**：`E:\9.1\Operations-Upgrade-9.1.1.0.25679887.pak`（2026-09-05 下載中，`.crdownload`，
  ~4.5GB 還在長；背景監看 job `b4keosntt` 等它變成正式 `.pak`）。
- **來源 vrops**：`/Datacenter/vm/Aria/vrops`，vrops.home.lab / 10.0.0.111，**單節點** 4vCPU/16GB，
  8.18.6，`/admin` 302、suite-api 401（活著）。⚠ 4vCPU/16GB 對 9.1 偏小，可能有 sizing 警告。
- **步驟**（官方 in-place PAK）：
  1. 🔴 升級前先 `govc snapshot.create -vm /Datacenter/vm/Aria/vrops pre-vcfops91`（安全網）+ 備份自訂內容
  2. 瀏覽器登入 `https://vrops.home.lab/admin`（用 CDP 有頭模式，可截圖）
  3. Software Update → Install a Software Update → 勾確認 → Next
  4. 上傳 PAK → Next → 接受 EULA → Next → **Install**（會登出、服務重啟）
  5. 重新登入 /admin → Software Update 監看；節點 offline→Going Online→online 完成
  6. 完成後**刪除升級前 snapshot**（留著會拖效能）
- **截圖**：CDP live 存本機 PNG（見 memory）。admin 帳密：vROps admin（待確認密碼，多半 VMware1!VMware1! 或既有）。
- 🔴 動作分界：snapshot+上傳 PAK 屬安全/可逆，但**按 Install 前先跟使用者確認**（真正就地升級點）。

## 🟡 vROps 升級目前進度（2026-09-06，停在 Install 閘門）
- ✅ snapshot `pre-vcfops91-20260905` 已建（回復點）
- ✅ CDP Chrome(9222,獨立 profile) + cdp-live.mjs 驅動；截圖在 `E:\9.1\doc-shots\vrops-upgrade\`
  01 登入頁 / 02 系統狀態 / 03 軟體更新 / 04 精靈step1 / 05 PAK已選 / 06+06b 上傳完暫存中
  / 07 EULA / 08 逾時登出 / 09 重登後系統狀態(確認無誤觸) / 10 **已上傳待安裝**
- ✅ PAK 上傳完成 + 暫存完成 + EULA 已接受（使用者 2026-09-06 明確同意「你勾 我同意」）
- **現況**：軟體更新頁顯示「下列軟體更新已上傳但尚未安裝」
  名稱 **VMware Cloud Foundation Operations** / 版本 **9.1.1.0.25679887**
  節點 vrops：**6/14 - 已部署新的升級內容**，狀態 **候選**
  按鈕：**完成安裝** / 取消安裝
- ✅ **使用者 2026-09-06 說「按」→ 已執行安裝，升級進行中**
  流程：完成安裝 → 精靈重開(PAK已就緒,簽章有效) → 下一步 → EULA 勾選(`checkbox-1403-inputEl`)
  → 更新資訊 → 步驟4 → **按下「安裝」** → 畫面轉「VMware Aria Operations 不可用」= 叢集重啟中
  截圖 11 install-confirm / 12 eula-accepted / 13 update-info / 14 install-step4 / 15 install-started
  背景監看 job `bqkqulmyc`（每3分探 suite-api，版本回 major 9 即完成）
- ⚠️ **未跑 pre-upgrade assessment tool**（官方步驟2，說 imperative）：9.1 移除大量 metric，
  可能造成既有 dashboard/view/report/alert 內容損壞。已告知使用者、其選擇繼續；snapshot 可回復。
- 🔴 升級完成後要做：驗證版本/叢集 online → **刪除 snapshot `pre-vcfops91-20260905`**（留著拖效能）
- 坑：admin session 會在長時間等待中逾時登出（暫存那幾分鐘就中招）→ 重登即可，
  進度保留在伺服器端不會掉。重登後務必確認 SSH toggle 沒被誤觸（實測沒有）。

## ✅ vROps 升級完成（2026-09-06 13:53 叢集 Online）
**8.18.6.25211474 → VCF Operations 9.1.1.0.25679751**，產品自報
"Upgrade to VCF Operations has completed successfully"。
- 時間軸：13:30 按下安裝 → 13:42 API 回 9.1.1（**但此時仍 Going Online，版本號會提早報喜**）
  → 13:48 Last Status → **13:53 analytics 回應資源查詢 = 真正 Online**。全程約 23 分鐘。
- 驗證：叢集 Online / 節點 Primary+Running+Online / SSH 仍關 / 8 個介面卡都在
  （含監控外層 vCenter 的 `labvc.lab.com [VMWARE]`）/ 資料完好（1 DC、1 Cluster、3 Host、**74 VM**）
  / Dashboard 樹完整 / 產品 UI 走新路徑 `/vcf-operations/ui/operate/...`
- 截圖 16-22（post-upgrade login / status / product UI home / dashboards）
- 🔴 **待辦：VCF Operations is not registered** → 需到 Licenses & Registration 註冊授權
- 🔴 **snapshot `pre-vcfops91-20260905` 刻意保留**（因未跑 assessment tool，內容損壞風險未清）
  ——使用者確認內容無誤後才刪。官方說留著會拖效能。

### 本輪踩到的坑
1. **admin session 會在長時間等待中逾時登出**（暫存那幾分鐘就中招）→ 重登即可，
   伺服器端進度保留。重登後要確認沒誤觸（實測 SSH toggle 沒被動到）。
2. **抓 checkbox 不能只取第一個可見的**（畫面有 7 個可見 checkbox，第一個是別的 toggle）
   → 要用「鄰近文字含『我接受』」精準比對（正解 id `checkbox-1403-inputEl`）。
3. **PAK 上傳用 CDP `DOM.setFileInputFiles` + objectId**，繞過原生檔案對話框（腳本見下）。
4. **版本 API 會提早回報成功** → 完成判準要用「analytics 能回應 `/suite-api/api/resources`」。
5. Windows node 把 bash 的 `/tmp` 當成 `E:\tmp` → 暫存檔要用完整 Windows 路徑。

## 🔴🔴 vRA import 封鎖確認（2026-09-06,官方文件逐字佐證,此結論不會再變）
**官方前置逐字**（Import an Existing VMware Aria Automation Instance in VCF Operations, 9.1）：
> "Verify that your VMware Aria Automation 8.18.1 and later instance **resides in the management
> domain of the VCF Instance** where you want to import it to."

Import 精靈（Build > Lifecycle > VCF Management > Components > Add Component > VCF Automation >
Deployment Type > **Import 8.x appliance**）**只有 3 個欄位**：
VCF Instance(下拉選單) / Primary node FQDN / Primary node root password。
**沒有任何外部 vCenter 欄位** → 快照與電源操作只能用所選 VCF Instance 管理網域的 vCenter。
∴ **standalone 的 Aria Automation（跑在沒有 SDDC Manager 的一般 vCenter 上）無法 import**。

實證佐證（本 lab UI 讀到的）：
- 剛升好的 .111 VCF Operations → Build > Lifecycle > VCF Management 要求
  「Upgrade SDDC Manager to 9.1+ 的 VCF Instance」，下拉是 **"No VCF Instances added"** → 裝不了 fleet 引擎
- nested 10.0.1.22 有 fleet 引擎，但 vra9 在外層 vCenter、不在它的管理網域

### 官方唯一補救 = **Converge（不是 VCF Import！）**
VCF Import 產生的是 *VI workload domain*，**不滿足 management domain 前置**。
Converge 才會把既有環境變成「新 VCF Instance 的 management domain」。
支援情境含「vCenter + ESX + Aria Suite Lifecycle + Aria Automation(+vSAN/NSX 選配)」，
該頁 Next Steps 直接寫「Import your VMware Aria Automation in VCF Operations and upgrade to 9.1」。
**Converge 來源版本硬性要求**：ASL **8.18**、Aria Automation **8.18.1 Patch 3**、vCenter **8.0 U3a**、
ESX **8.0 U3**；vDS 8.0+、VMkernel 靜態 IP、最少 3 host(vSAN)或 2 host(外部儲存)、
🔴 **Enhanced Linked Mode / VCHA 不支援**、不可部分匯入叢集。
**無任何 standalone/離線 migration 工具**。

### 資源數字（官方）
- VCF Automation：1 FQDN + **5 IP**；VCF services runtime：1 FQDN + **最少 12 IP**(建議 30)
- 升級用：9.1.0.0~0300 需專用 **/29(8 連續 IP)**；9.1.0.400+ 放寬為 5 個不必連續
- Simple 第一個 VCF instance 整體 **76 vCPU / 251GB RAM / 7448GB disk**（含 VCFA 1x Small）
- （非官方社群數字）VCFA Simple/Small 單節點約 24 vCPU / 96GB RAM

## 🔴 nested VCF Operations (10.0.1.22) 產品 UI 無法操作（2026-09-06 實測）
**一按下 LOG IN,Chrome renderer 就整個卡死**——連 CDP `Page.enable`/`Runtime.evaluate` 都無回應。
- 重現 4 次；換獨立 profile、重啟 Chrome、另起 port 9223 + `--disable-gpu --disable-dev-shm-usage
  --max-old-space-size=4096` + 縮小視窗 1440x900,**全部一樣卡死**。
- **不是 appliance 問題**：suite-api token OK、`/resources` HTTP 200 **0.10 秒**、
  `/ui/login.action` 200 **0.11 秒**。
- **不是瀏覽器整體問題**：同一個 Chrome 開 example.com 秒回；
  且**剛升好的 .111（VCF Operations 9.1.1）同款 UI 完全正常**（Build/Lifecycle 都能操作）。
- 推測差異：nested 這台是 **9.1.0 舊 build**，或登入後要拉整個 fleet 資料把 renderer 撐爆。
- 深層連結繞不過：`/vcf-operations/ui/build/lifecycle?...` 會被導回 `login.action?...&uri=<base64>`。
- ⚠️ 輪詢 URL 判斷「是否離開登入頁」時,正則別用 `home`——會誤中 `ops01.**home**.lab`（我踩過）。
→ **結論：拿不到 Import 精靈的截圖**。但這不影響可行性結論（該結論來自官方文件逐字 + .111 的 UI 實證）。

## 🔴 「把外層 vCenter 加進 .111 當 VCF Instance 再 import」— 實證不可行（2026-09-06）
使用者提議：外層 vCenter 註冊進升好的 .111 VCF Operations 成為 VCF Instance，讓 vra9 可 import。
在 .111 UI 實測（Administration > SDDC Manager > VCF Instances）：
- 頁面前置逐字：「Create a VCF Instance **or connect an existing VCF instance**」/
  「Import an existing standalone vCenter as a management domain or workload domain **of a VCF instance**」
  （= 把 vCenter 匯入到*既有* VCF instance 裡，不是讓 vCenter 本身變 instance）/ 標示 **VCF License Required**
- 唯一按鈕 **ADD EXISTING VCF INSTANCE** → 導到 Integrations > 「VMware Cloud Foundation」管理套件 (9.1.1.0.25679832)
  > ADD ACCOUNT，表單欄位：Name / Description / Physical Data Center / **SDDC Manager**(FQDN) /
  Credential / Cloud Proxy / Collect Logs。**沒有任何 vCenter-only 選項。**
- 外層 vCenter 已以 `labvc.lab.com [VMWARE]` 介面卡接在 .111 上 —— 那只是監控帳戶，不是 VCF Instance。
∴ 沒有 SDDC Manager 的 vCenter **永遠不會出現在 Import 精靈的 VCF Instance 下拉**。
截圖：33 admin-sddcmanager / 34 pack-detail / 36 add-vcf-account-form。表單已取消、未送出。
UI 坑：ADD ACCOUNT 在 **iframe** 內，`querySelectorAll`/`elementFromPoint().click()` 都碰不到，
要用 CDP `Input.dispatchMouseEvent` 真滑鼠事件；表單欄位要走 `iframe.contentDocument` 讀。
**官方文件對照（2026-09-06 agent 查證，與 UI 實測一致）**：
- 「VCF Instance」的唯一整合入口 = Administration > Integrations > Accounts > Add > *VMware Cloud Foundation*，
  輸入是 **SDDC Manager endpoint 的 FQDN**（Configuring a Standalone VCF Account in VCF Operations 9.1）。
  9.1 文件**沒有任何**「vCenter-only VCF Instance」的頁面；vCenter 只能加成監控用的 *vCenter account*。
- 元件矩陣（Components in VCF and vSphere Foundation 9.1）：**VCF Automation / SDDC Manager / NSX /
  identity broker / Salt RaaS / Salt Master 標為 VCF-only**；vSphere Foundation「does not include the
  cloud management and integrated automation capabilities」。KB 441127：Salt RaaS/Master/Telemetry
  「are required before VMware Aria Automation can be successfully upgraded」→ VVF 就算用 VCF Installer
  裝了 management services 也缺這些，**解不了 Automation import**。
- Day-N 頁逐字：「The VMware Aria Automation 8.x primary node must reside in the management domain.」
  「**Deployment of only one VCF Automation instance per VCF fleet is supported.**」
  （nested fleet 的 VCFA 已不在 → 名額是空的 ✅）
- 沒 SDDC Manager 的 vCenter+Aria Automation 唯一文件路徑 = **Converge**（VCF Installer 建出 SDDC Manager+NSX）；
  Converge「Not Supported」清單含：vCenter VM 位於**由另一台 vCenter 管理的叢集**、已接 SDDC Manager 的 vCenter、
  ELM+NSX、VCHA、baseline vLCM → 外層 lab vCenter 基本不適用。
- 文件**沒有一句話明寫**「VVF instance 不能 import Aria Automation」，此為多條證據交叉的強推論（agent 明確標註）。

## ✅ Step 1 完成：nested Ops 9.1.0 → 9.1.1（2026-09-06 21:24，按 INSTALL 後 48 分鐘）
- 時間軸：20:35 按 INSTALL → 20:37 API 掉線/產品 UI 502（複製檔案）→ **21:03 API 回來已報 9.1.1.0 build 25679751
  但 analytics 000**（叢集仍在 Going Online）→ **21:23:58 analytics `/resources` 200 = 真正完成**。
  vrops(standalone, 本地 VMFS) 23 分 vs nested(vSAN) 48 分。
- 驗證：version 9.1.1.0.25679751、resources totalCount 411、產品 `/ui` 200 (0.28s)。admin 頁 200 但慢(11s)，
  升級剛完成時 admin 登入仍被擋一陣子（跟 vrops 一樣要等叢集 Online）。
- 🔴 snapshot `pre-ops911-20260906` **先保留**到 Import 測試做完再刪。
- ✅ **產品 UI 不再卡死**（Local Account 登入落到 `/vcf-operations/ui/operate/home`，evals 正常回應）。
  登入頁下拉選項升級後仍是「Local Account / VCF SSO」，但點 Local 要用 leaf-text 標記再 realClick；
  沒點中會以 VCF SSO 送出 → 導到 VIDB 登入頁（`?tenant=CUSTOMER&state=`）。
- ✅ Build › Lifecycle › VCF Management 正常：分頁 **Components / Upgrade / Tasks / Backup & Restore**、
  **ADD COMPONENT**；instance `vcf-m02` 9 個元件（VCF Operations 已顯示 9.1.1.0.25679751；services runtime
  9.1.0.0、fleet lifecycle 9.1.0.0400、identity broker、Salt RaaS/master、software depot、SDDC lifecycle、
  telemetry），**無 VCF Automation** → 名額空。「Last lifecycle metadata sync time: N/A」。
  頂部橫幅「VCF Operations is not registered」升級後仍在（可能會擋 fleet 操作，待驗）。截圖 47。
- ⚠ admin UI 升級後 20+ 分鐘仍擋登入（login.action、無錯誤）；product API/UI 全正常，不再重試。
- 讀取坑：panel 文字用 `lastIndexOf("VCF Management")` 切到標題，讀不到內容 → 看截圖或改切分頁名稱。
## 🟢 Import 精靈實測（外部 vra9 = 客戶情境）進行中（2026-09-06 ~21:45）
- 面板結構：Build › Lifecycle 的 VCF Management 是 **shadow root 內的同源 iframe**
  `/vcf-operations/plug/fleet-lcm/ui/index.html`；主 document / 開放 shadow 走訪都讀不到，要拿該 iframe 的
  `contentDocument` 操作（helper：走 shadowRoot 找 src 含 `fleet-lcm` 的 IFRAME）。座標點擊備援：視口 1676×920、dpr 1。
- 精靈：ADD COMPONENT ▾ → VCF Automation → `Deployment Type`：radio `#deployment-type-new` / `#deployment-type-import`；
  New 路徑顯示官方需求 **24 vCPU / 96 GB / 600 GB、5 IP**；Import 路徑欄位 = `#vcf-instance`（select，只有 vcf-m02）/
  `#fqdn` / `#primary-node-root-password`，精靈內就印著「**The primary node must be deployed in the management domain
  in the selected VCF Instance.**」（截圖 49）。
- 填 vra9.home.lab + root 密碼 → NEXT：**沒有立刻擋**，精靈真的連上外部 vra9，跳出
  「Certificate Security Alert — SSL certificate from vra9.home.lab cannot be trusted. Do you want to proceed?」
  （CN=Client，Issued by「Automatically generated one-off CA authority for Aria Automation」）（截圖 50）→ 接受後看驗證結果。
- Trust Certificate 後 → **直接到 Step 2 Summary，無任何驗證錯誤**（Deployment type Import 8.x / VCF Instance vcf-m02 /
  FQDN vra9.home.lab；截圖 52）→ 按 FINISH（使用者已授權「試試 import」）→ toast
  「VCF Automation is being deployed to vcf-m02 — View Details」（截圖 53）。
- Tasks 分頁（截圖 54）：`Workflow to validate install/import components request` **Completed**（21:36→21:37）；
  `Install components: VCF Automation [SDDC LCM ec07a1b0-...]` **In Progress**（21:37 起）。
  🔴 **重大發現：精靈與驗證工作流都沒擋外部 vRA**；「management domain」規則若生效，會在這個 Install 任務內部
  （去 vcf-m02 管理網域 vCenter 找 VM 時）或之後 Upgrade precheck 才現形。→ 盯任務結果與失敗步驟訊息。
- 任務細節（task `01a076f0-7de8-7c3f-a9be-9647ca75554a`，截圖 55）：Prepare components dependencies ✓ /
  Validate component specifications ✓ / Resolve SDDC lifecycle services ✓ / **Resolve components binaries ✓** /
  Install components using SDDC lifecycle service **In Progress** / Start component installation **In Progress**。
  9.x 的「SDDC lifecycle service」= `vcf-m02-shared01` 新元件，**不在 SDDC Manager `/v1/tasks`**（那裡只有舊的 UMDS 失敗）。
- **import 進行中來源 vra9 完全沒被動到**（21:42：HTTP 200/0.03s、IaaS API 登入 OK、3 個藍圖都在、無快照、開機中）
  → 客戶情境：註冊/import 階段不影響既有 vRA 服務；停服務/快照是後面 Upgrade 的 blue-green 才做。
- 🔴🔴 **結果（21:45）：`Install components: VCF Automation` 任務 Completed，全部 10 個子步驟 Completed**
  （…Start component installation → Prepare parallel install tasks → Validate component specifications →
  Parallel installation of components → **Fetch, validate and save component certificate**）。截圖 56。
  ⇒ **外部（非 management domain）的 vra9 被 fleet 受理並註冊為 VCF Automation 元件**。
  官方「必須位於 management domain」前置在 **import 階段完全沒有被強制**（本 build：fleet lifecycle 9.1.0.0400 +
  VCF Operations 9.1.1.0）。若要擋，只剩 Upgrade（Configure / Run Prechecks / Upgrade）階段——那是 blue-green，
  會對來源做 vCenter 快照 + SSH 停服務，**未經使用者同意不跑**。
- Components（截圖 57）：**10 items，新列 `VCF Automation | vra9.home.lab | 8.18.1.36791.24282366`**。
  來源 vra9 在任務完成後仍完全沒被動到（21:49 再驗：200/0.03s、API OK、3 藍圖、無快照）。
- Upgrade 分頁（截圖 58，Sync 前）：只有 6 列（VIDB / SDDC lifecycle / Salt RaaS / Salt master / Software depot / VSP，
  都「Ready for upgrade / No precheck results / RUN PRECHECKS」），**沒有 VCF Automation 列**；
  頂部 Fleet Lifecycle 目標 9.1.0.0400 → 9.1.0.0400；「Last lifecycle metadata sync time: N/A」。
  文件：import 後要按 **Sync**。→ 按 Sync + Check Required Binaries 驗證是 metadata 沒同步還是 depot 缺 VCFA 升級包。
- Sync 已按（21:52 起 Syncing...，數分鐘）；**Check Required Binaries** 列出的 6 個預期 binaries（Salt master 0.36G /
  VSP 18.71G / Salt RaaS 0.45G / VIDB 1.11G / depot 0.58G / SDDC lifecycle 0.85G）**完全沒有 VCF Automation** →
  升級規劃器目前的目標版本裡沒把 Automation 算進去。
- **Change Target Version**（截圖 61）：`#vcf-target-version` 只有 `9.1.0.*` 一個選項（無 9.1.1；VCF Ops 是我用 PAK 在 fleet 外升的），
  有 CUSTOMIZE 可對個別元件設目標版本。未套用、已 Cancel。
- Software Depot（截圖 62）：Offline Depot **https://vcf9depotserver.home.lab:443**（=10.0.0.61 My-VcfDepot），
  119.82 GB / 999.51 GB。→ 查 depot 有沒有 VCF Automation 9.1 bundle + Migration Service Engine。
- 推論：Upgrade 分頁沒有 Automation 列 = **缺升級路徑（目標版本 + depot 內 VCFA 9.1 bundle/Migration Service Engine）**，
  不是 management domain 規則；要看到「擋在哪」得把 binaries 餵進 depot 再 Run Prechecks。
- Software Depot 頁（截圖 62/63）在此 build **沒有 bundle 清單**，只有設定與空間；bundle 是否存在要看 depot 本身。
- depot 伺服器 `vcf9depotserver.home.lab`=10.0.0.61：HTTP **全部 401（token 驗證）**；docroot **`/depot/PROD`**
  （`/opt/vcf-depot/vcf9` 是 symlink），catalog `/depot/PROD/metadata/productVersionCatalog/v1/productVersionCatalog.json`，
  元件在 `/depot/PROD/COMP/<元件>/`。**用 govc guest.run（root/1qaz@WSX3edc）讀檔可行**，但要用純 argv，
  `bash -c "..."` 引號會讓它靜默失敗（無輸出、rc=1）。gg/FLEET-VSP-CA.md 曾把 `PROD/COMP/VRA` rsync 進這台 depot。
- **Sync 完成（21:54 PM）後 Upgrade 分頁仍只有 6 列、無 VCF Automation** → 不是 metadata 沒同步。
- **depot 盤點（govc guest.run 純 argv）**：`/depot/PROD/COMP/VRA/` 有 **vcfa-bundle-9.1.0.0.25370929.tar (16.0GB)** 與
  **vcfa-bundle-9.1.1.0.25714559.tar (16.8GB)** + plugin tgz + manifest/schema yaml → **VCF Automation 9.1 bundle 都在**。
  COMP 目錄共 24 個，**沒有 Migration Service Engine 的目錄**（只有 `VCF_SERVICE_VCD_MIGRATION_BACKEND` = VCD migrator，
  另一回事）；catalog 有 key `VCF_SERVICE_MIGRATION`(1)、`VRA`(2)。
  ⇒ 最可能缺的是 **Migration Service Engine binary**（文件：Upgrade 需要它在 depot）＋目標版本只有 9.1.0.*。
- **Set Target Version › CUSTOMIZE（截圖 64）**：fleet 的目標版本型錄**有** `VCF Automation`（9.1.0.0200.25556825 /
  9.1.0.0100.25429499 / 9.1.0.0.25370929）與 **`Migration service engine`**（9.1.0.0200.25556825 / 9.1.0.0.25370929）。
  全域為 `9.1.0.*`（wildcard = 取最新 patch = **0200**）。
  ⇒ **Upgrade 沒有 Automation 列的真正原因**：規劃器要 vcfa-bundle **9.1.0.0200**（depot 只有 9.1.0.0 與 9.1.1.0）
  ＋ **Migration service engine binary**（depot 完全沒有此 COMP 目錄）。與 management domain 規則無關。
  要走到 Run Prechecks（真正的擋點）需要：depot 補 Migration service engine 9.1.0.0.25370929（或 0200）＋
  把 VCF Automation 目標版本 CUSTOMIZE 成 9.1.0.0.25370929（或補 0200 bundle）。**尚未做，需使用者決定**（改目標版本是 fleet 全域設定）。
- catalog 是 pretty-printed（26,608 行），單行 grep `key,…` 抓不到；要用 UI 或 jq 讀。
## 🟡 補料（2026-09-07，使用者「那就下載呀」）
- 修正：**Migration service engine = 元件 `VCF_SERVICE_VCD_MIGRATION_BACKEND`**（download tool 顯示名就是 Migration service engine，
  版本 9.1.0.0.25370929 / 0200.25556825，與 CUSTOMIZE 對話框一致）→ depot 其實**已有 9.1.0.0** 那組（vcd-migrator-*.tgz）。
  真正缺的是 wildcard `9.1.0.*` 指到的 **0200**：vcfa-bundle 0200（14.9 GiB）＋ Migration service engine 0200（521.7 MiB）。
- token：本機 `E:\9.1\.broadcom-token` → govc guest.upload 到 61 `/root/vcf-token.txt`（原本不存在）。
- 工具：61 上 `/root/dltool0400/bin/vcf-download-tool`（9.1.0.0400.25570101）；`-t` 只接受 INSTALL/UPGRADE（無 PATCH）。
  `binaries list --vcf-version=9.1.0.0 -t INSTALL` 列出：
  MSE 9.1.0.0 `1998d24e-9fa4-5a13-b795-472537e224d2`、MSE 0200 `2c8b793b-4118-5a7d-b491-8abcba93bc93`、
  VRA 9.1.0.0 `8adb94df-7a39-5c96-a924-215cce4a605c`、VRA 0100 `ad46043f-a8b3-50c0-b994-9783fbce2f4d`、VRA 0200 `1bdd5fa9-479e-5643-9931-47be8861d315`。
- 下載：`govc guest.start`（detached）`binaries download -d=/depot/_scratch-0200 --id=<MSE 0200>,<VRA 0200>`；
  完成後 `cp /depot/_scratch-0200/PROD/COMP/* → /depot/PROD/COMP/`（**絕不動 metadata**）+ `chmod -R a+rX`，
  再回 fleet UI：Sync → Upgrade 分頁應出現 VCF Automation 列 → Run Prechecks（不按 Upgrade）。depot 剩 135 GB。
- ✅ 下載 10:23 → 10:33 完成（15,939 MiB，~2 GB/分）；程序 10:39 結束。輪詢坑：`guest.ps -p <pid>` 程序消失後仍印表頭行，
  「空字串」判斷永不成立 → 要判「輸出不含 PID」。
- ✅ **Import 報告 docx 已交付**：`E:\9.1\VRA8-Import-to-VCF-Operations-91-Report.docx`（產生器
  `tools\docx-build\gen-vra8-import-doc.js`，15 頁 11 圖；QA 用 scoop LibreOffice
  `C:\Users\Administrator\scoop\apps\libreoffice\current\LibreOffice\program\soffice.exe` + pdftoppm）。
## 🟡 Phase ②：真的升級 vra9（使用者 2026-09-07 指示：docx 做完就開始升級，UI 為主、要圖、也做 docx）
- 使用者已明確授權執行 Upgrade（會對 vra9 快照/停服務/切換）。仍分段回報：Configure 前確認 IP/FQDN → Run Prechecks 結果 → 按 Upgrade 前再問。
- IP 盤點（DNS 反解＋ping，2026-09-07）：**10.0.0.232–247 全部無 PTR、ping 不到 → 候選 runtime pool 10.0.0.240/29（.240–.247）**，
  與 vra9（10.0.0.168，10.0.0.0/23）同網段。runtime FQDN 候選：既有 A/PTR `vcf-m02-auto-platform.home.lab`=10.0.0.171
  （舊 VCFA 已不存在、pool 之外）；Automation FQDN 會自動沿用 vra9.home.lab。密碼 VMware1!VMware1!。**待使用者確認**。
- 升級後文件：另產一份 docx（截圖從 65 起編號）。
- ✅ 02:29 複製完成：`/depot/PROD/COMP/VRA/vcfa-bundle-9.1.0.0200.25556825.tar`（16,051,934,720 B）＋
  `/depot/PROD/COMP/VCF_SERVICE_VCD_MIGRATION_BACKEND/vcd-migrator-9.1.0.0200.25556825.tgz`（547,059,967 B）；
  metadata 未動（catalog mtime 2026-09-04）；depot 剩 104 GB。scratch 內工具另拉了一份 metadata（catalog 1,524,404 B），**刻意不覆蓋**。
- fleet UI session 約 40 分鐘後過期 → 重登（Local Account，leaf-text 標記再 realClick），深層連結會帶 `uri=` 回 Lifecycle。
  登入後**不要立刻導航**（會打斷跳轉、session 建不起來）；等 ~50s 讓 `uri=` 自己落地。`--match ops01.home.lab` 會同時命中 admin 分頁，
  要用 `ops01.home.lab/ui` 或 `ops01.home.lab/vcf-operations`。
- ✅ **11:15 Sync 後 Upgrade 分頁出現：`VCFA | VCF Automation | vcf-m02 | 8.18.1.36791.24282366 → 9.1.0.0200.25556825 |
  Pending configuration | CONFIGURE`**（截圖 65）→ 證實先前缺列純粹是 depot 缺 0200 binaries。
- 使用者「好 要做文件喔」→ 視為 IP 照提案並要求升級全程留文件。
- **Configure VCF Automation Upgrade** 精靈（截圖 66–68）：Step 1 Parameters = IP pool（radio `#ipPoolEntryType-cidr-1` /
  `#ipPoolEntryType-individual-1`，textarea `#ip-pool-1-textarea`，提示「Minimum 5 IPs are required」+「runtime FQDN 須解析到
  pool 之外」）、`#fqdn`、`#password`（預填自動產生密碼，有 COPY/RE-GENERATE）。
  填入：Individual IPs **10.0.0.240–247**、FQDN **vcf-m02-auto-platform.home.lab**（A/PTR → 10.0.0.171，ping 不到）、
  密碼 VMware1!VMware1!。Summary 確認後 FINISH。
- FINISH 後列狀態「Configuration in progress...」約 2 分鐘（Tasks 分頁無獨立任務列）→ 11:22 變
  「**Ready for upgrade | No precheck results | RUN PRECHECKS**」（截圖 72）→ 11:24 按 RUN PRECHECKS →
  「**Prechecks in progress... | Precheck details**」（截圖 73）。輪詢中；完成後開 Precheck details 逐項截圖。
- **11:24 Prechecks failed**（約 1 分鐘）：列變「Ready for upgrade | Prechecks failed, | full results | UPGRADE」
  （截圖 74；連結名是「full results」不是「Precheck details」；**失敗後 UPGRADE 按鈕仍可按**）。逐項結果見截圖 76。
- **Precheck 失敗原因（fleet task API `/vcf-operations/plug/fleet-lcm/v1/tasks/01a079e1-1534-7a64-aa81-062660ab1d23`，
  UI 的「1 Error」點不開）**：任務 `VCF Automation Upgrade Prechecks` 子步驟 Fetch Source Component Details ✓ →
  Initialize Required Parameters ✓ → **Validate User Input Specification ✗**：
  「An unexpected error occurred in step validate_vsp_cluster_input. Reference Code: 91B9B6EC … ValidateVspClusterInputStepInput
  failed validation. [**Target VSP cluster IP pool CIDR is required** (propertyPath=targetVspClusterIpPoolCidr)]」
  ⇒ **不是 management domain 規則**，是我選了 Individual IPs；目標 9.1.0.0200 的驗證步驟要求 **CIDR**
  （對應文件「9.1.0.0–0300 需專用 /29 CIDR；0400 起才放寬為 5 個 IP」——UI 兩種都給選、後端只收 CIDR）。
  修正：重新 Configure 改 CIDR **10.0.0.240/29** 再 RUN PRECHECKS。
  UI 坑：fleet 任務錯誤訊息只在 API JSON（`defaultMessage`/`detail`）；在 iframe 內 `fetch` 同源 API 即可讀。
- **Reconfigure 入口**：Upgrade 分頁該列最右邊的 kebab「Available actions」→ **Reconfigure**（列上只看得到 full results / Upgrade）。
  重開的精靈保留 FQDN 與密碼；IP pool 控制項要重選 CIDR 再填（重開後 id 變 `ipPoolEntryType-cidr-2` / `#ip-pool-2-textarea`）。
- 11:3x Reconfigure：CIDR **10.0.0.240/29**、FQDN 不變、密碼重填 → Summary → FINISH → 「Configuration in progress...」
  （截圖 79/80）。Reconfigure 完成後列直接回到舊的「Prechecks failed | full results | UPGRADE」，
  **RUN PRECHECKS 不在列上、在 kebab「Available actions」裡** → 背景任務沒點到，precheck 尚未重跑。
## 🟡 Phase ②-0：使用者改優先序「先升 9.1.1（VSP / fleet management）」（2026-09-07 11:3x）
- 使用者：「那先升 9.1.1」「VSP」「後面再重 CUT 圖」→ 先把 fleet management 元件升 9.1.1，vra9 之後直接升 VCFA 9.1.1；截圖之後再補拍。
- 現況：fleet UI 目標版本只有 `9.1.0.*`，CUSTOMIZE 各元件也全是 9.1.0.x，Fleet Lifecycle 卡 0400→0400；
  但倉儲 9.1.1 binaries 齊（VSP 9.1.1.0.25714471、fleet-lcm 9.1.1.0.25713934、SDDC lcm、Salt、RaaS、VIDB、depot、telemetry、VROPS、VRA、migrator；
  **缺 VCF_LICENSE_SERVER 與 VCF_OPS_CLOUD_PROXY 的 9.1.1**），download tool `releases list` 有 9.1.1.0。
- metadata：manifest seq **101**（倉儲=新抓的）；catalog 倉儲 **seq 57** vs 新抓 **seq 58**。假設：fleet 元件 9.1.1 條目在 58 才有。
  → 驗證後把 58 的 catalog(+sig)+manifest 更新進 `/depot/PROD/metadata`（先備份 `/depot/_meta-backup-*.tar`）→ fleet UI Sync → 看目標版本。
  參考 `dev-docs/vcf911-airgap-upgrade.md`「四條資料鏈」：這是鏈 2（depot metadata）+ 鏈 3（fleet Sync）。
- ❌ 假設不成立：catalog 57 已含全部 fleet 元件 9.1.1 條目（vmsp-platform/fleet-lcm/sddc-lcm/vidb/salt/vcfa/vcd-migrator 各 6 處，
  9.1.1 共 448 行，與 58 相同；58 只多 66 行非 fleet 內容）。**metadata 不是卡點。** 備份仍做了：`/depot/_meta-backup-20260907-1134.tar`。
- 新假設：fleet 只列出「9.1.1 fleet BOM 二進位檔齊全」的 release；倉儲缺 **VCF_LICENSE_SERVER 9.1.1.0.25679819**（id 9de1cab7-4e0d-5885-9d85-c9e206ca83fa）
  與 **VCF_OPS_CLOUD_PROXY 9.1.1.0.25679891**（id c480da96-1bed-5810-bfd7-be19ec73d680）→ 已 detached 下載到 `/depot/_scratch-911fleet`（PID 334187，4.1 GB）。
  完成後 cp 進 `PROD/COMP/VCF_LICENSE_SERVER`、`PROD/COMP/VCF_OPS_CLOUD_PROXY` → Sync → 看 Set Target Version 是否出現 9.1.1.*。
- 坑：inline eval 只要含 `\\/` 之類反斜線就回 undefined；URL 去 origin 改用 `u.split(host)[1]`。
- **fleet-lcm API 實證**（在 iframe 內 fetch 同源）：`/vcf-operations/plug/fleet-lcm/v1/releases` 與 `/release-versions/target-versions`
  **只回一個 release 物件 `9.1.0.0`**（各元件 versions 皆 9.1.0.x）；`/upgrade-plans/<id>` 把 VCF Operations（現 9.1.1.0.25679751）
  的 targetVersion 定成 9.1.0.0400 → fleet 根本沒有 ingest 到 release 9.1.1.0。`/software-depots*` 端點 500（路徑不對）。
- 倉儲 manifest（seq 101）的 9.1.1.0 release 區塊完整：`minInstallerVersion: 9.1.1.0`、releaseDate 2026-09-03、BOM 含
  VCF_FLEET_LCM 9.1.1.0.25713934 / VCF_SDDC_LCM 25713940 / DEPOT_SERVICE 25713941 / SDDC Manager 25713928 / ESX 25714478…
  9.1.0.0 區塊的 BOM 條目帶 `lifecycleManagedBy: VCF_FLEET_LCM`。→ 卡點在 fleet-lcm 的 release ingestion，非 depot 檔案。
- VSP control plane（有 `/etc/kubernetes/admin.conf`）：vsp01-q278k 10.0.0.230、zfp57 10.0.0.229、ftck5 10.0.0.228；
  6kdzn 10.0.0.231 是 worker。govc guest.run 用 `vmware-system-user:VMware1!VMware1!` 可用（上傳腳本再執行，避開引號問題）。
- 已派 agent 查官方 9.1.1 fleet 升級順序 + KB 440630；已下載 License server/Cloud proxy 9.1.1（PID 334187）。
- **官方（agent 查證，2026-09-07）**：9.1.1 RN 逐字「begin … by patching the VCF management services **fleet lifecycle** component to 9.1.1.0
  **before any other VCF component**」；之後順序：software depot（patch 期間其他元件被擋）→ VSP 先於 VIDB / Salt RaaS →
  VCF Automation 先於 migration service engine。操作路徑：VCF Management › Upgrade › **Change target version** › 選 9.1.1 patch › Customize › 逐元件
  Set version › Run prechecks › Upgrade（一次一個元件）。「只能升到 release date 晚於現版的目標」（9.1.0.0400=07/13 → 9.1.1=09/03 OK）。
  **唯一與本環境不同的文件前置：offline depot 要用 VCF Download Tool 9.1.1 或更新**（我們用 9.1.0.0400）。
  KB 440630 只講 9.1.0；**沒有任何 KB 描述「9.1.1 不出現在 target version」**。KB 439193：release 清單由 fleet-upgrade-service
  抓 productVersionCatalog.json 建立（log 在該服務）。
  → 下一步：用 9.1.1 download tool 重做 `metadata download`（`/root/dltool91` 或 `PROD/COMP/VCFDT` 內的 9.1.1 工具）→ 更新倉儲 metadata → Sync。
- ✅ License server 9.1.1（Vcf-License-Server-9.1.1.0.25679819.ova）與 Cloud proxy 9.1.1（Operations-Cloud-Proxy-9.1.1.0.25679891.ova）已 cp 進倉儲；剩 96 GB。
- `/root/dltool91` 其實是 **9.1.0.0100**（名字誤導）；真正的 9.1.1 工具在 `/depot/PROD/COMP/VCFDT/vcf-download-tool-9.1.1.0.25713929.tar.gz` → 解到 `/root/dltool911`。
- VSP control plane 的 `/etc/kubernetes/admin.conf` 兩台都是 **0 bytes**、`sudo -S` 走 guest-ops 也失敗 → memory「control-plane 有 admin.conf 拿 kubectl」已過時，fleet-lcm 日誌先不追。
- VCFDT 9.1.1 tarball 頂層是 `artifactsimage/ bin/ conf/ esximage/ jre/ lib/ osl/`（**不要 --strip-components**）→ `/root/dltool911/bin/vcf-download-tool` = 9.1.1.0.25713929。
  `metadata download -d=/depot/_scratch-meta911`：manifest seq 101（同）、**catalog seq 58**、Compatibility v1 18,394,641 / v2 33,300,009、vsan hcl 21,431,666
  （倉儲舊檔 v1 18,618,396 / v2 33,543,697 / hcl 20,565,583 —— 舊的反而較大，來源不同版）。
- ✅ 03:43 已把 9.1.1 工具產出的 **全部 metadata** 覆蓋進 `/depot/PROD/metadata`（catalog 58、compat、hcl、manifest），舊版在 `/depot/_meta-backup-20260907-1134.tar`。
  → Sync → 檢查 `/v1/releases` 是否出現 9.1.1.0。
- ❌ 11:45 Sync 完成後 `/v1/releases` **仍只有 9.1.0.0**、Set Target Version 仍只有 `9.1.0.*`（截圖 82）。
  ⇒ 鏈 2（depot metadata，含 9.1.1 工具產出）與鏈 3（Sync）都做了仍無效；文件沒有再更多的動作。
  待驗假設：(c) fleet 的 **Software depot 元件 9.1.0.0.25371105 太舊**（fleet lifecycle 已 0400），release 解析在 depot service；
  先用 fleet 內已列出的路徑把 Software depot 升到 9.1.0.0400 再看 9.1.1 會不會出現。(d) fleet-upgrade-service log（需 kubectl）。
- (d) 死路：VSP 節點 `vmware-system-user` 的 `sudo -S`「Sorry, try again」（VMware1!VMware1! 不是 sudo 密碼或需 tty），
  kubelet.conf/node-agent.conf 無權讀，admin.conf 空 → guest-ops 拿不到 kubectl。
- 倉儲 9.1.0.0400 patch 齊：DEPOT_SERVICE / VCF_FLEET_LCM / VCF_SDDC_LCM / VCF_SALT / VCF_SALT_RAAS 各 4 檔
  （VSP 目標是 0200、VIDB 0100、telemetry 無 patch）。→ 先對 Software depot 跑 prechecks（截圖 83）。
- Software depot prechecks 11:52 → **12:02 通過**（列：Ready for upgrade | Precheck details | UPGRADE，約 10 分鐘）。
  使用者 12:0x 回「patch」→ 授權 Software depot 9.1.0.0 → 9.1.0.0400 patch（fleet 內建路徑）。按 UPGRADE 後盯到完成 → Sync → 再查 `/v1/releases`。
- 12:06 按下 Software depot 列的 UPGRADE：**無確認對話框，直接開跑**；列「Upgrade in progress... | Upgrade details」，
  任務 `Software depot Upgrade Workflow` RUNNING（截圖 84）。文件提醒：depot patch 期間其他元件的 patch 會被擋。
- 13:35 列的現版已變 **9.1.0.0400.25570105**（約 29 分鐘），但仍「Upgrade in progress...」收尾中；此時按 Sync **不生效**（sync time 仍 11:45），
  `/v1/releases` 仍 9.1.0.0 → 要等任務 SUCCEEDED 後再 Sync 才算數。
- 13:37 `Software depot Upgrade Workflow` **SUCCEEDED**（總計 ~31 分鐘），系統自動跑 `Refresh component Software depot` +
  `Refresh Software depot metadata and sync upgrade plans`（sync time 1:33 PM）；depot 列從 Upgrade 分頁消失（已 on target）。
  ❌ 之後 `/v1/releases` **仍只有 9.1.0.0**、Set Target Version 仍 `9.1.0.*`（截圖 86）→ 假設 (c) 不成立。
  自助手段全數用盡：binaries ✓、9.1.1 工具 metadata ✓、Sync ✓、depot 元件 0400 ✓。
- 14:22 手動 Sync 完成（depot 0400 後第一次完整手動同步）→ `/v1/releases` **仍只有 9.1.0.0**。**最終判定：本環境的 fleet lifecycle
  9.1.0.0400 不會 ingest release 9.1.1.0，且沒有任何文件化的自助動作可解** → 走 support case 或先回頭做 vra9 → 9.1.0.0200。
  support case 素材：本檔本節 + 截圖 81/82/85/86/87 + fleet API 回應（/v1/releases 只有 9.1.0.0；upgrade-plan 把 Ops 9.1.1 目標定成 9.1.0.0400）
  + 倉儲 metadata seq（manifest 101 / catalog 58）+ VCFDT 9.1.1 產出 + 四條資料鏈紀錄（dev-docs/vcf911-airgap-upgrade.md）。
- **depot 端證據（nginx）**：docroot `location /PROD/ { alias /opt/vcf-depot/vcf9/PROD/; }`，`/opt/vcf-depot/vcf9 -> /depot`；
  `auth_basic` 帳號 `vcfdepot`（`/etc/nginx/.htpasswd-vcf9`）；8888 是無驗證的 `root /depot`。
  access.log：fleet depot 服務（10.0.0.230，`Apache-HttpClient/5.6.1 (Java/21.0.11)`）**每 5 分鐘** HEAD+GET manifest（265,178）、
  catalog（**1,524,404 = seq 58 新檔**）、.sig（1,930），全 200；**不抓 Compatibility**。⇒ 新 metadata 確實被 fleet 讀走，過濾在 fleet 內部。
- govc guest.run 坑：參數含 `|`、`(`、`\"…\"` 會被 guest shell 解掉（出現「bash: X: command not found」）→ 用 `-e a -e b` 多模式、tail 後本機過濾。
- **manifest 逐 release 對照（唯一結構差異）**：`minInstallerVersion` — 9.0.0.0/9.0.1.0/9.0.2.0 皆 `9.0.0.0`、9.1.0.0 = `9.1.0.0`、
  **9.1.1.0 = `9.1.1.0`**（第一個等於自身版本的 release）；`minCompatibleVcfVersion` 9.1.x 皆 5.2.0.0；無 fleet/supported 類旗標；manifest 無 .sig。
  假設：fleet-lcm 9.1.0.0400 以「minInstallerVersion ≤ 自身家族版本」過濾 release → 9.1.1.0 被整個藏起來（與 `/v1/releases` 只回 9.1.0.0 吻合）。
  可驗證的 lab 實驗（未執行、待使用者同意）：把倉儲 manifest 中 9.1.1.0 的 `minInstallerVersion` 暫改為 `9.1.0.0` → Sync → 看 `/v1/releases`；
  有備份 `_meta-backup-20260907-1134.tar`，無簽章保護。無論結果都是 support case 的有力證據。
  實驗檔已備好：`/depot/_exp/vcfManifest.exp.json`（只差第 3793 行 `9.1.1.0`→`9.1.0.0`，JSON OK）、原檔 `_exp/vcfManifest.orig.json`；正式檔未動。
- **倉儲 9.1.x 盤點（2026-09-07）**：9.1.1.0 BOM 30 項中 fleet/管理相關**全部齊**（DEPOT_SERVICE、VSP、VCF_FLEET_LCM、VCF_SDDC_LCM、
  VCF_SALT/RAAS、VIDB、TELEMETRY、LICENSE_SERVER、OPS_CLOUD_PROXY、OBSERVABILITY、VCFMS_METRICS_STORE、VRA、VCD_MIGRATION、
  SDDC_MANAGER、VCENTER、ESX、NSX(檔名 9.1.1.0.0.*)、HCX、VRLI、VRNI、VSAN_FILE_SERVICES）；VROPS 9.1.1 是 PAK 25679887
  （BOM 寫 25679751 是 appliance build，判 MISSING 為檔名比對假象）。真缺的只有非 fleet 項：DLVM、ESX_HOST_ARM64、VLR/VLR_EDGE、
  VMTOOLS、VSAN_ESA/OSA_WITNESS、VCF_CONSUMPTION_CLI。9.1.0.x：GA + 0400 patch（fleet 元件）+ VRA/VCD_MIGRATION 0200 皆在。
- 使用者：「去 VCF Ops 點 Sync 去下載 9.1.1」→ 走 SDDC Manager 這條（VCF Instances › vcf-m02 頁是 `plug/sddc-77` 插件，40 秒仍轉圈，改用 API）：
  **SDDC Manager 已吃到 catalog seq 58**、manifest 101、`/v1/releases` 含 **9.1.1.0**（bom 65、patchBundles 5）、m01 upgradables(9.1.1.0)=AVAILABLE/PENDING；
  `/v1/bundles`：9.1.1 共 33 個，**13 SUCCESSFUL（fleet 元件 PATCH 型 + SDDC Manager/vCenter/ESX/NSX）、20 PENDING（INSTALL 型 + VRA/Migration/HCX/License/Cloud proxy）**；
  bundle 儲存區 `/nfs/vmware/vcf/nfs-mount` 303 GB 可用（bundle 目錄 117 GB / 21 個）。
  → 對 20 個 PENDING 執行 `PATCH /v1/bundles/{id} {"bundleDownloadSpec":{"downloadNow":true}}`（= UI Download Now），輪詢至無 PENDING，再 fleet Sync 看 9.1.1。
- 20:19 起下載（SDDC Manager 同時跑 3 個）。**架構實證：SDDC Manager 的 bundle 下載一律經 fleet 的 Software depot 元件
  `https://vcf-m02-fleet01.home.lab/depot-service/content-gateway/COMP/...`（再由它去離線 depot）**，不是直連 depot server。
  失敗 4 筆：SDDC_MANAGER 9.1.1 **INSTALL OVA** 與 HCX unified appliance OVA → `404 BUNDLE_NOT_FOUND_IN_DEPOT_SERVICE`
  （離線 depot 只有 upgrade/PATCH 型，升級不需要，忽略）；VRA 9.1.1 ×2 → `No route to host vcf-m02-fleet01`（暫時性，已重試）。
  21:21 進度：SUCCESSFUL 20 / FAILED 4 / IN_PROGRESS 3（vCenter、Cloud proxy、VSP）/ PENDING 6。VRA ×2 重試後回 PENDING（21:25：FAILED 2 = SDDC Manager/HCX INSTALL OVA）。
- **兩條軌對照（回答使用者「有在 fleet manager」）**：VCF Instances › vcf-m02（SDDC Manager 軌）**確實看得到 9.1.1**：
  SDDC Manager 9.1.1.0.25713928、vCenter 9.1.1.0.25712839、NSX inventory 仍報 9.1.0.0.25318225（實際 9.1.1，同步延遲）、
  ESX 4 台 9.1.0.0200 → `upgradables?targetVersion=9.1.1.0`：ESX bundle **AVAILABLE**、NSX_T_DATAPLANE PENDING。
  VCF Management（fleet 軌）仍只列 9.1.0.0。21:29 再按 Sync（`Refresh Software depot metadata and sync upgrade plans` RUNNING）。
  輪詢坑：UI 的「Syncing...」字樣在任務仍 RUNNING 時就會變回「Sync」→ 判斷完成要看 `/v1/tasks` 最新任務狀態，不能只看 UI 文字。
  結果（21:30）：`METADATA_AND_PLAN_SYNC_WORKFLOW` SUCCEEDED（13:20:44Z→13:27:16Z），`/v1/releases` 與 `/release-versions/target-versions` **仍只有 9.1.0.0**
  （OPS 元件最高列 9.1.0.0400.25541561）。這是第 21 個 sync 任務。自助路徑至此全部窮盡；剩：(a) `minInstallerVersion` 實驗（`/depot/_exp/vcfManifest.exp.json`，需使用者同意）、(b) support case。
  nginx 佐證：sync 期間 10.0.0.230 GET productVersionCatalog.json(1,524,404)+vcfManifest.json(265,178) 皆 200 → fleet 有讀到 VCFDT 9.1.1 那份 metadata，是 fleet-lcm 自己濾掉 9.1.1。
- 21:34 使用者核准實驗 (a)：`cp /depot/_exp/vcfManifest.exp.json → /depot/PROD/metadata/manifest/v1/vcfManifest.json`（md5 ec8018dc…；原檔 md5 e80aec18…，還原用 `/depot/_exp/vcfManifest.orig.json`）。
  manifest 目錄無 .sig（nginx 只見 catalog 有 .sig 被抓），diff 只有第 3793 行。
  21:35 UI Sync（Components 分頁右上 `<a role=button>Sync</a>`，`.click()` 不觸發、要 CDP 真實滑鼠 Input.dispatchMouseEvent；VM 名是 `vcf9depot` 不是 vcf9depotserver；govc 在 Git Bash 要 `MSYS_NO_PATHCONV=1`），任務 13:35:49Z RUNNING。截圖 93-sync-after-manifest-exp.png。
- ❌ 21:48 實驗結果：Sync SUCCEEDED，`/v1/releases` **仍只有 9.1.0.0** → `minInstallerVersion` 假說不成立（或 fleet 另有快取/簽章驗證）。manifest 已還原原檔。
  期間 session 過期：Ops 登入頁是 ExtJS，Login Method 下拉要點 trigger 箭頭（#authSelector-inputEl 右側 ~x+12）才會開，
  `clickAny "Local Account"`→fill admin/VMware1!VMware1!→`clickAny "LOG IN"`→等 55s 自動落回 uri。**Login Method 停在 VCF SSO 就按 LOG IN 會把分頁導去 vidb SSO 頁**，且這次連帶 Chrome 其他分頁全變 about:blank（原因不明，重開深層連結即可）。
- 21:50 metadata 本機比對（scratchpad pvc.json / manifest.json / rel-9100.json / rel-9110.json）：
  catalog `patches` 對 VCF_FLEET_LCM/VSP/DEPOT_SERVICE/VIDB/VROPS/VRA/CLOUD_PROXY/VCF_SDDC_LCM 都有 9.1.1.0 條目（各 2 bundles）。
  manifest 9.1.1.0 vs 9.1.0.0 release：欄位集合相同；差異只有 minInstallerVersion（已證無關）、releaseDate、**bom 65 vs 60**——
  9.1.1.0 多 5 個 9.1.0 fleet-lcm 沒看過的元件名：SUPERVISOR_SERVICE_NATIVE_OBJECT_STORE、SUPERVISOR_SERVICE_PAIS、VCF_SERVICE_ARGOCD、
  VCF_SERVICE_NATIVE_OBJECT_STORE、VCF_SERVICE_VSAN_BACKEND。假說 2：舊 fleet-lcm 解析 bom 遇未知 enum 整個 release 丟掉。
  實驗 2 檔已備：`/depot/_exp/vcfManifest.exp2.json`（263,143 B，僅移除該 5 筆 bom），**未套用、待使用者核准**。
- 21:53 使用者指示在 **VCF Instances › vcf-m02 › Lifecycle › Binary Management** 頁按 `Sync Now`（sddc-77 plugin iframe 內 `<a>`，同樣要真實滑鼠；
  頁面提示「Binaries now automatically sync once a day」）：21:51→21:53 完成。該頁 9.1 清單已列 HCX/vCenter/ESX/NSX/SDDC Manager **9.1.1.0 全 Downloaded**；
  fleet 軌 `/v1/releases` 仍只有 9.1.0.0（此 Sync 只影響 SDDC Manager 軌）。截圖 94-binary-mgmt-sync-now.png。
  注意 `build/download?resourceId=b695b4ac…` 是 Software Depot 設定頁，不是 Binary Management；Binary Management 在 `build/lifecycle?resourceId=092a29c7…` 的分頁。
- 22:00 **INSTALL BINARIES 分頁盤點**（76 筆：Available 59 / Downloaded 11 / Download Failed 4 / Validating 1 / Scheduled 1）。
  9.1.1.0 共 17 筆，4 筆 Download Failed 全因倉儲缺 install OVA（nginx 404 佐證）：
  VROPS `Operations-Appliance-9.1.1.0.25679751.ova`、HCX `hcx-unified-appliance-9.1.1.0.25690219.ova`、
  NSX `nsx-unified-appliance-9.1.1.0.25691516.ova`、SDDC Manager `VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova`。
  → 22:01 用 `/root/dltool911/bin/vcf-download-tool`（9.1.1.0.25713929）下載 4 個 INSTALL bundle（共 19.4 GB，depot free 121 GB）：
  腳本 `/root/dl-install911.sh`、log `/root/dl-install911.log`；bundle id 由 catalog `patches.<TYPE>[].artifacts.bundles[]` 取得。
  ⚠ `pgrep -c -f vcf-download-tool` 會匹配到 govc 自己那條命令 → 判「有無在跑」要看 `pgrep -f … | wc -l` 或排除自身。
  ✅ 22:10 四個 OVA 下載完成（EXIT=0，19.4 GB，約 9 分鐘）。22:12 在 UI 勾選那 4 列按 DOWNLOAD 重試（無確認框，直接轉 Scheduled）。
  UI 操作法：`clr-dg-row` 內 `label.click()` 可勾選（免真實滑鼠）；DOWNLOAD 按鈕要真實滑鼠點。
- 使用者最終交付要求（09-07 22:00 追加）：把 import 進來的 vRA 8.18 升到 **9.1.1**，全程 UI 截圖，並產出 **docx + PPT**。
- 22:13 **實驗 2 套用**：`/depot/_exp/vcfManifest.exp2.json` → live（9.1.1.0 bom 65→60，移除 5 個新元件名；minInstallerVersion 保持 9.1.1.0）。
  還原：`cp /depot/_exp/vcfManifest.orig.json`。驗證腳本 `/depot/_exp/chk2.py`。
  fleet 另有**自動 sync**（13:49:33Z 那筆不是我按的）→ 判讀結果要確認 sync 任務 createTime 晚於套用時間。
  `/v1/tasks` 排序不保證 createTime desc（RUNNING 任務可能晚一步才排到第一），要看整頁而非只看第一筆。
  fleet-lcm 其他端點：`/v1/release-versions` = target-versions 同內容；`/v1/depot/releases`、`/v1/system-info`、`/v1/environments` 皆 500。
  `/v1/upgrade-plans` 有 `spec.desiredSoftware.{version,components[]}` → 若清單路線走不通，理論上可直接改 plan spec（未嘗試）。
  現行 plan `01a043a1-…`（status READY，2026-08-27 建）desired 9.1.0.0：VCF_SDDC_LCM/VCF_FLEET_DEPOT/OPS_LOGS/OPS_DATA_PLATFORM/SALT/SALT_RAAS/OPS/CLOUD_PROXY=0400、
  VSP/VCFMS_METRICS_STORE/VCFA/OPS_NETWORKS/VCD_MIGRATOR=0200、VIDB=0100、TELEMETRY=9.1.0.0。→ 使用者方向：**先把整個 VCF Management 升到 9.1.0.x 最新，再看 9.1.1**。
- 22:20 depot 盤點（`find /depot/PROD/COMP -type f -ls`，811 檔；scratchpad depot-comp.txt）9.1.1 檔案齊全：
  VSP 6 檔 17.3G、VRA 4 檔 16.8G、VROPS 4 檔 10.9G、VCENTER 590 檔 35.8G（blob 式 patch repo）、NSX 16.5G、HCX 8.6G、SDDC Manager 5.3G、
  VIDB/VCF_FLEET_LCM/VCF_SDDC_LCM/DEPOT_SERVICE/SALT/SALT_RAAS/TELEMETRY/VCFMS_METRICS_STORE/OBSERVABILITY/VCD_MIGRATION_BACKEND 各 4 檔、
  CLOUD_PROXY/LICENSE_SERVER/VCFDT 各 1 檔、ESX iso、VRLI/VRNI/VSAN_FILE_SERVICES 也有。**只有 NSX_ALB 沒 9.1.1**（未用）。
  ⚠ 分頁輪詢（buz1xd5gt）因我把同一分頁導去 management-lifecycle 而失效（sddc-77 frame 不在）→ 兩條軌要用不同分頁盯。
- ❌ 22:17 **實驗 2 也失敗**：sync 14:12:30Z（套用後）SUCCEEDED、UI sync time 10:17 PM，`/v1/releases` 仍只有 9.1.0.0 → bom 未知元件假說不成立。22:25 manifest 已還原（md5 e80aec18…、bom 65）。
- 🔑 22:24 **關鍵發現：Upgrade 分頁最上方有獨立的「Fleet Lifecycle」區塊**：「Upgrade fleet lifecycle component to the latest version… Target version: 9.1.0.0400.25570104 → 9.1.0.0400.25570104 | UPGRADE | CHECK BINARY AVAILABILITY」。
  官方 9.1.1 RN：「先把 fleet lifecycle 元件 patch 到 9.1.1.0，之後其他元件才能升」→ release 清單沒 9.1.1 很可能就是因為 fleet-lcm 0400 自己還沒升、而**自升級的「latest version」也只認到 0400**（depot 有 vcf-fleet-lcm-9.1.1.0.25713934.tgz + plugin + 2 yaml）。
  UI 端點（performance entries）：自升級=`/v1/system?bundleType=PATCH&status=REQUIRED`（check binary）與 `/v1/system?action=apply`（UPGRADE）；全體 precheck=`/v1/upgrade-plans/<id>?action=precheck`；sync=`/v1/depot-metadata?action=sync`。
  target-versions 與 upgrade-plan 都**沒有 VCF_FLEET_LCM 這個元件型別**（fleet lifecycle 走 /v1/system 自升級路徑）。
- ✅ 22:33 **突破口確認**：`GET /v1/system` 回 `availableTargetVersions:["9.1.1.0.25713934"]`（targetVersion 仍 0400）。
  UI 路徑：Upgrade 分頁 › Fleet Lifecycle 區塊 › UPGRADE 旁 kebab「Available actions」› **Select version** › 對話框「Fleet Lifecycle Component Target Version」
  （select `#fleet-services-target-version` 只有一個選項 9.1.1.0.25713934）› SET TARGET VERSION → 區塊變 `9.1.0.0400.25570104 → 9.1.1.0.25713934`。
  CHECK BINARY AVAILABILITY 後 `/v1/system` bundles：INSTALL/PATCH 9.1.1.0 各 610MB **REQUIRED**（尚未從 offline depot 拉到 fleet depot）。
  截圖 99–103。kebab/對話框按鈕 DOM `.click()` 都有效（不需真實滑鼠）。
  → 這就是官方 RN 的第一步「先 patch fleet lifecycle 到 9.1.1.0」；推測完成後 release 清單才會出現 9.1.1（fleet-lcm 0400 不認 9.1.1 release）。
- 🚀 22:28 使用者「按」→ Fleet Lifecycle **UPGRADE**（DOM click）→ task `01a07c45-5cf4-7d1b-87e1-45477c399024`「Fleet lifecycle Upgrade Workflow」RUNNING（14:28:35Z）。
  按下後跳出「Binaries in Depot」資訊框（CANCEL / EXPORT DOWNLOAD SPECIFICATION）——只是提示，CANCEL 關掉不影響任務。截圖 104–106。輪詢 baf8ik4m0 盯 `/v1/system.currentVersion` 變 9.1.1.0。
  同時使用者按的 5 個 9.1.0.x precheck 仍 RUNNING（VIDB/SDDC_LCM/SALT_RAAS/SALT/VSP）。
  task stages：`set_upgrade_context=SUCCEEDED 14:28:37` → `vmsp_stage_plugin=RUNNING 14:28:44`（23:03 仍在此階段，35 分鐘）。
  additionalDetails：planId 01a05713-…、sddcLcmTaskId 01a07c45-61cf-…、desiredVersion 9.1.1.0.25713934。
  🔑 `/v1/system` bundles 的 `status` 是「是否適用」不是「是否已下載」：目標 0400 時 INSTALL=NOT_REQUIRED/PATCH=ALREADY_UPGRADED，改 9.1.1 後兩者都 REQUIRED。
  Binary Management 上 Fleet lifecycle 9.1.1.0 581.69 MB 已 Downloaded，故不需再下載。
  ⚠ 新發現：VSP precheck 反覆 HEAD `/PROD/COMP/VSP/depot-manifest-vmsp-platform-9.1.0.0200.25555874.yaml` **404**（倉儲缺這個 yaml）→ 9.1.0.0200 的 VSP precheck 大概率會失敗；反正要走 9.1.1，先不補。
- 23:16 五個 precheck 結果：**SALT / SALT_RAAS / VCF_SDDC_LCM = SUCCEEDED；VSP / VIDB = FAILED**，兩者都掛在 `vmsp_stage_plugin` 階段、`messages` 為空。
  根因＝倉儲缺該 patch 版的 depot-manifest yaml：VSP 只有 9.1.0.0/9.1.1.0（缺 0200），VIDB 缺 `depot-manifest-vidb-9.1.0.0100.25522734.yaml`（皆 404）。
  ⇒ 這兩個 precheck 失敗是「目標選 9.1.0.x 而倉儲沒那版」造成，走 9.1.1 不受影響（VSP/VIDB 的 9.1.1.0 yaml 都在）。
  VSP 倉儲 9.1.1 檔：depot-manifest / configuration-schema / vmsp-plugin 279KB / vmsp-cli 26MB / vmsp-platform 6.9GB tar / vcf-services-platform-template 10.4GB ova。
- 23:13 fleet-lcm 升級有進展：倉儲 log 出現 **curl/8.19.0**（VSP 節點端，非 Java）抓 `depot-manifest-vcf-fleet-lcm-9.1.1.0.25713934.yaml` → `vmsp_stage_plugin` 確實在動，只是前 45 分鐘沒有 depot I/O。
- 23:41 階段推進：`set_upgrade_context ✓ → vmsp_stage_plugin ✓ → vmsp_prechecks ✓ → vmsp_stage_package RUNNING`（開始搬 610MB 套件）。
  🛠 工具：改用獨立腳本 `scratchpad/poll-flcm.mjs`（直接開 WebSocket 打 CDP，不經 cdp-live 的 --steps）→ **避開 bash→JSON→JS 三層跳脫地獄**；
  以後長輪詢一律寫 .mjs，不要用 `--steps` 內嵌 JS。
- 📦 23:50 交付工具鏈就緒：`E:\9.1\tools\docx-build` 已 `npm install pptxgenjs`（4.0.1，可 require，實測產出 pptx OK）；docx 9.7.1 既有。
  → PPT 產生器將寫成 `gen-911-upgrade-ppt.js`，docx 沿用 `gen-911-upgrade-doc.js` 樣式（A4／微軟正黑體／圖 620×340）。
  截圖目前 99 張（doc-shots/vrops-upgrade），本次 9.1.1 段落從 93 起。
- 🎉 **00:10 Fleet lifecycle 升級成功 → 9.1.1.0.25713934**（22:28→00:10，共 **102 分鐘**）。
  完整階段：`set_upgrade_context → vmsp_stage_plugin → vmsp_prechecks → vmsp_stage_package → vmsp_prepare → vmsp_upgrade → post_upgrade_inventory_sync`（各 SUCCEEDED）。
  ✅ **release 清單立刻出現 9.1.1.0**（不必再按 Sync）：OPS 9.1.1.0.25679751／VSP 9.1.1.0.25714471／VCFA 9.1.1.0.25714559／VIDB 9.1.1.0.25679886／
  SALT・SALT_RAAS 9.1.1.0.25679895／VCF_FLEET_DEPOT 9.1.1.0.25713941／VCF_SDDC_LCM 9.1.1.0.25713940／VCD_MIGRATOR 9.1.1.0.25714559／
  VCFMS_METRICS_STORE 9.1.1.0.25714471／CLOUD_PROXY 9.1.1.0.25679891／TELEMETRY 9.1.1.0.25671600／OPS_LOGS・OPS_DATA_PLATFORM・OPS_NETWORKS。
  ⇒ **結論：先前「fleet 看不到 9.1.1」的唯一原因就是 fleet lifecycle 自己還在 9.1.0.0400**；與 offline depot metadata／manifest 完全無關（兩次改 manifest 實驗都是白工，已還原）。
  截圖 107。
- 00:15 fleet-lcm 升完後 **Upgrade 分頁 UI 改版**：Fleet Lifecycle 區塊變「Current version: 9.1.1.0.25713934」（無 target 行）；
  新增「Management Components」提示：**VCF Operations must be patched independently from other management components. Wait for this patch to successfully complete before proceeding**；
  「CHANGE TARGET VERSION」→「**SELECT VERSION**」＋New versions available。截圖 108。
- ✅ 00:17 **Set Target Version → 9.1.1.\***（`select#vcf-target-version`，選項 `9.1.1.*` / `9.1.0.*`；另有 CUSTOMIZE PATCH VERSIONS；
  對話框開啟後要等幾秒才載入選項，SET VERSION 一開始 disabled）。截圖 109–111。
  設定後元件列表變 **8 項**（多出 Software depot、Telemetry）：
  | 元件 | 路徑 | 狀態 |
  |---|---|---|
  | Identity broker | 9.1.0.0 → 9.1.1.0.25679886 | Ready（舊 precheck failed） |
  | SDDC lifecycle | 9.1.0.0 → 9.1.1.0.25713940 | Ready |
  | Salt RaaS | 9.1.0.0 → 9.1.1.0.25679895 | Ready |
  | Salt master | 9.1.0.0 → 9.1.1.0.25679895 | Ready |
  | Software depot | 9.1.0.0400 → 9.1.1.0.25713941 | Ready |
  | Telemetry | 9.1.0.0 → 9.1.1.0.25671600 | No precheck results |
  | VCF services runtime | 9.1.0.0 → 9.1.1.0.25714471 | Ready（舊 precheck failed） |
  | **VCF Automation** | **8.18.1.36791 → 9.1.1.0.25714559** | **Pending configuration → CONFIGURE** |
  ⇒ VCFA 可直接 8.18 → **9.1.1**（不需先走 9.1.0.0200）；但要重跑 Configure 精靈（先前 0200 的設定已失效）。
  VCF Operations 已是 9.1.1（PAK 升的）故不在列表 ⇒ 官方「Operations 要獨立先升」的前提已滿足。
- 01:57 **RUN PRECHECKS（9.1.1 目標）已送出 7 個元件**（VIDB/SALT/SALT_RAAS/VCF_SDDC_LCM/TELEMETRY/VCF_FLEET_DEPOT/VSP，各 PENDING→RUNNING）。
  🔴 UI 坑：「RUN PRECHECKS (ALL)」按了**不會有事**——必須先勾選列，按鈕文字才變成 `RUN PRECHECKS (7)`，那個才是真的送出。VCFA 列（Pending configuration）勾不起來。
  🛠 新工具 `scratchpad/fleet.mjs`：`node fleet.mjs "<在 fleet iframe 內執行的 async body>" [截圖路徑]`，內建 `fd/F(api)/sq/rows()/btn(text)`；
  搭配 `poll-prechecks.mjs`（`import { inFrame } from './fleet.mjs'`）做長輪詢。**這是本專案操作 fleet UI 的標準做法**。
  ⚠ Ops session 又過期一次；重登坑：Login Method 下拉要點**欄位內部**（x≈425）而不是右緣（x=440 無效），`.x-boundlist-item` 才會出現。
- ✅ 10:37 precheck 結果（目標 9.1.1）：**SUCCEEDED = VCF_FLEET_DEPOT / VCF_SDDC_LCM / SALT / TELEMETRY / VSP；FAILED = VIDB / SALT_RAAS**。
  失敗原因（官方相依，非環境問題）——訊息藏在 `tasks/<id>.stages[].messages[]`（`messages` 頂層是空陣列，UI「full results」也是讀這裡）：
  - VIDB：`VCF Services Runtime is at version 9.1.0 but this upgrade requires VSP >= 9.1.1 [VCFMS-PRECHECK-VIDB-VMSP-VERSION-001]`
  - SALT_RAAS：`VSP platform is at version 9.1.0 but this upgrade requires VSP >= 9.1.1 [VCFMS-PRECHECK-RAAS-VMSP-VERSION-001]`
  ⇒ 完全對應 RN 的「VIDB / Salt RaaS 要先升 VSP」。**升完 VSP 再重跑這兩個 precheck 就會過**。
  ⚠ 每個失敗訊息前面都會先有一句無意義的 `Internal error occurred. Please retry...`，真正原因在下一則 ERROR，別被誤導。
  UI 列狀態會落後 API（API 已 SUCCEEDED，UI 仍顯示 Prechecks in progress）→ 以 API 為準。截圖 113–114。
  📸 截圖衛生：頁面上若有先前操作留下的紅色 alert（例如空按 RUN PRECHECKS ALL 產生的
  `VCF_LCM_FLEET_UPGRADE_400_INVALID_COMPONENT_USER_INPUT_SPEC`）要先關掉再拍；作廢的截圖直接刪。
- 🚀 **12:00 開始逐一升級（順序照 RN 相依）。第 1 顆：Software depot**（列上 UPGRADE，無確認框）
  → task `01a07f2c-9c62-7669-bae9-be3851123bc8` APPLY VCF_FLEET_DEPOT RUNNING，
  stages `set_upgrade_context ✓ → vmsp_stage_plugin ✓ → vmsp_prechecks RUNNING`。截圖 115–116。
  ⚠ 列上 UPGRADE 按下後 UI 要幾十秒才變「Upgrade in progress…」，別以為沒按到而重按。
  ⚠ `Deselect All` 按鈕點了沒用；要逐列 `label.click()` 取消勾選（且會 toggle，注意別點兩次）。
  🛠 `scratchpad/poll-apply.mjs <RESOURCE_TYPE>` = 通用升級輪詢（每 2 分鐘，看 APPLY 任務 stages）。
  預定順序：Software depot → VSP → VIDB + SALT_RAAS（重跑 precheck）→ SALT / VCF_SDDC_LCM / TELEMETRY → VCFA（Configure→Upgrade）→ VCD_MIGRATOR。
- ✅ **12:51 Software depot 升級成功 → 9.1.1.0.25713941**（12:00→12:51，**51 分鐘**，7 階段同 fleet-lcm）。
  升完該列**直接從清單消失**（剩 7 列）＝已在目標版本。截圖 117。
- 🚀 **12:53 第 2 顆：VCF services runtime (VSP)** → task APPLY VSP RUNNING（04:53:06Z）。截圖 118。
  這顆是 VIDB / SALT_RAAS 的前置；VSP 套件較大（vmsp-platform 6.9GB + template OVA 10.4GB），預期較久。
- ❌ **14:38 VSP 升級 task FAILED**（12:53→14:38，101 分鐘）在 `vmsp_upgrade` 階段，`retriable:true`：
  `Unexpected error occurred while checking task: 400 Bad Request: "Client sent an HTTP request to an HTTPS server."`
  `An unexpected error occurred in step vmsp_upgrade. Reference Code: 45F3A806.`（緊接在 `Deploying VCF Component. Status: Running` 之後）
  🔑 **這是官方已知問題**（VCF Operations 9.1.1 RN）：「Component installation can fail during VCF service runtime node rotation ——
  Fleet lifecycle services run on a single node. During a VCF services runtime platform node rotation operation, an in-progress
  component installation can fail.」Workaround：**retry the task**。fleet-lcm 自己就跑在被輪替的 VSP 節點上，輪替時失去自己的 API → 誤判 FAILED。
  查證：無任何 KB 提到該 HTTP/HTTPS 字串；Reference Code 是 per-incident hash，不是查詢鍵。
  🔴 **重點：K8s 層其實還在跑**——`kubectl get pd -A` 顯示 `vmsp-platform` = **Progressing**（其餘 8 個 PD 都 Successful）。
  ⇒ **不可立刻 Retry**，要等 PD 變 Successful。
  🛠 取得 kubectl（本次實測，補正舊 memory）：`plink -ssh -batch -pw 'VMware1!VMware1!' vmware-system-user@10.0.0.227`（control-plane=vcf-m02-vsp01-ftck5，
  admin.conf 5598 bytes；228 也有、229 是 0 bytes 的 worker），`echo 'VMware1!VMware1!' | sudo -S -p '' kubectl --kubeconfig=/etc/kubernetes/admin.conf ...`
  → **舊 memory 說「admin.conf 0 bytes、sudo -S 被拒」是挑錯節點**；`echo y |` 餵 plink 接受 host key 即可，不必釘 -hostkey。
  輪詢腳本 `scratchpad/poll-pd.sh`。UI 上該列狀態＝`Ready for upgrade ... Upgrade failed, view details`，kebab 只有 Run Prechecks（Retry＝再按 UPGRADE）。截圖 119–120。
- ✅ **17:50 真相：VSP 其實升級成功了，只是 fleet 誤報 FAILED。不需要 Retry。**
  `kubectl get pd -A` → vmsp-platform **Successful**（9 個 PD 全 Successful）；
  `kubectl get nodes` → **4 台全換新**（vcf-m02-vsp01-5hk5t/86kjh/896vc/v8bw4，age 102–150 分），K8s **v1.34.2+vmware.1 → v1.35.6+vmware.2**。
  fleet UI 重新整理後 **VSP 列直接消失**（剩 6 列），`/v1/config` status HEALTHY。截圖 121。
  ⇒ 這就是 RN 已知問題的完整樣貌：**節點輪替把 fleet 自己搬走 → task 誤判失敗，但底層 rolling upgrade 照常完成**。判斷真偽一律用 `kubectl get pd -A`。
  🔴 **節點輪替＝IP 重用但主機金鑰全變**：plink 會報 POTENTIAL SECURITY BREACH 而 batch 模式直接中止。
  解法：清 `HKCU:\Software\SimonTatham\PuTTY\SshHostKeys` 內對應 IP 值，或用新工具
  `scratchpad/vsp.sh "<cmd>" [ip]`（先探當前指紋再用 `-hostkey` 釘上，並自動找出 kubeconfig 非 0 的 control-plane 節點）。
  輪替後 control-plane 仍在 10.0.0.227（但已是不同 VM），10.0.0.229 下線。
- 20:05 VSP 升完後**重跑 5 個 precheck**（VIDB/SALT_RAAS/SALT/VCF_SDDC_LCM/TELEMETRY）：TELEMETRY/VCF_SDDC_LCM/SALT_RAAS 已 SUCCEEDED（SALT_RAAS 這次過了＝VSP 前置解除），VIDB/SALT 仍 RUNNING。截圖 122。
  ⚠ 使用者會用同一個 Chrome 開別的分頁（曾把 lifecycle 分頁導去 vcf-m02-vc01 SSO）→ 腳本不可假設分頁還在。
  🛠 `scratchpad/ensure-tab.mjs`：優先找既有 lifecycle 分頁 → 否則用 about:blank 分頁導過去（**不搶使用者正在用的分頁**），需要時自動 Local Account 登入並切到 Upgrade 分頁。
  🛠 `scratchpad/wait-then-upgrade.mjs`：等 precheck 收尾 → 拍結果 → 自動勾選「非 VCFA 且未 Prechecks failed」的列 → 按 `UPGRADE (n)` → 拍開跑畫面。
- ✅ 20:49 **5 個 precheck 全部 SUCCEEDED**（VIDB 最後一個過）。截圖 123。
- 🚀 **20:47 批次升級 5 顆已開跑**：APPLY VIDB / SALT / SALT_RAAS / VCF_SDDC_LCM / TELEMETRY_ACCEPTOR 全 RUNNING。截圖 124。
  🔴 **批次 `UPGRADE (n)` 有確認對話框「Upgrade All Components」**（與單列 UPGRADE 不同，單列無確認）；
  且該對話框的 UPGRADE 按鈕 **DOM `.click()` 無效，必須用 CDP 真實滑鼠**（座標 = fleet iframe rect + 按鈕 rect）。
  另注意 `clr-modal` 會同時存在 2 個（一個是殘留容器），要取最後一個。
  🛠 `scratchpad/poll-batch.mjs`：同時輪詢 fleet APPLY 任務與 `kubectl get pd -A`（經 vsp.sh），完成時自動拍 125。
- ✅ **22:52 五顆全部 SUCCEEDED**（20:47→22:52，約 2 小時）：VIDB / SALT / SALT_RAAS / VCF_SDDC_LCM / TELEMETRY_ACCEPTOR。
  `kubectl get pd -A` 8 個 PD 全 Successful。升完的列全部消失，**清單只剩 VCFA 一列**。截圖 125。
  ⇒ VCF Management 除了 VCFA 以外**全部 9.1.1**（fleet-lcm / depot / VSP / VIDB / Salt×2 / SDDC LCM / Telemetry / Ops）。
## 🟢 Phase ③：VCF Automation 8.18 → 9.1.1（最後一段）
- IP 盤點（2026-09-08，ping + 反解雙查）：**10.0.0.240–247 全部無 PTR、ping 不到**；10.0.0.171=`vcf-m02-auto-platform.home.lab`（pool 外，符合要求）；10.0.0.172=vsp01。
- **Configure VCF Automation Upgrade 精靈**（目標 9.1.1）：
  Step 1 Parameters 新增警語「**Support for public cloud endpoints is deprecated starting VCF Automation 9.1.1. This capability will be turned off by default upon upgrade.**」
  🔑 目標 9.1.1 **可以選 Individual IPs**（9.1.0.0200 時只收 CIDR）→ 填 **10.0.0.240,241,242,243,244**（逗號分隔；「Minimum 5 IPs are required」是常駐提示不是錯誤）；
  FQDN `vcf-m02-auto-platform.home.lab`；密碼 VMware1!VMware1!（欄位 `#ip-pool-1-textarea` / `#fqdn` / `#password` / `#confirmPassword`，radio `#ipPoolEntryType-individual-1`）。
  Step 2 Summary 顯示 pool + FQDN → FINISH。截圖 126–129。
- 23:00 FINISH 後列狀態 `Configuration in progress...`；23:03 完成 → `Ready for upgrade`（但顯示的是舊的 0200 時代 precheck 失敗結果）。
  🔴 **殘留對話框坑**：先前批次升級的「Upgrade All Components」modal 有一個沒關掉，導致工具列按鈕停在 `RUN PRECHECKS (6)/UPGRADE (6)`（舊選取數）且點不到單列動作。
  解法：把所有可見 modal 按 CANCEL → `location.reload()` → 重新點 Upgrade 分頁。之後按鈕恢復 `RUN PRECHECKS (ALL)`。
- 23:08 勾選 VCFA 單列 → `RUN PRECHECKS (1)` → task PRECHECK VCFA PENDING。截圖 130。
- ❌ **23:30 VCFA precheck FAILED（9.1.1 目標）→ 真正的擋點找到了**
  stages：`set_upgrade_context ✓ → set_variables ✓ → validate_vsp_cluster_input ✓ →
  validate_vcfa_vmsp_version_compatibility ✓（"Target VCF Automation 9.1.1.0.25714559 requires VCF services runtime version 9.1.1.0.25714471"，已滿足）
  → vmsp_stage_plugin ✓ → **import_vcfa FAILED**`（UI 只給 `Internal error occurred` + `Reference Code: 0C53A949`）。
  🔎 **靠 kubectl 挖到真因**（fleet task 完全看不到）：
  `kubectl -n prelude get pods` → `vcfa-import-80-entrypoint-…` **Error**；
  `kubectl -n prelude logs …` 末尾：
  ```
  [DEBUG] Prepared platform configuration from source: {gateway 10.0.0.1, prefix 23, dns 10.0.0.200, ntp 10.0.0.200, internalCidr 198.18.0.0/15}
  [INFO] Collecting network MoRef from vCenter using govc...
  [INFO] Source system IP: 10.0.0.168
  ERROR : Script exited unexpectedly at line 1 with exit code 1
  ```
  ⇒ **import 腳本要用 govc 去「VCF instance 的 vCenter」查來源 VM 的 network MoRef，好把新的 VCFA runtime VM 放到同一個 portgroup。
  我們的 vra9（10.0.0.168）在外層 vCenter 10.0.0.101，不在 nested management domain vCenter（vcf-m02-vc01 10.0.1.19）→ 查不到 → 退出 1。**
  ⇒ 這就是官方前置「the VMware Aria Automation instance must reside in the management domain of the VCF Instance」的**實際強制點**：
  **import 註冊不擋，擋在 upgrade 的 import_vcfa 階段**。（補正 [[vcf91-vra8-import-blocker]]：先前只知道「擋在 precheck」，現在有精確的失敗行與原因。）
  🔑 對客戶問題（「客戶的 vRA 都在外面」）的結論：**外部 vRA 8 可以 import 進 VCF Operations 當元件，但不能就地升級成 VCF Automation 9.x；
  來源 VM 必須先進到該 VCF instance 的管理網域 vCenter。**
  順帶：腳本會把來源的 internal CIDR 10.244.0.0/22 換成 198.18.0.0/15（"not supported by VMSP 9.1, defaulting to..."）。
  另一支 workflow `vcfa-import-90-…`（calculate-requirements）是 Succeeded。截圖 131（precheck 失敗）。

### 📖 官方原文（要寫進 docx／PPT 的引用）
1. **管理網域前置條件** — 只出現在 *import* 頁面，不在 upgrade 頁面。
   頁面：**Import an Existing VMware Aria Automation Instance in VCF Operations**（"Before starting the import and upgrade:" 第一條）
   URL：`https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/deployment/upgrading-cloud-foundation/phase-3-import-and-upgrade-aria-automation-8-to-vcf-automation-9/import-an-existing-vmware-aria-automation-instance-in-vcf-operations.html`
   > "Verify that your VMware Aria Automation 8.18.1 and later instance **resides in the management domain of the VCF Instance** where you want to import it to.
   > To move VMware Aria Automation to a different vCenter, you must reconfigure the network. See Change IP addresses of VMware Aria Automation node or cluster."
2. **KB 425169**（症狀最接近我們遇到的：import 抓不到網路資料）
   URL：`https://knowledge.broadcom.com/external/article/425169/importing-aria-automation-8x-environment.html`
   > Cause: "Deployments for Aria suite is not on primary VCF Management workload domain."
   > Resolution: "The Fleet manager import process … **relies directly on the MGMT or WLD DB records of the vcenter housing Aria suite. You will need to relocate to the Management domain already included, or complete the import of the Workload domain vcenter housing The importing Aria product** to pull network resources and policies to continue import."
   ⇒ 官方給兩條路：**把 VM 搬進管理網域**，或**把承載 Aria 的那台 vCenter 以 workload domain 匯入 VCF**。
3. **網路沿用規則** — *Upgrading to VCF Automation 9.1* › Networking Details
   > "You deploy the new VCF Automation 9.1 nodes **on the same network** as your existing Automation nodes."
   > "If you upgrade from Aria Automation 8.18.x, the IP addresses of the existing nodes are automatically assigned as VIPs for the 9.1 instance."
   > "The FQDN from the existing Automation instance is automatically transferred as the VCF Automation FQDN of the 9.1 instance."
4. *Perform the Upgrade to VCF Automation 9.1* 的前置清單**沒有**管理網域這條（只有 FQDN／IP 池／depot／憑證 SAN／FIPS 端點／truststore KB 425489、447667 等）。
   URL：`https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/deployment/upgrading-cloud-foundation/phase-3-import-and-upgrade-aria-automation-8-to-vcf-automation-9/upgrade-to-vcf-automation.html`
5. **官方沒有**任何「如何把 Aria Automation 8 appliance 搬進管理網域」的步驟（冷遷移／cross-vCenter vMotion／OVF 匯出匯入皆未記載），只有一句「to move … you must reconfigure the network」。

## 🚚 Phase ④：把 vra9 跨 vCenter 搬進管理網域（使用者 09-09 指示）
- 來源：外層 vCenter **10.0.0.101**（8.0.3）／host 10.0.0.98／datastore `pcssd3`／portgroup **VM Network**。
  VM：`vra9` 12 vCPU、54 GB RAM、hw **vmx-13**、provisioned 300 GB／used 165 GB、IP 10.0.0.168、poweredOn。
- 目標：nested 管理網域 vCenter **10.0.1.19**（9.1.1）／cluster `m01-cl01`（4×esx，選記憶體最空的 esx04，free 197.9 GB）／
  datastore **m01-cl01-ds-vsan01**（free 1723 GB）／portgroup **SDDC-DPortGroup-VM-Mgmt**（dvportgroup-24，VLAN 0）。
  ✅ 該 portgroup 正是 VSP 節點（10.0.0.226–231）與 ops01（10.0.1.22）所在 → **同一個扁平 /23**，搬過去 IP 10.0.0.168 不用改。
- 可行性：nested host vmk0 = **10.0.1.14–17**，與外層 host **10.0.0.98** 同在 10.0.0.0/23 → 冷遷移的 NFC 走管理網路可通。
  （nested vMotion vmk1=192.168.13.x、vSAN vmk2=192.168.14.x，外層不一定路由得到 → 熱遷移可能失敗，屆時改冷遷移。）
  本機磁碟只剩 E: 98 GB／C: 42 GB → **不能走 OVF 匯出匯入**，只能 vCenter 對 vCenter 直傳。
- 工具：PowerCLI `VMware.VimAutomation.Core` **13.5.0**（已裝）→ 腳本 `scratchpad/xvmotion-vra9.ps1`
  （`Connect-VIServer` 兩端 + `Move-VM -Destination <dstHost> -Datastore -NetworkAdapter -PortGroup`，`-PreflightOnly` 可先驗證）。
- 🔴 **PowerCLI 版本混用坑**：本機同時有 13.3.0.24145081 與 13.5.0.25380678 → `Move-VM` 直接丟
  `Field not found: 'VMware.VimAutomation.Sdk.Util10.VIObjectImpl._connectionId'`。
  解法：腳本開頭把整組 **釘同一版**（Sdk / Common / Core / Vds = 13.5.0.25380678，VMware.Vim = 9.1.0.25380678）。
- ❌ **熱遷移（powered-on）不可行**：RelocateVM_Task 在來源 vCenter 直接 error
  `The target host does not support the virtual machine's current hardware requirements`。
  （PowerCLI 端只回一個誤導的 `Cannot convert type 'VirtualMachineFeatureRequirement' to 'Object'` → **真因要去來源 vCenter `govc tasks` 看**。）
  根因：`runtime.featureRequirement` 有 50 項，nested host 缺 **`misc.ibrs_all`／`misc.mds_no`／`misc.rdcl_no`／`misc.rsba_no`／`cpuid.xsaves`**
  （巢狀 ESXi 不對上層暴露這些 CPU 旗標）。查法：
  `govc object.collect -json <vm> runtime.featureRequirement` vs `govc object.collect -json <host> config.featureCapability`。
- ⇒ 改走**冷遷移**（VM 關機後 relocate 走管理網路 NFC，不檢查 CPU 旗標）：腳本 `scratchpad/coldmove-vra9.ps1`
  （Stop-VMGuest 優雅關機 → 逾時才強制 → Move-VM → Start-VM → 等 guest IP 回到 10.0.0.168）。
- ✅ **09-09 10:24 冷遷移成功**：08:44 開始 → 優雅關機 2.5 分 → **relocate 96.8 分鐘**（165 GB）→ 開機 → 10:26 guest IP 回報 10.0.0.168。
  現況：`/m01-dc01/vm/vra9`，host **vcf-m02-esx02**（DRS 又挪過）、datastore m01-cl01-ds-vsan01、portgroup SDDC-DPortGroup-VM-Mgmt、ping 通。
  **IP／FQDN 完全沒改**（目標 portgroup 同屬那個扁平 /23）→ 免走官方那句「to move … you must reconfigure the network」。
  ⏳ 開機後 443 尚未開（vRA 服務啟動要 10–20 分）→ 等服務起來再重跑 VCFA precheck 驗證擋點是否解除。
  ✅ 11:02 443 開；**11:09 服務就緒**（判斷用 `https://vra9.home.lab/vco/api/healthstatus` 由 503 轉 200；
  `/csp/gateway/am/api/health` 在 8.18 不存在會回 404，`/automation/` 太早就回 200 → 都不能當就緒訊號）。
- 🔴 **瀏覽器端障礙（非環境問題）**：Ops 登入頁在自動化 Chrome 反覆把 renderer 卡死（`Runtime.evaluate` timeout）。
  排除：Ops appliance 本身正常（curl `/ui/login.action` 200、VM 只用 2.1 GHz / 4.2 GB，四台巢狀主機皆有餘裕）。
  處理：`start-cdp-chrome.ps1 -Restart`（獨立 profile，不影響使用者自己的 Chrome）。
  🔑 **登入下拉選單真正的點擊目標是 `#authSelector-trigger-picker`（ExtJS 的下拉箭頭）**，不是輸入欄位本身；
  且視窗重啟後座標會變（本次 1584×849，欄位 y=481），**一律動態取 rect，不要用硬編座標**；選完要驗證 `#authSelector-inputEl.value === 'Local Account'` 才繼續。
- ⛔ fleet-lcm API **不吃 suite-api token**：`POST /suite-api/api/auth/token/acquire` 可取得 token，但帶去
  `/vcf-operations/plug/fleet-lcm/v1/*` 一律 302 導回 `/ui/login.action` → 必須用 UI 的 JSESSIONID（也就是必須走瀏覽器）。
- ✅ **繞過卡死登入頁的正解：curl 登入 + CDP 注入 cookie**（`scratchpad/inject-session.mjs`）
  1. `GET /ui/login.action?vcf=1&uri=<base64>` 取初始 cookie；
  2. `POST /ui/login.action`（`mainAction=login`、`userName`、`password`、`authSourceId=localItem`、`authSourceName=Local Account`、
     `authSourceType=`（空）、`uri=<同上>`、`forceLogin=true`、`timezone=480`；回應純文字 `ok`；
     🔴 未帶 `forceLogin=true` 會回 `concurrentSessionDetected`）；
  3. **再 GET 三個路徑做 bootstrap**（`/ui/index.action`、深層連結、`/plug/fleet-lcm/ui/index.html`；回 404/400 沒關係）
     才會拿到 `/vcf-operations` 與 `/vcf-operations/plug/ops` 的 JSESSIONID 及 `/` 的 opsConsoleId；
  4. CDP `Network.clearBrowserCookies` + `Network.setCookie` 逐一注入（httpOnly/secure），再 `Page.navigate` 到深層連結 → **frame 直接就緒，免走登入頁**。
  登入頁若真要用 UI 操作：`Ext.getCmp('authSelector').setValue('localItem')` + `fireEvent('select',…)` 可靠（滑鼠點 `#authSelector-trigger-picker` 在重啟後的視窗失效）。
- 🚀 **09-09 11:33 遷移後重跑 VCFA precheck**（截圖 132）→ 這是驗證「不在管理網域」是否為唯一擋點的關鍵一步。
- ✅✅ **12:10 結果：`import_vcfa` 這次 SUCCEEDED！管理網域擋點確認解除。**
  stages：`set_upgrade_context ✓ → set_variables ✓ → validate_vsp_cluster_input ✓ → validate_vcfa_vmsp_version_compatibility ✓ →
  vmsp_stage_plugin ✓ → **import_vcfa ✓（先前就是掛在這裡）** → vmsp_run_vcfa_prechecks ✗`
  ⇒ **因果閉環：把來源 VM 冷遷移進管理網域，就通過了先前失敗的 import 階段。**「外部 vRA 不能就地升級」由推論升格為實測結論。
- ❌ 新擋點（不同階段、屬於 vRA 應用層 precheck）`vmsp_run_vcfa_prechecks`：
  > One or more configured endpoints are missing certificate entries.
  > [com.broadcom.vcfa.upgrade.80.application.check.test-application-01-8x-endpoint-certificates]
  > Resolution: Review the individual endpoints under `/var/log/vmware/prelude/endpoint-certificates-checks-failed` on the source system for details.
  > Consult KB article https://knowledge.broadcom.com/external/article/425489 for remediation actions.
  來源機上該檔內容只有一行：**`Type: vsphere, Host: 10.0.0.101`**（vRA 的 vSphere cloud account 指向外層 vCenter，其憑證未存入 truststore）。
  ⇒ 正好對應官方 upgrade 前置條件那條 truststore 說明（「the truststore is not migrated and these endpoints become untrusted」，指向 KB 425489／447667）。
  🔑 `vracli certificate` 只有 ingress / load-balancer / proxy / vrli 四個子命令，**沒有 endpoint 選項** → 修法要走 KB／cloud account 重新驗證。
  vra9 的 root 密碼 = `VMware1!VMware1!`（govc guest.run 可用）。
- 📖 **KB 425489**「8.x endpoint certificates upgrade pre-check fails due to missing certificate entries」（公開，適用 VCF Automation 9.1）
  > Cause: "In Aria Automation 8.18.1, when you register a vSphere or NSX-T endpoint whose certificate is signed by the same CA as the Aria Automation
  > ingress certificate or by a well-known external CA, the vSphere adapter automatically trusts it as the CA is already present in the truststore.
  > **The certificate is not persisted into the provisioning-service database** … During the upgrade to VCFA 9.1.x, only the Postgres database content migrates.
  > Endpoints that rely on the implicit trust … might no longer be trusted, causing `No issuer certificate for certificate in certification path found` and `certificate_unknown(46)` TLS failures post-upgrade."
  > Resolution: 先建快照 → SSH 進 8.18.1 節點 → 執行 KB 提供的 base64 腳本 → 重跑 precheck。
  腳本行為（已逐行檢視）：`vracli certificate ingress --list` 匯出憑證鏈 → 以 awk 切成單張 PEM →
  `delete from ssl_trust_certificate_state where document_self_link like 'cert_ext_%'` → 逐張 `INSERT` 成 `cert_ext_N`；記錄檔 `/var/log/vmware/prelude/patch-prVCFCON-41983-<ts>.log`。
  **不是**改 endpoint 本身；UI 重新驗證 cloud account 沒用（介面卡刻意不存憑證，就是 Cause 講的）。
- ✅ **09-09 13:04 已套用**（先建快照 `pre-kb425489`，snapshot-3026）：解析出 2 張憑證，寫入 `cert_ext_1`(1873 B)、`cert_ext_2`(1995 B)，log 收尾 `completed successfully`。
  ⚠ 從 Windows 上傳的腳本會帶 CRLF → 結尾出現 `line 108: $'\r': command not found`（不影響結果，但要留意；必要時先轉 LF）。
  ⚠ 該腳本**不接受任何參數**（我誤傳 `--dry` 它仍直接執行）→ 執行前務必先確認快照已完成。
- 🚀 13:05 第三次 VCFA precheck 已送出（截圖 133）。
- 🎉 **13:44 precheck 全過（SUCCEEDED）**：8 個階段
  `set_upgrade_context → set_variables → validate_vsp_cluster_input → validate_vcfa_vmsp_version_compatibility →
   vmsp_stage_plugin → import_vcfa → vmsp_run_vcfa_prechecks → vmsp_delete_component_vcfa` 全 SUCCEEDED，errors 空。
  列狀態變 `Ready for upgrade / Precheck details / UPGRADE`（不再有 "Prechecks failed"）。截圖 134。
  ⇒ **兩個擋點都解掉了：①管理網域（冷遷移）②端點憑證（KB 425489 腳本）。**
- 🚀 **13:46 VCF Automation 升級已開跑**：task `01a084b3-ee33-748b-bfcb-9defe9699118` APPLY VCFA RUNNING，
  stages 起手 `set_upgrade_context ✓ → set_variables ✓ → validate_vsp_cluster_input ✓ →
  validate_vcfa_vmsp_version_compatibility ✓ → vmsp_stage_plugin_on_mgmt_vsp_cluster RUNNING`。截圖 135。
  ⚠ 單列 UPGRADE **無確認框**，按下後 UI 要約 30 秒才轉「Upgrade in progress…」且該列按鈕全部消失。
  這是藍綠升級：會用 10.0.0.240–244 建新的 VCF Automation runtime，原 8.18 節點 IP 轉成 VIP、FQDN 沿用。
  🛠 **lab 專用效能手段（使用者 09-09 指示：只記在 lab md，不要寫進交付的 docx/PPT）**：
  若底層 vSAN 太慢拖累升級，可把 **vra9 這台 VM 的儲存原則改成 FTT=0**（本 lab 既有做法，見 [[vcf91-rebuild-recipe]] 的 `Apply-VspRecipe.ps1`）。
  這是實驗室加速手段、非官方建議，客戶文件不得出現。
  作法：nested vCenter → vra9 → VM Policies → Edit VM Storage Policies → 選 FTT0 的原則（或 govc/PowerCLI 設定），
  新建的 VCFA runtime VM（10.0.0.240–244）同理可套。變更會觸發 vSAN 重新同步，建議在階段之間、非傳輸尖峰時做。
- 升級階段流水（共 14 個）：
  `set_upgrade_context → set_variables → validate_vsp_cluster_input → validate_vcfa_vmsp_version_compatibility →
   vmsp_stage_plugin_on_mgmt_vsp_cluster → import_vcfa_on_mgmt_vsp_cluster → vmsp_run_vcfa_prechecks_on_mgmt_cluster →
   **deploy_vmsp_cluster**（建新 runtime 叢集，約 2 小時） → discover_vsp_cluster → vmsp_stage_plugin → import_vcfa →
   vmsp_run_vcfa_prechecks → vmsp_stage_package → **vmsp_upgrade_vcfa**`
- 新 runtime 叢集（登入實測）：節點 `vcf-m02-auto-platform-ktdgw` = **10.0.0.242**，control-plane，Ready，K8s v1.35.6+vmware.2，
  **24 vCPU / 96 GB**（比來源 8.18 的 12 vCPU / 54 GB 大很多，這是 deploy 階段慢的主因）；VM 在 nested vCenter 的 `/m01-dc01/vm/vcf-automation/`。
  登入同管理叢集：`vmware-system-user` / 精靈裡設的密碼（VMware1!VMware1!），control-plane 有 `/etc/kubernetes/admin.conf`。
- ❌ **21:41 `vmsp_upgrade_vcfa` FAILED**（05:46:19Z→13:41:51Z，**7 小時 55 分**），`retriable:true`：
  > Internal error occurred. Component deployment failed for component type vcfa using version vcfa with component ID 9.1.1.0.25714559. [VCFMS-UPGRADE-COMPONENT-031]
  > Step vmsp_upgrade_vcfa failed. Reference Code: F449304C.
  🔎 新叢集內查真因（`kubectl logs -n vmsp-platform upgrade-component-…-execute-script`）：
  ```
  Error: existing package deployment is in progress, waiting for it to complete
  ERROR : Script exited unexpectedly at line 53 with exit code 1
  ERROR : component deployment for component vcfa failed. Exit code: 1
  （workflow stage: upgrade-deploy-80-component-services）
  ```
  ⇒ **腳本等 PackageDeployment 完成時逾時退出**，但底層其實還在跑：`kubectl get pd -n prelude vcfa-bundle` = **Progressing**，
  且 `prelude` namespace 的 VCFA 應用 pod（approval / catalog / ccs-gateway / provisioning / tango-blueprint / vco…）**正在 Init 起動中**。
  ⇒ 與 VSP 那次同型：**fleet 誤判 FAILED，底層持續進行**。處置：先等 `vcfa-bundle` PD 收斂，再決定是否 Retry fleet 任務（任務 retriable）。
  輪詢 `scratchpad/poll-vcfa-pd.sh`。
- ⚠ 22:14 五個 PRECHECK 任務（VIDB/VCF_SDDC_LCM/SALT_RAAS/SALT/VSP）被啟動、且 `/v1/system?action=apply` 被呼叫過（無對應 task）——**不是我的腳本按的**（我只點 Sync），應是使用者本人在同一瀏覽器操作（使用者 22:12 起也在點 Sync/RUN PRECHECKS）。**之後我下滑鼠事件前要先確認使用者沒在操作**；背景自動點擊腳本一律停掉。
- 🔴 Upgrade 按鈕：**未經使用者再次點頭不按**（藍綠會對 vra9 快照/停服務/關機）。
- 坑：Tasks 頁本來就有很多「Completed」列 → 輪詢終止條件不能用整頁關鍵字，要鎖定該任務列的狀態欄。

## （歷程）Step 1 進行中：nested Ops 9.1.0 → 9.1.1 PAK 升級（2026-09-06，使用者選 (b) 授權）
- 目的：解掉 9.1.0 產品 UI 一登入就卡死的問題，才能操作 Import 精靈（客戶情境 = 外部 vRA 直接 import，
  要親眼看它在哪一步、用什麼訊息擋下來）。
- ✅ snapshot `pre-ops911-20260906`（nested vCenter 10.0.1.19 上的 `/m01-dc01/vm/vcf-m02-ops01`，4vCPU/16GB）
- ✅ /admin 登入（admin/VMware1!VMware1!）→ Software Update → INSTALL A SOFTWARE UPDATE →
  file input `#filefield-1418-button-fileInputEl` → set-pak-file.mjs 塞入 PAK → Upload 已按下（0% 起跑）
- 升級前狀態：已裝 vSphere Supervisor 9.1.0.0.25346034 內容包 14/14 Completed，無待處理更新。
- 進度（2026-09-06）：19:54 上傳 100% → **Staging 花了 ~35 分鐘**（20:28:58 NEXT 亮；nested vSAN 慢，
  客觀證據：vSAN 可用 −9.7GB、ops01 committed +27.8GB、CPU 近滿載）→ EULA 已勾（`#checkbox-1436-inputEl`，
  用「accept」鄰近文字精準比對）→ Update Information → **現在停在 Install 畫面**
  （"The installer will restart the cluster before copying files"；按鈕 CANCEL/BACK/INSTALL）。
- ✅ **使用者 2026-09-06 「好 你按吧」→ INSTALL 已按下**（約 20:3x）。10 秒後 admin 頁還是舊的基頁（modal 關了），
  重啟尚未可見 → 背景監看：phase 1 等 API 掉線（證明重啟真的開始）、phase 2 等 analytics `/resources` 回 200
  （真正完成；版本 API 會提早報喜）。EULA 為同一份 Broadcom Foundation Agreement，使用者今天已明確同意。
  若等待中 admin session 逾時：進度在伺服器端，重登後軟體更新頁會顯示「uploaded but not installed」+
  Finish Installation（vrops 實測過），不用重傳。
- 時間軸：20:33:35 API 掉線（重啟開始，截圖 45 拍到「不可用」頁）→ **20:35 API 就回 200 但版本仍 9.1.0.0** —
  這是「先重啟叢集、再複製檔案」的過渡窗，**不是完成**。🔴 監看條件必須是 `resources=200 且 minorMinor=1`
  （版本真的變 9.1.1），單看 API 回來會誤判（vrops 那次是版本先變、叢集後 Online；這次是版本沒變、API 先回）。
  升級中 /admin 登入會被擋或表單重繪（停在 login.action 無錯誤），別反覆試。
- 坑：inline eval 裡**任何反斜線**（如 `\\.`）經 bash→JSON→JS 三層會炸、又被 `2>/dev/null` 吞掉 →
  輪詢每筆印空字串永不觸發。改用 `indexOf`，且除錯時別吞 stderr。
- 文件提醒：fleet 來源升級可能多問「fleet management appliance root password」做 inventory 遷移 → 若出現先停。
### 本輪新坑
1. **nested Ops 的 /admin 登入頁 `type` 會把密碼接在帳號後面**（欄位變 `adminVMware1!VMware1!`、密碼空 →
   "Please enter user name and password"）— 跟 runbook §4.5 NSX 一樣。**要用 `fill`**，送出前 eval 驗
   `{auth:"Local Account",user:"admin",plen:16}`。（vrops 那台 `type` 反而正常。）
2. nested Ops admin 在 modal 開著時 `shot` 常逾時 → 截圖用獨立短呼叫，別塞在長鏈尾端。
3. 登入送出後同一呼叫內的 eval 會因頁面跳轉回 `undefined`（context 被打掉）— 不是失敗，下一呼叫看 URL 即可。

## 待辦 / 下一步
- [ ] 等 vROps→VCF Ops 9.1 import research agent 回來（重點：來源 vCenter 是否須在 fleet）
- [ ] 驗證 nested VCF Operations(10.0.1.22) 能否 reach 外層來源(.168/.111) 與外層 vCenter(.101)
- [ ] 確認 depot 有沒有 upgrade binaries + Migration Service Engine（air-gap 要先餵料）
- [ ] 確認有 8 個連續空 IP(/29) + 2 組 FQDN(vRA runtime / vROps 若需)
- [ ] 依可行性決定：真跑 import / 只到精靈+precheck 截圖

## 🎉 Phase ⑤：真相大白 —— 升級其實成功了（09-09 22:4x 查證）
- ❌ **Retry 走不通**：列上再按 UPGRADE，任務 1 秒內失敗（兩次，14:21:43Z / 14:24:43Z），階段只有一個 `sddc_service_task_async_step_ref`：
  > Failed to start task — Unexpected HTTP response - Status: 404 NOT_FOUND, reason: **No matching source version found for source 8.0.0 within catalog 9.1**
  原因：fleet 的 VCFA 元件紀錄在升級過程被改寫成 **version `8.0.0` / deploymentType `VSP`**（原本 8.18.1.36791.24282366 / 匯入型），
  9.1 catalog 沒有「從 8.0.0 升級」的來源版本 → 連任務都建不起來。
  三處一致：fleet `/v1/components`、mgmt 叢集 `kubectl get comp vcfa`、新叢集 `kubectl get comp vcfa`，全是 8.0.0 / PHASE Unknown。
- ✅ **但實際上升級已完成並切換**（用 kubectl + govc + curl 三方查證）：
  | 檢查 | 結果 |
  |---|---|
  | 新 runtime `vcfa-bundle` PD | **Successful**（62 pods Running / 9 Completed） |
  | 新叢集 gateway `vcfa-gateway-configuration` | LoadBalancer EXTERNAL-IP **10.0.0.168**，PROGRAMMED=True |
  | httproute hostnames | **vra9.home.lab / *.vra9.home.lab**（abx / ad-service / approvalapi / automation…） |
  | 來源 VM `vra9` | **poweredOff**（官方：After the upgrade completes, the source Automation nodes are shut down automatically） |
  | `https://vra9.home.lab/tm/api-explorer/provider/cloudapi.json` | **200**（9.x 才有的端點；8.18 無此路徑） |
  | provider 頁面 | 顯示 **9.1.1** |
  | 舊 API `/blueprint/api/blueprints`、`/deployment/api/deployments` | 3 個 blueprint + 1 個 deployment **完整存在**（資料已遷移） |
  | 租戶 console 登入 | ✅ 成功（見下）：Cloud Accounts 1、VMs 52、Deployments 1 Success、Cloud Zones 1、Projects 1 |
  ⇒ **VIP／FQDN 已由新的 9.1.1 接手，資料完整，服務正常。fleet 只是沒把新環境重新納管回去。**
- 📖 **KB 441246 描述的就是這個症狀**：「VCFA 9.1 upgrade times out on step vmsp_upgrade…」——
  > "the service pods and product packages deploy completely and function normally on the new appliance"
  > 但 "the automated upgrade workflow fails to automatically reimport the new appliance into the fleet lifecycle management"
  該 KB 的處置**只有診斷**（`kubectl get pods -A` 確認 prelude/vmsp Running、打開 9.1 UI），**沒有補救或手動 cutover 程序**。
- ⛔ **KB 441333（Failed component cleanup）明文排除本情境**：「VCF Automation Upgrade Failure cleanup is **not supported**」→ 要開 support case。
  KB 441127 另警告：VCFA 元件移除後再加回會因 infrastructure properties 為 NULL 而無法 import（別亂用移除重加）。
  KB 402057 是 **9.0** 的 revert 程序（刪掉失敗部署→開回 Aria VM→跑 `/opt/scripts/deploy.sh`→重新 import），9.1 無對應文件。
- 🔑 **登入新 console 的路徑**（本 lab）：`https://vra9.home.lab/automation/` → 選 **Log in with local account**（該連結是 `<option>`，要用 textContent 找最深節點點擊）
  → 轉到 vidm9 SSO（中文介面）→ 填 `#username` / `#password` → **送出要點 `#signIn`（按鈕文字「登入」用 clickText 抓不到）**
  → 落到 `https://vra9.home.lab/tenant/vidm9/automation/#/home`，右上顯示 **Local Admin / vidm9 Classic Tenant**。
  provider console（`/provider/`）用 admin + 同密碼會 Authentication Error（provider 帳號不同，未深究）。
- 截圖：900 fleet 失敗列、901/904 新叢集 kubectl 狀態、902 列動作選單、903 retry 失敗、905 9.1.1 登入頁、906 provider 登入、**907 新 console 首頁（含遷移後資料）**。

### 🔎 進 VMSP 查「為什麼 fleet 記 8.0.0 / 為什麼 retry 404」（09-09 22:5x）
- 新叢集 VMSP 任務 `task-fxjx5e37…` 解碼（secret `taskstatus` = base64→base64→gzip）：階段清單
  `… → upgrade-80-initialization ✓ → upgrade-deploy-80-component-services ✗（等 vcfa-bundle PD 逾時：timeout **2h**）→ **upgrade80-target-component-version（"Patch the target Component Version"）= Pending**`。
  ⇒ **8.0.0 不是被「改壞」，而是 import 時的佔位版本**（`COMPONENT_VERSION: vcfa-8.0.0`、ComponentVersion CR `vcfa-8.0.0`/`vcfa-9.0.0`/`vcfa-9.1.1.0.25714559` 三個都在），
  正常流程最後一階段才會把 Component CR 的 `spec.versionRef` 與 fleet/sddc-lcm 庫存改成 9.1.1；那一階段沒跑 → 三處都停在 8.0.0/Unknown。
- 資料庫實證：fleet `vcffleetlcmdb.component` 與 sddc-lcm `vcfsddclcmdb.component` 的 VCFA 列皆 `version=8.0.0, status=Unknown, deployment_type=VSP, size=small`；
  `upgrade_plan_component.desired_version=9.1.1.0.25714559`；三筆 execution 全 FAILED（05:46 主任務、14:21/14:24 兩次列上 UPGRADE）。
  fleet-upgrade-service log：`populateAdditionalFieldsFromInventory` 從庫存讀 currentVersion 8.0.0 → 建新 execution 時 catalog 找不到 8.0.0 來源 → 404。
- 8.x 升級 workflow 模板（prelude/`vcfa-upgrade-80-entrypoint`）步驟：
  `snapshot-source-environment → stop-source-consumer-services → export-source-system → stop-all-source-services → shutdown-source-environment → mount-vmdks-to-target-environment → create-data-migration-flag`
  ⇒ **來源 VM 關機、資料碟掛到新節點**都是設計行為（vra9 上有自動快照 `automated_vcf_backup_vra9_2026-09-09T11-25-56Z`）。
  post-deploy 模板 `vcfa-upgrade-80-post-component-deploy`：`unmount-vmdks-from-target-environment → cleanup-upgrade-configuration` —— **尚未執行**：
  govc 看到 `vcf-m02-auto-platform-ktdgw` 的 `disk-1000-14` 仍是 `[vsan] efaba06a…/vra9_1-000002.vmdk`（來源資料碟的快照 delta）。
- 🔑 **fleet 有任務層 Retry**：UI bundle 的 `RetryTaskPath = /v1/tasks/{taskId}?action=retry`（另有 `?action=cancel`）。
  列上 UPGRADE = 另建 execution（撞 404）；**任務 Retry = 接續原任務的失敗階段**（VMSP 側 `component-upgrade: done`、PD 已 Successful → 預期直接過 deploy 階段，接著跑 post-deploy 卸碟＋Patch target version）。
  這才對應 KB 的「select the previously failed upgrade task and click Retry」。
- `vmsp` CLI（/usr/local/bin/vmsp）只有 bootstrap/delete/logging/package/passwd/vcenter/version，**沒有 task/component 子命令**。
- ✅ **23:0x 任務層 Retry 成功接續**：Upgrade 分頁列上的 UPGRADE 不是 retry；要到 **Tasks 分頁**，失敗的「VCF Automation Upgrade」列狀態欄有 **Retry** 連結（`a.task-action`，DOM click 有效、無確認框）
  → 原任務 `01a084b3-ee33-748b-bfcb-9defe9699118` 直接回到 **RUNNING**（不建新 execution，所以不會撞 8.0.0 的 404）。
  ⚠ 進入任務明細後列表會消失，要先按 BACK 回 Tasks 列表才找得到列。截圖 908（Tasks 列表含 Retry）、909（按下後）。
  輪詢：`poll-task.mjs <taskId> <shotNo>`（依任務 ID，不再用「最新 APPLY」避免抓到 404 的那兩筆）＋新叢集 VMSP task/comp 監看迴圈。
- ❌ **23:26 任務層 Retry 也失敗（15:05→15:22Z，16 分鐘），而且退得更早**：
  第二次 `vmsp_upgrade_vcfa` 的 VMSP 階段 = `component-upgrade ✓ → upgrade-80 ✓ → upgrade-80-initialization ✗ → upgrade-deploy-80-component-services (Pending) → upgrade80-target-component-version (Pending)`；
  失敗的 workflow 是 `prelude/vcfa-upgrade-80-entrypoint-lkxj8`（就是 8.x 初始化那支：snapshot/stop/export/shutdown source → mount VMDK）。
  ⇒ **Retry 不是接續，而是把 8.x 初始化整段重跑**；來源 vra9 已被第一次執行關機（設計行為），初始化步驟對來源做不了事就失敗。
  之後 fleet 任務 `retriable:false`、VMSP 任務 `retryable:false`——**重試路徑已用盡**。fleet log：`Skipping auto-retry`。
  新叢集狀態不變：`vcfa-bundle` Successful、62 pods Running、comp 仍 `vcfa-8.0.0/Unknown`、來源資料碟仍掛在新節點（2 個 vra9_* vmdk）、vra9 poweredOff。
  Reference Code 第二次 = 09B1B0F6（同樣是 per-incident hash）。
- 🔎 **第二次失敗的真因不是「來源關機」，是快照上限**：`vcfa-upgrade-80-entrypoint-lkxj8` 停在 `snapshot-source-environment → snapshot-vm(10.0.0.168) → snapshot-virtualmachine`，
  pod log：`govc: An error occurred while taking a snapshot: Exceeded the maximum number of permitted snapshots. (msg.snapshot.vigor.take.error)`。
  來源 vra9 當時已有 2 個快照（我建的 `pre-kb425489` ＋ 第一次升級自動建的 `automated_vcf_backup_vra9_2026-09-09T11-25-56Z`）。
  其餘初始化步驟（export/stop/shutdown/mount）全被 Omitted（depends 未滿足）。
  ⇒ **Retry 的語意是「從 8.x 初始化整段重做」（會再拍快照、再匯出、再掛碟），不是接續最後一階段。**
- 🧭 **Retry 路徑結論（09-09 23:4x）**：
  8.x 初始化 main 的 12 步全是 templateRef（`platform-helper-templates/execute-script`、`vcenter-virtualmachine/snapshot-multiple-vms|resolve-vm-by-ip|dag-mount-disk`），
  stop-source-consumer-services / export-source-system / stop-all-source-services / shutdown-source-environment 都要對**開機中的來源**執行（SSH/vracli）；
  來源 vra9 現在 poweredOff（第一次執行關的）＋ 快照上限 → 就算清掉快照、把 vra9 開回來讓它重跑，fleet 任務也已 `retriable:false`、Tasks 列 Retry 消失、列上 UPGRADE 撞 8.0.0 404。
  ⇒ **fleet 內建的重試手段全部用盡**。剩三條路：
  (A) support case（官方：KB 441333 明講 VCFA upgrade-failure cleanup 不支援 → 找支援）；
  (B) lab 手動補完 pending 兩階段（**非官方、需使用者同意**）：新節點卸載 vra9_1-000002.vmdk（disk-1000-14 等 2 顆）→ 兩叢集 `comp vcfa` 的 `spec.versionRef.name` 改 `vcfa-9.1.1.0.25714559`
      → fleet `vcffleetlcmdb.component` 與 sddc-lcm `vcfsddclcmdb.component` 的 version 改 9.1.1.0.25714559 → Ops 觸發 Refresh component；
  (C) 維持現狀：產品已是 9.1.1 且正常服務，只是 fleet 帳面 8.0.0（後續 fleet 無法對它做生命週期操作）。
  快照補充：vra9 extraConfig 無 `snapshot.maxSnapshots`，上限訊息來自 vmx 層；目前樹＝pre-kb425489 → automated_vcf_backup_vra9…（2 個）。

## 🧪 Phase ⑥：選項 B（lab 手動補完，非官方；使用者 09-10 指示「文件寫 A 和 B，B 試試」）
- 前置盤點：runtime 節點上只有 **1 顆**來源碟 `disk-1000-14`（pvscsi-1000 unit 14）= `[vsan] efaba06a…/vra9_1-000002.vmdk`（144 GB），
  guest 內為 `/dev/sdn` → LVM `data_vg/data` 掛在 **`/vra-db`（ro）**，無程序開檔、fstab 無條目 ⇒ 資料遷移已完成、純殘留。
  官方 post-deploy 模板 = `unmount-vmdks-from-target-environment`（`vcenter-virtualmachine/dag-unmount-disk`）＋ `cleanup-upgrade-configuration.sh`。
- 備份：runtime 叢集 `comp vcfa` yaml → `scratchpad/backup-comp-vcfa-runtime.yaml`；runtime 節點磁碟清單 → `runtime-node-disks-before.txt`。
- ✅ Step 1（09-10 00:0x）：節點內 `umount /vra-db` → `vgchange -an data_vg`（LV 轉 inactive）→
  `govc device.remove -vm …ktdgw -keep disk-1000-14` → 節點剩 24 顆碟、0 顆 vra9_*；來源 `vra9_1*.vmdk` 三個檔仍在、vra9 四顆碟完整（可回掛）。
- ✅ Step 2（00:1x）：runtime 叢集 `kubectl patch comp vcfa --type merge -p '{"spec":{"versionRef":{"name":"vcfa-9.1.1.0.25714559"}}}'`
  ＋ `kubectl label comp vcfa component.vmsp.vmware.com/version=9.1.1.0.25714559 --overwrite` → spec/label 皆 9.1.1；**status.phase 仍 Unknown**（controller 尚未把它判成 Running，追查中）。
  ComponentVersion `vcfa-9.1.1.0.25714559` spec：size small = 24 vCPU/96 Gi/200–400 Gi（解釋新節點規格），`timeout: 2h`（就是 deploy 階段逾時的來源）。
- mgmt 端備份完成 → `scratchpad/backup-vcfa-mgmt-and-db.txt`（comp yaml + fleet/sddc-lcm 兩張 component 表）。其他元件在 fleet DB 的 status 一律 `Running`；VCFA 為 `Unknown`。
  🔑 fleet 的 `vmsp-agent` 會定期 `GET https://vcf-m02-auto-platform.home.lab/api/v1/components?type=vcfa`（runtime 叢集的 VMSP API）→ fleet 庫存的來源在這裡，
  所以優先讓 runtime 側 CR 正確、再用 fleet「Refresh component」同步，而不是直接改 DB。
  ⚠ vsp.sh 對 mgmt 節點（10.0.0.227）不穩（探指紋失敗時整段無輸出）；mgmt 端改用 `echo y | plink … vmware-system-user@10.0.0.227 "<cmd>"` 直連＋ base64 上傳腳本。
- ✅ Step 3（00:2x）：runtime `comp vcfa` 的 phase 由 `vmsp-operator` 只做「沒設就填 Unknown」（log: `phase is not set, set to 'Unknown'`），
  不會自己算 Running → 比照官方最後階段的效果，直接 `kubectl patch comp vcfa --subresource=status --type merge -p '{"status":{"phase":"Running"}}'`
  → `vcfa-9.1.1.0.25714559 / Running`，36 秒後仍維持（operator 不覆寫）。
  fleet 的 VCFA 紀錄：`vspCluster.id = 38eb20b2…（=component id）, fqdn vra9.home.lab, type CONSUMPTION`，`vcenter vcf-m02-vc01`，`nodes []` —— 亦即 fleet 把 VCFA 自己的 gateway FQDN 當成它的 consumption VSP 叢集。
  ⚠ `vmsp-agent` pod 是 distroless（無 sh），不能 exec 進去 curl；查它讀到什麼只能看 log。
- Step 4：mgmt 叢集殘留的 `comp vcfa`（來自 `import_vcfa_on_mgmt_vsp_cluster`）同步改成 versionRef/label 9.1.1，避免 refresh 從 mgmt 側讀回 8.0.0。
- Step 5（00:1x）：fleet `POST /v1/sddc-lcms/ec07a1b0-…/refresh` → 202，task `REFRESH_SDDC_LCM_WORKFLOW`「Refresh VCF Instance vcf-m02 by pushing Software depot configuration and syncing component inventory」
  階段：`update_fleet_depot_spec_ref → check_if_propagate_fds_data_to_vcfa_task_needed_ref → prepare_refresh_input_ref → persist_sddc_lcm_components_ref`。
  🔑 同步鏈實證：sddc-build-service 的 `RefreshComponentAction` 對 VCFA 直接 `GET https://vcf-m02-auto-platform.home.lab/api/v1/components?type=vcfa`（runtime 叢集 VMSP API，body 含 ingress fqdn vra9.home.lab / vips 10.0.0.168 / size small）
  → **sddc-lcm DB 的 VCFA 列已變 `9.1.1.0.25714559`**（改 CR 就夠，不必碰 sddc-lcm DB）；fleet DB 要等 `persist_sddc_lcm_components_ref` 階段寫回。
  ⚠ fleet-build-service：`Successfully retrieved 0 svc accounts for component type: VCFA` ＋ `VCFA endpoint cannot be constructed: FQDN='vra9.home.lab', credentials available=false`
  → fleet 對 VCFA **沒有 service account／憑證**（正常升級的 reimport 才會建立）；即使版本對齊，fleet 後續對 VCFA 的操作（例如 propagate depot 設定）仍可能因無憑證受限——文件要寫進 B 的限制。
- Step 5 結果（00:26）：refresh task **SUCCEEDED**（persist_sddc_lcm_components → 註冊各元件到 Ops 全過）。
  fleet DB VCFA：`status` 由 Unknown → **Running**（有同步），但 **version 仍 8.0.0**；sddc-lcm DB 已是 9.1.1.0.25714559；
  fleet API `/v1/components` 仍 8.0.0；Upgrade 分頁列仍 `8.0.0 → 9.1.1.0.25714559 / Upgrade failed`（target-versions 對 VCFA 只列 9.1.1.0.25714559）。
  ⇒ refresh 只同步 status，不同步 version（version 顯然只由升級 finalizer 或匯入寫入）。截圖 916–918。
- Step 6（00:3x，最後手段）：fleet-build `PersistSddcLcmComponentsAction` 從 SDDC LCM 取回 11 個元件後，VCFA 的 **status 有寫回（Running）但 version 保留 8.0.0**（log 無任何 version 合併訊息；
  `CREATE_PERSIST_VCFA_SERVICE_ACCOUNT_TASK: Component ID is null, skipping VCFA credential persistence` → 憑證仍不會建）；fleet DB 的 `component_config` 表對所有元件都是空的（非 VCFA 特有）。
  ⇒ 直接改 fleet DB：`update component set version='9.1.1.0.25714559' where component_id='38eb20b2-…' and component_type='VCFA' and version='8.0.0'` → `UPDATE 1`，列變 `VCFA|Running|9.1.1.0.25714559|VSP|small`。
  `upgrade_plan_component` 仍 `desired_version 9.1.1.0.25714559 / ELIGIBLE`（由 plan sync 重算）。
- ✅ **選項 B 完成（09-10 00:4x）**：fleet API `/v1/components` VCFA = **9.1.1.0.25714559**；Upgrade 分頁 **0 列**（Target 9.1.1.*，無待升元件）；
  Components 分頁 VCF Automation 顯示 9.1.1。runtime 叢集：vcfa-bundle Successful、62 pods Running、`comp vcfa 9.1.1.0.25714559 Running`；
  console `/automation/` 200、`/tm/api-explorer` 200、blueprints 3（資料仍在）。唯一殘留：prelude 內 retry 失敗的 execute-script pod（Error，無害）。截圖 915–920。
  B 的完整步驟（lab-only，客戶文件標「非官方」）：
  ① 節點內 `umount /vra-db; vgchange -an data_vg` → govc `device.remove -keep` 拆來源碟
  ② runtime `comp vcfa`：patch `spec.versionRef.name` + label `component.vmsp.vmware.com/version` → 9.1.1；`--subresource=status` phase → Running
  ③ mgmt 殘留 `comp vcfa` 同步 versionRef/label（phase 留 Unknown）
  ④ fleet `POST /v1/sddc-lcms/<id>/refresh` → sddc-lcm DB 自動變 9.1.1、fleet status 變 Running（version 不會同步）
  ⑤ fleet DB `update component set version=…` → UI/API 對齊
  已知限制：fleet 對 VCFA **無 service account／憑證**（`credentials available=false`），fleet→VCFA 的後續整合動作可能受限；官方立場仍是 support case（KB 441333）。

## ⑦ 升級後補測：藍圖 `formatVersion: 2` + `metadata:`（2026-09-10）

問題：formatVersion 2 是否讓 VCF Automation 9.1.1 真正「支援」頂層 `metadata:`？

- 建立 `METADATA-TEST-911-20260910`（`90cc50eb-…`，content = E:\8\deploy\bp-metadata-test\attrtest.yaml）→ 201、`valid: true`；發版 v1 RELEASED；實際部署 `meta-test-911-01` CREATE_SUCCESSFUL（VM 10.0.0.212）。
- `/blueprint/api/blueprint-validation` 實測規則：
  - `formatVersion: 1` + metadata → `Blueprint format version should be at least 2 to support metadata`
  - formatVersion 只接受 0–2；`metadata` 必須是 object（字串/list 都擋）；任意鍵可放（`foo: bar`、`${input.x}` 都 valid）
  - 唯一被解讀的鍵是 `metadata.deploymentSettings`（object，值必須 boolean；訊息 `Deployment setting value should be of type boolean`）
- 反編譯 tango-blueprint-service（runtime 叢集 10.0.0.242，`/opt/vmware/snapshot/libblueprint-webapp.jar`）：`BlueprintUtils` 只有 `BLUEPRINT_FORMAT_VERSION_0/1/2`；formatVersion 2 解鎖三樣：`outputs`、`variables`、`metadata`；`BlueprintMetadata` 類別只有 `deploymentSettings` 一個欄位，其餘鍵原樣留在 content 字串。
- API 讀回：blueprint/version/blueprint-request/deployment 物件都沒有 metadata 欄位；deployment resource 只看得到 `resources.*.properties` 自訂 key 與 tags（跟 8.18 相同）。
- 結論：**與 8.18 行為一致**——formatVersion 2 + metadata 在 8.18 就 valid，9.1.1 沒有新增任何讀出/篩選 metadata 的 API。要讓平台「看得到」的屬性仍應放 resource properties / tags。
- 注意：`POST /blueprint/api/blueprints` body 若用 argv 帶中文 YAML 會變 `Invalid UTF-8 start byte`，改用檔案 `--data-binary @file`。
