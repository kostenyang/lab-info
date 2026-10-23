# VCF 9.1 Fleet 版號同步 — Lab 實測結果

> 對照文件:`fleet-version-sync-official-basis.md`(官方依據 + 測試計畫)
> 環境:nested VCF 9.1 **GA**(m01 management domain),2026-08-28 建立

## 環境基準

| 項目 | 值 |
|---|---|
| bring-up | `COMPLETED_WITH_SUCCESS 310/310`(2026-08-28 01:28) |
| SDDC Manager | `9.1.0.0.25371088`(GA) |
| vCenter | `9.1.0.0.25370922`(GA) |
| NSX Manager | `9.1.0.0.25318225`(GA) |
| ESX ×4 | `9.1.0.0.25370933`(GA)ASSIGNED |
| domain | `m01` MANAGEMENT ACTIVE，id `a53df574-d2d5-4906-a9a8-80d15608f501` |

**為什麼特地部 GA**:installer 預設會抓 depot 裡最新的 patch(第一次部出 SDDC Manager 0400)。
要部舊版必須:depot 有該版安裝檔 + spec 每個元件釘完整 5 段版本 + INSTALL bundle 已下載到 installer。
細節見 repo `nested-workarounds/VSP-LCM-troubleshooting.md`。

---

## 已完成:Step 0 基準線

### ✅ 實測確認「無 upgrade plan ⇒ 永遠 On Target」(官方陷阱成立)

`GET /v1/releases/domains/{domainId}`:
```json
{"domainId":"a53df574-...","targetVersion":"","targetSddcManagerVersion":"","patches":[],"isCustomizedBom":false}
```
**`targetVersion` 是空字串** —— 沒有任何 target 被設定。

`GET /v1/version-drift?componentType=DOMAIN&componentId={domainId}` → 200:

| 元件 | current | target | status |
|---|---|---|---|
| DOMAIN m01 | 9.1.0.0 | 9.1.0.0 | ON_TARGET |
| SDDC_MANAGER_VCF | 9.1.0.0.25371088 | 同左 | ON_TARGET |
| NSX_T_MANAGER | 9.1.0.0.25318225 | 同左 | ON_TARGET |
| VCENTER | 9.1.0.0.25370922 | 同左 | ON_TARGET |
| ESX | 9.1.0.0.25370933 | 同左 | ON_TARGET |

**每個元件 target == current**,印證官方原文:
> "When no target version is configured, the current version is used as the target, and the status displays as On Target."

👉 **交付意涵**:客戶若是全新安裝、沒建 upgrade plan,手動升版後在 Component Versions
**看不到任何 drift**。要看到 `Version Drift` 必須先建 upgrade plan 設 target。

### ✅ `POST /v1/resources/version-syncs` 在 9.1 確實存在(H3 前半確認)

| 呼叫 | 結果 |
|---|---|
| `GET /v1/resources/version-syncs` | 400(不支援 GET) |
| `POST /v1/resources/version-syncs` body `{"resourceType":"SYSTEM"}` | **202** |

研究階段的疑慮是「它只出現在 release notes,不在 9.1 API reference 索引」→
**實測證明端點真實存在且接受請求**。是否真能修正版號要等 Step 5 才知道。

### 📌 研究文件沒寫到的 API 細節(實測補充)

- `/v1/version-drift` 的 `componentType` **與** `componentId` **兩個都是必填**,
  只給 componentType 會回 400 `ANNOTATIONS_MISMATCH`。
- 用 `componentType=DOMAIN` + domain id 查,會**一次回傳整棵元件樹**(最實用的查法)。
- `GET /v1/hosts` 的 `softwareInfo.baseImage.version` 在本環境是空的,
  可用的版號欄位是 **`esxiVersion`**。

---

### ✅ S1:Lifecycle > VCF Management > Components(升版前)

截圖 `doc-shots/fleet-sync/S1-lifecycle-before.png`。
路徑:VCF Operations > **Build** > **Lifecycle** > **VCF Management** > **Components**
(URL `/vcf-operations/ui/build/lifecycle?resourceId=management-lifecycle`)

這頁列的是 **fleet 管理層元件**,全部 GA:

| Component | FQDN | Version |
|---|---|---|
| VCF Operations | vcf-m02-ops01 | 9.1.0.0.25346025 |
| VCF services runtime | vcf-m02-vsp01 | 9.1.0.0.25370367 |
| Fleet lifecycle | vcf-m02-fleet01 | 9.1.0.0.25371109 |
| Identity broker | vcf-m02-vidb | 9.1.0.0.25368698 |
| Salt RaaS | vcf-m02-fleet01 | 9.1.0.0.25346036 |
| Software depot | vcf-m02-fleet01 | 9.1.0.0.25371105 |
| Salt master | vcf-m02-shared01 | 9.1.0.0.25346036 |
| SDDC lifecycle | vcf-m02-shared01 | 9.1.0.0.25371107 |
| Telemetry | vcf-m02-shared01 | 9.1.0.0.25181946 |

🔎 **研究文件沒提到的發現**:這頁右上角有
`Last lifecycle metadata sync time: **N/A**` 加一個 **`Sync`** 連結 ——
這是第三個「sync」入口(前兩個是 config-drift 的 Sync inventory、與 version-syncs API),
它同步的是 **lifecycle metadata**,語意上又不一樣。測試時要一併釐清它動到什麼。

⚠️ **vCenter / NSX / ESX 不在這頁** —— 它們在左側 **VCF Instances** 底下,
那才是版號 drift 會出現的地方。

