# home.lab — Topology Reference (authoritative, DNS-derived)

**Domain**: `home.lab` | **AD/DNS**: `KADDNS.home.lab` @ **10.0.0.200**

> This is the lab previously (incorrectly) documented as "vcf9.1-lab / `lab.com`,
> single VCF 9.1". Corrected 2026-06-26 from the authoritative DNS zones on
> 10.0.0.200 (`home.lab` + `lab.com` AXFR) plus live 443 probes.
>
> **`home.lab` is the primary AD/DNS zone.** `lab.com` is a secondary zone that
> only holds the outer vCenter (`labvc.lab.com`). The VCF management names are
> **`*.home.lab`** — NOT `sddc-mgr.lab.com` etc.

This lab runs **three** VCF 9.1 management domains (m01 / m02 / m03) as nested
deployments on one physical vSphere 8 vCenter, plus standalone VCF Operations /
Automation and a set of adjacent services (VCD, VCDA, HCX, SRM, Harbor, TKG).

---

## Access / network

- This is a **flat `10.0.0.0/23`** segment (mgmt `10.0.0.x` + nested `10.0.1.x`),
  default gateway `10.0.0.1`. A workstation on this LAN reaches every host below
  directly — **no VPN needed when on-LAN**.
- DNS server `10.0.0.200` is authoritative; for tools that don't use it, add the
  names to the local **hosts file** (the full block is generated in
  `~/vcf9-hosts.txt`; 93 entries).
- Default lab password convention: `VMware1!VMware1!` (per-appliance SSO/admin
  passwords may differ — the outer vCenter rejects the default).

---

## Infrastructure (shared)

| Component | FQDN | IP | Role / Version |
|-----------|------|----|----------------|
| AD / DNS | KADDNS.home.lab | 10.0.0.200 | Windows AD; authoritative for `home.lab` + `lab.com` |
| Outer vCenter | labvc.lab.com | 10.0.0.101 | **vSphere 8.0.3**; hosts all nested ESXi |
| VCF 9 depot | vcf9depotserver.home.lab | 10.0.0.61 | Offline VCF bundle depot |

> Outer vCenter SSO is **not** `vsphere.local` / `VMware1!VMware1!`
> (that combination returns HTTP 401) — use the real lab credential.

---

## VCF 9.1 instances

Each instance = a VCF management domain with 4 nested **ESX 9.1.0.0** hosts.
Power state varies (instances are brought up/down as needed).

### m01

| Component | FQDN | IP |
|-----------|------|----|
| Nested ESXi 01–04 | vcf-m01-esx0{1..4}.home.lab | 10.0.1.10–13 |
| Cloud Builder | vcf-m01-cb01.home.lab | 10.0.1.4 |
| SDDC Manager | vcf-m01-sddcm01.home.lab | 10.0.1.5 |
| inner vCenter | vcf-m01-vc01.home.lab | 10.0.1.9 |
| NSX VIP | vcf-m01-nsx01a.home.lab | 10.0.1.7 |
| NSX node | vcf-m01-nsx01.home.lab | 10.0.1.8 |
| Fleet | vcf-m01-fleet.home.lab | 10.0.1.2 |
| NSX Edge 1 / 2 | vcf-m01-edge1/2.home.lab | 10.0.1.31 / 10.0.1.32 |
| Edge uplink 1 | vcf-m01-edgeuplink1.home.lab | 10.0.1.250 |
| HCX | vcf-m01-hcx.home.lab | 10.0.1.25 |
| VCF Operations | vcf9m01ops.home.lab | 10.0.0.150 |
| Ops Collector | vcf9m01opsc.home.lab | 10.0.0.151 |
| Fleet (ops) | vcf9m01fleet.home.lab | 10.0.0.152 |

### m02 — primary / most-used (matches the old single-instance doc)

| Component | FQDN | IP |
|-----------|------|----|
| Nested ESXi 01–04 | vcf-m02-esx0{1..4}.home.lab | 10.0.1.14–17 |
| VCF Installer | vcf-m02-inst01.home.lab | 10.0.1.4 |
| SDDC Manager | vcf-m02-sddcm01.home.lab | 10.0.1.18 |
| inner vCenter | vcf-m02-vc01.home.lab | 10.0.1.19 |
| NSX VIP | vcf-m02-nsx01a.home.lab | 10.0.1.20 |
| NSX node | vcf-m02-nsx01.home.lab | 10.0.1.21 |
| VCF Operations | vcf-m02-ops01.home.lab | 10.0.1.22 |
| Ops Collector | vcf-m02-opsc01.home.lab | 10.0.1.24 |
| Fleet | vcf-m02-fleet01.home.lab | 10.0.1.23 |
| HCX | vcf-m02-hcx.home.lab | 10.0.1.26 |
| vSAN host (extra) | vcf-m02-vsanhost.home.lab | 10.0.1.61 |
| VCF Automation VIP | vcf-m02-auto-vip.home.lab | 10.0.0.170 |
| VCF Automation platform | vcf-m02-auto-platform.home.lab | 10.0.0.171 |
| VCFA service (vsp) | vcf-m02-vsp01.home.lab | 10.0.0.172 |
| VCFA shared | vcf-m02-shared01.home.lab | 10.0.0.173 |
| vIDB (Identity Broker) | vcf-m02-vidb.home.lab | 10.0.0.174 |
| License Server | vcf-m02-license.home.lab | 10.0.0.175 |

