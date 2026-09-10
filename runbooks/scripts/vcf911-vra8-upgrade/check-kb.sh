#!/bin/bash
LOG=$(ls -t /var/log/vmware/prelude/patch-prVCFCON-41983-*.log 2>/dev/null | head -1)
echo "LOGFILE=$LOG"
if [ -n "$LOG" ]; then tail -n 15 "$LOG"; else echo "NO LOG"; fi
echo "=== cert_ext rows in db ==="
PASSWD=$(kubectl -n prelude get secrets db-credentials -o jsonpath="{.data.provisioning-db}" | base64 -d)
POD=$(kubectl -n prelude get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}')
kubectl -n prelude exec "$POD" -- bash -c "psql -qAt postgresql://provisioning-db:${PASSWD}@\$PGPOOL_SERVICE_HOST:\$PGPOOL_SERVICE_PORT/provisioning-db -c \"select document_self_link, length(certificate) from ssl_trust_certificate_state where document_self_link like 'cert_ext_%' order by 1;\""
