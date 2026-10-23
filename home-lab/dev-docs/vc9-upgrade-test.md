# vCenter 9.0.2 → 9.1 手動升級測試 (session state)

> 目標:從 E:\ ISO 裝一台 **standalone** vCenter 9.0.2,再手動升到 9.1,驗證/記錄整個手動升級流程。
> 開始日 2026-07-27。這是**測試練習**,非 VCF-managed。

## 決策 / 事實(定案)

- **新 vCenter**:`vc9test.home.lab` / **10.0.0.110** (DNS A+PTR 已建在 10.0.0.200,正反解已驗)
- **部署目標**:外層 vCenter `10.0.0.101` (administrator@vsphere.local / `<redacted>`, v8.0.3)
  - host **10.0.0.97**(最空:128G RAM/44%用、CPU 26%)
  - datastore **SSD2**(168G free,local vmfs)
  - network **MGMT**(dvportgroup-443 = 可連的 10.0.0.0/23 mgmt 段)
  - thin / **tiny**(2vCPU/14GB/619GB thin)
- **appliance root / SSO**:`VMware1!VMware1!`;SSO domain `vsphere.local`;ssh_enable=true;CEIP off
- **NTP**:`10.0.1.254`(RouterOS/Google,正確 UTC;**不可**用 10.0.0.200 AD,它快 +168~176s)
- **9.0.2 媒體**:`E:\VMware-VCSA-all-9.0.2.0.25148086.iso`(13.5G,已下載完),掛在 **F:**
  - vcsa-deploy: `F:\vcsa-cli-installer\win32\vcsa-deploy.exe`
- 部署設定檔:`scratchpad\vc9test-deploy.json`;log:`E:\9.1\vc9test-deploy.log` (+`.err.log`,`.pid`)

## Phase B 媒體(9.1)

- 使用者說「先裝9,然後 depot server 上有 9.1」→ depot = **10.0.0.61** (root/`<redacted>`)
- ⚠️ standalone vCenter 9.0→9.1 需 **`VMware-VCSA-all-9.1.x.iso`** 安裝器 ISO(跑 upgrade=部新9.1 appliance→遷移→接管IP)。VCF depot bundle 是給 SDDC Manager LCM 的,standalone 用不到 → 要確認 depot 上有沒有真的 VCSA 9.1 ISO,沒有就得下載(E:\9.1\.broadcom-token)

## 官方確認的升級方法(已查 techdocs)

- **9.0→9.1 = in-place patching/update**(minor),不是 migration。用 VAMI(:5480)或 `software-packages` CLI,搭 updaterepo。
- migration(部新 appliance)是給跨大版(8.0→9.0)。
- **實測 ground truth 確認**:9.0.2.0 VAMI 指向 9.1 repo → Available updates 出現 **9.1.0.0**(Type: Enhancement, Reboot: Yes)= 合法路徑。

## Phase B 媒體(已備妥)

- **更正**:depot `/depot/PROD/COMP/VCENTER/` 其實**有**完整 `VMware-VCSA-all-9.1.0.0/0100/0200.iso` + `-updaterepo.zip`(先前 find `-xdev` 漏掉 /depot 獨立掛載)。
- 已解壓 GA updaterepo → `/depot/vc91repo/`(8.4G,manifest/+package-pool/)。
- **HTTPS repo server 供 VAMI 用**:`https://10.0.0.61:8443/`(depot 上 systemd unit **`vc91repo-https`**,自簽憑證 /root/vc91repo-cert.pem;另有 http `vc91repo`:8080 沒用到,VAMI 只吃 HTTPS/FTPS)。
  - VAMI Update→Settings→Specified URL=`https://10.0.0.61:8443/`,**取消勾 Check Certificate**(自簽)。

## 截圖文件(cut 圖)

