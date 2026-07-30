import type ExcelJS from 'exceljs';

// Serializes a workbook and triggers a browser download. Shared by every
// per-table export button.
export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^\w.\- ]/g, '_');
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Downloads a chart's captured PNG (a "data:image/png;base64,..." data URL)
// as a standalone image file. Used by every per-chart download button.
export function downloadImage(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename.replace(/[^\w.\- ]/g, '_');
  document.body.appendChild(a);
  a.click();
  a.remove();
}