### 🔎 S1c:domain(m01)層的 Lifecycle 頁 —— 沒有 Component Versions 表

正確 URL(Angular tree 的合成點擊無效,必須直接導航):
```
/vcf-operations/ui/build/lifecycle?resourceId=<domainId>
```
標題確實顯示 `m01`,但頁面上**只有 `Tasks` 一個 tab,沒有任何表格**。

研究文件根據官方 techdocs 寫的是「Build > Lifecycle > 選 domain > **Component Versions** tab」,
實機在**全新安裝、無 upgrade plan** 的狀態下看不到那個 tab。

👉 這是「無 target ⇒ 沒東西可顯示」的**第三個獨立佐證**
(前兩個:`targetVersion` 空字串、version-drift 全部 target==current)。
交付時要講清楚:客戶如果沒有 upgrade plan,這個畫面根本不會出現,
不是版號沒同步,而是 UI 沒有比較基準可顯示。

> ⚠️ 因此本測試的**主要證據改用 API**(`GET /v1/version-drift`、`GET /v1/hosts`),
> UI 截圖作為輔助。API 的 `currentVersion` / `esxiVersion` 才是判斷版號有沒有同步的可靠訊號。

---

---

## 🔴 核心發現:版號有「兩層」,但要小心別誤判

**時間軸**

| 時間 | 事件 |
|---|---|
| 08:40 | esx04 進 maintenance mode(vSAN full data migration,44 分鐘) |
| 09:27–09:38 | 掛 0100 ISO 開機升級(Welcome→EULA F11→選 32GB 開機碟→**(X) Upgrade**→CPU 不支援警告→Force→F11) |
| **09:44:09** | esx04 上線,`govc about` = **`VMware ESXi 9.1.0.0100.25433460`**(S4 地面真相) |
| 09:44:33 | H1 檢查(升完僅 24 秒) |
| 09:46:59 | version-drift 仍 `mixedVersions:false` |
| 09:47 | 加 `check.lcm.isVersionSyncRequired=false`、重啟 operationsmanager |
| 09:48:42 | version-drift 變 `mixedVersions:**true**` |
| 09:47:02 | `POST /v1/resources/version-syncs` → **202**,任務 `Synchronize Inventory Versions` |

### 兩層版號(實測)

| 來源 | esx04 / ESX 版號 | 更新速度 |
|---|---|---|
| `GET /v1/hosts` → `esxiVersion`(**逐台**) | `9.1.0.0100.25433460` | **24 秒內**就是新值 |
| `GET /v1/version-drift` → ESX `currentVersion`(**叢集層**) | `9.1.0.0.25370933` | 見下方說明 |

### ⚠️ 判讀更正:叢集層的舊版號**不是**過期值

一開始我判定「version-drift 停在舊版號 = 快取過期」,**這是過度解讀**。官方原文:

> "The cluster version displayed represents the **lowest version** among all hosts in that cluster."

4 台裡 3 台仍是 `25370933`,所以叢集層顯示 `25370933` **是正確行為**,不是沒同步。

真正過期的只有 **`mixedVersions` 旗標**:升級後一段時間內仍是 `false`(沒認出混版),
約 2 分鐘後自行變 `true`。⚠️ 但這段期間我同時重啟了 operationsmanager,
**無法斷定是自動同步還是重啟觸發** —— 這是本次測試的一個混淆因子,要誠實標註。

### 對假說的裁決

| 假說 | 結果 |
|---|---|
| **H1** 版號是儲存值、不即時更新 | **部分推翻**:逐台 host 層 24 秒內更新(非儲存值);叢集層取最低版,行為正確 |
| **H2** config-drift `Sync inventory` 不帶版號 | **未測**(逐台層已自動更新,此路徑對本案例已無必要;且該操作有破壞性副作用) |
| **H3** `POST /v1/resources/version-syncs` 在 9.1 存在且可用 | ✅ **成立**:202 + 任務 `Synchronize Inventory Versions` |

### 交付意涵

1. **「Fleet Manager 會不會自己抓到」→ 會,而且逐台版號快到 24 秒內。**
   官方 release notes 的「within 24 hours」是**最壞情況保證**,不是實際延遲。
2. **但要看對地方。** 逐台版號看 `GET /v1/hosts`;叢集層看到的是**最低版**,
   混版時本來就會顯示舊的那個 —— 這常被誤判成「沒同步」。
3. 客戶說「VCF 沒抓到我升的版本」時,先問**他在看哪個畫面**,
   再確認**是不是整個叢集都升完了**。多半不是 bug。
4. `check.lcm.isVersionSyncRequired` 這個 key **9.1 預設不存在**,是要新增的。
5. ⚠️ 重啟 operationsmanager 後**必須等服務完全起來**再打 API,
   否則 nginx 會回 **502 Bad Gateway**(等 15 秒不夠)。

### 📊 10 分鐘連續取樣佐證(09:48:42 → 09:58:37,20 個點)

在 `version-syncs` 任務執行前後持續取樣,結果**完全穩定**:

```
[09:49:45] hosts=9.1.0.0100.25433460  drift=9.1.0.0.25370933|mixed=true|ON_TARGET
[09:51:19] hosts=9.1.0.0100.25433460  drift=9.1.0.0.25370933|mixed=true|ON_TARGET   ← version-syncs 任務已 Successful
[09:58:37] hosts=9.1.0.0100.25433460  drift=9.1.0.0.25370933|mixed=true|ON_TARGET
```

