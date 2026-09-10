# vcf911-vra8-upgrade — VCF Management 9.1.1 升級 + vRA 8.18→VCF Automation 9.1.1 用到的輔助腳本

| 檔案 | 用途 |
|---|---|
| `fleet.mjs` | 在 VCF Operations 的 fleet-lcm iframe 內執行任意 JS / 同源打 `/vcf-operations/plug/fleet-lcm/v1/*`；內建 `fd`/`F(api)`/`sq`/`rows()`/`btn(text)`，可順手截圖 |
| `inject-session.mjs` | curl 完成 Ops 登入（`mainAction=login` + `forceLogin=true` + 三段 bootstrap GET）後把 cookie 注入 CDP Chrome，免走會卡死的 ExtJS 登入頁 |
| `ensure-tab.mjs` | 確保有一個分頁停在 Lifecycle 深層連結（優先既有分頁，否則 about:blank），不搶使用者分頁 |
| `vsp.sh` | `vsp.sh "<cmd>" [ip]`：plink 進 VSP 節點（先探當前 host key 再釘）；不給 ip 時自動找 admin.conf 非 0 的 control-plane |
| `poll-apply.mjs` / `poll-task.mjs` | 輪詢 fleet APPLY 任務（依元件型別 / 依任務 ID）並定期截圖 |
| `poll-prechecks.mjs` / `poll-batch.mjs` / `poll-flcm.mjs` | precheck / 批次升級 / Fleet lifecycle 自升級的輪詢 |
| `shot-k8s.sh` | 把 runtime 叢集的 kubectl 狀態排成 HTML 再截圖（文件用「底層證據」圖） |
| `xvmotion-vra9.ps1` / `coldmove-vra9.ps1` | PowerCLI 跨 vCenter 熱/冷遷移 vRA 8 VM（版本釘 13.5；熱遷移因巢狀 CPU 旗標不可行） |
| `check-kb.sh` | 驗證 KB 425489 腳本結果（log + `ssl_trust_certificate_state` 的 cert_ext 列） |

完整過程與坑見 `../../vcf911-vra8-import-upgrade-worklog.md`；交付文件由 `../docx-build/gen-vcf911-upgrade-doc.js`（Word）與 `gen-vcf911-upgrade-ppt.js`（PPT）產生。
