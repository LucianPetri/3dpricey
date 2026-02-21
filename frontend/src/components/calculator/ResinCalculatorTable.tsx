/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { Calculator, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QuoteData, ResinFormData, StoredGcode, LaborItem, Machine } from "@/types/quote";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { calculateResinQuote, validateResinForm } from "@/lib/quoteCalculations";
import { QuoteCalculator } from "./QuoteCalculator";
import { FormFieldRow, TextField, SelectField } from "./FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsumablesSelector } from "./ConsumablesSelector";
import { SpoolSelector } from "./SpoolSelector";
import ResinFileUpload from "./ResinFileUpload";
import { ResinFileData } from "@/lib/parsers/resinFileParser";
import { useCurrency } from "@/hooks/useCurrency";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoredGcodes } from "@/hooks/useStoredGcodes";
import { Employee } from "@/types/quote";
import { getEmployees, getLaborItems, getMachines, getResinCalculatorDraft, saveResinCalculatorDraft, clearResinCalculatorDraft } from "@/lib/core/sessionStorage";

interface ResinCalculatorProps {
  onCalculate: (data: QuoteData) => void;
}

const initialFormData: ResinFormData = {
  projectName: "",
  printColour: "",
  materialId: "",
  machineId: "",
  printTime: "",
  resinVolume: "",
  washingTime: "",
  curingTime: "",
  isopropylCost: "",
  laborSelections: [],
  overheadPercentage: "",
  markupPercentage: "20",
  quantity: "1",
  selectedConsumableIds: [],
  assignedEmployeeId: "",
};

