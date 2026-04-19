/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FileUp, Shirt } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { QuoteCalculator } from "./QuoteCalculator";
import { FormFieldRow, SelectField, TextField } from "./FormField";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { calculateEmbroideryQuote, validateEmbroideryForm } from "@/lib/quoteCalculations";
import { EmbroideryFormData, QuoteData } from "@/types/quote";
import { useCurrency } from "@/hooks/useCurrency";
import { ConsumablesSelector } from "./ConsumablesSelector";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { clearEmbroideryCalculatorDraft, getEmbroideryCalculatorDraft, saveEmbroideryCalculatorDraft } from "@/lib/core/sessionStorage";
import { parseEmbroideryFile } from "@/lib/parsers/embroideryFileParser";

interface EmbroideryCalculatorProps {
  onCalculate: (data: QuoteData) => void;
  initialQuote?: QuoteData | null;
}

const initialFormData: EmbroideryFormData = {
  projectName: "",
  printColour: "",
  machineId: "",
  selectedBackingId: "",
  designWidth: "",
  designHeight: "",
  stitchCount: "",
  estimatedEmbroideryTime: "",
  baseGarmentCost: "",
  threadColors: "1",
  laborHours: "0.25",
  needleSize: "75/11",
  overheadPercentage: "12",
  markupPercentage: "30",
  quantity: "1",
  selectedConsumableIds: [],
  filePath: "",
  customerId: "",
  clientName: "",
};

