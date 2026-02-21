/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo } from "react";
import { QuoteStats } from "@/types/quote";
import { StatsCard } from "./StatsCard";
import { FileText, TrendingUp, Clock, CircleDollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface QuotesDashboardProps {
  stats: QuoteStats;
}

export const QuotesDashboard = memo(({ stats }: QuotesDashboardProps) => {
  const { currency } = useCurrency();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      <StatsCard
        title="Total Quotes"
        value={stats.totalQuotes}
        subtitle={`${stats.recentQuotes} this week`}
        icon={FileText}
      />
      <StatsCard
        title="Total Revenue"
        value={`${currency.symbol}${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        icon={TrendingUp}
        variant="primary"
      />
      <StatsCard
        title="Avg Quote Value"
        value={`${currency.symbol}${stats.avgQuoteValue.toFixed(0)}`}
        icon={Clock}
      />
      <StatsCard
        title="Profit Made"
        value={`${currency.symbol}${stats.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        subtitle="Total markup"
        icon={CircleDollarSign}
        variant="accent"
      />
    </div>
  );
});

QuotesDashboard.displayName = "QuotesDashboard";
