# 🚀 Phase 1 - Quick Start Guide

## Status: ✅ Implementation Complete

All Phase 1 code is in place. Now let's get it running!

---

## Option 1: Docker (Recommended)

### Prerequisites
- Docker Desktop installed
- Docker Compose available

### Steps

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env and set secure values
# REQUIRED: Change these for security!
#   - DB_PASSWORD
#   - JWT_SECRET (min 32 chars)
#   - MINIO_SECRET_KEY

# 3. Run automated setup
./setup.sh

# OR manually:
docker-compose up -d
```

### Verify

```bash
# Check all containers are running
docker ps

# You should see:
# - 3dpricey-postgres
# - 3dpricey-redis
# - 3dpricey-minio
# - 3dpricey-backend
# - 3dpricey-frontend

# Check backend health
curl http://localhost:3001/health

# Access frontend
open http://localhost:8080
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker logs -f 3dpricey-backend
docker logs -f 3dpricey-postgres
```

### Stop

```bash
docker-compose down

# Or with volume cleanup
docker-compose down -v
```

---

## Option 2: Local Development (No Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ running on localhost:5432
- Redis running on localhost:6379 (optional)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your local database URL
# DATABASE_URL="postgresql://user:pass@localhost:5432/3dpricey"

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database with defaults
npx prisma db seed

# Start development server
npm run dev
```

Backend will run on **http://localhost:3001**

### Frontend Setup (in new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on **http://localhost:8080**

---

## First Login

### Using Seeded Admin Account

1. Go to http://localhost:8080
2. Click Login
3. Use these credentials:
   - Email: `admin@example.com`
   - Password: `admin123`

### Or Register New Account

1. Go to http://localhost:8080
2. Click Register
3. Fill in your details
4. You'll be logged in automatically

---

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:3001/health

# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "companyName": "Test Company"
  }'

# Login (save the token from response)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'

# Get quotes (use token from login)
TOKEN="your_token_here"
curl http://localhost:3001/api/quotes \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman/Insomnia

Import this collection:

```json
{
  "name": "3DPricey API",
  "requests": [
    {
      "name": "Register",
      "method": "POST",
      "url": "http://localhost:3001/api/auth/register",
      "body": {
        "email": "test@example.com",
        "password": "test123",
        "name": "Test User"
      }
    },
    {
      "name": "Login",
      "method": "POST",
      "url": "http://localhost:3001/api/auth/login",
      "body": {
        "email": "test@example.com",
        "password": "test123"
      }
    },
    {
      "name": "Get Quotes",
      "method": "GET",
      "url": "http://localhost:3001/api/quotes",
      "headers": {
        "Authorization": "Bearer {{token}}"
      }
    }
  ]
}
```

---

## Database Management

### Prisma Studio (Visual Database Editor)

```bash
cd backend
npx prisma studio
```

Opens on http://localhost:5555 - you can view/edit all tables directly.

### Migrations

```bash
cd backend

# Create new migration
npx prisma migrate dev --name add_new_field

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (DEV ONLY!)
npx prisma migrate reset
```

---

## Troubleshooting

### "Cannot find module" errors

The TypeScript errors you see are expected before `npm install` runs.

**Fix:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Database connection failed

**Check PostgreSQL is running:**
```bash
# Docker
docker ps | grep postgres

# Local
pg_isready -h localhost -p 5432
```

**Check connection string in .env:**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/3dpricey"
```

### Port already in use

**Find process using port:**
```bash
# macOS/Linux
lsof -ti:3001 | xargs kill -9
lsof -ti:8080 | xargs kill -9

# Or change ports in .env and docker-compose.yml
```

### JWT token invalid

**Generate new JWT secret:**
```bash
openssl rand -base64 32
```

Paste result into `.env` as `JWT_SECRET`

### Docker build fails

```bash
# Clear everything and rebuild
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

---

## Next Steps

### Verify Everything Works

1. ✅ Backend responds to health check
2. ✅ Can register and login
3. ✅ Can create a quote
4. ✅ Frontend loads and displays data
5. ✅ Database contains data (check Prisma Studio)

### Start Building

- Create your first real quote in the UI
- Import materials from old localStorage
- Configure machines and cost constants
- Test the sync mechanism (go offline, make changes, come back online)

### Move to Phase 2

Once Phase 1 is stable, proceed to:
- Multi-color filament support
- G-code M600 detection
- Enhanced file parsing

See [.github/PHASE2-COMPACT.md](.github/PHASE2-COMPACT.md)

---

## Files Created in Phase 1

### Backend (New)
- `backend/src/index.ts` - Main server
- `backend/src/controllers/*.ts` - 4 controllers
- `backend/src/routes/*.ts` - 6 routes
- `backend/src/middleware/*.ts` - 2 middleware
- `backend/prisma/schema.prisma` - Database schema
- `backend/Dockerfile` - Container image
- `backend/package.json` - Dependencies

### Frontend (Modified)
- `frontend/src/lib/api.ts` - API client
- `frontend/src/lib/auth.ts` - Auth utilities
- `frontend/src/lib/sync.ts` - Background sync
- `frontend/src/components/shared/ConflictResolutionModal.tsx`
- `frontend/Dockerfile` - Container image
- `frontend/nginx.conf` - Web server config

### Infrastructure
- `docker-compose.yml` - 5 services orchestration
- `.env.example` - Environment template
- `setup.sh` - Automated setup script

### Documentation
- `PHASE1-README.md` - Detailed setup guide
- `PHASE1-SUMMARY.md` - Implementation summary
- This file - Quick start guide

---

## Support

**Having issues?**
1. Check [PHASE1-README.md](PHASE1-README.md) Troubleshooting section
2. Review logs: `docker-compose logs -f`
3. Check GitHub issues

**Everything working?**
🎉 Congratulations! Phase 1 is complete. Start planning Phase 2!

---

Made by Printel
