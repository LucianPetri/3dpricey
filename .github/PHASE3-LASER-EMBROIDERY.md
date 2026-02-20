# Phase 3: Laser & Embroidery Print Types

**Phase:** Print Type Expansion  
**Depends On:** Phase 1 (PostgreSQL), Phase 2 (Multi-color optional but recommended)  
**Duration:** 5-7 weeks  
**Status:** Planning  

---

## Overview

Phase 3 adds two new dimensions to 3DPricey, expanding from 2 print types (FDM, Resin) to 4:

1. **FDM** – Filament-based 3D printing (existing)
2. **Resin** – SLA/DLP resin printing (existing)
3. **Laser** – Laser cutting/engraving (NEW) ← High demand
4. **Embroidery** – Digital embroidery (NEW) ← Emerging market

### Market Context

**Laser:**
- Most common in maker spaces after 3D printing
- Wide range of materials (wood, acrylic, leather, metal marking)
- Ramp-up in design/cutting shops
- Easily calculated costs (material + time)

**Embroidery:**
- Growing market for personalized goods
- High-margin service
- Thread-based consumables tracking
- Labor-intensive (thread changes, hoop adjustments)

---

## Unified Print Type Architecture

### 1. Type System (Update `src/types/quote.ts`)

```typescript
// Unified print type definition
export type PrintType = 'FDM' | 'Resin' | 'Laser' | 'Embroidery';

// Each type has its own form data
export type PrintFormData = FDMFormData | ResinFormData | LaserFormData | EmbroideryFormData;
export type CalculationInput = FDMCalculationInput | ResinCalculationInput | LaserCalculationInput | EmbroideryCalculationInput;

// Base interface (common to all)
export interface BasePrintData {
  id?: string;
  projectName: string;
  printColour: string;
  printType: PrintType;
  quantity: number;
  customerId?: string;
  clientName?: string;
  notes?: string;
  // Cost breakdown (same for all types)
  materialCost: number;
  machineTimeCost: number;
  laborCost: number;
  overheadCost: number;
  subtotal: number;
  markup: number;
  totalPrice: number;
  unitPrice: number;
  createdAt?: string;
  // Kanban/production
  status?: QuoteStatus;
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
}

// FDM: Existing, no changes
export interface FDMFormData extends BasePrintData {
  // All existing FDM fields...
}

// Resin: Existing, no changes
export interface ResinFormData extends BasePrintData {
  // All existing Resin fields...
}

// LASER: New
export interface LaserFormData extends BasePrintData {
  printType: 'Laser';
  machineId: string;
  materialId: string;
  // Design file upload
  designFile?: File;           // SVG, PDF, DXF
  designPath?: string;         // Path to uploaded file
  // Design properties
  designWidth: string;         // mm
  designHeight: string;        // mm
  estimatedCutTime: string;    // minutes
  estimatedEngravingTime?: string; // minutes (optional)
  // Material & labor
  materialSurfaceArea: string; // cm² (for sheet material cost)
  laborHours: string;          // Design prep, setup
  laserPower?: string;         // watts (if available)
  // Consumables
  selectedConsumableIds: string[]; // Nozzle cleaning, focus lens maintenance
  // Special settings
  focusLensReplacement?: boolean;
  laserTubeAge?: string;       // months (for maintenance cost)
}

// EMBROIDERY: New
export interface EmbroideryFormData extends BasePrintData {
  printType: 'Embroidery';
  machineId: string;           // Embroidery machine
  // Design file
  designFile?: File;           // .pes, .exp, .jef, etc.
  designPath?: string;
  // Design properties
  stitchCount: string;         // Total stitches (extracted from file)
  designWidth: string;         // mm
  designHeight: string;        // mm
  estimatedEmbroideryTime: string; // minutes
  // Material & labor
  baseGarmentCost: string;     // Cost of item being embroidered
  threadColors: string;        // Number of different thread colors
  selectedThreadIds: string[]; // Thread materials used
  selectedBackingId?: string;  // Stabilizer type
  // Labor
  laborHours: string;          // Hoop changes, setup, finishing
  // Consumables
  needleSize?: string;         // Size used (affects cost)
  selectedConsumableIds: string[];
}

// Update QuoteData union
export type QuoteData = BasePrintData & (FDMFormData | ResinFormData | LaserFormData | EmbroideryFormData);
```

