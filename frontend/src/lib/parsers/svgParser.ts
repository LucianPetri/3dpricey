/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export interface ParsedSvgDesign {
  fileName: string;
  widthMm: number;
  heightMm: number;
  pathCount: number;
  materialSurfaceArea: number;
  estimatedCutTime: number;
  estimatedEngravingTime: number;
}

function parseLength(value: string | null) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }

  const numericValue = Number(match[1]);
  const unit = value.slice(match[1].length).trim().toLowerCase();

  if (unit === 'cm') {
    return numericValue * 10;
  }

  if (unit === 'in') {
    return numericValue * 25.4;
  }

  return numericValue;
}

export function parseSvgMarkup(svgMarkup: string, fileName = 'design.svg'): ParsedSvgDesign {
  const parser = new DOMParser();
  const document = parser.parseFromString(svgMarkup, 'image/svg+xml');

  if (document.querySelector('parsererror')) {
    throw new Error('Invalid SVG file');
  }

  const svg = document.querySelector('svg');
  if (!svg) {
    throw new Error('SVG file does not contain an <svg> root element');
  }

  const widthAttribute = parseLength(svg.getAttribute('width'));
  const heightAttribute = parseLength(svg.getAttribute('height'));
  let widthMm = widthAttribute;
  let heightMm = heightAttribute;

  if (widthMm === undefined || heightMm === undefined) {
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) {
      throw new Error('SVG dimensions could not be determined');
    }

    const [,, viewBoxWidth, viewBoxHeight] = viewBox.split(/\s+/).map(Number);
    widthMm = viewBoxWidth;
    heightMm = viewBoxHeight;
  }

  const vectorElements = document.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line');
  const pathCount = vectorElements.length;
  const materialSurfaceArea = Number((((widthMm || 0) * (heightMm || 0)) / 100).toFixed(2));

  return {
    fileName,
    widthMm: widthMm || 0,
    heightMm: heightMm || 0,
    pathCount,
    materialSurfaceArea,
    estimatedCutTime: Math.max(1, Math.round(pathCount * 2 + materialSurfaceArea / 15)),
    estimatedEngravingTime: Math.max(0, Math.round(materialSurfaceArea / 40)),
  };
}

export async function parseSvgFile(file: File) {
  return parseSvgMarkup(await file.text(), file.name);
}