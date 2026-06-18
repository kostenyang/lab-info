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

## Update 2 — 2026-06-18 checkpoint(SSH 深入後修正)

已在 .14/.17 開 SSH(PowerCLI `Start-VMHostService TSM-SSH`;閒置會自停)。SSH 深入查 .14:

- **資料碟都在、且健康**(修正 Update 1 的「VMDK 遺失」推測):
  - `eui.a56aad4f...`(100 GB,cache,vmhba1 NVMe)、`eui.9044e998...`(700 GB,capacity)
  - `esxcli vsan storage list`:Checksum OK=true、Is Mounted=true、On-disk v23,但 **In CMMDS=false**
  - 兩顆都在 `esxcli storage core device list`,adapter vmhba1 = nvme_pcie
- **`esxcli vsan storage diskgroup mount -u <uuid>` 前景執行 120s 仍不返回(卡住)**,SSH 背景版(nohup)輪詢 ~7.5 分鐘 InCMMDS 全程 0、log 空 → mount 對此狀態無效/no-op。
- **vmkernel.log 反覆**(每 ~10s):
  `PLOG: PLOGProbeDevice: Failed to read the device <mpx.vmhba0:C0:T0:L0:7> : Not found`
  → 報的是 **10 GB 開機碟(mpx.vmhba0:C0:T0:L0,vmhba0 pvscsi)的 partition 7**,不是資料碟。可能是 vSAN 一直去探一個不存在的開機碟 vSAN 分割 → 卡住 disk group 收編;也可能只是噪音,待確認。
- **Outer vCenter 172.16.10.100 進不去**:`administrator@vsphere.local` 配 `VMware1!` / `VMware1!VMware1!` 皆「incorrect user name or password」→ **缺 outer 帳密**,無法從外層查 datastore/VMDK。

### 研判
vSAN 叢集成員齊全、資料碟健康在線,但 .14/.17 的 disk group 卡在 CMMDS 外,`mount` 無法收編(疑與開機碟 partition 7 的 PLOG 探測失敗有關)。比起資料遺失,較像 **vSAN disk-group 收編卡死**,reboot host 重新初始化 vSAN 很可能就收回(資料碟健康,reboot 後應重新 admit)。

### 下一步(未做,擇一,部分屬破壞性需確認)
1. **(較輕)** `.14/.17` 各跑 `esxcli storage core adapter rescan --all`,再看 InCMMDS / vmkernel PLOG 是否停。
2. **(推薦,中度)** 依序 **reboot .14 → 等回來確認 InCMMDS=true → reboot .17**(資料碟健康,FTT=0 下逐台 reboot 風險可控;不要兩台同時)。reboot 後 vSAN 通常重新收編 disk group → 物件 accessible。
3. 物件 accessible 後:power on `kosten-vcf91-sddc`、`kosten-vcf91-vc`(再 vcfa-platform/ops/lic/vna)。
4. vC 起來 → 把 **vC(+SDDC)改 FTT=1**(需 .14/.17 已回 = 3 台貢獻儲存)。
5. **需要使用者提供 outer vCenter 172.16.10.100 帳密**,以便必要時從外層檢查/處理。
6. 回到原任務:VKS/VCFA 啟用 + 全自動 cut 圖(Chrome MCP 截 → session JSONL 用 extract_screenshots.py 解)。

## Update 3 — 2026-06-18 復原進展(reboot 法:.14 成功 / .17 卡住)

- **`.14` ✅ reboot 後復原**:disk InCMMDS=true、datastore free 1133→1640GB。(reboot 用 SSH `reboot -f`;回來後 SSH 服務不會自動起,用 PowerCLI EsxCli/443 查即可。)
- **`.14` 一回來,vc/sddc 物件就部分恢復**:`.15` 上 `kosten-vcf91-sddc` 變 connected 且**自動 poweredOn**;`kosten-vcf91-vc` 變 connected 但仍 poweredOff。`lic`/`vna01`/`vspp-5mfbv` 仍 inaccessible(元件在 .17)。
- **vc 開機失敗**:`Start-VM kosten-vcf91-vc` → `kosten-vcf91-vc.vmx was not found ... Device or resource busy`。→ vc 的 home namespace 物件**有元件在 .17**(.17 未回 → 物件不完整 → .vmx 讀不到),可能還有殘留 lock。
- **`.17` ❌ reboot 後 vSAN 啟用卡死**:console 卡在 **「vsan loaded successfully / activating: vsan」進度條滿、bootTime 不變 ~25 分鐘**;ping 通、443/hostd 起不來。`reboot -f`、outer 硬 reset 都一樣卡在 vSAN 啟用(它在收編那個 CMMDS-out 的 disk group 時 hang)。
  - 注意:`reboot -f` 後 .17 關機很慢(ping 撐 ~8.5 分);outer console 截圖(`createScreenshot`)是看 nested ESXi 開機畫面的可靠方法。

