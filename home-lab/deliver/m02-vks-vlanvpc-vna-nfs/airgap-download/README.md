# Air-gap 下載清單與指令：VCF 9.1.1 + VLAN-backed VPC + VNA + VKS + NFS

> 📄 Word 版：`AirGap-Download-Checklist-VCF911-VKS-NFS.docx`

本文件列出在**完全隔離網路（air-gap）**部署下列架構前，要先在有網路的機器上下載的所有東西，以及每一項的下載方法與指令：

- VCF 9.1.1 管理網域，用 VCF Installer bring-up，**不部署 VCF Management Services**（沒有 Software Depot）
- VLAN-backed VPC + Distributed Transit Gateway + VNA
- Supervisor + VKS 叢集，image 全部從內部 Harbor 拉
- VKS 節點 eth1 走 NFS 專用 VLAN，用 NFS CSI 提供 RWX

清單與檔名、大小都是 lab 實際下載與部署用過的值（2026-10）。版本會更新，下載前先用文中的「列出」指令確認最新版。

## 0. 整體流程與需要的帳號

| 階段 | 在哪裡 | 做什麼 |
|---|---|---|
| 1. 下載 | 有網路的 staging / bastion 機 | 平台 binaries（Installer、ESXi、bundles）、VKr、Harbor、container image（存成 tar）、NAS 套件、工具 |
| 2. 打包 | staging 機 | 依第 8 節的目錄放好，`sha256sum` 產生清單 |
| 3. 搬運 | USB 或隔離區傳檔 | 整包搬進隔離網路 |
| 4. 驗證 | 隔離網路的 admin 機 | `sha256sum -c` 全部 OK |
| 5. 匯入 | 隔離網路 | bundles → offline depot → VCF Installer；VKr → vCenter Content Library；image → Harbor → VKS；NAS 套件 → NFS server |

| 帳號 / 憑證 | 用在哪裡 | 怎麼取得 |
|---|---|---|
| Broadcom Support Portal 帳號 | 下載 VCF Installer OVA、VCF Download Tool、ESXi ISO | 客戶自己的 entitlement |
| **Depot download token** | `vcf-download-tool binaries` 下載平台 bundles；也可以直接組 URL 下載單一檔案 | Broadcom Support Portal 產生，存成 `token.txt` |
| 不需要 | VKr、Harbor、NFS CSI、app image、Ubuntu 套件 | 這些都是公開來源，不用登入 |

> ℹ️ 這個情境**沒有 Software Depot**，所以**不需要** depot activation code、也不用 `vcf-download-tool artifacts` 子命令。VKr 直接從 Broadcom 公開的 content library 網址下載（第 3 節）。

## 1. 總表

| # | 項目 | 版本 / 檔名（lab 實際值） | 大小 | 來源 | 用在 |
|---|---|---|---|---|---|
| 1 | VCF Installer OVA | `VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova` | 2.4 GiB | Support Portal 或 token URL | 部署 VCF Installer |
| 2 | VCF Download Tool | `vcf-download-tool-9.1.1.0200.25801073.tar.gz` | 約 500 MiB | Support Portal（VCF Lifecycle Management） | staging 機下載 bundles |
| 3 | ESXi 安裝 ISO | `VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso` | 700 MiB | Support Portal 或 token URL | 安裝實體主機（build 要等於 Installer BOM） |
| 4 | VCF Installer bundles | `binaries download --automated-install`，16 個元件 INSTALL | 64.2 GiB（不含 VCF Automation 48.5 GiB） | download tool + token | offline depot → Installer |
| 5 | VKr（Kubernetes release） | `photon-5-amd64-v1.36.2---vmware.2-vkr.3`（4 個檔） | 3.2 GiB / 版 | `wp-content.broadcom.com`（公開） | vCenter Local Content Library |
| 6 | Harbor offline installer | `harbor-offline-installer-v2.15.4.tgz` | 713 MiB | GitHub goharbor/harbor | 內部 registry |
| 7 | Docker（Harbor 主機用） | `docker-29.9.0.tgz` + `docker-compose-linux-x86_64` | 82 MiB + 31 MiB | download.docker.com / GitHub | Harbor 主機 |
| 8 | NFS CSI manifests | csi-driver-nfs `deploy/v4.13.4/` 4 個 yaml | < 20 KB | GitHub kubernetes-csi/csi-driver-nfs | VKS 叢集 |
| 9 | NFS CSI images | 6 個（見第 5 節） | 約 490 MiB | registry.k8s.io | 推進 Harbor |
| 10 | 應用程式 image（demo） | `nginx-unprivileged:1.30.4-alpine`、`busybox:1.37.0` | 59 MiB + 4.5 MiB | docker.io | 推進 Harbor |
| 11 | NAS（Linux 才需要） | Ubuntu 22.04 cloud image OVA + `nfs-kernel-server` debs | 678 MiB + 數 MiB | cloud-images.ubuntu.com / apt | NFS server |
| 12 | 工具 | `govc`、`imgpkg`、`yq`、`jq`、python3 | 數十 MiB | GitHub / apt | staging 與內網 admin 機 |

