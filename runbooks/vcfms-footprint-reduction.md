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

| | VCF 9.1.0 | VCF 9.1.1（縮減後） |
|---|---|---|
| Simple 部署 | 1 CP + **3** worker | 1 CP + **2** worker |
| Worker 規格 | 較大（為 Day-N 預留） | **12 vCPU / 24 GB** |

**關鍵：升級到 9.1.1 之後不會自動縮**。既有環境維持原尺寸，除非你手動跑右調腳本。

> **對本 lab 的意義**：巢狀環境的外層 RAM 一向吃緊，少一台 worker ≈ 直接回收 **12 vCPU / 24 GB**。
> rtolab 目前的 VSP 正是 1 CP（4 vCPU / 10 GB）+ 3×（12 vCPU / 24 GB）的舊配置。

---

## 前提條件

1. **已經升級到 VCF 9.1.1**（沒升就不適用）。
2. **環境沒有部署 Day-N 服務** —— 原文明講這個右調只適用於沒有 Day-N 服務的環境。
   有裝 Day-N 服務的環境不要套。
3. 取得 Broadcom KB 提供的右調腳本（原文未附 KB 編號與下載連結，**要自己查 KB**）。
4. 手上要有 control plane 節點的 SSH 憑證（`vmware-system-user`）。
   > 密碼來源：部署當時 VCF Installer 的 **REVIEW PASSWORDS**（值是遮罩的，**要先點開 `eye` 圖示**才看得到），
   > 或事後從既有的憑證保管處取得。**不要把密碼寫進任何 repo。**

---

## 步驟

### 1. 找出 control plane 節點

VCF Operations UI：

```
Build ▸ Lifecycle ▸ VCF Management ▸ Components ▸ VCF Services Runtime
```

在節點表格中找出 control plane 那一台。

### 2. 把腳本 scp 上去

```bash
scp <right-sizing-script> vmware-system-user@<control-plane-node>:/tmp/
```

### 3. SSH 進去、用 sudo 執行

```bash
ssh vmware-system-user@<control-plane-node>
sudo /tmp/<right-sizing-script>
```

### 4. 盯 rollout（約 10–15 分鐘）

```bash
kubectl get pd vmsp-platform -n vmsp-platform -w
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

- 實際的 KB 編號與腳本名稱。
- 縮減後在巢狀 vSAN 上是否仍穩定（我們的環境對 etcd fsync 特別敏感）。
- 若環境已裝過 Day-N 服務再移除，是否就能套用。
