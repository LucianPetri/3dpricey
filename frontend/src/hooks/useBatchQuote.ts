/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useContext } from "react";
import { BatchQuoteContext } from "@/contexts/BatchQuoteContext";

export const useBatchQuote = () => {
    const context = useContext(BatchQuoteContext);
    if (!context) {
        throw new Error('useBatchQuote must be used within a BatchQuoteProvider');
    }
    return context;
};
