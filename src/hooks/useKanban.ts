/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useContext } from "react";
import { KanbanContext } from "@/contexts/KanbanContext";

export const useKanban = () => {
    const context = useContext(KanbanContext);
    if (context === undefined) {
        throw new Error('useKanban must be used within a KanbanProvider');
    }
    return context;
};
