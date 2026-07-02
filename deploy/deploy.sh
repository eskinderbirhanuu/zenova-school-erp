#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env.vps ]; then
  echo "ERROR: Create .env.vps from .env.vps.example first"
  echo "  cp .env.vps.example .env.vps"
  echo "  edit .env.vps with your domain and secrets"
  exit 1
fi

set -a; source .env.vps; set +a

echo "=== Deploying ZENOVA to $DOMAIN ==="

mkdir -p ssl backups

if [ ! -f ssl/fullchain.pem ]; then
  echo "--- Generating self-signed cert for setup (replace with Let's Encrypt later) ---"
  docker run --rm -v "$PWD/ssl:/certs" alpine:3.20 sh -c "
    apk add openssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /certs/privkey.pem \
      -out /certs/fullchain.pem \
      -subj '/CN=${DOMAIN}/O=ZENOVA/C=ET'
  "
fi

echo "--- Pulling images and building ---"
docker compose -f docker-compose.vps.yml pull
docker compose -f docker-compose.vps.yml build

echo "--- Starting services ---"
docker compose -f docker-compose.vps.yml up -d

echo "--- Waiting for DB ---"
sleep 5
docker compose -f docker-compose.vps.yml exec -T db pg_isready -U "${DB_USER:-zenova}"

echo "--- Running migrations ---"
docker compose -f docker-compose.vps.yml exec -T backend python -m alembic upgrade head

echo "=== Deploy complete! https://$DOMAIN ==="
echo ""
echo "First-time setup:"
echo "  1. Visit https://$DOMAIN — you'll see the installer"
echo "  2. Follow the installer wizard"
echo ""
echo "To view logs:  docker compose -f docker-compose.vps.yml logs -f"
echo "To stop:       docker compose -f docker-compose.vps.yml down"
