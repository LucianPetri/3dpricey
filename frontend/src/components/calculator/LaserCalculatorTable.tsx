/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FileUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { QuoteCalculator } from "./QuoteCalculator";
import { FormFieldRow, SelectField, TextField } from "./FormField";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { calculateLaserQuote, validateLaserForm } from "@/lib/quoteCalculations";
import { LaserFormData, QuoteData } from "@/types/quote";
import { useCurrency } from "@/hooks/useCurrency";
import { ConsumablesSelector } from "./ConsumablesSelector";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { clearLaserCalculatorDraft, getLaserCalculatorDraft, saveLaserCalculatorDraft } from "@/lib/core/sessionStorage";
import { parseSvgFile } from "@/lib/parsers/svgParser";

interface LaserCalculatorProps {
  onCalculate: (data: QuoteData) => void;
  initialQuote?: QuoteData | null;
}

const initialFormData: LaserFormData = {
  projectName: "",
  printColour: "",
  materialId: "",
  machineId: "",
  designWidth: "",
  designHeight: "",
  estimatedCutTime: "",
  estimatedEngravingTime: "0",
  materialSurfaceArea: "",
  laborHours: "0.25",
  laserPower: "",
  focusLensReplacement: false,
  laserTubeAge: "",
  overheadPercentage: "15",
  markupPercentage: "25",
  quantity: "1",
  selectedConsumableIds: [],
  filePath: "",
  customerId: "",
  clientName: "",
};

