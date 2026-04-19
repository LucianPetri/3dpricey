# Data Storage & Schema

## Overview

All data persists to **browser localStorage**. The current implementation uses `session_*` keys for calculator data plus dedicated `pending_sync_*` keys for offline queueing and conflict recovery.

**Phase 3 update:** print-type coverage now includes `Laser` and `Embroidery`, and local draft storage now includes dedicated keys for the new calculators plus a `printer_connections` reconnect cache.

**File:** [src/lib/core/sessionStorage.ts](../src/lib/core/sessionStorage.ts)

## Storage Keys & Schemas

### QUOTES
**Key:** `session_quotes`  
**Type:** `QuoteData[]`  
**Size:** ~500 bytes per quote before parser and sync metadata

```typescript
{
  id?: string;
  materialCost: number;
  machineTimeCost: number;
  electricityCost: number;
  laborCost: number;
  laborConsumablesCost?: number;
  laborMachineCost?: number;
  overheadCost: number;
  subtotal: number;
  markup: number;
  totalPrice: number;
  unitPrice: number;
  quantity: number;
  printType: "FDM" | "Resin" | "Laser" | "Embroidery";
  projectName: string;
  printColour: string;
  parameters: QuoteParameters;
  createdAt?: string;        // ISO date
  updatedAt?: string;        // ISO date
  notes?: string;
  filePath?: string;         // Path to uploaded .gcode file
  customerId?: string;       // Reference to Customer
  clientName?: string;       // Display name (nullable)
  quoteFilaments?: QuoteFilamentSegment[];
  status?: QuoteStatus;      // PENDING | PRINTING | DONE...
  assignedMachineId?: string;
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;          // ISO date
  assignedEmployeeId?: string;
  syncStatus?: QuoteSyncStatus;        // LEGACY_LOCAL | PENDING_SYNC | SYNCED | CONFLICT | SYNC_FAILED
  pendingSyncAction?: SyncAction;      // create | update | delete
  lastSyncedAt?: string;
  lastServerUpdatedAt?: string;
  syncError?: string;
  conflictTransactionId?: string;
}
```

**Persistence:** Saved immediately on quote creation/update. New quotes default to `PENDING_SYNC`; older quotes without sync metadata are normalized to `LEGACY_LOCAL` so rollout does not relabel historical local-only data.

### SYNC QUEUE & CONFLICTS

**Keys:**

- `pending_sync_changes` → Array of queued backend mutations (`create`, `update`, `delete`)
- `pending_sync_conflicts` → Array of unresolved conflict payloads returned by `POST /api/sync`
- `pending_sync_last_synced_at` → ISO timestamp of the most recent successful server sync pass

```typescript
type PendingSyncChange = {
  id: string;                      // Quote id (reused as stable local/server identifier)
  type: 'create' | 'update' | 'delete';
  resource: 'quote' | 'material' | 'machine';
  data: Record<string, unknown>;   // Serialized quote snapshot
  timestamp: number;
  baseVersion?: string | null;     // Last known server updatedAt for conflict detection
};

type QuoteSyncConflict = {
  id: string;
  changeId: string;
  transactionId: string;
  resourceType: 'quote' | 'material' | 'machine';
  resourceId: string;
  fields: { field: string; localValue: unknown; serverValue: unknown }[];
  localVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
};
```

**Persistence rules:**

- Queue entries are added whenever `useSavedQuotes()` saves, edits, or deletes a quote locally.
- `create -> update` collapses into a single queued `create`.
- `create -> delete` removes the queue entry entirely.
- Conflict payloads rehydrate quotes locally with `syncStatus = 'CONFLICT'` so the record stays visible until the user resolves it.

**Current runtime note:** older `APP::...` references in early roadmap docs are historical. The current `sessionStorage.ts` implementation is authoritative.

### MATERIALS
**Key:** `session_materials`  
**Type:** `Material[]`  
**Size:** ~200 bytes per material

```typescript
{
  id: string;
  name: string;
  cost_per_unit: number;      // $/kg for FDM, $/ml for Resin
  density_kg_per_m3?: number;
  print_type: "FDM" | "Resin" | "Laser" | "Embroidery";
  notes?: string;
  totalInStock?: number;      // kg or ml
  lowStockThreshold?: number;
}
```

