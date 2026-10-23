# RHEL 9.8 VCF Offline Depot — 狀態檔

## ✅✅ 修正完成並驗證通過（2026-07-29）
- **根因**：交付 tar 用 `binaries export` 打包 → 連 0400(seq48) metadata 一起包；客戶原始 depot 是 **seq43**（902 抓的、cap 在客戶版本集、無 Compatibility 大包）。客戶原樣解 tar → 型錄被蓋成 seq48 → installer 要 0400 版本 → depot 沒有 → Failed。
- **正確認知**：客戶原始 seq43 metadata **本來就列了 fleet**（且 resolve 到 fail 表版本）→ 客戶**只需 fleet binaries、不動 metadata**。
- **驗證（rhel98-orig = 客戶 pristine 複本，重部自 E:\offline）**：
  - 原始型錄 = **seq43**（575KB，元件 max 版本=fail 表、**無 0400**）。已備份 `E:\9.1\deliver\metadata-original.tgz`。
  - 用 token(非activation code,activation code 綁機器換機失效) `binaries download --id` 下 fleet 到 scratch → `cp COMP` 進 depot（**metadata 沒動,seq 仍43**）。
  - 新 installer 設 depot → DEPOT_CONNECTION_SUCCESSFUL → GET /v1/bundles fleet max 版本=fail 表、**無0400** → 觸發下載 9 組 → **9/9 SUCCESSFUL**。
- **交付（`E:\9.1\deliver`）**：`fleet-binaries-only-9.1.0.tar`（22.9GB,9組COMP,**無metadata**,sha256 3a05246d...）、`import-fleet.sh`(v3:先備份metadata→只解COMP→驗seq未變)、`fix-depot-metadata.sh`+`metadata-original/`(seq43,救已中招者)、IMPORT-README。
- rhel98-orig disk 擴到240G。installer=vcf-installer-verify@10.0.0.71(admin@local/VMware1!VMware1!)。

## 🔴🔴 (舊)重大修正過程紀錄
- **錯誤**：我補完 fleet 後跑了 `metadata download`，把 depot 型錄**覆蓋成 0400 seq48（最新）**。但碟上元件是客戶原始混版（success 到 0200、fleet 是 fail 表單版），型錄卻宣告 0300/0400 → **真 installer 照 0400 型錄要新版 → 大量 Failed**（使用者截圖實證：Fleet lifecycle/License/SDDC LCM 等 0400 全 fail）。
- **關鍵認知**：客戶原始 depot 的 metadata **本來就有 fleet 定義**（原始 fail 表 fleet 是「下載 Failed」不是「沒列」→ 表示型錄有列、只是 902 抓不到 binary）。所以客戶**只需要 fleet binaries**，不需要改 metadata。
- **正確交付 = fleet binaries ONLY**（客戶保留自己原始 metadata）。我之前 tar 裡含 0400 metadata = 錯，要拿掉。
- **正確重弄法**（使用者指示：`E:\offline` OVA 是客戶最原始樣子）：
  1. 從 `E:\offline` 重部 pristine depot（原始 metadata，resolve 到 fail 表版本）→ VM `rhel98-orig`，網路直接映射 **VDS MGMT**（`--net:"MGMT=MGMT"`，避免上次 VM Network 無 uplink 坑）
  2. fleet binaries 下載到**scratch dir**（`binaries download --id -d=scratch`）→ `cp COMP/* 到真 depot PROD/COMP`（**絕不動 metadata**）
  3. 重部全新 installer（10.0.0.71）→ 設 depot → 測 download → 應 resolve 到 fail 表版本、全在碟上 → 成功
  4. 交付 tar 重做成**只有 fleet COMP binaries**（無 metadata）
- 進行中：depot 重部 bg `b3esh0urn`、installer 重部 bg `b50rpxoje`。舊壞掉的 rhel98-test 已關機（保留當 fleet binary 備源，但別開機=IP撞 .72）。
- fail 表版本（=目標）：CloudProxy 0200/FleetLCM 0100/IdentityBroker 0.0/License 0200/Migration 0.0/Salt 0100/SaltRaaS 0100/SDDCLCM 0200/SDDCMgr 0200/SoftwareDepot 0.0/Telemetry 0.0/VRA 0100/VROps 0200/VSP 0.0/NSX 0100/vCenter 0100。

