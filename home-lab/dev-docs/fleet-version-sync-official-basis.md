# VCF 9.1 Fleet Inventory 版號同步 — 官方文件依據

## 1. 直接回答

**有條件的 Yes。** VCF 9.1 確實能把手動 (out-of-band) 升級後的真實版號同步回 fleet inventory，但**不是靠 VCF Operations UI 上那個 `Sync inventory` 按鈕**——版號同步與組態漂移同步是**兩套獨立機制**。官方 9.1 techdocs 對 `Sync inventory` 列出的同步範圍（hosts/clusters、VDS 與 port groups、network pools、NSX Manager nodes、Edge clusters、credentials/certificates）**完全不包含 vCenter/ESX/NSX 產品版號**，其中唯一出現的 "version" 是 VDS 的 switch property。真正負責版號的是「inventory version synchronization」，官方 VCF 9.1.0.0 release notes 明文寫著 out-of-band 情境下「The automatic version synchronization process resolves the discrepancy within 24 hours.」，並給出手動加速路徑 `POST /v1/resources/version-syncs`。三個必須挑明的但書：(a) 版號是**儲存值不是即時讀取**，同步前 UI 會持續顯示舊版號；(b) `/v1/resources/version-syncs` 雖被 9.1 release notes 逐字引用，卻**不在 9.1 SDDC Manager API operation index 中**，屬「真實但文件不足」；(c) 即使版號同步成功，若該 domain 沒有建立 upgrade plan，Component Versions tab 會因為「無 target 即以 current 當 target」而永遠顯示 **On Target**，看不出任何 drift。至於「Broadcom 是否支援手動升級」——官方**從未**用「unsupported」字眼直接否定，最強的官方措辭只是間接的（見第 5 節）。

---

## 2. 官方依據

僅列通過查證的主張。備註欄標示 `⚠未二次查證` 者代表來源與錨點正確、但本次未再獨立抓頁複驗。

