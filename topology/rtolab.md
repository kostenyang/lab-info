# rtolab — Topology Reference

**Domain**: `rtolab.local` | **Repo**: https://github.com/kostenyang/rtolab

Three VCF versions coexist with non-overlapping IPs on the same VLAN backbone.

---

## Infrastructure (shared)

| Component | FQDN | IP | Role |
|-----------|------|----|------|
| Outer vCenter | vc-mgmt.vmware.taiwan | 172.16.10.100 | Hosts all nested ESXi VMs; VDS: selab-dswitch |
| AD / DNS / NTP | kosten.rtolab.local | 192.168.114.200 | rtolab.local zone authority; Windows Server |
| Automation host | selab-win2022-jump.rtolab.local | 172.16.10.32 | Windows Server 2022; runs all PowerShell scripts |

**Outer vCenter resource pool**: `Kosten`
**Outer vCenter datastore**: `vsanDatastore-RTO`
**Outer trunk portgroup**: `trunk` (VLAN 0–4094, MAC learning enabled)
**Outer vCenter SSO domain**: `vmwaresso.taiwan`

---

## Network (shared VLANs)

| VLAN | CIDR | Gateway | Portgroup | Role |
|------|------|---------|-----------|------|
| 114 | 192.168.114.0/24 | 192.168.114.254 | selab-dswitch-pg114 | Management |
| 115 | 192.168.115.0/24 | 192.168.115.254 | selab-dswitch-pg115 | vMotion |
| 116 | 192.168.116.0/24 | 192.168.116.254 | selab-dswitch-pg116 | vSAN |
| 117 | 192.168.117.0/24 | 192.168.117.1 | selab-dswitch-pg117 | NSX TEP (Overlay) |

---

## VCF 9.1 (IP range: .10–.29 / .14–.17 for ESXi)

### Management VMs

| Component | FQDN | IP |
|-----------|------|----|
| VCF Installer | kosten-vcf91-inst.rtolab.local | 192.168.114.5 |
| SDDC Manager | kosten-vcf91-sddc.rtolab.local | 192.168.114.10 |
| inner vCenter | kosten-vcf91-vc.rtolab.local | 192.168.114.11 |
| NSX Manager node | kosten-vcf91-nsxn1.rtolab.local | 192.168.114.12 |
| NSX Manager VIP | kosten-vcf91-nsx.rtolab.local | 192.168.114.13 |
| Supervisor CP VIP | — | 192.168.114.19 |
| NSX Edge 01 | kosten-vcf91-en01.rtolab.local | 192.168.114.70 (mgmt), 192.168.114.72 (uplink) |
| NSX Edge 02 | kosten-vcf91-en02.rtolab.local | 192.168.114.71 (mgmt), 192.168.114.73 (uplink) |
| VCF Operations | kosten-vcf91-ops.rtolab.local | 192.168.114.75 |
| Ops Collector | kosten-vcf91-ops-coll.rtolab.local | 192.168.114.76 |
| VCF Automation | kosten-vcf91-auto.rtolab.local | 192.168.114.77 |
| Automation pool | — | 192.168.114.78–83 (6 IPs) |
| VCFA Platform VIP | kosten-vcf91-vcfa-platform.rtolab.local | 192.168.114.87 |
| License Server | kosten-vcf91-lic.rtolab.local | 192.168.114.85 |
| vIDB | kosten-vcf91-vidb.rtolab.local | 192.168.114.86 |

### Nested ESXi Hosts

| Host | VM Name | mgmt IP | vMotion IP | vSAN IP |
|------|---------|---------|-----------|---------|
| esx01 | vcf-m02-esx01-91 | 192.168.114.14 | 192.168.115.14 | 192.168.116.14 |
| esx02 | vcf-m02-esx02-91 | 192.168.114.15 | 192.168.115.15 | 192.168.116.15 |
| esx03 | vcf-m02-esx03-91 | 192.168.114.16 | 192.168.115.16 | 192.168.116.16 |
| esx04 | vcf-m02-esx04-91 | 192.168.114.17 | 192.168.115.17 | 192.168.116.17 |

