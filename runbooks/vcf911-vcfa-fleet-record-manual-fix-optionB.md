# 方案 B：VCF Automation 9.1.1 升級「假失敗」後的 fleet 帳面手動補完（lab-only，非官方）

> ⚠ **非官方程序。** 官方立場是 KB 441333「VCF Automation Upgrade Failure cleanup is not supported」→ 開 support case（方案 A）。
> 本文只記錄實驗室驗證可行的做法，客戶環境請勿照做；文件中對客戶一律標「非官方、僅供驗證」。

- 環境：home.lab，VCF 9.1.1 fleet（Ops 10.0.0.15x）、runtime 叢集節點 `vcf-m02-auto-platform-ktdgw`（10.0.0.242）、mgmt VSP 叢集 control-plane 10.0.0.227
- 日期：2026-09-10 00:00–00:45
- 出處：`vcf911-vra8-import-upgrade-worklog.md` Phase ⑤/⑥；截圖 `E:\9.1\doc-shots\vrops-upgrade\915–920`

## 0. 什麼情況才適用

vRA 8.18 → VCF Automation 9.1.1 藍綠升級，fleet 任務 FAILED（`VCFMS-UPGRADE-COMPONENT-031`，部署階段撞 ComponentVersion `timeout: 2h`），但底層其實已完成：

| 證據 | 查法 | 期望 |
|---|---|---|
| 新叢集套件部署完成 | runtime 節點 `kubectl get pd -A` | `vcfa-bundle Successful`，prelude 62 pods Running |
| 已切換 | 來源 vra9 VM poweredOff；新閘道接管 VIP 10.0.0.168 / vra9.home.lab | `curl -k https://vra9.home.lab/automation/` 200 |
| 9.x 指紋 | `GET /tm/api-explorer/provider/cloudapi.json` | 200（8.x 沒有這條路徑） |
| 資料完整 | `GET /blueprint/api/blueprints`、`/deployment/api/deployments` | 藍圖/部署/機器數量與升級前一致 |

且內建重試已用盡：
- 列上 UPGRADE → 另建執行 → `404 No matching source version found for source 8.0.0 within catalog 9.1`
- Tasks 分頁 Retry → 重跑 8.x 初始化 → `Exceeded the maximum number of permitted snapshots` → 之後 `retriable:false`

失敗任務停在的兩個 Pending 階段就是官方最後兩步：`unmount-vmdks-from-target-environment` 與 `Patch the target Component Version`。方案 B = 手動把這兩步做完，再把 fleet 帳面對齊。

## 1. 備份（先做）

```bash
# runtime 叢集（10.0.0.242，vmware-system-user / sudo）
export KUBECONFIG=/etc/kubernetes/admin.conf
kubectl get comp vcfa -o yaml > backup-comp-vcfa-runtime.yaml
govc device.ls -vm vcf-m02-auto-platform-ktdgw > runtime-node-disks-before.txt

# mgmt 叢集（10.0.0.227）
kubectl get comp vcfa -o yaml > backup-comp-vcfa-mgmt.yaml
kubectl -n vcf-fleet-lcm exec vcf-fleet-lcm-db-0 -c postgres -- psql -U postgres -d vcffleetlcmdb -At \
  -c "select component_type,status,version,deployment_type,size from component order by 1"
kubectl -n vcf-sddc-lcm exec vcf-sddc-lcm-db-0 -c postgres -- psql -U postgres -d vcfsddclcmdb -At \
  -c "select component_type,version,deployment_type,size from component order by 1"
```

升級前狀態（fleet DB）：`VCFA | Unknown | 8.0.0 | VSP | small`；其餘 10 個元件全 `Running | 9.1.1.*`。
`8.0.0` 是匯入 8.x 時設定的佔位版本，正常由最後階段 `Patch the target Component Version` 改寫。

## 2. 五步

### ① 拆除來源資料碟（＝官方 `vcenter-virtualmachine/dag-unmount-disk`）

盤點：runtime 節點只剩 1 顆來源碟 `disk-1000-14`（pvscsi-1000 unit 14）= `[vsan] …/vra9_1-000002.vmdk`（144 GB）；guest 內 `/dev/sdn` → LVM `data_vg/data` 掛在 `/vra-db`（**ro**），`lsof` 無程序開檔、fstab 無條目 ⇒ 資料遷移已完成、純殘留。

```bash
# 節點內
sudo umount /vra-db
sudo vgchange -an data_vg          # LV 轉 inactive，讓 vSphere 端能安全拆碟

# 外面（govc 指向 vcf-m02 vCenter）
govc device.remove -vm vcf-m02-auto-platform-ktdgw -keep disk-1000-14
#   -keep：只從 VM 移除，不刪 vmdk；來源 vra9 四顆碟完整，可回掛
govc device.ls -vm vcf-m02-auto-platform-ktdgw | grep -c vra9_   # 期望 0
```