| 主張 | 來源 (URL) | 官方? | 備註 |
|---|---|---|---|
| 9.1 `Sync inventory` 的同步範圍不含產品版號；唯一的 "version" 是 VDS switch property：「Switch properties, including name, maximum transmission unit (MTU), version, network I/O control (NIOC) settings...」 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/building-your-private-cloud-infrastructure/working-with-workload-domains/manage-workload-domain-configuration-drift-between-vcenter-server-and-sddc-manager.html | ✅ | 本次逐字複驗。頁面標題為 **Remediate VCF Domain Configuration Drift**（URL slug 是舊的 5.2/9.0 名稱） |
| 9.1 UI 路徑逐字：「On the VCF Operations top navigation bar, click **Operate**.」→「In the left pane, select **Inventory Detailed View**.」→「Expand **VCF Instances**」→「from the **Actions** drop-down menu, select **Sync inventory**.」 | 同上 | ✅ | 9.0 版同頁標題為 "Manage VCF Domain Configuration Drift"，且把前兩步壓成一句 |
| Sync inventory 有破壞性副作用：「After the synchronization workflow, imported clusters and clusters that are created out-of-band lose their existing network pool configurations.」「During the sync process, the Edge node credential passwords will be reset.」 | 同上 | ✅ | 本次複驗。**lab 執行前必須先 snapshot** |
| 範圍不可挑選：「All vSphere clusters in the existing vCenter are in scope for the sync operation. You cannot select a subset of clusters.」且需逐 domain 重跑 | 同上 | ✅ | 本次複驗 |
| VCF 9.1 known issue：「SDDC Manager's inventory and lifecycle management cache may not reflect the updated NSX-T dataplane version」；「The automatic version synchronization process resolves the discrepancy within 24 hours.」 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/release-notes/vmware-cloud-foundation-9-1-0-0-release-notes/known-issues/vcf-installer-91-known-issues.html | ✅ | 本次逐字複驗。**這是「版號是儲存值、非即時讀取」最強的 9.1 一手證據** |
| 同一 known issue 給出手動加速步驟：在 `/etc/vmware/vcf/operationsmanager/application-prod.properties` 將 `check.lcm.isVersionSyncRequired` 設為 `false` → `POST /v1/resources/version-syncs` (`resourceType: SYSTEM`) → 等約 5 分鐘 → 可選 `POST /lcm/inventory/refresh` → 以 `GET /v1/bundles/domains/{domain-id}` 檢查 `nsx_t_dataplane` | 同上 | ✅ | 本次逐字複驗。這是 `/v1/resources/version-syncs` **唯一的 9.1 官方出處** |
| 版號顯示位置：VCF Operations > **Build > Lifecycle** > 選 VCF domain > **Component Versions** tab，顯示 current version / target version / status | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/lifecycle-management/using-the-depot-configuration-tab.html | ✅ | 頁面真實標題是 "Lifecycle Management of VCF Components"，slug 為過期遺留 |
| 狀態只有兩種：「**On Target** - The current component version matches the target version.」/「**Version Drift** - The current component version differs from the target version.」 | 同上 | ✅ | 9.1 用 "Version Drift"，不是 "compliance" |
| 🔴「Target versions are defined when you create a domain or component upgrade plan. **When no target version is configured, the current version is used as the target**, and the status displays as On Target.」 | 同上 | ✅ | **全新安裝 fleet 的關鍵陷阱** — 沒有 upgrade plan 就不可能出現 Version Drift |
| 追蹤元件為 SDDC Manager、vCenter、NSX Manager、ESX clusters and hosts、Standalone ESX hosts、HCX；混版叢集會出現 warning 且「The displayed cluster version represents the minimum version across all hosts」 | 同上 | ✅ | VCF Operations / VCF Automation / Identity Broker 不在此清單，另由 fleet lifecycle 管 |
| KB 444718「Steps for VCF Operations 9.1.x」：「In the left navigation pane, navigate to **Operate > Inventory**」→ 展開 VCF Instance → 選 domain →「Click **Actions** and select **Sync Inventory**」→ 確認 **SYNC INVENTORY** | https://knowledge.broadcom.com/external/article/444718/how-to-trigger-an-inventory-sync-in-vcf.html | ✅ | 與 techdocs 差在 KB 省略了 "Detailed View"。KB 內無任何 API |
| KB 425835（Applies to: VCF 9.x）：Sync Inventory「polls the vCenter Server for the latest configuration data and updates the SDDC Manager database」 | https://knowledge.broadcom.com/external/article/425835/synchronizing-vcenter-manual-changes-wit.html | ✅ | 證明是 pull 模型；SDDC Manager 仍為 system of record ⚠未二次查證 |
| `POST /v1/domains/{domainId}/synchronizations`（operation "Synchronization"）：「Perform synchronization of SDDC Manager state with any changes performed out-of-band in the vSphere environment」；body = BrownfieldSyncSpec，回 202 + BrownfieldTask | https://developer.broadcom.com/xapis/sddc-manager-api/latest/v1/domains/domainId/synchronizations/post/ | ✅ | 版本選單為 9.1(Latest)/9.0。**無官方文件宣稱 UI 按鈕就是呼叫這支** |
| `GET /v1/version-drift`（"Get Component Version Drift"）回傳 componentType / componentId / currentVersion / targetVersion / componentVersionStatus / mixedVersions / subComponents，直接 200 inline，不產生 task | https://developer.broadcom.com/xapis/sddc-manager-api/latest/v1/version-drift/get/ | ✅ | 本次複驗（9.1 Latest）。**驗證版號最乾淨的唯讀端點** |
| `GET /v1/hosts` 回 `esxiVersion`、`softwareInfo.baseImage.version`、`status`(ASSIGNED/UNASSIGNED_USEABLE/UNASSIGNED_UNUSEABLE)；`GET /v1/hosts/{id}/software` 回 baseImage/addOn/components 等 applied software spec | https://developer.broadcom.com/xapis/sddc-manager-api/latest/v1/hosts/get/ | ✅ | 兩者皆唯讀。build number 內嵌於 version 字串，無獨立 build 欄位 |
| VCF 9.1 架構變更：「the standalone VCF Operations Fleet Management Appliance no longer exists and is replaced by fleet lifecycle」 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/release-notes/vmware-cloud-foundation-9-1-0-0-release-notes/what-s-new/whats-new-vcf-ops.html | ✅ | 所以 9.1 沒有獨立 Fleet Management appliance release notes 可查 ⚠未二次查證 |
| KB 430731：已被納管的 vCenter 無法重新 import，「Only 'sync' operation is allowed on already imported vCenters in SDDC Manager.」 | https://knowledge.broadcom.com/external/article/430731/brownfield-import-of-vcenter-in-vcf-9x-f.html | ✅ | 排除「重新 import 以刷新版號」這條路 |

