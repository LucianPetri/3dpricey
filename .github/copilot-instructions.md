# 3DPricey: Developer Guide for AI Agents

**Project:** 3DPricey – A 3D printing cost calculator and quote management tool  
**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Shadcn UI  
**License:** AGPL-3.0  

## 🚨 CRITICAL: Documentation Maintenance Rule

**WHENEVER you modify project files, you MUST update the relevant instruction files.** This keeps the codebase self-documenting and allows future agents to understand your changes immediately.

- Changing quote calculation logic? → Update [CALCULATIONS.md](./CALCULATIONS.md)
- Adding a file parser? → Update [PARSING.md](./PARSING.md)
- Modifying state/context? → Update [STATEMANAGEMENT.md](./STATEMANAGEMENT.md)
- Creating new components? → Update [COMPONENTS.md](./COMPONENTS.md)
- Changing storage structure? → Update [STORAGE.md](./STORAGE.md)
- Modifying architecture? → Update this file

**Reference:** All instruction files live in `.github/` directory and are the source of truth.

### Documentation Update Workflow (Every Change)

1. **Make code change** to src/ files
2. **Identify which guide(s) are affected** (see table below)
3. **Update that guide immediately** with:
   - New/modified interface definitions
   - Updated code examples
   - New patterns or flows
   - Line number updates if referenced
4. **No exceptions** – undocumented changes will break future agent productivity

### Example: Adding a New Cost Category

**You want to add "waste material cost" to FDM quotes.**

```
Step 1: Modify src/lib/quoteCalculations.ts
  - Add wastePercentage param to FDMCalculationInput
  - Calculate wasteCost in calculateFDMQuote()
  - Include in subtotalBeforeOverhead

Step 2: Modify src/types/quote.ts
  - Add wasteCost: number to QuoteData interface
  - Add wastePercentage: string to FDMFormData interface

Step 3: UPDATE .github/CALCULATIONS.md
  - Add to "Cost Breakdown Structure" section
  - Show calculation: wasteCost = materialCost * (wastePercentage / 100)
  - Update "Common Mistakes" if relevant
  - Add test case for waste calculation

Step 4: UPDATE .github/STATEMANAGEMENT.md if context changed
  - Update batchTotals interface to include totalWasteCost

Step 5: UPDATE .github/COMPONENTS.md if form changed
  - Document new form field in "Form Components" section
 
No PRs without these docs updated.
```

---

## Quick Reference to Detailed Guides

| Topic | File | When to Read |
|-------|------|--------------|
| Quote calculation math & cost breakdown | [CALCULATIONS.md](./CALCULATIONS.md) | Modifying prices, adding cost categories, understanding quantity logic |
| File parsing (.gcode, .3mf, .cxdlpv4) | [PARSING.md](./PARSING.md) | Adding new file formats, debugging parse failures, thumbnail extraction |
| Context & state management | [STATEMANAGEMENT.md](./STATEMANAGEMENT.md) | Adding new contexts, hooks, localStorage integration |
| Storage schema & localStorage keys | [STORAGE.md](./STORAGE.md) | Understanding data persistence, migration, capacity planning |
| Component patterns & styling | [COMPONENTS.md](./COMPONENTS.md) | Creating new components, using Shadcn UI, responsive design |

### Quick Map: Code Files → Documentation Files

