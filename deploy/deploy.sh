#!/usr/bin/env bash
# ZENOVA Deployment Script
# Usage:
#   ./deploy/deploy.sh school    # Deploy School ERP (customer VPS)
#   ./deploy/deploy.sh cc        # Deploy Control Center (admin VPS)
#   ./deploy/deploy.sh license   # Deploy License Server (cloud API)
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
  license)
    COMPOSE_FILE="../license-server/docker-compose.yml"
    ENV_FILE=".env.license"
    ;;
  *)
    echo "Usage: $0 {school|cc|license}"
    exit 1
    ;;
esac

cd "$(dirname "$0")"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Create $ENV_FILE from the relevant .env.example first"
  exit 1
fi

set -a; source "$ENV_FILE"; set +a

echo "=== Deploying ZENOVA ($MODE) ==="

if [ "$MODE" != "license" ]; then
  mkdir -p ssl backups

  SSL_COUNTRY="${SSL_COUNTRY:-ET}"
  if [ ! -f ssl/fullchain.pem ]; then
    echo "--- Generating self-signed cert (replace with Let's Encrypt later) ---"
    docker run --rm -v "$PWD/ssl:/certs" alpine:3.20 sh -c "
      apk add openssl
      openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /certs/privkey.pem \
        -out /certs/fullchain.pem \
        -subj '/CN=${DOMAIN}/O=ZENOVA/C=${SSL_COUNTRY}'
    "
  fi
fi

if [ "$MODE" = "school" ]; then
  echo "--- Loading pre-built images ---"
  for img in zenova-backend-*.tar.gz zenova-frontend-*.tar.gz; do
    [ -f "$img" ] && docker load < "$img"
  done
fi

echo "--- Starting services ---"
docker compose -f "$COMPOSE_FILE" up -d

if [ "$MODE" = "school" ] || [ "$MODE" = "cc" ]; then
  echo "--- Waiting for DB ---"
  sleep 5
  docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U "${DB_USER:-zenova}"

  echo "--- Running migrations ---"
  docker compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head || echo "WARN: Migration exit code $?"
fi

echo ""
echo "=== Deploy complete! ==="
echo ""
echo "To view logs:  docker compose -f $COMPOSE_FILE logs -f"
echo "To stop:       docker compose -f $COMPOSE_FILE down"