---

## 3. 版號從哪來

**結論：儲存值 (stored)，不是即時讀取 (live-read)。**

1. **持久化位置** — 版號實體存在 SDDC Manager 的 PostgreSQL `platform` DB。KB 406280 給出 `select id, hostname, version from host;`（⚠未二次查證），KB 314168 的補救手法是直接 `PATCH localhost/inventory/entities/<host-id>` 再重啟 LCM 服務——這兩者只有在版號是 DB 欄位時才成立。**注意 KB 314168 的 Environment 是 VCF 4.x/5.x，其 `/usr/pgsql/13/` 與 `/opt/vmware/vcf/operationsmanager/` 路徑在 9.1 上未經證實，不可直接套用。**

2. **9.1 一手佐證** — 9.1 release notes 用的字是 "inventory and lifecycle management **cache**"，並說自動同步「resolves the discrepancy within 24 hours」。若為即時讀取，不會有 cache、不會有 24 小時、也不需要 version-sync。

3. **資料怎麼刷新** — KB 425835（VCF 9.x）說 Sync Inventory「polls the vCenter Server」，即 SDDC Manager 主動向 vCenter 拉。版號同步的失敗訊息（KB 439995「Cannot connect to vCenter ... to complete inventory sync.」、KB 388727「Unable to fetch standalone ESX credentials via /v1/system/credentials API」）也顯示 version sync 會實際連線到 vCenter 並取用 host 憑證去讀 host。⚠未二次查證

4. **兩層要分開看** — 本次研究發現一個**未解決的官方矛盾**：KB 433307 稱「VCF Operations reports the version based on the active state of the NSX Manager」（暗示 Operations 監控層是即時讀），而 SDDC Manager / fleet lifecycle inventory 明確是儲存值。**不要對外宣稱整個 stack 都是即時讀或都是儲存值。** ⚠未二次查證

5. **顯示層** — Component Versions tab (Build > Lifecycle) 讀的是 inventory 的 current version，並拿它和 target version 比。target 不是元件固有屬性，是建立 upgrade plan 時才寫入的；沒有 plan 就 current=target，永遠 On Target。

---

## 4. 可觸發的 sync/refresh 動作

### UI

| 動作 | 路徑 | 效果 | 狀態 |
|---|---|---|---|
| Sync inventory（組態漂移） | VCF Operations > **Operate** > 左窗格 **Inventory Detailed View** > 展開 **VCF Instances** > 選 instance > 選 domain > **Actions** > **Sync inventory** > 對話框確認 | 同步 hosts/clusters、VDS/port groups、network pools、NSX nodes、Edge clusters、credentials/certs。**文件範圍不含產品版號** | ✅ **已確認**（9.1 techdocs 逐字） |
| 同上（KB 簡寫版） | **Operate > Inventory** > VCF Instance > domain > **Actions** > **Sync Inventory** > **SYNC INVENTORY** | 同上 | ✅ **已確認**（KB 444718「Steps for VCF Operations 9.1.x」） |
| 檢視版號 | VCF Operations > **Build** > **Lifecycle** > 選 domain > **Component Versions** tab | 顯示 current/target/status | ✅ **已確認** |
| 觸發版號重新讀取的專屬 UI 按鈕 | — | — | ❌ **不存在**：9.1 文件中沒有任何「refresh this component's version」的 UI 動作 |

### API