### 2. Database Schema Updates

**File:** `backend/prisma/schema.prisma` (Add)

```prisma
// Laser-specific material properties
model LaserMaterial {
  id        String    @id @default(cuid())
  materialId String   // Reference to Material
  
  // Laser parameters
  cutSpeed      Float?  // mm/min
  engravingSpeed Float?
  power         Float?  // watts
  frequency     Float?  // Hz
  
  metadata      Json?   // Custom properties
}

// Embroidery-specific materials
model ThreadType {
  id        String    @id @default(cuid())
  companyId String
  
  name            String  // "Polyester Navy Blue"
  costPerSpool    Float   // $/1000 yards
  density         Float?  // g/1000 yards
  color           String  // Hex color for UI
  
  Orders: EmbroideryQuote[]
}

model BackingMaterial {
  id        String    @id @default(cuid())
  companyId String
  
  name            String       // "Tear-Away White"
  costPerSheet    Float
  sheetSizeMm2    Float
}

// Extend Quote for type-specific data
model Quote {
  // ...existing...
  
  // Type-specific data (JSON for flexibility)
  laserData     LaserQuoteData?    @relation(name: "LaserQuote")
  embroideryData EmbroideryQuoteData? @relation(name: "EmbroideryQuote")
}

model LaserQuoteData {
  id        String    @id @default(cuid())
  quoteId   String    @unique
  quote     Quote     @relation(name: "LaserQuote", fields: [quoteId], references: [id], onDelete: Cascade)
  
  // Design
  designPath      String?
  designWidth     Float       // mm
  designHeight    Float       // mm
  estimatedCutTime Float      // minutes
  estimatedEngravingTime Float?
  
  // Material & cost
  materialSurfaceArea Float   // cm²
  laserPower      Float?      // watts
  focusLensReplacement Boolean @default(false)
  laserTubeAge    Int?        // months
  
  createdAt DateTime  @default(now())
}

model EmbroideryQuoteData {
  id        String    @id @default(cuid())
  quoteId   String    @unique
  quote     Quote     @relation(name: "EmbroideryQuote", fields: [quoteId], references: [id], onDelete: Cascade)
  
  // Design
  designPath          String?
  stitchCount         Int
  designWidth         Float   // mm
  designHeight        Float   // mm
  estimatedEmbroideryTime Float // minutes
  
  // Material & labor
  baseGarmentCost     Float
  threadCount         Int
  needleSize          String?
  backingMaterialId   String?
  
  createdAt DateTime  @default(now())
}
```

---

## Feature 1: Laser Cutting & Engraving

### 1. Laser Cost Calculation

**File:** `src/lib/quoteCalculations.ts` (Add)

