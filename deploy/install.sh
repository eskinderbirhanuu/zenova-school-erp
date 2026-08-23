#!/usr/bin/env bash
# ZENOVA School Server — One-Command Installer
# Usage: curl -fsSL https://zenova.example/install.sh | sudo bash
#   or:  sudo bash install.sh [--domain <ip|host>] [--images <dir>] [--registry <url>] [--version <tag>]

set -euo pipefail

MODE="school"
DOMAIN=""
IMAGES_DIR=""
REGISTRY=""
VERSION="${ZENOVA_VERSION:-latest}"
SKIP_DOCKER_INSTALL=false
SKIP_SSL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --images) IMAGES_DIR="$2"; shift 2 ;;
    --registry) REGISTRY="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --skip-docker) SKIP_DOCKER_INSTALL=true; shift ;;
    --skip-ssl) SKIP_SSL=true; shift ;;
    -h|--help)
      cat <<EOF
Usage: $0 [options]
Options:
  --domain <ip|host>    Public domain or IP (default: auto-detect public IP)
  --images <dir>        Directory containing pre-built zenova-*.tar.gz images
  --registry <url>      Docker registry to pull from (e.g. docker.io/zenova)
  --version <tag>       Image tag (default: latest)
  --skip-docker         Skip Docker/Compose installation (assume already installed)
  --skip-ssl            Skip SSL certificate generation (for LAN-only)
  -h, --help            Show this help
EOF
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

log() { echo -e "\033[1;34m[$(date +%H:%M:%S)]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*" >&2; }
die() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

# Must run as root
[[ $EUID -eq 0 ]] || die "Run as root: sudo bash $0"

log "ZENOVA School Server Installer — $(date)"

# Detect Ubuntu
. /etc/os-release
[[ "$ID" == "ubuntu" ]] || die "Only Ubuntu is supported (detected: $ID)"

# Auto-detect domain if not provided
if [[ -z "$DOMAIN" ]]; then
  DOMAIN=$(curl -fsS --max-time 10 ifconfig.me 2>/dev/null || curl -fsS --max-time 10 icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')
  [[ -n "$DOMAIN" ]] || die "Could not auto-detect domain/IP. Use --domain <ip|host>"
  log "Auto-detected domain: $DOMAIN"
fi

# Install Docker + Compose plugin if needed
if [[ "$SKIP_DOCKER_INSTALL" == false ]]; then
  if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
  fi
  if ! docker compose version &>/dev/null; then
    apt-get install -y -qq docker-compose-plugin
  fi
  log "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') + Compose $(docker compose version --short) ready"
fi

# Prepare directories
INSTALL_DIR="/opt/zenova"
mkdir -p "$INSTALL_DIR"/{ssl,backups,data}
cd "$INSTALL_DIR"

# Load or pull images
if [[ -n "$IMAGES_DIR" && -d "$IMAGES_DIR" ]]; then
  log "Loading images from $IMAGES_DIR"
  for img in "$IMAGES_DIR"/zenova-backend-*.tar.gz "$IMAGES_DIR"/zenova-frontend-*.tar.gz; do
    [[ -f "$img" ]] && docker load < "$img" && log "  Loaded $(basename "$img")"
  done
elif [[ -n "$REGISTRY" ]]; then
  log "Pulling images from $REGISTRY"
  docker pull "$REGISTRY/backend:$VERSION" && docker tag "$REGISTRY/backend:$VERSION" "zenova/backend:$VERSION"
  docker pull "$REGISTRY/frontend:$VERSION" && docker tag "$REGISTRY/frontend:$VERSION" "zenova/frontend:$VERSION"
else
  log "No local images or registry specified. Ensure images are available locally or use --images/--registry"
fi

# Generate .env.vps
ENV_FILE="$INSTALL_DIR/.env.vps"
if [[ ! -f "$ENV_FILE" ]]; then
  log "Generating $ENV_FILE"
  DB_PASS=$(openssl rand -base64 32 | tr -d /=+)
  REDIS_PASS=$(openssl rand -base64 32 | tr -d /=+)
  SECRET_KEY=$(openssl rand -base64 48 | tr -d /=+)
  MASTER_KEY=$(openssl rand -base64 48 | tr -d /=+)

  cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
DOMAIN_URL=https://$DOMAIN

DB_USER=zenova
DB_PASSWORD=$DB_PASS
DB_NAME=zenova_prod

REDIS_PASSWORD=$REDIS_PASS

SECRET_KEY=$SECRET_KEY

ZENOVA_LICENSE_KEY=
ZENOVA_LICENSE_SERVER=https://zenova-license-server-8kzq.onrender.com
SCHOOL_ID=

MASTER_SETUP_KEY=$MASTER_KEY

ZENOVA_VERSION=$VERSION
ZENOVA_API_URL=http://backend:8000/api/v1
ZENOVA_APP_MODE=school
EOF
  chmod 600 "$ENV_FILE"
  log "  Generated secure passwords (saved to $ENV_FILE)"
else
  log "Using existing $ENV_FILE"
fi

# SSL certificate
if [[ "$SKIP_SSL" == false && ! -f "$INSTALL_DIR/ssl/fullchain.pem" ]]; then
  log "Generating self-signed SSL certificate for $DOMAIN"
  docker run --rm -v "$INSTALL_DIR/ssl:/certs" alpine:3.20 sh -c "
    apk add -q openssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /certs/privkey.pem -out /certs/fullchain.pem \
      -subj '/CN=$DOMAIN/O=ZENOVA/C=ET' 2>/dev/null
  "
fi

# Copy compose file if not present
COMPOSE_FILE="$INSTALL_DIR/docker-compose.vps.yml"
if [[ ! -f "$COMPOSE_FILE" ]]; then
  # Try to copy from repo if we're in one, else create minimal
  if [[ -f "docker-compose.vps.yml" ]]; then
    cp docker-compose.vps.yml "$COMPOSE_FILE"
  else
    cat > "$COMPOSE_FILE" <<'EOF'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-zenova}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-zenova_prod}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-zenova}"]
      interval: 10s; timeout: 5s; retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s; timeout: 5s; retries: 5
    restart: unless-stopped

  backend:
    image: zenova/backend:${ZENOVA_VERSION:-latest}
    expose: ["8000"]
    environment:
      DATABASE_URL: "postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"
      SECRET_KEY: ${SECRET_KEY}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      ZENOVA_LICENSE_SERVER: ${ZENOVA_LICENSE_SERVER}
      ZENOVA_API_URL: ${ZENOVA_API_URL}
    depends_on:
      db: {condition: service_healthy}
      redis: {condition: service_healthy}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/live"]
      interval: 30s; timeout: 10s; retries: 3; start_period: 30s
    restart: unless-stopped

  frontend:
    image: zenova/frontend:${ZENOVA_VERSION:-latest}
    expose: ["3000"]
    environment:
      ZENOVA_API_URL: ${ZENOVA_API_URL}
      ZENOVA_APP_MODE: ${ZENOVA_APP_MODE:-school}
    depends_on:
      backend: {condition: service_healthy}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
      interval: 30s; timeout: 10s; retries: 3; start_period: 30s
    restart: unless-stopped

  sync-worker:
    image: zenova/backend:${ZENOVA_VERSION:-latest}
    command: ["python", "-m", "app.workers.sync_worker"]
    environment:
      DATABASE_URL: "postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"
      SECRET_KEY: ${SECRET_KEY}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    depends_on:
      db: {condition: service_healthy}
      redis: {condition: service_healthy}
    restart: unless-stopped

  backup-worker:
    image: zenova/backend:${ZENOVA_VERSION:-latest}
    command: ["python", "-m", "app.workers.backup_worker"]
    environment:
      DATABASE_URL: "postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"
      SECRET_KEY: ${SECRET_KEY}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    depends_on:
      db: {condition: service_healthy}
      redis: {condition: service_healthy}
    restart: unless-stopped

  nginx:
    image: nginx:1.26-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      frontend: {condition: service_healthy}
      backend: {condition: service_healthy}
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
EOF
  fi
