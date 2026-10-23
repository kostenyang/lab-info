# Imported cluster Principal Datastore 更換 (KB 452458) — 工作狀態
更新: 2026-09-14

## 目標
1. ✅ lab SDDC Manager 實測 /inventory/extensions/vi/clusters GET/PUT
2. ✅ 客戶交付 docx: E:\9.1\VCF91-Imported-Cluster-Principal-Datastore-Change.docx (generator: tools/docx-build/gen-principal-ds-doc.js)

## 關鍵資源
| 項目 | 值 | 來源 |
|---|---|---|
| SDDC Manager | vcf-m02-sddcm01.home.lab / 10.0.1.18 (9.1.1.0.25713928) | CONTEXT-vcf91-lab.md |
| vCenter | vcf-m02-vc01.home.lab / 10.0.1.19 | CONTEXT-vcf91-lab.md |
| 帳密 | 見 CONTEXT-vcf91-lab.md | — |
| lab domain/cluster | m01 a53df574… / m01-cl01 6a898ac1… (domain-c9, datastore-15=m01-cl01-ds-vsan01 VSAN) | 實測 |

## 實測發現 (拆 vcf-commonsvcs.jar 9.1.1 + curl)
- Controller: InventoryExtensionsViController, @RequestMapping "inventory/extensions/vi", 走 http://localhost (SDDC Manager 本機, 免 token)
- **GET /clusters 不存在** (400 Request method GET not supported)。匯出用 `GET /domainInventory?domainIds=<id>` → [DomainInventory]
- `PUT /clusters` body=DomainInventory, Validate.notEmpty(clusters) **且** notEmpty(esxis)；缺 esxis → HTTP 500 VCF_RUNTIME_ERROR
- `PUT /clusters/{clusterId}` body=單一 Cluster (較乾淨, 實測 200)
- 更新語意 = TypedClientImpl.updateEntity: existsById → BeanUtils.copyProperties → repository.save = **整筆覆寫**；GET 匯出是 DB 忠實 dump (null 省略) 所以 round-trip 安全
- enum DataStoreType: VSAN, VSAN_ESA, VSAN_MAX, VSAN_REMOTE, NFS, NFS41, FC, VMFS, VVOL, VVOL_FC, VVOL_ISCSI, VVOL_NFS
- 🔴 **無效 enum (例 VMFS_FC) 回 HTTP 200 但欄位被寫成 null** → v1 GET /v1/clusters/{id} 全部欄位變 null (name/primaryDatastoreName/type/isDefault)；已用原值 PUT 還原
- 9.1.1 模型: `name`, `datacenter`, `primaryDatastoreName`, `ftt` 標 @Deprecated；DB cluster 表無 name 欄；lab 的 primary_datastore_name 為 NULL；v1 API 的 name/primaryDatastoreName 是從 vCenter 即時解析
  → 9.x 真正 load-bearing 欄位 = primaryDatastoreSourceId (vCenter MoRef, e.g. datastore-15) + primaryDatastoreType
- datastore MoRef 查法: vCenter REST GET /api/vcenter/datastore
- lab 現況: 已還原, v1 API 正常 (name=m01-cl01, primaryDatastoreName=m01-cl01-ds-vsan01, VSAN)
- 已推 git：lab-info runbooks/kb452458-principal-datastore-api-test.md（2ee0215）、evs kb452458-primary-datastore/（cb45a24）

## 進度
- [x] token + GET clusters (v1)
- [x] 拆 jar 找 controller / model / enum
- [x] Test A 單筆 PUT 改 primaryDatastoreName → 200
- [x] Test B KB 原版 PUT {clusters,esxis} → 200
- [x] Test C 缺 esxis → 500；Test D 無效 enum → 200 但 null (已還原)
- [x] docx generator + 產出 + LibreOffice→PDF QA (16 頁, 2026-09-14)
