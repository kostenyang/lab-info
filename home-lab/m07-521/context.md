# context.md — 決策與理由（持續更新）

## 路徑決策
- **converge 走 JSON spec 路徑，不用 step-by-step UI wizard**
  - 理由：UI wizard 的 vCenter/NSX/SDDC 步驟要在網頁欄位打既有元件密碼；我不在登入/密碼欄位打密碼。
    JSON spec 把密碼放檔案本體（config 作者行為，非表單輸入），符合使用者「密碼用 json 帶」。
  - 使用者選定：JSON spec 路徑（建議）。
- **API 認證沿用使用者瀏覽器 session**
  - 使用者在 installer UI 登入 → 我從 sessionStorage.sessionDetails.accessToken 取 bearer
    → curl 本機打 https://10.0.1.167/v1/...；我不另外用密碼認證、不打密碼。
  - 瀏覽器內 fetch 會 "Failed to fetch"（CSP/interceptor），故改本機 curl 帶 bearer。
- **vLCM 轉換走 vCenter UI（CDP）**
  - 理由：9.1.1 REST 的 enablement enable 操作查不到（metamodel 回空、各 path 404）；
    UI "Image Setup → Proceed with this image" 可靠且能截圖（使用者要「拍圖」）。
  - UI 偵測到 hosts 跑 ESXi 8.0U3b → 用偵測到的 image（hosts 已相容、免 remediation），
    優於我 API 先設的 8.0U3e draft。

## 網路事故根因（reboot 後）
- host .95 reboot 後 vCenter/NSX VM 連不到：兩台 VM 卡在 vSwitch0/"VM Network"，
  而 vmnic0 之前被搬去 VDS → vSwitch0 無 uplink → VM 孤立（Team Uplink void）。
- 修法：esxcfg-vswitch 把 vmnic0 退回 vSwitch0（esx03 dvport37 / esx01 dvport35）→ VM 活；
  再透過 vCenter 把兩台 VM 網卡搬到 m07-vds01-pg-mgmt（static binding 由 vCenter 處理）。
  → 同時滿足 converge「vCenter VM 須在 DVS」。

## NSX
- reboot 後服務全 inactive（被孤立約 30 分鐘沒起來）→ Invoke-VMScript reboot appliance
  → 000→DEGRADED→STABLE（約 5 分鐘）。thumbprints（.164/.165/.166）全對 spec。

## validation 迭代修正
- v1 FAIL：vCenter 不在 DVS → 已修（VM→VDS）
- v2 FAIL：VSP pool <12 → 176-182(7) 改 176-189(14)；portgroup SDDC-DPortGroup-VM-Mgmt → m07-vds01-pg-mgmt
- v3 FAIL：cluster 非 vLCM image → 正用 UI 轉換中
- 待觀察 warning：vSAN 儲存 4182<4364 GB（差 182），舊關機 vcf-m07-vc01(8.0) 還佔 datastore 可刪

## 重要坑
- Clarity 按鈕 DOM dispatchEvent 無效 → 要用 pg.mouse.click 真實座標點擊
- vLCM UI 在 plugin iframe（com.vmware.vlcm.client）

## vLCM 轉換完成 (2026-10-23)
- UI 流程：Image Setup → Proceed with this image(偵測到8.0U3b) → Step1 Define Image SAVE
  → Step2 compliance → FINISH IMAGE SETUP → "Yes, finish"(不可逆,取代baselines)
- 結果：GET enablement/software = {"enabled":true} ✅ cluster image-managed
- image = autogen-software-spec-2 / ESXi 8.0U3b 24280767 / 無 addon（hosts 已相容）
- 截圖 11~20

## 部署送出 (2026-10-23 03:50 UTC)
- validation v4 = COMPLETED/WARNING（0 error）→ 依使用者「過了直接送出」POST /v1/sddcs
- SDDC id = 70475bc2-fb0e-4d53-acdb-7b397dc1cc36 (name vcf-m07), IN_PROGRESS
- 首 milestone: Deploy SDDC Manager
- storage warning（4177<4364）接受理由：installer 標 WARNING 可過 + vSAN thin provisioning 實耗遠低於帳面

## 部署進度修正 (poller 顯示 bug)
- subtask 成功狀態字串 = POSTVALIDATION_COMPLETED_WITH_SUCCESS（非 SUCCESSFUL）
- 13:06 實況：M1 17/17✅ M2 44/44✅ M3 30done+1run+9init M4/M5 待啟；~91/135；0 failed
- 終態偵測看 top-level status（COMPLETED_WITH_SUCCESS/FAILURE），不受計數 bug 影響

## watermark bypass 標註 lab-only (使用者裁示 2026-10-23)
- 兩腳本(watermark-curl.sh / -v1.sh)維持原 header 一行「(lab only, unsupported)」(使用者不要大 banner)
- README 口吻改中性前瞻：非「禁用/unsupported」，而是「現階段手動/lab、RD 正評估標準化」
  (使用者:我們 RD 可能會想改成標準) —— 開頭/Part D/5.4 三處 + 腳本一行註解都已改
- ⚠️ 這兩腳本之前已 push 到 repos：v8tov9(#2)、cust vcf-vks-airgap-nfs-vlan(#2)
  → repo 版尚未同步 banner；要不要 push 待使用者決定(outward publish)
