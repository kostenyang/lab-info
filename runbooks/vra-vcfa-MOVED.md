# vRA / VCF Automation 的內容已搬到獨立 repo

2026-09-18 起，vRA 8 → VCF Automation 9.x 的 runbook 與腳本改放：

## 👉 [`kostenyang/vra-lifecycle`](https://github.com/kostenyang/vra-lifecycle)（private）

原因：數量成長到放在 `lab-info/runbooks/` 底下會蓋過其他主題。

| 原路徑（已移除） | 新位置 |
|---|---|
| `runbooks/vcf911-vra8-import-upgrade-worklog.md` | `runbooks/vcf911-vra8-import-upgrade-worklog.md` |
| `runbooks/vcf911-vcfa-fleet-record-manual-fix-optionB.md` | `runbooks/vcf911-vcfa-fleet-record-manual-fix-optionB.md` |
| `runbooks/vcfa-reset-provider-password.md` | `runbooks/vcfa-reset-provider-password.md` |
| `runbooks/debug-vcfa-nested-cheatsheet.md` | `runbooks/debug-vcfa-nested-cheatsheet.md` |
| `runbooks/optionB-20260917/` | `runbooks/optionB-20260917/` |
| `runbooks/scripts/vcfa-reset-provider-password.sh` | `runbooks/scripts/vcfa-reset-provider-password.sh` |
| `runbooks/scripts/vcf911-vra8-upgrade/` | `runbooks/scripts/vcf911-vra8-upgrade/` |

目錄結構原樣搬過去，所以文件之間的相對連結都還有效。
採複製方式建立，**未保留原 git 歷史** —— 舊版本仍可在本 repo 的 git 歷史裡找到
（`git log --follow -- runbooks/<檔名>`，最後一版是 commit `f8c9208`）。

## 留在本 repo 的相關項目

- `runbooks/scripts/docx-build/gen-vcf911-upgrade-doc.js`、`gen-vcf911-upgrade-ppt.js`
  —— 同時涵蓋 VCF Management 9.1.1 升級，不只 vRA，故未搬移
- `runbooks/scripts/docx-build/gen-vcf911-optionB-doc.js` —— 同上，產生方案 B 的 Word
- `runbooks/vcfms-footprint-reduction.md` —— VCF Management Services 的縮容，非 vRA
- `topology/home-lab.md` —— 實驗室拓樸

## 其他 vRA 相關 repo

- [`kostenyang/vrablueprint`](https://github.com/kostenyang/vrablueprint) —— 藍圖、可攜性工具、self-service portal
- [`kostenyang/vc-folder-tag-migrate`](https://github.com/kostenyang/vc-folder-tag-migrate) —— 跨 vCenter 搬 Folder / Tag / 自訂屬性
