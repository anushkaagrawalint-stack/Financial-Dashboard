'use client';

import { useMemo, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, fmt$, fmtPct } from '@/lib/utils';

interface Props {
  D: DashboardData;
  curPeriod: string;
}

const ALL_LOCS = ['Ballpark', 'MVT', 'National Landing', 'Mosaic', 'Rockville'];

interface SubItem { lbl: string; key: string; }
interface GrpRow { lbl: string; key: string; sub?: SubItem[]; }

function cellFmtVal(v: number | null | undefined, pct: number | null | undefined): string {
  if (v == null) return '—';
  return fmt$(v) + ' (' + fmtPct(pct) + ')';
}

function LocCell({ D, loc, dataKey, idx }: { D: DashboardData; loc: string; dataKey: string; idx: number[] }) {
  const a = agg(D, loc, dataKey, idx);
  const ts = agg(D, loc, 'Total Sales', idx).v || 1;
  const pct = a.v != null ? (a.v / ts) * 100 : null;
  return <td dangerouslySetInnerHTML={{ __html: cellFmtVal(a.v, pct) }} />;
}

function GrpRowComp({ D, lbl, dataKey, sub, locs, idx, open, onToggle }: {
  D: DashboardData; lbl: string; dataKey: string; sub?: SubItem[];
  locs: string[]; idx: number[]; open: boolean; onToggle: () => void;
}) {
  const hasSub = sub && sub.length > 0;
  return (
    <>
      <tr className="row-group-hdr" onClick={hasSub ? onToggle : undefined} style={hasSub ? { cursor: 'pointer' } : undefined}>
        <td>{hasSub && <span className="toggle-icon">{open ? '▼' : '▶'}</span>}{lbl}</td>
        {locs.map(loc => <LocCell key={loc} D={D} loc={loc} dataKey={dataKey} idx={idx} />)}
      </tr>
      {hasSub && open && sub!.map(s => (
        <tr key={s.key} className="sub-row">
          <td>{s.lbl}</td>
          {locs.map(loc => <LocCell key={loc} D={D} loc={loc} dataKey={s.key} idx={idx} />)}
        </tr>
      ))}
    </>
  );
}

function TotRow({ D, lbl, dataKey, locs, idx, useEntity }: {
  D: DashboardData; lbl: string; dataKey: string; locs: string[]; idx: number[]; useEntity?: string;
}) {
  if (useEntity) {
    const a = agg(D, useEntity, dataKey, idx);
    const ts = agg(D, 'Consolidated', 'Total Sales', idx).v || 1;
    const pct = a.v ? (a.v / ts) * 100 : null;
    const cls = a.v < 0 ? 'neg' : a.v > 0 ? 'pos' : '';
    return (
      <tr className="total-row">
        <td>{lbl}</td>
        {locs.map(loc => (
          <td key={loc} className={cls} dangerouslySetInnerHTML={{ __html: cellFmtVal(a.v, pct) }} />
        ))}
      </tr>
    );
  }
  return (
    <tr className="total-row">
      <td>{lbl}</td>
      {locs.map(loc => {
        const a = agg(D, loc, dataKey, idx);
        const ts = agg(D, loc, 'Total Sales', idx).v || 1;
        const pct = a.v ? (a.v / ts) * 100 : null;
        const cls = a.v < 0 ? 'neg' : a.v > 0 ? 'pos' : '';
        return <td key={loc} className={cls} dangerouslySetInnerHTML={{ __html: cellFmtVal(a.v, pct) }} />;
      })}
    </tr>
  );
}

function SecHdr({ label, colCount }: { label: string; colCount: number }) {
  return <tr className="sec-hdr"><td colSpan={colCount}>{label}</td></tr>;
}

