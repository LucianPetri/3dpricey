/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { QuoteData, QuoteStats } from "@/types/quote";
import { toast } from "sonner";
import * as sessionStore from "@/lib/core/sessionStorage";
import { syncService } from "@/lib/sync";

// Helper function to deduct inventory when a quote is saved
const deductInventoryFromQuote = (quote: QuoteData) => {
  if ((quote.quoteFilaments || []).length > 0) {
    quote.quoteFilaments?.forEach((segment) => {
      const totalDeduction = segment.weightGrams * (quote.quantity || 1);
      if (totalDeduction <= 0) {
        return;
      }

      if (segment.spoolId && sessionStore.deductFromSpool(segment.spoolId, totalDeduction)) {
        return;
      }

      if (!segment.materialId) {
        return;
      }

      const spools = sessionStore.getSpools(segment.materialId);
      if (spools.length === 0) {
        return;
      }

      const normalizedColor = segment.color?.toLowerCase().trim() || '';
      const targetSpool = (normalizedColor
        ? spools.find((spool) =>
            spool.color?.toLowerCase().includes(normalizedColor)
            || spool.name?.toLowerCase().includes(normalizedColor)
          )
        : undefined) || spools.reduce((max, spool) => spool.currentWeight > max.currentWeight ? spool : max, spools[0]);

      sessionStore.deductFromSpool(targetSpool.id, totalDeduction);
    });
    return;
  }

  // Only process if we have material and filament weight
  if (!quote.parameters?.materialName || !quote.parameters?.filamentWeight) {
    return;
  }

  const filamentWeight = parseFloat(quote.parameters.filamentWeight as string) || 0;
  if (filamentWeight <= 0) return;

  // Calculate total deduction (weight × quantity)
  const totalDeduction = filamentWeight * (quote.quantity || 1);

  // Priority 1: Use the explicitly selected spool ID if available
  const selectedSpoolId = quote.parameters?.selectedSpoolId as string | undefined;
  if (selectedSpoolId) {
    const success = sessionStore.deductFromSpool(selectedSpoolId, totalDeduction);
    if (success) {
      // Inventory deducted successfully
      return;
    }
  }

  // Priority 2: Fallback to color matching
  const materials = sessionStore.getMaterials();
  const material = materials.find(m => m.name === quote.parameters?.materialName);
  if (!material) return;

  const spools = sessionStore.getSpools(material.id);
  if (spools.length === 0) return;

  // Try to find a spool with matching color (case-insensitive)
  const quoteColor = quote.printColour?.toLowerCase().trim() || '';
  let targetSpool = quoteColor
    ? spools.find(s =>
        s.color?.toLowerCase().includes(quoteColor) ||
        s.name?.toLowerCase().includes(quoteColor)
      )
    : undefined;

  // If no color match, use the spool with most remaining weight
  if (!targetSpool) {
    targetSpool = spools.reduce((max, s) => s.currentWeight > max.currentWeight ? s : max, spools[0]);
  }

  const success = sessionStore.deductFromSpool(targetSpool.id, totalDeduction);
  if (success) {
    // Inventory deducted successfully
  }
};

// Helper function to restore inventory when a quote is deleted
const restoreInventoryFromQuote = (quote: QuoteData) => {
  if ((quote.quoteFilaments || []).length > 0) {
    quote.quoteFilaments?.forEach((segment) => {
      if (!segment.spoolId) {
        return;
      }

      const totalRestoration = segment.weightGrams * (quote.quantity || 1);
      if (totalRestoration <= 0) {
        return;
      }

      sessionStore.restoreToSpool(segment.spoolId, totalRestoration);
    });
    return;
  }

  // Only process if we have material and filament weight
  if (!quote.parameters?.materialName || (!quote.parameters?.filamentWeight && !quote.parameters?.resinVolume)) {
    return;
  }

  const weightVal = parseFloat(quote.parameters.filamentWeight as string || quote.parameters.resinVolume as string) || 0;
  if (weightVal <= 0) return;

  const totalRestoration = weightVal * (quote.quantity || 1);
  const selectedSpoolId = quote.parameters?.selectedSpoolId as string | undefined;

  if (selectedSpoolId) {
    const success = sessionStore.restoreToSpool(selectedSpoolId, totalRestoration);
    if (success) {
      // Inventory restored successfully
    }
  }
  // Note: We don't auto-restore for fallback matches as it might restore to the wrong spool
};

