# vra-bp-portability — vRA 8 藍圖可攜性掃描 / 跨 vCenter 複製

客戶情境：手上的 vCenter 8 要退役、換成新的 vCenter 9，接到同一套 vRA 8。
新 vCenter 接上來時**新專案裡一張藍圖都沒有**，要把舊藍圖搬過去，
而舊藍圖常常綁死了舊 vCenter 的實體物件（template 名、datastore、customization spec…）。

這支工具做三件事：**掃出綁死的地方 → 比對新環境缺什麼 → 整批複製並自動改寫**。

## 用法

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0      # lab 自簽憑證
node vra-bp.mjs scan                        # 只掃，列出每張藍圖的可攜性問題
node vra-bp.mjs check --target vc9-m02      # 再比對目標 cloud account，標出「目標已有 / 目標缺少」
node vra-bp.mjs copy  --target vc9-m02 --from-project vc8-lab --project vc9-lab [--apply]
node vra-bp.mjs fix   --target vc9-m02 [--apply] [--project <id>] [--suffix -vc9]
```

不加 `--apply` 一律只印預演，不動任何東西。`copy` 有冪等保護：目標專案已存在同名藍圖就略過。

環境變數：`VRA_URL` / `VRA_USER` / `VRA_PASS` / `VRA_DOMAIN`（預設 `https://vra9.home.lab`、`admin`、`System Domain`）。

## 判斷規則

| 等級 | 偵測 | 為什麼擋住換 vCenter | 自動改寫 |
|---|---|---|---|
| 🔴 BLOCK | `imageRef:` | 直接指 template 名稱、繞過 image mapping | → `image: <推導的 mapping 名>` |
| 🔴 BLOCK | `customizationSpec:` | spec 是舊 vCenter 內的物件 | 註解掉並留下原文 |
| 🔴 BLOCK | `resourcePool`/`folder`/`datastore(Name)`/`computeHost`/`storagePolicy` | 寫死舊 vCenter 實體物件 | 註解掉並留下原文 |
| 🔴 BLOCK | MoRef（`vm-123`/`domain-c8`…） | 換 vCenter 必失效 | 需人工處理 |
| 🟡 WARN | `image:` / `flavor:` | mapping **同名**即可跨 vCenter，但新 region 要先建 | 不改藍圖，報告要補什麼 |
| 🟡 WARN | `constraints: - tag:` | tag 要貼到新 fabric 物件上 | 不改藍圖，報告要補什麼 |
| 🔵 INFO | 寫死 IP | 可能撞號或不在新網段 | 建議改用 IP range |

`flavor: ${input.size}` 這種變數不會誤判 —— 會回頭解析該 input 的 `enum` / `default`，
把可能帶入的值逐一拿去目標環境比對。

## 設計取捨

- **逐行 regex，不做 YAML parse → dump**：客戶藍圖裡的註解與排版有意義，parse/dump 會整份洗掉。
  改寫時也因此能把原本那行以註解保留下來，方便 review。
- **不改原始藍圖**：一律建立新藍圖（預設加 `-vc9` 後綴）放到目標專案，舊的原封不動。
- **同名 mapping 是可攜的關鍵**：藍圖只引用 `image: linux` / `flavor: small` 這種抽象名稱，
  換 vCenter 時只要在新 region 建同名 mapping 指向新 template，**藍圖 YAML 一個字都不用改**。

## 實測（2026-09-15，vRA 8.18.1 / vCenter 8.0.3 → vCenter 9.1.1）

- `legacy-app-vc8`（綁死 ubuntu2004temp + customization spec + pcssd3 + folder）→ 掃出 4 BLOCK + 2 WARN
- `copy --apply` 後產生 `legacy-app-vc8-vc9`、`app-linux-portable-vc9` 於 vc9-lab 專案
- 在 vC9 補上同名 `ubuntu` image mapping、`zone:oa` 網路 tag 後，兩張都部署成功
  （`migrated-app-on-vc9` → 10.0.0.233、`copied-app-on-vc9` → 10.0.0.234）
