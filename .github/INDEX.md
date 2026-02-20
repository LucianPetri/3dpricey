# Documentation Index for AI Agents

## Quick Reference (Compact Versions)
**Use these for implementation - minimal whitespace, code-focused:**

- [ROADMAP.md](ROADMAP.md) - 3 phases overview (ultra-compact)
- [PHASE1-COMPACT.md](PHASE1-COMPACT.md) - Infrastructure: Prisma schema, Docker Compose, .env
- [PHASE2-COMPACT.md](PHASE2-COMPACT.md) - Multi-color filament: database, parsers, forms
- [PHASE3-COMPACT.md](PHASE3-COMPACT.md) - Laser/Embroidery: types, calculators, parsers
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Phase 1 day-by-day (30 days)

## Detailed References (Archive)
**Original detailed versions - kept for reference:**

- PHASE1-ARCHITECTURE.md (1264 lines) - Full schema, config details
- PHASE2-MULTICOLOR.md (571 lines) - Feature breakdown
- PHASE3-LASER-EMBROIDERY.md (787 lines) - Type system details
- README-IMPLEMENTATION.md (549 lines) - Original guide

## Subsystem Guides
- copilot-instructions.md - Main guide, conventions, patterns
- CALCULATIONS.md - Quote math
- PARSING.md - File parsers
- STATEMANAGEMENT.md - Context, hooks
- STORAGE.md - localStorage schema
- COMPONENTS.md - Component patterns

## Suggested Reading Order

### For Phase 1 Implementation
1. Read ROADMAP.md (5 min)
2. Read PHASE1-COMPACT.md (10 min)
3. Read IMPLEMENTATION.md (20 min)
4. Start coding (reference PHASE1-ARCHITECTURE.md as needed)

### For Phase 2 Implementation
1. Read ROADMAP.md (Phase 2 section)
2. Read PHASE2-COMPACT.md (10 min)
3. Implement (reference original if needed)

### For Phase 3 Implementation
1. Read ROADMAP.md (Phase 3 section)
2. Read PHASE3-COMPACT.md (15 min)
3. Implement

## File Structure

**Compact docs have:**
- No durations
- No narrative ("Why", "Goal", "This means...")
- No whitespace fluff
- Code snippets only
- Checklists only
- Quick reference format

**Detailed docs have:**
- Full explanations
- Use cases
- Rationale
- Examples
- Context

## Key Specifications

### Phase 1 Database
13 tables: users|quotes|materials|machines|spools|customers|employees|cost_constants|print_jobs|audit_log|sync_transactions|api_keys|companies

### Phase 1 API Endpoints (18 total)
```
/api/auth/register
/api/auth/login
/api/quotes (CRUD)
/api/sync
/api/sync/resolve
/api/sync/status
/api/materials (CRUD)
/api/machines (CRUD)
/api/spools (CRUD)
/api/files/presigned-upload
/api/files/download
```

### Docker Services
- frontend (React PWA)
- backend (Express.js)
- postgres (15-alpine)
- redis (7-alpine)
- minio (S3-compatible)

### Tech Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind
- Backend: Node.js + Express + TypeScript
- ORM: Prisma
- Database: PostgreSQL 15+
- Cache: Redis
- Storage: MinIO
- Container: Docker + Docker Compose
- Auth: JWT + bcrypt

## Documentation Maintenance

Every code change must update corresponding docs:
- Modify Prisma schema? → Update PHASE1-COMPACT.md
- Add API endpoint? → Update PHASE1-COMPACT.md or IMPLEMENTATION.md
- Implement multi-color? → Update PHASE2-COMPACT.md
- Add laser calculator? → Update PHASE3-COMPACT.md

Commit example:
```
Phase 1: Implement quotes API

- Added POST /api/quotes, GET /api/quotes
- Full CRUD operations with auth
- Migration: localStorage → PostgreSQL

Docs: PHASE1-COMPACT.md, IMPLEMENTATION.md
```
