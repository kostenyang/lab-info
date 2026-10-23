# VCF 9.1.1 升級套件下載指南（vCenter / NSX / ESX）

## 1. 範圍與現況

本文件以 2026-10-14 實際登入 Broadcom Support Portal 的畫面，說明升級 vCenter、NSX、ESX 到 9.1.1 所需套件在哪裡下載，以及每個檔案的檔名、大小、build、發布日與 SHA2，供下載後核對。

> **重點：Broadcom 於 2026-10-12 釋出 9.1.1.0100 修補版。Portal 群組頁預設顯示 9.1.1.0100，要抓 9.1.1.0 基礎版必須手動切換右上 Release 下拉。下面每個群組兩個版本都列。**

| 元件 | 群組名稱 | Packlist | 9.1.1.0100 build | 9.1.1.0 build |
|---|---|---|---|---|
| vCenter | VMware vCenter | 545684 | 25784172 | 25712839 |
| NSX | VMware NSX | 545629 | 25762940 | 25691509 |
| ESX | VMware ESX | 545653 | 25782009 | 25714478 |

> vSAN 群組（Packlist 545686）內容與 VMware ESX 群組完全相同（同一個 ISO 與 offline bundle），vSAN 隨 ESX 升級，不需另外下載。

## 2. 入口與導覽

1. 登入 `https://support.broadcom.com`，右上角切換到 **VMware Cloud Foundation** 事業群，左側 **My Downloads** 搜尋「VMware Cloud Foundation」。
2. 進入 **VMware Cloud Foundation** 產品頁後展開 **VMware Cloud Foundation 9**，點 **9.1.1.0**（Release Level Info 545627）。

![](img/01-vcf-product-downloads.png)

3. release 頁的 Primary Downloads 分頁列出 46 個元件群組；找到 **VMware vCenter**、**VMware NSX**、**VMware ESX** 三列，點右側 **View Group**。

![](img/02-vcf-911-product-files-top.png)

4. 群組頁版面：右上 **Release 下拉**選版本（預設最新修補版）、左上勾 **I agree to the Terms and Conditions** 後才出現下載圖示、**Expand All** 展開檔案表；欄位為 File Name（含大小與 Build Number）、Release Date、Last Updated、SHA2、MD5。
5. 群組頁也能用 URL 直接開（`groupId=<Packlist ID>&viewGroup=true`），下面各節有完整 URL。

## 3. vCenter（VMware vCenter，Packlist 545684）

升級既有 vCenter 用 **updaterepo.zip**（掛成 repository 走 VAMI/CLI 更新）或 **patch-FP.iso**（掛 ISO 走 software-packages）；新裝或 RDU 遷移式升級用 **VCSA-all ISO**。

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100 / 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545684&viewGroup=true`

### 9.1.1.0100（修補版，2026-10-12 發布）

![](img/g41-vmware-vcenter-p1.png)
![](img/g41-vmware-vcenter-p2.png)

| # | 檔案 | 大小 | Build | SHA2 |
|---|---|---|---|---|
| 1 | `VMware-VCSA-all-9.1.1.0100.25784172.iso` — VMware vCenter Appliance | 9.69 GB | 25784172 | `d320af820103e2df1a79d24f9b59fe9d39c4fa06d41e4411d4eace7b6c717ad2` |
| 2 | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-updaterepo.zip` — VMware vCenter Appliance Update Bundle | 7.87 GB | 25784172 | `d6b73a102dcf274e5bf656ce55604816ce27b9d89280924faac56c381fced5b2` |
| 3 | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-patch-FP.iso` — VMware vCenter Appliance Patch | 7.51 GB | 25784172 | `65b0b7b77f8f72b414584af57fd1251f6b7e34948c0f6f09c3a893ef2e9929ca` |

### 9.1.1.0（基礎版，切換 Release 下拉後）

![](img/g41-vmware-vcenter-9110.png)

| # | 檔案 | 大小 | Build | SHA2 |
|---|---|---|---|---|
| 1 | `VMware-VCSA-all-9.1.1.0.25712839.iso` — VMware vCenter Appliance | 9.71 GB | 25712839 | `a7e2fa323eb4b382f51fba0bca00bc6a84e28a4f7fb9df8c237205e89b39566f` |
| 2 | `VMware-vCenter-Server-Appliance-9.1.1.0.25712839-updaterepo.zip` — VMware vCenter Appliance Update Bundle | 7.89 GB | 25712839 | `e6994139b7916ce751cd3ba56d3c042f0d3518bed30926921d5530c03ce53089` |
| 3 | `VMware-vCenter-Server-Appliance-9.1.1.0.25712839-patch-FP.iso` — VMware vCenter Appliance Patch | 7.54 GB | 25712839 | `d281358465b5cb770d15ccfad5be528e840988986123f401a5039666f0fecbc1` |


## 4. NSX（VMware NSX，Packlist 545629）

升級既有 NSX 用 **upgrade bundle（.mub）** 搭配 **pre-check bundle（.pub）** 從 NSX Manager Upgrade 頁上傳；新裝 Manager 用 **nsx-unified-appliance OVA**；Edge 視部署方式選 OVA / ISO。

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100 / 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545629&viewGroup=true`