```typescript
interface LaserCalculationInput {
  formData: LaserFormData;
  machine: Machine;      // Laser machine
  material: Material;
  electricityRate: number;
  laborRate: number;
  consumables?: ConsumableInfo[];
}

export const calculateLaserQuote = ({
  formData,
  machine,
  material,
  electricityRate,
  laborRate,
  consumables = []
}: LaserCalculationInput): QuoteData => {
  // Material cost: Based on surface area and material price
  const surfaceAreaCm2 = parseFloat(formData.materialSurfaceArea);
  const costPerCm2 = material.cost_per_unit; // $/cm²
  const materialCost = surfaceAreaCm2 * costPerCm2;

  // Machine time cost
  const cutTimeMinutes = parseFloat(formData.estimatedCutTime);
  const engravingTimeMinutes = parseFloat(formData.estimatedEngravingTime || '0');
  const totalTimeMinutes = cutTimeMinutes + engravingTimeMinutes;
  const totalTimeHours = totalTimeMinutes / 60;

  const machineTimeCost = totalTimeHours * machine.hourly_cost;

  // Electricity cost (laser power consumption)
  const laserPowerW = parseFloat(formData.laserPower || '100');
  const powerConsumptionKw = laserPowerW / 1000;
  const electricityCost = totalTimeHours * powerConsumptionKw * electricityRate;

  // Labor cost (design prep, setup, finishing)
  const laborHours = parseFloat(formData.laborHours);
  const laborCost = laborHours * laborRate;

  // Maintenance cost: If laser tube is old, add maintenance
  const laserTubeAge = formData.laserTubeAge ? parseInt(formData.laserTubeAge) : 0;
  const tubeMaintenanceCost = laserTubeAge > 18 ? 50 : 0; // Annual maintenance after 18 months
  
  // Focus lens replacement (consumable)
  const focusLensCost = formData.focusLensReplacement ? 150 : 0;

  // Consumables (cleaning supplies, etc.)
  const consumablesTotal = consumables.reduce((sum, c) => sum + c.value, 0);

  // Total before overhead
  const subtotalBeforeOverhead = 
    materialCost + machineTimeCost + electricityCost + laborCost + 
    consumablesTotal + tubeMaintenanceCost + focusLensCost;

  // Overhead & markup
  const overheadPercentage = 15; // Default 15% for laser operations
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;

  const markupPercentage = parseFloat(formData.markupPercentage || '25');
  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;

  const quantity = formData.quantity || 1;
  const totalPrice = unitPrice * quantity;

  return {
    id: undefined,
    projectName: formData.projectName,
    printColour: formData.printColour,
    printType: 'Laser',
    quantity,
    unitPrice,
    materialCost: materialCost * quantity,
    machineTimeCost: machineTimeCost * quantity,
    electricityCost: electricityCost * quantity,
    laborCost: laborCost * quantity,
    overheadCost: overheadCost * quantity,
    subtotal: subtotal * quantity,
    markup: markup * quantity,
    totalPrice,
    parameters: {
      designDimensions: {
        width: parseFloat(formData.designWidth),
        height: parseFloat(formData.designHeight)
      },
      estimatedCutTime: parseFloat(formData.estimatedCutTime),
      laserPower: parseFloat(formData.laserPower || '0'),
      tubeAge: laserTubeAge
    }
  };
};
```

### 2. Laser File Parser

**File:** `src/lib/parsers/laserFileParser.ts` (New)

```typescript
export interface LaserDesignData {
  width: number;        // mm
  height: number;       // mm
  stitchCount?: number; // For embroidery files mistakenly uploaded
  estimatedCutTime: number; // minutes (estimate)
  estimatedEngravingTime?: number;
  layers?: string[];    // SVG layer names
  fileName?: string;
  filePath?: string;
}

// SVG Parser
export async function parseSvg(file: File): Promise<LaserDesignData> {
  const text = await file.text();
  const parser = new DOMParser();
  const svg = parser.parseFromString(text, 'text/xml');

  // Extract dimensions
  const viewBox = svg.documentElement.getAttribute('viewBox');
  const width = parseFloat(svg.documentElement.getAttribute('width') || '100');
  const height = parseFloat(svg.documentElement.getAttribute('height') || '100');

  if (viewBox) {
    const [, , vbWidth, vbHeight] = viewBox.split(' ').map(parseFloat);
    return {
      width: vbWidth,
      height: vbHeight,
      estimatedCutTime: estimateCutTime(vbWidth, vbHeight),
      fileName: file.name,
      filePath: file.name
    };
  }

  return {
    width,
    height,
    estimatedCutTime: estimateCutTime(width, height),
    fileName: file.name,
    filePath: file.name
  };
}

// PDF Parser (basic)
export async function parsePdf(file: File): Promise<LaserDesignData> {
  // Use PDF.js library (pdfjs-dist)
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });

  return {
    width: viewport.width,
    height: viewport.height,
    estimatedCutTime: estimateCutTime(viewport.width, viewport.height),
    fileName: file.name,
    filePath: file.name
  };
}

// Helper: Estimate cut time based on design area
function estimateCutTime(widthMm: number, heightMm: number): number {
  // Laser cutting speed: ~500 mm/min for acrylic
  // Perimeter estimate: rough for rectangular design
  const perimeterMm = 2 * (widthMm + heightMm);
  const timeMinutes = perimeterMm / 500 * 1.2; // 1.2 safety factor
  return Math.max(1, Math.round(timeMinutes)); // At least 1 minute
}
```

