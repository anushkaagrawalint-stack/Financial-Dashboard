'use client';

import '@/lib/chartSetup';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useMemo, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, getLabels, fmt$, fmtVar, fmtVarPct, pctVar, varCls } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import { grd, tip, donutLabels } from '@/lib/chartSetup';

interface Props {
  D: DashboardData;
  curEntity: string;
  curPeriod: string;
}

type ChannelId = 'all' | 'inhouse' | 'takeout' | 'delivery' | 'catering' | 'offsites' | 'delfee';

// altKey: second key whose value is summed into this sub-item
// subKey: second key whose value is subtracted from this sub-item
interface SubItem { lbl: string; key: string; altKey?: string; subKey?: string; }
interface ChannelCfg { lbl: string; key: string; color: string; subitems: SubItem[] | null; }

const CHANNEL_CFGS: Record<ChannelId, ChannelCfg> = {
  all:      { lbl: 'All Channels',  key: 'Total Sales',                    color: '#9f7cef', subitems: null },
  inhouse:  { lbl: 'In-House',      key: 'Total Single Plate In-House Sales', color: '#9f7cef', subitems: [
    { lbl: 'Food',        key: 'Food' },
    { lbl: 'N/A Beverage', key: 'N/A Beverage' },
    { lbl: 'Beer',        key: 'Beer' },
    { lbl: 'Liquor',      key: 'Liquor' },
    { lbl: 'Wine',        key: 'Wine' },
    { lbl: 'Retail',      key: 'Retail' },
  ]},
  takeout:  { lbl: 'Takeout',       key: 'Total Takeout Sales',             color: '#3a7be0', subitems: [
    { lbl: 'RASA Takeout',   key: 'Takeout Sales - RASA App',      altKey: 'Takeout Sales - RASA Website' },
    { lbl: 'DoorDash',       key: 'Takeout Sales - DoorDash' },
    { lbl: 'GrubHub',        key: 'Takeout Sales - GrubHub' },
    { lbl: 'Uber Eats',      key: 'Takeout Sales - Uber Eats' },
    { lbl: 'Too Good To Go', key: 'Takeout Sales - Too Good To Go' },
  ]},
  delivery: { lbl: 'Delivery',      key: 'Total Delivery Sales',            color: '#10b981', subitems: [
    { lbl: 'RASA Delivery',      key: 'Delivery Sales - RASA App',      altKey: 'Delivery Sales - RASA Website' },
    { lbl: 'DoorDash',           key: 'Delivery Sales - DoorDash' },
    { lbl: 'GrubHub',            key: 'Delivery Sales - GrubHub' },
    { lbl: 'Uber Eats',          key: 'Delivery Sales - Uber Eats' },
    { lbl: 'Hungry Marketplace', key: 'Delivery Sales - Hungry Marketplace' },
    { lbl: 'Google',             key: 'Delivery Sales - Google' },
  ]},
  catering: { lbl: 'Catering',      key: 'Total Catering Sales',            color: '#8b5cf6', subitems: [
    { lbl: 'RASA Catering',  key: 'Catering Sales - RASA Website' },
    { lbl: 'EzCater',        key: 'Catering Sales - EZ Cater' },
    { lbl: 'Other 3rd Party', key: 'Total Catering Sales - Other 3rd Party', subKey: 'Catering Sales - EZ Cater' },
  ]},
  offsites: { lbl: 'Offsites',      key: 'Total Offsites',                  color: '#f59e0b', subitems: [
    { lbl: 'Fooda',         key: 'Offsites - Fooda' },
    { lbl: 'Aramark',       key: 'Offsites - Aramark' },
    { lbl: 'Eurest',        key: 'Offsites - Eurest' },
    { lbl: 'Metz Corp',     key: 'Offsites - Metz Corp' },
    { lbl: 'Guest Services', key: 'Offsites - Guest Services' },
    { lbl: 'Cureate',       key: 'Offsites - Cureate' },
    { lbl: 'Compass',       key: 'Offsites - Compass' },
    { lbl: 'Taher',         key: 'Offsites - Taher' },
  ]},
  delfee:   { lbl: 'Delivery Fee',  key: 'Total Delivery Fee Income',       color: '#f472b6', subitems: null },
};

