/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Link } from "react-router-dom";

export const Footer = () => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-md px-4 sm:px-6 py-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground shadow-lg">
            {/* Left: Links and credits */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
                <Link to="/print-management" className="hover:text-primary transition-colors hover:underline decoration-primary/20">
                    Print Management
                </Link>
                <Link to="/order-management" className="hover:text-primary transition-colors hover:underline decoration-primary/20">
                    Order Management
                </Link>
            </div>
        </footer>
    );
};

export default Footer;
