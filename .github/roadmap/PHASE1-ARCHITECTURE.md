# Phase 1: Docker & PostgreSQL Architecture

**Phase:** Infrastructure & Data Persistence  
**Duration:** 4-6 weeks  
**Status:** In Progress - sync MVP implemented and validated on 2026-03-31  

---

## Architecture Overview

### System Diagram (PWA-First with Cloud Sync)
```
┌──────────────────────────────────────────────────────┐
│           User's Browser (Client)                    │
│  ┌────────────────────────────────────────────────┐  │
│  │  3DPricey React PWA (TypeScript + React 18)    │  │
│  │                                                │  │
│  │  DATA LAYER (Source of Truth):                 │  │
│  │  ├─ localStorage (quotes, materials, machines) │  │
│  │  ├─ IndexedDB (for larger file caches)        │  │
│  │  └─ Service Worker (offline capability)       │  │
│  │                                                │  │
│  │  UI LAYER:                                     │  │
│  │  ├─ Quote calculator (FDM/Resin)              │  │
│  │  ├─ Material/machine library                  │  │
│  │  ├─ Batch quoting                             │  │
│  │  └─ Sync Status Indicator                     │  │
│  │  └─ Conflict Resolution Modal (cherry-pick)  │  │
│  │                                                │  │
│  └──────────────┬─────────────────────────────────┘  │
└─────────────────┼────────────────────────────────────┘
                  │ HTTPS/REST API (Background Sync)
                  │ Try sync on: online event, timer (5min)
                  │ If conflict → show cherry-pick UI
                  ↓
┌──────────────────────────────────────────────────────┐
│         Docker Containers (Server)                   │
│                                                      │
│  ┌────────────────┬──────────────────────────────┐  │
│  │  Express.js    │  Authentication & Sync       │  │
│  │  API (Node)    │  (JWT + bcrypt)              │  │
│  │                │                              │  │
│  │  /api/quotes   │  /api/auth                   │  │
│  │  /api/sync     │  /api/users                  │  │
│  │  /api/conflicts│  /api/auth/refresh          │  │
│  │  /api/materials│  /api/upload (MinIO presigned│  │
│  │  /api/machines │                              │  │
│  │  /api/spools   │                              │  │
│  └────────┬───────┴──────────────────────────────┘  │
│           │                                          │
│  ┌────────┴──────────────────────────────────────┐  │
│  │         Redis Cache (Optional)                 │  │
│  │  - materials:{type} (1hr TTL)                 │  │
│  │  - machines (1hr TTL)                         │  │
│  │  - conflict_resolution:{quoteId} (24hr)      │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (Prisma ORM)              │  │
│  │                                                │  │
│  │  - users, quotes, materials, machines          │  │
│  │  - spools, customers, jobs                    │  │
│  │  - audit_log, api_keys                        │  │
│  │  - sync_transactions (conflict tracking)      │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  MinIO File Storage (S3-compatible)            │  │
│  │                                                │  │
│  │  - G-code files (.gcode, .3mf, .cxdlpv4)     │  │
│  │  - Generated PDFs                             │  │
│  │  - User exports & backups                     │  │
│  │  - Thumbnail cache                            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Container Structure
```
docker-compose.yml
├── frontend
│   └── Node.js (builds React PWA, serves static)
├── backend
│   └── Node.js + Express (API server, Prisma ORM)
├── postgres
│   └── PostgreSQL 15+ (primary database)
├── redis
│   └── Cache layer (materials, machines, conflict tracking)
└── minio
    └── S3-compatible file storage (G-code, PDFs, exports)
