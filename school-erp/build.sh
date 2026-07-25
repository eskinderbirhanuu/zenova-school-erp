#!/usr/bin/env bash
# Build ZENOVA School ERP Docker images from source.
# Run this from the project root (ZENOVA/).
# Usage: ./school-erp/build.sh [version]
set -euo pipefail

VERSION="${1:-$(cat VERSION 2>/dev/null || echo "latest")}"
REGISTRY="${REGISTRY:-zenova}"

echo "==> ZENOVA School ERP Builder"
echo "    Version: ${VERSION}"
echo "    Registry: ${REGISTRY}"
echo ""

# 1. Build backend
echo "==> Building backend..."
docker build -t "${REGISTRY}/backend:${VERSION}" \
  -f backend/Dockerfile ./backend

# 2. Build frontend
echo "==> Building frontend..."
docker build -t "${REGISTRY}/frontend:${VERSION}" \
  -f frontend/Dockerfile ./frontend

# 3. Tag as latest
docker tag "${REGISTRY}/backend:${VERSION}" "${REGISTRY}/backend:latest"
docker tag "${REGISTRY}/frontend:${VERSION}" "${REGISTRY}/frontend:latest"

echo ""
echo "==> Done. Images:"
echo "    ${REGISTRY}/backend:${VERSION}"
echo "    ${REGISTRY}/frontend:${VERSION}"
echo ""
echo "To export for customer deployment:"
echo "  docker save ${REGISTRY}/backend:${VERSION} | gzip > zenova-backend-${VERSION}.tar.gz"
echo "  docker save ${REGISTRY}/frontend:${VERSION} | gzip > zenova-frontend-${VERSION}.tar.gz"
