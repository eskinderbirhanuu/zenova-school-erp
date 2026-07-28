#!/usr/bin/env bash
# Package ZENOVA release for customer deployment.
# Run from project root.
# Usage: ./release/package-release.sh v1.0.0
set -euo pipefail

VERSION="${1:?Usage: $0 <version>}"
RELEASE_DIR="zenova-${VERSION}"
ARCHIVE="zenova-${VERSION}.zip"

echo "==> Packaging ZENOVA School ERP ${VERSION}"
echo ""

# 1. Build images via school-erp builder
echo "==> Building Docker images..."
REGISTRY="zenova" ./school-erp/build.sh "${VERSION}"

# 2. Create release directory
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

# 3. Export images
echo "==> Exporting images..."
docker save "zenova/backend:${VERSION}" | gzip > "${RELEASE_DIR}/zenova-backend-${VERSION}.tar.gz"
docker save "zenova/frontend:${VERSION}" | gzip > "${RELEASE_DIR}/zenova-frontend-${VERSION}.tar.gz"

# 4. Copy deployment files (NO SOURCE CODE)
echo "==> Copying deployment files..."
cp school-erp/docker-compose.yml        "${RELEASE_DIR}/docker-compose.yml"
cp school-erp/.env.example              "${RELEASE_DIR}/.env.example"
cp school-erp/nginx.conf                "${RELEASE_DIR}/nginx.conf"
if [ ! -d "school-erp/setup-wizard" ]; then
    echo "ERROR: setup-wizard directory not found at school-erp/setup-wizard"
    exit 1
fi
cp -r school-erp/setup-wizard           "${RELEASE_DIR}/setup-wizard"
cp release/README.txt                   "${RELEASE_DIR}/"

# 5. Create checksums
echo "==> Creating checksums..."
cd "${RELEASE_DIR}"
sha256sum *.tar.gz *.yml *.txt > checksums.txt
cd ..

# 6. Archive
echo "==> Creating ${ARCHIVE}..."
zip -r "${ARCHIVE}" "${RELEASE_DIR}/"
rm -rf "${RELEASE_DIR}"

echo ""
echo "==> Done: ${ARCHIVE}"
echo "    Size: $(du -h "${ARCHIVE}" | cut -f1)"
echo ""
echo "=== Deployment Instructions ==="
echo "1. Upload ${ARCHIVE} to server"
echo "2. unzip ${ARCHIVE} -d zenova"
echo "3. cd zenova"
echo "4. docker load < zenova-backend-${VERSION}.tar.gz"
echo "5. docker load < zenova-frontend-${VERSION}.tar.gz"
echo "6. cp .env.example .env  # edit with license key"
echo "7. docker compose up -d"