### ② runtime 叢集 `comp vcfa` 改版（＝官方 `Patch the target Component Version`）

```bash
kubectl patch comp vcfa --type merge -p '{"spec":{"versionRef":{"name":"vcfa-9.1.1.0.25714559"}}}'
kubectl label comp vcfa component.vmsp.vmware.com/version=9.1.1.0.25714559 --overwrite
kubectl patch comp vcfa --subresource=status --type merge -p '{"status":{"phase":"Running"}}'
kubectl get comp vcfa      # 期望 vcfa-9.1.1.0.25714559 / Running
```

- 第三行必要：`vmsp-operator` 只做「phase 沒設就填 Unknown」（log：`phase is not set, set to 'Unknown'`），不會自己算 Running；patch 後 operator 不會覆寫。
- `ComponentVersion vcfa-9.1.1.0.25714559` 的 spec 就是 `timeout: 2h` 與 size small = 24 vCPU / 96 Gi 的來源。

### ③ mgmt 叢集殘留的 `comp vcfa` 同步

`import_vcfa_on_mgmt_vsp_cluster` 階段在 mgmt VSP 叢集也留了一份 `comp vcfa`（versionRef `vcfa-8.0.0`、phase Unknown）。同步改成 9.1.1，避免後續 refresh 從 mgmt 側讀回 8.0.0：

```bash
# 10.0.0.227（vsp.sh 對 mgmt 節點不穩，改 echo y | plink … 直連 + base64 上傳腳本）
kubectl patch comp vcfa --type merge -p '{"spec":{"versionRef":{"name":"vcfa-9.1.1.0.25714559"}}}'
kubectl label comp vcfa component.vmsp.vmware.com/version=9.1.1.0.25714559 --overwrite
# phase 留 Unknown 即可
```

### ④ fleet 觸發 Refresh（同步 sddc-lcm 與 fleet status）

在 Ops 的 fleet-lcm iframe 內同源呼叫（或 UI：Fleet Management › Lifecycle › 該 VCF Instance › Refresh）：

```
POST /vcf-operations/plug/fleet-lcm/v1/sddc-lcms/ec07a1b0-0468-4cc3-b4e7-6825206918ee/refresh   → 202
task REFRESH_SDDC_LCM_WORKFLOW：update_fleet_depot_spec_ref → check_if_propagate_fds_data_to_vcfa_task_needed_ref
  → prepare_refresh_input_ref → persist_sddc_lcm_components_ref   → SUCCEEDED
```

同步鏈（log 實證）：sddc-build-service `RefreshComponentAction` 直接 `GET https://vcf-m02-auto-platform.home.lab/api/v1/components?type=vcfa`（runtime 叢集的 VMSP API）→ **sddc-lcm DB 的 VCFA 列自動變 9.1.1.0.25714559**；fleet-build `PersistSddcLcmComponentsAction` 把 fleet DB 的 status 由 Unknown → Running。

**但 fleet DB 的 `version` 不會同步**（只由升級 finalizer 或匯入寫入）→ UI 仍 `8.0.0 → 9.1.1.0.25714559 / Upgrade failed`。

### ⑤ 直接改 fleet DB（最後手段）

```bash
kubectl -n vcf-fleet-lcm exec vcf-fleet-lcm-db-0 -c postgres -- psql -U postgres -d vcffleetlcmdb -At -c \
 "update component set version='9.1.1.0.25714559'
   where component_id='38eb20b2-85f2-3b51-a6b1-5115cc7f671f' and component_type='VCFA' and version='8.0.0'"
# UPDATE 1 → 列變 VCFA|Running|9.1.1.0.25714559|VSP|small
```

`upgrade_plan_component` 不用改（由 plan sync 重算成 ELIGIBLE / 無待升）。

## 3. 驗證

| 位置 | 結果 |
|---|---|
| fleet API `GET /v1/components` | VCFA = 9.1.1.0.25714559 / Running |
| Ops › Lifecycle › Upgrade 分頁 | 0 列，`All components are at their target versions`（圖 919） |
| Ops › Components 分頁 | VCF Automation 9.1.1.0.25714559（圖 920） |
| sddc-lcm DB | VCFA 9.1.1.0.25714559 |
| runtime 叢集 | `comp vcfa 9.1.1.0.25714559 Running`、vcfa-bundle Successful、62 pods Running |
| 產品 | `/automation/` 200、`/tm/api-explorer` 200、藍圖 3 / 部署 1 / 機器 52 仍在 |

