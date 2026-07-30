import type ExcelJS from 'exceljs';

// Finds `key` in the captured chart images (from lib/chartRegistry) and embeds
// it into the worksheet starting at `startRow`, with a bold title above it.
// Returns the next free row after the image (so callers can stack multiple
// charts down a sheet). If the chart wasn't captured (e.g. not mounted at
// export time), writes a placeholder note instead and returns startRow + 2.
export function addChartImage(
  ws: ExcelJS.Worksheet,
  chartImages: { key: string; image: string }[],
  key: string,
  title: string,
  startRow: number,
  widthPx = 560,
  heightPx = 260,
): number {
  const titleRow = ws.getRow(startRow);
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1A1F2E' } };

  const found = chartImages.find(c => c.key === key);
  if (!found) {
    ws.getRow(startRow + 1).getCell(1).value = '(chart not available)';
    ws.getRow(startRow + 1).getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
    return startRow + 3;
  }

  const imageId = ws.workbook.addImage({ base64: found.image, extension: 'png' });
  // ~20px per row, ~64px per default column width, used to size the anchor.
  const rowSpan = Math.ceil(heightPx / 20);
  ws.addImage(imageId, {
    tl: { col: 0, row: startRow },
    ext: { width: widthPx, height: heightPx },
  } as ExcelJS.ImagePosition);
  return startRow + rowSpan + 2;
}
