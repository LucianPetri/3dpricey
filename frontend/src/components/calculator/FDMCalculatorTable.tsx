/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { Calculator, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QuoteData, FDMFormData, StoredGcode, LaborItem, Machine } from "@/types/quote";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { calculateFDMQuote, validateFDMForm } from "@/lib/quoteCalculations";
import { QuoteCalculator } from "./QuoteCalculator";
import { FormFieldRow, TextField, SelectField } from "./FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsumablesSelector } from "./ConsumablesSelector";
import GcodeUpload from "./GcodeUpload";
import { GcodeData } from "@/lib/parsers/gcodeParser";
import { useCurrency } from "@/hooks/useCurrency";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { Customer, Employee } from "@/types/quote";
import { getEmployees, getLaborItems, getMachines, getFdmCalculatorDraft, saveFdmCalculatorDraft, clearFdmCalculatorDraft } from "@/lib/core/sessionStorage";
import { useStoredGcodes } from "@/hooks/useStoredGcodes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getSpools } from "@/lib/core/sessionStorage";
import { HexColorSwatch } from "@/components/shared/HexColorSwatch";

interface FDMCalculatorProps {
  onCalculate: (data: QuoteData) => void;
}

const initialFormData: FDMFormData = {
  projectName: "",
  printColour: "",
  materialId: "",
  machineId: "",
  printTime: "",
  filamentWeight: "",
  laborSelections: [],
  overheadPercentage: "",
  markupPercentage: "20",
  quantity: "1",
  priority: "Medium",
  dueDate: "",
  selectedConsumableIds: [],
  filePath: "", // Store uploaded file path
  customerId: "",

  clientName: "",
  assignedEmployeeId: "",
  colorUsages: [],
  toolBreakdown: [],
  recyclableColorUsages: [],
  recyclableTotals: {
    supportGrams: 0,
    towerGrams: 0,
    flushGrams: 0,
    recyclableGrams: 0,
    modelGrams: 0,
  },
};

