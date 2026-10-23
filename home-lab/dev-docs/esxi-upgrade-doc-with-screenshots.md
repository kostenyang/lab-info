# ESXi 升級手冊（含截圖）— session state

> 開始 2026-09-29。使用者需求：出一份 **ESXi 專屬的 docx**，比照 vCenter 那兩份的規格
> （逐步截圖）。使用者選了「**方式 2：補圖再出**」——實際跑一次流程截圖，不出純文字版。

## 範圍（已定）
三條升級路徑 + VCF 納管規則附錄：
- 路徑 A：`esxcli software profile update`
- 路徑 B：**vCenter vLCM image 升獨立主機**
- 路徑 C：**ISO 開機升級**（preserve VMFS）
- 附錄：VCF 納管規則（build 必須等於 BOM / 不允許單主機叢集 / 帶 VM 的主機 / 1G NIC）

> 範圍判斷：附錄納入。理由 = 納管規則決定「你到底能不能用 LCM 升」，是選路徑的前提，
> 拆掉的話路徑選擇表會沒有依據。使用者未明說，此為預設決定，交付時一併告知。

## 素材來源
- 文字底稿：`v8tov9/esxi-standalone-upgrade/`（已推 git，a6ba198）
- 截圖工具：`tools/cdp-live.mjs`（🔴 長期指示：文件截圖一律用 CDP 這套）
- console 截圖：`tools/Get-VMScreen.ps1` + `tools/Send-VMKeys.ps1`（ISO 路徑用）
- 媒體：`VMware-ESXi-9.1.1.0.25714478-depot.zip`、`deliver/esxi-911-dell/ESXi-9.1.1-25714478-Dell-A00.iso`
- 範本：`Nested_ESXi9.1.0.0_Appliance_Template_v1.0.ova`（乾淨 9.1.0 GA）

## 起點事實（2026-09-29 實測）
| 項目 | 值 |
|---|---|
| 外層 vCenter | 10.0.0.101 / `administrator@vsphere.local` / `<redacted>` |
| 外層 host | 10.0.0.95 — RAM 1024GB 用 471GB（**餘裕充足**）、64 threads |
| nested vCenter | 10.0.1.19 / `VMware1!VMware1!` |
| m01-cl01 | esx01-03（10.0.1.14-16）**全部已經是 9.1.1.0.25714478** → 不能當升級示範對象 |
| esx04 | VM `vcf-m02-esx04-91`、10.0.1.17、原本關機且已退出叢集 → 09-29 開機中，版本待確認 |
| esx05 | **已不存在**（先前測試環境已拆） |
| 管理棧 | vCenter/SDDC Manager/Ops 皆可達 |

## 計畫
1. [x] 確認 lab 可用、素材齊全
2. [x] esx04 **也是 9.1.1** → 不能當對象（已還原關機）
3. [x] 從 OVA 部 3 台乾淨 9.1.0 示範主機（esx11/12/13 = 10.0.1.11-13，4vCPU/16GB，DNS A+PTR 已建）
4. [ ] 路徑 B 前置：把 9.1.1 depot 掛成 vCenter 的 offline depot
5. [ ] 跑流程 + 截圖（B 用 cdp-live、C 用 Get-VMScreen）
6. [ ] 組 docx（portable node + docx-js，`tools/docx-build`）
7. [ ] QA（LibreOffice → pdf → poppler 轉圖檢查）

## 坑 / 發現
（隨做隨記）

---

## 2026-09-29 進度

### 示範主機（全部 9.1.0.0 build 25370933，目標 9.1.1.0 build 25714478）
| VM | FQDN / IP | 用途 |
|---|---|---|
| `vcf-m02-esx11-91demo` | vcf-m02-esx11.home.lab / 10.0.1.11 | 路徑 A：`esxcli software profile update` |
| `vcf-m02-esx12-91demo` | vcf-m02-esx12.home.lab / 10.0.1.12 | 路徑 B：vCenter vLCM image（獨立主機）|
| `vcf-m02-esx13-91demo` | vcf-m02-esx13.home.lab / 10.0.1.13 | 路徑 C：ISO 開機升級 |

部署參數：OVA `Nested_ESXi9.1.0.0_Appliance_Template_v1.0.ova`、datastore `ForNFS`、
portgroup `Trunk-Nobinding`、外層 host 10.0.0.95、root `VMware1!VMware1!`、NTP 10.0.1.254。

### 發現
- 🔴 **m01-cl01 的 esx01-03 與退役的 esx04 全都已是 9.1.1** → lab 裡沒有現成的升級對象，
  必須另外部乾淨 9.1.0 主機才能拍升級流程。