### 3. Laser Calculator UI Component

**File:** `src/components/calculator/LaserCalculatorTable.tsx` (New)

```tsx
export const LaserCalculatorTable = () => {
  const [formData, setFormData] = useState<LaserFormData>({
    projectName: '',
    printColour: '',
    printType: 'Laser',
    machineId: '',
    materialId: '',
    designWidth: '100',
    designHeight: '100',
    estimatedCutTime: '5',
    materialSurfaceArea: '100',
    laborHours: '0.5',
    laserPower: '60',
    quantity: '1',
    selectedConsumableIds: [],
    customerId: '',
    clientName: ''
  });

  const { machines } = useMachines('Laser');
  const { materials } = useMaterials('Laser');
  const { calculateQuote } = useCalculator();

  const handleFileUpload = async (file: File) => {
    if (file.name.endsWith('.svg')) {
      const data = await parseSvg(file);
      setFormData(prev => ({
        ...prev,
        designWidth: data.width.toString(),
        designHeight: data.height.toString(),
        estimatedCutTime: data.estimatedCutTime.toString(),
        designPath: file.name
      }));
    } else if (file.name.endsWith('.pdf')) {
      const data = await parsePdf(file);
      setFormData(prev => ({
        ...prev,
        designWidth: data.width.toString(),
        designHeight: data.height.toString(),
        estimatedCutTime: data.estimatedCutTime.toString(),
        designPath: file.name
      }));
    }
  };

  return (
    <div className="space-y-6">
      <FileUpload
        accept=".svg,.pdf,.dxf"
        onFile={handleFileUpload}
        description="Upload SVG, PDF, or DXF design file"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Project Name" value={formData.projectName} />
        <FormField label="Color/Material" value={formData.printColour} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Machine"
          options={machines}
          value={formData.machineId}
        />
        <SelectField
          label="Material"
          options={materials}
          value={formData.materialId}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Width (mm)" value={formData.designWidth} type="number" />
        <FormField label="Height (mm)" value={formData.designHeight} type="number" />
        <FormField label="Surface Area (cm²)" value={formData.materialSurfaceArea} type="number" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Cut Time (min)" value={formData.estimatedCutTime} type="number" />
        <FormField label="Engr. Time (min)" value={formData.estimatedEngravingTime || ''} type="number" />
        <FormField label="Labor Hours" value={formData.laborHours} type="number" />
      </div>

      <CheckboxField label="Focus Lens Replacement" />

      <QuoteCalculator loading={false} onCalculate={() => {
        const quote = calculateLaserQuote(formData);
        addQuoteToBatch(quote);
      }}>
        {/* Display cost summary */}
      </QuoteCalculator>
    </div>
  );
};
```

---

## Feature 2: Embroidery

### 1. Embroidery Cost Calculation

**File:** `src/lib/quoteCalculations.ts` (Add)

