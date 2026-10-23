# 測試:5.2.1 vSAN cluster 搬進 9.1 vCenter 再 convert 成 mgmt domain(2026-09-18 開案)

## 目標(使用者原話)
用 installer 部 9.1 mgmt → 拆 VCFMS → 用 VCF 5.2.1 部一個 vSAN cluster → 拆 SDDC Manager
→ 該 cluster 搬到同一個 vC(9.1)下當另一個 cluster → convert 成 9.1 mgmt domain。
順序確認:**先做 9,再部 5**(兩套同時存在)。

## 決策
- VIDB SSO federation:**不啟用**(使用者 09-18 指示),避免拆 VCFMS 後 vCenter 登入壞。
- 搬 cluster 依 KB 326849(IgnoreClusterMemberListUpdates=1 → 主機加 Datacenter 層 → 進 cluster → 設回 0)。

## 09-18 盤點結果
- 外層 .95:32 lCPU / 1024GB,CPU 已 96.7%、RAM 72.8%;4 台 M02 nested ESXi 各 256GB 全佔。
  → 5.2.1 的 4 台 nested ESXi 8.0U3 要放進來,M02 nested 得先縮到 192GB/台。
- .97/.98 各 ~128GB,不夠放 5.2.1 四台。
- datastore:ForNFS 剩 406GB(緊);vmfs-samsung4t / wdblue4t 各剩 ~2.8TB → 5.2.1 nested 放這兩顆。
- 媒體:✅ 全在 `C:\Users\Administrator\OneDrive\桌面\VCF\`
  - `VMware-Cloud-Builder-5.2.1.0-24307856_OVF10.ova`(另有 5.2.2.0)
  - `Nested_ESXi8.0u3b_Appliance_Template_v1.ova`(5.2.1 BOM 要 8.0U3b build 24280767,用 u3b 那顆)
  - autodeploy:William Lam 腳本 `autodeployvcfm01-vcd-95.ps1`(2026-06-20 最後一次在 .95 跑過)+ `vcf-config-*.json`
    - 預設 4 台 × 12vCPU/96GB、cache 100G/cap 700G、1 台 NSX Manager、IP 10.0.1.4-13(m01 段)、datastore 寫 `vsanDatastore`(已死,要改)
- 參考 repo:`kostenyang/debug-vcf521`(5.2.1 nested 除錯手冊)
  - `03-upgrade-8.0u3-to-9.1.md` §nsx-gate / §tnp / §vcf-warning = **步驟④ 拆 NSX + SDDC Mgr 的實測配方**
  - 🔴 `com.vmware.sddcManager` / `com.vmware.vcf.client` / `com.vmware.lcm.client` extension 拆完會復活,要解除兩次
    → 這個坑在 ②(拆 9.1 VCFMS 後)同樣要查,不然 ⑥ convert 可能判定「已是 VCF」

## 待決 / 待辦
- [ ] ① 是重新 bring-up 一套 9.1,還是拿現在的 M02 當「9」?
- [x] 5.2.1 媒體與腳本已找到(桌面 VCF 資料夾)
- [ ] 改 autodeploy 腳本:datastore→vmfs-samsung4t、IP 段避開現用、記憶體依 .95 餘量調(96GB×4=384GB 目前放不下)
- [ ] 查 9.1 convert 的版本限制:同一 vC 混 ESXi 9.1 + 8.0U3 cluster 是否允許
- [ ] 抓 KB 443899(NSX 環境搬 vCenter)
- [ ] bring-up / 長任務前停用兩個開關機排程

## 已知坑(規劃階段列出)
- ⑥ 不能用做過 ① 的同一台 installer(DB 記著舊 domain)→ 重部 installer OVA。
- ④ 拆 SDDC Mgr 5.2.1 前,先在 NSX 4.2 remove transport node 卸 VIB,再刪 NSX Manager。
- ⑤ vDS 要先把 vmk 遷 vSS 或匯出/匯入(不勾保留 portgroup ID、新 vDS 換名);storage policy 在 vC9.1 重建。

## 2026-09-18 11:25 決策 + 現況更新
- 使用者拍板:**清掉 M02 重新 bring-up 9.1**;新 nested ESXi 分放 `vmfs-samsung4t` + `vmfs-wdblue4t`(2+2)分散 IOPS。
- 11:22 實查:4 台 `vcf-m02-esx0N-91` **已從外層 vCenter 消失**(非本 session 刪的),.95 記憶體 1.4%、ForNFS 剩 5574GB;
  10.0.1.14/18/19/22、10.0.0.172 全 down。DNS 記錄(vcf-m02-*)還在,可沿用。
- 外層剩下可用:`vcf-m02-inst02`(0400 installer, 10.0.1.6, poweredOff, samsung4t)、`vcf-installer-verify`(10.0.0.71, 做過 08-23 bring-up, DB 有舊 domain → 不用)。
- depot:`http://10.0.0.61:8888` 200,PROD/COMP 26 元件齊全(含 SDDC 0400 / NSX 0200 INSTALL ova 已補)。
- 配置草案:9.1 nested 4×24vCPU/192GB(留 256GB 給 5.2.1 4×64GB)→ samsung4t×2 + wdblue4t×2;5.2.1 nested 之後放 ForNFS。

