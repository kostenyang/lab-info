# VCF 9.1 Lab Info — M02 (home.lab)

> ⚠️ **這是 HOME LAB(domain `home.lab`,網段 10.0.0.0/23),不是 rtolab。**
> rtolab(rtolab.local / 172.16.x / 192.168.114.x / SELAB-Cluster)是另一個離線/舊環境 —— 與本 lab 無關,**IP 不要混用**。本 lab 一律以 `home.lab` + 10.0.0.0/23 為準。
>
> 快速查詢用的 lab 元件 / IP / 登入資訊。結構化 inventory 見 `vcf9.1-lab/inventory/lab.yaml`。
> mgmt 網段 10.0.0.0/23(10.0.0.x + 10.0.1.x 同段),gateway 10.0.0.1,DNS 10.0.0.200,domain home.lab。
> 密碼:新元件一律 `VMware1!VMware1!`(outer vCenter SSO = `<redacted>`)。

> 🔴 **2026-10-05 實測:本檔已過期,不要直接採用。**
> 7 筆資料錯誤或失效、11 項現役元件沒記;VNA / VCFA / 備份 / 省電排程四段整段失效。
> 逐列對照結果見 **`E:\9.1\LABINFO-vs-DNS-20261005.md`**,現況真相源見 **`E:\9.1\CONTEXT-vcf91-lab.md`**。
> 具體已確認錯的:installer 是 inst06 10.0.1.54(非 inst01 10.0.1.4)、dc/cluster 是 vcf-m02-*(非 m01-*)、
> VSP 控制平面是 10.0.0.231/.233/.234 三節點(非 .222 四節點)、VCFA 與 VNA 都已不存在、
> 排程名稱全不符且三個都 Disabled。另有 w01 VI 網域(10.0.1.46-49)本檔完全沒提。

## 核心 VCF 元件
| 元件 | FQDN | IP | 備註 |
|---|---|---|---|
| VCF Installer | vcf-m02-inst01.home.lab | 10.0.1.4 | Cloud Builder |
| SDDC Manager | vcf-m02-sddcm01.home.lab | 10.0.1.18 | |
| inner vCenter | vcf-m02-vc01.home.lab | 10.0.1.19 | dc=m01-dc01 cluster=m01-cl01(domain-c9)|
| NSX Manager VIP | vcf-m02-nsx01.home.lab | 10.0.1.21 | node a = 10.0.1.20,admin/VMware1!VMware1! |
| VCF Operations | vcf-m02-ops01.home.lab | 10.0.1.22 | |
| Fleet | vcf-m02-fleet01.home.lab | 10.0.1.23 | Fleet Build Service (FBS) |
| Ops Cloud Proxy | vcf-m02-opsc01.home.lab | 10.0.1.24 | |
| Management VSP VIP | vcf-m02-vsp01.home.lab | 10.0.0.172 | Supervisor;控制平面節點 SSH 10.0.0.222 |
| shared | vcf-m02-shared01.home.lab | 10.0.0.173 | |
| VIDB (Identity Broker) | vcf-m02-vidb.home.lab | 10.0.0.174 | |
| License Server | vcf-m02-license.home.lab | 10.0.0.175 | |
| **VCF Automation VIP** | **vcf-m02-auto-vip.home.lab** | **10.0.0.170** | UI 登入(用 FQDN,非裸 IP)|
| VCFA platform VIP | vcf-m02-auto-platform.home.lab | 10.0.0.171 | consumption VSP;控制平面 SSH 10.0.0.243 |

## Nested ESXi(management domain）
| host | mgmt IP |
|---|---|
| vcf-m02-esx01~04 | 10.0.1.14 / .15 / .16 / .17 |

## NSX VNA(Virtual Network Appliance)— 2026-06-29 新增
> VCF 9.1 NSX 新元件,替 VPC 提供有狀態服務(NAT/LB),搭配 Distributed Transit Gateway。

| 項目 | 值 |
|---|---|
| **VNA cluster** | `vna-cl01`(form factor SMALL,service_type VPC_SERVICES,1 節點)|
| **VNA node FQDN** | **vcf-m02-vna01.home.lab** |
| **VNA node IP** | **10.0.0.181**（/23,gw 10.0.0.1）|
| mgmt 網路 | dvportgroup-24(SDDC-DPortGroup-VM-Mgmt)|
| 放置 | cluster m01-cl01(domain-c9)/ datastore m01-cl01-ds-vsan01(datastore-15)|
| overlay TZ | overlay-tz-mgmt-nsxt |
| 登入 | admin / VMware1!VMware1!（cli/root/audit 同密碼）|
| NSX 路徑 | `/policy/api/v1/infra/sites/default/enforcement-points/default/virtual-network-appliance-clusters/vna-cl01` |
| 部署方式 | NSX Policy API（PUT cluster → PUT node);UI 在 System > Fabric > VNA Cluster |

