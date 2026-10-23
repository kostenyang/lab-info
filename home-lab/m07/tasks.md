# m07 tasks

## Phase 0 準備
- [x] 狀態檔 plan/context/tasks
- [x] ESXi 8.0U3g ISO:CB 5.2.2 OVA 的 /mnt/iso/.../esx_iso → E:\8\VMware-VMvisor-Installer-8.0U3g-24859861.x86_64.iso(臨時 CB vcf-m07-cbtmp 已刪;舊 cb01-conv 已關回)
- [x] NSX 4.2.2.1 OVA 下載完成(12.6 GB);vC 9.1.1.0100 ISO 已從 depot 抓到 E:\8
- [x] DNS:刪 vcf-m05 舊記錄 11 筆 → 建 vcf-m07 A+PTR 8 筆(esx01-03/vc01/nsx01/nsx01a/test01-02),正反解全 OK(10-21);vcda-t/r/m(.190-.192)沒動
- [ ] 測試 VM 映像

## Phase 1 vSphere 8.0U3g
- [x] 3 台 nested ESXi 8.0U3b(16 vCPU/80 GB,cache 60/cap 1000)16:27 開機
- [x] 用 vLCM baseline 匯 U3g ISO 把 3 台升到 8.0U3g(17:30-18:15;截圖 esx-u3g-01..14;esx01 重開後 vC 卡 notResponding → govc host.reconnect)
- [x] vCenter 8.0U3g GUI 安裝(CDP 截圖 vc8-01..14):esx01 esxcli bootstrap vSAN → Stage 1 16:46 FINISH 部署中
- [x] DC / cluster / VDS 8.0 / vMotion / vSAN / DRS(Build-M07Cluster.ps1;vmk0 共用 mgmt/vMotion/vSAN;vSAN HCL 靜音)

## Phase 2 NSX 4.2.2.1
- [~] 部 NSX Manager(18:16 govc import.ova 中)+ compute manager
- [ ] 使用者 10-21:NSX 部好**直接 host prep**
- [ ] TZ / uplink profile / TEP pool / TNP → host prep
- [ ] overlay segment + 2 台測試 VM(不同 host)+ 持續 ping
- [ ] 升級前基準:ESXi uptime、VM 所在 host、NSX 版本

## Phase 3 NSX → 9.1.1(使用者 10-21:**9.1.1.0 和 9.1.1.0100 都試**)
- [ ] host prep 後 NSX Manager VM 拍快照 baseline-4221 → 先試 9.1.1.0 → 被擋就 revert 再試 9.1.1.0100(兩版分開截圖記錄)
- [ ] 匯入 9.1.1.0 .mub(URL)+ EULA + UC
- [ ] precheck
- [ ] 同事 session local_3e681a55(NSX 4.2.2.1 upgrade precheck error)請測 standalone 擋點,結果截圖 + 回報給它 + 寫 memory nsx-manual-upgrade-911-doc.md:
  - [ ] T1 不傳 .pub、只傳 9.1.1.0100 .mub → upgrade UC → UC 內建 precheck 是否同一筆 ERROR(若也測 .pub,分開記錯誤出自 .pub / .mub)
  - [ ] T2 `GET /api/v1/upgrade/pre-upgrade-checks/failures` 完整 JSON(type/severity/需不需 ack/能不能 acknowledge)
  - [ ] T3 照送 `POST /api/v1/upgrade/plan?action=upgrade&component_type=MP` + UI Start,記拒絕錯誤碼/訊息
  - 🔴 不改 NSX DB / corfu、不 hack standalone 判斷(要先問使用者)
- [ ] T4(使用者 10-21):**上傳 .pub(pre-check bundle)後,怎麼清掉、回到原狀態**(不靠快照):
  - 記上傳前狀態(GET /api/v1/upgrade/bundles、/upgrade/summary、UC 版本、Upgrade 頁畫面)
  - 傳 .pub → 跑 pre-check → 記狀態變化
  - 找清除法(UI 有無刪除/取消;API DELETE bundle / cancel / reset)→ 驗證回到上傳前狀態(同一組 GET 比對 + 截圖)
  - 9.1.1.0 和 9.1.1.0100 的 .pub 都試
- [ ] MP 升級
- [ ] Host 升級(In-Place)— 記錄是否要求重開 / 中斷秒數

## Phase 4 vCenter → 9.1.1 + Finalize
- [ ] vCenter 8U3g → 9.1.1
- [ ] CM Registered+Up → Finalize

## Phase 5 驗證 + 回寫
- [ ] Done-when 全項
- [ ] 回寫手冊

## ⏸ 暫停 2026-10-21 22:2x(使用者:m07 先關機,等等再測)
- 關機順序:test01/02 + nsx01a guest shutdown → vCenter guest shutdown → 3 台 nested ESXi 由外層 vC power off(vCLS 擋 MM noAction,使用者說不用等)
- 開機時:先開 3 台 ESXi → 退 MM(esx01 有進 MM)→ vCenter → NSX → test VM;ping 要在 test VM 重新啟動
- NSX 當下狀態:已傳 9.1.0.0200 .pub,UC = 9.1.0.0200.25524172,pre-check 未跑;快照 baseline-4221(關機狀態,4.2.2.1 乾淨)可退
