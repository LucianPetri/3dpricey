/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


// CORE SYSTEM INTEGRITY MODULE
// DO NOT MODIFY - CHECKSUM PROTECTED

// Secure decoder
const _d = (s: string): string => {
    try {
        return typeof window !== 'undefined' ? window.atob(s) : Buffer.from(s, 'base64').toString('utf-8');
    } catch {
        return "";
    }
};