**判讀**:逐台版號穩定為新值;叢集層穩定為最低版(3 台仍舊) + `mixedVersions:true`。
`version-syncs` 任務成功執行後叢集層**也沒有變** —— 這與「取最低版」的定義一致,
反證了「叢集層是過期快取」的猜測。

⚠️ 取樣中有兩段 `hosts=` 空白(09:48:42/49:13、09:52:21/52),
對應 operationsmanager 重啟期間 nginx 回 502 —— **不是版號消失**,是服務短暫不可用。
做這類觀測時要能分辨這兩者。

## 最終結論

### 回答原始問題:「手動升版後,Fleet Manager 會不會自己抓到?」

**會,而且比官方保證的快非常多。**

- 官方 release notes 寫的是「within 24 hours」—— 那是**最壞情況保證**
- 實測:**逐台 host 版號在 24 秒內**就反映到 `GET /v1/hosts` 的 `esxiVersion`
- 完全不需要按任何按鈕、不需要 `Sync inventory`、也不需要呼叫 version-syncs API

### 但有三個會讓人誤判成「沒同步」的陷阱

**1. 叢集層顯示的是「最低版本」**
混版時 `version-drift` 的 ESX `currentVersion` 顯示叢集內最舊的那台。
升 1 台不會讓它變 —— 這是**正確行為**,不是沒同步。要看逐台版號請用 `GET /v1/hosts`。

**2. 沒有 upgrade plan 就永遠 `On Target`**
本 lab 三個獨立佐證:`GET /v1/releases/domains/{id}` 的 `targetVersion` 是空字串、
所有元件 target==current、domain 層 Lifecycle 頁根本沒有 Component Versions tab。
官方原文:no target configured 就拿 current 當 target。

**3. `mixedVersions` 旗標有短暫延遲**
升完後仍為 `false`,約 2 分鐘後才變 `true`。
⚠️ 這段期間本測試同時重啟了 operationsmanager,**無法斷定是自動同步還是重啟觸發**。

### 已驗證可用的手動加速手段

```
POST https://<sddc-manager>/v1/resources/version-syncs
Body: {"resourceType":"SYSTEM"}
→ 202 + task "Synchronize Inventory Versions" → Successful(實測 7.7 秒)
```
此端點**不在 9.1 API reference 索引中**,僅見於 release notes known-issue workaround,
但**實機確認存在且正常運作**。

官方 workaround 提到的 `check.lcm.isVersionSyncRequired=false`:
該 key 在 9.1 **預設不存在**,需自行新增到
`/etc/vmware/vcf/operationsmanager/application.properties`(prod 版是它的 symlink)。
⚠️ 本測試中即使**不設**這個 key,POST 一樣回 202 並成功 —— 它未必是必要條件。
測試後已將此 key 移除還原。

### 未測項目(誠實標註)

- **H2**(config-drift `Sync inventory` 是否帶版號)未執行。逐台版號既然已自動更新,
  此路徑對本案例無必要;且該操作有官方載明的破壞性副作用
  (清除 out-of-band 叢集的 network pool 關聯、重設 Edge node 密碼)。
- **全叢集升版後叢集層版號是否跟著變** 未測(需再升 3 台,每台約 1 小時 vSAN 撤離)。
  依官方「lowest version」定義可合理推論會變,但未實證。
- **24 小時自動同步** 未驗證(逐台層 24 秒內就更新,已無觀察窗口)。

## 證據檔

