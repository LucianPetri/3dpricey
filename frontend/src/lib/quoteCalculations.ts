/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { QuoteData, Material, Machine, FDMFormData, ResinFormData, LaserFormData, EmbroideryFormData, CostConstant, LaborItem, LaborItemUsage, LaborConsumableUsage, LaborMachineUsage, LaborSelection, QuoteFilamentSegment, FilamentToolBreakdown } from "@/types/quote";

interface CalculationParams {
  material: Material;
  machine: Machine;
  electricityRate: number;
}

interface ConsumableInfo {
  name: string;
  value: number;
}

interface FDMCalculationInput extends CalculationParams {
  formData: FDMFormData;
  consumables?: ConsumableInfo[];
  materialsCatalog?: Material[];
  laborItems: LaborItem[];
  consumableConstants: CostConstant[];
  machines: Machine[];
  customerId?: string;
  clientName?: string;
}

interface ResinCalculationInput extends CalculationParams {
  formData: ResinFormData;
  consumables?: ConsumableInfo[];
  laborItems: LaborItem[];
  consumableConstants: CostConstant[];
  machines: Machine[];
  customerId?: string;
  clientName?: string;
}

interface LaserCalculationInput extends CalculationParams {
  formData: LaserFormData;
  consumables?: ConsumableInfo[];
  customerId?: string;
  clientName?: string;
}

interface EmbroideryCalculationInput extends CalculationParams {
  formData: EmbroideryFormData;
  consumables?: ConsumableInfo[];
  customerId?: string;
  clientName?: string;
}

const buildLaborTotals = (
  laborSelections: LaborSelection[],
  laborItems: LaborItem[],
  consumableConstants: CostConstant[],
  machines: Machine[]
) => {
  const laborItemsById = new Map(laborItems.map(item => [item.id, item]));
  const consumablesById = new Map(consumableConstants.map(c => [c.id, c]));
  const machinesById = new Map(machines.map(m => [m.id, m]));

  const laborItemsUsed: LaborItemUsage[] = [];
  const laborConsumablesUsedMap = new Map<string, LaborConsumableUsage>();
  const laborMachinesUsedMap = new Map<string, LaborMachineUsage>();

  let laborCost = 0;
  let laborConsumablesCost = 0;
  let laborMachineCost = 0;

  laborSelections.forEach(selection => {
    const laborItem = laborItemsById.get(selection.laborItemId);
    if (!laborItem) return;

    const units = Math.max(0, selection.units || 0);
    const laborItemCost = laborItem.rate * units;
    laborCost += laborItemCost;

    laborItemsUsed.push({
      id: laborItem.id,
      name: laborItem.name,
      type: laborItem.type,
      pricingModel: laborItem.pricingModel,
      rate: laborItem.rate,
      units,
      cost: laborItemCost,
    });

    selection.consumables.forEach(consumable => {
      const constant = consumablesById.get(consumable.constantId);
      if (!constant) return;
      const quantity = Math.max(0, consumable.quantity || 0);
      const cost = quantity * constant.value;
      laborConsumablesCost += cost;
      const existing = laborConsumablesUsedMap.get(consumable.constantId);
      if (existing) {
        existing.quantity += quantity;
        existing.cost += cost;
      } else {
        laborConsumablesUsedMap.set(consumable.constantId, {
          constantId: consumable.constantId,
          name: constant.name,
          quantity,
          unitCost: constant.value,
          cost,
        });
      }
    });

    selection.machines.forEach(machineEntry => {
      const machine = machinesById.get(machineEntry.machineId);
      if (!machine) return;
      const hours = Math.max(0, machineEntry.hours || 0);
      const cost = hours * machine.hourly_cost;
      laborMachineCost += cost;
      const existing = laborMachinesUsedMap.get(machineEntry.machineId);
      if (existing) {
        existing.hours += hours;
        existing.cost += cost;
      } else {
        laborMachinesUsedMap.set(machineEntry.machineId, {
          machineId: machineEntry.machineId,
          name: machine.name,
          hours,
          rate: machine.hourly_cost,
          cost,
        });
      }
    });
  });

  return {
    laborCost,
    laborItemsUsed,
    laborConsumablesCost,
    laborConsumablesUsed: Array.from(laborConsumablesUsedMap.values()),
    laborMachineCost,
    laborMachinesUsed: Array.from(laborMachinesUsedMap.values()),
  };
};

