# VCD 10.6.2 部署（backing t04 VCF 9.1）— 狀態檔

> 目標：裝 VMware Cloud Director 10.6.2，backing 到 t04 VCF 9.1（192.168.19.x），一路做到 PVDC + Org + Org VDC。
> 起始 2026-08-14。VCD stack（appliance + NFS）放**外層 vCenter 10.0.0.101 / MGMT 10.0.0.x**。

## 決策（使用者已定）
- 版本：**VCD 10.6.2**（內部特殊版）`E:\8\VMware_Cloud_Director-10.6.2.11936-25442100_OVF10.ova`
- 範圍：一路到 **PVDC + Org**
- Backing：**t04**（另一 session「VCF 9.1 JSON 元件配置」建的）
- VCD stack 位置：**外層 10.0.0.x**（NFS 重建在 10.0.0.60）
- 舊 VCD 殘留：**已清掉**（appliance vcd.home.lab1 + Site1/Site2 pool + 空 org vApp）✅

## 目標環境 t04（backing）
| 元件 | 位址 | 版本/帳密 |
|---|---|---|
| vCenter | 192.168.19.49 vcf-t04-vc01.home.lab | 9.1.0.0300 b25629530 / administrator@vsphere.local / VMware1!VMware1! |
| NSX VIP | 192.168.19.63 vcf-t04-nsx01.home.lab | 9.1.0.0200 / admin / VMware1!VMware1! |
| SDDC Mgr | 192.168.19.48 | admin@local / VMware1!VMware1! |
| Cluster/DS | t04-cl01 / t04-cl01-ds-vsan01 (4TB, ~2.9TB free) | DC=t04-dc01 |
| 4×ESXi | 192.168.19.44-47 | root / VMware1!VMware1! |
- ⚠️ 互通性：VCD 10.6.x 官方矩陣只到 vSphere 8/NSX 4.x；接 vCenter9/NSX9 = **off-matrix 實驗**，register/PVDC 步驟最可能踩雷。
- 路由：jumpbox(10.0.0.200) 經預設 gw 10.0.0.1 可達 192.168.19.x → 10.0.0.x 的 VCD cell 也能搆到 t04。

## VCD 部署參數（外層）
| 項目 | 值 |
|---|---|
| 外層 vCenter | 10.0.0.101 administrator@vsphere.local / <redacted> (govc GOVC_INSECURE=1) |
| 放置 | DC=Datacenter cluster=Cluster ds=**vmfs-wdblue4t** folder=VCF net=MGMT |
| ⚠ 注意 | 外層 vsanDatastore 2026-08-14 掛了(0GB)→改用 vmfs-wdblue4t(3TB free);ForNFS 3.4TB free 為備選 |
| VCD VM | vcd-t04-01，primary-small |
| eth0 / eth1 | 10.0.0.65 / 10.0.0.66（/23 255.255.254.0, gw 10.0.0.1, dns 10.0.0.200, home.lab）|
| NFS | 10.0.0.60:/nfs/vcd-transfer |
| NTP | 10.0.1.254（正確 UTC；**別用 10.0.0.200**，AD 快+176s）|
| admin/db/root | VMware1!VMware1!；inst_id=1；sys_name=vcd-t04 |
| DNS | vcd-t04-01.home.lab→10.0.0.65 已加 A+PTR ✅ |
| UI | https://vcd-t04-01.home.lab/provider |

## OVF property（10.6.2，userConfigurable=false 的要靠 ovftool --prop 注入）
class.key.VMware_vCloud_Director：
- vcloudapp.ntp-server / varoot-password / expire_root_password / enable_ssh / nfs_mount
- vcloudconf.db_pwd / admin_uname / admin_fname / admin_pwd / admin_email / sys_name / inst_id
- vcloudnet.routes0 / routes1
- vami.gateway / domain / searchpath / DNS / ip0 / netmask0 / ip1 / netmask1
- deploymentOption: primary-small|medium|large|extralarge, standby-*, cell
- net: "eth0 Network" / "eth1 Network"

