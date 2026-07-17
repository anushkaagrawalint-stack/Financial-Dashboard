'use client';

import '@/lib/chartSetup';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, getLabels, fmt$, fmtPct, fmtVar, fmtVarPct, pctVar, varCls } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import { grd, tip, donutLabels as donutLabelsCfg } from '@/lib/chartSetup';

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
  const cogs = agg(D, curEntity, 'Total Cost of Goods Sold', idx);
  const labor = agg(D, curEntity, 'Total Payroll Expenses', idx);
  const ts = sales.v || 1;

  const cogsActualPct = cogs.v != null ? (cogs.v / ts) * 100 : null;
  const cogsBudgetPct = (cogs.b / (sales.b || 1)) * 100;
  const cogsLYPct = (cogs.py / (sales.py || 1)) * 100;

  const laborActualPct = labor.v != null ? (labor.v / ts) * 100 : null;
  const laborBudgetPct = (labor.b / (sales.b || 1)) * 100;
  const laborLYPct = (labor.py / (sales.py || 1)) * 100;

  const allIdx = getIdx('all', D.periods);
  const rangeLabel = idx.length > 1
    ? `${D.periods[idx[0]]} – ${D.periods[idx[idx.length - 1]]} (${idx.length} periods)`
    : D.periods[idx[0]];

  const isAllLocations = curEntity === 'Consolidated';
  const co = agg(D, 'Consolidated', 'Total Corporate Overhead & Other', idx);

  const costSlices = [
    { lbl: 'COGS', key: 'Total Cost of Goods Sold', ent: curEntity, color: '#ef4444' },
    { lbl: 'Labor', key: 'Total Payroll Expenses', ent: curEntity, color: '#f59e0b' },
    { lbl: 'OpEx', key: 'Total Operating Expense', ent: curEntity, color: '#8b5cf6' },
    { lbl: 'Occupancy', key: 'Total Occupancy Cost', ent: curEntity, color: '#60a5fa' },
    ...(isAllLocations ? [{ lbl: 'Corporate', key: 'Total Corporate Overhead & Other', ent: 'RASA Worldwide', color: '#10b981' }] : []),
  ];
  const donutVals = costSlices.map(s => Math.abs(agg(D, s.ent, s.key, idx).v || 0));
  const donutLabels = costSlices.map((s) => {
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
        { label: 'Actual (+)', data: ebitdaPos, backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.75, categoryPercentage: 0.85 },
        { label: 'Actual (-)', data: ebitdaNeg, backgroundColor: '#dc2626', borderRadius: 3, barPercentage: 0.75, categoryPercentage: 0.85 },
        { label: 'Budget', data: ebitdaBudget, backgroundColor: '#6d28d9', borderRadius: 3, barPercentage: 0.75, categoryPercentage: 0.85 },
        { label: 'Prior Year', data: ebitdaPY, backgroundColor: '#9ca3af', borderRadius: 3, barPercentage: 0.75, categoryPercentage: 0.85 },
      ]
    : [
        { type: 'bar' as const, label: 'Actual (+)', data: ebitdaPos, backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.9, categoryPercentage: 0.9, order: 2 },
        { type: 'bar' as const, label: 'Actual (-)', data: ebitdaNeg, backgroundColor: '#dc2626', borderRadius: 3, barPercentage: 0.9, categoryPercentage: 0.9, order: 2 },
        { type: 'line' as const, label: 'Budget', data: ebitdaBudget, borderColor: 'rgba(124,58,237,.5)', backgroundColor: 'transparent', pointBackgroundColor: 'rgba(124,58,237,.5)', pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, borderDash: [5, 4], tension: 0.3, fill: false, order: 1 },
        { type: 'line' as const, label: 'Prior Year', data: ebitdaPY, borderColor: 'rgba(100,116,160,.7)', backgroundColor: 'transparent', pointBackgroundColor: 'rgba(100,116,160,.7)', pointRadius: 2, pointHoverRadius: 4, borderWidth: 1.5, tension: 0.3, fill: false, order: 1 },
      ];

  return (
    <div className="panel active" id="panel-overview">
      <div className="kpis">
        <KpiCard label="Total Sales" valStr={fmt$(sales.v)} accent subs={[
          { txt: `vs Budget: ${fmtVar(sales.v - sales.b)} | ${fmtVarPct(pctVar(sales.v, sales.b))}`, cls: varCls(sales.v - sales.b, false) },
          { txt: `vs LY: ${fmtVar(sales.v - sales.py)} | ${fmtVarPct(pctVar(sales.v, sales.py))}`, cls: varCls(sales.v - sales.py, false) },
        ]} />
        <KpiCard label="Gross Profit" valStr={fmt$(gp.v)} subs={[
          { txt: `vs Budget: ${fmtVar(gp.v - gp.b)}`, cls: varCls(gp.v - gp.b, false) },
          { txt: `vs LY: ${fmtVar(gp.v - gp.py)}`, cls: varCls(gp.v - gp.py, false) },
        ]} />
        <KpiCard label="EBITDA" valStr={fmt$(ebitda.v)} subs={[
          { txt: `vs Budget: ${fmtVar(ebitda.v - ebitda.b)} | ${fmtVarPct(pctVar(ebitda.v, ebitda.b))}`, cls: varCls(ebitda.v - ebitda.b, false) },
          { txt: `vs LY: ${fmtVar(ebitda.v - ebitda.py)} | ${fmtVarPct(pctVar(ebitda.v, ebitda.py))}`, cls: varCls(ebitda.v - ebitda.py, false) },
        ]} />
        {isAllLocations && (
          <KpiCard label="Corporate Overhead" valStr={fmt$(co.v)} subs={[
            { txt: `vs Budget: ${fmtVar(co.v - co.b)} | ${fmtVarPct(pctVar(co.v, co.b))}`, cls: varCls(co.v - co.b, true) },
            { txt: `vs LY: ${fmtVar(co.v - co.py)} | ${fmtVarPct(pctVar(co.v, co.py))}`, cls: varCls(co.v - co.py, true) },
          ]} />
        )}
        <KpiCard label="COGS %" valStr={fmtPct(cogsActualPct)} subs={[
          { txt: `vs Budget: ${fmtVarPct(cogsActualPct != null ? cogsActualPct - cogsBudgetPct : null)}`, cls: varCls(cogsActualPct != null ? cogsActualPct - cogsBudgetPct : null, true) },
          { txt: `vs LY: ${fmtVarPct(cogsActualPct != null ? cogsActualPct - cogsLYPct : null)}`, cls: varCls(cogsActualPct != null ? cogsActualPct - cogsLYPct : null, true) },
        ]} />
        <KpiCard label="Labor %" valStr={fmtPct(laborActualPct)} subs={[
          { txt: `vs Budget: ${fmtVarPct(laborActualPct != null ? laborActualPct - laborBudgetPct : null)}`, cls: varCls(laborActualPct != null ? laborActualPct - laborBudgetPct : null, true) },
          { txt: `vs LY: ${fmtVarPct(laborActualPct != null ? laborActualPct - laborLYPct : null)}`, cls: varCls(laborActualPct != null ? laborActualPct - laborLYPct : null, true) },
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
              key={curPeriod + '-rev'}
              data={{
                labels,
                datasets: [
                  { label: 'Actual', data: idx.map(i => en['Total Sales'].v[i]), backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Budget', data: idx.map(i => en['Total Sales'].b[i]), backgroundColor: '#6d28d9', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Prior Year', data: idx.map(i => en['Total Sales'].py[i]), backgroundColor: '#9ca3af', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, boxWidth: 10 } }, tooltip: { ...tip, callbacks: { label: c => ` ${c.dataset.label}: ${fmt$(c.raw as number)}` } } },
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
                  datalabels: donutLabelsCfg,
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
              key={curPeriod + '-ebitda'}
              data={{ labels, datasets: ebitdaDatasets as never }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, boxWidth: 10 } },
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
                <th>Period</th><th>Revenue</th><th>COGS %</th><th>Labor %</th><th>EBITDA</th><th>EBITDA %</th>
              </tr>
            </thead>
            <tbody>
              {[...allIdx].reverse().map(i => {
                const svRaw = en['Total Sales'].v[i];
                const sv = svRaw || 1;
                const ev = en['EBITDA'].v[i];
                const eCls = (ev ?? 0) < 0 ? 'neg' : (ev ?? 0) > 0 ? 'pos' : '';
                const cogsRaw = en['Total Cost of Goods Sold'].v[i];
                const laborRaw = en['Total Payroll Expenses'].v[i];
                return (
                  <tr key={i}>
                    <td>{D.periods[i]}</td>
                    <td>{fmt$(svRaw)}</td>
                    <td>{fmtPct(svRaw && cogsRaw != null ? (cogsRaw / svRaw) * 100 : null)}</td>
                    <td>{fmtPct(svRaw && laborRaw != null ? (laborRaw / svRaw) * 100 : null)}</td>
                    <td className={eCls}>{fmt$(ev)}</td>
                    <td className={eCls}>{fmtPct(svRaw && ev != null ? (ev / sv) * 100 : null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
