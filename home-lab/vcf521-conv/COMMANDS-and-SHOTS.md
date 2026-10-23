# VCF 5.2.1 vSAN Cluster 搬入 VCF 9.1.1 vCenter 並 Convert 成 Management Domain — 指令與截圖對照稿

> Lab 實測 2026-09-18。截圖目錄 `E:\9.1\doc-shots\vsan-move-52-to-91\`,CLI 輸出在 `cli\`,腳本在 `E:\9.1\vcf521-conv\`。
> 依據:KB 326849(Moving a vSAN cluster from one vCenter to another)、KB 443899(with NSX)、techdocs 9.1 Converge。

## 0. 環境

| 角色 | 元件 | 位址 |
|---|---|---|
| 來源(VCF 5.2.1) | vCenter 8.0U3 `vcf-m01-vc01` | 10.0.1.9 |
| | NSX 4.2.1 `vcf-m01-nsx01a` / VIP `vcf-m01-nsx01` | 10.0.1.7 / .8 |
| | SDDC Manager 5.2.1 `vcf-m01-sddcm01` | 10.0.1.5 |
| | ESXi 8.0U3b ×4 `vcf-m01-esx01~04`(cluster `vcf-m01-cl01`, vSAN) | 10.0.1.10-13 |
| | 測試 VM `conv-testvm01/02`(Photon,放 vSAN 上當「帶資料」驗證物) | 10.0.0.15/16 |
| 目標(VCF 9.1.1) | vCenter 9.1.1 `vcf-m02-vc01` | 10.0.1.19 |
| | NSX 9.1.1 `vcf-m02-nsx01a` / VIP `vcf-m02-nsx01` | 10.0.1.20 / .21 |
| | ESXi 9.1.1 ×4 `vcf-m02-esx01~04`(cluster `m01-cl01`, vSAN) | 10.0.1.14-17 |
| | VCF Installer 9.1.1 `vcf-m02-inst02` | 10.0.1.6 |
| | SDDC Manager 9.1.1(convert 新部)`vcf-m02-sddcm01` | 10.0.1.18 |

工具:`govc`(E:\9.1\tools)、PowerCLI 13、CDP Chrome(`tools/cdp-live.mjs`)截圖。

---

## 1. 搬遷前盤點(來源 vCenter 8 / NSX 4.2 / SDDC Manager 5.2.1)

| 圖 | 內容 |
|---|---|
| 00-src-vc-login | 來源 vCenter 登入頁 |
| 01-src-cluster-summary | vcf-m01-cl01 摘要(4 主機、5 VM,頂端「managed by SDDC Manager」橫幅) |
| 02-src-cluster-hosts / 03-src-cluster-vms | 主機清單、VM 清單 |
| 04-src-vsan-skyline-health / 05-src-vsan-capacity / 06-src-vsan-virtual-objects / 07-src-vsan-services | vSAN 健康、容量(248GB/2.34TB)、虛擬物件、服務(dedup/加密皆關) |
| 08-src-cluster-networks | vDS `vcf-m01-cl01-vds01` 與 4 個 dvpg |
| 09-src-vm-storage-policies | 儲存原則清單(VM 用 vSAN Default Storage Policy) |
| 10-src-nsx-overview / 11-src-nsx-host-transport-nodes | NSX 概觀(4 主機、1 主機叢集)、主機傳輸節點(4 台 成功) |
| 12/13-src-sddc-manager-* | SDDC Manager 5.2.1 儀表板 / Workload Domains |

CLI(記錄 vSAN 成員資訊,KB 步驟 5):
```
# 透過 vCenter 對每台主機下 esxcli(bring-up 後主機 SSH 已關閉)
govc host.esxcli -host.ip 10.0.1.10 vsan cluster get
govc host.esxcli -host.ip 10.0.1.10 vsan cluster unicastagent list
```
輸出:`cli/01-vsan-cluster-get-before.txt`(SubClusterMemberCount 4、SubClusterUUID 523b5f0a-…)

---

## 2. 拆除 NSX 與 SDDC Manager(KB 443899 + KB 326849 前置)

### 2.1 NSX:從叢集移除 NSX(卸載主機 VIB)— UI
NSX Manager → 系統 → 網狀架構 → 主機 → 勾選叢集 `vcf-m01-cl01` → **移除 NSX** → 移除。

| 圖 | 內容 |
|---|---|
| 20-nsx-select-cluster | 勾選叢集 |
| 21-nsx-remove-confirm | 「這將從所選叢集的所有成員主機移除 NSX」確認 |
| 22-nsx-removing / 23-nsx-removed | 移除中 → 4 台「NSX 組態:未設定」 |

驗證主機 VIB 已清:
```
govc host.esxcli -host.ip 10.0.1.10 software vib list | grep -ci nsx     # 0
```

### 2.2 NSX:刪 Transport Node Profile 與 Compute Manager — API
```bash
A='admin:VMware1!VMware1!'; N=https://10.0.1.7
curl -sk -u "$A" $N/policy/api/v1/infra/host-transport-node-profiles | jq -r '.results[].id'
curl -sk -u "$A" -X DELETE $N/policy/api/v1/infra/host-transport-node-profiles/<id>
curl -sk -u "$A" $N/api/v1/fabric/compute-managers | jq -r '.results[].id'
curl -sk -u "$A" -X DELETE $N/api/v1/fabric/compute-managers/<id>
```
圖 24-nsx-compute-manager-removed。刪 compute manager 後 vCenter 上的 `com.vmware.nsx.management.nsxt` extension 會自動消失。

### 2.3 SDDC Manager / NSX Manager 關機 + 清 vCenter extension
```
govc vm.power -s vcf-m01-sddcm01
govc vm.power -s vcf-m01-nsx01a
govc extension.unregister com.vmware.sddcManager
govc extension.unregister com.vmware.vcf.client
govc extension.info -json | jq -r '.extensions[].key' | grep -i 'sddc\|vcf\|nsx'   # 應為空
```
(`GOVC_URL=https://10.0.1.9`,來源 vCenter)