## 4. 已知限制（文件必寫）

- fleet 對 VCFA **沒有 service account／憑證**：fleet-build log `Successfully retrieved 0 svc accounts for component type: VCFA`、`VCFA endpoint cannot be constructed: FQDN='vra9.home.lab', credentials available=false`、`CREATE_PERSIST_VCFA_SERVICE_ACCOUNT_TASK: Component ID is null, skipping VCFA credential persistence`。正常升級的 reimport 才會建；fleet 之後對 VCFA 的整合動作（propagate depot 設定、後續生命週期）可能受限。
- fleet 的 VCFA 紀錄把自己的 gateway FQDN 當成 consumption VSP 叢集（`vspCluster.id = component id`, `nodes []`），與正常匯入的 9.x 元件不同。
- 殘留：prelude 內 retry 失敗的 `vcfa-upgrade-80-entrypoint-*-execute-script` pod（Error，無害）；來源 vra9 上 2 個快照（pre-kb425489、automated_vcf_backup_*）。

## 5. 回退

- ①：`govc device.add`/`vm.disk.attach` 把 `vra9_1-000002.vmdk` 掛回 unit 14，節點內 `vgchange -ay data_vg; mount /dev/data_vg/data /vra-db -o ro`
- ②③：`kubectl apply -f backup-comp-vcfa-*.yaml`（status 用 `--subresource=status` 還原 Unknown）
- ⑤：`update component set version='8.0.0' where component_id='38eb20b2-…'`
- 整套：vra9 來源 VM 與四顆碟原封不動，最壞情況可關掉新叢集、開回 vra9（8.18）。

## 6. 對客戶的說法

1. 升級本體已完成且已切換，先用 §0 四項證據確認，**不要**因 fleet 顯示 Upgrade failed 就回滾。
2. 正式路徑＝方案 A：開 support case（附四項證據 + 任務 ID），由原廠修正 fleet 紀錄。
3. 方案 B 只在實驗室驗證過「可行」，未經原廠認可，且會留下 fleet 無 VCFA 憑證的缺口。

---

## 7. 第二次實測（2026-09-17）：與首次的差異

同一套環境重跑一次 vRA 8.18.1 → VCFA 9.1.1 升級，又落到同樣的「假失敗」，再次套用本文。
component_id `38eb20b2-85f2-3b51-a6b1-5115cc7f671f`、sddcLcmId `ec07a1b0-0468-4cc3-b4e7-6825206918ee` 與首次完全相同，步驟照做可用，但有五點要改：

### 7.1 失敗點不同（本文 §0 要放寬）

首次卡在 ComponentVersion `timeout: 2h`。這次 `spec.timeout` 已先改成 12h，於是換成：

| 嘗試 | 階段 | 錯誤 |
|---|---|---|
| 1 | `vmsp_upgrade_vcfa` | `ComponentDeploymentFailed [VCFMS-UPGRADE-COMPONENT-031]` — 底層實體主機 CPU 滿載（77–85 / 80 GHz），`encryption-manager`／`vcfa-service-manager` 連續 `leader election lost`（lease renew `timeout=5s` 逾時），`abx-service-app` 拉映像檔 `tls: bad record MAC` |
| 2（retry）| `vmsp_upgrade_vcfa` | `Platform Health Check Error [VCFMS-HEALTH-002]`：`platform-flux-helmreleases-core: 1 of 51 resources are not ok` — `metrics-server`、`vmsp-operator` 停在 `InProgress - Fulfilling prerequisites` |

第二次已經**不是元件部署失敗**（`pd vcfa-bundle` 早已 Successful），純粹是收尾的平台健康檢查沒等到 helmrelease 收斂。
⇒ §0 的判斷準則應改成：**只要 `pd vcfa-bundle = Successful` + 62 pods Running + FQDN 回 9.1.1，不論任務停在哪一階段，都適用本文。**

### 7.2 runtime 節點的 kubectl 拿法變了

新 runtime 節點 `vcf-m02-auto-platform-8sz2k`（10.0.0.242）的 `/etc/kubernetes/admin.conf` 是 `-rw------- root root`，`vmware-system-user` 讀不到，`sudo` 又沒有 tty。解法：

```bash
echo 'VMware1!VMware1!' | sudo -S -p '' kubectl --kubeconfig=/etc/kubernetes/admin.conf get pd -A
```

`sudo -S` 從 stdin 讀密碼，不需要 tty（不必再寫 pty wrapper）。包成小工具：

```bash
# /tmp/k.sh "<kubectl 參數>" [節點IP，預設 10.0.0.242]
bash /e/9.1/tools/vsp.sh "echo 'VMware1!VMware1!' | sudo -S -p '' kubectl --kubeconfig=/etc/kubernetes/admin.conf $1 2>&1" "${2:-10.0.0.242}"
```

