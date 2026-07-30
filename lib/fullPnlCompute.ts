import type { DashboardData } from './types';
import { agg } from './utils';

export interface RowVals { v: number; b: number; py: number; actPct: number | null; budPct: number | null; pyPct: number | null; }

// Single-entity detail mode: full Actual/Budget/PY breakdown for one entity.
export function computeDetailRow(
  D: DashboardData, selectedLoc: string, dataKey: string,
  subtractKey: string | undefined, useEntity: string | undefined, idx: number[],
): RowVals | null {
  let entity: string;
  let tsEntity: string;
  if (useEntity) {
    if (selectedLoc !== 'Consolidated') return null; // corporate rows only apply at the consolidated level
    entity = useEntity;
    tsEntity = 'Consolidated';
  } else {
    entity = selectedLoc;
    tsEntity = selectedLoc;
  }
  const a = agg(D, entity, dataKey, idx);
  let v = a.v, b = a.b, py = a.py;
  if (subtractKey) {
    const s = agg(D, entity, subtractKey, idx);
    v -= s.v; b -= s.b; py -= s.py;
  }
  const ts = agg(D, tsEntity, 'Total Sales', idx);
  const actPct = ts.v ? (v / ts.v) * 100 : null;
  const budPct = ts.b ? (b / ts.b) * 100 : null;
  const pyPct = ts.py ? (py / ts.py) * 100 : null;
  return { v, b, py, actPct, budPct, pyPct };
}

export interface CompareCell { v: number; pct: number | null; }

// Compare mode: one $ (% of sales) figure for a given location column.
export function computeCompareCell(
  D: DashboardData, loc: string, dataKey: string,
  subtractKey: string | undefined, useEntity: string | undefined, idx: number[],
): CompareCell {
  if (useEntity) {
    if (loc !== 'Consolidated') return { v: 0, pct: 0 };
    const a = agg(D, useEntity, dataKey, idx);
    const v = subtractKey ? a.v - agg(D, useEntity, subtractKey, idx).v : a.v;
    const ts = agg(D, 'Consolidated', 'Total Sales', idx).v || 1;
    return { v, pct: (v / ts) * 100 };
  }
  const a = agg(D, loc, dataKey, idx);
  const v = subtractKey ? a.v - agg(D, loc, subtractKey, idx).v : a.v;
  const ts = agg(D, loc, 'Total Sales', idx).v || 1;
  return { v, pct: (v / ts) * 100 };
}

export const ppDiff = (a: number | null, b: number | null) => (a != null && b != null ? a - b : null);
