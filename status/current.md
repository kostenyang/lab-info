# Lab Status — Current

Last updated: 2026-06-28

---

## rtolab

**Repo**: https://github.com/kostenyang/rtolab

| Layer | Status | Notes |
|-------|--------|-------|
| Layer 1 (nested ESXi prep) | Partial | Scripts exist; vSAN/LSOM settings applied |
| Layer 2 (bringup) | Active | VCF 9.1 full Option B; SDDC `a0ca66a4` completed 2026-06-07 |
| Layer 3 (post-bringup) | In progress | Runbooks written; VCFA deployed; VKS bootstrap WIP |
| Layer 4 (day-2) | Complete | Batch ESXi upgrade 9.0→9.1 implemented |
| Layer 5 (VKS) | Planned | IP reservations done; scripts scaffolded |
| VCF 5.2.1 (521b / 521c) | ⛔ **DELETED 2026-09-01** | 521b 於 2026-08-28/29 手動升級為純 vSphere 9.1（vCenter 9.1.0 b25417926 + ESXi ×4 9.1.0 b25370933），文件產出後兩套 nested host（8 台 VM / 3.5 TB）**永久刪除**。留下 `kosten-vcf521-avi`、`vcf-cloudbuilder-521`（關機）。手冊與踩雷：[debug-vcf521 03-upgrade-8.0u3-to-9.1.md + guide/](https://github.com/kostenyang/debug-vcf521) |
| VCD **10.6.2** | Clean-redeployed | 2026-07-23 wiped 10.6.1 → fresh OVA → patched to **10.6.2** (build 25442100). Appliance @ .60 up, provider login OK. Only **lab.com vCenter (vcsa.lab.com) + NSX (nsx.lab.com)** re-registered; **no PVDC/tenant chain built** (deferred per user). Old 521b chain gone with the wipe. |
| SSP 5.1.2 (vDefend) | Installer up · License Hub loaded | Installer appliance @ **.66** (`kosten-ssp`), redeployed 2026-06-17 (moved off `.55` — collided with stale 521 `kosten-vcf521-sddc` reservation). **License Hub (LICENSE bundle 5.1.2-0.0-25400319, 4.46 GB) uploaded to depot → READY** via depot REST API (`POST /sspi/bundles/remote?type=LICENSE`, server-side pull). depot now has INSTALLER (IN_USE) + LICENSE (READY). **platform stand-up pending** (run wizard · NSX target .13 · node IPs from a 3-way-clean block, NOT .55-.59) |

**VCF 9.1** (primary): ✅ **rebuild COMPLETED_WITH_SUCCESS 2026-06-29** — sddc id `e4740530-1865-43f2-9993-245e577d40f4`, sddcId `vcf-m02`. **All 8 milestones green** (vCenter `.11`, SDDC `.10`, vSphere cluster, NSX `.13` [258 DFW groups], VCF Mgmt Platform/VSP, Operations `.75` [20 adapters], Mgmt Services, **VCF Automation `.77`/`.87`**). smoke_test 4/6 (vCenter/SDDC/NSX/Operations ✅; Log Mgmt ops-li not deployed; VCFA needs a UI API token to test). API correspondence test fully runnable (old=521b, new=9.1).
- Getting to 100% after the outer-host crisis took deep recovery: VCFA stall = orphan VMs holding pool IPs `.78-.80` (deleted) + sddc-lcm DB JPA blip (build-service restart); then NSX DFW-exclusion failed because nsxn1 services were dead (rebooted nsxn1 → healthy); then `retrySddc` blocked by a `QUICK_START_VALIDATION` self-conflict (VSP holds 6 of the 12 `vspClusterSpec.ipv4Pool` IPs `.18-.29`) → **fix: override the spec pool with 12 genuinely-free IPs (`.24-.29`+`.46-.51`) + `PATCH /v1/sddcs/{id}?skipValidations=true`** → idempotent resume completed it. `retryTask`/`/v1/tasks` only cover download tasks, not the bringup.
- **Outer-host crisis mid-rebuild (KEY lesson)**: outer SELAB-Cluster DRS was `fullyAutomated` → auto-live-vMotioned the k8s nested ESXi → froze them; outer `.6` (206GB) overcommitted with 2×128GB nested. Fix: per-VM **DRS=manual** for nested + cluster DRS→manual + dedicate `.4`/`.10` (275GB) via VM-Host MustRunOn rules (groups had emptied on the wipe) + **cold-migrate** nested (never live-vMotion k8s nodes). esx01-521 & vcf-installer-91 are on **local datastores** (can't compute-vMotion). Details in `runbooks/golden-ova.md`.
- **2026-06-27 incident**: mgmt plane (vCenter .11 / SDDC .10 / Ops .75) found hung (ping only, 443+5480+Tools dead). Root cause = **10 inaccessible vSAN objects** (vCenter+SDDC VM-home namespaces gone; Ops OS disk gone) on FTT=0 nested vSAN — unrecoverable (`objtool getAttr` → No such file). Hardware/cluster healthy. Aftermath of the outer-vSAN freeze. → full wipe + re-bringup.
- **Rebuild gotchas hit** (now in `runbooks/golden-ova.md`): `_prep_redeployed` GuestOps can't persist files (EPERM) on current golden OVA → IP/UUID revert; **vmk0 MAC must be unique AND ≠ vmnic0 HW MAC** (else `Migrate ESX vmknic to vDS` fails `VSPHERE_CONFIGURE_HOST_DVS_FAILED`/HostCommunication — cost 2 retries). Fix: SSH (not GuestOps) for uuid/marker/cert/auto-backup; let ESXi auto-generate vmk0 MAC.
- Pre-submit IP sweep confirmed all spec IPs free (VCFA pool .78–.83 incl.); vSAN FTT=0 via spec datastore-default policy. Outer vSAN healthy (9 TB free). VSP/Automation (leader-election watch) stage still ahead.

**2026-09-01/02 — 「移除 VCF Operations 能不能重建回來」測試 → 管理層全新重建（converge）**
- 結論：VCF 9.1 **沒有**移除/重新部署 Operations 的動作。Ops 主控台只有 Add Node/Scale Out、SDDC Manager 無入口（已 deprecated）、API 無 decommission 端點。
- 同 build OVA、**同 FQDN/IP 重裝 → fleet 不接回**，開機導向 `/admin/newCluster.action` 全新安裝精靈。443 通 ≠ 就緒（要 suite-api token + node ONLINE）。
- 受支援只有兩條：① **事前**設好 backup location → Backup & Restore；② **VCF Installer converge** 既有 vCenter+NSX 重建管理層（新 fleet ID、Ops 歷史資料不跟過來）。
- **✅ 完成（09-02）**：converge 重建管理層 —— 沿用既有 vCenter `.11` + NSX `.13`，其餘全新部署。新元件 `-r2`：fleet-r2 `.215` / vsp-r2 `.216` / vspp-r2 `.217` / **ops-r2 `.219`** / vidb-r2 `.220` / vspp2-r2 `.221`；IP range 管理服務 `.225-240`、VCFA `.241-252`；新 SDDC Manager 仍 `kosten-vcf91-sddc` `.10`。里程碑 1–5 全成功（00:47/00:52/03:37/05:07/06:47）。
- **驗收通過**：Ops ONLINE 9.1.0.0 b25541561 + **19 adapters**、SDDC Manager 5 服務 UP（9.1.0.0400.25570101）、domain/cluster ACTIVE、4 host ASSIGNED 9.1.0.0.25370933、NSX 11 group 全 STABLE。舊 Ops `.75` 仍開機但已是孤兒。
- **⚠️ 第 6 個里程碑 `Deploy and configure VCF Automation` 卡死 2/8**（本環境不用 VCFA，使用者決定不修）：UI 狀態欄顯示 In progress 但要展開該列才看到 `Failed to configure LCM components`；根因＝VSP 的 `fleet-build-service` 每 10 秒重複推送 fleet depot 設定推不進 SDDC LCM，15 GB bundle 從未開始傳（runtime 對 installer 零連線、images 不成長）；232 個 bundle 全 PENDING。詳 debug-vcf9.1 §8。
- 舊管理元件一律 **park（關機+改名 `-OLD-20260901`）不刪**：sddc、4×vspp、vcfa-platform、ops-coll、lic。
- 踩雷：勾「既有 VCF Operations」會被連動 VCFA 憑證鏈擋死（只勾 vCenter+NSX 才過）；IP pool 至少 12；VCFA 欄位拿不掉；改欄位後 validation 必 RE-RUN；**驗證唯一失敗＝叢集 DRS 要 FullyAutomated**；自動產生的密碼要當場匯出。
- **VSP supervisor VM「自己開回來」根因＝逐台優雅關機被存活節點救回**，四台同時 `Stop-VM` 即解（12/60 分鐘兩輪盯梢佐證）。
- ⏳ 未測：授權鏈影響（全程 Evaluation Mode，無真授權 → 待使用者上 license 後複驗）。
- 手冊：[debug-vcf9.1 08-ops-loss-and-mgmt-rebuild.md](https://github.com/kostenyang/debug-vcf9.1)；測試報告+操作手冊 docx 在 `rto/dev-docs/vcf91-ops-rebuild/`。
**Offline depot** (`rtolab-depotsrv` @ 172.16.10.50, nginx :8888): full 9.1.0.0 INSTALL set + all async patch builds up to **SDDC Manager `9.1.0.0300.25536191`** (2026-06-30, latest available) + `0100` (2026-06-05) for ESX/HCX/NSX/vCenter. Updated to latest 2026-07-02 (`12 binaries`, 0 FAILED, served over HTTP). vmdk 180 GB, 21 GB free. No DNS record / no 521 conflict (.50 is jumpbox segment). See `runbooks/depot-server.md`.
**SFTP backup** (`rtolab-sftp` @ 172.16.10.51, built 2026-07-02): SDDC Manager (VCF) backup target — sftp-only chroot user `sddcbackup` → `/backups`, 200 GB. **SDDC Manager backup config wired + verified 2026-07-02** (`isConfigured=true`; on-demand backup Successful → SDDC Mgr `.tar.gz` + NSX bkp landed in `/backups`). `backupSchedules` still empty (on-demand only — no time schedule yet). See `runbooks/backup-sftp.md`.
**VCF 9.0**: running (reference baseline)
**VCF 5.2.1 (521b / 521c)**: ⛔ **已於 2026-09-01 永久刪除**（8 台 nested host VM，釋出 ~3.5 TB vSAN 與 ~384 GB 外層 RAM）。
歷程：2026-06-10 bringup 完成（SDDC .95 / vC .96 / NSX VIP .98 / node .97 / ESXi .90–93 on `trunk521`）→
2026-08-28/29 拆成「客戶樣貌的純 vSphere」並**手動升到 9.1**（vCenter 8.0U3→9.1、cluster 轉 vLCM 單一映像、ESXi ×4→9.1，映像符合性 COMPLIANT 4/4）→
產出客戶版升級手冊後刪除環境。IP 段 `.90-.93`/`.95-.98`（521b）與 `.50-.58`（521c）**已釋出**，但 DNS 記錄尚未清（重用前先查反解）。
方法、踩雷與交付手冊：**[debug-vcf521](https://github.com/kostenyang/debug-vcf521)** 的 `03-upgrade-8.0u3-to-9.1.md` 與 `guide/`。
**VCD 10.6.2**: up @ .60. **2026-07-23 wiped the 10.6.1 appliance and clean-redeployed to 10.6.2** (deploy 10.6.1 OVA → systemSetup → apply update bundle → DB schema upgrade; no standalone 10.6.2 OVA exists). Fresh appliance has only **lab.com vCenter (vcsa.lab.com .10) + NSX (nsx.lab.com .41) re-registered**; the earlier 521b provider/tenant chain was erased by the wipe and **not rebuilt** (deferred per user — "其他先不用管"). If the chain is ever needed: fix vcsa.lab.com `/pbm` 503 (restart `vmware-sps`) + get an external uplink subnet (T0-GW on 192.168.119/120) from Sean. Redeploy gotchas (NFS-share clean-state, native-ssh for Photon appliance, `vamicli update --install latest`, envoy-sidecar SSO fix) in `topology/rtolab.md` + memory.

### Known issues

| Issue | Workaround | Doc |
|-------|-----------|-----|
| vSAN cluster partition | `vmkping` unicast peers; add peer + restart vSAN | `layer4-day2/Troubleshoot-VsanPartition.md` |
| etcd fsync latency (Supervisor) | FTT=0 policy + wait vSAN resync + disable HA admission | `layer3-postbringup/vcf-operations-automation-deploy-troubleshooting.md` |
| Outer dvSwitch swsec stale (任何 PG,大量 port flap 後) | Toggle 該 PG promisc False→True + bounce vmk0 | `runbooks/golden-ova.md` |
| vmx-14 nested ESXi PSOD at 0.73s | Use vmx-19 OVA | Fixed in current OVA |

---

## vcf9.1-lab

**Repo**: https://github.com/kostenyang/vcf9.1-lab

| Layer | Status |
|-------|--------|
| Layer 1 | Partial |
| Layer 2 | Template only (not run recently) |
| Layer 3 | Docs only |
| Layer 4 | Complete |

**Status**: Reference/template repo. No active bringup in progress.

---

<!-- auto-sync-start -->
## rtolab Recent Activity

*This section is auto-updated by GitHub Actions. Do not edit manually.*

**Last synced:** 2026-07-01 06:40 UTC · latest commit `3fd1c08` — docs(layer5-vks): single-node TINY supervisor for resource-tight nested labs

### Last 10 commits

| SHA | Message | Date |
|-----|---------|------|
| `3fd1c08` | docs(layer5-vks): single-node TINY supervisor for resource-tight neste | 2026-06-30 |
| `ca8c1eb` | docs(cheatsheet): add PSOD -> wedged CSI globalmount recovery (umount  | 2026-06-30 |
| `d9dfc9f` | docs: replace VCFA incident writeup with command-focused debug cheatsh | 2026-06-29 |
| `9890e42` | docs: VCFA outer-oversubscription + nested-ESXi PSOD incident runbook  | 2026-06-29 |
| `fe0bf58` | docs: add 2026-06 recovery runbook (vSAN CMMDS dropout → full-stack re | 2026-06-23 |
| `cdf3baa` | layer5-vks/README: correct IP plan to actual deployed values | 2026-06-18 |
| `d42999f` | layer5-vks: add UI walkthrough + screenshots, commit Step0-4 scripts | 2026-06-18 |
| `ad02fe8` | ci(dry-run): support two ESXi credential groups (primary + PSO) | 2026-06-09 |
| `87ccacb` | ci(dry-run): skip Layer 2 gracefully when secrets/age key absent in CI | 2026-06-09 |
| `6613c2f` | ci(dry-run): Layer 1 vSAN dry-run + Layer 2 spec validation | 2026-06-09 |

### Open PRs

*(none)*
<!-- auto-sync-end -->
