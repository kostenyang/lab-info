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
