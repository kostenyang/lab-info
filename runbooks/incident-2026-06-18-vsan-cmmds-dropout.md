# Incident 2026-06-18 — vcf-m02 vSAN disk CMMDS dropout → vCenter/SDDC down

> 狀態:**復原中 / 未完成**(最後更新 2026-06-18,本記錄為 checkpoint)。
> 起因:原本要在 vcf-m02 起 VKS/啟 VCFA + cut 圖,中途發現 vCenter 連不上 → 轉入此 incident。

## 現象

- `vCenter .11 (kosten-vcf91-vc)`、`SDDC .10 (kosten-vcf91-sddc)` ping+443 皆不通。
- NSX `.13` 正常;AD/DNS `.200` 正常;四台 nested ESXi `.14–.17` host 都活(ping+443 OK)。
- **不是 IP 問題**:AD DNS 正反解都對 — vc→.11、sddc→.10、nsx→.13,與 lab-info 一致。
- **不是 vSAN 分區**:`esxcli vsan cluster get` 四台 SubClusterMemberCount=4(.16 MASTER / .14 BACKUP / .15、.17 AGENT),vSAN datastore `vcf-m02-cl01-ds-vsan01` Accessible=True、1133GB free。
- **不是 vSAN 網路**:vmk2 `192.168.116.x`,.14/.17 → 各 peer vmkping **0% loss**(L2 已恢復)。

## 根因(已確認)

**.14 與 .17 的 vSAN disk group `InCMMDS=false`**(disk `IsMounted=true` 但沒 publish 進 CMMDS)→ 該兩台不貢獻儲存。
**FTT=0(lab 標準,單副本)** 之下,凡 component 落在 .14/.17 磁碟上的物件全部 inaccessible。

VM→host 與狀態(`Get-View VirtualMachine`):
| VM | host | 狀態 |
|----|------|------|
| kosten-vcf91-vc / -sddc / -lic / vcf-m02-vna01 | .15 | poweredOff + **inaccessible** |
| kosten-vcf91-vcfa-platform | .14 | poweredOff + inaccessible |
| kosten-vcf91-ops | .16 | poweredOff + inaccessible |
| kosten-vcf91-vspp-(d6pfw/sgzwr/rrxwt)、ops-coll、nsxn1 | .16 | **poweredOn + connected**(存活,component 在 .15/.16)|

> 「VM 都關機」的原因:物件 inaccessible 後 host 無法再承載該 VM → 標記 poweredOff;不是有人手動關。

觸發點推測:.14/.17 vSAN 一次短暫 L2 斷(outer trunk swsec stale 老毛病,見 golden-ova.md),disk 被踢出 CMMDS;網路已自行恢復(vmkping 0% loss)但 disk 未自動 rejoin。

## 已嘗試(無效)

- PowerCLI `Get-EsxCli` → `vsan.storage.diskgroup.mount.Invoke(@{uuid=...})` 於 .14 與 .17。
- **兩台都卡在 PowerCLI HttpClient 300s timeout**,事後重查 InCMMDS 仍 false → **EsxCli-over-443 不適合此久跑操作**。

## 下一步(未執行)

1. **改走 SSH**(無 300s 限制):PowerCLI 在 .14/.17 `Start-VMHostService TSM-SSH` → Posh-SSH 進去:
   ```sh
   esxcli vsan storage diskgroup mount -u <DGUUID>      # 或先 unmount 再 mount
   esxcli vsan storage list | grep -i cmmds             # 確認 In CMMDS: true
   ```
2. 若 mount 仍失敗 → 從 outer vCenter `172.16.10.100`(administrator@vsphere.local / VMware1!)toggle vcf-m02 nested ESXi 所在 trunk PG 的 Promiscuous False→True(刷 swsec),再 mount。
3. InCMMDS=true 後等物件 accessible → 依序 power on `kosten-vcf91-sddc`、`kosten-vcf91-vc`(再 vcfa-platform / ops / lic / vna)。
4. **vCenter 起來後:把 vC(建議連 SDDC)VM 改 FTT=1**(SPBM storage policy / RAID-1),避免再被單台 disk dropout 弄掛。FTT=1 需 ≥3 台貢獻儲存 → 故步驟 1 先把 .14/.17 救回是前提。其餘 VM 維持 FTT=0(lab 標準)。
5. vCenter 回來後續做原任務:VKS/VCFA 啟用 + 全自動 cut 圖(截圖法:Chrome MCP 截 → 從 session JSONL 用 vcf9.1vks/extract_screenshots.py 解檔)。

## 關鍵參數

- nested ESXi root / `VMware1!VMware1!`(SSH 預設關,需 PowerCLI 開 TSM-SSH;443 一直可用)
- vSAN vmk: **vmk2 / 192.168.116.14–17**
- Disk group UUID:.14 = `52110788-1de3-398d-311c-0ef4b0fdc042`;.17 = `524d53b5-15a8-b9f3-7391-a01e5e6532ab`
- vSAN datastore: `vcf-m02-cl01-ds-vsan01`
- 相關 runbook:`golden-ova.md`(swsec / vSAN recover)、`vks.md`、`layer4-day2/Troubleshoot-VsanPartition.md`(那個是 member=1 全分區案,與本案不同)