const ALL_CHANNELS: ChannelId[] = ['inhouse', 'takeout', 'delivery', 'catering', 'offsites', 'delfee'];

const DEDUCTION_KEYS = ['Total Discounts / Refunds', 'Sales Adjustments', 'Open App Sales Adjustments', 'Open Tickets'];

export default function RevenuePanel({ D, curEntity, curPeriod }: Props) {
  const [selCh, setSelCh] = useState<ChannelId>('all');
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const labels = useMemo(() => getLabels(curPeriod, D.periods), [curPeriod, D.periods]);
  const en = D.t12[curEntity];

  const cfg = CHANNEL_CFGS[selCh];
  const salesAgg = agg(D, curEntity, 'Total Sales', idx);

  function subItemAgg(sub: SubItem) {
    const a = agg(D, curEntity, sub.key, idx);
    let r = { v: a.v, b: a.b, py: a.py };
    if (sub.altKey) {
      const alt = agg(D, curEntity, sub.altKey, idx);
      r = { v: r.v + alt.v, b: r.b + alt.b, py: r.py + alt.py };
    }
    if (sub.subKey) {
      const s = agg(D, curEntity, sub.subKey, idx);
      r = { v: r.v - s.v, b: r.b - s.b, py: r.py - s.py };
    }
    return r;
  }

  function deductionAgg() {
    const parts = DEDUCTION_KEYS.map(k => agg(D, curEntity, k, idx));
    return {
      v:  parts.reduce((s, a) => s + a.v,  0),
      b:  parts.reduce((s, a) => s + a.b,  0),
      py: parts.reduce((s, a) => s + a.py, 0),
    };
  }

  // KPI cards
  const kpiCards = () => {
    if (selCh === 'all') {
      return [
        <KpiCard key="total" label="Total Sales" valStr={fmt$(salesAgg.v)} accent subs={[
          { txt: `vs Budget: ${fmtVar(salesAgg.v - salesAgg.b)} | ${fmtVarPct(pctVar(salesAgg.v, salesAgg.b))}`, cls: varCls(salesAgg.v - salesAgg.b, false) },
          { txt: `vs LY: ${fmtVar(salesAgg.v - salesAgg.py)} | ${fmtVarPct(pctVar(salesAgg.v, salesAgg.py))}`, cls: varCls(salesAgg.v - salesAgg.py, false) },
        ]} />,
        ...ALL_CHANNELS.map(chId => {
          const chCfg = CHANNEL_CFGS[chId];
          const a = agg(D, curEntity, chCfg.key, idx);
          return (
            <KpiCard key={chId} label={chCfg.lbl} valStr={fmt$(a.v)} subs={[
              { txt: `vs Budget: ${fmtVar(a.v - a.b)} | ${fmtVarPct(pctVar(a.v, a.b))}`, cls: varCls(a.v - a.b, false) },
              { txt: `vs LY: ${fmtVar(a.v - a.py)} | ${fmtVarPct(pctVar(a.v, a.py))}`, cls: varCls(a.v - a.py, false) },
            ]} />
          );
        }),
      ];
    } else {
      const chA = agg(D, curEntity, cfg.key, idx);
      const totalCard = (
        <KpiCard key="ch-total" label={cfg.lbl} valStr={fmt$(chA.v)} accent subs={[
          { txt: `vs Budget: ${fmtVar(chA.v - chA.b)} | ${fmtVarPct(pctVar(chA.v, chA.b))}`, cls: varCls(chA.v - chA.b, false) },
          { txt: `vs LY: ${fmtVar(chA.v - chA.py)} | ${fmtVarPct(pctVar(chA.v, chA.py))}`, cls: varCls(chA.v - chA.py, false) },
        ]} />
      );
      if (!cfg.subitems) return [totalCard];
      const subCards = cfg.subitems
        .map(sub => {
          const a = subItemAgg(sub);
          if (a.v === 0 && a.py === 0) return null;
          return (
            <KpiCard key={sub.key} label={sub.lbl} valStr={fmt$(a.v)} subs={[
              { txt: `vs LY: ${fmtVar(a.v - a.py)} | ${fmtVarPct(pctVar(a.v, a.py))}`, cls: varCls(a.v - a.py, false) },
            ]} />
          );
        })
        .filter(Boolean);
      return [totalCard, ...subCards];
    }
  };

  // Channel mix donut
  const donutSection = () => {
    if (selCh === 'all') {
      const chVals = ALL_CHANNELS.map(chId => Math.max(agg(D, curEntity, CHANNEL_CFGS[chId].key, idx).v || 0, 0));
      const chTotal = chVals.reduce((s, v) => s + v, 0) || 1;
      const chLabels = ALL_CHANNELS.map((chId, i) => `${CHANNEL_CFGS[chId].lbl} (${((chVals[i] / chTotal) * 100).toFixed(1)}%)`);
      const chColors = ALL_CHANNELS.map(chId => CHANNEL_CFGS[chId].color);
      return (
        <div className="ccard" style={{ gridColumn: '1/-1' }}>
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">Channel Mix</div>
              <div className="ccard-sub">% of gross revenue (excl. deductions) — selected period</div>
            </div>
          </div>
          <div className="cwrap tall">
            <Doughnut
              data={{
                labels: chLabels,
                datasets: [{ data: chVals, backgroundColor: chColors, borderWidth: 0, hoverOffset: 8 }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false, cutout: '58%',
                plugins: {
                  legend: { position: 'right', labels: { color: '#6b7280', font: { family: 'Montserrat', size: 11 }, padding: 14, boxWidth: 12 } },
                  tooltip: { backgroundColor: '#ffffff', borderColor: 'rgba(124,58,237,0.2)', borderWidth: 1, titleColor: '#1a1f2e', bodyColor: '#374151', padding: 10, callbacks: { label: c => ` ${(c.label as string).split(' (')[0]}: ${fmt$(chVals[c.dataIndex])} (${((chVals[c.dataIndex] / chTotal) * 100).toFixed(1)}%)` } },
                  datalabels: donutLabels,
                },
              }}
            />
          </div>
        </div>
      );
    } else if (cfg.subitems) {
      const chA = agg(D, curEntity, cfg.key, idx);
      const chTotal = chA.v || 1;
      const subVals = cfg.subitems.map(sub => Math.max(subItemAgg(sub).v || 0, 0));
      const subLabels = cfg.subitems.map((sub, i) => `${sub.lbl} (${((subVals[i] / chTotal) * 100).toFixed(1)}%)`);
      const subColors = ['#9f7cef', '#3a7be0', '#10b981', '#8b5cf6', '#f59e0b', '#f472b6', '#ef4444', '#84cc16'];
      return (
        <div className="ccard" style={{ gridColumn: '1/-1' }}>
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">{cfg.lbl} Mix</div>
              <div className="ccard-sub">% of channel total — selected period</div>
            </div>
          </div>
          <div className="cwrap tall">
            <Doughnut
              data={{
                labels: subLabels,
                datasets: [{ data: subVals, backgroundColor: subColors, borderWidth: 0, hoverOffset: 8 }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false, cutout: '58%',
                plugins: {
                  legend: { position: 'right', labels: { color: '#6b7280', font: { family: 'Montserrat', size: 11 }, padding: 14, boxWidth: 12 } },
                  tooltip: { backgroundColor: '#ffffff', borderColor: 'rgba(124,58,237,0.2)', borderWidth: 1, titleColor: '#1a1f2e', bodyColor: '#374151', padding: 10, callbacks: { label: c => ` ${(c.label as string).split(' (')[0]}: ${fmt$(subVals[c.dataIndex])} (${((subVals[c.dataIndex] / chTotal) * 100).toFixed(1)}%)` } },
                  datalabels: donutLabels,
                },
              }}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  // Channel detail table rows
  const tableRows = () => {
    if (selCh === 'all') {
      const deductA = deductionAgg();
      return [
        ...ALL_CHANNELS.map(chId => {
          const chCfg = CHANNEL_CFGS[chId];
          const a = agg(D, curEntity, chCfg.key, idx);
          return (
            <tr key={chId}>
              <td>{chCfg.lbl}</td>
              <td>{fmt$(a.v)}</td>
              <td>{fmt$(a.py)}</td>
              <td className={varCls(a.v - a.py, false)}>{fmtVarPct(pctVar(a.v, a.py))}</td>
              <td>{fmt$(a.b)}</td>
              <td className={varCls(a.v - a.b, false)}>{fmtVarPct(pctVar(a.v, a.b))}</td>
            </tr>
          );
        }),
        <tr key="deductions" style={{ fontStyle: 'italic', opacity: 0.85 }}>
          <td>Discounts &amp; Adjustments</td>
          <td>{fmt$(deductA.v)}</td>
          <td>{fmt$(deductA.py)}</td>
          <td className={varCls(deductA.v - deductA.py, false)}>{fmtVarPct(pctVar(deductA.v, deductA.py))}</td>
          <td>{fmt$(deductA.b)}</td>
          <td className={varCls(deductA.v - deductA.b, false)}>{fmtVarPct(pctVar(deductA.v, deductA.b))}</td>
        </tr>,
      ];
    } else if (cfg.subitems) {
      return cfg.subitems
        .filter(sub => {
          const a = subItemAgg(sub);
          return !(a.v === 0 && a.py === 0);
        })
        .map(sub => {
          const a = subItemAgg(sub);
          return (
            <tr key={sub.key}>
              <td>{sub.lbl}</td>
              <td>{fmt$(a.v)}</td>
              <td>{fmt$(a.py)}</td>
              <td className={varCls(a.v - a.py, false)}>{fmtVarPct(pctVar(a.v, a.py))}</td>
            </tr>
          );
        });
    }
    return [];
  };

  const totalRowData = selCh === 'all' ? salesAgg : agg(D, curEntity, cfg.key, idx);
  const totalRowLbl = selCh === 'all' ? 'Total Sales' : cfg.lbl;

  return (
    <div className="panel active" id="panel-revenue">
      <div className="chart-ctrl" style={{ marginBottom: 12 }}>
        <label>Channel</label>
        <select value={selCh} onChange={e => setSelCh(e.target.value as ChannelId)}>
          <option value="all">All Channels</option>
          <option value="inhouse">In-House</option>
          <option value="takeout">Takeout</option>
          <option value="delivery">Delivery</option>
          <option value="catering">Catering</option>
          <option value="offsites">Offsites</option>
        </select>
      </div>

      <div className="kpis">
        {kpiCards()}
      </div>

      <div className="cgrid">
        <div className="ccard" style={{ gridColumn: '1/-1' }}>
          <div className="ccard-hdr">
            <div>
              <div className="ccard-title">Channel Trend</div>
              <div className="ccard-sub">Actual vs Budget vs Prior Year — grouped bars</div>
            </div>
          </div>
          <div className="cwrap tall">
            <Bar
              key={curPeriod + selCh}
              data={{
                labels,
                datasets: [
                  { label: 'Actual',     data: idx.map(i => en[cfg.key]?.v[i]), backgroundColor: '#9f7cef', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Budget',     data: idx.map(i => en[cfg.key]?.b[i]), backgroundColor: '#6d28d9', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                  { label: 'Prior Year', data: idx.map(i => en[cfg.key]?.py[i]), backgroundColor: '#9ca3af', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
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

        {donutSection()}
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <span className="tcard-title">Channel Detail — Actual · LY · Budget</span>
        </div>
        <div className="tscroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Channel</th><th>Actual $</th><th>LY $</th><th>Var % vs LY</th>
                {selCh === 'all' && <><th>Budget $</th><th>Var % vs Budget</th></>}
              </tr>
            </thead>
            <tbody>
              {tableRows()}
              <tr className="total-row">
                <td>{totalRowLbl}</td>
                <td>{fmt$(totalRowData.v)}</td>
                <td>{fmt$(totalRowData.py)}</td>
                <td className={varCls(totalRowData.v - totalRowData.py, false)}>{fmtVarPct(pctVar(totalRowData.v, totalRowData.py))}</td>
                {selCh === 'all' && <>
                  <td>{totalRowData.b != null ? fmt$(totalRowData.b) : '—'}</td>
                  <td className={varCls(totalRowData.v - totalRowData.b, false)}>{fmtVarPct(pctVar(totalRowData.v, totalRowData.b))}</td>
                </>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
