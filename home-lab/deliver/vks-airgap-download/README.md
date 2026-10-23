## 1. 文件目的

本文件整理在**隔離網路（air-gap）環境**部署 vSphere Kubernetes Service（VKS）之前，客戶需要在有網際網路的 bastion 主機上預先下載的所有素材，以及每一項素材的下載來源、所需帳號與交付方式。

Broadcom 針對 VCF 9.1 提供兩條官方路線，依客戶環境版本與是否部署 VCF Management Services（VCFMS，含 Software Depot）擇一：

| 路線 | 適用環境 | 核心工具 | 所需憑證 |
|---|---|---|---|
| **路線 A：VCF Download Tool + Software Depot** | VCF / VVF **9.1.1 以上**，且已部署 VCFMS（有 Software Depot） | vcf-download-tool | **Depot activation code**（Broadcom Business Services console 產生） |
| **路線 B：手動下載 + 外部 registry** | VCF / VVF **9.1.0**，或 9.1.1 但**沒有 VCFMS / Software Depot**、或無法取得 activation code | curl、imgpkg、oci_image_depot_migrator.py | Broadcom Support Portal 帳號（僅 VCF CLI 與 Supervisor Service YAML 需要） |

> 官方來源：路線 A = Broadcom TechDocs「Deploy VKS in AirGapped Environments with VCF or VMware vSphere Foundation 9.1.1 and Later」；路線 B = GitHub vmware/vsphere-supervisor `airgapped/air-gapped-vcf91.md`（該文件開頭註明僅適用 9.1.0，9.1.1 以上請改走路線 A）。兩條路線本 lab 均已實機驗證。

## 2. 名詞與角色

| 名詞 | 說明 |
|---|---|
| Bastion 主機 | 可連網際網路的 Linux 主機（建議 Ubuntu 24.04），負責下載所有素材 |
| Admin 主機 | 隔離網路內的 Linux 主機，可連到 vCenter / Supervisor / Software Depot，負責匯入與後續操作。官方建議 2 vCPU / 4 GB / 150–200 GB 可用磁碟 |
| VKr | VMware vSphere Kubernetes release，VKS 叢集節點用的 OVF 映像，透過 vCenter Content Library 發佈 |
| VKS Standard Packages（VKS add-ons） | cert-manager、Contour、Prometheus、Grafana 等附加套件的 OCI bundle |
| Supervisor Services | 安裝在 Supervisor 上的服務（Harbor、ArgoCD、Contour、ExternalDNS 等），以 OCI image bundle 加 YAML 形式發佈 |
| Software Depot | VCF Fleet 內建的 OCI registry，路線 A 用它存放所有 OCI image |

## 3. 路線 A：VCF Download Tool + Software Depot（9.1.1 以上）

### 3.1 前置：客戶需自行準備

| 項目 | 取得方式 | 備註 |
|---|---|---|
| VCF Download Tool | Broadcom Support Portal → My Downloads → VMware Cloud Foundation → **VCF Lifecycle Management** 頁面 | bastion 與 admin 兩台都要裝 |
| Depot activation code | **Broadcom Business Services console** 產生，存成 `activation-code.txt` 放在 bastion | 🔴 這是 activation code，**不是** depot download token。`artifacts` 子命令只接受 activation code；lab 實測 token 會被拒絕。activation code 綁定客戶 site，必須由客戶自行產生 |
| VCF Operations admin 密碼 | 存成 `vcfops.txt` 放在 admin 主機 | 上傳到 Software Depot 時使用 |
| Software Depot FQDN | VCF Operations → Build → Lifecycle → VCF Management → Components，看 Fleet 元件的 FQDN | 上傳指令的 `--depot-fqdn` |
| 基本套件 | wget、curl、ssh、sshpass、docker、jq、yq、openssl | bastion 與 admin 兩台都要 |

### 3.2 下載清單（bastion 執行）

所有指令都在 vcf-download-tool 解壓目錄下執行，下載結果統一落在 `./depot-store`。

