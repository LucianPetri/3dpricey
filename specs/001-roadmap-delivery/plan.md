# Implementation Plan: Roadmap Delivery

**Branch**: `001-roadmap-delivery` | **Date**: 2026-03-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-roadmap-delivery/spec.md`

## Summary

Deliver the roadmap in three prioritized slices on the existing 3DPricey stack: complete
Phase 1 sync/conflict resolution, finish Phase 2 multi-material filament support, and
prepare Phase 3 laser and embroidery print types plus printer reconnect support. The
implementation must preserve the current FDM/Resin workflows, keep offline-first client
behavior intact, and expand the backend contract incrementally instead of rewriting the
application.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+  
**Primary Dependencies**: React 18, Vite, Express, Prisma, PostgreSQL, Redis, MinIO,
JWT, bcrypt, React Router, TanStack React Query  
**Storage**: PostgreSQL for authoritative records, localStorage for offline drafts and
pending sync state, MinIO for uploaded files and exports  
**Testing**: Frontend `npm run lint` and `npm run build`, backend `npm run build` and
`npm test`, plus manual phase smoke tests for sync, quote calculation, and production
workflow paths  
**Target Platform**: Offline-capable web application with a containerized backend  
**Project Type**: Split-stack web application  
**Performance Goals**: Keep quote recalculation and parser-driven auto-fill responsive;
sync should resolve queued changes in a single normal background pass under healthy
connectivity  
**Constraints**: Preserve current FDM/Resin behavior, avoid silent pricing changes,
maintain offline-first storage semantics, and update the matching `.github` guide for any
code change  
**Scale/Scope**: Existing 3DPricey app plus roadmap additions for sync, multi-material
quoting, and new print types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Documentation updates are explicit for each touched area, with the matching .github
  guide identified before implementation.
- Offline-first behavior remains part of the design: localStorage, sync queueing, and
  migration implications are called out for every data flow that changes.
- Frontend/backend boundaries are explicit, and new contract surfaces are scoped before
  any code is written.
- Quote calculation, parser, stock, and production changes are treated as domain rules,
  not UI-only changes, so regression risk is documented.
- Validation includes the exact lint, build, test, and manual checks required for the
  touched surfaces.
- Deployment and security impacts are identified for auth, secrets, Docker, persistent
  storage, and reconnection flows.

## Project Structure

### Documentation (this feature)

```text
specs/001-roadmap-delivery/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── http-api.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── calculator/
│   │   ├── shared/
│   │   └── ...
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── quoteCalculations.ts
│   │   ├── sync.ts
│   │   └── parsers/
│   ├── pages/
│   └── types/
├── package.json
└── vite.config.ts

backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   └── routes/
├── prisma/
│   └── schema.prisma
├── docker-entrypoint.sh
└── package.json

deploy/
├── docker-compose.deploy.yml
└── blueprints/

specs/001-roadmap-delivery/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

**Structure Decision**: This is a split-stack web application. The roadmap work stays
inside frontend/ for user flows, offline state, and calculator UI; backend/ for sync,
auth, persistence, and quote APIs; and specs/ for the planning artifacts that describe
the three phase slices.

## Complexity Tracking

No constitutional violations require justification for this plan. The roadmap fits the
existing split-stack architecture and deployment model, so the work can proceed without
adding new structural complexity.
