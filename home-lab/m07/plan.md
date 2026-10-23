# m07 — vC 8.0U3g + NSX 4.2.2.1 直升 9.1.1(in-place)lab

開始:2026-10-21。狀態檔:`E:\9.1\m07\plan.md` / `context.md` / `tasks.md`。

## 目標(一句話,可驗證)
在全新 nested 環境(vCenter 8.0U3g + NSX 4.2.2.1 + ESXi 8.0U3b)上,把 NSX 用 Upgrade Coordinator **直接**升到 **9.1.1.0100**(使用者 10-21 指定)、
NSX Host 用 **In-Place** 模式(不進 MM、不 vMotion、ESXi 不重開),vCenter 升到 **9.1.1.0100(25784172)**,最後 Finalize 成功。

## In scope
- 建 vcf-m07:3 台 nested ESXi 8.0U3b、vCenter 8.0U3g、NSX 4.2.2.1 單節點、Host TEP、overlay 測試 segment
- 2 台測試 VM 在不同 host 上,升級全程持續 ping(量資料面中斷秒數)
- NSX 4.2.2.1 → 9.1.1.0100 build 25762940(UC:匯入 .mub → UC → precheck → MP → Host in-place → Finalize)
- vCenter 8.0U3g → 9.1.1.0100.25784172(ISO installer,depot VCENTER/ 有 ISO)
- 結果回寫「NSX 手動升級至 9.1.1 操作手冊」(Claude Doc XBLNZ2fNRVMgKdBKHKKfbL)

- **全程 step-by-step 截圖**(使用者 10-21):每個 UI 步驟都 cut 圖,存 `E:\9.1\doc-shots\m07\`,
  工具照 memory:CDP `tools\cdp-live.mjs`(有頭模式存本機 PNG),Clarity 互動走 Playwright connect_over_cdp;
  NSX/vCenter UI 一律英文語系(zh-TW 會空白)。CLI/API 步驟存輸出文字檔佐證。
  → 能用 UI 做的步驟就用 UI 做(才有圖),API 只拿來驗證/監控。

## Out of scope(使用者 10-21 定案)
- **不部 NSX Edge**
- **ESXi 不升級、不重開、不 vMotion**(ESXi 留在 8.0U3b)
- converge 成 VCF 9.1.1:**元件升完後再問使用者**,現在不做(IP 段已預留 .167-.182)
- 不動 m02 / 其他 session 的任何東西

## Done when
- NSX `GET /api/v1/upgrade/status-summary` 全 SUCCESS、`product_version` = 9.1.1.0100.x
- vCenter 9.1.1.0100.25784172,Compute Manager Registered+Up
- 3 台 ESXi uptime 跨越整個升級期間沒歸零(證明沒重開)、測試 VM 沒換 host(證明沒 vMotion)
- 有 ping 中斷時間紀錄 + 升級時間軸

## 驗證指令
- NSX:`GET https://vcf-m07-nsx01.home.lab/api/v1/upgrade/status-summary`、`GET /api/v1/node/version`
- vCenter:`GET https://vcf-m07-vc01.home.lab/api/appliance/system/version`
- ESXi 沒重開:`esxcli system stats uptime get`(每台,升級前後比)
- 測試 VM 所在 host:govc `vm.info -r vcf-m07-test01` 的 Host 欄
- ping 紀錄:test01 上 `ping -D 172.16.77.12` 的 log