fi

# Minimal nginx.conf if missing
NGINX_CONF="$INSTALL_DIR/nginx.conf"
if [[ ! -f "$NGINX_CONF" ]]; then
  log "Creating minimal nginx.conf"
  cat > "$NGINX_CONF" <<'EOF'
events { worker_connections 1024; }
http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile      on;
  keepalive_timeout 65;

  upstream frontend { server frontend:3000; }
  upstream backend { server backend:8000; }

  server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name _;
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/v1/ {
      proxy_pass http://backend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
      proxy_pass http://frontend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }
}
EOF
fi

# Start stack
log "Starting ZENOVA stack..."
cd "$INSTALL_DIR"
docker compose -f docker-compose.vps.yml up -d

# Wait for DB and run migrations
log "Waiting for database..."
sleep 8
docker compose -f docker-compose.vps.yml exec -T db pg_isready -U "${DB_USER:-zenova}" -d "${DB_NAME:-zenova_prod}" || true

log "Running database migrations..."
docker compose -f docker-compose.vps.yml exec -T backend alembic upgrade head || warn "Migration exited with code $?"

# Wait for services to be healthy
log "Waiting for services to become healthy..."
for i in {1..30}; do
  BACKEND_OK=$(docker compose -f docker-compose.vps.yml ps --format json backend 2>/dev/null | jq -r '.[0].Health // "unknown"' 2>/dev/null || echo "unknown")
  FRONTEND_OK=$(docker compose -f docker-compose.vps.yml ps --format json frontend 2>/dev/null | jq -r '.[0].Health // "unknown"' 2>/dev/null || echo "unknown")
  [[ "$BACKEND_OK" == "healthy" && "$FRONTEND_OK" == "healthy" ]] && break
  sleep 3
done

# Verify
log "Verifying endpoints..."
curl -fsS "http://localhost:8000/api/v1/health/live" && log "  Backend: OK" || warn "  Backend: not responding"
curl -fsS "http://localhost:3000/" && log "  Frontend: OK" || warn "  Frontend: not responding"

echo ""
log "=== ZENOVA School Server Installed ==="
echo ""
echo "  URL:        https://$DOMAIN"
echo "  Installer:  https://$DOMAIN/installer"
echo "  Login:      https://$DOMAIN/login"
echo "  Config:     $ENV_FILE"
echo "  Logs:       docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "Next steps:"
echo "  1. Open https://$DOMAIN in a browser"
echo "  2. Complete the installer (School ID + License Key from ZENOVA)"
echo "  3. Create your admin account"
echo "  4. Log in and start using ZENOVA!"
echo ""
echo "For license: contact ZENOVA support or create one at your Control Center."
echo ""
log "Installation complete!"