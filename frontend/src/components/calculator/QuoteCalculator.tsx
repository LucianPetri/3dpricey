/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, Loader2 } from "lucide-react";

interface QuoteCalculatorProps {
  loading: boolean;
  onCalculate: () => void;
  onReset?: () => void;
  children: React.ReactNode;
  uploadSection?: React.ReactNode;
}

export const QuoteCalculator = memo(({ loading, onCalculate, onReset, children, uploadSection }: QuoteCalculatorProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-muted-foreground">Loading calculator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {uploadSection}

      <div className="border border-border rounded-xl shadow-card bg-gradient-to-br from-card/80 to-card/40 p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 [&>*]:w-full xl:[&>*]:w-[calc(50%-0.375rem)] [&>.calculator-full-span]:xl:!w-full">
          {children}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          onClick={onCalculate}
          className="w-full font-bold shadow-elevated hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          size="lg"
          variant="default"
        >
          <Calculator className="w-5 h-5 mr-2" />
          Calculate Quote
        </Button>
        <Button
          onClick={onReset}
          className="w-full"
          size="lg"
          variant="outline"
          disabled={!onReset}
        >
          Reset Quote
        </Button>
      </div>
    </div>
  );
});

QuoteCalculator.displayName = "QuoteCalculator";
