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

// Mirrors the on-screen "Channel Detail — Actual · LY · Budget" table exactly
// when "All Channels" is selected: top-level channels only (no subitem
// breakdown — that's what the per-channel sheet/download is for), in the same
// column order (Actual $, LY $, Var % vs LY, Budget $, Var % vs Budget), with
// Discounts & Adjustments and Total Sales as the last two rows.
export function addRevenueSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} Revenue`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 28;
  for (let i = 2; i <= 6; i++) ws.getColumn(i).width = 14;

  const header = ws.addRow(['Channel', 'Actual $', 'LY $', 'Var % vs LY', 'Budget $', 'Var % vs Budget']);
  styleHeaderRow(header);

  // style is applied before the per-cell colors below, since setting
  // row.font AFTER cell-level fonts have already been assigned wipes them.
  function writeRow(lbl: string, a: { v: number; b: number; py: number }, style?: 'bold' | 'italic') {
    const row = ws.addRow([lbl]);
    if (style === 'bold') row.font = { bold: true };
    if (style === 'italic') row.font = { italic: true };
    setMoney(row.getCell(2), a.v);
    setMoney(row.getCell(3), a.py);
    setPct(row.getCell(4), pctVar(a.v, a.py), varColor(pctVar(a.v, a.py), false));
    setMoney(row.getCell(5), a.b);
    setPct(row.getCell(6), pctVar(a.v, a.b), varColor(pctVar(a.v, a.b), false));
    return row;
  }

  for (const chId of ALL_CHANNELS) {
    const cfg = CHANNEL_CFGS[chId];
    const chA = agg(D, curEntity, cfg.key, idx);
    writeRow(cfg.lbl, chA, 'bold');
  }

  const deductParts = DEDUCTION_KEYS.map(k => agg(D, curEntity, k, idx));
  const deductA = {
    v: deductParts.reduce((s, a) => s + a.v, 0),
    b: deductParts.reduce((s, a) => s + a.b, 0),
    py: deductParts.reduce((s, a) => s + a.py, 0),
  };
  writeRow('Discounts & Adjustments', deductA, 'italic');

  const salesAgg = agg(D, curEntity, 'Total Sales', idx);
  const totalRow = writeRow('Total Sales', salesAgg);
  styleTotalRow(totalRow, 6);

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'revenue:channel-trend', 'Channel Trend', row);
  addChartImage(ws, chartImages, 'revenue:channel-mix', 'Channel Mix', row);

  return ws;
}

// One sheet per revenue channel — mirrors the on-screen single-channel
// "Channel Detail" table exactly (subitems, then that channel's total row;
// no Budget columns — the on-screen table doesn't show them for a single
// channel either), plus that channel's own Channel Trend / Channel Mix chart
// snapshots (captured while the UI had that channel selected), so "download
// all channels" produces a properly labeled sheet per channel instead of one
// combined table.
export function addRevenueChannelSheet(
  wb: ExcelJS.Workbook, D: DashboardData, curEntity: string, curPeriod: string, chId: ChannelId,
  chartImages: { key: string; image: string }[],
): ExcelJS.Worksheet {
  const idx = getIdx(curPeriod, D.periods);
  const cfg = CHANNEL_CFGS[chId];
  const sheetName = buildSheetName(`${LOC_ABBREV[curEntity] || curEntity} ${cfg.lbl}`, D.periods, idx);
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.getColumn(1).width = 28;
  for (let i = 2; i <= 4; i++) ws.getColumn(i).width = 14;

  const header = ws.addRow(['Channel', 'Actual $', 'LY $', 'Var % vs LY']);
  styleHeaderRow(header);

  function writeRow(lbl: string, a: { v: number; b: number; py: number }) {
    const row = ws.addRow([lbl]);
    setMoney(row.getCell(2), a.v);
    setMoney(row.getCell(3), a.py);
    setPct(row.getCell(4), pctVar(a.v, a.py), varColor(pctVar(a.v, a.py), false));
    return row;
  }

  if (cfg.subitems) {
    for (const sub of cfg.subitems) {
      const a = subItemAgg(D, curEntity, idx, sub);
      if (a.v === 0 && a.py === 0) continue;
      writeRow(sub.lbl, a);
    }
  }

  const chA = agg(D, curEntity, cfg.key, idx);
  const totalRow = writeRow(cfg.lbl, chA);
  styleTotalRow(totalRow, 4);

  let row = ws.rowCount + 2;
  row = addChartImage(ws, chartImages, 'revenue:channel-trend', `${cfg.lbl} Trend`, row);
  if (cfg.subitems) addChartImage(ws, chartImages, 'revenue:channel-mix', `${cfg.lbl} Mix`, row);

  return ws;
}