不需要另外下載的東西：

| 項目 | 原因 |
|---|---|
| Supervisor 控制平面 / spherelet | 隨 vCenter 9.1.1 提供，lab 啟用 Supervisor 時沒有另外餵 content library |
| Local Consumption Interface（namespace 的 Resources 分頁） | Supervisor 自動安裝 |
| kubectl + vSphere plugin | 從 Supervisor 本身下載（第 3-2 節） |
| VNA | 隨 NSX 部署，不用另外下載 |

## 2. 平台：VCF Installer、ESXi、Installer bundles

### 2-1 VCF Installer OVA 與 VCF Download Tool

Broadcom Support Portal → My Downloads → VMware Cloud Foundation → 9.1.1：

- **VCF Installer**：檔名是 `VCF-SDDC-Manager-Appliance-<版本>.ova`（Installer 與 SDDC Manager 是同一個 OVA）。
- **VCF Download Tool**：在 **VCF Lifecycle Management** 頁面。**工具版本要跟要下載的 VCF 版本同一代**（9.1.x 用 9.1.x 的工具；lab 實測 9.0.2 版工具下載的 depot 缺整層 fleet 元件，Installer 驗證會失敗）。

也可以用 depot download token 直接組 URL 下載（token 放在路徑裡，不是 header）：

```bash
TOKEN=$(cat token.txt)
curl -fLO "https://dl.broadcom.com/${TOKEN}/PROD/COMP/SDDC_MANAGER_VCF/VCF-SDDC-Manager-Appliance-9.1.1.0.25713928.ova"
```

### 2-2 ESXi 安裝 ISO

主機的 ESXi build **必須等於 Installer BOM 的版本**（Installer 9.1.1.0.25713928 對應 ESXi 9.1.1.0.25714478）。`binaries list -t INSTALL` 不會列 ESX_HOST，從 Support Portal 下載，或用 token URL：

```bash
curl -fLO "https://dl.broadcom.com/${TOKEN}/PROD/COMP/ESX_HOST/VMware-VMvisor-Installer-9.1.1.0.25714478.x86_64.iso"
# 之後要用 vLCM 管主機映像（offline depot zip，catalog 沒列但檔案存在）：
curl -fLO "https://dl.broadcom.com/${TOKEN}/PROD/COMP/ESX_HOST/VMware-ESXi-9.1.1.0.25714478-depot.zip"
```

### 2-3 VCF Installer bundles（vcf-download-tool）

Installer bring-up 時要從 depot 取得 vCenter、SDDC Manager、NSX 等 bundle；`--automated-install` 只下載 Installer 需要的那一組。

```bash
tar xzf vcf-download-tool-9.1.1.0200.25801073.tar.gz -C /opt/vcf-dltool
cd /opt/vcf-dltool

# 1. 先列出（確認 token 有效、看版本與大小）
./bin/vcf-download-tool binaries list \
    --vcf-version=9.1.1.0 --automated-install -t INSTALL \
    --depot-download-token-file=token.txt --ceip=DISABLE

# 2. 下載到 depot 目錄（可重跑，已下載的會跳過）
./bin/vcf-download-tool binaries download \
    -d=/depot --vcf-version=9.1.1.0 --automated-install -t INSTALL \
    --depot-download-token-file=token.txt --ceip=DISABLE
```

