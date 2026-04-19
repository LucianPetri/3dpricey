/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export interface ParsedEmbroideryFile {
  fileName: string;
  designWidth: number;
  designHeight: number;
  stitchCount: number;
  estimatedEmbroideryTime: number;
}

export async function parseEmbroideryFile(file: File): Promise<ParsedEmbroideryFile> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const extension = file.name.split('.').pop()?.toLowerCase();
  const header = new TextDecoder().decode(buffer.slice(0, 3));

  if (extension !== 'pes' && header !== 'PES') {
    throw new Error('Only PES embroidery files are currently supported');
  }

  if (buffer.byteLength < 52) {
    throw new Error('Embroidery file is too small to parse');
  }

  const designWidth = Math.abs(view.getInt16(48, true));
  const designHeight = Math.abs(view.getInt16(50, true));
  const stitchCount = Math.max(1, Math.floor((buffer.byteLength - 52) / 2));

  return {
    fileName: file.name,
    designWidth,
    designHeight,
    stitchCount,
    estimatedEmbroideryTime: Number((stitchCount / 800).toFixed(2)),
  };
}