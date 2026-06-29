# VCF API 新舊對應 — 實測對照

舊寫法 (客戶: pyVmomi SOAP / NSX MP API / legacy) vs 新寫法 (VCF 9.1 REST / Policy / OpsToken)，皆對 live VCF 9.1 實跑。
> 註：521b vCenter 目前 503（vMotion 洗牌後服務未起），故舊寫法改對 9.1 vCenter 實跑——正好證明 客戶既有 pyVmomi SOAP 程式在 9.1 仍可直接執行（向後相容），新寫法為對應的 REST。

| 操作 | 舊寫法 (pyVmomi SOAP / MP API) | 舊實測 | 新寫法 (REST / Policy / OpsToken) | 新實測 |
|------|----------------------------------|--------|-----------------------------------|--------|
| vCenter connect/auth | `pyVmomi SmartConnect (SOAP, port 443/sdk)` | sessionKey ...81c0f99d | `POST /api/session (HTTP Basic -> token)` | vmware-api-session-id set |
| vCenter version | `content.about.version (SOAP)` | 9.1.0 b25370922 | `GET /api/appliance/system/version` | 9.1.0.0 b25370922 |
| VM inventory list | `PropertyCollector / ContainerView (SOAP)` | 13 VMs | `GET /api/vcenter/vm` | 11 VMs |
| ESXi host list | `ContainerView[HostSystem] (SOAP)` | 4 hosts | `GET /api/vcenter/host` | 4 hosts |
| VM power state | `vim.VirtualMachine.runtime.powerState (SOAP)` | kosten-vcf91-ops-coll=poweredOn | `GET /api/vcenter/vm/{id}/power` | kosten-vcf91-vc=POWERED_ON |
| Cluster list | `ContainerView[ClusterComputeResource]` | 1 (vcf-m02-cl01) | `GET /api/vcenter/cluster` | 1 (vcf-m02-cl01) |
| NSX security groups | `MP API GET /api/v1/ns-groups (basic auth)` | HTTP404 ns-groups | `Policy API GET /policy/api/v1/infra/domains/default/groups` | 258 groups |
| SDDC Manager domains | `POST /v1/tokens -> GET /v1/domains (521b)` | 1 domain(s) | `POST /v1/tokens -> GET /v1/domains (9.1)` | 1 domain(s) |
| Operations (vROps->VCF Ops) | `(not deployed in 521b)` | N/A | `POST /suite-api/api/auth/token/acquire (OpsToken) -> GET /adapters` | 20 adapters |
