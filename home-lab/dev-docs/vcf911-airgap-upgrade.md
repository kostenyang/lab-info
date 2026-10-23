# VCF 9.1.0 → 9.1.1 離線(air-gap)升級實錄

**環境**:nested VCF 9.1.0.0(管理網域 m01)、離線 depot `vcf9depotserver.home.lab`(10.0.0.61)
**日期**:2026-09-03 ~ 09-04
**起點的特殊性**:環境中有三個元件先前被**手動升級過**,偏離 9.1.0.0 的 BOM ——
vCenter `0200.25573614`、esx01/esx02 `0200.25557999`、esx04 `0100.25433460`

---

## 一、核心發現:離線環境有「四條獨立的資料鏈」,缺一條就整個卡住

| # | 鏈路 | 內容 | 同步方式 |
|---|---|---|---|
| 1 | **binaries** | 元件安裝檔 | `vcf-download-tool binaries download` |
| 2 | **depot metadata** | manifest + productVersionCatalog | `vcf-download-tool metadata download` |
| 3 | **fleet metadata** | fleet 元件的升級目標 | VCF Ops UI 右上角的 `Sync` |
| 4 | **domain metadata** | SDDC Manager 的 manifest / catalog | API 推送(見第三節) |

🔴 **四條鏈都要通,而且沒有任何一層會告訴你缺的是哪一條。**
典型症狀:depot 素材齊全、空間充足、`releases list` 也顯示有 9.1.1,
但 SDDC Manager 就是只看到舊版本,**零錯誤訊息**。

---

## 二、查詢版本時不要帶過濾條件

一開始用這個查,結論是「9.1 以上只有 9.1.0.0」——**錯的**:
```bash
vcf-download-tool binaries list --vcf-version=9.1.. \
  --lifecycle-managed-by=SDDC_MANAGER_VCF --type=UPGRADE     # ← 這兩個過濾條件
```
`--type` 和 `--lifecycle-managed-by` 會**靜默隱藏整個 release**
(9.1.1 有 INSTALL 型元件、也有不是 SDDC_MANAGER_VCF 管的新元件如 `VCFMS_METRICS_STORE`)。

正確做法:
```bash
vcf-download-tool releases list      # 直接列所有 VCF release → 9.1.1.0 / 9.1.0.0
vcf-download-tool binaries list --vcf-version=9.1.1    # 不帶其他過濾
```

---

## 三、🔴 最難的一關:把 catalog 推進 SDDC Manager

`GET /v1/manifests` 與 `/v1/product-version-catalog` 可看出 SDDC Manager 手上的版本:

| | depot(新) | SDDC Manager(舊) |
|---|---|---|
| manifest `sequenceNumber` | 101 | 100 |
| catalog `sequenceNumber` | 57 | 56 |
| 含 9.1.1 | 有 | 無 |

### manifest(265 KB)—— 直接推即可
```
POST https://<sddc-manager>/v1/manifests
Content-Type: application/json
<vcfManifest.json 內容>            → 202
```

### catalog(1.5 MB)—— 四個陷阱

| 陷阱 | 症狀 | 正解 | 只有這裡查得到 |
|---|---|---|---|
| nginx body 上限 | **413** | 走 appliance 內部 `127.0.0.1:7400` | 試出來的 |
| 端點已廢止 | **410** `API_NO_LONGER_SUPPORTED ["9.0"]` | 端點要**複數** `catalogs` | `remediationMessage` |
| body 內容 vs 路徑 | **202 但無效** | 傳**檔案路徑**,檔案先放進 appliance | LCM debug log |
| 欄位名**不對稱** | **202 但無效** | 見下方 | jar 字串 + 逐一試 |

**正確呼叫**:
```
POST http://127.0.0.1:7400/v1/product-version-catalogs      # ← 複數、內部埠
Content-Type: application/json
{
  "productVersionCatalogFilePath": "/nfs/vmware/vcf/nfs-mount/metadata911/productVersionCatalog.json",
  "signatureFilePath":             "/nfs/vmware/vcf/nfs-mount/metadata911/productVersionCatalog.sig"
}
```

🔴 **欄位名不對稱是最惡劣的坑**:catalog 用長前綴 `productVersionCatalogFilePath`,
簽章卻是短的 `signatureFilePath`。jar 裡的
`productVersionCatalogSignatureFileLocation` / `productVersionCatalogSigFile`
**都是內部變數名、不是 API 欄位** —— 照著它們試只會一直拿到 202 但無效。