---


> ⚠️ **任務已澄清（2026-07-27）**：不是建新 VM。真正的事是——
> **客戶當初用 902 工具下載 VCF 9.1 depot，缺了整層 fleet（902 不認得新元件型別→skip）。
> 現在要用 0400 把缺的 9 組 fleet 補進那份既有 depot，交付給客戶（客戶 depot server 跑 RHEL 9.8）。**
>
> **目前卡點**：使用者「等等會把客戶那邊的 depot 下載到本機」（Linux depot 資料夾），**還沒好**。
> depot 到位後 → 用 0400 `binaries download --id <fleet 9 IDs>` 對同一 store 補料 → 修權限/驗證 → 交付。
> 補料 ID 清單見 `dev-docs/fleet-supplement-ids.txt`。
>
> （下方是最初誤讀成「建新 RHEL VM」的計畫，暫留備參，多半用不到。）

## 客戶 appliance 部署（2026-07-27 進行中）
- **來源**：`E:\offline\rhel98-test.ovf`（匯出的客戶 RHEL9 depot server VM）
  - OS 碟 64G(vmdisk1) + **資料碟 200G/實際169G(vmdisk2)=902下的9.1 depot** + 掛 15.5G ISO(file3)
  - RHEL9、EFI+SecureBoot、vmx-19、2vCPU/4GB、1x VmxNet3 接 OVF network `MGMT`
- **部署參數**（ovftool 5.0）：
  - 目標 `vi://administrator%40vsphere.local:VMware1%21@10.0.0.101/Datacenter/host/Cluster/Resources`
  - **datastore `vmfs-samsung4t`**（3.7TB free；只掛在 **host 10.0.0.95=host-16542**→VM 自然落 95）
  - **網路映射 `MGMT`→`VM Network`**（=network-54，host95 有，=gpvpn01(72) 那個 10.0.0.x LAN）
  - `--diskMode=thin`、`--name=rhel98-test`、**powered-off**（避免與現役 IP 衝突，開機前先確認 IP）
  - log `dev-docs/_ovf-deploy.log`，背景 task `bs33je3rp`
- **govc 環境速查**：DC=`Datacenter`,cluster hosts=95/97/98(morefs host-16542/34/37),`MSYS_NO_PATHCONV=1` 才能用絕對 inventory 路徑;vcf9depot(61)在host97,gpvpn01(72)在host98。
- **IP 定案（2026-07-27）**：**關掉 gpvpn01(10.0.0.72)，rhel98-test 用它內建的 .72 開機**。→ 上傳完成、要開機前才 `vm.power -off gpvpn01`，再 `vm.power -on rhel98-test`。
- **開機後**：scp 0400(lin64) 進 VM → 對其 depot store 用 `--id`(fleet-supplement-ids.txt) 補 9 組 fleet → 修權限/驗證 → 關機匯出交付。

## rhel98-test 上線後實況（2026-07-27）
- 部署成功、開機取得 **10.0.0.72**（先關 gpvpn01 釋放；切 IP 後**本機要 `arp -d 10.0.0.72`** 清 stale ARP 才連得到）。
- 進入方式：**vCenter guest-ops** `govc guest.run/upload -l root:<redacted>`（SSH 也開著在 22，但 Windows 無 sshpass；guest-ops 最穩）。
- OS=RHEL 9.8(Plow)、**firewalld 沒開**、nginx+sshd active、listen 22/80/443/8888。
- depot=`/dev/sdb` 掛 `/opt/vcf-depot`（200G,用176G/84%,剩~33G）;`/opt/vcf-depot/vcf9/PROD/COMP`。
- `/mnt/rhel-dvd`=/dev/sr0(15.5G ISO)=all-in-one DNF repo。gw 10.0.0.1、DNS 10.0.0.200。
- 🔴 **這台出不了外網**（dl/vcf.broadcom.com=000、外部 DNS 解不到）→ **fleet 補料無法從這台下載**，要在本機 Windows(有外網)下好再搬進來。
- **COMP 現有 9 個**（fleet 全缺，符合 902 fail 表）：ESX_HOST/NSX_T_MANAGER/SDDC_MANAGER_VCF/VCENTER/VCF_OPS_CLOUD_PROXY/VIDB/VRA/VROPS/VRSLCM。
- **無既有 download tool** → 上傳 0400 tarball 到 `/opt/vcf-depot/vcf-download-tool-9.1.0.0400.tar.gz`（背景 task b6lcv3hde）。

