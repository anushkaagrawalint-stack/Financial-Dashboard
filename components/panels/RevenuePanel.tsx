'use client';

import '@/lib/chartSetup';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useMemo, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, getLabels, fmt$, fmtPct, fmtVar, varCls, hasBudget } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import { grd, tip } from '@/lib/chartSetup';

interface Props {
  D: DashboardData;
  curEntity: string;
  curPeriod: string;
}

const CHANNELS = [
  { lbl: 'In-House', key: 'Total Single Plate In-House Sales', color: '#9f7cef' },
  { lbl: 'Takeout', key: 'Total Takeout Sales', color: '#3a7be0' },
  { lbl: 'Delivery', key: 'Total Delivery Sales', color: '#10b981' },
  { lbl: 'Catering', key: 'Total Catering Sales', color: '#8b5cf6' },
  { lbl: 'Offsites', key: 'Total Offsites', color: '#f59e0b' },
  { lbl: 'Del. Fee', key: 'Total Delivery Fee Income', color: '#f472b6' },
];

const ADJ_ROWS = [
  { lbl: 'Sales Adjustments', key: 'Sales Adjustments' },
  { lbl: 'Open App Sales Adjustments', key: 'Open App Sales Adjustments' },
  { lbl: 'Open Tickets', key: 'Open Tickets' },
];

