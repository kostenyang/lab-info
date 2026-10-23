# LAB 整理清單 — 2026-10-04

> 這份是**提案**,不是已執行的紀錄。所有刪除動作都還沒做。
> 盤點方法:外層 vCenter(govc)+ SDDC Manager API + 全 DNS 記錄 ping + 磁碟實測。
>
> 🔴 **執行前先確認另一個 session 已收工。** 2026-10-04 當下「VCF 5.2.1 VSAN 叢集測試」
> session 仍在跑(正在試「既有 vROps + License Server 併入 management domain」),
> m02 / w01 / installer / `deliver` 目錄都可能在它手上。

> 🔄 **2026-10-05:磁碟與服務異常兩節已被 `LAB-CLEANUP-REVISED-20261005.md` 取代。**
> 原因:(1) 另一個 session 正在建 m03,部分媒體進入保護清單;(2) depot2 與 lichub01 的
> 「異常」經查是我誤判(都走 Host header / 不同 port,服務正常)。本檔其餘各節仍有效。

---

## 一、磁碟:`E:` 只剩 99 GB,可回收約 120 GB

### 1.1 建議刪除(任務已結束、成品已交付或已進 git)

| 目標 | 大小 | 為什麼可以刪 |
|---|---|---|
| `vcf911-upload/vcf911-depot.tar.gz.0*.part`(7 片) | **62 GB** | 給客戶的 depot 切片打包,已交付;來源 depot 還在 10.0.0.61。`.sha256` 留著 |
| `deliver/fleet-binaries-only-9.1.0.tar` | **22 GB** | fleet binaries 交付包,已交付;可從 depot 重建 |
| `vks/` 整個目錄 | **17 GB** | VKS / Supervisor / TKr 媒體。環境裡已無 Supervisor,要用再抓 |
| `rhel-9.8-x86_64-dvd.iso` | 14.5 GB | RHEL depot(10.0.0.63)已建好,ISO 不再需要 |
| `License-Hub-2.0.0.0.0.25630952.ova` | 11 GB | lichub01 已部署完成 |
| `Operations-Upgrade-9.1.1.0.25679887.pak` | 7.0 GB | vROps 已升到 9.1.1 |
| `_upgtest/PROD` | 7.2 GB | 升級測試暫存 |
| `hcx-unified-appliance-9.1.1.0.25690219.ova` | 4.1 GB | HCX 已於 10-01 全部移除;重部配方在 repo |
| `Protection-and-recovery-9.1.0.0.25367487.iso` | 3.1 GB | 9.1.0 舊版(環境已全 9.1.1) |
| `_vcfdt911/PROD` + `_metatmp/PROD` | 716 MB | download tool / metadata 暫存 |
| `dltool0400/` | 859 MB | 0400 版 download tool,已有新版 |
| **合計** | **≈ 149 GB** | |

### 1.2 建議保留

| 目標 | 大小 | 理由 |
|---|---|---|
| `VMware-VCSA-all-9.1.1.0.25712839.iso` | 9.7 GB | 現役版本,重建會用 |
| `VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova` | 2.4 GB | 現役 installer 媒體 |
| `Nested_ESXi9.1.0.0_Appliance_Template_v1.0.ova` | 1.0 GB | 每次重建都要 |
| `VMware-ESXi-9.1.1.0.25714478-depot.zip` | 0.7 GB | vLCM / depot 用 |
| Dell 自組 ISO(`deliver/esxi-911-dell`) | 2.7 GB | 自組 OEM ISO 成品 |
| `backup/` | 3.5 GB | PowerCLI 舊版備份(回退用) |
| `doc-shots/` | 133 MB | 文件截圖,repo 只收了部分 |

### 1.3 散檔整理(低風險但量大)

頂層 **249 個散檔**,其中拋棄式產物 119 個:

- `*.log` 61 個(`bringup-*`、`layer1-deploy*`、`inst911*-import.log`、`vlcm-*`…)
- `scratch-*.txt` 18 個(task id / token 暫存,**含 token,應該刪不是封存**)
- `probe-*.sh` 5 個、`run-*.sh` 4 個、`*.out` 9 個、`*.pid` 3 個
- `qa` / `qa2` / `qa3` / `qa-*` 共 13 個目錄(docx/pptx 的 QA 轉檔暫存)
- `_upgtest.err`(0 bytes)、`err.txt`(0)、`alldiag.txt`(0)、`ipcheck.txt`(0)

