/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createContext } from "react";
import { QuoteData, QuoteStatus } from "@/types/quote";

export interface KanbanContextType {
    columns: Record<QuoteStatus, QuoteData[]>;
    moveQuote: (quoteId: string, newStatus: QuoteStatus) => void;
    refreshBoard: () => void;
}

export const KanbanContext = createContext<KanbanContextType | undefined>(undefined);