FQDNs: `kosten-vcf91-esx0{N}.rtolab.local` (mgmt), `kosten-vcf91-esx0{N}-vmot.rtolab.local` (vMotion), `kosten-vcf91-esx0{N}-vsan.rtolab.local` (vSAN)

### IP Pools

| Pool | Range |
|------|-------|
| NSX TEP | 192.168.117.32–.95 |
| NSX Edge TEP | 192.168.117.28–.31 |
| VKS External Block | 192.168.114.100/26 |
| VKS Supervisor CP | 192.168.114.101–105 |
| VKS Supervisor GW | 192.168.114.106 |
| VKS LB VIP pool | 192.168.114.107–127 |
| VKS Transit GW | 100.64.0.0/24 |
| VKS VPC Private | 172.30.0.0/16 |
| VKS Service CIDR | 10.96.0.0/23 |
| VCFA Internal CIDR | 172.27.0.0/16 |

### Artifacts

| File | Path on E:\ |
|------|-------------|
| Nested ESXi OVA | `E:\9.1\Nested_ESXi9.1.0.0_Appliance_Template_v1.0-vmx19.ova` |
| ESXi ISO | `E:\9.1\VMware-VMvisor-Installer-9.1.0.0.25370933.x86_64.iso` |
| ESXi ISO (datastore) | `[vsanDatastore (1)] iso/esxi-9.1.0.iso` |
| VCF Installer OVA | `E:\9.1\VCF-SDDC-Manager-Appliance-9.1.0.0.25371088.ova` |

---

## VCF 9.0 (IP range: .30–.43 / .30–.33 for ESXi)

### Management VMs

| Component | IP |
|-----------|----|
| VCF Installer | 192.168.114.34 |
| SDDC Manager | 192.168.114.35 |
| inner vCenter | 192.168.114.36 |
| NSX Manager node | 192.168.114.37 |
| NSX Manager VIP | 192.168.114.38 |
| VCF Operations | 192.168.114.40 |
| Fleet Management | 192.168.114.41 |
| Collector | 192.168.114.42 |

### Nested ESXi Hosts

| Host | mgmt IP | vMotion IP | vSAN IP |
|------|---------|-----------|---------|
| esx01 | 192.168.114.30 | 192.168.115.30 | 192.168.116.30 |
| esx02 | 192.168.114.31 | 192.168.115.31 | 192.168.116.31 |
| esx03 | 192.168.114.32 | 192.168.115.32 | 192.168.116.32 |
| esx04 | 192.168.114.33 | 192.168.115.33 | 192.168.116.33 |

### IP Pools

| Pool | Range |
|------|-------|
| NSX TEP | 192.168.117.96–.159 |

### Artifacts

| File | Path |
|------|------|
| Nested ESXi OVA | `E:\9.0\Nested_ESXi9.0.2_Appliance_Template_v1.0-vmx19.ova` |
| ESXi ISO | `E:\9.0\VMware-VMvisor-Installer-9.0.2.0.25148076.x86_64.iso` |
| ESXi ISO (datastore) | `[vsanDatastore (1)] iso/esxi-9.0.2.iso` |
| VCF Installer OVA | `E:\9.0\VCF-SDDC-Manager-Appliance-9.0.2.0.25151285.ova` |

---

## VCF 5.2.1 (IP range: .50–.59 / .50–.53 for ESXi)

Uses Cloud Builder (not VCF Installer). ESXi version: 8.0U3G.

### Management VMs

| Component | IP |
|-----------|----|
| Cloud Builder | 192.168.114.54 |
| SDDC Manager | 192.168.114.55 |
| inner vCenter | 192.168.114.56 |
| NSX Manager node | 192.168.114.57 |
| NSX Manager VIP | 192.168.114.58 |

### Nested ESXi Hosts

