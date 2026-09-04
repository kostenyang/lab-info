# Runbook — 升級到 VCF 9.1.1 後，採用縮減版的 VCF Management Services (VCFMS) footprint

> **來源**：William Lam，〈VCF 9.1.1 — Adopting the reduced VCF Management Services (VCFMS) footprint after an upgrade〉
> <https://williamlam.com/2026/09/vcf-9-1-1-adopting-the-reduced-vcf-management-services-vcfms-footprint-after-an-upgrade.html>
> 本篇是**摘要 + 我們的 lab 對照**，不是原文轉載。實際腳本與步驟以 Broadcom KB 為準。
> 建立日期 2026-09-04。**兩個 lab 通用**（rtolab / home lab）。

---

## 這是什麼、為什麼要做

VCF 9.1.0 部署出來的 VCFMS（也就是我們慣稱的 **VSP** / VCF services runtime）是
**1 個 control plane + 3 個 worker**，而且 worker 被刻意放大，為的是預留給「之後可能會裝的 Day-N 服務」。

VCF 9.1.1 把 Day-0 服務逐一右調（right-size），結果是：

| | 升級前（9.1.0 起家） | 跑完右調腳本後 |
|---|---|---|
| 節點數 | 1 CP + **3** worker | 1 CP + **2** worker |
| CP | 4 vCPU / 10 GB | 4 vCPU / 10 GB（不變） |
| Worker | `cluster.worker.size = medium` | **12 vCPU / 24 GB**（machineType 改成 `management.nonha.small`、`minReplicas=2`） |

> 以上是**原文截圖裡的實測值**（腳本輸出 + 事後的 vCenter VM 清單），不是推測。
>
> ⚠️ **rtolab 現況要自己先量**：我們的 VSP 是 CP `4 vCPU / 10 GB` ＋ **3 台 worker 各 `12 vCPU / 24 GB`** ——
> worker 尺寸**已經等於**原文右調後的值，所以對我們而言預期的變化主要是**節點數 3 → 2**。
> 套用前務必先量一次，不要照抄別人的 before/after：
> ```powershell
> Get-VM 'kosten-vcf91-vspp*' | Format-Table Name, NumCpu, MemoryGB
> ```

**關鍵：升級到 9.1.1 之後不會自動縮**。既有環境維持原尺寸，除非你手動跑右調腳本。

> **對本 lab 的意義**：巢狀環境的外層 RAM 一向吃緊，少一台 worker ≈ 直接回收 **12 vCPU / 24 GB**。
> rtolab 目前的 VSP 正是 1 CP（4 vCPU / 10 GB）+ 3×（12 vCPU / 24 GB）的舊配置。

---

## 前提條件

1. **已經升級到 VCF 9.1.1**（沒升就不適用）。
2. **環境沒有部署 Day-N 服務** —— 這個右調是針對 **Day-0 初始部署**做的；
   裝了 optional Day-N 服務的環境需求會不一樣，不要直接套。
3. 取得 Broadcom KB 提供的右調腳本。**原文沒有給 KB 編號、也沒有給腳本檔名**（實測兩次擷取都確認缺這兩項），
   要自己去 Broadcom KB 查。
4. 手上要有 control plane 節點的 SSH 憑證（`vmware-system-user`）。
   > 密碼來源：部署當時 VCF Installer 的 **REVIEW PASSWORDS**（值是遮罩的，**要先點開 `eye` 圖示**才看得到），
   > 或事後從既有的憑證保管處取得。**不要把密碼寫進任何 repo。**

---

## 步驟

### 1. 找出 control plane 節點

VCF Operations UI：

```
Build ▸ Lifecycle ▸ VCF Management ▸ Components ▸（下方 Nodes 表格）
```

Nodes 表格會列出 VM name / Node Type / IP address，找 **Node Type = Control Plane** 那一台。
（其餘是 Worker。腳本一定要在 **control plane** 上跑。）

### 2. 把腳本 scp 上去

腳本檔名（原文截圖可見）：**`rightsize-day0-workers.sh`**，從 Broadcom KB 下載。

```bash
scp rightsize-day0-workers.sh vmware-system-user@<control-plane-node>:/tmp/
```

