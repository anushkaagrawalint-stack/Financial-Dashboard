'use client';

import '@/lib/chartSetup';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, getLabels, fmt$, fmtPct, varCls } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import { grd, tip } from '@/lib/chartSetup';

interface Props {
  D: DashboardData;
  curEntity: string;
  curPeriod: string;
}

export default function OverviewPanel({ D, curEntity, curPeriod }: Props) {
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const labels = useMemo(() => getLabels(curPeriod, D.periods), [curPeriod, D.periods]);
  const en = D.t12[curEntity];

  const sales = agg(D, curEntity, 'Total Sales', idx);
  const gp = agg(D, curEntity, 'Gross Profit', idx);
  const ebitda = agg(D, curEntity, 'EBITDA', idx);
  const net = agg(D, curEntity, 'Net Income', idx);
  const cogs = agg(D, curEntity, 'Total Cost of Goods Sold', idx);
  const labor = agg(D, curEntity, 'Total Payroll Expenses', idx);
  const ts = sales.v || 1;

  const fcPct = cogs.v != null ? (cogs.v / ts) * 100 : null;
  const lbPct = labor.v != null ? (labor.v / ts) * 100 : null;
  const fcPctPY = idx.reduce((s, i) => {
    const sv = en['Total Sales'].py[i] || 1;
    return s + (en['Total Cost of Goods Sold'].py[i] || 0) / sv * 100;
  }, 0) / idx.length;
  const lbPctPY = idx.reduce((s, i) => {
    const sv = en['Total Sales'].py[i] || 1;
    return s + (en['Total Payroll Expenses'].py[i] || 0) / sv * 100;
  }, 0) / idx.length;

  const budCls = (a: number, b: number | null) => b != null ? (a - b >= 0 ? 'pos' : 'neg') : '';
  const cogsB = agg(D, curEntity, 'Total Cost of Goods Sold', idx);
  const salesB = agg(D, curEntity, 'Total Sales', idx);
  const laborB = agg(D, curEntity, 'Total Payroll Expenses', idx);

  const allIdx = getIdx('all17', D.periods);
  const rangeLabel = idx.length > 1
    ? `${D.periods[idx[0]]} – ${D.periods[idx[idx.length - 1]]} (${idx.length} periods)`
    : D.periods[idx[0]];

  const corpE = D.t12['RASA Worldwide'];
  const costSlices = [
    { lbl: 'COGS', key: 'Total Cost of Goods Sold', ent: curEntity, color: '#ef4444' },
    { lbl: 'Labor', key: 'Total Payroll Expenses', ent: curEntity, color: '#f59e0b' },
    { lbl: 'OpEx', key: 'Total Operating Expense', ent: curEntity, color: '#8b5cf6' },
    { lbl: 'Occupancy', key: 'Total Occupancy Cost', ent: curEntity, color: '#60a5fa' },
    { lbl: 'Corporate', key: 'Total Corporate Overhead & Other', ent: 'RASA Worldwide', color: '#10b981' },
  ];
  const donutVals = costSlices.map(s => Math.abs(agg(D, s.ent, s.key, idx).v || 0));
  const donutLabels = costSlices.map((s, i) => {
    const v = agg(D, s.ent, s.key, idx).v || 0;
    const pct = ts > 0 ? (v / ts) * 100 : 0;
    return `${s.lbl} (${pct.toFixed(1)}%)`;
  });

  const ebitdaActual = idx.map(i => en['EBITDA'].v[i]);
  const ebitdaBudget = idx.map(i => en['EBITDA'].b[i]);
  const ebitdaPY = idx.map(i => en['EBITDA'].py[i]);
  const ebitdaSingle = idx.length <= 3;

  const ebitdaPos = ebitdaActual.map(v => ((v ?? 0) >= 0 ? v : null));
  const ebitdaNeg = ebitdaActual.map(v => ((v ?? 0) < 0 ? v : null));

  const ebitdaDatasets = ebitdaSingle
    ? [
        { label: 'Actual (+)', data: ebitdaPos, backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.5, categoryPercentage: 0.7 },
        { label: 'Actual (-)', data: ebitdaNeg, backgroundColor: '#dc2626', borderRadius: 3, barPercentage: 0.5, categoryPercentage: 0.7 },
        { label: 'Budget', data: ebitdaBudget, backgroundColor: 'rgba(159,124,239,.22)', borderRadius: 3, barPercentage: 0.5, categoryPercentage: 0.7 },
        { label: 'Prior Year', data: ebitdaPY, backgroundColor: 'rgba(107,114,128,.25)', borderRadius: 3, barPercentage: 0.5, categoryPercentage: 0.7 },
      ]
    : [
        { type: 'bar' as const, label: 'Actual (+)', data: ebitdaPos, backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.75, order: 2 },
        { type: 'bar' as const, label: 'Actual (-)', data: ebitdaNeg, backgroundColor: '#dc2626', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.75, order: 2 },
        { type: 'line' as const, label: 'Budget', data: ebitdaBudget, borderColor: 'rgba(124,58,237,.5)', backgroundColor: 'transparent', pointBackgroundColor: 'rgba(124,58,237,.5)', pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, borderDash: [5, 4], tension: 0.3, fill: false, order: 1 },
        { type: 'line' as const, label: 'Prior Year', data: ebitdaPY, borderColor: 'rgba(100,116,160,.7)', backgroundColor: 'transparent', pointBackgroundColor: 'rgba(100,116,160,.7)', pointRadius: 2, pointHoverRadius: 4, borderWidth: 1.5, tension: 0.3, fill: false, order: 1 },
      ];

  const tableRows = [...allIdx].reverse().map(i => {
    const s = en['Total Sales'].v[i] || 1;
    const g = en['Gross Profit'].v[i];
    const e = en['EBITDA'].v[i];
    const n = en['Net Income'].v[i];
    const c = en['Total Cost of Goods Sold'].v[i];
    const l = en['Total Payroll Expenses'].v[i];
    return { i, s, g, e, n, c, l };
  });

  return (
    <div className="panel active" id="panel-overview">
      <div className="kpis">
        <KpiCard label="Total Sales" valStr={fmt$(sales.v)} accent subs={[
          { txt: 'Budget: ' + fmt$(sales.b), cls: budCls(sales.v, sales.b) },
          { txt: 'PY: ' + fmt$(sales.py), cls: sales.py != null ? varCls(sales.v - sales.py, false) : '' },
        ]} />
        <KpiCard label="Gross Profit" valStr={fmt$(gp.v)} subs={[
          { txt: 'Budget: ' + fmt$(gp.b), cls: budCls(gp.v, gp.b) },
          { txt: 'PY: ' + fmt$(gp.py), cls: gp.py != null ? varCls(gp.v - gp.py, false) : '' },
        ]} />
        <KpiCard label="EBITDA" valStr={fmt$(ebitda.v)} subs={[
          { txt: 'Budget: ' + fmt$(ebitda.b), cls: budCls(ebitda.v, ebitda.b) },
          { txt: 'PY: ' + fmt$(ebitda.py), cls: ebitda.py != null ? varCls(ebitda.v - ebitda.py, false) : '' },
        ]} />
        <KpiCard label="Net Income" valStr={fmt$(net.v)} subs={[
          { txt: 'Budget: ' + fmt$(net.b), cls: budCls(net.v, net.b) },
          { txt: 'PY: ' + fmt$(net.py), cls: net.py != null ? varCls(net.v - net.py, false) : '' },
        ]} />
        <KpiCard label="COGS %" valStr={fmtPct(fcPct)} subs={[
          {
            txt: 'Budget: ' + fmtPct(cogsB.b / (salesB.b || 1) * 100),
            cls: fcPct != null ? (fcPct <= cogsB.b / (salesB.b || 1) * 100 ? 'pos' : 'neg') : '',
          },
          { txt: 'PY: ' + fmtPct(fcPctPY), cls: fcPct != null ? (fcPct <= fcPctPY ? 'pos' : 'neg') : '' },
        ]} />
        <KpiCard label="Labor %" valStr={fmtPct(lbPct)} subs={[
          {
            txt: 'Budget: ' + fmtPct(laborB.b / (salesB.b || 1) * 100),
            cls: lbPct != null ? (lbPct <= laborB.b / (salesB.b || 1) * 100 ? 'pos' : 'neg') : '',
          },
          { txt: 'PY: ' + fmtPct(lbPctPY), cls: lbPct != null ? (lbPct <= lbPctPY ? 'pos' : 'neg') : '' },
        ]} />
      </div>

      <div className="cgrid" style={{ marginBottom: 16 }}>
        <div className="ccard" style={{ gridColumn: '1/-1' }}>
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">Revenue Trend</div>
              <div className="ccard-sub">Actual vs Budget vs Prior Year — grouped by period</div>
            </div>
          </div>
          <div className="cwrap tall">
            <Bar
              data={{
                labels,
                datasets: [
                  { label: 'Actual', data: idx.map(i => en['Total Sales'].v[i]), backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Budget', data: idx.map(i => en['Total Sales'].b[i]), backgroundColor: 'rgba(159,124,239,.22)', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Prior Year', data: idx.map(i => en['Total Sales'].py[i]), backgroundColor: 'rgba(107,114,128,.25)', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#6b7280', font: { family: 'Montserrat', size: 12 }, boxWidth: 12 } }, tooltip: { ...tip, callbacks: { label: c => ` ${c.dataset.label}: ${fmt$(c.raw as number)}` } } },
                scales: { x: { ...grd, grid: { display: false }, ticks: { ...grd.ticks, maxRotation: 45 } }, y: { ...grd, ticks: { ...grd.ticks, callback: v => fmt$(v as number) } } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="cgrid-pair">
        <div className="ccard">
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">Cost Breakdown</div>
              <div className="ccard-sub">% of total sales — selected period</div>
            </div>
          </div>
          <div className="cwrap pair">
            <Doughnut
              data={{
                labels: donutLabels,
                datasets: [{ data: donutVals.map(Math.round), backgroundColor: costSlices.map(s => s.color), borderWidth: 0, hoverOffset: 6 }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '58%',
                plugins: {
                  legend: { position: 'right', labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, padding: 8, boxWidth: 10 } },
                  tooltip: { backgroundColor: '#ffffff', borderColor: 'rgba(124,58,237,0.2)', borderWidth: 1, titleColor: '#1a1f2e', bodyColor: '#374151', padding: 10, callbacks: { label: c => ` ${(c.label as string).split(' (')[0]}: ${fmt$(c.raw as number)}` } },
                },
              }}
            />
          </div>
        </div>

        <div className="ccard">
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">EBITDA</div>
              <div className="ccard-sub">Actual vs Budget vs Prior Year</div>
            </div>
          </div>
          <div className="cwrap pair">
            <Bar
              data={{ labels, datasets: ebitdaDatasets as never }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, labels: { color: '#6b7280', font: { family: 'Montserrat', size: 12 }, boxWidth: 12 } },
                  tooltip: { backgroundColor: '#ffffff', borderColor: 'rgba(124,58,237,0.2)', borderWidth: 1, titleColor: '#1a1f2e', bodyColor: '#374151', padding: 10, callbacks: { label: c => ` ${c.dataset.label}: ${fmt$(c.raw as number)}` } },
                },
                scales: {
                  x: { ...grd, grid: { display: false }, ticks: { ...grd.ticks, maxRotation: 45 } },
                  y: { ...grd, ticks: { ...grd.ticks, callback: v => fmt$(v as number) }, grid: { color: 'rgba(124,58,237,0.08)' } },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <span className="tcard-title">Period Summary</span>
          <span className="tcard-meta">{rangeLabel}</span>
        </div>
        <div className="tscroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Period</th><th>Revenue</th><th>COGS</th><th>GP</th><th>GP%</th>
                <th>Labor</th><th>Labor%</th><th>EBITDA</th><th>Net Income</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(({ i, s, g, e, n, c, l }) => (
                <tr key={i}>
                  <td>{D.periods[i]}</td>
                  <td>{fmt$(en['Total Sales'].v[i])}</td>
                  <td>{fmt$(c)}</td>
                  <td>{fmt$(g)}</td>
                  <td>{fmtPct(g ? (g / s) * 100 : null)}</td>
                  <td>{fmt$(l)}</td>
                  <td>{fmtPct(l ? (l / s) * 100 : null)}</td>
                  <td className={(e ?? 0) < 0 ? 'neg' : (e ?? 0) > 0 ? 'pos' : ''}>{fmt$(e)}</td>
                  <td className={(n ?? 0) < 0 ? 'neg' : (n ?? 0) > 0 ? 'pos' : ''}>{fmt$(n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