| When modifying... | Update this guide | Reason |
|---|---|---|
| `src/lib/quoteCalculations.ts` | [CALCULATIONS.md](./CALCULATIONS.md) | All quote cost logic lives here |
| `src/types/quote.ts` | [CALCULATIONS.md](./CALCULATIONS.md) + others | QuoteData interfaces affect multiple guides |
| `src/lib/parsers/*.ts` | [PARSING.md](./PARSING.md) | Parser logic and data extraction |
| `src/components/calculator/*Upload.tsx` | [PARSING.md](./PARSING.md) | File upload components integrate parsers |
| `src/contexts/*.ts` | [STATEMANAGEMENT.md](./STATEMANAGEMENT.md) | Context definitions and flows |
| `src/hooks/*.ts` | [STATEMANAGEMENT.md](./STATEMANAGEMENT.md) | Hook implementations and data flows |
| `src/lib/core/sessionStorage.ts` | [STORAGE.md](./STORAGE.md) | All localStorage keys and initialization |
| `src/components/**/*.tsx` | [COMPONENTS.md](./COMPONENTS.md) | Component patterns and usage |
| `src/pages/*.tsx` | [COMPONENTS.md](./COMPONENTS.md) + architecture | Major page structure changes |
| `vite.config.ts` or build config | This file | Build system changes |
| `.gitlab-ci.yml` or deploy configs | This file | CI/CD and deployment changes |

---

## Architecture Overview

### Core Concept
A **full-stack quote calculator** with offline-first capabilities. Core data persists locally for offline use, while a Node/Express API and PostgreSQL provide multi-user sync, persistence, and auditability.

### Key Subsystems

**1. Quote System** ([src/types/quote.ts](src/types/quote.ts), [src/lib/quoteCalculations.ts](src/lib/quoteCalculations.ts))
- Four calculators: FDM (filament-based), Resin (SLA/DLP), Laser (cutting/engraving), and Embroidery
- Cost breakdown: material + machine time + electricity + labor + consumables + overhead + markup
- Supports batch quoting via [BatchQuoteContext](src/contexts/BatchQuoteContext.ts)

**2. File Parsers** ([src/lib/parsers/](src/lib/parsers/))
- G-code parser: Extracts print time/filament weight from `.gcode` and `.3mf` files using regex patterns
- Resin parser: Parses `.cxdlpv4` files (ZIP-based) for volume/time data
- SVG parser: Extracts width/height, vector count, and material area for laser quotes
- Embroidery parser: Parses `.pes` files for design size and stitch-derived runtime
- Supports thumbnails embedded in G-code and 3MF files

**3. State Management**
- **Context API** for global state: [BatchQuoteContext](src/contexts/BatchQuoteContext.ts), [ProductionContext](src/contexts/ProductionContext.ts), [KanbanContext](src/contexts/KanbanContext.ts)
- **Custom hooks** wrap contexts for consuming components (e.g., `useBatchQuote()`, `useProduction()`)
- **No Redux/Zustand** – intentionally minimal for startup performance

**4. Offline Sync System** ([frontend/src/lib/sync.ts](../frontend/src/lib/sync.ts), [frontend/src/hooks/useSyncStatus.ts](../frontend/src/hooks/useSyncStatus.ts), [backend/src/services/sync.service.ts](../backend/src/services/sync.service.ts))
- Client keeps `session_quotes` as the immediate local source of truth and queues backend mutations in `pending_sync_changes`
- `SyncService` retries on `window.online` and on a 5 minute timer, collapsing repeated quote changes before posting to `/api/sync`
- Conflicts are persisted in `pending_sync_conflicts` and resolved through the app-level `ConflictResolutionModal`
- Backend sync writes `SyncTransaction` rows for applied/conflicted changes and compares `baseVersion` against `quote.updatedAt` for conflict detection

**5. Data Persistence** ([src/lib/core/sessionStorage.ts](src/lib/core/sessionStorage.ts))
- Wraps `localStorage` with type-safe getters/setters
- Auto-initializes with default materials, machines, cost constants
- Storage keys: `session_quotes`, `session_materials`, `session_machines`, `session_customers`, `session_spools`, `session_gcodes`, `session_constants`, `session_stock`, `pending_sync_changes`, `pending_sync_conflicts`, etc.

