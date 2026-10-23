# VCF 9.1.1 升級包下載指南（Broadcom Support Portal）

## 1. 文件目的與現況

本文件以 2026-10-14 實際登入 Broadcom Support Portal 的畫面，逐頁說明 VMware Cloud Foundation 9.1.1 升級所需套件在哪裡下載、每個元件群組有哪些檔案（檔名、大小、build、發布日、SHA2），供規劃離線 depot 與逐檔下載時核對。

> **重點：2026-10-12 Broadcom 已釋出 9.1.1 的修補版（各元件為 9.1.1.0100，VCF Installer / Fleet Lifecycle / SDDC Lifecycle / Software Depot / VCF Automation / Migration service engine 為 9.1.1.0200）。Portal 群組頁預設顯示該群組最新 release，要抓 9.1.1.0 基礎版必須手動切換右上 Release 下拉。**

### 1.1 9.1.1.0 release 下的 46 個元件群組總覽

| # | 群組 | Packlist | 預設 release | 可選 release | 檔數 | GB |
|---|---|---|---|---|---|---|
| 1 | VCF Installer | 545630 | 9.1.1.0200 | 9.1.1.0200 / 9.1.1.0 | 2 | 4.94 |
| 2 | VMware Avi Load Balancer | 545702 | 32.1.3 | 32.1.3 | 1 | 3.86 |
| 3 | VMware Guest Customization Engine for Instant Clone | 545693 | 13.2.2.0 | 13.2.2.0 | 4 | 0.00 |
| 4 | VMware Tools | 545614 | 13.1.5.0 | 13.1.5.0 | 7 | 0.71 |
| 5 | VMware Remote Console | 545618 | 13.1.1.0 | 13.1.1.0 | 2 | 0.14 |
| 6 | Cloud proxy | 545682 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 1 | 3.22 |
| 7 | Fleet Lifecycle | 545673 | 9.1.1.0200 | 9.1.1.0200 / 9.1.1.0100 / 9.1.1.0 | 4 | 0.57 |
| 8 | Identity broker | 545631 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 4 | 0.84 |
| 9 | License server | 545654 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 1 | 0.86 |
| 10 | Log management | 545683 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 4 | 2.54 |
| 11 | Native Storage Service | 545694 | 9.1.1.0 | 9.1.1.0 | 5 | 0.55 |
| 12 | Real-time metrics | 545688 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 4 | 1.11 |
| 13 | Real-time metrics store | 545613 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 4 | 0.42 |
| 14 | SDDC Lifecycle | 545632 | 9.1.1.0200 | 9.1.1.0200 / 9.1.1.0100 / 9.1.1.0 | 4 | 0.63 |
| 15 | Salt RaaS | 545655 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 4 | 0.64 |
| 16 | Salt master | 545692 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 4 | 0.38 |
| 17 | Software Depot | 545616 | 9.1.1.0200 | 9.1.1.0200 / 9.1.1.0 | 4 | 0.86 |
| 18 | Telemetry | 545678 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 4 | 0.23 |
| 19 | VCF Automation | 545669 | 9.1.1.0200 | 9.1.1.0200 / 9.1.1.0100 / 9.1.1.0 | 4 | 15.69 |
| 20 | VCF Consumption CLI | 545612 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 7 | 0.57 |
| 21 | VCF Consumption CLI Plugins | 545621 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 10 | 4.03 |
| 22 | VCF Native Object Store | 545633 | 9.1.1.0 | 9.1.1.0 | 1 | 0.00 |
| 23 | VCF Operations | 545687 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 3 | 10.17 |
| 24 | VCF Operations HCX | 545672 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 3 | 7.99 |
| 25 | VCF Operations for networks | 545689 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 5 | 17.15 |
| 26 | VCF Operations orchestrator | 545690 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 2 | 7.02 |
| 27 | VCF service - Configuration | 545691 | 9.1.1.0 | 9.1.1.0 | 2 | 0.00 |
| 28 | VCF service - Encryption Management | 545619 | 9.1.1.0 | 9.1.1.0 | 1 | 0.00 |
| 29 | VCF service - Harbor | 545656 | 9.1.1.0 | 9.1.1.0 | 1 | 0.00 |
| 30 | VCF service - Metrics Aggregator | 545675 | 9.1.1.0 | 9.1.1.0 | 1 | 0.00 |
| 31 | VCF service - Migration | 545671 | 9.1.1.0 | 9.1.1.0 | 1 | 0.00 |
| 32 | VCF service - Migration service engine | 545674 | 9.1.1.0200 | 9.1.1.0200 / 9.1.1.0100 / 9.1.1.0 | 4 | 0.51 |
| 33 | VCF service - Secret Store | 545677 | 9.1.1.0 | 9.1.1.0 | 3 | 0.00 |
| 34 | VCF service - VKS Cluster Management Auto-Attach | 545615 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 1 | 0.00 |
| 35 | VCF services runtime | 545620 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 6 | 16.12 |
| 36 | VKSM Extensions | 545628 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 8 | 1.35 |
| 37 | VMware Deep Learning VM Image | 545617 | 9.1.1.0 | 9.1.1.0 | 1 | 3.43 |
| 38 | VMware ESX | 545653 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 2 | 1.38 |
| 39 | VMware ESX on Arm | 545676 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 2 | 0.50 |
| 40 | VMware NSX | 545629 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 7 | 23.98 |
| 41 | VMware vCenter | 545684 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 3 | 25.07 |
| 42 | VMware vSAN | 545686 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 2 | 1.38 |
| 43 | VMware vSphere Supervisor | 545670 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 | 1 | 3.75 |
| 44 | Protection and Recovery (incl. vSphere Replication, vSAN Snapshots) | 539713 | 9.1.1.0100 | 9.1.1.0100 / 9.1.1.0 / 9.1.0.0200 | 4 | 8.84 |
| 45 | VMware Private AI Services | 545679 | 3.0.0 | 3.0.0 | 2 | 0.00 |
| 46 | VCF service - ArgoCD | 545807 | 1.2.0 | 1.2.0 | 1 | 0.00 |
| | **合計** | | | | **151** | **171.4** |

## 2. 入口與導覽

1. 登入 `https://support.broadcom.com`，右上角切換到 **VMware Cloud Foundation** 事業群，左側 **My Downloads** 搜尋「VMware Cloud Foundation」。
2. 進入 **VMware Cloud Foundation** 產品頁後展開 **VMware Cloud Foundation 9**，會列出 9.0.0.0 ～ 9.1.1.0 各 release 與 Release Level Info（545627 = 9.1.1.0）。

![](img/01-vcf-product-downloads.png)

3. 點 **9.1.1.0** 進入 release 頁，上方 Primary Downloads 分頁列出 46 個元件群組，每個群組顯示 Release、Release Level Info、Packlist ID 與 **View Group** 連結。

![](img/02-vcf-911-product-files-top.png)

完整 46 個群組清單（整頁，分段）：

![](img/03-vcf-911-product-files-full-p1.png)
![](img/03-vcf-911-product-files-full-p2.png)
![](img/03-vcf-911-product-files-full-p3.png)

4. 群組頁（View Group）版面固定：右上 **Release 下拉**選版本、左上 **I agree to the Terms and Conditions** 勾選後才會出現下載圖示、**Expand All** 展開檔案表；表格欄位為 File Name（含大小與 Build Number）、Release Date、Last Updated、SHA2、MD5。**Copy** 可複製 Packlist ID。

5. 群組頁 URL 可直接帶 `groupId=<Packlist ID>&viewGroup=true` 開啟，例如 VCF Installer：

```
https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545630&viewGroup=true
```

### 2.1 Additional-Downloads 分頁（各修補版 packlist）

release 頁的第二個分頁 **Additional-Downloads** 列出 9.1.1.0 之後每個修補版（9.1.1.0100 / 9.1.1.0200）與各元件的補充 packlist，共 83 筆、分 2 頁。這個分頁是確認「哪些元件已出 0100 / 0200 修補」最快的地方。第三個分頁 **Drivers & Tools** 在 VCF 9.1.1.0 下是停用狀態（按鈕 aria-disabled），沒有內容。

![](img/06-tab-additional-downloads-full-p1.png)
![](img/06-tab-additional-downloads-full-p2.png)
![](img/06-tab-additional-downloads-full-p3.png)
![](img/06-tab-additional-downloads-full-p4.png)

![](img/07-tab-additional-downloads-p2-full-p1.png)
![](img/07-tab-additional-downloads-p2-full-p2.png)
![](img/07-tab-additional-downloads-p2-full-p3.png)

| Release | 筆數 |
|---|---|
| 9.1.1.0200 | 6 |
| 9.1.1.0100 | 28 |
| 9.1.1.0 | 40 |
| 其他（Avi、Tools、VMRC、9.1.0.x、PAIS、ArgoCD） | 9 |

| # | 名稱 | Release | Release Level Info | Packlist ID |
|---|---|---|---|---|
| 1 | VMware Avi Load Balancer | 32.1.3 | 545784 | 545784 |
| 2 | VMware Guest Customization Engine for Instant Clone | 13.2.2.0 | 545759 | 545759 |
| 3 | VMware Tools | 13.1.5.0 | 545732 | 545732 |
| 4 | VMware Remote Console | 13.1.1.0 | 545770 | 545770 |
| 5 | Fleet lifecycle | 9.1.1.0200 | 547761 | 547761 |
| 6 | SDDC lifecycle | 9.1.1.0200 | 547801 | 547801 |
| 7 | Software depot | 9.1.1.0200 | 547822 | 547822 |
| 8 | VCF Automation | 9.1.1.0200 | 547805 | 547805 |
| 9 | VCF installer | 9.1.1.0200 |  | 548407 |
| 10 | VCF service - Migration service engine | 9.1.1.0200 | 547951 | 547951 |
| 11 | Cloud proxy | 9.1.1.0100 | 547796 | 547796 |
| 12 | Fleet lifecycle | 9.1.1.0100 | 547970 | 547970 |
| 13 | Identity broker | 9.1.1.0100 | 547826 | 547826 |
| 14 | License server | 9.1.1.0100 | 547759 | 547759 |
| 15 | Log management | 9.1.1.0100 | 547680 | 547680 |
| 16 | Open Source License for Protection and Recovery | 9.1.1.0100 |  | 547459 |
| 17 | Real-time metrics | 9.1.1.0100 | 547851 | 547851 |
| 18 | Real-time metrics store | 9.1.1.0100 | 547824 | 547824 |
| 19 | SDDC lifecycle | 9.1.1.0100 | 547988 | 547988 |
| 20 | Salt RaaS | 9.1.1.0100 | 547847 | 547847 |
| 21 | Salt master | 9.1.1.0100 | 547854 | 547854 |
| 22 | Telemetry | 9.1.1.0100 | 547852 | 547852 |
| 23 | VCF Automation | 9.1.1.0100 | 547848 | 547848 |
| 24 | VCF Consumption CLI | 9.1.1.0100 | 547821 | 547821 |
| 25 | VCF Consumption CLI Plugins | 9.1.1.0100 | 548173 | 548173 |
| 26 | VCF Operations | 9.1.1.0100 | 547679 | 547679 |
| 27 | VCF Operations HCX | 9.1.1.0100 | 547793 | 547793 |
| 28 | VCF Operations for networks | 9.1.1.0100 | 547838 | 547838 |
| 29 | VCF Operations orchestrator | 9.1.1.0100 | 547853 | 547853 |
| 30 | VCF service - Migration service engine | 9.1.1.0100 | 547760 | 547760 |
| 31 | VCF service - VKS Cluster Management Auto-Attach | 9.1.1.0100 | 547834 | 547834 |
| 32 | VCF services runtime | 9.1.1.0100 | 547678 | 547678 |
| 33 | VKSM Extensions | 9.1.1.0100 | 547823 | 547823 |
| 34 | VMware ESX | 9.1.1.0100 | 547837 | 547837 |
| 35 | VMware ESX on Arm | 9.1.1.0100 | 547836 | 547836 |
| 36 | VMware NSX | 9.1.1.0100 | 547758 | 547758 |
| 37 | VMware vCenter | 9.1.1.0100 | 547795 | 547795 |
| 38 | VMware vSphere Supervisor | 9.1.1.0100 | 547849 | 547849 |
| 39 | CVE Status for VCF | 9.1.1.0 | 547043 | 547043 |
| 40 | Cloud proxy | 9.1.1.0 | 545729 | 545729 |
| 41 | Fleet lifecycle | 9.1.1.0 | 545772 | 545772 |
| 42 | Identity broker | 9.1.1.0 | 545752 | 545752 |
| 43 | License server | 9.1.1.0 | 545769 | 545769 |
| 44 | Log management | 9.1.1.0 | 545748 | 545748 |
| 45 | Native Storage Service | 9.1.1.0 | 545775 | 545775 |
| 46 | Open Source License for Protection and Recovery | 9.1.1.0 |  | 546323 |
| 47 | Real-time metrics | 9.1.1.0 | 545735 | 545735 |
| 48 | Real-time metrics store | 9.1.1.0 | 545733 | 545733 |
| 49 | SDDC lifecycle | 9.1.1.0 | 545768 | 545768 |
| 50 | Salt RaaS | 9.1.1.0 | 545802 | 545802 |
| 51 | Salt master | 9.1.1.0 | 545785 | 545785 |
| 52 | Software depot | 9.1.1.0 | 545755 | 545755 |
| 53 | Telemetry | 9.1.1.0 | 545758 | 545758 |
| 54 | VCF Automation | 9.1.1.0 | 545766 | 545766 |
| 55 | VCF Consumption CLI | 9.1.1.0 | 545716 | 545716 |
| 56 | VCF Consumption CLI Plugins | 9.1.1.0 | 545736 | 545736 |
| 57 | VCF Native Object Store | 9.1.1.0 | 545760 | 545760 |
| 58 | VCF Operations | 9.1.1.0 | 545765 | 545765 |
| 59 | VCF Operations HCX | 9.1.1.0 | 545734 | 545734 |
| 60 | VCF Operations for networks | 9.1.1.0 | 545753 | 545753 |
| 61 | VCF Operations orchestrator | 9.1.1.0 | 545661 | 545661 |
| 62 | VCF installer | 9.1.1.0 | 545750 | 545750 |
| 63 | VCF service - Configuration | 9.1.1.0 | 545756 | 545756 |
| 64 | VCF service - Encryption Management | 9.1.1.0 | 545783 | 545783 |
| 65 | VCF service - Harbor | 9.1.1.0 | 545737 | 545737 |
| 66 | VCF service - Metrics Aggregator | 9.1.1.0 | 545774 | 545774 |
| 67 | VCF service - Migration | 9.1.1.0 | 545720 | 545720 |
| 68 | VCF service - Migration service engine | 9.1.1.0 | 545771 | 545771 |
| 69 | VCF service - Secret Store | 9.1.1.0 | 545773 | 545773 |
| 70 | VCF service - VKS Cluster Management Auto-Attach | 9.1.1.0 | 545718 | 545718 |
| 71 | VCF services runtime | 9.1.1.0 | 545757 | 545757 |
| 72 | VKSM Extensions | 9.1.1.0 | 545719 | 545719 |
| 73 | VMware Deep Learning VM Image | 9.1.1.0 | 545754 | 545754 |
| 74 | VMware ESX | 9.1.1.0 | 545763 | 545763 |
| 75 | VMware ESX on Arm | 9.1.1.0 | 545803 | 545803 |
| 76 | VMware NSX | 9.1.1.0 | 545715 | 545715 |
| 77 | VMware vCenter | 9.1.1.0 | 545660 | 545660 |
| 78 | VMware vSphere Supervisor | 9.1.1.0 | 545782 | 545782 |
| 79 | Open Source License for Protection and Recovery | 9.1.0.0200 |  | 544537 |
| 80 | Open Source License for Protection and Recovery | 9.1.0.0100 |  | 543583 |
| 81 | Open Source License for Protection and Recovery | 9.1.0.0 | 533961 | 533961 |
| 82 | VMware Private AI Services | 3.0.0 | 545761 | 545761 |
| 83 | VCF Service - ArgoCD | 1.2.0 | 545809 | 545809 |

