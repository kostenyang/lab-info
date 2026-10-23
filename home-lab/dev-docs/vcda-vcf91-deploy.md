# VCDA 4.7.6 接 VCF 9.1 互通性測試 — ✅ 打通(2026-09-01)

> 前例:VCD 10.6.2 接 M02(dev-docs/vcd-t04-deploy.md)。

## 結論
**VMware Cloud Director Availability 4.7.6 可以在 VCF 9.1(vCenter 9.1)+ VCD 10.6.2 上完整配置成功。**
Provider portal 系統健康狀態四項全綠:Cloud Service / VMware Cloud Director / Lookup Service / Replicator Service。
VCDA 4.7.6 公開 interop 只到 vSphere 8.0 / VCD 10.6 → 本組合 off-matrix,但實測可用。
(唯一提示訊息:需要 Usage Meter 4.6+,計量用,與功能無關。)

## 成果
| 項目 | 值 |
|---|---|
| VM / FQDN / IP | `vcda01` / `vcda01.home.lab` / **10.0.0.69**/23 gw 10.0.0.1(DNS A+PTR 已建) |
| 媒體 | `E:\vcd+vcda\VMware-Cloud-Director-Availability-Provider-4.7.6.7462116-449912a_OVF10.ova` |
| 角色 | Cloud Director **Combined** Appliance(`guestinfo.cis.appliance.role=combined`, deployment=provider) |
| 放置 | 外層 vC 10.0.0.101 → host 10.0.0.95 / ds vmfs-wdblue4t / net MGMT / folder VCF |
| **root 密碼** | 🔴 **`<redacted>`**(OVF 給的 `VMware1!VMware1!` 首次登入被強制改掉) |
| NTP | 10.0.1.254 |
| Site | `lab-cloud` |
| Lookup Service | `https://vcf-m02-vc01.home.lab/lookupservice/sdk`(vCenter **9.1**) |
| VCD | `https://vcd-t04-01.home.lab/api`(administrator@system) |
| Replicator | `https://10.0.0.69:8043`(owner `*`, apiVersion 4.7) |
| Tunnel | `https://10.0.0.69:8047` |
| 可見 inventory | Org `tenant01` / Org VDC `tenant01-vdc` (READY) |
| 部署腳本 | `E:\9.1\deploy-vcda.sh` |
| API 工具 | `.work/c.sh`(cloud 443)、`.work/r.sh`(replicator 8043)、`.work/v.sh`+`vcda.sh`(manager 8441) |
| 截圖 | `E:\9.1\doc-shots\vcda\`(20-provider-portal.png = 全綠儀表板) |

## 埠 / 服務對應(combined appliance 實測)
| 埠 | 服務 | serviceType |
|---|---|---|
| **443** | Cloud service(VCD 用,provider portal `/ui/admin`) | CLOUD |
| 8441 / 8044 | Manager service(vCenter-to-vCenter DR,無 VCD) | MANAGER |
| 8043 | Replicator | REPLICATOR |
| 8047 | Tunnel | — |

## 🔴 坑(全部實測確認)

### 1. VCD 位址**必須寫成 `https://<vcd>/api`(有 /api、無尾斜線)**
這是本次最大的坑。UI 欄位叫「VMware Cloud Director 位址」,直覺會填 `https://vcd.home.lab`,結果:
- 填 `https://vcd-t04-01.home.lab`(無斜線)→ `DnsResolutionError: vcd-t04-01.home.labcloudapi`
  (VCDA 是**字串相接**不是 URL resolve)
- 填 `https://vcd-t04-01.home.lab/`(有尾斜線)→ cloudapi 登入成功,但接著打 **`GET /session`**(少了 `/api`)
  → VCD 回 404 **HTML** → VCDA 的 JAXB 解析器炸掉,API 只回
  `GeneralServerFailure: Operation aborted due to an unexpected error.`
  真因要到 VCD 的 `logs/YYYY_MM_DD.request.log` 才看得到:`"GET /session HTTP/1.1" 404`
- 填 `https://vcd-t04-01.home.lab/api` → ✅ 成功,並自動把 VCDA 的 extension + UI plugin 註冊進 VCD
- 填 `https://vcd-t04-01.home.lab/api/`(有尾斜線)→ `InvalidCredentials`(誤導性錯誤)

### 2. root 密碼一部署就「已到期」,而且只能用 UI 改
`/config/root-password-expired` 回 `secondsUntilExpiration: -1756652463`(上次變更時間 = epoch 0)。
不改 → UI 被 modal 擋死。`POST /config/root-password` 試過 8 種 body 全部 `BadRequest`,**只能走 UI**。

### 3. UI 改密碼對話框:自動化填值永遠「密碼不相符」
Angular 跨欄驗證只在**被改動的那一欄**重跑。解法 = 三欄填完後,**再對 new/confirm 各補派一次
`input` + `blur` 事件**。工具:`E:\9.1\tools\cdp-flow.mjs`(本次新寫,步驟串
fill/type/click/clickText/eval/shot/wait,走 CDP 9222)。

### 4. Cloud service 未授權連站台名稱都設不了
`ServiceNotLicensed`。Manager service(8441)反而不擋。license 用 `POST /license {"key":"..."}`。
⚠ VCDA 的 license 驗證會把 `O`/`0` 正規化 —— 兩種寫法都收。