### m03

| Component | FQDN | IP |
|-----------|------|----|
| Nested ESXi 01–04 | vcf-m03-esx0{1..4}.home.lab | 10.0.1.50–53 |
| SDDC Manager | vcf-m03-sddcm01.home.lab | 10.0.1.56 |
| inner vCenter | vcf-m03-vc01.home.lab | 10.0.1.55 |
| NSX VIP | vcf-m03-nsx01a.home.lab | 10.0.1.57 |
| NSX nodes | vcf-m03-nsx01{,b,c}.home.lab | 10.0.1.58 / .59 / .60 |
| HCX | vcf-m03-hcx.home.lab | 10.0.1.27 |

---

## Shared / standalone VCF 9 services

| Component | FQDN | IP |
|-----------|------|----|
| VCF Operations | vcf9ops.home.lab | 10.0.0.160 |
| Ops Collector | vcf9opsc.home.lab | 10.0.0.162 |
| Fleet | vcf9fleet.home.lab | 10.0.0.161 |
| VCF Automation | vcfa.home.lab | 10.0.0.165 |

---

## Classic Aria Suite — vRLCM-managed vRA 8.x

> A **standalone, classic vRealize/Aria stack** managed by Aria Suite Lifecycle
> (vRLCM). This is **separate** from the VCF-integrated *VCF Automation* above
> (`vcfa.home.lab` .165 / the `vcf-m02-auto-*` platform) — different product,
> different lifecycle. Don't confuse the two.

| Component | FQDN | IP | Version / notes |
|-----------|------|----|-----------------|
| Aria Suite Lifecycle (vRLCM) | vrlcm.home.lab | 10.0.0.201 | admin@local |
| Workspace ONE Access (vIDM) | vidm.home.lab | 10.0.0.202 | configadmin |
| Aria Automation (vRA 8) | vra.home.lab | 10.0.0.203 | **8.18.1.36791**; UI: configadmin; **SSH: root** |

**Credentials** — these appliances use the **single-bang** `VMware1!` (NOT the
`VMware1!VMware1!` lab default). vRA appliance SSH is `root / VMware1!`.
*Caveat (2026-07-01): vRLCM `admin@local` login via `POST /lcm/authzn/api/login`
returned HTTP 401 with `VMware1!` — LCM API password unconfirmed; UI(443) is up.*

**Health / repair** — if `https://vra.home.lab` (443) stops responding while the
appliance still pings, the prelude services are down. See
[`runbooks/debug-vra8.md`](../runbooks/debug-vra8.md).

---

## Adjacent lab services (not VCF core)

| Service | FQDN | IP |
|---------|------|----|
| VCD | vcd.home.lab / vcdvip.home.lab | 10.0.0.180 / 10.0.0.145 |
| VCD on-prem | vcda-prem.home.lab | 10.0.0.91 |
| VCDA (m/r/t) | vcda-{m,r,t}.home.lab | 10.0.1.192 / .191 / .190 |
| VCDA 4.5 (m/r/t) | vcda45-{m,r,t}.home.lab | 10.0.0.192 / .191 / .190 |
| VCD AVI | vcdavi.home.lab | 10.0.1.1 |
| HCX (standalone) | hcx4 / hcx67.home.lab | 10.0.0.16 / 10.0.1.42 |
| SRM | srm85vcf01/02.home.lab | 10.0.1.40 / 10.0.1.41 |
| Harbor registry | harbor / harborlab.home.lab | 10.0.0.15 / 10.0.0.26 |
| TKG AVI | tkgavi / tkgsavi.home.lab | 10.0.0.252 / 10.0.0.253 |
| Log server | log.home.lab | 10.0.0.123 |
| Open WebUI | openwebui.home.lab | 10.0.0.64 |
| SQL 2019 | sql2019.home.lab | 10.0.0.70 |
| Dev DNS | devdns.home.lab | 192.168.16.10 |
| TKG mgmt DNS | tkgmdns.home.lab | 192.168.34.17 |

---

## Notes / corrections vs the original mis-documented topology

| Old doc said | Reality (DNS-verified 2026-06-26) |
|--------------|-----------------------------------|
| Domain `lab.com` | Primary domain is `home.lab`; `lab.com` only holds `labvc` |
| DNS `dc01.lab.com` | `KADDNS.home.lab` @ 10.0.0.200 (no `dc01` record exists) |
| Single VCF 9.1 instance | **Three** instances: m01 / m02 / m03 |
| `sddc-mgr.lab.com`, `vc-mgmt.lab.com`, `nsx-mgmt.lab.com` | `vcf-m02-sddcm01/vc01/nsx01a.home.lab` (per instance) |
| Automation host Linux `10.0.0.65` | No DNS record for `.65`; unverified — left as a TODO |

*Unverified items kept as TODO rather than deleted: VLAN layout (10/20/30/40),
the Linux automation host, and any sops secret locations.*
