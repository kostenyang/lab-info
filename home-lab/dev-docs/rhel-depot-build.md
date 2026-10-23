# RHEL 9.8 VCF Offline Depot Server — 建置狀態檔(2026-10-01)

## 目標(2026-10-01 更新:內容只要 9.1.1 最新,來源 61)
在外層 vCenter(10.0.0.101)新建一台 **RHEL 9.8** VM 當 VCF 9.1 offline depot server(nginx),
內容從 vcf9depot(10.0.0.61,/depot/PROD 307GB/26 COMP)rsync,並裝好 0400 download tool 供日後增量更新。

## 關鍵資源(lab-env READ)
| 項目 | 值 | 來源 |
|---|---|---|
| 外層 vCenter | 10.0.0.101(administrator@vsphere.local)| CONTEXT-vcf91-lab.md |
| 目標 host / datastore | 10.0.0.95 / vmfs-samsung4t(1.8TB free)| govc 實查 |
| VM 網路 | VDS portgroup `MGMT`(🔴 host95 的「VM Network」無 uplink,勿用)| memory rhel98 坑 |
| RHEL ISO(datastore) | `[vmfs-samsung4t] iso/rhel-9.8-x86_64-dvd.iso`(cp 自 rhel98-orig/_deviceImage-0.iso 14.5GB)| govc |
| RHEL ISO(本機) | `E:\9.1\rhel-9.8-x86_64-dvd.iso` | ls |
| 新 VM 名/FQDN/IP | `rhel-depot` / `rhel-depot.home.lab` / **10.0.0.63**(/23 gw 10.0.0.1 dns 10.0.0.200)| 本次定案(63 無 PTR、ping down、無 VM 持有)|
| 來源 depot | 10.0.0.61 root(密碼見 memory vcf91-depot-server)`/depot/PROD` | plink 實查 |
| 建置腳本 | `vcf9offlinescript/create_vcf9_depot_server_rhel.sh` | repo |
| download tool 0400 | `E:\9.1\dltool0400`(含 lin64 JRE)+ token `E:\9.1\.broadcom-token` | ls |
| DNS zone | home.lab + 0.0.10.in-addr.arpa(本機 10.0.0.200 就是 DNS)| Get-DnsServerZone |

## 計畫
1. 做 kickstart ISO(OEMDRV 標籤,IMAPI2)→ 上傳 datastore
2. govc vm.create(EFI, rhel9_64Guest, 4vCPU/8GB, 100G OS + 500G thin data, MGMT, 2 CD)→ 無人值守安裝
3. DNS A/PTR rhel-depot.home.lab ↔ 10.0.0.63
4. 開機後 pscp 腳本 → 跑 create_vcf9_depot_server_rhel.sh --fqdn rhel-depot.home.lab --ip 10.0.0.63 → 加 8888 純 HTTP block
5. rsync 61 → /opt/vcf-depot/vcf9/PROD(307GB)→ chown nginx + restorecon
6. 驗證 curl 443(auth)/8888(no-auth)catalog + 一個 binary HEAD
7. 裝 0400 工具 + token,寫 refresh 腳本

## 進度
- [x] 環境探測完成
- [x] ks ISO(OEMDRV,[vmfs-samsung4t] iso/rhel-depot-ks.iso;IMAPI 要用 powershell.exe 5.1,pwsh7 無 -CompilerParameters)
- [x] VM rhel-depot 裝好(RHEL 9.8,10.0.0.63,SSH root OK,ks ISO 已退出)
- [x] DNS A+PTR rhel-depot.home.lab ↔ 10.0.0.63
- [x] depot 腳本(443 auth 401/200、8888 200、cert SAN OK)+ 0400 工具/token 驗證有效 + refresh-depot.sh
- [x] 內容 = 9.1.1 最新(從 61 抓):670 檔/126G,24 COMP,型錄 seq58;19:47 rsync 完成 exit 0,chown nginx+restorecon 完成
- [x] 驗證:8888/443 型錄 200(seq58)、manifest 200、SDDC Mgr 9.1.1 OVA HEAD 200 Content-Length=型錄 size、Range 206。缺(61 沒有):NSX_ALB 32.1.3 INSTALL、9.1.1.0100 系列(FLEET_LCM/SDDC_LCM/VCD_MIGRATION/VRA)

---

## 2026-10-22 重建(v2)

- 10-01 那台不見了 → 同名同 IP 重建;第一次重建發現 **ks v1 碟序顛倒**(OS 裝到 500G、/opt/vcf-depot 只 100G)
- 使用者要求整台重做 → **ks v2**:`%pre` 用 `lsblk -dnbo NAME,SIZE,TYPE` 依大小選碟(最小=OS、最大=data),
  寫 `/tmp/part.inc` 再 `%include`。原稿 `dev-docs/rhel-depot-ks-v2.cfg`;datastore `iso/rhel-depot-ks.iso` 已換成 v2
- OEMDRV ISO 用 IMAPI2(`powershell.exe` 5.1 + Add-Type /unsafe),腳本在 session scratchpad `ks2/mkiso.ps1`
- 🔴 同名重建:舊 VM 的 `rhel-depot/rhel-depot.vmx` 還在 datastore → `govc vm.create` 拒絕 → 先建 `rhel-depot-new` 再 `object.rename`
- 🔴 重裝後 PuTTY 快取舊 hostkey → `plink -batch` 會拒絕;先刪 `HKCU:\Software\SimonTatham\PuTTY\SshHostKeys` 的 `*@22:10.0.0.63`
- 裝好後:`post-install.sh`(碟配置檢查 → v6 → 8888 → `dl-latest.sh download`,完成後自動收權限)
- 下載 `--vcf-version=9.1.1.0 --latest=true`:46 bundles/183G;VSAN_FILE_SERVICES 9.1.1.0 上游已下架,從 61:8888 補
