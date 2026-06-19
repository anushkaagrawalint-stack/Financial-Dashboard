'use client';

import '@/lib/chartSetup';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useMemo, useState, useEffect } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, getLabels, fmt$, fmtPct, fmtVar, fmtVarPct, pctVar, varCls, hasBudget } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import { grd, tip } from '@/lib/chartSetup';

interface Props {
  D: DashboardData;
  curEntity: string;
  curPeriod: string;
}

interface ExpenseItem { lbl: string; key: string; }
interface ExpenseCfg {
  title: string;
  color: string;
  totalKey: string;
  items: ExpenseItem[];
  useEntity?: string;
}

const CFGS: Record<string, ExpenseCfg> = {
  cogs: {
    title: 'Cost of Goods Sold', color: '#ef4444', totalKey: 'Total Cost of Goods Sold',
    items: [
      { lbl: 'Food Costs', key: 'Total Food Costs' },
      { lbl: 'Beverage Costs', key: 'Total Beverage Costs' },
      { lbl: 'Paper Costs', key: 'Total Paper Costs' },
      { lbl: 'Waste Costs', key: 'Total Waste Costs' },
      { lbl: 'Freight & Other', key: 'COGS - Freight, Delivery, & Sales Tax' },
    ],
  },
  labor: {
    title: 'Labor & Payroll', color: '#f59e0b', totalKey: 'Total Payroll Expenses',
    items: [
      { lbl: 'Management', key: 'Management' },
      { lbl: 'Hourly', key: 'Hourly' },
      { lbl: 'Overtime', key: 'Overtime' },
      { lbl: 'Bonus', key: 'Bonus' },
      { lbl: 'Payroll Taxes', key: 'Total Payroll Taxes' },
      { lbl: 'Payroll Processing Fee', key: 'Payroll Processing Fee' },
      { lbl: 'Health Insurance', key: 'Health Insurance' },
    ],
  },
  opex: {
    title: 'Operating Expenses', color: '#8b5cf6', totalKey: 'Total Operating Expense',
    items: [
      { lbl: 'Supplies', key: 'Total Supplies' },
      { lbl: 'Marketing', key: 'Total Marketing' },
      { lbl: 'Delivery Fees', key: 'Total Delivery Fees' },
      { lbl: '3rd Party Fees', key: 'Total Third-Party Fees' },
      { lbl: 'Credit Card Fees', key: 'Total Credit Card Fees' },
      { lbl: 'Insurance', key: 'Total Insurance' },
      { lbl: 'Repairs & Maintenance', key: 'Total Repairs & Maintenance' },
      { lbl: 'Other Expenses', key: 'Total Other Expenses' },
    ],
  },
  occupancy: {
    title: 'Occupancy', color: '#60a5fa', totalKey: 'Total Occupancy Cost',
    items: [
      { lbl: 'Rent Expense', key: 'Rent Expense' },
      { lbl: 'Common Area Maintenance (CAM)', key: 'Common Area Maintenance (CAM)' },
      { lbl: 'Real Estate Tax', key: 'Real Estate Tax' },
      { lbl: 'Utilities', key: 'Total Utilities' },
    ],
  },
  corporate: {
    title: 'Corporate Overhead', color: '#10b981', totalKey: 'Total Corporate Overhead & Other',
    useEntity: 'RASA Worldwide',
    items: [
      { lbl: 'Corp Payroll', key: 'Total Corp - Payroll Expenses' },
      { lbl: 'Corp M&E & Travel', key: 'Total Corp - Meals, Entertainment, & Travel' },
      { lbl: 'Corp Marketing', key: 'Total Corp - Marketing' },
      { lbl: 'Corp Insurance', key: 'Corp - Insurance Expense' },
      { lbl: 'Corp IT & Technology', key: 'Corp - IT & Technology' },
      { lbl: 'Corp Accounting Fees', key: 'Corp - Accounting Fees' },
      { lbl: 'Corp Legal Fees', key: 'Corp - Legal Fees' },
      { lbl: 'Corp Other Professional Fees', key: 'Corp - Other Professional Fees' },
      { lbl: 'Corp Recruiting Fees', key: 'Corp - Recruiting Fees' },
    ],
  },
};

