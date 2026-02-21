/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Search, AlertTriangle } from "lucide-react";
import { LaborItem, LaborPricingModel, CostConstant, Machine } from "@/types/quote";
import { getLaborItems, saveLaborItem, deleteLaborItem, getConstants, getMachines } from "@/lib/core/sessionStorage";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";

const createRowId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type LaborConsumableForm = {
  id: string;
  constantId: string;
  quantityPerUnit: string;
};

type LaborMachineForm = {
  id: string;
  machineId: string;
  hoursPerUnit: string;
};

const SettingsLabor = memo(() => {
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [constants, setConstants] = useState<CostConstant[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [editingItem, setEditingItem] = useState<LaborItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { currency } = useCurrency();

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    pricingModel: "hourly" as LaborPricingModel,
    rate: "",
    description: "",
    consumables: [] as LaborConsumableForm[],
    machines: [] as LaborMachineForm[],
  });

  const loadLaborItems = useCallback(() => {
    setLaborItems(getLaborItems());
  }, []);

  const loadConstants = useCallback(() => {
    setConstants(getConstants().filter(c => c.is_visible !== false));
  }, []);

  const loadMachines = useCallback(() => {
    setMachines(getMachines());
  }, []);

  useEffect(() => {
    loadLaborItems();
    loadConstants();
    loadMachines();
  }, [loadLaborItems, loadConstants, loadMachines]);

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      type: "",
      pricingModel: "hourly",
      rate: "",
      description: "",
      consumables: [],
      machines: [],
    });
    setIsDialogOpen(false);
  };

  const handleEdit = (item: LaborItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      pricingModel: item.pricingModel,
      rate: item.rate.toString(),
      description: item.description || "",
      consumables: item.consumables.map(c => ({
        id: c.id || createRowId(),
        constantId: c.constantId,
        quantityPerUnit: c.quantityPerUnit.toString(),
      })),
      machines: item.machines.map(m => ({
        id: m.id || createRowId(),
        machineId: m.machineId,
        hoursPerUnit: m.hoursPerUnit.toString(),
      })),
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      type: "",
      pricingModel: "hourly",
      rate: "",
      description: "",
      consumables: [],
      machines: [],
    });
    setIsDialogOpen(true);
  };

  const handleAddConsumable = () => {
    setFormData(prev => ({
      ...prev,
      consumables: [...prev.consumables, { id: createRowId(), constantId: "", quantityPerUnit: "" }],
    }));
  };

  const handleAddMachine = () => {
    setFormData(prev => ({
      ...prev,
      machines: [...prev.machines, { id: createRowId(), machineId: "", hoursPerUnit: "" }],
    }));
  };

  const updateConsumable = (id: string, field: keyof LaborConsumableForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      consumables: prev.consumables.map(item => item.id === id ? { ...item, [field]: value } : item),
    }));
  };

  const updateMachine = (id: string, field: keyof LaborMachineForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      machines: prev.machines.map(item => item.id === id ? { ...item, [field]: value } : item),
    }));
  };

  const removeConsumable = (id: string) => {
    setFormData(prev => ({
      ...prev,
      consumables: prev.consumables.filter(item => item.id !== id),
    }));
  };

  const removeMachine = (id: string) => {
    setFormData(prev => ({
      ...prev,
      machines: prev.machines.filter(item => item.id !== id),
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.type.trim()) {
      toast.error("Type is required");
      return;
    }

    const rateValue = parseFloat(formData.rate);
    if (Number.isNaN(rateValue) || rateValue < 0) {
      toast.error("Rate must be a non-negative number");
      return;
    }

    const consumables = formData.consumables
      .map(item => ({
        id: item.id,
        constantId: item.constantId,
        quantityPerUnit: parseFloat(item.quantityPerUnit),
      }))
      .filter(item => item.constantId && !Number.isNaN(item.quantityPerUnit));

    const machinesList = formData.machines
      .map(item => ({
        id: item.id,
        machineId: item.machineId,
        hoursPerUnit: parseFloat(item.hoursPerUnit),
      }))
      .filter(item => item.machineId && !Number.isNaN(item.hoursPerUnit));

    try {
      saveLaborItem({
        id: editingItem?.id,
        name: formData.name.trim(),
        type: formData.type.trim(),
        pricingModel: formData.pricingModel,
        rate: rateValue,
        description: formData.description.trim() || undefined,
        consumables,
        machines: machinesList,
      });

      toast.success(editingItem ? "Labor item updated" : "Labor item added");
      resetForm();
      loadLaborItems();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save labor item");
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteLaborItem(deleteId);
    toast.success("Labor item deleted");
    setDeleteId(null);
    loadLaborItems();
  };

  const filteredItems = laborItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Labor Items</h2>
          <p className="text-sm text-muted-foreground">Define labor tasks with consumables and equipment.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-labor"
              name="search"
              autoComplete="off"
              type="search"
              placeholder="Search labor..."
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddNew} className="bg-gradient-accent">
            <Plus className="w-4 h-4 mr-2" />
            Add Labor
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Pricing</TableHead>
              <TableHead className="font-semibold">Rate</TableHead>
              <TableHead className="font-semibold">Consumables</TableHead>
              <TableHead className="font-semibold">Equipment</TableHead>
              <TableHead className="w-24 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {searchQuery ? "No labor items found" : "No labor items yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.pricingModel === "hourly" ? "Hourly" : "Flat"}</TableCell>
                  <TableCell>{currency.symbol}{item.rate.toFixed(2)}</TableCell>
                  <TableCell>{item.consumables.length}</TableCell>
                  <TableCell>{item.machines.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(item)}
                        aria-label="Edit labor item"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(item.id)}
                        aria-label="Delete labor item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Labor Item" : "Add Labor Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="labor-name">Name *</Label>
                <Input
                  id="labor-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Support Removal"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labor-type">Type *</Label>
                <Input
                  id="labor-type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="Post-processing"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labor-pricing">Pricing Model *</Label>
                <Select
                  value={formData.pricingModel}
                  onValueChange={(value: LaborPricingModel) => setFormData(prev => ({ ...prev, pricingModel: value }))}
                >
                  <SelectTrigger id="labor-pricing" className="bg-background">
                    <SelectValue placeholder="Select pricing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="labor-rate">Rate ({currency.symbol}) *</Label>
                <Input
                  id="labor-rate"
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                  placeholder="25"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="labor-description">Description</Label>
                <Input
                  id="labor-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional notes"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Consumables Per Unit</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddConsumable}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Consumable
                </Button>
              </div>
              {formData.consumables.length === 0 ? (
                <p className="text-xs text-muted-foreground">No consumables attached.</p>
              ) : (
                <div className="space-y-2">
                  {formData.consumables.map(item => (
                    <div key={item.id} className="grid md:grid-cols-[1fr_160px_40px] gap-2 items-center">
                      <Select
                        value={item.constantId}
                        onValueChange={(value) => updateConsumable(item.id, "constantId", value)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select consumable" />
                        </SelectTrigger>
                        <SelectContent>
                          {constants.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantityPerUnit}
                        onChange={(e) => updateConsumable(item.id, "quantityPerUnit", e.target.value)}
                        placeholder="Qty per unit"
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeConsumable(item.id)}
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
                <Label className="text-sm font-medium">Equipment Hours Per Unit</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMachine}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Machine
                </Button>
              </div>
              {formData.machines.length === 0 ? (
                <p className="text-xs text-muted-foreground">No equipment attached.</p>
              ) : (
                <div className="space-y-2">
                  {formData.machines.map(item => (
                    <div key={item.id} className="grid md:grid-cols-[1fr_160px_40px] gap-2 items-center">
                      <Select
                        value={item.machineId}
                        onValueChange={(value) => updateMachine(item.id, "machineId", value)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.hoursPerUnit}
                        onChange={(e) => updateMachine(item.id, "hoursPerUnit", e.target.value)}
                        placeholder="Hours per unit"
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeMachine(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" className="bg-gradient-accent">
                {editingItem ? "Update" : "Add"} Labor Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Labor Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this labor item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

SettingsLabor.displayName = "SettingsLabor";

export default SettingsLabor;
