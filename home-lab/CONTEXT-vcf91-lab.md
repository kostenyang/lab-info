# VCF 9.1 Lab — Context 外部化(最後全面實測:**2026-10-04**)

> 給下一個 session 用的**現況真相源**。開場先讀這份。
> 本檔於 2026-10-04 依實測重寫;舊版(停在 08-25,含當時的 VCFA / VKS / Edge 細節)留在
> `CONTEXT-vcf91-lab.md.bak-20260825`,歷史配方仍有價值,但**IP / 狀態一律以本檔為準**。
>
> 🔴 **lab 是多 session 並行在動的。** 動手前先 `list_sessions` 看有沒有別的 session 正在同一套環境上工作。
> 2026-10-04 當下「VCF 5.2.1 VSAN 叢集測試」session 仍在執行中(正在試 既有 vROps + License Server
> 以 `useExistingDeployment` 併入 management domain),**m02 / w01 / installer 都在它手上,不要動。**

> 🔄 **2026-10-05 已用 govc 重讀三座 vCenter 再盤點一次。** 本檔的 §1 仍然正確,
> 但有三件新事:(1) 另一個 session 正在建**第三套執行個體 `vcf-m03`**,外層已多 2 台 ESXi;
> (2) 整個 `vcf-m03-*` DNS 命名空間被重指到 **10.0.1.56-70** 並新增 9 筆;
> (3) `vcf9dltool` 實機 IP 確認是 **10.0.0.32**(DNS 仍寫 .68)。
> 逐項數據見 **`E:\9.1\VC-INVENTORY-20261005.md`**。
> 🔴 `dns-cleanup-20261004.ps1` 已失效並刪除 → 用 **`dns-cleanup-20261005.ps1`**。

---

## 1. 現況拓樸(2026-10-04 實測)

### 1.1 外層(實體)
| 項目 | 值 | 狀態 |
|---|---|---|
| 外層 vCenter | `labvc8` 10.0.0.101,**8.0.3 build-24022515**(SSO `administrator@vsphere.local` / `<redacted>`) | ✅ |
| 實體 host A | 10.0.0.95(Supermicro,32 核 @2500MHz / **1024 GB**) | ✅ 跑全部 nested ESXi;CPU 70% / MEM 36% |
| 實體 host B | 10.0.0.97(ASUS,6 核 @2904MHz / 128 GB) | ✅ CPU 62% / MEM 54% |
| 實體 host C | 10.0.0.98(ASUS,6 核 @2904MHz / 128 GB) | 🔴 跑 outer vCenter 本體 + vRA + vIDM;**CPU 97%**(全環境最緊) |
| 本機(AD/DNS/jumpbox) | 10.0.0.200 `kaddns.home.lab`,工作目錄 `E:\9.1` | ✅ |
| Lab router | 10.0.1.254 `routeros-clone`(NTP 來源,bring-up 必用) | ✅ |
| Windows 跳板機 | `winjump01` 10.0.0.85(ping 通,HTTP 不開放;RDP 47889) | ✅ |

外層 datastore(實測容量/可用):
| datastore | 容量 | 可用 |
|---|---|---|
| ForNFS | 5715 GB | 4901 GB |
| vmfs-samsung4t | 3726 GB | 1710 GB |
| vmfs-wdblue4t | 3726 GB | 2221 GB |
| SSD1 / SSD2 / SSD3 | 各 ~931 GB | 132 / 111 / 428 GB |
| pcssd1 / pcssd2 / pcssd3 | 各 ~930 GB | 283 / 126 / 373 GB |
| `vsanDatastore` | **0 GB** | 外層 vSAN 已死,仍掛著孤兒參照 |

> ⚠️ 有 **9 筆 template**(不是 VM)登記在已死的 `vsanDatastore`:esx01-04、vcf9esx04、
> `Tina/Win2019-Tools`、`Tina/VM-016`、`vcf-services-platform-template-9.0.1.0.*` 兩份。
> 2026-07-10 vSAN 重格事故的殘骸,檔案已不存在。
> ✅ **使用者 2026-10-05 裁示:是 template 就留著,不要清。** 不要再排進整理清單。

