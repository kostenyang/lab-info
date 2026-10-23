# home lab — 工作筆記 / 進度檔 / 實測紀錄（md 快照）

> 來源：本機 `E:\9.1` 底下**不屬於任何 git repo** 的 lab 相關 Markdown，**2026-10-23 快照**，目錄結構照原樣保留。
>
> - 🔒 **已遮罩**：非預設密碼、depot ID / serviceId、授權碼片段 → `<redacted>` / `<depot-id>` / `<key>`；客戶名稱 → `cust`；私有 repo 名稱 → `<private-lab-repo>`。lab 預設密碼 `VMware1!VMware1!` 照 lab-info 慣例保留。
> - 🖼️ **只放 md，沒放截圖** —— 文件裡的相對圖片連結（`shots/…`）在這裡會是斷的；原圖在本機同路徑。
> - ⏱️ **內容是寫下當時的狀態**。IP / 元件存活以 [`../topology/home-lab.md`](../topology/home-lab.md) 與實測為準；`CONTEXT-vcf91-lab.md`、`labinfo.md` 已知有過期段落。
> - 已排除：客戶專屬案（ctbc / esun / vsmc / 投影片審查）、第三方文件（govmomi、node、官方 SDK、官方 air-gap 指南副本）、備份與重複檔。


## (根目錄)

