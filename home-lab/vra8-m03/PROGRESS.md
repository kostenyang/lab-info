# vRA 8.18.1(新的一套,裝在 m03 管理網域)→ import 進 VCF 9.1.1 fleet → 升級 VCF Automation 9.1.1

> 狀態檔(對抗 context 壓縮)。開始 2026-10-07。
> 使用者:「然後再import vra8 再升9」「要另外裝一套8 來升 不要用那套 但是可以先關機」(舊 vra/vidm/vrlcm 已關機)。
> 前情:同一個 m03 剛用 KB 441333 三步把 greenfield VCFA 移除(⚠ KB 441127:移除後再加回可能 NULL infrastructure properties)。
> 文件要 step-by-step + 截圖(CDP/Playwright 接有頭 Chrome);實作走 UI 為主。

## 規劃
| 角色 | FQDN | IP | 規格 |
|---|---|---|---|
| vIDM 3.3.7 | vcf-m03-vidm01.home.lab | 10.0.1.103 | xsmall 4 vCPU / 8 GB |
| vRA 8.18.1.36791 | vcf-m03-vra01.home.lab | 10.0.1.104 | medium(12 vCPU / 54 GB) |
| 升級用 runtime IP(之後) | — | 10.0.1.96–100(舊 VCFA pool,已空) | — |
| 升級用 runtime FQDN(之後) | vcf-m03-auto-platform.home.lab | 10.0.1.73(pool 外,已存在) | — |
- 網路:10.0.0.0/23 GW 10.0.0.1、DNS 10.0.0.200、NTP 10.0.1.254;portgroup vcf-m03-cl01-vds01-pg-vm-mgmt;
  datastore vcf-m03-cl01-ds-vsan01(FTT0);host esx01。媒體:Easy Installer ISO 掛 F:(F:\ova\vidm.ova / vra.ova)。
- VCF Instance 名稱 = `vcf-m03-instance`。fleet 目標版本 9.1.1.*。VCF Ops 未註冊(eval)。
- vRA license 用使用者之前給 vra9 的那組(JV2TK-…,在舊 session transcript)。

## 進度
- [x] DNS A+PTR(vidm01 .103 / vra01 .104)
- [x] 1a vIDM ovftool 部署(12:45→12:50)
- [x] 1b vRA ovftool 部署(12:45→12:57;12 vCPU/54 GB,esx01)
- [x] 2 vIDM setup wizard(admin/root/sshuser + Internal DB,~60 秒)— Playwright press_sequentially + 讀回 .value 驗證;
      admin API login 200、sshuser SSH OK;vIDM 時鐘 = 10.0.1.254(本機 AD 快 2.5 分)
      vIDM 憑證有 SAN;SHA256 5F:53:86:09:79:69:2D:D2:54:D9:9B:40:1F:30:29:C4:F4:E2:A0:B3:12:78:28:47:B5:EC:8D:F2:3B:71:74:CC
- [x] 3a first boot 完成(04:55→05:19 UTC,docker load 最久);NTP 10.0.1.254;k8s node Ready
- [x] 3b vracli vidm set(tenant VCF-M03-VIDM01,client prelude-h0Vo3ARJI4)+ license add(Valid True)
- [x] 3c deploy.sh(05:20→06:04 UTC,55 pods Running,"Prelude has been deployed successfully")
- [x] 4 測試資料(UI,Playwright):cloud account vcf-m03-vc01(VALIDATE→ACCEPT 憑證→勾 dc01+自動 cloud zone)、
      project m03-lab、flavor small 1C/2G、template m03-demo-vm v1 released;API 基準 cli/04;
      provisioning DB 有 /config/trusted-certificates/9a9b34…(vCenter 憑證已持久化 → KB 425489 應不擋)
      UI 坑:內容在 iframe(provisioning-ui / blueprint-ui);按鈕 textContent 是 "New"(CSS 大寫)→用 id;
      下拉選項文字被 <b> 拆開 → 鍵盤 ArrowDown+Enter;ACE 編輯器用 ace.edit().setValue();
      別的分頁的 JS dialog 會讓 Playwright driver 斷線(重連即可)
- [x] 5 import ✅ SUCCEEDED 06:29:09→06:34:30 UTC(5m21s);Components 9→10(VCF Automation vcf-m03-vra01 8.18.1.36791.24282366)
      🔑 KB 441127 風險沒出現(KB441333 移除後再 import 照樣成功);來源 vRA 未被動到(200/無快照/資料在)
- [x] 6 Sync(METADATA_AND_PLAN_SYNC_WORKFLOW)→ 🔴 Upgrade 分頁要 **重新整理頁面** 才出現 VCFA 列(8.18.1 → 9.1.1.0.25714559,Pending configuration)
      CONFIGURE:Individual IPs 10.0.1.96–100、FQDN vcf-m03-auto-platform(.73)、密碼覆蓋成 lab 標準 → 30 秒變 Ready for upgrade
