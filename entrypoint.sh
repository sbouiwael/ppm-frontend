#!/bin/sh
# Substitutes BACKEND_URL env var into nginx config, then starts nginx.
# Default: http://backend:8082  (docker-compose service name)
export BACKEND_URL="${BACKEND_URL:-http://backend:8082}"

envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"