const getToolBreakdownWeight = (toolItem: FilamentToolBreakdown) => {
  if (typeof toolItem.totalGrams === 'number' && Number.isFinite(toolItem.totalGrams)) {
    return toolItem.totalGrams;
  }

  return (toolItem.modelGrams || 0) + (toolItem.supportGrams || 0) + (toolItem.towerGrams || 0) + (toolItem.flushGrams || 0);
};

export const normalizeQuoteFilaments = (segments: QuoteFilamentSegment[] = []) =>
  segments
    .filter((segment) => Number.isFinite(segment.weightGrams) && segment.weightGrams > 0)
    .sort((left, right) => left.order - right.order)
    .map((segment, index) => ({
      ...segment,
      order: index + 1,
    }));

export const buildQuoteFilamentsFromToolBreakdown = (toolBreakdown: FilamentToolBreakdown[] = []): QuoteFilamentSegment[] => {
  return normalizeQuoteFilaments(
    toolBreakdown
      .filter((item) => getToolBreakdownWeight(item) > 0)
      .map((item, index) => ({
        materialId: item.materialId || '',
        weightGrams: getToolBreakdownWeight(item),
        order: item.order ?? index + 1,
        tool: item.tool,
        color: item.color,
        spoolId: item.spoolId,
        materialName: item.material,
        modelGrams: item.modelGrams,
        supportGrams: item.supportGrams,
        towerGrams: item.towerGrams,
        flushGrams: item.flushGrams,
      }))
  );
};

export const getQuoteFilamentSegments = (formData: FDMFormData): QuoteFilamentSegment[] => {
  if ((formData.quoteFilaments || []).length > 0) {
    return normalizeQuoteFilaments(formData.quoteFilaments);
  }

  const toolSegments = buildQuoteFilamentsFromToolBreakdown(formData.toolBreakdown || []);
  if (toolSegments.length > 0) {
    return toolSegments;
  }

  const filamentWeight = parseFloat(formData.filamentWeight);
  if (!formData.materialId || Number.isNaN(filamentWeight) || filamentWeight <= 0) {
    return [];
  }

  return [{
    materialId: formData.materialId,
    weightGrams: filamentWeight,
    order: 1,
    color: formData.printColour || undefined,
  }];
};

