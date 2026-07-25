#!/usr/bin/env bash
# ZENOVA Deployment Script
# Usage:
#   ./deploy/deploy.sh school   # Deploy School ERP (customer VPS)
#   ./deploy/deploy.sh cc       # Deploy Control Center (admin VPS)
set -euo pipefail

MODE="${1:-school}"

case "$MODE" in
  school)
    COMPOSE_FILE="docker-compose.vps.yml"
    ENV_FILE=".env.vps"
    ;;
  cc)
    COMPOSE_FILE="docker-compose.cc.yml"
    ENV_FILE=".env.cc"
    ;;
  *)
    echo "Usage: $0 {school|cc}"
    exit 1
    ;;
esac

cd "$(dirname "$0")"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Create $ENV_FILE from .env.vps.example first"
  echo "  edit $ENV_FILE with your domain and secrets"
  exit 1
fi

set -a; source "$ENV_FILE"; set +a

echo "=== Deploying ZENOVA ($MODE) to $DOMAIN ==="

mkdir -p ssl backups

if [ ! -f ssl/fullchain.pem ]; then
  echo "--- Generating self-signed cert (replace with Let's Encrypt later) ---"
  docker run --rm -v "$PWD/ssl:/certs" alpine:3.20 sh -c "
    apk add openssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /certs/privkey.pem \
      -out /certs/fullchain.pem \
      -subj '/CN=${DOMAIN}/O=ZENOVA/C=ET'
  "
fi

if [ "$MODE" = "school" ]; then
  echo "--- Loading pre-built images ---"
  for img in zenova-backend-*.tar.gz zenova-frontend-*.tar.gz; do
    [ -f "$img" ] && docker load < "$img"
  done
fi

echo "--- Starting services ---"
docker compose -f "$COMPOSE_FILE" up -d

echo "--- Waiting for DB ---"
sleep 5
docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U "${DB_USER:-zenova}"

echo "--- Running migrations ---"
docker compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head || echo "WARN: Migration exit code $?"

echo ""
echo "=== Deploy complete! https://$DOMAIN ==="
echo ""
echo "To view logs:  docker compose -f $COMPOSE_FILE logs -f"
echo "To stop:       docker compose -f $COMPOSE_FILE down"
