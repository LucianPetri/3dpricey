# Quote Calculation System

## Overview
The quote system supports two distinct print technologies: **FDM** (filament-based) and **Resin** (SLA/DLP). Both use the same cost structure but different input parameters.

**Location:** [src/lib/quoteCalculations.ts](../src/lib/quoteCalculations.ts)  
**Types:** [src/types/quote.ts](../src/types/quote.ts)

## Cost Breakdown Structure

### Common Cost Components (Both FDM & Resin)
All quotes calculate these fields:

```
subtotalBeforeOverhead = materialCost + machineTimeCost + electricityCost 
                        + laborCost + consumablesTotal + paintingCost

overheadCost = subtotalBeforeOverhead * (overheadPercentage / 100)
subtotal = subtotalBeforeOverhead + overheadCost
markup = subtotal * (markupPercentage / 100)
unitPrice = subtotal + markup
totalPrice = unitPrice * quantity
```

### FDM-Specific Inputs
- **printTime** (hours) → machineTimeCost
- **filamentWeight** (grams) → converted to kg → materialCost
- **laborHours** (hours) → laborCost
- **material.cost_per_unit** ($/kg) → used in materialCost
- **machine.hourly_cost** ($/hr) → used in machineTimeCost
- **machine.power_consumption_watts** → electricityCost = printTime × (watts/1000) × electricityRate

### Resin-Specific Inputs
- **printTime** (hours)
- **resinVolume** (ml) → materialCost using material.cost_per_unit ($/ml)
- **washingTime** (hours) → laborCost
- **curingTime** (hours) → laborCost
- **isopropylCost** (flat value)
- **machine.power_consumption_watts** → electricityCost

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

Located in FDM calculation (lines 78-120):

### Paint Material Calculation
Supports two paint types with complex logic:

```typescript
if (paintConsumable.unit === '$/ml') {
  // Calculated paint: $ per ml consumed
  // Extract "Usage Rate: 0.02ml/cm²" from description
  paintingMaterialCost = paintConsumable.value × 
                        surfaceAreaCm2 × 
                        paintingLayers × 
                        usageRate
} else {
  // Flat rate paint
  paintingMaterialCost = paintConsumable.value
}
```

### Paint Labor
```typescript
paintingLaborCost = paintingTime × laborRate
```

**Total Painting Cost:**
```
paintingCost = paintingLaborCost + paintingMaterialCost1 + paintingMaterialCost2
```

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
4. **Paint rate extraction:** The usage rate is in the description field—parsing can fail silently. Default to 0.02ml/cm² if not found.

## Testing Calculation Accuracy

### Manual Test Cases

**FDM Example:**
- Material: PLA @ $20/kg
- Machine: Prusa i3 @ $5/hr, 360W
- Print Time: 10 hours
- Filament: 200g
- Labor: 0.5 hours @ $15/hr
- Electricity Rate: $0.12/kWh
- Overhead: 10%
- Markup: 25%

Expected:
```
materialCost = 0.2 * 20 = $4
machineTimeCost = 10 * 5 = $50
electricityCost = 10 * 0.36 * 0.12 = $0.43
laborCost = 0.5 * 15 = $7.50
subtotalBeforeOverhead = $61.93
overheadCost = $6.19
subtotal = $68.12
markup = $17.03
unitPrice = $85.15
```

### Validation Checklist
- [ ] Quantity multiplier correctly applied to total, not unitPrice
- [ ] Overhead percentage calculated on correct subtotal (before markup)
- [ ] Paint consumable unit conversion ($/ml vs flat rate)
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