### VNA + VPC 連通（2026-06-29）
| 項目 | 值 |
|---|---|
| Distributed Transit Gateway | Default Transit Gateway,service subnet **100.64.0.0/21** |
| External Connection | VCF Day0:External IP Block **10.0.0.0/23** + distributed-vlan-connection |
| 測試 VPC | `vpc-test01`(short_id HAbfWSmU,project default)→ attach Default VPC Connectivity Profile → Default TGW;NAT(DEFAULT+USER)就緒 |
| 私網 IP block（備）| `vpc-priv-block` 172.16.50.0/24（PRIVATE)|
| ⚠ workload subnet | default project 的 Day0 IP block 不適合配 workload subnet → 要放 VM 須建自訂 Project(tenant)+ 專屬 IP block |
| **安裝文件** | API 版 `vcf9.1-lab/layer3-postbringup/vna-vpc-deploy-api.md`;圖解版 `…/vna-vpc-deploy-gui.md` |

## VCF 備份(2026-07-02)
共用目標:**SFTP 10.0.0.18** : `/root/vcf-backup`(root / `<redacted>`,port 22,Ubuntu OpenSSH;VCF 不吃純 FTP)。RSA 指紋 `SHA256:KegSvVw7UxI5ltFa9Hdplr/gYNOjpPVMC+rXuSthtxk`。

### A. SDDC Manager + NSX(SDDC Manager backup)
| 項目 | 值 |
|---|---|
| 涵蓋 | SDDC Manager + NSX Manager(`nsx-bkp/` + `sddc-manager-backup/`)|
| 加密 passphrase | `VMware1!VMware1!` |
| 排程 | 每天 02:00(WEEKLY 全 7 天)|
| 設定方式 | SDDC Manager API `PUT /v1/system/backup-configuration` + `POST /v1/backups/tasks`(手動觸發)|
| 首次備份 | ✅ 成功(NSX 57M + SDDC Mgr 8.8M 已落地)|

### B. vCenter file-based backup(2026-07-02 新增)
| 項目 | 值 |
|---|---|
| 目標 | `sftp://10.0.0.18/root/vcf-backup`(vCenter 自動建 `sn_...` 子目錄)|
| parts | `common`(必)+ `seat`(統計/事件/工作)+ **`supervisors`**(此 vC 有 Supervisor)|
| 排程 | 每天 **02:30**(與 SDDC 02:00 錯開),retention 5 份,未加密 |
| 設定方式 | **舊版 `/rest` API**(`/api` 版該路徑回 404):`POST /rest/appliance/recovery/backup/schedules/daily`,body 用 `{spec:{location,location_user,location_password,recurrence_info,retention_info,enable,parts}}` |
| 手動觸發 | `POST /rest/appliance/recovery/backup/job`,body `{piece:{location,location_type='SFTP',location_user,location_password,parts}}` |
| 首次備份 | ✅ SUCCEEDED(job `20260702-060134`,約 1 分 46 秒)|

### C. VCF Operations / VCFA
- **無 vCenter 式原生 SFTP 排程**(Ops `/api|/rest/appliance/recovery/backup` 回 404;VCFA 該端點 406)。
- 建議走 **image-level / VADP**(VM 快照層級備份)或各自的 DB 備份機制;若要也落 10.0.0.18,用外部備份軟體指向該 SFTP/資料夾。

## VCF SSO / Identity Broker(2026-07-02)
> 用 VCF Operations > Manage > Fleet Management > Identity & Access > **VCF SSO** 精靈設定。
> 把 fleet 元件的認證統一接到 **home.lab AD**(經 VIDB identity broker,OIDC)。

| 項目 | 值 |
|---|---|
| Deployment mode | **Instance**(用既有 VIDB `vcf-m02-vidb.home.lab` 10.0.0.174 當 identity broker)|
| Identity Provider | **AD over LDAP** |
| Directory display name | `home-lab`(注意:UI 不允許句點,故非 home.lab)|
| Primary DC | `ldap://10.0.0.200 : 389`(lab AD 無 LDAPS 憑證,用純 LDAP;UI 有建議改 LDAPS 的警告)|
| Base DN | `DC=home,DC=lab` |
| Bind 帳號 | `CN=svc-vidb,CN=Users,DC=home,DC=lab`(UPN `svc-vidb@home.lab`)/ `VMware1!VMware1!` |
| Search 屬性 | `sAMAccountName`(AD 標準)|
| 同步群組 | **ALL**(base `DC=home,DC=lab`,Sync Nested Groups 開,未來新群組自動同步)|
| 同步使用者 | `Administrator`、`adad`(base `DC=home,DC=lab`;其餘系統帳號略過)|
| **啟用 SSO 元件** | **vCenter `vcf-m02-vc01` + NSX `vcf-m02-nsx01`**(兩者皆 enable)|

### 統一登入帳號(2026-07-02)✅ 已驗證登入
- **`vcfadmin@home.lab`** / `VMware1!VMware1!`(Domain Admins,永不過期)—— VCF 全環境管理登入帳號。
- 角色:**VCF Roles → Domain Admins = VCF Administrator**(scope=所有元件);NSX 另有 Domain Admins@home.lab=Enterprise Admin。
- **實測**:登出 admin → vCenter Login Method=VCF SSO → VIDB Directory Login → vcfadmin@home.lab 登入成功、完整管理權。
- ⚠ **雷**:新 AD 帳號要先在 **Configure Identity Provider > Edit > Directory > `Sync On Request`** 手動同步,否則登入報「Authentication was unsuccessful」。
- 文件:`vcf9.1-lab/layer3-postbringup/vcf-unified-login-account.md`。