### 2.2 Download Token / Activation Code

使用 VCF Download Tool 或 VCF Installer 線上 depot 時需要授權：舊式 **Download Token** 在 My Dashboard → Quick Links → Generate Download Token，只有 Product Administrator 角色看得到；9.1 起 Installer 線上 depot 改用 **Activation Code**（先在 Installer UI 或 VCFDT 產生 Software Depot ID，再到 vcf.broadcom.com 的 Software Depot Registration 換碼）。本次登入帳號的 Quick Links 沒有 Generate Download Token 項目（下圖），要用客戶端具 Product Administrator 角色的帳號操作。

![](img/08-dashboard-quick-links.png)

## 3. 升級核心元件群組（逐頁截圖與檔案清單）

下列群組是 vSphere/VCF 升到 9.1.1 或 converge 進 VCF 9.1.1 時會用到的套件，依 Portal 順序以外的「升級順序」排列：管理面（Installer / Fleet / SDDC LCM / Depot / VIDB / VMSP）→ vSphere 層 → NSX → Supervisor → Operations / Automation 與周邊元件。

| 群組 | 用途 |
|---|---|
| VCF Installer | 新裝或 converge 用 OVA；既有 SDDC Manager 升級用 Upgrade tar |
| Fleet Lifecycle | VCF Operations fleet lifecycle 服務（VCFMS 服務包） |
| SDDC Lifecycle | SDDC Manager 生命週期服務包 |
| Software Depot | VCF Operations 內建 Software Depot 服務包 |
| Identity broker | VIDB 身分代理服務包 |
| VCF services runtime | VCF Management Services（VMSP）平台 OVA + 平台包 + CLI |
| VMware vCenter | VCSA 安裝 ISO / updaterepo / patch ISO |
| VMware ESX | ESX ISO 與 offline bundle（depot zip） |
| VMware vSAN | 與 ESX 同一組檔（vSAN 隨 ESX 升級） |
| VMware NSX | NSX Manager OVA、升級 mub、precheck pub、Edge |
| VMware vSphere Supervisor | Supervisor 內容庫 zip |
| VCF Operations | Operations 新裝 OVA / 就地升級 PAK / manifest |
| VCF Automation | VCF Automation bundle（15 GB 級） |
| Log management | VCF Operations Logs 服務包 |
| Cloud proxy | Operations Cloud Proxy OVA |
| License server | VCF License Server OVA |
| VCF Operations HCX | HCX unified appliance OVA / upgrade bundle |
| VCF Operations for networks | Platform / Collector OVA、upgrade bundle |
| VCF Operations orchestrator | Orchestrator OVA / updaterepo ISO |

### VCF Installer（Packlist 545630）

- Portal 群組頁預設 release：**9.1.1.0200**；下拉可選：9.1.1.0200, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545630&viewGroup=true`

![](img/g01-vcf-installer.png)

**9.1.1.0200 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-SDDC-Manager-Appliance-9.1.1.0200.25801071.ova` | 2.4 GB | 25801071 | Oct 12, 2026 | `9de1a554240c697e` |
| 2 | `VCF-SDDC-Manager-Appliance-Upgrade-9.1.1.0200.25801071.tar` | 2.54 GB | 25801071 | Oct 12, 2026 | `9a9a70776bc415f0` |