> vLCM image 中的 NSX solution 會隨 transport node 移除自動拿掉;`GET /api/esx/settings/clusters/{id}/software/solutions` 只剩 vsphere-ha。

---

## 3. KB 326849 前置

### 3.1 每台主機設 IgnoreClusterMemberListUpdates=1(KB 步驟 4)
```
govc host.esxcli -host.ip 10.0.1.10 system settings advanced set -o /VSAN/IgnoreClusterMemberListUpdates -i 1
govc host.esxcli -host.ip 10.0.1.10 system settings advanced list -o /VSAN/IgnoreClusterMemberListUpdates   # IntValue: 1
```
(10.0.1.10~13 四台)

### 3.2 確認 lockdown 已關(VCF bring-up 預設 lockdownDisabled)
```
govc object.collect -s /vcf-m01-dc01/host/vcf-m01-cl01/vcf-m01-esx01.home.lab config.lockdownMode
```

### 3.3 vDS → vSS(KB 步驟 3.2)
腳本 `Migrate-VdsToVss.ps1`(PowerCLI + vSphere API):
1. 建 vSwitch0,用**閒置的 vmnic2/vmnic3** 當 uplink,MTU 9000
2. 建 portgroup `Management Network` / `vMotion` / `vSAN` / `VM Network`(VLAN 0,與來源 dvpg 一致)
3. VM NIC 先搬到 `VM Network`
4. vmk2(vSAN)→ vmk1(vMotion)→ vmk0(mgmt)搬到 vSS —— **要用 `NetworkSystem.UpdateVirtualNic(spec.Portgroup, DistributedVirtualPort=null)`**,PowerCLI `Set-VMHostNetworkAdapter -PortGroup` 只收 dvPG
5. 主機離開 vDS,vmnic0/1 加回 vSwitch0

