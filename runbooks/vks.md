# Runbook: VKS / Supervisor

## Context

- **VSP** (vSphere with Tanzu Supervisor) runs inside VCFA (.19–.23 range) — this is an internal platform component, NOT user VKS.
- **User VKS** is activated separately via `layer5-vks/` scripts.
- NSX 9.1 lab defaults to DTGW (Distributed Tier-1 Gateway) — no dedicated edge cluster needed for Supervisor networking, but no routing between VPCs without explicit config.
- VKS scripts live in a separate repo: https://github.com/kostenyang/vcf9.1vks

## VKS IP reservations (rtolab VCF 9.1)

See `topology/rtolab.md` → "Layer 5 VKS" section for full IP table.

Key ranges:
- External IP block: `192.168.114.100/26`
- Supervisor CP VMs (5 IPs): `.101–.105`
- Supervisor mgmt GW: `.106`
- LB VIP pool: `.107–.127`
- Transit GW private: `100.64.0.0/24`
- VPC Private CIDR: `172.30.0.0/16`
- Service CIDR: `10.96.0.0/23`

## Layer 5 scripts (rtolab)

Located in `C:\Users\Administrator\rtolab\layer5-vks\`

```
Step0-prereqs.ps1      NSX VPC prerequisites
Step1-nsx-vpc.ps1      Create NSX VPC + external block
Step2-supervisor.ps1   Activate Supervisor on management domain
Step3-vks-cluster.ps1  Create user VKS workload cluster
Step4-kubeconfig.ps1   Fetch kubeconfig + verify kubectl access
```

## Access Supervisor / VSP from automation host

```powershell
# Get Supervisor API VIP
$supVip = "192.168.114.19"

# kubectl via kubeconfig (fetched by Step4)
kubectl --kubeconfig $env:KUBECONFIG get namespaces
```

## Known issue: etcd fsync latency

Nested-on-nested vSAN + physical vSAN resync → VSP Supervisor etcd fsync 135ms–4s (healthy: <10ms).

Fix:
1. Change nested vSAN storage policy to FTT=0 (no mirror)
2. Wait for physical vSAN resync to complete
3. Disable HA admission control
4. Scale `domainmanager` timeouts ×10 (see `runbooks/bringup.md`)