## Software depot ID（使用者要的「software id」，2026-07-27 釐清）
- **定義**：= **Software depot ID**（machine/service ID），拿去 **VCF Business Services Console https://vcf.broadcom.com →「Software depot Registration」** 換 **activation code**。
- **指令**（0400 有 `configuration` 子命令）：
  - 產生：`vcf-download-tool configuration generate --software-depot-id`（`--force` 覆蓋已存在）
  - 讀回：`vcf-download-tool configuration get --software-depot-id`
  - 輸出範例（本機 Windows 這份工具，僅示範）：ID `56b8b911-306e-4ddb-b216-bdece6c721b1` + 註冊連結 `https://vcf.broadcom.net/vcf/clm/download-manager/register?serviceId=<id>`
- 🔴 **綁機器**：ID 對外換的 activation code 綁定該機器，**必須在客戶 rhel98-test 上產生**（本機產的對客戶無用）。→ 所以順序：先把 0400 放上 rhel98-test，再在上面 `configuration generate --software-depot-id`。
- 這條路 = activation code 路徑（可解 token 抓不到的 Compatibility v1/v2），跟純 token 下載互補。

### 🔴 網路根因＋修法（2026-07-28）— 不是 MAC learning
- rhel98-test 部在 **host 95**，但 **host 95 的 vSwitch0「VM Network」沒有 pnic uplink**（`Pnic:` 空）→ 標準 PG 成孤島，只能同機 VM 互通，ARP 不到 gw/DNS/任何 off-host 主機。（host 98 的 vSwitch0 有 vmnic2，所以 gpvpn01 當初能上網。）
- **修法**：把 rhel98-test 的 vNIC 從「VM Network」改接 **VDS「MGMT」(dvportgroup-443)**（=vcf9depot(61) 用的、有 VDS uplink 跨 host 95）：`govc vm.network.change -vm rhel98-test -net /Datacenter/network/MGMT ethernet-0`。改完立刻 gw/DNS/8.8.8.8/broadcom 全通。
- ⚠️ **deploy 時的教訓**：OVF 原網路叫 `MGMT`，我當初誤映射成標準「VM Network」。host 95 上正確的是 VDS MGMT。
- **擴碟**：depot /dev/sdb(xfs) 200→240G 線上擴（`vm.disk.change -disk.label "Hard disk 2" -size 240G` + guest `echo 1>/sys/block/sdb/device/rescan` + `xfs_growfs /opt/vcf-depot`）→ 59G free。

### 🔄 fleet 補料下載中（2026-07-28，用 activation code）
- rhel98-test 上：`tools0400/bin/vcf-download-tool binaries download -d=/opt/vcf-depot/vcf9 --depot-download-activation-code-file=/opt/vcf-depot/activation-code.txt --id=<9 fleet ids> --ceip=DISABLE`（背景 nohup，log `/tmp/fleet-dl.log`，非 harness-tracked 要自己 poll）。
- activation code 認證 OK（"credentials are valid, 138 elements"）。9 組正在抓，VSP(vmsp-platform ~17G)最大。
- **待下載完成後**：① `metadata download`(補完整型錄+Compatibility v1/v2) ② `chmod -R a+rX /opt/vcf-depot/vcf9/PROD`(nginx) ③ 驗證 COMP 有 fleet + nginx 服務 ④ 關機匯出交付。

