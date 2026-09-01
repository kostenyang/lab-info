# Runbook — 用 CDP 驅動瀏覽器做 UI 自動化與截圖

> Lab-agnostic。適用 rtolab 與 home lab 的任何 VMware Web UI（VCF Operations、vCenter、
> NSX Manager、SDDC Manager、VCD、VCDA…）。
>
> **用途**：把「必須在 UI 上按完的流程」自動化，並把每一步截成**本機 PNG 檔**，
> 直接嵌進 Word/PPT 交付文件或 commit 進 git。

---

## 1. 為什麼是 CDP，不是瀏覽器 MCP

| | 瀏覽器 MCP (claude-in-chrome) | CDP（本 runbook） |
|---|---|---|
| 截圖落地 | `save_to_disk` 存在 **server 端**，本機檔案系統拿不到 | `Page.captureScreenshot` 回 base64，**直接寫成本機 PNG** |
| 連線對象 | 需要使用者在 Chrome 擴充按 Connect，且只有那台連得到 lab 內網 | 直接在跑腳本的機器上起 Chrome，**天生在 lab 網段內** |
| 自簽憑證 | 需逐站點手動略過 | 啟動參數 `--ignore-certificate-errors` 一次解決 |
| 可重放 | 難 | 步驟是 JSON，**可以存檔、可以重跑、可以進 git** |

結論：**要產出交付文件的截圖、或要重複跑同一段 UI 流程，用 CDP。**

---

## 2. 準備

```powershell
# 起一個「獨立 profile」的 Chrome（不會干擾使用者正在用的 Chrome）
.\start-cdp-chrome.ps1 -WindowSize '1680,1050'

# 重啟（換視窗大小、或畫面卡住時）
.\start-cdp-chrome.ps1 -WindowSize '1680,1050' -Restart
```

要點：

- **不要用 `-Headless`。** VCF Operations / vCenter 這類重量級 Angular UI 在 headless
  模式下 `Page.captureScreenshot` 會 timeout（實測 120 秒沒回應）。有頭模式秒回。
- profile 目錄獨立 ⇒ 登入 session 會保存，之後每次跑腳本**不用重登**。
- 視窗大小決定截圖解析度。**1680×1050** 出來的可視區約 1664×955，嵌進 A4 文件寬度剛好。
- Node 用 portable 版即可（本機在 `E:\9.1\tools\node-v24.16.0-win-x64\node.exe`），
  腳本只用到內建 `WebSocket` / `fetch`，**不需要 npm install**。

---

## 3. `cdp-live.mjs` — 附著既有分頁的步驟執行器

跟一般 CDP 截圖腳本的差別：**它附著在既有分頁上，結束時不關分頁**。
所以「多回合精靈」可以一次呼叫做幾步、看結果、再呼叫做下幾步，畫面狀態不會掉。

```powershell
$node = 'E:\9.1\tools\node-v24.16.0-win-x64\node.exe'

# 導航 + 截圖
& $node cdp-live.mjs --match ops01 --steps '[
  {"url":"https://vcf-m02-ops01.home.lab/"},
  {"wait":15000},
  {"shot":"E:/shots/01-login.png"}
]'

# 接續上一次的畫面：填表 → 按鈕 → 截圖
& $node cdp-live.mjs --match ops01 --steps '[
  {"type":[["#userName-inputEl","admin"],["#password-inputEl","<pw>"]]},
  {"click":"#loginBtn"},
  {"wait":25000},
  {"eval":"location.href"}
]'
```

`--match <字串>`：挑 URL 含此字串的分頁附著；找不到就開新分頁。
沒給就用第一個 http(s) 分頁。

### 步驟型別