**除錯訊號**:驗證器的錯誤訊息會從
`catalog file path 'null' is empty` → `catalog signature path 'null' is empty`,
這代表 JSON 路徑那個欄位對了、只剩簽章欄位。

### 判斷成功
```
catalog seq 56 → 57
bundle 目錄 242 → 276(9.1.1 有 33 個)
GET /v1/upgradables/domains/{id}?targetVersion=9.1.1.0 → 200
```

---

## 四、SDDC Manager 的 port ↔ 服務對應(排查用)

```
7100  commonsvcs.service
7200  domainmanager.service
7300  operationsmanager.service
7400  lcm.service              ← 升級/bundle/catalog 都在這
7900  vip-manager-i18n.service
```
外部走 nginx(443)會受 `client_max_body_size` 預設 1 MB 限制;
`/v1/` 這個 location 沒設定,所以吃預設值。內部埠不受限。

---

## 五、升級順序與實測

```
1. SDDC Manager   9.1.0.0.25371088 → 9.1.1.0.25713928   ✅ 35 分鐘
2. NSX            9.1.0.0.25318225 → 9.1.1.0.25691509
3. vCenter        9.1.0.0200.25573614 → 9.1.1.0.25712839
4. ESXi           混版 → 9.1.1.0.25714478
```

### 觸發升級
```
POST /v1/upgrades
{
  "bundleId": "<bundleId>",
  "resourceType": "DOMAIN",
  "resourceUpgradeSpecs": [{"resourceId": "<domainId>", "upgradeNow": true}]
}                                                        → 202
```
升級期間 SDDC Manager API 會中斷約 8 分鐘(appliance 重啟),屬正常。

### ⚠️ NSX 的 spec 未解
```
400  "NSX upgrade request cannot have both isMpUpgrade and
      isDatapathApplianceUpgrade set to false at the same time for VCF target state 9.0 or above"
```
試過五種欄位放法(含補 `nsxtId`)都無效,jar 裡也找不到 `isMpUpgrade` 字串。
**建議走 UI 精靈** —— MP / Datapath 在 UI 上是勾選框,不需逆向 JSON 結構。

---

## 六、🔴🔴 最重要的發現:`On Target` 只是「沒有比較基準」

這次升級意外地為先前的「手動升版」測試提供了**決定性實證**。

**同一個環境、同一個畫面,唯一的差別是有沒有建立升級計畫:**

| 元件 | 建立升級計畫**前** | 建立升級計畫**後** |
|---|---|---|
| VMware vCenter `9.1.0.0200.25573614`(手動升的) | ✅ **On Target** | ⚠️ **Version Drift** |
| ESX 叢集 `9.1.0.0.25370933`(混版) | ✅ **On Target** | ⚠️ **Version Drift** |
| Target Version 欄位 | = Current Version | 真正的目標版本 |

**元件版本完全沒變,狀態卻從綠燈變成警示。**

這證實了先前實測報告的核心結論,而且比原本的推論強得多:

> **`On Target` 不是「環境合規」的證明,只是「target = current」。**
> 沒有升級計畫時,VCF 以 current 當 target,所以無論你手動升成什麼樣子都永遠是綠燈。
> **一旦有了比較基準,偏離立刻現形。**

產品說明自己也講明了:
> "After you create a domain or component upgrade plan, the selected target versions
>  appear below and versions or configuration drifts are visible per component."

### 對客戶的意義
客戶手動升版後看到滿畫面 `On Target`,**不代表環境合規** ——
只代表他沒有建立升級計畫。要檢查合規,必須主動建立升級計畫(或自行拿 BOM 對照)。

---

## 七、VCF 9.1.1 的 VCFMS 縮容(尚未執行)

9.1.1 的兩項增強與資源占用直接相關:
- **#4 Reduced Footprint for VCFMS** —— Simple(非 HA)少一個 Worker Node(**12 vCPU / 24 GB**)
- **#5 Small HA** —— HA 但不超過最小部署的資源量

⚠️ **升級不會自動縮容**。官方原文:
> "For users with an existing VCF 9.1 deployment upgrading to VCF 9.1.1,
>  the current VCFMS sizing will remain unchanged."

但可事後執行 **post-upgrade right-sizing script** 取得縮容。

