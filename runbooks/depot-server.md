# Runbook: Offline Depot Server (`rtolab-depotsrv`)

The rtolab offline VCF software depot. Holds VCF install + upgrade/patch binaries and
serves them over plain HTTP to the VCF Installer / SDDC Manager (no Broadcom Connect
reachability needed from the mgmt segment).

## Identity

| Item | Value |
|------|-------|
| Hostname | `rtolab-depotsrv` (**no DNS record** — reference by raw IP) |
| IP | `172.16.10.50` (jumpbox segment 172.16.10.0/24) |
| OS / creds | Ubuntu; `root` / `ubuntu` = `VMware1!VMware1!` (SSH via Posh-SSH from jumpbox) |
| Web server | nginx `:8888`, autoindex on. `location /PROD/ → /depot/PROD/`, `/vcf9/ → /depot/` |
| Depot URL | `http://172.16.10.50:8888/PROD/` |
| VM | outer host `172.16.10.3`, datastore `esxi-vol3`, folder `kosten-rtolab`, **180 GB thin vmdk** |
| Deploy script | rtolab `scripts/_deploy_depot_seed.ps1` (cloud-init seed ISO → static .50) |

**Not** the same as `kosten-depot` @ 192.168.114.65 (separate mgmt-segment depot, currently down).
The `.50` is a number coincidence with retired 521 `kosten-vcf521-esx01` @ 192.168.114.50 — different
/24, no conflict.

## Point the VCF Installer at it

rtolab `scripts/_inst_depot.ps1` waits for the 9.1 Installer (192.168.114.5) then:
`PUT /v1/system/settings/depot {isOfflineDepot:true, url:"http://172.16.10.50:8888"}`
→ `PATCH /v1/system/settings/depot/depot-sync-info` (metadata sync) → poll → `GET /v1/bundles`.

## Download binaries onto the depot

The **VCF Download Tool** is installed **on the depot VM itself** at `/root/vcf-download-tool`
(v9.0.2.0.25151284; also `/root/vcf-download-tool-91`). Broadcom Connect token: `/root/vcf-token.txt`.
The VM has internet (gw 172.16.10.254, DNS 8.8.8.8). All downloads land in `/depot/PROD/COMP/<COMPONENT>/`.

```bash
# SSH in (from jumpbox, Posh-SSH): root / VMware1!VMware1!
cd /root/vcf-download-tool/bin

# INSTALL binaries (greenfield deploy set) — helper: /root/run-vdt.sh
./vcf-download-tool binaries download --depot-store=/depot \
  --depot-download-token-file=/root/vcf-token.txt --ceip=DISABLE \
  --vcf-version=9.1.0.0 --automated-install -t INSTALL

# UPGRADE / PATCH binaries (SDDC-Manager-managed lifecycle)
./vcf-download-tool binaries download --depot-store=/depot \
  --depot-download-token-file=/root/vcf-token.txt --ceip=DISABLE \
  --vcf-version=9.1.0.0 --lifecycle-managed-by=SDDC_MANAGER_VCF -t UPGRADE

# List what's available (same filters, swap `download`→`list`) before pulling
# Free disk: `./vcf-download-tool binaries cleanup ...`
```

Behaviour: **cumulative** — re-running skips already-present + checksum-valid files
(`ALREADY_DOWNLOADED`), so it's safe/idempotent. `-t` only accepts `INSTALL | UPGRADE`
(no `PATCH`). Newer patch builds appear **only** under `-t UPGRADE` — there is **no INSTALL
bundle published beyond 9.1.0.0 GA**. Log: `/root/vcf-download-tool/log/vdt.log`.

## Disk / growing the vmdk

Single 180 GB thin disk → `/dev/sda1` (ext4) on `/`. Datastore `esxi-vol3` has ~2.5 TB free,
so grow freely when a download set won't fit:

1. Outer vCenter (172.16.10.100, `administrator@vmwaresso.taiwan` / `381VMware1!admin`):
   `Get-VM rtolab-depotsrv | Get-HardDisk | Set-HardDisk -CapacityGB <new>` (no snapshot must exist).
2. In guest: `growpart /dev/sda 1 && resize2fs /dev/sda1` (online, ext4-safe).

> Partition layout is GPT: `sda14` (bios_grub) + `sda15` (EFI) sit **before** `sda1` (root),
> so `growpart /dev/sda 1` extends root into trailing free space. If `growpart` says `NOCHANGE`,
> the partition already fills the vmdk → grow the vmdk first (step 1).

## Current contents (2026-06-18)

Full **9.1.0.0 INSTALL** set (vCenter, NSX, SDDC Mgr, VCFA/VRA, VROPS, Ops Proxy, vIDB, HCX,
License, Salt, Telemetry, VSP, …). Depot ≈ 144 GB used / 31 GB free.

**9.1.0.0100 async patch (released 2026-06-05) — downloaded + checksum-validated 2026-06-17**
(`/root/newpatch-dl.log`: `5 SUCCESS | 0 FAILED`):

| Component | Patch version | Size |
|-----------|---------------|------|
| ESX_HOST | `9.1.0.0100.25433460` | 0.7 GB |
| SDDC_MANAGER_VCF | `9.1.0.0100.25428926` | 2.4 GB |
| HCX | `9.1.0.0100.25426672` | 4.7 GB |
| NSX_T_MANAGER | `9.1.0.0100.25470810` | 6.4 GB |
| VCENTER | `9.1.0.0100.25417926` | 28.7 GB |

GA (`…2537xxxx`, 2026-05-12) builds remain alongside the patch builds (download is cumulative).