interface UseSavedQuotesReturn {
  quotes: QuoteData[];
  loading: boolean;
  error: string | null;
  stats: QuoteStats;
  saveQuote: (quote: QuoteData) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  duplicateQuote: (quote: QuoteData) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useSavedQuotes = (): UseSavedQuotesReturn => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = sessionStore.getQuotes();
      setQuotes(data);
    } catch (err) {
      const error = err as Error;
      const errorMessage = error.message || "Failed to load saved quotes";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    return syncService.subscribe(() => {
      setQuotes(sessionStore.getQuotes());
    });
  }, []);

  const stats = useMemo((): QuoteStats => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalRevenue = quotes.reduce((sum, q) => sum + q.totalPrice, 0);
    const totalProfit = quotes.reduce((sum, q) => sum + (q.markup || 0), 0);
    const recentQuotes = quotes.filter(q =>
      q.createdAt && new Date(q.createdAt) >= weekAgo
    ).length;

    return {
      totalQuotes: quotes.length,
      totalRevenue,
      totalProfit,
      avgQuoteValue: quotes.length > 0 ? totalRevenue / quotes.length : 0,
      fdmCount: quotes.filter(q => q.printType === "FDM").length,
      resinCount: quotes.filter(q => q.printType === "Resin").length,
      laserCount: quotes.filter(q => q.printType === "Laser").length,
      embroideryCount: quotes.filter(q => q.printType === "Embroidery").length,
      recentQuotes,
    };
  }, [quotes]);

  const saveQuote = useCallback(async (quote: QuoteData) => {
    try {
      const newQuote = sessionStore.saveQuote(quote);
      setQuotes(prev => [newQuote, ...prev]);
      syncService.queueQuoteCreate(newQuote);

      // Auto-deduct from inventory
      deductInventoryFromQuote(quote);

      toast.success(navigator.onLine ? "Quote saved and queued for sync" : "Quote saved offline and queued for sync");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to save quote");
      throw err;
    }
  }, []);

  const deleteQuote = useCallback(async (id: string) => {
    try {
      // Find quote to restore inventory
      const quoteToDelete = quotes.find(q => q.id === id);
      if (quoteToDelete) {
        restoreInventoryFromQuote(quoteToDelete);
        syncService.queueQuoteDelete(quoteToDelete, quoteToDelete.lastServerUpdatedAt || quoteToDelete.updatedAt);
      }

      sessionStore.deleteQuote(id);
      setQuotes(prev => prev.filter(q => q.id !== id));
      toast.success("Quote deleted locally");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete quote");
      throw err;
    }
  }, [quotes]);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    try {
      const currentQuote = quotes.find(q => q.id === id);
      const updatedQuote = sessionStore.updateQuoteNotes(id, notes);

      if (updatedQuote) {
        setQuotes(prev => prev.map(q => q.id === id ? updatedQuote : q));
        syncService.queueQuoteUpdate(updatedQuote, currentQuote?.lastServerUpdatedAt || currentQuote?.updatedAt);
      }

      toast.success("Notes updated locally");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to update notes");
      throw err;
    }
  }, [quotes]);

  const duplicateQuote = useCallback(async (quote: QuoteData) => {
    const duplicatedQuote: QuoteData = {
      ...quote,
      id: undefined,
      projectName: `${quote.projectName} (Copy)`,
      createdAt: undefined,
      notes: "",
    };
    await saveQuote(duplicatedQuote);
  }, [saveQuote]);

  return {
    quotes,
    loading,
    error,
    stats,
    saveQuote,
    deleteQuote,
    updateNotes,
    duplicateQuote,
    refetch: fetchQuotes,
  };
};