### 升級前基準線(供縮容後比對)
```
合計 64 vCPU / 179 GB
  vsp01-6kdzn  12 vCPU / 24 GB     ← 預期會少一個 worker
  vsp01-q278k  12 vCPU / 24 GB
  vsp01-zfp57  12 vCPU / 24 GB
  vsp01-ftck5   4 vCPU / 10 GB
  ops01 / opsc01 / sddcm01  各 4 / 16
  vc01          4 / 21
  nsx01a        6 / 24
  license       2 / 4
```

### 縮容的真正控制點(2026-09-04 實機挖掘)

官方文章只說「跑 KB 提供的 right-sizing 腳本」,沒說腳本改什麼。實機追下去,
worker 數量的**唯一來源**是 `pd`(`packagedeployments.releases.vmsp.vmware.com`):

```bash
kubectl -n vmsp-platform get pd vmsp-platform -o jsonpath='{.spec.values.cluster}'
```
```json
{ "ha": "false", "type": "management", "name": "vcf-m02-vsp01",
  "worker": { "enabled": true, "machineType": "management.large",
              "minReplicas": 3, "size": "large" } }
```

下游全是**算出來的**,手改一定被 reconcile 回去:

```
pd/vmsp-platform .spec.values.cluster.worker
  └→ Cluster.spec.topology.workers.machineDeployments[default]
        ├─ annotation cluster-api-autoscaler-node-group-min-size = "3"
        └─ variables.overrides  numCPUs=12, memoryMiB=24576, diskGiB=100
     └→ MachineDeployment → MachineSet → Machine → VM
```

兩道防線:`cluster-autoscaler:v1.34.0` 依 min-size 把副本補回;ClusterClass topology
controller 依 Cluster 宣告覆蓋 MachineDeployment。所以 `kubectl scale` 無效。

machinetype 目錄(`kubectl get machinetype`)對照:

| machineType | vCPU | 記憶體 |
|---|---|---|
| management.small | 4 | 8 GiB |
| management.medium | 8 | 16 GiB |
| **management.large**(目前) | **12** | **24 GiB** |
| management.xlarge | 24 | 48 GiB |

`management.large` = 12/24,與 MachineDeployment 的 `numCPUs=12 / memoryMiB=24576`
完全吻合,也與官方說的「少一台 worker = 12 vCPU / 24 GB」吻合 —— 即 `minReplicas` 3→2。

### 官方流程(williamlam 2026-09-03)

> A Broadcom KB will be provided with the detailed right-sizing instructions.

1. **前提:所有 VCFMS 元件都已升到 9.1.1**(VCF Ops > Build > Lifecycle > **VCF Management**,
   與 `m01` 網域的升級序列是**不同軌**)
2. VCF Management > Components > **VCF Services Runtime** → 節點表找 control plane
3. 從 KB 下載 right-sizing 腳本 → `scp` 到 control plane → `vmware-system-user` SSH → `sudo` 執行
4. 驗證:`kubectl get pd vmsp-platform -n vmsp-platform -w`,約 **10–15 分鐘**
5. Simple(非 HA)結果:少一台 worker;9.1.1 另有 **Small HA**,HA 但不超過最小部署資源量

來源:<https://williamlam.com/2026/09/vcf-9-1-1-adopting-the-reduced-vcf-management-services-vcfms-footprint-after-an-upgrade.html>

---

## 八、NSX Manager 升級(2026-09-04)

由 VCF Operations UI 觸發:Build > Lifecycle > VCF Instances > m01 > **Upgrades** >
`VMware NSX Manager Nodes 9.1.1.0 Upgrade` > **UPGRADE NOW**。

按下後卡片立刻轉為排程狀態(`Upgrade is scheduled for Sep 4, 2026, 8:54:18 AM`),
按鈕列變成 `UPGRADE NOW / RESCHEDULE / RUN PRECHECKS / CANCEL UPGRADE`。

```
task Upgrade DOMAIN - [m01] using BUNDLE - NSX_T_MANAGER:9.1.1.0.25691509
  SUCCESSFUL  Proceed with scheduling the upgrade once precheck execution is complete
  SUCCESSFUL  Upgrade - NSX_T_UC       vcf-m02-nsx01.home.lab:UpgradeCoordinator
  SUCCESSFUL  Upgrade - NSX_T_MANAGER  vcf-m02-nsx01.home.lab
```

