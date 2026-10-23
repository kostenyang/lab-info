# License Hub 2.0 + SSP 5.2.0 — IP / DNS / 資源需求表
> 依 Broadcom TechDocs（License Hub 2.0 · Appliance System Requirements / Deploy a License Hub Appliance）整理
> 建立日期：2026-08-26

## 0. 版本變更(重要)

| 項目 | 舊(5.1.2) | 新(2.0) |
|---|---|---|
| 安裝方式 | 上傳 LICENSE bundle 到 **SSP Installer depot**,由 SSP 精靈部署 | **獨立 OVA**,直接在 vSphere Client 部署 —— 官方明講「no longer requires any dependency on Security Services Platform Installer」 |
| 型態 | 多節點 | **單一 appliance** |
| 規模 | — | 單機管 **120 個** vDefend / Avi endpoint |

## 1. License Hub 2.0 appliance

### 資源
| 項目 | 需求 |
|---|---|
| vCPU | 6 |
| RAM | 12 GB |
| Disk | 256 GB |
| vCenter 版本 | 8.0 U3 以上 / 9.0 / 9.0.1 / 9.0.2 / 9.1 |
| Cluster | **DRS 必須啟用**;HA 建議啟用 |
| 儲存延遲 | ≤ 10 ms |
| 網路延遲(到 endpoint) | ≤ 150 ms |

### IP —— 共需 **3 個管理網段 IP**
| # | 用途 | 說明 |
|---|---|---|
| 1 | Management Network IPv4 Address | appliance 本身;**FQDN 必須正解到這個 IP** |
| 2-3 | IP Pool（**兩個連續 IP**） | 內部 Kafka 用;**Kafka FQDN 必須正解到 pool 的第二個 IP** |

