# 方案 B 執行前備份 — 2026-09-17

vRA 8.18.1 → VCF Automation 9.1.1 升級的 fleet 任務再次「假失敗」，依
[`../vcf911-vcfa-fleet-record-manual-fix-optionB.md`](../vcf911-vcfa-fleet-record-manual-fix-optionB.md)
§1 在動手之前留下的狀態快照。

| 檔案 | 內容 | 用途 |
|---|---|---|
| `backup-comp-vcfa-runtime.yaml` | runtime 叢集的 `Component/vcfa` CR（改版前，`8.0.0` / phase `Unknown`） | 步驟 ② 的回退來源 |
| `backup-comp-vcfa-mgmt.yaml` | 管理叢集殘留的同名 CR（改版前） | 步驟 ③ 的回退來源 |
| `backup-fleet-db.txt` | fleet DB `component` 表（11 列） | 比對／步驟 ⑤ 的回退來源 |
| `backup-sddc-db.txt` | sddc-lcm DB `component` 表（11 列） | 比對 |

執行前後的關鍵差異：

```
VCFA  |  Unknown  |  8.0.0              ← 執行前（本目錄記錄的狀態）
VCFA  |  Running  |  9.1.1.0.25714559   ← 執行後
```

回退方式見該文件 §5。CR 的 `status` 要用 `--subresource=status` 還原。

> 內容只有元件 UUID 與版本字串，不含任何帳號密碼或憑證。
