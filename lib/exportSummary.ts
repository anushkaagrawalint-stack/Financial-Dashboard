import type ExcelJS from 'exceljs';
import type { DashboardData } from './types';
import { agg, getIdx, pctVar } from './utils';
import { LINES } from '../components/panels/SummaryPanel';
import { styleHeaderRow, styleTotalRow, varColor, valueColor, setMoney, setPct, buildSheetName, LOC_ABBREV } from './xlsxStyle';
import { addChartImage } from './exportChartImage';

export function addSummarySheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const isAllLocations = curEntity === 'Consolidated';
  const totalSalesAgg = agg(D, curEntity, 'Total Sales', idx);
  const tSalesAct = totalSalesAgg.v || 1;
  const tSalesBud = totalSalesAgg.b || 1;
  const tSalesLY = totalSalesAgg.py || 1;

  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} Summary`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  ws.getColumn(1).width = 30;
  for (let i = 2; i <= 11; i++) ws.getColumn(i).width = 13;

  const header = ws.addRow([
    'Line Item', 'Actual $', 'Actual %', 'Budget $', 'Budget %',
    'Var $ vs Bud', 'Var % vs Bud', 'LY $', 'LY %', 'Var $ vs LY', 'Var % vs LY',
  ]);
  styleHeaderRow(header);

  for (const line of LINES) {
    const ent = line.useEntity || curEntity;
    const rawA = agg(D, ent, line.key, idx);
    const isCorp = !!line.useEntity && !isAllLocations;
    const a = isCorp ? { v: 0, b: 0, py: 0 } : rawA;
    const actPct = a.v ? (a.v / tSalesAct) * 100 : null;
    const budPct = a.b ? (a.b / tSalesBud) * 100 : null;
    const lyPct = a.py ? (a.py / tSalesLY) * 100 : null;
    const isPctLine = line.key === 'Total Cost of Goods Sold' || line.key === 'Total Payroll Expenses';
    const varBudPct = isPctLine
      ? (actPct != null && budPct != null ? actPct - budPct : null)
      : pctVar(a.v, a.b);
    const varLyPct = isPctLine
      ? (actPct != null && lyPct != null ? actPct - lyPct : null)
      : pctVar(a.v, a.py);

    const row = ws.addRow([line.lbl]);
    row.getCell(1).alignment = { indent: line.indent || 0 };
    if (line.hero || line.isTotal) row.font = { bold: true };

    setMoney(row.getCell(2), a.v, line.isTotal ? valueColor(a.v) : null);
    setPct(row.getCell(3), actPct);
    setMoney(row.getCell(4), a.b);
    setPct(row.getCell(5), budPct);
    setMoney(row.getCell(6), a.v - a.b, varColor(a.v - a.b, !!line.isExp));
    setPct(row.getCell(7), varBudPct, varColor(varBudPct, !!line.isExp));
    setMoney(row.getCell(8), a.py);
    setPct(row.getCell(9), lyPct);
    setMoney(row.getCell(10), a.v - a.py, varColor(a.v - a.py, !!line.isExp));
    setPct(row.getCell(11), varLyPct, varColor(varLyPct, !!line.isExp));

    if (line.isTotal) styleTotalRow(row, 11);
  }

  const row = ws.rowCount + 2;
  addChartImage(ws, chartImages, 'summary:waterfall', 'Profit Waterfall', row);

  return ws;
}