| 步驟 | 作用 |
|---|---|
| `url` / `navigate` | 導航並等 load 事件 |
| `waitFor` | 等 selector 出現（`secs` 可調，預設 60） |
| `fill` `[[sel,val]]` | 用 native setter 設值 + 發 input/change/blur（Angular 表單用這個） |
| `type` `[[sel,val]]` | **真滑鼠點擊 + `Input.insertText`**（欄位有遮罩／自訂元件時用這個） |
| `click` `sel` | `el.click()` |
| `realClick` `sel` | 真滑鼠事件（Clarity 某些元件只吃這個） |
| `clickText` / `realClickText` | 依按鈕文字點（大小寫不敏感、含子字串） |
| `clickAny` `txt` | 任意元素文字**完全相符**時點（只認無子節點的元素） |
| `key` | `Enter` / `ArrowDown` / `ArrowUp` / `Tab` / `Escape` |
| `cdp` `{method,params}` | 直接下任意 CDP 指令，例：`{"cdp":{"method":"Network.clearBrowserCookies"}}` |
| `eval` `js` | 在頁面執行 JS，回傳值印到 stdout（拿狀態、抓文字都靠它） |
| `scroll` | 數字 / `"bottom"` / `"top"`（自動找可捲動容器） |
| `wait` | 毫秒 |
| `shot` | 存 PNG 到指定路徑 |

---

## 4. VMware UI 實戰配方（踩過才知道）

### 4.1 一律過濾「看不見的元素」

Clarity / Angular 會留下大量隱藏的重複元素（`getBoundingClientRect()` 全 0）。
直接 `querySelectorAll('button')` 找文字相符的那顆，很容易點到隱藏的那個，**看起來點了卻沒反應**。

```js
// 正確：只挑可見且未 disabled 的
const b = [...document.querySelectorAll('button')]
  .find(x => x.innerText.trim().toUpperCase() === 'NEXT'
             && x.getBoundingClientRect().width > 0 && !x.disabled);
b.click();
```

同理，同一個 id 可能同時存在隱藏與可見兩份（例如 provisioning 精靈的 `#baseDn`
在「群組」與「使用者」兩個步驟各有一個）。做法：**先用 JS 找出可見的那顆、改掉它的 id，再對新 id 操作**。

```js
const i = [...document.querySelectorAll('input#baseDn')]
  .find(x => x.getBoundingClientRect().width > 0);
i.id = 'tmpTarget';       // 之後 {"type":[["#tmpTarget","CN=Users,DC=..."]]}
```

### 4.2 自訂下拉（不是 `<select>`）

VCF Operations 的 Scope / Role 選單是 `div.scopes-selector-container` 這類自訂元件，
`<select>` 抓不到。流程固定是：**realClick 展開 → 點 radio → 按 APPLY**。

```json
[{"realClick":".scopes-selector-container"},{"wait":2500},
 {"eval":"(()=>{const i=[...document.querySelectorAll('input[type=radio]')].filter(x=>x.getBoundingClientRect().width>0).find(x=>((x.closest('label')||x.parentElement).innerText||'').includes('Components with')); i.click(); return i.checked})()"},
 {"eval":"(()=>{const b=[...document.querySelectorAll('button')].filter(x=>/^APPLY$/i.test(x.innerText.trim())&&x.getBoundingClientRect().width>0&&!x.disabled).pop(); b.click(); return 'OK'})()"}]
```

⚠️ 順序有相依性：**Scope 沒選定前，Role 清單中較高階的選項會是灰階**。

### 4.3 搜尋建議清單（NSX 的 VCF SSO 群組選擇）

鍵盤 `ArrowDown` + `Enter` **沒用**。可靠做法是先截圖看座標，再用
`document.elementFromPoint(x, y)` 拿到建議項、掛個暫時 id、`realClick` 它。

```json
[{"eval":"(()=>{const e=document.elementFromPoint(455,390); e.id='ptTmp'; return e.tagName})()"},
 {"realClick":"#ptTmp"}]
```

### 4.4 資料表格勾選（Clarity datagrid）

```js
// 勾選可見列中符合條件者
let n = 0;
document.querySelectorAll('clr-dg-row').forEach(r => {
  if (r.getBoundingClientRect().width === 0) return;      // 跳過隱藏列
  if (!/VCF-Admins/.test(r.innerText)) return;
  const cb = r.querySelector('input[type=checkbox]');
  if (cb && !cb.checked) { cb.click(); n++; }
});
return 'checked ' + n;
```

