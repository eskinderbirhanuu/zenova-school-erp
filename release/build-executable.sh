#!/usr/bin/env bash
# Build ZENOVA backend as a standalone executable (PyInstaller)
# This is optional — Docker image is the primary distribution method.
# PyInstaller can be used for environments where Docker is not available.
set -euo pipefail

VERSION="${1:-$(cat ../VERSION)}"
OUTPUT_DIR="dist/zenova-backend-${VERSION}"

echo "==> Building ZENOVA Backend ${VERSION} with PyInstaller"

# Install PyInstaller
pip install pyinstaller

# Build the executable
pyinstaller \
    --name "zenova-backend" \
    --onefile \
    --add-data "../VERSION:." \
    --hidden-import "uvicorn.logging" \
    --hidden-import "uvicorn.loops.auto" \
    --hidden-import "uvicorn.protocols.http.auto" \
    --hidden-import "uvicorn.lifespan.on" \
    --hidden-import "alembic" \
    --hidden-import "alembic.config" \
    --hidden-import "sqlalchemy" \
    --hidden-import "cryptography" \
    --hidden-import "jose" \
    --hidden-import "httpx" \
    --hidden-import "apscheduler" \
    --hidden-import "psutil" \
    --hidden-import "passlib" \
    --hidden-import "passlib.handlers.bcrypt" \
    --hidden-import "PIL" \
    --hidden-import "openpyxl" \
    --hidden-import "qrcode" \
    --hidden-import "email_validator" \
    --hidden-import "app.core.rate_limit_middleware" \
    --hidden-import "app.core.logging_config" \
    --hidden-import "app.core.scheduler" \
    --hidden-import "app.models" \
    --hidden-import "app.api.v1.endpoints" \
    ../app/main.py

echo "==> Executable built at dist/zenova-backend"
echo "    Run: ./dist/zenova-backend"
echo ""
echo "NOTE: PostgreSQL must be available separately."
echo "The executable contains the API server only."
