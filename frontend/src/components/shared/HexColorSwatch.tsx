/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HexColorSwatchProps {
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showHexLabel?: boolean;
}

const sizeClasses: Record<NonNullable<HexColorSwatchProps["size"]>, string> = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const isHexColor = (value: string): boolean => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());

const normalizeHex = (value: string): string => {
  const trimmed = value.trim().toUpperCase();
  if (!isHexColor(trimmed)) return trimmed;

  const raw = trimmed.slice(1);
  if (raw.length === 3 || raw.length === 4) {
    return `#${raw.split("").map(ch => ch + ch).join("")}`;
  }

  return `#${raw}`;
};

const hexToRgba = (hex: string) => {
  const normalized = normalizeHex(hex);
  const body = normalized.replace("#", "");

  const hasAlpha = body.length === 8;
  const r = parseInt(body.slice(0, 2), 16);
  const g = parseInt(body.slice(2, 4), 16);
  const b = parseInt(body.slice(4, 6), 16);
  const a = hasAlpha ? parseInt(body.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }

  h = Math.round((h * 60 + 360) % 360);
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

export function HexColorSwatch({
  color,
  size = "md",
  className,
  showHexLabel = false,
}: HexColorSwatchProps) {
  const safeColor = (color || "").trim();

  if (!safeColor || !isHexColor(safeColor)) {
    return <span className={cn("text-muted-foreground", className)}>{safeColor || "-"}</span>;
  }

  const normalized = normalizeHex(safeColor);
  const { r, g, b, a } = hexToRgba(normalized);
  const hsl = rgbToHsl(r, g, b);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center gap-2", className)}>
          <div
            className={cn("rounded-full border border-border shadow-sm shrink-0", sizeClasses[size])}
            style={{ backgroundColor: normalized }}
            aria-label={`Color swatch ${normalized}`}
          />
          {showHexLabel && <span className="text-xs text-foreground">{normalized}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        <div className="space-y-1 min-w-[180px]">
          <div className="font-medium">{normalized}</div>
          <div>RGB: {r}, {g}, {b}</div>
          <div>HSL: {hsl.h}°, {hsl.s}%, {hsl.l}%</div>
          <div>Alpha: {a.toFixed(2)}</div>
          <div>Decimal: {r * 65536 + g * 256 + b}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
