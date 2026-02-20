# 3DPricey Roadmap
## Phase 1: Infrastructure
- Docker: frontend + backend + PostgreSQL + Redis + MinIO
- JWT auth
- Multi-user quotes
- PWA + background sync
- Conflict resolution
- Branding: PolymagicPrice → 3DPricey
- Remove printer connection (re-add Phase 3)
## Phase 2: Multi-Color Filament
Deps: Phase 1
- `quote_filaments` table
- G-code M600 detection
- FilamentCompositionForm
- Split material cost
- Per-filament inventory
## Phase 3: Print Types
Deps: Phase 1, Phase 2
Types: FDM, Resin, Laser, Embroidery
- Cost calculators
- File parsers: G-code/SVG/embroidery
- Materials & machines per type
- Quote forms per type
- Re-add printer connection
---
## Phase 1 Rebranding
`package.json`: productName="3DPricey"
`index.html`: <title>3DPricey</title>
`src/lib/constants.ts`: APP_NAME='3DPricey'
All .ts/.tsx: PolymagicPrice → 3DPricey
All .md files: update names
---
## Phase 1 Structure
```
frontend/
├── src/
├── package.json
└── vite.config.ts
backend/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── services/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── package.json
docker-compose.yml
.env.example
```
---
## Phase 1 API
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/quotes
POST   /api/quotes
PUT    /api/quotes/:id
DELETE /api/quotes/:id
POST   /api/sync
POST   /api/sync/resolve
GET    /api/sync/status
GET    /api/materials
POST   /api/materials
GET    /api/machines
POST   /api/machines
GET    /api/spools
POST   /api/spools
PUT    /api/spools/:id/consume
POST   /api/files/presigned-upload
GET    /api/files/download/:fileId
```
---
## Phase 1 DB
users|quotes|materials|machines|spools|customers|employees|cost_constants|print_jobs|audit_log|sync_transactions|api_keys|companies
---
## Phase 1 Checklist
- [ ] Backend scaffold
- [ ] Prisma schema
- [ ] docker-compose.yml
- [ ] JWT + bcrypt
- [ ] API endpoints
- [ ] Frontend API client
- [ ] Background sync
- [ ] Conflict modal
- [ ] Migration script
- [ ] Rebranding
## Phase 2 Checklist
- [ ] quote_filaments table
- [ ] G-code M600 detection
- [ ] FilamentComposition interface
- [ ] Multi-filament form
- [ ] Cost split
- [ ] POST /api/quotes/parse-gcode
## Phase 3 Checklist
- [ ] Union type: 4 print types
- [ ] Laser/Embroidery schemas
- [ ] calculateLaserQuote()
- [ ] calculateEmbroideryQuote()
- [ ] SVG/PDF parser
- [ ] Embroidery parsers (.pes, .exp, .jef)
- [ ] LaserCalculatorTable
- [ ] EmbroideryCalculatorTable
---
See PHASE1-ARCHITECTURE.md for full schema
See PHASE2-MULTICOLOR.md for details
See PHASE3-LASER-EMBROIDERY.md for details
