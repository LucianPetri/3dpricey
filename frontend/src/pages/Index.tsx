/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useCallback, memo, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Printer, RotateCcw, Settings, Loader2, Calculator, FileText, BarChart3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import FDMCalculatorTable from "@/components/calculator/FDMCalculatorTable";
import ResinCalculatorTable from "@/components/calculator/ResinCalculatorTable";
import QuoteSummary from "@/components/quotes/QuoteSummary";
import { Link } from "react-router-dom";
import { CurrencySelector } from "@/components/shared/CurrencySelector";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { QuoteData } from "@/types/quote";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { useBatchQuote } from "@/hooks/useBatchQuote";
import { useCurrency } from "@/hooks/useCurrency";
import WhatsNewDialog from "@/components/feedback/WhatsNewDialog";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { LicenseUpdateAnnouncement } from "@/components/feedback/LicenseUpdateAnnouncement";
import { BrandAnnouncement } from "@/components/feedback/BrandAnnouncement";

const SavedQuotesTable = lazy(() => import("@/components/quotes/SavedQuotesTable"));
const QuotesDashboard = lazy(() => import("@/components/dashboard/QuotesDashboard").then(module => ({ default: module.QuotesDashboard })));

const Index = memo(() => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [activeTab, setActiveTab] = useState<"fdm" | "resin">("fdm");
  const { formatPrice } = useCurrency();

  const [resetKey, setResetKey] = useState(0);

  const {
    quotes,
    loading,
    stats,
    saveQuote,
    deleteQuote,
    updateNotes,
    duplicateQuote,
  } = useSavedQuotes();

  const { clearBatch } = useBatchQuote();

  const handleReset = useCallback(() => {
    setQuoteData(null);
    clearBatch();
    setResetKey(prev => prev + 1);
  }, [clearBatch]);

  const handleSaveQuote = useCallback(async (quote: QuoteData) => {
    await saveQuote(quote);
  }, [saveQuote]);

  const handleDeleteQuote = useCallback(async (id: string) => {
    await deleteQuote(id);
  }, [deleteQuote]);

  const handleUpdateNotes = useCallback(async (id: string, notes: string) => {
    await updateNotes(id, notes);
  }, [updateNotes]);

  const handleDuplicateQuote = useCallback(async (quote: QuoteData) => {
    await duplicateQuote(quote);
  }, [duplicateQuote]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Glow effect */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      {/* Left Sidebar Navigation */}
      <aside className="w-64 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-r border-emerald-900/30 flex flex-col h-screen sticky top-0 shadow-2xl z-50">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-emerald-900/30 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">3DPricey</h1>
          <p className="text-xs text-emerald-300/70 mt-1">Cost Calculator</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {/* Calculator Section */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-emerald-400/60 uppercase tracking-wider px-3 mb-3">Calculator</p>
            <button
              onClick={() => setActiveTab("fdm")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === "fdm"
                  ? "bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500/40 text-emerald-300"
                  : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50"
              }`}
            >
              <Printer className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">FDM Printing</span>
            </button>
            <button
              onClick={() => setActiveTab("resin")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === "resin"
                  ? "bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500/40 text-emerald-300"
                  : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50"
              }`}
            >
              <Printer className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Resin Printing</span>
            </button>
          </div>

          {/* Management Section */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-cyan-400/60 uppercase tracking-wider px-3 mb-3">Management</p>
            <Button
              variant="ghost"
              asChild
              className="w-full justify-start text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50 px-4 py-3 h-auto"
            >
              <Link to="/saved-quotes" className="flex items-center gap-3">
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Saved Quotes</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="w-full justify-start text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50 px-4 py-3 h-auto"
            >
              <Link to="/print-management" className="flex items-center gap-3">
                <Calculator className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Print Management</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="w-full justify-start text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50 px-4 py-3 h-auto"
            >
              <Link to="/order-management" className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Orders</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="w-full justify-start text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50 px-4 py-3 h-auto"
            >
              <Link to="/stock" className="flex items-center gap-3">
                <Package className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Stock Management</span>
              </Link>
            </Button>
          </div>

          {/* Settings Section */}
          <div>
            <p className="text-xs font-semibold text-cyan-400/60 uppercase tracking-wider px-3 mb-3">Settings</p>
            <Button
              variant="ghost"
              asChild
              className="w-full justify-start text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50 px-4 py-3 h-auto"
            >
              <Link to="/settings" className="flex items-center gap-3">
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Configuration</span>
              </Link>
            </Button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-emerald-900/30 bg-gradient-to-r from-slate-950 to-slate-900 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CurrencySelector />
            <ThemeToggle />
          </div>
          <Button
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-sm font-medium py-2 rounded-lg transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Header Bar */}
        <header className="border-b border-emerald-900/20 bg-gradient-to-r from-slate-950 to-slate-900 sticky top-0 z-40 shadow-lg">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {activeTab === "fdm" ? "FDM Calculator" : "Resin Calculator"}
              </h2>
              <p className="text-sm text-emerald-300/70 mt-1">Professional 3D printing cost estimation</p>
            </div>
            {quoteData && (
              <div className="flex items-center gap-4 px-6 py-3 rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40">
                <div className="text-right">
                  <p className="text-xs text-emerald-300/70">Total Profit</p>
                  <p className="text-xl font-bold text-emerald-300">{formatPrice(quoteData.markup)}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="px-8 py-8 pb-20">
            {/* Stats Dashboard */}
            {stats.totalQuotes > 0 && (
              <div className="mb-8">
                <Suspense fallback={<div className="h-32 bg-card/50 rounded-xl animate-pulse" />}>
                  <QuotesDashboard stats={stats} />
                </Suspense>
              </div>
            )}

            {/* Calculator Content */}
            <div className="grid lg:grid-cols-[1fr_380px] gap-8">
              {/* Calculator Card */}
              <Card className="shadow-elevated border-emerald-900/30 bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden hover-glow">
                <div className="p-6">
                  {activeTab === "fdm" && (
                    <FDMCalculatorTable key={`fdm-${resetKey}`} onCalculate={setQuoteData} />
                  )}
                  {activeTab === "resin" && (
                    <ResinCalculatorTable key={`resin-${resetKey}`} onCalculate={setQuoteData} />
                  )}
                </div>
              </Card>

              {/* Quote Summary Sidebar */}
              <div className="lg:sticky lg:top-32 h-fit animate-fade-in space-y-6">
                <QuoteSummary quoteData={quoteData} onSaveQuote={handleSaveQuote} />
              </div>
            </div>

            {/* Saved Quotes Section */}
            <div className="mt-12 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Recent Quotes</h2>
                  <p className="text-muted-foreground text-sm">Your recently calculated quotes</p>
                </div>
                <Button
                  variant="ghost"
                  asChild
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 gap-2 group transition-all duration-200"
                >
                  <Link to="/saved-quotes">
                    <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform duration-300" />
                    View Full History ({quotes.length})
                  </Link>
                </Button>
              </div>

              {loading ? (
                <Card className="p-10 shadow-card bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-900/30">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-muted-foreground font-medium">Loading quotes...</span>
                  </div>
                </Card>
              ) : (
                <Suspense fallback={<Card className="p-10 shadow-card"><Loader2 className="w-8 h-8 animate-spin" /></Card>}>
                  <SavedQuotesTable
                    quotes={quotes.slice(0, 5)}
                    onDeleteQuote={handleDeleteQuote}
                    onUpdateNotes={handleUpdateNotes}
                    onDuplicateQuote={handleDuplicateQuote}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});

Index.displayName = "Index";

export default Index;
