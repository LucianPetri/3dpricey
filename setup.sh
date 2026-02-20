#!/bin/bash
# 3DPricey Phase 1 Installation Script

set -e

echo "================================"
echo "3DPricey Phase 1 Setup"
echo "================================"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Copy .env.example if .env doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit .env and update the following:"
    echo "   - DB_PASSWORD"
    echo "   - JWT_SECRET (minimum 32 characters)"
    echo "   - MINIO_SECRET_KEY"
    echo ""
    read -p "Press Enter after you've updated .env, or Ctrl+C to exit..."
fi

# Create backend .env if needed
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env..."
    cp backend/.env.example backend/.env
fi

echo ""
echo "🚀 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Application URLs:"
echo "   Frontend:      http://localhost:8080"
echo "   Backend API:   http://localhost:3001"
echo "   MinIO Console: http://localhost:9001"
echo ""
echo "👤 Default admin credentials:"
echo "   Email:    admin@example.com"
echo "   Password: admin123"
echo ""
echo "📖 For more information, see PHASE1-README.md"
echo ""