| 呼叫 | 用途 | 狀態 |
|---|---|---|
| `POST /v1/resources/version-syncs`，body `{"resourceType":"SYSTEM"}` | **強制版號同步**（本題核心） | ⚠️ **部分確認**：在 VCF 9.1.0.0 release notes known-issue workaround 中逐字出現 → 9.1 可用性有官方依據；但**不在 9.1 SDDC Manager API operation index**（該 index 的 `/v1/resources` 下只有 licensing-infos 與 license-checks）。9.1 執行前務必先設 `check.lcm.isVersionSyncRequired=false` |
| `POST /v1/resources/version-syncs`，body `{"resourceType":"DOMAIN","resourceId":"<uuid>"}`；及 `productTypes:["VCENTER","ESXI","NSX","VXRAIL"]` 篩選 | 逐 domain / 逐產品類型同步 | ❌ **未確認於 9.1**：僅見於 KB 324050，其 Applies-to 為 **VMware Cloud Foundation 5.2**。9.1 release notes 只示範 `SYSTEM` |
| `POST /lcm/inventory/refresh` | 觸發 LCM inventory 刷新 | ⚠️ **部分確認**：出現在 9.1 release notes workaround 的「Optionally」步驟，但無 API reference 文件、無 body/回應定義 |
| `GET /v1/version-drift?componentType=&componentId=` | 讀取 current/target/status 版號樹（含 subComponents） | ✅ **已確認**（9.1 API ref，唯讀，200 inline） |
| `GET /v1/hosts` / `GET /v1/hosts/{id}/software` / `GET /v1/vcenters` / `GET /v1/system/appliance-info` | 讀各元件 inventory 版號字串 | ✅ **已確認**（皆 9.1，皆唯讀，build 內嵌於 version） |
| `GET /v1/bundles/domains/{domain-id}` | 驗證 bundle 適用性是否已反映新版號 | ✅ **已確認**（9.1 release notes 指定的驗證步驟） |
| `POST /v1/domains/{domainId}/synchronizations`（BrownfieldSyncSpec → 202 BrownfieldTask） | 組態漂移 brownfield sync 的 API | ✅ **端點已確認**存在於 9.1；❌ **未確認**它就是 UI「Sync inventory」按鈕實際呼叫的那支 |
| `POST /fleet-lcm/v1/sddc-lcms/{sddcLcmId}/refresh`、`POST /fleet-lcm/v1/components/{componentId}`(action=refresh) | Fleet LCM 層的 refresh | ❌ **未確認**：本次未獨立複驗；且 `/fleet-lcm` 的 base host（VCF Operations FQDN vs SDDC Manager FQDN）在官方文件中未定義 |

**一句話總結第 4 節**：組態同步在 9.1 有完整官方 UI + API；**版號同步在 9.1 只有一個 release-notes 級別的 API 出處，沒有任何 UI 入口，也沒有進 API reference**。這正是本 lab 最值得實測的缺口。

---

## 5. 手動升版的官方立場

**沒有任何官方文件寫「unsupported」。** 這點必須誠實傳達給客戶，不能把強烈暗示包裝成官方判決。

已查到的官方措辭，由強到弱：

- **最直接的後果陳述**（Async Patch Tool 文件）：「The SDDC Manager inventory can get out of sync if you upgrade any of these components outside of VMware Cloud Foundation.」— 講的是**後果**，不是禁止。⚠未二次查證
  https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vvs/1-0/vcf-async-patch-tool-options.html
- **9.1 升級路徑最強否定**（KB 440630，VCF/VVF 9.1，NSX 在場情境）：「There is no option to upgrade independent components.」⚠未二次查證
  https://knowledge.broadcom.com/external/article/440630/upgrade-sequence-and-related-issues-for.html
- **官方認可的例外**：VCF 9.1 明文承認匯入 out-of-band 變更是正當操作 —「If you make out-of-band changes from vCenter or NSX Manager, you can use VCF Operations to update SDDC Manager」，而且理由是「If the SDDC Manager and vCenter inventories are not synchronized, some workflows may be blocked. You can use this procedure to unblock these tasks.」→ 官方**支援補救**，但那是修復程序，不是對 out-of-band 作業模式的背書。
- **官方認可的另一例外**：儲存軟體/驅動的更新被明列為 SDDC Manager LCM 範圍外的手動作業。⚠未二次查證

**已記錄的補救路徑（依 9.1 適用性排序）：**