**6. Stock Management System** ([src/lib/core/sessionStorage.ts](src/lib/core/sessionStorage.ts), [src/hooks/useStock.ts](src/hooks/useStock.ts), [src/pages/StockManagement.tsx](src/pages/StockManagement.tsx))
- Tracks inventory from completed print jobs (auto-creates StockItem when ProductionJob reaches 'completed' status)
- Types: `StockItem` (id, quoteId, projectName, quantity, unitPrice, totalCost, material, color, etc.)
- Statuses: IN_STOCK, SOLD, RESERVED
- Manual workflow: Select stock item → enter sold quantity → mark as SOLD
- Storage key: `STOCK` (array of StockItem objects in localStorage)
- Integration: [ProductionProvider.tsx](src/contexts/ProductionProvider.tsx) auto-triggers `addToStock()` on job completion

**7. Backend & Deployment**
- **Backend:** Express + Prisma in [backend/](../backend/)
- **Docker Compose:** Multi-service stack in [docker-compose.yml](../docker-compose.yml) (local dev builds) and [deploy/docker-compose.deploy.yml](../deploy/docker-compose.deploy.yml) (deployment via published GHCR frontend/backend images)
- **CI/CD:** GitHub Actions pipeline with `prepare`, `tests`, `build`, and `deploy` jobs in [ci-cd.yml](../.github/workflows/ci-cd.yml)
- **Security scanning:** CodeQL workflow in [codeql.yml](../.github/workflows/codeql.yml) with explicit `actions: read` permissions for CodeQL status reporting, plus dependency review on pull requests. CodeQL is gated behind the `CODE_SCANNING_ENABLED=true` repository variable so CI does not fail before GitHub code scanning is enabled for the repo.
- **Action runtime:** Workflows opt into `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` and pin current action SHAs to stay ahead of the GitHub-hosted runner Node 20 deprecation.
- **Container registry:** Frontend and backend images publish to `ghcr.io/<owner>/3dpricey-frontend` and `ghcr.io/<owner>/3dpricey-backend`
- **Ingress:** Pangolin Newt with blueprints in [deploy/blueprints/](../deploy/blueprints/)
- **Env per site:** Deployment hosts can set `GHCR_OWNER` and `IMAGE_TAG` alongside the existing app secrets to pull the desired published image version, and can bootstrap values from [deploy/.env.example](../deploy/.env.example) without requiring a committed `.env`
- **Setup Guide:** [deploy/DEPLOYMENT-SETUP.md](../deploy/DEPLOYMENT-SETUP.md) - deployment server bootstrap plus GitHub repository variables and secrets

### CI/CD Pipeline Flow

1. **prepare** (runs on pull requests, pushes to `main`, version tags, and manual dispatch)
  - Restores npm cache for both workspaces
  - Validates lockfile-based installs with `npm ci --ignore-scripts`
  - Runs dependency review on pull requests
  - The workflow trigger explicitly includes `push.branches: [main]` so post-merge CI and deploy gating run after direct pushes and merges to the default branch

2. **tests**
  - Frontend: `npm ci`, `npm run lint`, optional `npm run test --if-present`, and optional Playwright execution when a config exists
  - Backend: `npm ci` and `npm test`

3. **build**
  - Frontend: production Vite build with `VITE_API_URL=/api`
  - Backend: TypeScript compile via `npm run build`
  - Uploads short-lived build artifacts for inspection

4. **deploy**
  - Builds Docker images with the existing [frontend/Dockerfile](../frontend/Dockerfile) and [backend/Dockerfile](../backend/Dockerfile)
  - Publishes immutable tags plus `latest` on the default branch to GHCR
  - Deployment compose pulls `ghcr.io/<owner>/3dpricey-frontend:${IMAGE_TAG:-latest}` and `ghcr.io/<owner>/3dpricey-backend:${IMAGE_TAG:-latest}`

**SSH Access Pattern:**
```
GitHub Actions Runner
  --GHCR push--> Container Registry
   --docker compose pull/up--> Deployment Server
    --compose--> Services (postgres, redis, minio, backend, frontend, newt)
```

**8. Pages & Routing** ([src/pages/](src/pages/), [HashRouter](src/App.tsx))
- **Index.tsx:** Quote calculator dashboard with left sidebar navigation
- **PrintManagement.tsx:** Kanban board for production workflow
- **SavedQuotes.tsx:** Quote history + export
- **Settings.tsx:** Configuration for materials, machines, company info
- **StockManagement.tsx:** Inventory tracking from completed jobs with sales workflow
- **OrderManagement.tsx:** CRM integration

