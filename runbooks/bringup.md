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

## VCFA/VSP stage — leader-election fragility (nested vSAN)

Three components lose leases under nested vSAN latency; all three must be patched or the
whole stage can collapse (validated 2026-06-12):

1. **kube-controller-manager / kube-scheduler** crashloop → run
   `pwsh ./scripts/Fix-VspLeaderElection.ps1 -ControlPlaneIp <node>` (sets
   `--leader-elect-renew-deadline=100s` in the static manifests).
2. **kube-vip** panics by design on lost lease (default lease 15s / renew 10s / retry 2s).
   Crashloop = API VIP (.19) unbound = whole cluster "no route to host" via admin.conf.
   Patch on the control-plane node:

   ```sh
   sudo sed -i '/vip_leaseduration/{n;s/"15"/"120"/}; /vip_renewdeadline/{n;s/"10"/"100"/}; /vip_retryperiod/{n;s/"2"/"20"/}' /etc/kubernetes/manifests/kube-vip.yaml
   ```

   Verify: `kube-vip` pod Running 0 restarts, `ip addr show eth0 | grep <VIP>` shows /32.

SSH to VSP nodes: `vmware-system-user` / lab default pw; kubectl needs
`echo <pw> | sudo -S kubectl --kubeconfig=/etc/kubernetes/admin.conf ...`.
Single control plane node holds admin.conf (find via inner vCenter VM list).

## After a VIP/API outage — cascade recovery order (validated 2026-06-13)

A multi-hour VSP API outage mid-bringup leaves this damage chain. Fix in THIS order:

1. **Inner vCenter services half-dead** — `service-control --status` shows
   `vmware-cis-license`, `vmware-sps`, `wcp`, `vmware-vpxd-svcs`, `vmware-eam` stopped.
   Fix: `service-control --start --all` (15-30 min, not cancellable). Symptoms while broken:
   host Reconnect fails "Cannot complete the license assignment operation"; CNS detach
   fails `vim.fault.CnsFault`.
2. **Nested hosts NotResponding in inner vCenter** (network is fine — vc can ping/curl
   them). vpxa hung. SSH on hosts is disabled post-bringup, so connect PowerCLI
   **directly to each host's hostd** (root / lab pw) and
   `Restart-VMHostService` on key `vpxa`. Then Reconnect from vCenter (needs license
   service up first — step 1).
3. **CSI VolumeAttachments stuck DELETING** — pods migrated during outage; old attach
   never detached (`HostNotConnected`), new attach fails `ResourceInUse`. Resolves itself
   once steps 1-2 restore detach path; only then do seaweedfs/zot/etcd PVCs attach.
4. **VSP platform pods** (seaweedfs → zot registry → ImagePullBackOff everywhere → Fleet
   Build 500) recover bottom-up after volumes attach. Fleet LCM retry only AFTER
   `vcf-fleet-*` / `vmsp-platform` namespaces are clean.

Installer-native retry: `PATCH /v1/sddcs/{id}` once a terminal COMPLETED_WITH_FAILURE.

## Lab mode skip checks (VCF 9.1)

Injected automatically by `-LabMode`:
- `NESTED_CPU_CHECK`
- `NIC_COUNT_CHECK`
- `MIN_HOST_CHECK`
- `VSAN_ESA_HCL_CHECK`
- `ESX_THUMBPRINT_CHECK`