### 3. SSH 進去、提權到 root 執行

```bash
ssh vmware-system-user@<control-plane-node>
sudo -i                       # 提權到 root（腳本是以 root 執行的）
./rightsize-day0-workers.sh
```

腳本會**先跳警告**再要你手動確認：

```
WARNING: This script will trigger new machine type rollouts.
         This action can disrupt ongoing operations on the deployed cluster.
Type "yes" to proceed:
```

**它是非同步的** —— 送出 worker resize 後就立刻返回，實際的節點汰換由平台在背景進行。
指令跑完 ≠ 縮容完成。

腳本自己會做的檢查（看它的輸出就知道卡在哪一關）：

| 階段 | 它在做什麼 |
|---|---|
| Checking prerequisites | 找 `kubectl`（/usr/local/bin）、`jq`（/usr/bin）、`vmsp`（/usr/local/bin），並使用 `KUBECONFIG=/etc/kubernetes/admin.conf` |
| Validating installed components | 確認**沒有** Day-N 元件（`ops-logs` / `vcf-obs-data-platform`）；有裝就不該套 |
| Collecting cluster sizing data | 從 `pd/vmsp-platform` 讀 `profiles.name`、`cluster.worker.size`、`cluster.ha`、`cluster.type`、`ingress.fleet.fqdn` |
| Applying worker sizing | 依情境決定 machineType 與 minReplicas。原文例子：small + non-HA + fleet → `management.nonha.small`、`minReplicas=2` |
| 實際變更 | 更新 `PackageDeployment/vmsp-platform`（`releases.vmsp.vmware.com/v1alpha1`）並新建一個 `vmsp.release.vmsp-platform.vNN` Secret |

### 4. 盯 rollout

```bash
kubectl get pd vmsp-platform -n vmsp-platform -w
```

輸出的 `PHASE` / `STATUS` 會從 `Progressing / package deployment is in progress`
走到 **`Successful / successful package deployment`**。

**時間預期（原文說法，別搞混這兩個數字）**：

- 新的 worker 節點**大約 10–15 分鐘開始**汰換；
- 但整個叢集收斂到最佳狀態要 **15–60 分鐘**（平台一次換一台，叢集越大越久，
  PD 成功之後還會依實際用量再往下 scale down）。

### 5. 驗收

vCenter 看 VM 清單（用 VM 名稱前綴過濾），應該剩 **1 台 CP + 2 台 worker**：

```powershell
Get-VM 'kosten-vcf91-vspp*' | Format-Table Name, NumCpu, MemoryGB
```

---

## 我們自己踩過、跟這篇有關的雷

- **VSP 節點上的 `/etc/kubernetes/admin.conf` 是 0 bytes** —— 直接下 `kubectl` 會退回 `localhost:8080` 而失敗。
  真正能用 kubeconfig 的是 **VCF services runtime 節點**（單節點 k8s control plane）。
  如果在錯的節點上跑 `kubectl get pd ...` 看不到東西，先確認你在哪一台。
  （這也呼應原文「先找出 control plane 節點」那一步——找錯就白做。）
- **要停 VSP 節點時，四台要同時硬關**。逐台優雅關機會被還活著的節點救回來，看起來像「自己開機」。
  參見 `debug-vcf9.1` 的 08 章 §5。
- 巢狀環境的 rollout 會比原文說的 10–15 分鐘慢，別太早判定失敗；判斷「還在跑 vs 卡死」看 pod 是否有變化、
  節點磁碟／映像是否成長，不要只看 UI 狀態欄。

## 尚待驗證

- **KB 編號**（原文只說「從 KB 文章下載」，沒給編號；腳本檔名已知＝`rightsize-day0-workers.sh`）。
- **HA 部署的影響**：原文沒有說明（9.1.1 另有 Small HA VCFMS 部署選項），HA 環境套用前要另外確認。
- 是否可回復（rollback）：原文未提。
- 縮減後在巢狀 vSAN 上是否仍穩定（我們的環境對 etcd fsync 特別敏感）。
- 若環境已裝過 Day-N 服務再移除，是否就能套用。