1. **等** — 9.1 release notes：24 小時內自動版號同步會自行收斂。（5.2 KB 324050 說是每日 0300 local server time，**9.1 未重述此排程，不可引用為 9.1 事實**。）
2. **強制版號同步** — `check.lcm.isVersionSyncRequired=false` + `POST /v1/resources/version-syncs {"resourceType":"SYSTEM"}` + 等 5 分鐘 + `GET /v1/bundles/domains/{id}` 驗證。（9.1 release notes）
3. **組態漂移補救** — VCF Operations `Sync inventory`（修 topology/config，不修版號）。
4. **DB 層手術** — KB 314168 / KB 439995 的 psql + 內部 PATCH + 服務重啟。**兩者皆 4.x/5.x 範圍，9.1 未驗證，且 KB 439995 明文要求「Take an offline SDDC Manager snapshot before proceeding」。屬於「先開 case」等級，不應寫進客戶 SOP。**

**實務衝擊（為什麼這不只是美觀問題）**：inventory 版號落後會讓 upgrade precheck 失敗、bundle 適用性算錯，進而卡住後續 VCF 管理的升級（KB 324050「Upgrade Precheck for out-of-band upgrade fails」⚠未二次查證）。9.1 也有已知的顯示面缺陷：management domain 升級未完成時，workload domain 會誤顯示 AVAILABLE 而非 UP TO DATE，Broadcom 說實際升級作業不受影響。⚠未二次查證

---

## 6. 尚未查到 (gaps)

- **NOT FOUND**：任何 9.1 techdocs 頁面重述「每日 03:00 版號同步排程」。0300 只出現在 KB 324050（Applies to: VCF **5.2**）；9.1 只說 "within 24 hours"。**不要對客戶宣稱 9.1 是 03:00。**
- **NOT FOUND**：`POST /v1/resources/version-syncs` 不在 developer.broadcom.com 的 9.1 SDDC Manager API operation index 中（`/v1/resources` 下只有 licensing-infos、license-checks）；它連 5.2.4 的 API reference 也沒有。屬 KB/release-notes 專屬端點，未經 lab 實測不可寫進交付腳本。
- **NOT FOUND**：`productTypes` 篩選（VCENTER/ESXI/NSX/VXRAIL）與 `resourceType: DOMAIN` 在 9.1 的有效性。9.1 release notes 只示範 `SYSTEM`。
- **NOT FOUND**：任何官方句子明講「config-drift Sync inventory **不會**更新產品版號」。此結論是從「9.1 已列舉範圍不含版號」+「另有獨立 version-sync 機制」**推論**而來，不是引述。
- **NOT FOUND**：官方說明 UI 的 `Sync inventory` 按鈕實際呼叫哪支 API。最接近的兩個候選是 `POST /v1/domains/{domainId}/synchronizations` 與 `POST /fleet-lcm/v1/sddc-lcms/{id}/refresh`，無文件裁決。
- **NOT FOUND**：每種元件的版號**如何被讀取**（ESX build 是從 vCenter host object 還是直連 host？NSX 是走 NSX API？）。KB 425835 只說 "polls the vCenter Server"。
- **NOT FOUND**：VCF Operations 9.1 / VCF Automation 9.1 自身的版號是否由同一個 version-sync 更新。它們既不在 Component Versions tab 的元件清單，也不在 version-syncs 的 productTypes enum。
- **UNRESOLVED CONFLICT**：KB 433307 稱 VCF Operations 依 NSX Manager 的 active state 報版號（暗示即時），與 SDDC Manager 的儲存式 inventory 矛盾，無任何文件調和兩層。
- **NOT FOUND**：任何強制單一元件重新讀取版號的 API（"refresh this component's version now"）。
- **NOT FOUND**：手動 off-BOM 升級後的 VCF instance 是否仍享有後續升級支援 / support entitlement 的官方聲明。
- **PARTIAL**：KB 443484（fleet lifecycle inventory 記錄過舊導致 precheck 失敗）的實際 workaround 內容是封閉的，Broadcom 要求開 case，修正排定於 VCF Operations 9.1 EP2。⚠未二次查證
- **注意**：`GET /v1/system` **不會**回傳 VCF 版號（只有 id、maxAllowedDomainsInSubscription、vcfInstanceName）。若測試腳本以它取版號會得到空結果。

