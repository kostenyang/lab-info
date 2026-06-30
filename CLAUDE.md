# CLAUDE.md — Lab Information Hub

This repo is the single source of truth for two VMware/VCF lab environments.
Read this before doing any work in either lab repo.

## Repos

| Repo | GitHub | Local Path | Status |
|------|--------|------------|--------|
| **rtolab** | https://github.com/kostenyang/rtolab | `C:\Users\Administrator\rtolab` | Active development — 3-version lab (VCF 9.1 / 9.0 / 5.2.1) |
| **vcf9.1-lab** | https://github.com/kostenyang/vcf9.1-lab | `C:\Users\Administrator\vcf9.1-lab` | Reference template — single VCF 9.1 |

## When starting any lab work

0. **Confirm which lab first** — `rtolab` or `home lab`. They have non-overlapping IP
   spaces; never carry an IP/FQDN/credential across them. (`192.168.114.x`/`172.16.10.x`
   → rtolab; `10.0.0.x`/`10.0.1.x` → home lab.) See `README.md` for the two-side split.
1. Read the lab's topology — `topology/rtolab.md` **or** `topology/home-lab.md`
   (home lab's authoritative doc; the `vcf9.1-lab` repo's own docs are a reference
   template only). Never assume an IP.
2. Read `status/current.md` — what's running, what's broken, current stage (rtolab-focused today).
3. Check `runbooks/` before doing Layer 2 / 3 / 4 operations (mostly written against rtolab — adapt IPs for home lab).
4. Check memory at `C:\Users\Administrator\.claude\projects\...\memory\` for known traps.

Then go to that lab's **own git repo** (`C:\Users\Administrator\rtolab` or
`C:\Users\Administrator\vcf9.1-lab`) and read its `README.md` / `SCRIPTS.md` / layer docs.

## Allocating a new IP (do this EVERY time, in this order)

Never assign a 192.168.114.x address until it passes **all three** checks. Any single source has blind spots — the union is the only safe gate.

1. **DNS reverse zone first** — dump every PTR and reject the IP if it has *any* record:
   `Get-DnsServerResourceRecord -ZoneName '114.168.192.in-addr.arpa' -CimSession <cim>` (CIM to .200; from the workgroup host use UPN cred `administrator@rtolab.local`, NetBIOS `rtolab\administrator` is denied). **If DNS has a record → the IP is taken, do not use it**, even if nothing answers ping (reservations are often deployed later).
2. **lab-info + inventory** — grep `lab-info` and `rtolab/inventory` for the IP (catches VIPs/pools with no DNS: Supervisor .19, edge uplinks .72/.73, automation pool .78–83, VKS .100/26).
3. **ping** — `Test-Connection -Count 1 -Quiet` (catches live-but-undocumented hosts, e.g. `.62` answers ping with no DNS and no doc entry).

Per-version ranges are reserved as whole blocks: **9.1 = .10–.19, 9.0 = .30–.43, 5.2.1 = .50–.59** (so `.55` is 521 territory — an SSP attempt there collided with the stale `kosten-vcf521-sddc` reservation and had to move to `.66`). When a stale record belongs to another deployment, **don't delete it — pick a different IP**.

## Key facts that surprise people

- **rtolab runs 3 VCF versions simultaneously** — non-overlapping IPs per version. VCF 9.1 uses .10-.19 range, 9.0 uses .30-.43, 5.2.1 uses .50-.59 (all in 192.168.114.x).
- **Automation host is Windows Server 2022** at `172.16.10.32` — all PowerShell, pwsh only (not powershell.exe).
- **Outer vCenter** is `172.16.10.100` (vc-mgmt.vmware.taiwan) — hosts the nested ESXi VMs.
- **AD/DNS** is `192.168.114.200` — authority for `rtolab.local` zone.
- **Secrets** are sops+age encrypted in `inventory/secrets/lab.yaml` — never stored in plain text.
- **All passwords default to** `VMware1!VMware1!` in lab (William Lam convention).
- **vmx-19 is required** for nested ESXi on SELAB-Cluster — vmx-14 causes PSOD at 0.73s.
- **Golden OVA clones need 3 fix scripts** before use: Fix-CloneNetwork → Apply-CloneIp → Regen-EsxiCert.
- **pwsh -File quirk**: pass `-Hosts` arrays with `pwsh -Command "& 'script.ps1' -Hosts ..."` not `-File`.
- **outer dvSwitch swsec stale** can drop 75% packets after failed bringup — toggle PG promisc False/True to fix.
- **VCF 9.1 bringup needs full Option B spec** — run `_add_auto_ops_spec.ps1` to add Automation+Ops+Collector+License+vIDB.

## Do NOT

- Store actual secrets here — secrets live in `rtolab/inventory/secrets/` (sops encrypted).
- Hardcode IPs without checking `topology/rtolab.md` — three versions share VLANs.
- Assign a new IP without the 3-way free-check above — **DNS reverse zone first; a record there means taken**, ping-free is not enough.
- Run `powershell.exe` — always `pwsh`. PowerShell 5.1 mangles Traditional Chinese strings.
- Skip bringup timeout tuning — apply `layer2-bringup/timeout-tuning.md` workarounds before submitting.
- Manually delete VMs / patch specs during stuck bringup — prefer installer native retry/resume first.

## Layer map (rtolab)

| Layer | Dir | What it does |
|-------|-----|-------------|
| Layer 1 | `layer1-nested/` | Deploy + prep nested ESXi (vSAN/LSOM advanced settings) |
| Layer 2 | `layer2-bringup/` | VCF Installer / Cloud Builder bring-up (vcf90, vcf91, vcf521 sub-dirs) |
| Layer 3 | `layer3-postbringup/` | Post-bringup: commission domains, NSX, VCFA, VKS bootstrap |
| Layer 4 | `layer4-day2/` | Day-2: batch ESXi upgrade, vSAN workarounds, cert regen |
| Layer 5 | `layer5-vks/` | VKS Supervisor: NSX VPC + Supervisor + VKS cluster |