### 1.2 nested ESXi(全部在 host 10.0.0.95)
| VM | 角色 | 規格 | datastore |
|---|---|---|---|
| `vcf-m02-esx01-91` | m02 管理網域 | 24 vCPU / 192 GB | vmfs-samsung4t |
| `vcf-m02-esx02-91` | m02 管理網域 | 24 vCPU / 192 GB | vmfs-wdblue4t |
| `vcf-m02-esx03-91` | m02 管理網域 | 24 vCPU / 192 GB | vmfs-samsung4t |
| `vcf-m02-esx04-91` | m02 管理網域 | 24 vCPU / 192 GB | vmfs-wdblue4t |
| `vcf-w01-esx01` | w01 VI 網域 | 16 vCPU / 96 GB | ForNFS |
| `vcf-w01-esx02` | w01 VI 網域 | 16 vCPU / 96 GB | vmfs-wdblue4t |
| `vcf-w01-esx03` | w01 VI 網域 | 16 vCPU / 96 GB | ForNFS |

> ✅ 「nested ESXi 分散 datastore」這件待辦**實際上已經做掉了** —— 7 台分散在 3 個 datastore,
> 不再全擠 ForNFS。舊筆記 `vcf91-nested-esxi-datastore-spread` 已過期。
> resource pool 名字變了:現在是 `Nested-VCF9-M02-yvhFworM` 與 `Nested-VCF-W01`。

### 1.3 VCF 執行個體(SDDC Manager 10.0.1.18 實測)
SDDC Manager 版本 **9.1.1.0.25713928**,兩個網域、共用一套 NSX:

| 網域 | 類型 | 狀態 | cluster | 主機 |
|---|---|---|---|---|
| `vcf-m02` | MANAGEMENT | ACTIVE | `vcf-m02-cl01`(VSAN / image-based) | esx01-04 ASSIGNED |
| `vcf-w01` | VI | ACTIVE | `vcf-w01-cl01`(VSAN / image-based) | w01-esx01-03 ASSIGNED |

NSX:`vcf-m02-nsx01.home.lab`(VIP)單節點 `vcf-m02-nsx01a`,版本 **9.1.1.0.25691509**,**同時服務兩個網域**。
主機版本:m02 四台 = **9.1.1.0.25714478**;w01 三台 = **8.0.3-24280767**(只升 vCenter,主機留 8.0U3)。
SDDC Manager 於 **2026-10-01 17:46 才初始化**,w01 於 **10-02 17:31** 匯入 —— 這套執行個體很新。
network pool:`/v1/network-pools` 回**空陣列**(converge 進來的環境沒有 pool;縮容會因此失敗,解法見 §4)。

### 1.4 管理元件(ping + HTTP 實測)
| 元件 | FQDN / IP | 探測結果 |
|---|---|---|
| inner vCenter m02 | `vcf-m02-vc01.home.lab` / 10.0.1.19 | ✅ 9.1.1.0.25712839 |
| inner vCenter w01 | `vcf-w01-vc01.home.lab` / 10.0.1.49 | ✅ 9.1.1.0.25712839 |
| SDDC Manager | `vcf-m02-sddcm01.home.lab` / 10.0.1.18 | ✅ API 200 |
| NSX node / VIP | 10.0.1.20 / 10.0.1.21 | ✅ |
| VCF Operations | `vcf-m02-ops01.home.lab` / 10.0.1.22 | ✅ HTTP 200 |
| Ops Collector | 10.0.1.24 | ✅ ping |
| Fleet | `vcf-m02-fleet01.home.lab` / 10.0.1.23 | ⚠️ ping 通,`/` 回 404(正常,走 Host header 路由) |
| VSP VIP | `vcf-m02-vsp01.home.lab` / 10.0.0.172 | ⚠️ ping 通,`/` 回 404(正常) |
| VIDB | 10.0.0.174 | ✅ ping |
| License Server | `vcf-m02-license.home.lab` / 10.0.0.175 | ✅ HTTP 200 |
| VSP installer | 10.0.0.177 | ✅ ping |
| VCF Installer(現役) | `vcf-m02-inst06` / 10.0.1.54 | ✅ HTTP 301 |