**Persistence:** Loaded on app init (sessionStorage.ensureInitialization).  
**Edit:** Settings → Materials Manager → saves directly.

### MACHINES
**Key:** `session_machines`  
**Type:** `Machine[]`  
**Size:** ~150 bytes per machine

```typescript
{
  id: string;
  name: string;
  hourly_cost: number;              // $/hr
  machine_price?: number;           // Purchase price
  hours_per_day_usage?: number;     // Hours per day
  lifetime_years?: number;          // Expected life in years
  maintenance_percentage?: number;  // % used in hourly cost formula
  power_consumption_watts: number | null;
  print_type: "FDM" | "Resin" | "Laser" | "Embroidery";
}
```

**Persistence:** Loaded on app init.  
**Edit:** Settings → Machines Manager.

### CUSTOMERS
**Key:** `APP::CUSTOMERS`  
**Type:** `Customer[]`  
**Size:** ~500 bytes per customer

```typescript
{
  id: string;                   // UUID
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  tags?: string[];              // Free-form tags
  notes?: string;
  createdAt: string;            // ISO date
  averageRating?: number;       // 1-5
  reviewCount?: number;
}
```

**Persistence:** Add via CustomerDetailsDialog → sessionStorage.saveCustomers().  
**Usage:** Quote form references customerId; displays customerName.

### EMPLOYEES
**Key:** `APP::EMPLOYEES`  
**Type:** `Employee[]`  
**Size:** ~200 bytes per employee

```typescript
{
  id: string;
  name: string;
  jobPosition: string;          // e.g., "Operator", "Post-processor"
  email?: string;
  phone?: string;
  createdAt: string;
  allowedLaborItemIds?: string[];
}
```

**Persistence:** Settings → Employees tab.  
**Usage:** Print jobs assignedEmployeeId reference.

### LABOR_ITEMS
**Key:** `APP::LABOR_ITEMS`  
**Type:** `LaborItem[]`  
**Size:** ~300 bytes per labor item

```typescript
{
  id: string;
  name: string;
  type: string;
  pricingModel: "hourly" | "flat";
  rate: number;
  description?: string;
  consumables: { id: string; constantId: string; quantityPerUnit: number }[];
  machines: { id: string; machineId: string; hoursPerUnit: number }[];
}
```

**Persistence:** Settings → Labor tab.  
**Usage:** Calculators build `laborSelections` and compute labor + consumable + equipment totals.

### SPOOLS
**Key:** `APP::SPOOLS`  
**Type:** `MaterialSpool[]`  
**Size:** ~300 bytes per spool

```typescript
{
  id: string;
  materialId: string;           // Foreign key → MATERIALS
  weight_grams?: number;        // For filament spools
  remaining_grams?: number;
  volume_ml?: number;           // For resin spools
  remaining_ml?: number;
  purchasedAt: string;          // ISO date
  cost: number;                 // Paid for this spool
  supplier?: string;
  batchNumber?: string;
}
```

**Persistence:** Settings → Material Inventory.  
**Usage:** Quote form optionally selects spool to track consumption.

### GCODES
**Key:** `session_gcodes`  
**Type:** `StoredGcode[]`  
**Size:** ~1KB per file (with thumbnail base64)

```typescript
{
  id: string;
  name: string;
  filePath: string;
  printTime: number;
  filamentWeight: number;
  resinVolume?: number;
  machineName?: string;
  materialName?: string;
  printType?: "FDM" | "Resin" | "Laser" | "Embroidery";

### CALCULATOR DRAFTS

**Keys:**

- `session_fdm_calc_draft`
- `session_resin_calc_draft`
- `session_laser_calc_draft`
- `session_embroidery_calc_draft`

**Type:**

```typescript
type CalculatorDraft<T> = {
  formData: T;
  selectedSpoolId?: string;
}
```

Laser and embroidery drafts preserve parser-populated design metadata (`filePath`, dimensions, time estimates, stitch count, selected consumables) so the calculator can be resumed after refresh.

### PRINTER RECONNECT CACHE

**Key:** `printer_connections`

```typescript
type PrinterConnectionMap = Record<string, {
  ip: string;
  serial: string;
  accessCode?: string;
  cloudMode?: boolean;
  connectionType?: 'lan' | 'cloud';
  status: string;
  lastAttemptAt?: string;
  lastReconnectAt?: string;
  lastSeenAt?: string;
  reconnectError?: string;
}>;
```

Used by [PrintManagement.tsx](../src/pages/PrintManagement.tsx) to re-establish machine connections on page load.
  thumbnail?: string;
  colorUsages?: { tool: string; color?: string; material?: string; materialId?: string; spoolId?: string; usedGrams: number }[];
  toolBreakdown?: {
    tool: string;
    color?: string;
    material?: string;
    materialId?: string;
    spoolId?: string;
    modelGrams: number;
    supportGrams: number;
    towerGrams: number;
    flushGrams: number;
    totalGrams: number;
  }[];
  recyclableColorUsages?: { tool: string; color?: string; supportGrams: number; towerGrams: number; flushGrams: number; recyclableGrams: number }[];
  recyclableTotals?: { supportGrams: number; towerGrams: number; flushGrams: number; recyclableGrams: number; modelGrams?: number };
  createdAt: string;
}
```

