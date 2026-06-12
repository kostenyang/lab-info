# Lab Status — Current

Last updated: 2026-06-09

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
| VCD 10.6.1 | Deploying | DNS done; NFS VM + OVA deploy pending; will connect to VCF 5.2.1 |

**VCF 9.1** (primary): bringup completed 2026-06-07 (SDDC `a0ca66a4`)
- Post-bringup target: test VCF 9.1 on esxi-qct-4 and esxi-qct-6
**VCF 9.0**: running (reference baseline)
**VCF 5.2.1**: rebuilding — previous bringup hit shared `/system/uuid` vSAN partition failure; wipe+rebuild in progress
**VCD 10.6.1**: deploying — DNS records added (2026-06-09); NFS VM + appliance deploy pending

### Known issues

| Issue | Workaround | Doc |
|-------|-----------|-----|
| vSAN cluster partition | `vmkping` unicast peers; add peer + restart vSAN | `layer4-day2/Troubleshoot-VsanPartition.md` |
| etcd fsync latency (Supervisor) | FTT=0 policy + wait vSAN resync + disable HA admission | `layer3-postbringup/vcf-operations-automation-deploy-troubleshooting.md` |
| Outer dvSwitch swsec stale | Toggle trunk PG promisc False→True | `runbooks/golden-ova.md` |
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

**Last synced:** 2026-06-12 06:51 UTC · latest commit `ad02fe8` — ci(dry-run): support two ESXi credential groups (primary + PSO)

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
