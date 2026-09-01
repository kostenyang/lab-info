# Lab Info — Central Dispatcher

Single source of truth for **two separate VCF lab environments**, each in its own git repo.

> **Routing rule (for Claude):** when asked to do lab work, **first confirm which lab
> (rtolab or home lab)**, then read that side's docs below + the lab's own git repo
> before touching anything. The two labs have **non-overlapping IP spaces** — never
> carry an IP/FQDN/credential from one side to the other.

---

## ▶ Side A — rtolab

| | |
|---|---|
| **Git** | https://github.com/kostenyang/rtolab |
| **Local clone** | `C:\Users\Administrator\rtolab` |
| **Domain** | `rtolab.local` |
| **IP space** | mgmt `192.168.114.0/24` · vMotion `.115` · vSAN `.116` · NSX TEP `.117` · infra `172.16.10.x` |
| **AD/DNS** | `192.168.114.200` (kosten.rtolab.local) |
| **Outer vCenter** | `172.16.10.100` (vc-mgmt.vmware.taiwan) |
| **Automation host** | `172.16.10.32` — Windows Server 2022, **pwsh only** |
| **Shape** | 3 VCF versions coexist on one VLAN backbone (9.1 = .10–.29 · 9.0 = .30–.43 · 5.2.1 "521b" = .90–.93/.95–.98) + VCD + SSP |

**Read for rtolab work:**
- [topology/rtolab.md](topology/rtolab.md) — all IPs, FQDNs, VLANs, pools (3 versions)
- [architecture/rtolab.md](architecture/rtolab.md) — layer overview + diagram
- [status/current.md](status/current.md) — what's running / broken
- repo's own `README.md`, `SCRIPTS.md`, `docs/`, `layer{1..5}-*/`

---

## ▶ Side B — home lab

| | |
|---|---|
| **Git** | https://github.com/kostenyang/vcf9.1-lab *(repo name is `vcf9.1-lab`; the environment is `home.lab`)* |
| **Local clone** | `C:\Users\Administrator\vcf9.1-lab` |
| **Domain** | `home.lab` (secondary zone `lab.com` holds only the outer vCenter) |
| **IP space** | flat `10.0.0.0/23` — mgmt `10.0.0.x` + nested `10.0.1.x`, gw `10.0.0.1` |
| **AD/DNS** | `10.0.0.200` (KADDNS.home.lab) |
| **Outer vCenter** | `10.0.0.101` (labvc.lab.com, vSphere 8.0.3) |
| **Shape** | 3 VCF 9.1 management domains nested (m01 / m02 / m03) + standalone Ops/Automation + VCD/VCDA/HCX/SRM/Harbor/TKG |

**Read for home lab work:**
- [topology/home-lab.md](topology/home-lab.md) — **authoritative**, DNS-verified topology (all IPs/FQDNs for m01/m02/m03)
- repo's own `README.md`, `SCRIPTS.md`, `layer{1..4}-*/`

> ⚠️ The repo `vcf9.1-lab` describes a **single-instance reference template**; the
> *live* home lab is the 3-instance `home.lab` topology in
> [topology/home-lab.md](topology/home-lab.md). For IPs/FQDNs trust home-lab.md.

---

## Shared references (lab-agnostic)

| Document | Content |
|----------|---------|
| **[kostenyang/debug-vcf9.1](https://github.com/kostenyang/debug-vcf9.1)** | **VCF 9.1 除錯手冊（症狀路由 → 根因 → 可貼上的指令）— 兩個 lab 通用，先看這裡再動手** |
| [runbooks/golden-ova.md](runbooks/golden-ova.md) | Golden OVA clone + fix procedure |
| [runbooks/cdp-browser-automation.md](runbooks/cdp-browser-automation.md) | Drive any VMware web UI over Chrome DevTools Protocol — repeatable UI steps + screenshots that land as local PNGs (for deliverable docs) |
| [runbooks/bringup.md](runbooks/bringup.md) | VCF Option B full bringup flow |
| [runbooks/vks.md](runbooks/vks.md) | VKS / Supervisor setup & operations |
| [runbooks/depot-server.md](runbooks/depot-server.md) | Offline VCF depot download/serve |
| [reference/vcf-api-old-vs-new.md](reference/vcf-api-old-vs-new.md) | VCF API old-vs-new comparison |

> Most runbooks were written against **rtolab** (IPs/paths are rtolab's) — adapt
> addresses when applying to home lab.

---

## Quick reference

- Default lab password: `VMware1!VMware1!` (outer vCenters reject it — use the real cred)
- Secrets: sops+age encrypted in each repo's `inventory/secrets/`