const LaserCalculatorTable = memo(({ onCalculate, initialQuote }: LaserCalculatorProps) => {
  const { materials, machines, constants, loading, getConstantValue } = useCalculatorData({ printType: "Laser" });
  const { currency } = useCurrency();
  const [formData, setFormData] = useState<LaserFormData>(initialFormData);

  useEffect(() => {
    const draft = getLaserCalculatorDraft<LaserFormData>();
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
    saveLaserCalculatorDraft({ formData });
  }, [formData]);

  useEffect(() => {
    if (!initialQuote || initialQuote.printType !== "Laser") {
      return;
    }

    const parameters = initialQuote.parameters as Partial<LaserFormData>;
    setFormData({
      ...initialFormData,
      ...parameters,
      projectName: initialQuote.projectName,
      printColour: initialQuote.printColour,
      materialId: parameters.materialId || "",
      machineId: parameters.machineId || initialQuote.assignedMachineId || "",
      quantity: String(initialQuote.quantity || parameters.quantity || 1),
      filePath: initialQuote.filePath || parameters.filePath || "",
      customerId: initialQuote.customerId || parameters.customerId || "",
      clientName: initialQuote.clientName || parameters.clientName || "",
      selectedConsumableIds: parameters.selectedConsumableIds || [],
      focusLensReplacement: Boolean(parameters.focusLensReplacement),
    });
  }, [initialQuote]);

  const updateField = useCallback(<K extends keyof LaserFormData>(field: K, value: LaserFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleClientSelect = useCallback((customer: { id: string; name: string } | null) => {
    setFormData((prev) => ({
      ...prev,
      customerId: customer?.id || "",
      clientName: customer?.name || "",
    }));
  }, []);

  const handleSvgUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseSvgFile(file);
      setFormData((prev) => ({
        ...prev,
        projectName: prev.projectName || parsed.fileName.replace(/\.[^.]+$/, ''),
        filePath: parsed.fileName,
        designWidth: String(parsed.widthMm),
        designHeight: String(parsed.heightMm),
        materialSurfaceArea: String(parsed.materialSurfaceArea),
        estimatedCutTime: String(parsed.estimatedCutTime),
        estimatedEngravingTime: String(parsed.estimatedEngravingTime),
      }));
      toast.success("SVG dimensions imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse SVG file");
    }
  }, []);

  const materialOptions = useMemo(() => materials.map((material) => ({
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
    const validationError = validateLaserForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedMaterial = materials.find((material) => material.id === formData.materialId);
    const selectedMachine = machines.find((machine) => machine.id === formData.machineId);
    if (!selectedMaterial || !selectedMachine) {
      toast.error("Please select a valid material and machine");
      return;
    }

    const quote = calculateLaserQuote({
      formData,
      material: selectedMaterial,
      machine: selectedMachine,
      electricityRate: getConstantValue("electricity"),
      consumables: constants
        .filter((constant) => formData.selectedConsumableIds.includes(constant.id))
        .map((constant) => ({ name: constant.name, value: constant.value })),
      customerId: formData.customerId,
      clientName: formData.clientName,
    });

    onCalculate(quote);
    toast.success("Laser quote calculated successfully");
  }, [constants, formData, getConstantValue, machines, materials, onCalculate]);

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    clearLaserCalculatorDraft();
  }, []);

  const uploadSection = (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
        <FileUp className="w-4 h-4 text-primary" />
        Import SVG
      </div>
      <Input type="file" accept=".svg,image/svg+xml" onChange={handleSvgUpload} />
      <p className="mt-2 text-xs text-muted-foreground">SVG upload can prefill dimensions, area, and time estimates.</p>
    </div>
  );

  return (
    <QuoteCalculator loading={loading} onCalculate={calculateQuote} onReset={handleReset} uploadSection={uploadSection}>
      <FormFieldRow label="Project Name" required>
        <TextField value={formData.projectName} onChange={(value) => updateField("projectName", value)} placeholder="Acrylic sign" />
      </FormFieldRow>

      <FormFieldRow label="Client">
        <ClientSelector value={formData.customerId} onSelect={handleClientSelect} />
      </FormFieldRow>

      <FormFieldRow label="Material" required>
        <SelectField value={formData.materialId} onChange={(value) => updateField("materialId", value)} placeholder="Select laser material" options={materialOptions} />
      </FormFieldRow>

      <FormFieldRow label="Machine" required>
        <SelectField value={formData.machineId} onChange={(value) => updateField("machineId", value)} placeholder="Select laser machine" options={machineOptions} />
      </FormFieldRow>

      <FormFieldRow label="Design Width (mm)" required>
        <TextField value={formData.designWidth} onChange={(value) => updateField("designWidth", value)} type="number" placeholder="200" />
      </FormFieldRow>

      <FormFieldRow label="Design Height (mm)" required>
        <TextField value={formData.designHeight} onChange={(value) => updateField("designHeight", value)} type="number" placeholder="80" />
      </FormFieldRow>

      <FormFieldRow label="Material Area (cm2)" required>
        <TextField value={formData.materialSurfaceArea} onChange={(value) => updateField("materialSurfaceArea", value)} type="number" placeholder="160" />
      </FormFieldRow>

      <FormFieldRow label="Estimated Cut Time (min)" required>
        <TextField value={formData.estimatedCutTime} onChange={(value) => updateField("estimatedCutTime", value)} type="number" placeholder="18" />
      </FormFieldRow>

      <FormFieldRow label="Estimated Engraving Time (min)">
        <TextField value={formData.estimatedEngravingTime} onChange={(value) => updateField("estimatedEngravingTime", value)} type="number" placeholder="4" />
      </FormFieldRow>

      <FormFieldRow label="Labor Hours">
        <TextField value={formData.laborHours} onChange={(value) => updateField("laborHours", value)} type="number" step="0.1" placeholder="0.5" />
      </FormFieldRow>

      <FormFieldRow label="Laser Power (W)">
        <TextField value={formData.laserPower} onChange={(value) => updateField("laserPower", value)} type="number" placeholder="60" />
      </FormFieldRow>

      <FormFieldRow label="Laser Tube Age (months)">
        <TextField value={formData.laserTubeAge} onChange={(value) => updateField("laserTubeAge", value)} type="number" placeholder="10" />
      </FormFieldRow>

      <FormFieldRow label="Consumables">
        <ConsumablesSelector items={consumableItems} selectedIds={formData.selectedConsumableIds} onChange={(selectedIds) => updateField("selectedConsumableIds", selectedIds)} />
      </FormFieldRow>

      <FormFieldRow label="Focus Lens Replacement" className="calculator-full-span">
        <label className="flex items-center gap-3 text-sm text-foreground">
          <Checkbox checked={formData.focusLensReplacement} onCheckedChange={(checked) => updateField("focusLensReplacement", Boolean(checked))} />
          Add focus lens replacement cost to this quote
        </label>
      </FormFieldRow>

      <FormFieldRow label="Accent Colour">
        <TextField value={formData.printColour} onChange={(value) => updateField("printColour", value)} placeholder="Clear / Black" />
      </FormFieldRow>

      <FormFieldRow label="Overhead (%)">
        <TextField value={formData.overheadPercentage} onChange={(value) => updateField("overheadPercentage", value)} type="number" placeholder="15" />
      </FormFieldRow>

      <FormFieldRow label="Markup (%)">
        <TextField value={formData.markupPercentage} onChange={(value) => updateField("markupPercentage", value)} type="number" placeholder="25" />
      </FormFieldRow>

      <FormFieldRow label="Quantity">
        <TextField value={formData.quantity} onChange={(value) => updateField("quantity", value)} type="number" placeholder="1" />
      </FormFieldRow>

      <div className="calculator-full-span rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
        <div className="flex items-center gap-2 font-medium mb-2">
          <Sparkles className="w-4 h-4" />
          Laser quoting focus
        </div>
        <p>Use SVG import for signwork and panel jobs. The calculator treats material pricing as area-based and folds setup consumables into the quote automatically.</p>
      </div>
    </QuoteCalculator>
  );
});

LaserCalculatorTable.displayName = "LaserCalculatorTable";

export default LaserCalculatorTable;