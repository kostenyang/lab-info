#!/usr/bin/env bash
# vsp.sh "<remote command>" [ip]
# Runs a command on a VSP node via plink, pinning whatever host key the server currently presents.
export MSYS_NO_PATHCONV=1
PL="/c/Program Files/PuTTY/plink.exe"
CMD="$1"
IP="${2:-}"
PW='VMware1!VMware1!'

hostkey_of () {
  echo y | timeout 25 "$PL" -ssh -batch -pw "$PW" "vmware-system-user@$1" true 2>&1 \
    | grep -oE 'SHA256:[A-Za-z0-9+/=]+' | head -1
}

run_on () {  # $1=ip $2=cmd
  local hk; hk=$(hostkey_of "$1")
  [ -z "$hk" ] && return 1
  timeout 90 "$PL" -ssh -batch -hostkey "$hk" -pw "$PW" "vmware-system-user@$1" "$2" 2>&1 \
    | grep -v -e 'Keyboard-interactive' -e 'End of keyboard'
}

if [ -n "$IP" ]; then run_on "$IP" "$CMD"; exit $?; fi

# find the control-plane node (kubeconfig non-empty) among the live VSP IPs
for ip in 10.0.0.227 10.0.0.228 10.0.0.229 10.0.0.230 10.0.0.231 10.0.0.232 10.0.0.233; do
  timeout 4 bash -c "</dev/tcp/$ip/22" 2>/dev/null || continue
  SZ=$(run_on "$ip" "stat -c %s /etc/kubernetes/admin.conf 2>/dev/null || echo 0" | tr -d ' \r')
  case "$SZ" in ''|0) continue;; esac
  echo "# control-plane: $ip"
  run_on "$ip" "$CMD"
  exit $?
done
echo "no control-plane node found"; exit 1