- [x] 7 RUN PRECHECKS ✅ 第一次就全過(06:40→07:16 UTC,36 分):8 stages 全 SUCCEEDED(含 import_vcfa、vmsp_run_vcfa_prechecks);
      Precheck details 12 項 Passed(App Compat 6/6、Health 8/8、Source Validation 4/4、Topology 18/18…)→ cli/07*
      ⇒ 管理網域內 + UI 接受過端點憑證 = 乾淨路徑,不用冷遷移、不用 KB 425489
- [x] 8 UPGRADE ✅ 一次成功:07:18:10 → 12:05:43 UTC(4h47m33s),18 stages 全 SUCCEEDED,**沒有假失敗**
      最久:deploy_vmsp_cluster 1h17m、vmsp_stage_package 1h05m、vmsp_upgrade_vcfa 57m;9.1.1 多了
      vmsp_deploy_vcd_migrator(13m)/post_upgrade_inventory_sync/vmsp_unstage_package/vmsp_delete_component_vcfa
      來源 18:40:48 HKT 自動快照、18:48:55 自動關機;~18:54 新 gateway 接 10.0.1.104;19:32 應用部署完成 → 中斷約 44 分
      新 runtime vcf-m03-auto-platform-ms9zh 10.0.1.98(24C/96G,單節點),comp vcfa 9.1.1 Running(m02 是 8.0.0 Unknown)
- [x] 9 驗證:Fleet Components 9.1.1.0.25714559(要 reload)/ tenant OIDC→vIDM 登入 / cloud account OK / project·flavor·template 在 /
      API 盤點 ID 全相同 / provider admin 登入 OK / /tm API 200
- [x] docx E:\9.1\vRA8-Import-Upgrade-VCFA911-m03-StepByStep.docx(35 頁 39 圖,LibreOffice QA 過)
(歷程)- [~] 8 UPGRADE(列上按鈕,無確認框)15:20 本機 → 任務 01a1153a-16d6-74e2-938a-eca9e05b5f99(AUTOMATION_UPGRADE,07:18:10 UTC 起)
      輪詢 logs/poll-upgrade.log(b1j67gi46,連續 8 次錯就 POLL-GAVE-UP);vCenter 時間線 logs/infra-timeline.log(bmid13bk8)
      Monitor 盯 stage 轉換(30 分要 re-arm)

## 其他(同日)
- KB441333 成品已複製推到 public kostenyang/debug-vcf9.1(commit 8962747):deliverables/kb441333-vcfa-removal + scripts/kb441333-vcfa-removal;
  README 路由表+篇章總覽各加一列;cleanup_component.py(Broadcom Confidential)不收錄;secret 掃描乾淨
  (依 feedback-debug-repo-placement:KB/除錯成品放 debug-vcf9.1,原 repo 保留不動)
- vra-lifecycle 的 kb441333-three-step-m03 分支是否 merge main:使用者尚未回覆
- 文件產生器 E:\9.1\tools\docx-build\build-vra8-import-upgrade-m03.js(升級段落 __UPGRADE_*__ 佔位);流程圖 diagrams/flow.html(__UPG_TIME__ 佔位)
(舊)- [ ] 5 import(VCF Ops → Build › Lifecycle › VCF Management › Components › Add Component › VCF Automation › Import 8.x)
      9.1.1 精靈欄位 id:#deployment-type-import / #vcf-instance / #primary-node-fqdn-or-ip / #primary-node-root-password
      (舊 9.1.0 是 #fqdn);NEXT → Certificate Security Alert(CN=Client,one-off CA)→ TRUST → Summary → FINISH(14:31 本機)
      validate 任務 SUCCEEDED;INSTALL_COMPONENTS_WORKFLOW 01a1150d-3479-722e-9ab1-80d8b3c47e16 RUNNING(06:29 UTC 起)
      輪詢:scripts/poll_fleet_task.py → logs/poll-import.log
      Ops 登入:#userName-inputEl / #password-inputEl / #loginBtn(authSelector 預設 Local Account);session 會過期
- [ ] 6 Sync → Upgrade 分頁 Configure(IP / FQDN / 密碼)
- [ ] 7 Run Prechecks(可能要 KB 425489 端點憑證腳本)
- [ ] 8 Upgrade(上次 m02 7h55m + fleet 假失敗 KB 441246)
- [ ] 9 驗證 + docx + git

## 證據
- cli/ 指令輸出(密碼遮蔽)、shots/ 截圖、scripts/ 部署與輔助腳本、logs/ 原始 ovftool log