## Development Workflow

### Local Setup
```bash
npm install
npm run dev          # Start Vite dev server on localhost:8080
npm run build        # Production build
npm run lint         # ESLint check
npm run preview      # Preview production build locally
```

### Build Targets
- **Web:** `dist/` folder (Hash-based routing in [vite.config.ts](vite.config.ts))
- **Electron:** `dist-electron/` (TypeScript build of `electron/` folder)

### Key Patterns

**1. Quote Calculation Flow**
```
User Input (FDMFormData/ResinFormData)
  → calculateFDMQuote() / calculateResinQuote() in quoteCalculations.ts
  → Returns QuoteData object (all costs + totals)
  → BatchQuoteContext stores in array
  → useBatchQuote() hook provides to consumers
```

**2. File Upload & Auto-Fill**
```
User uploads .gcode/.3mf/.cxdlpv4
  → GcodeUpload/ResinFileUpload component parses
  → gcodeParser.ts extracts: printTime, filamentWeight, thumbnail
  → Form fields auto-populated
  → parseGcode() supports Cura/PrusaSlicer/Simplify3D comment formats

User uploads .svg/.pes
  → LaserCalculatorTable / EmbroideryCalculatorTable parser helpers run locally
  → SVG parser extracts size + area; PES parser extracts stitch count + bounds
  → Form fields auto-populate and drafts persist through refresh
```

**3. Data Storage Example**
```typescript
// Write: Use sessionStorage module
import * as sessionStore from '@/lib/core/sessionStorage';
sessionStore.saveQuotes([...quotes]); // Auto-serializes to localStorage

// Read: Custom hooks handle retrieval
const { savedQuotes } = useSavedQuotes(); // Hook fetches + returns typed data
```

## Component Organization

