# Runbook: VKS / Supervisor

## Context

- **VSP** (vSphere with Tanzu Supervisor) runs inside VCFA (.19–.23 range) — this is an internal platform component, NOT user VKS.
- **User VKS** is activated separately via `layer5-vks/` scripts.
- NSX 9.1 lab defaults to DTGW (Distributed Tier-1 Gateway) — no dedicated edge cluster needed for Supervisor networking, but no routing between VPCs without explicit config.
- VKS scripts live in a separate repo: https://github.com/kostenyang/vcf9.1vks

## Status (2026-06-18)

**目標**：在 rtolab VCF 9.1 (`vcf-m02`, vCenter .11 / NSX VIP .13) 起 user VKS 給 VCFA 用，走 **Path A — DTGW + VNA**（NSX 9.1 預設分散式 TGW，免 edge cluster）。

**本次 run 進度**：
- ✅ **Step 1 完成** — NSX 建好 external / private-TGW IP blocks + `vcf-m02-vks-vpc-profile`（VPC Connectivity Profile）；Supervisor content library 已建。
- 🟠 **VNA cluster `vcf-m02-vna-01` 部署中（In Progress）** — appliance VM `vcf-m02-vna01`（@ .106）佈署/開機初始化中，NSX → System → Fabric → VNA Clusters 顯示 In Progress、Node Connectivity 1 Not Available（正常早期階段，約 15–30 分鐘 Up）。
- ⏳ **Supervisor 尚未啟用** — 待 VNA Up 後接 DVC/TGA → Activate Supervisor。

**端到端已驗證（2026-06-08~09）**：同一 lab 先前已跑通 Supervisor RUNNING → namespace `vks-automation` → VKS guest cluster `vks-auto-01` Available（v1.34.2，CP .135，SNAT via VNA）。完整實機 UI walkthrough 已做成簡報：
- **`VKS-on-VCF91.pptx`（29 頁）** in repo `vcf9.1vks`，含 Activate Supervisor wizard Step 1–7、NSX IP blocks / VPC profile、Supervisor Configure（mgmt/workload/storage）、Content Libraries、Namespace、VKS cluster running、踩坑修正（Pod CIDR 衝突、MHC timeout）。
- 截圖來源 / 重建：depotsrv (`rtolab-depotsrv` 172.16.10.50) `/root/vks-ui-screenshots/` → `cd vcf9.1vks; py make_ppt.py`。

> ⚠️ **IP 漂移**：下方「VKS IP reservations」是早期規劃值（External `.100/26`、mgmt GW `.106`…），與**實際部署值不符**。實際 deck/腳本用：External block `192.168.114.128/26`、Private TGW `172.30.0.0/16`、Supervisor Service CIDR `172.29.0.0/16`、VPC Default Private `172.28.0.0/16`、K8s API `.132`、VKS CP `.135`。以 `vcf9.1vks` repo 為準。

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
