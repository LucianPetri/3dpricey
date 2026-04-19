/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo, useMemo } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HexColorSwatch } from "@/components/shared/HexColorSwatch";
import { FilamentToolBreakdown, Material, MaterialSpool, QuoteFilamentSegment } from "@/types/quote";

interface FilamentCompositionFormProps {
  segments: QuoteFilamentSegment[];
  toolBreakdown: FilamentToolBreakdown[];
  materials: Material[];
  spools: MaterialSpool[];
  onChange: (segments: QuoteFilamentSegment[]) => void;
}

const normalizeSegments = (segments: QuoteFilamentSegment[]) =>
  segments.map((segment, index) => ({
    ...segment,
    order: index + 1,
  }));

const FilamentCompositionForm = memo(({ segments, toolBreakdown, materials, spools, onChange }: FilamentCompositionFormProps) => {
  const orderedSegments = useMemo(() => normalizeSegments([...segments].sort((left, right) => left.order - right.order)), [segments]);

  const updateSegment = (index: number, updates: Partial<QuoteFilamentSegment>) => {
    const nextSegments = orderedSegments.map((segment, segmentIndex) => {
      if (segmentIndex !== index) {
        return segment;
      }

      return {
        ...segment,
        ...updates,
      };
    });

    onChange(normalizeSegments(nextSegments));
  };

  const moveSegment = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedSegments.length) {
      return;
    }

    const nextSegments = [...orderedSegments];
    const [segment] = nextSegments.splice(index, 1);
    nextSegments.splice(nextIndex, 0, segment);
    onChange(normalizeSegments(nextSegments));
  };

  const removeSegment = (index: number) => {
    onChange(normalizeSegments(orderedSegments.filter((_, segmentIndex) => segmentIndex !== index)));
  };

  const addSegment = () => {
    onChange(normalizeSegments([
      ...orderedSegments,
      {
        materialId: "",
        weightGrams: 0,
        order: orderedSegments.length + 1,
      },
    ]));
  };

  return (
    <div className="calculator-full-span space-y-4 px-2 sm:px-4 py-2">
      {toolBreakdown.length > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">Detected G-code Breakdown</p>
            <p className="text-xs text-muted-foreground">Imported usage stays visible here while the ordered quote composition below controls pricing and persistence.</p>
          </div>
          <div className="overflow-auto rounded-md border border-border/60">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Tool</th>
                  <th className="px-2 py-2 text-left">Color</th>
                  <th className="px-2 py-2 text-right">Model</th>
                  <th className="px-2 py-2 text-right">Support</th>
                  <th className="px-2 py-2 text-right">Tower</th>
                  <th className="px-2 py-2 text-right">Flush</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {toolBreakdown.map((item) => (
                  <tr key={item.tool} className="border-t border-border/40">
                    <td className="px-2 py-2 whitespace-nowrap">{item.tool}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {item.color ? <HexColorSwatch color={item.color} size="md" showHexLabel /> : <span className="text-muted-foreground">-</span>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">{item.modelGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right">{item.supportGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right">{item.towerGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right">{item.flushGrams.toFixed(2)}g</td>
                    <td className="px-2 py-2 text-right font-medium">{item.totalGrams.toFixed(2)}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Filament Composition</p>
            <p className="text-xs text-muted-foreground">Order is preserved when the quote is saved and reopened.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addSegment} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Segment
          </Button>
        </div>

        <div className="overflow-auto rounded-md border border-border/60">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Order</th>
                <th className="px-2 py-2 text-left">Source</th>
                <th className="px-2 py-2 text-left">Spool</th>
                <th className="px-2 py-2 text-left">Material</th>
                <th className="px-2 py-2 text-right">Weight</th>
                <th className="px-2 py-2 text-left">Color</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderedSegments.length > 0 ? orderedSegments.map((segment, index) => {
                const selectedMaterial = materials.find((item) => item.id === segment.materialId);

                return (
                  <tr key={`${segment.tool || 'manual'}-${segment.order}-${index}`} className="border-t border-border/40">
                    <td className="px-2 py-2 font-medium text-foreground">{segment.order}</td>
                    <td className="px-2 py-2 text-muted-foreground">{segment.tool || 'Manual'}</td>
                    <td className="px-2 py-2 min-w-[220px]">
                      <Select
                        value={segment.spoolId || "none"}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            updateSegment(index, { spoolId: undefined });
                            return;
                          }

                          const selectedSpool = spools.find((spool) => spool.id === value);
                          const selectedSpoolMaterial = materials.find((item) => item.id === selectedSpool?.materialId);
                          updateSegment(index, {
                            spoolId: value,
                            materialId: selectedSpool?.materialId || segment.materialId,
                            materialName: selectedSpoolMaterial?.name || segment.materialName,
                            color: selectedSpool?.color || segment.color,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 bg-background">
                          <SelectValue placeholder="Optional spool mapping" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No spool</SelectItem>
                          {spools.map((spool) => (
                            <SelectItem key={spool.id} value={spool.id}>
                              <span className="inline-flex items-center gap-2">
                                {spool.color ? <HexColorSwatch color={spool.color} size="sm" /> : null}
                                {spool.name || 'Unnamed spool'}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2 min-w-[220px]">
                      <Select
                        value={segment.materialId || 'none'}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            updateSegment(index, { materialId: '', materialName: undefined });
                            return;
                          }

                          const nextMaterial = materials.find((item) => item.id === value);
                          updateSegment(index, {
                            materialId: value,
                            materialName: nextMaterial?.name || segment.materialName,
                            spoolId: undefined,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 bg-background">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No material</SelectItem>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedMaterial ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">{selectedMaterial.name}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 min-w-[120px]">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={segment.weightGrams || ''}
                        onChange={(event) => updateSegment(index, { weightGrams: parseFloat(event.target.value || '0') || 0 })}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {segment.color ? <HexColorSwatch color={segment.color} size="md" showHexLabel /> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSegment(index, -1)} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSegment(index, 1)} disabled={index === orderedSegments.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSegment(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td className="px-2 py-6 text-center text-muted-foreground" colSpan={7}>
                    Add at least one filament segment to price a multi-material FDM quote.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

FilamentCompositionForm.displayName = "FilamentCompositionForm";

export default FilamentCompositionForm;