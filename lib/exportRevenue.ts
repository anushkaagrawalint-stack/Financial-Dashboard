import type ExcelJS from 'exceljs';
import type { DashboardData } from './types';
import { agg, getIdx, pctVar } from './utils';
import { CHANNEL_CFGS, ALL_CHANNELS, DEDUCTION_KEYS, type SubItem, type ChannelId } from '../components/panels/RevenuePanel';
import { styleHeaderRow, styleTotalRow, varColor, setMoney, setPct, buildSheetName, LOC_ABBREV } from './xlsxStyle';
import { addChartImage } from './exportChartImage';

function subItemAgg(D: DashboardData, entity: string, idx: number[], sub: SubItem) {
  const a = agg(D, entity, sub.key, idx);
  let r = { v: a.v, b: a.b, py: a.py };
  if (sub.altKey) {
    const alt = agg(D, entity, sub.altKey, idx);
    r = { v: r.v + alt.v, b: r.b + alt.b, py: r.py + alt.py };
  }
  if (sub.subKey) {
    const s = agg(D, entity, sub.subKey, idx);
    r = { v: r.v - s.v, b: r.b - s.b, py: r.py - s.py };
  }
  return r;
}

export function addRevenueSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} Revenue`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 28;
  for (let i = 2; i <= 8; i++) ws.getColumn(i).width = 14;

  const header = ws.addRow(['Channel', 'Actual $', 'Budget $', 'Var $ vs Bud', 'Var % vs Bud', 'LY $', 'Var $ vs LY', 'Var % vs LY']);
  styleHeaderRow(header);

  function writeRow(lbl: string, a: { v: number; b: number; py: number }, indent: number) {
    const row = ws.addRow([lbl]);
    row.getCell(1).alignment = { indent };
    setMoney(row.getCell(2), a.v);
    setMoney(row.getCell(3), a.b);
    setMoney(row.getCell(4), a.v - a.b, varColor(a.v - a.b, false));
    setPct(row.getCell(5), pctVar(a.v, a.b), varColor(pctVar(a.v, a.b), false));
    setMoney(row.getCell(6), a.py);
    setMoney(row.getCell(7), a.v - a.py, varColor(a.v - a.py, false));
    setPct(row.getCell(8), pctVar(a.v, a.py), varColor(pctVar(a.v, a.py), false));
    return row;
  }

  const salesAgg = agg(D, curEntity, 'Total Sales', idx);
  const totalRow = writeRow('Total Sales', salesAgg, 0);
  styleTotalRow(totalRow, 8);

  for (const chId of ALL_CHANNELS) {
    const cfg = CHANNEL_CFGS[chId];
    const chA = agg(D, curEntity, cfg.key, idx);
    const row = writeRow(cfg.lbl, chA, 0);
    row.font = { bold: true };
    if (cfg.subitems) {
      for (const sub of cfg.subitems) {
        const a = subItemAgg(D, curEntity, idx, sub);
        if (a.v === 0 && a.py === 0) continue;
        writeRow(sub.lbl, a, 1);
      }
    }
  }

  const deductParts = DEDUCTION_KEYS.map(k => agg(D, curEntity, k, idx));
  const deductA = {
    v: deductParts.reduce((s, a) => s + a.v, 0),
    b: deductParts.reduce((s, a) => s + a.b, 0),
    py: deductParts.reduce((s, a) => s + a.py, 0),
  };
  const dRow = writeRow('Discounts & Adjustments', deductA, 0);
  dRow.font = { italic: true };

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'revenue:channel-trend', 'Channel Trend', row);
  addChartImage(ws, chartImages, 'revenue:channel-mix', 'Channel Mix', row);

  return ws;
}

// One sheet per revenue channel — that channel's own detail rows plus its own
// Channel Trend / Channel Mix chart snapshots (captured while the UI had that
// channel selected), so "download all channels" produces a properly labeled
// sheet per channel instead of one combined table.
export function addRevenueChannelSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string, chId: ChannelId,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const cfg = CHANNEL_CFGS[chId];
  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} ${cfg.lbl}`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 28;
  for (let i = 2; i <= 8; i++) ws.getColumn(i).width = 14;

  const header = ws.addRow(['Channel', 'Actual $', 'Budget $', 'Var $ vs Bud', 'Var % vs Bud', 'LY $', 'Var $ vs LY', 'Var % vs LY']);
  styleHeaderRow(header);

  function writeRow(lbl: string, a: { v: number; b: number; py: number }, indent: number) {
    const row = ws.addRow([lbl]);
    row.getCell(1).alignment = { indent };
    setMoney(row.getCell(2), a.v);
    setMoney(row.getCell(3), a.b);
    setMoney(row.getCell(4), a.v - a.b, varColor(a.v - a.b, false));
    setPct(row.getCell(5), pctVar(a.v, a.b), varColor(pctVar(a.v, a.b), false));
    setMoney(row.getCell(6), a.py);
    setMoney(row.getCell(7), a.v - a.py, varColor(a.v - a.py, false));
    setPct(row.getCell(8), pctVar(a.v, a.py), varColor(pctVar(a.v, a.py), false));
    return row;
  }

  const chA = agg(D, curEntity, cfg.key, idx);
  const totalRow = writeRow(cfg.lbl, chA, 0);
  styleTotalRow(totalRow, 8);

  if (cfg.subitems) {
    for (const sub of cfg.subitems) {
      const a = subItemAgg(D, curEntity, idx, sub);
      if (a.v === 0 && a.py === 0) continue;
      writeRow(sub.lbl, a, 1);
    }
  }

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'revenue:channel-trend', `${cfg.lbl} Trend`, row);
  if (cfg.subitems) addChartImage(ws, chartImages, 'revenue:channel-mix', `${cfg.lbl} Mix`, row);

  return ws;
}
