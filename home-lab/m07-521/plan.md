# plan.md — 目標與範圍

## 總目標
把手動建的 VCF 5.2.1 環境 m07（vCenter + NSX + vSAN cluster，3 台 nested ESXi）
**converge/import 成 VCF 9.1.1**（透過 VCF Installer 9.1.1），並全程 cut 圖做成 user guide（Part F）。

## 範圍
- in scope：
  - m07 既有 vCenter(.164)/NSX(.165/.166) 已先升到 9.1.1
  - cluster m07-cl01 轉 vLCM single-image（converge 前置硬需求）
  - 用 JSON spec 路徑送 converge（converge-m07-spec.json，密碼在檔案內）
  - validation 全過後直接送出部署（使用者授權「過了就直接送出」）
  - 監看部署進度 + 截圖 → guide Part F
- out of scope：
  - 不動其他 lab 元件（m02 等）
  - 不用 step-by-step UI wizard 打密碼（改 JSON 路徑）

## 關鍵環境
- Installer: vcf-m07-inst01 10.0.1.167（admin@local）
- vCenter: vcf-m07-vc01-911 10.0.1.164（9.1.1 build 25712839，在 VDS 上）
- NSX: vip .165 / node .166（STABLE）
- hosts: esx01 .161 / esx02 .162 / esx03 .163（全 Connected，vSAN healthy）
- cluster: m07-cl01 = domain-c9
- VSP mgmt pool: 10.0.1.176-189（14 IP）
- spec: E:/9.1/m07-521/converge-m07-spec.json

## 完成定義 (DoD)
1. converge validation 全 SUCCEEDED（warning 可接受）
2. 部署 COMPLETED_WITH_SUCCESS（SDDC Manager + VCF Ops + VSP/VCFA 等起來）
3. guide Part F 完成（含 vLCM 轉換、validation、部署截圖）
4. plan/context/tasks 三檔同步