const SUBTABS = [
  { id: 'cogs', label: 'COGS' },
  { id: 'labor', label: 'Labor' },
  { id: 'opex', label: 'OpEx' },
  { id: 'occupancy', label: 'Occupancy' },
  { id: 'corporate', label: 'Corporate' },
];

const COLORS = ['#ef4444','#f59e0b','#8b5cf6','#60a5fa','#10b981','#fb923c','#9f7cef','#84cc16','#f472b6'];

const isCogsOrLabor = (sub: string) => sub === 'cogs' || sub === 'labor';

export default function ExpensesPanel({ D, curEntity, curPeriod }: Props) {
  const [curSub, setCurSub] = useState('cogs');
  const isAllLocations = curEntity === 'Consolidated';
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);

  useEffect(() => {
    if (!isAllLocations && curSub === 'corporate') setCurSub('cogs');
  }, [isAllLocations, curSub]);
  const labels = useMemo(() => getLabels(curPeriod, D.periods), [curPeriod, D.periods]);
  // showBud used for chart data; table always shows all columns with '—' for missing
  const showBud = hasBudget(D, curEntity, idx);

  const cfg = CFGS[curSub];
  const UE = cfg.useEntity || curEntity;
  const totalSalesAgg = agg(D, curEntity, 'Total Sales', idx);
  const ts = totalSalesAgg.v || 1;
  const totAgg = agg(D, UE, cfg.totalKey, idx);
  const ta = totAgg;

  const pctVals = idx.map(i => {
    const s = D.t12[curEntity]['Total Sales'].v[i] || 1;
    const v = D.t12[UE][cfg.totalKey]?.v[i];
    return v != null ? +((v / s) * 100).toFixed(2) : null;
  });
  const bPctVals = idx.map(i => {
    const s = D.t12[curEntity]['Total Sales'].b[i] || 1;
    const v = D.t12[UE][cfg.totalKey]?.b[i];
    return v != null ? +((v / s) * 100).toFixed(2) : null;
  });
  const pyPctVals = idx.map(i => {
    const s = D.t12[curEntity]['Total Sales'].py[i] || 1;
    const v = D.t12[UE][cfg.totalKey]?.py[i];
    return v != null ? +((v / s) * 100).toFixed(2) : null;
  });

  // Donut: for COGS/Labor show % of sales; for others use raw values
  const donutVals = isCogsOrLabor(curSub)
    ? cfg.items.map(it => {
        const v = agg(D, UE, it.key, idx).v || 0;
        return ts > 0 ? +((Math.abs(v) / ts) * 100).toFixed(1) : 0;
      })
    : cfg.items.map(it => Math.abs(agg(D, UE, it.key, idx).v || 0));

  const donutLabels = isCogsOrLabor(curSub)
    ? cfg.items.map((it, i) => `${it.lbl} (${donutVals[i]}%)`)
    : cfg.items.map(it => it.lbl);

  const tPct = ta.v ? (ta.v / ts) * 100 : null;

  // KPI cards for COGS/Labor: show % of sales as main value
  const renderKpiCards = () => {
    if (isCogsOrLabor(curSub)) {
      const taPct = ta.v ? (ta.v / ts) * 100 : null;
      const taBudPct = ta.b ? (ta.b / (totalSalesAgg.b || 1)) * 100 : null;
      const taLYPct = ta.py ? (ta.py / (totalSalesAgg.py || 1)) * 100 : null;
      return (
        <>
          <KpiCard label={`Total ${cfg.title}`} valStr={fmtPct(taPct)} accent subs={[
            { txt: `vs Budget: ${fmtVarPct(taBudPct != null && taPct != null ? taBudPct - taPct : null)}`, cls: varCls(taBudPct != null && taPct != null ? taBudPct - taPct : null, false) },
            { txt: `vs LY: ${fmtVarPct(taLYPct != null && taPct != null ? taLYPct - taPct : null)}`, cls: varCls(taLYPct != null && taPct != null ? taLYPct - taPct : null, false) },
          ]} />
          {cfg.items.slice(0, 4).map(it => {
            const a = agg(D, UE, it.key, idx);
            const aPct = a.v ? (a.v / ts) * 100 : null;
            const bPct = a.b ? (a.b / (totalSalesAgg.b || 1)) * 100 : null;
            const pyPct = a.py ? (a.py / (totalSalesAgg.py || 1)) * 100 : null;
            return (
              <KpiCard key={it.key} label={it.lbl} valStr={fmtPct(aPct)} subs={[
                { txt: `vs Budget: ${fmtVarPct(bPct != null && aPct != null ? bPct - aPct : null)}`, cls: varCls(bPct != null && aPct != null ? bPct - aPct : null, false) },
                { txt: `vs LY: ${fmtVarPct(pyPct != null && aPct != null ? pyPct - aPct : null)}`, cls: varCls(pyPct != null && aPct != null ? pyPct - aPct : null, false) },
              ]} />
            );
          })}
        </>
      );
    } else {
      return (
        <>
          <KpiCard label={`Total ${cfg.title}`} valStr={fmt$(totAgg.v)} accent subs={[
            { txt: `vs Budget: ${fmtVarPct(pctVar(totAgg.v, totAgg.b))}`, cls: varCls(totAgg.v - totAgg.b, true) },
            { txt: `vs LY: ${fmtVarPct(pctVar(totAgg.v, totAgg.py))}`, cls: varCls(totAgg.v - totAgg.py, true) },
          ]} />
          {cfg.items.slice(0, 4).map(it => {
            const a = agg(D, UE, it.key, idx);
            return (
              <KpiCard key={it.key} label={it.lbl} valStr={fmt$(a.v)} subs={[
                { txt: `vs Budget: ${fmtVarPct(pctVar(a.v, a.b))}`, cls: varCls(a.v - a.b, true) },
                { txt: `vs LY: ${fmtVarPct(pctVar(a.v, a.py))}`, cls: varCls(a.v - a.py, true) },
              ]} />
            );
          })}
        </>
      );
    }
  };

  // Table rendering
  const renderTable = () => {
    if (isCogsOrLabor(curSub)) {
      // Columns: Line Item | Actual $ | Actual % | LY % | Var % vs LY | Budget % | Var % vs Budget
      return (
        <table className="dtable">
          <thead>
            <tr>
              <th>Line Item</th><th>Actual $</th><th>Actual %</th>
              <th>LY %</th><th>Var % vs LY</th>
              <th>Budget %</th><th>Var % vs Budget</th>
            </tr>
          </thead>
          <tbody>
            {cfg.items.map(it => {
              const a = agg(D, UE, it.key, idx);
              const actualPct = a.v ? (a.v / (totalSalesAgg.v || 1)) * 100 : null;
              const lyPct = a.py ? (a.py / (totalSalesAgg.py || 1)) * 100 : null;
              const budgetPct = a.b ? (a.b / (totalSalesAgg.b || 1)) * 100 : null;
              const varLY = actualPct != null && lyPct != null ? lyPct - actualPct : null;
              const varBud = actualPct != null && budgetPct != null ? budgetPct - actualPct : null;
              return (
                <tr key={it.key}>
                  <td>{it.lbl}</td>
                  <td>{fmt$(a.v)}</td>
                  <td>{fmtPct(actualPct)}</td>
                  <td>{fmtPct(lyPct)}</td>
                  <td className={varCls(varLY, false)}>{fmtVarPct(varLY)}</td>
                  <td>{budgetPct != null ? fmtPct(budgetPct) : '—'}</td>
                  <td className={budgetPct != null ? varCls(varBud, false) : ''}>{budgetPct != null ? fmtVarPct(varBud) : '—'}</td>
                </tr>
              );
            })}
            {(() => {
              const actualPct = ta.v ? (ta.v / (totalSalesAgg.v || 1)) * 100 : null;
              const lyPct = ta.py ? (ta.py / (totalSalesAgg.py || 1)) * 100 : null;
              const budgetPct = ta.b ? (ta.b / (totalSalesAgg.b || 1)) * 100 : null;
              const varLY = actualPct != null && lyPct != null ? lyPct - actualPct : null;
              const varBud = actualPct != null && budgetPct != null ? budgetPct - actualPct : null;
              return (
                <tr className="total-row">
                  <td>Total {cfg.title}</td>
                  <td>{fmt$(ta.v)}</td>
                  <td>{fmtPct(actualPct)}</td>
                  <td>{fmtPct(lyPct)}</td>
                  <td className={varCls(varLY, false)}>{fmtVarPct(varLY)}</td>
                  <td>{budgetPct != null ? fmtPct(budgetPct) : '—'}</td>
                  <td className={budgetPct != null ? varCls(varBud, false) : ''}>{budgetPct != null ? fmtVarPct(varBud) : '—'}</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      );
    } else {
      // Columns: Line Item | Actual $ | Actual % | LY $ | Var % vs LY | Budget $ | Var % vs Budget
      return (
        <table className="dtable">
          <thead>
            <tr>
              <th>Line Item</th><th>Actual $</th><th>Actual %</th>
              <th>LY $</th><th>Var % vs LY</th>
              <th>Budget $</th><th>Var % vs Budget</th>
            </tr>
          </thead>
          <tbody>
            {cfg.items.map(it => {
              const a = agg(D, UE, it.key, idx);
              const actualPct = a.v ? (a.v / (totalSalesAgg.v || 1)) * 100 : null;
              const varLY = pctVar(a.v, a.py);
              const varBud = pctVar(a.v, a.b);
              return (
                <tr key={it.key}>
                  <td>{it.lbl}</td>
                  <td>{fmt$(a.v)}</td>
                  <td>{fmtPct(actualPct)}</td>
                  <td>{fmt$(a.py)}</td>
                  <td className={a.py ? varCls(varLY, true) : ''}>{a.py ? fmtVarPct(varLY) : '—'}</td>
                  <td>{fmt$(a.b)}</td>
                  <td className={a.b ? varCls(varBud, true) : ''}>{a.b ? fmtVarPct(varBud) : '—'}</td>
                </tr>
              );
            })}
            {(() => {
              const actualPct = ta.v ? (ta.v / (totalSalesAgg.v || 1)) * 100 : null;
              const varLY = pctVar(ta.v, ta.py);
              const varBud = pctVar(ta.v, ta.b);
              return (
                <tr className="total-row">
                  <td>Total {cfg.title}</td>
                  <td>{fmt$(ta.v)}</td>
                  <td>{fmtPct(actualPct)}</td>
                  <td>{fmt$(ta.py)}</td>
                  <td className={ta.py ? varCls(varLY, true) : ''}>{ta.py ? fmtVarPct(varLY) : '—'}</td>
                  <td>{fmt$(ta.b)}</td>
                  <td className={ta.b ? varCls(varBud, true) : ''}>{ta.b ? fmtVarPct(varBud) : '—'}</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      );
    }
  };

  return (
    <div className="panel active" id="panel-expenses">
      <div className="subtabs">
        {SUBTABS.filter(st => isAllLocations || st.id !== 'corporate').map(st => (
          <div
            key={st.id}
            className={`subtab${curSub === st.id ? ' active' : ''}`}
            onClick={() => setCurSub(st.id)}
          >
            {st.label}
          </div>
        ))}
      </div>

      <div>
        <div className="kpis">
          {renderKpiCards()}
        </div>

        <div className="cgrid" style={{ marginBottom: 16 }}>
          <div className="ccard" style={{ gridColumn: '1/-1' }}>
            <div className="ccard-hdr">
              <div>
                <div className="ccard-title">{cfg.title} — Grouped Trend</div>
                <div className="ccard-sub">Actual vs Budget vs Prior Year</div>
              </div>
            </div>
            <div className="cwrap tall">
              <Bar
                key={curPeriod + curSub + '-trend'}
                data={{
                  labels,
                  datasets: [
                    { label: 'Actual', data: idx.map(i => D.t12[UE][cfg.totalKey]?.v[i]), backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                    { label: 'Budget', data: idx.map(i => D.t12[UE][cfg.totalKey]?.b[i]), backgroundColor: 'rgba(159,124,239,.22)', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                    { label: 'Prior Year', data: idx.map(i => D.t12[UE][cfg.totalKey]?.py[i]), backgroundColor: 'rgba(107,114,128,.25)', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, boxWidth: 10 } }, tooltip: { ...tip, callbacks: { label: c => ` ${c.dataset.label}: ${fmt$(c.raw as number)}` } } },
                  scales: { x: { ...grd, grid: { display: false }, ticks: { ...grd.ticks, maxRotation: 45 } }, y: { ...grd, ticks: { ...grd.ticks, callback: v => fmt$(v as number) } } },
                }}
              />
            </div>
          </div>
        </div>

        <div className="cgrid-pair">
          <div className="ccard">
            <div className="ccard-hdr"><div><div className="ccard-title">Breakdown — Selected Period</div></div></div>
            <div className="cwrap pair">
              <Doughnut
                data={{
                  labels: donutLabels,
                  datasets: [{ data: donutVals.map(v => Math.round(v)), backgroundColor: COLORS, borderWidth: 0, hoverOffset: 4 }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false, cutout: '58%',
                  plugins: {
                    legend: { position: 'right', labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, padding: 6, boxWidth: 8 } },
                    tooltip: { ...tip, callbacks: { label: isCogsOrLabor(curSub)
                      ? (c => ` ${(c.label as string).split(' (')[0]}: ${c.raw}% of sales`)
                      : (c => ` ${c.label}: ${fmt$(c.raw as number)}`) } },
                  },
                }}
              />
            </div>
          </div>

          <div className="ccard">
            <div className="ccard-hdr"><div><div className="ccard-title">{cfg.title} % of Sales</div></div></div>
            <div className="cwrap pair">
              {idx.length === 1 ? (
                <Bar
                  key={curPeriod + curSub + '-pct'}
                  data={{
                    labels,
                    datasets: [
                      { label: 'Actual', data: pctVals, backgroundColor: '#9f7cef', borderRadius: 4, barPercentage: 0.8, categoryPercentage: 0.85 },
                      { label: 'Budget', data: bPctVals, backgroundColor: 'rgba(159,124,239,.22)', borderRadius: 4, barPercentage: 0.8, categoryPercentage: 0.85 },
                      { label: 'Prior Year', data: pyPctVals, backgroundColor: 'rgba(107,114,128,.25)', borderRadius: 4, barPercentage: 0.8, categoryPercentage: 0.85 },
                    ],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, boxWidth: 10 } }, tooltip: { ...tip, callbacks: { label: c => ` ${c.dataset.label}: ${(c.raw as number)?.toFixed(1)}%` } } },
                    scales: { x: { ...grd, grid: { display: false }, ticks: { ...grd.ticks } }, y: { ...grd, ticks: { ...grd.ticks, callback: v => v + '%' } } },
                  }}
                />
              ) : (
                <Line
                  data={{
                    labels,
                    datasets: [{
                      label: cfg.title + ' %',
                      data: pctVals,
                      borderColor: cfg.color,
                      backgroundColor: cfg.color + '18',
                      fill: true,
                      borderWidth: 2,
                      pointRadius: 4,
                      tension: 0.3,
                    }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: c => ` ${(c.raw as number)?.toFixed(1)}%` } } },
                    scales: { x: { ...grd, grid: { display: false }, ticks: { ...grd.ticks, maxRotation: 45 } }, y: { ...grd, ticks: { ...grd.ticks, callback: v => v + '%' } } },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="tcard">
          <div className="tcard-hdr"><span className="tcard-title">{cfg.title} Detail</span></div>
          <div className="tscroll">
            {renderTable()}
          </div>
        </div>
      </div>
    </div>
  );
}
