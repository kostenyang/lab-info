#!/usr/bin/env bash
# =============================================================================
# vcfa-reset-provider-password.sh
#
#   重設 VCF Automation 9.x 的 provider（System Administrator）密碼。
#
#   為什麼需要：部署／升級精靈的「VCF Automation and VCF services runtime
#   password」欄位會預填一組自動產生的密碼，部署完就再也看不到。事後要登
#   https://<fqdn>/provider 時如果沒記下來，就只能用這支重設。
#
#   原理：VCFA 是 VMware Cloud Director 的底子，runtime 叢集的 tenant-manager-0
#   pod 裡就有官方的 cell-management-tool，其 recover-password 子命令專門處理
#   「忘記 System Administrator 密碼」。本腳本只是把取資料庫憑證 → 執行 →
#   驗證這三件事包起來。
#
#   用法：
#     ./vcfa-reset-provider-password.sh --check
#     ./vcfa-reset-provider-password.sh --fqdn vra9.home.lab --password 'NewPass123!'
#     ./vcfa-reset-provider-password.sh --node 10.0.0.242 --user admin --password '...'
#
#   需求：Windows 上用 Git Bash + PuTTY plink；Linux 上用 ssh（自動偵測）。
# =============================================================================
set -o pipefail
export MSYS_NO_PATHCONV=1

NODE=""                       # runtime 叢集節點 IP，留空則自動掃描
ADMIN_USER="admin"            # 要重設的 System Administrator 帳號
NEW_PASS=""                   # 新密碼，留空則互動輸入
FQDN=""                       # VCFA FQDN，用來事後驗證；留空則跳過驗證
NODE_USER="vmware-system-user"
NODE_PASS="${VCFA_NODE_PASS:-VMware1!VMware1!}"   # 節點 SSH ＝ sudo 密碼
SCAN_RANGE="10.0.0.240 10.0.0.241 10.0.0.242 10.0.0.243 10.0.0.244"
CHECK_ONLY=0
NS="prelude"
POD="tenant-manager-0"
DB_USER="tenantmanager_owner_user"
DB_SECRET="tenantmanager-owner-user.vcfapostgres.credentials.postgresql.acid.zalan.do"
CMT="/opt/vmware/vcloud-director/bin/cell-management-tool"
API_VERSION="40.0"            # ⚠ 給 9.1.1 會回 401、39.0 回 406，別誤判成密碼錯

die () { echo "✗ $*" >&2; exit 1; }
info () { echo "  $*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --node)       NODE="$2"; shift 2;;
    --user)       ADMIN_USER="$2"; shift 2;;
    --password)   NEW_PASS="$2"; shift 2;;
    --fqdn)       FQDN="$2"; shift 2;;
    --node-user)  NODE_USER="$2"; shift 2;;
    --node-pass)  NODE_PASS="$2"; shift 2;;
    --check)      CHECK_ONLY=1; shift;;
    -h|--help)    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) die "不認得的參數：$1（--help 看用法）";;
  esac
done

# --- 遠端執行：Windows 走 plink，Linux 走 ssh -----------------------------------
PLINK="/c/Program Files/PuTTY/plink.exe"
if [ -x "$PLINK" ]; then
  _hostkey () {
    echo y | timeout 30 "$PLINK" -ssh -batch -pw "$NODE_PASS" "$NODE_USER@$1" true 2>&1 \
      | grep -oE 'SHA256:[A-Za-z0-9+/=]+' | head -1
  }
  remote () {  # $1=ip $2=cmd
    local hk; hk=$(_hostkey "$1"); [ -z "$hk" ] && return 1
    timeout 300 "$PLINK" -ssh -batch -hostkey "$hk" -pw "$NODE_PASS" "$NODE_USER@$1" "$2" 2>&1 \
      | grep -v -e 'Keyboard-interactive' -e 'End of keyboard'
  }
elif command -v sshpass >/dev/null 2>&1; then
  remote () { timeout 300 sshpass -p "$NODE_PASS" ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR "$NODE_USER@$1" "$2" 2>&1; }
else
  die "找不到 plink.exe 也沒有 sshpass，無法連線到節點"
fi

# 在節點上以 root 跑 kubectl（admin.conf 是 root-only，sudo -S 從 stdin 餵密碼免 tty）
kube () { remote "$NODE" "echo '$NODE_PASS' | sudo -S -p '' kubectl --kubeconfig=/etc/kubernetes/admin.conf $1"; }

# --- 1. 找 runtime 節點 ---------------------------------------------------------
echo "▶ 1/5 尋找 runtime 叢集節點"
if [ -z "$NODE" ]; then
  for ip in $SCAN_RANGE; do
    timeout 4 bash -c "</dev/tcp/$ip/22" 2>/dev/null || continue
    NODE="$ip"
    out=$(kube "get pod $POD -n $NS --no-headers" 2>/dev/null)
    case "$out" in *"$POD"*) info "找到：$NODE"; break;; esac
    NODE=""
  done
  [ -z "$NODE" ] && die "在 $SCAN_RANGE 裡找不到有 $POD 的節點，請用 --node 指定"
else
  out=$(kube "get pod $POD -n $NS --no-headers" 2>/dev/null)
  case "$out" in *"$POD"*) info "節點：$NODE";; *) die "$NODE 上找不到 $NS/$POD：$out";; esac
