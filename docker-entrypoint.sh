#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/env.js
window.__APP_CONFIG__ = {
  GATEWAY_SERVICE_URL: "${GATEWAY_SERVICE_URL:-}",
  VITE_KAKAO_MAP_KEY: "${VITE_KAKAO_MAP_KEY:-}",
  VITE_TOSS_CLIENT_KEY: "${VITE_TOSS_CLIENT_KEY:-}",
  VITE_S3_BASE_URL: "${VITE_S3_BASE_URL:-}"
};
EOF

exec nginx -g 'daemon off;'
