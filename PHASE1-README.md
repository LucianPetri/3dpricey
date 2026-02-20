# 3DPricey - Phase 1 Setup Guide

## Architecture Overview

Phase 1 introduces a complete infrastructure overhaul:
- **Frontend:** React PWA (moved to `frontend/`)
- **Backend:** Express.js + TypeScript (`backend/`)
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis
- **Storage:** MinIO (S3-compatible)
- **Deployment:** Docker Compose

---

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Git

---

## Quick Start (Docker)

### 1. Clone and Setup

```bash
cd 3dpricey
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and update these critical values:

```env
# Change these for security!
DB_PASSWORD=your_secure_password
JWT_SECRET=your_32_character_minimum_secret_key
MINIO_SECRET_KEY=your_minio_secret
```

### 3. Start All Services

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **MinIO** (ports 9000, 9001)
- **Backend API** (port 3001)
- **Frontend** (port 8080)

### 4. Access the Application

- **Frontend:** http://localhost:8080
- **API:** http://localhost:3001
- **MinIO Console:** http://localhost:9001

### 5. Create First User

Register at: http://localhost:8080/#/register

Default admin credentials (from seed):
- Email: `admin@example.com`
- Password: `admin123`

---

## Local Development (Without Docker)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your local PostgreSQL connection

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start dev server
npm run dev
```

Backend will run on http://localhost:3001

### Frontend Setup

```bash
cd frontend
npm install

# Start dev server
npm run dev
```

Frontend will run on http://localhost:8080

---

## Database Migrations

```bash
cd backend

# Create a new migration
npx prisma migrate dev --name description_of_changes

# Apply migrations (production)
npx prisma migrate deploy

# View database in browser
npx prisma studio
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Quotes
- `GET /api/quotes` - List quotes (paginated)
- `GET /api/quotes/:id` - Get quote by ID
- `POST /api/quotes` - Create quote
- `POST /api/quotes/batch` - Batch create quotes
- `PUT /api/quotes/:id` - Update quote
- `DELETE /api/quotes/:id` - Delete quote

### Materials
- `GET /api/materials?printType=FDM` - List materials
- `POST /api/materials` - Create material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material

### Machines
- `GET /api/machines?printType=FDM` - List machines
- `POST /api/machines` - Create machine
- `PUT /api/machines/:id` - Update machine
- `DELETE /api/machines/:id` - Delete machine

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker logs 3dpricey-postgres

# Restart database
docker-compose restart postgres
```

### Backend Not Starting

```bash
# Check backend logs
docker logs 3dpricey-backend

# Rebuild backend
docker-compose up -d --build backend
```

### Frontend Build Errors

```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

---

## Migration Guide (localStorage → PostgreSQL)

The old app used localStorage. To migrate existing data:

```typescript
// backend/scripts/migrate-from-local.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Paste your localStorage data
const localQuotes = JSON.parse('...quotes from localStorage...');

async function migrate() {
  for (const quote of localQuotes) {
    await prisma.quote.create({
      data: {
        ...quote,
        userId: 'your-user-id',
        companyId: 'your-company-id',
      },
    });
  }
}

migrate();
```

Run with:
```bash
cd backend
ts-node scripts/migrate-from-local.ts
```

---

## Production Deployment

### Environment Variables

Update `.env` for production:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@your-db-host:5432/3dpricey
JWT_SECRET=generate-strong-secret-with-openssl-rand-base64-32
FRONTEND_URL=https://your-domain.com
```

### SSL/TLS

Update `docker-compose.yml` to use SSL certificates:
```yaml
frontend:
  volumes:
    - ./certs:/etc/nginx/certs
  # Update nginx.conf for SSL
```

### Backup Strategy

```bash
# Backup PostgreSQL
docker exec 3dpricey-postgres pg_dump -U 3dpricey_user 3dpricey > backup.sql

# Backup MinIO
docker exec 3dpricey-minio mc mirror /data /backup
```

---

## Next Steps (Phase 2)

Phase 2 will add:
- Multi-color filament support
- G-code M600 detection
- Per-filament cost calculation

See [.github/PHASE2-COMPACT.md](.github/PHASE2-COMPACT.md)

---

## Support

For issues, check:
- [GitHub Issues](https://git.xaiko.cloud/xaiko/3dpricey/issues)
- [Documentation](.github/)

---

**Made by Printel**
