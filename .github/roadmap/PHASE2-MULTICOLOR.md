# Phase 2: Multi-Color Filament Support

**Phase:** Feature Enhancement  
**Depends On:** Phase 1 (PostgreSQL infrastructure)  
**Duration:** 2-3 weeks  
**Status:** Planning  

---

## Overview

Currently, 3DPricey treats each print as using a **single filament type**. Phase 2 adds support for prints with **multiple filament colors/materials**.

### Example Use Case
```
Print: Articulated Dragon (multi-color)
├─ Head & Body: 150g PLA Black @ $20/kg = $3.00
├─ Eyes: 25g PLA White @ $20/kg = $0.50
├─ Accents: 50g PETG Red @ $25/kg = $1.25
└─ Total Material Cost: $4.75
```

### Why This Matters
1. **Popular technique** – Many FDM printers support filament changes
2. **Accurate costing** – Different materials have different prices
3. **Inventory tracking** – Track which spools used for which jobs
4. **Quality control** – Record material sources by color

---

## Phase 1 Prerequisite: Database Table

**Added in Phase 1 schema** (`backend/prisma/schema.prisma`):

```prisma
model QuoteFilament {
  id        String    @id @default(cuid())
  quoteId   String
  quote     Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  materialId String    // Link to Material (PLA Red, PETG Blue, etc.)
  weightGrams Float     // How many grams of THIS material
  order       Int       // 1st, 2nd, 3rd filament in sequence
  
  createdAt DateTime  @default(now())
}
```

**Quote model updated:**
```prisma
model Quote {
  // ...existing fields...
  
  // Phase 2: Multi-color support
  quoteFilaments    QuoteFilament[]  // New: Array of filaments
  
  // BACKWARDS COMPATIBLE: Keep single-filament fields for existing quotes
  filamentWeight    Float?    // Still supported for single-color
  printTime         Float?
}
```

---

## Feature Specification

### 1. Data Model: FilamentComposition

**File:** `src/types/quote.ts` (Update existing)

```typescript
// Represent a single filament material used in print
export interface FilamentMaterial {
  materialId: string;  // Reference to Material object
  name: string;        // Material name (e.g., "PLA Black")
  costPerUnit: number; // $/kg
  weightGrams: number; // How much used in THIS print
  order: number;       // 1st, 2nd, 3rd filament
}

// Composition: All filaments for a single print
export interface FilamentComposition {
  filaments: FilamentMaterial[];
  totalWeightGrams: number;      // Sum of all weights
  totalMaterialCost: number;     // Sum of all costs
  hasColorChanges: boolean;      // Parsed from G-code?
}

// Updated: FDMFormData includes filament array
export interface FDMFormData {
  // ...existing...
  
  filamentWeight: string;  // DEPRECATED: Single filament (phase 1 compatibility)
  
  // NEW: Multi-color support
  filaments?: FilamentComposition;         // Array of filament materials
  filamentChangeCode?: string;             // G-code marker for color changes
  useMultiColor?: boolean;                 // Toggle multi-color mode
}
```

### 2. Database API Endpoints

**POST /api/quotes** (Enhanced)
```json
Request:
{
  "projectName": "Dragon Figurine",
  "printType": "FDM",
  "filaments": [
    {
      "materialId": "mat_001",
      "order": 1,
      "weightGrams": 150,
      "costPerUnit": 20
    },
    {
      "materialId": "mat_002",
      "order": 2,
      "weightGrams": 75,
      "costPerUnit": 20
    }
  ],
  // ...other fields...
}

Response:
{
  "id": "quote_123",
  "filaments": [
    { "materialId": "mat_001", "weightGrams": 150, "order": 1 },
    { "materialId": "mat_002", "weightGrams": 75, "order": 2 }
  ],
  "materialCost": 5.50,  // (150 * 20 + 75 * 20) / 1000
  // ...rest of quote...
}
```

**GET /api/quotes/:id** (Enhanced Response)
```json
{
  "id": "quote_123",
  "projectName": "Dragon Figurine",
  "filaments": [
    {
      "id": "qf_001",
      "quoteId": "quote_123",
      "materialId": "mat_001",
      "weightGrams": 150,
      "order": 1,
      "material": {  // Populated
        "id": "mat_001",
        "name": "PLA Black",
        "costPerUnit": 20
      }
    },
    {
      "id": "qf_002",
      "quoteId": "quote_123",
      "materialId": "mat_002",
      "weightGrams": 75,
      "order": 2,
      "material": {
        "id": "mat_002",
        "name": "PETG Red",
        "costPerUnit": 25
      }
    }
  ],
  "materialCost": 5.50,
  // ...rest...
}
```

**DELETE /api/quotes/:id/filaments/:filamentId**
```
Remove a single filament from quote
Response: Updated Quote
```

### 3. G-Code Parser Enhancement

**File:** `src/lib/parsers/gcodeParser.ts` (Update)

Add color change detection:

```typescript
export interface GcodeData {
  // ...existing...
  
  // NEW: Multi-color support
  filamentChanges?: FilamentChange[];
  colorSequence?: string[];  // ["Black", "Red", "White"]
}

export interface FilamentChange {
  line: number;              // G-code line number
  weight: number;            // Estimated grams consumed before this change
  gcode: string;             // The actual color change line
  parsedColor?: string;      // Extracted color (if detected)
}

// Color change patterns (multiple slicers)
const colorChangePatterns = [
  // Prusa: tool change
  /;TOOL_CHANGE/i,
  /M600/,  // Standard filament change command
  
  // Custom comment format
  /;COLOR_CHANGE\s*:\s*(.+)/i,
  /;FILAMENT_CHANGE\s*:\s*(.+)/i,
  
  // Cura multi-material
  /;NOZZLE INDEX/i,
  /M109\s+S\d+\s+;TEMP/i,
];

export function parseGcode(content: string): GcodeData {
  // ...existing parsing...
  
  // NEW: Detect filament changes
  const filamentChanges: FilamentChange[] = [];
  let currentWeight = 0;
  let lineNumber = 0;
  
  const lines = content.split('\n');
  for (const line of lines) {
    lineNumber++;
    
    for (const pattern of colorChangePatterns) {
      if (pattern.test(line)) {
        // Extract color if available
        const colorMatch = line.match(/;COLOR_CHANGE\s*:\s*(.+)/i);
        filamentChanges.push({
          line: lineNumber,
          weight: currentWeight,
          gcode: line,
          parsedColor: colorMatch?.[1]
        });
        break;
      }
    }
    
    // Track filament consumption (estimate)
    const eMatch = line.match(/E([\d.]+)/);
    if (eMatch) {
      const eValue = parseFloat(eMatch[1]);
      // Convert extrusion value to weight (rough estimate)
      // Typical: 1.75mm filament, density ~1.25 g/cm³
      currentWeight += (eValue / 10);
    }
  }
  
  return {
    // ...existing...
    filamentChanges,
    colorSequence: filamentChanges.map(fc => fc.parsedColor || 'Unknown')
  };
}
```

### 4. UI Components: Filament Composition Form

**File:** `src/components/calculator/FilamentCompositionForm.tsx` (New)