**Persistence:** GcodeManager component allows viewing uploaded .gcodes.  
**Usage:** Preview previously parsed files without re-parsing.

### Recyclable Color Aggregation Output

`getRecyclableColorTotals()` now returns per-color recyclable totals plus inventory context:

```typescript
byColor: {
  color: string;
  supportGrams: number;
  towerGrams: number;
  flushGrams: number;
  recyclableGrams: number;
  stockGrams: number;   // current FDM spool stock for that color
  surplusGrams: number; // stockGrams - recyclableGrams
}[]
```

This allows Settings UI to prioritize **how much of each color is available** alongside recyclable totals.

### CALCULATOR DRAFTS
**Keys:** `APP::FDM_CALC_DRAFT`, `APP::RESIN_CALC_DRAFT`  
**Type:** `{ formData: FDMFormData | ResinFormData, selectedSpoolId?: string }`

```typescript
{
  formData: FDMFormData | ResinFormData;
  selectedSpoolId?: string;
}
```

**Persistence:** Auto-saved as users edit calculators.  
**Usage:** Restores in-progress quotes when navigating away; cleared via Reset Quote. FDM drafts include per-tool material/spool mappings in `formData.toolBreakdown`.

### CONSTANTS
**Key:** `APP::CONSTANTS`  
**Type:** `CostConstant[]`  
**Size:** ~150 bytes per constant

```typescript
{
  id: string;
  name: string;                 // e.g., "Cleaning Gloves", "IPA Wash"
  value: number;                // Cost or rate
  unit: string;                 // "$/pair", "$/ml", "$/hour", "flat"
  is_visible?: boolean;         // Show in UI?
  description?: string;         // e.g., "Usage Rate: 0.02ml/cm²" (for paints)
}
```

**Persistence:** Settings → Constants Manager.  
**Usage:** Calculator selects via checkboxes.

### JOBS
**Key:** `APP::JOBS`  
**Type:** `Job[]`  (Internal production system)  
**Size:** ~200 bytes per job

```typescript
{
  id: string;           // UUID
  quoteId: string;      // Reference to QUOTES
  machineId: string;    // Reference to MACHINES
  status: QuoteStatus;  // PENDING | PRINTING | POST_PROCESSING | DONE...
  startedAt?: string;   // ISO date
  completedAt?: string;
  assignedEmployeeId?: string;
  actualPrintTime?: number;  // Hours (for analytics)
}
```

**Persistence:** Kanban board updates (ProductionContext).

### STOCK
**Key:** `APP::STOCK`  
**Type:** `StockItem[]`  
**Size:** ~300 bytes per item

```typescript
{
  id: string;                                      // UUID
  quoteId?: string;                                // Reference to source QUOTES
  projectName: string;                             // Job/product name
  quantity: number;                                // Units in stock
  unitPrice: number;                               // Cost per unit (from quote)
  totalCost: number;                               // Total inventory value (quantity * unitPrice)
  printType: string;                               // "FDM" | "Resin"
  material?: string;                               // Material name
  color?: string;                                  // Hex color code (e.g., "#FF0000")
  createdAt: string;                               // ISO date
  status: "IN_STOCK" | "SOLD" | "RESERVED";       // Inventory status
}
```

