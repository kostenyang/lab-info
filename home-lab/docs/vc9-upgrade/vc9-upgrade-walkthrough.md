# vCenter Server 9.0.2 → 9.1 手動升級教學（in-place update）

> 測試環境：`vc9test.home.lab` (10.0.0.110)，standalone embedded vCenter，部署於外層 vSphere 8 lab。
> 升級方式：**VAMI in-place update**（官方對 minor 升級的建議法）。日期 2026-07-27。

---

## 0. 觀念：Upgrade vs Update（官方定義）

| 情境 | 方法 | 媒體 |
|------|------|------|
| 跨大版（8.0 → 9.0） | **Upgrade**：migration-based，部新 appliance→暫時 IP→遷移資料→接管 IP | `VMware-VCSA-all-X.iso` 安裝器 |
| 同版 minor（**9.0 → 9.1**） | **Update / Patch**：**in-place**（VAMI 或 `software-packages`），可搭 RDU | `-updaterepo.zip` / patch repo URL |

官方原文：*"you can use the patching process to make minor upgrades to your 9.0 deployment."*
本教學走 **VAMI in-place update**。

---

## 1. 前置準備

1. **備份**（官方硬性建議）：file-based backup 或 VM snapshot。本測試用 VM snapshot `pre-9.1-upgrade-9.0.2` 作回滾。
2. **時鐘**：NTP 同步正確來源（本 lab = 10.0.1.254）。
3. **9.1 更新庫（repo）**：取得 `VMware-vCenter-Server-Appliance-9.1.0.0-updaterepo.zip`，解壓後以 **HTTPS**（或 FTPS）提供服務。
   - VAMI「Specified」repo **只接受 HTTPS/FTPS**，不吃純 HTTP。
   - 本測試：depot(10.0.0.61) 上解壓到 `/depot/vc91repo/`，用 python https server 提供 `https://10.0.0.61:8443/`（自簽憑證）。

---

## 2. 檢視升級前版本（VAMI Summary）

瀏覽器開 `https://vc9test.home.lab:5480` → `Administrator@vsphere.local` 登入 → **Summary**。
確認 **Release Name / Version = 9.0.2.0，Build 25148086**，Health 全 Good。

![升級前 9.0.2](img/01-vami-summary-before-9.0.2.png)

---

## 3. 設定更新來源 repository（Update → Settings）

左側 **Update** → 右上 **SETTINGS**：
- Repository Settings URL → 選 **Specified**
- URL 填 `https://10.0.0.61:8443/`
- **取消勾** Check Certificate（自簽憑證；正式環境用受信任憑證則保持勾選）
- SAVE

![Repository 設定](img/03-repo-settings-specified.png)

---

## 4. 檢查可用更新（Check Updates）

右上 **CHECK UPDATES** → 選 **Check CD ROM + URL**（或 Check URL）。
Available updates 出現 **Version 9.1.0.0 / Type: Enhancement / Reboot Required: Yes**，代表 9.0.2 → 9.1.0.0 是合法 in-place 路徑。

![9.1.0.0 可用](img/04-available-update-9.1.0.0.png)

---

## 5. Stage and Install 精靈

選取 9.1.0.0 → 點 **STAGE AND INSTALL**。

### 5.1 EULA
勾選 *I accept the terms of the license agreement* → NEXT。

![EULA](img/05-wizard-eula.png)

### 5.2 Pre-Update Check（自動）
系統自動跑 pre-update checks。本測試出現的皆為 **Warning（非阻斷）**：
- LCM 不支援的舊 baseline 檔不複製
- **VM 硬體版本過舊** → 升級後依 KB 403995 升 VM compatibility
- 無法檢查 Supervisor 互通性（本環境無 Supervisor）
- **未做 file-based backup**（本測試以 VM snapshot 取代）
- system / memory health degraded（tiny 剛開機的暫時狀態）

檢視後點 **IGNORE AND CONTINUE**（正式環境應先消除警告）。

![Pre-update 警告](img/06-preupdate-checks-warnings.png)

### 5.3 Join CEIP
依需求勾選；本測試取消 → NEXT。

### 5.4 Backup 確認
說明「update 過程會自動建立 LVM snapshot 備份」，顯示 **預估停機 ~42 分**。
勾 *I have backed up vCenter Server...* → **FINISH**。

![Backup 步](img/07-wizard-backup-step.png)

---

## 6. 安裝進行中

畫面顯示 **Installation In Progress**：
- Staging（從 repo 下載 9.1 RPM）
- 安裝 RPM
- 自動重開機

![Staging](img/08-install-in-progress-staging.png)
![下載 RPM](img/09-install-downloading-rpms.png)

> 安裝過程 VAMI/vCenter 服務會中斷並重開，屬正常。

---

## 7. 升級後驗證（待補）

重開完成後重新登入 VAMI → Summary，確認 **Version = 9.1.0.0**。

<!-- ![升級後 9.1.0.0](img/10-vami-summary-after-9.1.0.0.png) -->

再登入 vSphere Client（`https://vc9test.home.lab`）確認版本。

<!-- ![vSphere Client 9.1](img/11-vsphere-client-9.1.png) -->

---

## 8. 升級後續（Post-upgrade）

- 依 **KB 403995** 升級 vCenter **VM hardware compatibility**（precheck 警告項）。
- 視需要續套 9.1.0.0100 / 0200 patch（同法，repo 換對應 updaterepo）。

---

## 附錄：CLI 等效做法（software-packages）

不走 GUI 時，SSH 進 appliance 以 root：
```bash
software-packages stage --url https://10.0.0.61:8443/ --acceptEulas
software-packages list --staged
software-packages install --staged
# 或一次到位
software-packages install --url https://10.0.0.61:8443/ --acceptEulas
shutdown now -r "patch reboot"
```