```tsx
interface FilamentCompositionFormProps {
  isMultiColor: boolean;
  onToggle: (enabled: boolean) => void;
  filaments: FilamentMaterial[];
  onAddFilament: (filament: FilamentMaterial) => void;
  onRemoveFilament: (order: number) => void;
  materials: Material[];
}

export const FilamentCompositionForm = ({
  isMultiColor,
  onToggle,
  filaments,
  materials,
}: FilamentCompositionFormProps) => {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [weight, setWeight] = useState('');

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center gap-2">
        <Checkbox
          id="multicolor"
          checked={isMultiColor}
          onCheckedChange={onToggle}
        />
        <Label htmlFor="multicolor">Multi-Color Filament</Label>
      </div>

      {isMultiColor && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold">Filament Composition</h3>
            
            {filaments.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <span className="text-sm font-medium w-8">#{f.order}</span>
                <span className="flex-1">{f.name}</span>
                <span className="text-sm">{f.weightGrams}g</span>
                <span className="text-sm font-semibold">${f.weightGrams * f.costPerUnit / 1000}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFilament(f.order)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Add Filament</h3>
            <div className="space-y-2">
              <Select value={selectedMaterial?.id} onValueChange={...}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Weight (grams)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />

              <Button onClick={() => {
                if (selectedMaterial && weight) {
                  onAddFilament({
                    materialId: selectedMaterial.id,
                    name: selectedMaterial.name,
                    costPerUnit: selectedMaterial.cost_per_unit,
                    weightGrams: parseInt(weight),
                    order: filaments.length + 1
                  });
                  setWeight('');
                }
              }}>
                Add to Composition
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

### 5. Cost Calculation Update

**File:** `src/lib/quoteCalculations.ts` (Modify `calculateFDMQuote`)

```typescript
export const calculateFDMQuote = ({
  formData,
  material,  // Now this is optional/default
  machine,
  electricityRate,
  laborRate,
  consumables = [],
  paintConsumable,
  paintConsumable2,
  customerId,
  clientName,
}: FDMCalculationInput): QuoteData => {
  // Handle multi-color NEW
  let materialCost = 0;
  let totalFilamentWeight = 0;

  if (formData.filaments && formData.filaments.filaments.length > 0) {
    // Multi-color mode
    materialCost = formData.filaments.filaments.reduce((sum, f) => {
      totalFilamentWeight += f.weightGrams;
      return sum + (f.weightGrams / 1000) * f.costPerUnit;
    }, 0);
  } else {
    // Single-color mode (backwards compatible)
    const filamentWeightKg = parseFloat(formData.filamentWeight) / 1000;
    totalFilamentWeight = parseFloat(formData.filamentWeight);
    materialCost = filamentWeightKg * material.cost_per_unit;
  }

  // Rest of calculation stays the same
  const printTimeHours = parseFloat(formData.printTime);
  const machineTimeCost = printTimeHours * machine.hourly_cost;
  // ...rest unchanged...

  return {
    // ...existing fields...
    materialCost: materialCost * quantity,
    // Track filament detail
    parameters: {
      filamentComposition: formData.filaments,
      totalFilamentGrams: totalFilamentWeight
    }
  };
};
```

### 6. 3MF Model Surface Area Extraction

When user uploads 3MF file with multi-color, also extract filament count from model metadata:

```typescript
export async function parse3mf(file: File): Promise<GcodeData> {
  const zip = new JSZip();
  await zip.loadAsync(file);

  // Extract model.xml
  const modelFile = zip.file('3D/3dmodel.model');
  const modelText = await modelFile?.async('text');
  
  // Parse color/filament references
  const filamentMatches = modelText?.match(/<object id="(\d+)"[^>]*resourceid="(\d+)"[^>]*>/g) || [];
  const colorCount = filamentMatches.length;

  // Extract embedded G-code if present
  const metadataMeta = zip.file('Metadata/Cura/GCode');
  const gcodeText = await metadataMeta?.async('text');

  if (gcodeText) {
    return parseGcode(gcodeText);
  }

  // Return estimation
  return {
    printTimeHours: 0,
    filamentWeightGrams: 0,
    thumbnail: extractThumbnail(zip),
    // NEW:
    colorSequence: Array(colorCount).fill('Multi-color'),
    filamentChanges: []
  };
}
```

---

## Implementation Checklist

### Database & API (Week 1)
- [ ] Add `QuoteFilament` model to Prisma schema
- [ ] Create database migration
- [ ] Update Quote controller to handle filaments array
- [ ] Add endpoints: POST, PUT, DELETE for filaments
- [ ] Write API tests for multi-color quotes

### Backend Services (Week 1-2)
- [ ] Update `calculateFDMQuote` to handle filament arrays
- [ ] Create `FilamentService` for filament operations
- [ ] Add filament validation (weight, materials exist)
- [ ] Update inventory consumption logic (track per-filament)

### Parser Enhancement (Week 2)
- [ ] Add color change detection to G-code parser
- [ ] Update 3MF parser for multi-color detection
- [ ] Write parser tests with sample multi-color files
- [ ] Update `PARSING.md` documentation

### UI Components (Week 2)
- [ ] Create `FilamentCompositionForm` component
- [ ] Update `FDMCalculatorTable` to show multi-color section
- [ ] Add toggle for multi-color mode
- [ ] Display filament composition in quote summary
- [ ] Update `COMPONENTS.md` with new patterns

### Testing (Week 3)
- [ ] Unit tests for cost calculation with multiple filaments
- [ ] Integration tests: G-code upload with color changes
- [ ] E2E test: Create multi-color quote → Save → Export
- [ ] Backwards compatibility test (single-color still works)

### Documentation (Week 3)
- [ ] Update `CALCULATIONS.md` with multi-color formulas
- [ ] Update `PARSING.md` with color change detection
- [ ] User guide: How to use multi-color feature
- [ ] API documentation examples

---

## Backwards Compatibility

Single-color quotes (existing) continue to work:

```typescript
// Old way (still works)
{
  filamentWeight: "200",
  materialId: "pla_001"
}

// New way
{
  filaments: {
    filaments: [
      { materialId: "pla_001", weightGrams: 200, order: 1 }
    ]
  }
}
```

**Migration:** When loading old quotes from database, wrap single filament into composition:
```typescript
if (quote.filamentWeight && !quote.filaments) {
  quote.filaments = {
    filaments: [
      {
        materialId: quote.materialId,
        weightGrams: quote.filamentWeight,
        order: 1
      }
    ]
  };
}
```

---

## Test Cases

### Test 1: Multi-color Quote Calculation
```typescript
const filaments = [
  { materialId: 'pla_black', costPerUnit: 20, weightGrams: 100 },
  { materialId: 'pla_red', costPerUnit: 20, weightGrams: 50 }
];
// Expected materialCost = (100 + 50)/1000 * 20 = $3.00
```

### Test 2: G-code Color Change Detection
```typescript
const gcodeWithChanges = `
;COLOR_CHANGE: Red
G1 Z10
;COLOR_CHANGE: Blue
G1 Z20
`;
// Expected filamentChanges.length = 2
```

### Test 3: 3MF Multi-color Detection
```typescript
// Upload 3MF with 3 different material indices
// Parser should detect 3 colors
// Show UI prompt: "3 filaments detected. Configure?"
```

---

## Success Criteria

✅ Multi-color quotes calculate correctly  
✅ G-code parser detects color changes  
✅ UI allows adding/removing filaments  
✅ Inventory tracks per-filament consumption  
✅ Backwards compatible with single-color  
✅ All tests pass  
✅ Documentation updated