### 風險與選項(FTT=0)
vc 及 lic/vna 部分元件在 .17;若 .17 disk group 最終救不回 → 這些單副本元件**遺失**(這正是要把 vc 改 FTT=1 的理由,但得先有 vCenter)。

- **選項 1（等)**:讓 .17 繼續跑 vSAN 啟用,或許會 timeout 後放行開機(可能 30+ 分)。
- **選項 2（救 .17 disk group)**:設法讓 .17 開機時略過 vSAN 自動啟用(boot option / 進 host 後手動處理),再乾淨 re-admit disk group。風險中高。
- **選項 3（接受局部遺失)**:若 .17 disk group 無法救,vc 等需從 backup/重建;lab FTT=0 本就無冗餘。
- **outer vCenter**:172.16.10.100 / `administrator@vmwaresso.taiwan` / `381VMware1!admin`(SSO domain = vmwaresso.taiwan)。.14/.17 = `vcf-m02-esx01-91`(outer .4)/`esx04-91`(outer .6);三磁碟都在 `vsanDatastore-RTO`,VM PoweredOn,**底層 VMDK 沒丟**——所以理論上 .17 disk group 資料還在,是 vSAN 軟體層收編卡住。

## Update 4 — 2026-06-18 ✅ 核心已復原(vCenter/SDDC/vSAN 全回)

**成功路徑(.17 disk group 救回的關鍵手法):**
1. `.14` SSH `reboot -f` → 回來後 disk InCMMDS=true(reboot 即收編)。但 `.17` reboot 後 **vSAN 啟用在開機卡死**(disk group 收編 hang)。
2. **繞過開機 hang**:outer vCenter 把 `.17`(`vcf-m02-esx04-91`)的兩顆 vSAN 磁碟(`_1.vmdk`=100G cache、`_2.vmdk`=700G capacity)**detach(保留檔)→ 開機(只剩開機碟,不卡)→ 進 DCUI**。
3. **`.17` 開到 DCUI 卻 ping/443 不通 = outer trunk swsec stale**(reboot 後 vmk0 新 MAC)。**解法:outer VDPG `trunk` 的 Promiscuous toggle True→False→True**,立刻通。(整起事件元兇之一)
4. 開 SSH → 用 **API 把兩顆 vmdk 掛回 NVMe 控制器(key 31000,unit 0/1,operation=add 無 fileOperation)** → `esxcli storage core adapter rescan --all` → cache 自動 InCMMDS=true。
5. `esxcli vsan storage diskgroup mount -u <dg>`(背景)→ 約 3.5 分 capacity 也 InCMMDS=true。**叢集穩定後 mount 就成功**(之前卡是因 .14 同時 out + 開機期)。
6. vSAN object health:**120 healthy / 0 inaccessible** → 資料零遺失。sddc/lic/ops/vna01/vspp 全自動 connected+poweredOn。
7. **vc 仍 inaccessible**:vSAN 物件健康,但 `.vmx` 有**孤兒 exclusive lock**(owner MAC `00:50:56:a5:93:05` 不屬任何現役 vmk0 → 持鎖 host reboot 後 MAC 變了)。**解法:unregister → 重新 register → power on**,孤兒鎖(heartbeat 已死)被破,vc 開機(落在 .14)。
8. vCenter `.11` / SDDC `.10` 443 起來;vCenter API OK,列出 esx01/02/03 Connected。

**剩餘收尾(follow-up,非阻斷):**
- ⚠️ `.17` 在 vCenter 顯示 **NotResponding**:reconnect 進到 licensing 失敗(`Cannot complete the license assignment operation`,lic 服務可能還在起)。host 本身健康、vSAN 正常。待 lic 起來後重連。
- ⚠️ **`.17` 開機脆弱**:磁碟現在掛著,**下次 reboot 會再卡 vSAN 啟用**。長久解:evacuate 後重建 .17 disk group(或待查為何收編會 hang)。
- vc 有 **.15/.17 殘留孤兒註冊**(inaccessible duplicates),待清。
- **vc(+SDDC)改 FTT=1**(使用者要求):待 vCenter 全綠 + .17 重連後做。
- 之後回到原任務:VKS/VCFA 啟用 + 全自動 cut 圖。

## 關鍵參數

- nested ESXi root / `VMware1!VMware1!`(SSH 預設關,需 PowerCLI 開 TSM-SSH;443 一直可用)
- vSAN vmk: **vmk2 / 192.168.116.14–17**
- Disk group UUID:.14 = `52110788-1de3-398d-311c-0ef4b0fdc042`;.17 = `524d53b5-15a8-b9f3-7391-a01e5e6532ab`
- vSAN datastore: `vcf-m02-cl01-ds-vsan01`
- 相關 runbook:`golden-ova.md`(swsec / vSAN recover)、`vks.md`、`layer4-day2/Troubleshoot-VsanPartition.md`(那個是 member=1 全分區案,與本案不同)