export const calculateFDMQuote = ({
  formData,
  material,
  machine,
  electricityRate,
  consumables = [],
  materialsCatalog = [],
  laborItems,
  consumableConstants,
  machines,
  customerId,
  clientName,
}: FDMCalculationInput): QuoteData => {
  const printTimeHours = parseFloat(formData.printTime);
  const orderedQuoteFilaments = getQuoteFilamentSegments(formData);
  const totalFilamentWeightGrams = orderedQuoteFilaments.reduce((sum, segment) => sum + segment.weightGrams, 0);
  const fallbackFilamentWeightGrams = parseFloat(formData.filamentWeight);
  const filamentWeightKg = (totalFilamentWeightGrams > 0 ? totalFilamentWeightGrams : fallbackFilamentWeightGrams) / 1000;
  const overheadPercentage = formData.overheadPercentage ? parseFloat(formData.overheadPercentage) : 0;
  const markupPercentage = parseFloat(formData.markupPercentage);
  const quantity = formData.quantity ? Math.max(1, parseInt(formData.quantity)) : 1;
  const resolvedQuoteFilaments = orderedQuoteFilaments.map((segment) => {
    const selectedMaterial = materialsCatalog.find((item) => item.id === segment.materialId) || material;
    return {
      ...segment,
      materialName: segment.materialName || selectedMaterial.name,
    };
  });
  const mappedMaterials = Array.from(new Set(resolvedQuoteFilaments
    .map(item => item.materialName)
    .filter((name): name is string => !!name)));
  const mappedColors = Array.from(new Set(resolvedQuoteFilaments
    .map(item => item.color)
    .filter((name): name is string => !!name)));

  const materialCostFromSegments = resolvedQuoteFilaments.reduce((sum, segment) => {
    const selectedMaterial = materialsCatalog.find(item => item.id === segment.materialId) || material;
    return sum + (segment.weightGrams / 1000) * selectedMaterial.cost_per_unit;
  }, 0);

  const materialCostFromBreakdown = (formData.toolBreakdown || []).reduce((sum, toolItem) => {
    const selectedMaterial = materialsCatalog.find(item => item.id === toolItem.materialId) || material;
    return sum + (getToolBreakdownWeight(toolItem) / 1000) * selectedMaterial.cost_per_unit;
  }, 0);

  const materialCost = materialCostFromSegments > 0
    ? materialCostFromSegments
    : materialCostFromBreakdown > 0
    ? materialCostFromBreakdown
    : filamentWeightKg * material.cost_per_unit;
  const machineTimeCost = printTimeHours * machine.hourly_cost;
  const powerConsumptionKw = machine.power_consumption_watts ? machine.power_consumption_watts / 1000 : 0;
  const electricityCost = printTimeHours * powerConsumptionKw * electricityRate;
  const consumablesTotal = consumables.reduce((sum, c) => sum + c.value, 0);
  const laborSelections = formData.laborSelections || [];
  const laborTotals = buildLaborTotals(laborSelections, laborItems, consumableConstants, machines);
  const subtotalBeforeOverhead = materialCost
    + machineTimeCost
    + electricityCost
    + laborTotals.laborCost
    + laborTotals.laborConsumablesCost
    + laborTotals.laborMachineCost
    + consumablesTotal;
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;

  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;

  // Calculate total price based on quantity
  const totalPrice = unitPrice * quantity;

  return {
    materialCost: materialCost * quantity,
    machineTimeCost: machineTimeCost * quantity,
    electricityCost: electricityCost * quantity,
    laborCost: laborTotals.laborCost * quantity,
    laborConsumablesCost: laborTotals.laborConsumablesCost * quantity,
    laborMachineCost: laborTotals.laborMachineCost * quantity,
    overheadCost: overheadCost * quantity,
    subtotal: subtotal * quantity,
    markup: markup * quantity,
    unitPrice,
    quantity,
    totalPrice,
    printType: "FDM",
    projectName: formData.projectName,
    printColour: mappedColors.length > 0 ? mappedColors.join(', ') : formData.printColour,
    filePath: formData.filePath, // Include file path for printing
    customerId,
    clientName,
    quoteFilaments: resolvedQuoteFilaments,
    priority: formData.priority as 'Low' | 'Medium' | 'High' | undefined,
    dueDate: formData.dueDate,
    assignedEmployeeId: formData.assignedEmployeeId,
    parameters: {
      ...formData,
      filamentWeight: (totalFilamentWeightGrams > 0 ? totalFilamentWeightGrams : fallbackFilamentWeightGrams).toString(),
      materialName: mappedMaterials.length > 0 ? mappedMaterials.join(', ') : material.name,
      machineName: machine.name,
      consumables,
      consumablesTotal,
      quoteFilaments: resolvedQuoteFilaments,
      laborItemsUsed: laborTotals.laborItemsUsed,
      laborConsumablesUsed: laborTotals.laborConsumablesUsed,
      laborMachinesUsed: laborTotals.laborMachinesUsed,
      laborSelections,
    },
  };
};

