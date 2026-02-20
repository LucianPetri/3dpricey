/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export interface Currency {
    code: string;
    symbol: string;
    name: string;
}

export const CURRENCIES: Currency[] = [
    // Americas
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "MXN", symbol: "$", name: "Mexican Peso" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "ARS", symbol: "$", name: "Argentine Peso" },
    { code: "CLP", symbol: "$", name: "Chilean Peso" },
    { code: "COP", symbol: "$", name: "Colombian Peso" },
    { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
    // Europe
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
    { code: "SEK", symbol: "kr", name: "Swedish Krona" },
    { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
    { code: "DKK", symbol: "kr", name: "Danish Krone" },
    { code: "PLN", symbol: "zł", name: "Polish Zloty" },
    { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
    { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
    { code: "RON", symbol: "lei", name: "Romanian Leu" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira" },
    { code: "RUB", symbol: "₽", name: "Russian Ruble" },
    { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
    { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
    { code: "ISK", symbol: "kr", name: "Icelandic Krona" },
    // Middle East & Africa
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
    { code: "ILS", symbol: "₪", name: "Israeli New Shekel" },
    { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
    { code: "MAD", symbol: "د.م.", name: "Moroccan Dirham" },
    { code: "TND", symbol: "د.ت", name: "Tunisian Dinar" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
    // Asia-Pacific
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
    { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
    { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
    { code: "NPR", symbol: "रु", name: "Nepalese Rupee" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "KRW", symbol: "₩", name: "South Korean Won" },
    { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
    { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
    { code: "THB", symbol: "฿", name: "Thai Baht" },
    { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
    { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
    { code: "PHP", symbol: "₱", name: "Philippine Peso" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
];