```
pwsh .\Migrate-VdsToVss.ps1 -Hosts vcf-m01-esx01.home.lab   # 逐台
```
| 圖 | 內容 |
|---|---|
| 30-src-esx01-vswitches-before | 搬前:vDS 4 dvpg |
| 31-src-esx01-vswitches-after | 搬後:vSwitch0 4 uplink,vmk0/1/2 在 vSS |

驗證:`govc host.esxcli -host.ip <ip> vsan cluster get | grep -E 'LocalNodeHealthState|SubClusterMemberCount'` 四台 HEALTHY / 4。

---

## 4. 目標 vCenter 9.1.1 建叢集(KB 步驟 1-2)
```
GOVC_URL=https://10.0.1.19
govc cluster.create -dc m01-dc01 vcf-m01-cl01
govc cluster.change -dc m01-dc01 -drs-enabled=false -ha-enabled=false -vsan-enabled=true -vsan-autoclaim=false /m01-dc01/host/vcf-m01-cl01
```
| 圖 | 內容 |
|---|---|
| 40-dst-new-cluster-summary | 空叢集摘要 |
| 41-dst-new-cluster-vsan-services | vSAN 服務(dedup/加密關,與來源一致) |

---

## 5. 搬主機(KB 步驟 6)

### 5.1 不跑舊 vCenter 的主機(esx02/03/04)
來源 vC:動作 → 連線 → **中斷連線**(圖 50/51/52)。
**UI「從詳細目錄中移除」在 vSAN 叢集內的主機是灰的**(圖 53)→ 用 API:
```
# 來源 vC
govc host.disconnect /vcf-m01-dc01/host/vcf-m01-cl01/vcf-m01-esx02.home.lab
govc host.remove     /vcf-m01-dc01/host/vcf-m01-cl01/vcf-m01-esx02.home.lab
# 目標 vC:先加在 Datacenter 層(KB:直接加進 cluster 會觸發維護模式),再搬進 cluster
govc host.add -dc m01-dc01 -hostname vcf-m01-esx02.home.lab -username root -password '***' -noverify
govc cluster.mv -dc m01-dc01 -cluster vcf-m01-cl01 vcf-m01-esx02.home.lab
# 每加一台就驗
govc host.esxcli -host.ip 10.0.1.11 vsan cluster get | grep -E 'LocalNodeHealthState|SubClusterMemberCount'
```
圖 61-dst-esx02-added-at-datacenter(主機在 Datacenter 層)。

### 5.2 跑舊 vCenter 的那台(esx01)
```
govc vm.power -s vcf-m01-vc01            # 先關舊 vC(它在 esx01 上)
govc host.add -dc m01-dc01 -hostname vcf-m01-esx01.home.lab -username root -password '***' -noverify -force   # -force:主機仍記得舊 vC
govc cluster.mv -dc m01-dc01 -cluster vcf-m01-cl01 vcf-m01-esx01.home.lab
```
圖 54-src-cluster-only-esx01-left(搬前來源只剩 esx01)、62-dst-cluster-hosts-4(目標 4 台)、63-dst-cluster-vms(VM 自動註冊,含舊 vC/NSX/SDDC Manager)。

### 5.3 設定回 0 + 記錄(KB 步驟 7)
```
govc host.esxcli -host.ip <ip> system settings advanced set -o /VSAN/IgnoreClusterMemberListUpdates -i 0
govc host.esxcli -host.ip <ip> vsan cluster get
```
輸出:`cli/02-vsan-cluster-get-after.txt`(SubClusterUUID 與搬前相同)。

---

## 6. 搬後收尾