```

---

## Directory Structure (Phase 1 End State)

```
3dpricey/
├── frontend/                    ← React PWA (moves from root)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts           ← NEW: API client
│   │   │   ├── auth.ts          ← NEW: Auth utilities
│   │   │   └── ...existing...
│   │   ├── contexts/            ← Simplified (less localStorage)
│   │   ├── App.tsx              ← Auth wrapper
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── Dockerfile               ← NEW: Frontend container
│
├── backend/                     ← NEW: Express API
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── quotes.controller.ts
│   │   │   ├── materials.controller.ts
│   │   │   ├── machines.controller.ts
│   │   │   ├── spools.controller.ts
│   │   │   └── ...others
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── quotes.routes.ts
│   │   │   └── ...others
│   │   ├── models/              ← Services (business logic)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── errorHandler.middleware.ts
│   │   ├── utils/
│   │   │   ├── jwt.util.ts
│   │   │   └── logger.util.ts
│   │   └── index.ts             ← Main server file
│   ├── prisma/
│   │   ├── schema.prisma        ← Database schema
│   │   ├── seed.ts              ← Seed default data
│   │   └── migrations/
│   ├── tests/
│   │   ├── auth.test.ts
│   │   ├── quotes.test.ts
│   │   └── ...others
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile               ← Backend container
│   └── docker-entrypoint.sh     ← Init script (migrations)
│
├── docker-compose.yml           ← NEW: Container orchestration
├── .env.example                 ← NEW: Environment template
├── .github/                     ← Existing docs
│   ├── copilot-instructions.md  ← Updated
│   ├── ROADMAP.md              ← This phase
│   ├── CALCULATIONS.md          ← No changes needed
│   ├── PARSING.md               ← No changes needed
│   ├── COMPONENTS.md            ← Updated (API integration)
│   ├── STATEMANAGEMENT.md       ← Updated (API + Context)
│   └── PHASE1-ARCHITECTURE.md   ← This file
│
├── README.md                    ← Updated
└── package.json                 ← Workspace root (optional)
```

---

## Phase 1: Data Persistence Architecture

### PWA-First Pattern: localStorage + Sync

The system operates in two modes:

**Mode 1: Offline (No Internet)**
- All reads/writes go to localStorage/IndexedDB
- No API calls attempted
- Service Worker serves cached HTTP responses
- UI shows "Offline" indicator
- All changes queued for sync

**Mode 2: Online (Connected)**
- Reads from localStorage (fast)
- Writes: Update localStorage immediately, then background sync to server
- Every 5 minutes or on user action, attempt sync if there are pending changes
- On conflict: Show cherry-pick dialog to user
- After resolution: Sync to server and update local copy

**Conflict Resolution Example:**
```
Local version (localStorage):     Server version:
name: "John Doe"                  name: "John Smith"
email: "john@new.com"            email: "john@new.com"

User sees modal:
✓ name: "John Doe"  [local]
  name: "John Smith" [server]
✓ email: "john@new.com" [both, no conflict]

User chooses, sync happens, localStorage updated
```

### Prisma ORM: Database Configuration

**File:** `backend/prisma/schema.prisma`

Prisma is a Node.js/TypeScript ORM that generates a **type-safe database client** from your schema definition.

**Prisma Features:**
- Type-safe client auto-generated from schema
- SQL injection prevention (parameterized queries)
- Schema migrations system
- Relationship management (1-to-many, many-to-many)
- Seed support

#### Code Example: Prisma Queries
```typescript
// Setup
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// CREATE with relationships
const quote = await prisma.quote.create({
  data: {
    projectName: 'My Quote',
    totalPrice: 1500,
    quote Filaments: {
      create: [
        { material: { connect: { id: 'mat_1' } }, weightGrams: 100, order: 1 },
        { material: { connect: { id: 'mat_2' } }, weightGrams: 50, order: 2 },
      ]
    },
    user: { connect: { id: 'user_123' } },
    company: { connect: { id: 'company_1' } },
  },
});

// READ with nested relations
const quoteWithFilaments = await prisma.quote.findUnique({
  where: { id: 'quote_123' },
  include: {
    customer: true,
    quoteFilaments: { include: { material: true } },
    printJob: true,
  },
});

