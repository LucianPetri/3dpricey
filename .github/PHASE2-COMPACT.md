# Phase 2: Multi-Color Filament

## Database Changes
```prisma
model Quote {
  // existing fields...
  quoteFilaments QuoteFilament[]
}

model QuoteFilament {
  id String @id @default(cuid())
  quoteId String
  quote Quote @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  materialId String
  weightGrams Float
  order Int
  createdAt DateTime @default(now())
}
```

## G-Code Parser: Color Change Detection
```typescript
function parseGcodeColors(gcode: string): ColorChange[] {
  const colorChanges = [];
  const lines = gcode.split('\n');
  let currentColor = null;
  let totalWeight = 0;

  for (const line of lines) {
    // M600: Color change
    if (line.includes('M600')) {
      colorChanges.push({
        filament: currentColor,
        weight: totalWeight,
        line: gcode.indexOf(line)
      });
      totalWeight = 0;
      currentColor = null;
    }
    // M117: Color comment
    if (line.includes('M117') && line.includes('Color')) {
      const match = line.match(/Color[:\s]+(\w+)/i);
      if (match) currentColor = match[1];
    }
    // Track filament usage
    if (line.match(/^G[01]\s/)) {
      // E value = extrusion amount
      const eMatch = line.match(/E([\d.]+)/);
      if (eMatch) totalWeight += parseFloat(eMatch[1]) * 0.0125; // approx g per mm
    }
  }

  return colorChanges;
}
```

## FilamentCompositionForm Component
```typescript
interface FilamentComposition {
  materialId: string;
  weightGrams: number;
  order: number;
}

function FilamentCompositionForm() {
  const [filaments, setFilaments] = useState<FilamentComposition[]>([
    { materialId: '', weightGrams: 0, order: 1 }
  ]);

  const addFilament = () => {
    setFilaments([
      ...filaments,
      { materialId: '', weightGrams: 0, order: filaments.length + 1 }
    ]);
  };

  const removeFilament = (idx: number) => {
    setFilaments(filaments.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {filaments.map((fil, idx) => (
        <div key={idx}>
          <input placeholder="Material" />
          <input type="number" placeholder="Weight (g)" />
          <button onClick={() => removeFilament(idx)}>Remove</button>
        </div>
      ))}
      <button onClick={addFilament}>+ Add Filament</button>
    </div>
  );
}
```

## Cost Calculation
```typescript
function calculateMultiColorCost(filaments: FilamentComposition[], materials: Map<string, Material>) {
  let totalMaterialCost = 0;

  for (const fil of filaments) {
    const material = materials.get(fil.materialId);
    if (!material) continue;

    const cost = (fil.weightGrams / 1000) * material.costPerUnit;
    totalMaterialCost += cost;
  }

  return totalMaterialCost;
}
```

## API Endpoints
```
POST   /api/quotes/parse-gcode
  Body: { gcode: string }
  Response: { colors: ColorChange[], totalWeight: number }

POST   /api/quotes
  Body: {
    projectName: string,
    filaments: [{ materialId, weightGrams, order }],
    ...otherQuoteData
  }

PUT    /api/quotes/:id
  Body: { filaments: [...] }
```

## Files to Modify
- src/types/quote.ts: FilamentComposition interface
- src/lib/parsers/gcodeParser.ts: M600 detection
- src/lib/quoteCalculations.ts: Multi-filament cost logic
- src/components/calculator/FilamentCompositionForm.tsx: New
- backend/prisma/schema.prisma: QuoteFilament table
- backend/routes/quotes.ts: POST /api/quotes/parse-gcode

## Checklist
- [ ] Add QuoteFilament table
- [ ] G-code M600 detection
- [ ] FilamentComposition interface
- [ ] Form component
- [ ] Cost split logic
- [ ] API endpoint
- [ ] Tests