inner vCenter m02 上的 VM(10 台):`vcf-m02-vc01`、`vcf-m02-sddcm01`、`vcf-m02-nsx01a`、
`vcf-m02-ops01`、`vcf-m02-opsc01`、`vcf-m02-license`、VSP 三節點
(`vcf-m02-vsp01-wxsgl` / `-8xrvq` / `-jcgxp`,**3 節點不是 4**)、
以及關機的 `vcf-services-runtime-template-9.1.1.0.25714471`。
m02 `vsanDatastore` 8000 GB / 可用 7532 GB。

inner vCenter w01 上只有 `vcf-w01-vc01`(開機)與 `vcf-w01-vc01-OLD-803`(關機,升級前的 8.0.3 原機)。
w01 `vsanDatastore` 1500 GB / 可用 1296 GB。

> 🔴 **VCFA / VKS / NSX Edge / Supervisor 目前都不存在。** VCFA 於 2026-09-15 用官方 KB441333 移除;
> 之後 m02 經過多輪重建與 converge,Edge cluster、Supervisor、VNA(10.0.0.181)都沒了(ping 全不通)。
> 舊筆記裡的 Edge / VKS / VCFA 內容請當**配方**看,不是現況。

### 1.5 外層輔助服務(實測)
| 服務 | IP | 狀態 |
|---|---|---|
| depot(主力) | `vcf9depotserver` 10.0.0.61 | ✅ `:8888` 回 200 |
| depot2 | `vcf9depot2` 10.0.0.62 | ✅ 正常。nginx 在 **443 且要認證**(回 401);`:8888` 本來就沒開 |
| VCD NFS | `vcd-nfs01` 10.0.0.60 | ✅ ping |
| License Hub 2.0 | `lichub01` 10.0.0.77 | ✅ 正常。走 **Host header 路由**,`https://lichub01.home.lab/` 回 302;裸 IP 會 404/reset。5480 VAMI 也活 |
| vROps(外層 8.18→9.1.1) | `vrops` 10.0.0.111 | ✅ HTTP 200 |
| vRA 8.18 | 10.0.0.203(VM `vra`) | ⚠️ ping 通,`/` 404 |
| vIDM | 10.0.0.202 | ✅ ping |
| CB(5.2.1 轉換用) | `vcf-m01-cb01-conv` 10.0.1.3 | ✅ 開機 |
| download tool VM | `vcf9dltool` **實機 10.0.0.32** | 🔴 **DNS 寫 10.0.0.68 是錯的**(10-05 govc 確認實機是 .32) |
| **n8n**(2026-10-06 新增) | `n8n01` 10.0.0.81,`http://n8n.home.lab:5678`(CNAME→n8n01) | ✅ healthz 200;Ubuntu 20.04 + Docker compose(n8n 2.42.3 + Postgres 16)在 `/opt/n8n`;外層 host .97 / SSD3 / VM Network;owner `admin@home.lab` / lab 標準密碼;SSH root 用 depot 那組密碼 |

---

## 2. 🔴 開關機排程:**三個都是 Disabled**

```
VCF-M02-Morning-PowerOn-FullStack      Disabled
VCF-M02-Nightly-Shutdown-AllExceptVC   Disabled
VCF-M02-PowerOn-Sun0816-Once           Disabled
```

也就是說**目前沒有任何自動關機省電**。長時間 LCM 前本來就該停排程,但現在是「一直都停著」。
要恢復前請先確認關機腳本的 VM 比對規則跟得上現在的名字(`vcf-m02-*-91`、`vcf-m02-vsp01-*`、w01 那三台)。
操作一律走 `vcf-power` skill,不要自己拼 govc。

---

## 3. 本機磁碟:`E:` 只剩 **99 GB**(440 GB 中已用 342 GB)

`E:\9.1` 本身占 **173 GB**。最大的幾塊:

