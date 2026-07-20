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
                <div className={'loc-metric-sub ' + varCls(r.ebitda.v - r.ebitda.b, true)}>
                  {fmtVar(r.ebitda.v - r.ebitda.b)} ({fmtVarPct(ppDiff(r.ebitdaPct, r.ebitdaBudPct))}) vs Bud
                </div>
                <div className={'loc-metric-sub ' + varCls(r.ebitda.v - r.ebitda.py, true)}>
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
          <table className="dtable">
            <thead>
              <tr>
                <th>Location</th>
                <th>Sales</th><th>Bud</th><th>Var Bud</th><th>PY</th><th>Var PY</th>
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
                  <td className={varCls(r.sales.v - r.sales.b, false)}>{fmtVar(r.sales.v - r.sales.b)} {fmtVarPct(pctVar(r.sales.v, r.sales.b))}</td>
                  <td>{fmt$(r.sales.py)}</td>
                  <td className={varCls(r.sales.v - r.sales.py, false)}>{fmtVar(r.sales.v - r.sales.py)} {fmtVarPct(pctVar(r.sales.v, r.sales.py))}</td>

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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
