# Lab Status — Current

Last updated: 2026-06-08

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

**VCF 9.1** (primary): bringup completed 2026-06-07 (SDDC `a0ca66a4`)
- Post-bringup target: test VCF 9.1 on esxi-qct-4 and esxi-qct-6
**VCF 9.0**: running (reference baseline)
**VCF 5.2.1**: running (upgrade path source)

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
