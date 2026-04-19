# Feature Specification: Roadmap Delivery

**Feature Branch**: `001-roadmap-delivery`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "Implement the roadmap across the current codebase: complete Phase 1 sync/conflict resolution, finish Phase 2 multi-color filament support, and prepare Phase 3 laser and embroidery print types using the existing application and roadmap docs."

This initiative uses the current product as the baseline. Existing FDM/Resin quoting, stock tracking, and production workflows stay available while the roadmap closes the offline-sync gap, adds multi-material quoting, and expands into laser, embroidery, and printer connectivity.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Offline Sync Safety (Priority: P1)

Users can continue creating and editing quotes when disconnected, then reconnect and reconcile changes without losing work.

**Why this priority**: Stable offline behavior is the foundation of the roadmap and protects user work before any new quote types are added.

**Independent Test**: Can be tested by making quote changes while offline, reconnecting, and verifying the work is preserved and any conflicts are resolved before the final version is accepted.

**Acceptance Scenarios**:

1. **Given** a user is offline, **When** they create or edit a quote, **Then** the change remains available locally for later synchronization.
2. **Given** the same quote changes while the user is disconnected, **When** the user reconnects, **Then** the system surfaces a clear conflict resolution choice before the final result is applied.
3. **Given** pending changes are accepted, **When** synchronization completes, **Then** the saved record reflects the chosen outcome and remains available for continued editing.

---

### User Story 2 - Multi-Material Quotes (Priority: P2)

Users can define a single FDM job as multiple material segments so pricing and inventory reflect the actual print composition.

**Why this priority**: Multi-color and multi-material jobs are a common customer need and are the roadmap’s next costing gap after sync reliability.

**Independent Test**: Can be tested by creating a multi-segment FDM quote and confirming the total changes when a segment is added, removed, or repriced.

**Acceptance Scenarios**:

1. **Given** a print uses multiple materials, **When** the user enters each segment, **Then** the quote total reflects every segment.
2. **Given** a segment is reordered or removed, **When** the user saves the quote, **Then** the final quote keeps the correct composition and total.
3. **Given** a multi-material quote is saved, **When** the job is reviewed later, **Then** each material segment remains traceable to the originating quote.

---

### User Story 3 - Expanded Print Types (Priority: P3)

Users can create quotes for laser and embroidery work and still use the existing FDM and Resin workflows.

**Why this priority**: The roadmap expands the business into adjacent print services only after the core quoting and multi-material foundation is stable.

**Independent Test**: Can be tested by creating one laser quote and one embroidery quote and verifying each produces a valid total from its own inputs.

**Acceptance Scenarios**:

1. **Given** a laser job, **When** the user provides the required material, design, and labor inputs, **Then** the system produces a complete quote total.
2. **Given** an embroidery job, **When** the user provides the required garment, thread, backing, and labor inputs, **Then** the system produces a complete quote total.
3. **Given** an existing FDM or Resin quote, **When** the user works through the new quote flows, **Then** the original quote types remain available and unchanged.
4. **Given** a supported printer is available, **When** the user reconnects it and assigns a ready job, **Then** the job appears in the production workflow without losing its record.

---

### Edge Cases

- What happens when a disconnected session accumulates more changes than a user wants to reconcile at once?
- How does the system handle the same quote being edited in two places before reconnect?
- What happens when a multi-material quote contains a zero-weight or missing segment?
- How does the system respond when a laser or embroidery job is missing a supported design input?
- What happens if a printer becomes unavailable while a job is being assigned?
- How are existing quotes and stock records treated during the rollout?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST preserve locally created or edited quotes when the user is offline and make them available after reconnect.
- **FR-002**: System MUST detect diverging local and remote versions of the same record and require explicit user resolution before finalizing the saved version.
- **FR-003**: System MUST retain the user-selected resolution and keep the resulting quote accessible for later editing and review.
- **FR-004**: System MUST support multi-material FDM quotes with ordered segments.
- **FR-005**: System MUST calculate pricing from all segments in a multi-material quote and keep each segment traceable to the originating job.
- **FR-006**: System MUST support laser quotes with type-specific inputs and a complete final price.
- **FR-007**: System MUST support embroidery quotes with type-specific inputs and a complete final price.
- **FR-008**: System MUST keep the existing FDM and Resin quote workflows available after the new quote types are introduced.
- **FR-009**: System MUST allow supported printers to be reconnected and assigned to production jobs.
- **FR-010**: System MUST preserve existing quotes, inventory records, and production records while the roadmap features are introduced.

### Key Entities *(include if feature involves data)*

- **Quote**: The user-facing pricing record that holds totals, status, and the chosen print type.
- **Sync Record**: A queued or conflicted change that waits for synchronization with the shared source of truth.
- **Material Segment**: One material or color portion of a multi-material FDM quote.
- **Print Type Profile**: The inputs and cost rules that make laser or embroidery quotes distinct from FDM and Resin.
- **Printer Connection**: A supported device linked to a production job.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete an offline quote edit and later reconcile it without losing the saved work in at least 95% of validation scenarios.
- **SC-002**: Multi-material quotes produce identical totals for equivalent material combinations, regardless of entry order, across 100% of regression tests.
- **SC-003**: Users can complete a laser or embroidery quote with a valid total in under 3 minutes in at least 90% of usability checks.
- **SC-004**: Existing FDM and Resin quote creation continues to succeed in regression validation with no more than a 5% drop in completion rate compared with the current baseline.
- **SC-005**: Supported printer connections can be restored and used for job assignment in every end-to-end test that includes the production workflow.

## Assumptions

- Existing FDM and Resin quote, stock, and production workflows remain the baseline.
- Users may queue changes while offline and reconcile them later when connectivity returns.
- Laser and embroidery support is limited to the roadmap’s declared workflow scope.
- Supported printer reconnection applies only to devices already represented in the product’s production workflow.

## Documentation & Validation Impact *(mandatory)*

- **Documentation Updates**: [.github/CALCULATIONS.md](../../.github/CALCULATIONS.md), [.github/PARSING.md](../../.github/PARSING.md), [.github/STATEMANAGEMENT.md](../../.github/STATEMANAGEMENT.md), [.github/STORAGE.md](../../.github/STORAGE.md), [.github/COMPONENTS.md](../../.github/COMPONENTS.md), [.github/roadmap/ROADMAP.md](../../.github/roadmap/ROADMAP.md), [.github/roadmap/PHASE1-ARCHITECTURE.md](../../.github/roadmap/PHASE1-ARCHITECTURE.md), [.github/roadmap/PHASE2-MULTICOLOR.md](../../.github/roadmap/PHASE2-MULTICOLOR.md), [.github/roadmap/PHASE3-LASER-EMBROIDERY.md](../../.github/roadmap/PHASE3-LASER-EMBROIDERY.md), and [.github/copilot-instructions.md](../../.github/copilot-instructions.md) if the workflow guidance changes.
- **Validation Plan**: Run the relevant lint and build checks for the affected app surfaces, then manually verify offline editing and reconciliation, multi-material quote pricing, laser and embroidery quote creation, and printer assignment flows. Confirm the current baseline quote workflows still operate normally after the changes.
- **Deployment/Security Notes**: Auth, secrets, data migration, sync reconciliation, and device connectivity are all affected. Keep existing records readable during rollout and preserve the current operating mode until new capabilities are explicitly enabled.