### 6.1 vSAN 健康(圖 64/65/66)
### 6.2 儲存原則重套(KB 步驟 9)
搬後 VM 原則顯示 None(圖 70)。UI:VM → Configure → Policies → EDIT VM STORAGE POLICIES → 選 vSAN Default Storage Policy → OK(圖 71/72/73)→ CHECK COMPLIANCE(圖 74 Compliant)。
其餘 VM 用 PowerCLI:
```powershell
$pol=Get-SpbmStoragePolicy -Name 'vSAN Default Storage Policy'
Get-VM conv-testvm02 | Get-SpbmEntityConfiguration | Set-SpbmEntityConfiguration -StoragePolicy $pol
Get-VM conv-testvm02 | Get-HardDisk | Get-SpbmEntityConfiguration | Set-SpbmEntityConfiguration -StoragePolicy $pol
```
### 6.3 開 HA/DRS(KB 步驟 10)
```
govc cluster.change -dc m01-dc01 -drs-enabled=true -drs-mode fullyAutomated -ha-enabled=true /m01-dc01/host/vcf-m01-cl01
```
圖 80-dst-cluster-summary-ha-drs-on。

### 6.4 vSAN 告警「vCenter state is authoritative」(搬 vCenter 後必出現)
Monitor → vSAN → vSAN Health → 該 finding → TROUBLESHOOT → 顯示 4 台「Different VC (舊 vC UUID)」→ **REMEDIATE INCONSISTENT CONFIGURATION** → OK → RETEST。
圖 82/83/84/85/86(修復後健康分數 96,告警消失)。

---

## 7. 目標端 vSS → vDS(convert 前置:VDS 8.0+)
腳本 `Migrate-VssToVds.ps1`(全 vSphere API):建 vDS `vcf-m01-cl01-vds01` **版本 8.0.3**(ESXi 8.0U3 才能加入)、MTU 9000、4 uplink、4 dvpg;每台:vSS 只留 vmnic0/1 → vDS 加主機+vmnic2/3 → vmk2/1/0 搬 dvpg → VM NIC 搬 → vmnic0/1 也上 vDS → 刪 vSwitch0。
```
pwsh .\Migrate-VssToVds.ps1
```
圖 90-dst-esx01-vds。

---

## 8. Convert 成 9.1.1 Management Domain(VCF Installer UI)

### 8.1 前置
- 乾淨的 9.1.1 installer(做過 bring-up 的 installer DB 有舊 domain,不能重用):
  `govc import.ova -options inst911b.filled.json ... VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova`
- depot:`PUT /v1/system/settings/depot {"depotConfiguration":{"isOfflineDepot":true,"url":"http://10.0.0.61:8888"}}`;下載 9.1.1 INSTALL bundle(`PATCH /v1/bundles/{id} {"bundleDownloadSpec":{"downloadNow":true}}`)
- vCenter 上舊 SDDC Manager VM 同名者先刪
- 兩個 cluster 的 vLCM 修復原則 Evacuate offline VMs = true:
  `PUT /api/esx/settings/clusters/{id}/policies/apply {"evacuate_offline_vms":true}`
- thumbprint:`echo | openssl s_client -connect vcf-m02-vc01.home.lab:443 | openssl x509 -noout -fingerprint -sha256`

### 8.2 Spec(`converge-m02-911.v2.json`)重點
- `vcenterSpec.useExistingDeployment: true` + sslThumbprint;`nsxtSpec.useExistingDeployment: true` + sslThumbprint(VIP)
- `clusterSpec: {datacenterName: m01-dc01, clusterName: m01-cl01}`(管理元件落點)
- `vcfManagementComponentsInfrastructureSpec.xRegionNetwork: SDDC-DPortGroup-VM-Mgmt / 10.0.0.1 / 255.255.254.0`
- **不要放 `datastoreSpec.existingDatastoreName`**(多 cluster 時會套到每個 cluster 而失敗)
- 無 hostSpecs / networkSpecs / dnsSpec / ntpServers(從既有 vCenter 讀)

