# Runbook: VCF Bringup (Option B — Full)

Covers VCF 9.1 full Option B bringup in rtolab. For 9.0/5.2.1 see sub-dirs in `layer2-bringup/`.

## Pre-flight checklist

- [ ] Nested ESXi all up and passing `vmkping` across VLANs 114/115/116/117
- [ ] DNS records registered for all management VMs (use `Set-DnsRecords.ps1`)
- [ ] VCF Installer OVA deployed at `192.168.114.5`
- [ ] Timeout tuning applied to SDDC Manager (see below)
- [ ] vSAN/LSOM advanced settings applied (Layer 1)

## Apply timeout tuning BEFORE submitting

SSH into SDDC Manager → edit `/etc/vmware/vcf/domainmanager/application.properties`:

```
nsxt.manager.wait.minutes=1800
edge.node.vm.creation.max.wait.minutes=900
vsp.bootstrap.task.timeout.minutes=2400
vsp.bootstrap.command.timeout.minutes=2000
nsxt.alb.image.upload.retry.check.interval.seconds=900
vc.appliance.services.check.timeout.minutes=2400
```

Reference: `rtolab/layer2-bringup/timeout-tuning.md`

## Generate full Option B spec

```powershell
cd C:\Users\Administrator\rtolab\layer2-bringup\vcf91

# Generate base spec
pwsh -Command "& 'Generate-BringupSpec.ps1' -LabMode"

# Add Automation + Ops + Collector + License + vIDB (required for full Option B)
pwsh -Command "& '_add_auto_ops_spec.ps1'"
```

**Do not submit without running `_add_auto_ops_spec.ps1`** — base spec alone is not full Option B.

## Submit bringup

```powershell
# Validate, prompt YES, then poll every 60s
pwsh -Command "& 'New-VcfLab.ps1' -VcfInstaller https://192.168.114.5"

# For production (no nested CPU / HCL / thumbprint skip checks)
pwsh -Command "& 'New-VcfLab.ps1' -VcfInstaller https://192.168.114.5 -SkipLabMode"
```

## If bringup stalls or fails

**Prefer installer native retry/resume** — avoid manually deleting VMs or patching specs.

1. Check installer UI at `https://192.168.114.5` → view task logs
2. If a task is stuck (not failed), wait — nested storage is slow
3. If a task fails with retriable error, use installer UI "Retry" button
4. Only escalate to manual intervention after confirming installer can't recover

## Lab mode skip checks (VCF 9.1)

Injected automatically by `-LabMode`:
- `NESTED_CPU_CHECK`
- `NIC_COUNT_CHECK`
- `MIN_HOST_CHECK`
- `VSAN_ESA_HCL_CHECK`
- `ESX_THUMBPRINT_CHECK`