### 9.1.1.0100（修補版，2026-10-12 發布）

![](img/g40-vmware-nsx-p1.png)
![](img/g40-vmware-nsx-p2.png)

| # | 檔案 | 大小 | Build | SHA2 |
|---|---|---|---|---|
| 1 | `nsx-unified-appliance-9.1.1.0100.25762948.ova` — NSX Manager/ NSX Global Manager | 8.26 GB | 25762940 | `c312e9d6096cf5422f8eef4302f77b5c6439c8bed4cd6f3d399168bd2b55ca22` |
| 2 | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940.mub` — NSX 9.1.1.0100 Upgrade Bundle | 5.99 GB | 25762940 | `ebb20d651ccb5f6121e2aacc5246dab935cd7392b0f9d08d816a8f8468402b5d` |
| 3 | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940-pre-check.pub` — NSX 9.1.1.0100 Upgrade Precheck Bundle | 1.07 GB | 25762940 | `7d6897c4afa6e45c60e19d4a24cedfb51c275652fda88f71a4b7c0dd17a599f8` |
| 4 | `nsx-edge-9.1.1.0100.25762944.iso` — NSX Edge for Bare Metal | 2.68 GB | 25762940 | `c905287e82623be9f6f1b7f6cdf637c2594b92734ed86409143a4e8efc0184cc` |
| 5 | `nsx-edge-9.1.1.0100.25762944.ova` — NSX Edge for VMware ESXi (Manual Edge Deployment) | 2.07 GB | 25762940 | `33d9bcb796cbb8671a20c08a2f3be4b05ac3ce797cde0150726e960d6be01b08` |
| 6 | `nsx-edge--9.1.1.0100.25762944.ova` — Autonomous Edge L2VPN Client | 2.07 GB | 25762940 | `33d9bcb796cbb8671a20c08a2f3be4b05ac3ce797cde0150726e960d6be01b08` |
| 7 | `VMware-NSX-edge-9.1.1.0100.25762944.nub` — Autonomous Edge L2VPN Client upgrade bundle | 1.84 GB | 25762940 | `0f7e4734cf42887262f907ff62e1868535fc5d7027c4409741a75dba18cefaf6` |

### 9.1.1.0（基礎版，切換 Release 下拉後）

![](img/g40-vmware-nsx-9110-p1.png)
![](img/g40-vmware-nsx-9110-p2.png)