### 📦 交付給客戶 = 打包 fail(fleet) 給客戶合併(2026-07-28)
- 使用者要**只把 9 組 fail(fleet) 打成包上傳給客戶**(客戶已有 success 170GB,只缺 ~22GB fleet delta)。
- 🔴 **metadata 必須另外處理**:客戶 depot 是 902 建的、型錄根本沒 fleet 定義 → 只給 binaries 客戶 SDDC Manager「看不到」→ **要連完整 metadata 一起給**。
- **交付 = 2 個 tar**(腳本 `scratchpad/pkg-fleet.sh`,下載完成後跑):
  - `fleet-binaries-9.1.0.tar` = `binaries export -d=/opt/vcf-depot/vcf9 --id=<9 fleet> --depot-file=...`
  - `metadata-full-9.1.0.tar` = `metadata export -d=/opt/vcf-depot/vcf9 --depot-file=...`(完整型錄+Compat v1/v2)
  - 產物放 `/opt/vcf-depot/deliver/`,附 sha256。客戶把兩包都解進自己 `PROD/`。
- Compatibility v1/v2 = 純 token 抓不到、activation code 才有 → 一併交付。

### ✅ 完成（2026-07-28）— fleet 下載 + 打包
- **下載**：9 組 fleet 全 SUCCESS（VSP 18G + 8 小組，總 ~22GB），Binary Download Summary=9 SUCCESS/0 FAILED。
- **打包**（`/opt/vcf-depot/deliver/`）：
  - `fleet-binaries-9.1.0.tar` = **23,014,755,840 B (23GB)**，sha256 `d95f3a665f15bb4fda46ab801ee2bb309b16d88815f342ab61a9dcef96040e89`
  - `metadata-full-9.1.0.tar` = **70,495,744 B (67MB)**，sha256 `0dcbe4744bdf7d65d7c7d5efb5c2af43c2ec98a1205e0f81f775d0fef77ab189`
- 🟢 **關鍵驗證**：fleet tar 內含 `PROD/COMP/<9 fleet>` binaries **+ 完整 metadata**（productVersionCatalog 1.19MB=完整138型錄含既有+fleet、vcfManifest、Compatibility v1/v2、vsan hcl）→ **fleet tar 單獨自足**，客戶 `tar -xf fleet-binaries-9.1.0.tar -C <depot>/` 進 PROD 上層即補齊 binaries+升級型錄，不會蓋掉既有元件可見性。tar 另含 3 個小 VCENTER upgrade_info（無害）。
- **待辦**：把 tar 送出（pull 到 Windows / nginx serve / 使用者自 VM 上傳）— 待使用者定。rhel98-test 本身 depot 也已完整（18 元件），若要當 appliance 出貨亦可。
- ✅ **import 指令實測驗證**（2026-07-28，用 .72 建模擬客戶 depot）：`import-fleet.sh` 四步全綠；既有 VCENTER marker 存活未被覆蓋、殘缺型錄 74B→完整 1.19MB、9 fleet 補齊、權限 a+rX。test-import 已清。交付檔含 `import-fleet.sh`/`push-to-customer.sh`/`SHA256SUMS.txt`/`IMPORT-README.md`。

### 🔄 VCF Installer 驗證 depot download（2026-07-28 進行中）
- installer OVA = **`E:\9.1\VCF-SDDC-Manager-Appliance-9.1.0.0.25371088.ova`**（VCF9.1 installer 就是 SDDC Manager appliance 映像,Photon）。
- 部署 `vcf-installer-verify`（ovftool,背景 task bm3r429zd,log `dev-docs/_installer-deploy.log`）：
  - datastore vmfs-samsung4t、diskMode thin、**接 VDS「MGMT」**（`--net:"Network 1=MGMT"`）
  - props：IP **10.0.0.71**/255.255.254.0/gw 10.0.0.1/DNS 10.0.0.200/domain home.lab、hostname vcf-installer.home.lab、ntp 10.0.1.254、ROOT_PASSWORD+LOCAL_USER_PASSWORD=`VMware1!VMware1!`
- **待部署完成後**：開機→等 installer 服務起（https://10.0.0.71）→設 depot 指向 rhel98-test（HTTP 8888 no-auth 或 HTTPS 443+CA）→觸發 bundle download（挑 fleet 如 VSP/SDDC_MANAGER）→驗證抓得到。
- 參考坑：舊 install9.1(10.0.1.4) 的 INSTALLER_CONNECT_TROUBLESHOOTING（CA import、depot 設定放 offlineAccount、URL 用 IP）。