lab 實際列出的 16 個元件（INSTALL，2026-10-13 那一批；合計 64.2 GiB）：

| 元件 | 版本 | 大小 |
|---|---|---|
| VCENTER | 9.1.1.0100.25784172 | 9.7 GiB |
| NSX_T_MANAGER | 9.1.1.0100.25762940 | 8.3 GiB |
| SDDC_MANAGER_VCF | 9.1.1.0200.25801071 | 2.4 GiB |
| VSP（VCF services runtime） | 9.1.1.0100.25801571 | 16.1 GiB |
| VRA（VCF Automation） | 9.1.1.0200.25801570 | 15.7 GiB |
| VROPS（VCF Operations） | 9.1.1.0100.25795063 | 3.1 GiB |
| VCF_OPS_CLOUD_PROXY | 9.1.1.0100.25795064 | 3.2 GiB |
| DEPOT_SERVICE / VCF_LICENSE_SERVER / VIDB | 0200 / 0100 / 0100 | 880 / 884 / 859 MiB |
| VCF_SDDC_LCM / VCF_FLEET_LCM | 9.1.1.0200 | 650 / 583 MiB |
| VCF_SALT / VCF_SALT_RAAS / TELEMETRY_ACCEPTOR | 9.1.1.0100 | 394 / 656 / 241 MiB |
| VCF_SERVICE_VCD_MIGRATION_BACKEND | 9.1.1.0200.25801570 | 525 MiB |

> ⚠️ 雖然這個架構不部署 VCF Management Services，**Installer 的「Versions and Bundles」驗證會檢查 spec 裡所有元件的 bundle**，lab 是整組都下載好才送出 bring-up。spec 若把 VCF Automation 設成「之後再部署」，VRA（15.7 GiB）理論上可省，lab 沒有單獨驗證過。
>
> ⚠️ 不帶 `--latest` 時，工具列出的是各元件在 9.1.1 下的最新 build（0100 / 0200 patch train）。**要和實際部署的 Installer OVA 版本相符**；用較舊的 Installer（例如 9.1.1.0.25713928）就要下載它 BOM 對應的 build，或改用新版 Installer OVA。
>
> ⚠️ 下載中斷會留下半截檔，重跑前先刪掉，否則工具會誤判已下載。

### 2-4 在隔離網路提供 offline depot

把 `/depot` 整個目錄搬進隔離網路，用 Web server 以 HTTPS + Basic auth 提供（lab 用 nginx，docroot 指到 `/depot`，網址 `https://<depot>/PROD/...`）。然後設定 VCF Installer 指向它：

```bash
# Installer 的 offline depot 設定（帳密放 offlineAccount，網址用 IP）
curl -k -X PUT https://<installer>/v1/system/settings/depot \
  -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"offlineAccount":{"username":"<depot-user>","password":"<depot-pass>"},
       "depotConfiguration":{"isOfflineDepot":true,"url":"https://<depot-IP>"}}'
```

> 🔴 lab 踩過的坑：網址用 FQDN 會回 `VMWARE_DEPOT_OFFLINE_INVALID_URL`（訊息說 URL 有 query / fragment，實際沒有），**改用 IP 就過**；帳密要放在 `offlineAccount`，放進 `depotConfiguration` 會變成 401。depot 用自簽憑證時，CA 要先匯進 Installer。

## 3. VKS

### 3-1 VKr（Kubernetes release）

Broadcom 把 VKr 放在公開的 content library 網址，**不用登入**。`items.json` 是目錄，每個版本一個 item，item 內有 4 個檔（`.ovf`、`-disk1.vmdk`、`.mf`、`.cert`）。

