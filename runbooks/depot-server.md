# Runbook: Offline Depot Server (`rtolab-depotsrv`)

The rtolab offline VCF software depot. Holds VCF install + upgrade/patch binaries and
serves them over plain HTTP to the VCF Installer / SDDC Manager (no Broadcom Connect
reachability needed from the mgmt segment).

## Identity

| Item | Value |
|------|-------|
| Hostname | `rtolab-depotsrv` (**no DNS record** — reference by raw IP) |
| IP | `172.16.10.50` (jumpbox segment 172.16.10.0/24) |
| OS / creds | Ubuntu; `root` / `ubuntu` = `VMware1!VMware1!` (SSH via Posh-SSH from jumpbox) |
| Web server | nginx `:8888`, autoindex on. `location /PROD/ → /depot/PROD/`, `/vcf9/ → /depot/` |
| Depot URL | `http://172.16.10.50:8888/PROD/` |
| VM | outer host `172.16.10.3`, datastore `esxi-vol3`, folder `kosten-rtolab`, **180 GB thin vmdk** |
| Deploy script | rtolab `scripts/_deploy_depot_seed.ps1` (cloud-init seed ISO → static .50) |

**Not** the same as `kosten-depot` @ 192.168.114.65 (separate mgmt-segment depot, currently down).
The `.50` is a number coincidence with retired 521 `kosten-vcf521-esx01` @ 192.168.114.50 — different
/24, no conflict.

## Point the VCF Installer at it

rtolab `scripts/_inst_depot.ps1` waits for the 9.1 Installer (192.168.114.5) then:
`PUT /v1/system/settings/depot {isOfflineDepot:true, url:"http://172.16.10.50:8888"}`
→ `PATCH /v1/system/settings/depot/depot-sync-info` (metadata sync) → poll → `GET /v1/bundles`.

## Download binaries onto the depot

The **VCF Download Tool** is installed **on the depot VM itself** at `/root/vcf-download-tool`
(v9.0.2.0.25151284; also `/root/vcf-download-tool-91`). Broadcom Connect token: `/root/vcf-token.txt`.
The VM has internet (gw 172.16.10.254, DNS 8.8.8.8). All downloads land in `/depot/PROD/COMP/<COMPONENT>/`.

```bash
# SSH in (from jumpbox, Posh-SSH): root / VMware1!VMware1!
cd /root/vcf-download-tool/bin

# INSTALL binaries (greenfield deploy set) — helper: /root/run-vdt.sh
./vcf-download-tool binaries download --depot-store=/depot \
  --depot-download-token-file=/root/vcf-token.txt --ceip=DISABLE \
  --vcf-version=9.1.0.0 --automated-install -t INSTALL

# UPGRADE / PATCH binaries (SDDC-Manager-managed lifecycle)
./vcf-download-tool binaries download --depot-store=/depot \
  --depot-download-token-file=/root/vcf-token.txt --ceip=DISABLE \
  --vcf-version=9.1.0.0 --lifecycle-managed-by=SDDC_MANAGER_VCF -t UPGRADE

# List what's available (same filters, swap `download`→`list`) before pulling
# Free disk: `./vcf-download-tool binaries cleanup ...`
```

Behaviour: **cumulative** — re-running skips already-present + checksum-valid files
(`ALREADY_DOWNLOADED`), so it's safe/idempotent. `-t` only accepts `INSTALL | UPGRADE`
(no `PATCH`). Newer patch builds appear **only** under `-t UPGRADE` — there is **no INSTALL
bundle published beyond 9.1.0.0 GA**. Log: `/root/vcf-download-tool/log/vdt.log`.

## Disk / growing the vmdk

Single 180 GB thin disk → `/dev/sda1` (ext4) on `/`. Datastore `esxi-vol3` has ~2.5 TB free,
so grow freely when a download set won't fit:

1. Outer vCenter (172.16.10.100, `administrator@vmwaresso.taiwan` / `381VMware1!admin`):
   `Get-VM rtolab-depotsrv | Get-HardDisk | Set-HardDisk -CapacityGB <new>` (no snapshot must exist).
2. In guest: `growpart /dev/sda 1 && resize2fs /dev/sda1` (online, ext4-safe).

> Partition layout is GPT: `sda14` (bios_grub) + `sda15` (EFI) sit **before** `sda1` (root),
> so `growpart /dev/sda 1` extends root into trailing free space. If `growpart` says `NOCHANGE`,
> the partition already fills the vmdk → grow the vmdk first (step 1).

## Current contents (2026-06-25)

Full **9.1.0.0 INSTALL** set (vCenter, NSX, SDDC Mgr, VCFA/VRA, VROPS, Ops Proxy, vIDB, HCX,
License, Salt, Telemetry, VSP, …).

**Async patch builds** (UPGRADE/PATCH, `-t UPGRADE`) — latest per component as of 2026-07-02:

| Component | Latest patch build | Release | Size |
|-----------|--------------------|---------|------|
| SDDC_MANAGER_VCF | **`9.1.0.0300.25536191`** | 2026-06-30 | 2.4 GB |
| ESX_HOST | `9.1.0.0100.25433460` | 2026-06-05 | 0.7 GB |
| HCX | `9.1.0.0100.25426672` | 2026-06-05 | 4.7 GB |
| NSX_T_MANAGER | `9.1.0.0100.25470810` | 2026-06-05 | 6.4 GB |
| VCENTER | `9.1.0.0100.25417926` | 2026-06-05 | 28.7 GB |

SDDC Manager gets frequent async patches (`0100`→`0200`→`0300`); the rest top out at `0100`
(2026-06-05). GA (`…2537xxxx`, 2026-05-12) + all intermediate patch builds remain alongside
(download is cumulative). This is the **latest available** for the token's catalog — `9.1.0.1 /
9.1.0.2 / 9.1.1.0` return `0 elements`（**此結論已於 2026-09-04 失效，見文末 9.1.1 專節**）, and there is no INSTALL bundle newer than 9.1.0.0 GA.
Depot ≈ 154 GB used / 21 GB free.

> **Catalog cache gotcha**: the tool caches the product-version catalog; a stale cache can hide a
> just-released build (e.g. `0300` didn't show until a fresh run). New patch builds live under the
> `9.1.0.0` bucket — `--vcf-version=9.1.0.0300` alone returns `0 elements`. Always re-check with the
> **range**: `binaries list … --vcf-version=9.1.0.0..9.9.9.9 --lifecycle-managed-by=SDDC_MANAGER_VCF -t UPGRADE`.

---

## VCF 9.1.1（2026-09-04 新增，取代上節「9.1.1.0 回 0 elements」的舊結論）

**9.1.1.0 已經可以下載了**，而且用的還是**同一份既有 download token**（`/root/vcf-token.txt`）——
不需要另外申請什麼 software ID：

```bash
/root/vcf-download-tool-91/bin/vcf-download-tool releases list \
  --depot-download-token-file=/root/vcf-token.txt
# → Depot credentials are valid. / 清單第一項就是 9.1.1.0
```

### 認證方式已經在換（現在還不急）

| 參數 | 狀態 |
|---|---|
| `--depot-download-token-file` | 我們在用的；工具標為 **superseded**，但註明 *available until 5.x is not EOL* |
| `--depot-download-activation-code-file` | 新的。**activation code 在 Broadcom download portal 用自己的帳號權益產生**，存成單行文字檔 |

要換的時候只要把檔案換掉、參數換名即可，流程不變。

### ⚠️ 9.x 沒有 UPGRADE bundle

```bash
bash /root/my-vcfdepot.sh -t /root/vcf-token.txt --type UPGRADE --filename-like '*9.1.1*' --summary
# → Components: 1  Files: 1  Total: 0.0 GB   ← 空的
```

**fleet 元件在 9.x 一律以 `INSTALL` 發佈**（Fleet LCM 是「安裝服務」不是「升級包」）。
要抓 9.1.1 一定要用 `--type INSTALL`，用 UPGRADE 會什麼都抓不到還以為沒發佈。

### 全套很大，別整套抓

```
全部 9.1.1：48 元件 / 300 檔 / 266.9 GB   ← 磁碟塞不下
```

### 這次實際抓下來的（升級這套 fleet 需要的最小集合）

用 `--type INSTALL --filename-like '*9.1.1*' --latest-only`，腳本 `/root/dl911.sh`（分 A/B 兩段，
先抓管理層確保 VRA/VSP 落地，磁碟不夠時 B 可放棄）：

| 元件 | 檔數 | 大小 |
|---|---|---|
| VSP | 6 | 16.11 GB |
| **VRA（VCF Automation）** | 4 | **15.67 GB** |
| VCENTER | 1 | 9.71 GB |
| NSX_T_MANAGER | 1 | 8.26 GB |
| VCF_OPS_CLOUD_PROXY | 1 | 3.22 GB |
| VROPS | 1 | 3.15 GB |
| SDDC_MANAGER_VCF | 1 | 2.40 GB |
| DEPOT_SERVICE / VCF_LICENSE_SERVER / VIDB / VCF_SALT_RAAS / VCF_SDDC_LCM / VCF_FLEET_LCM / VCFDT / VCF_SALT / TELEMETRY_ACCEPTOR | 各 1–4 | 合計 ~5.5 GB |
| **總計** | **45** | **64.03 GB** |

驗證：`sha256 matches catalog` **45 OK / 0 不符 / 0 錯誤**。之後磁碟 686G 已用、**90 GB 可用**。

### 踩雷

- **包裝腳本 `my-vcfdepot.sh` 成功也會回 `RC=1`** —— 兩段都印了 `Done. Depot root` 且 sha256 全 OK，
  退出碼仍是 1。**不要用退出碼判斷成敗**，改看：
  ```bash
  grep -c 'sha256 matches catalog' /root/dl911.out     # 應等於檔案數
  grep -icE 'mismatch|checksum fail' /root/dl911.out   # 應為 0
  ```
- 抓之前先用 `--summary` 估算，再對 `df -h /` 確認放得下；本機只有一顆 776 GB 的 `/`，
  depot 撐爆會連 nginx 服務一起拖下水。