| # | 素材 | 指令參數 | 說明 |
|---|---|---|---|
| 1 | VKr OVA（Kubernetes 節點映像） | `--component=VKR` | 建議至少抓 3 個最新 minor 版本；版本要與環境的 VKS Service 版本相容 |
| 2 | VCF Consumption CLI | `--component=VCF_CONSUMPTION_CLI` | 取代已 deprecated 的 kubectl-vsphere |
| 3 | VCF Consumption CLI plugins | `--component=VCF_CONSUMPTION_CLI_PLUGINS` | 13 個 plugin 的離線 bundle |
| 4 | Supervisor Services（全部或單一） | `--category=SUPERVISOR_SERVICE` 或 `--component=SUPERVISOR_SERVICE_<名稱>` | 既有環境只抓要裝或要升級的服務；depot 版 YAML 會一併下載 |
| 5 | Harbor Supervisor Service | `--component=SUPERVISOR_SERVICE_HARBOR` | **沒有 VCF Automation 的環境才需要**（VVF 或 VCF 無 VCFA） |
| 6 | VKS Standard Packages（add-ons） | `--component=VKS_STANDARD_PACKAGES` | 版本以 Supervisor 上 `builtin-addonrepository-<版本>` 的 imageURL 為準 |

先列出可下載的版本：

```
./bin/vcf-download-tool artifacts list \
    --vcf-version=9.1.1 \
    --depot-download-activation-code-file=activation-code.txt

./bin/vcf-download-tool artifacts list \
    --vcf-version=9.1 \
    --category=SUPERVISOR_SERVICE \
    --depot-download-activation-code-file=activation-code.txt
```

逐項下載（六條指令只差 `--component` / `--category`）：

```
## 1. VKr OVA
./bin/vcf-download-tool artifacts download \
    --vcf-version=9.1.1 \
    --component=VKR \
    --depot-store=./depot-store \
    --depot-download-activation-code-file=activation-code.txt

## 2. VCF Consumption CLI
./bin/vcf-download-tool artifacts download \
    --vcf-version=9.1.1 \
    --component=VCF_CONSUMPTION_CLI \
    --depot-store=./depot-store \
    --depot-download-activation-code-file=activation-code.txt

## 3. VCF Consumption CLI plugins
./bin/vcf-download-tool artifacts download \
    --vcf-version=9.1.1 \
    --component=VCF_CONSUMPTION_CLI_PLUGINS \
    --depot-store=./depot-store \
    --depot-download-activation-code-file=activation-code.txt

## 4. 所有 Supervisor Services（或改用 --component=SUPERVISOR_SERVICE_ARGOCD 單抓）
./bin/vcf-download-tool artifacts download \
    --vcf-version=9.1.1 \
    --category=SUPERVISOR_SERVICE \
    --depot-store=./depot-store \
    --depot-download-activation-code-file=activation-code.txt

## 5. Harbor Supervisor Service（無 VCF Automation 時）
./bin/vcf-download-tool artifacts download \
    --vcf-version=9.1.1 \
    --component=SUPERVISOR_SERVICE_HARBOR \
    --depot-store=./depot-store \
    --depot-download-activation-code-file=activation-code.txt

## 6. VKS Standard Packages
./bin/vcf-download-tool artifacts download \
    --vcf-version=9.1.1 \
    --component=VKS_STANDARD_PACKAGES \
    --depot-store=./depot-store \
    --depot-download-activation-code-file=activation-code.txt
```

> 長時間下載建議在 `~/.ssh/config` 設定 `ServerAliveInterval 60` 與 `ServerAliveCountMax 10`，避免 SSH 中斷。

### 3.3 交付與搬入

1. 把**整個 vcf-download-tool 目錄**（含 `./depot-store`）打包，連同 `activation-code.txt` 一起搬到 admin 主機。搬運前以 `sha256sum` 產生清單，搬入後以 `sha256sum -c` 驗證。
2. admin 主機依序上傳到 Software Depot：**先 VKR**，再 CLI、CLI plugins、Supervisor Services、Standard Packages、Harbor（如需要）。

