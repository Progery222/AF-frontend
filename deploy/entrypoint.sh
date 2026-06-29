#!/bin/sh
set -eu

USER="${FRONTEND_AUTH_USER:-admin}"
PASS="${FRONTEND_AUTH_PASSWORD:-af-admin}"

B64=$(printf '%s' "$USER:$PASS" | base64 -w 0 2>/dev/null || printf '%s' "$USER:$PASS" | base64)

cat > /etc/nginx/http.d/00-auth-map.conf <<EOF
map \$http_authorization \$af_auth_ok {
    default 0;
    "Basic ${B64}" 1;
}
EOF

wait_for() {
  host=$1
  port=$2
  path=${3:-/health}
  i=0
  while [ "$i" -lt 90 ]; do
    if wget -q -O /dev/null --timeout=2 "http://${host}:${port}${path}" 2>/dev/null; then
      echo "AF frontend: upstream ready ${host}:${port}"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "AF frontend: WARN timeout waiting for ${host}:${port} (starting anyway)"
  return 0
}

echo "AF frontend: waiting for upstreams..."
wait_for phone-orchestrator 9090 /health
wait_for phone-provisioner 9090 /health
wait_for minio 9000 /minio/health/live

echo "AF frontend: auth user=$USER, proxies: orch, prov, minio, bulk"

bulk-proxy &
exec nginx -g 'daemon off;'
