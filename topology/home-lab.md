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
| Outer ESXi host A | — | 10.0.0.95 | Supermicro, 32c / 1 TB — runs all nested ESXi. Switch ports 4 / 11 / 9 (see port map below) |
| Host A IPMI / BMC | — | 10.0.0.94 | Supermicro BMC of 10.0.0.95 (HTTPS self-signed; SSH/623/5900 open) |
| Outer ESXi host B | — | 10.0.0.97 | ASUS, 6c / 128 GB — VDS7 on switch port 17; vSwitch0 (mgmt) reaches the lab via the upstream link on port 1 |
| Outer ESXi host C | — | 10.0.0.98 | ASUS, 6c / 128 GB — runs outer vCenter 10.0.0.101 + lab router; VDS7 on switch port 18 |
| Lab switch (TP-Link TL-SG1024DE) | — | 10.0.0.254 | Mgmt `10.0.0.254/23` gw `10.0.0.1`, static (DHCP off), web UI only. See below |
| ~~Lab switch (Dell N4032)~~ | — | ~~10.0.0.254~~ | **Offline since 2026-10-29**; IP reassigned to the TL-SG1024DE |

### TP-Link TL-SG1024DE lab switch (configured 2026-10-29) — current

Full config snapshot + rebuild steps: [`home-lab/switch/tl-sg1024de-config.md`](../home-lab/switch/tl-sg1024de-config.md).

- Easy Smart switch, HW 7.0, FW `1.0.0 Build 20230616`, MAC `B8:FB:B3:5E:0F:80`, 24× 1GbE.
  Web UI only (no SSH / CLI). Changes are written to flash on Apply — no separate "Save Config".
- Mgmt IP `10.0.0.254/23` gw `10.0.0.1`, **DHCP client disabled**. Factory default is
  DHCP-off `192.168.0.1/24`, but after a power cycle on this LAN it picked up DHCP `10.0.0.16`
  — if the switch "disappears", sweep `10.0.0.0/23` and `arp -an | grep b8:fb:b3:5e:f:80`.
- 802.1Q VLAN enabled; VLANs 1–30 (names `VLAN2`…`VLAN30`), PVID 1 on all ports.
  - Ports 1–6: access, VLAN 1 untagged only.
  - Ports 7–24: trunk, VLAN 1 untagged (native) + VLANs 2–30 tagged.
  - Max 32 VLANs on this model — only 2 free slots left.
- Jumbo frames: no MTU setting in the UI (always on on Easy Smart). **MTU 9000 verified
  2026-10-29**: temporary vmk on VDS7 VLAN 3–9 on `.95` and `.97` → ping the lab router gateway
  with 56 B / 1472 B + DF / **8972 B + DF, all 3/3** (trunk + jumbo OK across hosts).
- **1 GbE only** — the 10G NICs (`.95` / `.97` X540) negotiate 1000 on this switch.
- ⚠️ VDS7 has portgroups `VLAN31-pf` … `VLAN36-pf` (VLAN 31–36) that this switch does **not**
  carry (only 1–30 are defined, and only 2 VLAN slots are left) — traffic on those PGs goes nowhere.
- Reset button (hold ~6 s) → factory default `192.168.0.1`, wipes VLANs.

**Host ↔ switch port map** (2026-10-29 20:28 by per-port counter deltas; port 9 change at 21:00;
uplink assignment cross-checked against vCenter at 21:13):

| Port | Mode | Host / NIC | vSphere side |
|---|---|---|---|
| 1 | access | **upstream link** to another switch / home LAN (router `10.0.0.1`) | `.97` vmnic0 and `.98` vmnic2 are on that side, not on this switch |
| 4 | access | `.95` vmnic2 | vSwitch0 — `.95` management (vmk0) |
| 9 | trunk | `.95` vmnic1 | VDS7 **Uplink 2** (moved here from port 3 at 21:00) |
| 11 | trunk | `.95` vmnic0 | VDS7 **Uplink 1** |
| 17 | trunk | `.97` vmnic2 | VDS7 Uplink 1 (`.97` mgmt vSwitch0 = vmnic0, via port 1) |
| 18 | trunk | `.98` vmnic0 | VDS7 Uplink 1 (outer vCenter + RouterOS lab router VLAN trunk) |

`.97` / `.98` have no VDS7 Uplink 2 cabled; vmnic1 on both is link-down.

### Outer host networking aligned to the TL-SG1024DE (2026-10-29 ~21:00, via vCenter)

- VDS7 `Trunk-Nobinding` and `VDS7-DVUplinks-421`: VLAN trunk range **0-4094 → 0-30** (matches the
  switch; 0 kept so untagged nested traffic still passes). `VLAN31-pf`…`VLAN36-pf` are outside it.
- VDS7 Health Check **enabled** (VLAN/MTU + teaming, 1 min). Result: all three hosts VLAN 0, 2–30
  supported, MTU 9000 supported on 2–30 (VLAN 1 = native, reported "not supported" by design).
- vSwitch0 MTU 1500 → **9000** on `.97` / `.98` (`.95` already 9000).
- vmk0 MTU 1500 → **9000** on `.97` / `.98`; `.98` vmk0 mask **/24 → /23** (`255.255.254.0`).
  All three hosts now: vmk0 `/23`, gw `10.0.0.1`, MTU 9000.
- Open: `.98` VDS7 status **Out of sync** (needs Rectify in vCenter).

### Dell N4032 lab switch (configured 2026-10-28) — OFFLINE since 2026-10-29

Kept for history; replaced by the TL-SG1024DE above (same mgmt IP).

- DNOS 6, 24× 10GBase-T (`Te1/0/1–24`). SSH lands in user EXEC `>` → `enable` first.
- `Te1/0/1–4`: access, VLAN 1 (default).
- `Te1/0/5–24`: trunk, native VLAN 1, VLANs 1–200 tagged. VLAN 219 / 2049 exist but are
  **excluded** from trunks — DNOS trunks allow *all* VLANs minus excluded, so any new VLAN
  > 200 must be excluded manually.
- Port map seen 2026-10-28 ~20:10: `Te1/0/13` = uplink to home LAN (router 10.0.0.1),
  `Te1/0/8` = 10.0.0.95 VM traffic, `Te1/0/10` = 10G link, `Te1/0/11` = 10.0.0.97.
- Fans 3/4 reported **critical** after the 20:00 power cycle — check fan modules.

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
| **n8n (workflow automation)** | n8n.home.lab (CNAME) → n8n01.home.lab | 10.0.0.81 — `http://n8n.home.lab:5678`, Ubuntu 20.04 + Docker (n8n 2.42.3 + Postgres 16), outer vC host 10.0.0.97 / SSD3 / VM Network; owner `admin@home.lab`; SSH root, cred = depot/ESXi 那組; stack in `/opt/n8n` (added 2026-10-06) |
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