### ✅ Installer download 驗證通過（2026-07-28）
- `vcf-installer-verify` @ 10.0.0.71 開機OK（admin@local/root 皆 `VMware1!VMware1!`；UI /ui；後端 firstboot ~2-3 分後 /v1/tokens=200）。
- **depot 設定成功**：`PUT /v1/system/settings/depot` body `{"depotConfiguration":{"isOfflineDepot":true,"url":"http://10.0.0.72:8888"}}`（**HTTP 8888 no-auth 免 CA**；443 HTTPS 會 `VMWARE_DEPOT_CONNECT_FAILURE` SSL 憑證坑要 import CA）→ 回 **DEPOT_CONNECTION_SUCCESSFUL**。
- `GET /v1/bundles` = 232 bundle，**fleet 全在**（id 與補件一致：aa88f811=VSP、cfdc3829=TELEMETRY…）。
- **實測下載**：`PATCH /v1/bundles/{id} {"bundleDownloadSpec":{"downloadNow":true}}` 觸發 TELEMETRY(cfdc3829)→ task **SUCCESSFUL** → installer 上 `/nfs/vmware/vcf/nfs-mount/bundle/<id>/<id>/telemetry-acceptor-9.1.0.0.25181946.tgz` = **103,101,194 bytes 真實檔**。
- 🟢 **整個交付端到端驗證通過**：902缺fleet → 0400+activation code補 → 打包 → import(.72實測) → **真installer download成功**。
- 驗證用 VM `vcf-installer-verify` 可留可刪（純驗證用）。

### ✅ 已在 rhel98-test 上完成（2026-07-27）
- 0400 工具放上：`/opt/vcf-depot/tools0400/bin/vcf-download-tool`（tarball 存 `/opt/vcf-depot/vcf-download-tool-9.1.0.0400.tar.gz`）。
- **產生的 Software depot ID = `<depot-id>`**（在 rhel98-test 上、綁這台；**離線可產**，不需外網）。
- 換 activation code：`https://vcf.broadcom.net/vcf/clm/download-manager/register?serviceId=<serviceId>` 或 vcf.broadcom.com→Software depot Registration。
- guest-ops 執行細節：多層 `bash -c "...>out; echo \$?"` 複合會被吃掉→**改用直接參數呼叫**(`guest.run ... tar -xzf ... -C ...`)或 `guest.run ... bash /tmp/xxx.sh` 最穩；工具首次跑會印 CEIP，用 `printf 'DISABLE\ny\n' |` 餵。

## 使用者定案（2026-07-27）
1. **主機來源**：新建 RHEL 9.8 VM（需 ISO）。
2. **角色範圍**：**只架 VCF depot**（不做 DNF repo all-in-one）→ 用 `create_vcf9_depot_server_rhel.sh`。
3. **資料來源**：用**新版 vcf download tool 重新下載**（不從 61 rsync）。

## 現況探測（2026-07-27）
- 網路上**無任何 RHEL** — 10.0.0.61 / 10.0.0.72 都是 Ubuntu（SSH banner=Ubuntu），10.0.0.71 down。
- `DEPOT_SERVERS.md` 記的「rhel98-test 10.0.0.72」= 紙上規劃，**實際沒建**（.72 是 gpvpn01 Ubuntu）。
- 現有 depot 10.0.0.61 Ubuntu 還活著：`/depot/PROD` ~383GB，HTTPS 443 回 401（nginx basic auth 正常）。
- 外層 vC **10.0.0.101 (8.0.3)**，govc 可連（administrator@vsphere.local / <redacted>）。
- Datastore 空間：vmfs-wdblue4t 3.7TB free、vmfs-samsung4t 3.7TB free、ForNFS 2.6TB free（depot 需 ~400GB，充足）。
- **最新 download tool** = `E:\vcf-download-tool-9.1.0.0400.25570101.tar.gz`（要用這支）。
- token = `E:\9.1\.broadcom-token`（Pqi6C1e6o1tWi2oV5dgMNPy4niq20TZ2，2026-07-10 驗證有效）。
- govc = `E:\9.1\tools\govc.exe`。