### 4.5 各家登入頁的 selector

| 產品 | 帳號 | 密碼 | 送出 | 備註 |
|---|---|---|---|---|
| VCF Operations | `#userName-inputEl` | `#password-inputEl` | `#loginBtn` | ExtJS；`#authSelector-inputEl` 選登入方式 |
| NSX Manager | `#username` | `#password` | 文字為 `LOG IN` 的按鈕 | `#authentication-providers` 是真 `<select>`（`VCF SSO` / `Local Account`） |
| vCenter（VCF SSO 已啟用） | — | — | `#idpLoginBtn` | 按下後導向 Identity Broker |
| Identity Broker (VIDB) | `#username-control` | `#password` | `#loginBtn` | 送出要用 `realClick`，`click` 有時不觸發 |

### 4.6 換帳號登入 = 清 cookie

OIDC 聯邦下，只登出單一產品仍會被 Identity Broker 的 session 自動帶回同一個人。
要用另一個帳號驗證權限時，直接清瀏覽器 cookie 最乾脆（會清掉這個 profile 的所有登入）：

```json
[{"cdp":{"method":"Network.enable"}},
 {"cdp":{"method":"Network.clearBrowserCookies"}},
 {"url":"https://<vcenter>/ui/"}]
```

### 4.7 hash route 導不過去

NSX 這類 `#/app/...` 的 SPA，`Page.navigate` 只換 hash 不會重新渲染。
**用點選單的方式走**（先點 `System` 再點 `User Management`），或 `location.href=...` 後
`location.reload()`。

---

## 5. 截圖 → Word 交付文件

```
起 CDP Chrome → cdp-live.mjs 逐步操作 + shot 到 doc-shots\<主題>\NN-*.png
   → node + docx 套件產生 .docx（圖片按 PNG IHDR 讀寬高，等比縮到版面寬）
   → LibreOffice --headless --convert-to pdf → pdftoppm 轉 jpg 做視覺 QA
```

- 產生器範例：`E:\9.1\tools\docx-build\gen-*.js`（`docx` npm 套件，portable node）
- A4 版面（`size: { width: 11906, height: 16838 }`）+ 900 twips 邊界 ⇒ 圖片寬度用 **670**
- 視覺 QA：
  ```powershell
  soffice --headless --convert-to pdf --outdir <qa> <docx>
  pdftoppm -jpeg -r 70 -f 1 -l 4 <pdf> page
  ```
- 圖檔命名用 `NN-描述.png`（兩位數序號），文件產生器就能照順序引用、也方便補拍單張。

---

## 6. 疑難排解

| 症狀 | 原因 / 解法 |
|---|---|
| `Page.captureScreenshot timeout` | 用了 `-Headless`。改成有頭模式。 |
| `Runtime.evaluate timeout` | 分頁正在跑重活（剛送出表單）。拉長 `wait`，或分成兩次呼叫。 |
| 點了按鈕沒反應 | 點到隱藏的同名元素。用 §4.1 的可見性過濾。 |
| `realClickText` 回報 `@0,0` | 同上——抓到 rect 全 0 的隱藏元素。 |
| 腳本跑完卡住不結束 | WebSocket 沒 unref。腳本結尾已加 `process.exit(0)`。 |
| 導航後畫面還是舊頁 | SPA hash route，見 §4.7。 |
| 帳號被鎖 | **不要拿密碼反覆試錯**。先用 API 驗一次帳密再進 UI。 |

---

## 7. 檔案

| 檔案 | 說明 |
|---|---|
| [`scripts/start-cdp-chrome.ps1`](scripts/start-cdp-chrome.ps1) | 起獨立 profile 的 CDP Chrome |
| [`scripts/cdp-live.mjs`](scripts/cdp-live.mjs) | 附著既有分頁的步驟執行器（本 runbook 主角） |

實際產出範例：VCF 9.1 VCF SSO 設定手冊（47 頁 / 63 張現場截圖），整份文件的截圖
全部由這套工具在 home lab 上一次跑完取得。