- ✅ **9.1.1.0.25714478 base image 已經在 vLCM depot 裡**（`/api/esx/settings/depot-content/base-images`），
  路徑 B 不必再匯 depot。
- `Get-VMScreen.ps1` 的 `-Out` 在 bash 裡要用**正斜線**（`E:/...`），反斜線會被吃掉變成 `E:9.1doc-shots...`。

### 路徑 B 實作中發現（2026-09-29）
1. 🔑 **新加進 VCF 管理的 vCenter 的獨立主機，會被自動套上 `Management-Domain-ESXi-Personality`
   這個 image（9.1.1.0.25714478）** —— 不必手動 assign，加完 host 直接就有 desired image。
2. 🔴 **compliance check 先失敗**：
   `Failed to connect to depot: http://vcf-m02-vc01.home.lab:9084/vum/repository/hostupdate/...
   urlopen error [Errno -2] Name or service not known`（KB 313508）
   根因 = **nested ESXi 的 DNS 多了一台 10.0.0.1**（OVA 先 DHCP、guestinfo 再補，結果變成
   `10.0.0.1, 10.0.0.200` 兩台，host 用第一台解不到 home.lab）。
   解法：`esxcli network ip dns server remove --server=10.0.0.1`（三台都要做）。
3. compliance 過關後的警告（照抄進文件）：
   - ESXi 不支援此主機上的 CPU（Broadwell，KB 82794）→ 可覆寫強制修復
   - `nested-esxi-customization(9.1.0-1.0.0)` VIB 在映像中遺失，修復時會被移除（KB 90188）
   - 主機將在修復期間重新開機；主機支援 Quick Boot
4. drift：Host 9.1.0.0.25370933 → Image 9.1.1.0.25714478

### 工具坑
- `cdp-live.mjs` 的 **`--url` 旗標對「已附著的分頁」不會導航**，要改成 steps 裡的 `{"url":...}`。
- vLCM 是 plugin，按鈕在 **iframe** 裡 → `clickText`/`clickAny` 一律 NOTFOUND，
  要用 `cdp-frame.mjs --frame 'plugins/com.vmware.vlcm.client'` 在 frame 內用 JS 點。
- CDP profile 裡有舊的 vc01 分頁會讓 `--match` 抓錯分頁（且舊分頁會卡住截圖）→ 先 `/json/close/<id>`。

### ✅ 路徑 B 完成（2026-09-29 13:14–13:19，約 5 分鐘）
esx12 9.1.0.0.25370933 → **9.1.1.0.25714478**，Image Compliance = **Host is compliant with the image**。
截圖 9 張在 `doc-shots/esxi-upgrade/b01..b09`：
b01 host summary(before) / b02 Updates→Image / b03 compliance 結果 / b04 software drift 表
/ b05 Review Remediation Impact / b06 Applicable remediation settings / b07 remediating
/ b08 compliant / b09 host summary(after)

🔑 **EULA 的位置變了**：舊筆記說「API 走不完最後一哩：EULA」，9.1.1 的實際位置是
**Review Remediation Impact 對話框底部的「I accept the Foundation Agreement」**（本次是預設已勾）。

### 路徑 C 素材
從 `dl.broadcom.com/<TOKEN>/PROD/COMP/ESX_HOST/` 抓到**原廠版（非 Dell）**
`VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso`（733,470,720 bytes），
正在上傳到外層 datastore `ForNFS` 的 `iso/`。用原廠 ISO 而不是自組 Dell OEM ISO，
免得 nested（Model=VMware20,1）撞 Dell addon 的硬體判斷。

### ✅ 路徑 A 完成（2026-09-29）
esx11 9.1.0.0.25370933 → **9.1.1.0.25714478**（Exit maintenance mode Completed）。
截圖：`a01-host-before.png` / `a02-host-after.png`（ESXi Host Client），CLI transcript 在
`tmp/esxi-doc/esx11-profile-update.log`（VIBs Installed/Removed/Skipped + Reboot Required: true）。

🔴 **兩個網路擋點，最後改用「本機 zip」才通**：
1. 本機（10.0.0.200）起的 python http.server：nested host 連不到 → **Windows 防火牆**擋 inbound。
   （不動防火牆，改走別的路。）
2. 改指 lab depot server `http://10.0.0.61:8888/esxtest/depot911/index.xml`：
   從 jumpbox curl 得到 200，但 host 上 `nc -z 10.0.0.61 8888` = **FAIL**
   → **ESXi 自己的防火牆預設只放行 outbound 80/443**（httpClient ruleset），非標準埠一律擋。
