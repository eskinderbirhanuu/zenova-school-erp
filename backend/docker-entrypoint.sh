#!/bin/sh
set -e

echo "[ZENOVA] Starting entrypoint (env=${ENVIRONMENT:-development})..."

echo "[ZENOVA] Running database migrations..."
alembic upgrade head

echo "[ZENOVA] Starting uvicorn server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${UVICORN_WORKERS:-1}" \
    --proxy-headers \
    --forwarded-allow-ips="${FORWARDED_ALLOW_IPS:-127.0.0.1}"
