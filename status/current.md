# Lab Status — Current

Last updated: 2026-06-12

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
| VCD 10.6.1 | Deploying | DNS done; NFS VM + OVA deploy pending; connects to VCF 5.2.1 (521b) vCenter @ .96 |

**VCF 9.1** (primary): **full rebuild in progress 2026-06-12** — task `4e7645c3`, 290/313 subtasks, 0 failed (Telemetry stage; VCFA last)
- Previous run `cffc2d68` failed at VCFA (307/313): VSP leader-election crashloop stalled it 13h, then `.78` self-conflict from the partial deploy → wiped nested ESXi and rebuilt clean (recipe in `runbooks/golden-ova.md` §Proven full-rebuild sequence)
- Pre-submit IP sweep confirmed all spec IPs free (VCFA pool .78–.83 included); vSAN FTT=0 via spec-created datastore-default policy
- This run: VSP cm/scheduler healthy (restarts=0, 3.5h+) — no leader-election recurrence
**VCF 9.0**: running (reference baseline)
**VCF 5.2.1 (521b)**: ✅ bringup completed 2026-06-10 — SDDC Mgr .95 / vCenter .96 / NSX VIP .98 / nodes .97 / ESXi .90–93 (on `trunk521`). Resolved the shared `/system/uuid` vSAN trap via layer1 unique-UUID prep.
**VCD 10.6.1**: deploying — DNS records added (2026-06-09); NFS VM + appliance deploy pending; will connect to 521b vCenter (.96)

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

**Last synced:** 2026-06-13 06:24 UTC · latest commit `ad02fe8` — ci(dry-run): support two ESXi credential groups (primary + PSO)

### Last 10 commits

| SHA | Message | Date |
|-----|---------|------|
| `ad02fe8` | ci(dry-run): support two ESXi credential groups (primary + PSO) | 2026-06-09 |
| `87ccacb` | ci(dry-run): skip Layer 2 gracefully when secrets/age key absent in CI | 2026-06-09 |
| `6613c2f` | ci(dry-run): Layer 1 vSAN dry-run + Layer 2 spec validation | 2026-06-09 |
| `8661e1e` | ci: add AI code review workflow (manual trigger, Claude Sonnet 4.6) | 2026-06-09 |
| `a79b51c` | ci(pssa): remove PSUseCompatibleSyntax (repo is pwsh 7 only) | 2026-06-08 |
| `29e4830` | ci(pssa): exclude PlainTextPassword + ConvertToSecureString rules (lab | 2026-06-08 |
| `1947a11` | ci(lint): warnings informational only, errors block PR | 2026-06-08 |
| `0a4655c` | ci: add lint workflow (PSScriptAnalyzer + YAML + secret scan) | 2026-06-08 |
| `01151c7` | ci: add GitHub Actions workflows dir + runner smoke test | 2026-06-08 |
| `3e0d17f` | docs(layer3): VCF 9.1 + Automation install / creds / password-change / | 2026-06-08 |

### Open PRs

*(none)*
<!-- auto-sync-end -->
