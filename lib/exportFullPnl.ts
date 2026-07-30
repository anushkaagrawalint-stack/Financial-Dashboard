import type ExcelJS from 'exceljs';
import type { DashboardData } from './types';
import { getIdx } from './utils';
import { GROUPS, ALL_LOCS, PCT_LINE_KEYS, EXPENSE_KEYS } from './fullPnlGroups';
import { computeDetailRow, computeCompareCell, ppDiff } from './fullPnlCompute';
import { styleHeaderRow, styleSectionRow, styleTotalRow, varColor, valueColor, setMoney, setPct, LOC_ABBREV, buildSheetName } from './xlsxStyle';

// Adds a Full P&L worksheet to an existing workbook (so "Export All" and the
// standalone Full P&L export share this exact logic) and returns it.
export function addFullPnlSheet(wb: ExcelJS.Workbook, D: DashboardData, period: string, loc: string): ExcelJS.Worksheet {
  const idx = getIdx(period, D.periods);
  const isCompare = loc === 'all';
  const activeLocs = ['Consolidated', ...ALL_LOCS];
  const sheetName = buildSheetName(isCompare ? 'All Locations' : (LOC_ABBREV[loc] || loc), D.periods, idx);

  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });

  if (isCompare) {
    const header = ['Line Item'];
    for (const l of activeLocs) header.push(`${l} $`, `${l} %`);
    const headerRow = ws.addRow(header);
    styleHeaderRow(headerRow);

    ws.getColumn(1).width = 34;
    for (let i = 2; i <= header.length; i++) ws.getColumn(i).width = 13;

    const colCount = header.length;

    // Mirrors the on-screen "All Locations" compare view: every row is colored
    // by raw sign (green/red), flipped for the expense-category subtrees (via
    // isExp) — not just the profit subtotal rows. `bold` is applied before the
    // per-cell colors below since setting row.font afterward would wipe them.
    function writeCompareLeaf(lbl: string, dataKey: string, subtractKey: string | undefined, useEntity: string | undefined, indent: number, isExp: boolean, bold: boolean) {
      const row = ws.addRow([lbl]);
      row.getCell(1).alignment = { indent };
      if (bold) row.font = { bold: true };
      let col = 2;
      for (const l of activeLocs) {
        const c = computeCompareCell(D, l, dataKey, subtractKey, useEntity, idx);
        const isBlank = !!useEntity && l !== 'Consolidated';
        const v = isBlank ? null : c.v;
        setMoney(row.getCell(col), v, v != null ? varColor(v, isExp) : null);
        setPct(row.getCell(col + 1), isBlank ? null : c.pct);
        col += 2;
      }
      return row;
    }

    for (const g of GROUPS) {
      if (g.type === 'sec') {
        const row = ws.addRow([g.lbl]);
        ws.mergeCells(row.number, 1, row.number, colCount);
        styleSectionRow(row, colCount);
        continue;
      }
      if (g.type === 'total') {
        const row = writeCompareLeaf(g.lbl, g.key, undefined, undefined, 0, false, false);
        styleTotalRow(row, colCount);
        continue;
      }
      const isExp = EXPENSE_KEYS.has(g.key);
      writeCompareLeaf(g.lbl, g.key, undefined, g.useEntity, 0, isExp, true);
      if (g.sub) {
        for (const s of g.sub) {
          writeCompareLeaf(s.lbl, s.key, s.subKey, g.useEntity, 1, isExp, false);
          if (s.children) {
            for (const c of s.children) {
              writeCompareLeaf(c.lbl, c.key, undefined, g.useEntity, 2, isExp, false);
              if (c.children) {
                for (const gc of c.children) {
                  writeCompareLeaf(gc.lbl, gc.key, undefined, g.useEntity, 3, isExp, false);
                }
              }
            }
          }
        }
      }
    }
  } else {
    const header = [
      'Line Item', 'Actual $', 'Actual %', 'Budget $', 'Budget %',
      'Var $ vs Bud', 'Var % vs Bud', 'PY $', 'PY %', 'Var $ vs PY', 'Var % vs PY',
    ];
    const headerRow = ws.addRow(header);
    styleHeaderRow(headerRow);

    ws.getColumn(1).width = 34;
    for (let i = 2; i <= header.length; i++) ws.getColumn(i).width = 13;

    const colCount = header.length;

    function writeDetailLeaf(lbl: string, dataKey: string, subtractKey: string | undefined, useEntity: string | undefined, indent: number, isExp: boolean, isPctLine: boolean, bold: boolean, colorValue: boolean) {
      const row = ws.addRow([lbl]);
      row.getCell(1).alignment = { indent };
      if (bold) row.font = { bold: true };
      const rv = computeDetailRow(D, loc, dataKey, subtractKey, useEntity, idx);
      if (!rv) {
        for (let i = 2; i <= colCount; i++) row.getCell(i).value = '—';
        return row;
      }
      const { v, b, py, actPct, budPct, pyPct } = rv;
      const varBudPct = isPctLine ? ppDiff(actPct, budPct) : (b ? ((v - b) / Math.abs(b)) * 100 : null);
      const varPyPct = isPctLine ? ppDiff(actPct, pyPct) : (py ? ((v - py) / Math.abs(py)) * 100 : null);
      const valColor = colorValue ? valueColor(v) : null;

      setMoney(row.getCell(2), v, valColor);
      setPct(row.getCell(3), actPct);
      setMoney(row.getCell(4), b);
      setPct(row.getCell(5), budPct);
      setMoney(row.getCell(6), v - b, varColor(v - b, isExp));
      setPct(row.getCell(7), varBudPct, varColor(varBudPct, isExp));
      setMoney(row.getCell(8), py);
      setPct(row.getCell(9), pyPct);
      setMoney(row.getCell(10), v - py, varColor(v - py, isExp));
      setPct(row.getCell(11), varPyPct, varColor(varPyPct, isExp));
      return row;
    }

    for (const g of GROUPS) {
      if (g.type === 'sec') {
        const row = ws.addRow([g.lbl]);
        ws.mergeCells(row.number, 1, row.number, colCount);
        styleSectionRow(row, colCount);
        continue;
      }
      const isExp = g.type === 'total' ? false : EXPENSE_KEYS.has(g.key);
      const isPctLine = g.type !== 'total' && PCT_LINE_KEYS.has(g.key);
      const isTotal = g.type === 'total';
      const row = writeDetailLeaf(g.lbl, g.key, undefined, g.useEntity, 0, isExp, isPctLine, true, isTotal);
      if (isTotal) {
        styleTotalRow(row, colCount);
        continue;
      }
      if (g.sub) {
        for (const s of g.sub) {
          writeDetailLeaf(s.lbl, s.key, s.subKey, g.useEntity, 1, isExp, isPctLine, false, false);
          if (s.children) {
            for (const c of s.children) {
              writeDetailLeaf(c.lbl, c.key, undefined, g.useEntity, 2, isExp, isPctLine, false, false);
              if (c.children) {
                for (const gc of c.children) {
                  writeDetailLeaf(gc.lbl, gc.key, undefined, g.useEntity, 3, isExp, isPctLine, false, false);
                }
              }
            }
          }
        }
      }
    }
  }

  return ws;
}