### FQDN —— 共需 **2 個**
| # | 名稱 | 指向 |
|---|---|---|
| 1 | appliance FQDN | 管理 IP(#1) |
| 2 | Kafka FQDN | pool 第二個 IP(#3) |

### 其他網路參數
| 欄位 | 需求 |
|---|---|
| Netmask / Default Gateway | 管理網段 |
| Internal Cluster Network Non-routable CIDR | **/23 或更大**(至少 512 個 IP);須為不可路由且與資料中心內其他網段不重疊 |
| DNS Server List | 至少 1 台,最多 3 台(空白分隔) |
| Domain Search List | 必填 |
| NTP Server List | 必填(FQDN 或 IP) |
| Enable SSH | 選用 |

### 帳號密碼(部署時輸入)
`GRUB root` / `sysadmin` / `admin` / `audit` —— **15~128 字元**,需含大寫、小寫、數字、特殊字元各至少一個。

### 存取埠
| 用途 | URL |
|---|---|
| Appliance UI | `https://<FQDN>:5480` |
| Service UI | `https://<FQDN>`(**只能用 FQDN,不能用 IP**) |

### 相容 endpoint
NSX Manager **9.1 以上**;Avi Controller **32.1.1 以上**。

> 防火牆完整 port 清單以 **ports.broadcom.com** 為準(官方文件把 port 表外連到該站,未內嵌)。

---

## 2. SSP Installer 5.2.0(vDefend / Avi 平台安裝器,與 License Hub 分開)

| 項目 | 需求 |
|---|---|
| 資源 | 4 vCPU / 6 GB RAM / 396 GB disk(thin 實佔約 8.7 GB) |
| IP | 1 個(管理網段) |
| FQDN | 1 個,正解 + 反解 |
| OVF 欄位 | `vsx_fqdn` `vsx_ip_0` `vsx_netmask_0` `vsx_gateway_0` `vsx_dns1_0` `vsx_domain_0` `vsx_ntp_0` `vsx_internal_cluster_cidr` `vsx_isSSHEnabled` + 4 組密碼 |
| Internal Cluster CIDR | 預設 `10.10.0.0/16`,至少 /24 |
| 密碼 | 12 字元以上 + 複雜度(firstboot 會驗) |

---

## 3. 客戶需要填的 IP 需求表(可直接送出)

| # | 元件 | 數量 | FQDN | IP | 備註 |
|---|---|---|---|---|---|
| 1 | License Hub — 管理 IP | 1 | ______________ | ______ | FQDN 需正解到此 IP |
| 2 | License Hub — Kafka pool 第 1 個 | 1 | (不需 FQDN) | ______ | 與 #3 **連續** |
| 3 | License Hub — Kafka pool 第 2 個 | 1 | ______________ | ______ | Kafka FQDN 指到這個 |
| 4 | License Hub — 內部 cluster CIDR | 1 段 | — | ______/23 | 不可路由、勿與現有網段重疊 |
| 5 | SSP Installer(如需) | 1 | ______________ | ______ | 正解 + 反解 |
| 6 | SSP Platform 節點(如需) | 依規模 | ______________ | ______ | 依 SSP 5.2 部署規模決定 |

**另需確認**:DNS 伺服器 ×1~3、Domain search list、NTP 來源、cluster 是否已開 DRS、對外(或離線)取授權的路徑。

---

## 4. Lab(home.lab)實際配置

| 元件 | FQDN | IP | 狀態 |
|---|---|---|---|
| SSP Installer 5.2.0 | `vcf-ssp01.home.lab` | 10.0.0.76 | DNS A+PTR 已建;OVA 部署中 |
| License Hub 管理 | `lichub01.home.lab` | 10.0.0.77 | 待建(等 OVA) |
| License Hub Kafka pool | — / `lichub01-kafka.home.lab` | 10.0.0.78 - **10.0.0.79** | 待建 |
| 內部 cluster CIDR | — | 172.31.0.0/23 | 預定 |

管理網段:**10.0.0.0/23**(遮罩 255.255.254.0、gw 10.0.0.1)、DNS 10.0.0.200、NTP 10.0.1.254、
vCenter 10.0.0.101 → `/Datacenter/host/Cluster/10.0.0.95`、datastore `ForNFS`、portgroup `MGMT`。

---

## 5. SSP Platform(完整部署)需求 —— 2026-08-26 補

### 節點與資源(Production / VCF 9.1 design blueprint)

| 角色 | 數量 | 每台 vCPU | 每台 RAM | 每台 Disk |
|---|---|---|---|---|
| Installer | 1 | 4 | 6 GB | 400 GB |
| Controller | 3 | 4 | 8 GB | 155~200 GB |
| Worker | **4~10**(最少 4,ATP 加值功能再 +1) | 16 | 64 GB | 155~200 GB |

**Production 最小總量**:8 台 VM、**96 vCPU(48 cores)**、**350 GB RAM**、**約 3.867 TB 儲存**(含 2227 GB PVC)。
Evaluation 型態**不做資源保留**,但**沒有升級路徑**到正式版。

### IP
兩種型態(advanced / evaluation)都要求**同一個子網內的兩段 IP range**:
1. **Node IP Pool** —— control plane + worker 節點 VM 用
2. **Service IP Pool** —— SSP 服務用
> 可以塞**非連續 IP**,不必整段連續 —— 只配需要的量,scale-out 再擴。

### 其他前提
- 共享儲存 + **SPBM 儲存原則**(原則內的 datastore 必須是共享儲存);容量未計 RAID overhead
- vDefend 授權管理對接 **NSX Manager 9.1 以上**

### 🔴 Lab 可行性(實測 nested m01-cl01)

| 資源 | Lab 現況 | Production SSP 需求 | 判定 |
|---|---|---|---|
| CPU | 96 cores / 240 GHz | 96 vCPU(48 cores 保留) | 勉強,保留會吃掉整群 |
| RAM | 1024 GB(可用約 884 GB) | 350 GB | ✅ 夠 |
| 儲存 | vSAN `m01-cl01-ds-vsan01` 4000 GB,**剩 2770 GB** | **3867 GB** | ❌ **不夠(差約 1.1 TB)** |

**結論**:nested lab 要跑**完整 production SSP**,儲存不足。可行做法二選一 ——
(a) 用 **Evaluation** 型態(無資源保留、footprint 小,但不可升級);
(b) 先擴 nested vSAN 容量再上 production。