fi

# --- 2. 現況 -------------------------------------------------------------------
echo "▶ 2/5 目前的帳號狀態"
# ⚠ 這段 SQL 必須全部是 ASCII：含非 ASCII 字元時 kubectl exec 會回
#   "grpc: error while marshaling: string field contains invalid UTF-8"
SQL="select username||' | source='||coalesce(source_id::text,'-')||' | pwd='||case when password is null then 'NULL(external)' else left(password,8)||'...' end||' | changed='||coalesce(password_last_changed::text,'-') from usr where username='$ADMIN_USER'"
show_rows () {
  kube "exec -n $NS vcfapostgres-0 -c postgres -- psql -U postgres -d tenantmanager -At -c \"$SQL\"" \
    | grep -v -e memcache -e '^\s*$' | sed 's/^/    /'
}
show_rows
info ""
info "說明：同名可能有兩列 —— pwd=NULL 的是身分提供者（OIDC）帶進來的外部帳號，"
info "      有雜湊的那列才是 provider 本機帳號，本腳本改的是後者。"

if [ "$CHECK_ONLY" = "1" ]; then echo "▶ --check 模式，不做變更。"; exit 0; fi

# --- 3. 取新密碼 ----------------------------------------------------------------
if [ -z "$NEW_PASS" ]; then
  printf "  新密碼："; stty -echo 2>/dev/null; read -r NEW_PASS; stty echo 2>/dev/null; echo
  printf "  再輸入一次："; stty -echo 2>/dev/null; read -r P2; stty echo 2>/dev/null; echo
  [ "$NEW_PASS" = "$P2" ] || die "兩次輸入不一致"
fi
[ -n "$NEW_PASS" ] || die "密碼不可為空"

# --- 4. 重設 -------------------------------------------------------------------
echo "▶ 3/5 執行 cell-management-tool recover-password"
# 整段在節點內完成，資料庫密碼不會離開節點、也不會出現在本機輸出
REMOTE_SCRIPT=$(cat <<EOS
K="kubectl --kubeconfig=/etc/kubernetes/admin.conf"
PW=\$(\$K get secret '$DB_SECRET' -n '$NS' -o jsonpath='{.data.password}' | base64 -d)
if [ -z "\$PW" ]; then echo "DB_SECRET_EMPTY"; exit 1; fi
\$K exec -n '$NS' '$POD' -- '$CMT' recover-password \
  -dbuser '$DB_USER' -dbpassword "\$PW" \
  -adminuser '$ADMIN_USER' -adminpassword '$NEW_PASS' 2>&1 \
  | grep -viE 'logback|appender|INFO in|WARN in|^\s*$'
EOS
)
B64=$(printf '%s' "$REMOTE_SCRIPT" | base64 -w0)
RESULT=$(remote "$NODE" "echo '$B64' | base64 -d > /tmp/.vcfa-rp.sh && echo '$NODE_PASS' | sudo -S -p '' bash /tmp/.vcfa-rp.sh; rm -f /tmp/.vcfa-rp.sh")
echo "$RESULT" | sed 's/^/    /'
case "$RESULT" in
  *"Successfully changed password"*) info "✔ 密碼已變更（立即生效，不必重啟）";;
  *) die "重設失敗，請看上面訊息";;
esac

# --- 5. 驗證 -------------------------------------------------------------------
echo "▶ 4/5 資料庫確認"
show_rows

echo "▶ 5/5 API 驗證"
if [ -z "$FQDN" ]; then
  info "（未指定 --fqdn，略過。可手動驗證：）"
  info "curl -k -X POST https://<fqdn>/cloudapi/1.0.0/sessions/provider \\"
  info "     -H 'Accept: application/json;version=$API_VERSION' -u '$ADMIN_USER@system:<新密碼>'"
else
  # 注意：不要用 -D <檔案>。Windows 上跑到的可能是原生 curl.exe，寫不進 /tmp 這種路徑，
  #       會讓驗證假性失敗。改用 -D - 把標頭印到 stdout 再 grep。
  RESP=$(curl -sk --max-time 30 -o /dev/null -D - -w 'HTTPCODE=%{http_code}' \
    -X POST "https://$FQDN/cloudapi/1.0.0/sessions/provider" \
    -H "Accept: application/json;version=$API_VERSION" \
    -u "$ADMIN_USER@system:$NEW_PASS" 2>&1)
  CODE=$(printf '%s' "$RESP" | grep -oE 'HTTPCODE=[0-9]+' | cut -d= -f2)
  if [ "$CODE" = "200" ]; then
    if printf '%s' "$RESP" | grep -qi 'x-vmware-vcloud-access-token'; then
      info "✔ HTTP 200，已取得 access token — provider 登入正常"
    else
      info "✔ HTTP 200（未看到 token 標頭，但認證已通過）"
    fi
  else
    info "✗ HTTP $CODE — Accept 版本目前用 $API_VERSION；給 9.1.1 會 401、39.0 會 406，別誤判成密碼錯"
  fi
fi

echo
echo "完成。登入：https://${FQDN:-<fqdn>}/provider"
echo "  使用者：$ADMIN_USER   ← 欄位若預填 configadmin，那是誘餌，清掉重打"
echo "  密碼　：（你剛設定的）"
