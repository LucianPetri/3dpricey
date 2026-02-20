/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createContext } from "react";
import { Currency } from "@/types/currency";

export interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatPrice: (amount: number) => string;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);
