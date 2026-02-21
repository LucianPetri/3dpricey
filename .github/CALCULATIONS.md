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
                        + laborCost + laborConsumablesCost + laborMachineCost + consumablesTotal

overheadCost = subtotalBeforeOverhead * (overheadPercentage / 100)
subtotal = subtotalBeforeOverhead + overheadCost
markup = subtotal * (markupPercentage / 100)
unitPrice = subtotal + markup
totalPrice = unitPrice * quantity
```

### FDM-Specific Inputs
- **printTime** (hours) → machineTimeCost
- **filamentWeight** (grams) → converted to kg → materialCost
- **toolBreakdown[] material mapping** → primary source for materialCost in multicolor jobs
- **material.cost_per_unit** ($/kg) → used per mapped filament material (fallback to selected material when needed)
- **machine.hourly_cost** ($/hr) → used in machineTimeCost (computed from machine price, usage, lifetime, maintenance)
- **machine.power_consumption_watts** → electricityCost = printTime × (watts/1000) × electricityRate
- **recyclableTotals/support/tower/flush** (from parser) → tracked in quote parameters for reporting (non-cost)

In mapped multicolor flow:

```
materialCost = Σ (toolBreakdown[i].totalGrams / 1000) * mappedMaterial[i].cost_per_unit
```

If no per-tool mapping exists, calculation falls back to single-material logic.

### Resin-Specific Inputs
- **printTime** (hours)
- **resinVolume** (ml) → materialCost using material.cost_per_unit ($/ml)
- **isopropylCost** (flat value)
- **machine.power_consumption_watts** → electricityCost

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
