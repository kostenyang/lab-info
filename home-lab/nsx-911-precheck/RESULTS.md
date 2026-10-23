# NSX 4.2.1 → 9.1.1.0 Pre-Check 對照（2026-10-22）

目的：同一個 NSX build（4.2.1.0.0.24304122），**Cloud Builder 部的（m06）vs 手動部的（m07）**，
在 Upgrade Coordinator 9.1.1.0 的 pre-check 有沒有差別（重點：`vcfEnvironmentCheck` error 31944）。
做法：API 走跟 UI 一樣的 UC 流程（上傳 .mub URL → EULA → upgrade UC → execute_pre_upgrade_checks），
**只到 pre-check，不升 MP/host**。腳本 `Run-NsxPrecheck.ps1`，原始 JSON 在 `m06\`、`m07\`。

bundle：`http://10.0.0.61:8888/PROD/COMP/NSX_T_MANAGER/VMware-NSX-upgrade-bundle-9.1.1.0.0.25691509.mub`

## m06 — Cloud Builder 5.2.1 bring-up 部的（SDDC Manager 已關機）

| 步驟 | 時間 | 結果 |
|---|---|---|
| .mub 上傳 | 09:33–09:40 | SUCCESS（7 分） |
| EULA | 09:40 | accepted |
| UC 升級 | 09:41–09:48 | SUCCESS，UC 4.2.1.0.0.24302016 → **9.1.1.0.25691516**（期間 API 500 約 4 分） |
| pre-check | 09:48–09:52 | MP / HOST / EDGE / FINALIZE 全 COMPLETED |

**結果：0 FAILURE，4 WARNING（全部 needs_ack=True，可 acknowledge）**
| code | 內容 |
|---|---|
| 31911 | Context Profile `/infra/context-profiles/FPROT` 含不支援的 APP ID（KB410572） |
| 36014 | VCF 9.0 起不支援 NSX-V → NSX 遷移 |
| 31935 | MP API（/api）已棄用 |
| 31954 | 升級會停用預設 DFW 規則「Malicious IP at Destination Rule」 |

🔑 **沒有 `vcfEnvironmentCheck`（31944）**。對照舊 m07（vC 8U3g + NSX 4.2.2.1 手動部、9.1.1.0 `.pub` pre-check）是 FAILURE 31944、needs_ack=false。
→ Cloud Builder 部的 NSX，UC 認得它是 VCF 環境（即使 SDDC Manager 是關著的）。

## 🔑 vcfEnvironmentCheck 到底檢查什麼（10-22 拆 UC 9.1.1 jar 實證）

- 實作：`/opt/vmware/upgrade-coordinator-tomcat/webapps/upgrade-coordinator/WEB-INF/lib/libnsx-upgrade-plugins.jar`
  → `com.vmware.nsx.management.upgrade.plugin.mp.task.VcfEnvironmentInspectionTask`
- `execute()` 只呼叫 `UpgradePersistenceService.getNsxManagerDeploymentInfo()`（讀 ufostore `lcm.model.NsxManagerDeploymentInfoMsg`），
  拿不到 → log「Upgrade to 9.x is blocked for non vCF environments」→ `FAILURE NOT_VCF_ENVIRONMENT`（31944）；沒有讀其他欄位
- 這筆資料的 API = **`/api/v1/watermark`**（schema `NSXManagerDeploymentInfo`：「Deployment Details of NSX Manager deployed via VCF」，
  必填 instance_id / managed_by / log_token / deployed_by；GET/PUT/POST/DELETE）
- 實測對照：

| | m06（CB 部） | m07（手動） |
|---|---|---|
| `GET /api/v1/watermark` | 200：deployed_by=`VMware Cloud Foundation - VSRN`、version=`5.2.1.0-24307856`、managed_by=`vcf-m06-sddcm01.home.lab`、log_token=`VCF`、instance_id=608359e3-…、_create_user=admin | **404** error 600「Deployment Info Details could not be found」 |

→ Cloud Builder / SDDC Manager 部 NSX 時寫 watermark；手動部的沒有 → 被擋。SDDC Manager 關機不影響（只看 NSX 自己 DB）。
→ POST 一筆 watermark 可繞過（偽裝 VCF 部署，官方不支援）：**10-22 m07 實證成功**。
  POST `/api/v1/watermark`（deployed_by=VMware Cloud Foundation - VSRN / version=5.2.1.0-24307856 / managed_by=vcf-m07-sddcm01.home.lab / log_token=VCF / instance_id=uuid）→ 201；
  重跑 pre-check → **31944 消失，0 FAILURE，剩同樣 4 WARNING**（與 m06 一致）。證據 m07/watermark-test.txt、07-precheck-failures-after-watermark.json。
  還原：DELETE /api/v1/watermark。

## m07 — 手動部（vcsa-deploy + ovftool，從未進過 VCF）

- 09:33 第一輪：.mub 上傳中，09:40 proton 重啟、load 18 / 6 vCPU、VIP .165 掉 → 上傳中斷（/repository 無 9.1.1 目錄）
- 09:53 第二輪：改打 node IP .166，先等 cluster STABLE（≤30 分）再跑
- 結果：（待補）