3. ✅ **正解（也最貼近離線現場做法）**：在 host 本機建 VMFS，把 offline bundle 放上去用本機路徑：
   ```
   partedUtil mklabel <dev> gpt ; partedUtil setptbl <dev> gpt "1 2048 <end> AA31E02A400F11DB9590000C2911D1B8 0"
   vmkfstools -C vmfs6 -S esx11-local <dev>:1
   pscp VMware-ESXi-9.1.1.0.25714478-depot.zip root@host:/vmfs/volumes/esx11-local/
   esxcli software profile update -d /vmfs/volumes/esx11-local/VMware-ESXi-9.1.1.0.25714478-depot.zip \
       -p ESXi-9.1.1.0-25714478-standard --no-hardware-warning
   reboot
   ```
   對應舊筆記那句「offline bundle 只吃本機路徑」——這次實測補上了**為什麼常常只能用本機路徑**。
4. ⚠ 卡住的 esxcli 會**佔住 esximage lock**，後續任何 `esxcli software ...` 都會跟著 hang；
   要先 `kill -9` 掉那串 sh/python 才能繼續。

### ⏸ 路徑 C 停在 EULA（等使用者授權）
esx13 已經從 `[ForNFS] iso/VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso` 開機，
畫面停在 **End User License Agreement (Foundation Agreement)**，要按 **F11 Accept and Continue**。
截圖已有 `c01-boot.png`（Loading ESXi installer）、`c02-welcome.png`（Welcome）、`c03-eula.png`（EULA）。
接受授權合約屬於要使用者明確同意的動作 → **已向使用者詢問，尚未按 F11**。

---

## ✅ 全部完成（2026-09-29 15:09）

### 交付物
- `docs/esxi-upgrade/ESXi-9.1-Upgrade-Guide.docx`（1.8 MB，17 頁，**21 張截圖**）
- `docs/esxi-upgrade/ESXi-9.1-Upgrade-Guide.pdf`（QA 用轉檔）
- 建置腳本 `tools/docx-build/build-esxi-upgrade.js`
- 原始截圖 `doc-shots/esxi-upgrade/`（a01-a02 / b01-b09 / c01-c10）

### 三條路徑實測結果（全部 9.1.0.0.25370933 → 9.1.1.0.25714478）
| 路徑 | 主機 | 結果 |
|---|---|---|
| A esxcli offline bundle | esx11 | ✅ |
| B vCenter vLCM image | esx12 | ✅ 約 5 分鐘 |
| C ISO 開機升級 | esx13 | ✅ 安裝不到 1 分鐘 |

### ⚠ 留在環境裡的東西（待使用者決定是否清）
- 三台 demo VM `vcf-m02-esx11/12/13-91demo`（外層 vCenter，共 12 vCPU / 48 GB，datastore ForNFS）
- **esx12 目前仍掛在 VCF 管理的 vCenter `m01-dc01` 底下當獨立主機** ← 最值得優先決定
- DNS A+PTR：vcf-m02-esx11/12/13.home.lab（10.0.1.11-13）
- ISO 留在 `[ForNFS] iso/VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso`
- esx04 已還原為關機（本次只是開起來查版本）

### 已清掉的
- 跳板機 port 8099 的 python http.server（已 kill）
- depot server 上的 `/depot/esxtest/depot911`
- 本機 `tmp/esxi-doc/` 的解壓 depot 與下載的 ISO

## 🧹 收尾（2026-09-29 15:20，使用者指示）

### 已推 git
`kostenyang/v8tov9` main `a6ba198..2ca1c8a` — `esxi-standalone-upgrade/doc/`
（docx + pdf + img/ 21 張 + 可重跑的 build script，腳本路徑已改成 `__dirname/img` 相對路徑），
README 補了四則新實測結論。

### 已清掉的環境殘留
- nested vCenter：`vcf-m02-esx12.home.lab` 已 disconnect + destroy，`/m01-dc01/host` 只剩 `m01-cl01`
- 外層 vCenter：三台 `vcf-m02-esx11/12/13-91demo` 已 power off + destroy，datastore 無殘留資料夾
- DNS：三筆 A + 三筆 PTR 全數移除並驗證解不到
- esx04 維持關機（本來就關著）

### 仍留著（刻意保留）
- `[ForNFS] iso/VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso`（原廠 9.1.1 安裝 ISO，733 MB）
  —— 下次要做 ISO 升級 / 重裝直接可用，不用再從 dl.broadcom.com 抓。
- 本機 `E:\9.1\VMware-ESXi-9.1.1.0.25714478-depot.zip`（offline bundle，原本就在）