## 座標定案（2026-07-27）
- **目標 IP `10.0.0.71`**（目前 down/空著）、**hostname `rhel-depot.home.lab`**。
- **不動現有 Ubuntu depot 61**，RHEL 建好驗證 OK 後再視需要切換。
- DNS：需在 AD 10.0.0.200 補 `rhel-depot.home.lab → 10.0.0.71` 正/反解（用 Set-DnsRecords 或手動）。

## 🔴 目前阻塞（唯一）
- **等使用者把 RHEL 9.8 ISO 拷到 `E:\9.1\`**（檔名任意，我會自動偵測 `*rhel*9*.iso`）。到位後即開工。

## 902 vs 0400 download tool 實測（2026-07-27，同一 token）
- **902** (`E:\dltool902`)：`binaries list 9.1.0.0` = **79 bundle / 14 元件**；**整層 fleet 全缺**（VSP/VCF_FLEET_LCM/VCF_SDDC_LCM/DEPOT_SERVICE/VCF_SALT/VCF_SALT_RAAS/TELEMETRY_ACCEPTOR/VCF_OBSERVABILITY_DATA_PLATFORM/VCFMS_METRICS_STORE/VCF_LICENSE_SERVER/VCF_SERVICE_VCD_MIGRATION_BACKEND bundles=0）。註：902 的 `releases list`(型錄)反而看得到 60 元件含 fleet → **型錄看得到但抓不到，會誤判**。
- **0400** (`E:\9.1\dltool0400`，解自 `E:\vcf-download-tool-9.1.0.0400.25570101.tar.gz`)：`binaries list 9.1.0.0` = **138 bundle / 25 元件**，fleet **全補齊**。**自帶 win32+lin64 兩份 JRE + .bat**，Windows/RHEL 皆可跑。
- 清單存證：`dev-docs/_902-binaries-list.txt`、`dev-docs/_0400-binaries-list.txt`。
- **結論：資料一律用 0400 下載。**
- **E: 目前 free = 251GB**（舊記憶的 48GB 已過時）→ 可選擇先在 Windows 用 0400 抓，之後 LAN 拷到 RHEL。

## 執行計畫（ISO 到位後）
1. RHEL 9.8 ISO 上傳到 datastore（govc datastore.upload）。
2. govc 建 VM（4 vCPU / 8GB / OS 100G + data 400G），掛 ISO，裝 RHEL 9.8（min install + guest tools）。
   - 或若使用者提供 kickstart 可自動化；否則手動裝 or 引導。
3. 設 static IP / hostname、DNS。
4. scp repo 腳本 + download tool tgz + token 上去；`sed -i 's/\r$//'`（CRLF 坑）。
5. 跑 `create_vcf9_depot_server_rhel.sh --fqdn <fqdn> --ip <ip>`（nginx HTTPS 443 + basic auth，SELinux/firewall 自理）。
6. 解壓 9.1.0.0400 download tool → `binaries download` 拉 INSTALL 到 `/opt/vcf-depot/vcf9/PROD`（token）。
7. （選）疊加 9.1.0.0400 metadata zip 補 Compatibility v1/v2。
8. `chmod -R a+rX /opt/vcf-depot/vcf9/PROD`；nginx 驗 200/206/401。
9. import CA 進 installer、把 installer depot 指向新 RHEL depot。

## 坑備忘（來自舊 Ubuntu depot 經驗）
- repo 腳本在 E: 帶 CRLF → Linux 上先 `sed -i 's/\r$//'`。
- 下載工具**一定用 9.1 系列**（9.0.2 只看到 55 元件漏 fleet）→ 現用 9.1.0.0400。
- RHEL 特有：SELinux enforcing 要 `semanage fcontext httpd_sys_content_t` + `restorecon`（腳本已內建）；firewalld 開 443。
- depot URL 給 installer 用 **IP 不用 FQDN**（installer 對 FQDN 回 invalid URL）；帳密放 `offlineAccount:{}`。