建議:`scratch-*.txt` 直接刪(裡面有 token);其餘 log 移到 `E:\9.1\_archive\logs-2026H2\`。
**沒有在這一輪動手**,因為另一個 session 正在跑,可能還在寫其中幾個 log。

---

## 二、DNS:`home.lab` 130 筆 A 記錄,只有 31 筆對得上活著的機器

分三層(依 ping + 外層 vCenter 是否還有該 VM):

| 層 | 筆數 | 處置 |
|---|---|---|
| A 活著 | 31 | 保留 |
| B VM 還在但關機 | 21 | **保留**(開機就會回來) |
| C VM 已不存在 | **74** | 建議刪除 |

🔴 **10-05 更新:下表的筆數已過期。** 另一個 session 重用了 `vcf-m03-*` 命名空間,
C 層重算為 **63 筆**,新腳本 = **`E:\9.1\dns-cleanup-20261005.ps1`**

(以下為 10-04 原始內容)C 層乾跑腳本:**`dns-cleanup-20261005.ps1`**(每行都帶 `-WhatIf`,
確認後把 `-WhatIf` 拿掉再跑)。內容主要是:

- 整組 `vcf-m01-*`(10 筆)、`vcf-m03-*`(11 筆)、`vcf-ovl-esx0*`(4 筆)
- VCFA 殘留:`vcf-m02-auto-vip`、`vcf-m02-auto-platform`、`vcf-m02-shared01`、`vcf-m02-logs01`
- NSX VNA:`vcf-m02-vna01`;Edge:`vcf-m02-edge01/02`
- HCX:`hcx4`、`hcx67`、`vcf-m01-hcx` 以外的 `vcf-m02-hcx`、`vcf-m03-hcx`
- 舊 installer:`vcf-m02-inst01`、`vcf-m02-inst02`、`vcf-inst02`
- 舊 VCD / VCDA / SRM / TKG / harbor 等一輪測試殘留

### 2.1 🔴 IP 撞名(三組,挑新 IP 時會踩到)

| IP | 占用者 |
|---|---|
| 10.0.0.62 | `vcf9depot2` + `vcfdepotserver` — **兩個都活著**,是同一台的兩個名字,確認保留哪個 |
| 10.0.1.25 | `vcf-m01-hcx`(VM 關機中)+ `vlr9`(已不存在)→ 刪 `vlr9` |
| 10.0.1.31 | `vcf-m01-edge1` + `vcf-m02-edge02` — **兩個都不存在**,兩筆都刪 |

### 2.2 需人工判斷(4 筆,腳本已排除)

`vra9=10.0.0.168`、`vidm9=10.0.0.167`、`vrlcm9=10.0.0.166`、`vrlcm=10.0.0.201` —— ping 不通,
但名字跟現役的 `vra`(10.0.0.203,開機)/ `vidm`(10.0.0.202,開機)/ `vrlcm`(VM 關機)太接近,
自動比對不可靠。請自己確認哪幾套 Aria 還要留。

### 2.3 反解

PTR 區域只有 `0.0.10` / `1.0.10` / `16.168.192`。刪 A 記錄時 PTR 要一起清,
**VCF 部署前務必正反解各驗一次**(反解缺一筆就會擋 bring-up,症狀卻長得像憑證問題)。

---

## 三、外層 vCenter:66 台 VM,開機 25 / 關機 41

### 3.1 掛在已死 `vsanDatastore` 的 9 筆範本 —— ✅ **決定保留,不要再提議清理**

2026-10-05 使用者裁示:**只要是 template 就留著。** 本項結案,後續 session 不要再排進清理清單。

實測事實(留作紀錄):共 **9 筆,全部是 template**(`.vmtx`),不是 VM ——
`esx01`~`esx04`、`vcf9esx04`、`Tina/Win2019-Tools`、`Tina/VM-016`,
以及兩份同名的 `vcf-services-platform-template-9.0.1.0.24940697`(一份在根、一份在 `Aria/`)。
⚠️ `esx01` 的 vmx 檔名其實是 `m02-esx01.vmtx`,與顯示名不一致。

`vsanDatastore` 本身:`summary.accessible=false`、無任何 host 掛載、容量 0 GB、
URL `ds:///vmfs/volumes/vsan:52af9b09e9002bb2-1509c8bfbe7b95fb/`,
`datastore.ls` 回 "No connected and accessible host is attached"。
底層檔案在 2026-07-10 外層 vSAN 重格時就沒了,這 9 筆是 inventory 裡的死參照 —— 但**保留**。

