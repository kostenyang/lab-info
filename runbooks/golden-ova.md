# Runbook: Golden OVA Clone

VCF 9.1 OVA is not fully baked — every clone needs three fix scripts before the host is usable.

## Required sequence (never skip)

```powershell
# Step 1 — Fix network adapter mapping after clone
pwsh -Command "& 'Fix-CloneNetwork.ps1' -Hosts esx01,esx02,esx03,esx04"

# Step 2 — Apply correct IPs (vmk0 set needs two steps: IP/mask first, then gateway)
pwsh -Command "& 'Apply-CloneIp.ps1' -Hosts esx01,esx02,esx03,esx04"

# Step 3 — Regenerate self-signed certificate (clone has original OVA cert)
pwsh -Command "& 'Regen-EsxiCert.ps1' -Hosts esx01,esx02,esx03,esx04"
```

**Use `pwsh -Command "& '...'" -Hosts a,b,c,d` syntax — not `pwsh -File`.**
`-File` mangles array parameters.

## vmk0 IP set order (chicken-and-egg)

`ipv4 set -g` (gateway) fails if IP/mask not set first.
Script must: set IP+mask → then set gateway separately.

## Deploy-FromGoldenOva must use NestedHV

```powershell
Deploy-FromGoldenOva.ps1 -NestedHV  # always pass this flag
```

Without `-NestedHV`, the VM hardware version won't expose VT-x to nested ESXi.

## Outer dvSwitch swsec stale (after multiple failed bringups)

If clone network looks correct but ~75% of packets are dropped on the trunk portgroup:

1. Outer vCenter → trunk portgroup → port-level security
2. Toggle **Promiscuous mode**: set to `Reject` → `Accept` (or False → True)
3. Verify with `vmkping` across VLANs

Root cause: stale swsec filter entries accumulate after bringup failures.

**When to flush**: after every fresh deploy (new vmk0 MAC), after Fix-CloneNetwork
(vmk0 re-bound = new MAC), and after vMotion to another outer host. If SSH/ping to a
nested host suddenly times out right after one of these events, flush first before
debugging anything else.

## Duplicate `/system/uuid` (9.1 OVA — not baked out yet)

Every 9.1 clone boots with the same `/etc/vmware/esx.conf` uuid suffix `005056a58fa9`.
vSAN will refuse to form (or partition) with duplicate node UUIDs. Fix per host BEFORE
bringup, via SSH (root / lab default pw):

```sh
# esx0N → suffix f0N (f01..f04)
sed -i 's|005056a58fa9|005056a58f0N|' /etc/vmware/esx.conf
/sbin/generate-certificates     # AFTER hostname is correct (cert CN)
/sbin/auto-backup.sh            # persist before reboot
reboot
```

Verify after reboot: `esxcli system uuid get` ends in `f01..f04`.

**Do NOT** upload a bundled fix script via `echo $b64 | base64 -d` (produced 0-byte file
once) and do NOT bundle `hostd restart` mid-script (drops the SSH session). Run
individual commands.

## esx01 hostname stays `localhost`

`Fix-CloneNetwork.ps1` skips esx01 (it keeps the baked .14 IP), so its hostname and cert
CN stay `localhost`. Fix manually before cert regen:

```sh
esxcli system hostname set --fqdn=kosten-vcf91-esx01.rtolab.local
/sbin/generate-certificates
```

## DRS VM groups empty out on VM deletion

Outer cluster DRS **VM groups lose their members when the member VMs are deleted**
(rules and host groups survive). After every wipe+redeploy, repopulate:

- `rtolab-vms-4` ← esx01, esx02 (pinned to 172.16.10.4 via `rtolab-vms4-on-h4`)
- `rtolab-vms-6` ← esx03, esx04 (pinned to 172.16.10.6 via `rtolab-vms6-on-h6`)
- `rtolab-nested-91` ← all four

`other-nested-keep-off-46` / `rtolab-evict-all-off-46` (MustNotRunOn) persist on their
own — they reference VMs that still exist.

