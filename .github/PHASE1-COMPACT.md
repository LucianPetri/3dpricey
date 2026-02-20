# Phase 1: Architecture

## Prisma Schema
```prisma
model User {
  id String @id @default(cuid())
  email String @unique
  password String
  name String
  role String @default("user")
  companyId String?
  company Company? @relation(fields: [companyId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  quotes Quote[]
  materials Material[]
  machines Machine[]
  apiKeys ApiKey[]
}

model Company {
  id String @id @default(cuid())
  name String
  email String?
  phone String?
  address String?
  taxId String?
  website String?
  logoUrl String?
  users User[]
  quotes Quote[]
  materials Material[]
  machines Machine[]
  spools MaterialSpool[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Quote {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId String
  company Company @relation(fields: [companyId], references: [id])
  customerId String?
  customer Customer? @relation(fields: [customerId], references: [id])
  projectName String
  printColour String
  printType String
  materialCost Float
  machineTimeCost Float
  electricityCost Float
  laborCost Float
  overheadCost Float
  subtotal Float
  markup Float
  paintingCost Float?
  totalPrice Float
  quantity Int @default(1)
  unitPrice Float
  notes String?
  status String @default("PENDING")
  priority String?
  dueDate DateTime?
  filePath String?
  filamentWeight Float?
  printTime Float?
  laborHours Float?
  resinVolume Float?
  washingTime Float?
  curingTime Float?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  quoteFilaments QuoteFilament[]
  printJob PrintJob?
  auditLog AuditLog[]
}

model Material {
  id String @id @default(cuid())
  userId String?
  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId String
  company Company @relation(fields: [companyId], references: [id])
  name String
  costPerUnit Float
  printType String
  density Float?
  notes String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  spools MaterialSpool[]
}

model Machine {
  id String @id @default(cuid())
  userId String?
  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId String
  company Company @relation(fields: [companyId], references: [id])
  name String
  hourlyCost Float
  powerConsumption Float?
  printType String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  printJobs PrintJob[]
}

model MaterialSpool {
  id String @id @default(cuid())
  materialId String
  material Material @relation(fields: [materialId], references: [id], onDelete: Cascade)
  companyId String
  company Company @relation(fields: [companyId], references: [id])
  weightGrams Float?
  remainingGrams Float?
  volumeMl Float?
  remainingMl Float?
  purchasedAt DateTime
  cost Float
  supplier String?
  batchNumber String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Customer {
  id String @id @default(cuid())
  companyId String
  company Company @relation(fields: [companyId], references: [id])
  name String
  email String?
  phone String?
  company String?
  address String?
  tags String[]
  notes String?
  averageRating Float?
  reviewCount Int @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  quotes Quote[]
}

model PrintJob {
  id String @id @default(cuid())
  quoteId String @unique
  quote Quote @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  machineId String
  machine Machine @relation(fields: [machineId], references: [id])
  status String @default("PENDING")
  assignedEmployeeId String?
  startedAt DateTime?
  completedAt DateTime?
  actualPrintTime Float?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id String @id @default(cuid())
  userId String
  quoteId String?
  quote Quote? @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  action String
  changes Json?
  createdAt DateTime @default(now())
}

model ApiKey {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  key String @unique
  name String
  active Boolean @default(true)
  lastUsed DateTime?
  createdAt DateTime @default(now())
  expiresAt DateTime?
}

model SyncTransaction {
  id String @id @default(cuid())
  userId String
  quoteId String
  operation String
  tableName String
  localChanges Json
  serverVersion Json?
  status String @default("PENDING")
  conflictedAt DateTime?
  resolvedAt DateTime?
  resolution Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model QuoteFilament {
  id String @id @default(cuid())
  quoteId String
  quote Quote @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  materialId String
  weightGrams Float
  order Int
  createdAt DateTime @default(now())
}
```

## Docker Compose
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: 3dpricey
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/minio
    command: minio server /minio --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/3dpricey
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      MINIO_BUCKET: 3dpricey-files
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src
    command: sh docker-entrypoint.sh

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:3001/api
    ports:
      - "8080:80"
    depends_on:
      - backend
    environment:
      VITE_API_URL: http://localhost:3001/api

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

## .env.example
```env
DB_USER=3dpricey_user
DB_PASSWORD=secure_password_here
DATABASE_URL=postgresql://3dpricey_user:secure_password_here@postgres:5432/3dpricey
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d
NODE_ENV=development
API_PORT=3001
REDIS_URL=redis://redis:6379
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=3dpricey-files
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=http://localhost:9000
VITE_API_URL=http://localhost:3001/api
```

## PWA-First Sync
localStorage = source of truth
Background sync: every 5min or on online event
If conflict: show cherry-pick modal
User chooses: keep local OR server value
After sync: mark as synced

## Caching (Redis)
materials:{type} → 1hr TTL
machines → 1hr TTL
conflict_resolution:{userId}:{quoteId} → 24hr TTL

## MinIO File Storage
Bucket: 3dpricey-files
Paths:
  gcode/{userId}/{quoteId}/{filename}
  models/{userId}/{quoteId}/{filename}
  pdfs/{userId}/{quoteId}/quote_{timestamp}
  exports/{userId}/batch_{timestamp}
  thumbnails/{userId}/{quoteId}/thumbnail.png

## Performance Targets
API response: <200ms
DB query: <100ms
Frontend build: <500KB gzipped
Initial load: <3s
Lighthouse: >85

## Success
- All quotes in PostgreSQL
- User auth working
- PWA + background sync
- Conflict resolution modal
- MinIO file storage
- Redis caching
- Offline-capable
- Docker Compose runs
- Migration script tested
