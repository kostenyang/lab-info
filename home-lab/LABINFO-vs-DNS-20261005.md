# labinfo.md ↔ DNS ↔ 實機 三方對照(2026-10-05 實測)

> 比對來源:`E:\9.1\labinfo.md`(126 行)、`home.lab` 全部 A 記錄、ping、外層與 inner vCenter(govc)。
> 結論:**`labinfo.md` 有 7 筆資料是錯的或已失效,另有 11 項現役元件完全沒記。目前查它會被誤導。**

---

## 一、labinfo 的「核心 VCF 元件」表逐列驗證

| labinfo 寫的 | DNS | 實機 | 判定 |
|---|---|---|---|
| VCF Installer `vcf-m02-inst01` 10.0.1.4 | 有此記錄 | **ping 不通,VM 已不存在** | 🔴 **錯** 現役是 `vcf-m02-inst06` **10.0.1.54** |
| SDDC Manager `vcf-m02-sddcm01` 10.0.1.18 | ✓ | ✓ 活著 | ✅ |
| inner vCenter `vcf-m02-vc01` 10.0.1.19 | ✓ | ✓ 活著 | ⚠️ IP 對,但備註「dc=m01-dc01 cluster=m01-cl01(domain-c9)」**是錯的**,實際 dc=`vcf-m02-dc01`、cluster=`vcf-m02-cl01` |
| NSX VIP `vcf-m02-nsx01` 10.0.1.21 / node a .20 | ✓ | ✓ 兩者都活 | ✅ |
| VCF Operations 10.0.1.22 | ✓ | ✓ HTTP 200 | ✅ |
| Fleet `vcf-m02-fleet01` 10.0.1.23 | ✓ | ✓(`/` 回 404 是正常,走 Host header) | ✅ |
| Ops Cloud Proxy 10.0.1.24 | ✓ | ✓ | ✅ |
| VSP VIP 10.0.0.172 | ✓ | ✓ 活著 | ⚠️ VIP 對,但備註「控制平面節點 SSH **10.0.0.222**」**錯**,.222 ping 不通 |
| shared `vcf-m02-shared01` 10.0.0.173 | 有此記錄 | **ping 不通,元件不存在** | 🔴 **已失效** |
| VIDB `vcf-m02-vidb` 10.0.0.174 | ✓ | ✓ | ✅ |
| License Server 10.0.0.175 | ✓ | ✓ HTTP 200 | ✅ |
| **VCFA VIP** `vcf-m02-auto-vip` 10.0.0.170 | 有此記錄 | **不存在**(VCFA 已於 09-15 移除) | 🔴 **已失效** |
| VCFA platform 10.0.0.171 / SSH 10.0.0.243 | 有 .171 | 兩者都 ping 不通 | 🔴 **已失效** |
| Nested ESXi 10.0.1.14-17 | ✓ | ✓ 四台都活 | ⚠️ IP 對,但**外層 VM 名是 `vcf-m02-esx0N-91`**,DNS 名無 `-91`,腳本比對要注意 |

### VSP 控制平面節點的真實 IP(labinfo 完全沒有)
`vcf-m02-vsp01-8xrvq` = **10.0.0.231**、`-jcgxp` = **10.0.0.233**、`-wxsgl` = **10.0.0.234**。
**三節點不是四節點**,且 **這三個 IP 在 DNS 裡完全沒有記錄**。

---

## 二、labinfo 的 NSX VNA 整段 —— 🔴 **全部失效**

`vna-cl01` / `vcf-m02-vna01` / 10.0.0.181 / `vpc-test01` / `vpc-priv-block` / Default TGW:
**10.0.0.181 ping 不通,VNA 已不存在**。放置資訊寫 `cluster m01-cl01` + `datastore m01-cl01-ds-vsan01`
也跟現況不符(實際是 `vcf-m02-cl01`)。

整段應標記為「歷史配方」,不是現況。

---

## 三、labinfo 的 VCF 備份段 —— ⚠️ 目標機活著,但 **DNS 沒有它**

| 項目 | 狀況 |
|---|---|
| SFTP 備份目標 10.0.0.18 | ✅ **ping 通,VM `sftp-server` 開機中,IP 確實是 10.0.0.18** |
| DNS | 🔴 **`home.lab` 裡沒有任何 A 記錄指向 10.0.0.18** |

備份設定靠裸 IP 可以動,但**這台沒有 FQDN**。VCF 備份排程本身沒驗證(SDDC Manager 的
backup-configuration 在多輪重建後很可能已經不是 labinfo 描述的狀態),需要另外查。

---

## 四、labinfo 的省電開關機段 —— 🔴 **排程名稱全錯**

