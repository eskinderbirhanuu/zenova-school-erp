#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════╗"
echo "║        ZENOVA Deployment Script          ║"
echo "╚═══════════════════════════════════════════╝"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose plugin is required."; exit 1; }

# Generate .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file with secure defaults..."
    cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
DB_USER=zenova
DB_PASS=$(openssl rand -hex 16)
DB_NAME=zenova
SERVER_IP=$(hostname -I | awk '{print $1}')
SCHOOL_WATERMARK=dev
BUILD_ID=0
EOF
    echo "✅ .env file created"
else
    echo "📄 .env file exists, using it"
fi

# Source .env
set -a; source .env; set +a

# Pull base images
echo "📦 Pulling base Docker images..."
docker compose pull postgres redis nginx 2>/dev/null || true

# Build and start
echo "🏗️  Building and starting services..."
docker compose up -d --build

# Wait for backend health
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:80/api/v1/activate/status > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "⚠️  Backend did not respond in time. Check logs with: docker compose logs backend"
    fi
    sleep 2
done

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║        Deployment Complete!              ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "   Access ZENOVA at: http://${SERVER_IP}:80"
echo "   Or locally at:    http://localhost:80"
echo ""
echo "   Useful commands:"
echo "   ┌─────────────────────────────────────────┐"
echo "   │ docker compose logs -f        View logs │"
echo "   │ docker compose ps             Status    │"
echo "   │ docker compose down           Stop all  │"
echo "   │ docker compose restart nginx  Reload    │"
echo "   └─────────────────────────────────────────┘"