## 工具
- ovftool: `C:\Program Files\VMware\VMware OVF Tool\ovftool.exe`
- govc: `E:\9.1\tools\govc.exe`
- plink/pscp: `C:\Program Files\PuTTY\`（NFS VM: ubuntu/VMware1!VMware1!；root 不可密碼 SSH）
- NFS kit: `E:\9.1\nfs-offline\vcd-nfs\`（Deploy-VcdNfsVm.ps1 / install-vcd-nfs.sh / nfs-offline-bundle-jammy.tar.gz）

## 進度
- [x] 盤點/決策/清舊殘留
- [x] Phase2 NFS 重建（vcd-nfs01@10.0.0.60）✅ export /nfs/vcd-transfer 服務中、空
- [x] Phase3 部署 VCD appliance ✅ vcd-t04-01 已開機(first-boot中)
  - 🔴坑：此內部版 OVA 把 nfs_mount/db_pwd/admin_*/sys_name/inst_id 標 userConfigurable=false → **ovftool --prop 拒絕**，連 **PowerCLI ReconfigVM 編輯值也被 vCenter 擋**("not user configurable")。
  - ✅解法：`Fix-VcdVappProps.ps1` — ReconfigVM 時在同一個 VAppPropertyInfo edit 裡把 `UserConfigurable=$true` **和** Value 一起寫，就過。8 props 全設、已開機。
  - 流程：ovftool 匯入(可設屬性,不開機) → Fix-VcdVappProps.ps1(翻flag+寫值+開機)。
- [x] Phase4 VCD cell 起來 ✅ https://10.0.0.65/provider  API 版本 **39.2**
  - 🔴client 坑：.NET Invoke-WebRequest 對 VCD 443 SSL 握手失敗 → **一律用 curl.exe -sk** 打 VCD API。
  - auth: `POST /cloudapi/1.0.0/sessions/provider` Basic administrator@system → header `X-VMWARE-VCLOUD-ACCESS-TOKEN`(存 %TEMP%\vcdtok.txt);之後 `-H "Authorization: Bearer <tok>"`。
- [ ] Phase5 register t04 vCenter(192.168.19.49) + NSX(192.168.19.63) — 進行中
  - ✅ 好消息：register API 有連到 vCenter9,**不是版本擋**,是**憑證信任**：先 `POST /cloudapi/1.0.0/ssl/trustedCertificates`(govc about.cert 抓 PEM) 才過。
  - vCenter 註冊 API：`POST /cloudapi/1.0.0/virtualCenters` {name,url,username,password,isEnabled}；刪除要等 unregister task 完成才能重註冊(否則 400 duplicate url)。
  - 憑證信任修好後又遇：(a) SAN 不符(用 IP 註冊,cert SAN 只有 FQDN)→ 改用 **url=https://vcf-t04-vc01.home.lab**(DNS 10.0.0.200 解得到,VCD appliance 也解得到)。
  - 🔴🔴 **BLOCKER(非 VCD 問題)**：改 FQDN 後 register 回 **NoRouteToHost**。查證：**整個 t04(192.168.19.44-63)全部 down**,但外層 router/host/vCenter/NTP 全 UP。
    - 根因:**外層 vsanDatastore 掛了(0GB)**。t04 是 nested VCF,其 ESXi VM 疑跑在 vSAN 上 → vSAN 死 → t04 全滅。**同一根因也害我們早上建在 vSAN 的 vcd-nfs01 消失**(後來重建在 vmfs-wdblue4t)。
    - t04 nested VM 不在外層 vCenter(這裡只有我們的 vcd-t04-01)→ 跑在別處,我看不到、無法安全 power on。
    - **需使用者處理**:救回 vSAN / 把 t04 開回來。t04(vCenter 192.168.19.49 + NSX .63)一恢復,vCenter 註冊會立刻完成(設定都對了),再續 PVDC/Org。
    - ⚠ 互通性(vCenter9/NSX9 vs VCD10.6.2)仍**未真正測到**——之前都卡在憑證/路由,還沒到 inventory sync 那步。
- [x] Phase5a **M02 vCenter 註冊成功** ✅✅ vcVersion=9.1.0, isConnected=true, CONNECTED
  - 🟢 **互通性結論(重要)**：VCD 10.6.2 **可以**成功連上並註冊 vCenter 9.1(off-matrix 但實測 OK 到 CONNECTED)。
  - 憑證(m02-vc-cert)已信任;url=https://vcf-m02-vc01.home.lab。
- [x] Phase5b **NSX 註冊成功** ✅ id aef16e45-78d5-4810-a34a-eaa74fa56958
  - 🔴endpoint 坑：cloudapi `/nsxTManagers` 這版 **404** → 用 legacy **`POST /api/admin/extension/nsxtManagers`**(Content-Type application/vnd.vmware.admin.nsxTmanager+json, Accept ...+json;version=39.2)。
  - 🟢 **NSX 9.1 也成功接上 VCD 10.6.2**。cert(m02-nsx-cert)已信任, url=FQDN。
- 🟢🟢 **互通性總結：VCD 10.6.2 對 vCenter 9.1 + NSX 9.1 皆可註冊(off-matrix 但實測 OK)**。
- 🖥 UI 坑：內建瀏覽器到不了 lab 私網;claude-in-chrome 能驅動的 Chrome≠jumpbox(憑證/DNS)。已把 vcd cert 匯入 jumpbox LocalMachine\Root。UI=https://vcd-t04-01.home.lab/provider (administrator/System/VMware1!VMware1!)。
- [x] Phase6 **PVDC 完成** ✅ m02-pvdc id 697c6f59-79a0-4582-8811-b1c2d40a555a, enabled
  - inputs: vimServer 4a1f2698 / RP resgroup-10 (m01-cl01) / storage vSAN Default Storage Policy / HW vmx-20
  - 🔴 XML 坑：NsxTManagerReference 非合法子元素;順序 ResourcePoolRefs→VimServer→HighestSupportedHardwareVersion→StorageProfile。
  - 🔴 建 PVDC 省了 IsEnabled → PVDC deactivated,建 Org VDC 撞 409 → 先 `POST .../providervdc/{id}/action/enable`(204)。
  - storage profile href 用 `pvdcStorageProfile/{id}` (不是 providerVdcStorageProfile)。
- [x] Phase7 **Org + Org VDC + Geneve 網路池 完成** ✅
  - Geneve 網路池 m02-geneve-pool id 9f7d329b, REALIZED。🔴 TZ id 要用 **NSX policy path**(/infra/.../transport-zones/UUID),且探 importableTransportZones 要 filter `_context==<nsxManagerId>`。
  - Org tenant01 id 4ead26e1 (cloudapi POST /orgs)。
  - Org VDC tenant01-vdc id 11c459a6, status=1 READY, enabled。AllocationVApp(PAYG)。endpoint `POST /api/admin/org/{id}/vdcsparams`,isEnabled 是元素非屬性(省略即可)。

## ✅✅ 全部完成 — VCD 10.6.2 backing M02 VCF 9.1,一路到 Org VDC
互通性結論：VCD 10.6.2 對 vCenter 9.1 + NSX 9.1 全程 OK(register→PVDC→Geneve pool→Org VDC)。

## 📌 10.6.2 是什麼(官方文件, E:\offline\)
- `VCD-10-6-2-Migration-Patch-Readme...docx`：10.6.2 = **gated Migration Patch**,建立 VCD 10.6.x 與 VCF 9.1 並存的 **bridge 狀態**,供 CSP 把底層升到 VCF 9.1 後再逐步搬 tenant 到 VCFA。
  - 支援來源版本:10.6 / 10.6.1 / 10.6.1.1 / 10.6.1.2(其他直上=不支援)。官方 binary build **11927-25290816**;我們手上是 **11936-25442100**(較新 respin,值得跟原廠確認)。
  - 支援擴充僅 VCDA / CSE / DSE。90 天內須交遷移 roadmap;VCD 10.6.x **EoS 2027-10**。VCFA 不追求與 VCD 100% 功能對等。⚠ NDA。
- `VCD-to-VCFA-Migration-Guide-May2026.pdf`(v5)：三階段(Provider 基礎架構→Org 基礎架構→Org workload)+ Migration Tool + 網路拓樸轉換 + 9 個 runbook use case。

## Phase8 — NSX Edge + VCD Edge Gateway 驗證(進行中)
使用者指示:**不走 SDDC Manager 部 edge**(手動 NSX),**uplink 只有一個 VLAN**。
| 項目 | 值 |
|---|---|
| uplink VLAN | **VLAN 7 = 192.168.17.0/24**, gw `192.168.17.254`(實測通;段內僅 gw 在用)|
| Edge node | `vcf-m02-edge01` mgmt **10.0.1.30**/23 gw 10.0.0.1 (DNS 已加) MEDIUM |
| Edge TEP | pool `edge-tep01` 192.168.19.61-70 (host TEP 用 .50-.60), VLAN 9 |
| trunk pg | `edge-trunk-pg` on m01-cl01-vds01, dvportgroup-1505, **promisc/forged/macchange 全開**(nested 必要)|
| morefs | vc_id 9f3063e0 / rp resgroup-10 / ds datastore-15 / mgmt-pg dvportgroup-24 |
| TZ | overlay **overlay-tz-mgmt-nsxt**(MP 7780dc6f / policy 7edb4eaa)+ vlan nsx-vlan-transportzone(a95c914d)|

- 🔴 **NSX 9.1 edge API schema 坑**:`hostname`/`dns_servers`/`ntp_servers`/`search_domains` **不在** vm_deployment_config,要放 `node_deployment_info.node_settings`。否則 400 "property X is unrecognized"。
- 🔴🔴 **架 edge 才驗出的真問題**:先前建的 VCD Geneve pool 綁 `nsx-overlay-transportzone`(1b3a2f36) — **那個 TZ 沒有任何 host/edge**,租戶網路會實現不了。已建 `m02-geneve-pool-mgmt` 綁 **overlay-tz-mgmt-nsxt** 並把 Org VDC 切過去。
- 待辦:edge cluster → T0(uplink VLAN7 seg, IP 192.168.17.10, default route→.254) → VCD External Network(192.168.17.100-150) → VCD Edge Gateway for tenant01-vdc → 驗證。
- 📤 使用者要求把測試結果整理後推到 **https://github.com/kostenyang/vcloud-director**(public → **密碼一律不入庫**)。

## 🔀 2026-08-14 轉向：t04 放棄 → 改用 M02 當 backing（使用者指示「t04 移掉,開我原本那組」）
- t04 整套失聯且 VM 不在外層 vCenter(疑隨外層 vSAN 被清而消失)→ 使用者決定改用**原本的 M02 VCF lab**。
- ✅ VCD 端已移除 t04-vc 註冊。
- **M02 backing 目標**：inner vCenter `vcf-m02-vc01.home.lab` = 10.0.1.19；NSX `vcf-m02-nsx01.home.lab` = 10.0.1.21（admin/VMware1!VMware1!）。同樣是 vCenter9/NSX9 → 互通性風險一樣。
- M02 nested host `vcf-m02-esx01-91..04-91` 在外層 vCenter,store=**[ForNFS]**(健康,非死掉的 vSAN)→ 可開回來。
- 冷開機序：①外層 govc 開 4 台 nested host(已做,監控 task b7pz4z72c) → ②等 ESXi(10.0.1.14-17)+nested vSAN → ③內層 vCenter 10.0.1.19(看是否 auto-start,否則從 nested host 直接開) → ④跑 vcf-power `poweron-all-stack.ps1` 起 NSX 等 appliance → ⑤服務 ready 再 register 進 VCD。
- ⚠ 坑：nested ESXi 重開機若 ping 不到 → Trunk-Nobinding AllowPromiscuous=True(重部署才需,重開機通常不用)。
- VCD register 已驗流程：加 vCenter 憑證到 `/cloudapi/1.0.0/ssl/trustedCertificates` + 用 **FQDN** url(SAN 只有 FQDN)。M02 vCenter FQDN=vcf-m02-vc01.home.lab,DNS 10.0.0.200 解得到。

## VCD 已就緒(healthy)
- appliance **vcd-t04-01 = 10.0.0.65**(外層 vCenter,vmfs-wdblue4t),poweredOn,服務正常。
- UI https://10.0.0.65/provider  administrator@system / VMware1!VMware1!  (API 39.2, curl-only)
- NFS transfer share 10.0.0.60:/nfs/vcd-transfer 已掛。t04-vc 憑證已在 VCD 信任庫。
- [ ] Phase4 VCD 服務起來 + web setup 驗證 + license
- [ ] Phase5 register t04 vCenter + NSX
- [ ] Phase6 建 Provider VDC
- [ ] Phase7 建 Org + Org VDC + 網路