```bash
BASE=https://wp-content.broadcom.com/v2/latest
curl -fsSL $BASE/items.json -o items.json

# 列出可下載的版本（取最新幾個）
jq -r '.items[].name' items.json | sort -V | tail -10

# 下載一個版本（lab 用 v1.36.2）
IT=ob-25650988-photon-5-amd64-v1.36.2---vmware.2-vkr.3
mkdir -p vkr/$IT
for href in $(jq -r --arg n "$IT" '.items[] | select(.name==$n) | .files[].hrefs[0]' items.json); do
  curl -fSL --retry 3 -o "vkr/$IT/$(basename $href)" "$BASE/$href"
done
ls -la vkr/$IT
```

| 選版本的原則 | 說明 |
|---|---|
| VKr 要和 VKS Service 版本相容 | lab：VKS Service 3.7.0（ClusterClass `builtin-generic-v3.7.0`）配 v1.36.2 |
| 建議至少帶 2–3 個 minor | 之後叢集升級用；lab item 例：v1.36.2、v1.35.6、v1.34.9 |

匯入方式：vCenter → Content Libraries → 建 **Local** library → ACTIONS → **Import item → Local file**，一次選 4 個檔 → Supervisor → Configure → General → Kubernetes Service → ADD 這個 library。

### 3-2 kubectl 與 vSphere plugin

不用從網路下載。Supervisor 啟用後直接從它的 API VIP 下載：

```bash
curl -kLO https://<Supervisor-API-VIP>/wcp/plugin/linux-amd64/vsphere-plugin.zip
unzip vsphere-plugin.zip && sudo install bin/kubectl bin/kubectl-vsphere /usr/local/bin/
```

### 3-3 （選用）VKS Standard Packages

這個 lab 沒有用到 add-on。要裝 cert-manager、Contour 等套件時，用 imgpkg 把整個 bundle 存成 tar，搬入後推進 Harbor：

```bash
# staging
imgpkg copy -b projects.packages.broadcom.com/vsphere/supervisor/vks-standard-packages/<版本>/vks-standard-packages:<版本> \
  --to-tar vks-standard-packages-<版本>.tar --cosign-signatures
# 隔離網路
imgpkg copy --tar vks-standard-packages-<版本>.tar --to-repo <harbor>/vks/vks-standard-packages --cosign-signatures
```

版本以 Supervisor 上 `builtin-addonrepository-<版本>` 的 imageURL 為準。

## 4. Harbor（內部 registry）

### 4-1 下載

```bash
# 方法 A（建議）：官方 offline installer，內含 Harbor 所有 image
VER=v2.15.4
curl -fLO https://github.com/goharbor/harbor/releases/download/$VER/harbor-offline-installer-$VER.tgz

# Docker：用靜態二進位（不必準備 apt 套件）
curl -fLO https://download.docker.com/linux/static/stable/x86_64/docker-29.9.0.tgz
curl -fLo docker-compose-linux-x86_64 https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64
```

> ℹ️ 方法 B（lab 實際做法）：GitHub 下載很慢時，改抓 online installer（12 KB），再在 staging 機 `docker pull` Harbor 各元件 image 後 `docker save` 成 tar 搬入。Harbor 2.15 用 `valkey-photon`（已經沒有 `redis-photon`）。

### 4-2 隔離網路安裝重點

1. 解開 Docker 靜態二進位、裝 compose plugin、啟動 dockerd（[`scripts/install-docker-static.sh`](scripts/install-docker-static.sh)）。
2. 自簽 CA + server 憑證（SAN 含 FQDN 與 IP），`harbor.yml` 設 hostname / 憑證 → `./install.sh`。
3. Harbor 建 public project：`vks-apps`（應用）、`csi`（NFS CSI）。
4. **把 Harbor CA 貼到 Supervisor → Configure → Container Registries → ADD REGISTRY**：Supervisor 會下發到 VKS 節點，叢集不需要另外設定 trust。

## 5. Container image（NFS CSI 與應用程式）

### 5-1 清單

