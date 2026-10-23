# VCF 5.2.1 重部（m06 段）— 2026-10-21 起

## 目標
用 repo `kostenyang/vcf9-lab-automation` 的 `autodeployvcfm02.ps1`（William Lam）在外層 labvc8 部一套 VCF 5.2.1 nested 管理網域。
使用者 10-21 指定「用 m06 的 IP 來做」（原本先用 m01 段，部到一半改掉）。

## 決策
- 腳本：`E:\9.1\vcf521\autodeployvcf521m06.ps1`（repo 那支的複本，repo 不動）
- IP（DNS A+PTR 10-21 新增並驗過；m06 原本是 9.1 環境，10-17 已拆，DNS 已清空）：
  | 角色 | FQDN | IP |
  |---|---|---|
  | ESXi | vcf-m06-esx01~03 | 10.0.1.195-197 |
  | ESXi #4（5.2 最少 4 台） | vcf-m06-esx04 | 10.0.1.202（m06 時代是只為過驗證的 ops01 位置，沒部過） |
  | vCenter | vcf-m06-vc01 | 10.0.1.198 |
  | NSX VIP / node | vcf-m06-nsx01 / nsx01a | 10.0.1.199 / .200 |
  | SDDC Manager | vcf-m06-sddcm01 | 10.0.1.201 |
  | Cloud Builder | vcf-m06-cb01 | 10.0.1.203 |
  | vMotion / vSAN | （腳本原值） | 10.0.3.5-8 / 10.0.4.5-8，VLAN 0 |
- JSON 內物件名（cluster/VDS/TZ/folder/rp）全改 vcf-m06-*，sddcId vcf-m06
- 外層 host 固定 10.0.0.95；esx01/03→vmfs-samsung4t、esx02/04→vmfs-wdblue4t、CB→ForNFS
- 規格 4×12 vCPU / 96 GB / 100+700 GB thin；mgmt untagged on Trunk-Nobinding
- 媒體：桌面 VCF\ CB 5.2.1.0-24307856 + Nested_ESXi8.0u3b
- 帳密：見腳本（lab 標準），不抄進本檔

## 進度
- [x] m07 移除（3 台 nested + 8 筆 DNS；E:\9.1\m07、doc-shots\m07 保留）
- [x] 第一次用 m01 段部到 CB 上傳中 → 使用者改指定 m06 → 中止、4 台 m01 ESXi + 半成品 CB 已 destroy（m01 DNS 保留，只多補了 esx02-04 PTR）
- [x] m06 DNS 9 筆 A+PTR
- [ ] 跑部署腳本（背景，log: vcf521-m06-deployment.log / run-console-m06.log）— 4 台 ESXi 已開，CB 上傳中
- [x] nested ESXi ping+443 全通（不用 toggle promiscuous）；8.0.3-24280767、NTP 10.0.1.254、cache/capacity 都是 ssd
- [x] 23:12 第一次 bring-up 卡 auth：`POST /v1/tokens` → `invalid csrf token`（那是 9.x Installer API）
  - 🔴 根因 1：CB 5.2.1 API = **Basic auth**（9/18 成功版 `E:\9.1\vcf521-conv\bringup-521-conv.ps1` 早寫了）
  - 🔴 根因 2：**PowerCLI Import-VApp 會丟掉 CB 的密碼屬性** → CB 沒 admin 密碼；9/18 改用 `govc import.ova -options`（InjectOvfEnv）匯 CB
  - 🔴 根因 3：repo 腳本的授權碼（<key>…）9/18 已換成 <key>… 那組才過 → vcf-config.json + 腳本都換了（舊版 vcf-config.json.bak-oldkeys）
  - CB 密碼 = 9/18 那組（見 cb-m06.json），bring-up 腳本已改 Basic + 先做一次 auth 測試
- [x] 刪掉沒密碼的 CB → govc 重匯 vcf-m06-cb01（cb-m06.json，log cb-import-m06.log）
- [x] m02 全關（使用者 10-21「m02 關掉 / 就關 不重要」）→ shutdown-m02.ps1，log shutdown-m02.log；排程 VCF-M02-* 都 Disabled
- [ ] 之後：手動部第二套同版（不用 CB）→ 見 `E:\9.1\m07-521\PROGRESS.md`（vSphere+vSAN+NSX、3 台、m07 段 .161-166）
- [ ] 使用者 10-21：「裝好後 把sddc manager 關掉」→ bring-up 成功後自動跑 post-bringup-m06.ps1（guest shutdown vcf-m06-sddcm01，log post-bringup-m06.log）
- [x] 23:53 CB Basic auth OK → validation 8e4cbe11 **SUCCEEDED**（validation-m06.json）
- [~] 10-22 00:01 bring-up 送出，sddc task **8e31305c-55c1-44d7-980e-f6856abac846**（log bringup-m06.log；`pwsh bringup-m06.ps1 -Mode status` 可接手監控）
- [x] 01:57 bring-up **COMPLETED_WITH_FAILURE** @ 98/161「Configure CEIP on NSX Data Center Managers」
  - error FAILED_TO_CONFIGURE_CEIP：common-service upstream connect error 111 / error_code 98
  - 根因：NSX `small`（4 vCPU/16 GB）在 nested 裡 mem 14/15 GB、load 8；node service `telemetry` 是 stopped → `/api/v1/telemetry/config` 500/逾時
  - 處置：手動 start telemetry（running）→ `retry-chain-m06.ps1`：等 telemetry API 200（≤40 分，否則 restart 一次）→ `bringup-m06.ps1 -Mode retry`（PATCH /v1/sddcs/{id}）→ 成功再關 SDDC Manager
  - 下次部 5.2.1 nested：spec `nsxtManagerSize` 考慮用 `medium`
  - 02:38 等 40 分 telemetry 仍 500；phonehome-coordinator log「Node has not joined the cluster yet… membership: []」（MONITORING UNAVAILABLE）；restart phonehome 10 分仍不行
  - 02:5x → `resize-nsx-and-retry.ps1`：nsx01a guest shutdown → 6 vCPU / 24 GB（medium）→ 開機 → 等 STABLE+telemetry（≤60 分）→ PATCH retry → 成功關 SDDC Manager
  - 03:17 NSX medium 開機 9 分後 STABLE + telemetry OK → PATCH retry → **03:53 COMPLETED_WITH_SUCCESS 161/161** ✅
- [x] 03:53 vcf-m06-sddcm01 guest shutdown → poweredOff（govc 再查確認）；開著的：vc01、nsx01a、vCLS×2
- 現況：vC 8.0.3-24305161 / vcf-m06-dc01 / vcf-m06-cl01（4 台 ESXi 8.0U3b，vSAN）；NSX 4.2.1 單節點已改 medium 6 vCPU/24 GB；CB vcf-m06-cb01 仍開（m07 要用它的 bundle）
- 使用者 10-21 23:4x「我先睡 你繼續裝」：.95 多開 VM 不動；m06 完成 → 直接手動部 m07；validation 可 skip 的 nested 項目可自行處理
- [ ] 使用者 10-21：「跑完直接 bring-up」→ `pwsh bringup-m06.ps1 -Mode auto`（wait CB → validate → 無 FAILED 就 deploy → 監控）
  - 6/20 教訓：密碼錯一直試會 CLIENT_IP_BLOCKED → 腳本 401 就停；CB 首開要 10-15 分鐘才有 API