export const calculateResinQuote = ({
  formData,
  material,
  machine,
  electricityRate,
  consumables = [],
  laborItems,
  consumableConstants,
  machines,
  customerId,
  clientName,
}: ResinCalculationInput): QuoteData => {
  const printTimeHours = parseFloat(formData.printTime);
  const resinVolumeLiters = parseFloat(formData.resinVolume) / 1000;
  const washingTimeHours = formData.washingTime ? parseFloat(formData.washingTime) / 60 : 0;
  const curingTimeHours = formData.curingTime ? parseFloat(formData.curingTime) / 60 : 0;
  const isopropylCost = formData.isopropylCost ? parseFloat(formData.isopropylCost) : 0;
  const overheadPercentage = formData.overheadPercentage ? parseFloat(formData.overheadPercentage) : 0;
  const markupPercentage = parseFloat(formData.markupPercentage);
  const quantity = formData.quantity ? Math.max(1, parseInt(formData.quantity)) : 1;

  const materialCost = resinVolumeLiters * material.cost_per_unit + isopropylCost;
  const totalProcessTime = printTimeHours + washingTimeHours + curingTimeHours;
  const machineTimeCost = totalProcessTime * machine.hourly_cost;
  const powerConsumptionKw = machine.power_consumption_watts ? machine.power_consumption_watts / 1000 : 0;
  const electricityCost = totalProcessTime * powerConsumptionKw * electricityRate;
  const consumablesTotal = consumables.reduce((sum, c) => sum + c.value, 0);
  const laborSelections = formData.laborSelections || [];
  const laborTotals = buildLaborTotals(laborSelections, laborItems, consumableConstants, machines);
  const subtotalBeforeOverhead = materialCost
    + machineTimeCost
    + electricityCost
    + laborTotals.laborCost
    + laborTotals.laborConsumablesCost
    + laborTotals.laborMachineCost
    + consumablesTotal;
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;

  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;

  // Calculate total price based on quantity
  const totalPrice = unitPrice * quantity;

  return {
    materialCost: materialCost * quantity,
    machineTimeCost: machineTimeCost * quantity,
    electricityCost: electricityCost * quantity,
    laborCost: laborTotals.laborCost * quantity,
    laborConsumablesCost: laborTotals.laborConsumablesCost * quantity,
    laborMachineCost: laborTotals.laborMachineCost * quantity,
    overheadCost: overheadCost * quantity,
    subtotal: subtotal * quantity,
    markup: markup * quantity,
    unitPrice,
    quantity,
    totalPrice,
    printType: "Resin",
    projectName: formData.projectName,
    printColour: formData.printColour,
    customerId,
    clientName,
    assignedEmployeeId: formData.assignedEmployeeId,
    parameters: {
      ...formData,
      materialName: material.name,
      machineName: machine.name,
      consumables,
      consumablesTotal,
      laborItemsUsed: laborTotals.laborItemsUsed,
      laborConsumablesUsed: laborTotals.laborConsumablesUsed,
      laborMachinesUsed: laborTotals.laborMachinesUsed,
      laborSelections,
    },
  };
};

export const calculateLaserQuote = ({
  formData,
  material,
  machine,
  electricityRate,
  consumables = [],
  customerId,
  clientName,
}: LaserCalculationInput): QuoteData => {
  const cutTimeMinutes = parseFloat(formData.estimatedCutTime);
  const engravingTimeMinutes = formData.estimatedEngravingTime ? parseFloat(formData.estimatedEngravingTime) : 0;
  const totalTimeHours = (cutTimeMinutes + engravingTimeMinutes) / 60;
  const materialSurfaceArea = parseFloat(formData.materialSurfaceArea);
  const laborHours = formData.laborHours ? parseFloat(formData.laborHours) : 0;
  const laserPowerWatts = formData.laserPower ? parseFloat(formData.laserPower) : (machine.power_consumption_watts || 0);
  const laserTubeAge = formData.laserTubeAge ? parseFloat(formData.laserTubeAge) : 0;
  const focusLensCost = formData.focusLensReplacement ? 15 : 0;
  const tubeMaintenanceCost = laserTubeAge > 18 ? 12 : 0;
  const overheadPercentage = formData.overheadPercentage ? parseFloat(formData.overheadPercentage) : 0;
  const markupPercentage = formData.markupPercentage ? parseFloat(formData.markupPercentage) : 0;
  const quantity = formData.quantity ? Math.max(1, parseInt(formData.quantity)) : 1;
  const consumablesBaseTotal = consumables.reduce((sum, c) => sum + c.value, 0);
  const maintenanceCost = focusLensCost + tubeMaintenanceCost;
  const consumablesTotal = consumablesBaseTotal + maintenanceCost;

  const materialCost = materialSurfaceArea * material.cost_per_unit;
  const machineTimeCost = totalTimeHours * machine.hourly_cost;
  const electricityCost = totalTimeHours * (laserPowerWatts / 1000) * electricityRate;
  const laborCost = laborHours * 25;
  const subtotalBeforeOverhead = materialCost + machineTimeCost + electricityCost + laborCost + consumablesTotal;
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;
  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;
  const totalPrice = unitPrice * quantity;

  return {
    materialCost: materialCost * quantity,
    machineTimeCost: machineTimeCost * quantity,
    electricityCost: electricityCost * quantity,
    laborCost: laborCost * quantity,
    laborConsumablesCost: consumablesTotal * quantity,
    overheadCost: overheadCost * quantity,
    subtotal: subtotal * quantity,
    markup: markup * quantity,
    unitPrice,
    quantity,
    totalPrice,
    printType: "Laser",
    projectName: formData.projectName,
    printColour: formData.printColour,
    filePath: formData.filePath,
    customerId,
    clientName,
    parameters: {
      ...formData,
      materialName: material.name,
      machineName: machine.name,
      machineId: machine.id,
      consumables,
      consumablesTotal,
      maintenanceCost,
    },
  };
};

