# State Management & Data Flow

## Architecture

3DPricey uses **Context API + custom hooks** for global state. This approach trades complexity for simplicity—no Redux/Zustand overhead.

**Key Principle:** Context stores data, hooks + localStorage persist it, and `SyncService` coordinates queued backend sync work.

## Context Hierarchy

### Provider Order (App.tsx)
```tsx
<QueryClientProvider>          // React Query (Supabase ready)
  <HashRouter>
    <TooltipProvider>          // Shadcn UI
      <CurrencyProvider>        // Currency selection
        <BatchQuoteProvider>    // Quote batching
          <ProductionProvider>  // Kanban/print jobs
            <Layout>
              {/* Pages */}
```

**Why this order?**
- Outer: Infrastructure (routing, toast notifications)
- Middle: Feature-specific (quotes, production)
- Inner would violate context access (children can't access ancestor-only providers)

## Core Contexts

### 1. BatchQuoteContext
**File:** [src/contexts/BatchQuoteContext.ts](../src/contexts/BatchQuoteContext.ts)  
**Purpose:** Manages array of calculated quotes before final export/save

**Type:**
```typescript
interface BatchQuoteContextType {
  batchItems: QuoteData[];           // Array of quotes
  addItem: (item: QuoteData) => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, item: QuoteData) => void;
  clearBatch: () => void;
  batchTotals: {
    totalItems: number;
    totalQuantity: number;
    totalMaterialCost: number;
    totalMachineTimeCost: number;
    totalElectricityCost: number;
    totalLaborCost: number;
    totalLaborConsumablesCost: number;
    totalLaborMachineCost: number;
    totalOverheadCost: number;
    totalMarkup: number;
    grandTotal: number;
  };
}
```

**Hook:** `useBatchQuote()`

**Data Flow:**
```
User fills form → calculateFDMQuote() → QuoteData → addItem() 
  → batchItems updated → UI re-renders
```

**NOT persisted to localStorage** (intentionally)—only in-memory session.

### 2. ProductionContext
**File:** [src/contexts/ProductionContext.ts](../src/contexts/ProductionContext.ts)  
**Purpose:** Kanban board state (print jobs, workflow stages)

**Type:**
```typescript
interface Job {
  id: string;
  quoteId: string;
  machineId: string;
  status: QuoteStatus; // PENDING | PRINTING | COMPLETE...
  startedAt?: string;
  completedAt?: string;
}

interface ProductionContextType {
  jobs: Job[];
  addJob: (job: Job) => void;
  updateJob: (id: string, job: Partial<Job>) => void;
  removeJob: (id: string) => void;
}
```

**Hook:** `useProduction()`  
**Persistence:** Via `sessionStorage.saveJobs()` → localStorage storage key `JOBS`

**Phase 3 update:** `ProductionProvider` now treats `quote.assignedMachineId` and `quote.parameters.machineId` as the preferred production target when a job is created or moved. This lets laser and embroidery quotes keep their machine affinity when entering the queue.

### 3. KanbanContext
**File:** [src/contexts/KanbanContext.ts](../src/contexts/KanbanContext.ts)  
**Purpose:** Kanban board layout (column visibility, card ordering)

**Type:**
```typescript
interface KanbanContextType {
  visibleColumns: QuoteStatus[];
  toggleColumn: (status: QuoteStatus) => void;
  cardOrder: { [status: string]: string[] }; // Quote IDs per column
  reorderCards: (status: string, order: string[]) => void;
}
```

**Hook:** `useKanban()`  
**Persistence:** localStorage under `print_mgmt_columns` key

### 4. CurrencyContext
**File:** [src/contexts/CurrencyContext.ts](../src/contexts/CurrencyContext.ts)  
**Purpose:** Global currency selection (USD, EUR, GBP, etc.)
**Options:** Currency list is maintained in [src/types/currency.ts](../src/types/currency.ts) and grouped by region (major/common currencies).

**Type:**
```typescript
interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  getSymbol: () => string;
  formattedPrice: (amount: number) => string;
}
```

**Hook:** `useCurrency()`  
**Persistence:** sessionStorage under `CURRENCY` key

### 5. Stock Management System
**Files:** 
- Storage layer: [src/lib/core/sessionStorage.ts](../src/lib/core/sessionStorage.ts) (functions: `getStock()`, `addToStock()`, `removeFromStock()`, `updateStockStatus()`, `getStockStats()`, `deleteStockItem()`)
- Hook: [src/hooks/useStock.ts](../src/hooks/useStock.ts)
- Page: [src/pages/StockManagement.tsx](../src/pages/StockManagement.tsx)

**Purpose:** Track inventory from completed print jobs; support manual stock removal/sales workflow

**Core Types:**
```typescript
interface StockItem {
  id: string;                        // UUID
  quoteId?: string;                  // Reference to source quote
  projectName: string;               // Job/product name
  quantity: number;                  // Units in stock
  unitPrice: number;                 // Cost per unit
  totalCost: number;                 // Total inventory value (quantity * unitPrice)
  printType: string;                 // 'FDM' | 'Resin'
  material?: string;                 // Material name
  color?: string;                    // Hex color code
  createdAt: string;                 // ISO timestamp
  status: 'IN_STOCK' | 'SOLD' | 'RESERVED';  // Inventory status
}

interface StockStats {
  totalItems: number;                // Total IN_STOCK units
  totalValue: number;                // Total IN_STOCK value (sum of quantity * unitPrice)
  soldItems: number;                 // Total SOLD units
  soldValue: number;                 // Total SOLD value
  reservedItems: number;             // Total RESERVED units
  reservedValue: number;             // Total RESERVED value
}
```

**Hook:** `useStock()`  
**Persistence:** localStorage under `STOCK` key

**Functions:**
- `addToStock(quoteData, quantity)` – Creates new StockItem from completed quote
- `removeFromStock(stockId, soldQty)` – Sells/removes units, updates status to SOLD
- `updateStockStatus(stockId, newStatus)` – Transitions item between statuses
- `getStockStats()` – Returns aggregated stats
- `deleteStockItem(stockId)` – Permanently removes stock entry
- `getStock()` – Retrieves all stock items

**Auto-Add Workflow:**
When a ProductionJob moves to `'completed'` status (via drag-drop in PrintManagement), [ProductionProvider.tsx](../src/contexts/ProductionProvider.tsx) automatically calls `sessionStore.addToStock(job.quote, job.quote.quantity)`:
```typescript
// In moveJob callback, line ~56:
if (newStatus === 'completed' && jobToMove.status !== 'completed') {
  sessionStore.addToStock(jobToMove.quote, jobToMove.quote.quantity || 1);
  toast.success('Stock entry created from completed job');
}
```

No manual action required from user—all completed jobs automatically appear in Stock Management page.

## Custom Hooks Pattern

All contexts are consumed via custom hooks that:
1. Wrap `useContext()`
2. Throw error if used outside provider
3. Handle reading from/writing to localStorage
4. Provide derived state

### Hook Example: useSavedQuotes
**File:** [frontend/src/hooks/useSavedQuotes.ts](../frontend/src/hooks/useSavedQuotes.ts)

```typescript
export const useSavedQuotes = () => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => syncService.subscribe(() => {
    setQuotes(sessionStore.getQuotes());
  }), []);

  const saveQuote = async (quote: QuoteData) => {
    const localQuote = sessionStore.saveQuote(quote);
    syncService.queueQuoteCreate(localQuote);
    setQuotes((previous) => [localQuote, ...previous]);
  };

  return { quotes, saveQuote };
};
```

**Key Pattern:**
- Hook maintains local state
- Persists immediately to localStorage
- Subscribes to `SyncService` so background sync updates and conflicts rehydrate the same quote list
- Returns typed interface for safe access

### Sync Service & Status Hook

**Files:** [frontend/src/lib/sync.ts](../frontend/src/lib/sync.ts), [frontend/src/hooks/useSyncStatus.ts](../frontend/src/hooks/useSyncStatus.ts)

`SyncService` is the app-wide coordinator for offline quote mutations:

- Stores pending backend mutations in `pending_sync_changes`
- Stores unresolved conflicts in `pending_sync_conflicts`
- Tracks `pendingCount`, `conflicts`, `lastSyncedAt`, online/authenticated state, and modal visibility
- Starts a 5 minute background sync interval and retries immediately on `window.online`
- Collapses repeated quote changes (`create -> update`, `update -> delete`) before sending them to the backend
- Applies successful server quotes back through `sessionStorage.replaceQuoteFromRemote()` so the UI stays on one source of truth

**Current derived stats include:**
- `totalQuotes`
- `totalValue`
- `averageQuote`
- `fdmCount`
- `resinCount`
- `laserCount`
- `embroideryCount`
- `totalProfit` (sum of quote `markup` across saved quotes)

## Phase 3 Printer Reconnect State

- [PrintManagement.tsx](../src/pages/PrintManagement.tsx) now persists `printer_connections` in localStorage.
- On page load, stored cloud/LAN connections are marked `reconnecting` and a reconnect attempt is issued through Electron before the machine columns render their final state.
- Drag/drop and [PrintJobDialog.tsx](../src/components/print-management/PrintJobDialog.tsx) now enforce `machine.print_type === quote.printType` and respect a quote's preferred `machineId` when one exists.

## SessionStorage Module

**File:** [src/lib/core/sessionStorage.ts](../src/lib/core/sessionStorage.ts)  
**Purpose:** Centralized localStorage API

**Storage Keys (current runtime keys):**
```
session_quotes                 → QuoteData[]
session_materials              → Material[]
session_machines               → Machine[]
session_customers              → Customer[]
session_employees              → Employee[]
session_labor_items            → LaborItem[]
session_spools                 → MaterialSpool[]
session_gcodes                 → StoredGcode[]
session_fdm_calc_draft         → { formData, selectedSpoolId }
session_resin_calc_draft       → { formData, selectedSpoolId }
session_constants              → CostConstant[]
session_stock                  → StockItem[]
session_company                → CompanySettings | null
session_initialized            → "true" (flag)
pending_sync_changes           → SyncChangeDto[]
pending_sync_conflicts         → QuoteSyncConflict[]
pending_sync_last_synced_at    → ISO date string
```

### Getter Pattern (Type-Safe)
```typescript
export function getSavedQuotes(): QuoteData[] {
  const data = localStorage.getItem(STORAGE_KEYS.QUOTES);
  return data ? JSON.parse(data) : [];
}
```

### Setter Pattern (Auto-Initialize)
```typescript
export function saveQuotes(quotes: QuoteData[]): void {
  ensureInitialization();
  localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
}
```

### Initialization (First Load)
```typescript
export function ensureInitialization(): void {
  if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
    // Set all defaults
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(defaultMaterials));
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(defaultMachines));
    // ... etc
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
  }
}
```

## Data Flow Patterns

### Pattern 1: Create & Batch Quote
```
Calculator Form (FDMFormData)
  ↓
useCalculatorData() hook reads material/machine
  ↓
calculateFDMQuote() function
  ↓
useBatchQuote() → addItem(quoteData)
  ↓
BatchQuoteContext.batchItems updated
  ↓
BatchSummary component re-renders
  ↓
User exports/saves → useSavedQuotes().saveQuote()
```

### Pattern 2: Load Saved Quote
```
SavedQuotes page loads
  ↓
useSavedQuotes() hook
  ↓
Reads from sessionStorage.getQuotes()
  ↓
Subscribes to SyncService for queue/conflict updates
  ↓
SavedQuotesTable renders quote list
  ↓
SyncStatusBanner reflects pending sync state
  ↓
User clicks quote
  ↓
QuoteDetailsDialog displays data
```

### Pattern 3: Kanban Update
```
User drags card in PrintManagement
  ↓
onDragEnd(result) handler
  ↓
useProduction() → updateJob(jobId, {status: 'PRINTING'})
  ↓
ProductionContext.jobs updated
  ↓
sessionStorage.saveJobs() → localStorage updated
  ↓
KanbanColumn re-renders
```

## Common Patterns & Anti-Patterns

### ✅ DO: Use hooks for context access
```typescript
const { batchItems, addItem } = useBatchQuote();
if (!batchItems) throw new Error('Must be used inside BatchQuoteProvider');
```

### ❌ DON'T: Direct useContext
```typescript
const context = useContext(BatchQuoteContext);
// If context is undefined, no error thrown
```

### ✅ DO: Batch updates before persist
```typescript
const updated = [...batchItems, newQuote];
setBatchItems(updated);
sessionStore.saveQuotes(updated);
```

### ❌ DON'T: Multiple saves
```typescript
addItem(q1);
saveQuotes(); // Too early, incomplete batch
addItem(q2);
saveQuotes(); // Redundant
```

### ✅ DO: Type derived state in hooks
```typescript
const filteredQuotes = useMemo(
  () => savedQuotes.filter(q => q.printType === printType),
  [savedQuotes, printType]
);
```

## Derived State & Memoization

Many hooks compute derived state for convenience:

**Example:** `useQuotesFilter.ts` filters saved quotes by type/date
```typescript
export const useQuotesFilter = () => {
  const { savedQuotes } = useSavedQuotes();
  const [filterType, setFilterType] = useState<'FDM' | 'Resin' | null>(null);
  
  const filtered = useMemo(
    () => savedQuotes.filter(q => !filterType || q.printType === filterType),
    [savedQuotes, filterType]
  );
  
  return { filtered, filterType, setFilterType };
};
```

## Future Supabase Integration Points

Currently disabled, but structure prepared:

1. **Customers:** CustomerDetailsDialog could POST to Supabase
2. **Reviews:** CustomerReview interface ready for cloud sync
3. **Quote History:** SavedQuotes could fetch from cloud
4. **Team Collaboration:** Multiple users updating jobs

QueryClientProvider already configured—just add `useQuery` calls when backend ready.
