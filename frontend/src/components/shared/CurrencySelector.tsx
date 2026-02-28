/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCIES } from "@/types/currency";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Coins } from "lucide-react";

export const CurrencySelector = () => {
    const { currency, setCurrency } = useCurrency();

    const handleChange = (code: string) => {
        const selected = CURRENCIES.find(c => c.code === code);
        if (selected) {
            setCurrency(selected);
        }
    };

    return (
        <Select value={currency.code} onValueChange={handleChange}>
            <SelectTrigger
                className="full-w rounded-lg border bg-popover text-sm font-medium text-foreground hover:bg-accent/50 focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:bg-accent"
                aria-label="Select Currency"
            >
                <SelectValue>
                    <div className="flex flex-col items-start full-w gap-1">
                        <span className="text-sm font-semibold text-foreground/90">{currency.code}</span>
                    </div>
                </SelectValue>
            </SelectTrigger>

            <SelectContent className="min-w-[240px] rounded-lg bg-popover">
                {CURRENCIES.map((c) => (
                    <SelectItem
                        key={c.code}
                        value={c.code}
                        className="py-2 cursor-pointer"
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-foreground">{c.symbol}</span>
                                <span className="text-sm font-medium text-foreground/90">{c.code}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{c.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default CurrencySelector;