**耗時 141 分鐘**(08:54 → 11:15)。序列是先升 Upgrade Coordinator 再升 Manager 本體。

⚠️ 這個 task 的 subtask 只有 UC + Manager,容易誤判成「沒有 host prep」。實際上
`GET /v1/upgradables/domains/{id}` 顯示 **`NSX_T_DATAPLANE` 是獨立的 upgradable**,
狀態 `PENDING` —— NSX 在 ESXi 上的資料面元件排在 vCenter / ESX 之後才做:

```
AVAILABLE   VCENTER          bundle 57b4b8e7-5b23-5776-8969-c6246f6251f5
PENDING     ESX_HOST         bundle 8a642e37-e1fe-5500-92b2-c0a34ee37ed1
PENDING     NSX_T_DATAPLANE  bundle 1a0e8469-aafb-50bf-92b0-3665f9860f21
```

教訓:**別用單一 task 的 subtask 清單判斷升級範圍**,要看 upgradables 端點。

### 🔴 原生升級路徑同樣有 inventory 延遲

升級成功當下:

```
NSX 實機          GET https://nsx01/api/v1/node/version
                  node_version    = 9.1.1.0.25691516   ← 已升
                  product_version = 9.1.0.0.25318225   ← 尚未更新

SDDC Manager      GET /v1/nsxt-clusters
                  version         = 9.1.0.0.25318225   ← 尚未收斂
```

這點對客戶溝通很重要:**連 SDDC Manager 自己驅動的升級,inventory 都不是即時更新的**。
之前量到的 vCenter 手升收斂時間是 3.4 小時,可見延遲與「是否手動升級」無關,
而是 inventory 同步週期本身的特性。詳見 `fleet-version-sync-lab-results.md`。

### 升級後的版本分佈(刻意保留的 drift)

| 元件 | 版本 | 由何而來 |
|---|---|---|
| esx01 / esx02 | 9.1.0.0200.25557999 | vCenter vLCM 升級 |
| esx03 | 9.1.0.0.25370933 | GA,未動 |
| esx04 | 9.1.0.0100.25433460 | 掛 ISO 手動升級 |
| vCenter | 9.1.0.0200.25573614 | VAMI 手動升級 |
| **NSX** | **9.1.1.0.25691516** | **SDDC Manager 升級** |
| SDDC Manager | 9.1.1.0.25713928 | SDDC Manager 升級 |

### 附錄:POST /v1/upgrades 的真正 spec 形狀

之前試 NSX 升級 spec 一直被退(`isMpUpgrade` / `isDatapathApplianceUpgrade` 放哪都不對,
連反編譯 jar 都找不到字串)。正解是**改用 UI 送出一次,再 `GET /v1/upgrades` 把物件讀回來**——
API 會原樣保留 UI 提交的 spec。

一般元件(SDDC Manager / vCenter)只要:

```json
{ "bundleId": "<bundle uuid>",
  "resourceType": "DOMAIN",
  "parallelUpgrade": false,
  "resourceUpgradeSpecs": [
    { "resourceId": "<domain uuid>", "scheduledTimestamp": "2026-09-04T00:54:18.179Z" } ] }
```

NSX 多一個 **`nsxtUpgradeUserInputSpec`,是 `resourceUpgradeSpecs` 的同層兄弟**(我先前一直
把它塞進 resourceUpgradeSpecs 裡面,所以怎麼放都錯),且 `nsxtId` 放的是 **FQDN 不是 UUID**:

```json
"nsxtUpgradeUserInputSpec": {
  "nsxtHostClusterUpgradeSpecs": [],
  "nsxtEdgeClusterUpgradeSpecs": [],
  "nsxtUpgradeOptions": {
    "isEdgeOnlyUpgrade": false,
    "isMpUpgrade": true,
    "isDatapathApplianceUpgrade": false,
    "isHostClustersUpgradeParallel": false,
    "isEdgeClustersUpgradeParallel": false },
  "nsxtId": "vcf-m02-nsx01.home.lab" }
```

`scheduledTimestamp` 給「現在」即代表立刻執行——UI 的 `UPGRADE NOW` 就是這樣做的
(按下時卡片顯示 `Upgrade is scheduled for <當下時刻>`)。

> 通用技巧:**任何送不出去的 VCF spec,都先用 UI 做一次,再從 GET 讀回來當範本。**
