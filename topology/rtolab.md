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
| Offline depot | `rtolab-depotsrv` (no DNS record) | 172.16.10.50 | Ubuntu; nginx `:8888` → `/depot/PROD`; serves VCF bundles to Installer/SDDC Mgr. See [runbooks/depot-server.md](../runbooks/depot-server.md) |

> **Depot server `rtolab-depotsrv` @ 172.16.10.50** sits on the **jumpbox segment** (172.16.10.0/24), has **no DNS A/PTR record** (everything references it by raw IP, e.g. `http://172.16.10.50:8888`), and is **distinct from** `kosten-depot` @ 192.168.114.65 (a separate, currently-down depot on the mgmt segment). The `.50` is a number-only coincidence with the retired 521 `kosten-vcf521-esx01` @ **192.168.114.50** — different /24, no conflict (DNS 3-way confirmed 2026-06-18). VM lives on outer host 172.16.10.3, datastore `esxi-vol3`, folder `kosten-rtolab`.

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

> **Allocating a new .114 IP:** check **DNS reverse zone first** (`114.168.192.in-addr.arpa` on .200) — *any* PTR there means the IP is reserved, do not use it even if ping is silent. Then grep this file + `inventory`, then ping. See `CLAUDE.md` → "Allocating a new IP". The tables below are NOT exhaustive — DNS is the authority. (e.g. SSP first went to `.55` which was a stale 521 reservation; moved to `.66`.)

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

## VCF 5.2.1 — "521b" block (deployed 2026-06-10) ✅

Uses Cloud Builder (not VCF Installer). ESXi: 8.0 U3b build **24280767** (升自 golden OVA 8.0U3 GA 24022510).
CB deploy UUID `4245d988-10b6-4165-9790-37ff77dbf3de` · spec sddcId `vcf-m02b` · status **COMPLETED_WITH_SUCCESS** (142/142).
Nested hosts 在 outer portgroup **`trunk521`**(與共用 `trunk` 隔離)。先前 .50–.53 區塊已重建為此 .90–.93 區塊。

### Management VMs

| Component | FQDN | IP |
|-----------|------|----|
| Cloud Builder | kosten-vcf521-cb.rtolab.local | 192.168.114.54 |
| SDDC Manager | kosten-vcf521b-sddc.rtolab.local | 192.168.114.95 |
| inner vCenter | kosten-vcf521b-vc.rtolab.local | 192.168.114.96 |
| NSX Manager node | kosten-vcf521b-nsxn1.rtolab.local | 192.168.114.97 |
| NSX Manager VIP | kosten-vcf521b-nsx.rtolab.local | 192.168.114.98 |

### Nested ESXi Hosts

| Host | VM Name | mgmt IP | vMotion IP | vSAN IP |
|------|---------|---------|-----------|---------|
| esx01 | vcf-m02-esx01-521 | 192.168.114.90 | 192.168.115.90 | 192.168.116.90 |
| esx02 | vcf-m02-esx02-521 | 192.168.114.91 | 192.168.115.91 | 192.168.116.91 |
| esx03 | vcf-m02-esx03-521 | 192.168.114.92 | 192.168.115.92 | 192.168.116.92 |
| esx04 | vcf-m02-esx04-521 | 192.168.114.93 | 192.168.115.93 | 192.168.116.93 |

FQDNs: `kosten-vcf521b-esx0{N}.rtolab.local`

### IP Pools / vSAN

| Item | Value |
|------|-------|
| NSX TEP | 192.168.117.160–.223 (VLAN 117) |
| vSAN datastore | `vcf-m02-vsan01` |

### Artifacts

| File | Path |
|------|------|
| Nested ESXi OVA (golden 8.0) | `E:\custom-ova\rtolab-nested-esxi8.ova` |
| ESXi U3b depot (upgrade) | `E:\5.2.1\VMware-ESXi-8.0U3b-24280767-depot.zip` |
| Cloud Builder OVA | `E:\5.2.1\VMware-Cloud-Builder-5.2.1.0-24307856_OVF10.ova` |

---

## VCD 10.6.1 (IP range: .60–.61)

**Repo**: https://github.com/kostenyang/vcloud-director — deploy scripts at `rtolab/`
**Connects to**: VCF 5.2.1 (521b) inner vCenter (kosten-vcf521b-vc.rtolab.local @ 192.168.114.96) **and** the external `lab.com` environment (Sean, 192.168.113.x — see below)

| Component | FQDN | IP | Role |
|-----------|------|----|------|
| VCD Appliance | kosten-vcd.rtolab.local | 192.168.114.60 | VCD 10.6.1; UI https://kosten-vcd.rtolab.local/ui |
| NFS Server | kosten-vcd-nfs.rtolab.local | 192.168.114.61 | Ubuntu 20.04; NFS transfer storage |

**NFS export**: `192.168.114.61:/exports/vcd-transfer`
**VCD transfer mount**: `/opt/vmware/vcloud-director/data/transfer`

### Registered providers (vCenter + NSX backing this VCD)