| # | 檔案 | 大小 | Build | SHA2 |
|---|---|---|---|---|
| 1 | `nsx-unified-appliance-9.1.1.0.25691516.ova` — NSX Manager/ NSX Global Manager | 8.26 GB | 25691509 | `23a77dc722a004430ea5300fdbe8ed80d598a0577f5181094967a14acf06ecfb` |
| 2 | `VMware-NSX-upgrade-bundle-9.1.1.0.0.25691509.mub` — NSX 9.1.1.0 Upgrade Bundle | 5.99 GB | 25691509 | `0a0c7ae26815a6e467185aa88a49b7b73fa4641d3c00bde88ff425e1dc165b44` |
| 3 | `VMware-NSX-upgrade-bundle-9.1.1.0.0.25691509-pre-check.pub` — NSX 9.1.1.0 Upgrade Precheck Bundle | 1.07 GB | 25691509 | `2bc30d7c3c157a57fcfc2497c1f2b5d606d6e20b2740a9525e9fdf7eb00dae02` |
| 4 | `nsx-edge-9.1.1.0.25691514.iso` — NSX Edge for Bare Metal | 2.68 GB | 25691509 | `70212e05d61b114a2585bcdc941fd340769c5a455b83e6ad7436c553270326be` |
| 5 | `nsx-edge-9.1.1.0.25691514.ova` — NSX Edge for VMware ESXi (Manual Edge Deployment) | 2.07 GB | 25691509 | `fc2c9c270eef4f30649fa62239d67a7574a4af053a4ad8b0231102a4d2b4397f` |
| 6 | `nsx-edge--9.1.1.0.25691514.ova` — Autonomous Edge L2VPN Client | 2.07 GB | 25691509 | `fc2c9c270eef4f30649fa62239d67a7574a4af053a4ad8b0231102a4d2b4397f` |
| 7 | `VMware-NSX-edge-9.1.1.0.25691514.nub` — Autonomous Edge L2VPN Client upgrade bundle | 1.84 GB | 25691509 | `e0cd0d63207eb031f6fd75ae9504011a0c46138737cde4bba46641f3938d6096` |


## 5. ESX（VMware ESX，Packlist 545653）

走 vLCM 映像或 baseline 升級用 **offline bundle（depot.zip）** 匯入 vCenter；重灌或開機安裝用 **ISO**。放進 VCF offline depot 時也是用 depot.zip。

- Portal 群組頁預設 release：**9.1.1.0100**；下拉可選：9.1.1.0100 / 9.1.1.0
- 群組頁 URL：`https://support.broadcom.com/group/ecx/productfiles?displayGroup=VMware%20Cloud%20Foundation%209&release=9.1.1.0&os=&servicePk=545627&language=EN&groupId=545653&viewGroup=true`

### 9.1.1.0100（修補版，2026-10-12 發布）

![](img/g38-vmware-esx.png)

