# vcf9.1-lab — Topology Reference

> ⚠️ **STALE / INACCURATE — see [home-lab.md](home-lab.md) for the corrected,
> DNS-verified topology (2026-06-26).** This file described the lab as a single
> `lab.com` VCF 9.1 instance with `sddc-mgr.lab.com`-style names. The real lab is
> the **`home.lab`** domain (DNS `KADDNS.home.lab` @ 10.0.0.200) with **three**
> VCF 9.1 instances (m01/m02/m03) named `vcf-m0{1,2,3}-*.home.lab`. Kept for
> history only — do not rely on the values below.

**Domain**: `lab.com` | **Repo**: https://github.com/kostenyang/vcf9.1-lab

Single VCF 9.1 version. Simpler than rtolab — reference template only, not actively developed.
Automation host is Linux (not Windows). IPs are auto-assigned by VCF Installer (not pre-allocated).

---

## Infrastructure

| Component | FQDN | IP | Role |
|-----------|------|----|------|
| Outer vCenter | labvc.lab.com | 10.0.0.101 | Hosts nested ESXi VMs |
| AD / DNS / NTP | dc01.lab.com | 10.0.0.200 | lab.com zone authority |
| Automation host | — | 10.0.0.65 | Ubuntu/Debian, user: labops |

---

## Network

| VLAN | CIDR | Gateway | Role |
|------|------|---------|------|
| 10 | 10.0.1.0/24 | 10.0.1.1 | Management |
| 20 | 10.0.2.0/24 | 10.0.2.1 | vMotion |
| 30 | 10.0.3.0/24 | 10.0.3.1 | vSAN |
| 40 | 10.0.4.0/24 | 10.0.4.1 | NSX TEP (Overlay) |

---

## Nested ESXi Hosts (VCF 9.1)

| Host | VM Name | mgmt IP | vMotion IP | vSAN IP |
|------|---------|---------|-----------|---------|
| esx01 | vcf-m02-esx01-91 | 10.0.1.14 | 10.0.2.14 | 10.0.3.14 |
| esx02 | vcf-m02-esx02-91 | 10.0.1.15 | 10.0.2.15 | 10.0.3.15 |
| esx03 | vcf-m02-esx03-91 | 10.0.1.16 | 10.0.2.16 | 10.0.3.16 |
| esx04 | vcf-m02-esx04-91 | 10.0.1.17 | 10.0.2.17 | 10.0.3.17 |

FQDNs: `esx0{N}.lab.com`

---

## VCF 9.1 Management VMs

IPs are assigned by the installer. FQDNs registered in DNS before bringup.

| Component | FQDN |
|-----------|------|
| SDDC Manager | sddc-mgr.lab.com |
| inner vCenter | vc-mgmt.lab.com |
| NSX Manager | nsx-mgmt.lab.com |

---

## Artifacts

| File | Path |
|------|------|
| Nested ESXi OVA | `E:\9.1\Nested_ESXi9.1.0.0_Appliance_Template_v1.0-vmx19.ova` |
| ESXi ISO | `E:\9.1\VMware-VMvisor-Installer-9.1.0.0.25370933.x86_64.iso` |
| ESXi Depot | `E:\9.1\VMware-ESXi-9.1.0.0.25370933-depot.zip` |

---

## Key differences vs rtolab

| Aspect | vcf9.1-lab | rtolab |
|--------|-----------|--------|
| VCF versions | 1 (9.1 only) | 3 (9.1 + 9.0 + 5.2.1) |
| Automation host | Linux (Ubuntu/Debian) | Windows Server 2022 |
| IP allocation | Auto by installer | Pre-allocated per version |
| VKS / Layer 5 | Not included | Implemented in layer5-vks/ |
| Secrets | sops + age | sops + age |
| Script language | PowerShell (pwsh) | PowerShell (pwsh) |