### 3.2 可考慮下架的關機 VM(請自行決定)

舊測試機:`vc8test-9`、`vc9test`(DNS 有無 VM)、`mcp-server`、`mcp-test`、`openwebui`、
`openwebui-test`、`ollama-14b`、`tkg80avi`、`sql2019`、`Oracle19C`、`ubuntu-dltest`、
`rhel98-orig`、`route-bak`、`install9.1`、`vcf-installer-verify`、`vcf-m02-inst04-911`、
`vcf-m02-inst05-911`(inst06 才是現役)。

VCDA 一組 4 台:`vcda01`、`vcda75`、`vcda-onprem01`、`vcda-onprem75`。
VCD 相關:`vcd-t04-01`(關機)、`vcd-nfs01`(開機中)。
template 7 個:`win2012temp`、`centos7new`、`Centos7`、`Oracle-Cento7`、`Oracle19c-TEMP`、
`vdbench-temp`、`ubuntu2004temp` —— `ubuntu2004temp` 還在用(clone 服務機),其餘可評估。

### 3.3 名字不一致

- resource pool 現在是 `Nested-VCF9-M02-yvhFworM`,舊筆記寫 `hFuSZOIr` / `qJvClhGz`,
  每次重建都會換;**腳本不要寫死 resource pool 名字**。
- nested ESXi VM 叫 `vcf-m02-esx0N-91`,DNS 裡是 `vcf-m02-esx0N`,兩者不同,開關機腳本比對要注意。
- `labvc8 (1)` 名字帶空白和括號,govc 操作要引號。

---

## 四、服務異常(整理時順手發現,都還沒處理)

| 症狀 | 位置 | 備註 |
|---|---|---|
| depot2 `:8888` 無回應 | `vcf9depot2` 10.0.0.62 | VM 開機、ping 通,HTTP 不回。主力 depot 10.0.0.61 正常 |
| License Hub HTTPS 無回應 | `lichub01` 10.0.0.77 | VM 開機、ping 通 |
| `vcf9dltool` ping 不通 | DNS 指 10.0.0.68 | VM 卻是開機狀態 → 實際 IP 可能已變 |
| 外層 `vsanDatastore` 容量 0 | 10.0.0.101 | 見 §3.1 |
| network pool 為空 | SDDC Manager | converge 環境的已知現象;縮容前要先建 |

---

## 五、開關機排程:三個都 Disabled

```
VCF-M02-Morning-PowerOn-FullStack      Disabled
VCF-M02-Nightly-Shutdown-AllExceptVC   Disabled
VCF-M02-PowerOn-Sun0816-Once           Disabled
```

目前**完全沒有自動省電**。恢復前要先驗關機腳本的 VM 比對規則跟得上現在的名字
(`vcf-m02-esx0N-91`、`vcf-m02-vsp01-*` 三節點、w01 那三台 + `vcf-w01-vc01`)。
操作走 `vcf-power` skill。

---

## 六、Git:22 個 repo 全部已推送,5 個有未提交變更

| repo | 未提交檔數 | branch |
|---|---|---|
| `vcf9.1-lab` | 22 | `day-n-host-onboarding-2026-09`(不是 main) |
| `license-hub` | 12 | main |
| `vcf9offlinescript` | 3 | main |
| `vra-lifecycle` | 2 | main |
| `license-hub-20` | 1 | main |

`gg` 與 `gg-repo` 指向同一個 remote(`kostenyang/gg`),是重複的 clone,可留一個。
`vc-folder-tag-migrate` 與 `vc-meta-migrate` 也指向同一個 remote。

---

## 七、文件:頂層 29 個 docx/pptx/pdf

交付成品散在頂層,建議歸檔到 `E:\9.1\deliver\docs\`(或各自的 repo 已有副本就刪本機散檔):
converge / import-wld / SSO / VCDA / RDM / Supervisor / LicenseHub / Watch-VMHealth /
vRA / VC-Migrate / Fleet-Version-Sync 等。

`VCF91-SSO-Configuration-Guide.docx`(9.0 MB)與 `VCF91SSOConfigurationGuide.docx`(8.1 MB)
是同一份的兩個檔名,其中一份可刪。