const GROUPS: (GrpRow & { type?: 'total' | 'sec' | 'corp'; useEntity?: string })[] = [
  { type: 'sec', lbl: 'SALES', key: '' },
  { lbl: 'In-House Sales', key: 'Total Single Plate In-House Sales', sub: [
    { lbl: 'Food Sales', key: 'Food' }, { lbl: 'NA Beverage Sales', key: 'N/A Beverage' },
    { lbl: 'Beer Sales', key: 'Beer' }, { lbl: 'Liquor Sales', key: 'Liquor' },
    { lbl: 'Wine Sales', key: 'Wine' }, { lbl: 'Retail Sales', key: 'Retail' },
  ]},
  { lbl: 'Takeout Sales', key: 'Total Takeout Sales', sub: [
    { lbl: 'RASA App', key: 'Takeout Sales - RASA App' }, { lbl: 'DoorDash', key: 'Takeout Sales - DoorDash' },
    { lbl: 'GrubHub', key: 'Takeout Sales - GrubHub' }, { lbl: 'Uber Eats', key: 'Takeout Sales - Uber Eats' },
    { lbl: 'Too Good To Go', key: 'Takeout Sales - Too Good To Go' }, { lbl: 'RASA Website', key: 'Takeout Sales - RASA Website' },
  ]},
  { lbl: 'Delivery Sales', key: 'Total Delivery Sales', sub: [
    { lbl: 'DoorDash', key: 'Delivery Sales - DoorDash' }, { lbl: 'GrubHub', key: 'Delivery Sales - GrubHub' },
    { lbl: 'Uber Eats', key: 'Delivery Sales - Uber Eats' }, { lbl: 'RASA App', key: 'Delivery Sales - RASA App' },
    { lbl: 'RASA Website', key: 'Delivery Sales - RASA Website' }, { lbl: 'Hungry Marketplace', key: 'Delivery Sales - Hungry Marketplace' },
    { lbl: 'Google', key: 'Delivery Sales - Google' },
  ]},
  { lbl: 'Catering Sales', key: 'Total Catering Sales', sub: [
    { lbl: 'RASA Website', key: 'Catering Sales - RASA Website' }, { lbl: 'EZ Cater', key: 'Catering Sales - EZ Cater' },
    { lbl: 'Foodworks', key: 'Catering Sales - Foodworks' }, { lbl: 'Cater Cow', key: 'Catering Sales - Cater Cow' },
    { lbl: 'Territory Foods', key: 'Catering Sales - Territory Foods' }, { lbl: 'Hungry Marketplace', key: 'Catering Sales - Hungry Marketplace' },
    { lbl: 'Sharebite', key: 'Catering Sales - Sharebite' }, { lbl: 'Cater 2 Me', key: 'Catering Sales - Cater 2 Me' },
    { lbl: 'ZeroCater', key: 'Catering Sales - ZeroCater' }, { lbl: 'Other 3rd Party', key: 'Total Catering Sales - Other 3rd Party' },
  ]},
  { lbl: 'Offsites', key: 'Total Offsites', sub: [
    { lbl: 'Fooda', key: 'Offsites - Fooda' }, { lbl: 'Aramark', key: 'Offsites - Aramark' },
    { lbl: 'Eurest', key: 'Offsites - Eurest' }, { lbl: 'Metz Corp', key: 'Offsites - Metz Corp' },
    { lbl: 'Guest Services', key: 'Offsites - Guest Services' }, { lbl: 'Cureate', key: 'Offsites - Cureate' },
    { lbl: 'Compass', key: 'Offsites - Compass' }, { lbl: 'Taher', key: 'Offsites - Taher' },
  ]},
  { lbl: 'Delivery Fee Income', key: 'Total Delivery Fee Income', sub: [
    { lbl: 'Online Ordering', key: 'Delivery Fee - Online Ordering' }, { lbl: 'EZ Cater', key: 'Delivery Fee - EZ Cater' },
    { lbl: 'Fooda', key: 'Delivery Fee - Fooda' }, { lbl: 'Cater Cow', key: 'Delivery Fee - Cater Cow' },
    { lbl: 'Uber Eats', key: 'Delivery Fee - Uber Eats' }, { lbl: 'GrubHub', key: 'Delivery Fee - GrubHub' },
    { lbl: 'Sharebite', key: 'Delivery Fee - Sharebite' }, { lbl: 'ZeroCater', key: 'Delivery Fee - ZeroCater' },
    { lbl: 'Cater 2 Me', key: 'Delivery Fee - Cater 2 Me' }, { lbl: 'Compass', key: 'Delivery Fee - Compass' },
  ]},
  { lbl: 'Sales Adjustments', key: 'Sales Adjustments' },
  { lbl: 'Open App Sales Adjustments', key: 'Open App Sales Adjustments' },
  { lbl: 'Open Tickets', key: 'Open Tickets' },
  { lbl: 'Discounts / Refunds', key: 'Total Discounts / Refunds', sub: [
    { lbl: 'Squad Meals', key: 'Squad Meals' }, { lbl: 'Open App Loyalty', key: 'Open App Loyalty' },
    { lbl: 'SLT Comps', key: 'SLT Comps' }, { lbl: 'LSM Comps', key: 'LSM Comps' },
    { lbl: 'Manager Comps', key: 'Manager Comps' }, { lbl: 'Catering Comps', key: 'Catering Comps' },
    { lbl: 'Open App Store Credits', key: 'Open App Store Credits' }, { lbl: 'Open App Promos', key: 'Open App Promos' },
    { lbl: 'Squad Discount', key: 'Squad Discount' }, { lbl: 'Partnerships', key: 'Partnerships' },
    { lbl: 'Other Discounts', key: 'Discounts / Refunds Given Other' },
  ]},
  { type: 'total', lbl: 'Total Sales', key: 'Total Sales' },
  { type: 'sec', lbl: 'COST OF GOODS SOLD', key: '' },
  { lbl: 'Total COGS', key: 'Total Cost of Goods Sold', sub: [
    { lbl: 'Food Costs', key: 'Total Food Costs' }, { lbl: 'Beverage Costs', key: 'Total Beverage Costs' },
    { lbl: 'Paper Costs', key: 'Total Paper Costs' }, { lbl: 'Waste Costs', key: 'Total Waste Costs' },
    { lbl: 'Freight & Other', key: 'COGS - Freight, Delivery, & Sales Tax' },
  ]},
  { type: 'total', lbl: 'Gross Profit', key: 'Gross Profit' },
  { type: 'sec', lbl: 'PAYROLL', key: '' },
  { lbl: 'Total Payroll Expenses', key: 'Total Payroll Expenses', sub: [
    { lbl: 'Management', key: 'Management' }, { lbl: 'Hourly', key: 'Hourly' },
    { lbl: 'Overtime', key: 'Overtime' }, { lbl: 'Bonus', key: 'Bonus' },
    { lbl: 'Payroll Taxes', key: 'Total Payroll Taxes' }, { lbl: 'Payroll Processing Fee', key: 'Payroll Processing Fee' },
    { lbl: 'Health Insurance', key: 'Health Insurance' },
  ]},
  { type: 'total', lbl: 'Prime Profit', key: 'Prime Profit' },
  { type: 'sec', lbl: 'OPERATING EXPENSES', key: '' },
  { lbl: 'Total Operating Expense', key: 'Total Operating Expense', sub: [
    { lbl: 'Supplies', key: 'Total Supplies' }, { lbl: 'Marketing', key: 'Total Marketing' },
    { lbl: 'Delivery Fees', key: 'Total Delivery Fees' }, { lbl: '3rd Party Fees', key: 'Total Third-Party Fees' },
    { lbl: 'Credit Card Fees', key: 'Total Credit Card Fees' }, { lbl: 'Insurance', key: 'Total Insurance' },
    { lbl: 'Repairs & Maintenance', key: 'Total Repairs & Maintenance' }, { lbl: 'Other Expenses', key: 'Total Other Expenses' },
  ]},
  { type: 'sec', lbl: 'OCCUPANCY', key: '' },
  { lbl: 'Total Occupancy Cost', key: 'Total Occupancy Cost', sub: [
    { lbl: 'Rent Expense', key: 'Rent Expense' }, { lbl: 'Common Area Maintenance (CAM)', key: 'Common Area Maintenance (CAM)' },
    { lbl: 'Real Estate Tax', key: 'Real Estate Tax' }, { lbl: 'Utilities', key: 'Total Utilities' },
  ]},
  { type: 'total', lbl: 'Store Level Profit', key: 'Store Level Profit' },
  { type: 'sec', lbl: 'CORPORATE', key: '' },
  { type: 'corp', lbl: 'Corporate Overhead', key: 'Total Corporate Overhead & Other', useEntity: 'RASA Worldwide' },
  { type: 'total', lbl: 'EBITDA', key: 'EBITDA' },
  { type: 'total', lbl: 'Net Income', key: 'Net Income' },
];