| 位置 | 大小 | 說明 |
|---|---|---|
| `vcf911-upload/` | **62 GB** | `vcf911-depot.tar.gz.00~06.part` 切片(給客戶的 depot 打包),已交付 |
| `deliver/` | **25 GB** | 22 GB 是 `fleet-binaries-only-9.1.0.tar` + 2.7 GB Dell ESXi ISO 成品 |
| `vks/` | **17 GB** | TKr / supervisor library / Supervisor zip(VKS 已不存在於環境) |
| `rhel-9.8-x86_64-dvd.iso` | 14.5 GB | RHEL depot 已建好 |
| `License-Hub-2.0.*.ova` | 11 GB | lichub01 已部署 |
| `VMware-VCSA-all-9.1.1.*.iso` | 9.7 GB | 現役版本媒體,留 |
| `_upgtest/PROD` | 7.2 GB | 升級測試暫存 |
| `Operations-Upgrade-9.1.1.*.pak` | 7.0 GB | vROps 已升完 |
| `hcx-unified-appliance-9.1.1.*.ova` | 4.1 GB | HCX 已全部移除 |
| `Protection-and-recovery-9.1.0.*.iso` | 3.1 GB | 9.1.0 舊版 |
| `backup/` | 3.5 GB | PowerCLI 舊版備份 |
| `_vcfdt911/` `dltool0400/` `_metatmp/` | 613 / 859 / 103 MB | download tool 與 metadata 暫存 |

**還沒刪任何東西** —— 刪除清單與建議見 `E:\9.1\LAB-CLEANUP-20261004.md`,等你點頭再動。

另外頂層有 **249 個散檔**,其中 119 個是 `.log` / `.out` / `.txt` / `.json` / `.pid` 之類的拋棄式產物
(`scratch-*.txt` 18 個、`probe-*.sh` 5 個、`qa*` 目錄 13 個)。

---

## 4. 仍然有效的硬性規則(踩過血的)

1. **NTP 一定用 10.0.1.254**(RouterOS),不要用 10.0.0.200(AD 快 +176 秒,會害憑證步驟)。
2. **長時間 LCM 前停排程**,排查失敗先看 `shutdown-all-except-vc.log` 該時段有沒有跑過。
3. **狀態一律交叉驗證**:vCenter REST `/api/vcenter/vm` 會回過期快取,要 govc + REST 兩邊比。
4. **Fleet / VSP / VCFA / License Hub 走 Host header 路由**,打裸 IP 一律 404 —— 404 不等於壞掉。
   🔴 2026-10-05 我自己踩了這條:只打裸 IP 就把 lichub01 與 depot2 判成壞掉,兩個都是誤判。
   **判定服務異常前,一定要用 FQDN 再試一次,並換 port 試**(depot2 是 443+auth 不是 8888)。
5. **converge 進來的 cluster 被標 `is_imported`**,SDDC Manager 對它 ADD/REMOVE_HOST 一律 403。
   lab 解法:platform DB `update cluster set is_imported=false` + domainmanager
   `vcf.skip.dayn.guardrails=true`(官方不支援)。
6. **converge 環境沒有 network pool** → 縮容會卡「Prepare HA Isolation Address」,
   要先 `POST /v1/network-pools` 再手動 insert `host_and_network_pool`。
7. **Git-Bash 會改寫路徑**:值裡含 `/` 的參數(NSX path、vCenter inventory path)要
   `export MSYS_NO_PATHCONV=1`,或乾脆寫進檔案再餵。
8. **govc 在 `E:\9.1\tools\govc.exe`**,不在 PATH 裡;且同樣吃 `MSYS_NO_PATHCONV=1`。
9. **PowerCLI 現為 13.5.1.25718932**(扁平目錄),舊版與 OneDrive 殘留備份在 `E:\9.1\backup`。
10. **文件截圖一律走 CDP**(`cdp-live.mjs` / `cdp-frame.mjs` / `cdp-frames-all.mjs`,在 `E:\9.1\tools`),
    不要用 MCP `save_to_disk`。

---

## 5. DNS:`home.lab` 共 ~130 筆 A 記錄,**只有 31 筆對應活著的機器**

