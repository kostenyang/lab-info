#!/usr/bin/env bash
# Render the new Automation runtime cluster's live state as an HTML page and screenshot it,
# so the report can show the K8s evidence next to the fleet UI.
set -u
SPW=/c/Users/ADMINI~1/AppData/Local/Temp/claude/E--9-1/f96e7309-0dce-47fa-bf06-c7a072c0bace/scratchpad
VSP="$SPW/vsp.sh"
OUT="${1:-E:/9.1/doc-shots/vrops-upgrade/172-vcfa-k8s-state.png}"
HTML="$SPW/k8s-state.html"

DATA=$(bash "$VSP" "K() { echo 'VMware1!VMware1!' | sudo -S -p '' kubectl --kubeconfig=/etc/kubernetes/admin.conf \"\$@\" 2>/dev/null; };
echo '### nodes'; K get nodes -o wide 2>/dev/null | cut -c1-150;
echo; echo '### package deployments'; K get pd -A 2>/dev/null;
echo; echo '### pod summary (namespace prelude)'; K get pods -n prelude --no-headers 2>/dev/null | awk '{print \$3}' | sort | uniq -c | sort -rn;
echo; echo '### sample of running VCF Automation services'; K get pods -n prelude --no-headers 2>/dev/null | grep Running | awk '{print \$1}' | head -18 | tr '\n' ' '" 10.0.0.242 2>&1 | grep -v '^# control-plane')

{
  echo '<!doctype html><meta charset="utf-8"><style>'
  echo 'body{font-family:Consolas,monospace;background:#0f1720;color:#d7e2ec;margin:0;padding:22px 26px}'
  echo 'h1{font-family:"Microsoft JhengHei",sans-serif;font-size:19px;color:#7fc4ff;margin:0 0 4px}'
  echo '.sub{font-family:"Microsoft JhengHei",sans-serif;font-size:12px;color:#8b9bab;margin-bottom:14px}'
  echo 'pre{font-size:12.5px;line-height:1.5;white-space:pre-wrap;margin:0}'
  echo '.h{color:#ffd479;font-weight:bold}'
  echo '</style>'
  echo "<h1>VCF Automation runtime cluster — vcf-m02-auto-platform (10.0.0.242)</h1>"
  echo "<div class=sub>kubectl --kubeconfig=/etc/kubernetes/admin.conf · $(date '+%Y-%m-%d %H:%M:%S')</div><pre>"
  printf '%s' "$DATA" | sed 's/&/\&amp;/g; s/</\&lt;/g' | sed 's/^\(### .*\)$/<span class=h>\1<\/span>/'
  echo '</pre>'
} > "$HTML"

NODE=/e/9.1/tools/node-v24.16.0-win-x64/node.exe
CDP=/e/9.1/lab-info/runbooks/scripts/cdp-live.mjs
WINPATH=$(echo "$HTML" | sed 's|^/c/|C:/|')
timeout 90 "$NODE" "$CDP" --match "about:blank" --steps "[{\"url\":\"file:///$WINPATH\"},{\"wait\":2500},{\"shot\":\"$OUT\"}]" 2>&1 | grep -e SHOT -e nav