export default function FullPnlPanel({ D, curPeriod }: Props) {
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const rangeLabel = idx.length > 1
    ? `${D.periods[idx[0]]} – ${D.periods[idx[idx.length - 1]]} (${idx.length} periods)`
    : D.periods[idx[0]];

  const [checkedLocs, setCheckedLocs] = useState<string[]>([...ALL_LOCS]);
  const [ddOpen, setDdOpen] = useState(false);
  const [openGrps, setOpenGrps] = useState<Set<string>>(new Set());

  const activeLocs = ['Consolidated', ...checkedLocs];
  const colCount = 1 + activeLocs.length;

  function toggleGrp(key: string) {
    setOpenGrps(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleLoc(loc: string) {
    setCheckedLocs(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  }

  function toggleAll(checked: boolean) {
    setCheckedLocs(checked ? [...ALL_LOCS] : []);
  }

  const ddLabel = checkedLocs.length === ALL_LOCS.length
    ? 'All Locations'
    : checkedLocs.length === 0
    ? 'Consolidated only'
    : `${checkedLocs.length} locations`;

  return (
    <div className="panel active" id="panel-fullpnl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="sel-label" style={{ color: '#7c3aed' }}>Locations</span>
          <div className="loc-dd-wrap" id="loc-dd-wrap">
            <div className="loc-dd-trigger" onClick={() => setDdOpen(o => !o)}>
              <span>{ddLabel}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
                <path d="M0 0l5 6 5-6z" fill="#7c3aed" />
              </svg>
            </div>
            {ddOpen && (
              <div className="loc-dd-menu open">
                <label className="loc-dd-item loc-dd-all">
                  <input
                    type="checkbox"
                    checked={checkedLocs.length === ALL_LOCS.length}
                    onChange={e => toggleAll(e.target.checked)}
                  />
                  <span>All Locations</span>
                </label>
                <div className="loc-dd-sep" />
                {ALL_LOCS.map(loc => (
                  <label key={loc} className="loc-dd-item">
                    <input
                      type="checkbox"
                      checked={checkedLocs.includes(loc)}
                      onChange={() => toggleLoc(loc)}
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <span className="tcard-title">Full P&L — {rangeLabel}</span>
          <span className="tcard-meta">$ (% of sales)</span>
        </div>
        <div className="tscroll">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Line Item</th>
                {activeLocs.map(l => <th key={l} style={{ minWidth: 150 }}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g, gi) => {
                if (g.type === 'sec') {
                  return <SecHdr key={gi} label={g.lbl} colCount={colCount} />;
                }
                if (g.type === 'total') {
                  return <TotRow key={gi} D={D} lbl={g.lbl} dataKey={g.key} locs={activeLocs} idx={idx} />;
                }
                if (g.type === 'corp') {
                  const a = agg(D, 'RASA Worldwide', g.key, idx);
                  const ts = agg(D, 'Consolidated', 'Total Sales', idx).v || 1;
                  const pct = a.v ? (a.v / ts) * 100 : null;
                  return (
                    <tr key={gi}>
                      <td>{g.lbl}</td>
                      {activeLocs.map(loc => (
                        <td key={loc} dangerouslySetInnerHTML={{ __html: cellFmtVal(a.v, pct) }} />
                      ))}
                    </tr>
                  );
                }
                return (
                  <GrpRowComp
                    key={gi}
                    D={D}
                    lbl={g.lbl}
                    dataKey={g.key}
                    sub={g.sub}
                    locs={activeLocs}
                    idx={idx}
                    open={openGrps.has(g.key + gi)}
                    onToggle={() => toggleGrp(g.key + gi)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