![](img/g01-vcf-installer-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova` | 2.4 GB | 25713928 | Sep 03, 2026 | `ce24111d67dac1ad` |
| 2 | `VCF-SDDC-Manager-Appliance-Upgrade-9.1.1.0.25713928.tar` | 2.54 GB | 25713928 | Sep 03, 2026 | `9b7c31c1a30d092a` |
| 3 | `metadata-20260908-101000.zip` | 7.08 MB |  | Sep 03, 2026 | `131e2abdfb53af4f` |


### Fleet Lifecycle（Packlist 545673）

- Portal 群組頁預設 release：**9.1.1.0200**；下拉可選：9.1.1.0200, 9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545673&viewGroup=true`

![](img/g07-fleet-lifecycle.png)

**9.1.1.0200 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-fleet-lcm-9.1.1.0200.25801070.tgz` | 582.57 MB | 25801070 | Oct 12, 2026 | `9bfab8f7eed8246a` |
| 2 | `configuration-schema-vcf-fleet-lcm-9.1.1.0200.25801070.yaml` | 1.04 KB | 25801070 | Oct 12, 2026 | `2fe1f8add48e45f7` |
| 3 | `depot-manifest-vcf-fleet-lcm-9.1.1.0200.25801070.yaml` | 742 Bytes | 25801070 | Oct 12, 2026 | `03a1c90c92539854` |
| 4 | `vcf-fleet-lcm-plugin-9.1.1.0200.25801070.tgz` | 817 Bytes | 25801070 | Oct 12, 2026 | `e03a9b339d25ae2f` |

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-fleet-lcm-9.1.1.0100.25761871.tgz` | 582.24 MB | 25761871 | Sep 21, 2026 | `c50d7d223d33e968` |
| 2 | `configuration-schema-vcf-fleet-lcm-9.1.1.0100.25761871.yaml` | 1.04 KB | 25761871 | Sep 21, 2026 | `e62da742625906e0` |
| 3 | `depot-manifest-vcf-fleet-lcm-9.1.1.0100.25761871.yaml` | 742 Bytes | 25761871 | Sep 21, 2026 | `ebdd0bbbfdbb31f7` |
| 4 | `vcf-fleet-lcm-plugin-9.1.1.0100.25761871.tgz` | 816 Bytes | 25761871 | Sep 21, 2026 | `48f2b81191b27fb9` |
| 5 | `vcf-lcm-bundle.json` | 20.59 MB |  | Sep 21, 2026 | `321bfc939a0c1b8d` |

![](img/g07-fleet-lifecycle-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-fleet-lcm-9.1.1.0.25713934.tgz` | 581.69 MB | 25713934 | Sep 03, 2026 | `9fb8bd6035406336` |
| 2 | `configuration-schema-vcf-fleet-lcm-9.1.1.0.25713934.yaml` | 1.03 KB | 25713934 | Sep 03, 2026 | `563826653983b7e9` |
| 3 | `depot-manifest-vcf-fleet-lcm-9.1.1.0.25713934.yaml` | 727 Bytes | 25713934 | Sep 03, 2026 | `a8747fe5d930a687` |
| 4 | `vcf-fleet-lcm-plugin-9.1.1.0.25713934.tgz` | 817 Bytes | 25713934 | Sep 03, 2026 | `c003bf43707f9626` |


### SDDC Lifecycle（Packlist 545632）

- Portal 群組頁預設 release：**9.1.1.0200**；下拉可選：9.1.1.0200, 9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545632&viewGroup=true`

![](img/g14-sddc-lifecycle.png)

**9.1.1.0200 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-sddc-lcm-9.1.1.0200.25801981.tgz` | 650.06 MB | 25801981 | Oct 12, 2026 | `93cb108807ff5a87` |
| 2 | `configuration-schema-vcf-sddc-lcm-9.1.1.0200.25801981.yaml` | 1.03 KB | 25801981 | Oct 12, 2026 | `8d135a6e5613e77b` |
| 3 | `depot-manifest-vcf-sddc-lcm-9.1.1.0200.25801981.yaml` | 736 Bytes | 25801981 | Oct 12, 2026 | `025d3d660333cd4e` |
| 4 | `vcf-sddc-lcm-plugin-9.1.1.0200.25801981.tgz` | 815 Bytes | 25801981 | Oct 12, 2026 | `f677c374cc1d22f0` |

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-sddc-lcm-9.1.1.0100.25761870.tgz` | 649.62 MB | 25761870 | Sep 21, 2026 | `bf9c7fc02c5b7da5` |
| 2 | `configuration-schema-vcf-sddc-lcm-9.1.1.0100.25761870.yaml` | 1.03 KB | 25761870 | Sep 21, 2026 | `ba2b56e3bd277989` |
| 3 | `depot-manifest-vcf-sddc-lcm-9.1.1.0100.25761870.yaml` | 736 Bytes | 25761870 | Sep 21, 2026 | `c02ead175a521e81` |
| 4 | `vcf-sddc-lcm-plugin-9.1.1.0100.25761870.tgz` | 816 Bytes | 25761870 | Sep 21, 2026 | `3581a8260c74d17c` |
| 5 | `productVersionCatalog.sig` | 1.88 KB |  | Sep 21, 2026 | `8bd2c17079fdd4b4` |

![](img/g14-sddc-lifecycle-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-sddc-lcm-9.1.1.0.25713940.tgz` | 649.16 MB | 25713940 | Sep 03, 2026 | `0ee547a2e2af0c88` |
| 2 | `configuration-schema-vcf-sddc-lcm-9.1.1.0.25713940.yaml` | 1.02 KB | 25713940 | Sep 03, 2026 | `aabc5797e32de4b0` |
| 3 | `depot-manifest-vcf-sddc-lcm-9.1.1.0.25713940.yaml` | 721 Bytes | 25713940 | Sep 03, 2026 | `05ec2b0bb71f2a48` |
| 4 | `vcf-sddc-lcm-plugin-9.1.1.0.25713940.tgz` | 812 Bytes | 25713940 | Sep 03, 2026 | `e0ac4d1632e3a4bb` |


### Software Depot（Packlist 545616）

- Portal 群組頁預設 release：**9.1.1.0200**；下拉可選：9.1.1.0200, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545616&viewGroup=true`

![](img/g17-software-depot.png)

**9.1.1.0200 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-fleet-depot-9.1.1.0200.25801072.tgz` | 879.88 MB | 25801072 | Oct 12, 2026 | `e7b34ffb070ba454` |
| 2 | `vcf-fleet-depot-plugin-9.1.1.0200.25801072.tgz` | 895 Bytes | 25801072 | Oct 12, 2026 | `670544acc2bf3076` |
| 3 | `depot-manifest-vcf-fleet-depot-9.1.1.0200.25801072.yaml` | 754 Bytes | 25801072 | Oct 12, 2026 | `c29dbec55f8e0ada` |
| 4 | `configuration-schema-vcf-fleet-depot-9.1.1.0200.25801072.yaml` | 10.72 KB | 25801072 | Oct 12, 2026 | `2adcb5a4b90b76f8` |

![](img/g17-software-depot-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-fleet-depot-9.1.1.0.25713941.tgz` | 878.6 MB | 25713941 | Sep 03, 2026 | `80cd7a720b36df6f` |
| 2 | `vcf-fleet-depot-plugin-9.1.1.0.25713941.tgz` | 900 Bytes | 25713941 | Sep 03, 2026 | `e997b2949bf33081` |
| 3 | `depot-manifest-vcf-fleet-depot-9.1.1.0.25713941.yaml` | 739 Bytes | 25713941 | Sep 03, 2026 | `337af8c8aaefa526` |
| 4 | `configuration-schema-vcf-fleet-depot-9.1.1.0.25713941.yaml` | 10.71 KB | 25713941 | Sep 03, 2026 | `c797b3bb405a3edc` |


### Identity broker（Packlist 545631）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545631&viewGroup=true`

![](img/g08-identity-broker-p1.png)
![](img/g08-identity-broker-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vidb-9.1.1.0100.25796677.yaml` (Identity broker depot manifest) | 705 Bytes | 25796677 | Oct 12, 2026 | `a7700e07716fea70` |
| 2 | `vidb-9.1.1.0100.25796677.tgz` (Identity broker) | 858.76 MB | 25796677 | Oct 12, 2026 | `630afa9fe241181e` |
| 3 | `configuration-schema-vidb-9.1.1.0100.25796677.yaml` (Identity broker configuration schema) | 2.5 KB | 25796677 | Oct 12, 2026 | `e90a754c28bec15f` |
| 4 | `vidb-upgrade-plugin-9.1.1.0100.25796677.tgz` (Identity broker plugin) | 8.76 KB | 25796677 | Oct 12, 2026 | `6a8d865cccf6ed0a` |

![](img/g08-identity-broker-9110-p1.png)
![](img/g08-identity-broker-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vidb-9.1.1.0.25679886.yaml` (Identity broker depot manifest) | 690 Bytes | 25679886 | Sep 03, 2026 | `cc7db2f994a54b12` |
| 2 | `vidb-9.1.1.0.25679886.tgz` (Identity broker) | 858.76 MB | 25679886 | Sep 03, 2026 | `1857fdcf09506542` |
| 3 | `configuration-schema-vidb-9.1.1.0.25679886.yaml` (Identity broker configuration schema) | 2.49 KB | 25679886 | Sep 03, 2026 | `50ffe5b1828c08e3` |
| 4 | `vidb-upgrade-plugin-9.1.1.0.25679886.tgz` (Identity broker plugin) | 8.76 KB | 25679886 | Sep 03, 2026 | `bfbcd60ef5d9e145` |


### VCF services runtime（Packlist 545620）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545620&viewGroup=true`

![](img/g35-vcf-services-runtime-p1.png)
![](img/g35-vcf-services-runtime-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vmsp-platform-9.1.1.0100.25801571.yaml` | 929 Bytes | 25801571 | Oct 12, 2026 | `751566f0afa556c4` |
| 2 | `configuration-schema-vmsp-platform-9.1.1.0100.25801571.yaml` | 33.54 KB | 25801571 | Oct 12, 2026 | `ec21cccfd76edd13` |
| 3 | `vmsp-cli-9.1.1.0100.25801571.tar.gz` | 25.4 MB | 25801571 | Oct 12, 2026 | `c6f7cf5aef99280f` |
| 4 | `vmsp-platform-9.1.1.0100.25801571.tar` | 6.39 GB | 25801571 | Oct 12, 2026 | `688c74903fb90715` |
| 5 | `vcf-services-platform-template-9.1.1.0100.25801571.ova` | 9.7 GB | 25801571 | Oct 12, 2026 | `19af232993979649` |
| 6 | `vmsp-plugin-9.1.1.0100.25801571.tgz` | 272.62 KB | 25801571 | Oct 12, 2026 | `a5e67832b14a7575` |

![](img/g35-vcf-services-runtime-9110-p1.png)
![](img/g35-vcf-services-runtime-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vmsp-platform-9.1.1.0.25714471.yaml` | 905 Bytes | 25714471 | Sep 03, 2026 | `005dff82ff029bfd` |
| 2 | `configuration-schema-vmsp-platform-9.1.1.0.25714471.yaml` | 33.52 KB | 25714471 | Sep 03, 2026 | `5f20aebda7872cb5` |
| 3 | `vmsp-cli-9.1.1.0.25714471.tar.gz` | 25.38 MB | 25714471 | Sep 03, 2026 | `7727dc97adb049d0` |
| 4 | `vmsp-platform-9.1.1.0.25714471.tar` | 6.39 GB | 25714471 | Sep 03, 2026 | `0830aeccfd966105` |
| 5 | `vcf-services-platform-template-9.1.1.0.25714471.ova` | 9.7 GB | 25714471 | Sep 03, 2026 | `0787d25a1f15ebb9` |
| 6 | `vmsp-plugin-9.1.1.0.25714471.tgz` | 272.62 KB | 25714471 | Sep 03, 2026 | `4660b8b88bfa924a` |


### VMware vCenter（Packlist 545684）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545684&viewGroup=true`

![](img/g41-vmware-vcenter-p1.png)
![](img/g41-vmware-vcenter-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VCSA-all-9.1.1.0100.25784172.iso` (VMware vCenter Appliance) | 9.69 GB | 25784172 | Oct 12, 2026 | `d320af820103e2df` |
| 2 | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-updaterepo.zip` (VMware vCenter Appliance Update Bundle) | 7.87 GB | 25784172 | Oct 12, 2026 | `d6b73a102dcf274e` |
| 3 | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-patch-FP.iso` (VMware vCenter Appliance Patch) | 7.51 GB | 25784172 | Oct 12, 2026 | `65b0b7b77f8f72b4` |

![](img/g41-vmware-vcenter-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VCSA-all-9.1.1.0.25712839.iso` (VMware vCenter Appliance) | 9.71 GB | 25712839 | Sep 03, 2026 | `a7e2fa323eb4b382` |
| 2 | `VMware-vCenter-Server-Appliance-9.1.1.0.25712839-updaterepo.zip` (VMware vCenter Appliance Update Bundle) | 7.89 GB | 25712839 | Sep 03, 2026 | `e6994139b7916ce7` |
| 3 | `VMware-vCenter-Server-Appliance-9.1.1.0.25712839-patch-FP.iso` (VMware vCenter Appliance Patch) | 7.54 GB | 25712839 | Sep 03, 2026 | `d281358465b5cb77` |


### VMware ESX（Packlist 545653）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545653&viewGroup=true`

![](img/g38-vmware-esx.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0100.25782009.x86_64.iso` (ESX ISO image) | 718.88 MB | 25782009 | Oct 12, 2026 | `8f6a3598207f20e1` |
| 2 | `VMware-ESXi-9.1.1.0100.25782009-depot.zip` (ESX Offline Bundle) | 699.2 MB | 25782009 | Oct 12, 2026 | `ee2e159b8713dc02` |

![](img/g38-vmware-esx-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso` (ESX ISO image) | 699.49 MB | 25714478 | Sep 03, 2026 | `712d153f32581d7d` |
| 2 | `VMware-ESXi-9.1.1.0.25714478-depot.zip` (ESX Offline Bundle) | 679.81 MB | 25714478 | Sep 03, 2026 | `71bdb30387d3f04d` |


### VMware vSAN（Packlist 545686）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545686&viewGroup=true`

![](img/g42-vmware-vsan.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0100.25782009.x86_64.iso` (ESX ISO image) | 718.88 MB | 25782009 | Oct 12, 2026 | `8f6a3598207f20e1` |
| 2 | `VMware-ESXi-9.1.1.0100.25782009-depot.zip` (ESX Offline Bundle) | 699.2 MB | 25782009 | Oct 12, 2026 | `ee2e159b8713dc02` |

![](img/g42-vmware-vsan-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso` (ESX ISO image) | 699.49 MB | 25714478 | Sep 03, 2026 | `712d153f32581d7d` |
| 2 | `VMware-ESXi-9.1.1.0.25714478-depot.zip` (ESX Offline Bundle) | 679.81 MB | 25714478 | Sep 03, 2026 | `71bdb30387d3f04d` |


### VMware NSX（Packlist 545629）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545629&viewGroup=true`

![](img/g40-vmware-nsx-p1.png)
![](img/g40-vmware-nsx-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `nsx-unified-appliance-9.1.1.0100.25762948.ova` (NSX Manager/ NSX Global Manager) | 8.26 GB | 25762940 | Oct 12, 2026 | `c312e9d6096cf542` |
| 2 | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940.mub` (NSX 9.1.1.0100 Upgrade Bundle) | 5.99 GB | 25762940 | Oct 12, 2026 | `ebb20d651ccb5f61` |
| 3 | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940-pre-check.pub` (NSX 9.1.1.0100 Upgrade Precheck Bundle) | 1.07 GB | 25762940 | Oct 12, 2026 | `7d6897c4afa6e45c` |
| 4 | `nsx-edge-9.1.1.0100.25762944.iso` (NSX Edge for Bare Metal) | 2.68 GB | 25762940 | Oct 12, 2026 | `c905287e82623be9` |
| 5 | `nsx-edge-9.1.1.0100.25762944.ova` (NSX Edge for VMware ESXi (Manual Edge Deployment)) | 2.07 GB | 25762940 | Oct 12, 2026 | `33d9bcb796cbb867` |
| 6 | `nsx-edge--9.1.1.0100.25762944.ova` (Autonomous Edge L2VPN Client) | 2.07 GB | 25762940 | Oct 12, 2026 | `33d9bcb796cbb867` |
| 7 | `VMware-NSX-edge-9.1.1.0100.25762944.nub` (Autonomous Edge L2VPN Client upgrade bundle) | 1.84 GB | 25762940 | Oct 12, 2026 | `0f7e4734cf428872` |

![](img/g40-vmware-nsx-9110-p1.png)
![](img/g40-vmware-nsx-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `nsx-unified-appliance-9.1.1.0.25691516.ova` (NSX Manager/ NSX Global Manager) | 8.26 GB | 25691509 | Sep 03, 2026 | `23a77dc722a00443` |
| 2 | `VMware-NSX-upgrade-bundle-9.1.1.0.0.25691509.mub` (NSX 9.1.1.0 Upgrade Bundle) | 5.99 GB | 25691509 | Sep 03, 2026 | `0a0c7ae26815a6e4` |
| 3 | `VMware-NSX-upgrade-bundle-9.1.1.0.0.25691509-pre-check.pub` (NSX 9.1.1.0 Upgrade Precheck Bundle) | 1.07 GB | 25691509 | Sep 03, 2026 | `2bc30d7c3c157a57` |
| 4 | `nsx-edge-9.1.1.0.25691514.iso` (NSX Edge for Bare Metal) | 2.68 GB | 25691509 | Sep 03, 2026 | `70212e05d61b114a` |
| 5 | `nsx-edge-9.1.1.0.25691514.ova` (NSX Edge for VMware ESXi (Manual Edge Deployment)) | 2.07 GB | 25691509 | Sep 03, 2026 | `fc2c9c270eef4f30` |
| 6 | `nsx-edge--9.1.1.0.25691514.ova` (Autonomous Edge L2VPN Client) | 2.07 GB | 25691509 | Sep 03, 2026 | `fc2c9c270eef4f30` |
| 7 | `VMware-NSX-edge-9.1.1.0.25691514.nub` (Autonomous Edge L2VPN Client upgrade bundle) | 1.84 GB | 25691509 | Sep 03, 2026 | `e0cd0d63207eb031` |


### VMware vSphere Supervisor（Packlist 545670）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545670&viewGroup=true`

![](img/g43-vmware-vsphere-supervisor.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-vSphere-Supervisor-9.1.1.0100-25784172.zip` | 3.75 GB | 25784172 | Oct 12, 2026 | `feb00a5cc1056ec8` |

![](img/g43-vmware-vsphere-supervisor-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-vSphere-Supervisor-9.1.1.0-25712839.zip` | 3.77 GB | 25712839 | Sep 03, 2026 | `e9139c8d82f4033c` |


### VCF Operations（Packlist 545687）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545687&viewGroup=true`

![](img/g23-vcf-operations.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Operations-Appliance-9.1.1.0100.25795063.ova` (VCF Operations Appliance) | 3.14 GB | 25795063 | Oct 12, 2026 | `fd48dcb01c6c18c8` |
| 2 | `Operations-Upgrade-9.1.1.0100.25795060.pak` (VCF Operations Upgrade) | 7.03 GB | 25795060 | Oct 12, 2026 | `d8ec84bbff080b50` |
| 3 | `VMware_Cloud_Foundation_Operations-9.1.1.0100.25795060-upgrade-manifest.json` (VCF Operations upgrade manifest) | 850 Bytes | 25795060 | Oct 12, 2026 | `b4939f22d5cdf6cf` |

![](img/g23-vcf-operations-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Operations-Appliance-9.1.1.0.25679751.ova` (VCF Operations Appliance) | 3.15 GB | 25679751 | Sep 03, 2026 | `e7291fa68618c89d` |
| 2 | `Operations-Upgrade-9.1.1.0.25679887.pak` (VCF Operations Upgrade) | 7.03 GB | 25679887 | Sep 03, 2026 | `b20403d261ca73fa` |
| 3 | `VMware_Cloud_Foundation_Operations-9.1.1.0.25679887-upgrade-manifest.json` (VCF Operations upgrade manifest) | 838 Bytes | 25679887 | Sep 03, 2026 | `3e831effbd2c671a` |


### VCF Automation（Packlist 545669）

- Portal 群組頁預設 release：**9.1.1.0200**；下拉可選：9.1.1.0200, 9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545669&viewGroup=true`

![](img/g19-vcf-automation-p1.png)
![](img/g19-vcf-automation-p2.png)

**9.1.1.0200 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vcfa-bundle-9.1.1.0200.25801570.yaml` (VCF Automation depot manifest) | 727 Bytes | 25801570 | Oct 12, 2026 | `8a4050eb1037f42c` |
| 2 | `configuration-schema-vcfa-bundle-9.1.1.0200.25801570.yaml` (VCF Automation configuration schema) | 3.75 KB | 25801570 | Oct 12, 2026 | `5b140221082ae437` |
| 3 | `vcfa-bundle-9.1.1.0200.25801570.tar` (VCF Automation) | 15.69 GB | 25801570 | Oct 12, 2026 | `99ec1cbf7072af44` |
| 4 | `vcfa-plugin-9.1.1.0200.25801570.tgz` (VCF Automation plugin) | 136.25 KB | 25801570 | Oct 12, 2026 | `5a330f74eecd9d70` |

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vcfa-bundle-9.1.1.0100.25757808.yaml` (VCF Automation depot manifest) | 724 Bytes | 25757808 | Sep 21, 2026 | `6e2424d863a4fa92` |
| 2 | `configuration-schema-vcfa-bundle-9.1.1.0100.25757808.yaml` (VCF Automation configuration schema) | 3.75 KB | 25757808 | Sep 21, 2026 | `f10fe1ba947a64ce` |
| 3 | `vcfa-bundle-9.1.1.0100.25757808.tar` (VCF Automation) | 15.68 GB | 25757808 | Sep 21, 2026 | `03490b4fb792e3d2` |
| 4 | `vcfa-plugin-9.1.1.0100.25757808.tgz` (VCF Automation plugin) | 132.51 KB | 25757808 | Sep 21, 2026 | `cdb7e3e6ab487253` |

![](img/g19-vcf-automation-9110-p1.png)
![](img/g19-vcf-automation-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vcfa-bundle-9.1.1.0.25714559.yaml` (VCF Automation depot manifest) | 709 Bytes | 25714559 | Sep 03, 2026 | `e0736dc914e826a7` |
| 2 | `configuration-schema-vcfa-bundle-9.1.1.0.25714559.yaml` (VCF Automation configuration schema) | 3.74 KB | 25714559 | Sep 03, 2026 | `ca0f781205917948` |
| 3 | `vcfa-bundle-9.1.1.0.25714559.tar` (VCF Automation) | 15.67 GB | 25714559 | Sep 03, 2026 | `84007102f0c79ca6` |
| 4 | `vcfa-plugin-9.1.1.0.25714559.tgz` (VCF Automation plugin) | 132.54 KB | 25714559 | Sep 03, 2026 | `a05d6df8f19edfd9` |


### Log management（Packlist 545683）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545683&viewGroup=true`

![](img/g10-log-management-p1.png)
![](img/g10-log-management-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `operations-logs-9.1.1.0100.25795095.tgz` (Log management) | 2.54 GB | 25795095 | Oct 12, 2026 | `85535f2ba1a6445a` |
| 2 | `configuration-schema-operations-logs-9.1.1.0100.25795095.yaml` (Log management configuration schema) | 5.85 KB | 25795095 | Oct 12, 2026 | `5be9726cb50dbd56` |
| 3 | `depot-manifest-operations-logs-9.1.1.0100.25795095.yaml` (Log management depot manifest) | 740 Bytes | 25795095 | Oct 12, 2026 | `1d5dc4ab9b45602d` |
| 4 | `operations-logs-plugin-9.1.1.0100.25795095.tgz` (Log management plugin) | 1.29 KB | 25795095 | Oct 12, 2026 | `c185aa6f88a1b5b3` |

![](img/g10-log-management-9110-p1.png)
![](img/g10-log-management-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `operations-logs-9.1.1.0.25679624.tgz` (Log management) | 2.54 GB | 25679624 | Sep 03, 2026 | `1eff6c78eb4eb531` |
| 2 | `configuration-schema-operations-logs-9.1.1.0.25679624.yaml` (Log management configuration schema) | 5.83 KB | 25679624 | Sep 03, 2026 | `329cb82810dd1a69` |
| 3 | `depot-manifest-operations-logs-9.1.1.0.25679624.yaml` (Log management depot manifest) | 725 Bytes | 25679624 | Sep 03, 2026 | `08426d9565576548` |
| 4 | `operations-logs-plugin-9.1.1.0.25679624.tgz` (Log management plugin) | 1.65 KB | 25679624 | Sep 03, 2026 | `a31db8936983be08` |


### Cloud proxy（Packlist 545682）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545682&viewGroup=true`

![](img/g06-cloud-proxy.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Operations-Cloud-Proxy-9.1.1.0100.25795064.ova` (Cloud proxy Appliance) | 3.22 GB | 25795064 | Oct 12, 2026 | `4091a3f1c82d49f2` |

![](img/g06-cloud-proxy-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Operations-Cloud-Proxy-9.1.1.0.25679891.ova` (Cloud proxy Appliance) | 3.22 GB | 25679891 | Sep 03, 2026 | `aebdac78254b3cbf` |


### License server（Packlist 545654）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545654&viewGroup=true`

![](img/g09-license-server.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Vcf-License-Server-9.1.1.0100.25795080.ova` (License server Appliance) | 884.16 MB | 25795080 | Oct 12, 2026 | `89c93a8f03d72222` |

![](img/g09-license-server-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Vcf-License-Server-9.1.1.0.25679819.ova` (License Server Appliance) | 882.37 MB | 25679819 | Sep 03, 2026 | `37e53e0ea6613627` |


### VCF Operations HCX（Packlist 545672）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545672&viewGroup=true`

![](img/g24-vcf-operations-hcx.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `hcx-unified-appliance-9.1.1.0100.25768312.ova` | 4.1 GB | 25768312 | Oct 12, 2026 | `6f2a3c696e8294ce` |
| 2 | `hcx-unified-appliance-upgrade-bundle-9.1.1.0100.25768312-signed.tar.gz` | 3.88 GB | 25768312 | Oct 12, 2026 | `561baa420d0177f4` |
| 3 | `hcx-unified-appliance-pre-upgrade-bundle-9.1.1.0100.25768312-signed.tar.gz` | 14.3 MB | 25768312 | Oct 12, 2026 | `5c32191e4d39a1f7` |

![](img/g24-vcf-operations-hcx-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `hcx-unified-appliance-9.1.1.0.25690219.ova` | 4.13 GB | 25690219 | Sep 03, 2026 | `3001baab159319a0` |
| 2 | `hcx-unified-appliance-upgrade-bundle-9.1.1.0.25690219-signed.tar.gz` | 3.9 GB | 25690219 | Sep 03, 2026 | `e4c4b910ffd04b66` |
| 3 | `hcx-unified-appliance-pre-upgrade-bundle-9.1.1.0.25690219-signed.tar.gz` | 14.3 MB | 25690219 | Sep 03, 2026 | `9711b848cdf83503` |


### VCF Operations for networks（Packlist 545689）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545689&viewGroup=true`

![](img/g25-vcf-operations-for-networks-p1.png)
![](img/g25-vcf-operations-for-networks-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-Operations-for-networks-9.1.1.0100.25774578-platform.ova` (VCF Operations for Networks Platform Appliance) | 7.14 GB | 25774578 | Oct 12, 2026 | `86908b13b0cdd533` |
| 2 | `VCF-Operations-for-networks-9.1.1.0100.25774578-collector.ova` (VCF Operations for Networks Collector Appliance) | 3.48 GB | 25774578 | Oct 12, 2026 | `dea68941a8f8e1aa` |
| 3 | `VCF-Operations-for-networks.9.1.1.0100.25774578.precheck.bundle` (VCF Operations for Networks Upgrade Pre-check Bundle) | 240.72 MB | 25774578 | Oct 12, 2026 | `6ee052916e34313a` |
| 4 | `VCF-Operations-for-networks.9.1.1.0100.25774578.upgrade.bundle` (VCF Operations for Networks Upgrade Bundle) | 6.29 GB | 25774578 | Oct 12, 2026 | `dd1a645568067daa` |
| 5 | `VCF-Operations-for-networks-9.1.1.0100.25774578-update-manifest.json` (VCF Operations for Networks Upgrade Manifest) | 711 Bytes | 25774578 | Oct 12, 2026 | `8ff2a21aeec551e3` |

![](img/g25-vcf-operations-for-networks-9110-p1.png)
![](img/g25-vcf-operations-for-networks-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-Operations-for-networks-9.1.1.0.25682214-platform.ova` (VCF Operations for Networks Platform Appliance) | 7.14 GB | 25682214 | Sep 03, 2026 | `178e232ac47d5250` |
| 2 | `VCF-Operations-for-networks-9.1.1.0.25682214-collector.ova` (VCF Operations for Networks Collector Appliance) | 3.48 GB | 25682214 | Sep 03, 2026 | `cb7e668b175d6373` |
| 3 | `VCF-Operations-for-networks.9.1.1.0.25682214.precheck.bundle` (VCF Operations for Networks Upgrade Pre-check Bundle) | 240.7 MB | 25682214 | Sep 03, 2026 | `31bbf9643ff7b3bc` |
| 4 | `VCF-Operations-for-networks.9.1.1.0.25682214.upgrade.bundle` (VCF Operations for Networks Upgrade Bundle) | 6.27 GB | 25682214 | Sep 03, 2026 | `3c481acf9007ac8a` |
| 5 | `VCF-Operations-for-networks-9.1.1.0.25682214-update-manifest.json` (VCF Operations for Networks Upgrade Manifest) | 699 Bytes | 25682214 | Sep 03, 2026 | `8bd781394c145eb5` |


### VCF Operations orchestrator（Packlist 545690）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545690&viewGroup=true`

![](img/g26-vcf-operations-orchestrator.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `O11N_VA-9.1.1.0100.25795101.ova` (VCF Operations orchestrator Appliance) | 3.6 GB | 25795101 | Oct 12, 2026 | `1fcfa3378454dffd` |
| 2 | `O11N_VA-9.1.1.0100.25795101-updaterepo.iso` (VCF Operations orchestrator Update Repository) | 3.42 GB | 25795101 | Oct 12, 2026 | `c130ca708cae054c` |

![](img/g26-vcf-operations-orchestrator-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `O11N_VA-9.1.1.0.25679883.ova` (VCF Operations orchestrator Appliance) | 3.59 GB | 25679883 | Sep 03, 2026 | `1c1386e855cb3001` |
| 2 | `O11N_VA-9.1.1.0.25679883-updaterepo.iso` (VCF Operations orchestrator Update Repository) | 3.42 GB | 25679883 | Sep 03, 2026 | `b22ea517076ebec9` |


## 4. 其他群組（附錄）

以下群組不在一般升級路徑上（工具、CLI、Private AI、VCF 服務型錄 yml 等），列出供完整對照。

### VMware Avi Load Balancer（Packlist 545702）

- Portal 群組頁預設 release：**32.1.3**；下拉可選：32.1.3
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545702&viewGroup=true`

![](img/g02-vmware-avi-load-balancer.png)

**32.1.3 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `controller-32.1.3-9105.ova` | 3.86 GB | 25665611 | Sep 03, 2026 | `eefd0eeee9e27b62` |


### VMware Guest Customization Engine for Instant Clone（Packlist 545693）

- Portal 群組頁預設 release：**13.2.2.0**；下拉可選：13.2.2.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545693&viewGroup=true`

![](img/g03-vmware-guest-customization-engine-for-in-p1.png)
![](img/g03-vmware-guest-customization-engine-for-in-p2.png)

**13.2.2.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vmware-gosc_13.2.2.0.25662429-1_amd64.deb` | 719 KB | 25662429 | Sep 03, 2026 | `b2c323d881c79149` |
| 2 | `vmware-gosc_13.2.2.0.25662429-1_i386.deb` | 720.63 KB | 25662429 | Sep 03, 2026 | `8258b16a6c99e081` |
| 3 | `vmware-gosc-13.2.2.0.25662429-1.x86_64.rpm` | 725.72 KB | 25662429 | Sep 03, 2026 | `b72c4e8ad188f965` |
| 4 | `vmware-gosc-13.2.2.0.25662429-1.i386.rpm` | 726.57 KB | 25662429 | Sep 03, 2026 | `3cce619a864c6b75` |


### VMware Tools（Packlist 545614）

- Portal 群組頁預設 release：**13.1.5.0**；下拉可選：13.1.5.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545614&viewGroup=true`

![](img/g04-vmware-tools-p1.png)
![](img/g04-vmware-tools-p2.png)

**13.1.5.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-Tools-13.1.5-core-offline-depot-ESXi-all-25677323.zip` (VMware Tools Offline VIB Bundle) | 128.56 MB | 25677323 | Sep 03, 2026 | `6a19797e16666c36` |
| 2 | `VMware-Tools-windows-arm-13.1.5.0.25544008-25677323.tar.gz` (VMware Tools packages for Windows Arm) | 43.96 MB | 25677323 | Sep 03, 2026 | `d1f9112687aacd2c` |
| 3 | `VMware-Tools-windows-arm-13.1.5.0.25544008-25677323.zip` (VMware Tools packages for Windows Arm) | 43.97 MB | 25677323 | Sep 03, 2026 | `53298d1fccc20fbc` |
| 4 | `VMware-Tools-windows-13.1.5.0.25544008-25677323.zip` (VMware Tools packages for Windows) | 128.52 MB | 25677323 | Sep 03, 2026 | `7c7dd5c49038d16e` |
| 5 | `VMware-Tools-windows-13.1.5.0.25544008-25677323.tar.gz` (VMware Tools packages for Windows) | 128.52 MB | 25677323 | Sep 03, 2026 | `f593da2005222aff` |
| 6 | `gueststore-vmtools-13.1.5-0.25677323.zip` (VMware Tools packages for GuestStore) | 125.86 MB | 25677323 | Sep 03, 2026 | `7cf1891f4ad898c8` |
| 7 | `gueststore-vmtools-13.1.5-0.25677323.tar.gz` (VMware Tools packages for GuestStore) | 125.85 MB | 25677323 | Sep 03, 2026 | `762b463f1a22aec2` |


### VMware Remote Console（Packlist 545618）

- Portal 群組頁預設 release：**13.1.1.0**；下拉可選：13.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545618&viewGroup=true`

![](img/g05-vmware-remote-console.png)

**13.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-Remote-Console-13.1.1.25665422.x86_64.bundle` (VMware Remote Console 13.1.1.0 for Linux) | 86.12 MB | 25665422 | Sep 03, 2026 | `c4828f1920c7c827` |
| 2 | `VMware-VMRC-13.1.1.25665422_x64.zip` (VMware Remote Console 13.1.1.0 for Windows) | 53.18 MB | 25665422 | Sep 03, 2026 | `44c7d25a51b42d78` |


### Native Storage Service（Packlist 545694）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545694&viewGroup=true`

![](img/g11-native-storage-service-p1.png)
![](img/g11-native-storage-service-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vsan-service-vmsp-backend-9.1.1.0.25714562.tgz` | 56.02 MB | 25714562 | Sep 03, 2026 | `15553489cf2ae850` |
| 2 | `vsan-object-store-vcfa-service-9.1.1.0.25714562.tar` | 507.2 MB | 25714562 | Sep 03, 2026 | `4cfd8730945c2643` |
| 3 | `configuration-schema-vsan-service-vmsp-backend-9.1.1.0.25714562.yaml` | 356 Bytes | 25714562 | Sep 03, 2026 | `5471e63ffdb88c6a` |
| 4 | `depot-manifest-vsan-service-vmsp-backend-9.1.1.0.25714562.yaml` | 808 Bytes | 25714562 | Sep 03, 2026 | `9de71997e67f4b33` |
| 5 | `vsan-service-vmsp-backend-plugin-9.1.1.0.25714562.tgz` | 858 Bytes | 25714562 | Sep 03, 2026 | `d9d25e95d7b46635` |


### Real-time metrics（Packlist 545688）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545688&viewGroup=true`

![](img/g12-real-time-metrics-p1.png)
![](img/g12-real-time-metrics-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-obs-data-platform-9.1.1.0100.25794546.tgz` (Real-time metrics) | 1.11 GB | 25794546 | Oct 12, 2026 | `e7e072c62c667e48` |
| 2 | `configuration-schema-vcf-obs-data-platform-9.1.1.0100.25794546.yaml` (Real-time metrics configuration schema) | 1.81 KB | 25794546 | Oct 12, 2026 | `3fb2eccf69970476` |
| 3 | `depot-manifest-vcf-obs-data-platform-9.1.1.0100.25794546.yaml` (Real-time metrics depot manifest) | 774 Bytes | 25794546 | Oct 12, 2026 | `dabbc852284321e5` |
| 4 | `vcf-obs-data-platform-plugin-9.1.1.0100.25794546.tgz` (Real-time metrics plugin) | 1.05 KB | 25794546 | Oct 12, 2026 | `fd8e7470fe254f3b` |

![](img/g12-real-time-metrics-9110-p1.png)
![](img/g12-real-time-metrics-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcf-obs-data-platform-9.1.1.0.25679622.tgz` (Real-time metrics) | 1.1 GB | 25679622 | Sep 03, 2026 | `027b3460932d8530` |
| 2 | `configuration-schema-vcf-obs-data-platform-9.1.1.0.25679622.yaml` (Real-time metrics configuration schema) | 1.8 KB | 25679622 | Sep 03, 2026 | `59409283f9863fcd` |
| 3 | `depot-manifest-vcf-obs-data-platform-9.1.1.0.25679622.yaml` (Real-time metrics depot manifest) | 759 Bytes | 25679622 | Sep 03, 2026 | `bb661388dbdd121d` |
| 4 | `vcf-obs-data-platform-plugin-9.1.1.0.25679622.tgz` (Real-time metrics plugin) | 1.05 KB | 25679622 | Sep 03, 2026 | `39c9de74b40ba9bb` |


### Real-time metrics store（Packlist 545613）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545613&viewGroup=true`

![](img/g13-real-time-metrics-store.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vcfms-metrics-store-9.1.1.0100.25801571.yaml` | 809 Bytes | 25801571 | Oct 12, 2026 | `33fc7a2c539cf796` |
| 2 | `configuration-schema-vcfms-metrics-store-9.1.1.0100.25801571.yaml` | 477 Bytes | 25801571 | Oct 12, 2026 | `28296870bd32b36b` |
| 3 | `vcfms-metrics-store-9.1.1.0100.25801571.tgz` | 432.47 MB | 25801571 | Oct 12, 2026 | `c89c81d04590d085` |
| 4 | `vcfms-metrics-store-plugin-9.1.1.0100.25801571.tgz` | 1.19 KB | 25801571 | Oct 12, 2026 | `4e6be125f29e01ad` |

![](img/g13-real-time-metrics-store-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `depot-manifest-vcfms-metrics-store-9.1.1.0.25714471.yaml` | 788 Bytes | 25714471 | Sep 03, 2026 | `0e03eb32fbeaca58` |
| 2 | `configuration-schema-vcfms-metrics-store-9.1.1.0.25714471.yaml` | 468 Bytes | 25714471 | Sep 03, 2026 | `a98fdaaa63a9dda4` |
| 3 | `vcfms-metrics-store-9.1.1.0.25714471.tgz` | 432.31 MB | 25714471 | Sep 03, 2026 | `75739873d50d0995` |
| 4 | `vcfms-metrics-store-plugin-9.1.1.0.25714471.tgz` | 1.19 KB | 25714471 | Sep 03, 2026 | `b0262f42a8a27759` |


### Salt RaaS（Packlist 545655）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545655&viewGroup=true`

![](img/g15-salt-raas-p1.png)
![](img/g15-salt-raas-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `salt-raas-9.1.1.0100.25795075.tgz` (Salt RaaS) | 655.78 MB | 25795075 | Oct 12, 2026 | `72d6d56d89dd10ce` |
| 2 | `configuration-schema-salt-raas-9.1.1.0100.25795075.yaml` (Salt RaaS configuration schema) | 1.31 KB | 25795075 | Oct 12, 2026 | `6b980c92745f88ce` |
| 3 | `depot-manifest-salt-raas-9.1.1.0100.25795075.yaml` (Salt RaaS depot manifest) | 718 Bytes | 25795075 | Oct 12, 2026 | `b229d5bb3e65f251` |
| 4 | `salt-raas-plugin-9.1.1.0100.25795075.tgz` (Salt RaaS plugin) | 2.36 KB | 25795075 | Oct 12, 2026 | `dc99b41fd5d9019d` |

![](img/g15-salt-raas-9110-p1.png)
![](img/g15-salt-raas-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `salt-raas-9.1.1.0.25679895.tgz` (Salt RaaS) | 654.45 MB | 25679895 | Sep 03, 2026 | `ce0389990fa69477` |
| 2 | `configuration-schema-salt-raas-9.1.1.0.25679895.yaml` (Salt RaaS configuration schema) | 1.3 KB | 25679895 | Sep 03, 2026 | `21ae6f95d1029d6f` |
| 3 | `depot-manifest-salt-raas-9.1.1.0.25679895.yaml` (Salt RaaS depot manifest) | 703 Bytes | 25679895 | Sep 03, 2026 | `3e289792c2fcb9e5` |
| 4 | `salt-raas-plugin-9.1.1.0.25679895.tgz` (Salt RaaS plugin) | 2.35 KB | 25679895 | Sep 03, 2026 | `60aadcecd824e39d` |


### Salt master（Packlist 545692）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545692&viewGroup=true`

![](img/g16-salt-master-p1.png)
![](img/g16-salt-master-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `salt-9.1.1.0100.25795075.tgz` (Salt master) | 393.84 MB | 25795075 | Oct 12, 2026 | `e42cc302c37729ef` |
| 2 | `configuration-schema-salt-9.1.1.0100.25795075.yaml` (Salt master configuration schema) | 1.3 KB | 25795075 | Oct 12, 2026 | `63373c907db5b956` |
| 3 | `depot-manifest-salt-9.1.1.0100.25795075.yaml` (Salt master depot manifest) | 688 Bytes | 25795075 | Oct 12, 2026 | `9b4359154c69e049` |
| 4 | `salt-plugin-9.1.1.0100.25795075.tgz` (Salt master plugin) | 873 Bytes | 25795075 | Oct 12, 2026 | `75d2348125ea5eba` |

![](img/g16-salt-master-9110-p1.png)
![](img/g16-salt-master-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `salt-9.1.1.0.25679895.tgz` (Salt master) | 392.22 MB | 25679895 | Sep 03, 2026 | `e44a47c15003a4b7` |
| 2 | `configuration-schema-salt-9.1.1.0.25679895.yaml` (Salt master configuration schema) | 1.29 KB | 25679895 | Sep 03, 2026 | `d7dd1776814e9154` |
| 3 | `depot-manifest-salt-9.1.1.0.25679895.yaml` (Salt master depot manifest) | 673 Bytes | 25679895 | Sep 03, 2026 | `4175bf2fa76bd717` |
| 4 | `salt-plugin-9.1.1.0.25679895.tgz` (Salt master plugin) | 872 Bytes | 25679895 | Sep 03, 2026 | `f6f43b66991cce30` |


### Telemetry（Packlist 545678）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545678&viewGroup=true`

![](img/g18-telemetry-p1.png)
![](img/g18-telemetry-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `telemetry-acceptor-9.1.1.0100.25741214.tgz` (Telemetry) | 240.5 MB | 25741214 | Oct 12, 2026 | `e368422e2c85b3fa` |
| 2 | `configuration-schema-telemetry-acceptor-9.1.1.0100.25741214.yaml` (Telemetry Configuration Schema) | 466 Bytes | 25741214 | Oct 12, 2026 | `1273df1c878e2e09` |
| 3 | `depot-manifest-telemetry-acceptor-9.1.1.0100.25741214.yaml` (Telemetry depot manifest) | 789 Bytes | 25741214 | Oct 12, 2026 | `3d8076ccc8cffedc` |
| 4 | `telemetry-acceptor-plugin-9.1.1.0100.25741214.tgz` (Telemetry plugin) | 775 Bytes | 25741214 | Oct 12, 2026 | `6b7fde8ae9594042` |

![](img/g18-telemetry-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `telemetry-acceptor-9.1.1.0.25671600.tgz` | 240.45 MB | 25671600 | Sep 03, 2026 | `fbb832be32cfc7e9` |
| 2 | `configuration-schema-telemetry-acceptor-9.1.1.0.25671600.yaml` | 457 Bytes | 25671600 | Sep 03, 2026 | `27f9669dcd50d8f6` |
| 3 | `depot-manifest-telemetry-acceptor-9.1.1.0.25671600.yaml` | 774 Bytes | 25671600 | Sep 03, 2026 | `fc2e9e5b1381caf5` |
| 4 | `telemetry-acceptor-plugin-9.1.1.0.25671600.tgz` | 771 Bytes | 25671600 | Sep 03, 2026 | `06b5cc6c0614520f` |


### VCF Consumption CLI（Packlist 545612）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545612&viewGroup=true`

![](img/g20-vcf-consumption-cli-p1.png)
![](img/g20-vcf-consumption-cli-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-Consumption-CLI-Binaries-9.1.1.0100.25746586.tar.gz` | 293.63 MB | 25746586 | Oct 08, 2026 | `52fe3dd62ddeacaa` |
| 2 | `VCF-Consumption-CLI-Windows_ARM64-9.1.1.0100.25746586.zip` | 53.86 MB | 25746586 | Oct 08, 2026 | `9b6e3b7efa2db7a0` |
| 3 | `VCF-Consumption-CLI-Windows_AMD64-9.1.1.0100.25746586.zip` | 56.29 MB | 25746586 | Oct 08, 2026 | `c0ef7e070c952261` |
| 4 | `VCF-Consumption-CLI-Linux_AMD64-9.1.1.0100.25746586.tar.gz` | 36.45 MB | 25746586 | Oct 08, 2026 | `12357d35e4dd9f61` |
| 5 | `VCF-Consumption-CLI-Linux_ARM64-9.1.1.0100.25746586.tar.gz` | 32.54 MB | 25746586 | Oct 08, 2026 | `ff3994c71efed597` |
| 6 | `VCF-Consumption-CLI-Darwin_ARM64-9.1.1.0100.25746586.tar.gz` | 55.05 MB | 25746586 | Oct 08, 2026 | `54e4e36d660cef5c` |
| 7 | `VCF-Consumption-CLI-Darwin_AMD64-9.1.1.0100.25746586.tar.gz` | 59.44 MB | 25746586 | Oct 08, 2026 | `0ef65914ee79c97a` |

![](img/g20-vcf-consumption-cli-9110-p1.png)
![](img/g20-vcf-consumption-cli-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-Consumption-CLI-Binaries-9.1.1.0.25662425.tar.gz` | 293.64 MB | 25662425 | Sep 03, 2026 | `c862c65a6a2cba89` |
| 2 | `VCF-Consumption-CLI-Windows_AMD64-9.1.1.0.25662425.zip` | 56.28 MB | 25662425 | Sep 03, 2026 | `1a6e858b28d735d6` |
| 3 | `VCF-Consumption-CLI-Windows_ARM64-9.1.1.0.25662425.zip` | 53.86 MB | 25662425 | Sep 03, 2026 | `7b246c909ee25184` |
| 4 | `VCF-Consumption-CLI-Linux_AMD64-9.1.1.0.25662425.tar.gz` | 36.46 MB | 25662425 | Sep 03, 2026 | `74cf9b7e95b94606` |
| 5 | `VCF-Consumption-CLI-Linux_ARM64-9.1.1.0.25662425.tar.gz` | 32.54 MB | 25662425 | Sep 03, 2026 | `0e8fe5cca36c3a23` |
| 6 | `VCF-Consumption-CLI-Darwin_ARM64-9.1.1.0.25662425.tar.gz` | 55.05 MB | 25662425 | Sep 03, 2026 | `a996795535f89f22` |
| 7 | `VCF-Consumption-CLI-Darwin_AMD64-9.1.1.0.25662425.tar.gz` | 59.45 MB | 25662425 | Sep 03, 2026 | `8ecec9ca79124bea` |


### VCF Consumption CLI Plugins（Packlist 545621）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545621&viewGroup=true`

![](img/g21-vcf-consumption-cli-plugins-p1.png)
![](img/g21-vcf-consumption-cli-plugins-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-Consumption-CLI-PluginBundle-Linux_ARM64-9.1.1.0100.25793136.tar.gz` | 194.4 MB | 25793136 | Oct 08, 2026 | `7c22bcfffcf28978` |
| 2 | `VCF-Consumption-CLI-PluginBundle-9.1.1.0100.25793136.tar.gz` | 1.27 GB | 25793136 | Oct 08, 2026 | `3c3daa5fd2bb5a4a` |
| 3 | `VCF-Consumption-CLI-PluginBundle-Darwin_ARM64-9.1.1.0100.25793136.tar.gz` | 205.31 MB | 25793136 | Oct 08, 2026 | `1af42f7516f44436` |
| 4 | `VCF-Consumption-CLI-PluginBundle-Linux_AMD64-9.1.1.0100.25793136.tar.gz` | 252.84 MB | 25793136 | Oct 08, 2026 | `b4969a546b4e1b36` |
| 5 | `VCF-Consumption-CLI-PluginBundle-Darwin_AMD64-9.1.1.0100.25793136.tar.gz` | 223.96 MB | 25793136 | Oct 08, 2026 | `24e216ca1272edb9` |
| 6 | `VCF-Consumption-CLI-PluginBundle-Windows_AMD64-9.1.1.0100.25793136.zip` | 233.04 MB | 25793136 | Oct 08, 2026 | `44187d89709fd141` |
| 7 | `VCF-Consumption-CLI-PluginBundle-Windows_ARM64-9.1.1.0100.25793136.zip` | 196 MB | 25793136 | Oct 08, 2026 | `8b400e2e19242054` |
| 8 | `plugin-inventory-signed.tar` | 30.5 KB | 25793136 | Oct 08, 2026 | `67bf3ea649cb68de` |
| 9 | `plugin-inventory-signed-versioned.tar` | 30.5 KB | 25793136 | Oct 08, 2026 | `3bbcc23c6da1ca93` |
| 10 | `VCF-Consumption-CLI-OCI-PluginBundle-9.1.1.0100.25793136.tar.gz` | 1.48 GB | 25793136 | Oct 08, 2026 | `9529768e30826606` |

![](img/g21-vcf-consumption-cli-plugins-9110-p1.png)
![](img/g21-vcf-consumption-cli-plugins-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VCF-Consumption-CLI-PluginBundle-9.1.1.0.25665404.tar.gz` | 1.27 GB | 25665404 | Sep 03, 2026 | `cefbf4b7833ad7e9` |
| 2 | `VCF-Consumption-CLI-PluginBundle-Darwin_ARM64-9.1.1.0.25665404.tar.gz` | 205.23 MB | 25665404 | Sep 03, 2026 | `a0bf3f8a1b62531f` |
| 3 | `VCF-Consumption-CLI-PluginBundle-Darwin_AMD64-9.1.1.0.25665404.tar.gz` | 223.85 MB | 25665404 | Sep 03, 2026 | `8f8110ffde981c5e` |
| 4 | `VCF-Consumption-CLI-PluginBundle-Linux_ARM64-9.1.1.0.25665404.tar.gz` | 194.33 MB | 25665404 | Sep 03, 2026 | `d996d1a7741f3e7d` |
| 5 | `VCF-Consumption-CLI-PluginBundle-Linux_AMD64-9.1.1.0.25665404.tar.gz` | 252.43 MB | 25665404 | Sep 03, 2026 | `5bf25a18368da57b` |
| 6 | `VCF-Consumption-CLI-PluginBundle-Windows_ARM64-9.1.1.0.25665404.zip` | 195.92 MB | 25665404 | Sep 03, 2026 | `8787bb4f381b5fcb` |
| 7 | `VCF-Consumption-CLI-PluginBundle-Windows_AMD64-9.1.1.0.25665404.zip` | 232.86 MB | 25665404 | Sep 03, 2026 | `d091556b126e9607` |
| 8 | `plugin-inventory-signed-versioned.tar` | 29 KB | 25665404 | Sep 03, 2026 | `160dc409932e0328` |
| 9 | `plugin-inventory-signed.tar` | 29 KB | 25665404 | Sep 03, 2026 | `bf4779da000d39b5` |
| 10 | `VCF-Consumption-CLI-OCI-PluginBundle-9.1.1.0.25665404.tar.gz` | 1.48 GB | 25665404 | Sep 03, 2026 | `731c5d53f5ec0496` |


### VCF Native Object Store（Packlist 545633）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545633&viewGroup=true`

![](img/g22-vcf-native-object-store.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `native-object-store-service-9.1.1.0.25714562.yml` | 481 Bytes | 25714562 | Sep 03, 2026 | `1be1c78dadb3f5e0` |


### VCF service - Configuration（Packlist 545691）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545691&viewGroup=true`

![](img/g27-vcf-service-configuration.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `configuration-service-9.1.1.0.25670523.yaml` | 992 Bytes | 25670523 | Sep 03, 2026 | `b2c1db00616a9a6b` |
| 2 | `configuration-9.1.1.0.25670523.yml` | 469 Bytes | 25670523 | Sep 03, 2026 | `9d1bd2abf5ebe7ca` |


### VCF service - Encryption Management（Packlist 545619）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545619&viewGroup=true`

![](img/g28-vcf-service-encryption-management.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `encryption-management-9.1.1.0.25714559.yml` | 489 Bytes | 25714559 | Sep 03, 2026 | `40643c9381ce70f6` |


### VCF service - Harbor（Packlist 545656）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545656&viewGroup=true`

![](img/g29-vcf-service-harbor.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `harbor.tanzu.vmware.com-9.1.1.0.25714559.yml` | 77.25 KB | 25714559 | Sep 03, 2026 | `721c1321677b732b` |


### VCF service - Metrics Aggregator（Packlist 545675）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545675&viewGroup=true`

![](img/g30-vcf-service-metrics-aggregator.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `metrics-aggregator.broadcom.com-9.1.1.0.25665407.yml` | 473 Bytes | 25665407 | Sep 03, 2026 | `43e826b3301f4a42` |


### VCF service - Migration（Packlist 545671）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545671&viewGroup=true`

![](img/g31-vcf-service-migration.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `migration-9.1.1.0.25714559.yml` | 441 Bytes | 25714559 | Sep 03, 2026 | `35803939052427af` |


### VCF service - Migration service engine（Packlist 545674）

- Portal 群組頁預設 release：**9.1.1.0200**；下拉可選：9.1.1.0200, 9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545674&viewGroup=true`

![](img/g32-vcf-service-migration-service-engine-p1.png)
![](img/g32-vcf-service-migration-service-engine-p2.png)

**9.1.1.0200 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcd-migrator-9.1.1.0200.25801570.tgz` (Migration Service Engine) | 524.66 MB | 25801570 | Oct 12, 2026 | `2bbbdd25d108ea7c` |
| 2 | `configuration-schema-vcd-migrator-9.1.1.0200.25801570.yaml` (Migration Service Engine configuration schema) | 443 Bytes | 25801570 | Oct 12, 2026 | `59032cba746a7a59` |
| 3 | `depot-manifest-vcd-migrator-9.1.1.0200.25801570.yaml` (Migration Service Engine depot manifest) | 768 Bytes | 25801570 | Oct 12, 2026 | `50e046faa76e023b` |
| 4 | `vcd-migrator-plugin-9.1.1.0200.25801570.tgz` (Migration Service Engine plugin) | 3.66 KB | 25801570 | Oct 12, 2026 | `d14b2695042041f0` |

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcd-migrator-9.1.1.0100.25757808.tgz` (Migration Service Engine) | 524.45 MB | 25757808 | Sep 21, 2026 | `6e6f9fee14273742` |
| 2 | `configuration-schema-vcd-migrator-9.1.1.0100.25757808.yaml` (Migration Service Engine configuration schema) | 443 Bytes | 25757808 | Sep 21, 2026 | `00a34e94c6c4a34a` |
| 3 | `depot-manifest-vcd-migrator-9.1.1.0100.25757808.yaml` (Migration Service Engine depot manifest) | 762 Bytes | 25757808 | Sep 21, 2026 | `bdc2b9f4129fd067` |
| 4 | `vcd-migrator-plugin-9.1.1.0100.25757808.tgz` (Migration Service Engine plugin) | 3.66 KB | 25757808 | Sep 21, 2026 | `58c47b4c42100750` |

![](img/g32-vcf-service-migration-service-engine-9110-p1.png)
![](img/g32-vcf-service-migration-service-engine-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `vcd-migrator-9.1.1.0.25714559.tgz` (Migration Service Engine) | 524.22 MB | 25714559 | Sep 03, 2026 | `841a843de7ca16f2` |
| 2 | `configuration-schema-vcd-migrator-9.1.1.0.25714559.yaml` (Migration Service Engine configuration schema) | 434 Bytes | 25714559 | Sep 03, 2026 | `2d29100eceb1035b` |
| 3 | `depot-manifest-vcd-migrator-9.1.1.0.25714559.yaml` (Migration Service Engine depot manifest) | 747 Bytes | 25714559 | Sep 03, 2026 | `e14bdf7f24c45679` |
| 4 | `vcd-migrator-plugin-9.1.1.0.25714559.tgz` (Migration Service Engine plugin) | 811 Bytes | 25714559 | Sep 03, 2026 | `73555d7d9872ddbc` |


### VCF service - Secret Store（Packlist 545677）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545677&viewGroup=true`

![](img/g33-vcf-service-secret-store.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `secret-store-service-9.1.1.0.25710217-legacy.yaml` | 1.86 KB | 25710217 | Sep 03, 2026 | `884c36e89e87fe1a` |
| 2 | `secret-store-service-9.1.1.0.25710217.yaml` | 1.85 KB | 25710217 | Sep 03, 2026 | `9940f0b72d3da95e` |
| 3 | `secret-store.broadcom.com-9.1.1.0.25710217.yml` | 705 Bytes | 25710217 | Sep 03, 2026 | `639372450871f94f` |


### VCF service - VKS Cluster Management Auto-Attach（Packlist 545615）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545615&viewGroup=true`

![](img/g34-vcf-service-vks-cluster-management-auto-.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `auto-attach.vksm.broadcom.com-9.1.1.0200.25801570.yml` | 481 Bytes | 25801570 | Oct 12, 2026 | `a174c028dfb1af9d` |

![](img/g34-vcf-service-vks-cluster-management-auto--9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `auto-attach.vksm.broadcom.com-9.1.1.0.25714559.yml` | 469 Bytes | 25714559 | Sep 03, 2026 | `1b36715774350681` |


### VKSM Extensions（Packlist 545628）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545628&viewGroup=true`

![](img/g36-vksm-extensions-p1.png)
![](img/g36-vksm-extensions-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `extensions__ga__9.0.2-1200-25801570__vks-agent__repo.9.0.2-1200-25801570.tar` | 251.43 MB | 25801570 | Oct 12, 2026 | `084b72b4d98ad6b7` |
| 2 | `extensions__ga__9.1.1-0200-25801570__dataprotection__extension.9.1.1-0200-25801570.tar` | 146.02 MB | 25801570 | Oct 12, 2026 | `3ddf0481b7e055ba` |
| 3 | `extensions__ga__9.1.1-0200-25801570__gatekeeper.9.1.1-0200-25801570.tar` | 182.13 MB | 25801570 | Oct 12, 2026 | `2c996dca67a7ad8e` |
| 4 | `extensions__ga__9.1.1-0200-25801570__fleet-mgmt__policy-sync-extension.9.1.1-0200-25801570.tar` | 142.9 MB | 25801570 | Oct 12, 2026 | `cbf31b31fabb06ed` |
| 5 | `extensions__ga__9.1.1-0200-25801570__policy-insight-extension.9.1.1-0200-25801570.tar` | 132.82 MB | 25801570 | Oct 12, 2026 | `a5746271c119cdae` |
| 6 | `extensions__ga__9.1.1-0200-25801570__agent__agent.9.1.1-0200-25801570.tar` | 156.18 MB | 25801570 | Oct 12, 2026 | `fcaf05b1e3ab44e9` |
| 7 | `extensions__ga__9.1.1-0200-25801570__gatekeeper-operator.9.1.1-0200-25801570.tar` | 115.42 MB | 25801570 | Oct 12, 2026 | `cb0567f84fcaa372` |
| 8 | `extensions__ga__9.1.1-0200-25801570__vks-agent__repo.9.1.1-0200-25801570.tar` | 251.43 MB | 25801570 | Oct 12, 2026 | `fc0e570e7addacf7` |

![](img/g36-vksm-extensions-9110-p1.png)
![](img/g36-vksm-extensions-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `extensions__ga__9.1.1-0-25714559__policy-insight-extension.9.1.1-0-25714559.tar` | 132.11 MB | 25714559 | Sep 03, 2026 | `3cca02e59678a082` |
| 2 | `extensions__ga__9.1.1-0-25714559__agent__agent.9.1.1-0-25714559.tar` | 155.47 MB | 25714559 | Sep 03, 2026 | `2e88616088e8f41c` |
| 3 | `extensions__ga__9.1.1-0-25714559__dataprotection__extension.9.1.1-0-25714559.tar` | 145.3 MB | 25714559 | Sep 03, 2026 | `63d1b7a34ba00313` |
| 4 | `extensions__ga__9.1.1-0-25714559__fleet-mgmt__policy-sync-extension.9.1.1-0-25714559.tar` | 142.18 MB | 25714559 | Sep 03, 2026 | `63c9a80bd58cf819` |
| 5 | `extensions__ga__9.1.1-0-25714559__vks-agent__repo.9.1.1-0-25714559.tar` | 251 MB | 25714559 | Sep 03, 2026 | `b2105b241b7084bd` |
| 6 | `extensions__ga__9.1.1-0-25714559__gatekeeper-operator.9.1.1-0-25714559.tar` | 114.71 MB | 25714559 | Sep 03, 2026 | `93c9867d279f663a` |
| 7 | `extensions__ga__9.1.1-0-25714559__gatekeeper.9.1.1-0-25714559.tar` | 182.13 MB | 25714559 | Sep 03, 2026 | `fec08ac8db85e818` |
| 8 | `extensions__ga__9.0.2-1-25714559__vks-agent__repo.9.0.2-1-25714559.tar` | 251 MB | 25714559 | Sep 03, 2026 | `b13206265b46ef86` |


### VMware Deep Learning VM Image（Packlist 545617）

- Portal 群組頁預設 release：**9.1.1.0**；下拉可選：9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545617&viewGroup=true`

![](img/g37-vmware-deep-learning-vm-image.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-Deep-Learning-VM-Image-nv-9.1.1.0.25664150.ova` | 3.43 GB | 25664150 | Sep 03, 2026 | `53110d3fbaab8c82` |


### VMware ESX on Arm（Packlist 545676）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545676&viewGroup=true`

![](img/g39-vmware-esx-on-arm.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0100.25784069.aarch64.iso` (ESX on Arm ISO image) | 259.32 MB | 25784069 | Oct 12, 2026 | `1bc10507d377e20d` |
| 2 | `VMware-ESXi-9.1.1.0100.25784069-depot.aarch64.zip` (ESX on Arm Offline bundle) | 252.14 MB | 25784069 | Oct 12, 2026 | `6aba23d133d6811a` |

![](img/g39-vmware-esx-on-arm-9110.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0.25714477.aarch64.iso` (ESX on Arm ISO image) | 259.32 MB | 25714477 | Sep 03, 2026 | `0710122a1066871a` |
| 2 | `VMware-ESXi-9.1.1.0.25714477-depot.aarch64.zip` (ESX on Arm Offline bundle) | 252.14 MB | 25714477 | Sep 03, 2026 | `d0b2a4e917c2f219` |


### Protection and Recovery (incl. vSphere Replication, vSAN Snapshots)（Packlist 539713）

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100, 9.1.1.0, 9.1.0.0200
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=539713&viewGroup=true`

![](img/g44-protection-and-recovery-incl-vsphere-rep-p1.png)
![](img/g44-protection-and-recovery-incl-vsphere-rep-p2.png)

**9.1.1.0100 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Protection-and-recovery-9.1.1.0100.25753785.iso` | 3.31 GB | 25753785 | Oct 12, 2026 | `a12f2d82e3c0a15b` |
| 2 | `Protection-and-recovery-scale-out-9.1.1.0100.25753785.iso` | 2.4 GB | 25753785 | Oct 12, 2026 | `9e24fe6168539545` |
| 3 | `Protection-and-recovery-9.1.1.0100.25753785.ova` | 1.83 GB | 25753785 | Oct 12, 2026 | `ba8902680e7b517c` |
| 4 | `Protection-and-recovery-scale-out-9.1.1.0100.25753785.ova` | 1.3 GB | 25753785 | Oct 12, 2026 | `9a2bdc86fd3029e7` |

![](img/g44-protection-and-recovery-incl-vsphere-rep-9110-p1.png)
![](img/g44-protection-and-recovery-incl-vsphere-rep-9110-p2.png)

**9.1.1.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Protection-and-Recovery-Proxy-9.1.1.0.25674358.ova` | 622.21 MB | 25674358 | Sep 03, 2026 | `6b61c42e630c5208` |
| 2 | `Protection-and-recovery-9.1.1.0.25691510.iso` | 3.31 GB | 25691510 | Sep 03, 2026 | `0e77fcf0a905fd67` |
| 3 | `Protection-and-recovery-scale-out-9.1.1.0.25691510.iso` | 2.4 GB | 25691510 | Sep 03, 2026 | `294369998d6105d9` |
| 4 | `Protection-and-recovery-9.1.1.0.25691510.ova` | 1.83 GB | 25691510 | Sep 03, 2026 | `304b433f849ff8c6` |
| 5 | `Protection-and-recovery-scale-out-9.1.1.0.25691510.ova` | 1.3 GB | 25691510 | Sep 03, 2026 | `685735260c64a6d9` |

**9.1.0.0200 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `Protection-and-Recovery-Proxy-9.1.0.0100.25505847.ova` | 565.76 MB | 25505847 | Jul 13, 2026 | `9685ebd4790cc568` |
| 2 | `Protection-and-recovery-9.1.0.0200.25525235.iso` | 3.1 GB | 25525235 | Jul 13, 2026 | `312c7d6286ab1db6` |
| 3 | `Protection-and-recovery-scale-out-9.1.0.0200.25525235.iso` | 2.24 GB | 25525235 | Jul 13, 2026 | `a1661e08bd572d94` |
| 4 | `Protection-and-recovery-9.1.0.0200.25525235.ova` | 1.73 GB | 25525235 | Jul 13, 2026 | `078179b3df17ad6b` |
| 5 | `Protection-and-recovery-scale-out-9.1.0.0200.25525235.ova` | 1.22 GB | 25525235 | Jul 13, 2026 | `708f5d10aa08f9d0` |


### VMware Private AI Services（Packlist 545679）

- Portal 群組頁預設 release：**3.0.0**；下拉可選：3.0.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545679&viewGroup=true`

![](img/g45-vmware-private-ai-services.png)

**3.0.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `pais-3.0.0.yml` | 13.29 KB | 25675446 | Sep 03, 2026 | `38f7284e734f49c6` |
| 2 | `pais-3.0.0-external.yml` | 13.35 KB |  | Sep 03, 2026 | `38a2d13e1d0a4c79` |


### VCF service - ArgoCD（Packlist 545807）

- Portal 群組頁預設 release：**1.2.0**；下拉可選：1.2.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545807&viewGroup=true`

![](img/g46-vcf-service-argocd.png)

**1.2.0 檔案清單**

| # | 檔案 | 大小 | Build | 發布日 | SHA2（前 16 碼） |
|---|---|---|---|---|---|
| 1 | `argocd-1.2.0.25642124.yml` | 2.26 KB | 25642124 | Sep 03, 2026 | `d47706ebf1b3c470` |


## 5. 全部檔案總表（預設 release）

| 群組 | 檔案 | 大小 | Build | 發布日 |
|---|---|---|---|---|
| VCF Installer | `VCF-SDDC-Manager-Appliance-9.1.1.0200.25801071.ova` | 2.4 GB | 25801071 | Oct 12, 2026 |
| VCF Installer | `VCF-SDDC-Manager-Appliance-Upgrade-9.1.1.0200.25801071.tar` | 2.54 GB | 25801071 | Oct 12, 2026 |
| VMware Avi Load Balancer | `controller-32.1.3-9105.ova` | 3.86 GB | 25665611 | Sep 03, 2026 |
| VMware Guest Customization Engine for Instant Clone | `vmware-gosc_13.2.2.0.25662429-1_amd64.deb` | 719 KB | 25662429 | Sep 03, 2026 |
| VMware Guest Customization Engine for Instant Clone | `vmware-gosc_13.2.2.0.25662429-1_i386.deb` | 720.63 KB | 25662429 | Sep 03, 2026 |
| VMware Guest Customization Engine for Instant Clone | `vmware-gosc-13.2.2.0.25662429-1.x86_64.rpm` | 725.72 KB | 25662429 | Sep 03, 2026 |
| VMware Guest Customization Engine for Instant Clone | `vmware-gosc-13.2.2.0.25662429-1.i386.rpm` | 726.57 KB | 25662429 | Sep 03, 2026 |
| VMware Tools | `VMware-Tools-13.1.5-core-offline-depot-ESXi-all-25677323.zip` | 128.56 MB | 25677323 | Sep 03, 2026 |
| VMware Tools | `VMware-Tools-windows-arm-13.1.5.0.25544008-25677323.tar.gz` | 43.96 MB | 25677323 | Sep 03, 2026 |
| VMware Tools | `VMware-Tools-windows-arm-13.1.5.0.25544008-25677323.zip` | 43.97 MB | 25677323 | Sep 03, 2026 |
| VMware Tools | `VMware-Tools-windows-13.1.5.0.25544008-25677323.zip` | 128.52 MB | 25677323 | Sep 03, 2026 |
| VMware Tools | `VMware-Tools-windows-13.1.5.0.25544008-25677323.tar.gz` | 128.52 MB | 25677323 | Sep 03, 2026 |
| VMware Tools | `gueststore-vmtools-13.1.5-0.25677323.zip` | 125.86 MB | 25677323 | Sep 03, 2026 |
| VMware Tools | `gueststore-vmtools-13.1.5-0.25677323.tar.gz` | 125.85 MB | 25677323 | Sep 03, 2026 |
| VMware Remote Console | `VMware-Remote-Console-13.1.1.25665422.x86_64.bundle` | 86.12 MB | 25665422 | Sep 03, 2026 |
| VMware Remote Console | `VMware-VMRC-13.1.1.25665422_x64.zip` | 53.18 MB | 25665422 | Sep 03, 2026 |
| Cloud proxy | `Operations-Cloud-Proxy-9.1.1.0100.25795064.ova` | 3.22 GB | 25795064 | Oct 12, 2026 |
| Fleet Lifecycle | `vcf-fleet-lcm-9.1.1.0200.25801070.tgz` | 582.57 MB | 25801070 | Oct 12, 2026 |
| Fleet Lifecycle | `configuration-schema-vcf-fleet-lcm-9.1.1.0200.25801070.yaml` | 1.04 KB | 25801070 | Oct 12, 2026 |
| Fleet Lifecycle | `depot-manifest-vcf-fleet-lcm-9.1.1.0200.25801070.yaml` | 742 Bytes | 25801070 | Oct 12, 2026 |
| Fleet Lifecycle | `vcf-fleet-lcm-plugin-9.1.1.0200.25801070.tgz` | 817 Bytes | 25801070 | Oct 12, 2026 |
| Identity broker | `depot-manifest-vidb-9.1.1.0100.25796677.yaml` | 705 Bytes | 25796677 | Oct 12, 2026 |
| Identity broker | `vidb-9.1.1.0100.25796677.tgz` | 858.76 MB | 25796677 | Oct 12, 2026 |
| Identity broker | `configuration-schema-vidb-9.1.1.0100.25796677.yaml` | 2.5 KB | 25796677 | Oct 12, 2026 |
| Identity broker | `vidb-upgrade-plugin-9.1.1.0100.25796677.tgz` | 8.76 KB | 25796677 | Oct 12, 2026 |
| License server | `Vcf-License-Server-9.1.1.0100.25795080.ova` | 884.16 MB | 25795080 | Oct 12, 2026 |
| Log management | `operations-logs-9.1.1.0100.25795095.tgz` | 2.54 GB | 25795095 | Oct 12, 2026 |
| Log management | `configuration-schema-operations-logs-9.1.1.0100.25795095.yaml` | 5.85 KB | 25795095 | Oct 12, 2026 |
| Log management | `depot-manifest-operations-logs-9.1.1.0100.25795095.yaml` | 740 Bytes | 25795095 | Oct 12, 2026 |
| Log management | `operations-logs-plugin-9.1.1.0100.25795095.tgz` | 1.29 KB | 25795095 | Oct 12, 2026 |
| Native Storage Service | `vsan-service-vmsp-backend-9.1.1.0.25714562.tgz` | 56.02 MB | 25714562 | Sep 03, 2026 |
| Native Storage Service | `vsan-object-store-vcfa-service-9.1.1.0.25714562.tar` | 507.2 MB | 25714562 | Sep 03, 2026 |
| Native Storage Service | `configuration-schema-vsan-service-vmsp-backend-9.1.1.0.25714562.yaml` | 356 Bytes | 25714562 | Sep 03, 2026 |
| Native Storage Service | `depot-manifest-vsan-service-vmsp-backend-9.1.1.0.25714562.yaml` | 808 Bytes | 25714562 | Sep 03, 2026 |
| Native Storage Service | `vsan-service-vmsp-backend-plugin-9.1.1.0.25714562.tgz` | 858 Bytes | 25714562 | Sep 03, 2026 |
| Real-time metrics | `vcf-obs-data-platform-9.1.1.0100.25794546.tgz` | 1.11 GB | 25794546 | Oct 12, 2026 |
| Real-time metrics | `configuration-schema-vcf-obs-data-platform-9.1.1.0100.25794546.yaml` | 1.81 KB | 25794546 | Oct 12, 2026 |
| Real-time metrics | `depot-manifest-vcf-obs-data-platform-9.1.1.0100.25794546.yaml` | 774 Bytes | 25794546 | Oct 12, 2026 |
| Real-time metrics | `vcf-obs-data-platform-plugin-9.1.1.0100.25794546.tgz` | 1.05 KB | 25794546 | Oct 12, 2026 |
| Real-time metrics store | `depot-manifest-vcfms-metrics-store-9.1.1.0100.25801571.yaml` | 809 Bytes | 25801571 | Oct 12, 2026 |
| Real-time metrics store | `configuration-schema-vcfms-metrics-store-9.1.1.0100.25801571.yaml` | 477 Bytes | 25801571 | Oct 12, 2026 |
| Real-time metrics store | `vcfms-metrics-store-9.1.1.0100.25801571.tgz` | 432.47 MB | 25801571 | Oct 12, 2026 |
| Real-time metrics store | `vcfms-metrics-store-plugin-9.1.1.0100.25801571.tgz` | 1.19 KB | 25801571 | Oct 12, 2026 |
| SDDC Lifecycle | `vcf-sddc-lcm-9.1.1.0200.25801981.tgz` | 650.06 MB | 25801981 | Oct 12, 2026 |
| SDDC Lifecycle | `configuration-schema-vcf-sddc-lcm-9.1.1.0200.25801981.yaml` | 1.03 KB | 25801981 | Oct 12, 2026 |
| SDDC Lifecycle | `depot-manifest-vcf-sddc-lcm-9.1.1.0200.25801981.yaml` | 736 Bytes | 25801981 | Oct 12, 2026 |
| SDDC Lifecycle | `vcf-sddc-lcm-plugin-9.1.1.0200.25801981.tgz` | 815 Bytes | 25801981 | Oct 12, 2026 |
| Salt RaaS | `salt-raas-9.1.1.0100.25795075.tgz` | 655.78 MB | 25795075 | Oct 12, 2026 |
| Salt RaaS | `configuration-schema-salt-raas-9.1.1.0100.25795075.yaml` | 1.31 KB | 25795075 | Oct 12, 2026 |
| Salt RaaS | `depot-manifest-salt-raas-9.1.1.0100.25795075.yaml` | 718 Bytes | 25795075 | Oct 12, 2026 |
| Salt RaaS | `salt-raas-plugin-9.1.1.0100.25795075.tgz` | 2.36 KB | 25795075 | Oct 12, 2026 |
| Salt master | `salt-9.1.1.0100.25795075.tgz` | 393.84 MB | 25795075 | Oct 12, 2026 |
| Salt master | `configuration-schema-salt-9.1.1.0100.25795075.yaml` | 1.3 KB | 25795075 | Oct 12, 2026 |
| Salt master | `depot-manifest-salt-9.1.1.0100.25795075.yaml` | 688 Bytes | 25795075 | Oct 12, 2026 |
| Salt master | `salt-plugin-9.1.1.0100.25795075.tgz` | 873 Bytes | 25795075 | Oct 12, 2026 |
| Software Depot | `vcf-fleet-depot-9.1.1.0200.25801072.tgz` | 879.88 MB | 25801072 | Oct 12, 2026 |
| Software Depot | `vcf-fleet-depot-plugin-9.1.1.0200.25801072.tgz` | 895 Bytes | 25801072 | Oct 12, 2026 |
| Software Depot | `depot-manifest-vcf-fleet-depot-9.1.1.0200.25801072.yaml` | 754 Bytes | 25801072 | Oct 12, 2026 |
| Software Depot | `configuration-schema-vcf-fleet-depot-9.1.1.0200.25801072.yaml` | 10.72 KB | 25801072 | Oct 12, 2026 |
| Telemetry | `telemetry-acceptor-9.1.1.0100.25741214.tgz` | 240.5 MB | 25741214 | Oct 12, 2026 |
| Telemetry | `configuration-schema-telemetry-acceptor-9.1.1.0100.25741214.yaml` | 466 Bytes | 25741214 | Oct 12, 2026 |
| Telemetry | `depot-manifest-telemetry-acceptor-9.1.1.0100.25741214.yaml` | 789 Bytes | 25741214 | Oct 12, 2026 |
| Telemetry | `telemetry-acceptor-plugin-9.1.1.0100.25741214.tgz` | 775 Bytes | 25741214 | Oct 12, 2026 |
| VCF Automation | `depot-manifest-vcfa-bundle-9.1.1.0200.25801570.yaml` | 727 Bytes | 25801570 | Oct 12, 2026 |
| VCF Automation | `configuration-schema-vcfa-bundle-9.1.1.0200.25801570.yaml` | 3.75 KB | 25801570 | Oct 12, 2026 |
| VCF Automation | `vcfa-bundle-9.1.1.0200.25801570.tar` | 15.69 GB | 25801570 | Oct 12, 2026 |
| VCF Automation | `vcfa-plugin-9.1.1.0200.25801570.tgz` | 136.25 KB | 25801570 | Oct 12, 2026 |
| VCF Consumption CLI | `VCF-Consumption-CLI-Binaries-9.1.1.0100.25746586.tar.gz` | 293.63 MB | 25746586 | Oct 08, 2026 |
| VCF Consumption CLI | `VCF-Consumption-CLI-Windows_ARM64-9.1.1.0100.25746586.zip` | 53.86 MB | 25746586 | Oct 08, 2026 |
| VCF Consumption CLI | `VCF-Consumption-CLI-Windows_AMD64-9.1.1.0100.25746586.zip` | 56.29 MB | 25746586 | Oct 08, 2026 |
| VCF Consumption CLI | `VCF-Consumption-CLI-Linux_AMD64-9.1.1.0100.25746586.tar.gz` | 36.45 MB | 25746586 | Oct 08, 2026 |
| VCF Consumption CLI | `VCF-Consumption-CLI-Linux_ARM64-9.1.1.0100.25746586.tar.gz` | 32.54 MB | 25746586 | Oct 08, 2026 |
| VCF Consumption CLI | `VCF-Consumption-CLI-Darwin_ARM64-9.1.1.0100.25746586.tar.gz` | 55.05 MB | 25746586 | Oct 08, 2026 |
| VCF Consumption CLI | `VCF-Consumption-CLI-Darwin_AMD64-9.1.1.0100.25746586.tar.gz` | 59.44 MB | 25746586 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-PluginBundle-Linux_ARM64-9.1.1.0100.25793136.tar.gz` | 194.4 MB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-PluginBundle-9.1.1.0100.25793136.tar.gz` | 1.27 GB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-PluginBundle-Darwin_ARM64-9.1.1.0100.25793136.tar.gz` | 205.31 MB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-PluginBundle-Linux_AMD64-9.1.1.0100.25793136.tar.gz` | 252.84 MB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-PluginBundle-Darwin_AMD64-9.1.1.0100.25793136.tar.gz` | 223.96 MB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-PluginBundle-Windows_AMD64-9.1.1.0100.25793136.zip` | 233.04 MB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-PluginBundle-Windows_ARM64-9.1.1.0100.25793136.zip` | 196 MB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `plugin-inventory-signed.tar` | 30.5 KB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `plugin-inventory-signed-versioned.tar` | 30.5 KB | 25793136 | Oct 08, 2026 |
| VCF Consumption CLI Plugins | `VCF-Consumption-CLI-OCI-PluginBundle-9.1.1.0100.25793136.tar.gz` | 1.48 GB | 25793136 | Oct 08, 2026 |
| VCF Native Object Store | `native-object-store-service-9.1.1.0.25714562.yml` | 481 Bytes | 25714562 | Sep 03, 2026 |
| VCF Operations | `Operations-Appliance-9.1.1.0100.25795063.ova` | 3.14 GB | 25795063 | Oct 12, 2026 |
| VCF Operations | `Operations-Upgrade-9.1.1.0100.25795060.pak` | 7.03 GB | 25795060 | Oct 12, 2026 |
| VCF Operations | `VMware_Cloud_Foundation_Operations-9.1.1.0100.25795060-upgrade-manifest.json` | 850 Bytes | 25795060 | Oct 12, 2026 |
| VCF Operations HCX | `hcx-unified-appliance-9.1.1.0100.25768312.ova` | 4.1 GB | 25768312 | Oct 12, 2026 |
| VCF Operations HCX | `hcx-unified-appliance-upgrade-bundle-9.1.1.0100.25768312-signed.tar.gz` | 3.88 GB | 25768312 | Oct 12, 2026 |
| VCF Operations HCX | `hcx-unified-appliance-pre-upgrade-bundle-9.1.1.0100.25768312-signed.tar.gz` | 14.3 MB | 25768312 | Oct 12, 2026 |
| VCF Operations for networks | `VCF-Operations-for-networks-9.1.1.0100.25774578-platform.ova` | 7.14 GB | 25774578 | Oct 12, 2026 |
| VCF Operations for networks | `VCF-Operations-for-networks-9.1.1.0100.25774578-collector.ova` | 3.48 GB | 25774578 | Oct 12, 2026 |
| VCF Operations for networks | `VCF-Operations-for-networks.9.1.1.0100.25774578.precheck.bundle` | 240.72 MB | 25774578 | Oct 12, 2026 |
| VCF Operations for networks | `VCF-Operations-for-networks.9.1.1.0100.25774578.upgrade.bundle` | 6.29 GB | 25774578 | Oct 12, 2026 |
| VCF Operations for networks | `VCF-Operations-for-networks-9.1.1.0100.25774578-update-manifest.json` | 711 Bytes | 25774578 | Oct 12, 2026 |
| VCF Operations orchestrator | `O11N_VA-9.1.1.0100.25795101.ova` | 3.6 GB | 25795101 | Oct 12, 2026 |
| VCF Operations orchestrator | `O11N_VA-9.1.1.0100.25795101-updaterepo.iso` | 3.42 GB | 25795101 | Oct 12, 2026 |
| VCF service - Configuration | `configuration-service-9.1.1.0.25670523.yaml` | 992 Bytes | 25670523 | Sep 03, 2026 |
| VCF service - Configuration | `configuration-9.1.1.0.25670523.yml` | 469 Bytes | 25670523 | Sep 03, 2026 |
| VCF service - Encryption Management | `encryption-management-9.1.1.0.25714559.yml` | 489 Bytes | 25714559 | Sep 03, 2026 |
| VCF service - Harbor | `harbor.tanzu.vmware.com-9.1.1.0.25714559.yml` | 77.25 KB | 25714559 | Sep 03, 2026 |
| VCF service - Metrics Aggregator | `metrics-aggregator.broadcom.com-9.1.1.0.25665407.yml` | 473 Bytes | 25665407 | Sep 03, 2026 |
| VCF service - Migration | `migration-9.1.1.0.25714559.yml` | 441 Bytes | 25714559 | Sep 03, 2026 |
| VCF service - Migration service engine | `vcd-migrator-9.1.1.0200.25801570.tgz` | 524.66 MB | 25801570 | Oct 12, 2026 |
| VCF service - Migration service engine | `configuration-schema-vcd-migrator-9.1.1.0200.25801570.yaml` | 443 Bytes | 25801570 | Oct 12, 2026 |
| VCF service - Migration service engine | `depot-manifest-vcd-migrator-9.1.1.0200.25801570.yaml` | 768 Bytes | 25801570 | Oct 12, 2026 |
| VCF service - Migration service engine | `vcd-migrator-plugin-9.1.1.0200.25801570.tgz` | 3.66 KB | 25801570 | Oct 12, 2026 |
| VCF service - Secret Store | `secret-store-service-9.1.1.0.25710217-legacy.yaml` | 1.86 KB | 25710217 | Sep 03, 2026 |
| VCF service - Secret Store | `secret-store-service-9.1.1.0.25710217.yaml` | 1.85 KB | 25710217 | Sep 03, 2026 |
| VCF service - Secret Store | `secret-store.broadcom.com-9.1.1.0.25710217.yml` | 705 Bytes | 25710217 | Sep 03, 2026 |
| VCF service - VKS Cluster Management Auto-Attach | `auto-attach.vksm.broadcom.com-9.1.1.0200.25801570.yml` | 481 Bytes | 25801570 | Oct 12, 2026 |
| VCF services runtime | `depot-manifest-vmsp-platform-9.1.1.0100.25801571.yaml` | 929 Bytes | 25801571 | Oct 12, 2026 |
| VCF services runtime | `configuration-schema-vmsp-platform-9.1.1.0100.25801571.yaml` | 33.54 KB | 25801571 | Oct 12, 2026 |
| VCF services runtime | `vmsp-cli-9.1.1.0100.25801571.tar.gz` | 25.4 MB | 25801571 | Oct 12, 2026 |
| VCF services runtime | `vmsp-platform-9.1.1.0100.25801571.tar` | 6.39 GB | 25801571 | Oct 12, 2026 |
| VCF services runtime | `vcf-services-platform-template-9.1.1.0100.25801571.ova` | 9.7 GB | 25801571 | Oct 12, 2026 |
| VCF services runtime | `vmsp-plugin-9.1.1.0100.25801571.tgz` | 272.62 KB | 25801571 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.0.2-1200-25801570__vks-agent__repo.9.0.2-1200-25801570.tar` | 251.43 MB | 25801570 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.1.1-0200-25801570__dataprotection__extension.9.1.1-0200-25801570.tar` | 146.02 MB | 25801570 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.1.1-0200-25801570__gatekeeper.9.1.1-0200-25801570.tar` | 182.13 MB | 25801570 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.1.1-0200-25801570__fleet-mgmt__policy-sync-extension.9.1.1-0200-25801570.tar` | 142.9 MB | 25801570 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.1.1-0200-25801570__policy-insight-extension.9.1.1-0200-25801570.tar` | 132.82 MB | 25801570 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.1.1-0200-25801570__agent__agent.9.1.1-0200-25801570.tar` | 156.18 MB | 25801570 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.1.1-0200-25801570__gatekeeper-operator.9.1.1-0200-25801570.tar` | 115.42 MB | 25801570 | Oct 12, 2026 |
| VKSM Extensions | `extensions__ga__9.1.1-0200-25801570__vks-agent__repo.9.1.1-0200-25801570.tar` | 251.43 MB | 25801570 | Oct 12, 2026 |
| VMware Deep Learning VM Image | `VMware-Deep-Learning-VM-Image-nv-9.1.1.0.25664150.ova` | 3.43 GB | 25664150 | Sep 03, 2026 |
| VMware ESX | `VMware-VMvisor-Installer-9.1.1.0100.25782009.x86_64.iso` | 718.88 MB | 25782009 | Oct 12, 2026 |
| VMware ESX | `VMware-ESXi-9.1.1.0100.25782009-depot.zip` | 699.2 MB | 25782009 | Oct 12, 2026 |
| VMware ESX on Arm | `VMware-VMvisor-Installer-9.1.1.0100.25784069.aarch64.iso` | 259.32 MB | 25784069 | Oct 12, 2026 |
| VMware ESX on Arm | `VMware-ESXi-9.1.1.0100.25784069-depot.aarch64.zip` | 252.14 MB | 25784069 | Oct 12, 2026 |
| VMware NSX | `nsx-unified-appliance-9.1.1.0100.25762948.ova` | 8.26 GB | 25762940 | Oct 12, 2026 |
| VMware NSX | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940.mub` | 5.99 GB | 25762940 | Oct 12, 2026 |
| VMware NSX | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940-pre-check.pub` | 1.07 GB | 25762940 | Oct 12, 2026 |
| VMware NSX | `nsx-edge-9.1.1.0100.25762944.iso` | 2.68 GB | 25762940 | Oct 12, 2026 |
| VMware NSX | `nsx-edge-9.1.1.0100.25762944.ova` | 2.07 GB | 25762940 | Oct 12, 2026 |
| VMware NSX | `nsx-edge--9.1.1.0100.25762944.ova` | 2.07 GB | 25762940 | Oct 12, 2026 |
| VMware NSX | `VMware-NSX-edge-9.1.1.0100.25762944.nub` | 1.84 GB | 25762940 | Oct 12, 2026 |
| VMware vCenter | `VMware-VCSA-all-9.1.1.0100.25784172.iso` | 9.69 GB | 25784172 | Oct 12, 2026 |
| VMware vCenter | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-updaterepo.zip` | 7.87 GB | 25784172 | Oct 12, 2026 |
| VMware vCenter | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-patch-FP.iso` | 7.51 GB | 25784172 | Oct 12, 2026 |
| VMware vSAN | `VMware-VMvisor-Installer-9.1.1.0100.25782009.x86_64.iso` | 718.88 MB | 25782009 | Oct 12, 2026 |
| VMware vSAN | `VMware-ESXi-9.1.1.0100.25782009-depot.zip` | 699.2 MB | 25782009 | Oct 12, 2026 |
| VMware vSphere Supervisor | `VMware-vSphere-Supervisor-9.1.1.0100-25784172.zip` | 3.75 GB | 25784172 | Oct 12, 2026 |
| Protection and Recovery (incl. vSphere Replication, vSAN Snapshots) | `Protection-and-recovery-9.1.1.0100.25753785.iso` | 3.31 GB | 25753785 | Oct 12, 2026 |
| Protection and Recovery (incl. vSphere Replication, vSAN Snapshots) | `Protection-and-recovery-scale-out-9.1.1.0100.25753785.iso` | 2.4 GB | 25753785 | Oct 12, 2026 |
| Protection and Recovery (incl. vSphere Replication, vSAN Snapshots) | `Protection-and-recovery-9.1.1.0100.25753785.ova` | 1.83 GB | 25753785 | Oct 12, 2026 |
| Protection and Recovery (incl. vSphere Replication, vSAN Snapshots) | `Protection-and-recovery-scale-out-9.1.1.0100.25753785.ova` | 1.3 GB | 25753785 | Oct 12, 2026 |
| VMware Private AI Services | `pais-3.0.0.yml` | 13.29 KB | 25675446 | Sep 03, 2026 |
| VMware Private AI Services | `pais-3.0.0-external.yml` | 13.35 KB |  | Sep 03, 2026 |
| VCF service - ArgoCD | `argocd-1.2.0.25642124.yml` | 2.26 KB | 25642124 | Sep 03, 2026 |

## 6. 擷取方法（可重放）

- 瀏覽器：Chrome 以 `--remote-debugging-port=9222` 啟動（`E:\9.1\tools\start-cdp-chrome.ps1`），人工登入 Portal 後由 `cdp-live.mjs` 附著分頁逐頁導航、整頁截圖（`fullshot`）並以 DOM 讀取檔案表格。
- 群組清單與 Packlist ID 來自 9.1.1.0 release 頁；每個群組頁先擷取預設 release，再切換 Release 下拉到其餘版本各擷取一次。
- 原始資料：`pass1.json`（預設 release）、`pass2.json`（其他 release），本文件表格由這兩份 JSON 產生。