### 驗證結果(API 實查,2026-07-02)
- **vCenter**:`GET /api/vcenter/identity/providers` → 出現 **`VCF SSO`(OIDC)**,`is_default=true`,`domain_names=[home.lab]`,指向 `vcf-m02-vidb.home.lab/acs/t/CUSTOMER`。✅
- **NSX**:`GET /api/v1/trust-management/oidc-uris` → 出現 **`VCF SSO`** end point(`oidc_type=ws_one`、`managed_by_vcf=true`、`serviced_domains=[home.lab]`、含 SCIM Users/Groups)。✅
- **NSX 角色綁定**:已 API 建 `remote_group` **`Domain Admins@home.lab` → enterprise_admin**(`POST /policy/api/v1/aaa/role-bindings`,body 需頂層 `roles=@({role='enterprise_admin'})`;id `35a158f4-...`)。⚠ 群組名格式待「AD 帳號實登」驗證。

### ⚠ 影響 / 注意(啟用時已於 UI 確認)
- 啟用 VCF SSO 會**覆蓋 vCenter 現有 identity provider**(VCF SSO 設為 default);SDDC Manager UI 之後只吃 local domain user(API 仍可用 SSO user);PowerCLI/自動化腳本可能需重做。
- **管理後路仍在**(已實測):NSX `admin`、vCenter `administrator@vsphere.local`、SDDC Manager local 仍可登入 → 我這邊的 REST 自動化不受影響。
- 精靈進度:1 Deployment Mode ✅ / 2 Identity Provider ✅ / 3 Enable vCenter+NSX ✅(API 已驗證)/ 4 Assign VCF Roles ← **剩這步用 UI 做最穩**(VCF Operations > Identity & Access > VCF Roles,搜尋 broker 內的精確 principal 指派給 vCenter/NSX/Ops)。

### 待辦(需 lab 網段內的瀏覽器)
- 目前外部連的兩台 Chrome(44ada08b Win / 7dc51df6 mac)**都解不到 home.lab DNS**;先前連 lab 的那台(在 lab 機器上的 Chrome)已斷線。
- 完成 Step 4「Assign VCF Roles」+ 用 AD 帳號(如 `administrator@home.lab` 或 Domain Admins 成員)實登 vCenter/NSX/Ops 驗證;順便確認 NSX 那條 `Domain Admins@home.lab` 綁定的群組名格式正確。

## n8n 工作流自動化(2026-10-06 新增,獨立 Linux VM)
| 項目 | 值 |
|---|---|
| VM | `n8n01`(外層 vCenter 10.0.0.101,host 10.0.0.97,datastore SSD3,portgroup VM Network,2 vCPU / 4 GB / 50 GB) |
| FQDN / IP | `n8n01.home.lab` = **10.0.0.81**/23;`n8n.home.lab` 為 CNAME;PTR 已建 |
| UI | `http://n8n.home.lab:5678`(http,已設 `N8N_SECURE_COOKIE=false`) |
| owner 帳號 | `admin@home.lab` / lab 標準密碼 |
| OS / SSH | Ubuntu 20.04.4(clone 自 template `ubuntu2004temp`);root 密碼 = depot/ESXi 那組(非 <redacted>) |
| 堆疊 | Docker CE 28.1.1 + compose v2.35.1;`/opt/n8n/docker-compose.yml`(n8n 2.42.3 + Postgres 16,volumes `n8n_n8ndata` / `n8n_pgdata`,檔案交換目錄 `/opt/n8n/files` → 容器 `/files`) |
| 備註 | 時區 Asia/Taipei;`NODE_TLS_REJECT_UNAUTHORIZED=0` 方便打 lab 自簽憑證 API;重啟 `cd /opt/n8n && docker compose restart`;升級 `docker compose pull && docker compose up -d` |

## 省電開關機
- VSP + VCFA 關機:graceful guest shutdown(VCFA 先、VSP 後）。
- **自動開機**:`E:\9.1\poweron-vsp-vcfa.ps1`(REST API);Windows 排程 `VCF-M02-PowerOn-VSP-VCFA`(**每週日 19:00**,SYSTEM/Highest)。
- **自動關機(省電)**:`E:\9.1\shutdown-vsp-vcfa.ps1`(REST API guest shutdown,先 VCFA `auto-platform` 後 VSP `vsp01 x4`,Tools 失敗才退回硬關機);Windows 排程 `VCF-M02-Shutdown-VSP-VCFA`(**每日 23:30**,SYSTEM/Highest)。log 在 `E:\9.1\shutdown-vsp-vcfa.log`。
- 關機對象:VCFA=`vcf-m02-auto-platform-*`(1台)、VSP=`vcf-m02-vsp01-*`(4台)。
- **vCenter(10.0.1.19)/ NSX 須保持開機**(排程/管理/nested Supervisor bring-up 需要)。
