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

## Rebuild traps hit 2026-06-28 (current golden OVA) — READ before next rebuild

After a mgmt-plane loss (10 inaccessible FTT=0 vSAN objects from an outer-vSAN freeze;
vCenter/SDDC VM-home namespaces gone, unrecoverable → full re-bringup), `_prep_redeployed`
and the vmk0 handling bit twice. Net lessons:

1. **GuestOps can't persist files on this OVA build.** Inside `StartProgramInGuest`, `esxcli`
   works but `touch /etc/*`, `/sbin/auto-backup.sh` (sourcing `BootbankFunctions.sh`), and
   `/etc/init.d/SSH` all return **"Operation not permitted"** (GuestOps sandbox, NOT the host —
   execInstalledOnly=false, Secure Boot off). So `_prep_redeployed`'s `touch /etc/rtolab-configured`
   + `auto-backup` silently fail → after the hard power-cycle the host reverts: IP→baked `.14`,
   `/system/uuid`→shared `…8f:a9`. **Do the persist-critical steps over real SSH**, where root
   has full perms. GuestOps is fine only for `esxcli` (incl. setting a temporary distinct IP so
   you can SSH per-host).

2. **vmk0 MAC rule (cost 2 failed bringup retries at `Migrate ESX Host Management vmknic to
   vSphere Distributed Switch` → `VSPHERE_CONFIGURE_HOST_DVS_FAILED` / `HostCommunication`):**
   vmk0 MAC must be **unique per host AND ≠ that host's vmnic0 HW MAC** (see
   `rtolab/layer2-bringup/nested-bringup-fixes.md` #1). The OVA bakes all 4 vmk0 to the same
   `00:50:56:a5:8f:a9` (collision → only 1 host reachable); rebinding to **vmnic0's HW MAC** is
   ALSO wrong (vmk0 migrates onto the inner vDS → outer dvSwitch sees the same MAC on the uplink
   port and the vmk port → MAC learning collapses → host NotResponding → rollback → task fails).
   **RIGHT: let ESXi auto-generate** — `esxcli network ip interface add -i vmk0 -p 'Management
   Network'` with NO `--mac-address` → picks a unique `00:50:56:6x:xx:xx` (≠ vmnic0 `a5:xx`).

3. **TSM-SSH auto-stops when idle** (port 22 "Connection refused" while 443 up = host healthy,
   service stopped). Re-enable via PowerCLI direct-to-host `Start-VMHostService TSM-SSH` (root /
   lab pw), then SSH in.

4. **Installer-native retry** after `COMPLETED_WITH_FAILURE`: `scripts/_retry_bringup.ps1 -Id
   <sddc-id>` (PATCH `/v1/sddcs/{id}?skipValidations=true`). Flush trunk-PG swsec right before
   each retry. The wrapper `Submit-Bringup.ps1` poll loop dies after ~1 h on **JWT expiry** (no
   token refresh) — harmless, bringup runs server-side; monitor with a poller that re-auths each
   call (`completionPercent` is null on this build — use `sddcSubTasks` counts instead).

Corrected per-host recovery order that worked: GuestOps set distinct IP → GuestOps re-add vmk0
with NO mac (auto) + IP → flush swsec → SSH set unique `/system/uuid` + `touch
/etc/rtolab-configured` + `generate-certificates` + `auto-backup.sh` → graceful `reboot` →
verify (uuid f0N, vmk0 unique & ≠ vmnic0, vmkping gw) → Layer1 + NTP → validate → submit.
