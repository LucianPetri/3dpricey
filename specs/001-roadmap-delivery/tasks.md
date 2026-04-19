---

description: "Task list for roadmap delivery implementation"
---

# Tasks: Roadmap Delivery

**Input**: Design documents from `/specs/001-roadmap-delivery/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md

**Tests**: This feature requires automated backend regression coverage for the roadmap API contracts and manual smoke tests for the offline, calculator, and printer workflows.

**Organization**: Tasks are grouped by user story so each roadmap slice can be implemented, validated, and demonstrated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the shared tooling and documentation map used by all roadmap slices.

- [X] T001 Map required documentation updates in `.github/CALCULATIONS.md`, `.github/PARSING.md`, `.github/STATEMANAGEMENT.md`, `.github/STORAGE.md`, `.github/COMPONENTS.md`, `.github/roadmap/ROADMAP.md`, and `.github/copilot-instructions.md`
- [X] T002 Configure backend regression test tooling in `backend/package.json`, `backend/tsconfig.json`, and `backend/jest.config.cjs`
- [X] T003 [P] Extend shared quote and printer domain types in `frontend/src/types/quote.ts` and `frontend/src/types/printer.ts`
- [X] T004 [P] Create shared roadmap service scaffolding in `backend/src/services/sync.service.ts` and `backend/src/services/quote-extension.service.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared validation, API, and UI extension points that block the roadmap stories.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 Add reusable request validation helpers in `backend/src/middleware/validation.middleware.ts` and `backend/src/middleware/errorHandler.middleware.ts`
- [X] T006 [P] Add shared roadmap API and queue DTO support in `frontend/src/lib/api.ts` and `frontend/src/lib/sync.ts`
- [X] T007 [P] Add global calculator and conflict extension points in `frontend/src/components/calculator/QuoteCalculator.tsx`, `frontend/src/pages/Index.tsx`, and `frontend/src/components/shared/ConflictResolutionModal.tsx`
- [X] T008 [P] Prepare shared quote persistence hooks for roadmap fields in `backend/src/controllers/quotes.controller.ts` and `backend/prisma/schema.prisma`
- [X] T009 Document offline-storage and rollout prerequisites in `.github/STATEMANAGEMENT.md`, `.github/STORAGE.md`, and `.github/roadmap/PHASE1-ARCHITECTURE.md`

**Checkpoint**: Shared roadmap scaffolding is ready and user story work can proceed in planned order.

---

## Phase 3: User Story 1 - Offline Sync Safety (Priority: P1)

**Goal**: Preserve offline quote edits, reconcile conflicts after reconnect, and keep the chosen result available to the user.

**Independent Test**: Create or edit a quote while offline, reconnect, resolve any conflict, and confirm the final quote remains available with the chosen values.

### Tests for User Story 1

