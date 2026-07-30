import type ExcelJS from 'exceljs';
import type { DashboardData } from './types';
import { agg, getIdx } from './utils';
import { styleHeaderRow, varColor, valueColor, setMoney, setPct, buildSheetName, LOC_ABBREV } from './xlsxStyle';
import { addChartImage } from './exportChartImage';

// `includeKpiTable`: the on-screen "Period Summary" tcard (with its own
// download button) only ever shows the period-by-period table below — the
// KPI metrics above it are cards, not a table, and have no download of their
// own. So the per-table download passes includeKpiTable=false to match that
// tcard exactly; Export All passes true for a fuller combined report.
export function addOverviewSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string,
  chartImages: { key: string; image: string }[],
  includeKpiTable = true,
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const allIdx = getIdx('all', D.periods);
  const isAllLocations = curEntity === 'Consolidated';

  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} Overview`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 22;
  for (let i = 2; i <= 6; i++) ws.getColumn(i).width = 15;

  if (includeKpiTable) {
    const sales = agg(D, curEntity, 'Total Sales', idx);
    const gp = agg(D, curEntity, 'Gross Profit', idx);
    const ebitda = agg(D, curEntity, 'EBITDA', idx);
    const co = agg(D, 'Consolidated', 'Total Corporate Overhead & Other', idx);
    const cogs = agg(D, curEntity, 'Total Cost of Goods Sold', idx);
    const labor = agg(D, curEntity, 'Total Payroll Expenses', idx);
    const ts = sales.v || 1;
    const cogsActPct = cogs.v != null ? (cogs.v / ts) * 100 : null;
    const cogsBudPct = (cogs.b / (sales.b || 1)) * 100;
    const cogsPyPct = (cogs.py / (sales.py || 1)) * 100;
    const laborActPct = labor.v != null ? (labor.v / ts) * 100 : null;
    const laborBudPct = (labor.b / (sales.b || 1)) * 100;
    const laborPyPct = (labor.py / (sales.py || 1)) * 100;

    const kpiHeader = ws.addRow(['Metric', 'Actual', 'vs Budget', 'vs LY']);
    styleHeaderRow(kpiHeader);

    function kpiRow(lbl: string, v: number, b: number, py: number, isExp: boolean, isPct: boolean, actPct?: number | null, budPct?: number | null, pyPct?: number | null) {
      const row = ws.addRow([lbl]);
      if (isPct) {
        setPct(row.getCell(2), actPct ?? null);
        setPct(row.getCell(3), actPct != null && budPct != null ? actPct - budPct : null, varColor(actPct != null && budPct != null ? actPct - budPct : null, isExp));
        setPct(row.getCell(4), actPct != null && pyPct != null ? actPct - pyPct : null, varColor(actPct != null && pyPct != null ? actPct - pyPct : null, isExp));
      } else {
        setMoney(row.getCell(2), v, isExp ? null : valueColor(v));
        setMoney(row.getCell(3), v - b, varColor(v - b, isExp));
        setMoney(row.getCell(4), v - py, varColor(v - py, isExp));
      }
      return row;
    }

    kpiRow('Total Sales', sales.v, sales.b, sales.py, false, false);
    kpiRow('Gross Profit', gp.v, gp.b, gp.py, false, false);
    kpiRow('EBITDA', ebitda.v, ebitda.b, ebitda.py, false, false);
    if (isAllLocations) kpiRow('Corporate Overhead', co.v, co.b, co.py, true, false);
    kpiRow('COGS %', 0, 0, 0, true, true, cogsActPct, cogsBudPct, cogsPyPct);
    kpiRow('Labor %', 0, 0, 0, true, true, laborActPct, laborBudPct, laborPyPct);
  }

  // Only reserve the chart-anchor gap when there's something to anchor —
  // the KPI table above, or real chart images — so a table-only download
  // (no KPI table, no charts) doesn't get stray leading blank rows.
  if (includeKpiTable || chartImages.length > 0) {
    let row = ws.rowCount + 2;
    row = addChartImage(ws, chartImages, 'overview:revenue-trend', 'Revenue Trend', row);
    row = addChartImage(ws, chartImages, 'overview:cost-breakdown', 'Cost Breakdown', row);
    row = addChartImage(ws, chartImages, 'overview:ebitda', 'EBITDA', row);

    // Floating chart images don't create real rows, so pad blank rows up to
    // the intended position before adding the table — otherwise it could
    // render starting mid-image since addRow() only appends after the last
    // real row.
    while (ws.rowCount < row) ws.addRow([]);
  }
  const tblHeader = ws.addRow(['Period', 'Revenue', 'COGS %', 'Labor %', 'EBITDA', 'EBITDA %']);
  tblHeader.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FF6B7280' } }; });
  const en = D.t12[curEntity];
  for (const i of [...allIdx].reverse()) {
    const svRaw = en['Total Sales'].v[i];
    const sv = svRaw || 1;
    const ev = en['EBITDA'].v[i];
    const cogsRaw = en['Total Cost of Goods Sold'].v[i];
    const laborRaw = en['Total Payroll Expenses'].v[i];
    const r = ws.addRow([D.periods[i]]);
    setMoney(r.getCell(2), svRaw);
    setPct(r.getCell(3), svRaw && cogsRaw != null ? (cogsRaw / svRaw) * 100 : null);
    setPct(r.getCell(4), svRaw && laborRaw != null ? (laborRaw / svRaw) * 100 : null);
    setMoney(r.getCell(5), ev, ev != null ? valueColor(ev) : null);
    setPct(r.getCell(6), svRaw && ev != null ? (ev / sv) * 100 : null, ev != null ? valueColor(ev) : null);
  }

  return ws;
}
