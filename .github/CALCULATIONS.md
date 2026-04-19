# Quote Calculation System

## Overview
The quote system supports four fabrication workflows: **FDM** (filament-based), **Resin** (SLA/DLP), **Laser** (cutting/engraving), and **Embroidery**. All four return the same `QuoteData` contract so batch totals, saved quotes, sync, and production flows can reuse one storage model.

**Location:** [src/lib/quoteCalculations.ts](../src/lib/quoteCalculations.ts)  
**Types:** [src/types/quote.ts](../src/types/quote.ts)

**Phase 2 update:** Ordered `quoteFilaments[]` are now the primary FDM material-cost input for pricing, persistence, sync, and quote reloads. Parser `toolBreakdown[]` remains useful, but it now seeds the editable composition instead of acting as the only multicolor source of truth.

**Phase 3 update:** `calculateLaserQuote()` and `calculateEmbroideryQuote()` now live beside the existing FDM/Resin calculators in [src/lib/quoteCalculations.ts](../src/lib/quoteCalculations.ts). They reuse the same overhead, markup, and quantity multiplier pattern while mapping workflow-specific setup costs into the shared quote cost fields.

## Cost Breakdown Structure

### Common Cost Components (Both FDM & Resin)
All quotes calculate these fields:

```
subtotalBeforeOverhead = materialCost + machineTimeCost + electricityCost 
                        + laborCost + laborConsumablesCost + laborMachineCost + consumablesTotal

overheadCost = subtotalBeforeOverhead * (overheadPercentage / 100)
subtotal = subtotalBeforeOverhead + overheadCost
markup = subtotal * (markupPercentage / 100)
unitPrice = subtotal + markup
totalPrice = unitPrice * quantity
```

### FDM-Specific Inputs
- **printTime** (hours) → machineTimeCost
- **filamentWeight** (grams) → converted to kg → fallback single-material materialCost when no composition exists
- **quoteFilaments[]** → primary source for materialCost in multi-material jobs and the persisted segment order used when reopening a quote
- **toolBreakdown[]** → parser-assisted seed data for `quoteFilaments[]` (model/support/tower/flush totals remain reporting metadata)
- **material.cost_per_unit** ($/kg) → used per mapped filament material (fallback to selected material when needed)
- **machine.hourly_cost** ($/hr) → used in machineTimeCost (computed from machine price, usage, lifetime, maintenance)
- **machine.power_consumption_watts** → electricityCost = printTime × (watts/1000) × electricityRate
- **recyclableTotals/support/tower/flush** (from parser) → tracked in quote parameters for reporting (non-cost)

In multi-material flow:

```
materialCost = Σ (quoteFilaments[i].weightGrams / 1000) * mappedMaterial[i].cost_per_unit
```

If no ordered segment list exists, calculation falls back to parser `toolBreakdown[]`, then to legacy single-material logic.

### Resin-Specific Inputs
- **printTime** (hours)
- **resinVolume** (ml) → materialCost using material.cost_per_unit ($/ml)
- **isopropylCost** (flat value)
- **machine.power_consumption_watts** → electricityCost

### Laser-Specific Inputs
- **materialSurfaceArea** (cm2) → area-priced materialCost using `material.cost_per_unit`
- **estimatedCutTime** + **estimatedEngravingTime** (minutes) → machineTimeCost after minutes → hours conversion
- **laserPower** (watts, optional) → electricityCost fallback before using machine wattage
- **laborHours** → laborCost using a fixed design/setup rate of `$25/hr`
- **focusLensReplacement** + **laserTubeAge** → folded into `laborConsumablesCost`

Laser unit-cost flow:

```
materialCost = materialSurfaceArea * material.cost_per_unit
machineTimeCost = ((estimatedCutTime + estimatedEngravingTime) / 60) * machine.hourly_cost
electricityCost = totalTimeHours * (laserPowerWatts / 1000) * electricityRate
laborCost = laborHours * 25
laborConsumablesCost = selectedConsumablesTotal + focusLensCost + tubeMaintenanceCost
```

### Embroidery-Specific Inputs
- **baseGarmentCost** → included in `materialCost`
- **threadColors** → threadCost at a flat `$2.50` per color change
- **selectedBackingId** → backingCost from the chosen embroidery material
- **estimatedEmbroideryTime** (minutes) → machineTimeCost after minutes → hours conversion
- **laborHours** → laborCost using a fixed finishing/setup rate of `$20/hr`

Embroidery unit-cost flow:

```
materialCost = baseGarmentCost + threadCost + backingCost
machineTimeCost = (estimatedEmbroideryTime / 60) * machine.hourly_cost
electricityCost = totalTimeHours * (machine.power_consumption_watts / 1000) * electricityRate
laborCost = laborHours * 20
laborConsumablesCost = selectedConsumablesTotal
```