```
./bin/vcf-download-tool depot artifacts upload \
    --vcf-version=9.1.1 \
    --component=VKR \
    --depot-store=./depot-store \
    --depot-fqdn=<DEPOT_FQDN> \
    --ops-fqdn=<OPS_FQDN> \
    --ops-user=admin \
    --ops-user-password-file=vcfops.txt
## 其餘元件同一指令，只換 --component / --category

## 驗證
./bin/vcf-download-tool depot artifacts list \
    --vcf-version=9.1.1 \
    --depot-fqdn=<DEPOT_FQDN> \
    --ops-fqdn=<OPS_FQDN> \
    --ops-user=admin \
    --ops-user-password-file=vcfops.txt
```

3. 啟用 Supervisor → 確認 VKr content library 已存在並與 Supervisor 關聯（不要重複建）→ 設定 Harbor（有 VCFA 走內建流程；無 VCFA 先設 management proxy 再手動裝 Harbor，見 KB 453377）→ 建 vSphere Namespace。
4. admin 主機從 Supervisor 取得 kubectl，再安裝 VCF CLI 與 plugins：

```
wget https://<Supervisor-KubeAPI-Endpoint>/wcp/plugin/linux-amd64/vsphere-plugin.zip --no-check-certificate
unzip ./vsphere-plugin.zip && cd ./bin && sudo install kubectl /usr/local/bin/kubectl

vcf plugin install all
vcf plugin list
```

## 4. 路線 B：手動下載 + 外部 registry（9.1.0 或無 Software Depot）

### 4.1 前置：客戶需自行準備

| 項目 | 取得方式 | 備註 |
|---|---|---|
| Broadcom Support Portal 帳號 | 客戶既有 | 只有 VCF CLI、CLI plugins 與 Supervisor Service YAML 需要登入 |
| 外部 OCI registry | 自建 Harbor（本文件附離線安裝素材），或既有的企業 registry | 9.1.0 若有 VCFMS 也可改用 Software Depot，需先用官方 toggle 腳本開啟寫入 |
| bastion 工具 | imgpkg、yq、govc、python3、docker | 來源見 4.2 表 |

### 4.2 下載清單（bastion 執行）

| # | 素材 | 下載來源 | 大小 / 需帳號 | 用途 |
|---|---|---|---|---|
| 1 | VKr OVA × 3（每個 minor 取最新 Photon 5，各含 .ovf / .vmdk / .mf / .cert） | `https://wp-content.broadcom.com/v2/latest/`（先抓 `items.json`，再依 `files[].hrefs` 抓檔） | ~11.5 GB，否，公開 | VKS 節點映像，匯入 Local Content Library |
| 2 | VKS Standard Packages（vks-addons）bundle | `projects.packages.broadcom.com/vsphere/supervisor/vks-standard-packages/<版本>/...`，用 `imgpkg copy --to-tar` 或 `oci_image_depot_migrator.py download` | ~5.2 GB，否，公開 | addon 套件庫 |
| 3 | VCF Consumption CLI（Linux AMD64） | Support Portal → My Downloads → 搜尋 **VCF consumption CLI** → CLI → 選版本 | 38 MB，是 | `vcf` 指令 |
| 4 | VCF Consumption CLI Plugin Bundle | 同上 → Plugin-Bundles → 選版本 | 265 MB，是 | 13 個 plugin |
| 5 | Supervisor Services YAML（每個服務兩份：legacy 版、depot 版） | Support Portal → My Downloads → 搜尋 **vSphere Supervisor Services** → 選服務與版本 | 數 KB，是 | legacy 版用來查 image 路徑，depot 版用來註冊服務 |
| 6 | Supervisor Services OCI image bundle | 從 legacy YAML 的 `spec.template.spec.fetch.imgpkgBundle[].image` 取得路徑，用 `oci_image_depot_migrator.py download -s <image>` 抓成 tar | 依服務，否 | 要裝哪個服務就抓哪個；無 VCFA 必抓 Harbor |
| 7 | Harbor offline installer | `github.com/goharbor/harbor/releases` | ~700 MB，否 | 自建 Harbor（有既有 registry 可略） |
| 8 | Docker .deb × 5（containerd.io、docker-ce、docker-ce-cli、buildx、compose） | `download.docker.com`，bastion 上 `apt-get download` | ~100 MB，否 | Harbor / admin 執行環境 |
| 9 | imgpkg、yq、govc | 各自 GitHub releases | ~100 MB，否 | 搬運與匯入工具 |
| 10 | `oci_image_depot_migrator.py`、`toggle_software_depot_oci_image_upload.sh` | `github.com/vmware/vsphere-supervisor` → `airgapped/scripts/` | 數十 KB，否 | OCI image 搬運；Software Depot 開寫入 |