const FDMCalculatorTable = memo(({ onCalculate }: FDMCalculatorProps) => {
  const { materials, machines, constants, loading, getConstantValue } = useCalculatorData({ printType: "FDM" });
  const [formData, setFormData] = useState<FDMFormData>(initialFormData);
  const [selectedSpoolId, setSelectedSpoolId] = useState<string | undefined>(undefined);
  const { currency } = useCurrency();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const { gcodes, saveGcode } = useStoredGcodes();

  // Filter for FDM files only (has filament weight and no resin volume)
  const filteredGcodes = useMemo(() => {
    return gcodes.filter(g => (g.filamentWeight || 0) > 0 && !g.resinVolume);
  }, [gcodes]);

  const [currentGcodeData, setCurrentGcodeData] = useState<GcodeData | null>(null);

  // Load employees on mount
  useEffect(() => {
    setEmployees(getEmployees());
    setLaborItems(getLaborItems());
    setAllMachines(getMachines());
  }, []);

  useEffect(() => {
    const draft = getFdmCalculatorDraft<FDMFormData>();
    if (!draft?.formData) return;
    setFormData({
      ...initialFormData,
      ...draft.formData,
      laborSelections: draft.formData.laborSelections || [],
      selectedConsumableIds: draft.formData.selectedConsumableIds || [],
    });
    setSelectedSpoolId(draft.selectedSpoolId);
  }, []);

  useEffect(() => {
    saveFdmCalculatorDraft({ formData, selectedSpoolId });
  }, [formData, selectedSpoolId]);

  const selectedEmployee = useMemo(() => {
    if (!formData.assignedEmployeeId) return undefined;
    return employees.find(e => e.id === formData.assignedEmployeeId);
  }, [employees, formData.assignedEmployeeId]);

  const allowedLaborItems = useMemo(() => {
    if (!selectedEmployee?.allowedLaborItemIds?.length) return laborItems;
    const allowedIds = new Set(selectedEmployee.allowedLaborItemIds);
    return laborItems.filter(item => allowedIds.has(item.id));
  }, [laborItems, selectedEmployee]);

  const laborOptions = useMemo(() => {
    return [
      { id: "none", label: "-- None --" },
      ...allowedLaborItems.map(item => ({
        id: item.id,
        label: `${item.name} (${item.type})`,
        sublabel: item.pricingModel === "hourly"
          ? `${currency.symbol}${item.rate}/hr`
          : `${currency.symbol}${item.rate} flat`,
      })),
    ];
  }, [allowedLaborItems, currency.symbol]);

  const updateField = useCallback(<K extends keyof FDMFormData>(field: K, value: FDMFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleClientSelect = useCallback((customer: Customer | null) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer?.id || "",
      clientName: customer?.name || ""
    }));
  }, []);

  const handleGcodeData = useCallback((data: GcodeData) => {
    let matchedMachineId = '';
    let matchedMaterialId = '';

    // Normalize function: lowercase and remove non-alphanumeric chars
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (data.printerModel) {
      const normalizedModel = normalize(data.printerModel);



      // Find exact match only - the normalized G-code model must match the normalized machine name
      const matchedMachine = machines.find(m => {
        const normalizedMachineName = normalize(m.name);

        // Exact normalized match
        if (normalizedMachineName === normalizedModel) {
          return true;
        }

        // Check if one fully contains the other AND they have same key identifiers
        // e.g., "bambulaba1mini" should match "bambulaba1mini" but NOT "bambulaba1"
        if (normalizedMachineName.includes(normalizedModel) || normalizedModel.includes(normalizedMachineName)) {
          // Additional check: both must have the same suffix (mini, pro, plus, etc.) if any exists
          const modelHasMini = normalizedModel.includes('mini');
          const machineHasMini = normalizedMachineName.includes('mini');
          const modelHasPro = normalizedModel.includes('pro');
          const machineHasPro = normalizedMachineName.includes('pro');
          const modelHasPlus = normalizedModel.includes('plus');
          const machineHasPlus = normalizedMachineName.includes('plus');

          // Only match if modifiers are the same
          return modelHasMini === machineHasMini &&
            modelHasPro === machineHasPro &&
            modelHasPlus === machineHasPlus;
        }

        return false;
      });

      if (matchedMachine) {
        matchedMachineId = matchedMachine.id;
        toast.info(`Auto-selected machine: ${matchedMachine.name}`);
      } else {
        // No machine match found
      }

      // Match material from filament_settings_id
      if (data.filamentSettingsId) {
        const normalizedMaterial = normalize(data.filamentSettingsId);

        const matchedMaterial = materials.find(m => {
          const normalizedName = normalize(m.name);
          return normalizedName.includes(normalizedMaterial) ||
            normalizedMaterial.includes(normalizedName);
        });

        if (matchedMaterial) {
          matchedMaterialId = matchedMaterial.id;
          toast.info(`Auto-selected material: ${matchedMaterial.name}`);
        } else {
          // No material match found
        }
      }

      const resolveMaterialId = (materialName?: string) => {
        if (!materialName) return undefined;
        const normalizedMaterialName = normalize(materialName);
        const found = materials.find(item => {
          const normalizedName = normalize(item.name);
          return normalizedName === normalizedMaterialName
            || normalizedName.includes(normalizedMaterialName)
            || normalizedMaterialName.includes(normalizedName);
        });
        return found?.id;
      };

      const mappedToolBreakdown = (data.toolBreakdown || []).map(item => ({
        ...item,
        materialId: resolveMaterialId(item.material) || matchedMaterialId || item.materialId,
      }));

      const mappedColorUsages = (data.colorUsages || []).map(item => ({
        ...item,
        materialId: resolveMaterialId(item.material) || matchedMaterialId || item.materialId,
      }));

      setFormData(prev => ({
        ...prev,
        projectName: data.fileName ? data.fileName.substring(0, data.fileName.lastIndexOf('.')) || data.fileName : prev.projectName,
        printTime: data.printTimeHours > 0 ? data.printTimeHours.toString() : prev.printTime,
        filamentWeight: data.filamentWeightGrams > 0 ? data.filamentWeightGrams.toString() : prev.filamentWeight,
        machineId: matchedMachineId || prev.machineId,
        materialId: matchedMaterialId || prev.materialId,
        printColour: data.filamentColour || prev.printColour,
        filePath: data.filePath || prev.filePath, // Store the file path
        colorUsages: mappedColorUsages.length > 0 ? mappedColorUsages : prev.colorUsages,
        toolBreakdown: mappedToolBreakdown.length > 0 ? mappedToolBreakdown : prev.toolBreakdown,
        recyclableColorUsages: data.recyclableColorUsages || prev.recyclableColorUsages,
        recyclableTotals: data.recyclableTotals || prev.recyclableTotals,
      }));

      // Keep track of current Gcode data for saving
      setCurrentGcodeData(data);
    }
  }, [machines, materials]);

  const handleSavedGcodeSelect = useCallback((gcodeId: string) => {
    const gcode = gcodes.find(g => g.id === gcodeId);
    if (!gcode) return;

    const gcodeData: GcodeData = {
      fileName: gcode.name,
      filePath: gcode.filePath,
      printTimeHours: gcode.printTime,
      filamentWeightGrams: gcode.filamentWeight,
      printerModel: gcode.machineName,
      filamentSettingsId: gcode.materialName,
      thumbnail: gcode.thumbnail,
      colorUsages: gcode.colorUsages,
      toolBreakdown: gcode.toolBreakdown,
      recyclableColorUsages: gcode.recyclableColorUsages,
      recyclableTotals: gcode.recyclableTotals,
    };

    handleGcodeData(gcodeData);
    toast.success(`Loaded saved file: ${gcode.name}`);
  }, [gcodes, handleGcodeData]);

  const handleSaveToLibrary = async () => {
    if (!currentGcodeData) return;

    // Find material and machine names for better storage metadata
    const mappedMaterialNames = (formData.toolBreakdown || [])
      .map(item => item.material)
      .filter((name): name is string => !!name);
    const materialName = mappedMaterialNames.length > 0
      ? Array.from(new Set(mappedMaterialNames)).join(', ')
      : currentGcodeData.filamentSettingsId;
    const machine = machines.find(m => m.id === formData.machineId);

    const gcodeToSave: StoredGcode = {
      id: '', // Will be generated
      name: formData.projectName || currentGcodeData.fileName,
      filePath: currentGcodeData.filePath || formData.filePath || "Uploaded File",
      printTime: parseFloat(formData.printTime) || currentGcodeData.printTimeHours,
      filamentWeight: parseFloat(formData.filamentWeight) || currentGcodeData.filamentWeightGrams,
      machineName: machine?.name || currentGcodeData.printerModel,
      materialName,
      printType: "FDM",
      thumbnail: currentGcodeData.thumbnail,
      colorUsages: formData.colorUsages,
      toolBreakdown: formData.toolBreakdown,
      recyclableColorUsages: formData.recyclableColorUsages,
      recyclableTotals: formData.recyclableTotals,
      createdAt: new Date().toISOString()
    };

    if (gcodeToSave.printTime <= 0) {
      toast.error("Cannot save file with 0 print time");
      return;
    }

    try {
      await saveGcode(gcodeToSave);
      // Toast is handled in hook
    } catch (error) {
      // Error handling in hook
    }
  };

  const handleConsumablesChange = useCallback((selectedIds: string[]) => {
    updateField("selectedConsumableIds", selectedIds);
    if (selectedIds.length > 0) {
      const totalValue = constants
        .filter(c => selectedIds.includes(c.id))
        .reduce((sum, c) => sum + c.value, 0);
      toast.info(`Selected ${selectedIds.length} consumables (Total: ${currency.symbol}${totalValue.toFixed(2)})`);
    }
  }, [constants, updateField, currency]);

  const addLaborSelection = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      laborSelections: [...prev.laborSelections, { laborItemId: "", units: 0, consumables: [], machines: [] }],
    }));
  }, []);

  const removeLaborSelection = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      laborSelections: prev.laborSelections.filter((_, i) => i !== index),
    }));
  }, []);

  const updateLaborUnits = useCallback((index: number, units: number) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      updated[index] = { ...updated[index], units };
      return { ...prev, laborSelections: updated };
    });
  }, []);

  const handleLaborItemChange = useCallback((index: number, laborItemId: string) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      const laborItem = laborItems.find(item => item.id === laborItemId);
      updated[index] = {
        ...updated[index],
        laborItemId,
        units: updated[index].units || 0,
        consumables: laborItem
          ? laborItem.consumables.map(item => ({ constantId: item.constantId, quantity: item.quantityPerUnit }))
          : [],
        machines: laborItem
          ? laborItem.machines.map(item => ({ machineId: item.machineId, hours: item.hoursPerUnit }))
          : [],
      };
      return { ...prev, laborSelections: updated };
    });
  }, [laborItems]);

  const addLaborConsumable = useCallback((index: number) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      const selection = updated[index];
      updated[index] = { ...selection, consumables: [...selection.consumables, { constantId: "", quantity: 0 }] };
      return { ...prev, laborSelections: updated };
    });
  }, []);

  const updateLaborConsumable = useCallback((selectionIndex: number, consumableIndex: number, field: "constantId" | "quantity", value: string | number) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      const selection = updated[selectionIndex];
      const consumables = [...selection.consumables];
      consumables[consumableIndex] = { ...consumables[consumableIndex], [field]: value };
      updated[selectionIndex] = { ...selection, consumables };
      return { ...prev, laborSelections: updated };
    });
  }, []);

  const removeLaborConsumable = useCallback((selectionIndex: number, consumableIndex: number) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      const selection = updated[selectionIndex];
      updated[selectionIndex] = { ...selection, consumables: selection.consumables.filter((_, i) => i !== consumableIndex) };
      return { ...prev, laborSelections: updated };
    });
  }, []);

  const addLaborMachine = useCallback((index: number) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      const selection = updated[index];
      updated[index] = { ...selection, machines: [...selection.machines, { machineId: "", hours: 0 }] };
      return { ...prev, laborSelections: updated };
    });
  }, []);

  const updateLaborMachine = useCallback((selectionIndex: number, machineIndex: number, field: "machineId" | "hours", value: string | number) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      const selection = updated[selectionIndex];
      const machinesList = [...selection.machines];
      machinesList[machineIndex] = { ...machinesList[machineIndex], [field]: value };
      updated[selectionIndex] = { ...selection, machines: machinesList };
      return { ...prev, laborSelections: updated };
    });
  }, []);

  const removeLaborMachine = useCallback((selectionIndex: number, machineIndex: number) => {
    setFormData(prev => {
      const updated = [...prev.laborSelections];
      const selection = updated[selectionIndex];
      updated[selectionIndex] = { ...selection, machines: selection.machines.filter((_, i) => i !== machineIndex) };
      return { ...prev, laborSelections: updated };
    });
  }, []);

  useEffect(() => {
    if (!selectedEmployee?.allowedLaborItemIds?.length) return;
    const allowed = new Set(selectedEmployee.allowedLaborItemIds);
    setFormData(prev => {
      const updated = prev.laborSelections.map(selection => {
        if (!selection.laborItemId || allowed.has(selection.laborItemId)) return selection;
        return { ...selection, laborItemId: "", units: 0, consumables: [], machines: [] };
      });
      return { ...prev, laborSelections: updated };
    });
  }, [selectedEmployee]);

  const calculateQuote = useCallback(() => {
    const validationError = validateFDMForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedMaterialId = formData.toolBreakdown?.find(item => !!item.materialId)?.materialId || formData.materialId;
    const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
    const selectedMachine = machines.find(m => m.id === formData.machineId);
    const selectedConsumables = constants
      .filter(c => formData.selectedConsumableIds.includes(c.id))
      .map(c => ({ name: c.name, value: c.value }));

    if (!selectedMaterial || !selectedMachine) {
      toast.error("Invalid material or machine selection");
      return;
    }

    // Validate mandatory constants
    const electricityRate = getConstantValue("electricity");

    if (!electricityRate || electricityRate <= 0) {
      toast.error("Electricity Rate is required. Please set it in Settings → Consumables.");
      return;
    }

    const invalidSelection = formData.laborSelections.find(selection => !selection.laborItemId || selection.units <= 0);
    if (invalidSelection) {
      toast.error("Each labor selection must include a labor item and units.");
      return;
    }

    const quoteData = calculateFDMQuote({
      formData: {
        ...formData,
        selectedSpoolId: selectedSpoolId || undefined,
      },
      material: selectedMaterial,
      machine: selectedMachine,
      electricityRate: getConstantValue("electricity"),
      consumables: selectedConsumables,
      materialsCatalog: materials,
      laborItems,
      consumableConstants: constants,
      machines: allMachines,
      customerId: formData.customerId,
      clientName: formData.clientName,
    });

    onCalculate(quoteData);
    toast.success("Quote calculated successfully!");
  }, [formData, selectedSpoolId, materials, machines, constants, getConstantValue, onCalculate, laborItems, allMachines]);

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setSelectedSpoolId(undefined);
    setCurrentGcodeData(null);
    clearFdmCalculatorDraft();
  }, []);

  const fdmMaterials = useMemo(() => materials.filter(item => item.print_type === "FDM"), [materials]);

  const allSpools = useMemo(() => getSpools(), []);

  const handleToolMaterialChange = useCallback((tool: string, materialId: string) => {
    const selectedMaterial = fdmMaterials.find(item => item.id === materialId);
    setFormData(prev => {
      const updatedBreakdown = (prev.toolBreakdown || []).map(item => (
        item.tool === tool
            ? { ...item, materialId, material: selectedMaterial?.name || item.material, spoolId: undefined }
          : item
      ));

      const updatedColorUsages = (prev.colorUsages || []).map(item => (
        item.tool === tool
            ? { ...item, materialId, material: selectedMaterial?.name || item.material, spoolId: undefined }
          : item
      ));

      return {
        ...prev,
        toolBreakdown: updatedBreakdown,
        colorUsages: updatedColorUsages,
      };
    });
  }, [fdmMaterials]);

  const handleToolSpoolChange = useCallback((tool: string, spoolId: string) => {
    const selectedSpool = allSpools.find(item => item.id === spoolId);
    if (!selectedSpool) return;
    const selectedMaterial = fdmMaterials.find(item => item.id === selectedSpool.materialId);

    setFormData(prev => {
      const updatedBreakdown = (prev.toolBreakdown || []).map(item => (
        item.tool === tool
          ? {
            ...item,
            spoolId,
            materialId: selectedSpool.materialId,
            material: selectedMaterial?.name || item.material,
            color: item.color || selectedSpool.color,
          }
          : item
      ));

      const updatedColorUsages = (prev.colorUsages || []).map(item => (
        item.tool === tool
          ? {
            ...item,
            spoolId,
            materialId: selectedSpool.materialId,
            material: selectedMaterial?.name || item.material,
            color: item.color || selectedSpool.color,
          }
          : item
      ));

      return {
        ...prev,
        toolBreakdown: updatedBreakdown,
        colorUsages: updatedColorUsages,
      };
    });
  }, [allSpools, fdmMaterials]);

  const machineOptions = useMemo(() =>
    machines.map(m => ({
      id: m.id,
      label: m.name,
      sublabel: `${currency.symbol}${m.hourly_cost}/hr`,
    })), [machines, currency]);

  const consumableItems = useMemo(() =>
    constants.map(c => ({
      id: c.id,
      name: c.name,
      value: c.value,
      unit: c.unit,
    })), [constants]);

  const uploadSection = (
    <div className="flex flex-col gap-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Auto-fill from G-code</p>
            <p className="text-sm text-muted-foreground">Upload .gcode or .3mf to extract parameters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentGcodeData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToLibrary}
              className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
              title="Save current file details to library"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save to Library</span>
            </Button>
          )}
          <GcodeUpload onDataExtracted={handleGcodeData} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Saved Files:</span>
        <Select onValueChange={handleSavedGcodeSelect} disabled={filteredGcodes.length === 0}>
          <SelectTrigger className="h-8 w-full max-w-[300px] bg-background/50">
            <SelectValue placeholder={filteredGcodes.length === 0 ? "No saved files" : "Select a saved file..."} />
          </SelectTrigger>
          <SelectContent>
            {filteredGcodes.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <div className="flex items-center gap-2">
                  <span>{g.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({g.printTime}h, {g.filamentWeight}g)
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <QuoteCalculator loading={loading} onCalculate={calculateQuote} onReset={handleReset} uploadSection={uploadSection}>
      <FormFieldRow label="Project Name" htmlFor="project-name" required>
        <TextField
          id="project-name"
          name="projectName"
          value={formData.projectName}
          onChange={(v) => updateField("projectName", v)}
          placeholder="Enter project name"
          maxLength={100}
        />
      </FormFieldRow>

      <FormFieldRow label="Client" htmlFor="fdm-client">
        <ClientSelector
          id="fdm-client"
          value={formData.customerId}
          onSelect={handleClientSelect}
        />
      </FormFieldRow>

      <FormFieldRow label="Machine" htmlFor="fdm-machine-id" required>
        <SelectField
          id="fdm-machine-id"
          name="machineId"
          value={formData.machineId}
          onChange={(v) => updateField("machineId", v)}
          placeholder="Select machine"
          options={machineOptions}
        />
      </FormFieldRow>

      <FormFieldRow label="Consumables" htmlFor="fdm-consumables-selector">
        <ConsumablesSelector
          id="fdm-consumables-selector"
          items={consumableItems}
          selectedIds={formData.selectedConsumableIds}
          onChange={handleConsumablesChange}
        />
      </FormFieldRow>

      <FormFieldRow label="Print Time (hours)" htmlFor="fdm-print-time" required>
        <TextField
          id="fdm-print-time"
          name="printTime"
          type="number"
          step="0.1"
          value={formData.printTime}
          onChange={(v) => updateField("printTime", v)}
          placeholder="8.5"
          min={0.1}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Filament Weight (grams)" htmlFor="fdm-filament-weight" required>
        <TextField
          id="fdm-filament-weight"
          name="filamentWeight"
          type="number"
          step="0.1"
          value={formData.filamentWeight}
          onChange={(v) => updateField("filamentWeight", v)}
          placeholder="250"
          min={0.1}
          max={50000}
        />
      </FormFieldRow>

      {formData.toolBreakdown && formData.toolBreakdown.length > 0 && (
        <div className="px-2 sm:px-4 py-2 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground/80">Filament Breakdown</p>
          <div className="overflow-auto rounded-md border border-border/60">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Filament</th>
                  <th className="px-2 py-2 text-left">Your Spool</th>
                  <th className="px-2 py-2 text-left">Material</th>
                  <th className="px-2 py-2 text-right">Model</th>
                  <th className="px-2 py-2 text-right">Support</th>
                  <th className="px-2 py-2 text-right">Tower</th>
                  <th className="px-2 py-2 text-right">Flush</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {formData.toolBreakdown.map((item) => (
                  <tr key={item.tool} className="border-t border-border/40">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <span>{item.tool}</span>
                        {item.color && <HexColorSwatch color={item.color} size="md" showHexLabel />}
                      </div>
                    </td>
                    <td className="px-2 py-2 min-w-[220px]">
                      <Select
                        value={item.spoolId || "none"}
                        onValueChange={(value) => {
                          if (value === "none") return;
                          handleToolSpoolChange(item.tool, value);
                        }}
                      >
                        <SelectTrigger className="h-8 bg-background">
                          <SelectValue placeholder="Map to your spool (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSpools.map(spool => (
                            <SelectItem key={spool.id} value={spool.id}>
                              <span className="inline-flex items-center gap-2">
                                {spool.color && <HexColorSwatch color={spool.color} size="sm" />}
                                {(spool.name || 'Unnamed')}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2 min-w-[220px]">
                      <Select
                        value={item.materialId || "none"}
                        onValueChange={(value) => {
                          if (value === "none") return;
                          handleToolMaterialChange(item.tool, value);
                        }}
                      >
                        <SelectTrigger className="h-8 bg-background">
                          <SelectValue placeholder={item.material || "Select material"} />
                        </SelectTrigger>
                        <SelectContent>
                          {fdmMaterials.map(material => (
                            <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2 text-right">{item.modelGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right">{item.supportGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right">{item.towerGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right">{item.flushGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right font-medium text-foreground">{item.totalGrams.toFixed(2)}g</td>
                  </tr>
                ))}
                <tr className="border-t border-border/60 bg-muted/20">
                  <td className="px-2 py-2 font-medium" colSpan={3}>Total</td>
                  <td className="px-2 py-2 text-right font-medium">
                    {formData.toolBreakdown.reduce((sum, item) => sum + item.modelGrams, 0).toFixed(2)}g
                  </td>
                  <td className="px-2 py-2 text-right font-medium">
                    {formData.toolBreakdown.reduce((sum, item) => sum + item.supportGrams, 0).toFixed(2)}g
                  </td>
                  <td className="px-2 py-2 text-right font-medium">
                    {formData.toolBreakdown.reduce((sum, item) => sum + item.towerGrams, 0).toFixed(2)}g
                  </td>
                  <td className="px-2 py-2 text-right font-medium">
                    {formData.toolBreakdown.reduce((sum, item) => sum + item.flushGrams, 0).toFixed(2)}g
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-foreground">
                    {formData.toolBreakdown.reduce((sum, item) => sum + item.totalGrams, 0).toFixed(2)}g
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formData.recyclableTotals && formData.recyclableTotals.recyclableGrams > 0 && (
        <div className="px-2 sm:px-4 py-2 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/80">Recyclable Plastic</p>
          <div className="flex justify-between"><span>Support</span><span>{formData.recyclableTotals.supportGrams.toFixed(2)}g</span></div>
          <div className="flex justify-between"><span>Tower</span><span>{formData.recyclableTotals.towerGrams.toFixed(2)}g</span></div>
          <div className="flex justify-between"><span>Flush</span><span>{formData.recyclableTotals.flushGrams.toFixed(2)}g</span></div>
          <div className="flex justify-between font-medium text-foreground"><span>Total Recyclable</span><span>{formData.recyclableTotals.recyclableGrams.toFixed(2)}g</span></div>
        </div>
      )}

      <FormFieldRow label="Assigned Employee" htmlFor="assigned-employee">
        <SelectField
          id="assigned-employee"
          name="assignedEmployeeId"
          value={formData.assignedEmployeeId || "none"}
          onChange={(v) => {
            const employeeId = v === "none" ? "" : v;
            updateField("assignedEmployeeId", employeeId);
            if (!employeeId) {
              updateField("laborSelections", []);
            }
          }}
          options={[
            { id: "none", label: "-- Select Employee --" },
            ...employees.map(e => ({ id: e.id, label: `${e.name} (${e.jobPosition})` }))
          ]}
          placeholder="Select employee"
        />
      </FormFieldRow>

      <FormFieldRow label="Labor Tasks" htmlFor="fdm-labor-tasks">
        <div className="space-y-3" id="fdm-labor-tasks">
          {formData.laborSelections.length === 0 ? (
            <p className="text-xs text-muted-foreground">No labor tasks added.</p>
          ) : (
            <div className="space-y-4">
              {formData.laborSelections.map((selection, index) => {
                const laborItem = laborItems.find(item => item.id === selection.laborItemId);
                const unitsLabel = laborItem?.pricingModel === "flat" ? "Quantity" : "Hours";

                return (
                  <div key={`labor-${index}`} className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
                    <div className="grid md:grid-cols-[1fr_160px_40px] gap-2 items-center">
                      <SelectField
                        value={selection.laborItemId || "none"}
                        onChange={(value) => handleLaborItemChange(index, value === "none" ? "" : value)}
                        placeholder="Select labor item"
                        options={laborOptions}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        value={selection.units}
                        onChange={(e) => updateLaborUnits(index, parseFloat(e.target.value) || 0)}
                        placeholder={unitsLabel}
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeLaborSelection(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Consumables</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => addLaborConsumable(index)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      {selection.consumables.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No consumables.</p>
                      ) : (
                        <div className="space-y-2">
                          {selection.consumables.map((consumable, consumableIndex) => (
                            <div key={`consumable-${index}-${consumableIndex}`} className="grid md:grid-cols-[1fr_140px_40px] gap-2 items-center">
                              <Select
                                value={consumable.constantId || "none"}
                                onValueChange={(value) => updateLaborConsumable(index, consumableIndex, "constantId", value === "none" ? "" : value)}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Select consumable" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- None --</SelectItem>
                                  {constants.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={consumable.quantity}
                                onChange={(e) => updateLaborConsumable(index, consumableIndex, "quantity", parseFloat(e.target.value) || 0)}
                                placeholder="Qty"
                                className="bg-background"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeLaborConsumable(index, consumableIndex)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Equipment</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => addLaborMachine(index)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      {selection.machines.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No equipment.</p>
                      ) : (
                        <div className="space-y-2">
                          {selection.machines.map((machineEntry, machineIndex) => (
                            <div key={`machine-${index}-${machineIndex}`} className="grid md:grid-cols-[1fr_140px_40px] gap-2 items-center">
                              <Select
                                value={machineEntry.machineId || "none"}
                                onValueChange={(value) => updateLaborMachine(index, machineIndex, "machineId", value === "none" ? "" : value)}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Select machine" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- None --</SelectItem>
                                  {allMachines.map(machineOption => (
                                    <SelectItem key={machineOption.id} value={machineOption.id}>{machineOption.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={machineEntry.hours}
                                onChange={(e) => updateLaborMachine(index, machineIndex, "hours", parseFloat(e.target.value) || 0)}
                                placeholder="Hours"
                                className="bg-background"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeLaborMachine(index, machineIndex)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addLaborSelection}>
            <Plus className="w-4 h-4 mr-1" />
            Add Labor Task
          </Button>
        </div>
      </FormFieldRow>

      <FormFieldRow label="Overhead (%)" htmlFor="fdm-overhead-percentage">
        <TextField
          id="fdm-overhead-percentage"
          name="overheadPercentage"
          type="number"
          step="0.1"
          value={formData.overheadPercentage}
          onChange={(v) => updateField("overheadPercentage", v)}
          placeholder="15"
          min={0}
          max={1000}
        />
      </FormFieldRow>

      <FormFieldRow label="Profit Markup (%)" htmlFor="markup-percentage">
        <TextField
          id="markup-percentage"
          name="markupPercentage"
          type="number"
          step="0.1"
          value={formData.markupPercentage}
          onChange={(v) => updateField("markupPercentage", v)}
          placeholder="20"
          min={0}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Quantity" htmlFor="quantity">
        <TextField
          id="quantity"
          name="quantity"
          type="number"
          step="1"
          value={formData.quantity}
          onChange={(v) => updateField("quantity", v)}
          placeholder="1"
          min={1}
          max={1000000}
        />
      </FormFieldRow>

      <FormFieldRow label="Order Priority" htmlFor="priority">
        <SelectField
          id="priority"
          name="priority"
          value={formData.priority || "Medium"}
          onChange={(v) => updateField("priority", v)}
          placeholder="Select priority"
          options={[
            { id: "Low", label: "Low" },
            { id: "Medium", label: "Medium" },
            { id: "High", label: "High" },
          ]}
        />
      </FormFieldRow>

      <FormFieldRow label="Due Date" htmlFor="due-date">
        <input
          id="due-date"
          name="dueDate"
          type="date"
          value={formData.dueDate || ""}
          onChange={(e) => updateField("dueDate", e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </FormFieldRow>

    </QuoteCalculator>
  );
});

FDMCalculatorTable.displayName = "FDMCalculatorTable";

export default FDMCalculatorTable;
