#!/usr/bin/env bash
# Package ZENOVA release for customer deployment
# Usage: ./package-release.sh v1.0.0
set -euo pipefail

VERSION="${1:?Usage: $0 <version>}"
RELEASE_DIR="zenova-${VERSION}"
ARCHIVE="zenova-${VERSION}.zip"

echo "==> Packaging ZENOVA ${VERSION}"

# 1. Build backend image
echo "==> Building backend image..."
docker build -t "zenova/backend:${VERSION}" ./backend

# 2. Build frontend image
echo "==> Building frontend image..."
docker build -t "zenova/frontend:${VERSION}" ./frontend

# 3. Create release directory
mkdir -p "${RELEASE_DIR}"

# 4. Export images
echo "==> Exporting Docker images..."
docker save "zenova/backend:${VERSION}" | gzip > "${RELEASE_DIR}/zenova-backend-${VERSION}.tar.gz"
docker save "zenova/frontend:${VERSION}" | gzip > "${RELEASE_DIR}/zenova-frontend-${VERSION}.tar.gz"

# 5. Copy deployment files (NO SOURCE CODE)
cp release/docker-compose.production.yml "${RELEASE_DIR}/docker-compose.yml"
cp release/install.sh "${RELEASE_DIR}/"
cp release/README.txt "${RELEASE_DIR}/"

# 6. Create checksums
cd "${RELEASE_DIR}"
sha256sum *.tar.gz *.yml *.sh > checksums.txt
cd ..

# 7. Archive
echo "==> Creating ${ARCHIVE}..."
zip -r "${ARCHIVE}" "${RELEASE_DIR}/"

echo "==> Done: ${ARCHIVE}"
echo "    Size: $(du -h "${ARCHIVE}" | cut -f1)"
echo ""
echo "    Deploy on server:"
echo "    1. Upload ${ARCHIVE}"
echo "    2. unzip ${ARCHIVE} -d zenova"
echo "    3. cd zenova"
echo "    4. docker load < zenova-backend-${VERSION}.tar.gz"
echo "    5. docker load < zenova-frontend-${VERSION}.tar.gz"
echo "    6. cp .env.example .env  # edit with real values"
echo "    7. docker compose up -d"
