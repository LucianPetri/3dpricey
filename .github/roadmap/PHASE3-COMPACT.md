# Phase 3: Laser & Embroidery

## Print Types Union
```typescript
type PrintType = 'FDM' | 'Resin' | 'Laser' | 'Embroidery';

interface LaserFormData {
  projectName: string;
  materialId: string;
  materialCost: number;
  machineId: string;
  machineHourlyRate: number;
  materialWeight: number; // grams
  cutAreaSqInches: number;
  engravingAreaSqInches: number;
  cuttingSpeedMmMin: number;
  power: number; // watts
  printTime: number; // minutes
  laborHours: number;
}

interface EmbroideryFormData {
  projectName: string;
  baseGarmentCost: number;
  threadType: string;
  threadWeight: number; // grams
  backingMaterialId: string;
  machineId: string;
  machineHourlyRate: number;
  stitchCount: number;
  colorCount: number;
  machineTime: number; // minutes
  laborHours: number;
}
```

## Database Schema
```prisma
model LaserMaterial {
  id String @id @default(cuid())
  name String
  costPerUnit Float // $/cm² or $/gram
  thickness Float? // mm
  createdAt DateTime @default(now())
}

model ThreadType {
  id String @id @default(cuid())
  name String
  color String
  costPerSpool Float
  weight Float // grams per spool
  createdAt DateTime @default(now())
}

model BackingMaterial {
  id String @id @default(cuid())
  name String
  costPerUnit Float
  weight Float
  createdAt DateTime @default(now())
}

model LaserQuoteData {
  id String @id @default(cuid())
  quoteId String @unique
  materialId String
  cutArea Float
  engravingArea Float
  cutCost Float
  engravingCost Float
  machineTime Float
  powerCost Float
  maintenanceCost Float
  createdAt DateTime @default(now())
}

model EmbroideryQuoteData {
  id String @id @default(cuid())
  quoteId String @unique
  baseGarmentCost Float
  threadCost Float
  backingCost Float
  stitchCount Int
  colorCount Int
  machineTime Float
  laborCost Float
  stabilizer Float
  createdAt DateTime @default(now())
}
```

## Laser Cost Calculator
```typescript
function calculateLaserQuote(data: LaserFormData): {
  cutCost: number,
  engravingCost: number,
  machineTimeCost: number,
  laborCost: number,
  maintenanceCost: number,
  total: number
} {
  // Material cost (area-based)
  const cutCost = data.cutAreaSqInches * data.materialCost;
  const engravingCost = data.engravingAreaSqInches * data.materialCost * 0.5;

  // Machine time cost
  const machineTimeCost = (data.printTime / 60) * data.machineHourlyRate;

  // Power cost: watts * hours * $/kWh (assume $0.12/kWh)
  const powerCost = (data.power * (data.printTime / 60) * 0.12) / 1000;

  // Labor
  const laborCost = data.laborHours * 25; // $25/hr

  // Maintenance: $0.05 per minute
  const maintenanceCost = data.printTime * 0.05;

  const total = cutCost + engravingCost + machineTimeCost + powerCost + laborCost + maintenanceCost;

  return {
    cutCost,
    engravingCost,
    machineTimeCost,
    laborCost,
    maintenanceCost,
    total
  };
}
```

## Embroidery Cost Calculator
```typescript
function calculateEmbroideryQuote(data: EmbroideryFormData): {
  baseGarmentCost: number,
  threadCost: number,
  backingCost: number,
  machineTime: number,
  laborCost: number,
  total: number
} {
  // Base garment
  const baseGarmentCost = data.baseGarmentCost;

  // Thread: $2.50 per color
  const threadCost = data.colorCount * 2.50;

  // Backing material
  const backingCost = data.colorCount * 0.75;

  // Machine time (cost)
  const machineTimeCost = (data.machineTime / 60) * data.machineHourlyRate;

  // Labor: $20/hr
  const laborCost = data.laborHours * 20;

  const total = baseGarmentCost + threadCost + backingCost + machineTimeCost + laborCost;

  return {
    baseGarmentCost,
    threadCost,
    backingCost,
    machineTime: machineTimeCost,
    laborCost,
    total
  };
}
```

## File Parsers
```typescript
// SVG Parser
function parseSVG(svgData: string) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
  const paths = svgDoc.querySelectorAll('path');

  let totalArea = 0;
  for (const path of paths) {
    const bbox = path.getBBox();
    totalArea += (bbox.width * bbox.height);
  }

  return { totalAreaPx: totalArea, paths: paths.length };
}

// Embroidery Parser (.pes, .exp, .jef)
async function parseEmbroideryFile(file: File) {
  // Use embroidery-js library or custom parser
  const stitches = await parseEmbroideryJS(file);
  return {
    stitchCount: stitches.length,
    colors: extractColors(stitches),
    bounds: calculateBounds(stitches)
  };
}
```

## Components
- LaserCalculatorTable: Form + cost breakdown
- EmbroideryCalculatorTable: Form + cost breakdown
- PrintTypeSelector: Toggle between 4 types

## API Endpoints
```
POST   /api/quotes/laser
POST   /api/quotes/embroidery
POST   /api/laser/parse-svg
  Body: { svgData: string }
  Response: { totalArea, paths }
POST   /api/embroidery/parse-file
  Body: FormData { file: File }
  Response: { stitchCount, colors, bounds }
```

## Files to Create/Modify
- src/types/quote.ts: Add Laser/Embroidery interfaces
- src/lib/quoteCalculations.ts: Add calculator functions
- src/lib/parsers/laserFileParser.ts: SVG/PDF parsing
- src/lib/parsers/embroideryFileParser.ts: .pes/.exp/.jef parsing
- src/components/calculator/LaserCalculatorTable.tsx
- src/components/calculator/EmbroideryCalculatorTable.tsx
- src/components/calculator/PrintTypeSelector.tsx
- backend/prisma/schema.prisma: Add Laser/Embroidery models
- backend/routes/quotes.ts: Add laser/embroidery endpoints

## Checklist
- [ ] Union type for 4 print types
- [ ] Laser/Embroidery form interfaces
- [ ] Database schemas
- [ ] SVG parser
- [ ] Embroidery file parser
- [ ] Laser cost calculator
- [ ] Embroidery cost calculator
- [ ] LaserCalculatorTable component
- [ ] EmbroideryCalculatorTable component
- [ ] API endpoints
- [ ] Tests
- [ ] Printer connection feature
