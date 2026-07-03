#!/usr/bin/env bash
# Build and export ZENOVA backend Docker image (source-free deployment)
set -euo pipefail

VERSION="${1:-latest}"
IMAGE_NAME="zenova/backend"
ARCHIVE_NAME="zenova-backend-${VERSION}.tar.gz"

echo "==> Building ${IMAGE_NAME}:${VERSION}"
docker build -t "${IMAGE_NAME}:${VERSION}" ./backend

echo "==> Exporting to ${ARCHIVE_NAME}"
docker save "${IMAGE_NAME}:${VERSION}" | gzip > "${ARCHIVE_NAME}"

echo "==> Done: ${ARCHIVE_NAME}"
echo "    Install on server:  docker load < ${ARCHIVE_NAME}"
echo "                       docker compose up -d"