```typescript
export const calculateEmbroideryQuote = ({
  formData,
  machine,
  laborRate,
  threadsCost,
  backingCost,
  consumables = []
}: EmbroideryCalculationInput): QuoteData => {
  // Base garment cost
  const baseGarmentCost = parseFloat(formData.baseGarmentCost);

  // Thread cost: Based on stitch count
  const stitchCount = parseInt(formData.stitchCount);
  const threadYards = stitchCount / 1000; // Rough estimate: 1000 stitches ≈ 1 yard
  const threadCostPerColor = threadYards / 1000 * 2.50; // $2.50 per 1000 yards
  const threadCount = parseInt(formData.threadColors);
  const totalThreadCost = threadCostPerColor * threadCount;

  // Backing material cost
  let backingCost = 0;
  if (formData.selectedBackingId) {
    backingCost = 5; // Typical backing sheet
  }

  // Machine time cost
  const embroideryMinutes = parseFloat(formData.estimatedEmbroideryTime);
  const embroideryHours = embroideryMinutes / 60;
  const machineTimeCost = embroideryHours * machine.hourly_cost;

  // Labor cost (hoop changes, color changes, finishing)
  const laborHours = parseFloat(formData.laborHours);
  const laborCost = laborHours * laborRate;

  // Consumables (needles, thread lubricant, etc.)
  const consumablesTotal = consumables.reduce((sum, c) => sum + c.value, 0);

  // Total before overhead
  const subtotalBeforeOverhead = 
    baseGarmentCost + totalThreadCost + backingCost + 
    machineTimeCost + laborCost + consumablesTotal;

  // Overhead & markup
  const overheadPercentage = 20; // Default 20% for embroidery
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;

  const markupPercentage = parseFloat(formData.markupPercentage || '30');
  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;

  const quantity = formData.quantity || 1;
  const totalPrice = unitPrice * quantity;

  return {
    projectName: formData.projectName,
    printColour: formData.printColour,
    printType: 'Embroidery',
    quantity,
    unitPrice,
    materialCost: (baseGarmentCost + totalThreadCost + backingCost) * quantity,
    machineTimeCost: machineTimeCost * quantity,
    electricityCost: 0, // Minimal for embroidery
    laborCost: laborCost * quantity,
    overheadCost: overheadCost * quantity,
    subtotal: subtotal * quantity,
    markup: markup * quantity,
    totalPrice,
    parameters: {
      stitchCount,
      threadCount,
      baseGarmentCost,
      estimatedEmbroideryTime: embroideryMinutes
    }
  };
};
```

### 2. Embroidery File Parser

**File:** `src/lib/parsers/embroideryFileParser.ts` (New)

```typescript
export interface EmbroideryDesignData {
  stitchCount: number;
  designWidth: number;   // mm
  designHeight: number;  // mm
  estimatedEmbroideryTime: number; // minutes
  threadColors: number;
  fileName?: string;
  filePath?: string;
}

// Parse .pes, .exp, .jef, etc.
export async function parseEmbroideryFile(file: File): Promise<EmbroideryDesignData> {
  const buffer = await file.arrayBuffer();
  
  // Use embroidery-js library (if available) or implement basic parsers
  if (file.name.endsWith('.pes')) {
    return parsePES(buffer);
  } else if (file.name.endsWith('.exp')) {
    return parseEXP(buffer);
  } else if (file.name.endsWith('.jef')) {
    return parseJEF(buffer);
  } else {
    throw new Error('Unsupported file format');
  }
}

function parsePES(buffer: ArrayBuffer): EmbroideryDesignData {
  const view = new DataView(buffer);
  
  // PES file format: Header + stitch data
  // Offset 0-3: "PES" signature
  // Offset 48-49: X extent
  // Offset 50-51: Y extent
  // Offset 52+: Stitch data
  
  const xExtent = view.getInt16(48, true);
  const yExtent = view.getInt16(50, true);
  
  // Count stitches (simplified)
  let stitchCount = 0;
  let offset = 52;
  while (offset < buffer.byteLength - 1) {
    const byte1 = view.getUint8(offset++);
    const byte2 = view.getUint8(offset++);
    
    if (byte1 === 0xFF && byte2 === 0x00) break; // End marker
    stitchCount++;
  }
  
  const embroideryTime = estimateEmbroideryTime(stitchCount);
  
  return {
    stitchCount,
    designWidth: Math.abs(xExtent),
    designHeight: Math.abs(yExtent),
    threadColors: 1, // Would need more complex parsing
    estimatedEmbroideryTime: embroideryTime,
    fileName: 'file.pes'
  };
}

function estimateEmbroideryTime(stitchCount: number): number {
  // Typical embroidery machine: 600-1000 stitches per minute
  // Use 800 as average
  return Math.round(stitchCount / 800);
}
```

### 3. Embroidery Calculator UI

**File:** `src/components/calculator/EmbroideryCalculatorTable.tsx` (New)

