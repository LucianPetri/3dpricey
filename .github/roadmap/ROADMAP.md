# 3DPricey Roadmap
Status snapshot (2026-03-31): Phases 1 through 3 are implemented on the roadmap delivery branch. Package validation is complete; quickstart smoke tests still require manual browser execution.
## Phase 1: Infrastructure
- Docker: frontend + backend + PostgreSQL + Redis + MinIO
- JWT auth
- Multi-user quotes
- PWA + background sync
- Conflict resolution
- Branding: 3DPricey → 3DPricey
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
All .ts/.tsx: 3DPricey → 3DPricey
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
- [x] Backend scaffold
- [x] Prisma schema
- [ ] docker-compose.yml
- [x] JWT + bcrypt
- [x] API endpoints
- [x] Frontend API client
- [x] Background sync
- [x] Conflict modal
- [ ] Migration script
- [ ] Rebranding

### Phase 1 Implementation Snapshot
- Backend sync service, controller, and `/api/sync`, `/api/sync/resolve`, `/api/sync/status` routes are live.
- Quote persistence now stores the real frontend quote shape needed for offline reconciliation (`parameters`, sync timestamps, client name, status timeline, machine assignment, labor cost breakdowns).
- Frontend quote saves, note edits, and deletes queue through `frontend/src/lib/sync.ts` and display state through `SyncStatusBanner` plus the app-level `ConflictResolutionModal`.
- Backend regression coverage exists for the sync contract and conflict-resolution flow.
## Phase 2 Checklist
- [x] quote_filaments table
- [x] G-code M600 detection
- [x] FilamentComposition interface
- [x] Multi-filament form
- [x] Cost split
- [x] POST /api/quotes/parse-gcode
## Phase 3 Checklist
- [x] Union type: 4 print types
- [x] Laser/Embroidery schemas
- [x] calculateLaserQuote()
- [x] calculateEmbroideryQuote()
- [x] SVG parser
- [x] Embroidery PES parser
- [x] LaserCalculatorTable
- [x] EmbroideryCalculatorTable

### Phase 3 Implementation Snapshot
- Backend quote APIs now persist specialized `laserData` and `embroideryData` relations alongside the shared quote record.
- Frontend calculator navigation now supports FDM, Resin, Laser, and Embroidery in a single workflow surface.
- Printer reconnect state is stored locally and used to attempt reconnects on production-page load before validating assignment compatibility.

## Release Notes
- 2026-03-31: Added Phase 3 print-type support for laser and embroidery quotes, plus printer reconnect persistence and assignment guards.
- 2026-03-31: Validation status: `frontend` lint/build passed, `backend` build passed, and backend Jest suites passed (`17/17`).
---
See PHASE1-ARCHITECTURE.md for full schema
See PHASE2-MULTICOLOR.md for details
See PHASE3-LASER-EMBROIDERY.md for details