- [X] T010 [P] [US1] Add sync endpoint contract coverage in `backend/tests/contract/sync.contract.test.ts`
- [X] T011 [P] [US1] Add sync conflict integration coverage in `backend/tests/integration/sync-conflicts.integration.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement sync reconciliation and transaction state handling in `backend/src/services/sync.service.ts` and `backend/src/controllers/sync.controller.ts`
- [X] T013 [US1] Implement `POST /api/sync`, `POST /api/sync/resolve`, and `GET /api/sync/status` in `backend/src/routes/sync.routes.ts`
- [X] T014 [US1] Connect the frontend sync client to the new backend responses in `frontend/src/lib/api.ts` and `frontend/src/lib/sync.ts`
- [X] T015 [US1] Wire conflict resolution UI into `frontend/src/components/shared/ConflictResolutionModal.tsx` and `frontend/src/App.tsx`
- [X] T016 [US1] Surface pending-sync state and resolution actions in `frontend/src/pages/SavedQuotes.tsx` and `frontend/src/pages/Index.tsx`
- [X] T017 [US1] Update sync and storage documentation in `.github/STATEMANAGEMENT.md`, `.github/STORAGE.md`, and `.github/roadmap/PHASE1-ARCHITECTURE.md`

**Checkpoint**: Offline changes can sync safely, conflicts can be resolved explicitly, and the selected result remains usable.

---

## Phase 4: User Story 2 - Multi-Material Quotes (Priority: P2)

**Goal**: Support ordered multi-material FDM quotes with accurate cost calculation, persistence, and parser-assisted input.

**Independent Test**: Create an FDM quote with multiple material segments, save it, reload it, and verify the total and material ordering remain correct.

### Tests for User Story 2

- [X] T018 [P] [US2] Add multi-material quote contract coverage in `backend/tests/contract/quote-filaments.contract.test.ts`
- [X] T019 [P] [US2] Add parse-gcode integration coverage in `backend/tests/integration/parse-gcode.integration.test.ts`

### Implementation for User Story 2

- [X] T020 [US2] Extend multi-material quote types in `frontend/src/types/quote.ts` and `backend/prisma/schema.prisma`
- [X] T021 [US2] Persist ordered filament segments in `backend/src/controllers/quotes.controller.ts` and `backend/src/services/quote-extension.service.ts`
- [X] T022 [US2] Add `POST /api/quotes/parse-gcode` in `backend/src/routes/quotes.routes.ts` and `backend/src/controllers/quotes.controller.ts`
- [X] T023 [US2] Build `FilamentCompositionForm` in `frontend/src/components/calculator/FilamentCompositionForm.tsx` and integrate it into `frontend/src/components/calculator/FDMCalculatorTable.tsx`
- [X] T024 [US2] Update FDM material-cost logic and tool mapping in `frontend/src/lib/quoteCalculations.ts` and `frontend/src/lib/parsers/gcodeParser.ts`
- [X] T025 [US2] Persist multi-material quote editing through the client flows in `frontend/src/lib/api.ts`, `frontend/src/lib/sync.ts`, and `frontend/src/pages/Index.tsx`
- [X] T026 [US2] Update multi-material calculation and parser documentation in `.github/CALCULATIONS.md`, `.github/PARSING.md`, `.github/COMPONENTS.md`, and `.github/roadmap/PHASE2-MULTICOLOR.md`

**Checkpoint**: Multi-material FDM quotes can be created, parsed, priced, saved, and reopened independently of later roadmap work.

---

## Phase 5: User Story 3 - Expanded Print Types (Priority: P3)

**Goal**: Add laser and embroidery quote flows and reintroduce printer reconnect support without breaking FDM and Resin workflows.

**Independent Test**: Create one laser quote and one embroidery quote, then reconnect a supported printer and assign a job in the production workflow without regressing the existing quote modes.

### Tests for User Story 3

- [X] T027 [P] [US3] Add laser and embroidery quote contract coverage in `backend/tests/contract/quote-print-types.contract.test.ts`
- [X] T028 [P] [US3] Add printer reconnect integration coverage in `backend/tests/integration/printer-reconnect.integration.test.ts`

### Implementation for User Story 3

- [X] T029 [US3] Extend print-type and printer connection domain types in `frontend/src/types/quote.ts` and `frontend/src/types/printer.ts`
- [X] T030 [US3] Add Prisma models for laser, embroidery, and printer connection state in `backend/prisma/schema.prisma` and `backend/prisma/migrations/`
- [X] T031 [P] [US3] Implement laser and embroidery quote handlers in `backend/src/controllers/laser.controller.ts`, `backend/src/controllers/embroidery.controller.ts`, `backend/src/routes/laser.routes.ts`, `backend/src/routes/embroidery.routes.ts`, and `backend/src/index.ts`
- [X] T032 [P] [US3] Implement laser and embroidery calculation and parsing utilities in `frontend/src/lib/quoteCalculations.ts`, `frontend/src/lib/parsers/svgParser.ts`, and `frontend/src/lib/parsers/embroideryFileParser.ts`
- [X] T033 [P] [US3] Build the new calculator UIs in `frontend/src/components/calculator/LaserCalculatorTable.tsx`, `frontend/src/components/calculator/EmbroideryCalculatorTable.tsx`, and wire them into the calculator workflow
- [X] T034 [US3] Integrate print-type selection and saved-quote reopen flow in `frontend/src/pages/Index.tsx`
- [X] T035 [US3] Reintroduce printer reconnect and assignment flows in `frontend/src/components/print-management/PrintJobDialog.tsx`, `frontend/src/pages/PrintManagement.tsx`, and `frontend/src/contexts/ProductionProvider.tsx`
- [X] T036 [US3] Update print-type, parser, and printer workflow documentation in `.github/CALCULATIONS.md`, `.github/PARSING.md`, `.github/COMPONENTS.md`, `.github/STATEMANAGEMENT.md`, `.github/STORAGE.md`, and `.github/roadmap/PHASE3-LASER-EMBROIDERY.md`

**Checkpoint**: Laser and embroidery quotes work end to end, printer reconnect flows are available again, and the original quote types still behave correctly.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, roadmap status updates, and release-ready cleanup across all stories.

- [X] T037 [P] Refresh roadmap status and implementation guidance in `.github/roadmap/ROADMAP.md`, `.github/roadmap/README-IMPLEMENTATION.md`, `.github/copilot-instructions.md`, and `.github/agents/copilot-instructions.md`
- [X] T038 Run package validation commands defined in `frontend/package.json` and `backend/package.json`
- [ ] T039 Execute the end-to-end smoke tests in `specs/001-roadmap-delivery/quickstart.md` and capture any release notes in `.github/roadmap/ROADMAP.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the roadmap MVP.
- **User Story 2 (Phase 4)**: Depends on User Story 1 because multi-material quote persistence should land on top of the completed sync contract.
- **User Story 3 (Phase 5)**: Depends on User Story 2 because new print types and printer reconnect support should extend the stabilized quote and persistence model.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No user-story dependency once Foundational is complete.
- **User Story 2 (P2)**: Depends on User Story 1 completion.
- **User Story 3 (P3)**: Depends on User Stories 1 and 2 completion.

