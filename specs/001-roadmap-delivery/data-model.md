# Data Model

## Core persisted entities

### Quote

Purpose: Stores the canonical quote record that the user sees, edits, syncs, and sends to
production.

Key fields:
- `id`, `userId`, `companyId`, `customerId`, `projectName`, `printType`, `printColour`
- Cost fields: `materialCost`, `machineTimeCost`, `electricityCost`, `laborCost`,
  `overheadCost`, `subtotal`, `markup`, `unitPrice`, `totalPrice`, `quantity`
- Workflow fields: `status`, `priority`, `dueDate`, `filePath`, `printJob`
- Relationships: `customer`, `quoteFilaments`, `printJob`, `auditLog`

Validation and rules:
- Quote ownership is user-scoped.
- Quantity must stay positive.
- Cost fields must remain non-negative.
- `printType` determines which phase-specific inputs are required.

### SyncTransaction

Purpose: Tracks queued or conflicted changes during offline-to-online reconciliation.

Key fields:
- `id`, `userId`, `quoteId`, `operation`, `tableName`, `localChanges`, `serverVersion`
- `status`, `conflictedAt`, `resolvedAt`, `resolution`, `createdAt`, `updatedAt`

State transitions:
- `PENDING` when a local change is queued.
- `CONFLICTED` when the remote record no longer matches the local change.
- `RESOLVED` after the user selects or merges a version.
- `APPLIED` after the server accepts the resolved payload.
- `FAILED` if the change cannot be applied.

Validation and rules:
- Every sync transaction must point to a concrete quote or resource.
- Conflict resolution must preserve the user-selected outcome.
- Failed transactions remain visible until retried or discarded.

### QuoteFilament

Purpose: Stores ordered material segments for multi-material FDM quotes.

Key fields:
- `id`, `quoteId`, `materialId`, `weightGrams`, `order`, `createdAt`

Relationships:
- Belongs to one `Quote`.
- References one `Material`.

Validation and rules:
- `order` is unique within a quote.
- `weightGrams` must be positive.
- Multi-material quotes must preserve segment order when saved and reloaded.

### Material, Machine, MaterialSpool, Customer, Company

Purpose: Supporting reference and inventory entities that already power quote creation,
inventory tracking, and company-scoped data.

Relationships:
- `User` belongs to `Company`.
- `Quote` belongs to `User` and `Company`.
- `Material` and `Machine` are company-scoped.
- `MaterialSpool` belongs to a `Material` and `Company`.
- `Customer` belongs to `Company` and can be linked to `Quote`.

Validation and rules:
- Company-scoped resources must never bleed across tenants.
- Material and machine types must align with the quote print type.

### PrintJob

Purpose: Represents a production assignment for a quote.

Key fields:
- `id`, `quoteId`, `machineId`, `status`, `assignedEmployeeId`, `startedAt`,
  `completedAt`, `actualPrintTime`

Relationships:
- Each job belongs to one `Quote` and one `Machine`.

Validation and rules:
- A quote can only move into production if it has the data required for its print type.
- Completed jobs may trigger stock or inventory updates where the workflow already does
  so.

## Phase 3 type-specific entities

### LaserQuoteData

Purpose: Stores laser-specific inputs and derived pricing details.

Key fields:
- `quoteId`, `materialId`, `designPath`, `designWidth`, `designHeight`
- `estimatedCutTime`, `estimatedEngravingTime`, `materialSurfaceArea`
- `laserPower`, `focusLensReplacement`, `laserTubeAge`

Validation and rules:
- Required only for laser quotes.
- Dimensions, times, and surface area must be positive when present.
- The quote total must reflect laser-specific material, time, and maintenance inputs.

### EmbroideryQuoteData

Purpose: Stores embroidery-specific inputs and derived pricing details.

Key fields:
- `quoteId`, `designPath`, `stitchCount`, `designWidth`, `designHeight`
- `estimatedEmbroideryTime`, `baseGarmentCost`, `threadCount`, `needleSize`,
  `backingMaterialId`

Validation and rules:
- Required only for embroidery quotes.
- Stitch count, dimensions, and time must be positive when present.
- The quote total must reflect garment, thread, backing, and labor inputs.

### PrinterConnection

Purpose: Represents the live connection state that allows a printer or machine to be
reconnected and assigned to a production job.

Key fields:
- `machineId`, `status`, `lastSeenAt`, `activeJobId`, `connectionType`

Validation and rules:
- A connection must reference an existing machine.
- A connected machine can only be assigned to jobs compatible with its print type.
- Connection state must not overwrite the production record; it only informs assignment.

## Derived runtime structures

These remain calculated on the client or server and do not need to become canonical
database tables:
- `QuoteParameters`
- `FilamentColorUsage`
- `FilamentToolBreakdown`
- `RecyclableColorUsage`
- `LaborSelection` and its cost rollups

They should continue to be treated as calculated metadata that supports the quote view
and sync payloads.