### 7.3 mgmt control-plane 不固定，且 10.0.0.227 不是節點

本文 §3 寫 10.0.0.227，這次真正的 control-plane 是 **10.0.0.226**（`vcf-m02-vsp01-5hk5t`）。
四個節點是 .226 / .228 / .230 / .231；**10.0.0.227 是 kube-apiserver VIP**，`admin.conf` 的 server 指向它。VIP 短暫飄移時會出現 `dial tcp 10.0.0.227:6443: connect: no route to host`，重試即可，不是節點掛掉。

`vsp.sh` 的自動探測會失效（它用 `stat /etc/kubernetes/admin.conf` 判斷，而 `stat` 只要目錄可穿越就會成功，讀不到檔案照樣回大小）。找 control-plane 請直接對每個 IP 跑 `kubectl get nodes`。

### 7.4 ⭐ 步驟 ⑤（直接改 fleet DB）這次不需要

首次的結論是「fleet DB 的 version 不會同步，只能手動 update」。這次做完 ④ Refresh 之後：

```
sddc-lcm DB : VCFA | 9.1.1.0.25714559
fleet DB    : VCFA | Running | 9.1.1.0.25714559   ← 自己就對了
```

差別推測是**步驟 ③（mgmt 叢集的 comp vcfa 也改版）先做了**，Refresh 的 `persist_sddc_lcm_components_ref` 才有正確來源可寫回。
⇒ 建議順序固定為 ②→③→④，**做完 ④ 先查 fleet DB，是 9.1.1 就跳過 ⑤**。

### 7.5 Refresh 任務本身會 FAILED（可接受）

這次的 `REFRESH_SDDC_LCM_WORKFLOW` 比首次多了 Ops 註冊階段，最後整體 FAILED：

```
update_fleet_depot_spec_ref                        SUCCEEDED
check_if_propagate_fds_data_to_vcfa_task_needed_ref SUCCEEDED
prepare_refresh_input_ref                          SUCCEEDED
persist_sddc_lcm_components_ref                    SUCCEEDED   ← 版本同步在這裡完成
prepare_components_for_ops_registration_ref        SUCCEEDED
register_components_in_ops_switch_ref              SUCCEEDED
register_single_component_in_ops_ref__1..3         SUCCEEDED
register_single_component_in_ops_ref__4            FAILED ×4 → register_components_loop_ref CANCELED
```

失敗訊息：

```
An unexpected error occurred in step register_single_component_in_ops_ref__4.
Reference Code: EDD37844. Detail: API response for operation 'create service account' is not a successful one.
```

這正是 §4 第一項「fleet 對 VCFA 沒有 service account／憑證」的具體現形。
**版本同步在它之前就完成了，所以任務 FAILED 不影響本文的目的**；但也再次證實這個缺口補不掉。

### 7.6 其他

- 來源資料碟這次是 `disk-1000-14` → `vra9_1-000001.vmdk`（144 GB，首次是 `-000002`）；guest 內狀態相同（`/vra-db` ro、`lsof` 空、fstab 無條目），①照做即可。回退用的 `vra9_1.vmdk`(177 GB) 與 `vra9_1-000001.vmdk`(3.6 GB) 都還在 datastore。
- mgmt 側 `comp vcfa` 的 size 是 `medium`，runtime 側是 `small`，不影響。
- **Ops UI 的 `LOG IN` 按鈕吃不到 `el.click()`**，必須發真滑鼠事件（`Input.dispatchMouseEvent`），跟列上的 `UPGRADE` 按鈕同一個坑。底層吃緊時 Ops UI 會整個轉圈登不進去，但 `POST /suite-api/api/auth/token/acquire` 仍回 200 —— 用它可以區分「帳號被鎖」與「單純太慢」。
- `GET /v1/release-versions/target-versions` 偶發 504（fleet-lcm 首頁就是卡在這支），重試即可。

### 7.7 這次順帶發現：升級會掉「cloud account 已移除」的部署

升級前 4 個部署，升級後剩 3 個，掉的是 `app-on-vc8`（project `vc8-lab`）—— 唯一一個所屬 cloud account 已被移除的部署。它的 VM `lab-vm-01-mcm1246-337877359821` 還在外層 vCenter，但已無任何部署紀錄，成為孤兒。

⇒ 舊 vCenter 退役情境的順序建議：**先升級 vRA，再移除舊 cloud account**；或在移除前先把相關部署 Onboarding 到新 cloud account。
（本結論目前為相關性 + 唯一差異，尚未做對照實驗驗證因果。）
