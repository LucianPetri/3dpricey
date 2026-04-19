/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

export interface ParsedColorChange {
  order: number;
  tool: string;
  color?: string;
  material?: string;
  weightGrams: number;
}

export interface ParsedToolBreakdown {
  order: number;
  tool: string;
  color?: string;
  material?: string;
  modelGrams: number;
  supportGrams: number;
  towerGrams: number;
  flushGrams: number;
  totalGrams: number;
}

export interface ParsedGcodeQuoteData {
  colorChanges: ParsedColorChange[];
  toolBreakdown: ParsedToolBreakdown[];
  recyclableTotals: {
    supportGrams: number;
    towerGrams: number;
    flushGrams: number;
    recyclableGrams: number;
    modelGrams: number;
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const parseNumberList = (raw: string): number[] =>
  raw
    .split(/[;,]/)
    .map((item) => parseFloat(item.trim().replace(/[^\d.+-]/g, '')))
    .filter((value) => !Number.isNaN(value));

const parseStringList = (raw: string): string[] =>
  raw
    .split(';')
    .map((item) => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);

function parseTotalFilamentWeight(gcode: string) {
  const patterns = [
    /total filament weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,
    /total filament used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
    /filament used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
    /total filament used\s*[:=]\s*([\d.]+)\s*g/i,
    /filament used\s*[:=]\s*([\d.]+)\s*g/i,
  ];

  for (const pattern of patterns) {
    const match = gcode.match(pattern);
    if (match) {
      return round2(parseFloat(match[1]));
    }
  }

  return 0;
}

export function parseQuoteGcode(gcode: string): ParsedGcodeQuoteData {
  const perToolWeightMatch = gcode.match(/;\s*filament used\s*\[g\]\s*=\s*([^\n\r]+)/i);
  const perToolWeights = perToolWeightMatch ? parseNumberList(perToolWeightMatch[1]) : [];
  const totalWeight = parseTotalFilamentWeight(gcode);

  const colorListMatch = gcode.match(/;\s*filament_colou?r\s*=\s*([^\n\r]+)/i)
    || gcode.match(/;\s*default_filament_colou?r\s*=\s*([^\n\r]+)/i);
  const colorsByTool = colorListMatch ? parseStringList(colorListMatch[1]) : [];

  const materialListMatch = gcode.match(/;\s*filament_type\s*=\s*([^\n\r]+)/i)
    || gcode.match(/;\s*default_filament_type\s*=\s*([^\n\r]+)/i)
    || gcode.match(/;\s*filament_settings_id\s*=\s*([^\n\r]+)/i);
  const materialsByTool = materialListMatch ? parseStringList(materialListMatch[1]) : [];

  const toolsCount = Math.max(perToolWeights.length, colorsByTool.length, materialsByTool.length, totalWeight > 0 ? 1 : 0);

  const toolBreakdown: ParsedToolBreakdown[] = [];
  for (let index = 0; index < toolsCount; index += 1) {
    const tool = `T${index}`;
    const weightGrams = round2(perToolWeights[index] ?? (index === 0 ? totalWeight : 0));
    if (weightGrams <= 0) {
      continue;
    }

    toolBreakdown.push({
      order: index + 1,
      tool,
      color: colorsByTool[index],
      material: materialsByTool[index],
      modelGrams: weightGrams,
      supportGrams: 0,
      towerGrams: 0,
      flushGrams: 0,
      totalGrams: weightGrams,
    });
  }

  const colorChanges = toolBreakdown.map((item) => ({
    order: item.order,
    tool: item.tool,
    color: item.color,
    material: item.material,
    weightGrams: item.totalGrams,
  }));

  const modelGrams = round2(toolBreakdown.reduce((sum, item) => sum + item.modelGrams, 0));
  const supportGrams = round2(toolBreakdown.reduce((sum, item) => sum + item.supportGrams, 0));
  const towerGrams = round2(toolBreakdown.reduce((sum, item) => sum + item.towerGrams, 0));
  const flushGrams = round2(toolBreakdown.reduce((sum, item) => sum + item.flushGrams, 0));

  return {
    colorChanges,
    toolBreakdown,
    recyclableTotals: {
      supportGrams,
      towerGrams,
      flushGrams,
      recyclableGrams: round2(supportGrams + towerGrams + flushGrams),
      modelGrams,
    },
  };
}