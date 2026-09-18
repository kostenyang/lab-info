# 重設 VCF Automation 9.x 的 provider（System Administrator）密碼

- 腳本：[`scripts/vcfa-reset-provider-password.sh`](scripts/vcfa-reset-provider-password.sh)
- 實測：2026-09-18，home.lab，VCF Automation 9.1.1.0.25714559（由 vRA 8.18.1 升級而來）
- 相關：[`vcf911-vcfa-fleet-record-manual-fix-optionB.md`](vcf911-vcfa-fleet-record-manual-fix-optionB.md)

---

## 0. 什麼時候會用到

部署／升級精靈裡有一個欄位：

> **VCF Automation and VCF services runtime password**　🪄
> Save password to secure place. **You won't be able to see it again after the deployment**

（位置：VCF Operations › Build › Lifecycle › VCF Management › Upgrade ›
`CONFIGURE` › Parameters，欄位旁邊有魔杖圖示、`COPY TO CLIPBOARD`、`RE-GENERATE`）

它會**預填一組自動產生的密碼**。如果直接按 NEXT 沒把它換掉也沒記下來，部署完之後
就再也看不到 —— 而它正是 provider 入口 `https://<fqdn>/provider` 的密碼。

> 🔴 **預防勝於治療：看到這個欄位一律清空、改填你自己的標準密碼，並記進當次 worklog。**

租戶入口（`/automation/`）不受影響 —— 那邊走的是身分提供者（OIDC/vIDM），
用的是身分來源的帳密，跟 provider 完全是兩套。

---

## 1. 兩個入口，兩套帳號

| 入口 | 網址 | 登入方式 | 帳號來源 |
|---|---|---|---|
| 租戶 | `https://<fqdn>/automation/` | Log in with OIDC → 轉到 vIDM | 外部身分提供者 |
| **Provider** | `https://<fqdn>/provider` | **Log in with local account** | **VCFA 本機帳號** |

資料庫裡（`tenantmanager` 的 `usr` 表）會看到**兩列同名的 `admin`**，靠 `source_id` 區分：

```
admin | source=11f1bdf6-... | pwd=NULL        ← 身分提供者帶進來的外部帳號
admin | source=0b0e9e0e-... | pwd=<雜湊>      ← provider 本機帳號，就是要改這列
```

組織只有兩個：`System`（provider）與各租戶。API 的 provider 帳號寫法是 **`admin@system`**。

> ⚠ **陷阱：provider 登入頁的使用者名稱欄位會預填 `configadmin`。**
> 那不是帳號，是誘餌 —— 直接清掉打 `admin`。如果沒清乾淨就打字，會變成
> `configadminadmin` 而收到 Authentication Error，害你以為密碼錯。

---

## 2. 原理

VCF Automation 9.x 是 VMware Cloud Director 的底子，runtime 叢集的
`tenant-manager-0` pod 裡就有官方的 `cell-management-tool`：

```
recover-password - Change a forgotten System Administrator password.
                   Database credentials are required
usage: cell-management-tool recover-password [options]
  -adminpassword <arg>    New password for the System Administrator user
  -adminuser <arg>        Name of the System Administrator user
  -dbpassword <arg>       database password
  -dbuser <arg>           database username
```

所以流程就三件事：**取資料庫憑證 → 執行 recover-password → 驗證**。腳本就是把這三步包起來。

資料庫連線資訊在 pod 內 `/opt/vmware/vcloud-director/etc/global.properties`：

```
database.username = tenantmanager_owner_user
database.jdbcUrl  = jdbc:postgresql://vcfapostgres.prelude.svc.cluster.local:5432/tenantmanager?...
```

密碼由 Postgres operator（zalando）管理，放在 secret
`tenantmanager-owner-user.vcfapostgres.credentials.postgresql.acid.zalan.do`。

---

## 3. 用腳本做（建議）

```bash
# 只看現況，不改任何東西
./vcfa-reset-provider-password.sh --check

# 重設並自動驗證
./vcfa-reset-provider-password.sh --fqdn vra9.home.lab --password 'NewPass123!'

# 不想把密碼寫在命令列（會進 shell history）就省略 --password，改互動輸入
./vcfa-reset-provider-password.sh --fqdn vra9.home.lab
```

參數：