export const calculateEmbroideryQuote = ({
  formData,
  material,
  machine,
  electricityRate,
  consumables = [],
  customerId,
  clientName,
}: EmbroideryCalculationInput): QuoteData => {
  const machineTimeHours = parseFloat(formData.estimatedEmbroideryTime) / 60;
  const baseGarmentCost = parseFloat(formData.baseGarmentCost);
  const threadColors = parseFloat(formData.threadColors);
  const laborHours = formData.laborHours ? parseFloat(formData.laborHours) : 0;
  const overheadPercentage = formData.overheadPercentage ? parseFloat(formData.overheadPercentage) : 0;
  const markupPercentage = formData.markupPercentage ? parseFloat(formData.markupPercentage) : 0;
  const quantity = formData.quantity ? Math.max(1, parseInt(formData.quantity)) : 1;
  const threadCost = threadColors * 2.5;
  const backingCost = material.cost_per_unit;
  const materialCost = baseGarmentCost + threadCost + backingCost;
  const machineTimeCost = machineTimeHours * machine.hourly_cost;
  const electricityCost = machineTimeHours * ((machine.power_consumption_watts || 0) / 1000) * electricityRate;
  const laborCost = laborHours * 20;
  const consumablesTotal = consumables.reduce((sum, c) => sum + c.value, 0);
  const subtotalBeforeOverhead = materialCost + machineTimeCost + electricityCost + laborCost + consumablesTotal;
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;
  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;
  const totalPrice = unitPrice * quantity;

  return {
    materialCost: materialCost * quantity,
    machineTimeCost: machineTimeCost * quantity,
    electricityCost: electricityCost * quantity,
    laborCost: laborCost * quantity,
    laborConsumablesCost: consumablesTotal * quantity,
    overheadCost: overheadCost * quantity,
    subtotal: subtotal * quantity,
    markup: markup * quantity,
    unitPrice,
    quantity,
    totalPrice,
    printType: "Embroidery",
    projectName: formData.projectName,
    printColour: formData.printColour,
    filePath: formData.filePath,
    customerId,
    clientName,
    parameters: {
      ...formData,
      materialName: material.name,
      machineName: machine.name,
      machineId: machine.id,
      backingCost,
      threadCost,
      consumables,
      consumablesTotal,
      stitchCount: formData.stitchCount,
    },
  };
};

export const validateFDMForm = (formData: FDMFormData): string | null => {
  if (!formData.projectName.trim()) return "Project name is required";
  if (formData.projectName.length > 100) return "Project name is too long (max 100 chars)";

  const quoteFilaments = (formData.quoteFilaments || []).length > 0
    ? formData.quoteFilaments || []
    : buildQuoteFilamentsFromToolBreakdown(formData.toolBreakdown || []);

  if (quoteFilaments.length === 0 && !formData.materialId) {
    return "Add at least one filament segment or upload G-code to build the composition";
  }

  if (quoteFilaments.length > 0 && quoteFilaments.some(item => !item.materialId)) {
    return "Please select a material for each filament segment";
  }

  if (quoteFilaments.length > 0 && quoteFilaments.some(item => !Number.isFinite(item.weightGrams) || item.weightGrams <= 0)) {
    return "Each filament segment must have a weight greater than 0";
  }

  if (!formData.machineId) return "Please select a machine";

  const printTime = parseFloat(formData.printTime);
  if (isNaN(printTime) || printTime <= 0) return "Print time must be greater than 0";
  if (printTime > 10000) return "Print time exceeds maximum (10000h)";

  const weight = quoteFilaments.length > 0
    ? quoteFilaments.reduce((sum, item) => sum + item.weightGrams, 0)
    : parseFloat(formData.filamentWeight);
  if (isNaN(weight) || weight <= 0) return "Filament weight must be greater than 0";
  if (weight > 50000) return "Filament weight exceeds maximum (50000g)";

  if (formData.laborSelections.some(selection => selection.units > 1000)) return "Labor units exceed maximum (1000)";
  if (formData.overheadPercentage && parseFloat(formData.overheadPercentage) > 1000) return "Overhead exceeds maximum (1000%)";
  if (formData.markupPercentage && parseFloat(formData.markupPercentage) > 10000) return "Markup exceeds maximum (10000%)";

  const quantity = parseInt(formData.quantity);
  if (isNaN(quantity) || quantity < 1) return "Quantity must be at least 1";
  if (quantity > 1000000) return "Quantity exceeds maximum (1,000,000)";

  return null;
};

