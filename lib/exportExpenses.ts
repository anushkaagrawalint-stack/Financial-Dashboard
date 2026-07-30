import type ExcelJS from 'exceljs';
import type { DashboardData } from './types';
import { agg, getIdx, pctVar } from './utils';
import { CFGS, SUBTABS, isCogsOrLabor, type ExpenseItem } from '../components/panels/ExpensesPanel';
import { styleHeaderRow, styleSectionRow, styleTotalRow, varColor, setMoney, setPct, buildSheetName, LOC_ABBREV } from './xlsxStyle';
import { addChartImage } from './exportChartImage';

// Mirrors the on-screen Expenses table exactly (both COGS/Labor's % mode and
// the dollar mode used by OpEx/Occupancy/Corporate): Actual $, Actual %, LY,
// Var % vs LY, Budget, Var % vs Budget — no separate $ variance columns, since
// the on-screen table never shows those for expenses, only % variances.
const PCT_HEADER = ['Item', 'Actual $', 'Actual %', 'LY %', 'Var % vs LY', 'Budget %', 'Var % vs Budget'];
const DOLLAR_HEADER = ['Item', 'Actual $', 'Actual %', 'LY $', 'Var % vs LY', 'Budget $', 'Var % vs Budget'];

// Writes one category's header + item rows + total row into `ws`, matching
// the on-screen table (and its blank-vs-zero dash handling) exactly. Shared
// by the combined multi-category sheet and the single-category sheet.
function writeCategoryBlock(ws: ExcelJS.Worksheet, D: DashboardData, curEntity: string, idx: number[], subId: string) {
  const cfg = CFGS[subId];
  const UE = cfg.useEntity || curEntity;
  const totalSalesAgg = agg(D, curEntity, 'Total Sales', idx);
  const isPct = isCogsOrLabor(subId);
  const colCount = isPct ? PCT_HEADER.length : DOLLAR_HEADER.length;

  const header = ws.addRow(isPct ? PCT_HEADER : DOLLAR_HEADER);
  styleHeaderRow(header);

  function writeRow(lbl: string, a: { v: number; b: number; py: number }) {
    const row = ws.addRow([lbl]);
    // Gated on the item's own value (a.v/a.py/a.b), not the sales total —
    // matching on screen exactly, including items with no budget/LY/actual
    // data of their own showing as "—" rather than a misleading "0.0%".
    const actPct = a.v ? (a.v / (totalSalesAgg.v || 1)) * 100 : null;
    setMoney(row.getCell(2), a.v);
    setPct(row.getCell(3), actPct);
    if (isPct) {
      const pyPct = a.py ? (a.py / (totalSalesAgg.py || 1)) * 100 : null;
      const budPct = a.b ? (a.b / (totalSalesAgg.b || 1)) * 100 : null;
      const varLy = actPct != null && pyPct != null ? actPct - pyPct : null;
      const varBud = actPct != null && budPct != null ? actPct - budPct : null;
      setPct(row.getCell(4), pyPct);
      setPct(row.getCell(5), varLy, varColor(varLy, true));
      setPct(row.getCell(6), budPct);
      setPct(row.getCell(7), varBud, varColor(varBud, true));
    } else {
      const varLy = pctVar(a.v, a.py);
      const varBud = pctVar(a.v, a.b);
      if (a.py) {
        setMoney(row.getCell(4), a.py);
        setPct(row.getCell(5), varLy, varColor(varLy, true));
      } else {
        row.getCell(4).value = '—';
        row.getCell(5).value = '—';
      }
      if (a.b) {
        setMoney(row.getCell(6), a.b);
        setPct(row.getCell(7), varBud, varColor(varBud, true));
      } else {
        row.getCell(6).value = '—';
        row.getCell(7).value = '—';
      }
    }
    return row;
  }

  function writeItem(it: ExpenseItem, indent: number) {
    const a = agg(D, UE, it.key, idx);
    const row = writeRow(it.lbl, a);
    row.getCell(1).alignment = { indent };
    // Matches on screen: the top-level rows under each category (indent 1,
    // same as depth 0 there) are bold — before you drill into their
    // children — regardless of whether they themselves have children.
    // Bolding only the label cell (not row.font) avoids wiping the colors
    // already set on the value cells above.
    if (indent === 1) row.getCell(1).font = { bold: true };
    if (it.children) for (const child of it.children) writeItem(child, indent + 1);
  }

  for (const it of cfg.items) writeItem(it, 1);

  const totAgg = agg(D, UE, cfg.totalKey, idx);
  const totRow = writeRow(`Total ${cfg.title}`, totAgg);
  styleTotalRow(totRow, colCount);

  return colCount;
}

export function addExpensesSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const isAllLocations = curEntity === 'Consolidated';
  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} Expenses`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 30;
  for (let i = 2; i <= 7; i++) ws.getColumn(i).width = 13;

  for (const tab of SUBTABS) {
    if (tab.id === 'corporate' && !isAllLocations) continue; // corporate only applies at the consolidated level
    const cfg = CFGS[tab.id];
    const colCount = isCogsOrLabor(tab.id) ? PCT_HEADER.length : DOLLAR_HEADER.length;

    const secRow = ws.addRow([cfg.title.toUpperCase()]);
    ws.mergeCells(secRow.number, 1, secRow.number, colCount);
    styleSectionRow(secRow, colCount);

    writeCategoryBlock(ws, D, curEntity, idx, tab.id);
    ws.addRow([]); // spacer between category sections
  }

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'expenses:trend', 'Grouped Trend', row);
  row = addChartImage(ws, chartImages, 'expenses:breakdown', 'Breakdown', row);
  addChartImage(ws, chartImages, 'expenses:pct-of-sales', '% of Sales', row);

  return ws;
}

// One sheet per expense category — mirrors the on-screen single-category
// table exactly, plus that category's own Grouped Trend / Breakdown / % of
// Sales chart snapshots (captured while the UI had that category selected),
// so "download all categories" produces a properly labeled sheet per
// category instead of one combined table.
export function addExpenseCategorySheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string, subId: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const cfg = CFGS[subId];
  const colCount = isCogsOrLabor(subId) ? PCT_HEADER.length : DOLLAR_HEADER.length;

  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} ${cfg.title}`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 30;
  for (let i = 2; i <= colCount; i++) ws.getColumn(i).width = 13;

  writeCategoryBlock(ws, D, curEntity, idx, subId);

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'expenses:trend', `${cfg.title} Grouped Trend`, row);
  row = addChartImage(ws, chartImages, 'expenses:breakdown', `${cfg.title} Breakdown`, row);
  addChartImage(ws, chartImages, 'expenses:pct-of-sales', `${cfg.title} % of Sales`, row);

  return ws;
}
