# Roadmap Delivery Quickstart

Use this guide to validate the roadmap slices once they land.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- A PostgreSQL database for local development if you are not using Docker

## Setup

```bash
cp .env.example .env
docker compose up -d
```

For local development without Docker:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Baseline validation

Run the package checks that the roadmap relies on:

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
npm run build
npm test
```

## Phase 1 smoke test

1. Sign in and confirm the quote dashboard loads.
2. Create or edit a quote while offline.
3. Reconnect and confirm pending changes sync back to the server.
4. Trigger a conflicting edit and verify the conflict resolution flow preserves the chosen
   version.
5. Confirm `/api/sync/status` reflects the pending queue once the sync work is complete.

## Phase 2 smoke test

1. Create an FDM quote with multiple material segments.
2. Upload or parse G-code that includes color change markers.
3. Confirm the quote total reflects every segment and the composition remains traceable.
4. Re-open the quote and verify the material ordering is preserved.

## Phase 3 smoke test

1. Create one laser quote and one embroidery quote.
2. Confirm each quote reaches a valid total from its own inputs.
3. Assign a supported printer or machine to a production job and verify the job remains
   linked after reconnect.
4. Confirm the existing FDM and Resin quote flows still work unchanged.

## Expected completion criteria

- Phase 1 should work offline and online without losing changes.
- Phase 2 should support multi-material costing and persistence.
- Phase 3 should add the new print types without breaking existing workflows.