## Layer 1 vSAN/LSOM settings (apply via SSH per host)

`Prepare-NestedESXi.ps1` prompts interactively (Get-Credential) — for unattended runs
apply directly:

```sh
esxcli system settings advanced set -o /LSOM/VSANDeviceMonitoring      -i 0
esxcli system settings advanced set -o /LSOM/lsomSlowDeviceUnmount    -i 0
esxcli system settings advanced set -o /VSAN/SwapThickProvisionDisabled -i 1
esxcli system settings advanced set -o /VSAN/Vsan2ZdomCompZstd        -i 0
esxcli system settings advanced set -o /VSAN/FakeSCSIReservations     -i 1
esxcli system settings advanced set -o /VSAN/GuestUnmap               -i 1
```

Expected verify order: `0,0,1,0,1,1`.

## vSAN FTT=0 is the lab standard (already in the bringup spec)

The 9.1 bringup spec creates `vcf-m02-cl01 vSAN Storage Policy` with
`hostFailuresToTolerate = 0` and sets it as the vSAN **datastore default** — all
management VMs (vc/sddc/nsx/ops/lic/vspp/VCFA) land on FTT=0 automatically.
**Nothing to do post-bringup; do not "fix" it back to FTT=1.** Rationale: nested
all-flash vSAN, capacity/IO over redundancy; FTT=0 also mitigates the Supervisor etcd
fsync-latency issue.

## Proven full-rebuild sequence (validated 2026-06-12, FULL 9.1+VCFA confirmed 2026-06-17)

1. `_redeploy_nested.ps1` — wipe + redeploy 4 clones from golden OVA (thin, NestedHV)
2. Flush trunk PG swsec
3. `Fix-CloneNetwork.ps1 -Hosts esx02,esx03,esx04` (esx01 keeps .14)
4. Flush trunk PG again (new MACs)
5. Per-host SSH: uuid sed → esx01 hostname → generate-certificates → auto-backup → reboot
6. Repopulate DRS VM groups + vMotion to 2/2 (esx01/02→.4, esx03/04→.6)
7. Layer 1 settings via SSH (six values above)
8. NTP: set `192.168.114.200` + start ntpd on all 4. ESXi SSH (TSM-SSH) auto-stops after
   idle / after validation probes — if SSH refuses (`port 22 connection refused` while 443
   is up = host healthy, service just stopped), configure NTP via **PowerCLI EsxCli over 443**
   instead (`Add-VMHostNtpServer` + `Set-VMHostService -Policy On` + `Start-VMHostService`).
9. IP sweep `.2–.99` — every spec IP must be free (esp. VCFA pool .78–.83)
10. Installer: confirm no `IN_PROGRESS` orphan → `POST /v1/sddcs/validations` →
    expect `COMPLETED/WARNING` (nested-lab warnings OK: ntpd, boot disk <32GB, cores<110,
    storage <required — all WARNING, no FAILED) → `POST /v1/sddcs`

**2026-06-17 result**: this exact sequence completed a full VCF 9.1 + VCFA bringup
**312/312, 0 failures** (sddcId `vcf-m02`, id `50f522f6`). sddcId `vcf-m02` did **not**
collide with `ALREADY_EXISTS` despite 25 prior records in the installer DB.

**OSDATA UUID is NOT a blocker (myth busted)**: all 4 clones share an identical OSDATA
volume UUID (`OSDATA-…-005056a58fa9`, the master's baked MAC) — but the VCFA/VSP
multi-node vSAN ESA stage passed anyway with no `vmdk not found` cross-host clone failure.
Unique `/system/uuid` (f01–f04) is sufficient for multi-node nested vSAN; the OSDATA volume
UUID is cosmetic (VMFS-L system partition), not the vSAN node identity. Earlier notes
claiming "OSDATA deadlock → must use kickstart ISO" are wrong — do not abandon the
OVA-clone path on that basis.