| labinfo 寫的排程 | 實際存在的排程 |
|---|---|
| `VCF-M02-PowerOn-VSP-VCFA`(週日 19:00) | **不存在** |
| `VCF-M02-Shutdown-VSP-VCFA`(每日 23:30) | **不存在** |
| — | `VCF-M02-Morning-PowerOn-FullStack` — **Disabled** |
| — | `VCF-M02-Nightly-Shutdown-AllExceptVC` — **Disabled** |
| — | `VCF-M02-PowerOn-Sun0816-Once` — **Disabled** |

關機對象也錯:labinfo 說「VCFA=`vcf-m02-auto-platform-*` 1 台、VSP=`vsp01 x4` 4 台」,
實際 **VCFA 已不存在、VSP 是 3 節點**。腳本路徑 `poweron-vsp-vcfa.ps1` / `shutdown-vsp-vcfa.ps1`
也已被 `tools\` 下的新腳本取代(現在走 `vcf-power` skill)。

---

## 五、labinfo 完全沒記的現役元件(11 項)

| 元件 | FQDN | IP | DNS |
|---|---|---|---|
| **w01 VI 網域 vCenter** | `vcf-w01-vc01.home.lab` | 10.0.1.49 | ✓ |
| **w01 nested ESXi ×3** | `vcf-w01-esx01~03.home.lab` | 10.0.1.46 / .47 / .48 | ✓ |
| **現役 VCF Installer** | `vcf-m02-inst06.home.lab` | 10.0.1.54 | ✓ |
| VSP installer | `vcf-m02-vsp-inst.home.lab` | 10.0.0.177 | ✓ |
| depot(主力) | `vcf9depotserver.home.lab` | 10.0.0.61 | ✓ |
| depot2 | `vcf9depot2.home.lab` | 10.0.0.62 | ✓ |
| VCD NFS | `vcd-nfs01.home.lab` | 10.0.0.60 | ✓ |
| License Hub 2.0 | `lichub01.home.lab` | 10.0.0.77 | ✓ |
| Windows 跳板機 | `winjump01.home.lab` | 10.0.0.85 | ✓ |
| vROps(外層) | `vrops.home.lab` | 10.0.0.111 | ✓ |
| Lab router / NTP | — | 10.0.1.254 | 🔴 **DNS 無記錄** |

> `vcf-m02` 現在是 **MANAGEMENT 網域**,`vcf-w01` 是 **VI 網域**,**兩者共用同一套 NSX**
> (`vcf-m02-nsx01`)。labinfo 完全沒有 w01 的概念。

---

## 六、DNS 自己的問題

### 6.1 IP 對不上實機(1 筆,這是昨天那個「ping 不通但 VM 開機」的答案)

| 名稱 | DNS 說 | 實機真的是 | 處置 |
|---|---|---|---|
| `vcf9dltool` | 10.0.0.68 | **10.0.0.32** | 🔴 改 A 記錄到 .32,或把 VM 的 IP 改回 .68 |

### 6.2 沒有 DNS 記錄的活機(5 個)

`sftp-server` 10.0.0.18(備份目標)、VSP 三節點 10.0.0.231 / .233 / .234、
`vcf9dltool` 真實 IP 10.0.0.32、Lab router 10.0.1.254。

### 6.3 IP 撞名(3 組)

| IP | 占用者 |
|---|---|
| 10.0.0.62 | `vcf9depot2` + `vcfdepotserver` — 兩個名字同一台,確認保留哪個 |
| 10.0.1.25 | `vcf-m01-hcx`(VM 關機中)+ `vlr9`(已不存在)→ 刪 `vlr9` |
| 10.0.1.31 | `vcf-m01-edge1` + `vcf-m02-edge02` — 兩者都不存在,兩筆都刪 |

### 6.4 正反解一致性 —— ✅ 現役元件全部通過

抽查 10.0.1.18 / .19 / .20 / .21 / .22 / .49 / .54 與 10.0.0.172 / .175,
PTR 與正解回查**全部一致**。VCF 部署前的 DNS 前置條件這一塊目前是乾淨的。

### 6.5 陳舊記錄

130 筆 A 記錄中 **74 筆的 VM 已不存在**,清單與乾跑腳本在
`E:\9.1\dns-cleanup-20261004.ps1`(每行帶 `-WhatIf`)。另 21 筆是「VM 還在但關機」,保留。

---

## 七、建議動作(都還沒做)

1. **`labinfo.md` 重寫** —— 目前 7 筆錯誤 + 11 項漏記,且 VNA / VCFA / 備份 / 排程四段整段失效。
   建議改成只放「現役且實測過」的內容,歷史配方移到別的檔或 repo。
2. **修 `vcf9dltool` 的 A 記錄**(10.0.0.68 → 10.0.0.32),這是唯一一筆 DNS 指向錯誤的活機。
3. **補 5 筆缺的 A 記錄**:sftp-server、VSP 三節點、lab router。
4. **解決 3 組 IP 撞名**。
5. 清 74 筆陳舊記錄(含 PTR)。
