'use client';

import '@/lib/chartSetup';
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, fmt$, fmtPct, fmtVar, varCls, hasBudget } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import { grd, tip } from '@/lib/chartSetup';

interface Props {
  D: DashboardData;
  curEntity: string;
  curPeriod: string;
}

interface PnlLine {
  lbl: string;
  key: string;
  isTotal?: boolean;
  hero?: boolean;
  isExp?: boolean;
  indent?: number;
  useEntity?: string;
}

const LINES: PnlLine[] = [
  { lbl: 'Total Sales', key: 'Total Sales', isTotal: true, hero: true },
  { lbl: 'Cost of Goods Sold', key: 'Total Cost of Goods Sold', isExp: true, indent: 1 },
  { lbl: 'Gross Profit', key: 'Gross Profit', isTotal: true, hero: true },
  { lbl: 'Total Payroll Expenses', key: 'Total Payroll Expenses', isExp: true, indent: 1 },
  { lbl: 'Prime Profit', key: 'Prime Profit', isTotal: true },
  { lbl: 'Total Operating Expense', key: 'Total Operating Expense', isExp: true, indent: 1 },
  { lbl: 'Total Occupancy Cost', key: 'Total Occupancy Cost', isExp: true, indent: 1 },
  { lbl: 'Store Level Profit', key: 'Store Level Profit', isTotal: true, hero: true },
  { lbl: 'Corporate Overhead', key: 'Total Corporate Overhead & Other', isExp: true, indent: 1, useEntity: 'RASA Worldwide' },
  { lbl: 'EBITDA', key: 'EBITDA', isTotal: true, hero: true },
  { lbl: 'Net Income', key: 'Net Income', isTotal: true, hero: true },
];

const HEADLINE_KEYS = ['Total Sales', 'Gross Profit', 'EBITDA', 'Net Income'];

export default function SummaryPanel({ D, curEntity, curPeriod }: Props) {
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const isAllLocations = curEntity === 'Consolidated';
  const showBud = hasBudget(D, curEntity, idx);
  const ts = agg(D, curEntity, 'Total Sales', idx).v || 1;
  const rangeLabel = idx.length > 1
    ? `${D.periods[idx[0]]} – ${D.periods[idx[idx.length - 1]]}`
    : D.periods[idx[0]];

  const wf = [
    { lbl: 'Revenue', key: 'Total Sales', ent: curEntity, color: '#9f7cef', neg: false },
    { lbl: '– COGS', key: 'Total Cost of Goods Sold', ent: curEntity, color: '#ef4444', neg: true },
    { lbl: 'Gross Profit', key: 'Gross Profit', ent: curEntity, color: '#10b981', neg: false },
    { lbl: '– Labor', key: 'Total Payroll Expenses', ent: curEntity, color: '#f59e0b', neg: true },
    { lbl: '– OpEx', key: 'Total Operating Expense', ent: curEntity, color: '#8b5cf6', neg: true },
    { lbl: '– Occupancy', key: 'Total Occupancy Cost', ent: curEntity, color: '#60a5fa', neg: true },
    { lbl: 'EBITDA', key: 'EBITDA', ent: curEntity, color: agg(D, curEntity, 'EBITDA', idx).v >= 0 ? '#10b981' : '#ef4444', neg: false },
    { lbl: 'Net Income', key: 'Net Income', ent: curEntity, color: agg(D, curEntity, 'Net Income', idx).v >= 0 ? '#10b981' : '#ef4444', neg: false },
  ];

  return (
    <div className="panel active" id="panel-summary">
      <div className="kpis">
        {HEADLINE_KEYS.map(k => {
          const a = agg(D, curEntity, k, idx);
          const pct = a.v ? (a.v / ts) * 100 : null;
          return (
            <KpiCard key={k} label={k} valStr={fmt$(a.v)} accent subs={[
              { txt: fmtPct(pct) + ' of sales', cls: '' },
              { txt: 'Budget: ' + fmt$(a.b), cls: a.b != null ? varCls(a.v - a.b, false) : '' },
              { txt: 'PY: ' + fmt$(a.py), cls: a.py != null ? varCls(a.v - a.py, false) : '' },
            ]} />
          );
        })}
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <span className="tcard-title">P&L Summary</span>
          <span className="tcard-meta">{rangeLabel}</span>
        </div>
        <div className="tscroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Line Item</th><th>Actual $</th><th>% of Sales</th>
                {showBud && <><th>Budget $</th><th>Bud%</th><th>Var $</th></>}
                <th>PY $</th><th>PY%</th><th>PY Var $</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map(line => {
                const ent = line.useEntity || curEntity;
                const rawA = agg(D, ent, line.key, idx);
                const isCorp = !!line.useEntity && !isAllLocations;
                const a = isCorp ? { v: 0, b: 0, py: 0 } : rawA;
                const salesForPct = agg(D, curEntity, 'Total Sales', idx).v || 1;
                const pct = a.v ? (a.v / salesForPct) * 100 : null;
                const bPct = a.b ? (a.b / salesForPct) * 100 : null;
                const pyPct = a.py ? (a.py / salesForPct) * 100 : null;
                const vB = a.b != null ? a.v - a.b : null;
                const vPY = a.py != null ? a.v - a.py : null;
                const cls = line.isTotal ? 'total-row' : '';
                const valCls = a.v < 0 ? 'neg' : (a.v > 0 && line.isTotal ? 'pos' : '');
                return (
                  <tr key={line.key + line.lbl} className={cls} style={{ fontSize: line.hero ? '13px' : undefined }}>
                    <td style={{ paddingLeft: ((line.indent || 0) * 20 + 14) + 'px' }}>{line.lbl}</td>
                    <td className={valCls}>{fmt$(a.v)}</td>
                    <td>{fmtPct(pct)}</td>
                    {showBud && <><td>{fmt$(a.b)}</td><td>{fmtPct(bPct)}</td><td className={varCls(vB, !!line.isExp)}>{fmtVar(vB)}</td></>}
                    <td>{fmt$(a.py)}</td><td>{fmtPct(pyPct)}</td>
                    <td className={varCls(vPY, !!line.isExp)}>{fmtVar(vPY)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ccard">
        <div className="ccard-hdr">
          <div>
            <div className="ccard-title">Profit Waterfall</div>
            <div className="ccard-sub">Revenue → EBITDA → Net Income — selected period</div>
          </div>
        </div>
        <div className="cwrap tall">
          <Bar
            data={{
              labels: wf.map(w => w.lbl),
              datasets: [{
                label: 'Amount',
                data: wf.map(w => {
                  const v = agg(D, w.ent, w.key, idx).v;
                  return w.neg && v ? -Math.abs(v) : v;
                }),
                backgroundColor: wf.map(w => {
                  const v = agg(D, w.ent, w.key, idx).v;
                  const isNeg = (w.neg && v) || (!w.neg && v < 0);
                  return isNeg ? '#ef4444' : '#9f7cef';
                }),
                borderRadius: 4,
              }],
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { ...tip, callbacks: { label: c => ` ${fmt$(c.raw as number)}` } },
              },
              scales: {
                x: { ...grd, grid: { display: false }, ticks: { ...grd.ticks } },
                y: { ...grd, ticks: { ...grd.ticks, callback: v => fmt$(v as number) } },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