| image（來源） | 推進 Harbor 後 | 大小 |
|---|---|---|
| `registry.k8s.io/sig-storage/nfsplugin:v4.13.4` | `<harbor>/csi/nfsplugin:v4.13.4` | 147 MiB |
| `registry.k8s.io/sig-storage/csi-provisioner:v6.3.0` | `<harbor>/csi/csi-provisioner:v6.3.0` | 98 MiB |
| `registry.k8s.io/sig-storage/csi-resizer:v2.2.0` | `<harbor>/csi/csi-resizer:v2.2.0` | 92 MiB |
| `registry.k8s.io/sig-storage/csi-snapshotter:v8.6.0` | `<harbor>/csi/csi-snapshotter:v8.6.0` | 93 MiB |
| `registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.17.0` | `<harbor>/csi/csi-node-driver-registrar:v2.17.0` | 30 MiB |
| `registry.k8s.io/sig-storage/livenessprobe:v2.19.0` | `<harbor>/csi/livenessprobe:v2.19.0` | 30 MiB |
| `docker.io/nginxinc/nginx-unprivileged:1.30.4-alpine` | `<harbor>/vks-apps/nginx-unprivileged:1.30.4-alpine` | 59 MiB |
| `docker.io/library/busybox:1.37.0` | `<harbor>/vks-apps/busybox:1.37.0` | 4.5 MiB |

> NFS CSI 的 image tag 以下載的 manifest 為準（`grep image: deploy/v4.13.4/*.yaml`）。叢集預設 PSA 是 restricted，應用程式要選能以非 root 執行的 image（例如 `nginx-unprivileged`）。

### 5-2 下載 image（存成 tar）

staging 機有 docker：

```bash
for img in registry.k8s.io/sig-storage/nfsplugin:v4.13.4 registry.k8s.io/sig-storage/csi-provisioner:v6.3.0 \
           registry.k8s.io/sig-storage/csi-resizer:v2.2.0 registry.k8s.io/sig-storage/csi-snapshotter:v8.6.0 \
           registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.17.0 registry.k8s.io/sig-storage/livenessprobe:v2.19.0 \
           docker.io/nginxinc/nginx-unprivileged:1.30.4-alpine docker.io/library/busybox:1.37.0; do
  docker pull --platform linux/amd64 $img
  docker save $img -o "$(basename ${img%%:*})-${img##*:}.tar"
done
```

staging 機沒有 docker：用 [`scripts/pull-image-tar.py`](scripts/pull-image-tar.py)（只用 python3 標準函式庫，直接向 registry 抓 linux/amd64 層並組成 `docker load` 吃得下的 tar）：

```bash
python3 pull-image-tar.py registry.k8s.io/sig-storage/nfsplugin:v4.13.4 nfsplugin-v4.13.4.tar
# 其餘 7 個同理
```

### 5-3 NFS CSI manifests

```bash
V=v4.13.4
for f in rbac-csi-nfs.yaml csi-nfs-driverinfo.yaml csi-nfs-controller.yaml csi-nfs-node.yaml; do
  curl -fLO https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/$V/$f
done
# 搬入後把 image 前綴換成內部 Harbor
sed -i 's#registry.k8s.io/sig-storage/#<harbor>/csi/#' *.yaml
```

StorageClass 自己寫：`provisioner: nfs.csi.k8s.io`、`server: <NAS IP>`、`share: <export path>`、`mountPermissions: "0777"`、`mountOptions: [nfsvers=4.1]`。

### 5-4 隔離網路推進 Harbor

```bash
docker login <harbor>
for t in *.tar; do docker load -i "$t"; done
docker tag registry.k8s.io/sig-storage/nfsplugin:v4.13.4 <harbor>/csi/nfsplugin:v4.13.4
docker push <harbor>/csi/nfsplugin:v4.13.4
# 其餘 7 個同理（csi 開頭的推到 csi，應用推到 vks-apps）
```

## 6. NAS（只有用 Linux 當 NFS server 時）

客戶用 NetApp ONTAP 等儲存設備時不需要這一節，只要在 export policy 放行 VKS 節點 eth1 的網段。

