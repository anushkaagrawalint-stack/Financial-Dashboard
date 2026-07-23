'use client';

import '@/lib/chartSetup';
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, getLabels, fmt$, fmtPct, fmtVar, fmtVarPct, pctVar, varCls } from '@/lib/utils';
import { grd, tip } from '@/lib/chartSetup';

interface Props {
  D: DashboardData;
  curPeriod: string;
}

const LOCATIONS = ['Ballpark', 'MVT', 'National Landing', 'Mosaic', 'Rockville'];

export default function LocationsPanel({ D, curPeriod }: Props) {
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const labels = useMemo(() => getLabels(curPeriod, D.periods), [curPeriod, D.periods]);

  const rows = LOCATIONS.map(entity => {
    const sales = agg(D, entity, 'Total Sales', idx);
    const ebitda = agg(D, entity, 'EBITDA', idx);
    const cogs = agg(D, entity, 'Total Cost of Goods Sold', idx);
    const labor = agg(D, entity, 'Total Payroll Expenses', idx);
    const opex = agg(D, entity, 'Total Operating Expense', idx);

    const pctOfSales = (x: number, base: number) => (base ? (x / base) * 100 : null);
    const ebitdaPct = pctOfSales(ebitda.v, sales.v);
    const ebitdaBudPct = pctOfSales(ebitda.b, sales.b);
    const ebitdaPyPct = pctOfSales(ebitda.py, sales.py);
    const cogsPct = pctOfSales(cogs.v, sales.v);
    const cogsBudPct = pctOfSales(cogs.b, sales.b);
    const cogsPyPct = pctOfSales(cogs.py, sales.py);
    const laborPct = pctOfSales(labor.v, sales.v);
    const laborBudPct = pctOfSales(labor.b, sales.b);
    const laborPyPct = pctOfSales(labor.py, sales.py);
    const opexPct = pctOfSales(opex.v, sales.v);
    const opexBudPct = pctOfSales(opex.b, sales.b);
    const opexPyPct = pctOfSales(opex.py, sales.py);

    return {
      entity, sales, ebitda,
      ebitdaPct, ebitdaBudPct, ebitdaPyPct,
      cogsPct, cogsBudPct, cogsPyPct,
      laborPct, laborBudPct, laborPyPct,
      opexPct, opexBudPct, opexPyPct,
    };
  });

  const ppDiff = (a: number | null, b: number | null) => (a != null && b != null ? a - b : null);

  // "All Locations" row: dollar figures summed, percentages re-derived from the summed
  // dollars (not averaged across locations) so COGS/Labor/OpEx/EBITDA % stay accurate.
  const sumField = (key: 'sales' | 'ebitda' | 'cogs' | 'labor' | 'opex', field: 'v' | 'b' | 'py') => {
    const metricKey: Record<string, string> = {
      sales: 'Total Sales', ebitda: 'EBITDA', cogs: 'Total Cost of Goods Sold',
      labor: 'Total Payroll Expenses', opex: 'Total Operating Expense',
    };
    return LOCATIONS.reduce((s, entity) => s + agg(D, entity, metricKey[key], idx)[field], 0);
  };
  const pctOfSales = (x: number, base: number) => (base ? (x / base) * 100 : null);
  const totalSales = { v: sumField('sales', 'v'), b: sumField('sales', 'b'), py: sumField('sales', 'py') };
  const totalEbitda = { v: sumField('ebitda', 'v'), b: sumField('ebitda', 'b'), py: sumField('ebitda', 'py') };
  const totalCogs = { v: sumField('cogs', 'v'), b: sumField('cogs', 'b'), py: sumField('cogs', 'py') };
  const totalLabor = { v: sumField('labor', 'v'), b: sumField('labor', 'b'), py: sumField('labor', 'py') };
  const totalOpex = { v: sumField('opex', 'v'), b: sumField('opex', 'b'), py: sumField('opex', 'py') };
  const totals = {
    entity: 'All Locations',
    sales: totalSales, ebitda: totalEbitda,
    ebitdaPct: pctOfSales(totalEbitda.v, totalSales.v),
    ebitdaBudPct: pctOfSales(totalEbitda.b, totalSales.b),
    ebitdaPyPct: pctOfSales(totalEbitda.py, totalSales.py),
    cogsPct: pctOfSales(totalCogs.v, totalSales.v),
    cogsBudPct: pctOfSales(totalCogs.b, totalSales.b),
    cogsPyPct: pctOfSales(totalCogs.py, totalSales.py),
    laborPct: pctOfSales(totalLabor.v, totalSales.v),
    laborBudPct: pctOfSales(totalLabor.b, totalSales.b),
    laborPyPct: pctOfSales(totalLabor.py, totalSales.py),
    opexPct: pctOfSales(totalOpex.v, totalSales.v),
    opexBudPct: pctOfSales(totalOpex.b, totalSales.b),
    opexPyPct: pctOfSales(totalOpex.py, totalSales.py),
  };

  return (
    <div className="panel active" id="panel-locations">
      <div className="loc-cards">
        {rows.map(r => (
          <div className="ccard loc-card" key={r.entity}>
            <div className="loc-card-name">{r.entity}</div>

            <div>
              <div className="loc-metric-lbl">Sales</div>
              <div className="loc-metric-val">{fmt$(r.sales.v)}</div>
              <div className="loc-metric-subs">
                <div className={'loc-metric-sub ' + varCls(r.sales.v - r.sales.b, false)}>
                  {fmtVar(r.sales.v - r.sales.b)} ({fmtVarPct(pctVar(r.sales.v, r.sales.b))}) vs Bud
                </div>
                <div className={'loc-metric-sub ' + varCls(r.sales.v - r.sales.py, false)}>
                  {fmtVar(r.sales.v - r.sales.py)} ({fmtVarPct(pctVar(r.sales.v, r.sales.py))}) vs PY
                </div>
              </div>
            </div>

            <div className="loc-divider" />

            <div>
              <div className="loc-metric-lbl">EBITDA</div>
              <div className="loc-metric-val">
                {fmt$(r.ebitda.v)} <span className="loc-metric-pct">{fmtPct(r.ebitdaPct)}</span>
              </div>
              <div className="loc-metric-subs">
                <div className={'loc-metric-sub ' + varCls(r.ebitda.v - r.ebitda.b, false)}>
                  {fmtVar(r.ebitda.v - r.ebitda.b)} ({fmtVarPct(ppDiff(r.ebitdaPct, r.ebitdaBudPct))}) vs Bud
                </div>
                <div className={'loc-metric-sub ' + varCls(r.ebitda.v - r.ebitda.py, false)}>
                  {fmtVar(r.ebitda.v - r.ebitda.py)} ({fmtVarPct(ppDiff(r.ebitdaPct, r.ebitdaPyPct))}) vs PY
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="cgrid-pair">
        <div className="ccard">
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">Sales by Location</div>
            </div>
          </div>
          <div className="cwrap tall">
            <Bar
              data={{
                labels: rows.map(r => r.entity),
                datasets: [
                  { label: 'Actual', data: rows.map(r => r.sales.v), backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Budget', data: rows.map(r => r.sales.b), backgroundColor: '#6d28d9', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Prior Year', data: rows.map(r => r.sales.py), backgroundColor: '#9ca3af', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                ],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, boxWidth: 10 } }, tooltip: { ...tip, callbacks: { label: c => ` ${c.dataset.label}: ${fmt$(c.raw as number)}` } } },
                scales: { x: { ...grd, grid: { display: false } }, y: { ...grd, ticks: { ...grd.ticks, callback: v => fmt$(v as number) } } },
              }}
            />
          </div>
        </div>

        <div className="ccard">
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">EBITDA by Location</div>
            </div>
          </div>
          <div className="cwrap tall">
            <Bar
              data={{
                labels: rows.map(r => r.entity),
                datasets: [
                  { label: 'Actual', data: rows.map(r => r.ebitda.v), backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Budget', data: rows.map(r => r.ebitda.b), backgroundColor: '#6d28d9', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Prior Year', data: rows.map(r => r.ebitda.py), backgroundColor: '#9ca3af', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                ],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#6b7280', font: { family: 'Montserrat', size: 10 }, boxWidth: 10 } }, tooltip: { ...tip, callbacks: { label: c => ` ${c.dataset.label}: ${fmt$(c.raw as number)}` } } },
                scales: { x: { ...grd, grid: { display: false } }, y: { ...grd, ticks: { ...grd.ticks, callback: v => fmt$(v as number) } } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <span className="tcard-title">Location Detail</span>
          <span className="tcard-meta">{labels.length > 1 ? `${labels[0]} – ${labels[labels.length - 1]}` : labels[0]}</span>
        </div>
        <div className="tscroll">
          <table className="dtable dtable-sticky-first">
            <thead>
              <tr>
                <th>Location</th>
                <th>Sales</th><th>Bud</th><th>Var Bud $</th><th>Var Bud %</th><th>PY</th><th>Var PY $</th><th>Var PY %</th>
                <th>EBITDA</th><th>Bud</th><th>Var Bud $</th><th>Var Bud %</th><th>PY</th><th>Var PY $</th><th>Var PY %</th>
                <th>COGS</th><th>Bud</th><th>Var Bud</th><th>PY</th><th>Var PY</th>
                <th>Labor</th><th>Bud</th><th>Var Bud</th><th>PY</th><th>Var PY</th>
                <th>OpEx</th><th>Bud</th><th>Var Bud</th><th>PY</th><th>Var PY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.entity}>
                  <td>{r.entity}</td>
                  <td>{fmt$(r.sales.v)}</td>
                  <td>{fmt$(r.sales.b)}</td>
                  <td className={varCls(r.sales.v - r.sales.b, false)}>{fmtVar(r.sales.v - r.sales.b)}</td>
                  <td className={varCls(r.sales.v - r.sales.b, false)}>{fmtVarPct(pctVar(r.sales.v, r.sales.b))}</td>
                  <td>{fmt$(r.sales.py)}</td>
                  <td className={varCls(r.sales.v - r.sales.py, false)}>{fmtVar(r.sales.v - r.sales.py)}</td>
                  <td className={varCls(r.sales.v - r.sales.py, false)}>{fmtVarPct(pctVar(r.sales.v, r.sales.py))}</td>

                  <td>{fmt$(r.ebitda.v)}</td>
                  <td>{fmt$(r.ebitda.b)}</td>
                  <td className={varCls(r.ebitda.v - r.ebitda.b, false)}>{fmtVar(r.ebitda.v - r.ebitda.b)}</td>
                  <td className={varCls(r.ebitda.v - r.ebitda.b, false)}>{fmtVarPct(ppDiff(r.ebitdaPct, r.ebitdaBudPct))}</td>
                  <td>{fmt$(r.ebitda.py)}</td>
                  <td className={varCls(r.ebitda.v - r.ebitda.py, false)}>{fmtVar(r.ebitda.v - r.ebitda.py)}</td>
                  <td className={varCls(r.ebitda.v - r.ebitda.py, false)}>{fmtVarPct(ppDiff(r.ebitdaPct, r.ebitdaPyPct))}</td>

                  <td>{fmtPct(r.cogsPct)}</td>
                  <td>{fmtPct(r.cogsBudPct)}</td>
                  <td className={varCls(ppDiff(r.cogsPct, r.cogsBudPct), true)}>{fmtVarPct(ppDiff(r.cogsPct, r.cogsBudPct))}</td>
                  <td>{fmtPct(r.cogsPyPct)}</td>
                  <td className={varCls(ppDiff(r.cogsPct, r.cogsPyPct), true)}>{fmtVarPct(ppDiff(r.cogsPct, r.cogsPyPct))}</td>

                  <td>{fmtPct(r.laborPct)}</td>
                  <td>{fmtPct(r.laborBudPct)}</td>
                  <td className={varCls(ppDiff(r.laborPct, r.laborBudPct), true)}>{fmtVarPct(ppDiff(r.laborPct, r.laborBudPct))}</td>
                  <td>{fmtPct(r.laborPyPct)}</td>
                  <td className={varCls(ppDiff(r.laborPct, r.laborPyPct), true)}>{fmtVarPct(ppDiff(r.laborPct, r.laborPyPct))}</td>

                  <td>{fmtPct(r.opexPct)}</td>
                  <td>{fmtPct(r.opexBudPct)}</td>
                  <td className={varCls(ppDiff(r.opexPct, r.opexBudPct), true)}>{fmtVarPct(ppDiff(r.opexPct, r.opexBudPct))}</td>
                  <td>{fmtPct(r.opexPyPct)}</td>
                  <td className={varCls(ppDiff(r.opexPct, r.opexPyPct), true)}>{fmtVarPct(ppDiff(r.opexPct, r.opexPyPct))}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>{totals.entity}</td>
                <td>{fmt$(totals.sales.v)}</td>
                <td>{fmt$(totals.sales.b)}</td>
                <td className={varCls(totals.sales.v - totals.sales.b, false)}>{fmtVar(totals.sales.v - totals.sales.b)}</td>
                <td className={varCls(totals.sales.v - totals.sales.b, false)}>{fmtVarPct(pctVar(totals.sales.v, totals.sales.b))}</td>
                <td>{fmt$(totals.sales.py)}</td>
                <td className={varCls(totals.sales.v - totals.sales.py, false)}>{fmtVar(totals.sales.v - totals.sales.py)}</td>
                <td className={varCls(totals.sales.v - totals.sales.py, false)}>{fmtVarPct(pctVar(totals.sales.v, totals.sales.py))}</td>

                <td>{fmt$(totals.ebitda.v)}</td>
                <td>{fmt$(totals.ebitda.b)}</td>
                <td className={varCls(totals.ebitda.v - totals.ebitda.b, false)}>{fmtVar(totals.ebitda.v - totals.ebitda.b)}</td>
                <td className={varCls(totals.ebitda.v - totals.ebitda.b, false)}>{fmtVarPct(ppDiff(totals.ebitdaPct, totals.ebitdaBudPct))}</td>
                <td>{fmt$(totals.ebitda.py)}</td>
                <td className={varCls(totals.ebitda.v - totals.ebitda.py, false)}>{fmtVar(totals.ebitda.v - totals.ebitda.py)}</td>
                <td className={varCls(totals.ebitda.v - totals.ebitda.py, false)}>{fmtVarPct(ppDiff(totals.ebitdaPct, totals.ebitdaPyPct))}</td>

                <td>{fmtPct(totals.cogsPct)}</td>
                <td>{fmtPct(totals.cogsBudPct)}</td>
                <td className={varCls(ppDiff(totals.cogsPct, totals.cogsBudPct), true)}>{fmtVarPct(ppDiff(totals.cogsPct, totals.cogsBudPct))}</td>
                <td>{fmtPct(totals.cogsPyPct)}</td>
                <td className={varCls(ppDiff(totals.cogsPct, totals.cogsPyPct), true)}>{fmtVarPct(ppDiff(totals.cogsPct, totals.cogsPyPct))}</td>

                <td>{fmtPct(totals.laborPct)}</td>
                <td>{fmtPct(totals.laborBudPct)}</td>
                <td className={varCls(ppDiff(totals.laborPct, totals.laborBudPct), true)}>{fmtVarPct(ppDiff(totals.laborPct, totals.laborBudPct))}</td>
                <td>{fmtPct(totals.laborPyPct)}</td>
                <td className={varCls(ppDiff(totals.laborPct, totals.laborPyPct), true)}>{fmtVarPct(ppDiff(totals.laborPct, totals.laborPyPct))}</td>

                <td>{fmtPct(totals.opexPct)}</td>
                <td>{fmtPct(totals.opexBudPct)}</td>
                <td className={varCls(ppDiff(totals.opexPct, totals.opexBudPct), true)}>{fmtVarPct(ppDiff(totals.opexPct, totals.opexBudPct))}</td>
                <td>{fmtPct(totals.opexPyPct)}</td>
                <td className={varCls(ppDiff(totals.opexPct, totals.opexPyPct), true)}>{fmtVarPct(ppDiff(totals.opexPct, totals.opexPyPct))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
