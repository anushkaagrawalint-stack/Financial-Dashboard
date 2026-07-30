// Shared Excel cell-styling helpers — used by every export (per-tab and the
// combined "Export All") so every generated workbook looks consistent.
import type ExcelJS from 'exceljs';

export const PURPLE = 'FF7C3AED';
export const SEC_BG = 'FFF5F0FF';
export const TOTAL_BG = 'FFF0ECFA';
export const GREEN = 'FF059669';
export const RED = 'FFDC2626';
export const MONEY_FMT = '$#,##0;($#,##0)';
export const PCT_FMT = '0.0"%";(0.0"%")';

export function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FF6B7280' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEC_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  row.height = 28;
}

export function styleSectionRow(row: ExcelJS.Row, colCount: number) {
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEC_BG } };
    row.getCell(i).font = { bold: true, color: { argb: PURPLE }, size: 10 };
  }
}

export function styleTotalRow(row: ExcelJS.Row, colCount: number) {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.font = { ...(cell.font || {}), bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
  }
}

export function varColor(diff: number | null, isExp: boolean): string | null {
  if (diff == null || diff === 0) return null;
  const favorable = isExp ? diff < 0 : diff > 0;
  return favorable ? GREEN : RED;
}

// Only for actual profit subtotals (Total Sales, Gross Profit, EBITDA, ...) —
// positive=green/negative=red. Expense group headers (Total COGS, etc.) never
// get this: a positive cost figure isn't inherently "good".
export function valueColor(v: number): string | null {
  if (v > 0) return GREEN;
  if (v < 0) return RED;
  return null;
}

export function setMoney(cell: ExcelJS.Cell, v: number | null | undefined, color?: string | null) {
  if (v == null) { cell.value = '—'; return; }
  cell.value = v;
  cell.numFmt = MONEY_FMT;
  if (color) cell.font = { color: { argb: color } };
}

export function setPct(cell: ExcelJS.Cell, v: number | null | undefined, color?: string | null) {
  if (v == null) { cell.value = '—'; return; }
  cell.value = v;
  cell.numFmt = PCT_FMT;
  if (color) cell.font = { color: { argb: color } };
}

export const LOC_ABBREV: Record<string, string> = {
  Consolidated: 'CON',
  Ballpark: 'BP',
  MVT: 'MVT',
  'National Landing': 'NL',
  Mosaic: 'MO',
  Rockville: 'RV',
};

// Compact period label for sheet names, e.g. "P6 2026" or "P1-P6 2026"
// (falls back to "P1 2025 - P6 2026" style when the range spans years).
export function periodSheetLabel(periods: string[], idx: number[]): string {
  if (idx.length === 0) return '';
  if (idx.length === 1) return periods[idx[0]];
  const first = periods[idx[0]];
  const last = periods[idx[idx.length - 1]];
  const firstNumMatch = first.match(/^P(\d+)/);
  const lastMatch = last.match(/^P(\d+)\s+(\d{4})$/);
  const firstYear = first.match(/(\d{4})$/)?.[1];
  if (firstNumMatch && lastMatch && firstYear === lastMatch[2]) {
    return `P${firstNumMatch[1]}-P${lastMatch[1]} ${lastMatch[2]}`;
  }
  return `${first} - ${last}`;
}

// Excel sheet names: max 31 chars, no : \ / ? * [ ]
export function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '-').trim().slice(0, 31);
}

// Combines a base label (location abbreviation or tab name) with the period
// range into one sheet name, e.g. "BP P6 2026" or "Overview P1-P6 2026".
export function buildSheetName(base: string, periods: string[], idx: number[]): string {
  const period = periodSheetLabel(periods, idx);
  return sanitizeSheetName(period ? `${base} ${period}` : base);
}
