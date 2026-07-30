import type ExcelJS from 'exceljs';
import type { DashboardData } from './types';
import { getIdx, pctVar } from './utils';
import { computeLocationRows, ppDiff, type LocationRow } from './locationsCompute';
import { styleHeaderRow, styleTotalRow, varColor, setMoney, setPct, buildSheetName } from './xlsxStyle';
import { addChartImage } from './exportChartImage';

export function addLocationsSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curPeriod: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const { rows, totals } = computeLocationRows(D, idx);

  const sheetName = buildSheetName('Location Overview', D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  ws.getColumn(1).width = 20;
  for (let i = 2; i <= 30; i++) ws.getColumn(i).width = 12;

  const header = ws.addRow([
    'Location',
    'Sales', 'Bud', 'Var Bud $', 'Var Bud %', 'PY', 'Var PY $', 'Var PY %',
    'EBITDA', 'Bud', 'Var Bud $', 'Var Bud %', 'PY', 'Var PY $', 'Var PY %',
    'COGS', 'Bud', 'Var Bud', 'PY', 'Var PY',
    'Labor', 'Bud', 'Var Bud', 'PY', 'Var PY',
    'OpEx', 'Bud', 'Var Bud', 'PY', 'Var PY',
  ]);
  styleHeaderRow(header);

  function writeRow(r: LocationRow) {
    const row = ws.addRow([r.entity]);
    setMoney(row.getCell(2), r.sales.v);
    setMoney(row.getCell(3), r.sales.b);
    setMoney(row.getCell(4), r.sales.v - r.sales.b, varColor(r.sales.v - r.sales.b, false));
    setPct(row.getCell(5), pctVar(r.sales.v, r.sales.b), varColor(pctVar(r.sales.v, r.sales.b), false));
    setMoney(row.getCell(6), r.sales.py);
    setMoney(row.getCell(7), r.sales.v - r.sales.py, varColor(r.sales.v - r.sales.py, false));
    setPct(row.getCell(8), pctVar(r.sales.v, r.sales.py), varColor(pctVar(r.sales.v, r.sales.py), false));

    setMoney(row.getCell(9), r.ebitda.v);
    setMoney(row.getCell(10), r.ebitda.b);
    setMoney(row.getCell(11), r.ebitda.v - r.ebitda.b, varColor(r.ebitda.v - r.ebitda.b, false));
    setPct(row.getCell(12), ppDiff(r.ebitdaPct, r.ebitdaBudPct), varColor(ppDiff(r.ebitdaPct, r.ebitdaBudPct), false));
    setMoney(row.getCell(13), r.ebitda.py);
    setMoney(row.getCell(14), r.ebitda.v - r.ebitda.py, varColor(r.ebitda.v - r.ebitda.py, false));
    setPct(row.getCell(15), ppDiff(r.ebitdaPct, r.ebitdaPyPct), varColor(ppDiff(r.ebitdaPct, r.ebitdaPyPct), false));

    setPct(row.getCell(16), r.cogsPct);
    setPct(row.getCell(17), r.cogsBudPct);
    setPct(row.getCell(18), ppDiff(r.cogsPct, r.cogsBudPct), varColor(ppDiff(r.cogsPct, r.cogsBudPct), true));
    setPct(row.getCell(19), r.cogsPyPct);
    setPct(row.getCell(20), ppDiff(r.cogsPct, r.cogsPyPct), varColor(ppDiff(r.cogsPct, r.cogsPyPct), true));

    setPct(row.getCell(21), r.laborPct);
    setPct(row.getCell(22), r.laborBudPct);
    setPct(row.getCell(23), ppDiff(r.laborPct, r.laborBudPct), varColor(ppDiff(r.laborPct, r.laborBudPct), true));
    setPct(row.getCell(24), r.laborPyPct);
    setPct(row.getCell(25), ppDiff(r.laborPct, r.laborPyPct), varColor(ppDiff(r.laborPct, r.laborPyPct), true));

    setPct(row.getCell(26), r.opexPct);
    setPct(row.getCell(27), r.opexBudPct);
    setPct(row.getCell(28), ppDiff(r.opexPct, r.opexBudPct), varColor(ppDiff(r.opexPct, r.opexBudPct), true));
    setPct(row.getCell(29), r.opexPyPct);
    setPct(row.getCell(30), ppDiff(r.opexPct, r.opexPyPct), varColor(ppDiff(r.opexPct, r.opexPyPct), true));
    return row;
  }

  for (const r of rows) writeRow(r);
  styleTotalRow(writeRow(totals), 30);

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'locations:sales-by-location', 'Sales by Location', row);
  addChartImage(ws, chartImages, 'locations:ebitda-by-location', 'EBITDA by Location', row);

  return ws;
}
