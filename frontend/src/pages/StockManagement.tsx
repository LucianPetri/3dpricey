/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo, useCallback, useState } from "react";
import { useStock } from "@/hooks/useStock";
import { useCurrency } from "@/hooks/useCurrency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2, Package, TrendingUp, DollarSign, ArrowLeft } from "lucide-react";
import { HexColorSwatch } from "@/components/shared/HexColorSwatch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const StockManagement = memo(() => {
    const navigate = useNavigate();
    const { stock, stats, sellStock, updateStatus, deleteItem } = useStock();
    const { currency, formatPrice } = useCurrency();
    const [sellDialogOpen, setSellDialogOpen] = useState(false);
    const [sellQuantity, setSellQuantity] = useState(1);
    const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

    const handleSellClick = (stockId: string) => {
        setSelectedStockId(stockId);
        setSellQuantity(1);
        setSellDialogOpen(true);
    };

    const handleConfirmSell = useCallback(() => {
        if (!selectedStockId) return;
        const item = stock.find(s => s.id === selectedStockId);
        if (!item) return;

        if (sellQuantity > item.quantity) {
            toast.error(`Cannot sell more than ${item.quantity} units`);
            return;
        }

        sellStock(selectedStockId, sellQuantity);
        toast.success(`Marked ${sellQuantity} unit(s) as sold`);
        setSellDialogOpen(false);
        setSellQuantity(1);
        setSelectedStockId(null);
    }, [selectedStockId, sellQuantity, stock, sellStock]);

    const handleDeleteItem = useCallback((stockId: string) => {
        deleteItem(stockId);
        toast.success("Stock item deleted");
    }, [deleteItem]);

    const inStockItems = stock.filter(s => s.status === "IN_STOCK");
    const soldItems = stock.filter(s => s.status === "SOLD");

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Glow effect */}
            <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

            {/* Header */}
            <header className="border-b border-emerald-900/20 bg-gradient-to-r from-slate-950 to-slate-900 sticky top-0 z-40 shadow-lg">
                <div className="px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/")}
                            className="text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50"
                            title="Back to Calculator"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Stock Management</h1>
                            <p className="text-sm text-emerald-300/70 mt-1">Track inventory from completed orders</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto">
                <div className="px-8 py-8 pb-20">
                    {/* Stats Cards */}
                    <div className="grid lg:grid-cols-4 gap-4 mb-8">
                        <Card className="border-emerald-900/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-emerald-300/70">In Stock</p>
                                    <p className="text-2xl font-bold text-emerald-300 mt-1">{stats.totalItems}</p>
                                    <p className="text-xs text-muted-foreground mt-2">{formatPrice(stats.totalValue)}</p>
                                </div>
                                <Package className="w-12 h-12 text-emerald-500/30" />
                            </div>
                        </Card>

                        <Card className="border-cyan-900/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-cyan-300/70">Sold</p>
                                    <p className="text-2xl font-bold text-cyan-300 mt-1">{stats.soldItems}</p>
                                    <p className="text-xs text-muted-foreground mt-2">{formatPrice(stats.soldValue)}</p>
                                </div>
                                <TrendingUp className="w-12 h-12 text-cyan-500/30" />
                            </div>
                        </Card>

                        <Card className="border-purple-900/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-300/70">Reserved</p>
                                    <p className="text-2xl font-bold text-purple-300 mt-1">{stats.reservedItems}</p>
                                    <p className="text-xs text-muted-foreground mt-2">{formatPrice(stats.reservedValue)}</p>
                                </div>
                                <Package className="w-12 h-12 text-purple-500/30" />
                            </div>
                        </Card>

                        <Card className="border-emerald-900/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-emerald-300/70">Total Value</p>
                                    <p className="text-2xl font-bold text-emerald-300 mt-1">
                                        {formatPrice(stats.totalValue + stats.soldValue + stats.reservedValue)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">All inventory</p>
                                </div>
                                <DollarSign className="w-12 h-12 text-emerald-500/30" />
                            </div>
                        </Card>
                    </div>

                    {/* Inventory Table */}
                    <Card className="border-emerald-900/30 bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden">
                        <div className="p-6 border-b border-emerald-900/20">
                            <h2 className="text-xl font-bold text-white">Current Inventory</h2>
                            <p className="text-sm text-emerald-300/70 mt-1">{inStockItems.length} items in stock</p>
                        </div>

                        {inStockItems.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>No items in stock. Complete quotes to add them here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-emerald-900/20">
                                            <TableHead className="font-semibold text-foreground">Project</TableHead>
                                            <TableHead className="font-semibold text-foreground">Type</TableHead>
                                            <TableHead className="font-semibold text-foreground">Material</TableHead>
                                            <TableHead className="font-semibold text-foreground">Color</TableHead>
                                            <TableHead className="font-semibold text-foreground text-right">Qty</TableHead>
                                            <TableHead className="font-semibold text-foreground text-right">Unit Price</TableHead>
                                            <TableHead className="font-semibold text-foreground text-right">Total Value</TableHead>
                                            <TableHead className="font-semibold text-foreground">Created</TableHead>
                                            <TableHead className="font-semibold text-foreground w-24">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inStockItems.map(item => (
                                            <TableRow key={item.id} className="hover:bg-muted/40 border-emerald-900/20">
                                                <TableCell className="font-medium text-foreground">{item.projectName}</TableCell>
                                                <TableCell className="text-muted-foreground">{item.printType}</TableCell>
                                                <TableCell className="text-muted-foreground">{item.material || "-"}</TableCell>
                                                <TableCell>
                                                    {item.color ? <HexColorSwatch color={item.color} size="md" /> : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-foreground">{item.quantity}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{formatPrice(item.unitPrice)}</TableCell>
                                                <TableCell className="text-right font-semibold text-emerald-300">
                                                    {formatPrice(item.totalCost * item.quantity)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleSellClick(item.id)}
                                                            className="bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-600/30 text-emerald-300 text-xs"
                                                        >
                                                            Sell
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Card>

                    {/* Sold Items History */}
                    {soldItems.length > 0 && (
                        <Card className="border-emerald-900/30 bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden mt-8">
                            <div className="p-6 border-b border-emerald-900/20">
                                <h2 className="text-xl font-bold text-white">Sold Items</h2>
                                <p className="text-sm text-cyan-300/70 mt-1">{soldItems.length} items marked as sold</p>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-emerald-900/20">
                                            <TableHead className="font-semibold text-foreground">Project</TableHead>
                                            <TableHead className="font-semibold text-foreground">Material</TableHead>
                                            <TableHead className="font-semibold text-foreground text-right">Qty</TableHead>
                                            <TableHead className="font-semibold text-foreground text-right">Total Value</TableHead>
                                            <TableHead className="font-semibold text-foreground">Sold Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {soldItems.map(item => (
                                            <TableRow key={item.id} className="hover:bg-muted/40 border-emerald-900/20 opacity-60">
                                                <TableCell className="font-medium text-foreground">{item.projectName}</TableCell>
                                                <TableCell className="text-muted-foreground">{item.material || "-"}</TableCell>
                                                <TableCell className="text-right font-semibold text-foreground">{item.quantity}</TableCell>
                                                <TableCell className="text-right font-semibold text-cyan-300">
                                                    {formatPrice(item.totalCost * item.quantity)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    )}
                </div>
            </main>

            {/* Sell Dialog */}
            <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
                <DialogContent className="bg-card border-border max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Mark as Sold</DialogTitle>
                    </DialogHeader>

                    {selectedStockId && stock.find(s => s.id === selectedStockId) && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    {stock.find(s => s.id === selectedStockId)?.projectName}
                                </p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Available: {stock.find(s => s.id === selectedStockId)?.quantity} units
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Sold Quantity</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={stock.find(s => s.id === selectedStockId)?.quantity || 1}
                                    value={sellQuantity}
                                    onChange={(e) => setSellQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSellDialogOpen(false)}
                            className="bg-background hover:bg-muted border-input"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmSell}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Confirm Sale
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});

StockManagement.displayName = "StockManagement";

export default StockManagement;
