# m07（第二輪）— 手動部 VCF 5.2.1 BOM（不用 Cloud Builder）

使用者 10-21：「部完（m06）再手動部一個 同版本 不是用 Cloud builder 做的」
→ 選定：**vSphere + vSAN + NSX、3 台 ESXi、m07 段 IP 10.0.1.161-166**，不部 SDDC Manager / Edge。
舊 m07（vC 8U3g + NSX 4.2.2.1 升級測試）已於 10-21 刪除，文件留在 `E:\9.1\m07\`（配方可沿用）。

## 觸發條件
m06 bring-up 完成（E:\9.1\vcf521\PROGRESS.md）之後才開始。

## 版本（= VCF 5.2.1 BOM）
| 元件 | 版本 | 媒體來源 |
|---|---|---|
| ESXi | 8.0U3b 24280767 | `OneDrive\桌面\VCF\Nested_ESXi8.0u3b_Appliance_Template_v1.ova` |
| vCenter | 8.0U3c 24305161 | 本機沒有 → 從 m06 Cloud Builder（vcf-m06-cb01 10.0.1.203）appliance 內的 bundle 取 |
| NSX | 4.2.1.0 24304122 | 同上（CB 內）；E:\8 只有 4.2.2.1 不是同版 |
> E: 只剩 ~35 GB → 優先在 CB 上直接用 ovftool 部，不拉回本機

✅ 10-22 00:05 已確認 CB（vcf-m06-cb01 10.0.1.203，admin/root 密碼見 E:\9.1\vcf521\cb-m06.json）內有：
- `/mnt/iso/sddc-foundation-bundle-5.2.1.0-24307856/vcenter_ova/VMware-VCSA-all-8.0.3-24305161.iso`（12.4 GB，完整 installer ISO → 掛載後跑 `vcsa-cli-installer/lin64/vcsa-deploy`）
- `.../nsxt_ova/nsx-unified-appliance-4.2.1.0.0.24302016.ova`（12.1 GB）
- `.../esx_iso/VMware-VMvisor-Installer-8.0U3b-24280767.x86_64.iso`
- CB 有 `/usr/bin/ovftool`；`/` 可用 56 GB；SSH 工具 `E:\9.1\m07-521\ssh.py`（--su 走 su -）
- ⚠ PowerShell 呼叫 ssh.py 時遠端指令要用**單引號**（雙引號會被 PS 吃掉 `$B`）

## IP / DNS（10-21 已建 A+PTR，正反解 OK）
| 名稱 | IP |
|---|---|
| vcf-m07-esx01~03 | 10.0.1.161-163 |
| vcf-m07-vc01 | 10.0.1.164 |
| vcf-m07-nsx01（VIP）/ nsx01a | 10.0.1.165 / .166 |
| vMotion / vSAN / TEP | 192.168.171/172/173.0/24 VLAN0（沿用舊 m07 規劃） |

## 步驟（沿用 E:\9.1\m07 配方）
1. 3 台 nested ESXi（`E:\9.1\m07\Deploy-NestedESXi.ps1`，16 vCPU / 80 GB / cache 60 / cap 1000，samsung4t/wdblue4t/samsung4t）
2. 🔴 esx01 先 esxcli bootstrap vSAN（installer 的 new vSAN cluster 選碟頁會 0 顆碟）→ vCSA 部到 vsanDatastore
3. `Build-M07Cluster.ps1`：加 esx02/03、vmk0 開 vMotion+vSAN、disk group、VDS 8.0（vmnic1）、DRS、vSAN HCL 靜音
4. NSX Manager 單節點 → compute manager → TZ / uplink profile / TEP pool / TNP → host prep

## 決策
- 密碼：新元件一律 lab 標準雙寫（vC SSO/root、ESXi root、NSX admin/root/audit）；CB 是 9/18 那組（cb-m06.json）
- vCenter 用 CLI `vcsa-deploy`（在 CB 上跑，ISO 掛 /mnt/vcsa）→ 不建 DC/cluster → Build-M07Cluster.ps1 自己建 m07-dc / m07-cl01
- NSX 用 **medium**（m06 small 在 nested 餓死 → CEIP 步驟失敗）
- 授權不套（evaluation）；DRS FA、HA off

## 進度
- [x] DNS 6 筆 A+PTR（10-21）
- [x] m06 bring-up 完成（10-22 03:53）
- [x] 03:56 3 台 nested ESXi 8.0U3b 開機（Deploy-NestedESXi.ps1，log deploy-esx.log）
- [x] esx01 esxcli bootstrap vSAN（cache naa…a40=1000G cap / naa…65e=60G cache；FTT1+forceProvisioning）→ vsanDatastore 1 TB（esx01-vsan-bootstrap.txt）
- [x] 04:26 vcsa-deploy 成功（約 30 分）→ vCenter 8.0.3 build-24305161
- [x] 04:33 Build-M07Cluster.ps1：m07-dc/m07-cl01、3 台 Connected、vSAN 3/3 members 3 TB、VDS m07-vds01、DRS FA/HA off、HCL 靜音
  - 坑：PowerCLI 13.5 `Set-VsanClusterConfiguration` 沒有 -VsanEnabled → 用 `Set-Cluster -VsanEnabled $true`
- [x] 04:35-05:14 NSX 4.2.1 medium：CB 上 ovftool（約 40 分，經 nested vSAN 很慢）→ 05:35 STABLE（開機 21 分）→ VIP .165
- [x] 05:36-05:44 Configure-M07Nsx.ps1：CM vcf-m07-vc01 REGISTERED/UP → m07-uplink-profile → m07-tep-pool → m07-tnp（預設 overlay TZ + m07-vds01）→ m07-tnc → **3 台 host prep success**（7 分）
- [x] 驗證：NSX VIP 回 4.2.1.0.0.24304122；vmk10 TEP 192.168.173.11-13；nsx VIB ×24/台；vmkping ++netstack=vxlan -d -s 1572 全 0% loss（DUP 是外層 trunk promiscuous，正常）

## 📋 兩階段計畫（使用者 10-22 21:4x 定案）
**階段一：m07 現有這套走完正常路徑**（文件主線）
esx02 升完 → 升 vCenter 8.0U3c→9.1.1 → NSX Finalize → converge 成 VCF 9.1.1
（NSX 官方順序本來就是 MP → Host → vCenter → Finalize，Finalize 要求 vC 已 9.1）

階段一進度（10-22）：
- ✅ NSX UC 9.1.1 + watermark 補/還原/再補 + precheck（UI 截圖 01–25）
- ✅ NSX MP 9.1.1（UI START UPGRADE，16:1x–17:00；FTT0 下 dry run 順利，round 2 卡 45% 的那步過了）
- ✅ NSX Hosts 3/3（Maintenance / serial，20:09–21:49，每台約 30 分）
- ✅ vCenter 8.0U3c → 9.1.1.0.25712839（vcsa-deploy upgrade，spec `vcsa-upgrade-911.json`，temp IP .189，22:10–23:35；precheck-only 先過）
  - 新 VM `vcf-m07-vc01-911`（esx03）接手 10.0.1.164；舊 `vcf-m07-vc01` 已關機
  - NSX compute manager 自動重連：REGISTERED / UP / version 9.1.1
  - 坑：Host 升級（Maintenance）期間 DRS 把 vc01 從 esx01 搬到 esx03 → spec 的 source/target ESXi 要照現況填
- ✅ NSX Edges（無 Edge，仍須按一次 START UPGRADE 才會 SUCCESS，否則 Finalize 被擋「Cannot upgrade FINALIZE_UPGRADE until EDGE…」）
- ✅ NSX Finalize（10-23 08:33–08:35）→ product_version **9.1.1.0.25691509**
- 🔄 converge 成 VCF 9.1.1：使用者 10-23「要裝 9.1.1 的 installer」→ 不用 install9.1(9.1.0)
  - 08:50 部 `vcf-m07-inst01` 10.0.1.167（DNS A+PTR 已建；外層 .95 / ForNFS / Trunk-Nobinding；OVA `E:\9.1\VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova`）
  - 腳本 `Deploy-M07-Installer.ps1`（改自 m04；9.1.1 OVA 用 `$ovf.vami.SDDC_Manager.*` 物件路徑）；admin@local / root = lab 雙寫

**階段二：重裝 m07 測變化題**（文件附錄「不照官方順序會怎樣」）
重裝 → 部 NSX 4.2.1 → 只升 UC + MP → **host 完全不升** → 直接升 vCenter
→ 觀察是否被擋、擋在哪、錯誤訊息；使用者原問題：「主機沒升可以升 vc 嗎」

## 🔄 Round 3（10-22 11:3x 起）：整套重部重測 + UI step-by-step 截圖 + user guide
使用者：「整個重部重測試 把底層清掉」「m06 也移掉」「我要測這個 script 升級要 step by step cut 圖 包含這個 script 的使用也要變 user guide」「ui 你用 cdp 操作 要動的時候再叫我」
- 原因：round 2 MP 升級卡住 → NSX console kernel hung task（df / systemd-udevd blocked 240–360 秒，nested 慢碟 IO）；vSAN 本身 healthy
- 11:36 已刪：m06 esx01-04 + vApp Nested-VCF-Lab-wOEJKiCY + 8 筆 DNS；m07 esx01-03（DNS 6 筆保留）
- **保留**：vcf-m06-cb01（10.0.1.203，關機，在 /Datacenter/vm/VCF，DNS 留）= 5.2.1 BOM 媒體來源
- 計畫：重部 m07（同 round 2 配方）→ 使用者在 CDP Chrome 登入 NSX/vC 一次 → UI 走 UC 流程每步截圖（doc-shots/m07-r3/）→ watermark-curl-v1.sh 使用截圖 → user guide（docx）
- UI 規則：login 表單不代填；其餘 UI 全用 CDP/Playwright 操作

## Phase 2（round 2，已放棄）：升 9.1.1 → converge 成 VCF 9.1.1（使用者 10-22「全部做完」「升完繼續 host 和 vCenter」）
| 段 | 狀態 |
|---|---|
| UC 9.1.1 + precheck | ✅ 10:33（無 watermark → 31944 FAILURE；POST watermark 後 0 FAILURE，見 E:\9.1\nsx-911-precheck\RESULTS.md） |
| 1 NSX MP → 9.1.1 | 🔄 10:52 啟動；11:03 dry run SUCCESS + 本地備份 → 因 pause_after_each_group 暫停 → MP 改 false 後 continue，11:05 playbook 升 nsx01a |
| 2 NSX HOST | ⏳ `E:\9.1\nsx-911-precheck\m07-host-chain.ps1`（背景，等 MP SUCCESS ≤150 分 → plan continue → HOST；HOST 仍 pause_after_each_group=true → 停在 FINALIZE 前），log `m07\host-upgrade.log` |
| 3 vCenter 8.0U3c → 9.1.1 | ⏳ host 完成後手動接（VCSA 9.1.1 ISO，要 temp IP，舊 m07 預留 .189） |
| 4 Finalize | ⏳ 需 vC 9.1 |
| 5 converge（install9.1 10.0.1.4，VCF Installer 9.1.0.0.25371088） | ⏳ 先確認 depot；watermark 是偽造的，import 階段有未知數 |

坑：
- MP 升級前 precheck 擋「service account or trust disabled for compute managers」→ CM PUT `create_service_account=true`（+ oidc）→ 等 UP → 重跑 precheck
- 🔴 MP 底下有多個 group（Data Migration Dry Run / Prepare Nodes / manager / 70+ migration tasks），`pause_after_each_group=true` 會在 dry run 後就停 → MP 要設 false，只在 HOST 設 true 當 FINALIZE 前的檢查點
- precheck 時 m07 NSX iowait 74%（nested vSAN 慢碟）→ Extracting Bundle Signature 很慢，不是當機

## ✅ 完成（10-22 05:45）
| 元件 | 狀態 |
|---|---|
| ESXi ×3 | 8.0.3-24280767，m07-dc / m07-cl01，vSAN OSA 3 TB，DRS FA，HA off，evaluation |
| vCenter | vcf-m07-vc01 10.0.1.164，8.0.3-24305161（tiny） |
| NSX | vcf-m07-nsx01a .166 / VIP vcf-m07-nsx01 .165，4.2.1.0.0.24304122（medium 6 vCPU/24 GB），host prep 完成，無 Edge |
| 帳密 | 全部 lab 標準雙寫（vC administrator@vsphere.local/root、ESXi root、NSX admin/root/audit） |
- CB vcf-m06-cb01 上 /mnt/vcsa 仍掛著 VCSA ISO（loop，唯讀），/root/m07 有 vcsa json 與 log；不用時可 `umount /mnt/vcsa`

## 2026-10-23 recovery after .95 reboot — network root cause & fix
- Symptom: after host .95 reboot, nested ESXi hosts reachable (vmk0 on VDS, vSAN healthy),
  but vCenter(.164) + NSX(.166) VMs powered on w/ guest IPs yet NOT pingable.
- ROOT CAUSE: both VMs were on vSwitch0 / "VM Network" (standard switch). The earlier
  vmk0+vmnic0 -> VDS migration left vSwitch0 with NO uplink (vmnic0 moved to VDS),
  so the VMs were orphaned (esxcli port list: Team Uplink = void).
- Host-direct govc nic move to VDS pg-mgmt FAILED ("Invalid configuration for device 0")
  because m07-vds01-pg-mgmt is earlyBinding (static) — needs vCenter to assign a port.
- FIX (host-level, per host):
  esx03: esxcfg-vswitch -Q vmnic0 -V 37 m07-vds01 ; esxcfg-vswitch -L vmnic0 vSwitch0
  esx01: esxcfg-vswitch -Q vmnic0 -V 35 m07-vds01 ; esxcfg-vswitch -L vmnic0 vSwitch0
  -> VM Network regains vmnic0 uplink; vmk0 fails over to vmnic1 (host stays up).
  -> vCenter .164 up (UI 200/SDK OK), NSX .166 pings.
- THEN via vCenter (now reachable): Set-NetworkAdapter both VMs -> m07-vds01-pg-mgmt
  (static binding handled by vCenter). Both stay reachable; now DVS-backed.
  => satisfies converge req "vCenter VM must be connected to a DVS".
- Post state: esx01/esx03 VDS uplink=[vmnic1] only (vmnic0 parked on vSwitch0, VM Network empty);
  esx02 VDS=[vmnic0,vmnic1]. All hosts Connected. vCenter 9.1.1 build 25712839.
- WAITING: NSX manager services restarting (22/443/VIP .165 not up yet). Poller: nsx-ready.log.
- NEXT: once NSX up + VIP .165 up -> verify thumbprints -> re-run converge validation.

## 2026-10-23 NSX recovered + lab converge-ready
- NSX services were all `inactive` after being orphaned ~30min (proton/proxy down, no 22/443).
  Guest net was fine (eth0 .166, route, ping gw OK) -> rebooted appliance via Invoke-VMScript.
- After reboot: overall_status 000 -> DEGRADED -> STABLE (~5 min). VIP .165 node API = 200.
- Thumbprints ALL match spec (SHA-256):
  vCenter .164  = 70:A5:...:56:07  ✅
  NSX node .166 = 85:FA:...:36:B9  ✅
  NSX vip  .165 = 85:FA:...:36:B9  ✅
- LAB SIDE CONVERGE-READY: vCenter 9.1.1(25712839) on VDS, NSX STABLE, 3 hosts Connected,
  vCenter+NSX VMs DVS-backed on m07-vds01-pg-mgmt.
- BLOCKED ON: installer UI (10.0.1.167) session expired -> login page. Asked user to log in
  (admin@local / lab pw); then drive converge wizard via CDP, cut screenshots -> guide Part F.

## 2026-10-23 converge validation (JSON/API path via browser session token)
- Path: reuse user's installer UI login -> extract sessionStorage.sessionDetails.accessToken
  -> curl host API https://10.0.1.167/v1/... (no password typed). GET /v1/sddcs = empty (ok).
- Validation iterations:
  v1 FAIL: VSP_UNABLE_TO_DETERMINE_DEPLOYMENT_NETWORK (vCenter not on DVS) -> FIXED earlier (VM->VDS).
  v2 FAIL: VSP_IPV4_POOL_TOO_SMALL (small mgmt needs >=12) -> pool 176-182(7) -> 176-189(14).
  v2 also: portgroup SDDC-DPortGroup-VM-Mgmt invalid -> xRegionNetwork.networkName=m07-vds01-pg-mgmt.
  v2 also: cluster m07-cl01 not vLCM image based (BROWNFIELD_VSPHERE_CHECK) + VUM vSAN 3-node unsupported.
- vLCM fix (cluster domain-c9): baselines gone in 9.x. Flow that worked:
  POST /api/esx/settings/clusters/domain-c9/software/drafts -> draft "1"
  PUT  .../software/drafts/1/software/base-image  {"version":"8.0.3-0.70.24674464"} (8.0U3e, from vC depot)
  POST .../software/drafts/1?action=commit&vmw-task=true  {"message":"..."}  -> task SUCCEEDED
  => GET .../software now returns committed base_image (was 404 "Image not found") = image-based now.
  (NOTE: /enablement/software still says enabled:false but /software has the image -> that's the real indicator.)
- storage WARNING: 4182 GB avail < 4364 GB required (~182 short) - warning only; old powered-off
  vcf-m07-vc01 (pre-upgrade 8.0 vCenter) still on datastore, candidate to delete to free space.
- v3 submitted (512ade4e) after portgroup+pool+vLCM fixes. User: "過了就直接送出部署" -> auto POST /v1/sddcs on pass.
