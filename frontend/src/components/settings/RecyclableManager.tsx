/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Recycle, Scale } from "lucide-react";
import { useStoredGcodes } from "@/hooks/useStoredGcodes";
import { getRecyclableColorTotals } from "@/lib/core/sessionStorage";
import { HexColorSwatch } from "@/components/shared/HexColorSwatch";

const RecyclableManager = () => {
  const { gcodes, loading } = useStoredGcodes();

  const recyclableData = useMemo(() => {
    return getRecyclableColorTotals();
  }, [gcodes]);

  if (loading) {
    return <div className="text-center py-8">Loading recyclable totals...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-muted/20 border-border">
        <div className="flex items-center gap-2 mb-3">
          <Recycle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Recyclable Plastic Totals</h3>
        </div>
        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border border-border p-3 bg-background/70">
            <p className="text-muted-foreground">Support</p>
            <p className="font-semibold">{recyclableData.totals.supportGrams.toFixed(2)}g</p>
          </div>
          <div className="rounded-md border border-border p-3 bg-background/70">
            <p className="text-muted-foreground">Tower</p>
            <p className="font-semibold">{recyclableData.totals.towerGrams.toFixed(2)}g</p>
          </div>
          <div className="rounded-md border border-border p-3 bg-background/70">
            <p className="text-muted-foreground">Flush</p>
            <p className="font-semibold">{recyclableData.totals.flushGrams.toFixed(2)}g</p>
          </div>
          <div className="rounded-md border border-primary/30 p-3 bg-primary/5">
            <p className="text-muted-foreground">Total Recyclable</p>
            <p className="font-semibold text-primary">{recyclableData.totals.recyclableGrams.toFixed(2)}g</p>
          </div>
        </div>
      </Card>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>In Stock (g)</TableHead>
              <TableHead>Surplus (g)</TableHead>
              <TableHead>Support (g)</TableHead>
              <TableHead>Tower (g)</TableHead>
              <TableHead>Flush (g)</TableHead>
              <TableHead>Total Recyclable (g)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recyclableData.byColor.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Scale className="w-8 h-8 opacity-30" />
                    <p>No recyclable color data yet.</p>
                    <p className="text-xs">Upload/save multicolor G-code files to populate this section.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recyclableData.byColor.map((row) => (
                <TableRow key={row.color}>
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <HexColorSwatch color={row.color} size="md" showHexLabel />
                      <Badge variant="outline">{row.color}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{row.stockGrams.toFixed(2)}</TableCell>
                  <TableCell className={row.surplusGrams >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                    {row.surplusGrams.toFixed(2)}
                  </TableCell>
                  <TableCell>{row.supportGrams.toFixed(2)}</TableCell>
                  <TableCell>{row.towerGrams.toFixed(2)}</TableCell>
                  <TableCell>{row.flushGrams.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">{row.recyclableGrams.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecyclableManager;
