/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuoteData } from "@/types/quote";
import { useCurrency } from "@/hooks/useCurrency";
import { HexColorSwatch } from "@/components/shared/HexColorSwatch";

type ColorMaterialRow = {
    tool?: string;
    color: string;
    material: string;
};

const normalizeColor = (color?: string) => {
    const safeColor = (color || "").trim();
    if (!safeColor) return "";
    // Try longest patterns first (greedy): 8, 6, 4, 3
    const withHashMatch = safeColor.match(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})/);
    if (withHashMatch) return withHashMatch[0].toUpperCase();

    // Try bare hex digits (no hash): longest first
    const bareHexMatch = safeColor.match(/(?:^|[^0-9a-fA-F])([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?:[^0-9a-fA-F]|$)/);
    if (bareHexMatch) return `#${bareHexMatch[1].toUpperCase()}`;

    return safeColor;
};

const parseColorList = (value?: string): string[] => {
    return (value || "")
        .split(/[;,]/)
        .map(item => normalizeColor(item))
        .filter(Boolean);
};

const getColorMaterialRows = (quote: QuoteData): ColorMaterialRow[] => {
    const rawToolBreakdown = (quote.parameters as { toolBreakdown?: Array<{ tool?: string; color?: string; material?: string }> }).toolBreakdown;
    if (Array.isArray(rawToolBreakdown) && rawToolBreakdown.length > 0) {
        return rawToolBreakdown.map(item => ({
            tool: item.tool,
            color: normalizeColor(item.color) || "-",
            material: (item.material || "-").trim() || "-",
        }));
    }

    const rawColorUsages = quote.parameters.colorUsages;
    if (Array.isArray(rawColorUsages) && rawColorUsages.length > 0) {
        return rawColorUsages.map(item => ({
            tool: item.tool,
            color: normalizeColor(item.color) || "-",
            material: (item.material || "-").trim() || "-",
        }));
    }

    const fallbackColors = parseColorList(quote.printColour);
    const fallbackMaterial = (quote.parameters.materialName || "-").trim() || "-";
    return fallbackColors.map(color => ({
        color,
        material: fallbackMaterial,
    }));
};

