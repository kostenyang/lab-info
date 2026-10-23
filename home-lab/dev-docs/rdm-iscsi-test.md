# RDM 測試 on VCF 9.1.1 lab — 狀態檔(2026-09-20 起)

## 目標
用獨立 Windows Server 2022 VM 當 iSCSI Target,給 4 台 nested ESXi 掛 LUN,測 RDM 全矩陣並產出 docx 報告。

## 關鍵資源(來源:labinfo.md / lab-info/topology/home-lab.md / DNS 實查)
| 項目 | 值 | 來源 |
|---|---|---|
| 外層 vCenter | 10.0.0.101(host-16542=10.0.0.95, .97, .98) | labinfo.md |
| iSCSI target VM | **iscsi01.home.lab / 10.0.0.80**(2026-09-20 ping+DNS 皆空,選定) | 本次 |
| 放置 | host 10.0.0.95 / datastore vmfs-wdblue4t / portgroup MGMT(同 vcd-nfs01) | govc 實查 |
| Windows ISO | E:\zh-tw_windows_server_2022_updated_july_2024_x64_dvd_fee121d6.iso | 本機 |
| nested ESXi | vcf-m02-esx01~04 = 10.0.1.14-17 | labinfo.md |
| inner vCenter | vcf-m02-vc01.home.lab 10.0.1.19 | labinfo.md |
| 密碼 | 見 lab 標準(不抄值) | — |

## 決策
- 用獨立 Windows VM(使用者指定),不用 10.0.0.200 的角色。
- BIOS firmware(避免 UEFI「Press any key」擋無人值守)。autounattend.xml 走第二顆 CD ISO。
- LUN:lun0 20G VMFS(mapping 檔)/ lun1 10G pRDM / lun2 10G vRDM / lun3 10G 共用(WSFC 選用)。

## 進度
- [x] 1 上傳 ISO 到 vmfs-wdblue4t
- [x] 2 產 autounattend ISO(iscsi-rdm/autounattend.iso,已上傳 vmfs-wdblue4t/iso/)
- [x] 3 VM iscsi01 建好+安裝完成
- [x] 4 裝 iSCSI Target 角色 + 建 LUN + target
- [x] 5 nested ESXi 軟體 iSCSI + rescan + VMFS
- [x] 6 RDM 測試矩陣(T1-T7,T10,T11 全跑完;WSFC 未做)
- [x] 7 docx 報告 E:\9.1\VCF911-RDM-on-iSCSI-Test-Report.docx(22 頁,gen-rdm-doc.js)

## 2026-09-20 進度快照
- iscsi01 10.0.0.80 ✅(WS2022 DC 桌面體驗,BIOS,VMware Tools 已裝;NIC 改到 **Trunk-Nobinding**,MGMT(VLAN2)/VLAN0 都不通 nested)
- 🔴 坑:unattend 用 vmxnet3 → 無驅動 → specialize 的靜態 IP 沒設上;Tools 裝好後要用 netsh 重設;WinTarget 要 restart 才綁 3260
- target iqn.1991-05.com.microsoft:iscsi01-vcf-rdm-target,InitiatorIds=IPAddress:10.0.1.14-17
- LUN map(4 台一致):LUN0 naa.…828b6f 20G → VMFS `iscsi01-rdm-vmfs01`;LUN1 naa.…ba0adc 10G(pRDM);LUN2 naa.…3488d5 10G(vRDM);LUN3 naa.…71414f 10G(shared)
- nested esx01-04 vmhba64 sendtarget 10.0.0.80:3260,session logged_in

## 2026-09-20 結果摘要
- 🔴 最大發現:pRDM mapping 檔放 vSAN 會成功建立,但之後該 VM 任何加碟都被 PBM「Invalid entity」擋;mapping 檔放 VMFS 全正常 → 一律放 VMFS
- UI 加 RDM 到 vSAN-homed VM:該磁碟 storage policy 要選 Datastore Default,VMFS 才可選
- vRDM→VMDK:svMotion 改格式線上可;pRDM 線上不可(明確錯誤)、冷 clone 會轉 VMDK;熱 clone 失敗(mapping 檔 locked)
- SDDC Manager /v1/clusters/{id}/datastores 有列 iscsi01-rdm-vmfs01,principal 仍 VSAN
- 殘留:rdm-testvm01(pRDM LUN1 + 原 vRDM 已轉 VMDK)、rdm-clone01(關機)、iscsi01 VM 持續運作;LUN2/LUN3 目前無人使用