### Within Each User Story

- Automated tests should be written before the related implementation tasks.
- Shared types and schema changes should land before controller or UI integration.
- Backend contract work should be in place before the final frontend wiring that depends on it.
- Documentation updates should complete before final story validation.

### Parallel Opportunities

- Setup tasks `T003` and `T004` can run in parallel.
- Foundational tasks `T006`, `T007`, and `T008` can run in parallel after `T005` starts the shared validation layer.
- User Story 1 tests `T010` and `T011` can run in parallel, then frontend wiring `T014` and `T015` can proceed together after `T012` and `T013`.
- User Story 2 tests `T018` and `T019` can run in parallel, then UI `T023` and calculation/parser work `T024` can proceed together after `T020` through `T022`.
- User Story 3 tests `T027` and `T028` can run in parallel, then backend handlers `T031`, calculator/parser work `T032`, and new UI work `T033` can proceed together after `T029` and `T030`.

---

## Parallel Example: User Story 1

```bash
Task T010: Add sync endpoint contract coverage in backend/tests/contract/sync.contract.test.ts
Task T011: Add sync conflict integration coverage in backend/tests/integration/sync-conflicts.integration.test.ts

Task T014: Connect the frontend sync client to the new backend responses in frontend/src/lib/api.ts and frontend/src/lib/sync.ts
Task T015: Wire conflict resolution UI into frontend/src/components/shared/ConflictResolutionModal.tsx and frontend/src/App.tsx
```

## Parallel Example: User Story 2

```bash
Task T018: Add multi-material quote contract coverage in backend/tests/contract/quote-filaments.contract.test.ts
Task T019: Add parse-gcode integration coverage in backend/tests/integration/parse-gcode.integration.test.ts

Task T023: Build FilamentCompositionForm in frontend/src/components/calculator/FilamentCompositionForm.tsx and integrate it into frontend/src/components/calculator/FDMCalculatorTable.tsx
Task T024: Update FDM material-cost logic and tool mapping in frontend/src/lib/quoteCalculations.ts and frontend/src/lib/parsers/gcodeParser.ts
```

## Parallel Example: User Story 3

```bash
Task T027: Add laser and embroidery quote contract coverage in backend/tests/contract/quote-print-types.contract.test.ts
Task T028: Add printer reconnect integration coverage in backend/tests/integration/printer-reconnect.integration.test.ts

Task T031: Implement laser and embroidery quote handlers in backend/src/controllers/laser.controller.ts, backend/src/controllers/embroidery.controller.ts, backend/src/routes/laser.routes.ts, backend/src/routes/embroidery.routes.ts, and backend/src/index.ts
Task T032: Implement laser and embroidery calculation and parsing utilities in frontend/src/lib/quoteCalculations.ts, frontend/src/lib/parsers/svgParser.ts, and frontend/src/lib/parsers/embroideryFileParser.ts
Task T033: Build the new calculator UIs in frontend/src/components/calculator/LaserCalculatorTable.tsx, frontend/src/components/calculator/EmbroideryCalculatorTable.tsx, and update frontend/src/components/calculator/QuoteCalculator.tsx
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate offline edit, reconnect, and conflict resolution flows before expanding scope.

### Incremental Delivery

1. Deliver User Story 1 to stabilize persistence and sync.
2. Deliver User Story 2 on top of the stabilized quote save and reload flows.
3. Deliver User Story 3 after the quote domain and persistence layers can safely absorb new print modes.
4. Finish with Phase 6 validation and release-note updates.

### Team Parallelization

1. One engineer can own backend sync and quote contract work.
2. One engineer can own calculator UI and quote calculation updates.
3. One engineer can own printer reconnect and production workflow integration once User Story 3 begins.

---

## Notes

- `[P]` tasks operate on separate files and can run concurrently once dependencies are satisfied.
- Every story includes explicit documentation updates because the constitution requires docs and code to ship together.
- The roadmap is intentionally sequenced as `US1 -> US2 -> US3` rather than treating all stories as fully independent.
- Final validation is not optional; `T038` and `T039` are required for completion.