活著的(31):
```
10.0.0.60 vcd-nfs01      10.0.0.61 vcf9depotserver   10.0.0.62 vcf9depot2/vcfdepotserver
10.0.0.77 lichub01       10.0.0.85 winjump01         10.0.0.111 vrops
10.0.0.172 vcf-m02-vsp01 10.0.0.174 vcf-m02-vidb     10.0.0.175 vcf-m02-license
10.0.0.177 vcf-m02-vsp-inst                          10.0.0.200 kaddns
10.0.0.202 vidm          10.0.0.203 vra              10.0.1.3 vcf-m01-cb01
10.0.1.14-17 vcf-m02-esx01~04                        10.0.1.18 vcf-m02-sddcm01
10.0.1.19 vcf-m02-vc01   10.0.1.20/21 vcf-m02-nsx01a/nsx01
10.0.1.22 vcf-m02-ops01  10.0.1.23 vcf-m02-fleet01   10.0.1.24 vcf-m02-opsc01
10.0.1.46-48 vcf-w01-esx01~03                        10.0.1.49 vcf-w01-vc01
10.0.1.54 vcf-m02-inst06
```
其餘 ~97 筆指向已不存在的機器(整個 `vcf-m01-*`、`vcf-m03-*`、`vcf-ovl-*`、VCFA 的 auto-vip/auto-platform、
VNA、HCX、SRM、舊 VCD、舊 installer inst01/02/05 等)。

🔴 **這些陳舊記錄不是無害的**:同一個 IP 被兩個名字占用(例:`vlr9` 與 `vcf-m01-hcx` 都是 10.0.1.25、
`vcf-m01-edge2` 與 `vcf-m02-edge02` 都是 10.0.1.31、`vcfdepotserver` 與 `vcf9depot2` 都是 10.0.0.62),
以後部新元件挑 IP 時會踩到。清理清單在 `LAB-CLEANUP-20261004.md`。

反解區域只有 `0.0.10` / `1.0.10` / `16.168.192` 三個有用的;**VCF 部署前務必正反解各驗一次**。

---

## 6. 檔案與 repo 位置

| 位置 | 用途 |
|---|---|
| `E:\9.1\labinfo.md` | 「labinfo」速查表 —— ⚠️ 內容停在有 VCFA/VNA 的年代,**已過期** |
| `E:\9.1\lab-info\` | repo `kostenyang/lab-info`,結構化文件(topology / runbooks / status) |
| `E:\9.1\v8tov9\` | repo `kostenyang/v8tov9`(public)= converge / import-wld 的成品與佐證 |
| `E:\9.1\tools\` | govc、CDP 截圖工具、portable node、開關機腳本 |
| `E:\9.1\dev-docs\` | 各任務的 session 狀態檔與 runbook |
| `E:\9.1\doc-shots\` | 文件截圖(133 MB) |
| `E:\9.1\deliver\` | 客戶交付成品(22 GB fleet binaries + Dell ESXi ISO) |

本機共 **22 個 git repo**,全部與 origin 同步、無未推送 commit。有未提交變更的 4 個:
`vcf9.1-lab`(22 檔,branch `day-n-host-onboarding-2026-09`)、`license-hub`(12)、
`vcf9offlinescript`(3)、`vra-lifecycle`(2)、`license-hub-20`(1)。

---

## 7. 待辦(2026-10-04 重排)

- [ ] **決定 `LAB-CLEANUP-20261004.md` 的刪除清單** —— `E:` 只剩 99 GB,可回收約 120 GB
- [ ] **清 DNS 陳舊記錄**(~97 筆),含 3 組 IP 撞名
- [ ] **恢復開關機排程**(三個都 Disabled;恢復前先驗 VM 比對規則跟得上新名字)
- [ ] 查 `vcf9depot2` 10.0.0.62 的 `:8888` 為什麼不回應
- [ ] 查 `lichub01` 10.0.0.77 HTTPS 無回應
- [ ] `vcf9dltool` DNS 指 10.0.0.68 但 ping 不通,VM 卻是開機 —— 核對實際 IP
- [ ] 把 4 個 repo 的未提交變更處理掉(尤其 `vcf9.1-lab` 22 檔)
- [ ] `labinfo.md` 需要重寫或標記為過期(目前會誤導)

~~nested ESXi 分散 datastore~~ —— **已完成**,7 台分散在 3 個 datastore。
