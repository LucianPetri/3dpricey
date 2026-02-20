# Data Storage & Schema

## Overview

All data persists to **browser localStorage** with keys prefixed `APP::`. This enables offline-first workflow with optional cloud sync (`Supabase` ready but not integrated).

**File:** [src/lib/core/sessionStorage.ts](../src/lib/core/sessionStorage.ts)

## Storage Keys & Schemas

### QUOTES
**Key:** `APP::QUOTES`  
**Type:** `QuoteData[]`  
**Size:** ~500 bytes per quote

```typescript
{
  id?: string;
  materialCost: number;
  machineTimeCost: number;
  electricityCost: number;
  laborCost: number;
  overheadCost: number;
  subtotal: number;
  markup: number;
  totalPrice: number;
  paintingCost?: number;
  unitPrice: number;
  quantity: number;
  printType: "FDM" | "Resin";
  projectName: string;
  printColour: string;
  parameters: QuoteParameters;
  createdAt?: string;        // ISO date
  notes?: string;
  filePath?: string;         // Path to uploaded .gcode file
  customerId?: string;       // Reference to Customer
  clientName?: string;       // Display name (nullable)
  status?: QuoteStatus;      // PENDING | PRINTING | DONE...
  assignedMachineId?: string;
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;          // ISO date
}
```

**Persistence:** Saved on quote creation/update (not in batch until exported).

### MATERIALS
**Key:** `APP::MATERIALS`  
**Type:** `Material[]`  
**Size:** ~200 bytes per material

```typescript
{
  id: string;
  name: string;
  cost_per_unit: number;      // $/kg for FDM, $/ml for Resin
  density_kg_per_m3?: number;
  print_type: "FDM" | "Resin";
  notes?: string;
  totalInStock?: number;      // kg or ml
  lowStockThreshold?: number;
}
```

**Persistence:** Loaded on app init (sessionStorage.ensureInitialization).  
**Edit:** Settings → Materials Manager → saves directly.

### MACHINES
**Key:** `APP::MACHINES`  
**Type:** `Machine[]`  
**Size:** ~150 bytes per machine

```typescript
{
  id: string;
  name: string;
  hourly_cost: number;              // $/hr
  power_consumption_watts: number | null;
  print_type: "FDM" | "Resin";
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
}
```

**Persistence:** Settings → Employees tab.  
**Usage:** Print jobs assignedEmployeeId reference.

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
**Key:** `APP::GCODES`  
**Type:** `GcodeData[]`  
**Size:** ~1KB per file (with thumbnail base64)

```typescript
{
  printTimeHours: number;
  filamentWeightGrams: number;
  filamentLengthMm?: number;
  printerModel?: string;
  filamentColour?: string;
  filamentSettingsId?: string;
  thumbnail?: string;           // base64 data URL
  fileName?: string;
  filePath?: string;            // User's system path
  surfaceAreaMm2?: number;
}
```

**Persistence:** GcodeManager component allows viewing uploaded .gcodes.  
**Usage:** Preview previously parsed files without re-parsing.

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