### 5. Replicator 要先自己設好 Lookup Service,才能註冊到 Cloud
順序不能反:
1. `POST https://<rep>:8043/config/lookup-service {"url","thumbprint"}`
2. `POST https://<cloud>/replicators {"apiUrl","apiThumbprint","rootPassword","description","ssoUser","ssoPassword"}`
   —— `ssoUser`/`ssoPassword` 是**平的**,不是 `details` 物件(錯誤訊息寫 `details.ssoUser` 會誤導)。
   跳過第 1 步 → 回 `ServiceNotConfigured`(講的是 replicator 不是 cloud,也很誤導)。

### 6. Tunnel 註冊要的是**憑證 PEM 本體**,不是 thumbprint
`POST /config/tunnels {"url","certificate":"<PEM>","rootPassword"}`。給 thumbprint 一律 `BadRequest`。

### 7. 其他
- `check-lookup-service` body 是 `{"url","thumbprint"}`(不是 lsUrl);thumbprint 給 SHA-256 大寫冒號格式,
  服務自己補 `SHA-256:` 前綴。
- API 錯誤會夾**上百行 Java stacktrace**,一律 `jq del(.stacktrace)` 過濾,否則洗版。
- 443 與 8441 兩個服務欄位名不同:cloud 用 `localSite`/`localSiteDescription`,manager 用 `site`。
- **vCenter 9.1 的 Lookup Service 還在**(`/lookupservice/sdk`),`GET /config/lookup-service/sso-vcs`
  正確回 `version: 9.1`。
- vCenter SSO 密碼是 `VMware1!VMware1!`(不是 `<redacted>`)。
- `/diagnostics/health` 回 `ApiVersionNotSupported`(Accept 版本協商問題),健康狀態改看 UI 儀表板。
- OVA `ssh.enabled=True` 有效,root 可 SSH(改完密碼後);log 在 `/opt/vmware/h4/{cloud,replicator,tunnel,manager}/log/`。

## 待辦
- [ ] 實際跑一次複寫/遷移(需要來源站台:on-prem appliance 或第二個雲端站台)
- [ ] `tenant01-vdc` 目前 0 VM,要放 VM 才測得到 cloud-to-cloud / on-prem-to-cloud

---

# 第二階段:On-Premises 站台 + 真實遷移測試(2026-09-01)

