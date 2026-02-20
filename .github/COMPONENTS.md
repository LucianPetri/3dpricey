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
