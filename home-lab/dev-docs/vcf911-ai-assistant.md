# VCF 9.1.1 AI Assistant (VMware Intelligent Assist) 啟用 — 完成紀錄

來源：williamlam.com 2026-09「VCF 9.1.1 - Enabling the new AI Assistant for VCF in VCF Operations」
狀態：**✅ 2026-09-29 全流程完成並實測通過**
交付：`E:\9.1\vcf-ai-assist\VCF911-AI-Assistant-Enablement.docx`（21 頁、19 張圖）+ 同目錄 PDF
圖檔：`E:\9.1\vcf-ai-assist\shots\`；產生器 `tools\docx-build\build-ai-assistant.js` + `_ai_part2.js` + `gen-ai-assistant-doc.js`

## 最終狀態
| 項目 | 值 |
|---|---|
| VCF Operations | 9.1.1.0.25679751 |
| Log Management | OPS_LOGS / vcf-m02-logs01.home.lab / **10.0.0.176**（fleet 元件 9→10） |
| LLM Provider | Google Gemini（Healthy） |
| 作用中模型 | **Gemini Flash Latest**（gemini-flash-latest） |
| 內建工具 | 24 個自動註冊 |
| 實測 | List my vCenters → 正確回傳 vcf-m02-vc01.home.lab；自由文字問答正常 |
| 用量 | 38.5K token、平均延遲 6.6s、get_ops_resources 4 次 0% 失敗 |

## 完整步驟（實測順序）
1. Extensions › Extensions Management → INSTALL **Advanced Configuration** + **VMware Intelligent Assist**（各約 20 秒）
2. DNS 先建新 FQDN：`Add-DnsServerResourceRecordA -ZoneName home.lab -Name vcf-m02-logs01 -IPv4Address 10.0.0.176 -CreatePtr -ComputerName 10.0.0.200`
3. Build › Lifecycle › VCF Management › ADD COMPONENT › **Log management**
   - 9.1.1.0 / FQDN / Small / replicas 1；8 vCPU、16 GB、575 GB、6 IP（VSP pool 自動配）
   - 必勾中斷確認（會 resize VCFMS cluster vcf-m02-converge-r3）
   - **實際 59 分鐘**（08:51→09:50）；期間 VSP 節點 host key 會變、部分節點短暫失聯
4. Extensions › Advanced Configuration → **ENABLE SERVICES**（約 3 分鐘「Services are coming online」）→ 出現 4 個頁籤
5. LLM Providers › ADD PROVIDER → Google Gemini + API key → CONNECT → Healthy，助理自動轉 Enabled
6. Models → SELECT 模型（**見下方坑**）
7. Extensions › VMware Intelligent Assist → 對話

## 🔴 最大的坑：模型清單含已停用模型
- 選 **Gemini 2.5 Flash** → 助理回 `Error: LLM gateway returned status 502`
- 根因（curl 直打 Gemini 驗出）：`HTTP 404 This model models/gemini-2.5-flash is no longer available to new users.`
- **VCF 的 provider 健康檢查只驗 list models，不驗個別模型能否推論**；UI 把上游錯誤包成 502
- 設定前先逐一 curl 驗證：
```
curl -H "x-goog-api-key: $KEY" -H 'Content-Type: application/json' -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent" \
  -d '{"contents":[{"parts":[{"text":"say OK"}]}]}'
```
- 本次結果：`gemini-flash-latest` / `gemini-flash-lite-latest` / `gemini-3-flash-preview` = 200；
  `gemini-2.5-flash` / `gemini-2.5-pro` = 404 已停用；`gemini-pro-latest` / `gemini-3.1-pro-preview` = 429 免費額度不足

## 其他坑
- **內建 browser pane 連不到 lab**（navigate 被拒）→ 一律走 CDP Chrome 9222
- `cdp-live.mjs --steps` 的 JSON 含 `\s` 等跳脫會炸 → 改用 scratchpad `ev.mjs --file <js檔>`（附著分頁 + 檔案餵 JS）
- **多個 ops01 分頁** → `--match ops01` 會附錯；要用 `extensions/acc`、`extensions/via`、`build/lifecycle` 精確比對
- fleet UI 在 shadow root 內的同源 iframe（src 含 `fleet-lcm`）→ 取 contentDocument
- **acc extension 的資料表是 Clarity，列用 `[role=row]` 不是 `<tr>`**（`querySelectorAll('tr')` 回 0）
- 截圖要用絕對路徑 `E:/9.1/...`；nav + shot 同一次呼叫容易逾時 → 拆兩次，且常需重試一次
- bash heredoc 寫長中文 JS 會被截斷 → 改用 Write 工具寫檔
- fleet API 需瀏覽器 session，suite-api token 直打回 302

## 前置檢查指令
```
# 版本
curl -sk -X POST https://10.0.1.22/suite-api/api/auth/token/acquire -H 'Content-Type: application/json' -d '{"username":"admin","password":"..."}'
curl -sk https://10.0.1.22/suite-api/api/versions/current -H "Authorization: OpsToken <t>"
# 工作節點連外（三台都要）
plink -ssh -hostkey <fp> -pw '...' vmware-system-user@10.0.0.227 "curl -s -o /dev/null -w '%{http_code}' https://generativelanguage.googleapis.com/"
# 回 404 = 連得到
```
