/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useEffect, useCallback } from "react";
import { StockItem, StockStats, QuoteData } from "@/types/quote";
import * as sessionStore from "@/lib/core/sessionStorage";

export const useStock = () => {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [stats, setStats] = useState<StockStats>({
        totalItems: 0,
        totalValue: 0,
        soldItems: 0,
        soldValue: 0,
        reservedItems: 0,
        reservedValue: 0,
    });

    useEffect(() => {
        const stockData = sessionStore.getStock();
        setStock(stockData);
        const newStats = sessionStore.getStockStats();
        setStats(newStats);
    }, []);

    const addToStock = useCallback((quoteData: QuoteData, quantity: number) => {
        sessionStore.addToStock(quoteData, quantity);
        const updated = sessionStore.getStock();
        setStock(updated);
        const newStats = sessionStore.getStockStats();
        setStats(newStats);
    }, []);

    const sellStock = useCallback((stockId: string, soldQuantity: number) => {
        sessionStore.removeFromStock(stockId, soldQuantity);
        const updated = sessionStore.getStock();
        setStock(updated);
        const newStats = sessionStore.getStockStats();
        setStats(newStats);
    }, []);

    const updateStatus = useCallback((stockId: string, status: "IN_STOCK" | "SOLD" | "RESERVED") => {
        sessionStore.updateStockStatus(stockId, status);
        const updated = sessionStore.getStock();
        setStock(updated);
        const newStats = sessionStore.getStockStats();
        setStats(newStats);
    }, []);

    const deleteItem = useCallback((stockId: string) => {
        sessionStore.deleteStockItem(stockId);
        const updated = sessionStore.getStock();
        setStock(updated);
        const newStats = sessionStore.getStockStats();
        setStats(newStats);
    }, []);

    return { stock, stats, addToStock, sellStock, updateStatus, deleteItem };
};
