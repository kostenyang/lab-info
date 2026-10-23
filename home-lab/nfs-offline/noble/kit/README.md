# NFS 離線安裝包 — Ubuntu 24.04 (noble) amd64

air-gap（完全不能上網）的 Ubuntu 24.04 上安裝 NFS server / client 用。

## 內容

| 檔案 | 說明 |
|------|------|
| `repo/` | flat apt repo：`nfs-kernel-server`、`nfs-common`、`rpcbind`、`keyutils` 加上完整相依 closure 的 `.deb`，另有 `Packages`、`Packages.gz`、`Release` |
| `install-nfs-offline.sh` | 離線安裝 + 設定 export + 啟動服務 |
| `MANIFEST.txt` | 每個套件的版本與來源 pocket（noble / -updates / -security） |
| `SHA256SUMS` | 每個 deb 的 SHA256（和 Ubuntu 官方 index 一致） |

版本取 noble、noble-updates、noble-security 三個 pocket 中**最新**的那版。

## 安裝（目標機，root）

```bash
tar xzf nfs-offline-noble-amd64.tar.gz
cd nfs-offline-noble-amd64
sha256sum -c SHA256SUMS --quiet        # 選擇性：檢查檔案完整性

# NFS server：export /srv/nfs 給 10.0.0.0/23
sudo ./install-nfs-offline.sh /srv/nfs 10.0.0.0/23

# 只裝 client（nfs-common）
sudo ./install-nfs-offline.sh --client

# 只裝 server 套件，export 之後自己設定
sudo ./install-nfs-offline.sh --pkg-only
```

參數 `[EXPORT_DIR] [ALLOWED_CIDR] [OPTIONS]` 的預設值分別是 `/srv/nfs`、`*`、`rw,sync,no_subtree_check,no_root_squash`。

## 運作方式

- 把 `repo/` 複製到 `/opt/nfs-offline-noble/repo`，只用這一個來源跑 `apt-get update` 和 `install`（`Dir::Etc::sourcelist`、`sourceparts=-`）。不會改 `/etc/apt/sources.list*`，也不會清掉原本的 apt lists。
- 由 apt 決定要裝什麼：**只裝缺少的套件**，已經裝好的基底套件（libc6、libkrb5 等）不會降版。舊版 jammy 用 `dpkg -i debs/*.deb` 全部硬裝，可能把系統套件降版，這個問題已經避開。
- 離線機器的時鐘常常不準，所以關掉 Release 的日期檢查（`Check-Date` / `Check-Valid-Until=false`）。
- apt 失敗時會自動退回 dpkg，只裝「沒裝」或「比現有版本新」的 deb。

## Client 掛載

```bash
sudo mount -t nfs <server_ip>:/srv/nfs /mnt
# NFS 4.1
sudo mount -t nfs -o vers=4.1 <server_ip>:/srv/nfs /mnt
```

## 實測紀錄（2026-10-22）

兩台 Ubuntu 24.04.5 cloud image，都沒有 default route、沒有 DNS（完全連不到外網）。

| 步驟 | 結果 |
|------|------|
| server 機 `--client` | 只新裝 4 個套件：nfs-common、rpcbind、keyutils、libnfsidmap1；**0 upgraded** |
| 同一台再跑 server 模式 `/srv/nfs 10.0.0.0/23` | 只新裝 nfs-kernel-server；NFS v3/4/4.1/4.2 在 2049 listen |
| 另一台新機 `--client` | 一樣只新裝 4 個套件 |
| 從 client 以 `vers=4.1`、`vers=3` 掛載 | 兩種各寫入 200 MiB 成功；server 端檔案 uid/gid 為 0（no_root_squash 生效） |

沒測到的部分：dpkg 退回路徑（apt 失敗時才會走）、Ubuntu minimized image。

## 重新打包（有網路的機器，任何 OS）

```bash
python -I build-noble-nfs-bundle.py                 # 預設 nfs-kernel-server nfs-common rpcbind keyutils
python -I build-noble-nfs-bundle.py nfs-common      # 只打包 client
```

不需要 Ubuntu 24.04 打包機：腳本會直接下載 archive.ubuntu.com 的 `Packages.xz`，自己解析相依並下載 deb。