export const validateResinForm = (formData: ResinFormData): string | null => {
  if (!formData.projectName.trim()) return "Project name is required";
  if (!formData.materialId) return "Please select a material";
  if (!formData.machineId) return "Please select a machine";

  const printTime = parseFloat(formData.printTime);
  if (isNaN(printTime) || printTime <= 0) return "Print time must be greater than 0";
  if (printTime > 10000) return "Print time exceeds maximum (10000h)";

  const volume = parseFloat(formData.resinVolume);
  if (isNaN(volume) || volume <= 0) return "Resin volume must be greater than 0";
  if (volume > 50000) return "Resin volume exceeds maximum (50000ml)";

  if (formData.laborSelections.some(selection => selection.units > 1000)) return "Labor units exceed maximum (1000)";
  if (formData.overheadPercentage && parseFloat(formData.overheadPercentage) > 1000) return "Overhead exceeds maximum (1000%)";
  if (formData.markupPercentage && parseFloat(formData.markupPercentage) > 10000) return "Markup exceeds maximum (10000%)";

  const quantity = parseInt(formData.quantity);
  if (isNaN(quantity) || quantity < 1) return "Quantity must be at least 1";
  if (quantity > 1000000) return "Quantity exceeds maximum (1,000,000)";

  return null;
};

export const validateLaserForm = (formData: LaserFormData): string | null => {
  if (!formData.projectName.trim()) return "Project name is required";
  if (!formData.materialId) return "Please select a laser material";
  if (!formData.machineId) return "Please select a laser machine";

  const width = parseFloat(formData.designWidth);
  const height = parseFloat(formData.designHeight);
  const cutTime = parseFloat(formData.estimatedCutTime);
  const area = parseFloat(formData.materialSurfaceArea);
  const quantity = parseInt(formData.quantity || "1");

  if (isNaN(width) || width <= 0) return "Design width must be greater than 0";
  if (isNaN(height) || height <= 0) return "Design height must be greater than 0";
  if (isNaN(cutTime) || cutTime <= 0) return "Cut time must be greater than 0";
  if (isNaN(area) || area <= 0) return "Material surface area must be greater than 0";
  if (formData.laborHours && (isNaN(parseFloat(formData.laborHours)) || parseFloat(formData.laborHours) < 0)) return "Labor hours must be 0 or greater";
  if (isNaN(quantity) || quantity < 1) return "Quantity must be at least 1";

  return null;
};

export const validateEmbroideryForm = (formData: EmbroideryFormData): string | null => {
  if (!formData.projectName.trim()) return "Project name is required";
  if (!formData.machineId) return "Please select an embroidery machine";
  if (!formData.selectedBackingId) return "Please select a backing material";

  const width = parseFloat(formData.designWidth);
  const height = parseFloat(formData.designHeight);
  const stitchCount = parseFloat(formData.stitchCount);
  const embroideryTime = parseFloat(formData.estimatedEmbroideryTime);
  const baseGarmentCost = parseFloat(formData.baseGarmentCost);
  const threadColors = parseFloat(formData.threadColors);
  const quantity = parseInt(formData.quantity || "1");

  if (isNaN(width) || width <= 0) return "Design width must be greater than 0";
  if (isNaN(height) || height <= 0) return "Design height must be greater than 0";
  if (isNaN(stitchCount) || stitchCount <= 0) return "Stitch count must be greater than 0";
  if (isNaN(embroideryTime) || embroideryTime <= 0) return "Embroidery time must be greater than 0";
  if (isNaN(baseGarmentCost) || baseGarmentCost < 0) return "Base garment cost must be 0 or greater";
  if (isNaN(threadColors) || threadColors <= 0) return "Thread color count must be greater than 0";
  if (formData.laborHours && (isNaN(parseFloat(formData.laborHours)) || parseFloat(formData.laborHours) < 0)) return "Labor hours must be 0 or greater";
  if (isNaN(quantity) || quantity < 1) return "Quantity must be at least 1";

  return null;
};