## Labor Model

Labor uses global labor items with a pricing model plus optional per-unit consumables/equipment.

```
laborSelections = [
  { laborItemId, units, consumables: [{ constantId, quantity }], machines: [{ machineId, hours }] }
]

laborCost = sum(laborItem.rate * units)
laborConsumablesCost = sum(consumable.quantity * constant.value)
laborMachineCost = sum(machine.hours * machine.hourly_cost)
```

The quote parameters include a list of all labor usage entries:

```
laborItemsUsed = [{ id, name, type, pricingModel, rate, units, cost }]
laborConsumablesUsed = [{ constantId, name, quantity, unitCost, cost }]
laborMachinesUsed = [{ machineId, name, hours, rate, cost }]
```

## Quantity Multiplier Logic

**Critical:** Quantity multiplies ONLY the per-unit costs, NOT the design cost structure:

```typescript
// Example for quantity = 3:
materialCost → materialCost * 3
machineTimeCost → machineTimeCost * 3
laborCost → laborCost * 3
// But unitPrice stays per-single-unit for display
totalPrice = unitPrice * quantity
```

This allows showing "Price per unit: $50" and "Total for 3 units: $150".

## Painting/Post-Processing Costs

Painting is modeled as a labor item. Add a global labor item (pricing + type) and attach any consumables/equipment per unit.

## Consumables Model

Consumables are **selected arrays** of cost constants (e.g., gloves, IPA, sandpaper):

```typescript
consumablesTotal = consumables.reduce((sum, c) => sum + c.value, 0)
```

**Design Pattern:** User checks checkboxes → selected IDs sent to calculator → hook maps IDs to full `CostConstant` objects.

## Batch Calculation

The `BatchQuoteContext` (see [STATEMANAGEMENT.md](./STATEMANAGEMENT.md)) maintains an array of quotes and recalculates batch totals:

```typescript
batchTotals = {
  totalItems: batchItems.length,
  totalQuantity: sum of all quantities,
  totalMaterialCost: sum of all materialCost,
  totalMachineTimeCost: sum of all machineTimeCost,
  // ... etc for each cost component
  grandTotal: sum of all totalPrice
}
```

## Common Mistakes to Avoid

1. **Forgetting quantity multiplier:** Don't apply quantity to per-item labor hours if they're already counted.
2. **Overhead before markup:** Overhead is calculated on subtotal BEFORE markup is applied (standard accounting practice).
3. **Power consumption null safety:** Machine may have `power_consumption_watts: null`. Always check:
   ```typescript
   const powerConsumptionKw = machine.power_consumption_watts ? machine.power_consumption_watts / 1000 : 0;
   ```
4. **Labor units validation:** Each labor selection must include a labor item and units > 0.
5. **Segment order vs total cost:** Reordering `quoteFilaments[]` must not change the material total; order is preserved for traceability and reopening, not for pricing.

## Testing Calculation Accuracy

### Manual Test Cases

**FDM Example:**
- Material: PLA @ $20/kg
- Machine: Prusa i3 @ $5/hr, 360W
- Print Time: 10 hours
- Filament: 200g
- Labor: 0.5 hours @ $15/hr (hourly labor item)
- Labor consumables: $1.20 (gloves + cleanup)
- Electricity Rate: $0.12/kWh
- Overhead: 10%
- Markup: 25%

Expected:
```
materialCost = 0.2 * 20 = $4
machineTimeCost = 10 * 5 = $50
electricityCost = 10 * 0.36 * 0.12 = $0.43
laborCost = 0.5 * 15 = $7.50
laborConsumablesCost = $1.20
subtotalBeforeOverhead = $63.13
overheadCost = $6.31
subtotal = $69.44
markup = $17.36
unitPrice = $86.80
```

### Validation Checklist
- [ ] Quantity multiplier correctly applied to total, not unitPrice
- [ ] Overhead percentage calculated on correct subtotal (before markup)
- [ ] Labor consumables/equipment rates use the latest constants/machine hourly cost
- [ ] Null-safe access to optional machine fields
- [ ] Filament weight division by 1000 (g → kg)
- [ ] Print time unit conversion (ensure hours, not seconds)

## Adding a New Cost Category

1. Add property to `QuoteData` interface
2. Add input field to `FDMFormData` or `ResinFormData`
3. Calculate in `calculateFDMQuote()` or `calculateResinQuote()`
4. Include in `subtotalBeforeOverhead` calculation
5. Update `BatchQuoteContextType` if it's a batch aggregate
6. Add UI field in calculator form component
