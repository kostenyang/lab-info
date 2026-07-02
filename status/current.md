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
| VCF 5.2.1 (521b) | **Complete** | bringup COMPLETED_WITH_SUCCESS 2026-06-10 (`4245d988`, sddcId `vcf-m02b`) |
| VCD 10.6.1 | **Up + dual-connected** | Appliance @ .60 live; full provider+tenant chain on 521b (edge/T0/pool/extnet/PVDC/VDC/egw, see topology); **also registered Sean's external `lab.com` vCenter (vcsa.lab.com .10) + NSX (nsx.lab.com .41)** 2026-06-17 |
| SSP 5.1.2 (vDefend) | Installer up · License Hub loaded | Installer appliance @ **.66** (`kosten-ssp`), redeployed 2026-06-17 (moved off `.55` — collided with stale 521 `kosten-vcf521-sddc` reservation). **License Hub (LICENSE bundle 5.1.2-0.0-25400319, 4.46 GB) uploaded to depot → READY** via depot REST API (`POST /sspi/bundles/remote?type=LICENSE`, server-side pull). depot now has INSTALLER (IN_USE) + LICENSE (READY). **platform stand-up pending** (run wizard · NSX target .13 · node IPs from a 3-way-clean block, NOT .55-.59) |

**VCF 9.1** (primary): ✅ **rebuild COMPLETED_WITH_SUCCESS 2026-06-29** — sddc id `e4740530-1865-43f2-9993-245e577d40f4`, sddcId `vcf-m02`. **All 8 milestones green** (vCenter `.11`, SDDC `.10`, vSphere cluster, NSX `.13` [258 DFW groups], VCF Mgmt Platform/VSP, Operations `.75` [20 adapters], Mgmt Services, **VCF Automation `.77`/`.87`**). smoke_test 4/6 (vCenter/SDDC/NSX/Operations ✅; Log Mgmt ops-li not deployed; VCFA needs a UI API token to test). API correspondence test fully runnable (old=521b, new=9.1).
- Getting to 100% after the outer-host crisis took deep recovery: VCFA stall = orphan VMs holding pool IPs `.78-.80` (deleted) + sddc-lcm DB JPA blip (build-service restart); then NSX DFW-exclusion failed because nsxn1 services were dead (rebooted nsxn1 → healthy); then `retrySddc` blocked by a `QUICK_START_VALIDATION` self-conflict (VSP holds 6 of the 12 `vspClusterSpec.ipv4Pool` IPs `.18-.29`) → **fix: override the spec pool with 12 genuinely-free IPs (`.24-.29`+`.46-.51`) + `PATCH /v1/sddcs/{id}?skipValidations=true`** → idempotent resume completed it. `retryTask`/`/v1/tasks` only cover download tasks, not the bringup.
- **Outer-host crisis mid-rebuild (KEY lesson)**: outer SELAB-Cluster DRS was `fullyAutomated` → auto-live-vMotioned the k8s nested ESXi → froze them; outer `.6` (206GB) overcommitted with 2×128GB nested. Fix: per-VM **DRS=manual** for nested + cluster DRS→manual + dedicate `.4`/`.10` (275GB) via VM-Host MustRunOn rules (groups had emptied on the wipe) + **cold-migrate** nested (never live-vMotion k8s nodes). esx01-521 & vcf-installer-91 are on **local datastores** (can't compute-vMotion). Details in `runbooks/golden-ova.md`.
- **2026-06-27 incident**: mgmt plane (vCenter .11 / SDDC .10 / Ops .75) found hung (ping only, 443+5480+Tools dead). Root cause = **10 inaccessible vSAN objects** (vCenter+SDDC VM-home namespaces gone; Ops OS disk gone) on FTT=0 nested vSAN — unrecoverable (`objtool getAttr` → No such file). Hardware/cluster healthy. Aftermath of the outer-vSAN freeze. → full wipe + re-bringup.
- **Rebuild gotchas hit** (now in `runbooks/golden-ova.md`): `_prep_redeployed` GuestOps can't persist files (EPERM) on current golden OVA → IP/UUID revert; **vmk0 MAC must be unique AND ≠ vmnic0 HW MAC** (else `Migrate ESX vmknic to vDS` fails `VSPHERE_CONFIGURE_HOST_DVS_FAILED`/HostCommunication — cost 2 retries). Fix: SSH (not GuestOps) for uuid/marker/cert/auto-backup; let ESXi auto-generate vmk0 MAC.
- Pre-submit IP sweep confirmed all spec IPs free (VCFA pool .78–.83 incl.); vSAN FTT=0 via spec datastore-default policy. Outer vSAN healthy (9 TB free). VSP/Automation (leader-election watch) stage still ahead.
**Offline depot** (`rtolab-depotsrv` @ 172.16.10.50, nginx :8888): full 9.1.0.0 INSTALL set + all async patch builds up to **SDDC Manager `9.1.0.0300.25536191`** (2026-06-30, latest available) + `0100` (2026-06-05) for ESX/HCX/NSX/vCenter. Updated to latest 2026-07-02 (`12 binaries`, 0 FAILED, served over HTTP). vmdk 180 GB, 21 GB free. No DNS record / no 521 conflict (.50 is jumpbox segment). See `runbooks/depot-server.md`.
**SFTP backup** (`rtolab-sftp` @ 172.16.10.51, built 2026-07-02): SDDC Manager (VCF) backup target — sftp-only chroot user `sddcbackup` → `/backups`, 200 GB. **SDDC Manager backup config wired + verified 2026-07-02** (`isConfigured=true`; on-demand backup Successful → SDDC Mgr `.tar.gz` + NSX bkp landed in `/backups`). `backupSchedules` still empty (on-demand only — no time schedule yet). See `runbooks/backup-sftp.md`.
**VCF 9.0**: running (reference baseline)
**VCF 5.2.1 (521b)**: ✅ bringup completed 2026-06-10 — SDDC Mgr .95 / vCenter .96 / NSX VIP .98 / nodes .97 / ESXi .90–93 (on `trunk521`). Resolved the shared `/system/uuid` vSAN trap via layer1 unique-UUID prep.
**VCD 10.6.1**: up @ .60. Full provider+tenant chain built on **521b** (NSX edge en01 + T0 → Geneve pool → external network → NSX-T-backed PVDC → tenant1-vdc → egw-tenant1 + routed network, all REALIZED). **2026-06-17 also attached Sean's external `lab.com` set**: vCenter `vcsa.lab.com` @ 192.168.113.10 + NSX `nsx.lab.com` @ 192.168.113.41 registered (vcf521b left untouched). Three integration traps (FQDN-only cert SAN · `/etc/hosts` on cell+jumpbox since no lab.com zone · vcsa SSO down → restart `vmware-envoy-sidecar`) documented in `topology/rtolab.md`.

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