## 成果
| 項目 | 值 |
|---|---|
| On-Prem appliance | `vcda-onprem01` / **10.0.0.73**(外層 vC,host 10.0.0.95,MGMT,DNS A+PTR 已建) |
| serviceType | `ONPREM_REPLICATOR`;root 密碼同樣被強制改成 `<redacted>` |
| 站台 | `onprem-lab`,**已與 `tenant01@lab-cloud` 配對** |
| 配對端點 | `https://10.0.0.69:8048`(cloud tunnel 公用端點) |
| 認證方式 | VCD 本機使用者(已棄用選項);API token 走不通(見坑 #9) |
| 新建 VCD 帳號 | **`t01admin@tenant01`** / `VMware1!VMware1!`(Organization Administrator) |
| on-prem 健康 | Lookup Service / vSphere 外掛程式 / Cloud Service / Manager Service **四項全綠** |
| 測試 VM | `vcda-testvm01`(外層 vC,1vCPU/512MB/2GB thin,**vmx-17**,已移除網卡) |

**VCDA on-prem 成功列出外層 vCenter 的 55 台 VM**,目的地也正確解析到 `tenant01-vdc` +
`vSAN Default Storage Policy` —— 整條控制路徑通。

## 🔴 遷移最後一步失敗:根因是 VCD 的後端已成孤兒(與 VCDA 無關)

依序踩到三個錯誤,逐一排除後定位到最終根因:

1. **`不支援其虛擬硬體版本 (21)`** —— 用 vCenter 9.1/ESXi 8.0.3 預設建的 VM 是 vmx-21,
   `tenant01-vdc` 吃不下。→ 重建測試 VM 為 `-version 7.0`(vmx-17)解決。
2. **`vCenter Server "m02-vc" is not connected`** —— VCD 對 M02 vCenter 的 listener 是 DISCONNECTED,
   VCD debug log 是 `PKIX path building failed`。**vCenter 憑證在 2026-08-27 換過**
   (notBefore Aug 27 2026),VCD 信任庫裡的 `m02-vc-cert` 是 08-14 的舊憑證。
   → 把新憑證加進 `/cloudapi/1.0.0/ssl/trustedCertificates`(alias `m02-vc-cert-20260827`)
   → `POST {vimServer}/action/forcevimserverreconnect`(注意:**不是** `/action/reconnect`,
   要從 vimServer 的 `rel="reconnect"` Link 取路徑)→ 約 2 分鐘後 `listenerState=CONNECTED`。
3. **`Network NONE not found when creating placement requirements`** —— 來源 VM 網卡沒有目的地對應。
   → 移除測試 VM 網卡後這個錯誤消失。
4. **最終:`java.lang.NullPointerException`**
   `at com.vmware.vcloud.fabric.storage.storedVm.impl.CreateFromConfigActivity$CreateStoredVmInVcPhase.invoke(CreateFromConfigActivity.java:218)`

   從 debug log 追到 VCD 要把 placeholder VM 建在
   `moref://.../ResourcePool#resgroup-1515`,而 **`resgroup-1515` 在現在的 M02 vCenter 不存在**
   (`govc object.collect resgroup-1515` → not found;整個 M02 只剩 `resgroup-10`)。

   **根因:VCF 9.1 在 2026-08-23/27 整套重建過,vCenter 是全新執行個體
   (instanceUuid 現在是 `e15f7064-…`,VCD 裡記的還是 `6e04f33c-…`),
   Org VDC 當初建立的資源集區被整個清掉了。VCD 的 PVDC / Org VDC 已成孤兒。**

   ⚠ 注意 `datastore-15` / `resgroup-10` 這兩個 MoRef 剛好在新舊 vCenter 都存在(全新 vCenter 會重新
   從小號發配),所以**光看 PVDC 的 MoRef 會誤判成正常** —— 要比對 instanceUuid 和 Org VDC 自己的
   資源集區(resgroup-1515)才看得出來。

## 結論
- **VCDA 4.7.6 對 VCF 9.1 的相容性,到目前為止沒有踩到任何阻礙。**卡住的是 VCD 側的舊狀態。
- 要完成真實遷移,得把 VCD 後端重建:刪 Org VDC + PVDC → 重建(PVDC 建立當下就要 NSX-T backed、
  network pool 要先建,見 `dev-docs/vcd-t04-deploy.md`)→ 重建 Edge Gateway / Org VDC Network。

## 第二階段新增的坑
8. **On-prem 的 `/config/lookup-service` 要帶 `ssoAdminCredentials`,而且是
   `{"ssoUser":…,"ssoPassword":…}`**(不是 username/password;空物件會回「ssoAdminCredentials null」誤導)。
9. **VCD API token 建不出來**:`POST /cloudapi/1.0.0/tokens` 回 `This operation is denied.`
   → 配對只能選「VCD 本機使用者(已棄用)」。
10. **配對精靈的欄位是分步渲染**:同一組 id 在每一步會被清空重畫,必須**每一步各填一次**,
    一次填完再按下一步會失效。
11. **Clarity 的「完成」按鈕吃 `el.click()` 會沒反應**,要用真的滑鼠事件
    (`Input.dispatchMouseEvent`)。已加成 `cdp-flow.mjs` 的 `realClickText` 步驟。
12. **來源 VM 清單有分頁**,別只跳到最後一頁找(我一開始就這樣誤判成「VM 不在清單裡」)。

---

# 第三階段:VCD 後端重建 + 端到端遷移成功(2026-09-01)

## ✅ 最終結果:遷移端到端成功
| 驗證點 | 值 |
|---|---|
| VCDA | `overallHealth=GREEN`,`recoveryInfo.recoveryState=COMPLETE`,vApp `cf81170d-…` |
| 初次同步 | `h4replica-5e58edfe-…` seq=1,transferBytes=0(2GB thin 空碟),1 秒 |
| VCD | vApp/VM `vcda-testvm01` **POWERED_ON** @ `tenant01-vdc`,hardwareVersion 17 |
| VCF 9.1 vCenter | `/m01-dc01/vm/vcd-t04/tenant01 (…)/tenant01-vdc (75291ab4-…)/vcda-testvm01 (cf81170d-…)` |
| 來源端 | 外層 vCenter 的 `vcda-testvm01` 已自動關機(符合 migration 流程) |

## 真因:VCD 記的 vCenter instanceUuid 是重建前的
```
VCD vimServer.uuid          = 6e04f33c-341f-4753-a325-c4ecaf4f799b  (舊)
實際 M02 vCenter instanceUuid = e15f7064-efb9-47db-8aa7-272e0acdbd6b
VCDA 透過 LS 看到的           = e15f7064-…
→ VCDA 啟動複寫時 FailedToAcquireVcConnection: Unable to connect to vCenter '6e04f33c-…'
```
**VCD 不會在 reconnect / PUT 更新 / action/refresh 時更新已註冊的 uuid**(三種都實測無效),
只能解除註冊後重新註冊 → 連帶整個 PVDC/Org VDC 都要重建。

## 重建順序(相依鏈,實測可行)
1. `DELETE /cloudapi/1.0.0/orgVdcNetworks/{id}?force=true`
2. `DELETE /cloudapi/1.0.0/edgeGateways/{id}?force=true`
3. Org VDC:`POST …/action/disable` → `DELETE …?recursive=true&force=true`
4. PVDC:`POST …/action/disable` → `DELETE`
5. `DELETE /api/admin/extension/networkPool/{id}`
6. vimServer:`PUT`(IsEnabled=false)→ **`POST …/action/unregister`**(rel="unregister" 停用後才出現;DELETE 一律 405)
7. `POST /api/admin/extension/action/registervimserver`
8. **`POST …/action/refreshStorageProfiles`**(不做這步,建 PVDC 會說 storage policy not available)
9. `POST /cloudapi/1.0.0/networkPools`
10. `POST /api/admin/extension/providervdcsparams`
11. `POST /api/admin/org/{orgId}/vdcsparams`

## 第三階段新增的坑
13. **vCenter 與 NSX 憑證在 8/27 都換過** → VCD 兩邊都 `PKIX path building failed`。
    加信任:`POST /cloudapi/1.0.0/ssl/trustedCertificates {"alias","certificate"}`。
    ⚠ **NSX 的憑證鏈要拆成 leaf 與 CA 分兩次送**,整條鏈會被擋(`Single certificate required`)。
14. **重新連線動作叫 `forcevimserverreconnect`**,不是 `/action/reconnect`(回 404);
    正確路徑要從 vimServer 的 `rel="reconnect"` 連結取。約 2 分鐘才轉 CONNECTED。
15. 🔑 **孤兒 NSX 物件的解法**:Org VDC 網路因 segment 已隨 NSX 重建消失而刪不掉(force 也沒用)。
    **在新 NSX 上用「VCD 錯誤訊息裡的那個 segment id」建一個佔位 segment**,VCD 立刻刪得掉:
    `PATCH /policy/api/v1/infra/segments/<id>` + transport_zone_path + subnets。
16. **network pool 的 transport zone 要給 NSX policy path 不是 UUID**
    (`/infra/sites/default/enforcement-points/default/transport-zones/<id>`);
    正確的 overlay TZ 是 **`overlay-tz-mgmt-nsxt`**(有 host),不是 `nsx-overlay-transportzone`。
17. **重建後儲存區原則名稱變了**:新環境有 `m01-cl01 vSAN Storage Policy`,
    但 refreshStorageProfiles 之後 `vSAN Default Storage Policy` 也會出現(VCD 自帶),兩者都可用。
18. **VM 的 `Network NONE not found`**:來源 VM 網卡在目的地沒有對應網路 → 測試時移除網卡即可;
    正式環境要先建 Org VDC 網路並設定網路對應。
19. `POST /vm-replications/{id}/sync` 可手動觸發同步;`/migrate`、`/failover` 的 payload 猜不出來,
    遷移建議走 UI(所有動作 → 移轉,四步:認證 → 設定 → 即將完成 → 完成)。

## 交付文件
`E:\9.1\VCDA476-on-VCF91-Interop-Report.docx`(675KB,7 章 + 8 張截圖)
產生器:`E:\9.1\tools\docx-build\gen-vcda-vcf91-doc.js`(⚠ ImageRun 要帶 `type:'png'`,
否則圖片副檔名變 `.undefined`、Word 開不出圖)

## 殘留
- 測試 VM `vcda-testvm01` 現在活在 VCD `tenant01-vdc` 上(可直接刪 vApp);外層那台已關機。
- NSX 上留了佔位 segment `vcda-cleanup-placeholder`(id 0d23b05c-…),可刪。
- VCD 信任庫多了 3 張憑證(m02-vc-cert-20260827、m02-nsx-nsx-leaf/ca-20260901),應保留。

---

# 第四階段:DR 完整生命週期測試(2026-09-01 晚)

## ✅ 全數通過
| 項目 | 證據 |
|---|---|
| Org VDC 網路 | `tenant01-net01` ISOLATED 192.168.100.0/24,REALIZED |
| 真實工作負載 | `vcda-testvm02` = Photon OS 5.0(vmx-15,1vCPU/2GB/16GB thin,含網卡,Tools OK) |
| 保護 + RPO | RPO 30 分;初次同步 **transferBytes 862,330,880(≈822MB)**;`currentRpoViolation=0`;`rpo-violations` 0 筆 |
| 測試容錯移轉 | `recoveryState=TEST`,VCD 出現 POWERED_ON 測試副本,來源持續運行 |
| 測試清理 | `recoveryState=NOT_STARTED`,VCD 測試副本移除 |
| 容錯移轉 | `recoveryState=COMPLETE`,VCD POWERED_ON;⚠**來源 VM 仍開機**(與移轉不同) |
| 反向複寫 | `isReversed=true`,`lab-cloud → onprem-lab`,GREEN,seq1 傳 6,512,640 bytes(以原 VM 為 seed) |

## 第四階段新增的坑
20. 🔑 **VCDA 租戶原則(Policy)是「功能看似壞掉」的最大來源**。`GET /policies` 的 default:
    `allowIncomingProtections=false`(擋保護)、`allowOutgoingProtections=false`(擋反向),
    但 `allowIncomingMigrations=true` → **所以只能遷移不能保護**。
    症狀:保護精靈裡目的地 VDC 有紅色驚嘆號、單選鈕 disabled(移轉精靈卻正常)。
    改法:**只能走 UI**(Provider Portal → 組態 → 原則 → 編輯);`PUT /policies/default` 任何 body 都回 BadRequest。
21. `minRpo=15` 會限制 RPO 可選刻度 → 只能選 30 分鐘以上。
22. **Org VDC 網路建立欄位是 `ownerRef` 不是 `orgVdc`**(用 orgVdc 會被明確拒絕)。
23. **UI「測試清理」的「清理」鈕點了沒反應**(log 查無工作)→ 改用
    **`DELETE /vm-replications/{id}/failover-test`** 成功。
24. **反向複寫有三道閘門**(依序排除):
    a. 從雲端發 `POST /vm-replications/{id}/reverse` → `DisallowedCloudOperationsException`
       (配對時「允許從雲端存取」= 否)→ **必須從 on-prem Portal 發起**;
    b. on-prem「放置到此站台上新復原的虛擬機器」= 未設定 → **反向鈕 disabled**;
       設定精靈:VM 資料夾 → 計算資源 → 預設網路 → 資料存放區;
    c. 對話框報「目的地原則不允許設定傳出保護」→ 要開 **`allowOutgoingProtections`**
       (`allowOutgoingOnpremProtections=true` 不夠)。
25. **容錯移轉不會關來源 VM**(移轉會)。演練/正式切換要注意。
26. replication 動作端點:`sync` / `pause` / `resume` / `migrate` / `failover` /
    `failover-test`(POST 執行、**DELETE 清理**)/ `reverse` / `rpo-violations` / `instances` /
    `network-settings` / `storage-profile`。

## 交付文件 v2.0
`E:\9.1\VCDA476-on-VCF91-Interop-Report.docx`(1.18MB,8 章 + 14 張圖,測試矩陣 20 項全通過)

## 目前殘留物
- VCD `tenant01-vdc` 上有兩台 VM:`vcda-testvm01`(移轉來的)、`vcda-testvm02`(容錯移轉來的,反向複寫中)
- 外層 vCenter:`vcda-testvm01` 已關機;`vcda-testvm02` 已被反向複寫刪除
- Default Policy 已改為允許傳入/傳出保護(測試需要,正式環境要依租戶規劃)
- on-prem 本機放置已設定(預設網路是 Avi Internal,非 MGMT)
- NSX 佔位 segment `vcda-cleanup-placeholder`、Org VDC 網路 `tenant01-net01` 可視需要清除

---

# 補充:原廠內部支援訊息(2026-09-01,使用者提供)

1. **VCDA 4.7.6 已支援 VCD 10.6.2 與 VCF 9.1.1** → 先前寫的「off-matrix」框架作廢,
   本測試改定位為「支援組合的實地功能驗證」。文件 v2.1 已更新。
2. 🔴 **Fleet to Fleet 不是 Protection and Recovery 的支援架構。**
   本次拓樸(內部部署 vCenter 站台 ←→ VCD 承載的雲端站台)不屬於 fleet-to-fleet,不受此限制;
   但客戶若要做「兩座 VCF Fleet 互相保護」,設計階段就要排除。

## 版本更正
測試當天 **vCenter 由 9.1.0.0200(build 25573614)升級到 9.1.1(build 25712839)**(使用者確認)。
- 部署 / VCD 註冊 / 複寫 / 遷移(文件第 3~5 章)= 9.1.0.0200
- 保護、RPO、測試容錯移轉、容錯移轉、反向複寫(第 6 章)= 9.1.1
- NSX 仍為 9.1.0.0.25318225
⚠ 之後查 `govc about` 要看 `fullName`/`apiVersion`,`.about.version` 曾回舊值造成誤判。

## RPO 合規性可視範圍(新增第 6.7 節)
| 介面 | RPO 合規性報告 |
|---|---|
| Provider Portal | ✅ 報告 → RPO 合規性報告(日期區間/依組織/僅顯示違規/HTML+TSV 匯出) |
| VCD 租戶入口 Availability 外掛 | ❌ 無報告頁(只有每筆複寫的 RPO + 健全狀況 + 事件和通知) |
| On-Prem Appliance Portal | ❌ 同上 |

API:`GET /reports/rpo-compliance?startTime=&endTime=`(orgReports[].{cloud,onPrem}DestinationReports[].rpoViolationPeriods)、
`GET /vm-replications/{id}/rpo-violations`。
⚠ 報告的組織群組標題「具有總計 N 項違規的 0 個虛擬機器」的 N 與底層違規資料對不上,判讀以明細列/API 為準。

---

# 第五階段:VCDA 4.7.5 → 4.7.6 升級測試(2026-09-08)

## 測試方式
不動現有 4.7.6 環境,另部一台 **4.7.5 On-Premises appliance** 做完整升級驗證:
`vcda-onprem75` = **10.0.0.74**(DNS A+PTR 已建;root 密碼同樣被強制改成 `<redacted>`)。

## 升級前基準
| 項目 | 值 |
|---|---|
| 版本 | `4.7.5.5473665-1187b41`(建置日 2026/4/3) |
| instanceId | `6239365e-ff51-47e3-a94e-11719609007b` |
| Lookup Service | `https://10.0.0.101/lookupservice/sdk`(外層 vCenter 8.0.3) |
| 站台 | `onprem75-lab`,**已與 tenant01@lab-cloud 配對**(4.7.6 cloud) |
| 複寫 | `vcda-testvm03`(Photon OS,vmx-15)保護,RPO 30 分,GREEN,instance #6,實傳 862,298,112 bytes |

✅ **順帶驗證 N-1 相容:4.7.5 on-prem 可以正常配對到 4.7.6 cloud**,四項健康全綠。
✅ 同一個租戶 org 底下可同時掛多個 on-prem 站台(onprem-lab 與 onprem75-lab 並存)。

## 升級步驟(實測可行)
1. `govc datastore.upload` 把 4.7.6 ISO 傳到 datastore → `device.cdrom.insert` + `device.connect`
2. **在 guest 內先 `mount -o ro /dev/sr0 /mnt/cdrom`**(見坑 27)
3. UI:關於 → 檢查更新 → 精靈 5 步(存放庫 → 可用的更新 → 版本說明 → EULA → 準備好進行更新)
   - 存放庫選 **「使用 CDROM 更新」**
   - 最後一步要勾兩個確認框才會啟用「完成」
4. 升級 + 重開機,實測 **約 1~2 分鐘就回來**

## 升級後驗證(全部通過)
| 驗證點 | 結果 |
|---|---|
| 版本 | `4.7.6.7462116-449912a`(建置日 2026/6/18) |
| instanceId | 不變 `6239365e-…` |
| Lookup Service / thumbprint | 保留 |
| 站台名稱 / 配對 | `onprem75-lab` ↔ `tenant01@lab-cloud` 保留 |
| 複寫 | GREEN,RPO 30 保留,instance 由 #6 → #7(升級後自動續跑) |
| 升級後手動同步 | ✅ instance #8,差異 **49,152 bytes / 3 秒** |
| 系統健康 | 四項全綠(需先處理坑 29) |

## 第五階段新增的坑
27. 🔴 **掛好 ISO 但 guest 沒掛載 /mnt/cdrom,精靈會說「沒有可用的更新」**
    錯誤訊息:`無法從 file:///mnt/cdrom/update/rel-manifest.json 下載版本資訊清單`。
    ISO 內容其實是對的(`/update/rel-manifest.json` 存在)。
    **解法:先 SSH 進 appliance 跑 `mkdir -p /mnt/cdrom && mount -o ro /dev/sr0 /mnt/cdrom`**,再重跑精靈就看得到 4.7.6。
28. 精靈最後一步的兩個確認勾選框,**點 input 無效要點 label**(Clarity 老問題);
    其中一個標籤還是未翻譯的字串鍵 `upgrade.confirm.snapshot`(顯示 bug)。
29. 🔴 **升級後 vSphere Client 外掛程式狀態 = 已過時(OUTDATED)**。
    精靈提示說「重新套用 Lookup Service 位址」,但**實測重新 POST /config/lookup-service 沒有修好**;
    要另外呼叫 **`POST /config/vsphere-ui`** 才會變成 `{"status":"OK"}`、儀表板轉綠。
30. `govc device.cdrom.eject` 會失敗(`msg.disk.onlineConnectFail`),改用 `device.disconnect` 即可。

## 殘留
- `vcda-onprem75`(10.0.0.74)升級後保留運行中,含快照 **`pre-upgrade-475`**(確認不需要回滾就可刪)
- 測試 VM `vcda-testvm03`(Photon)與其複寫仍在跑
- datastore 上留有 `[vmfs-wdblue4t] iso/vcda-4.7.6.iso`

---

# 第六階段:Provider(Cloud)端 4.7.5 → 4.7.6 升級測試(2026-09-08)

> 使用者指示:清掉 VCD 的 VCDA extension → 接上 4.7.5 Provider → 再升級。
> ⚠ 代價:原 `lab-cloud` 站台與其三個複寫(testvm01/02/03)一併作廢,vcda01 成為孤兒。

## 清除 VCD 上的 VCDA 註冊
`DELETE /config/vcloud` **不支援**(MethodNotAllowed),要直接在 VCD 端刪:
```
# 1) UI plugin(本 lab 共三個,含一個 4.7.2 的舊殘留)
POST   /cloudapi/extensions/ui/{urn}/tenants/unpublish   # 回 400 可忽略
DELETE /cloudapi/extensions/ui/{urn}                     # 204
    61338537…  Availability (lab-cloud)      v4.7.6
    82cf4128…  Setup DRaaS and Migration     v4.7.6
    f6a2abd1…  VMware Cloud Director Availability v4.7.2   ← 舊殘留
# 2) API extension service(用 query 找 id)
GET    /api/query?type=adminService&format=records   -> name/namespace = VCDA
DELETE /api/admin/extension/service/{id}                 # 204
```
清完 `adminService` 查詢回 `[]`,新的 provider 才接得上 VCD。

## 4.7.5 Provider 建置
`vcda75` = **10.0.0.75**(combined,站台 `lab-cloud75`,root 密碼 `<redacted>`)。
license → site → LS → VCD(`https://vcd-t04-01.home.lab/api`)→ replicator(先設 8043 的 LS)→ tunnel,全部成功。

## 升級(改走 API,UI 走不通)
🔴 **Provider 版 UI 的最後確認勾選框抓不到**(on-prem 版可以),改用 API:
```
GET  /upgrade                       # 觸發 getAvailableUpdates,回一個 task id
GET  /tasks/{id}                    # result.minor.branch = "4.7"
POST /upgrade {"toBranch":"4.7"}    # 啟動升級
```
🔴 **`POST /upgrade {}` 會失敗**;從 Java 例外可知 `UpgradeRequest` **只有一個欄位 `toBranch`**
(`Unrecognized field "repositoryType" … one known property: "toBranch"`)。
升級含重啟約 **2 分鐘**。

## 升級後驗證
| 項目 | 結果 |
|---|---|
| 版本 | 4.7.5.5473665-1187b41 → **4.7.6.7462116-449912a** |
| instanceId | 不變 `5cfa879f-…` |
| 站台名稱/說明 | `lab-cloud75` 保留 |
| Lookup Service / VCD URL / 帳號 | 保留 |
| License | 保留 |
| Tunnel | 保留(`47d411ac-…`) |
| isConfigured | true |
| VCD 的 VCDA extension | 已重新建立 |

## 第六階段新增的坑
31. 🔴 **升級後 VCD 上的 UI plugin 仍停在舊版(v4.7.5)**,而且
    `GET /config/vcloud/plugin` 會誤報 `{"status":"OK"}`(不像 vSphere 外掛會誠實回 OUTDATED)。
    **解法:`POST /config/vcloud/plugin`** → 兩個 plugin 立刻變 v4.7.6
    (`Availability (lab-cloud75)`、`Setup DRaaS and Migration`)。
32. Provider 版 UI 更新精靈最後一步的勾選框以自動化點不到(on-prem 版可以),建議 provider 端直接走 API。
33. ⚠ **未解**:升級後 Provider Portal 的 **Lookup Service 顯示「離線」**,
    但 `GET /config/lookup-service/sso-vcs` 正常回 vCenter 9.1、LS 端點也可達(405),
    重新 `POST /config/lookup-service` 無效。其餘三項(Cloud Service / VCD / Replicator)皆正常。
    待查是健康快取或需重啟服務。

## 目前殘留
- `vcda75` 10.0.0.75 = 現行雲端站台 `lab-cloud75`(4.7.6),無任何複寫
- `vcda01` 10.0.0.69 = **孤兒**(VCD extension 已被移除),原 lab-cloud 站台失效
- `vcda-onprem01`(.73)與 `vcda-onprem75`(.74)仍指向已失效的 lab-cloud,需重新配對才能再測複寫
- 快照:`vcda75/pre-upgrade-475-provider`、`vcda-onprem75/pre-upgrade-475`

---

# 第六階段補充:用 UI 重跑 Provider 升級(2026-09-08)+ 兩項更正

還原 `vcda75` 的快照 `pre-upgrade-475-provider` 回到 4.7.5(組態完整保留),改用 **UI** 再升一次。
⚠ 還原快照會把 ISO 掛載一起還原掉(快照是在掛 ISO 之前建的),要重新 insert+connect+guest mount。

## ✅ UI 升級成功
版本 4.7.5 → **4.7.6.7462116-449912a**(buildDate 2026/6/18),instanceId 不變,
站台 `lab-cloud75`、LS、VCD URL/帳號、License、Tunnel、`isConfigured=true` 全保留。
本次回復速度比 API 那次更快(約 30 秒內服務就回來)。

## 🔴 更正坑 32:Provider 的更新精靈是 **6 步**,不是 5 步
| | on-prem | provider |
|---|---|---|
| 步驟 | 存放庫 → 可用的更新 → 版本說明 → EULA → 準備好進行更新(5) | 存放庫 → 可用的更新 → 版本說明 → **相容性檢查** → EULA → 準備好進行更新(6) |

先前判定「provider 版勾選框點不到、只能走 API」是**錯的** —— 真正原因是我少按一次「下一步」,
停在 EULA 頁(該頁沒有勾選框)。多按一步到第 6 頁後,兩個勾選框座標正常
(label 在 x=601 / y=224 與 264),點 label 即可勾選,「完成」隨即啟用。**UI 路徑完全可用。**

## 🔴 更正坑 33:Lookup Service「離線」不是升級造成的
真因:**Manager service(8441)的 `lsUrl` 是 null**。
```
vcda75  :8441/config -> {"site":"lab-cloud75","lsUrl":null}        <-- 離線
vcda01  :8441/config -> {"site":"lab-cloud","lsUrl":"https://…"}   <-- 線上
```
Provider Portal 的「Lookup Service」健康磚讀的是 **Manager service** 那一份設定,
而我這次是純用 443 的 Cloud service API 建置,從沒設過 8441 的 LS(走 UI 初始設定精靈則兩邊都會設)。
補上之後立刻轉「線上」,四項全綠:
```
POST https://<appliance>:8441/config/lookup-service {"url":…,"thumbprint":…}
```
排除順序更新:重啟 `cloud.service` 無效、重套 443 的 LS 也無效,要看 **8441** 那一份。

## 對第 31 坑的補充
本次 UI 升級後 VCD plugin 直接就是 4.7.6,**但那是因為前一次 API 升級後我已手動
`POST /config/vcloud/plugin` 更新過,而還原快照只還原 appliance、不還原 VCD**。
因此「升級後 plugin 停在舊版」這點在本輪無法重現驗證,以第一次(API 升級)的觀察為準。

## 第六階段(全 UI 重做)新增的坑
30. 🔴 **Provider 精靈第 4 步(Replicator)的 SSO 欄位一開始是 disabled**,
    要先填 API 位址 + root 密碼並按「測試連線」→ 接受憑證,SSO 使用者/密碼才會解鎖。
    第 5 步(Tunnel)同樣要先「測試連線」才會啟用「儲存並繼續」。
31. ✅ 第 4 步的切換開關「對 Cloud、Manager 和 Tunnel 使用上述 Lookup Service 位址」
    (`lsForAllServices`)一定要打開 —— 打開後 8441/8043/8047 三個服務的 `lsUrl` 都會寫入,
    就不會出現第四階段那個「Lookup Service 離線」的假警報(坑 30 舊編號)。
32. 精靈每次重新開啟都會從第 1 步走,已完成的步驟顯示 Completed,但**密碼類欄位不會保留**,
    要重打(VCD 密碼、Replicator root/SSO 密碼、Tunnel root 密碼)。
33. On-Prem 的初始精靈只有 4 步(Lookup Service → 站台詳細資訊 → Cloud Service → 即將完成);
    若中途離開,入門頁的精靈連結會消失,改從儀表板的「立即配對」進同一組精靈。
34. 🔴🔴 **配對的「公用服務端點位址」必須打到 Tunnel service,不是 Cloud service**。
    官方文件寫「填 443」是因為**正式環境會把對外 443 用 DNAT / LB 導到內部 tunnel 的 8048**
    (提供者也會把「設定 → 公用服務端點位址」設成對外那組位址),tenant 端自然填 `https://cloud.example.com`。
    **本 lab 沒有那層 NAT**,443 直接落在 Cloud service 上,所以配對要填 `https://10.0.0.75:8048`。
    填成 443 的症狀:憑證檢查會過,但最後按「完成」失敗 `憑證與預期不同 / CertificateMismatch`。
    真因(on-prem `tunnel.log`):on-prem 本機 relay 把 SNI `tn-<managerId>.tnexus.io` 轉送到 `:443`,
    Cloud service 不做 SNI 分流 → 回 `CN=cloud.vm`,而 pairing 期待 Manager 憑證 `CN=manager.vm`。
    判斷該填哪個埠(不用猜):
    ```
    openssl s_client -connect <位址>:<埠> -servername tn-<managerId>.tnexus.io
    → 回 CN=manager.vm  = 這個位址:埠 有打到 tunnel,可以填
    → 回 CN=cloud.vm    = 打到 Cloud service,填了會在最後一步失敗
    ```
    (managerId 由 `GET https://<cloud>:8441/config` 的 `id` 取得。)

## 全 UI 重做:完整流程與結果(2026-09-09)
全程只用 UI(唯一 CLI 是掛 ISO:`govc device.cdrom.insert/connect` + guest 內 `mount /dev/sr0 /mnt/cdrom`)。

| 階段 | 做法(UI 路徑) | 結果 |
|---|---|---|
| Provider 初始設定 | 入門 → 初始設定精靈(6 步) | `lab-cloud75` 4.7.5,四服務 lsUrl 全寫入 |
| On-Prem 設定+配對 | 入門精靈(4 步)/ 儀表板「立即配對」 | `onprem75-lab` ↔ `tenant01@lab-cloud75` |
| 本機放置 | 設定 → 放置到此站台上新復原的虛擬機器 → 設定(5 步) | Datacenter / Cluster / MGMT / vmfs-samsung4t |
| 原則 | 提供者入口 → 原則 → Default Policy → 編輯 | 開 傳入保護 + 雲端傳出保護 |
| 建立保護 | 傳出複寫 → 保護精靈(4 步) | `vcda-testvm03` RPO 30,GREEN |
| Provider 升級 | 關於 → 檢查更新 → 6 步精靈(CDROM) | 4.7.5 → **4.7.6.7462116-449912a**,~40 秒回來 |
| VCD 外掛更新 | 設定 → VMware Cloud Director 位址 → 編輯 → 套用 | plugin 4.7.5 → **4.7.6** |
| On-Prem 升級 | 關於 → 檢查更新(或橫幅「開啟更新精靈」)→ 5 步精靈 | 4.7.5 → **4.7.6**,instanceId 不變 |
| vSphere 外掛更新 | 設定 → Lookup Service 位址 → 編輯 → 套用 | OUTDATED → **OK** |
| 升級後驗證 | 傳出複寫 → 所有動作 → 同步 | 執行個體 2026/9/9 03:43,2.10 GB,狀況良好 |

升級後兩台系統健康狀態全綠(Provider:LS/vCloud 外掛/DB/VCD 連線;On-Prem:LS/vSphere 外掛/DB/LWD)。

### 修正先前的兩條記錄
- 坑 29 修正:**升級後 vSphere 外掛 OUTDATED,用 UI「設定 → Lookup Service 位址 → 編輯 → 套用」
  (要重打 SSO 帳密)就會修好**,不必打 `/config/vsphere-ui` API。之前「重新套用 LS 沒用」是因為
  只 POST 了 `/config/lookup-service`,UI 的編輯對話框做的事更多(會重新註冊 vSphere Client 外掛)。
- Provider 升級後 VCD 外掛停在舊版,一樣可用 UI「設定 → VMware Cloud Director 位址 → 編輯 → 套用」修好。

### 第六階段其他坑
35. Provider 升級精靈第 4 步「相容性檢查」會去掃已配對的 on-prem Replicator;
    本次顯示「未發現不相容的內部部署 Replicator」,可作為升級順序(先 Provider 後 On-Prem)的佐證。
36. On-Prem 有可用更新時,頁面頂端會多一條橫幅「有新的 vCDA 更新可用/開啟更新精靈」,
    **整頁往下位移約 36px**,照舊座標點「檢查更新」會點空;用橫幅按鈕最保險。
37. 建立保護時目的地 VDC 顯示「目前無法使用」= Default Policy 沒開 `傳入保護`(不是 VDC 壞掉)。
38. 保護精靈的來源虛擬機器清單要先用資料行篩選找 VM;選取列的核取方塊 id 會隨篩選變動,
    自動化要用座標點,不要記 `clr-dg-row-cbN`。
