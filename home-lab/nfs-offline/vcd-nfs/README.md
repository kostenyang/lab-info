# VCD 專用 NFS Server（air-gap / Ubuntu 22.04）

給 **VMware Cloud Director (VCD)** 當共用 **transfer share** 的專用 NFS server。
所有 VCD cell 都會把這個 export 掛到 `/opt/vmware/vcloud-director/data/transfer`。
全程 **air-gap**：NFS 套件不靠目標機上網，而是離線 bundle 帶進去裝。

## 為什麼要這台
VCD 多 cell（appliance cluster）需要一塊**共用**儲存放憑證、responses、上傳中的 OVF/media、
升級檔等。官方要求：所有 cell 讀寫同一個 NFS export、部署第一個 cell 前 share **必須是空的**、
export 要 `no_root_squash`（讓 appliance firstboot 以 root 建立/接管子目錄）。

## 環境 / 參數（本 lab）
| 項目 | 值 |
|---|---|
| NFS VM | `vcd-nfs01.home.lab` = **10.0.0.60**（/23, gw 10.0.0.1, dns 10.0.0.200）|
| OS | Ubuntu 22.04 (jammy) cloud image |
| 放置 | 外層 vCenter 10.0.0.101 / DC=Datacenter / cluster=Cluster / ds=vsanDatastore / folder=VCF / net=**MGMT** |
| Sizing | 2 vCPU / 4 GB / 200 GB thin |
| Export | `/nfs/vcd-transfer` → `10.0.0.0/23(rw,sync,no_subtree_check,no_root_squash)` |
| 打包機 | 10.0.0.18（Ubuntu 20.04，有網）— 用 debootstrap 建 jammy chroot 抓 jammy deb |

## 檔案
| 檔 | 跑在哪 | 作用 |
|---|---|---|
| `build-nfs-bundle.sh` | 打包機 10.0.0.18（有網）| debootstrap jammy chroot → 抓 nfs deb closure → `nfs-offline-bundle-jammy.tar.gz` |
| `Deploy-VcdNfsVm.ps1` | jumpbox（本機）| govc 匯入 jammy OVA + cloud-init（IP/密碼/hostname）+ 開機 |
| `install-vcd-nfs.sh` | 目標 VM（air-gap）| 離線 dpkg 裝 NFS + 設 VCD transfer export + 驗證 |

## 流程（air-gap 兩階段）

### 階段 A — 線上打包（在 10.0.0.18）
```bash
# 產出 /root/nfs-offline-bundle-jammy.tar.gz（jammy amd64 deb 全相依）
sudo bash build-nfs-bundle.sh
```
> 打包機是 focal(20.04)，用 debootstrap 起一個 **jammy** chroot 抓「對版本」的 deb，
> 抓完自動清掉 chroot。不需要另一台 22.04 機器。

### 階段 B — 布 VM（在 jumpbox）
```powershell
# 下載 jammy OVA（本機有網）
Invoke-WebRequest https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.ova `
  -OutFile E:\9.1\jammy-server-cloudimg-amd64.ova
# 匯入 + cloud-init + 開機
pwsh E:\9.1\nfs-offline\vcd-nfs\Deploy-VcdNfsVm.ps1
```

### 階段 C — 離線裝 NFS + 設 VCD export（把 bundle+腳本送上目標機）
```bash
# 從 10.0.0.18 或 jumpbox 把這兩個帶到 10.0.0.60：
#   nfs-offline-bundle-jammy.tar.gz  +  install-vcd-nfs.sh
tar xzf nfs-offline-bundle-jammy.tar.gz          # 解出 debs/
sudo bash install-vcd-nfs.sh /nfs/vcd-transfer 10.0.0.0/23
```

## 在 VCD 端使用
部署 VCD appliance 時，transfer share 填：
```
NFS mount = 10.0.0.60:/nfs/vcd-transfer
```
cell 端掛載點固定為 `/opt/vmware/vcloud-director/data/transfer`。

## 驗證
```bash
showmount -e 10.0.0.60
sudo mount -t nfs 10.0.0.60:/nfs/vcd-transfer /mnt && touch /mnt/_w && rm /mnt/_w && umount /mnt && echo RW-OK
```

## 注意
- **share 必須空的**：第一個 cell 部署前 `/nfs/vcd-transfer` 不能有殘檔。
- **no_root_squash 必要**：拿掉會讓 appliance firstboot 無法建立/接管子目錄。
- 正式環境把 `10.0.0.0/23` 收斂成實際 cell IP 清單更安全。
- 容量：transfer share 要能容納「同時上傳的最大 OVF/media 量」；lab 給 200GB，正式依用量放大。
