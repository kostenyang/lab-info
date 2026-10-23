# 三座 vCenter 實讀盤點 — 2026-10-05 09:0x

> 來源:govc 直讀外層 10.0.0.101、inner m02 10.0.1.19、inner w01 10.0.1.49,
> 加 SDDC Manager 10.0.1.18 的 domains / clusters / hosts / vcenters / nsxt-clusters / tasks。
>
> 🔴 **環境正在變動中。** 「VCF 5.2.1 VSAN 叢集測試」session 正在建**第三套 VCF 執行個體 `vcf-m03`**,
> 當作「既有 vROps + License Server 併入 management domain」測試的 converge 目標端。

---

## 1. 與 10-04 盤點的差異

| 項目 | 10-04 | 10-05 | 說明 |
|---|---|---|---|
| 外層 VM 數 | 66 | **68** | 新增 `vcf-m03-esx01`、`vcf-m03-esx02`(都已開機) |
| `vcf-m03-*` DNS | 舊記錄,指 10.0.1.50-60,機器不存在 | **整個命名空間重指到 10.0.1.56-70,並新增 9 筆** | 另一個 session 重用了這組名字 |
| DNS A 記錄總數 | 130 | **133** | |
| `vcf9dltool` IP | DNS 說 10.0.0.68(ping 不通) | **實機確認 10.0.0.32** | DNS 仍未修 |

🔴 **因此 10-04 那份 `dns-cleanup-20261004.ps1` 已失效並已刪除** ——
裡面有 8 筆 `vcf-m03-*` 現在正在使用中,照跑會刪掉別人正在用的記錄。
新版 = **`E:\9.1\dns-cleanup-20261005.ps1`**(63 筆,整段排除 `vcf-m03-*`)。

---

## 2. 外層 vCenter(10.0.0.101)

**版本 8.0.3 build-24022515**(不是 9.x)。

| host | 廠牌 | CPU | 記憶體 | 目前用量 | 開機時間 |
|---|---|---|---|---|---|
| 10.0.0.95 | Supermicro | 32 @ 2500MHz | **1024 GB** | CPU 70% / MEM 36% | 2026-07-10 |
| 10.0.0.97 | ASUS | 6 @ 2904MHz | 128 GB | CPU 62% / MEM 54% | 2026-06-30 |
| 10.0.0.98 | ASUS | 6 @ 2904MHz | 128 GB | **CPU 97%** / MEM 67% | 2026-07-04 |

> ⚠️ **10.0.0.98 的 CPU 已經在 97%**(只有 6 顆邏輯核,上面跑 outer vCenter 本體 + vRA 12 vCPU + vIDM)。
> 這台是全環境最緊的資源。記憶體還有餘裕,CPU 沒有。

**datastore**(10 個,`vsanDatastore` 已死)
| datastore | 容量 | 可用 |
|---|---|---|
| ForNFS | 5715 GB | 4900 GB |
| vmfs-samsung4t | 3726 GB | 1709 GB |
| vmfs-wdblue4t | 3726 GB | 2212 GB |
| SSD3 / pcssd3 | 931 / 931 GB | 428 / 373 GB |
| pcssd1 / SSD1 | 924 / 946 GB | 283 / 131 GB |
| pcssd2 / SSD2 | 931 / 931 GB | 126 / 111 GB |
| `vsanDatastore` | **0 GB** | 0 GB(9 筆 template 掛在上面,**依指示保留**) |

**resource pool**:19 個,nested 相關是 `Nested-VCF9-M02-yvhFworM`、`Nested-VCF-W01`。
新的 m03 兩台 ESXi 放在 **VM 資料夾 `/Datacenter/vm/VCF/`**,不在 nested resource pool 裡。

**VM 68 台:開機 28 / 關機 40**(其中 10 筆是 template)。完整清單在 `.work/vc-outer-20261005.txt`。

---

## 3. inner vCenter m02(10.0.1.19)— 管理網域

版本 **9.1.1.0.25712839**。datacenter `vcf-m02-dc01` / cluster `vcf-m02-cl01`。
`vsanDatastore` 8000 GB,可用 **7525 GB**。

| host | CPU 用量 | MEM 用量 |
|---|---|---|
| vcf-m02-esx01 | 6.7% | 24.8% |
| vcf-m02-esx02 | 23.5% | 25.9% |
| vcf-m02-esx03 | 16.2% | 29.0% |
| vcf-m02-esx04 | 13.6% | 33.8% |

**VM 10 台**(9 開機 / 1 關機):
| VM | 規格 | IP |
|---|---|---|
| vcf-m02-vc01 | 4c / 21G | 10.0.1.19 |
| vcf-m02-sddcm01 | 4c / 16G | 10.0.1.18 |
| vcf-m02-nsx01a | 6c / 24G | 10.0.1.20 |
| vcf-m02-ops01 | 4c / 16G | 10.0.1.22 |
| vcf-m02-opsc01 | 4c / 16G | 10.0.1.24 |
| vcf-m02-license | 2c / 4G | 10.0.0.175 |
| vcf-m02-vsp01-8xrvq | 12c / 24G | **10.0.0.231** |
| vcf-m02-vsp01-wxsgl | 12c / 24G | **10.0.0.234** |
| vcf-m02-vsp01-jcgxp | 4c / 10G | **10.0.0.233** |
| vcf-services-runtime-template-9.1.1.0.25714471 | 6c / 24G | 關機(範本) |

