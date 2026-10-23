# tasks.md — 進度追蹤（持續更新）

## 已完成
- [x] **vLCM 轉換 m07-cl01 完成**（UI：Proceed→Save(8.0U3b)→Finish→Yes）→ enablement/software=true
- [x] reboot 後網路根因診斷 + 修復（vmnic0 退 vSwitch0；VM 搬 VDS）
- [x] vCenter .164 up（9.1.1 25712839，在 VDS）
- [x] NSX reboot → STABLE；thumbprints 全對 spec
- [x] installer API 可用（沿用瀏覽器 bearer）；/v1/sddcs 空
- [x] validation v1：修 DVS
- [x] validation v2：修 VSP pool(14)、mgmt portgroup
- [x] spec 密碼/參數就緒（converge-m07-spec.json）
- [x] 建 plan/context/tasks 三狀態檔

## 進行中
- [x] validation v4：COMPLETED/WARNING（0 error；2 warning=upgrade policy + storage 4177<4364）

## 進行中
- [x] POST /v1/sddcs 已送出（SDDC id 70475bc2, IN_PROGRESS）
- [ ] 監看部署到 COMPLETED_WITH_SUCCESS（截圖）
      5 milestones: 1.Deploy SDDC Manager(1/17 進行中) 2.Convert vCenter+NSX→VCF instance(0/44)
      3.VCF Mgmt Platform(0/40) 4.Operations appliance(0/15) 5.VCF Mgmt Services(0/19)

## 待辦
- [ ] 監看部署進度 + 截圖
- [ ] guide Part F（vLCM 轉換 + validation + 部署）
- [ ] 可選：刪舊 vcf-m07-vc01(8.0) 釋出 ~storage（解 4182<4364 warning）

## 截圖清單（E:/9.1/doc-shots/m07-converge/）
- 01~07 wizard 探索/plan
- 08 prepare-general
- 10 vc-ui-login, 11 cluster-image-tab, 12 image-eligibility(偵測到8.0U3b)
- 13 after-proceed(checking readiness), 14 image-review(extracting)
- [ ] 15 image-editor / Finish
- [ ] validation 結果、部署進度

## 佇列（converge 裝好後做）— 使用者 2026-10-23
- [ ] **乾淨隔離測試:只升 vC+NSX → converge**（新環境,非 m07）
      - 目標:另建一套乾淨 vSphere 8 + NSX → 只升 vCenter+NSX 到 9.1.1(ESXi host 維持 8.x)
             → converge 進 VCF 9.1.1,全程乾淨重跑(避開 m07 的網路事故雜訊)
      - 交付:docx 文件（這條最小升級路徑的官方做法）
      - 待規劃:用哪套 nested 環境/命名(m08?)、媒體(CB 5.2.1 內的 vC8/NSX4.2.1 bundle)、
               升級順序(先 vC 後 NSX)、converge spec 範本沿用 m07
      - 工具:docx 走 scoop LibreOffice/pandoc（見 memory local-doc-toolchain）
