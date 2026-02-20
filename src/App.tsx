/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Suspense, lazy } from "react";
import { ShieldCheck } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { BatchQuoteProvider } from "@/contexts/BatchQuoteProvider";
import { ProductionProvider } from "@/contexts/ProductionProvider";
import { CurrencyProvider } from "@/components/shared/CurrencyProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { useAppProtection } from "@/hooks/useAppProtection";
import OrderManagement from "./pages/OrderManagement";
import Layout from "./components/layout/Layout";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Settings = lazy(() => import("./pages/Settings"));
const SavedQuotes = lazy(() => import("./pages/SavedQuotes"));

const PrintManagement = lazy(() => import("./pages/PrintManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component with better FCP and visual appeal
const PageLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-gradient-glow animate-fade-in">
    <div className="relative flex flex-col items-center max-w-md w-full gap-8">
      {/* Brand representation in loader */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-xl" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-xl animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-primary/20 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground/80">3DPricey</h2>
          <div className="flex gap-1 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>

      {/* Privacy Guarantee during load */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-[10px] text-muted-foreground animate-pulse-soft">
        <ShieldCheck className="w-3 h-3 text-success" />
        <span>Secure Local Processing</span>
      </div>
    </div>
  </div>
);

// Configure QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  // Enable UI protection (disable context menu, F12, etc.)
  // useAppProtection();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CurrencyProvider>
            <BatchQuoteProvider>
              <ProductionProvider>
                <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route element={<Layout />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>
                      <Route path="/saved-quotes" element={<SavedQuotes />} />
                      <Route path="/order-management" element={<OrderManagement />} />

                      <Route path="/print-management" element={<PrintManagement />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </HashRouter>
              </ProductionProvider>
            </BatchQuoteProvider>
          </CurrencyProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

};

export default App;
