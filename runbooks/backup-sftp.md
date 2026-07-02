# Runbook: SFTP Backup Server (`rtolab-sftp`)

External SFTP target for **SDDC Manager (VCF) scheduled backups** in rtolab. Dedicated,
chroot'd, sftp-only account — no shell, no other lab role.

## Identity

| Item | Value |
|------|-------|
| Hostname | `rtolab-sftp` (**no DNS record** — reference by raw IP) |
| IP | `172.16.10.51` (jumpbox segment; free-checked 3-way 2026-07-02) |
| OS / admin creds | Ubuntu 20.04; `root` / `ubuntu` = `VMware1!VMware1!` (SSH via Posh-SSH) |
| VM | outer host (esxi-vol3 owner), datastore `esxi-vol3`, folder `rtolab-vcf91`, 200 GB thin (auto-grown root) |
| Deploy scripts | rtolab `scripts/_build_sftp_seed.ps1` (cloud-init seed) + `scripts/_deploy_sftp_vm.ps1` |

## SFTP backup account

| Item | Value |
|------|-------|
| Username | `sddcbackup` |
| Password | `VMware1!VMware1!` (lab default) |
| Shell | `/usr/sbin/nologin` (sftp-only) |
| Chroot | `/srv/sftp` (root:root 755) — user is jailed here |
| Writable dir | `/srv/sftp/backups`, seen **inside SFTP as `/backups`** (sddcbackup:sddcbackup 750) |

sshd config (in `/etc/ssh/sshd_config`): `Subsystem sftp internal-sftp` + `Match User sddcbackup`
→ `ChrootDirectory /srv/sftp` + `ForceCommand internal-sftp`.

## SDDC Manager backup configuration

Point SDDC Manager → Administration → Backup at:

| Field | Value |
|-------|-------|
| SFTP server | `172.16.10.51`  port `22` |
| Username | `sddcbackup` |
| Password | `VMware1!VMware1!` |
| Backup directory | `/backups` |
| SSH fingerprint (RSA) | `SHA256:eoC8XxnXXXTi2gfyH1WMX1QV/1y3m2889pt/WQWZ+C8` |
| SSH fingerprint (ED25519) | `SHA256:Ped/O/Qk8d0981v3SlGdP7wIPIzhK1YOwWDD8YhsDpc` |

(Re-read fingerprints anytime: `ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub` on the box.)

## Rebuild

```powershell
pwsh C:\Users\Administrator\rtolab\scripts\_build_sftp_seed.ps1   # → _seed_sftp.iso
pwsh C:\Users\Administrator\rtolab\scripts\_deploy_sftp_vm.ps1    # deletes stale, redeploys .51
```

Wait ~135 s for cloud-init (static IP + user + chroot + sshd restart). Verify with an SFTP login
as `sddcbackup` and a write into `/backups`.

> **Gotcha (fixed in script):** attach the seed ISO with `Set-CDDrive -StartConnected` only — adding
> `-Connected:$true` fails while the VM is powered off, which silently boots the VM without the
> cloud-init seed (no static IP, no user).