// UPDATE
const updated = await prisma.quote.update({
  where: { id: 'quote_123' },
  data: { totalPrice: 2000 },
});

// DELETE (with cascade)
await prisma.quote.delete({ where: { id: 'quote_123' } });

// BATCH operations
await prisma.quote.createMany({
  data: [
    { projectName: 'Quote 1', userId: 'user_1', ... },
    { projectName: 'Quote 2', userId: 'user_1', ... },
  ]
});
```

#### Alternative ORMs Comparison

| Feature | Prisma | TypeORM | Sequelize | Drizzle | Raw SQL |
|---------|--------|---------|-----------|---------|---------|
| **Learning** | ⭐ Easy | ⭐⭐ Moderate | ⭐⭐ Moderate | ⭐ Easy | ⭐⭐⭐ Hard |
| **Type Safety** | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent | ⭐⭐ Good | ⭐⭐⭐ Excellent | ⭐ None |
| **Query Speed** | ⭐⭐ Good | ⭐⭐⭐ Great | ⭐⭐⭐ Great | ⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Fastest |
| **Migrations** | ⭐⭐⭐ Built-in | ⭐⭐ Manual | ⭐⭐⭐ Built-in | ⭐⭐⭐ Built-in | ⭐ Manual |
| **Best For** | **Modern TypeScript projects** | Enterprise/complex | Legacy projects | Lightweight apps | Expert performance-critical |
| **Use for 3DPricey** | ✅ RECOMMENDED | ⭐⭐⭐⭐ Also good | ❌ Too verbose | ✅ Also good | ❌ Too manual |

**Recommendation:** Use Prisma (modern, TypeScript-first, migrations system).\n--- 

```prisma
// User Management
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String    // hashed with bcrypt
  name      String
  role      String    @default("user") // user, admin
  companyId String?   // Multi-tenant support
  company   Company?  @relation(fields: [companyId], references: [id])
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  quotes     Quote[]
  materials  Material[]
  machines   Machine[]
  apiKeys    ApiKey[]
}

