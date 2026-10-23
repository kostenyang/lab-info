# m07 context — 決策、資源、地雷

## 關鍵資源(來源:CONTEXT-vcf91-lab.md / m04 PROGRESS.md / 10-21 實測)
| 項目 | 值 | 來源 |
|---|---|---|
| 外層 vCenter | labvc8 10.0.0.101(帳密見 memory vcf91-lab-state-20261016,不抄值) | CONTEXT §1.1 |
| 外層 host | 10.0.0.95(32 thr / 1 TB;10-21 CPU 34% MEM 21%) | govc 10-21 |
| portgroup / folder | `Trunk-Nobinding` / `VCF` | m04 PROGRESS |
| mgmt 網段 | 10.0.0.0/23,gw 10.0.0.1,DNS 10.0.0.200,domain home.lab | m04 PROGRESS |
| NTP | **10.0.1.254**(不要用 .200) | CONTEXT §4 |
| depot | http://10.0.0.61:8888/PROD/COMP/NSX_T_MANAGER/ 有 9.1.1.0 + 0100 的 .mub/.pub | curl 10-21 |
| vCenter 8U3g ISO | `E:\8\VMware-VCSA-all-8.0.3-24853646.iso`(8.0.3.00600 = U3g,KB 326316) | 掛載 10-21 |
| vCenter 9.1.1 ISO | `E:\9.1\VMware-VCSA-all-9.1.1.0.25712839.iso` | ls |
| NSX 4.2.2.1 OVA | `E:\8\nsx-unified-appliance-4.2.2.1.0.24765087.ova`(10-21 使用者下載中) | ls |
| ESXi | 使用者 10-21:CB 裡有 U3g → 開 `vcf-m01-cb01-conv`(10.0.1.3)去拿;備案 `OneDrive\桌面\VCF\Nested_ESXi8.0u3b_Appliance_Template_v1.ova` | 對話 |

## IP 規劃(使用者 10-21 定案:vcf-m07 + 10.0.1.161-199)
.161-.163 已確認 ping 不通、只有過期 vcf-m05-* DNS。
| IP | 名稱 | 用途 |
|---|---|---|
| 10.0.1.161-163 | vcf-m07-esx01~03 | nested ESXi |
| 10.0.1.164 | vcf-m07-vc01 | vCenter |
| 10.0.1.165 | vcf-m07-nsx01 | NSX VIP |
| 10.0.1.166 | vcf-m07-nsx01a | NSX node |
| 10.0.1.167-182 | (預留) | converge 用:SDDC Mgr / Ops / VSP pool |
| 10.0.1.187-188 | vcf-m07-test01/02 | 測試 VM mgmt NIC |
| 10.0.1.189 | (預留) | vCenter 升級 temp IP |
| 192.168.171.0/24 VLAN0 | vMotion | nested VDS |
| 192.168.172.0/24 VLAN0 | vSAN | nested VDS |
| 192.168.173.11-20 VLAN0 | NSX Host TEP pool | |
| 172.16.77.0/24 | overlay 測試 segment `m07-ov-test` | test01 .11 / test02 .12 |

## 決策 + 理由
- D1 不部 Edge(使用者)。手冊「步驟 4 Edge」這次仍無法驗證。
- D2 ESXi 不升、不重開、不 vMotion(使用者:「升級 in place 升級 不要重開 esxi 和 vmotion」)→ NSX Host 升級用 **In-Place** 模式;ESXi 全程 8.0U3x。
- D3 converge 先不做,元件升完再問(使用者回答沒選「完整」)。
- D4 3 台 nested(vSAN OSA 最少 3 台;in-place 不需要 MM 餘裕)。
- D5 用測試 VM 持續 ping 量 in-place 的資料面中斷。
- D6 叢集用 **vLCM baseline(不選 single image)**:NSX 4.2 文件說 in-place 只支援 baseline 叢集(VCF 5.2.1+),image 叢集走 vLCM remediation 會要 MM。converge 若要做,之後再轉 image。
- D8 目標改 **9.1.1.0100**(NSX 25762940 / vC 25784172),使用者 10-21。
- D9 ESXi 要 U3g(使用者):來源 = CB 5.2.2 OVA 內 esx_iso(只有 ISO,沒有 depot zip)→ esxcli 不能用,改 vCenter Lifecycle Manager baseline 匯 ISO remediate(NSX 安裝前做,允許重開)。VCF 5.2.2 BOM = vC 8U3g + ESXi 8U3g(+ NSX 4.2.3,但使用者指定 4.2.2.1)。
- D10 使用者 10-21 授權:**m07 內的產品 EULA / Foundation Agreement 直接接受**(vLCM remediation、NSX 9.1.1 bundle、vCenter 9.1.1 installer),截圖即可,不必逐一再問。只限 m07。
- D7 DRS **不要 Fully Automated**(設 Partially / Manual):文件說 DRS 全自動叢集上,UC 會要求 host 進 MM → 就不是 in-place 了。
- 來源:NSX 4.2 upgrade doc GUID-4CD72B28(in-place 期間不能 vMotion 進出、不能建新 VM、資料面可能短暫中斷);KB 322474(in-place 失敗要重開)。