| # | 檔案 | 大小 | Build | SHA2 |
|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0100.25782009.x86_64.iso` — ESX ISO image | 718.88 MB | 25782009 | `8f6a3598207f20e1918694bd1f10c312c49a7c169c8bc2515e774fa685ffd384` |
| 2 | `VMware-ESXi-9.1.1.0100.25782009-depot.zip` — ESX Offline Bundle | 699.2 MB | 25782009 | `ee2e159b8713dc022cbe57e8096aac97b2f3b05c0bd5030eec190395b7b93d91` |

### 9.1.1.0（基礎版，切換 Release 下拉後）

![](img/g38-vmware-esx-9110.png)

| # | 檔案 | 大小 | Build | SHA2 |
|---|---|---|---|---|
| 1 | `VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso` — ESX ISO image | 699.49 MB | 25714478 | `712d153f32581d7dc2027403c988fc0159e69619c4486941df69aa0616591c53` |
| 2 | `VMware-ESXi-9.1.1.0.25714478-depot.zip` — ESX Offline Bundle | 679.81 MB | 25714478 | `71bdb30387d3f04d66e20369965f54f9cee4ede9ffe0a0ffa7e3d846885f205e` |


## 6. 下載檢核表

完整 SHA2 見各群組的檔案清單表；下載後用 `certutil -hashfile <檔案> SHA256`（Windows）或 `sha256sum`（Linux）核對。

| 勾 | 元件 | 版本 | 檔案 | 大小 |
|---|---|---|---|---|
| ☐ | vCenter | 9.1.1.0100 | `VMware-VCSA-all-9.1.1.0100.25784172.iso` | 9.69 GB |
| ☐ | vCenter | 9.1.1.0100 | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-updaterepo.zip` | 7.87 GB |
| ☐ | vCenter | 9.1.1.0100 | `VMware-vCenter-Server-Appliance-9.1.1.0100.25784172-patch-FP.iso` | 7.51 GB |
| ☐ | vCenter | 9.1.1.0 | `VMware-VCSA-all-9.1.1.0.25712839.iso` | 9.71 GB |
| ☐ | vCenter | 9.1.1.0 | `VMware-vCenter-Server-Appliance-9.1.1.0.25712839-updaterepo.zip` | 7.89 GB |
| ☐ | vCenter | 9.1.1.0 | `VMware-vCenter-Server-Appliance-9.1.1.0.25712839-patch-FP.iso` | 7.54 GB |
| ☐ | NSX | 9.1.1.0100 | `nsx-unified-appliance-9.1.1.0100.25762948.ova` | 8.26 GB |
| ☐ | NSX | 9.1.1.0100 | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940.mub` | 5.99 GB |
| ☐ | NSX | 9.1.1.0100 | `VMware-NSX-upgrade-bundle-9.1.1.0100.0.25762940-pre-check.pub` | 1.07 GB |
| ☐ | NSX | 9.1.1.0100 | `nsx-edge-9.1.1.0100.25762944.iso` | 2.68 GB |
| ☐ | NSX | 9.1.1.0100 | `nsx-edge-9.1.1.0100.25762944.ova` | 2.07 GB |
| ☐ | NSX | 9.1.1.0100 | `nsx-edge--9.1.1.0100.25762944.ova` | 2.07 GB |
| ☐ | NSX | 9.1.1.0100 | `VMware-NSX-edge-9.1.1.0100.25762944.nub` | 1.84 GB |
| ☐ | NSX | 9.1.1.0 | `nsx-unified-appliance-9.1.1.0.25691516.ova` | 8.26 GB |
| ☐ | NSX | 9.1.1.0 | `VMware-NSX-upgrade-bundle-9.1.1.0.0.25691509.mub` | 5.99 GB |
| ☐ | NSX | 9.1.1.0 | `VMware-NSX-upgrade-bundle-9.1.1.0.0.25691509-pre-check.pub` | 1.07 GB |
| ☐ | NSX | 9.1.1.0 | `nsx-edge-9.1.1.0.25691514.iso` | 2.68 GB |
| ☐ | NSX | 9.1.1.0 | `nsx-edge-9.1.1.0.25691514.ova` | 2.07 GB |
| ☐ | NSX | 9.1.1.0 | `nsx-edge--9.1.1.0.25691514.ova` | 2.07 GB |
| ☐ | NSX | 9.1.1.0 | `VMware-NSX-edge-9.1.1.0.25691514.nub` | 1.84 GB |
| ☐ | ESX | 9.1.1.0100 | `VMware-VMvisor-Installer-9.1.1.0100.25782009.x86_64.iso` | 718.88 MB |
| ☐ | ESX | 9.1.1.0100 | `VMware-ESXi-9.1.1.0100.25782009-depot.zip` | 699.2 MB |
| ☐ | ESX | 9.1.1.0 | `VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso` | 699.49 MB |
| ☐ | ESX | 9.1.1.0 | `VMware-ESXi-9.1.1.0.25714478-depot.zip` | 679.81 MB |

三個群組兩個版本全部檔案合計約 100.9 GB；實務上只抓要用的版本與檔案型態即可。
