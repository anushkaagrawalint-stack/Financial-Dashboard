import type { DashboardData, MetricData } from './types';

export function getIdx(sel: string, periods: string[]): number[] {
  const n = periods.length;
  if (n === 0) return [];

  // all / all{N} — every available period
  if (/^all/.test(sel)) return periods.map((_, i) => i);

  // last{N} — last N periods
  const lastM = sel.match(/^last(\d+)$/);
  if (lastM) {
    const k = Math.min(parseInt(lastM[1]), n);
    const start = n - k;
    return Array.from({ length: k }, (_, j) => start + j);
  }

  // fy{YY} or ytd{YY} — all available periods for year 20{YY}
  const yearKey = sel.match(/^(?:fy|ytd)(\d{2})$/);
  if (yearKey) {
    const year = 2000 + parseInt(yearKey[1]);
    return periods.reduce<number[]>((acc, p, i) => {
      if (p.endsWith(` ${year}`)) acc.push(i);
      return acc;
    }, []);
  }

  // q{Q}_{YY} — quarter Q (P{3Q-2}–P{3Q}) of year 20{YY}
  const qKey = sel.match(/^q(\d)_(\d{2})$/);
  if (qKey) {
    const q = parseInt(qKey[1]);
    const year = 2000 + parseInt(qKey[2]);
    const pStart = (q - 1) * 3 + 1;
    const pEnd = q * 3;
    return periods.reduce<number[]>((acc, p, i) => {
      const m = p.match(/^P(\d+)\s+(\d{4})$/);
      if (m && +m[2] === year && +m[1] >= pStart && +m[1] <= pEnd) acc.push(i);
      return acc;
    }, []);
  }

  // Single period string like "P6 2026"
  const i = periods.indexOf(sel);
  return [i >= 0 ? i : n - 1];
}

export function getLabels(sel: string, periods: string[]): string[] {
  return getIdx(sel, periods).map(i => periods[i]);
}

// True when `indices` are Period N..M of a single year, contiguous and in order
// (e.g. a quarter, a YTD span, or any other in-year multi-period range) —
// as opposed to a single period or a range crossing a year boundary.
function contiguousYearRange(periods: string[], indices: number[]): { startIdx: number; lastIdx: number; startNum: number } | null {
  if (indices.length < 2) return null;
  const sorted = [...indices].sort((a, b) => a - b);
  let prevNum: number | null = null;
  for (const i of sorted) {
    const m = periods[i]?.match(/^P(\d+)\s+\d{4}$/);
    if (!m) return null;
    const n = +m[1];
    if (prevNum !== null && n !== prevNum + 1) return null;
    prevNum = n;
  }
  const startMatch = periods[sorted[0]].match(/^P(\d+)\s+\d{4}$/)!;
  return { startIdx: sorted[0], lastIdx: sorted[sorted.length - 1], startNum: +startMatch[1] };
}

export function agg(
  D: DashboardData,
  entity: string,
  label: string,
  indices: number[]
): { v: number; b: number; py: number } {
  const d = D.t12[entity]?.[label] as MetricData | undefined;
  if (!d) return { v: 0, b: 0, py: 0 };

  // In-year multi-period spans (YTD, quarters, custom ranges): derive from the
  // cumulative "YTD" figures read directly from each period's own P&L sheet
  // (last-period cumulative minus the cumulative just before the range starts),
  // rather than summing monthly values in JS — the sheet's own running totals
  // can reflect later restatements that individual months' Actual columns don't.
  if (d.ytdV) {
    const range = contiguousYearRange(D.periods, indices);
    if (range) {
      const before = range.startNum > 1 ? range.startIdx - 1 : -1;
      const v = (d.ytdV[range.lastIdx] || 0) - (before >= 0 ? (d.ytdV[before] || 0) : 0);
      const b = (d.ytdB?.[range.lastIdx] || 0) - (before >= 0 ? (d.ytdB?.[before] || 0) : 0);
      const py = (d.ytdPy?.[range.lastIdx] || 0) - (before >= 0 ? (d.ytdPy?.[before] || 0) : 0);
      return { v, b, py };
    }
  }

  const v = indices.reduce((s, i) => s + (d.v[i] || 0), 0);
  const b = indices.reduce((s, i) => s + (d.b[i] || 0), 0);
  const py = indices.reduce((s, i) => s + (d.py[i] || 0), 0);
  return { v, b, py };
}

export function hasBudget(D: DashboardData, entity: string, indices: number[]): boolean {
  const d = D.t12[entity]?.['Total Sales'] as MetricData | undefined;
  return !!d && indices.some(i => d.b[i] && d.b[i] !== 0);
}

export function fmt$(v: number | null | undefined): string {
  if (v == null) return '—';
  const neg = v < 0;
  const abs = Math.abs(v);
  const str = '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return neg ? '(' + str + ')' : str;
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  const neg = v < 0;
  return neg ? '(' + Math.abs(v).toFixed(1) + '%)' : v.toFixed(1) + '%';
}

export function fmtVar(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 0) return fmt$(v);
  return '(' + fmt$(Math.abs(v)).replace(/^\(/, '').replace(/\)$/, '') + ')';
}

export function fmtVarPct(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v < 0) return '(' + Math.abs(v).toFixed(1) + '%)';
  return v.toFixed(1) + '%';
}

export function pctVar(a: number, b: number | null | undefined): number | null {
  if (b == null || b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

export function varCls(v: number | null | undefined, isExp: boolean): string {
  if (v == null) return '';
  return (isExp ? v < 0 : v > 0) ? 'pos' : 'neg';
}

export function cellFmt(v: number | null | undefined, pct: number | null | undefined): string {
  if (v == null) return '—';
  return fmt$(v) + ' (' + fmtPct(pct) + ')';
}

export const chartGridStyle = {
  grid: { color: 'rgba(124,58,237,0.08)' },
  ticks: { color: '#6b7280', font: { family: 'Montserrat', size: 10 } },
};

export const tooltipStyle = {
  backgroundColor: '#ffffff',
  borderColor: 'rgba(124,58,237,0.2)',
  borderWidth: 1,
  titleColor: '#1a1f2e',
  bodyColor: '#374151',
  padding: 10,
};