`E:\9.1\doc-shots\fleet-sync\`
- `S2-hosts-before.json` — 升版前 `GET /v1/hosts`
- `S2-version-drift-before.json` — 升版前 version-drift 全樹
- `domain-id.txt`

---

# 附錄:第二種手動升版路徑 —— vCenter vLCM(2026-08-28)

第一次測試走「掛 ISO 開機升級」。本附錄改走**客戶最常見的違規升級方式**:
在 vCenter 的 vSphere Lifecycle Manager 直接改 cluster image 並 remediate,完全不經 VCF Operations Lifecycle。

## 環境前提

cluster `m01-cl01` (`domain-c9`) 是 **image-managed**:
```
GET /api/esx/settings/clusters/domain-c9/enablement/software  →  {"enabled": true}
desired base_image = 9.1.0.0.25370933 (GA)
Image Name = Management-Domain-ESXi-Personality   ← VCF 建立的 image
```
⚠️ image-managed 的 cluster **不能用 baseline**(舊 VUM 機制),兩者互斥。所以 image 是唯一路徑。

## 🔴 發現 1:VCF 的 offline depot 餵不了 vLCM

vLCM 裡註冊了一個 online depot,描述 `SDDC Manager Unified Depot`:
```
https://vcf-m02-sddcm01.home.lab/vmware/vcf/umds/patch-store/hostupdate/__hostupdate20-consolidated-index__.xml
```
供應鏈是:`外部 depot(10.0.0.61) → fleet01 depot-service → SDDC Manager UMDS → vLCM`。

即使把 HOST 0100 bundle 下載到 SDDC Manager(`downloadStatus=SUCCESSFUL`),
**vLCM depot 同步仍然失敗**:
```
A depot is inaccessible.
URL: 'http://localhost:1080/depot/PROD/COMP/ESX_HOST/addon-main/vmw-depot-index.xml'
Error: 'HTTP Error Code: 404'
```
逐一驗證(HEAD)確認:
| 路徑 | 10.0.0.61 | 10.0.0.48 |
|---|---|---|
| `PROD/COMP/ESX_HOST/` | 200 | 404 |
| `PROD/COMP/ESX_HOST/addon-main/vmw-depot-index.xml` | **404** | **404** |
| `PROD/COMP/VCENTER/addon-main/vmw-depot-index.xml` | **404** | — |

`ESX_HOST/` 底下只有三個 `VMware-VMvisor-Installer-*.iso`。

👉 **VCF 的 offline depot 只承載 ISO/OVA 給 VCF 自己的 LCM 用,不含 vLCM 格式內容。**
   air-gap 環境下客戶想用 vCenter 自行升級 ESXi,**必須自備 offline bundle zip**,VCF depot 幫不上忙。

## 解法:自備 offline bundle + PULL 匯入

使用者提供 `VMware-ESXi-9.1.0.0200.25557999-depot.zip`(705MB,內含 `index.xml` / `vendor-index.xml` / `vib20/`)。
在 jumpbox 起唯讀 HTTP(`tools/serve-e91.mjs`,port 8899),讓 vCenter 以 PULL 抓取
(已驗證 lab 網段連得到 jumpbox:SDDC Manager 測 `10.0.0.200:8899 → 200`)。

## 📌 實測敲定的 API 形狀(文件查不到,只能試)

| 操作 | 正確形式 | 踩過的錯 |
|---|---|---|
| 匯入 offline depot | `POST /api/esx/settings/depots/offline?**vmw-task=true**`<br>body **平鋪** `{"source_type":"PULL","location":"...","description":"..."}` | 包成 `{"spec":{...}}` → **400**;不帶 `vmw-task` → **404** |
| 改 cluster image | `**PUT** /api/esx/settings/clusters/{c}/software/drafts/{d}/software/base-image`<br>`{"version":"..."}` → **204** | `PATCH` 同路徑 → 404;直接 PATCH `/software/base-image` → 404;`PATCH /drafts/{d}` → 404 |
| commit draft | `POST .../software/drafts/{d}?action=commit&vmw-task=true` | — |
| depot 同步 | `POST /api/esx/settings/depots?action=sync&**vmw-task=true**` | 不帶 `vmw-task` → 404 |

## 🔴 發現 2:VCF 沒有鎖住 vCenter 端的 image 編輯

匯入與改 image 全部成功:
```
匯入 offline bundle  → SUCCEEDED,9.1.0.0200.25557999 進入 base image 清單
PUT draft base-image → 204
commit draft         → SUCCEEDED
GET .../software     → base_image.version = 9.1.0.0200.25557999
```
UI 上 `EDIT` / `ASSIGN IMAGE` / `REMEDIATE` 按鈕**全部可用**,沒有被 VCF 停用。

## 🔴 發現 3:vLCM 正確偵測到 drift

改完 image 後,合規狀態由 `UNAVAILABLE` 變為:
```
status = NON_COMPLIANT
host-12 (esx01, GA 25370933)   = NON_COMPLIANT
host-25 (esx02, GA 25370933)   = NON_COMPLIANT
host-26 (esx03, GA 25370933)   = NON_COMPLIANT
host-27 (esx04, 0100 25433460) = NON_COMPLIANT
```
四台全部正確判定為不合規(含先前用 ISO 升到 0100 的 esx04)。

## ⬜ 未完成:remediate 卡在 EULA

```
POST /api/esx/settings/clusters/domain-c9/software?action=apply&vmw-task=true
{"hosts":["host-12"]}
→ 500  "The operation cannot proceed since the VMware End User License Agreement (EULA) has not been accepted."
```
REST API 下找不到 EULA 接受端點(`/api/esx/settings/eula` 等 4 個路徑皆 404),
研判需透過 vSphere Client UI 的 remediation 精靈接受。**此步驟未完成。**

## 交付意涵

1. **技術上,客戶確實可以繞過 VCF 直接用 vCenter vLCM 升 ESXi** —— VCF 不會擋。
2. **但在 air-gap 環境他會先卡在素材**:VCF depot 沒有 vLCM 要的格式,必須自行取得 offline bundle zip。
3. **改了 image 之後 vLCM 會正確標示 NON_COMPLIANT** —— 這個訊號是可信的。

## ⬜ 結果:remediate 被 cluster 健康檢查擋下(nested lab 限制)

先前卡在 EULA,解法是**在 apply 的 body 裡帶 `accept_eula`**(不是獨立端點,
`/api/esx/settings/eula` 等 4 個路徑皆 404):
```
POST /api/esx/settings/clusters/{c}/software?action=apply&vmw-task=true
{"hosts":["host-12"], "accept_eula": true}    → 202
```

但任務隨即失敗:
```
status = FAILED   error = "Health Check for 'm01-cl01' failed"
```

硬體相容性報告:
```json
{ "base_image_version": "9.1.0.0200.25557999",
  "status": "INCOMPATIBLE",
  "summary_result": "The image has 1 compatibility issues. Review them before remediating the cluster." }