- **`components/calculator/`** – Form fields, upload dialogs, table displays for FDM/Resin
- **`components/print-management/`** – Kanban columns, job cards, capacity planner
- **`components/settings/`** – Material/machine/company configuration
- **`components/quotes/`** – Quote summary, batch display
- **`components/ui/`** – Shadcn UI components (auto-generated, don't edit names)
- **`components/shared/`** – Currency selector, client selector, reusable dialogs
- **`components/layout/`** – Nav, footer, main layout wrapper

## Important Conventions

**1. File Parsing Robustness**
- G-code parsers use **multiple regex patterns** (see [gcodeParser.ts](src/lib/parsers/gcodeParser.ts) lines 54-82)
- Different slicers output different comment formats – always have fallback patterns
- Handle edge cases: missing metadata, malformed timestamps, binary data in 3MF

**2. Calculation Precision**
- All costs use `parseFloat()` to handle user input
- Quantity multiplier applied: `unitPrice * quantity`
- Overhead calculated as % of subtotal (before markup)
- Markup applied to subtotal (material + labor + overhead + consumables)

**3. Context Provider Order** ([App.tsx](src/App.tsx))
```tsx
<QueryClientProvider> // React Query (for future Supabase integration)
  <HashRouter>
    <TooltipProvider> // Shadcn tooltips
      <CurrencyProvider> // Currency context
        <BatchQuoteProvider> // Quote batching
          <ProductionProvider> // Kanban/print jobs
            <Layout> {/* Pages */} </Layout>
```

**4. Error Handling**
- Use `ErrorBoundary` component for React errors
- File parsing errors: Return default GcodeData with zeros + error message in UI
- Form validation: React Hook Form with Zod resolvers in settings dialogs

## Testing & Validation

- **Backend automated tests configured** with Jest + Supertest in [backend/tests/](../backend/tests/)
- **Current sync regression coverage:** [backend/tests/contract/sync.contract.test.ts](../backend/tests/contract/sync.contract.test.ts) and [backend/tests/integration/sync-conflicts.integration.test.ts](../backend/tests/integration/sync-conflicts.integration.test.ts)
- **Manual testing:** Verify G-code parsing across Cura, PrusaSlicer, Simplify3D files
- **Browser DevTools:** Check `localStorage` for: `session_quotes`, `session_materials`, `pending_sync_changes`, `pending_sync_conflicts`, etc.
- **ESLint:** Run `npm run lint` before commits (AGPL header required on new files)

---

## Instruction File Update Guidelines

**Every code change should trigger a documentation update.** Here's how:

### When You Modify...

**Quote calculations:**
```
src/lib/quoteCalculations.ts OR src/types/quote.ts
  → Update: .github/CALCULATIONS.md
  → Add: New cost component, quantity logic, or constraint
  → Document: How it affects batch totals
```

**File parsing:**
```
src/lib/parsers/* OR components/calculator/*Upload.tsx
  → Update: .github/PARSING.md
  → Add: New format support, edge cases, pattern fallbacks
  → Document: Example of extracted data, test files needed
```

**State/contexts/hooks:**
```
src/contexts/* OR src/hooks/*
  → Update: .github/STATEMANAGEMENT.md
  → Add: New context structure, data flow diagrams
  → Document: Provider order changes, hook dependencies
```

**Components:**
```
src/components/*/component.tsx
  → Update: .github/COMPONENTS.md
  → Add: Pattern examples, props interface, styling approach
  → Document: Where it's used, design decisions
```

**Storage structure:**
```
src/lib/core/sessionStorage.ts OR storage keys
  → Update: .github/STORAGE.md
  → Add: New storage key schema with TypeScript interface
  → Document: Persistence strategy, size impact
```

### Update Checklist

- [ ] Edit the relevant `.github/*.md` file
- [ ] Update or add TypeScript interface examples if types changed
- [ ] Update file line numbers if relevant (e.g., "line 54-82" references)
- [ ] Add example code blocks showing the new pattern
- [ ] Update the architecture diagram if adding major feature
- [ ] Link to modified files using relative paths: `[filename](../src/path/to/file.ts#L10)`
- [ ] Add to "Common Tasks" section if it's a repeatable operation

---

## Common Tasks

**Add a new cost category to quotes**
1. Extend `QuoteData` interface in [types/quote.ts](src/types/quote.ts)
2. Update `calculateFDMQuote()` and `calculateResinQuote()` in [quoteCalculations.ts](src/lib/quoteCalculations.ts)
3. Update `BatchQuoteContextType` in [BatchQuoteContext.ts](src/contexts/BatchQuoteContext.ts) if it's a batch total
4. Add UI field in `FDMCalculatorTable` or form component

**Support a new file format**
1. Create parser: `src/lib/parsers/newFormatParser.ts`
2. Export typed result matching `GcodeData` signature
3. Create upload component extending `GcodeUpload` pattern
4. Update file input accept attribute + validation logic

**Add machine/material presets**
1. Edit stored defaults in [sessionStorage.ts](src/lib/core/sessionStorage.ts)
2. Or allow runtime configuration in `ConstantsManager`/`MachinesManager` components
3. Data auto-persists to localStorage via session store setters

## Key Files You'll Encounter

| File | Purpose |
|------|---------|
| [src/lib/quoteCalculations.ts](src/lib/quoteCalculations.ts) | Core quote math (327 lines) |
| [src/lib/parsers/gcodeParser.ts](src/lib/parsers/gcodeParser.ts) | G-code/3MF extraction (500 lines) |
| [src/lib/core/sessionStorage.ts](src/lib/core/sessionStorage.ts) | Centralized localStorage API |
| [src/types/quote.ts](src/types/quote.ts) | Quote/customer/employee types (259 lines) |
| [src/App.tsx](src/App.tsx) | Router, context providers, page setup |
| [src/pages/Index.tsx](src/pages/Index.tsx) | Main calculator UI |
| [vite.config.ts](vite.config.ts) | Build config with chunk optimization |