| Host | mgmt IP | vMotion IP | vSAN IP |
|------|---------|-----------|---------|
| esx01 | 192.168.114.50 | 192.168.115.50 | 192.168.116.50 |
| esx02 | 192.168.114.51 | 192.168.115.51 | 192.168.116.51 |
| esx03 | 192.168.114.52 | 192.168.115.52 | 192.168.116.52 |
| esx04 | 192.168.114.53 | 192.168.115.53 | 192.168.116.53 |

### IP Pools

| Pool | Range |
|------|-------|
| NSX TEP | 192.168.117.160–.223 |

### Artifacts

| File | Path |
|------|------|
| Nested ESXi OVA (8.0U3G) | `E:\5.2.1\Nested_ESXi8.0u3g_Appliance_Template_v1.ova` |
| ESXi ISO | `E:\5.2.1\VMware-VMvisor-Installer-8.0U3-24022510.x86_64.iso` |
| ESXi ISO (datastore) | `[vsanDatastore (1)] iso/esxi-8.0u3-5.2.1.iso` |
| Cloud Builder OVA | `E:\5.2.1\VMware-Cloud-Builder-5.2.1.0-24307856_OVF10.ova` |

---

## VCD 10.6.1 (IP range: .60–.61)

**Repo**: https://github.com/kostenyang/vcloud-director — deploy scripts at `rtolab/`
**Connects to**: VCF 5.2.1 inner vCenter (kosten-vcf521-vc.rtolab.local @ 192.168.114.56)

| Component | FQDN | IP | Role |
|-----------|------|----|------|
| VCD Appliance | kosten-vcd.rtolab.local | 192.168.114.60 | VCD 10.6.1; UI https://kosten-vcd.rtolab.local/ui |
| NFS Server | kosten-vcd-nfs.rtolab.local | 192.168.114.61 | Ubuntu 20.04; NFS transfer storage |

**NFS export**: `192.168.114.61:/exports/vcd-transfer`
**VCD transfer mount**: `/opt/vmware/vcloud-director/data/transfer`

### Artifacts

| File | Path on E:\ |
|------|-------------|
| VCD OVA | `E:\VCD\VMware_Cloud_Director-10.6.1.11883-25088252_OVF10.ova` |
| NFS VM OVA | `E:\ubuntu-2004-cloud.ova` |
| Deploy scripts | `E:\VCD\01-Deploy-NfsVm.ps1` … `05-Connect-Vcf521.ps1` |

---

## Credentials

Actual secrets: `rtolab/inventory/secrets/lab.yaml` (sops+age encrypted)

| Account | Used for |
|---------|---------|
| `esxi.root_pw` | root on all nested ESXi |
| `outer_vcenter.sso_admin_pw` | outer vCenter SSO |
| `inner_vcenter.sso_admin_pw` | inner vCenter SSO |
| `sddc_manager.admin_pw` / `.root_pw` | SDDC Manager |
| `nsx.admin_pw` | NSX Manager admin |
| `operations.root_pw` / `.admin_pw` | VCF Operations (9.0) |
| `cloud_builder.admin_pw` | Cloud Builder (5.2.1) |
| `ad.domain_admin_user` / `_pw` | rtolab\administrator |
| `deploy_defaults.vm_root_pw` | Default root for deployed VMs |

Lab default: `VMware1!VMware1!`

---

## vSAN / LSOM Advanced Settings (Layer 1 + Layer 4)

Applied on all nested ESXi before bringup (idempotent):

| Setting | Value | Reason |
|---------|-------|--------|
| `/LSOM/VSANDeviceMonitoring` | 0 | No false-positive device failures in nested |
| `/LSOM/lsomSlowDeviceUnmount` | 0 | Prevent auto-unmount on slow nested storage |
| `/VSAN/SwapThickProvisionDisabled` | 1 | Thin swap (storage constraint) |
| `/VSAN/Vsan2ZdomCompZstd` | 0 | Use LZ4 not Zstd (CPU limited) |
| `/VSAN/FakeSCSIReservations` | 1 | Required on nested-on-physical-vSAN |
| `/VSAN/GuestUnmap` | 1 | UNMAP/TRIM passthrough |