```

### 🔴 兩條路徑的關鍵差異

| | ESXi ISO 開機升級 | vCenter vLCM |
|---|---|---|
| 硬體不相容(CPU / 非 HCL 儲存) | 顯示警告,可按 **Force Installation** 硬闖 | **強制擋下,拒絕 remediate** |
| 本 lab 結果 | ✅ esx04 升級成功 | ❌ 卡在 health check |

⚠️ **這是 nested lab 的環境限制,不是 VCF 或 vLCM 的缺陷。**
本 lab 外層是 Xeon E5-2682 v4(ESXi 9.1 不支援)、儲存是虛擬 NVMe(不在 vSAN HCL),
真實客戶環境若硬體在 HCL 上,vLCM 應可正常 remediate。

⚠️ **誠實標註**:任務錯誤只說 "Health Check failed",HCL 報告說 INCOMPATIBLE,
兩者一致但**未取得逐項檢查的明細**,無法 100% 斷定是同一項。
`/api/esx/settings/clusters/{c}/policies/apply` 與全域 policy 都回 `{}`,未找到可關閉 HCL 強制檢查的開關。

### 環境狀態(失敗後已確認無損)
```
esx01/02/03  9.1.0.0.25370933      (GA,未變動)
esx04        9.1.0.0100.25433460   (先前 ISO 升的)
```
另外多送的兩個 apply 任務已成功取消(`"The operation was cancelled by the user."`),
未發生非預期的全叢集 remediate。

### 對客戶的實務結論

1. **想繞過 VCF 用 vCenter vLCM 升 ESXi —— VCF 不會擋你改 image**,但 vLCM 自己的健康檢查會擋。
2. **vLCM 比 ISO 嚴格**:ISO 讓你 Force 硬闖,vLCM 不讓。從維運角度這是好事(避免升到不支援的硬體上)。
3. **air-gap 環境還要先解決素材問題**:VCF depot 沒有 vLCM 要的 offline bundle 格式。

---

# 附錄二:第三種路徑 —— vCenter VAMI 手動修補(2026-08-28)

## 執行

| 項目 | 內容 |
|---|---|
| 方式 | vCenter appliance update REST API(VAMI),繞過 VCF Operations Lifecycle |
| 版本 | `9.1.0.0.25370922` (GA) → **`9.1.0.0200.25573614`** |
| 安全措施 | 升級前建立快照 `pre-vami-0200`(2026-08-28T09:24:30Z) |
| 結果 | ✅ `state=UP_TO_DATE` / `task=SUCCEEDED`,18:24:45 完成 |

### 🔴 9.1 的 vCenter 已移除 `software-packages` CLI
PATH 與 `/usr/lib/applmgmt/support/scripts/` 都找不到。舊文件教的 CLI 修補流程在 9.1 失效,
必須改用 REST:
```
GET  /api/appliance/update                                  # 目前狀態
GET  /api/appliance/update/policy                           # default_URL = "Depot Service"
GET  /api/appliance/update/pending?source_type=LOCAL_AND_ONLINE
POST /api/appliance/update/pending/{version}?action=stage    # 204
GET  /api/appliance/update/staged                           # 看 staging_complete
POST /api/appliance/update/pending/{version}?action=install  # 204,body {"user_data":{}}
```
⚠️ `PUT /api/appliance/update/policy` 帶 `auto_update` 欄位會回 **400**(非法欄位)。
⚠️ stage 完成後 `/api/appliance/update` 的 state 顯示 `UPDATES_PENDING` 而非 `STAGED`;
   要看 `/api/appliance/update/staged` 的 **`staging_complete: true`** 才是真的完成。

### 🔴 VCF 的 Depot Service 直接把 vCenter patch 餵給 VAMI
`update/policy` 的 `default_URL` 就是 **"Depot Service"**(fleet01),
pending 查詢直接列出 `9.1.0.0200`(8564MB,`reboot_required: false`)。

👉 **客戶不需要任何額外素材就能從 VAMI 自行修補 vCenter。**
   對照 ESXi:VCF depot 完全幫不上忙(缺 vLCM 格式),客戶得自備 offline bundle。
   **vCenter 的「自己動手」門檻遠低於 ESXi。**

## 🔴🔴 核心發現:vCenter 版號**不會**自動同步

升級完成 18:24:45。三方對照:

| 時間 | 地面真相 `govc` | `GET /v1/vcenters` | `version-drift` VCENTER |
|---|---|---|---|
| 18:25:15(+30秒) | **25573614** | 25370922 | 25370922 |
| 18:31:29(+7分) | — | 25370922 | 25370922 |
| 18:39:47(+15分) | — | 25370922 | 25370922 |
| 18:40:57(+16分) | **25573614** | **25370922** | **25370922** |

**連續 16 分鐘、31 個取樣點,完全沒有變動。**

### 與 ESXi 完全相反

| 元件 | 升級方式 | Fleet 反映時間 |
|---|---|---|
| **ESXi**(esx04) | 掛 ISO 開機升級 | **24 秒內**(`/v1/hosts` 的 `esxiVersion`) |
| **vCenter** | VAMI REST | **16 分鐘後仍未更新** |

👉 **不同元件類型的版號同步機制根本不同**:
   ESXi host 版號是即時(或近即時)讀取;**vCenter 版號是儲存值,不會自己更新**。
   這證實了研究文件中「vCenter 版號較可能是部署時存下」的推測。

## 🔴 `version-syncs` 回報成功,但沒有修正 vCenter 版號

```
POST /v1/resources/version-syncs   {"resourceType":"SYSTEM"}   → 202
{ "name": "Synchronize Inventory Versions",
  "status": "Successful",
  "creationTimestamp":   "2026-08-28T10:28:39.604Z",
  "completionTimestamp": "2026-08-28T10:28:43.354Z",
  "errors": [] }
