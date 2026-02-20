# File Parsing System

## Overview
PolymagicPrice auto-extracts print parameters from 3D model files, eliminating manual entry. Three file formats are supported with fallback patterns for different slicer outputs.

**Location:** [src/lib/parsers/](../src/lib/parsers/)

## Supported File Formats

### 1. G-Code (.gcode)
**Parser:** [gcodeParser.ts](../src/lib/parsers/gcodeParser.ts) (500 lines)  
**Usage:** FDM calculator

**Extracted Data:**
- `printTimeHours` – Estimated print duration
- `filamentWeightGrams` – Material weight
- `filamentLengthMm` – Optional filament length in mm
- `printerModel` – Slicer-reported printer model
- `filamentColour` – Material color from slicer metadata
- `filamentSettingsId` – Preset identifier
- `thumbnail` – Embedded base64 image preview
- `surfaceAreaMm2` – Calculated surface area (if available)

**Supported Slicers:**
- Cura (`;TIME:` seconds format, `; MODEL_ID:`)
- PrusaSlicer (`;estimated printing time` in HH:MM:SS)
- Simplify3D (`;Estimated Printing Time:` format)

### 2. 3MF (.3mf)
**Parser:** Part of [gcodeParser.ts](../src/lib/parsers/gcodeParser.ts)  
**Usage:** FDM calculator

3MF is a ZIP-based format containing:
- `model.xml` – Model geometry and metadata
- `/Metadata/` – Thumbnail and slicer-specific metadata
- `/3D/` – 3D content with embedded geometry

**Extraction:**
- Reads embedded G-code or slicer comments from `model.xml`
- Extracts thumbnail from `/Metadata/thumbnail.png`
- Falls back to filename parsing if G-code not embedded

### 3. CXDLPV4 (.cxdlpv4)
**Parser:** [resinFileParser.ts](../src/lib/parsers/resinFileParser.ts) (641 lines)  
**Usage:** Resin calculator

**Format:** Binary ZIP-based format (Creality Halot/Anycubic resin printer format)

**Header Structure (byte offsets):**
```
Offset  Size     Field
0       4        Magic Size (Big Endian)
4       9        Magic ("CXSW3DV2")
13      2        Version (Big Endian)
15      var      PrinterModel (null-terminated string)
...     2        ResolutionX
...     2        ResolutionY
...     12       BedSizeX, BedSizeY, BedSizeZ (3 floats)
...     4        PrintHeight (float)
...     4        LayerHeight (float)
...     4        BottomLayersCount
...     4        PreviewSmallOffsetAddress
...     4        LayersDefinitionOffsetAddress
...     4        LayerCount
...     4        PreviewLargeOffsetAddress
...     4        PrintTime (seconds - BIG ENDIAN)
...     4        PrintParametersOffsetAddress
```

**Print Parameters Section (offset given in header):**
- VolumeMl (float) at offset +20 within the section

**Extraction:**
```typescript
printTimeHours = printTimeSeconds / 3600
resinVolumeMl = read float from PrintParameters[20]
```

## Parse Robustness Patterns

### Multiple Fallback Patterns
**Why:** Different slicers use different comment formats. Always implement an array of regex patterns.

**Example from Cura (lines 41-60):**
```typescript
const weightPatterns = [
  /total filament weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,
  /total filament used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
  /filament used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
  // ... more patterns
];

for (const pattern of weightPatterns) {
  const match = content.match(pattern);
  if (match) {
    filamentWeight = parseFloat(match[1]);
    break; // Stop on first match
  }
}
```

### Edge Case Handling

1. **Missing Metadata:** Return zeros with error message
   ```typescript
   if (!filamentWeight) {
     filamentWeight = 0; // Will show validation error in UI
   }
   ```

2. **Unit Conversion:** Always verify units before conversion
   ```typescript
   // Filament length: check if in meters or mm
   if (pattern.source.includes('m(?!m)')) {
     filamentLengthMm = value * 1000; // meters → mm
   }
   ```

3. **Time Parsing:** Multiple formats (seconds, HH:MM:SS, text)
   ```typescript
   const timePatterns = [
     /estimated printing time\s*(?:\(normal mode\))?\s*[:=]\s*(.+)/i,
     /;\s*TIME:\s*(\d+)/i, // Cura: seconds
   ];
   // Parse result differently based on format
   ```