## 已知地雷(本次)
### 地雷 10-21 — VCSA 8U3g 安裝程式「Install on a new vSAN cluster」Claim disks 頁 0 顆碟
- 現象:Failed to query disks from host;installer log `TypeError: Cannot read properties of null (reading 'find')`;vdq -q 三顆碟其實都 Eligible
- 解法(已做):esx01 上 esxcli 手動 bootstrap vSAN(capacityFlash tag → cluster new → storage add → policy FTT1+forceProvisioning)→ 安裝程式改選 existing datastore = vsanDatastore(它照樣建 m07-dc/m07-cl01)。輸出存 doc-shots/m07/cli/vc8-esx01-vsan-bootstrap.txt
### ⚠ 預期擋點 10-21 — standalone NSX → 9.x 的 UC precheck(別的 session 已遇到)
- memory nsx-manual-upgrade-911-doc:UC precheck ERROR「Upgrade of standalone NSX deployment TO VCF 9.X is not supported… import into VCF… min NSX 4.1.0.2+」;查無 skip KB(KB425164/402584/457950)
- 本 lab 要實際重現並截圖;擋住後下一步(import/converge 進 VCF 再升 vs 其他)要問使用者

### 🔑 發現 10-21 19:39 — 上傳 .pub 會把 UC 升級(T4 關鍵)
- 傳 9.1.1.0 .pub(Check Upgrade Readiness → Download with Remote URL)後:summary `upgrade_coordinator_version` 4.2.2.1 → **9.1.1.0.25691516**、`upgrade_coordinator_updated: true`、`pre_upgrade_bundle_version`=`target_version`=9.1.1.0.25691509
- 期間 manager/search 服務 DOWN ~5 分(19:43-19:48,API error 101),UI「SHOW UPGRADE HISTORY」由灰變可按
- → .pub 不是被動檔案;「清掉回原狀」要連 UC 版本一起看。證據 doc-shots/m07/cli/t4-911-*.txt

### 🔴 結果 10-21 19:55 — 9.1.1.0 .pub pre-check(All Pre-Checks)
- .pub 不留檔:NSX 從 URL 下載後解到 `/repository/9.1.1.0.0.25691509/`(1.1 GB;UC/ 內有 `bundle_type_pub`、`uc_rollback`、`uc_helper.py`;Manager/dry-run;HostComponents/esx90)
- MP:**FAILURE vcfEnvironmentCheck (error 31944)**「Upgrade of standalone NSX deployment to VCF 9.X is not supported. Please import your NSX deployment into VCF…Minimum NSX 4.1.0.2+」→ needs_ack=false(不能 acknowledge)
- MP:FAILURE repoSyncStatusCheck (30446) repo sync 未完成(暫時性)
- HOST ×3:**FAILURE drsClusterCheck (30120)「DRS must be enabled and fully automated…或手動進 MM」** → 跟使用者要的「不進 MM / 不 vMotion」衝突,要看 .mub 的 host upgrade mode(In-place)是否還擋
- WARNING ×4(needs_ack):FPROT context profile(KB410572)、NSX-V migration 不支援、MP API 棄用、Malicious IP DFW rule 會被停用
- JSON:doc-shots/m07/cli/t4-911-pub-precheck-failures.json

### ✅ T4 答案 10-21 12:00Z — .pub 傳了怎麼回原狀(9.1.1.0 實測)
- 公開 API 沒有 delete bundle / rollback UC(spec 只有 cancel_upload、plan?action=reset、abort_pre_upgrade_checks)
- 可用:NSX Manager root 跑 `bash /opt/vmware/upgrade-coordinator-tomcat/bin/call_uc_rollback`(內部腳本,呼叫 /repository/<current_version>/UC/uc_rollback → uc_upgrade_4.2 重裝舊 UC)
  - 結果:UC 停→webapp 重解 war→`uc.version=4.2.2.1.0.24765087`;API summary 回到 `upgrade_coordinator_version 4.2.2.1`、`upgrade_coordinator_updated false`、無 pre_upgrade_bundle_version
  - rc=1 的原因:最後 JRE 步驟 `tar: /repository/4.2.2.1.0.24765084/UC/jre/openjdk*: No such file`(4.2.2.1 repo 沒帶 openjdk),無害;但因 rc≠0,腳本不會 `rm -rf /repository/9.1.1.0.0.25691509`(1.1 GB 留著,可手動刪)
  - 跑完要 `service upgrade-coordinator start`(腳本停了沒啟)
- 證據:doc-shots/m07/cli/t4-911-call-uc-rollback.txt、t4-911-summary-after-uc-rollback.json

### ✅ 解 10-21 20:15 — repoSyncStatusCheck(30446)
- 暫時性:.pub 上傳 → manager 重啟,precheck 跑在 repo 還沒 sync 完的時間點。狀態 API `GET /api/v1/cluster/nodes/{node-id}/repo_sync/status` 其實已 SUCCESS;
  再 `POST /api/v1/cluster/node?action=repo_sync` 跑 ~8 分(Collecting → Verifying integrity → SUCCESS)。重跑 precheck 即可。
- 證據:cli/fix-reposync-before.json / fix-reposync-after.json

## 已知地雷(沿用)
- UC 頁面 zh-TW 空白 → 瀏覽器英文;EULA 要接受兩次;Manager 98% error 26 = CM DOWN
- nested vSAN HCL 黃燈會擋 vLCM → 先靜音(短 id)
- Git-Bash 路徑改寫 → `MSYS_NO_PATHCONV=1`
