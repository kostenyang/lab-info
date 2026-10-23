# 整理清單 — 修正版(2026-10-05)

> 取代 `LAB-CLEANUP-20261004.md` 的磁碟與服務異常兩節。
> 依使用者指示:**「VCF 5.2.1 VSAN 叢集測試」session 正在用的一律不動,其餘重新評估。**
> 執行狀態:**只刪了 §3.5 那三個 download tool 目錄(1.57 GB,使用者指示)**,其餘一律未動。

---

## 一、🔒 保護清單 —— m03 建置正在用,不要動

那個 session 現在的進度:4 台 nested ESXi 9.1.0 已部好,
`vcf-m03-vc01`(10.0.1.60)single-node vSAN 引導中(firstboot 裝 RPM 75/100)。
後續步驟:建叢集收 vSAN → vLCM 升主機到 9.1.1 → 部乾淨的 VCF Operations 9.1.1
→ 取 registration key → 部 License Server → Installer UI 跑 converge 勾「既有 Operations」。

| 保護對象 | 為什麼 |
|---|---|
| `Nested_ESXi9.1.0.0_Appliance_Template_v1.0.ova` | `m03/Deploy-M03-NestedESXi.ps1` 直接引用,寫死這個路徑 |
| `VMware-VCSA-all-9.1.1.0.25712839.iso` | **此刻正在用**(vcsa-deploy 跑 m03 的 vCenter) |
| `VMware-ESXi-9.1.1.0.25714478-depot.zip` | 下一步 vLCM 要把 m03 四台主機升 9.1.1 |
| `VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova` | 最後 converge 要用的 VCF Installer |
| depot `10.0.0.61`(`:8888`)、depot2 `10.0.0.62`(443) | bundle 來源 |
| `m03/` 整個目錄 | 它的工作目錄,09:36 還在寫 log |
| `vcf-m03-esx01~04`、`vcf-m03-vc01` 及 `vcf-m03-*` DNS | 建置中 |

> ⚠️ **順便提醒那個 session**:本機**沒有** VCF Operations 9.1.1 的安裝 OVA,也沒有
> License Server 的安裝媒體。`Operations-Upgrade-9.1.1.0.25679887.pak` 是**升級 PAK 不是安裝檔**。
> 「部乾淨的 Ops 9.1.1」那一步需要從 depot 或 Broadcom 取得安裝媒體,目前本機沒有。

---

## 二、✅ 兩個「服務異常」是我誤判,已排除

| 我昨天報的 | 真相 |
|---|---|
| depot2 10.0.0.62 的 `:8888` 不回應 → 以為壞了 | **正常**。它是 nginx 跑在 **443,而且要認證**(回 401 Authorization Required);`:8888` 本來就沒開。跟 rhel-depot 一樣是「443 要 auth」的設計 |
| lichub01 10.0.0.77 HTTPS 無回應 → 以為壞了 | **正常**。它走 **Host header 路由**(envoy)。`https://lichub01.home.lab/` 回 **302**;打裸 IP 才會 404 / TLS reset。5480 VAMI 也活著(302) |

🔴 **我的錯**:context 檔自己第 4 節就寫著「Fleet / VSP / VCFA 走 Host header 路由,
打裸 IP 一律 404 —— **404 不等於壞掉**」,我卻在探測時只打裸 IP 就判定服務異常。
**以後探測一律用 FQDN,並且在判定「壞掉」之前先換 port 與 Host header 各試一次。**

### 還沒解決的異常(2 個,縮減自 5 個)

| 症狀 | 細節 |
|---|---|
| `vcf9dltool` DNS 指錯 | DNS 寫 10.0.0.68,實機是 **10.0.0.32**。要改 DNS 或改 VM IP |
| ESX metadata 每日 FAILED | SDDC Manager 每天 17:24 固定失敗,已連 4 天(air-gap 抓 vendor add-on,老問題) |

`vsanDatastore` 容量 0 → 依指示保留那 9 筆 template,不算異常。
network pool 為空 → converge 環境的已知現象,不算異常。

---

## 三、磁碟:重新評估(E: 目前 101 GB 可用)

### 3.1 可回收且**可重建**(風險低)

| 目標 | 大小 | 重建方式(已驗證) |
|---|---|---|
| `vcf911-upload/*.part`(7 片) | **62 GB** | 來源 depot `10.0.0.61` 的 `PROD/COMP` **確認還在**;打包腳本 `create_vcf9_depot_server_v6.sh` 就在同目錄,`SHA256SUMS.txt` 可驗證 → 重跑即可 |
| `deliver/fleet-binaries-only-9.1.0.tar` | **22 GB** | **9.1.0** 版(環境已 9.1.1,m03 也是 9.1.1,用不到);同目錄有 `import-fleet.sh` + `SHA256SUMS.txt` + `metadata-original.tgz`,可從 depot 重建 |
| `_upgtest/PROD` | **7.2 GB** | 就是 depot 內容的副本(COMP 7.1G + metadata 72M + vsan 21M),depot 本體還在 |
| ~~`_vcfdt911/PROD` + `_metatmp/PROD` + `dltool0400/`~~ | ~~1.6 GB~~ | ✅ **2026-10-05 已刪除**(見 §3.1.1) |
| `Protection-and-recovery-9.1.0.0.25367487.iso` | **3.1 GB** | 9.1.0 舊版;環境全 9.1.1 |
| **小計(尚未執行的部分)** | **≈ 94.3 GB** | |