| Provider (VCD name) | FQDN | IP | Creds | Notes |
|---------------------|------|----|-------|-------|
| vcf521b-vc | kosten-vcf521b-vc.rtolab.local | 192.168.114.96 | administrator@vsphere.local / VMware1!VMware1! | 521b inner vCenter; full PVDC/tenant chain built on this |
| vcf521b-nsx | kosten-vcf521b-nsx.rtolab.local | 192.168.114.98 | admin / VMware1!VMware1! | 521b NSX |
| vcsa-lab-113 | vcsa.lab.com | 192.168.113.10 | administrator@vsphere.local / VMware1! · root / VMware1! | **External — Sean's `lab.com` lab, NOT rtolab IP space.** Added 2026-06-17 |
| nsx-lab-113 | nsx.lab.com | 192.168.113.41 | admin / 1qaz@WSX3edc | Sean's NSX; `*.lab.com` wildcard cert |

> ESXi in the lab.com set: `esxi-01..04.lab.com` @ 192.168.113.11–14 (root / VMware1!).

### lab.com (192.168.113.x) integration — gotchas (2026-06-17)

`192.168.113.x` / `lab.com` is a **separate external environment** reached from rtolab; it shares nothing with rtolab IPs/DNS. Registering it into VCD hit three traps:

1. **Must register by FQDN, not IP** — VCD strictly validates cert SAN against the URL. Cert SANs are `vcsa.lab.com` / `*.lab.com`; `url=https://<IP>` → task error `Certificate for <IP> doesn't match SAN`.
2. **No lab.com DNS zone in rtolab** — so resolution is via `/etc/hosts`:
   - **VCD cell** (`192.168.114.60`, Posh-SSH root/VMware1!VMware1!): added `192.168.113.10 vcsa.lab.com` + `192.168.113.41 nsx.lab.com` — required for the registration call to resolve.
   - **Jumpbox** (`172.16.10.32`, `C:\Windows\System32\drivers\etc\hosts`): added vcsa/esxi-01..04/nsx `.lab.com`. ⚠️ **Without this, `*.lab.com` resolves to PUBLIC internet IPs** (lab.com is a real registered domain → `76.223.54.146` etc.) — any FQDN-based PowerCLI/browser call would leave the lab. Other hosts need their own hosts entries; there is no shared zone.
3. **vCenter SSO was down (envoy-sidecar)** — registration failed with "credentials" error but real cause was vcsa's own `POST /api/session` → 500 badGateway. vapi-endpoint stuck `INITIALIZED`, vpxd `AcquireToken` + vapi both got `Connection reset` on `localhost:1080/sso-adminserver`. **`:1080` is `vmware-envoy-sidecar`** (NOT rhttpproxy/stsd — both were healthy). Fix: `service-control --restart vmware-envoy-sidecar` then `vmware-vapi-endpoint`. Certs were all valid (not expiry). See debug-vcf9.1 handbook.

### Artifacts

| File | Path on E:\ |
|------|-------------|
| VCD OVA | `E:\VCD\VMware_Cloud_Director-10.6.1.11883-25088252_OVF10.ova` |
| NFS VM OVA | `E:\ubuntu-2004-cloud.ova` |
| Deploy scripts | `E:\VCD\01-Deploy-NfsVm.ps1` … `05-Connect-Vcf521.ps1` |

---

## SSP — vDefend Security Services Platform 5.1.2 (IP range: .66)

**Repo scripts**: `rtolab/scripts/Deploy-Ssp.ps1` (deploy) · `rtolab/scripts/Get-VmScreenshot.ps1` (console 擷圖)
SSP Installer 是單一 appliance (4 vCPU / 6 GB / 396 GB, 1 NIC), 接 mgmt access pg114。
IP 配 `.66`。**原本配 `.55`,但 `.55` 落在舊 521(非 "b")DNS 保留段 `.50-.58`(`kosten-vcf521-sddc` A/PTR 撞在 `.55`)—— 最初只查了 ping + lab-info,漏查 DNS 反解才中招。改挑 `.66`:DNS 反解全表無記錄 + lab-info/inventory 無引用 + ping 無回應 三方都確認乾淨(注意 `.62` 雖無 DNS/無文件卻 ping 得到,已避開)。

| Component | FQDN | IP | Role |
|-----------|------|----|------|
| SSP Installer | kosten-ssp.rtolab.local | 192.168.114.66 | vDefend SSP installer appliance; UI https://kosten-ssp.rtolab.local/ |

VM name `ssp-installer` · RP `Kosten` · datastore `vsanDatastore-RTO` · portgroup `selab-dswitch-pg114`。
帳號(sysadmin / admin / audit / GRUB)都用 lab default `VMware1!VMware1!`(SSP 要求 min12 + 複雜度,firstboot 會驗)。

### OVF 屬性 (Get-OvfConfiguration 確認;全在 `$cfg.Common.*`,NetworkMapping=`Network_1`)

`vsx_fqdn` · `vsx_ip_0` · `vsx_netmask_0` · `vsx_gateway_0` · `vsx_dns1_0` · `vsx_domain_0` · `vsx_ntp_0` · `vsx_isSSHEnabled` · `vsx_passwd_0`(sysadmin)· `vsx_cli_passwd_0`(admin)· `vsx_cli_audit_passwd_0`(audit)· `vsx_grub_passwd`

### Artifacts

| File | Path on E:\ |
|------|-------------|
| SSP Installer OVA | `E:\SSP\VMware-Security-Services-Platform-Installer-5.1.2.0.0.25420504.ova` |
| License Hub | `E:\SSP\License-Hub-5.1.2.0.0.25400319.tar` |

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