| 參數 | 說明 |
|---|---|
| `--check` | 只列出帳號現況，不做變更 |
| `--fqdn <fqdn>` | VCFA FQDN，用來事後 API 驗證；不給就只印手動驗證指令 |
| `--password <pw>` | 新密碼；省略則互動輸入（不回顯、要輸入兩次） |
| `--node <ip>` | runtime 叢集節點；不給則自動掃描 `10.0.0.240-244` |
| `--user <name>` | 要重設的帳號，預設 `admin` |
| `--node-pass <pw>` | 節點 SSH ＝ sudo 密碼；也可用環境變數 `VCFA_NODE_PASS` |

輸出範例：

```
▶ 1/5 尋找 runtime 叢集節點
  找到：10.0.0.241
▶ 2/5 目前的帳號狀態
    admin | source=11f1bdf6-... | pwd=NULL(external) | changed=2026-09-17 10:45:47
    admin | source=0b0e9e0e-... | pwd=k6l4s/Iu...    | changed=2026-09-18 01:42:37
▶ 3/5 執行 cell-management-tool recover-password
    Successfully changed password
  ✔ 密碼已變更（立即生效，不必重啟）
▶ 4/5 資料庫確認
    admin | source=0b0e9e0e-... | pwd=9sbvqqzh...    | changed=2026-09-18 01:58:58
▶ 5/5 API 驗證
  ✔ HTTP 200，已取得 access token — provider 登入正常
```

判斷成功看兩件事：**`Successfully changed password`**，以及第 4 步那列本機帳號的
雜湊前綴和 `changed` 時間有變。

---

## 4. 手動做（不用腳本）

```bash
# ① 進 runtime 節點
ssh vmware-system-user@10.0.0.241

# ② admin.conf 是 root-only，sudo 又沒有 tty → 用 -S 從 stdin 餵密碼
K="kubectl --kubeconfig=/etc/kubernetes/admin.conf"
alias k="echo '<node密碼>' | sudo -S -p '' $K"

# ③ 取資料庫密碼
PW=$(k get secret tenantmanager-owner-user.vcfapostgres.credentials.postgresql.acid.zalan.do \
       -n prelude -o jsonpath='{.data.password}' | base64 -d)

# ④ 重設
k exec -n prelude tenant-manager-0 -- \
  /opt/vmware/vcloud-director/bin/cell-management-tool recover-password \
  -dbuser tenantmanager_owner_user -dbpassword "$PW" \
  -adminuser admin -adminpassword '<新密碼>'
# → Successfully changed password
```

驗證：

```bash
curl -k -X POST https://<fqdn>/cloudapi/1.0.0/sessions/provider \
  -H 'Accept: application/json;version=40.0' \
  -u 'admin@system:<新密碼>' -D - -o /dev/null
# → HTTP/1.1 200 OK + x-vmware-vcloud-access-token: ...
```

---

## 5. 四個會害你誤判的坑

| 坑 | 症狀 | 正解 |
|---|---|---|
| **Accept 標頭版本** | API 回 **401**，看起來像密碼錯 | 版本要給 **`40.0`**。給 `9.1.1` → 401、`39.0` → 406 |
| **登入頁預填 `configadmin`** | 打字變成 `configadminadmin` → Authentication Error | 先清空欄位再打 `admin` |
| **SQL 含非 ASCII** | `kubectl exec` 回 `grpc: error while marshaling: string field contains invalid UTF-8` | 送進 `kubectl exec` 的 SQL 一律純 ASCII |
| **`curl -D <檔案>` 寫 /tmp** | 驗證假性失敗（明明 200 卻判成失敗） | Windows 上可能跑到原生 `curl.exe`，讀不懂 `/tmp`。改用 `-D -` 印到 stdout 再 grep |

補充：`usr` 表沒有 `is_locked` 欄位，所以這裡不會因為多試幾次就把帳號鎖死；
但 Ops／vIDM 那邊的帳號**會**鎖（見 [`vcf91-admin-local-lockout`] 的記錄），別混為一談。

---

## 6. 安全注意

- 腳本把資料庫密碼的取用與使用**整段放在節點內完成**（base64 傳一支暫存腳本進去、跑完即刪），
  資料庫密碼不會出現在本機的終端機輸出或 shell history。
- 但**新密碼**如果用 `--password` 傳，會留在 shell history 裡。正式環境請省略該參數改用互動輸入。
- 這支改的是 provider 的 System Administrator 密碼，等於整套 VCFA 的最高權限帳號，
  執行前請確認你有權限這麼做。