interface QuoteDetailsDialogProps {
    quote: QuoteData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const QuoteDetailsDialog = memo(({ quote, open, onOpenChange }: QuoteDetailsDialogProps) => {
    const { formatPrice } = useCurrency();
    const colorMaterialRows = quote ? getColorMaterialRows(quote) : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border w-[95vw] max-w-5xl max-h-[86vh] overflow-hidden p-0">
                <DialogHeader>
                    <DialogTitle className="text-foreground px-6 pt-6 pb-3">Quote Details - {quote?.projectName}</DialogTitle>
                </DialogHeader>
                {quote && (
                    <div className="px-6 pb-6 overflow-y-auto">
                        <div className="grid lg:grid-cols-[1.05fr_1.35fr] gap-4">
                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-muted/20 p-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <DetailItem label="Profit Made" value={formatPrice(quote.markup)} />
                                        <DetailItem label="Client" value={quote.clientName || "-"} />
                                        <DetailItem label="Material" value={quote.parameters.materialName || "-"} />
                                        <DetailItem label="Machine" value={quote.parameters.machineName || "-"} />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                                    <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Colors</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {colorMaterialRows.length > 0 ? (
                                            colorMaterialRows.map((item, idx) => (
                                                <div key={`${item.tool || idx}-${item.color}-${idx}`} className="flex items-center gap-2 bg-background px-2.5 py-1.5 rounded-md border border-border/60">
                                                    <HexColorSwatch color={item.color} size="md" />
                                                    <span className="font-medium text-foreground text-xs">{item.color || "-"}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="font-medium text-foreground text-sm">-</p>
                                        )}
                                    </div>
                                </div>

                                {colorMaterialRows.length > 0 && (
                                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                                        <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Filament Mapping</h4>
                                        <div className="space-y-1.5">
                                            {colorMaterialRows.map((item, idx) => (
                                                <div key={`mapping-${item.tool || idx}-${item.color}-${idx}`} className="flex items-center justify-between text-sm bg-background rounded-md border border-border/60 px-3 py-2">
                                                    <div className="flex items-center gap-2 text-foreground min-w-0">
                                                        <HexColorSwatch color={item.color} size="md" />
                                                        <span className="font-medium truncate">{item.tool ? `${item.tool} • ` : ""}{item.color || "-"}</span>
                                                    </div>
                                                    <span className="text-muted-foreground ml-3 truncate">{item.material}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                                    <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Cost Breakdown</h4>
                                    <div className="space-y-2">
                                        <CostDetailRow label="Material Cost" value={quote.materialCost} formatPrice={formatPrice} />
                                        <CostDetailRow label="Machine Time" value={quote.machineTimeCost} formatPrice={formatPrice} />
                                        <CostDetailRow label="Electricity" value={quote.electricityCost} formatPrice={formatPrice} />
                                        <CostDetailRow label="Labor Cost" value={quote.laborCost} formatPrice={formatPrice} />
                                        {quote.parameters.laborItemsUsed && quote.parameters.laborItemsUsed.length > 0 && (
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                {quote.parameters.laborItemsUsed.map((item, index) => (
                                                    <div key={`${item.id}-${index}`} className="flex justify-between gap-2">
                                                        <span className="truncate">
                                                            {item.name} ({item.type}) • {item.units} {item.pricingModel === "flat" ? "qty" : "hrs"}
                                                        </span>
                                                        <span>{formatPrice(item.cost)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {quote.parameters.laborConsumablesUsed && quote.parameters.laborConsumablesUsed.length > 0 && (
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                {quote.parameters.laborConsumablesUsed.map((item) => (
                                                    <div key={item.constantId} className="flex justify-between gap-2">
                                                        <span className="truncate">
                                                            {item.name} • {item.quantity}
                                                        </span>
                                                        <span>{formatPrice(item.cost)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {quote.parameters.laborMachinesUsed && quote.parameters.laborMachinesUsed.length > 0 && (
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                {quote.parameters.laborMachinesUsed.map((item) => (
                                                    <div key={item.machineId} className="flex justify-between gap-2">
                                                        <span className="truncate">
                                                            {item.name} • {item.hours} hrs
                                                        </span>
                                                        <span>{formatPrice(item.cost)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {quote.laborConsumablesCost && quote.laborConsumablesCost > 0 && (
                                            <CostDetailRow label="Labor Consumables" value={quote.laborConsumablesCost} formatPrice={formatPrice} />
                                        )}
                                        {quote.laborMachineCost && quote.laborMachineCost > 0 && (
                                            <CostDetailRow label="Labor Equipment" value={quote.laborMachineCost} formatPrice={formatPrice} />
                                        )}
                                        {((quote.parameters.consumablesTotal || 0) > 0) && (
                                            <CostDetailRow label="Consumables" value={quote.parameters.consumablesTotal!} formatPrice={formatPrice} />
                                        )}
                                        <CostDetailRow label="Overhead" value={quote.overheadCost} formatPrice={formatPrice} />

                                        {quote.parameters.recyclableTotals && quote.parameters.recyclableTotals.recyclableGrams > 0 && (
                                            <div className="space-y-1 text-xs text-muted-foreground pt-1">
                                                <div className="flex justify-between"><span>Recyclable Support</span><span>{quote.parameters.recyclableTotals.supportGrams.toFixed(2)}g</span></div>
                                                <div className="flex justify-between"><span>Recyclable Tower</span><span>{quote.parameters.recyclableTotals.towerGrams.toFixed(2)}g</span></div>
                                                <div className="flex justify-between"><span>Recyclable Flush</span><span>{quote.parameters.recyclableTotals.flushGrams.toFixed(2)}g</span></div>
                                                <div className="flex justify-between font-medium text-foreground"><span>Total Recyclable</span><span>{quote.parameters.recyclableTotals.recyclableGrams.toFixed(2)}g</span></div>
                                            </div>
                                        )}

                                        <div className="my-2 border-t border-border/50" />

                                        <CostDetailRow label="Subtotal" value={quote.subtotal} highlight formatPrice={formatPrice} />
                                        <CostDetailRow label="Markup" value={quote.markup} formatPrice={formatPrice} />
                                    </div>

                                    <div className="border border-border rounded-xl p-4 mt-3 bg-background">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-foreground">Total Price:</span>
                                            <span className="text-2xl font-bold text-foreground tabular-nums">
                                                {formatPrice(quote.totalPrice)}
                                            </span>
                                        </div>
                                    </div>

                                    {quote.notes && (
                                        <div className="border-t border-border pt-3">
                                            <h4 className="font-semibold mb-2 text-foreground text-sm uppercase tracking-wide">Notes</h4>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-background p-3 rounded-lg border border-border/50">
                                                {quote.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

QuoteDetailsDialog.displayName = "QuoteDetailsDialog";

const DetailItem = memo(({ label, value }: { label: string; value: string }) => (
    <div>
        <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
        <p className="font-medium text-foreground mt-0.5 truncate" title={value}>{value}</p>
    </div>
));
DetailItem.displayName = "DetailItem";

const CostDetailRow = memo(({ label, value, highlight, formatPrice }: { label: string; value: number; highlight?: boolean, formatPrice: (val: number) => string }) => {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className={`text-muted-foreground ${highlight ? 'font-medium' : ''}`}>{label}:</span>
            <span className={`tabular-nums ${highlight ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                {formatPrice(value)}
            </span>
        </div>
    );
});
CostDetailRow.displayName = "CostDetailRow";