| 檔案 | 標題 |
|---|---|
| [CONTEXT-vcf91-lab.md](CONTEXT-vcf91-lab.md) | VCF 9.1 Lab — Context 外部化(最後全面實測:**2026-10-04**) |
| [LAB-CLEANUP-20261004.md](LAB-CLEANUP-20261004.md) | LAB 整理清單 — 2026-10-04 |
| [LAB-CLEANUP-REVISED-20261005.md](LAB-CLEANUP-REVISED-20261005.md) | 整理清單 — 修正版(2026-10-05) |
| [LABINFO-vs-DNS-20261005.md](LABINFO-vs-DNS-20261005.md) | labinfo.md ↔ DNS ↔ 實機 三方對照(2026-10-05 實測) |
| [PROGRESS.md](PROGRESS.md) | - F 11:5x ns cust-stg / cust-dev 用 NEW NAMESPACE 精靈建好(override network → Create a VPC、 |
| [VC-INVENTORY-20261005.md](VC-INVENTORY-20261005.md) | 三座 vCenter 實讀盤點 — 2026-10-05 09:0x |
| [context.md](context.md) | context.md — 關鍵路徑 / 決策 / 現況 |
| [labinfo.md](labinfo.md) | VCF 9.1 Lab Info — M02 (home.lab) |
| [plan.md](plan.md) | plan.md — VCF 9.1 nested lab 重建 |
| [tasks.md](tasks.md) | tasks.md — VCF 9.1 重建待辦 |

## airgap-token

| 檔案 | 標題 |
|---|---|
| [airgap-token/README.md](airgap-token/README.md) | Air-gap Token Bridge — 氣隙端 registration token 帶出流程 |

## coverage-lab

| 檔案 | 標題 |
|---|---|
| [coverage-lab/PHASE4-import-runbook.md](coverage-lab/PHASE4-import-runbook.md) | 階段 4:把 w01 匯入成 VI workload domain,並共用管理網域的 NSX |

## deliver

| 檔案 | 標題 |
|---|---|
| [deliver/IMPORT-README.md](deliver/IMPORT-README.md) | VCF 9.1 Fleet 補件包 — 匯入說明 (修正版) |
| [deliver/INSTALLER-LOCAL-DEPOT.md](deliver/INSTALLER-LOCAL-DEPOT.md) | VCF Installer 自己當 depot（metadata zip / download tool 本機下載） |
| [deliver/m02-vks-vlanvpc-vna-nfs/airgap-download/README.md](deliver/m02-vks-vlanvpc-vna-nfs/airgap-download/README.md) | Air-gap 下載清單與指令：VCF 9.1.1 + VLAN-backed VPC + VNA + VKS + NFS |
| [deliver/vcf911-download-portal/README-vc-nsx-esx.md](deliver/vcf911-download-portal/README-vc-nsx-esx.md) | VCF 9.1.1 升級套件下載指南（vCenter / NSX / ESX） |
| [deliver/vcf911-download-portal/README.md](deliver/vcf911-download-portal/README.md) | VCF 9.1.1 升級包下載指南（Broadcom Support Portal） |
| [deliver/vks-airgap-download/README.md](deliver/vks-airgap-download/README.md) | 1. 文件目的 |
| [deliver/vks-cidr-test/README.md](deliver/vks-cidr-test/README.md) | 1. 目的與結論 |

## dev-docs

| 檔案 | 標題 |
|---|---|
| [dev-docs/esxi-upgrade-doc-with-screenshots.md](dev-docs/esxi-upgrade-doc-with-screenshots.md) | ESXi 升級手冊（含截圖）— session state |
| [dev-docs/fleet-version-sync-lab-results.md](dev-docs/fleet-version-sync-lab-results.md) | VCF 9.1 Fleet 版號同步 — Lab 實測結果 |
| [dev-docs/fleet-version-sync-official-basis.md](dev-docs/fleet-version-sync-official-basis.md) | VCF 9.1 Fleet Inventory 版號同步 — 官方文件依據 |
| [dev-docs/hcx01-deploy.md](dev-docs/hcx01-deploy.md) | HCX Unified Appliance 部署紀錄 — hcx01 |
| [dev-docs/latest-install-demo-commands.md](dev-docs/latest-install-demo-commands.md) | VCF 9.1 只載最新 install + installer 驗證 — 實跑指令 |
| [dev-docs/principal-datastore-kb452458.md](dev-docs/principal-datastore-kb452458.md) | Imported cluster Principal Datastore 更換 (KB 452458) — 工作狀態 |
| [dev-docs/rdm-iscsi-test.md](dev-docs/rdm-iscsi-test.md) | RDM 測試 on VCF 9.1.1 lab — 狀態檔(2026-09-20 起) |
| [dev-docs/rhel-depot-build.md](dev-docs/rhel-depot-build.md) | RHEL 9.8 VCF Offline Depot Server — 建置狀態檔(2026-10-01) |
| [dev-docs/rhel98-depot-rebuild.md](dev-docs/rhel98-depot-rebuild.md) | RHEL 9.8 VCF Offline Depot — 狀態檔 |
| [dev-docs/single-host-esxi-vcf-upgrade-test.md](dev-docs/single-host-esxi-vcf-upgrade-test.md) | 單台 ESXi 納管 VCF → 升級測試 (session state) |
| [dev-docs/vc9-upgrade-test.md](dev-docs/vc9-upgrade-test.md) | vCenter 9.0.2 → 9.1 手動升級測試 (session state) |
| [dev-docs/vcd-t04-deploy.md](dev-docs/vcd-t04-deploy.md) | VCD 10.6.2 部署（backing t04 VCF 9.1）— 狀態檔 |
| [dev-docs/vcda-vcf91-deploy.md](dev-docs/vcda-vcf91-deploy.md) | VCDA 4.7.6 接 VCF 9.1 互通性測試 — ✅ 打通(2026-09-01) |
| [dev-docs/vcf911-ai-assistant.md](dev-docs/vcf911-ai-assistant.md) | VCF 9.1.1 AI Assistant (VMware Intelligent Assist) 啟用 — 完成紀錄 |
| [dev-docs/vcf911-airgap-upgrade.md](dev-docs/vcf911-airgap-upgrade.md) | VCF 9.1.0 → 9.1.1 離線(air-gap)升級實錄 |
| [dev-docs/vra8-vrops-import-to-vcf91.md](dev-docs/vra8-vrops-import-to-vcf91.md) | vRA 8 + vROps 8 → VCF 9.1 Import 測試 |
| [dev-docs/vsan-cluster-52-to-91-convert-test.md](dev-docs/vsan-cluster-52-to-91-convert-test.md) | 測試:5.2.1 vSAN cluster 搬進 9.1 vCenter 再 convert 成 mgmt domain(2026-09-18 開案) |

## doc-shots

| 檔案 | 標題 |
|---|---|
| [doc-shots/vcf911-download/PROGRESS.md](doc-shots/vcf911-download/PROGRESS.md) | VCF 9.1.1 升級包下載文件 — 進度（2026-10-14）✅ 完成 |

## docs

| 檔案 | 標題 |
|---|---|
| [docs/vc9-upgrade/vc9-upgrade-walkthrough.md](docs/vc9-upgrade/vc9-upgrade-walkthrough.md) | vCenter Server 9.0.2 → 9.1 手動升級教學（in-place update） |

## kb441333

| 檔案 | 標題 |
|---|---|
| [kb441333/PROGRESS.md](kb441333/PROGRESS.md) | KB 441333 — VCF Automation 正常移除 step-by-step(m03,2026-10-07) |

## kb451260

| 檔案 | 標題 |
|---|---|
| [kb451260/README.md](kb451260/README.md) | KB 451260 — Cluster 擴充失敗：`PortGroup configuration mismatch detected for VDS` |

## lichub2

| 檔案 | 標題 |
|---|---|
| [lichub2/IP-Requirements.md](lichub2/IP-Requirements.md) | License Hub 2.0 + SSP 5.2.0 — IP / DNS / 資源需求表 |

## m02

| 檔案 | 標題 |
|---|---|
| [m02/PROGRESS.md](m02/PROGRESS.md) | m02（重部）— VLAN-backed VPC + VNA + VKS worker eth1 走 NFS VLAN（2026-10-17 起） |
| [m02/doc/README.md](m02/doc/README.md) | VKS on VLAN-backed VPC + VNA，worker 第二張網卡走 NFS 專用 VLAN — Step by Step |
| [m02/doc/manifests/web-demo-commands.md](m02/doc/manifests/web-demo-commands.md) | 部署服務 demo（kubectl 指令） |
| [m02/manifests/web-demo-commands.md](m02/manifests/web-demo-commands.md) | 部署服務 demo（kubectl 指令） |

## m03

| 檔案 | 標題 |
|---|---|
| [m03/NOTES-vmotion-stall.md](m03/NOTES-vmotion-stall.md) | m03 vMotion 停滯的真正原因:實體 CPU 超配(2026-10-05) |
| [m03/PROGRESS.md](m03/PROGRESS.md) | m03「既有 VCF Operations + License Server 進管理網域」實作進度 |

## m04

| 檔案 | 標題 |
|---|---|
| [m04/PROGRESS.md](m04/PROGRESS.md) | m04 / m05:實測「Deploy a new VCF Instance」(加進既有 fleet) |
| [m04/vks-airgap/README.md](m04/vks-airgap/README.md) | VKS on VLAN-backed VPC — Air-gap Step by Step（m05，2026-10-11 ~ 10-12） |
| [m04/vks-flb-airgap/README.md](m04/vks-flb-airgap/README.md) | VKS on VDS + Foundation Load Balancer — Air-gap Step by Step（m05，UI air-gap 版，2026-10-12） |
| [m04/vks-flb/README.md](m04/vks-flb/README.md) | VKS on VDS + Foundation Load Balancer — Step by Step（m05，UI 版，2026-10-12） |
| [m04/vks-ui/README-new.md](m04/vks-ui/README-new.md) | VKS on VLAN-backed VPC — Step by Step（m05，全部用 vSphere Client UI，2026-10-11） |

## m06

| 檔案 | 標題 |
|---|---|
| [m06/PROGRESS.md](m06/PROGRESS.md) | m06 — VKS on VLAN-backed VPC, air-gap, **no VCFMS**（2026-10-13 起） |
| [m06/README.md](m06/README.md) | VKS on VLAN-backed VPC — Air-gap、不部署 VCFMS（m06，2026-10-13，UI step by step） |
| [m06/nas-doc/README.md](m06/nas-doc/README.md) | VKS on VLAN-backed VPC — 外掛 NAS（NFS）做 PV，走另一條線（m06，2026-10-13） |

## m07

| 檔案 | 標題 |
|---|---|
| [m07/context.md](m07/context.md) | m07 context — 決策、資源、地雷 |
| [m07/plan.md](m07/plan.md) | m07 — vC 8.0U3g + NSX 4.2.2.1 直升 9.1.1(in-place)lab |
| [m07/tasks.md](m07/tasks.md) | m07 tasks |

## m07-521

| 檔案 | 標題 |
|---|---|
| [m07-521/PROGRESS.md](m07-521/PROGRESS.md) | m07（第二輪）— 手動部 VCF 5.2.1 BOM（不用 Cloud Builder） |
| [m07-521/context.md](m07-521/context.md) | context.md — 決策與理由（持續更新） |
| [m07-521/doc/README.md](m07-521/doc/README.md) | 獨立 NSX 手動部署 → 升級 9.1.1 → 轉入 VCF 9.1.1：完整實作手冊 |
| [m07-521/plan.md](m07-521/plan.md) | plan.md — 目標與範圍 |
| [m07-521/tasks.md](m07-521/tasks.md) | tasks.md — 進度追蹤（持續更新） |

## nfs-offline

| 檔案 | 標題 |
|---|---|
| [nfs-offline/README.md](nfs-offline/README.md) | NFS Server 離線安裝 (Ubuntu 22.04 / amd64) |
| [nfs-offline/noble/kit/README.md](nfs-offline/noble/kit/README.md) | NFS 離線安裝包 — Ubuntu 24.04 (noble) amd64 |
| [nfs-offline/vcd-nfs/README.md](nfs-offline/vcd-nfs/README.md) | VCD 專用 NFS Server（air-gap / Ubuntu 22.04） |

## nsx-911-precheck

| 檔案 | 標題 |
|---|---|
| [nsx-911-precheck/RESULTS.md](nsx-911-precheck/RESULTS.md) | NSX 4.2.1 → 9.1.1.0 Pre-Check 對照（2026-10-22） |

## tools

| 檔案 | 標題 |
|---|---|
| [tools/VCF-M02-開關機-Runbook.md](tools/VCF-M02-開關機-Runbook.md) | VCF 9.1 (M02) 每日開關機自動化 Runbook |
| [tools/vra-bp-portability/README.md](tools/vra-bp-portability/README.md) | vra-bp-portability — vRA 8 藍圖可攜性掃描 / 跨 vCenter 複製 |

## vcf521

| 檔案 | 標題 |
|---|---|
| [vcf521/PROGRESS.md](vcf521/PROGRESS.md) | VCF 5.2.1 重部（m06 段）— 2026-10-21 起 |

## vcf521-conv

| 檔案 | 標題 |
|---|---|
| [vcf521-conv/COMMANDS-and-SHOTS.md](vcf521-conv/COMMANDS-and-SHOTS.md) | VCF 5.2.1 vSAN Cluster 搬入 VCF 9.1.1 vCenter 並 Convert 成 Management Domain — 指令與截圖對照稿 |

## vcfops-dashboard

| 檔案 | 標題 |
|---|---|
| [vcfops-dashboard/README.md](vcfops-dashboard/README.md) | VCF Operations 儀表板:營運總覽 |

## vra8-m03

| 檔案 | 標題 |
|---|---|
| [vra8-m03/PROGRESS.md](vra8-m03/PROGRESS.md) | vRA 8.18.1(新的一套,裝在 m03 管理網域)→ import 進 VCF 9.1.1 fleet → 升級 VCF Automation 9.1.1 |