### 8.3 UI 操作
| 圖 | 內容 |
|---|---|
| 100/101 | installer 登入、首頁 |
| 102/103 | Depot settings and binary management(9.1.1 全 downloaded) |
| 104 | DEPLOY USING JSON SPEC → Upload |
| 105/106/107 | 上傳後 Summary |
| 108/109 | Validate & Deploy:11 項驗證 → 全 Succeeded(儲存 WARNING) |
| 110/111 | ACKNOWLEDGE → NEXT |
| 112 | 部署開始(progress viewer) |
| 113 | Import the domain data into SDDC Manager |
| 114 | Deploy VCF Management Services(VSP) |

### 8.4 驗證(SDDC Manager API)
```
T=$(curl -sk -X POST https://10.0.1.18/v1/tokens -H 'Content-Type: application/json' -d '{"username":"administrator@vsphere.local","password":"***"}' | jq -r .accessToken)
curl -sk https://10.0.1.18/v1/domains  -H "Authorization: Bearer $T" | jq '.elements[]|{name,type,status,clusters:(.clusters|length)}'
curl -sk https://10.0.1.18/v1/clusters -H "Authorization: Bearer $T" | jq '.elements[]|{name,isDefault,isImageBased,hosts:(.hosts|length),primaryDatastoreName}'
curl -sk https://10.0.1.18/v1/hosts    -H "Authorization: Bearer $T" | jq '.elements[]|{fqdn,status,esxiVersion}'
```
結果:domain vcf-m02 MANAGEMENT/ACTIVE,clusters=2(m01-cl01 ESXi 9.1.1、vcf-m01-cl01 ESXi 8.0.3-24280767),8 台 ASSIGNED。

---

## 9. 實測踩到的點(寫進文件「注意事項」)
1. vSphere 8 UI 對 vSAN cluster 內主機「從詳細目錄中移除」灰掉 → API/PowerCLI。
2. 跑舊 vCenter 的主機:先關舊 vC,加入新 vC 用 force;舊 vC/NSX/SDDC Manager VM 會自動註冊進新 vC(關機狀態)。
3. 搬後 VM 儲存原則變 None,一定要重套;vSAN Health 會出「vCenter state is authoritative」,用內建 Remediate 即可。
4. vDS→vSS 用 `UpdateVirtualNic`;vSS→vDS 用 `ReconfigureDvs_Task` + 最小 `HostVirtualNicSpec`;PowerCLI 在此環境有 `_connectionId` bug。
5. 新 vDS 版本要選 8.0.3(ESXi 8.0U3 主機),uplink 數要 ≥ 實體 NIC 數。
6. Convert 驗證會逐 cluster 檢查:`existingDatastoreName` 多 cluster 不可用;vLCM Evacuate offline VMs 兩個 cluster 都要 true;混版本 ESXi 9.1.1 + 8.0U3b 同一 vCenter 可通過。
7. 5.2.1 bring-up 在 nested 上 NSX small 16GB 會讓 CEIP 步驟失敗(telemetry 後端起不來)→ 加到 24GB retry。

---

## 10. 第三輪(2026-09-21):8.0 cluster 用 vSS / MTU 1500 的 converge 驗證

