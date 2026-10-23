# plan.md — VCF 9.1 nested lab 重建

## 目標
在 nested lab 上把 **VCF 9.1.0.0 management domain 全套部署完成,含 VCFA(VCF Automation)**。
最終供 demo:VCFA + All Apps + Gateway Firewall + VKS。

## 範圍(要做)
- Layer1:4 台 nested ESXi(vcf-m02-esx01–04 = 10.0.1.14–17)部署在外層 host 10.0.0.95 / ForNFS 快碟
- Layer2:VCF Installer(install9.1 = 10.0.1.4)bring-up 全套:
  vCenter(10.0.1.19)+ vSAN + NSX + SDDC Manager(10.0.1.18)+ **VSP**(Supervisor,vcf-m02-vsp01)
  + VCF Operations + Cloud Proxy + **VCFA** + Identity Broker + License Server + Salt + Telemetry
- 支援基建:offline depot(vcf9depot 10.0.0.61,nginx HTTPS)、download 工具(My-VcfDepot.ps1/.sh)、
  完整 depot builder VM(vcf9dltool 10.0.0.32)
- NTP 基建:RouterOS 10.0.1.254 起 NTP server(對外上游 + web access)

## 不做什麼(out of scope / 暫緩)
- 不追求 100% 零依賴官方 tool(Compatibility metadata 需 activation code,day-2 才補)
- 不在本機(Windows E:)放完整 depot(空間不足;客戶自己機器或 vcf9dltool 建)
- VKS/Supervisor 的 day-2 workload demo 等 bring-up + VCFA 完成後再做
- bring-up 完成前不動已部好的 mgmt VM(除非要整個乾淨重跑)

## 完成標準
1. bring-up sddc `status = COMPLETED_WITH_SUCCESS`(318 任務全綠,含 VCFA)✅
2. VCFA console(vcf-m02-auto-vip.home.lab)可登入 ✅(HTTP 200)
3. VSP(Supervisor)done≈281 後穩定,VSP VM 保留不刪 ✅
4. SDDC Manager UI + vCenter + NSX 都健康 ✅
5. 坑全部記進 repo `vcf9.1-lab/CLAUDE.md` + 記憶 ✅

## Day-2 目標:VKS 給 VCFA 消費(2026-07-13)
在跑完的 c9732a7d 上,讓 VCFA 能自助開 Kubernetes(VKS/TKG)。
### 範圍
- **VNA**(NSX Virtual Network Appliance)提供 VPC 有狀態服務,搭 Distributed Transit Gateway(免 edge cluster)✅
- 啟用 **user Supervisor**(走 VPC/DTGW 路徑)+ vSphere Namespace + TKG content library/storage
- 開 **VKS guest cluster** → Available
- 接 **VCFA Container Service** 消費
- 全程 **cut 圖**(UI walkthrough,對應圖解文件)
### 不做什麼
- 不走傳統 NSX edge cluster 路徑(9.1 用 DTGW+VNA)
- 不在 default project 硬配 workload subnet(要自訂 Project + 專屬 IP block,見 API 文件 §8)
### 完成標準
1. VNA cluster UP / VTEP UP ✅
2. Supervisor 啟用、Namespace 就緒
3. VKS guest cluster Available(kubectl 可連)
4. VCFA 能自助 provision K8s
5. 關鍵步驟截圖齊全

## 已知硬性坑(每次重建必踩,見 CLAUDE.md)
- **CA**:重部後整套走新 VMCA;瀏覽器要匯入 vCenter `/certs/download.zip` 的根 + **Chrome 完全重啟**才生效
- VKS:走 **VPC/DTGW 路徑**,domain-c9 傳統 edge 相容性=false 是預期的

## 已知硬性坑(每次重建必踩,見 CLAUDE.md)
- NTP:spec 用能服務的 IP(10.0.1.254 曾死→暫用 10.0.0.200;254 修好後回它)
- nested 網路:Trunk-Nobinding **promiscuous ON**(非 MAC learning),4 卡全 Trunk
- SDDC Manager sshd 硬化:補 ed25519+ssh-rsa host key(watcher 自動;憑證步前)
- 憑證步:**時鐘偏移** → cert Not Before 在未來 → installCert 500;需時鐘同步 + retry.max=240
- VSP 前:套 Apply-VspRecipe.ps1(FTT=0 + timeout + reservation)