const EmbroideryCalculatorTable = memo(({ onCalculate, initialQuote }: EmbroideryCalculatorProps) => {
  const { materials, machines, constants, loading, getConstantValue } = useCalculatorData({ printType: "Embroidery" });
  const { currency } = useCurrency();
  const [formData, setFormData] = useState<EmbroideryFormData>(initialFormData);

  useEffect(() => {
    const draft = getEmbroideryCalculatorDraft<EmbroideryFormData>();
    if (!draft?.formData) {
      return;
    }

    setFormData({
      ...initialFormData,
      ...draft.formData,
      selectedConsumableIds: draft.formData.selectedConsumableIds || [],
    });
  }, []);

  useEffect(() => {
    saveEmbroideryCalculatorDraft({ formData });
  }, [formData]);

  useEffect(() => {
    if (!initialQuote || initialQuote.printType !== "Embroidery") {
      return;
    }

    const parameters = initialQuote.parameters as Partial<EmbroideryFormData>;
    setFormData({
      ...initialFormData,
      ...parameters,
      projectName: initialQuote.projectName,
      printColour: initialQuote.printColour,
      machineId: parameters.machineId || initialQuote.assignedMachineId || "",
      selectedBackingId: parameters.selectedBackingId || (parameters.backingMaterialId as string) || "",
      quantity: String(initialQuote.quantity || parameters.quantity || 1),
      filePath: initialQuote.filePath || parameters.filePath || "",
      customerId: initialQuote.customerId || parameters.customerId || "",
      clientName: initialQuote.clientName || parameters.clientName || "",
      selectedConsumableIds: parameters.selectedConsumableIds || [],
    });
  }, [initialQuote]);

  const updateField = useCallback(<K extends keyof EmbroideryFormData>(field: K, value: EmbroideryFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleClientSelect = useCallback((customer: { id: string; name: string } | null) => {
    setFormData((prev) => ({
      ...prev,
      customerId: customer?.id || "",
      clientName: customer?.name || "",
    }));
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseEmbroideryFile(file);
      setFormData((prev) => ({
        ...prev,
        projectName: prev.projectName || parsed.fileName.replace(/\.[^.]+$/, ''),
        filePath: parsed.fileName,
        designWidth: String(parsed.designWidth),
        designHeight: String(parsed.designHeight),
        stitchCount: String(parsed.stitchCount),
        estimatedEmbroideryTime: String(parsed.estimatedEmbroideryTime),
      }));
      toast.success("Embroidery design imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse embroidery file");
    }
  }, []);

  const backingOptions = useMemo(() => materials.map((material) => ({
    id: material.id,
    label: material.name,
    sublabel: `${currency.symbol}${material.cost_per_unit}/${material.unit}`,
  })), [materials, currency.symbol]);

  const machineOptions = useMemo(() => machines.map((machine) => ({
    id: machine.id,
    label: machine.name,
    sublabel: `${currency.symbol}${machine.hourly_cost}/hr`,
  })), [machines, currency.symbol]);

  const consumableItems = useMemo(() => constants.map((constant) => ({
    id: constant.id,
    name: constant.name,
    value: constant.value,
    unit: constant.unit,
  })), [constants]);

  const calculateQuote = useCallback(() => {
    const validationError = validateEmbroideryForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedBacking = materials.find((material) => material.id === formData.selectedBackingId);
    const selectedMachine = machines.find((machine) => machine.id === formData.machineId);
    if (!selectedBacking || !selectedMachine) {
      toast.error("Please select a valid backing material and machine");
      return;
    }

    const quote = calculateEmbroideryQuote({
      formData,
      material: selectedBacking,
      machine: selectedMachine,
      electricityRate: getConstantValue("electricity"),
      consumables: constants
        .filter((constant) => formData.selectedConsumableIds.includes(constant.id))
        .map((constant) => ({ name: constant.name, value: constant.value })),
      customerId: formData.customerId,
      clientName: formData.clientName,
    });

    onCalculate(quote);
    toast.success("Embroidery quote calculated successfully");
  }, [constants, formData, getConstantValue, machines, materials, onCalculate]);

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    clearEmbroideryCalculatorDraft();
  }, []);

  const uploadSection = (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
        <FileUp className="w-4 h-4 text-primary" />
        Import PES design
      </div>
      <Input type="file" accept=".pes" onChange={handleFileUpload} />
      <p className="mt-2 text-xs text-muted-foreground">Upload a PES file to prefill stitch count, design size, and runtime.</p>
    </div>
  );

  return (
    <QuoteCalculator loading={loading} onCalculate={calculateQuote} onReset={handleReset} uploadSection={uploadSection}>
      <FormFieldRow label="Project Name" required>
        <TextField value={formData.projectName} onChange={(value) => updateField("projectName", value)} placeholder="Uniform logo" />
      </FormFieldRow>

      <FormFieldRow label="Client">
        <ClientSelector value={formData.customerId} onSelect={handleClientSelect} />
      </FormFieldRow>

      <FormFieldRow label="Machine" required>
        <SelectField value={formData.machineId} onChange={(value) => updateField("machineId", value)} placeholder="Select embroidery machine" options={machineOptions} />
      </FormFieldRow>

      <FormFieldRow label="Backing Material" required>
        <SelectField value={formData.selectedBackingId} onChange={(value) => updateField("selectedBackingId", value)} placeholder="Select backing material" options={backingOptions} />
      </FormFieldRow>

      <FormFieldRow label="Design Width (mm)" required>
        <TextField value={formData.designWidth} onChange={(value) => updateField("designWidth", value)} type="number" placeholder="90" />
      </FormFieldRow>

      <FormFieldRow label="Design Height (mm)" required>
        <TextField value={formData.designHeight} onChange={(value) => updateField("designHeight", value)} type="number" placeholder="45" />
      </FormFieldRow>

      <FormFieldRow label="Stitch Count" required>
        <TextField value={formData.stitchCount} onChange={(value) => updateField("stitchCount", value)} type="number" placeholder="12500" />
      </FormFieldRow>

      <FormFieldRow label="Embroidery Time (min)" required>
        <TextField value={formData.estimatedEmbroideryTime} onChange={(value) => updateField("estimatedEmbroideryTime", value)} type="number" placeholder="16" />
      </FormFieldRow>

      <FormFieldRow label="Base Garment Cost">
        <TextField value={formData.baseGarmentCost} onChange={(value) => updateField("baseGarmentCost", value)} type="number" placeholder="8.5" />
      </FormFieldRow>

      <FormFieldRow label="Thread Colors">
        <TextField value={formData.threadColors} onChange={(value) => updateField("threadColors", value)} type="number" placeholder="3" />
      </FormFieldRow>

      <FormFieldRow label="Labor Hours">
        <TextField value={formData.laborHours} onChange={(value) => updateField("laborHours", value)} type="number" step="0.1" placeholder="0.3" />
      </FormFieldRow>

      <FormFieldRow label="Needle Size">
        <TextField value={formData.needleSize} onChange={(value) => updateField("needleSize", value)} placeholder="75/11" />
      </FormFieldRow>

      <FormFieldRow label="Consumables">
        <ConsumablesSelector items={consumableItems} selectedIds={formData.selectedConsumableIds} onChange={(selectedIds) => updateField("selectedConsumableIds", selectedIds)} />
      </FormFieldRow>

      <FormFieldRow label="Garment Colour">
        <TextField value={formData.printColour} onChange={(value) => updateField("printColour", value)} placeholder="Navy" />
      </FormFieldRow>

      <FormFieldRow label="Overhead (%)">
        <TextField value={formData.overheadPercentage} onChange={(value) => updateField("overheadPercentage", value)} type="number" placeholder="12" />
      </FormFieldRow>

      <FormFieldRow label="Markup (%)">
        <TextField value={formData.markupPercentage} onChange={(value) => updateField("markupPercentage", value)} type="number" placeholder="30" />
      </FormFieldRow>

      <FormFieldRow label="Quantity">
        <TextField value={formData.quantity} onChange={(value) => updateField("quantity", value)} type="number" placeholder="1" />
      </FormFieldRow>

      <div className="calculator-full-span rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-100">
        <div className="flex items-center gap-2 font-medium mb-2">
          <Shirt className="w-4 h-4" />
          Embroidery quoting focus
        </div>
        <p>This workflow prices the garment, thread color changes, backing material, machine runtime, and finishing labor in a single embroidery quote.</p>
      </div>
    </QuoteCalculator>
  );
});

EmbroideryCalculatorTable.displayName = "EmbroideryCalculatorTable";

export default EmbroideryCalculatorTable;