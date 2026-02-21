# Component Patterns & Development

## Component Organization

Each component directory follows a consistent structure:

```
components/
├── calculator/           # Form inputs, upload dialogs
├── print-management/     # Kanban board system
├── settings/            # Configuration pages
├── quotes/              # Quote display/summary
├── saved-quotes/        # Quote history
├── crm/                 # Customer management
├── shared/              # Reusable dialogs, selectors
├── ui/                  # Shadcn UI components
├── dashboard/           # Analytics displays
├── feedback/            # User feedback modals
├── kanban/              # Kanban columns (legacy?)
├── layout/              # App shell
└── printer/             # Printer connection
```

## Common Component Patterns

### 1. Form Components (Calculator)

**Pattern:** React Hook Form + Zod validation

**Example:** `FDMCalculatorTable.tsx`

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const FDMForm = () => {
  const form = useForm<FDMFormData>({
    resolver: zodResolver(fdmFormSchema),
    defaultValues: { projectName: '', printTime: '0', ... }
  });

  const onSubmit = (data: FDMFormData) => {
    const quote = calculateFDMQuote({
      formData: data,
      material,
      machine,
      electricityRate,
      laborRate,
    });
    useBatchQuote().addItem(quote);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField control={form.control} name="projectName" render={...} />
      {/* ... */}
    </form>
  );
};
```

**Key Points:**
- Always use `zodResolver` for validation
- `defaultValues` from props or hooks
- `onSubmit` should calculate quotes and add to batch
- Calculator forms auto-save drafts to localStorage and expose a Reset Quote button
- FDM no longer relies on top-level material/color selection; material mapping happens per detected filament row from parsed G-code.

### 2. Upload Components

**Pattern:** Handle FileList → Parse → Auto-fill form

**Example:** `GcodeUpload.tsx`

```tsx
const GcodeUpload = ({ onParsed }: { onParsed: (data: GcodeData) => void }) => {
  const handleFileSelect = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.name.endsWith('.3mf')) {
        const data = await parse3mf(file);
        onParsed(data);
      } else if (file.name.endsWith('.gcode')) {
        const text = await file.text();
        const data = parseGcode(text);
        onParsed(data);
      }
    }
  };

  return (
    <input
      type="file"
      accept=".gcode,.3mf"
      onChange={(e) => handleFileSelect(e.currentTarget.files!)}
      multiple
    />
  );
};
```

**Key Points:**
- Accept multiple files
- Parse each file asynchronously
- Callback with parsed data to parent
- Display ThumbnailPreview if thumbnail available

### 3. Dialog Components

**Pattern:** Controlled modal with form data + callbacks

**Example:** `CustomerDetailsDialog.tsx`

```tsx
interface CustomerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSave: (customer: Customer) => void;
}