---

## 7. 建議的 lab 驗證步驟（nested VCF 9.1 / M02）

**測試假說 H1**：fleet inventory 版號為儲存值，手動升級後不會自動即時更新。
**測試假說 H2**：config-drift `Sync inventory` 不會修正產品版號。
**測試假說 H3**：`POST /v1/resources/version-syncs` 在 9.1 上真實存在且能修正版號。

**受測元件建議**：單一 ESX host（out-of-band 打 patch）。理由：`GET /v1/hosts` 的 `esxiVersion` 可直接查、`vmware -v` 可取得地面真相、爆炸半徑最小。vCenter VAMI 升級為次選，nested 環境成本過高。

> ⚠️ **執行前必辦**：(1) 對 M02 的 SDDC Manager、vCenter、NSX Manager 及受測 host 建 snapshot；(2) 記憶體提到 M02 目前 backing VCD (10.0.0.65)，而 `Sync inventory` 已知會**清掉 out-of-band 建立叢集的 network pool 關聯並重設 Edge node 密碼**——步驟 5 前務必確認可回復；(3) 全程用同一把 API token（`POST /v1/tokens`，1 小時效期）。

### Step 0 — 建立基準線

1. `GET /v1/version-drift?componentType=DOMAIN&componentId=<domainId>`、`GET /v1/hosts`、`GET /v1/releases/domains` 全部存檔成 JSON。
2. 開啟 VCF Operations > **Build > Lifecycle** > 選 M02 domain > **Component Versions** tab。
3. **確認是否已有 target version**。若 `GET /v1/releases/domains` 顯示無 target，記錄下來——這代表全部元件會顯示 On Target，測試需靠原始版號字串比對，不能靠 status 欄位判讀。

> **S1** — Component Versions tab 全畫面：必須看到受測 host 所屬 cluster 的 current version、target version、status 三欄，以及畫面左上的 Build > Lifecycle 導覽與 domain 名稱。
> **S2** — API 基準線：`GET /v1/hosts` 回應中受測 host 的 `esxiVersion` 與 `softwareInfo.baseImage.version`，並帶上請求 URL。

### Step 1 — 取得地面真相（升級前）

4. SSH 到受測 ESX host，執行 `vmware -v`。

> **S3** — terminal 畫面：host FQDN 提示字元 + `vmware -v` 的升級前 build 字串。

### Step 2 — 執行 out-of-band 升級

5. host 進 maintenance mode → 用 esxcli 對本地 depot 打 patch（或直接在 vCenter 內做 vLCM image remediation，**不經 VCF Operations**）→ reboot → 退出 maintenance mode。
6. 再次 `vmware -v` 確認新 build。

> **S4** — terminal：同一台 host 的 `vmware -v` 顯示**新** build（與 S3 明顯不同）。此為整份測試的地面真相。

### Step 3 — 驗證 H1（未同步前是否即時反映）

7. **立即**（不做任何 sync）重跑 `GET /v1/hosts` 與 `GET /v1/version-drift`，並重新整理 Component Versions tab。
8. 記錄本步驟的時間戳，以便日後對照 24 小時自動同步窗口。

> **S5** — API 回應：`esxiVersion` **仍為舊 build**（與 S2 相同）。若已更新為新 build，H1 被推翻，直接記為重大發現。
> **S6** — Component Versions tab：cluster version 仍為舊值。搭配 S4 並排即證明「儲存值、非即時讀取」。

### Step 4 — 驗證 H2（config-drift sync 是否帶版號）

9. VCF Operations > **Operate** > 左窗格 **Inventory Detailed View** > 展開 **VCF Instances** > 選 instance > 選 M02 domain > **Actions** > **Sync inventory**。
10. 對話框中**不要**勾選 "Enable Edge cluster sync and import NSX Edge node VMs"（除非要一併測 Edge 密碼重設副作用）。確認送出。
11. 等待 task 完成。

