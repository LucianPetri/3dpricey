/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { QuoteData, Material, Machine, FDMFormData, ResinFormData, CostConstant, LaborItem, LaborItemUsage, LaborConsumableUsage, LaborMachineUsage, LaborSelection } from "@/types/quote";

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
  const filamentWeightKg = parseFloat(formData.filamentWeight) / 1000;
  const overheadPercentage = formData.overheadPercentage ? parseFloat(formData.overheadPercentage) : 0;
  const markupPercentage = parseFloat(formData.markupPercentage);
  const quantity = formData.quantity ? Math.max(1, parseInt(formData.quantity)) : 1;
  const mappedMaterials = Array.from(new Set((formData.toolBreakdown || [])
    .map(item => item.material)
    .filter((name): name is string => !!name)));
  const mappedColors = Array.from(new Set((formData.toolBreakdown || [])
    .map(item => item.color)
    .filter((name): name is string => !!name)));

  const materialCostFromBreakdown = (formData.toolBreakdown || []).reduce((sum, toolItem) => {
    const selectedMaterial = materialsCatalog.find(item => item.id === toolItem.materialId) || material;
    return sum + ((toolItem.totalGrams || 0) / 1000) * selectedMaterial.cost_per_unit;
  }, 0);

  const materialCost = materialCostFromBreakdown > 0
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
    priority: formData.priority as 'Low' | 'Medium' | 'High' | undefined,
    dueDate: formData.dueDate,
    assignedEmployeeId: formData.assignedEmployeeId,
    parameters: {
      ...formData,
      materialName: mappedMaterials.length > 0 ? mappedMaterials.join(', ') : material.name,
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

export const validateFDMForm = (formData: FDMFormData): string | null => {
  if (!formData.projectName.trim()) return "Project name is required";
  if (formData.projectName.length > 100) return "Project name is too long (max 100 chars)";

  const toolBreakdown = formData.toolBreakdown || [];
  if (toolBreakdown.length === 0) return "Upload G-code and map detected filaments to your materials";
  if (toolBreakdown.some(item => !item.materialId)) return "Please map a material for each detected filament";

  if (!formData.machineId) return "Please select a machine";

  const printTime = parseFloat(formData.printTime);
  if (isNaN(printTime) || printTime <= 0) return "Print time must be greater than 0";
  if (printTime > 10000) return "Print time exceeds maximum (10000h)";

  const weight = parseFloat(formData.filamentWeight);
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