> 🔑 版本選擇：VKr 版本必須與環境的 VKS Service（Kubernetes Service）版本相容，先在 vCenter 查 `GET /api/vcenter/namespace-management/supervisor-services/tkg.vsphere.vmware.com/versions`，再決定抓哪幾顆。lab 9.1.1 環境 KS = 3.7.0+v1.36，使用 v1.36.2 / v1.35.6 / v1.34.9。add-ons bundle 版本以 Supervisor 上 `builtin-addonrepository-<版本>` 的 imageURL 為準（lab 為 `vks-addons:3.7.0-20260618`，不是官方範例的 3.6.0-20260211）。

### 4.3 下載指令範例

```
## 工具與 VKr 目錄
mkdir -p ~/airgap/tools && cd ~/airgap/tools
curl -fsSLo imgpkg https://github.com/carvel-dev/imgpkg/releases/download/<ver>/imgpkg-linux-amd64
curl -fsSLo yq     https://github.com/mikefarah/yq/releases/download/<ver>/yq_linux_amd64
curl -fsSLo govc.tgz https://github.com/vmware/govmomi/releases/download/<ver>/govc_Linux_x86_64.tar.gz
curl -fsSL https://wp-content.broadcom.com/v2/latest/items.json -o ~/airgap/vkr-items.json

## VKr（每個 item 含 ovf / vmdk / mf / cert）
BASE=https://wp-content.broadcom.com/v2/latest
ITEMS="ob-25650988-photon-5-amd64-v1.36.2---vmware.2-vkr.3
       ob-25653794-photon-5-amd64-v1.35.6---vmware.2-vkr.3
       ob-25677161-photon-5-amd64-v1.34.9---vmware.2-vkr.4"
for it in $ITEMS; do mkdir -p ~/airgap/vkr/$it
  for href in $(jq -r --arg n "$it" '.items[]|select(.name==$n)|.files[].hrefs[0]' ~/airgap/vkr-items.json); do
    curl -fsSL --retry 3 -o ~/airgap/vkr/$it/$(basename $href) "$BASE/$href"; done; done

## VKS add-ons bundle
imgpkg copy -b projects.packages.broadcom.com/vsphere/supervisor/vks-standard-packages/3.7.0-20260618/vks-addons:3.7.0-20260618 \
  --to-tar ~/airgap/vks-addons-3.7.0-20260618.tar

## Supervisor Service image（以 ArgoCD 為例，路徑取自 legacy YAML）
./oci_image_depot_migrator.py download \
  -s projects.packages.broadcom.com/vsphere/supervisor/argocd-service/1.1.0/argocd-service:v1.1.0_vmware.1

## Harbor 與 Docker
PKGS="containerd.io docker-ce docker-ce-cli docker-buildx-plugin docker-compose-plugin"
mkdir -p ~/airgap/docker-debs && cd ~/airgap/docker-debs && apt-get download $PKGS
curl -fsSLo ~/airgap/harbor-offline-installer-<ver>.tgz \
  https://github.com/goharbor/harbor/releases/download/<ver>/harbor-offline-installer-<ver>.tgz

## 產生校驗清單
cd ~/airgap && find . -type f ! -name SHA256SUMS | sort | xargs sha256sum > SHA256SUMS
```

### 4.4 交付與搬入

