# VCF 9.1 Fleet 補件包 — 匯入說明 (修正版)

補齊 VCF 9.1 offline depot 缺少的「fleet 服務層」9 個元件。**只補 binaries、不動 depot 既有 metadata**
(depot 原始 metadata 已列出這些 fleet 元件、並 resolve 到既有元件的相容版本；只是舊工具沒抓到 binary)。

## 內容物

| 檔案 | 說明 |
| --- | --- |
| `fleet-binaries-only-9.1.0.tar` | **只有 9 組 fleet COMP binaries、無 metadata** — 客戶主要用這個 |
| `import-fleet.sh` | 匯入 script：**先備份 metadata → 只解 fleet COMP → 驗證 metadata 未被動** |
| `SHA256SUMS.txt` | 校驗碼 |
| (選) `fix-depot-metadata.sh` + `metadata-original/` | 若先前誤匯入含 metadata 的舊包、把型錄蓋成 seq48/0400 了, 用這個還原原始 metadata |

補的 9 個元件 (版本對齊 depot 原本的 resolution)：
`VSP`(9.1.0.0)、`VCF_FLEET_LCM`(0100)、`VCF_SDDC_LCM`(0200)、`DEPOT_SERVICE`(0.0)、`VCF_SALT`(0100)、`VCF_SALT_RAAS`(0100)、`VCF_LICENSE_SERVER`(0200)、`TELEMETRY_ACCEPTOR`(0.0)、`VCF_SERVICE_VCD_MIGRATION_BACKEND`(0.0)。

## 匯入步驟 (在客戶 depot server 上)

```bash
# <DEPOT_STORE> = 含 PROD/ 的目錄, 例如 /opt/vcf-depot/vcf9
sudo bash import-fleet.sh /opt/vcf-depot/vcf9
```
script 會自動：
1. **先備份** PROD/metadata → PROD/metadata.bak-<時間> (保險)
2. **只解** 9 組 fleet COMP binaries 進 PROD/COMP (刻意不解 tar 內任何 metadata)
3. 修 COMP 讀取權限
4. 驗證 fleet 就位 + **確認型錄 seq 匯入前後相同** (證明 metadata 沒被動)

web server (nginx/apache) 直接 serve 即可。之後 VCF Installer 連 depot → 抓「最新」= depot 原本的元件版本 (fleet 都補齊了) → bring-up 正常。

## ⚠️ 重要
- 客戶 depot 的 **PROD/metadata 保持原樣不要動**。它 resolve 到既有元件版本；若被較新的 metadata (seq48/0400) 覆蓋, installer 會去要 depot 上沒有的 0400 版本 → 下載 Failed。
- 若不慎已被覆蓋: `sudo bash fix-depot-metadata.sh /opt/vcf-depot/vcf9` (需 `metadata-original/` 同目錄) 還原原始 seq43 metadata。

## 已驗證
本補件包已在等同客戶 (pristine, 原始 seq43 metadata) 的 depot 上, 用真 VCF Installer 實測：
連線成功 → installer resolve fleet = 原始版本集 (無 0400) → **下載全部 9 組 fleet 9/9 SUCCESSFUL**。
