import type ExcelJS from 'exceljs';
import type { DashboardData } from './types';
import { agg, getIdx, pctVar } from './utils';
import { CFGS, SUBTABS, isCogsOrLabor, type ExpenseItem } from '../components/panels/ExpensesPanel';
import { styleHeaderRow, styleSectionRow, styleTotalRow, varColor, setMoney, setPct, buildSheetName, LOC_ABBREV } from './xlsxStyle';
import { addChartImage } from './exportChartImage';

const PCT_HEADER = ['Item', 'Actual %', 'Budget %', 'Var % vs Bud', 'LY %', 'Var % vs LY'];
const DOLLAR_HEADER = ['Item', 'Actual $', 'Actual %', 'Budget $', 'Var $ vs Bud', 'Var % vs Bud', 'LY $', 'Var $ vs LY', 'Var % vs LY'];

export function addExpensesSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const isAllLocations = curEntity === 'Consolidated';
  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} Expenses`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 30;
  for (let i = 2; i <= 9; i++) ws.getColumn(i).width = 13;

  for (const tab of SUBTABS) {
    if (tab.id === 'corporate' && !isAllLocations) continue; // corporate only applies at the consolidated level
    const cfg = CFGS[tab.id];
    const UE = cfg.useEntity || curEntity;
    const totalSalesAgg = agg(D, curEntity, 'Total Sales', idx);
    const isPct = isCogsOrLabor(tab.id);
    const colCount = isPct ? PCT_HEADER.length : DOLLAR_HEADER.length;

    const secRow = ws.addRow([cfg.title.toUpperCase()]);
    ws.mergeCells(secRow.number, 1, secRow.number, colCount);
    styleSectionRow(secRow, colCount);

    const header = ws.addRow(isPct ? PCT_HEADER : DOLLAR_HEADER);
    styleHeaderRow(header);

    function writeItem(it: ExpenseItem, indent: number) {
      const a = agg(D, UE, it.key, idx);
      const row = ws.addRow([it.lbl]);
      row.getCell(1).alignment = { indent };
      if (isPct) {
        const actPct = totalSalesAgg.v ? (a.v / totalSalesAgg.v) * 100 : null;
        const budPct = totalSalesAgg.b ? (a.b / totalSalesAgg.b) * 100 : null;
        const pyPct = totalSalesAgg.py ? (a.py / totalSalesAgg.py) * 100 : null;
        const varBud = actPct != null && budPct != null ? actPct - budPct : null;
        const varLy = actPct != null && pyPct != null ? actPct - pyPct : null;
        setPct(row.getCell(2), actPct);
        setPct(row.getCell(3), budPct);
        setPct(row.getCell(4), varBud, varColor(varBud, true));
        setPct(row.getCell(5), pyPct);
        setPct(row.getCell(6), varLy, varColor(varLy, true));
      } else {
        const actPct = totalSalesAgg.v ? (a.v / totalSalesAgg.v) * 100 : null;
        const varBud = pctVar(a.v, a.b);
        const varLy = pctVar(a.v, a.py);
        setMoney(row.getCell(2), a.v);
        setPct(row.getCell(3), actPct);
        setMoney(row.getCell(4), a.b);
        setMoney(row.getCell(5), a.v - a.b, varColor(a.v - a.b, true));
        setPct(row.getCell(6), varBud, varColor(varBud, true));
        setMoney(row.getCell(7), a.py);
        setMoney(row.getCell(8), a.v - a.py, varColor(a.v - a.py, true));
        setPct(row.getCell(9), varLy, varColor(varLy, true));
      }
      if (it.children) for (const child of it.children) writeItem(child, indent + 1);
    }

    for (const it of cfg.items) writeItem(it, 1);

    const totAgg = agg(D, UE, cfg.totalKey, idx);
    const totRow = ws.addRow([`Total ${cfg.title}`]);
    if (isPct) {
      const actPct = totalSalesAgg.v ? (totAgg.v / totalSalesAgg.v) * 100 : null;
      const budPct = totalSalesAgg.b ? (totAgg.b / totalSalesAgg.b) * 100 : null;
      const pyPct = totalSalesAgg.py ? (totAgg.py / totalSalesAgg.py) * 100 : null;
      setPct(totRow.getCell(2), actPct);
      setPct(totRow.getCell(3), budPct);
      setPct(totRow.getCell(4), actPct != null && budPct != null ? actPct - budPct : null, varColor(actPct != null && budPct != null ? actPct - budPct : null, true));
      setPct(totRow.getCell(5), pyPct);
      setPct(totRow.getCell(6), actPct != null && pyPct != null ? actPct - pyPct : null, varColor(actPct != null && pyPct != null ? actPct - pyPct : null, true));
    } else {
      const actPct = totalSalesAgg.v ? (totAgg.v / totalSalesAgg.v) * 100 : null;
      setMoney(totRow.getCell(2), totAgg.v);
      setPct(totRow.getCell(3), actPct);
      setMoney(totRow.getCell(4), totAgg.b);
      setMoney(totRow.getCell(5), totAgg.v - totAgg.b, varColor(totAgg.v - totAgg.b, true));
      setPct(totRow.getCell(6), pctVar(totAgg.v, totAgg.b), varColor(pctVar(totAgg.v, totAgg.b), true));
      setMoney(totRow.getCell(7), totAgg.py);
      setMoney(totRow.getCell(8), totAgg.v - totAgg.py, varColor(totAgg.v - totAgg.py, true));
      setPct(totRow.getCell(9), pctVar(totAgg.v, totAgg.py), varColor(pctVar(totAgg.v, totAgg.py), true));
    }
    styleTotalRow(totRow, colCount);

    ws.addRow([]); // spacer between category sections
  }

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'expenses:trend', 'Grouped Trend', row);
  row = addChartImage(ws, chartImages, 'expenses:breakdown', 'Breakdown', row);
  addChartImage(ws, chartImages, 'expenses:pct-of-sales', '% of Sales', row);

  return ws;
}

// One sheet per expense category — that category's own detail rows plus its
// own Grouped Trend / Breakdown / % of Sales chart snapshots (captured while
// the UI had that category selected), so "download all categories" produces
// a properly labeled sheet per category instead of one combined table.
export function addExpenseCategorySheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string, subId: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const cfg = CFGS[subId];
  const UE = cfg.useEntity || curEntity;
  const totalSalesAgg = agg(D, curEntity, 'Total Sales', idx);
  const isPct = isCogsOrLabor(subId);
  const colCount = isPct ? PCT_HEADER.length : DOLLAR_HEADER.length;

  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} ${cfg.title}`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 30;
  for (let i = 2; i <= colCount; i++) ws.getColumn(i).width = 13;

  const header = ws.addRow(isPct ? PCT_HEADER : DOLLAR_HEADER);
  styleHeaderRow(header);

  function writeItem(it: ExpenseItem, indent: number) {
    const a = agg(D, UE, it.key, idx);
    const row = ws.addRow([it.lbl]);
    row.getCell(1).alignment = { indent };
    if (isPct) {
      const actPct = totalSalesAgg.v ? (a.v / totalSalesAgg.v) * 100 : null;
      const budPct = totalSalesAgg.b ? (a.b / totalSalesAgg.b) * 100 : null;
      const pyPct = totalSalesAgg.py ? (a.py / totalSalesAgg.py) * 100 : null;
      const varBud = actPct != null && budPct != null ? actPct - budPct : null;
      const varLy = actPct != null && pyPct != null ? actPct - pyPct : null;
      setPct(row.getCell(2), actPct);
      setPct(row.getCell(3), budPct);
      setPct(row.getCell(4), varBud, varColor(varBud, true));
      setPct(row.getCell(5), pyPct);
      setPct(row.getCell(6), varLy, varColor(varLy, true));
    } else {
      const actPct = totalSalesAgg.v ? (a.v / totalSalesAgg.v) * 100 : null;
      const varBud = pctVar(a.v, a.b);
      const varLy = pctVar(a.v, a.py);
      setMoney(row.getCell(2), a.v);
      setPct(row.getCell(3), actPct);
      setMoney(row.getCell(4), a.b);
      setMoney(row.getCell(5), a.v - a.b, varColor(a.v - a.b, true));
      setPct(row.getCell(6), varBud, varColor(varBud, true));
      setMoney(row.getCell(7), a.py);
      setMoney(row.getCell(8), a.v - a.py, varColor(a.v - a.py, true));
      setPct(row.getCell(9), varLy, varColor(varLy, true));
    }
    if (it.children) for (const child of it.children) writeItem(child, indent + 1);
  }

  for (const it of cfg.items) writeItem(it, 1);

  const totAgg = agg(D, UE, cfg.totalKey, idx);
  const totRow = ws.addRow([`Total ${cfg.title}`]);
  if (isPct) {
    const actPct = totalSalesAgg.v ? (totAgg.v / totalSalesAgg.v) * 100 : null;
    const budPct = totalSalesAgg.b ? (totAgg.b / totalSalesAgg.b) * 100 : null;
    const pyPct = totalSalesAgg.py ? (totAgg.py / totalSalesAgg.py) * 100 : null;
    setPct(totRow.getCell(2), actPct);
    setPct(totRow.getCell(3), budPct);
    setPct(totRow.getCell(4), actPct != null && budPct != null ? actPct - budPct : null, varColor(actPct != null && budPct != null ? actPct - budPct : null, true));
    setPct(totRow.getCell(5), pyPct);
    setPct(totRow.getCell(6), actPct != null && pyPct != null ? actPct - pyPct : null, varColor(actPct != null && pyPct != null ? actPct - pyPct : null, true));
  } else {
    const actPct = totalSalesAgg.v ? (totAgg.v / totalSalesAgg.v) * 100 : null;
    setMoney(totRow.getCell(2), totAgg.v);
    setPct(totRow.getCell(3), actPct);
    setMoney(totRow.getCell(4), totAgg.b);
    setMoney(totRow.getCell(5), totAgg.v - totAgg.b, varColor(totAgg.v - totAgg.b, true));
    setPct(totRow.getCell(6), pctVar(totAgg.v, totAgg.b), varColor(pctVar(totAgg.v, totAgg.b), true));
    setMoney(totRow.getCell(7), totAgg.py);
    setMoney(totRow.getCell(8), totAgg.v - totAgg.py, varColor(totAgg.v - totAgg.py, true));
    setPct(totRow.getCell(9), pctVar(totAgg.v, totAgg.py), varColor(pctVar(totAgg.v, totAgg.py), true));
  }
  styleTotalRow(totRow, colCount);

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'expenses:trend', `${cfg.title} Grouped Trend`, row);
  row = addChartImage(ws, chartImages, 'expenses:breakdown', `${cfg.title} Breakdown`, row);
  addChartImage(ws, chartImages, 'expenses:pct-of-sales', `${cfg.title} % of Sales`, row);

  return ws;
}
