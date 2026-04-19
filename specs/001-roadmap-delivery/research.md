# Research

## Decision 1: Keep the split-stack architecture

Decision: Treat the current React/Vite frontend and Express/Prisma backend as the
permanent boundary for this roadmap.

Rationale: The codebase already separates browser workflows from server persistence. The
roadmap needs offline-first behavior, authenticated sync, and expanded quote types, all
of which fit the existing boundary cleanly.

Alternatives considered: Collapse everything into the frontend with localStorage only, or
move all state to the backend immediately. Both were rejected because they would either
break offline continuity or add unnecessary migration risk.

## Decision 2: Sequence the roadmap in phase order

Decision: Deliver Phase 1 sync/conflict resolution first, Phase 2 multi-material FDM next,
and Phase 3 print-type expansion last.

Rationale: The current backend still returns 501 for sync routes, while the frontend
already contains the sync service and most FDM/Resin behavior. Closing Phase 1 first
unblocks the rest of the roadmap and prevents adding new quote types on top of unstable
data flow.

Alternatives considered: Start with laser/embroidery foundations or multi-material quote
UI first. Both were rejected because they depend on stable persistence and contract
boundaries that are not yet complete.

## Decision 3: Keep PostgreSQL authoritative and preserve localStorage for offline work

Decision: Use PostgreSQL as the shared source of truth, keep localStorage as the offline
draft and queue store, and keep MinIO for uploaded files and exports.

Rationale: The backend already uses Prisma with PostgreSQL, and the frontend already uses
localStorage for quotes, sync queuing, and related UI state. This split matches the
current codebase and the roadmap's offline-first requirements.

Alternatives considered: Move all persistence to browser storage, or replace localStorage
with server-only drafts. Both were rejected because they weaken either offline recovery or
multi-user consistency.

## Decision 4: Extend the API incrementally instead of rewriting it

Decision: Preserve the current `/api/auth`, `/api/quotes`, `/api/materials`, and
`/api/machines` surfaces, then add sync and phase-specific endpoints as the roadmap lands.

Rationale: Existing clients already consume these endpoints. Incremental expansion keeps
current users functional while the roadmap closes the gaps around sync, multi-material
filaments, and new print types.

Alternatives considered: Introduce a full v2 API. Rejected because it adds migration cost
without solving the core roadmap risks.

## Decision 5: Validate by package plus manual workflow

Decision: Use package-level lint/build/test checks and manual smoke tests for the cross-
stack workflows that are not yet covered by automated tests.

Rationale: The repository has backend Jest and frontend lint/build scripts, but the
roadmap spans sync, parsing, quote calculation, and production assignment. Those require
manual confirmation in addition to automated checks.

Alternatives considered: Rely on unit tests only, or rely entirely on manual testing.
Rejected because each approach leaves a coverage gap for this roadmap.

## Evidence from the codebase

- [frontend/src/lib/sync.ts](../../frontend/src/lib/sync.ts) already queues and retries
  pending changes.
- [backend/src/routes/sync.routes.ts](../../backend/src/routes/sync.routes.ts) still
  returns 501 for sync behavior.
- [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma) already contains
  `QuoteFilament` and `SyncTransaction` tables.
- [frontend/src/lib/quoteCalculations.ts](../../frontend/src/lib/quoteCalculations.ts)
  already handles FDM, Resin, labor, and partial multi-color metadata.
- [frontend/src/types/quote.ts](../../frontend/src/types/quote.ts) still limits
  `printType` to FDM and Resin.