## 2026-09-18 13:35 執行開始(Phase 1:9.1.1)
- 版本改 **9.1.1**(使用者指定);depot 61 9.1.1 BOM 逐檔驗證 OK(缺的只有選配服務)。
- 使用者決策:**bring-up 跑到 NSX 完成就中斷,不部 VSP/VCFMS**;建議中斷點 = 「Deploy SDDC Manager」之前(vC 不留 sddcManager extension)。
- layer1 腳本已改:192GB/台 + `$NestedESXiDatastoreMap`(esx01/03→samsung4t、esx02/04→wdblue4t),13:35 起跑,log `E:\9.1\layer1-deploy-911-20260918.log`。
- 9.1.1 installer:OVA 從 depot 抓到 `E:\9.1\VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova`,govc import 為 `vcf-m02-inst01-911`(10.0.1.4 / samsung4t / Trunk-Nobinding),spec `$TMP/inst911.filled.json`,log `E:\9.1\inst911-import.log`。
- 待做:nested ESXi 升 9.1.1(profile `ESXi-9.1.1.0-25714478-standard`,depot http://10.0.0.61:8888/PROD/COMP/ESX_HOST/VMware-ESXi-9.1.1.0.25714478-depot.zip)→ spec version 改 9.1.1.0 → Apply-VspRecipe(-SkipFtt0, InstallerVmPattern 'vcf-m02-inst01-911')→ validate → bring-up → 盯到 NSX 完成後關 installer。

## 文件查證(2026-09-18 14:05)
- **9.1 convert 最低版本**(techdocs 9.1 "Converge your existing vCenter instance and ESX hosts"):
  vCenter 8.0U3a / **ESX 8.0U3** / vSAN 8.0U3 / NSX 4.2.1(選配)。→ 5.2.1 的 ESXi 8.0U3b 在支援範圍內。
  「同一 vC 內 ESXi 9.1.1 + 8.0U3b 混版」文件沒寫 → 這就是本測試要驗的點。
- 不支援:ELM、baseline(非 vLCM image)叢集、VCHA、DHCP vmk、Cisco vSwitch。VDS 需 8.0+;vmk 靜態 IP。
  ⚠ 5.2.1 bring-up 建的叢集是 vLCM image 模式(`clusterImageEnabled=true` 預設)→ OK;若當時用 baseline 會被擋。
- **KB 443899**(vSAN cluster 帶 NSX 搬 vCenter):搬之前**先在來源 NSX 把 transport node 的 VIB 優雅移除**,
  再照 KB 326849 3.2 以後(vDS→vSS)搬;搬完再重新裝 NSX。與 debug-vcf521 §nsx-gate 一致。
- 狀態:9.1.1 installer(vcf-m02-inst01-911 / 10.0.1.4)depot 61 已接、14 個 bundle 下載中;validation 除 bundle 外全過;
  spec `vcf9.1-lab/layer2-bringup/bringup-911-20260918.json`(version 9.1.1.0)。

## 14:19 bring-up 已送出
- sddcId **523a8f3e-c110-46b2-b6ab-4cc6ea2259ea**(installer 10.0.1.4 / vcf-m02-inst01-911),318 任務。
- 🔑 9.1.1 任務順序:vCenter → **Deploy SDDC Manager** → SDDC Manager 建 vSAN/VDS → NSX → `Activate Newly Imported VCF Domain` → VSP/VCFMS。
  NSX 是 SDDC Manager 部的 → 「裝到 NSX 停」時 SDDC Manager 已存在,且 vC 已有 `com.vmware.sddcManager` extension(任務 `Register SDDC Manager Extension in vCenter`)。
- 看門狗 `E:\9.1\bringup-911-watchdog.sh`(log `bringup-911-watchdog.log`):`Activate Newly Imported VCF Domain` SUCCESSFUL 或 VCFMS 任務開始 → 關 installer(外層)+ SDDC Manager(內層 10.0.1.19)。
- 切完後待做:刪/保留 SDDC Manager VM、vC 解除 sddcManager/vcf.client/lcm.client extension(會復活,解兩次)、確認 vC+NSX+vSAN 正常。
- 踩到的小坑:esxcli 不吃 http depot URL(要本機檔);ESXi 防火牆擋 8888 → 暫時關防火牆 wget 到 /scratch;tee 產 CRLF 害 bundle id 帶 \r → HTTP000;curl 在 while-read 迴圈要 `</dev/null`。

## 14:30 5.2.1 平行部署啟動(使用者:沒 VCFMS 不會那麼占 CPU)
- 工作目錄 `E:\9.1\vcf521-conv\`:`autodeploy-521-conv.ps1`(從桌面 autodeployvcfm01-vcd-95.ps1 改)
  - 改:CB → `vcf-m01-cb01-conv` **10.0.1.3**(10.0.1.4 被 9.1.1 installer 占;DNS A/PTR 已改指 .3)、datastore ForNFS、64GB/12vCPU、cache100/cap600、
    ESXi/vC 密碼統一 `VMware1!VMware1!`、CB admin/root `Kq7r!Tz9@Mx5Wbn3`(CB 密碼規則:≥15 無字典字)、`clusterImageEnabled: true`(convert 不支援 baseline)、deployCloudBuilder=0
  - nested VM 名 `vcf-m01-esx0N-vcd`(hostname vcf-m01-esx0N.home.lab,10.0.1.10-13),log `run-521-layer1.log`,spec 產出 `vcf-config-521-conv.json`
  - CB 用 govc import(`cb.filled.json`,log `cb-import.log`)—— 6 月 PowerCLI Import-VApp 會吃掉密碼屬性
  - 5.2.1 網路(6 月實測可行):vMotion 10.0.3.x / vSAN 10.0.4.x 都 vlanId 0(untagged 同 L2)、TEP VLAN 2005、1 台 NSX small、vC tiny
- 待:CB 起來(~10 min 服務)→ 用 `bringup-vcd-95.ps1` 邏輯(token auth)validate → deploy

## 15:17 5.2.1 bring-up 已送出(CB task 9f84839e-6d1b-498a-b769-b26d3ed646b9,161 任務)
- CB `vcf-m01-cb01-conv` 10.0.1.3 up;**API 用 Basic Auth**(POST /v1/tokens 回 invalid csrf token,跟 6 月同症狀;debug-vcf521 00-access 寫的 Basic 才對)
- 🔴 6 月腳本的 license key 對 5.2.1 DLF 無效(4 項 FAILED)→ 換 `vcf-m01-52.json`(2 月)那組 <key1>/<key2>/<key3>/<key4> → validation 全 SUCCEEDED
- 🔴 govc import 坑:`pgrep` 這台沒有 → 等待迴圈秒退,在 OVF 注入前就開機 → 砍掉重匯,spec 用 `PowerOn=true` 讓 govc 注入後自己開
- watcher `vcf521-conv/watch-521.sh` → `bringup-521-watch.log`
- 同時 9.1.1:29/318,SDDC Manager 已部好,在設定 base image repo

## 使用者指示(15:30):步驟⑤ 搬 cluster 要出文件
- 5.2.1 那組 vSAN cluster 換到 9.1.1 vCenter 時,照 KB 326849(+443899 NSX)做,**UI 操作走 CDP(cdp-live.mjs 有頭模式)並逐步截圖**存本機 PNG,之後進 docx。
- 截圖目錄規劃:`E:\9.1\doc-shots\vsan-move-52-to-91\NN-xxx.png`;CLI 步驟(esxcfg-advcfg、esxcli vsan cluster get)用終端輸出文字附錄。
- 工具:`tools/start-cdp-chrome.ps1 -WindowSize '1680,1050'`、`tools/cdp-live.mjs`;runbook 在 `kostenyang/lab-info` runbooks/cdp-browser-automation.md。

## ✅ 16:36 9.1.1 切點達成(269/317)
- installer `vcf-m02-inst01-911` poweredOff;SDDC Manager `vcf-m02-sddcm01` guest shutdown → poweredOff(**保留未刪**,convert 前再刪)。
- 現況:vC 9.1.1 `10.0.1.19`(m01-dc01 / m01-cl01,4 台 connected)、vSAN `m01-cl01-ds-vsan01` 4TB、NSX 9.1.1 `10.0.1.20`(cluster STABLE,4 台 TN success,VIP .21)。
- vC extension:`com.vmware.sddcManager` + `com.vmware.vcf.client` 已 unregister(govc extension.unregister);`com.vmware.lcm.client` 是 vC 自己的(URL 在 vc01),**沒動**。
  ⚠ 之後要再查一次有沒有復活(SDDC Manager 已關,理論上不會)。
- VSP/VCFMS/Ops/fleet:**完全沒部**。
- 待:5.2.1 bring-up 完成(在 NSX 階段)→ 拆 5.2.1 NSX/SDDC → 搬 cluster(CDP 截圖)→ convert。

## 17:45 5.2.1 bring-up 第一次失敗 → 處理中
- 97/161 `Configure CEIP on NSX Managers` FAILED。NSX cluster STABLE、TN 4 台 success、VIP OK,但 `GET /api/v1/telemetry/config` 回 500
  `upstream connect error ... delayed connect error: 111`(common-service 連不到 telemetry 後端);`node/services/telemetry` 原本 stopped,start 後 running 但 API 仍 500/timeout。
- 根因判斷:NSX small 16GB 在 nested 剩 664MB free,telemetry 後端起不來。
- 處理:18:04 NSX Manager 關機 → 16GB→**24GB / 4→6 vCPU** → 開機;等 STABLE + telemetry API 200 後 `PATCH /v1/sddcs/{id}` retry。

## ✅ 19:14 5.2.1 bring-up COMPLETED_WITH_SUCCESS(retry 後)→ 19:50 步驟④ 完成
- 測試 VM `conv-testvm01/02`(photon)放在 vcf-m01-cl01-ds-vsan01 上,開機中(帶資料搬遷的驗證物)。
- 「搬遷前」截圖 00-13(來源 vC/vSAN/NSX/SDDC Manager)在 `E:\9.1\doc-shots\vsan-move-52-to-91\`;
  CDP 坑:vC8 登入頁 `#username/#password/#submit`(fill+realClick);NSX 中文 UI 按鈕是「登入」不是 LOG IN;NSX hash route 導不過去 → 從概觀點「4 個主機」;
  vSphere Client 漢堡選單用 CDP 座標點 (30,66)(用 selector 會點到意見反應笑臉)。
- ④ 拆 NSX:UI 系統→主機→勾叢集→「移除 NSX」(截圖 20-23)→ 4 台 VIB 0(用 `govc host.esxcli`,bring-up 後 ESXi SSH 已關)→ API 刪 TNP + compute manager(24)。
  vLCM image 只剩 vsphere-ha solution,NSX solution 已自動移除。
- SDDC Manager `vcf-m01-sddcm01`、NSX `vcf-m01-nsx01a` **guest shutdown 保留**;來源 vC extension sddcManager/vcf.client 已 unregister,nsx.management.nsxt 隨 compute manager 刪除自動消失。
- 現況 5.2.1 側 = 純 vSphere 8.0U3b:vC 10.0.1.9 + vcf-m01-cl01(4 台,vSAN 2.34TB,vDS vcf-m01-cl01-vds01,vLCM image)。
- 下一步⑤:KB 326849 —— 每台 IgnoreClusterMemberListUpdates=1 → vDS vmk 遷到 vSS(或匯出 vDS)→ 目標 vC 建 cluster(HA/DRS off,vSAN 開)→ 主機加 Datacenter 層 → 搬進 cluster → policy 重建套用。

## ✅ 20:20 步驟⑤ 完成:5.2.1 vSAN cluster 帶資料搬進 vC 9.1.1(KB 326849)
- 前置:`esxcli vsan cluster get` 4/4、`/VSAN/IgnoreClusterMemberListUpdates=1`(cli/01)、lockdown 本來就 disabled。
- vDS→vSS:`vcf521-conv/Migrate-VdsToVss.ps1`(vSwitch0 用閒置 vmnic2/3 起、MTU 9000、pg Management Network/vMotion/vSAN/VM Network 全 VLAN 0、
  VM NIC 先搬、vmk2→vmk1→vmk0、離開 vDS 再把 vmnic0/1 加回 vSS)。🔴 `Set-VMHostNetworkAdapter -PortGroup` 只收 dvPG,vDS→vSS 要用
  `NetworkSystem.UpdateVirtualNic(spec.Portgroup=<vSS pg>, DistributedVirtualPort=null)`。
- 目標 vC 9.1.1 建 cluster `vcf-m01-cl01`(govc cluster.create + cluster.change -vsan-enabled -drs/ha false,autoclaim off)。
- 搬主機:esx02 UI「中斷連線」OK,但 **UI「從詳細目錄中移除」在 vSAN cluster 的主機上灰掉** → `govc host.remove`;
  esx03/04 全 govc(host.disconnect→host.remove→目標 host.add -noverify(DC 層)→cluster.mv);
  esx01 跑舊 vC:先 `vm.power -s vcf-m01-vc01`,舊 vC 掛了後 `host.add -force`。每台加入後 vSAN 仍 4/4 HEALTHY,SubClusterUUID 不變(523b5f0a…)。
- 收尾:IgnoreClusterMemberListUpdates=0(cli/02);VM policy 全變 None → 重套 vSAN Default Storage Policy(testvm01 走 UI 截圖 70-74,其餘 PowerCLI Set-SpbmEntityConfiguration)→ 全 compliant;
  HA/DRS 開;🔑 **vSAN Health 出「vCenter state is authoritative」(hosts 顯示 Different VC=舊 vC UUID)→ TROUBLESHOOT → REMEDIATE INCONSISTENT CONFIGURATION**(截圖 83-86),
  vSAN plugin 內的按鈕主 frame querySelector 看不到,要用 CDP 座標 real click。
- 截圖 00-86 + cli/ 在 `E:\9.1\doc-shots\vsan-move-52-to-91\`。舊 vC/NSX/SDDC Manager VM 已自動註冊在新 vC(關機)。
- 下一步:目標端 vSS→vDS(convert 要 VDS 8.0+;vDS 版本要選 8.0.3 才吃得下 ESXi 8.0U3 主機)→ 步驟⑥ convert。

## 21:40 步驟⑥ convert 準備(進行中)
- 目標端 vSS→vDS 完成:`vcf521-conv/Migrate-VssToVds.ps1`(全 API:UpdateVirtualSwitch 改 vSS uplink、ReconfigureDvs_Task 加 host/pnic、UpdateVirtualNic 用最小 HostVirtualNicSpec 只帶 DistributedVirtualPort、ReconfigVM 換 VM NIC backing、RemoveVirtualSwitch)。
  坑:PowerCLI Add-VDSwitchPhysicalNetworkAdapter 撞 `_connectionId`;`$vds`/`$Vds` PowerShell 變數不分大小寫互蓋;vDS uplink 2→4 才能收 4 張 vmnic;UpdateVirtualSwitch 拿掉 pnic 時 NicTeaming.NicOrder.ActiveNic 也要同步改。
- 新 installer `vcf-m02-inst02-911` 10.0.1.6(舊 0400 inst02 已 destroy);depot 61 接好;bundle 下載中;timeout 配方已套;舊 `vcf-m02-sddcm01` VM 已 destroy(名稱釋放)。
- converge spec:`vcf521-conv/converge-m02-911.v2.json`(骨架來自 v8tov9/converge 範本):vC/NSX 都 `useExistingDeployment: true`(SHA256 thumbprint),xRegionNetwork=SDDC-DPortGroup-VM-Mgmt,clusterSpec m01-dc01/m01-cl01,**沒有 datastoreSpec**。
- 🔑 validation 發現:
  1. **「Existing Components」把兩個 cluster(m01-cl01 9.1.1 + vcf-m01-cl01 8.0U3b)都掃了並通過** → 混版本多 cluster import 在驗證層是允許的(本測試核心問題,答案偏正面)。
  2. `datastoreSpec.existingDatastoreName` 會套到**每個** cluster → 多 cluster 時要拿掉。
  3. 兩個 cluster 的 vLCM 修復原則 `evacuate_offline_vms` 要 true(PUT /api/esx/settings/clusters/{id}/policies/apply)。
- m01-cl01 vSAN Storage Policy 已設 FTT=0(VSP etcd 配方);vSAN Default Storage Policy 保持 FTT=1 給搬過來的 VM。

## 22:00 步驟⑥ convert 已從 installer UI 送出(使用者要 UI 截圖)
- sddcId **9cdf40af-1889-4d0e-ba58-696e8a63607a**(installer 10.0.1.6),134 任務;watcher `vcf521-conv/watch-converge.sh` → `converge-watch.log`;任務清單 `converge-tasklist.txt`。
- UI 路徑截圖 100-112:登入 → 首頁 → Depot settings(bundle 全 9.1.1 downloaded)→ DEPLOY USING JSON SPEC → 上傳 converge-m02-911.v2.json(Summary)→ Validate & Deploy 11 項全綠(儲存 WARNING acknowledge)→ NEXT → progress viewer。
- 🔴 installer UI(Clarity)`clickText` 常沒反應 → 一律用 CDP 座標 real click;JSON 上傳用 eval 建 File+DataTransfer 塞進 `input[type=file]` 再 dispatch change(可行)。
- 任務裡有「Discover the existing domain from vCenter / Import the domain data / Assign imported tag to clusters」→ 就是多 cluster import 的路徑。

## ✅ 22:40 核心結論已達成:混版本雙 cluster import 成功進 SDDC Manager
- SDDC Manager 10.0.1.18 API:domain `vcf-m02` MANAGEMENT/ACTIVE,**clusters=2**:
  - `m01-cl01`(default, imageBased, 4 台 ESXi **9.1.1.0.25714478**, vSAN m01-cl01-ds-vsan01)
  - `vcf-m01-cl01`(imageBased, 4 台 ESXi **8.0.3-24280767**, vSAN vcf-m01-cl01-ds-vsan01)← 從 5.2.1 搬過來帶資料的那組
- 22:38 起在 VSP/VCFMS(90/134「Monitor VCF Management Services Deployment Task」),截圖 113/114。
- SDDC Manager `/ui/` 9.1.1 是空白頁(UI 已併進 VCF Operations),要看 UI 得等 Ops 部完。

## ✅✅ 2026-09-19 03:58 Converge COMPLETED_WITH_SUCCESS(133/133)
- 5 階段時長:Deploy SDDC Manager 27m / Convert existing vC+NSX 6m / VCF Management Platform(VSP)2h40m / Ops 1h24m / VCFMS 1h17m。
- 最終狀態(cli/03):domain vcf-m02 MANAGEMENT ACTIVE clusters=2;m01-cl01(9.1.1)+ vcf-m01-cl01(8.0.3-24280767);SDDC Manager 9.1.1.0.25713928。
- VCF Operations https://vcf-m02-ops01.home.lab(admin/VMware1!VMware1!)Inventory 樹:vcf-m02-converge → vcf-m02 → vcf-m02-vc01 → m01-dc01 → **m01-cl01 + vcf-m01-cl01**(截圖 125);115=installer 成功頁、120-124=Ops 登入/首頁/Build/Lifecycle。
- 未做:Ops 授權註冊(90 天評估)、fleet 接 offline depot、開關機排程仍 Disabled(新環境 VM 名同 vcf-m02-*,恢復前要驗 shutdown 腳本清單含 vsp 節點名)。
- 舊 5.2.1 VM(vcf-m01-vc01/nsx01a/sddcm01)關機保留在 vcf-m01-cl01 上、installer inst01-911 關機保留、inst02-911(10.0.1.6)開著。
- 文件:指令對照稿 `vcf521-conv/COMMANDS-and-SHOTS.md`;截圖 00-125 + cli/01-03。

## 2026-09-19 04:40 Round 2 開始:路 2(新部 NSX、overlay over mgmt vmk0、無 TEP)
- 使用者決定實測路 2 給客戶用。清場:刪 converge 新部元件(sddcm01/vsp01×3/ops01/opsc01/license/runtime template)、NSX 9.1.1 從 m01-cl01 unprep → 刪 TNP/CM → 刪 NSX VM、vC extension/tag 清、刪舊 5.2.1 VM、重部 installer(10.0.1.4)、8 台 vmk0 MTU→9000。
- 前置確認:外層 VDS7 MTU 9000、nested vDS 9000、vC 未 federate VIDB(identity providers 空)。
- 16:15-16:35 清場進度:管理 VM 全刪(sddcm/vsp×3/ops/opsc/license/template)+ 舊 5.2.1 VM 刪;NSX 9.1.1「Remove NSX」對 vLCM cluster 只會拿掉 image 的 NSX solution,
  **VIB 要靠 vLCM remediation 才卸**(API DELETE TNC 回 26185「cannot be detached from vLCM enabled cluster」)→ 靜音 vSAN health(nvmeonhcl/perfsvcstatus/vsanenablesupportinsight)後 apply 才能跑(第一次被 Health Check 擋);
  vC extension sddcManager/vcf.client 已 unregister、vcf_imported tag+category 已刪;vcf-m01-cl01 四台 vmk0 MTU→9000;installer 兩台刪、`vcf-m02-inst03-911`(10.0.1.4)匯入中。
- 待:remediation 完 → 刪 TNP/CM(背景 loop)→ 刪 NSX VM → m01-cl01 vmk0 MTU 9000 → installer3 depot/bundles/timeouts → path-2 spec → UI 驗證/部署(截圖到 doc-shots/converge-path2-newnsx)。
- 16:40-17:05 路 2 前置新發現:
  - ESX 9.x 的 NSX host VIB 是 base image 內建(24 個 nsx-* 都在 9.1.1 image 裡),Remove NSX + remediate 後仍在、compliance COMPLIANT → 不用也不能卸。
  - 🔑 **round 1 converge 把 vcf-m01-cl01(8.0U3b)的 vLCM desired image 改成 9.1.1.0.25714478**(import 時 SDDC Manager 套 BOM 版本),cluster 變 NON_COMPLIANT(REBOOT_REQUIRED)= 等你去升。
    路 2 驗證新增檢查「vLCM image based → 請確認 compliance」→ 要先把 image 改回 8.0U3b:depot 沒 24280767 → `POST /api/esx/settings/depots/offline?action=createFromHost&vmw-task=true {"auth_type":"EXISTING","host":"host-32"}` 把主機映像抓進 depot → draft base-image 8.0.3-0.35.24280767 → commit。
  - 之後 compliance 仍 NON_COMPLIANT:solution `com.vmware.nsxt 4.2.1` 殘留(host 端 image 狀態,VIB 已 0)→ 靜音 vSAN 檢查(controlleronhcl)後 remediate(NO_IMPACT)。
  - 兩台 installer 刪,新 `vcf-m02-inst03-911` 10.0.1.4 depot/bundle/timeout 完成;path-2 spec `vcf521-conv/converge-m02-911-path2-newnsx.json`;NSX 9.1.1 VM 已刪、TNP/CM 刪、vC 無 nsx extension。

## 17:14 Round 2 converge(路 2:新部 NSX、overlay over mgmt、無 TEP)已送出
- sddcId **80e1f1cf-895d-4072-96d4-4aedea5b345e**(installer `vcf-m02-inst03-911` 10.0.1.4),**183 任務**(round 1 沿用 NSX 是 134);watcher `watch-converge2.sh` → `converge2-watch.log`;任務清單 `converge2-tasklist.txt`。
- 路 2 驗證:11 項全 Succeeded,只有 WARNING「cluster 是 vLCM image based,請確認 compliance」(兩個 cluster 都列,acknowledge 即可)+ 儲存 WARNING。**NSX install image 必須先下載完**(bundle 沒到會 FAILED)。
- 🔑 任務清單 113-124「Configure Clusters for NSX」是複數:Create TZs **per DVS**、Uplink profile per DVS、Host Switch Models **per Cluster**、TNPs、Transport Node Collections → 看起來會 prep 所有 cluster;結果待驗(vcf-m01-cl01 8.0U3b 會不會 prep、TEP 從哪來)。
- 截圖 doc-shots/converge-path2-newnsx/01-09。
- 18:17-18:38 🔑 路 2 核心答案:
  - converge(新部 NSX)對 **vCenter 下每個 import 的 cluster** 都建 TNP(`vcf-m02-vc01-<cluster>`)+ TNC,並 prep:8 台 transport node 全 success(18:38)。
  - **NSX 9.1.1 可以 prep ESXi 8.0U3b**:主機裝的是 `nsx-* 9.1.1.0-8.0.25691512`(8.0 flavor,25 個 VIB);9.1.1 主機用 image 內建的 `-9.1.` 版。
  - overlay over management(`skipNsxOverlayOverManagementNetwork:false`):TNP host switch `ip_assignment=NoIpv4`,主機**沒有新增 TEP vmk**(只有 vmk0/1/2 + vmk50 hyperbus),host_switch_states endpoints 空 → 不需要 TEP IP。
  - 8.0U3b 主機 vmk50(hyperbus)MTU 9000、9.1.1 主機 1500(自帶)。

## ✅✅ 2026-09-19 23:29 Round 2(路 2)COMPLETED_WITH_SUCCESS 181/181
- 階段耗時:Convert 4m50s / NSX 45m24s / VSP 2h21m / Ops 1h17m / VCFMS 1h12m。
- 最終:domain vcf-m02 ACTIVE clusters=2、8 台 ASSIGNED、NSX vcf-m02-nsx01(單節點 medium)、8 台 TN success。
- 交付:docx 更新為 47 頁 52 圖(新增第十章 路 2 + 附錄 C.2);v8tov9 commit 75fd87e(範本 3 + README 實測結果)。
- 現況:installer `vcf-m02-inst03-911` 10.0.1.4 開著;VCF Ops `vcf-m02-ops01.home.lab`;開關機排程仍 Disabled;Ops 未註冊授權。

## 2026-09-20 Round 3 需求(使用者):
1. 8.0 cluster 改用 vSS(無 vDS)→ converge 擋不擋?
2. 「vtep 不同的狀態可不可以跳過再 converge」→ 待使用者釐清(a: MTU 不同想跳過該 cluster / b: 舊 TEP 殘留 / c: 兩 cluster 不同 TEP 設定)。
- 可整個打掉重裝。先清場(同 round 2 流程)。
- 2026-09-21 00:09-01:05 round 3 teardown 收尾:
  - `del nsx` 坑:nsxcli 有 3 段 Y/N 互動,plink 一行指令要 `printf 'y\ny\ny\ny\ny\n' | nsxcli -c 'del nsx'`(不夠會 EOFError→「An internal error occurred」);8.0 host 要先 MM。8.0U3b 4 台 VIB 25→0(不用重開,vLCM 之後 compliance COMPLIANT——但要先 remediate 清 host 端殘留的 com.vmware.nsxt solution 記錄、先靜音 controlleronhcl)。
  - ESX 9.1.1 host `del nsx`:VIB 留(base image)、controller-info.xml 清空、所有 nsx 服務 chkconfig off,但 `/etc/vmware/nsx/appliance-info.xml` 仍留舊 manager(get managers 仍列 10.0.1.20 Standby)→ 手動改成空 `<appliance-proxies/>`(備份 .bak-r3)後 get managers 空。
  - vSAN 一次只能一台 host 進 MM(concurrentDecom),連續進要留間隔/重試。
  - inst04-911(10.0.1.4)depot OK、14 個 9.1.1 bundle SUCCESSFUL、tune.sh 已套。vC extension/tag 乾淨。兩 cluster vLCM COMPLIANT。
  - 新增 `vcf521-conv/Migrate-VdsToVss-r3.ps1`(Vc 10.0.1.19,先把 vmnic2/3 移出 vDS)。
- 01:05-01:15 **round 3 test 1:8.0 cluster 用 vSS 能不能 converge → 不能(驗證擋)**。
  - 做法:`Migrate-VdsToVss-r3.ps1` 把 vcf-m01-cl01 四台 vmk0/1/2 + VM NIC 全搬到 vSwitch0(vmnic0-3, MTU 9000),刪掉空的 vDS;vSAN HEALTHY 4、VM ARP 通(Photon 擋 ICMP)。
  - 用 path-2 spec(改 vcfInstanceName=vcf-m02-converge-r3)上傳 → 驗證 **Existing Components = FAILED**(NEXT 灰):
    - `cluster vcf-m01-cl01: Cluster does not have any DVS in use`(Remediation: Ensure cluster has at least one DVS in use)
    - 每台 host ×2:`VMKernel adapter management/vmotion is not assigned to a dedicated port group`(vSS 的 pg 不算;vSAN vmk 沒被點名)
    - 其餘 10 項 Succeeded;另有新 WARNING「VCF Installer Capacity Validation: Insufficient Storage 3743 GB < 4664 GB」(warning 可 acknowledge)。
  - 結論:converge 的 import 會檢查 vC 下**所有** cluster,任何一個 cluster 沒 vDS 就整個過不了;客戶 8.0 cluster 若是 vSS,converge 前一定要先 vSS→vDS(mgmt/vmotion 各自獨立 dvpg)。
  - 截圖 doc-shots/converge-r3-vss-mtu/01-08 + cli/01-02;validation id 71104145。
- 01:15-02:40 **round 3 test 2:8.0 cluster vDS/vmk 全 MTU 1500(9.1.1 cluster 9000)→ 驗證過、部署中**
  - `Migrate-VssToVds.ps1` 搬回 vDS(dvs-121);vmk0/1/2 + vDS MTU 改 1500(UpdateVirtualNic 要用「只帶 Mtu 的新 HostVirtualNicSpec」;PowerCLI view 顯示舊值,esxcli 才準)。8000 bytes DF ping 送不出(Message too long),1472 OK。
  - RE-RUN VALIDATIONS → 全過(Existing Components 只剩 vLCM WARNING;capacity WARNING)→ **驗證完全不看 MTU**。Acknowledge → deploy sddc 9afee39c(01:24 起)。
  - 02:25 進 Create Transport Node Collections:TNP/TNC 一樣兩個 cluster 都建(domain-c9 + domain-c30);02:37 vcf-m01-esx01(MTU 1500)transport node state=success、vtepless=true → **NSX 對 MTU 1500 的 vDS 不擋、照 prep**;無任何 per-cluster skip 選項(spec 只有 clusterSpec 指主 cluster)。
- 07:56 **round 3 converge COMPLETED_WITH_SUCCESS 181/181**(sddc 9afee39c;Convert 4m37s / NSX 47m39s / VSP 2h30m / Ops 1h25m / VCFMS 1h14m)。SDDC Manager:domain vcf-m02 ACTIVE、2 cluster、8 host、NSX 9.1.1 ACTIVE。MTU 1500 cluster 被當正常成員 import。
- 交付:docx 重建 57 頁 62 圖(第十二章 + 摘要兩條 + 注意事項 15-17 + 附錄 C.3);COMMANDS-and-SHOTS.md §10;v8tov9 c345b2d(範本 3 補充);gg 55c2da5(shots/cli/specs/scripts r3)。
- 現況:vcf-m02 management domain 存在(第三輪成果),installer inst04 10.0.1.4,NSX vip 10.0.1.21,SDDC Manager 10.0.1.18,Ops vcf-m02-ops01;vcf-m01-cl01 仍 MTU 1500(若要繼續用要改回 9000)。VCF Ops 登入頁 CDP 會多開分頁/evaluate 卡住,這輪沒截 Ops 圖。
- 2026-09-22 16:20~ **拆 vcf-m01-cl01 + m01-cl01 縮成 3 台(使用者要留資源起 VKS,不用 Avi)**
  - 🔑 **converge/import 進來的 cluster,SDDC Manager 把兩個 cluster 都標 `is_imported=t`(platform DB cluster 表)**,resource-functionalities 對它們一律 `ADD_HOST / REMOVE_HOST / REMOVE_CLUSTER / STRETCH / PRIMARY_DATASTORE_UPDATE = false`,訊息「This operation is not allowed because this cluster was imported」→ 連 default cluster m01-cl01 也不能加減主機!(這對客戶是大事,要寫進文件)
  - lab 解法兩步(都不是官方支援):(1) `update cluster set is_imported=false where id=…`(pg_hba 加 `local all postgres peer` 後 `psql -h /home/postgresql -d platform`)→ toggle 變 allowed;(2) DELETE 仍被 DayN guardrails「Cluster not imported」CRITICAL 擋 → domainmanager `application-prod.properties` 加 `vcf.skip.dayn.guardrails=true` + restart(等 ~7 分鐘 API 才回來)→ retry task 才真的跑 Remove Cluster(49 子任務)。
  - 順序:先 `PATCH /v1/clusters/{id} {"markForDeletion":true}` 再 `DELETE /v1/clusters/{id}`(不 mark 會 REMOVE_CLUSTER_NOT_INITIALIZED)。
  - SDDC Manager root SSH 關、vcf su 要 tty → 一律用 govc guest.run(root:VMware1!VMware1!)跑腳本。
  - Remove Cluster 46/46 OK(17:22)→ `DELETE /v1/hosts [{fqdn}]` decommission 4 台(`POST /v1/hosts?action=decommission` 在 9.1.1 會被當 commission 解析,別用)→ 外層 4 台 vcf-m01-esx0x-vcd 關機。
  - m01-cl01 縮容(PATCH clusters/{id} clusterCompactionSpec):第一次 Failed 在「Prepare HA Isolation Address For Remove Host」— `Missing networkPoolId`:**converge 環境沒有 network pool、host 沒綁 pool**。解法:`POST /v1/network-pools`(vcf-m02-np01,VMOTION 192.168.13.0/24 vlan3、VSAN 192.168.14.0/24 vlan4)+ 手動 insert `host_and_network_pool`(id 是 bigint 非自增,要自己給)→ retry task → 46/46 OK(18:51)。esx04 decommission 後外層 vcf-m02-esx04-91 關機。
  - 現況:m01-cl01 = vcf-m02-esx01~03(vSAN HEALTHY 3),SDDC Manager 只剩 3 台 ASSIGNED,NSX 3 台 TN。VKS 規劃:不用 Avi → VDS + Foundation Load Balancer。
