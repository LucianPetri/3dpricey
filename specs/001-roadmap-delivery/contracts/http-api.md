# HTTP API Contract

This document captures the public request and response expectations for the roadmap
delivery work. The contract is split by phase so the implementation can land in small,
reviewable steps.

## Shared conventions

- All authenticated endpoints require a bearer token.
- Validation failures return `400` with an `{ error: string }` payload.
- Missing or unauthorized access returns `401`.
- Conflicts return `409` and must include enough detail for a user to choose a resolution.
- Unknown resources return `404`.
- Server failures return `500` with a readable error message.
- Dates are ISO 8601 strings.

## Existing baseline endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/profile`
- `GET /api/quotes`
- `POST /api/quotes`
- `POST /api/quotes/batch`
- `GET /api/quotes/:id`
- `PUT /api/quotes/:id`
- `DELETE /api/quotes/:id`
- `GET /api/materials`
- `POST /api/materials`
- `GET /api/machines`
- `POST /api/machines`

These routes remain the baseline contract and must continue to work throughout the
roadmap.

## Phase 1: Sync and conflict resolution

### `POST /api/sync`

Purpose: Accept a batch of queued local changes and return which changes were applied,
which conflicted, and what remains pending.

Request shape:

```json
{
  "changes": [
    {
      "id": "change-id",
      "type": "create",
      "resource": "quote",
      "data": {},
      "timestamp": 1711900000000
    }
  ]
}
```

Response shape:

```json
{
  "applied": 1,
  "conflicts": [],
  "failed": [],
  "lastSyncedAt": "2026-03-31T12:00:00.000Z"
}
```

### `POST /api/sync/resolve`

Purpose: Store the user-selected resolution for a conflicted change.

Request shape:

```json
{
  "transactionId": "sync-txn-id",
  "resolution": "merged",
  "mergedValue": {}
}
```

Response shape:

```json
{
  "transaction": {},
  "quote": {}
}
```

### `GET /api/sync/status`

Purpose: Report the current sync queue state for the active user.

Response shape:

```json
{
  "pendingCount": 2,
  "conflictedCount": 1,
  "lastSyncedAt": "2026-03-31T12:00:00.000Z"
}
```

## Phase 2: Multi-material quote support

### `POST /api/quotes` and `PUT /api/quotes/:id`

Purpose: Accept multi-material FDM quote payloads with ordered filament segments.

Expected extension:

```json
{
  "quoteFilaments": [
    { "materialId": "mat-a", "weightGrams": 150, "order": 1 },
    { "materialId": "mat-b", "weightGrams": 75, "order": 2 }
  ]
}
```

### `POST /api/quotes/parse-gcode`

Purpose: Parse G-code and return the material change breakdown used by the quote UI.

Request shape:

```json
{
  "gcode": "..."
}
```

Response shape:

```json
{
  "colorChanges": [],
  "toolBreakdown": [],
  "recyclableTotals": {}
}
```

## Phase 3: New print types and printer reconnect support

### `POST /api/quotes/laser`

Purpose: Create or validate a laser quote using laser-specific inputs.

### `POST /api/quotes/embroidery`

Purpose: Create or validate an embroidery quote using embroidery-specific inputs.

### `POST /api/laser/parse-svg`

Purpose: Parse a design file for laser quote preparation.

### `POST /api/embroidery/parse-file`

Purpose: Parse embroidery design files such as `.pes`, `.exp`, and `.jef`.

### Printer reconnect and assignment

Purpose: Reintroduce printer connectivity so a supported machine can be reconnected and
assigned to a production job.

Contract expectation:
- The request must identify the machine and the target job.
- The response must confirm the machine assignment and the resulting job status.
- An unavailable or incompatible machine must return a conflict or validation error,
  rather than silently reassigning the job.