1. `~/airgap/` 整個目錄（VKr、bundle tar、CLI 兩個 tar.gz、Supervisor Service tar 與 YAML、Harbor installer、Docker deb、工具、`SHA256SUMS`）搬到 admin 主機，`sha256sum -c SHA256SUMS` 驗證。
2. Harbor 離線安裝（自簽 CA，SAN 要含 FQDN、短名與 IP；不裝 Trivy），或改用既有 registry。
3. Supervisor → Configure → **Container Registries → ADD REGISTRY** 貼上 registry CA，Supervisor 會把 CA 下發到 Supervisor Services、Pods 與 VKS 叢集節點。
4. VKr 匯入 Local Content Library（UI Import item → Local file 選 ovf/vmdk/mf/cert，或 `govc library.import`），再到 Supervisor → Kubernetes Service 加入該 library，Kubernetes Release 會自動產生。
5. add-ons bundle 與 Supervisor Service image 用 `imgpkg copy --tar <tar> --to-repo <registry>/<repo>` 推進 registry；VKS 3.7 內建 AddonRepository 寫死指向 `projects.packages.broadcom.com`，需另建 AddonRepository 指向內部 registry（細節見安裝手冊）。
6. VCF CLI：`tar xzf` 後 `sudo install vcf-cli-linux_amd64 /usr/local/bin/vcf`，plugins 用 `vcf plugin install all --local-source <解壓目錄>`。

## 5. 兩條路線共同注意事項

| 項目 | 說明 |
|---|---|
| activation code 與 download token 不同 | 路線 A 的 `artifacts` 子命令只收 activation code；`binaries` 子命令兩種都收。自建 offline depot 的 token 抓不到 VKR / Supervisor Services / Standard Packages |
| 自建 offline depot 沒有 VKR | `binaries list` 不列 VKR，depot 鏡像也沒有 VKR 目錄，VKr 一定要另外取得（路線 A 走 download tool artifacts，路線 B 走 wp-content） |
| VCF CLI 9.1 只在 Support Portal 與 download tool | 公開 artifactory `packages.broadcom.com/artifactory/vcf-distro/vcf-cli` 只到 9.0.2；Supervisor 的 `/wcp/vcf-cli/` 沒有 Software Depot 時固定回 503（KB 449965） |
| 瀏覽器下載 CLI 副檔名 | Support Portal 下載時檔名可能被截成 `.gz`，請改回 `.tar.gz` 再解壓 |
| dl.broadcom.com 的 403 | 路徑或檔名錯誤回 403 而非 404，容易誤判成授權問題；檔名一律從 catalog 取 |
| kubectl | 兩條路線都是進入隔離區後從 Supervisor 的 `/wcp/plugin/linux-amd64/vsphere-plugin.zip` 取得，不在 bastion 清單內；kubectl-vsphere 在 9.1 已 deprecated，改用 `vcf context create` |
| Supervisor 本體映像 | 9.1.1 vCenter 已內建 Supervisor 映像與 spherelet，不需另外下載；9.1.0 才需要餵 `supervisor-<版本>` 的 local content library |
| 客戶應用程式 image | 客戶自己的容器映像不在 Broadcom 清單內，需自行鏡像到內部 registry |

## 6. 交付建議

| 方式 | 作法 | 適合情境 |
|---|---|---|
| **客戶自行下載（建議）** | 提供本文件與 bastion 腳本，客戶用自己的 activation code / Support Portal 帳號在自家 bastion 執行 | 授權與下載紀錄都在客戶名下，Broadcom 檔案不經第三方 |
| 原廠代為下載後交付 | 以 USB / 硬碟交付 `~/airgap/` 或 `depot-store/` 目錄與 `SHA256SUMS` | 路線 B 的公開素材（VKr、add-ons、Harbor、Docker）約 18 GB 可預先準備；**VCF CLI 與 activation code 相關素材仍須客戶帳號取得** |

## 7. 參考來源

| 來源 | 位置 |
|---|---|
| TechDocs：Deploy VKS in AirGapped Environments（9.1.1 以上） | techdocs.broadcom.com → VCF Service Administration and Development 9.1 → Managing vSphere Kubernetes Service → Deploying VKS in Air-Gapped Environments |
| GitHub：VKS Deployment Guide for VCF 9.1.0 air-gapped environments | github.com/vmware/vsphere-supervisor/blob/main/airgapped/air-gapped-vcf91.md |
| 官方腳本 | github.com/vmware/vsphere-supervisor/tree/main/airgapped/scripts |
| VKr 公開下載點 | https://wp-content.broadcom.com/v2/latest/ |
| KB 449965 | Supervisor 下載 VCF CLI 回 503 |
| KB 453377 | 無 VCFA 時 Harbor 的 management proxy 設定 |
| lab 安裝手冊 | VKS-AirGap-VCF911-Installation-Procedures.docx（路線 B 全程實作） |