```bash
# Ubuntu 22.04 cloud image（OVA）
curl -fLO https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.ova

# nfs-kernel-server 與相依 deb：在「同版本」的 Ubuntu 22.04 有網路機器上執行
sudo apt-get update
sudo apt-get install -y --download-only --reinstall -o Dir::Cache::archives="$PWD/debs" \
     nfs-kernel-server nfs-common rpcbind keyutils
ls debs/*.deb
```

> ⚠️ 安裝時只裝「沒裝過或比現有版本新」的 deb：bundle 會帶到 libc6、dpkg 等基底套件，新版 cloud image 已經比較新，全部 `dpkg -i` 會把系統套件降版（[`scripts/install-vks-nfs.sh`](scripts/install-vks-nfs.sh) 已處理；下載用 [`scripts/download-nfs-packages.sh`](scripts/download-nfs-packages.sh)）。

## 7. 工具（staging 與隔離網路的 admin 機）

```bash
gh_latest() { curl -fsSL https://api.github.com/repos/$1/releases/latest | jq -r .tag_name; }
curl -fsSLo imgpkg https://github.com/carvel-dev/imgpkg/releases/download/$(gh_latest carvel-dev/imgpkg)/imgpkg-linux-amd64
curl -fsSLo yq     https://github.com/mikefarah/yq/releases/download/$(gh_latest mikefarah/yq)/yq_linux_amd64
curl -fsSLo govc.tgz https://github.com/vmware/govmomi/releases/download/$(gh_latest vmware/govmomi)/govc_Linux_x86_64.tar.gz
chmod +x imgpkg yq && tar xzf govc.tgz govc
```

`jq`、`curl`、`python3`、`unzip` 用系統套件（隔離網路的 admin 機若沒有，一併用 `apt-get install --download-only` 帶 deb 進去）。

## 8. 搬運與驗證

建議的搬運目錄：

```text
airgap/
├── platform/   VCF Installer OVA、ESXi ISO（+ depot zip）、vcf-download-tool tgz
├── depot/      /depot 整個目錄（Installer bundles，約 64 GiB）
├── vkr/        ob-...-v1.36.2.../ 4 個檔（每版約 3.2 GiB）
├── harbor/     harbor-offline-installer、docker 靜態二進位、compose
├── images/     8 個 image tar
├── manifests/  NFS CSI yaml
├── nas/        cloud image OVA、debs/（Linux NAS 才需要）
├── tools/      imgpkg、yq、govc
└── SHA256SUMS
```

```bash
# staging：產生清單
cd airgap && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
# 隔離網路：搬入後驗證
cd airgap && sha256sum -c SHA256SUMS | grep -v ': OK$' || echo "ALL OK"
```

總量（含 VCF Automation bundle、1 個 VKr 版本）約 **73 GiB**；不含 VCF Automation 約 **57 GiB**。每多帶一個 VKr 版本加約 3.2 GiB。

## 9. 檢核表

| ✓ | 項目 | 確認方式 |
|---|---|---|
| ☐ | Installer OVA 版本 = bundles 版本 = ESXi ISO build | 檔名 build 對照第 2 節 |
| ☐ | `binaries download` 全部 SUCCESS / ALREADY_DOWNLOADED | 工具最後的摘要、沒有半截檔 |
| ☐ | offline depot 用 IP + HTTPS，CA 已匯入 Installer | Installer 的 depot 設定回 DEPOT_CONNECTION_SUCCESSFUL |
| ☐ | VKr 每個版本 4 個檔齊全 | `.ovf`、`-disk1.vmdk`、`.mf`、`.cert` |
| ☐ | Harbor 安裝檔 + Docker 靜態二進位 | 版本與 sha256 |
| ☐ | 8 個 image tar，`docker load` 測過 | staging 機先 load 一次 |
| ☐ | NFS CSI 4 個 yaml，image 前綴已換成內部 Harbor | `grep image:` |
| ☐ | （Linux NAS）cloud image + debs，Ubuntu 版本一致 | `/etc/os-release` |
| ☐ | SHA256SUMS 搬入後驗證通過 | `sha256sum -c` |
