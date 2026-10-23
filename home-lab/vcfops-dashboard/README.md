# VCF Operations 儀表板:營運總覽

在 **VCF Operations 10.0.1.22** 上建立的自訂儀表板。

- 名稱:`營運總覽:告警 ‧ 資源壓力 ‧ 授權集縮比`
- Dashboard ID:`c0a11000-9101-4a01-9001-0000000000d1`
- 直接開啟:`https://10.0.1.22/vcf-operations/ui/operate/dashboards/dashboards;tabId=c0a11000-9101-4a01-9001-0000000000d1`
- UI 路徑:Operate → Dashboards → All

## 內容(15 個 widget)

| 區塊 | Widget | 說明 |
|---|---|---|
| ① 異常告警與處理狀態 | IntSummaryAlertVolume | 全環境告警量,分 Critical / Immediate / Warning |
| | IntSummaryHealth | 環境健康狀態 + Health Weather Map |
| | ResourceList | vCenter / 叢集 / ESXi / Datastore 一覽,含各自的嚴重·立即·警告告警數與健康分數 |
| | AlertList | **只顯示作用中告警**(`status:[0]`),依告警定義分組,展開可看每則的處理狀態 |
| ② 效能與資源壓力 | ParetoAnalysis ×3 | Top 5 叢集 —— CPU / 記憶體 / 儲存空間 Workload |
| | ResourceList | 叢集明細:三種壓力 + 主機數 / VM 數 / 實體核心 / vCPU / 每主機 VM 數 |
| | Heatmap | 叢集 CPU 壓力熱圖,方塊大小 = 實體核心數 |
| ③ 授權與集縮比 | Scoreboard | 實體 CPU 核心總數(授權計量基準)、主機 / 叢集 / vCenter / Datastore 數 |
| | Scoreboard | vCPU:實體核心、每主機 VM 數、VM 總數、執行中 VM / vCPU |
| | TextDisplay | 授權判讀說明(含「授權額度不在 Ops 採集範圍」的但書) |

## 🔴 為什麼要用這套腳本

VCF Operations 9.1 **沒有公開的 dashboard REST API**(`/suite-api/docs/rest/index.html` 裡完全沒有
dashboard 相關端點)。儀表板只能透過舊版 Ops UI(iframe `/vcf-operations/plug/ops/index.action`)
的 `*.action` 端點操作,而且 session 是**綁分頁**的 —— 所以所有請求都必須從一個「已登入的 Chrome 分頁」內發出。

真正的存檔流程(從 `app.part6.min.js` 逆推):

1. `dashboard.action` `mainAction=saveTab` → 存 tab 名稱 + widget 版面(gridster)
2. `dashboard.action` `mainAction=saveWidgetConfigs` → 存每個 widget 的內容設定
   (只做步驟 1 的話,widget 會建出來但**設定全部被丟掉,只留 title**)

## 檔案

| 檔案 | 用途 |
|---|---|
| `gen-spec.mjs` | 產生 `dashboard.json`(widget 定義 + 版面) |
| `deploy.mjs` | 把 `dashboard.json` 部署到 VCF Ops(saveTab + saveWidgetConfigs) |
| `opsapi.mjs` | 通用:對舊版 UI 的 `*.action` 端點發請求 / 在 iframe 內跑 JS |
| `bootstrap.mjs` | 在 iframe 內裝 XHR 記錄器並取 `secureToken`(逆推新端點時用) |
| `dashboard.json` | 目前部署的 spec |
| `wcfg-*.json` | 從內建儀表板抓下來的 widget 設定範本(Scoreboard / AlertList / ResourceList / Heatmap / Pareto) |
| `shots/` | 驗證截圖 |

## 重新部署 / 修改

前置:要有一個已登入 VCF Ops 的 CDP Chrome 分頁。

```bash
powershell -File E:\9.1\tools\start-cdp-chrome.ps1
```

登入(Login Method 要選 **Local Account**,選 VCF SSO 會被導到 VIDB):

```bash
cd E:/9.1 && ./tools/node-v24.16.0-win-x64/node.exe tools/cdp-live.mjs --match ZZZ \
  --url 'https://10.0.1.22/ui/login.action?vcf=1' \
  --steps '[{"waitFor":"#userName-inputEl","secs":30},{"realClick":"#authSelector-trigger-picker"},{"wait":1500},{"clickAny":"Local Account"},{"wait":1500},{"type":[["#userName-inputEl","admin"],["#password-inputEl","VMware1!VMware1!"]]},{"wait":500},{"realClick":"#loginBtn-btnInnerEl"}]'
```

改完 `gen-spec.mjs` 後:

```bash
cd E:/9.1/vcfops-dashboard && ../tools/node-v24.16.0-win-x64/node.exe gen-spec.mjs c0a11000-9101-4a01-9001-0000000000d1 dashboard.json && ../tools/node-v24.16.0-win-x64/node.exe deploy.mjs --spec dashboard.json
```

(第一次建立才加 `--create`;之後都是更新。改完要**重新整理瀏覽器**,前端有快取。)

## 已知限制

- **授權額度**(已購買核心數)VCF Operations 不採集,儀表板只能呈現「已佈建、需授權的核心數」;
  實際額度要看 Broadcom License Hub / vCenter 授權頁。此 Ops 目前也還沒註冊(UI 上方有黃色橫幅)。
- `ResourceList`(Object List)的預設欄位(Name / Adapter Type / Object Type / Policy /
  Collection State / Status)無法隱藏,自訂的量測欄位排在它們後面,寬度不夠時要往右捲。
- 這座 lab 只有 2 個叢集,所以「Top 5」實際只會顯示 2 筆。