**Persistence:** Auto-created when ProductionJob moves to `'completed'` status; manual removal via StockManagement page.  
**Usage:** Tracks completed print inventory with sales workflow. StockStats computed from this array:
- `totalItems` = count where status="IN_STOCK"
- `totalValue` = sum(quantity * unitPrice) for status="IN_STOCK"
- `soldItems` = count where status="SOLD"
- `soldValue` = sum(quantity * unitPrice) for status="SOLD"
- `reservedItems` = count where status="RESERVED"
- `reservedValue` = sum(quantity * unitPrice) for status="RESERVED"

### REVIEWS
**Key:** `APP::REVIEWS`  
**Type:** `CustomerReview[]`  
**Size:** ~300 bytes per review

```typescript
{
  id: string;
  customerId: string;
  quoteId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  tags?: ('quality' | 'communication' | 'timeliness' | 'value')[];
  createdAt: string;
}
```

**Persistence:** CustomerReviewDialog saves via sessionStorage.

### COMPANY
**Key:** `APP::COMPANY`  
**Type:** `CompanySettings | null`  
**Size:** ~500 bytes

```typescript
{
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  logoUrl?: string;           // Base64 or URL
  tax_id?: string;
  business_license?: string;
  default_currency?: string;  // "USD", "EUR", etc.
}
```

**Persistence:** Settings → Company Settings.  
**Usage:** PDF exports use company info; quote form defaults.

### CURRENCY
**Key:** `APP::CURRENCY`  
**Type:** `string`  
**Example:** `"USD"`, `"EUR"`, `"GBP"`

**Persistence:** CurrencySelector updates directly.

### INITIALIZED
**Key:** `APP::INITIALIZED`  
**Type:** `"true"`

Flag indicating first-time setup complete (prevents re-seeding defaults).

## Default Data (First Load)

In `sessionStorage.ts`, `defaultMaterials`, `defaultMachines`, and `defaultConstants` are seeded on first run:

```typescript
const defaultMaterials = [
  { id: uuid(), name: "PLA", cost_per_unit: 20, print_type: "FDM" },
  { id: uuid(), name: "ABS", cost_per_unit: 22, print_type: "FDM" },
  { id: uuid(), name: "Resin (Standard)", cost_per_unit: 0.08, print_type: "Resin" },
];

const defaultMachines = [
  { id: uuid(), name: "Prusa i3 MK3S", hourly_cost: 5, power_consumption_watts: 360, print_type: "FDM" },
  { id: uuid(), name: "Creality Halot", hourly_cost: 8, power_consumption_watts: 400, print_type: "Resin" },
];
```

Users can override via settings—defaults are only seeded once.

## Size Considerations

**localStorage Limit:** ~5-10MB per domain (varies by browser).

**Estimated Capacity:**
- 1000 quotes @ 500 bytes = ~500KB
- 100 saved G-codes @ 1KB = ~100KB
- Customer/employee/material data = ~50KB
- **Total:** ~650KB used (plenty of headroom)

**Large Data Warning:**
- Thumbnails (base64 PNG) can be 50-100KB each
- If storing 100+ G-codes with thumbnails, clean up old entries periodically
- Consider implementing `GcodeManager` auto-cleanup

## Backup & Export/Import

**Export Pattern:** Settings → Export/Import
- Exports full localStorage snapshot as JSON
- User can download backup
- Can import to restore across browsers/devices

**Implementation:** SettingsExportImport component

## Planned Supabase Integration

Future cloud sync would:
1. Keep localStorage as local cache
2. POST changes to Supabase `quotes`, `customers`, `jobs` tables
3. Cloud backups of full data
4. Multi-device sync
5. Team collaboration (shared machines, materials)

No changes to schema needed—Supabase tables would mirror localStorage structure.

## Debugging Tips

**Check storage in DevTools:**
```javascript
// Browser console
Object.keys(localStorage).filter(k => k.startsWith('APP::'))
// See individual key:
JSON.parse(localStorage.getItem('APP::QUOTES'))
```

**Clear all data (hard reset):**
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('APP::'))
  .forEach(k => localStorage.removeItem(k))
// Force reload
location.reload()
```

**Monitor writes:**
```javascript
// Wrap sessionStorage.saveQuotes to log
const original = sessionStorage.saveQuotes;
sessionStorage.saveQuotes = (quotes) => {
  console.log('Saving quotes:', quotes.length);
  return original(quotes);
};
```