> 這幾項**都不在 m03 的保護清單上**,atime 都在 9 月 24 日之前。

### 3.1.1 ✅ 已執行:三個 download tool 目錄(2026-10-05)

依使用者指示刪除,共回收 **1.57 GB**(E: 從 99 GB → **101 GB**)。

| 目標 | 大小 | 還原方式(已確認可行) |
|---|---|---|
| `_vcfdt911/PROD` | 613 MB | depot `10.0.0.61` 的 `PROD/COMP` 仍在(HTTP 200) |
| `_metatmp/PROD` | 103 MB | 同上 |
| `dltool0400/` | 859 MB | `tar xzf E:/vcf-download-tool-9.1.0.0400.25570101.tar.gz`(468 MB 來源**仍在 E: 根目錄**) |

🔴 **刪除前更正了一個我自己的錯誤判斷**:我原本寫「`dltool0400` 是暫存,已有新版」。
實際上它**不是暫存**,是解開的 VCF Download Tool **9.1.0.0400**(build 25570101),
含可執行檔 `vcf-download-tool` / `lcm-bundle-transfer-util` 與 win32+lin64 兩份 JRE,
而 `vcf-download-tool/` 目錄**只是文件 repo,沒有任何執行檔** —— 本機當時只有這一份工具本體。
之所以仍可安全刪除,是因為**來源 tarball 還在 `E:\` 根目錄**,解壓即可完整還原。

另:有 4 份文件引用 `dltool0400` 路徑(`dev-docs/rhel-depot-build.md`、
`dev-docs/rhel98-depot-rebuild.md`、`dev-docs/vra8-vrops-import-to-vcf91.md`、
`vra-lifecycle/runbooks/vcf911-vra8-import-upgrade-worklog.md`)—— 是歷史紀錄,
要重跑那些步驟時先解壓還原即可。

### 3.2 可回收但**重建成本高**(要你決定)

| 目標 | 大小 | 考量 |
|---|---|---|
| `vks/` | 17 GB | VKS / Supervisor / TKr 媒體。環境裡已無 Supervisor,但要再做 VKS 就得重抓(含 TKr 5.4G、supervisor library 3.9G) |
| `rhel-9.8-x86_64-dvd.iso` | 14.5 GB | `rhel-depot` VM 已建好(目前關機)。只有要重建那台才需要 ISO |
| `hcx-unified-appliance-9.1.1.*.ova` | 4.1 GB | HCX 10-01 已全拆。重部配方在 repo,但 OVA 要重抓 |

### 3.3 🔄 從「建議刪除」改為**建議保留**

| 目標 | 大小 | 改變原因 |
|---|---|---|
| `License-Hub-2.0.0.0.0.25630952.ova` | 11 GB | 昨天以為 lichub01 壞了才想留重部路徑;**今天確認 lichub01 是好的**。但 License Hub 2.0 是 private repo 專案、OVA 取得不易,11 GB 換「隨時能重部」仍划算 → **保留** |
| `Operations-Upgrade-9.1.1.0.25679887.pak` | 7 GB | 昨天判定「已升完可刪」。但 m03 正要部 Ops 9.1.1 而**本機沒有 Ops 安裝媒體** → 先別動,等那個 session 確認它用什麼來源 |

### 3.4 合計

| 方案 | 可回收 |
|---|---|
| 已執行(§3.1.1) | 1.57 GB → E: 99 → **101 GB** |
| 再清 3.1 其餘(低風險、可重建) | **≈ 94.3 GB** → E: 可到 **約 195 GB** |
| 再加 3.2 | 再 **+35.6 GB** |

---

## 四、散檔:這次可以動的部分

`scratch-*.txt` 18 個 —— **裡面是 API token 與 task id,應該直接刪而不是封存**。
全部是 9-22 之前的,m03 用的是 `m03/` 自己的目錄,不碰這些。

頂層 61 個 `.log`:m03 的 log 在 `m03/`,舊 log 可封存到 `_archive/logs-2026H2/`。
**唯一要留意的**:`shutdown-all-except-vc.log` 是排查開關機問題的依據(context §4 規則 2),不要封存。

`qa*` 13 個目錄 —— docx/pptx 的 QA 轉檔暫存,成品都已交付或進 repo。

---

## 五、建議執行順序

1. ✅ ~~三個 download tool 目錄~~ 已完成(1.57 GB)。
2. **再清 3.1 其餘的 94.3 GB** —— 全部可重建、都不在保護清單、atime 都在 9 月之前。
3. 刪 18 個 `scratch-*.txt`(含 token,刪掉同時也是降低外洩面)。
4. 修 `vcf9dltool` 的 DNS(10.0.0.68 → 10.0.0.32)。
5. 清 DNS 第一組 5 筆撞名(`dns-cleanup-20261005.ps1` 第一組,會解掉 m03 的 IP 分配陷阱)。
6. **等 m03 的 converge 跑完**,再處理 3.2、保護清單、以及 VM 下架。