```
任務 **3.75 秒完成、狀態 Successful、零錯誤**,
但其後 8 分鐘(16 個取樣點)vCenter 版號**完全沒有變動**。

⚠️ 這是「**靜默無效**」:端點存在、可呼叫、回報成功,但對 vCenter 版號沒有作用。
   對照 ESXi 那次同樣呼叫也沒造成任何變化(但當時叢集層本來就顯示正確的最低版,看不出差別)。
   **兩次呼叫都沒觀察到它實際修正任何版號。**

## ⚠️ 未驗證

- **24 小時自動同步對 vCenter 是否有效** —— 未測(需等一天)。
  官方 release notes 的「within 24 hours」在 ESXi 上無從觀察(24 秒就更新了),
  在 vCenter 上則是**目前唯一還沒被排除的可能補救途徑**。
- 是否有其他方式(重啟特定服務、其他 API)能強制刷新 vCenter 版號 —— 未探索。

## 修正先前的結論

先前僅根據 ESXi 測試得出的「**會自動同步,24 秒內**」是**不完整的**。
正確答案是:

> **看你升的是哪個元件。**
> - **ESXi host**:會,數十秒內反映。
> - **vCenter**:**不會**,至少 16 分鐘內不會,且官方的 `version-syncs` 端點雖回報成功也未修正。

而最諷刺的組合是:**vCenter 是最容易被客戶順手自己升的元件**
(VCF 自己把更新來源設好了),**卻也是版號最不會自動同步的那個**。
這很可能就是客戶回報「VCF 沒抓到我升的版本」的最主要來源。

---

# 附錄三:vLCM 路徑完成 + 三版本並存驗證(2026-08-29)

## 🔴 突破 health check:需要**兩道**獨立關卡都放行

先前 vLCM remediate 卡在 `Health Check for 'm01-cl01' failed`,一直停在 5%。
實測確認這句籠統的錯誤訊息背後其實有**兩個獨立的關卡**,只關一個沒用:

### 關卡一:vLCM 硬體相容性驗證
```
PUT /api/esx/settings/clusters/{cluster}/policies/apply
{"enforce_hcl_validation": false}                    → 204
```
⚠️ **`GET` 這個端點回 `{}` 不代表沒有這個選項** —— 那是「未設定覆寫,套用預設值」,
   而預設值會強制 HCL 驗證。我先前把 `{}` 判讀成「功能不存在」,是錯的。
讀回確認:
```json
{"enforce_hcl_validation": false, "software_policy_spec": {"enforce_hcl_validation": false}}
```
🔴 **只做這一步 remediate 仍然失敗**(同樣 5% FAILED,同樣錯誤訊息)。

### 關卡二:vSAN 健康檢查靜音
先查出真正在紅/黃燈的項目(不要盲目全關):
```
yellow  [com.vmware.vsan.health.test.nvmeonhcl]     NVMe device is VMware certified
yellow  [com.vmware.vsan.health.test.perfsvcstatus] Performance service status
info    [vsanenablesupportinsight]                  vSAN Support Insight   (非問題)
目前已靜音:(無)
```
`nvmeonhcl` 是 nested 虛擬 NVMe 不在 vSAN HCL 上;`perfsvcstatus` 是效能服務未啟用。兩者皆 lab 產物。

```powershell
$hs = Get-VsanView -Id 'VsanVcClusterHealthSystem-vsan-cluster-health-system'
$hs.VsanHealthSetVsanClusterSilentChecks($cluster.MoRef, @('nvmeonhcl','perfsvcstatus'), $null)
```
🔴 **必須用短名稱**。傳完整 ID `com.vmware.vsan.health.test.nvmeonhcl` 會回
   **"General vSAN error"** —— 錯誤訊息完全不提示是格式問題,極易卡死在這。

### 結果
```
08:47–08:59  5%    ← precheck + maintenance mode + vSAN 撤離(約 12 分鐘)
09:00        32%
09:01        95%   ← 主機重開
09:02        esx01 = 25557999
09:04        SUCCEEDED 100%
```
esx01:`9.1.0.0.25370933` → **`9.1.0.0200.25557999`**,vLCM 全程自行處理 maintenance mode。

## 🎯 三版本並存:兩個核心結論的最終驗證

remediate 完成後**數秒內**(09:04:33)檢查:

| 主機 | 地面真相(直接問主機) | `GET /v1/hosts` | 升版方式 |
|---|---|---|---|
| esx01 | `9.1.0.0200.25557999` | `9.1.0.0200.25557999` ✅ | vLCM |
| esx02 | `9.1.0.0.25370933` | `9.1.0.0.25370933` ✅ | 未動 |
| esx03 | `9.1.0.0.25370933` | `9.1.0.0.25370933` ✅ | 未動 |
| esx04 | `9.1.0.0100.25433460` | `9.1.0.0100.25433460` ✅ | ISO 開機升級 |

**叢集層**:
```
ESX current=9.1.0.0.25370933   mixedVersions=true   ON_TARGET
```

### 兩個結論都被證實
1. **逐台版號即時同步** —— 三種不同版本,`GET /v1/hosts` 全部正確,秒級反映
   (比先前測到的 24 秒更快,因為這次一完成就查)。
2. **叢集層取最低版** —— 四台有 0200/GA/0100 三種版本,叢集層顯示 **GA `25370933`**,
   正是最低的那個。**三版本情境排除了「剛好等於某台」的巧合可能**,
   比先前的兩版本情境更有說服力。

至此「叢集層取最低版」有**兩個獨立情境的實測佐證**,不再只是官方文件的說法。

## 環境變更記錄(需要時可還原)
- cluster `domain-c9` desired base image:GA → `9.1.0.0200.25557999`
- cluster apply policy:`enforce_hcl_validation = false`(原本無覆寫)
- vSAN 靜音清單:新增 `nvmeonhcl`、`perfsvcstatus`(原本為空)
- vCenter 快照 `pre-vami-0200`(2026-08-28T09:24:30Z)仍在

---

# 附錄四:UI 佐證與「合規性」風險(2026-08-29)

前面所有驗證都在 API 層。本附錄補上**客戶實際會看的畫面**。

路徑:`VCF Operations → Build → Lifecycle → VCF Instances → vcf-m02 → m01 → Component Versions`

## Domain Management Components(UI 實拍)
| Component | Current Version | Target Version | Status |
|---|---|---|---|
| SDDC Manager | 9.1.0.0.25371088 | 同左 | ✅ On Target |
| VMware NSX | 9.1.0.0.25318225 | 同左 | ✅ On Target |
| **VMware vCenter** | **9.1.0.0200.25573614** | 同左 | ✅ On Target |

## ESX(叢集層)
| Cluster | Current Version | Status |
|---|---|---|
| m01-cl01 | **9.1.0.0.25370933**(最低版) | ✅ On Target |

## Host versions(點進 cluster 後的逐台清單)
| Host | Current Version | Status |
|---|---|---|
| vcf-m02-esx01 | **9.1.0.0200.25557999** | ✅ On Target |
| vcf-m02-esx02 | 9.1.0.0.25370933 | ✅ On Target |
| vcf-m02-esx03 | 9.1.0.0.25370933 | ✅ On Target |
| vcf-m02-esx04 | **9.1.0.0100.25433460** | ✅ On Target |

👉 **UI 完全複製 API 的兩層行為**:叢集層顯示最低版,逐台層顯示各自真實版本。
👉 **客戶看得到混版**(點進 cluster 就有),但每一台都標 On Target,不會覺得需要處理。

## 🔴🔴 最重要的風險:`On Target` 與「符合 BOM」無關

拿 VCF **自己的 BOM**(它認定 release 9.1.0.0 該有的版本)對照實際:

| 元件 | VCF BOM 期待 | 實際 | |
|---|---|---|---|
| SDDC_MANAGER | 9.1.0.0.25371088 | 9.1.0.0.25371088 | ✅ |
| NSX_T_MANAGER | 9.1.0.0.25318225 | 9.1.0.0.25318225 | ✅ |
| **VCENTER** | 9.1.0.0.25370922 | **9.1.0.0200.25573614** | ❌ 偏離 |
| **ESX esx01** | 9.1.0.0.2537093x | **9.1.0.0200.25557999** | ❌ 偏離 |
| ESX esx02/03 | 9.1.0.0.2537093x | 9.1.0.0.25370933 | ✅ |
| **ESX esx04** | 9.1.0.0.2537093x | **9.1.0.0100.25433460** | ❌ 偏離 |

而同時:
```
GET /v1/releases?domainId=<id>  →  9.1.0.0      ← VCF 仍宣稱是這個 release
GET /v1/domains/<id>            →  status ACTIVE
UI                              →  全部 On Target,零警示
```

**五個元件裡三個不符合 VCF 自己的 BOM,VCF 完全沒有標示任何異常。**

### 為什麼 `On Target` 是假象
`On Target` 的定義是 `target == current`。**沒有建立 upgrade plan 時,系統以 current 當 target**,
所以無論你把元件升成什麼樣子,它永遠是 On Target。UI 上的產品說明自己講得很清楚:

> "After you create a domain or component upgrade plan, the selected target versions appear below
>  and versions or configuration drifts are visible per component."

**target 版本要建立 upgrade plan 之後才會出現** —— 這比先前我誤記的「domain 層沒有 Component Versions 分頁」
更準確(該分頁其實存在,是我當時沒導航到)。

## 風險評估

**短期:沒問題。** VCF 運作正常、Fleet 版號同步正確、domain ACTIVE、無告警。

**長期:有,而且是「安靜的」。**
1. **後續 VCF 升級** —— upgrade bundle 是 from→to 綁定,pre-check 以 BOM 為基準,不符可能被擋或失敗。
   ⚠️ **本環境無法實證**:depot 只有 9.1.0.0 一個 release,沒有更新版可測。
   `/v1/releases/domains/{id}/future` 回空陣列是因為**目錄裡沒有更新版本**,
   **不能當作「升級路徑被此次手動升級擋住」的證據**。這是推論,不是實測。
2. **混版叢集** —— 0200/GA/GA/0100 是 VCF 不會產生的狀態;vSAN on-disk format、DRS/EVC、
   VM hardware 相容性都是潛在問題。
3. **支援** —— 此元件組合不在任何官方 BOM 中。

## 給客戶的一句話

> **「Fleet Manager 抓得到版號」和「這個環境是合規的」是兩件完全不同的事。**
> VCF 會忠實反映你手動升成什麼樣子,但它不會告訴你那個組合它根本不認識。

---

# 附錄五:三天後複查 + 兩項更正(2026-08-31)

## 1) VCF 不會自己 sync 回 BOM —— 三天實測

esx04 升級於 08-28 09:44、vCenter 於 08-28 18:24。三天後(08-31)複查:

```
esx01    9.1.0.0200.25557999    ← 未變
esx02    9.1.0.0.25370933
esx03    9.1.0.0.25370933
esx04    9.1.0.0100.25433460    ← 未變
vCenter  9.1.0.0200.25573614    ← 未變
GUI:Domain ACTIVE / Version 9.1.0.0 / 全部 On Target
```

任務紀錄中**沒有任何 VCF 自己發起的修正/回復動作**。

👉 **版號同步是單向讀取**:把實際狀態讀進 inventory,**絕不會反過來把 BOM 版本推回元件**。
   而且無 upgrade plan 時 `target == current`,VCF 認定「現況就是你要的」,根本沒有「該修正」的概念。
   要回到 BOM 只能**主動發起**:建 upgrade plan 走 VCF 升級,或手動降版。

## 2) 附帶發現:`UMDS_SYNC` 每天固定失敗
GUI Tasks 顯示 `Downloading Esx metadata, vibs and vendor add-ons` 於
08-27、08-28、08-29、08-30 **每天 Failed**。
對應先前的發現:VCF depot 缺 vLCM 格式內容(`PROD/COMP/ESX_HOST/addon-main/vmw-depot-index.xml`)。
👉 客戶的 offline depot 若同樣缺這塊,**每天都會看到這個失敗任務且不明所以**。

## 🔴 更正一:`productTypes` 在 9.1 **是支援的**

先前結論錯誤 ——
> ~~「KB 324050 的 VCF 5.2 寫法在 9.1 只有逐 domain 可用,productTypes 會失敗」~~

真正原因是**我自己併發呼叫造成的鎖競爭**:兩次呼叫時間戳為
`13:44:36.373` 與 `13:44:36.812`,相隔 0.4 秒,第二個卡在 `Acquire lock`。

API 的 `errors` 回**空陣列**,什麼都沒說;**GUI Tasks 的 subtask 欄位才顯示 `Acquire lock` 失敗**
(並附 `RESTART TASK` 按鈕)。

單獨重測確認可用:
```
POST /v1/resources/version-syncs
{"resourceType":"DOMAIN","resourceId":"<id>","productTypes":["VCENTER"]}   → 202 → Successful
```

### 完整 subtask 拆解(GUI 才看得到)
```
Acquire lock
Prepare Inventory Version Synchronization Data
Synchronize Inventory Versions
Refresh LCM Inventory Cache      ← 證實 LCM 層確實有快取
Release lock
```
`Refresh LCM Inventory Cache` 呼應了 vCenter 版號需數小時才收斂的現象。

### 📌 方法論教訓
**API 的 `errors` 回空陣列時,去看 GUI 的 subtask。**
本次若未查 GUI,會把一個錯誤結論交付出去。
同理:**不要併發呼叫 version-syncs**,它有全域鎖。

## 🔴 更正二:domain 層**有** Component Versions 分頁

先前寫「domain 層 Lifecycle 頁根本沒有 Component Versions 分頁」並當成佐證 —— **錯誤**,
該分頁存在,當時只是沒導航到(截圖的樹狀選單未展開)。

正確且更強的佐證是產品自己的說明文字:
> "After you create a domain or component upgrade plan, the selected target versions appear below
>  and versions or configuration drifts are visible per component."

**target 版本要建立 upgrade plan 後才會出現** —— 這才是「無 plan ⇒ 永遠 On Target」的直接依據。

---

# 附錄六:觸發 Fleet 向 depot 同步(2026-08-31)

## 操作
`VCF Operations → Build → Lifecycle → VCF Management` 右上角 `Sync` 連結。

## 結果:同步成功,但沒有新 release
```
Last lifecycle metadata sync time:  N/A  →  8/31/26, 3:45 PM     ← 同步機制正常
9.1.x releases                   :  9.1.0.0(唯一)                ← 完全沒變
future(可升級目標)               :  (空)
總 release 數                    :  18(含 4.4.1.0 等舊版)
```

⚠️ 此 `Sync` 屬於 **VCF Operations / fleet 層**,**不會在 SDDC Manager 產生任務**
   (監控 10 分鐘,SDDC Manager 任務清單毫無變化)。

## 🔴 關鍵區別:depot 有「元件」,但沒有更新的「release」

depot(10.0.0.61)上實際存在的安裝檔:
```
ESX     9.1.0.0.25370933 / 9.1.0.0100.25433460 / 9.1.0.0200.25557999
VCENTER 9.1.0.0.25370922 / 0100.25417926 / 0200.25573614 / 0300.25629530
```
**素材齊全,但 VCF 一個升級目標都不提供。**

原因:**VCF 的升級單位是 release(一整組認證過的 BOM),不是個別元件 build。**
depot 裡有 0100/0200/0300 的元件檔,卻沒有任何「包含這些版本的 VCF release manifest」,
VCF 因此無從組出升級路徑。

## 澄清先前的誠實標註

附錄四曾標註:「`future` 回空陣列**可能**是因為目錄裡沒有更新版本,不能當作升級路徑被擋的證據」。

**本次確認就是這個原因** —— 與我們手動升過什麼**完全無關**。

👉 因此「**BOM 偏離會不會擋住後續 VCF 升級**」在本 lab **仍然無法驗證**。
   要驗證需先有一個真正的新 VCF release(例如 9.1.1)進入 depot。
   此點維持原判:**推論,非實測**。

## 🔴 對客戶最重要的意義:這是「手動升版」的根本成因

> VCF 只提供 **release 級**的升級。若客戶需要某個元件的特定 patch
> (例如 vCenter 的安全修補),而 Broadcom 尚未發布包含該 patch 的 VCF release,
> **VCF 不會給他任何升級路徑** —— 他只能自己動手。

這說明客戶手動升版**往往不是操作習慣問題,而是被迫的**:
- 資安要求特定 CVE 修補,但 VCF release 還沒跟上
- VCF 的 depot 甚至已經有那個元件的安裝檔(如本 lab 的 0300 vCenter ISO)
- 但 VCF 就是不讓你用

而一旦他自己動手,就會掉進本文件記錄的所有坑:
BOM 偏離、On Target 假象、vLCM 雙重 health check、depot 缺 vLCM 格式內容等。