// Company/Tenant
model Company {
  id        String    @id @default(cuid())
  name      String
  email     String?
  phone     String?
  address   String?
  taxId     String?
  website   String?
  logoUrl   String?   // File storage reference
  
  users     User[]
  quotes    Quote[]
  materials Material[]
  machines  Machine[]
  spools    MaterialSpool[]
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

// Quotes (replaces localStorage QUOTES key)
model Quote {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  
  customerId String?
  customer  Customer? @relation(fields: [customerId], references: [id])
  
  projectName       String
  printColour       String
  printType         String    // "FDM" | "Resin" | "Laser" | "Embroidery"
  
  // Cost breakdown
  materialCost      Float
  machineTimeCost   Float
  electricityCost   Float
  laborCost         Float
  overheadCost      Float
  subtotal          Float
  markup            Float
  paintingCost      Float?
  totalPrice        Float
  
  // Additional fields
  quantity          Int       @default(1)
  unitPrice         Float
  notes             String?
  status            String    @default("PENDING")
  priority          String?   // "Low" | "Medium" | "High"
  dueDate           DateTime?
  filePath          String?   // Path to uploaded G-code
  
  // FDM specific
  filamentWeight    Float?
  printTime         Float?
  laborHours        Float?
  
  // Resin specific
  resinVolume       Float?
  washingTime       Float?
  curingTime        Float?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  quoteFilaments    QuoteFilament[]  // NEW: For multi-color (Phase 2)
  printJob          PrintJob?
  auditLog          AuditLog[]
}

// Materials (replaces localStorage MATERIALS)
model Material {
  id        String    @id @default(cuid())
  userId    String?   // User-created or global
  user      User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  
  name              String
  costPerUnit       Float       // $/kg for FDM, $/ml for Resin
  printType         String      // "FDM" | "Resin"
  density           Float?
  notes             String?
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  spools            MaterialSpool[]
}

// Machines (replaces localStorage MACHINES)
model Machine {
  id        String    @id @default(cuid())
  userId    String?
  user      User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  
  name              String
  hourlyCost        Float           // $/hr
  powerConsumption  Float?          // watts (for electricity calculation)
  printType         String          // "FDM" | "Resin" | "Laser" | "Embroidery"
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  printJobs         PrintJob[]
}

// Spools/Inventory (replaces localStorage SPOOLS)
model MaterialSpool {
  id        String    @id @default(cuid())
  materialId String
  material  Material  @relation(fields: [materialId], references: [id], onDelete: Cascade)
  
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  
  weightGrams       Float?        // For filament
  remainingGrams    Float?
  volumeMl          Float?        // For resin
  remainingMl       Float?
  purchasedAt       DateTime
  cost              Float
  supplier          String?
  batchNumber       String?
  
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

// Customers (replaces localStorage CUSTOMERS)
model Customer {
  id        String    @id @default(cuid())
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  
  name      String
  email     String?
  phone     String?
  company   String?
  address   String?
  tags      String[]  // Searchable tags
  notes     String?
  
  averageRating Float?
  reviewCount   Int     @default(0)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  quotes    Quote[]
}

// Print Jobs (replaces localStorage JOBS)
model PrintJob {
  id        String    @id @default(cuid())
  quoteId   String    @unique
  quote     Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  machineId String
  machine   Machine   @relation(fields: [machineId], references: [id])
  
  status            String        @default("PENDING")
  assignedEmployeeId String?
  startedAt         DateTime?
  completedAt       DateTime?
  actualPrintTime   Float?
  
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

// Audit Log (for compliance/debugging)
model AuditLog {
  id        String    @id @default(cuid())
  userId    String
  quoteId   String?
  quote     Quote?    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  action    String    // "CREATE", "UPDATE", "DELETE"
  changes   Json?     // What changed (old → new)
  
  createdAt DateTime  @default(now())
}

// API Keys for service-to-service auth
model ApiKey {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  key       String    @unique
  name      String
  active    Boolean   @default(true)
  lastUsed  DateTime?
  
  createdAt DateTime  @default(now())
  expiresAt DateTime?
}

// Sync Transaction Tracking (for conflict detection)
model SyncTransaction {
  id          String    @id @default(cuid())
  userId      String
  quoteId     String
  
  operation   String    // "CREATE" | "UPDATE" | "DELETE"
  tableName   String    // "quotes" | "materials" etc
  localChanges Json    // { field1: newValue, field2: newValue }
  serverVersion Json?   // Server's current state when conflict detected
  
  status      String    @default("PENDING") // PENDING | SYNCED | CONFLICT | RESOLVED
  ConflictedAt DateTime?
  ResolvedAt  DateTime?
  Resolution  Json?     // User's chosen values from cherry-pick
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Phase 2: Multi-color filament tracking
model QuoteFilament {
  id        String    @id @default(cuid())
  quoteId   String
  quote     Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  materialId String
  weightGrams Float
  order       Int       // 1st, 2nd, 3rd filament
  
  createdAt DateTime  @default(now())
}
```

### Key Design Decisions

1. **Multi-tenant structure** (companyId) – Future SaaS capability
2. **Soft deletes optional** – Added timestamps for audit trail
3. **Inventory tracking** – Spools linked to materials
4. **Audit logging** – Track all changes to quotes
5. **API Keys** – Service-to-service authentication
6. **QuoteFilament junction** – Ready for Phase 2 multi-color

---

## Backend API Specification

### Authentication

**POST /api/auth/register**
```json
Request:
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

Response (201):
{
  "id": "cuid123",
  "email": "user@example.com",
  "name": "John Doe",
  "token": "eyJhbGc..."
}
```

**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "id": "cuid123",
  "email": "user@example.com",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**POST /api/auth/refresh**
```json
Request:
{
  "refreshToken": "eyJhbGc..."
}

Response (200):
{
  "token": "eyJhbGc..."
}
```

### Sync & Conflict Resolution Endpoints

**POST /api/sync** – Batch sync local changes to server
```json
Request:
{
  "changes": [
    {
      "id": "quote_123",
      "type": "update",
      "resource": "quote",
      "data": { "notes": "Local note edit" },
      "timestamp": 1774951500000,
      "baseVersion": "2026-03-31T11:45:00.000Z"
    }
  ]
}

Response (200):
{
  "applied": 1,
  "appliedChanges": ["quote_123"],
  "records": [
    {
      "changeId": "quote_123",
      "resourceType": "quote",
      "record": {
        "id": "quote_123",
        "projectName": "Bracket",
        "notes": "Local note edit",
        "updatedAt": "2026-03-31T12:00:00.000Z"
      }
    }
  ]
  "conflicts": [],
  "failed": [],
  "lastSyncedAt": "2026-03-31T12:00:00.000Z"
}

Response (200 - Conflict returned in batch result):
{
  "applied": 0,
  "appliedChanges": [],
  "records": [],
  "conflicts": [
    {
      "id": "txn_123",
      "changeId": "quote_123",
      "transactionId": "txn_123",
      "resourceType": "quote",
      "resourceId": "quote_123",
      "fields": [
        {
          "field": "notes",
          "localValue": "Local note edit",
          "serverValue": "Server note edit"
        }
      ],
      "localVersion": { "notes": "Local note edit" },
      "serverVersion": { "id": "quote_123", "notes": "Server note edit" }
    }
  ],
  "failed": [],
  "lastSyncedAt": "2026-03-31T12:00:00.000Z"
}
```

**POST /api/sync/resolve** – Submit user's cherry-picked resolution
```json
Request:
{
  "transactionId": "txn_123",
  "resolution": "merged",
  "mergedValue": {
    "notes": "Use local note but keep server totals"
  }
}

Response (200):
{
  "transaction": {
    "id": "txn_123",
    "status": "RESOLVED"
  },
  "quote": {
    "id": "quote_123",
    "notes": "Use local note but keep server totals"
  }
}
```

**GET /api/sync/status** – Check pending syncs
```
Response:
{
  "pendingCount": 0,
  "conflictedCount": 1,
  "lastSyncedAt": "2026-03-31T12:00:00.000Z"
}
```

### Implemented Frontend Sync Keys

The browser now persists sync state alongside quote data:

- `session_quotes` – normalized `QuoteData[]`
- `pending_sync_changes` – queued quote mutations awaiting `/api/sync`
- `pending_sync_conflicts` – unresolved conflict payloads shown by `ConflictResolutionModal`
- `pending_sync_last_synced_at` – most recent successful sync timestamp

### Material/Machine Endpoints

**GET /api/materials** – List materials
```
Query: ?type=FDM|Resin
Response: Material[]
```

**POST /api/materials** – Add material (cached)
```json
Request: { name, costPerUnit, printType, ... }
Response: Material
```

**GET /api/machines** – List machines
```
Response: Machine[]
```

**POST /api/machines** – Add machine
```json
Request: { name, hourlyCost, powerConsumption, printType }
Response: Machine
```

**GET /api/spools** – List inventory spools
```
Response: MaterialSpool[]
```

**POST /api/spools/:id/consume** – Track consumption
```json
Request: { grams: 50 }
Response: Updated MaterialSpool
```

### MinIO File Storage

**Architecture:**
- Self-hosted S3-compatible file storage in Docker
- All file uploads stored in MinIO instead of server disk
- Frontend gets presigned URLs for direct V4 uploads (fast, offloads server)
- Frontend gets presigned URLs for secure downloads

**Bucket Structure:**
```
3dpricey-files/
├── gcode/
│   └── {userId}/{quoteId}/{filename}.gcode
├── models/
│   └── {userId}/{quoteId}/{filename}.3mf
├── pdfs/
│   └── {userId}/{quoteId}/quote_{timestamp}.pdf
├── exports/
│   └── {userId}/batch_export_{timestamp}.csv
└── thumbnails/
    └── {userId}/{quoteId}/thumbnail.png
```

**File Upload Endpoint (Get Presigned URL):**
```
POST /api/files/presigned-upload
{
  "fileName": "my_model.gcode",
  "fileType": "text/plain",
  "quoteId": "quote_123"
}

Response:
{
  "uploadUrl": "http://localhost:9000/3dpricey-files/gcode/user123/quote_123/my_model.gcode?...",
  "fields": { /* S3 form fields for CORS */ }
}

// Client then:
// 1. PUT file directly to uploadUrl
// 2. Send confirmation to POST /api/files/confirm-upload
```

**File Download Endpoint (Get Presigned URL):**
```
GET /api/files/download/{fileId}

Response: 302 redirect or
{
  "downloadUrl": "http://localhost:9000/3dpricey-files/pdfs/..."
}
```

**Backend MinIO Setup (Node.js):**
```typescript
import { Client as MinioClient } from 'minio';

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT,
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// Ensure bucket exists
await minio.makeBucket('3dpricey-files', 'us-east-1').catch(() => {});
```

---

## Frontend API Integration

### API Client (New File: `src/lib/api.ts`)

```typescript
// Authentication
export async function login(email: string, password: string): Promise<AuthResponse>
export async function register(email: string, password: string, name: string): Promise<AuthResponse>
export async function refreshToken(refreshToken: string): Promise<{ token: string }>
export function logout(): void

// Quotes
export async function fetchQuotes(params?: QueryParams): Promise<Quote[]>
export async function createQuote(data: FDMFormData | ResinFormData): Promise<Quote>
export async function updateQuote(id: string, data: Partial<Quote>): Promise<Quote>
export async function deleteQuote(id: string): Promise<void>
export async function batchCreateQuotes(quotes: QuoteData[]): Promise<Quote[]>
export async function exportQuote(id: string, format: 'pdf' | 'csv'): Promise<Blob>

// Materials
export async function fetchMaterials(type?: 'FDM' | 'Resin'): Promise<Material[]>
export async function createMaterial(data: Material): Promise<Material>

// Machines
export async function fetchMachines(): Promise<Machine[]>
export async function createMachine(data: Machine): Promise<Machine>

// Inventory
export async function fetchSpools(): Promise<MaterialSpool[]>
export async function consumeSpool(id: string, grams: number): Promise<MaterialSpool>
```

### State Management: PWA-First with Background Sync

**Architecture: localStorage + Background Sync to Server**

The new approach keeps localStorage as the primary data store with background sync:

```typescript
// 1. Read from localStorage (instant, offline-capable)
const quotes = useLocalStorage('quotes'); // Immediate, from browser memory

// 2. When user creates/edits, update localStorage first
const updateQuote = (id: string, updates: Partial<Quote>) => {
  // Update localStorage immediately
  const local = JSON.parse(localStorage.getItem('quotes') || '[]');
  const updated = local.map(q => q.id === id ? { ...q, ...updates } : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  
  // Queue for background sync
  queueSyncTransaction({
    table: 'quotes',
    operation: 'UPDATE',
    id,
    localVersion: updates,
    timestamp: new Date()
  });
  
  // Return immediately (UI updates instantly)
  return updated.find(q => q.id === id);
}

// 3. Background sync (every 5min or on online event)
const startBackgroundSync = () => {
  // Every 5 minutes
  setInterval(() => syncPendingChanges(), 5 * 60 * 1000);
  
  // When connection restored
  window.addEventListener('online', syncPendingChanges);
}

// 4. If conflict detected, show cherry-pick UI to user
const syncPendingChanges = async () => {
  const pending = getPendingTransactions();
  if (pending.length === 0) return;
  
  const response = await api.post('/api/sync', { changes: pending });
  
  if (response.status === 'conflict') {
    // Show modal - user picks which value to keep
    showConflictResolutionModal(response.conflicts);
  } else if (response.status === 'synced') {
    // All synced! Update temp IDs if needed (for new creates)
    applyServerConfirmations(response.applied);
  }
}
```

**Conflict Resolution Modal Component:**
```tsx
// src/components/shared/ConflictResolutionModal.tsx
export function ConflictResolutionModal({ conflicts, onResolve }) {
  const [resolutions, setResolutions] = useState({});

  return (
    <Dialog open>
      <DialogHeader>
        <DialogTitle>Sync Conflict</DialogTitle>
        <DialogDescription>
          Another user modified the same fields. Choose which version to keep.
        </DialogDescription>
      </DialogHeader>
      
      {conflicts.map(conflict => (
        <div key={`${conflict.id}:${conflict.field}`} className="border-b p-4">
          <p className="font-semibold">{conflict.field}</p>
          
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${conflict.id}:${conflict.field}`}
                value="local"
                defaultChecked
                onChange={() => setResolutions({
                  ...resolutions,
                  [`${conflict.id}:${conflict.field}`]: 'local'
                })}
              />
              <span>Local: <code>{conflict.localValue}</code></span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${conflict.id}:${conflict.field}`}
                value="server"
                onChange={() => setResolutions({
                  ...resolutions,
                  [`${conflict.id}:${conflict.field}`]: 'server'
                })}
              />
              <span>
                Server: <code>{conflict.serverValue}</code>
                <small className="block text-muted">
                  Modified by {conflict.serverUpdatedBy}
                </small>
              </span>
            </label>
          </div>
        </div>
      ))}
      
      <DialogFooter>
        <Button onClick={() => onResolve(resolutions)}>
          Keep Selected Versions
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

**Sync Status Indicator (in AppBar):**
```tsx
// Show user real-time sync status
- 🟢 "Synced" (all data synced)
- 🟡 "Syncing..." (in progress)
- 🔴 "Offline" (no internet)
- ⚠️ "Pending Sync" (X changes waiting)
- ❌ "Conflict" (requires user action)
```

### Error Handling

```typescript
// HTTP errors → user messages
if (error.status === 401 || error.status === 403) {
  // Auth failed → show re-login dialog
  showLoginModal();
}
if (error.status === 400) {
  // Validation error → show field-specific errors
  showFormErrors(error.response.errors);
}
if (error.status === 409) {
  // Conflict → show cherry-pick modal (handled above)
  showConflictResolutionModal(error.response.conflicts);
}
if (error.status >= 500) {
  // Server error → show toast, keep user on offline mode
  toast.error('Server error. Your changes are saved locally and will sync when available.');
}

### Caching Strategy (Redis Layer)

Redis improves performance by caching frequently accessed data that rarely changes. It sits between the API and database.

**Cache Keys & TTL:**
```
materials:{type}              → 1 hour TTL
  GET /api/materials?type=FDM
  → Check Redis first
  → If miss, query PostgreSQL, cache result

machines                      → 1 hour TTL
  GET /api/machines
  → Cached per company

conflict_resolution:{userId}:{quoteId} → 24 hour TTL
  POST /api/sync/resolve
  → Store user's chosen resolution for 24hr
  → If same field modified again, auto-apply previous choice
```

**Implementation:**
```typescript
// Backend cache layer (Express middleware)
const getCachedMaterials = async (type: string) => {
  const cached = await redis.get(`materials:${type}`);
  if (cached) return JSON.parse(cached);
  
  const materials = await prisma.material.findMany({ where: { printType: type } });
  await redis.setex(`materials:${type}`, 3600, JSON.stringify(materials));
  return materials;
};

// Invalidate on change
const createMaterial = async (data: Material) => {
  const material = await prisma.material.create({ data });
  
  // Invalidate all material caches
  await redis.del(`materials:*`);
  
  return material;
};
```

**Benefits:**
- Materials/machines cached for 1hr (typical re-query time)
- Conflict resolutions cached for 24hr (smooth user experience if same field edited again)
- Reduces PostgreSQL load
- API responses ~10-50ms (vs ~100-500ms from DB)

---

**File:** `docker-compose.yml`

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
      - "9000:9000"    # API
      - "9001:9001"    # Console UI
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

**File:** `.env.example`

```env
# Database
DB_USER=3dpricey_user
DB_PASSWORD=secure_password_here
DATABASE_URL=postgresql://3dpricey_user:secure_password_here@postgres:5432/3dpricey

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# API
NODE_ENV=development
API_PORT=3001

# Redis
REDIS_URL=redis://redis:6379

# MinIO File Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=3dpricey-files
MINIO_REGION=us-east-1
# For presigned URLs (client file uploads):
MINIO_PUBLIC_URL=http://localhost:9000

# Frontend
VITE_API_URL=http://localhost:3001/api
```

---

## Migration Plan: localStorage → PostgreSQL

### Strategy
1. **Week 1-2:** Build API & database, populate with defaults
2. **Week 3:** Frontend API integration
3. **Week 4:** User data migration script
4. **Week 5:** Testing & bugfixes
5. **Week 6:** Rollout with localStorage → API fallback

### Migration Script

```typescript
// backend/scripts/migrate-localStorage.ts
// Triggered by admin: POST /api/admin/migrate-user-data
// Reads localStorage export from user
// Inserts into PostgreSQL
// Validates all data
// Returns success/error report
```

---

## Testing Strategy

### Backend Tests (Jest + Supertest)
```
tests/
├── auth.test.ts       → Login, register, JWT
├── quotes.test.ts     → CRUD operations
├── materials.test.ts  → Create, list
├── machines.test.ts
├── spools.test.ts
└── integration/       → Full workflows
```

### Frontend Tests (Vitest + React Testing Library)
```
src/__tests__/
├── api.test.ts        → API client mocking
├── components/        → Component tests
└── hooks/             → Hook tests
```

---

## Performance Targets

- API response time: <200ms (50th percentile)
- Database query time: <100ms
- Frontend build size: <500KB (gzipped)
- Initial load: <3s (on 4G)
- Lighthouse score: >85

---

## Monitoring & Logging

### Backend Logging
```typescript
// Winston logger
logger.info('Quote created', { quoteId, userId, totalPrice })
logger.error('Database error', { error, query })
```

### Metrics Collection
```
- API response times
- Error rates by endpoint
- Database query performance
- User signup/login funnel
```

---

## Security Checklist

- [ ] Password hashing (bcrypt, 12 rounds)
- [ ] JWT token expiry (7 days)
- [ ] HTTPS/TLS in production
- [ ] CORS configured properly (frontend domain only)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma ORM)
- [ ] Rate limiting (API endpoints)
- [ ] CSRF protection
- [ ] Audit logging (all quote changes)
- [ ] Environment variable secrets (not in code)

---

## Success Criteria

Phase 1 is complete when:
✅ All quotes stored in PostgreSQL  
✅ User authentication working (JWT + bcrypt)  
✅ **PWA-first with background sync:** Changes write to localStorage immediately, sync to server in background  
✅ **Conflict resolution:** When 2+ users edit same field, cherry-pick modal shows both versions  
✅ **MinIO file storage:** G-code, PDFs, exports stored in S3-compatible storage (not server disk)  
✅ **Redis caching:** Materials/machines cached for 1hr, conflict resolutions for 24hr  
✅ **Offline-capable:** App works without internet, all changes queued for sync  
✅ Docker containers run locally with single `docker-compose up`  
✅ Migration script tested with real localStorage data  
✅ Performance targets met (API <200ms, frontend <500KB gzipped)  
✅ Security audit passed (no secrets in code, passwords hashed, SQL injection prevented)