> 截圖目錄 `E:\9.1\doc-shots\converge-r3-vss-mtu\`,CLI 在 `cli\`。spec `converge-m02-911-r3-vss.json`(= path-2 spec,只改 vcfInstanceName)。

### 10.1 拆第二輪(NSX Manager 已刪 → 主機端用 nsxcli)
```bash
# 8.0U3b 主機:先 MM,再 del nsx(三段 Y/N,要餵 5 個 y);VIB 25→0,不用重開
govc host.maintenance.enter -evacuate /m01-dc01/host/vcf-m01-cl01/vcf-m01-esx01.home.lab
plink -ssh -pw '***' root@10.0.1.10 "printf 'y\ny\ny\ny\ny\n' | nsxcli -c 'del nsx'; esxcli software vib list | grep -c nsx"
govc host.maintenance.exit  /m01-dc01/host/vcf-m01-cl01/vcf-m01-esx01.home.lab
# ESXi 9.1.1 主機:同樣 del nsx(VIB 留、服務 chkconfig off),再清舊 manager 登錄
plink ... "printf '<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<appliance-info>\n\t<appliance-proxies/>\n</appliance-info>\n' > /etc/vmware/nsx/appliance-info.xml; nsxcli -c 'get managers'"
# vLCM:8.0 cluster 殘留 com.vmware.nsxt solution 記錄 → 靜音 vSAN HCL 檢查後 remediate(NO_IMPACT)
POST /api/esx/settings/clusters/domain-c30/software?action=apply&vmw-task=true  {"accept_eula":true}
```
腳本:`del-nsx-all-hosts.sh`(IP→host path 寫死,vSAN 一次只能一台進 MM)。

### 10.2 測試 1:vSS(擋)
```powershell
.\Migrate-VdsToVss-r3.ps1        # vmnic2/3 先移出 vDS → vSwitch0 → VM NIC → vmk2/1/0 → 離開 vDS → vmnic0/1 加回 vSS
govc object.destroy /m01-dc01/network/vcf-m01-cl01-vds01   # 刪空 vDS,cluster 變純 vSS
```
| 圖 | 內容 |
|---|---|
| 01 / 02 | 主機只剩 vSwitch0;cluster Networks 只有標準 pg |
| 03 / 04 | installer 登入、上傳 spec |
| 05 / 06 | 驗證中 → 結果:Existing Components **Failed**,NEXT 灰 |
| 07 / 08 | 失敗明細(cli/01、cli/02) |

結果:`cluster vcf-m01-cl01: Cluster does not have any DVS in use` + 每台 `VMKernel adapter management/vmotion is not assigned to a dedicated port group`(BROWNFIELD_VSPHERE_CHECK.error)。vSAN vmk 沒被點名。**converge 前必須 vSS→vDS。**

### 10.3 測試 2:MTU 1500(過、NSX 照 prep)
```powershell
.\Migrate-VssToVds.ps1           # 搬回 vDS(新建 dvs-121)
# vmk MTU 1500(只帶 Mtu 的新 HostVirtualNicSpec)+ vDS MTU 1500
$spec=New-Object VMware.Vim.HostVirtualNicSpec; $spec.Mtu=1500; $ns.UpdateVirtualNic('vmk0',$spec)
Set-VDSwitch -VDSwitch (Get-VDSwitch vcf-m01-cl01-vds01) -Mtu 1500 -Confirm:$false
```
```bash
govc host.esxcli -host.ip 10.0.1.10 network diag ping -H 10.0.4.6 -I vmk2 -s 8000 -d true -c 3   # Message too long
```
| 圖 | 內容 |
|---|---|
| 09 / 10 | vDS 屬性 MTU 1500、vmk 全 1500(cli/03) |
| 11 / 12 | RE-RUN VALIDATIONS → 全過(只剩 vLCM / 容量 WARNING)——**沒有 MTU 檢查** |
| 13 / 14 | Acknowledge → 部署開始(sddc 9afee39c) |
| 15 | NSX Hosts:兩個 cluster 都 Prepared;cli/05 = TNP(NoIpv4)/TNC/8 台 TN state=success、vtepless |
| 16 | 部署成功 181/181(Convert 4m37s / NSX 47m39s / VSP 2h30m / Ops 1h25m / VCFMS 1h14m);cli/06 = SDDC Manager API(domain ACTIVE、2 cluster、8 host、NSX 9.1.1 ACTIVE) |

結論:驗證不看 MTU;spec 沒有 per-cluster skip,所有 cluster 一律 import + TNP/TNC + prep;NSX 對 MTU 1500 vDS 不擋(vtepless);**converge 最後 COMPLETED_WITH_SUCCESS(01:24→07:56)**。代價是那個 cluster 之後 overlay 流量 >~1400 bytes 會丟,正式環境仍要在 converge 前把 MTU 拉到 ≥1600。