Similar to Laser, but with:
- Base garment cost input
- Thread color selector (multiple)
- Backing material dropdown
- Stitch count display (from file)
- Labor hours for hoop changes

---

## Implementation Roadmap

### Week 1-2: Core Architecture
- [ ] Update quote types (unified PrintType)
- [ ] Update database schema (LaserQuoteData, EmbroideryQuoteData)
- [ ] Create database migrations
- [ ] Add material/machine types for Laser & Embroidery
- [ ] Create calculation functions (calculateLaserQuote, calculateEmbroideryQuote)

### Week 2-3: File Parsers
- [ ] Implement SVG parser
- [ ] Implement PDF parser (install pdfjs)
- [ ] Implement embroidery parsers (.pes, .exp, .jef)
- [ ] Write parser tests with sample files
- [ ] Update PARSING.md

### Week 3-4: UI Components
- [ ] Create LaserCalculatorTable component
- [ ] Create EmbroideryCalculatorTable component
- [ ] Update calculator selector UI (4 tabs)
- [ ] Update quote summary to handle all 4 types
- [ ] Update form validation for type-specific fields

### Week 4-5: API & Database
- [ ] Add POST /api/quotes endpoints for Laser & Embroidery
- [ ] Update quote retrieval to load type-specific data
- [ ] Add material library endpoints for new types
- [ ] Database constraint testing

### Week 5-6: Integration & Testing
- [ ] E2E tests: Create laser quote → Export → Print
- [ ] E2E tests: Create embroidery quote
- [ ] Kanban board: Ensure all 4 types work
- [ ] Batch quoting with mixed types
- [ ] Cost calculation verification

### Week 6-7: Documentation & Polish
- [ ] Update CALCULATIONS.md with laser/embroidery formulas
- [ ] Update COMPONENTS.md with new UI patterns
- [ ] Update ROADMAP.md with Phase 3 completion
- [ ] Create user guide for each print type
- [ ] Demo video/walkthrough

---

## Database Setup for Phase 3

Add to seed data:

```typescript
// seed.ts

// Laser materials
const laserMaterials = [
  { name: 'Acrylic (3mm)', costPerUnit: 0.15, printType: 'Laser' }, // per cm²
  { name: 'Plywood (3mm)', costPerUnit: 0.25, printType: 'Laser' },
  { name: 'Leather', costPerUnit: 0.80, printType: 'Laser' },
  { name: 'Stainless Steel (marking)', costPerUnit: 0.05, printType: 'Laser' }
];

// Embroidery materials
const threadTypes = [
  { name: 'Polyester Red', costPerSpool: 5.00 },
  { name: 'Polyester Blue', costPerSpool: 5.00 },
  { name: 'Metallic Gold', costPerSpool: 8.00 }
];

const backingMaterials = [
  { name: 'Tear-Away (white)', costPerSheet: 0.50 },
  { name: 'Stabilizer (tear-away)', costPerSheet: 0.75 }
];

// Machines
const laserMachines = [
  { name: 'CO2 Laser (60W)', hourly_cost: 8.00, printType: 'Laser' },
  { name: 'Fiber Laser (20W)', hourly_cost: 12.00, printType: 'Laser' }
];

const embroideryMachines = [
  { name: 'Tajima Embroidery (4-head)', hourly_cost: 15.00, printType: 'Embroidery' },
  { name: 'Bernina Desktop', hourly_cost: 5.00, printType: 'Embroidery' }
];
```

---

## Success Criteria

✅ Laser quotes calculate correctly  
✅ Embroidery quotes calculate correctly  
✅ SVG, PDF parsers extract dimensions  
✅ Embroidery file parsers extract stitch count  
✅ All 4 types functional in calculator  
✅ Batch quoting works across types  
✅ Kanban board displays all types  
✅ All tests pass  
✅ Documentation complete  

---

## What Comes Next: Phase 4

**Advanced Analytics & Optimization:**
- Production analytics (time vs. estimate accuracy)
- Profitability by print type/material
- Capacity planning & scheduling
- Customer performance metrics
- Predictive pricing
- Report generation (PDF, CSV)
- Desktop Electron app with printer connections (re-added)