export default function RevenuePanel({ D, curEntity, curPeriod }: Props) {
  const [selKey, setSelKey] = useState('Total Single Plate In-House Sales');
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const labels = useMemo(() => getLabels(curPeriod, D.periods), [curPeriod, D.periods]);
  const en = D.t12[curEntity];
  const showBud = hasBudget(D, curEntity, idx);

  const salesAgg = agg(D, curEntity, 'Total Sales', idx);
  const ts = salesAgg.v || 1;

  const chDonutVals = CHANNELS.map(c => Math.max(agg(D, curEntity, c.key, idx).v || 0, 0));
  const chDonutTotal = chDonutVals.reduce((s, v) => s + v, 0) || 1;
  const chDonutLabels = CHANNELS.map((c, i) => `${c.lbl} (${((chDonutVals[i] / chDonutTotal) * 100).toFixed(1)}%)`);

  const discRow = { lbl: 'Discounts / Refunds', key: 'Total Discounts / Refunds' };
  const disc = agg(D, curEntity, discRow.key, idx);
  const tot = agg(D, curEntity, 'Total Sales', idx);

  return (
    <div className="panel active" id="panel-revenue">
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(7,1fr)' }}>
        <KpiCard label="Total Sales" valStr={fmt$(salesAgg.v)} accent subs={[
          { txt: 'Budget: ' + fmt$(salesAgg.b), cls: salesAgg.b != null ? varCls(salesAgg.v - salesAgg.b, false) : '' },
          { txt: 'PY: ' + fmt$(salesAgg.py), cls: salesAgg.py != null ? varCls(salesAgg.v - salesAgg.py, false) : '' },
        ]} />
        {CHANNELS.map(c => {
          const a = agg(D, curEntity, c.key, idx);
          return (
            <KpiCard key={c.key} label={c.lbl} valStr={fmt$(a.v)} subs={[
              { txt: 'Budget: ' + fmt$(a.b), cls: a.b != null ? varCls(a.v - a.b, false) : '' },
              { txt: 'PY: ' + fmt$(a.py), cls: a.py != null ? varCls(a.v - a.py, false) : '' },
            ]} />
          );
        })}
      </div>

      <div className="cgrid">
        <div className="ccard" style={{ gridColumn: '1/-1' }}>
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">Channel Trend</div>
              <div className="ccard-sub">Actual vs Budget vs Prior Year — grouped bars</div>
            </div>
            <div className="chart-ctrl">
              <label>Channel</label>
              <select value={selKey} onChange={e => setSelKey(e.target.value)}>
                <option value="Total Single Plate In-House Sales">In-House</option>
                <option value="Total Takeout Sales">Takeout</option>
                <option value="Total Delivery Sales">Delivery</option>
                <option value="Total Catering Sales">Catering</option>
                <option value="Total Offsites">Offsites</option>
                <option value="Total Delivery Fee Income">Delivery Fee</option>
              </select>
            </div>
          </div>
          <div className="cwrap tall">
            <Bar
              data={{
                labels,
                datasets: [
                  { label: 'Actual', data: idx.map(i => en[selKey]?.v[i]), backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Budget', data: idx.map(i => en[selKey]?.b[i]), backgroundColor: 'rgba(159,124,239,.22)', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Prior Year', data: idx.map(i => en[selKey]?.py[i]), backgroundColor: 'rgba(107,114,128,.25)', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
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

        <div className="ccard" style={{ gridColumn: '1/-1' }}>
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">Channel Mix</div>
              <div className="ccard-sub">% of total sales — selected period</div>
            </div>
          </div>
          <div className="cwrap tall">
            <Doughnut
              data={{
                labels: chDonutLabels,
                datasets: [{ data: chDonutVals, backgroundColor: CHANNELS.map(c => c.color), borderWidth: 0, hoverOffset: 8 }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false, cutout: '58%',
                plugins: {
                  legend: { position: 'right', labels: { color: '#6b7280', font: { family: 'Montserrat', size: 11 }, padding: 14, boxWidth: 12 } },
                  tooltip: { backgroundColor: '#ffffff', borderColor: 'rgba(124,58,237,0.2)', borderWidth: 1, titleColor: '#1a1f2e', bodyColor: '#374151', padding: 10, callbacks: { label: c => ` ${(c.label as string).split(' (')[0]}: ${fmt$(chDonutVals[c.dataIndex])} (${((chDonutVals[c.dataIndex] / chDonutTotal) * 100).toFixed(1)}%)` } },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <span className="tcard-title">Channel Detail — Actual · % of Sales · Budget · Prior Year</span>
        </div>
        <div className="tscroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Channel</th><th>Actual $</th><th>% of Sales</th>
                {showBud && <><th>Budget $</th><th>Bud Var $</th></>}
                <th>PY $</th><th>PY Var $</th>
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map(c => {
                const a = agg(D, curEntity, c.key, idx);
                const pct = a.v ? (a.v / ts) * 100 : null;
                const vB = a.b != null ? a.v - a.b : null;
                const vPY = a.py != null ? a.v - a.py : null;
                return (
                  <tr key={c.key}>
                    <td>{c.lbl}</td><td>{fmt$(a.v)}</td><td>{fmtPct(pct)}</td>
                    {showBud && <><td>{fmt$(a.b)}</td><td className={varCls(vB, false)}>{fmtVar(vB)}</td></>}
                    <td>{fmt$(a.py)}</td><td className={varCls(vPY, false)}>{fmtVar(vPY)}</td>
                  </tr>
                );
              })}
              {ADJ_ROWS.map(r => {
                const a = agg(D, curEntity, r.key, idx);
                if (a.v === 0 && a.b === 0 && a.py === 0) return null;
                const pct = a.v ? (a.v / ts) * 100 : null;
                const vB = a.b != null ? a.v - a.b : null;
                const vPY = a.py != null ? a.v - a.py : null;
                return (
                  <tr key={r.key}>
                    <td>{r.lbl}</td><td>{fmt$(a.v)}</td><td>{fmtPct(pct)}</td>
                    {showBud && <><td>{fmt$(a.b)}</td><td className={varCls(vB, false)}>{fmtVar(vB)}</td></>}
                    <td>{fmt$(a.py)}</td><td className={varCls(vPY, false)}>{fmtVar(vPY)}</td>
                  </tr>
                );
              })}
              {(() => {
                const dPct = disc.v ? (disc.v / ts) * 100 : null;
                const dvB = disc.b != null ? disc.v - disc.b : null;
                const dvPY = disc.py != null ? disc.v - disc.py : null;
                return (
                  <tr>
                    <td>{discRow.lbl}</td><td>{fmt$(disc.v)}</td><td>{fmtPct(dPct)}</td>
                    {showBud && <><td>{fmt$(disc.b)}</td><td className={varCls(dvB, false)}>{fmtVar(dvB)}</td></>}
                    <td>{fmt$(disc.py)}</td><td className={varCls(dvPY, false)}>{fmtVar(dvPY)}</td>
                  </tr>
                );
              })()}
              {(() => {
                const tvB = tot.b != null ? tot.v - tot.b : null;
                const tvPY = tot.py != null ? tot.v - tot.py : null;
                return (
                  <tr className="total-row">
                    <td>Total Sales</td><td>{fmt$(tot.v)}</td><td>100.0%</td>
                    {showBud && <><td>{fmt$(tot.b)}</td><td className={varCls(tvB, false)}>{fmtVar(tvB)}</td></>}
                    <td>{fmt$(tot.py)}</td><td className={varCls(tvPY, false)}>{fmtVar(tvPY)}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