const ResinCalculatorTable = memo(({ onCalculate }: ResinCalculatorProps) => {
  const { materials, machines, constants, loading, getConstantValue } = useCalculatorData({ printType: "Resin" });
  const [formData, setFormData] = useState<ResinFormData>(initialFormData);
  const [selectedSpoolId, setSelectedSpoolId] = useState<string>("");
  const { currency } = useCurrency();
  const { gcodes, saveGcode } = useStoredGcodes();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [allMachines, setAllMachines] = useState<Machine[]>([]);

  useEffect(() => {
    setEmployees(getEmployees());
    setLaborItems(getLaborItems());
    setAllMachines(getMachines());
  }, []);

  useEffect(() => {
    const draft = getResinCalculatorDraft<ResinFormData>();
    if (!draft?.formData) return;
    setFormData({
      ...initialFormData,
      ...draft.formData,
      laborSelections: draft.formData.laborSelections || [],
      selectedConsumableIds: draft.formData.selectedConsumableIds || [],
    });
    setSelectedSpoolId(draft.selectedSpoolId || "");
  }, []);

  useEffect(() => {
    saveResinCalculatorDraft({ formData, selectedSpoolId });
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

  // Filter for Resin files only
  const filteredGcodes = useMemo(() => {
    return gcodes.filter(g => (g.resinVolume || 0) > 0);
  }, [gcodes]);

  const [currentGcodeData, setCurrentGcodeData] = useState<{
    fileName: string;
    filePath: string;
    printTimeHours: number;
    resinVolumeMl: number;
    printerModel?: string;
  } | null>(null);

  const updateField = useCallback(<K extends keyof ResinFormData>(field: K, value: ResinFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleResinFileData = useCallback((data: ResinFileData) => {
    let matchedMachineId = '';

    if (data.printerModel) {
      const printerModelLower = data.printerModel.toLowerCase();
      const matchedMachine = machines.find(m =>
        m.name.toLowerCase().includes(printerModelLower) ||
        printerModelLower.includes(m.name.toLowerCase())
      );
      if (matchedMachine) {
        matchedMachineId = matchedMachine.id;
        toast.info(`Auto-selected machine: ${matchedMachine.name}`);
      }
    }

    setFormData(prev => ({
      ...prev,
      projectName: data.fileName ? data.fileName.substring(0, data.fileName.lastIndexOf('.')) || data.fileName : prev.projectName,
      printTime: data.printTimeHours > 0 ? data.printTimeHours.toString() : prev.printTime,
      resinVolume: data.resinVolumeMl > 0 ? data.resinVolumeMl.toString() : prev.resinVolume,
      machineId: matchedMachineId || prev.machineId,
    }));

    setCurrentGcodeData({
      fileName: data.fileName || "Unknown File",
      filePath: data.filePath || "",
      printTimeHours: data.printTimeHours,
      resinVolumeMl: data.resinVolumeMl,
      printerModel: data.printerModel
    });
  }, [machines]);

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

  const handleSavedGcodeSelect = useCallback((fileId: string) => {
    const file = gcodes.find(f => f.id === fileId);
    if (!file) return;

    // Find matching machine if possible
    let matchedMachineId = '';
    if (file.machineName) {
      const machineNameLower = file.machineName.toLowerCase();
      const matchedMachine = machines.find(m =>
        m.name.toLowerCase().includes(machineNameLower) ||
        machineNameLower.includes(m.name.toLowerCase())
      );
      if (matchedMachine) {
        matchedMachineId = matchedMachine.id;
      }
    }

    setFormData(prev => ({
      ...prev,
      projectName: file.name,
      printTime: file.printTime.toString(),
      resinVolume: (file.resinVolume || 0).toString(),
      machineId: matchedMachineId || prev.machineId,
    }));

    toast.success(`Loaded "${file.name}"`);
  }, [gcodes, machines]);

  const handleSaveToLibrary = async () => {
    if (!currentGcodeData) return;

    try {
      // Find material and machine names for metadata
      const machine = machines.find(m => m.id === formData.machineId);
      const material = materials.find(m => m.id === formData.materialId);

      const newGcode: StoredGcode = {
        id: crypto.randomUUID(),
        name: currentGcodeData.fileName,
        filePath: currentGcodeData.filePath,
        printTime: currentGcodeData.printTimeHours,
        filamentWeight: 0, // Not used for resin
        resinVolume: currentGcodeData.resinVolumeMl,
        machineName: machine?.name || currentGcodeData.printerModel,
        materialName: material?.name,
        printType: "Resin",
        createdAt: new Date().toISOString(),
      };

      await saveGcode(newGcode);
      toast.success("File saved to library");
    } catch (error) {
      console.error("Failed to save file", error);
      toast.error("Failed to save file to library");
    }
  };

  const calculateQuote = useCallback(() => {
    const validationError = validateResinForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedMaterial = materials.find(m => m.id === formData.materialId);
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

    const quoteData = calculateResinQuote({
      formData: {
        ...formData,
        selectedSpoolId: selectedSpoolId || undefined,
      },
      material: selectedMaterial,
      machine: selectedMachine,
      electricityRate: electricityRate,
      consumables: selectedConsumables,
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
    setSelectedSpoolId("");
    setCurrentGcodeData(null);
    clearResinCalculatorDraft();
  }, []);

  const materialOptions = useMemo(() =>
    materials.map(m => ({
      id: m.id,
      label: m.name,
      sublabel: `${currency.symbol}${m.cost_per_unit}/${m.unit}`,
    })), [materials, currency]);

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
            <p className="font-medium text-foreground">Auto-fill from Resin File</p>
            <p className="text-sm text-muted-foreground">Upload .cxdlpv4 to extract parameters</p>
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
          <ResinFileUpload onDataExtracted={handleResinFileData} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Saved Files:</span>
        <Select onValueChange={handleSavedGcodeSelect} disabled={filteredGcodes.length === 0}>
          <SelectTrigger className="h-8 w-full max-w-[300px] bg-background/50">
            <SelectValue placeholder={filteredGcodes.length === 0 ? "No saved files" : "Select a saved file..."} />
          </SelectTrigger>
          <SelectContent>
            {filteredGcodes.map((file) => (
              <SelectItem key={file.id} value={file.id}>
                <div className="flex items-center gap-2">
                  <span>{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({file.printTime}h, {file.resinVolume}ml)
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

      <FormFieldRow label="Client" htmlFor="resin-client">
        <ClientSelector
          id="resin-client"
          value={formData.customerId}
          onSelect={(customer) => {
            setFormData(prev => ({
              ...prev,
              customerId: customer?.id || "",
              clientName: customer?.name || ""
            }));
          }}
        />
      </FormFieldRow>

      <FormFieldRow label="Material" htmlFor="resin-material-id" required>
        <SelectField
          id="resin-material-id"
          name="materialId"
          value={formData.materialId}
          onChange={(v) => {
            updateField("materialId", v);
            // Reset spool selection when material changes
            setSelectedSpoolId("");
            updateField("printColour", "");
          }}
          placeholder="Select material"
          options={materialOptions}
        />
      </FormFieldRow>

      <FormFieldRow label="Color" htmlFor="resin-spool-selector" required>
        <SpoolSelector
          id="resin-spool-selector"
          name="spoolId"
          materialId={formData.materialId}
          value={selectedSpoolId}
          onChange={(spoolId, color) => {
            setSelectedSpoolId(spoolId);
            updateField("printColour", color);
          }}
          requiredWeight={(parseFloat(formData.resinVolume) || 0) * (parseInt(formData.quantity) || 1)}
          itemType="bottle"
        />
      </FormFieldRow>

      <FormFieldRow label="Machine" htmlFor="resin-machine-id" required>
        <SelectField
          id="resin-machine-id"
          name="machineId"
          value={formData.machineId}
          onChange={(v) => updateField("machineId", v)}
          placeholder="Select machine"
          options={machineOptions}
        />
      </FormFieldRow>

      <FormFieldRow label="Consumables" htmlFor="resin-consumables-selector">
        <ConsumablesSelector
          id="resin-consumables-selector"
          items={consumableItems}
          selectedIds={formData.selectedConsumableIds}
          onChange={handleConsumablesChange}
        />
      </FormFieldRow>

      <FormFieldRow label="Print Time (hours)" htmlFor="resin-print-time" required>
        <TextField
          id="resin-print-time"
          name="printTime"
          type="number"
          step="0.1"
          value={formData.printTime}
          onChange={(v) => updateField("printTime", v)}
          placeholder="4.5"
          min={0.1}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Resin Volume (ml)" htmlFor="resin-volume" required>
        <TextField
          id="resin-volume"
          name="resinVolume"
          type="number"
          step="0.1"
          value={formData.resinVolume}
          onChange={(v) => updateField("resinVolume", v)}
          placeholder="150"
          min={0.1}
          max={50000}
        />
      </FormFieldRow>

      <FormFieldRow label="Washing Time (minutes)" htmlFor="washing-time">
        <TextField
          id="washing-time"
          name="washingTime"
          type="number"
          value={formData.washingTime}
          onChange={(v) => updateField("washingTime", v)}
          placeholder="10"
          min={0}
          max={1440}
        />
      </FormFieldRow>

      <FormFieldRow label="Curing Time (minutes)" htmlFor="curing-time">
        <TextField
          id="curing-time"
          name="curingTime"
          type="number"
          value={formData.curingTime}
          onChange={(v) => updateField("curingTime", v)}
          placeholder="15"
          min={0}
          max={1440}
        />
      </FormFieldRow>

      <FormFieldRow label={`IPA/Cleaning Cost (${currency.symbol})`} htmlFor="isopropyl-cost">
        <TextField
          id="isopropyl-cost"
          name="isopropylCost"
          type="number"
          step="0.01"
          value={formData.isopropylCost}
          onChange={(v) => updateField("isopropylCost", v)}
          placeholder="50"
          min={0}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Assigned Employee" htmlFor="resin-assigned-employee">
        <SelectField
          id="resin-assigned-employee"
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

      <FormFieldRow label="Labor Tasks" htmlFor="resin-labor-tasks">
        <div className="space-y-3" id="resin-labor-tasks">
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

      <FormFieldRow label="Overhead (%)" htmlFor="resin-overhead-percentage">
        <TextField
          id="resin-overhead-percentage"
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

    </QuoteCalculator >
  );
});

ResinCalculatorTable.displayName = "ResinCalculatorTable";

export default ResinCalculatorTable;
