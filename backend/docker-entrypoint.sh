#!/bin/sh
# 3DPricey Backend Entrypoint

set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Checking if database needs seeding..."
npx prisma db seed || echo "⚠️ Seeding skipped or failed"

echo "✅ Starting 3DPricey API server..."
exec "$@"
