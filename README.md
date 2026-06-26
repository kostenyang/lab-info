# Lab Info — Central Documentation Hub

Single source of truth for two VMware Cloud Foundation lab environments.

## Labs

| Lab | Repo | Purpose |
|-----|------|---------|
| **rtolab** | [kostenyang/rtolab](https://github.com/kostenyang/rtolab) | Active 3-version lab (VCF 9.1 / 9.0 / 5.2.1) on Windows automation host |
| **vcf9.1-lab** | [kostenyang/vcf9.1-lab](https://github.com/kostenyang/vcf9.1-lab) | Reference single-version VCF 9.1 template |

## Navigation

| Document | Content |
|----------|---------|
| [topology/rtolab.md](topology/rtolab.md) | rtolab — all IPs, FQDNs, VLANs, components (3 versions) |
| [topology/home-lab.md](topology/home-lab.md) | **home.lab — authoritative VCF 9.1 lab (m01/m02/m03), DNS-verified 2026-06-26** |
| [topology/vcf91.md](topology/vcf91.md) | vcf9.1-lab — ⚠️ stale, superseded by home-lab.md |
| [architecture/rtolab.md](architecture/rtolab.md) | rtolab architecture diagram + layer overview |
| [architecture/vcf91.md](architecture/vcf91.md) | vcf9.1-lab architecture diagram |
| [runbooks/golden-ova.md](runbooks/golden-ova.md) | Golden OVA clone + fix procedure |
| [runbooks/bringup.md](runbooks/bringup.md) | VCF Option B full bringup flow |
| [runbooks/vks.md](runbooks/vks.md) | VKS / Supervisor setup & operations |
| [runbooks/depot-server.md](runbooks/depot-server.md) | Offline VCF depot (`rtolab-depotsrv` @ .50): download/serve bundles + patches |
| [status/current.md](status/current.md) | Current lab status & known issues |

## Quick reference

- Automation host: `172.16.10.32` (Windows Server 2022, pwsh only)
- Outer vCenter: `172.16.10.100` (vc-mgmt.vmware.taiwan)
- AD/DNS: `192.168.114.200` (rtolab.local zone authority)
- Default lab password: `VMware1!VMware1!`
- Secrets: sops+age encrypted in each repo's `inventory/secrets/`
