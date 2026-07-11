#!/usr/bin/env bash
# Package clean source code ZIP for dev/audit sharing.
# Usage: ./archive-source.sh [version]
set -euo pipefail

VERSION="${1:-$(date +%Y%m%d)}"
ARCHIVE="zenova-source-${VERSION}.zip"

echo "==> Creating clean source archive: ${ARCHIVE}"

zip -r "${ARCHIVE}" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x ".gitignore" \
  -x ".env" \
  -x ".env.local" \
  -x "__pycache__/*" \
  -x "*.pyc" \
  -x ".next/*" \
  -x "next-env.d.ts" \
  -x "graphify-out/*" \
  -x ".agent/*" \
  -x "backend/keys/*" \
  -x "backend/dist/*" \
  -x "*.lic" \
  -x "venv/*" \
  -x ".venv/*" \
  -x "dist/*" \
  -x "build/*" \
  -x "*.tar.gz" \
  -x ".pytest_cache/*" \
  -x ".mypy_cache/*" \
  -x "*.tsbuildinfo" \
  -x ".next" \
  -x "backend/app/licensing/coreval.pyd" \
  -x "backend/app/licensing/coreval.exp" \
  -x "backend/app/licensing/coreval.lib" \
  -x "backend/app/licensing/__pycache__/*"

echo "==> Done: ${ARCHIVE}"
echo "    Size: $(du -h "${ARCHIVE}" | cut -f1)"