4. **Binary File Corruption:** Wrap in try-catch
   ```typescript
   try {
     const buffer = await file.arrayBuffer();
     // Parse binary data
   } catch (error) {
     console.error('Failed to parse resin file', error);
     return { printTimeHours: 0, resinVolumeMl: 0 };
   }
   ```

## Component Integration Pattern

### Upload Component Flow
```tsx
<GcodeUpload> component:
  1. User selects file(s)
  2. Component handles FileList → File array
  3. For each file:
     - Call parseGcode(file.text) or parseCxdlpv4(file)
     - Extract GcodeData
     - Display thumbnail in ThumbnailPreview
     - Auto-fill form fields with extracted values
  4. Store filePath for later printing operations
```

**File:** [src/components/calculator/GcodeUpload.tsx](../src/components/calculator/GcodeUpload.tsx)

### Auto-Fill Form Fields
```typescript
if (gcodeData.filamentWeightGrams) {
  setFilamentWeight(gcodeData.filamentWeightGrams.toString());
}
if (gcodeData.printTimeHours) {
  setPrintTime(gcodeData.printTimeHours.toString());
}
if (gcodeData.surfaceAreaMm2) {
  setSurfaceAreaCm2((gcodeData.surfaceAreaMm2 / 100).toString());
}
```

## Thumbnail Extraction

### G-Code Thumbnails
Cura/PrusaSlicer embed base64-encoded PNG:
```
; thumbnail begin 220x124 0
; iVBORw0KGgoAAAANSUhEUgAAANwAAAB8CA...
; thumbnail end
```

**Parsing:**
```typescript
const thumbPattern = /; thumbnail begin \d+x\d+[^\n]*\n([\s\S]*?)(?:; thumbnail end|$)/;
const match = content.match(thumbPattern);
if (match) {
  thumbnail = 'data:image/png;base64,' + match[1].replace(/[;\s]/g, '');
}
```

### 3MF Thumbnails
3MF files are ZIPs with `/Metadata/thumbnail.png`:
```typescript
const zip = new JSZip();
await zip.loadAsync(file);
const thumbFile = zip.file('Metadata/thumbnail.png');
if (thumbFile) {
  const blob = await thumbFile.async('blob');
  const url = URL.createObjectURL(blob);
  thumbnail = url;
}
```

## Adding Support for a New File Format

1. **Create parser file:** `src/lib/parsers/newFormatParser.ts`
2. **Export interface matching `GcodeData`:**
   ```typescript
   export interface NewFormatData extends GcodeData {
     // Add format-specific fields if needed
   }
   ```
3. **Implement parse function:**
   ```typescript
   export async function parseNewFormat(file: File): Promise<GcodeData> {
     try {
       const buffer = await file.arrayBuffer();
       // Parse binary/text format
       return {
         printTimeHours: /* extracted */,
         filamentWeightGrams: /* extracted */,
         // ... rest of GcodeData fields
       };
     } catch (error) {
       return { printTimeHours: 0, filamentWeightGrams: 0 };
     }
   }
   ```
4. **Create upload component:** `GcodeUpload.tsx` pattern
5. **Update form file accept attribute:** `accept=".newformat,.gcode,.3mf"`

## Performance Considerations

- **Large G-Code Files (100MB+):** Regex parsing may be slow. Consider streaming line-by-line parsing.
- **ZIP Parsing:** JSZip loads entire file into memory. Monitor for memory issues with large 3MF files (>50MB).
- **Async/Await:** All file operations use async to prevent UI freezing.

## Validation & Testing

### Test Files to Keep
- Cura-generated .gcode (various printer models)
- PrusaSlicer-generated .gcode
- Simplify3D-generated .gcode
- Embedded 3MF with G-code
- Real .cxdlpv4 from Creality printer
- Malformed files (missing metadata, corrupted headers)

### Test Checklist
- [ ] Print time extracted correctly in hours
- [ ] Filament weight in grams (not kg)
- [ ] Thumbnail displays correctly
- [ ] Missing fields return zero (not undefined)
- [ ] Multiple files in batch upload process
- [ ] Resin volume in ml
- [ ] Large files (>100MB) don't freeze UI