> **S7** — Sync Inventory 確認對話框：完整顯示 domain 名稱與所有可勾選項目（記錄 9.1 實際的 checkbox 文字與按鈕字樣，用以裁決 KB 444718 的 "Submit" vs "SYNC INVENTORY" 措辭矛盾）。
> **S8** — task 完成畫面：task 名稱 + Successful 狀態 + 時間戳。
> **S9** — sync 完成後的 Component Versions tab 與 `GET /v1/hosts` 回應。**若版號仍為舊值 → H2 成立**（與官方範圍表一致）；**若版號已更新 → H2 被推翻**，這會是本次研究最有價值的反證，因為官方文件的範圍列表並未涵蓋版號。

### Step 5 — 驗證 H3（強制版號同步）

12. SSH 到 SDDC Manager，檢視 `/etc/vmware/vcf/operationsmanager/application-prod.properties` 中的 `check.lcm.isVersionSyncRequired`，設為 `false`。**先備份原檔並記錄原值。**
13. `POST /v1/resources/version-syncs`，body `{"resourceType":"SYSTEM"}`，帶 Bearer token。
14. 記錄 HTTP 狀態碼與完整回應。

> **S10** — API 請求與回應全文：包含 URL、body、HTTP status。**這是整份測試的核心證據**——若回 404/405，即證明該端點在 9.1 已移除，那本身就是必須回報的結論；若回 2xx，則證明它在 9.1 仍存活。
> **S11** — `check.lcm.isVersionSyncRequired` 修改前後的檔案內容（含備份路徑）。

### Step 6 — 驗證結果

15. 等約 5 分鐘，重跑 `GET /v1/version-drift` 與 `GET /v1/hosts`，重新整理 Component Versions tab。
16. 執行 `GET /v1/bundles/domains/{domainId}` 檢查 bundle 適用性是否已依新版號重算。

> **S12** — Component Versions tab 顯示**新** build，與 S4 的 `vmware -v` 一致。這是「Fleet Manager 能把真實版號同步回 inventory」的決定性證據。
> **S13** — `GET /v1/version-drift` 回應中受測元件的 `currentVersion` 與 `componentVersionStatus`。

### Step 7 — 若 Step 5 失敗的備援路徑

17. 若 `/v1/resources/version-syncs` 回 404：**不要**改用 KB 314168 的 psql/PATCH 手法（4.x/5.x 範圍，9.1 schema 未驗證）。改為單純等待，並於 T+6h、T+12h、T+24h 各查一次。

> **S14** — T+24h 的 Component Versions tab 與 API 回應，畫面須含可辨識的時間戳。用以驗證 9.1 release notes 的「resolves the discrepancy within 24 hours」。

### Step 8 — 驗證 target-version 陷阱（選作，但強烈建議）

18. 對 M02 建立一個 component upgrade plan 以寫入 target version（**只到 Submit Plan / 設定 target 為止，不要按 Run Prechecks 或 Upgrade**）。
19. 回 Component Versions tab 觀察 status 是否由 On Target 轉為 **Version Drift**。

> **S15** — 設定 target 後的 Component Versions tab：同一元件顯示 current ≠ target 且 status = **Version Drift**。這證明「全新安裝 fleet 因無 upgrade plan 而永遠顯示 On Target」，是給客戶最重要的一張圖。

### 判讀矩陣

| S5/S6 | S9 | S12 | 結論 |
|---|---|---|---|
| 舊 | 舊 | 新 | **預期結果**：版號為儲存值；config sync 不帶版號；version-syncs 有效 → 第 1 節答案成立 |
| 舊 | **新** | — | config-drift sync 在 9.1 實際上**有**帶版號，超出官方文件範圍表 → 需回報並更新文件解讀 |
| **新** | — | — | 版號為即時讀取，H1 推翻 → 第 3 節須全面改寫 |
| 舊 | 舊 | 舊（S14 才變） | version-syncs 在 9.1 失效/移除，只能靠 24h 自動收斂 → 交付文件須明列「無立即補救手段」 |
| 舊 | 舊 | 舊（S14 仍舊） | 自動同步亦未生效 → 屬缺陷，開 Broadcom case |

**回收步驟**：測試結束後把 `check.lcm.isVersionSyncRequired` 還原為原值，並確認 network pool 關聯與 Edge node 憑證（若 Step 4 勾了 Edge 選項）已從 VCF credential store 取回或還原 snapshot。