export const CustomerDetailsDialog = ({
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerDetailsDialogProps) => {
  const form = useForm<Customer>({
    defaultValues: customer || { name: '', email: '' }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => {
          onSave(data);
          onOpenChange(false);
        })}>
          {/* Form fields */}
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

**Key Points:**
- Props: `open`, `onOpenChange`, optional `defaultValues`, `onSave` callback
- Close dialog on successful submit
- Form validation with Zod

### 4. List/Table Components

**Pattern:** Display data array + row actions

**Example:** `SavedQuotesTable.tsx`

```tsx
interface SavedQuotesTableProps {
  quotes: QuoteData[];
  onEdit: (quote: QuoteData) => void;
  onDelete: (id: string) => void;
}

export const SavedQuotesTable = ({ quotes, onEdit, onDelete }: SavedQuotesTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Total Price</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((quote) => (
          <TableRow key={quote.id}>
            <TableCell>{quote.projectName}</TableCell>
            <TableCell>{quote.printType}</TableCell>
            <TableCell>${quote.totalPrice}</TableCell>
            <TableCell>
              <Button onClick={() => onEdit(quote)}>Edit</Button>
              <Button onClick={() => onDelete(quote.id!)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

**Key Points:**
- Accept data array as prop
- Callback functions for actions (edit, delete, export)
- Use unique `key` (quote.id)
- Use Shadcn `Table` components

### Quote Summary Header

**Component:** [src/components/quotes/QuoteSummary.tsx](../src/components/quotes/QuoteSummary.tsx)

- The calculator summary header highlights **Profit** (`quote.markup`) rather than print type.
- This keeps the primary KPI visible during quote creation.

## Layout System: Left Sidebar Navigation

### Calculator Page Architecture

**File:** [src/pages/Index.tsx](../src/pages/Index.tsx)

The main calculation page uses a **modern left sidebar navigation design** with dark green-blue theme:

**Structure:**
- **Left Sidebar** (256px fixed width, sticky, always visible):
  - Dark gradient: `from-slate-950 via-slate-900 to-slate-900`
  - Border and accents: Emerald (`emerald-900/30`) and cyan
  - Organized navigation sections: Calculator, Management, Settings
  - Sticky footer with currency, theme toggle, and reset button
  - FDM/Resin tab buttons toggle calculator type in-place

- **Main Content Area** (flex-1, scrollable):
  - Header bar with page title and live profit chip
  - Stats dashboard (only if quotes exist)
  - Calculator form card (responsive grid 1fr/380px split on desktop)
  - Quote summary card (sticky, right sidebar on desktop)
  - Recent quotes table (below, full width)

**Color Scheme:**
- **Primary:** Emerald green (`emerald-{300,400,500,600,950}`)
- **Secondary:** Cyan blue (`cyan-{300,400,500,600,950}`)
- **Backgrounds:** Deep slate (`slate-{900,950}`)
- **Active states:** Gradient fill `from-emerald-600/30 to-cyan-600/30` with `border-emerald-500/40`
- **Hover states:** Background `slate-800/50` with emerald/cyan text lift
- **Borders:** Subtle `emerald-900/20` for section dividers

**Key UX Features:**
- Sidebar remains sticky on scroll (doesn't disappear)
- All fields present: form inputs, file upload, consumables, labor selections
- Tab switching is instant (FDM/Resin) without page reload
- Profit chip updates live as user inputs data
- Recent quotes preview (first 5) visible on main page
- "View Full History" link for complete quote archive

**Why This Layout?**
- Professional desktop app appearance with clear navigation
- Dark theme reduces eye strain in production environments
- Sidebar tabs prevent scattered click targets (compare to top tabs)
- Right-sidebar quote summary keeps profit KPI in user's active viewport during calculation
- Nested sections (Calculator / Management / Settings) provide logical grouping

### Calculator Page Header

**Sidebar Navigation Tabs:**
- **FDM Printing** and **Resin Printing** tabs in left sidebar (not top header)
- Clicking either tab switches calculator content (left main area) instantly
- Active tab highlighted with gradient background and emerald border
- Icon styling: `Printer` icon for both (can be replaced with print type icons)

**Main Header Bar** (above calculator content):
- Displays current mode: "FDM Calculator" or "Resin Calculator"
- Subtitle: "Professional 3D printing cost estimation"
- Right side shows live profit chip (only visible when quote is calculated)
- Gradient background matching sidebar theme

### Settings Console Architecture

**File:** [src/pages/Settings.tsx](../frontend/src/pages/Settings.tsx)

The settings experience uses an **Index-style left sidebar layout** with grouped navigation and a dedicated content workspace:

- **Left Sidebar (sticky)**
  - Dark gradient shell matching the calculator page visual language
  - Grouped navigation sections: `Print Setup`, `Business`, `Workspace`
  - Active item uses emerald/cyan gradient state and border (same style family as Index sidebar)

- **Sidebar Footer Utilities**
  - Printer connection action with truncation-safe status text
  - Currency selector and back-to-calculator action

- **Main Content Workspace**
  - Sticky dark header with section icon, title, group badge, and description
  - Content card renders the active settings manager component
  - Export/Import remains below the main settings card

- **Navigation Behavior**
  - URL query param (`?tab=`) remains the source of truth for active section
  - Invalid or missing tab value falls back to `materials`
  - Sidebar labels use truncation-safe text to prevent overflow

**Why this pattern works:**
- Matches the primary app shell users already know from [src/pages/Index.tsx](../src/pages/Index.tsx)
- Keeps navigation persistent while users work in deep settings forms
- Improves visual consistency between Calculator and Settings experiences
- Preserves all existing settings modules without changing business behavior

### Quotes Dashboard Cards

**Component:** [src/components/dashboard/QuotesDashboard.tsx](../src/components/dashboard/QuotesDashboard.tsx)

- Replaced the old `Print Types` card with `Profit Made`.
- `Profit Made` uses aggregated quote markup (`stats.totalProfit`).

### Saved Quotes Displays

**Files:**
- [src/components/quotes/SavedQuotesTable.tsx](../src/components/quotes/SavedQuotesTable.tsx)
- [src/components/saved-quotes/QuoteDetailsDialog.tsx](../src/components/saved-quotes/QuoteDetailsDialog.tsx)
- [src/lib/pdfGenerator.ts](../src/lib/pdfGenerator.ts)

- Replaced user-facing `Print Type` display slots with `Profit Made` on saved-quote table/details and generated PDF project details.
- `Profit Made` uses quote-level markup (`quote.markup`).
- `QuoteDetailsDialog` now renders color chips from mapped filament data (`toolBreakdown`/`colorUsages`) and shows a **Filament Mapping** list (tool + swatch + material).
- Color parsing in details viewer accepts both comma- and semicolon-separated color strings for legacy quotes.
- `QuoteDetailsDialog` uses a wider rectangular, two-column layout with a scrollable cost panel to keep long quotes readable without excessive modal height.

### Machines Manager

**Settings:** [src/components/settings/MachinesManager.tsx](../src/components/settings/MachinesManager.tsx)

- Machine hourly cost is calculated from: machine price, hours per day usage, life time (years), and maintenance percentage.
- The form shows a read-only calculated hourly cost field.
- Stored machine data includes both inputs and the calculated `hourly_cost` used in calculations.

### Recyclable Manager

**Settings:** [src/components/settings/RecyclableManager.tsx](../src/components/settings/RecyclableManager.tsx)

- Shows recyclable plastic totals by color across saved multicolor G-code projects.
- Breaks totals into support, tower, flush, and combined recyclable grams.
- Uses `HexColorSwatch` for color display with hover details.
- Includes inventory context columns by color:
  - `In Stock (g)` (aggregated from FDM spools)
  - `Surplus (g)` = stock - recyclable total

### FDM Filament Mapping Table

**Calculator:** [src/components/calculator/FDMCalculatorTable.tsx](../src/components/calculator/FDMCalculatorTable.tsx)

- Displays one row per detected tool (`T0`, `T1`, ...).
- Each row shows Creality-style grams columns: `Model`, `Support`, `Tower`, `Flush`, `Total`.
- Each row includes mapping controls:
  - **Your Spool** (optional): map to owned spool/inventory entry.
  - **Material** (required): map parsed filament to catalog material (auto-filled when possible, editable manually).
- Quote validation now expects all detected filaments to have mapped materials.

### Stock Management Page

**File:** [src/pages/StockManagement.tsx](../src/pages/StockManagement.tsx)

**Purpose:** Track inventory from completed print jobs with manual sales/removal workflow.

**UX Features:**
- **Stats Cards** (top): Display IN_STOCK count/value, SOLD count/value, RESERVED count/value, and total portfolio value
- **Current Inventory Table**: Lists all IN_STOCK items with columns: Project, Type, Material, Color (swatch), Qty, Unit Price, Total Value, Created Date, Actions
- **Actions per Item**:
  - **Sell Button** → Opens modal to specify sold quantity and mark as SOLD
  - **Delete Button** → Permanently removes stock entry
- **Sold Items History Table** (below): Shows all SOLD items in muted style, tracking sales record
- **Sell Dialog**: Simple form to enter sold quantity (with validation: can't exceed available units)

**Integration with Quote Workflow:**
- When a ProductionJob moves to `'completed'` status in PrintManagement Kanban, the `ProductionProvider` automatically calls `sessionStore.addToStock()`, creating a new StockItem
- User sees toast notification: "Stock entry created from completed job"
- No manual action needed—all completed jobs appear here automatically

**Color Swatches:**
- Uses `HexColorSwatch` component to display material color with tooltip on hover
- Shows HEX, RGB, HSL, alpha, and decimal values in tooltip

**Storage:**
- All stock data persists to localStorage under `STOCK` key
- Recovery from app crash/reload is automatic

### Hex Color Display Pattern

**Component:** [src/components/shared/HexColorSwatch.tsx](../src/components/shared/HexColorSwatch.tsx)

- Use this component wherever a hex color value is displayed in the UI.
- Renders a color circle and provides hover tooltip details including:
  - HEX
  - RGB
  - HSL
  - Alpha
  - Decimal value
- If value is not a valid hex color, it safely falls back to plain text.

### 6. Labor Items & Tasks

**Global Labor Settings:** [src/components/settings/SettingsLabor.tsx](../src/components/settings/SettingsLabor.tsx)

- Manage the global catalog of labor items (name/type/pricing model/rate).
- Each labor item can define default consumables (cost constants) and equipment (machines) per unit.

**Employee Allow List:** [src/components/settings/SettingsEmployee.tsx](../src/components/settings/SettingsEmployee.tsx)

- Each employee selects allowed labor items by ID.
- Calculators filter labor options based on the assigned employee.

**Calculator Labor Tasks:**
- [src/components/calculator/FDMCalculatorTable.tsx](../src/components/calculator/FDMCalculatorTable.tsx)
- [src/components/calculator/ResinCalculatorTable.tsx](../src/components/calculator/ResinCalculatorTable.tsx)
- `Assigned Employee` controls allowed labor items.
- Users add labor tasks with: labor item, units (hours or quantity), consumables, and equipment hours.
- Each task is a structured entry in `laborSelections`.

### 5. Context Consumer Hook Pattern

**Pattern:** Wrap useContext in custom hook with error boundary

**Example:** `useBatchQuote.ts`

```tsx
export const useBatchQuote = () => {
  const context = useContext(BatchQuoteContext);
  if (!context) {
    throw new Error('useBatchQuote must be used within BatchQuoteProvider');
  }
  return context;
};
```

**Usage in component:**
```tsx
const MyComponent = () => {
  const { batchItems, addItem } = useBatchQuote(); // Throws if outside provider
  // Safe to use
};
```

## Shadcn UI Component Usage

All UI components from `components/ui/` are auto-generated by Shadcn CLI. **Never manually edit UI component files.**

**To add new Shadcn component:**
```bash
npx shadcn-ui@latest add button
```

This generates `components/ui/button.tsx`.

**Common DRY pattern for recurring UI:**
```tsx
// Don't: Hardcoded styles across components
<div className="flex items-center justify-between p-4 border rounded">

// Do: Create custom component
// components/shared/CardHeader.tsx
export const CardHeader = ({ children }) => (
  <div className="flex items-center justify-between p-4 border rounded">
    {children}
  </div>
);
```

## Responsive Design Patterns

**Tailwind breakpoints** (defined in `tailwind.config.ts`):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Mobile-first approach:**
```tsx
// Bad: Desktop first
<div className="grid grid-cols-4 sm:grid-cols-2 xs:grid-cols-1">

// Good: Mobile first
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
```

## Performance Optimization

### 1. Lazy Load Pages
**File:** `App.tsx`

```tsx
const Index = lazy(() => import("./pages/Index"));
const Settings = lazy(() => import("./pages/Settings"));

// In route rendering:
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

### 2. Memoization
**Use `useMemo` for expensive computations:**
```tsx
const filteredQuotes = useMemo(
  () => quotes.filter(q => q.printType === type),
  [quotes, type]
);
```

**Use `memo()` for expensive renders:**
```tsx
export const QuoteCalculator = memo(({ loading, onCalculate, children }: Props) => {
  // Won't re-render unless props change
  return <div>{children}</div>;
});
```

### 3. Code Splitting (Vite)
**Manual chunk definition** in `vite.config.ts`:
```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-charts': ['recharts'],
}
```

## Styling Conventions

### Tailwind Usage
```tsx
// Good: Semantic, readable
<div className="flex flex-col gap-4 p-6 rounded-lg border border-border shadow-md">

// Bad: Too many classes (extract to component)
<div className="flex flex-col gap-4 p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow">
  <div className="flex flex-col gap-4 p-6 rounded-lg border border-border shadow-md">
    {/* Repeated style pattern */}
  </div>
</div>

// Better: Extract component
const Card = ({ children }) => (
  <div className="flex flex-col gap-4 p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow">
    {children}
  </div>
);
```

### Dark Mode
Shadcn UI + Tailwind support dark mode via `dark:` prefix:
```tsx
<div className="bg-white dark:bg-slate-950">
  Light mode white, dark mode slate-950
</div>
```

## Common Mistakes

### ❌ Direct localStorage Access
```tsx
// Bad
const quotes = JSON.parse(localStorage.getItem('quotes')!);

// Good
import * as sessionStore from '@/lib/core/sessionStorage';
const quotes = sessionStore.getSavedQuotes();
```

### ❌ Missing Error Boundaries
```tsx
// Bad: Unhandled errors crash app
<MyComponent />

// Good
<ErrorBoundary fallback={<ErrorMessage />}>
  <MyComponent />
</ErrorBoundary>
```

### ❌ Prop Drilling Too Deep
```tsx
// Bad: Multiple levels passing props
<Page>
  <Section quote={quote}>
    <Card quote={quote}>
      <Details quote={quote}>
        <Price price={quote.totalPrice} />
      </Details>
    </Card>
  </Section>
</Page>

// Good: Use context for deeply nested needs
const Price = () => {
  const { quote } = useContext(QuoteContext);
  return <span>${quote.totalPrice}</span>;
};
```

## Testing Components

No unit test framework configured, but recommended pattern:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event
```

**Example test:**
```typescript
import { render, screen } from '@testing-library/react';
import { QuoteSummary } from '@/components/quotes/QuoteSummary';

describe('QuoteSummary', () => {
  it('displays total price', () => {
    const quote = { totalPrice: 99.99, projectName: 'Test' };
    render(<QuoteSummary quote={quote} />);
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
```