- 管道:claude-in-chrome 驅動本機 Chrome「LABAD」(在 10.0.0.200,連得到 lab)+ `tools/capture-chrome.ps1 -Out xxx.png` 抓視窗。
- ⚠️ Chrome 對 vc9test 自簽憑證會攔 → 已把 vc9test leaf 憑證匯入本機 LocalMachine\Root(信任後 UI 正常)。
- 圖存 `E:\9.1\docs\vc9-upgrade\img\`:01 summary(before 9.0.2)/02 update頁/03 repo設定/04 available 9.1.0.0/05 EULA/06 precheck警告/07 backup步/08 staging。
- precheck 全 Warning(無阻斷):VM硬體版本舊(升後 KB403995 升compat)、無 file-based backup(改用VM快照)、system/memory health degraded(tiny剛開機)。

## 安全網

- **VM snapshot** `pre-9.1-upgrade-9.0.2`(govc,在外層vC;可回滾重測)。update 過程另自動建 LVM snapshot。
- 回滾:`govc snapshot.revert -vm vc9test`(GOVC 連 10.0.0.101 admin/<redacted>)。

## ✅ 結果:升級成功(2026-07-27 ~23:55)

- vc9test 由 **9.0.2.0 → 9.1.0.0 (build 25370922)**,in-place VAMI update 成功。
- 驗證:govc about=9.1.0、VAMI Summary + vSphere Client 皆顯示 9.1.0.0、Health 全 Good。
- 交付:**`docs/vc9-upgrade/vc9-0-to-9-1-upgrade-walkthrough.docx`**(13 張截圖嵌入,1.55MB)+ build 腳本 `tools/docx-build/build-vc9-upgrade.js`(portable node docx-js,`npm i docx` 已裝)。
- 遺留:VM snapshot `pre-9.1-upgrade-9.0.2` 還在(可回滾重測或刪);depot repo server systemd `vc91repo-https`(:8443)/`vc91repo`(:8080)還開著。
- 待辦:KB403995 升 vc9test VM hardware compatibility(precheck 警告項,非必要)。

## 進度

- [x] 部署 vCenter 9.0.2(成功 15:07)
- [x] 官方文件確認升級法 + 媒體備妥 + repo server 上線
- [x] VAMI 指 repo → 確認 9.1.0.0 可用 → snapshot → 精靈跑到 FINISH
- [~] **升級安裝進行中**(15:26 啟動,預估停機 ~42min;背景監看 byoztei7u 偵測重開)
- [ ] 升級完成驗證 9.1.0.0(VAMI Summary + vSphere Client)
- [ ] 升後：升 VM hardware compat(KB403995)
- [ ] 組成 .docx 教學文件(docx skill)

## === 第二案:8.0.3 → 9.1 migration 升級(含 cut 圖 docx,每頁有圖)===

- **來源機 vc8test**:`vc8test.home.lab` / **10.0.0.112**(DNS 已建)。用 `E:\8\VMware-VCSA-all-8.0.3-24022515.iso`(8.0 U3 GA,官方支援直升 9.1.0;避開 U3j/U3k back-in-time)部到 host97/SSD2/MGMT/tiny/thin/NTP10.0.1.254、root+SSO=VMware1!VMware1!。部署 log `vc8test-deploy.log`,監看 task bhax8uw9i。
- **9.1 安裝器 ISO**:已抓到 `E:\VMware-VCSA-all-9.1.0.0.25370922.iso`(12.8G,從 depot symlink http 抓),掛在 **G:**。GUI=`G:\vcsa-ui-installer\win32\installer.exe`;CLI=`G:\vcsa-cli-installer\win32\vcsa-deploy.exe`,upgrade 範本 `templates\upgrade\vcsa8.0\embedded_vCSA_on_VC.json`。
- **升級法 = 9.1 GUI 安裝器 2 階段 migration**(文件要每頁有圖→走 GUI):
  - Stage1 部新 9.1 appliance 到**暫時 IP 10.0.0.113**(prefix23/gw10.0.0.1/dns10.0.0.200)
  - Stage2 遷移 vc8test 資料→接管 10.0.0.112→關舊 8.0.3 機
  - 驅動:computer-use(native app);cut 圖每一步
  - CLI 等效參數(放 docx 附錄):new_vcsa.vc=10.0.0.101/host97/SSD2/MGMT、temporary_network=.113、source_vc.managing=10.0.0.101、source_vc.vc_vcsa=10.0.0.112(admin@vsphere.local/VMware1!VMware1!,root VMware1!VMware1!)、vcdb_migrateSet=core
- docx:比照 9.0→9.1 那份(`tools/docx-build/build-vc9-upgrade.js`),但**每頁至少一張圖**。圖存 `docs/vc8-to-91-upgrade/img/`。

## 監看

```
tail -20 /e/9.1/vc8test-deploy.log              # 8.0.3 部署
tail -20 /e/9.1/vc9test-upgrade-monitor.log     # 背景重開偵測
# VAMI 進度: https://vc9test.home.lab:5480/#/ui/update/progress
# 完成後 Summary 應顯示 Version 9.1.0.0
```
