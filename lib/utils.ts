import type { DashboardData, MetricData } from './types';

export function getIdx(sel: string, periods: string[]): number[] {
  const map: Record<string, number[]> = {
    all17: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    last12: [5,6,7,8,9,10,11,12,13,14,15,16],
    fy25: [0,1,2,3,4,5,6,7,8,9,10,11],
    ytd26: [12,13,14,15,16],
    last6: [11,12,13,14,15,16],
    last3: [14,15,16],
    q1_25: [0,1,2], q2_25: [3,4,5], q3_25: [6,7,8], q4_25: [9,10,11], q1_26: [12,13,14],
  };
  if (map[sel]) return map[sel];
  const i = periods.indexOf(sel);
  return i >= 0 ? [i] : [16];
}

export function getLabels(sel: string, periods: string[]): string[] {
  return getIdx(sel, periods).map(i => periods[i]);
}

export function agg(
  D: DashboardData,
  entity: string,
  label: string,
  indices: number[]
): { v: number; b: number; py: number } {
  const d = D.t12[entity]?.[label] as MetricData | undefined;
  if (!d) return { v: 0, b: 0, py: 0 };
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
