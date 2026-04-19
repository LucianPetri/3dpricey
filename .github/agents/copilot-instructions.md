# 3dpricey Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-19

## Active Technologies
- TypeScript 5.x, React 18 on the frontend; existing Express + TypeScript backend remains unchanged for the initial slice + React 18, React Router 6, TanStack React Query, Shadcn/Radix UI primitives, Sonner, existing local `sessionStorage` helpers (002-stock-based-delivery)
- Browser `localStorage` through `frontend/src/lib/core/sessionStorage.ts`; existing backend PostgreSQL/Prisma stack is not part of the initial source of truth (002-stock-based-delivery)

- TypeScript 5.x on Node.js 20+ + React 18, Vite, Express, Prisma, PostgreSQL, Redis, MinIO, JWT, bcrypt (001-roadmap-delivery)

## Project Structure

```text
backend/
frontend/
deploy/
specs/
```

## Commands

cd frontend && npm run lint && npm run build
cd backend && npm run build && npm test

## Code Style

TypeScript 5.x on Node.js 20+: Follow standard conventions

## Recent Changes
- 002-stock-based-delivery: Added TypeScript 5.x, React 18 on the frontend; existing Express + TypeScript backend remains unchanged for the initial slice + React 18, React Router 6, TanStack React Query, Shadcn/Radix UI primitives, Sonner, existing local `sessionStorage` helpers

- 001-roadmap-delivery: Phase 1 sync, Phase 2 multi-material FDM, and Phase 3 laser/embroidery plus printer reconnect work are implemented.
- Validation commands remain: `cd frontend && npm run lint && npm run build` and `cd backend && npm run build && npm test`.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