> VSP 是 **3 節點**,IP 10.0.0.231 / .233 / .234,**三個都沒有 DNS 記錄**。

---

## 4. inner vCenter w01(10.0.1.49)— VI 網域

版本 **9.1.1.0.25712839**。datacenter `vcf-w01-dc01` / cluster `vcf-w01-cl01`。
`vsanDatastore` 1500 GB,可用 **1294 GB**;另有 3 個各 9.8 GB 的 esx-install-datastore。

主機用量都很低(CPU 2.4~5.5%、MEM 12.7~34.7%)。

**VM 只有 2 台**:`vcf-w01-vc01`(開機,10.0.1.49)、`vcf-w01-vc01-OLD-803`(關機,升級前的 8.0.3 原機)。

---

## 5. SDDC Manager(10.0.1.18)實讀

版本 **9.1.1.0.25713928**。

| 網域 | 類型 | 狀態 | cluster | 主機版本 |
|---|---|---|---|---|
| `vcf-m02` | MANAGEMENT | ACTIVE | `vcf-m02-cl01` VSAN / image-based / ACTIVE | **9.1.1.0.25714478** ×4 |
| `vcf-w01` | VI | ACTIVE | `vcf-w01-cl01` VSAN / image-based / ACTIVE | **8.0.3-24280767** ×3 |

> 🔑 **w01 的主機仍是 ESXi 8.0.3,只有 vCenter 升到 9.1.1** —— 這正是「匯入既有 vSphere」
> 那條路徑的預期狀態(主機可留 8.0U3)。

**vCenter**:兩座都 9.1.1.0.25712839。
**NSX**:`vcf-m02-nsx01.home.lab`,版本 **9.1.1.0.25691509**,**單節點** `vcf-m02-nsx01a`,
`domains` 欄位同時列出兩個網域 id → **確認共用**。
**network pool**:**0 個**(converge 環境的已知現象,縮容前要先建)。

### 最近任務
| 狀態 | 任務 | 時間 |
|---|---|---|
| FAILED | Downloading Esx metadata, vibs and vendor add-ons | 10-04 17:24 |
| FAILED | 同上 | 10-03 17:24 |
| **Successful** | **Import vCenter vcf-w01-vc01.home.lab as a VI Domain** | **10-02 17:31** |
| FAILED | 同上(metadata) | 10-02 17:23 |
| SUCCESSFUL | Syncing vSAN HCL to vCenters | 10-02 17:23 |
| FAILED | 同上(metadata) | 10-01 20:13 |
| Successful | Creating VCF services runtime vcf-m02-vsp01 | 10-01 18:23 |
| Successful | **Initialize SDDC Manager** | **10-01 17:46** |

> 🔑 **這套 SDDC Manager 是 10-01 才初始化的**,只有 4 天。w01 於 10-02 匯入。
> ⚠️ `Downloading Esx metadata, vibs and vendor add-ons` **每天 17:24 固定失敗**,
> 已連續 4 天。這是 air-gap depot 抓不到 vendor add-on 的老問題,不影響其他功能,但一直在累積失敗紀錄。

---

## 6. DNS:新發現的撞名(10 組,比昨天多 7 組)

| IP | 占用者 | 判定 |
|---|---|---|
| 10.0.1.61 | `vcf-m02-vsanhost`(死)+ `vcf-m03-ops01`(**新,使用中**) | 刪前者 |
| 10.0.1.62 | `vcf-ovl-esx01`(死)+ `vcf-m03-lic01`(**新,使用中**) | 刪前者 |
| 10.0.1.63 | `vcf-ovl-esx02`(死)+ `vcf-m03-nsx01`(**新,使用中**) | 刪前者 |
| 10.0.1.64 | `vcf-ovl-esx03`(死)+ `vcf-m03-nsx01a`(**新,使用中**) | 刪前者 |
| 10.0.1.65 | `vcf-ovl-esx04`(死)+ `vcf-m03-sddcm01`(**新,使用中**) | 刪前者 |
| 10.0.1.59 | `vcf-m03-nsx01b`(舊 m03 殘留)+ `vcf-m03-esx04`(**新**) | 刪 nsx01b |
| 10.0.1.60 | `vcf-m03-nsx01c`(舊 m03 殘留)+ `vcf-m03-vc01`(**新**) | 刪 nsx01c |
| 10.0.0.62 | `vcf9depot2` + `vcfdepotserver` | 同一台兩個名字,擇一 |
| 10.0.1.25 | `vcf-m01-hcx`(VM 關機)+ `vlr9`(死) | 刪 vlr9 |
| 10.0.1.31 | `vcf-m01-edge1` + `vcf-m02-edge02`(都死) | 兩筆都刪 |

### ✅ 好消息:新 m03 區段的正反解是一致的
10.0.1.56~70 每個 IP 的 PTR 都指向正確的 `vcf-m03-*` 名字。
撞名的那幾筆,PTR 也都指向**新的**名字(不是死記錄),所以
**m03 的 bring-up 不會因為這些撞名而被 DNS 檢查擋掉**。
問題只在於:那些死名字仍然解得到 IP,以後分配 IP 時會踩到。

---

## 7. 本次盤點沒有做任何變更

只讀取 + 寫文件。唯一的檔案動作:刪掉已失效的 `dns-cleanup-20261004.ps1`,
改寫成 `dns-cleanup-20261005.ps1`(仍全部帶 `-WhatIf`,沒有執行)。

`vsanDatastore` 上那 9 筆 template 依 10-05 指示**保留**。
