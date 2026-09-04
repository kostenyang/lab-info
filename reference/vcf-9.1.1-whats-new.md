# VCF 9.1.1 — 新增功能重點（含對本 lab 的意義）

> **來源**：William Lam，〈10 Exciting enhancements in VMware Cloud Foundation 9.1.1〉
> <https://williamlam.com/2026/09/10-exciting-enhancements-in-vmware-cloud-foundation-9-1-1.html>
> 本篇是**摘要 + 我們自己的 lab 對照**，不是原文轉載。細節與正確性以原文與 Broadcom 官方文件為準。
> 建立日期 2026-09-04。**兩個 lab 通用**（rtolab / home lab）。

---

## 快速對照：哪幾條對我們最有用

| # | 9.1.1 新增 | 對本 lab 的意義 | 相關文件 |
|---|---|---|---|
| 6 | **離線 depot 支援 HTTP 與自訂 URL 路徑** | ⭐ **最有價值**。rtolab 的離線 depot 是 nginx **HTTP :8888**（`172.16.10.50`），9.1.0 的 installer UI 只吃 HTTPS；這條讓它可以直接被指定 | [runbooks/depot-server.md](../runbooks/depot-server.md)、[debug-vcf9.1 §8](https://github.com/kostenyang/debug-vcf9.1) |
| 4 | **VCFMS footprint 縮減**（1 CP + 3 worker → 1 CP + **2** worker） | 巢狀環境省下一台 worker。腳本＝`rightsize-day0-workers.sh`（非同步、要打 yes 確認、15–60 分鐘收斂）。**新裝的 9.1.1 自動套用；既有環境升級上去不會** | [runbooks/vcfms-footprint-reduction.md](../runbooks/vcfms-footprint-reduction.md) |
| 5 | **Small HA VCFMS 部署選項** | 想要 HA 又不想超出最小資源量的巢狀 lab 適用 |  |
| 7 / 9 | **非 vSAN ESA HCL 磁碟的內建選項**（installer UI 與 host commissioning 都支援） | 取代我們手動 silence `nvmeonhcl` 健康檢查的做法 | debug-vcf521 §03（HCL 擋 remediate） |
| 8 | **單台 ESX 部署** | installer UI 會尊重覆寫設定，lab 可單主機部署 |  |
| 2 | VCF Download Tool `--latest` | 抓 depot 內容時自動挑最新 Express Patch，省掉逐版挑選 | [runbooks/depot-server.md](../runbooks/depot-server.md) |
| 3 | OCI 格式 binary＋VKS/VKR 支援（VCFDT `artifacts` 指令） | 下載 vSphere Kubernetes Releases 可選版本 | [runbooks/vks.md](../runbooks/vks.md) |
| 1 | Back-in-time 升級路徑 | 解鎖先前被擋的來源版本（9.0.2 EP02、5.2.4、vSphere 8.0 U3J–U3K） |  |
| 10 | VLAN-backed VPC 免 TEP（走 Distributed Transit Gateway） | NSX 9.1 lab 預設沒有 edge，這條讓 VPC 不必配 TEP 網路 | [runbooks/vks.md](../runbooks/vks.md) |

---

## 逐條摘要

1. **Back-in-Time 升級支援** —— 開放先前被封鎖的升級來源版本直接升上來（VCF 9.0.2 EP02、VCF 5.2.4、vSphere 8.0 U3J / U3K）。
2. **VCF Download Tool 的 `--latest`** —— 新參數，自動把各元件過濾成最新的 Express Patch 版本。
3. **OCI 格式 binary 與 VKS/VKR 支援** —— VCFDT 增加 `artifacts` 指令，可下載 vSphere Kubernetes Releases 並選擇版本。
4. **VCFMS footprint 縮減** —— Day-0 部署的 VM 尺寸右調。**新裝的 9.1.1 會自動套用；既有環境升級到 9.1.1 不會**，要事後手動跑腳本。
5. **Small HA VCFMS 部署** —— 新的部署選項，在不超出最小資源量的前提下提供高可用。
6. **HTTP 與自訂 URL 的離線 depot** —— installer UI 開始支援非 HTTPS 端點與自訂路徑的離線儲存庫。
7. **非 vSAN ESA HCL 磁碟支援** —— installer UI 內建選項，允許 lab / PoC 使用未認證的 NVMe 裝置。
8. **單台 ESX 部署** —— installer UI 會尊重設定覆寫，可做單主機 lab 部署。
9. **host commissioning 也支援非認證 NVMe** —— 不必再額外覆寫。
10. **VLAN-backed VPC 免 TEP** —— Distributed Transit Gateway 選項讓 VPC 部署不需設定 Tunnel Endpoint 網路。

---

## 我們踩過、而 9.1.1 正好對應的坑

- **離線 depot 卡點（#6）**：2026-09-02 在 rtolab 做 converge 重建管理層時，第 6 個里程碑
  `Deploy and configure VCF Automation` 卡死，根因是 fleet depot 指向新 fleet 內建的空 depot、
  VSP 的 `fleet-build-service` 每 10 秒重複推送 depot 設定推不進去，15 GB bundle 從未開始傳。
  9.1.1 讓 installer 可直接指定 HTTP / 自訂路徑的離線 depot，**理論上正對這個卡點**。
  完整根因見 `debug-vcf9.1` 的 [08-ops-loss-and-mgmt-rebuild.md](https://github.com/kostenyang/debug-vcf9.1) §8。
- **HCL 擋 remediate（#7 / #9）**：先前要用 `VsanHealthSetVsanClusterSilentChecks` 靜音 `nvmeonhcl`
  （且只吃 MoRef + 短 id），9.1.1 改成 UI 內建選項。
- **VCFMS 太肥（#4 / #5）**：rtolab 外層 RAM 早已頂天，少一台 worker 就是 12 vCPU / 24 GB 的直接回收。

## 尚待驗證（別當成已知事實）

- 9.1.1 的離線 depot 設定是否也能套用到**已經部署好的 fleet**（而不只是新裝時指定）。
- footprint 縮減腳本的實際 KB 編號與下載位置（原文說由 Broadcom KB 提供）。
- 我們的離線 depot 是否已有 9.1.1 內容可下載。
