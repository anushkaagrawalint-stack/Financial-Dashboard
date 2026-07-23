'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, fmt$, fmtPct, fmtVar, fmtVarPct, pctVar } from '@/lib/utils';

interface Props {
  D: DashboardData;
  curPeriod: string;
}

const ALL_LOCS = ['Ballpark', 'MVT', 'National Landing', 'Mosaic', 'Rockville'];
const SELECT_OPTIONS = ['all', 'Consolidated', ...ALL_LOCS];

interface SubItem { lbl: string; key: string; children?: SubItem[]; subKey?: string; }
interface GrpRow { lbl: string; key: string; sub?: SubItem[]; useEntity?: string; }

function cellFmtVal(v: number | null | undefined, pct: number | null | undefined): string {
  if (v == null) return '—';
  return fmt$(v) + ' (' + fmtPct(pct) + ')';
}

// ── Compare mode (All Locations): one combined "$ (%)" column per location ──

function LocCell({ D, loc, dataKey, idx, subtractKey }: { D: DashboardData; loc: string; dataKey: string; idx: number[]; subtractKey?: string }) {
  const a = agg(D, loc, dataKey, idx);
  const v = subtractKey != null ? a.v - agg(D, loc, subtractKey, idx).v : a.v;
  const ts = agg(D, loc, 'Total Sales', idx).v || 1;
  const pct = v != null ? (v / ts) * 100 : null;
  return <td dangerouslySetInnerHTML={{ __html: cellFmtVal(v, pct) }} />;
}

function GrpRowComp({ D, lbl, dataKey, sub, locs, idx, open, onToggle, openSubs, onToggleSub, useEntity }: {
  D: DashboardData; lbl: string; dataKey: string; sub?: SubItem[];
  locs: string[]; idx: number[]; open: boolean; onToggle: () => void;
  openSubs: Set<string>; onToggleSub: (key: string) => void;
  useEntity?: string;
}) {
  const hasSub = sub && sub.length > 0;

  function renderCell(loc: string, key: string, subtractKey?: string) {
    if (useEntity) {
      if (loc !== 'Consolidated') return <td key={loc} dangerouslySetInnerHTML={{ __html: cellFmtVal(0, 0) }} />;
      const a = agg(D, useEntity, key, idx);
      const v = subtractKey != null ? a.v - agg(D, useEntity, subtractKey, idx).v : a.v;
      const ts = agg(D, 'Consolidated', 'Total Sales', idx).v || 1;
      const pct = v != null ? (v / ts) * 100 : null;
      return <td key={loc} dangerouslySetInnerHTML={{ __html: cellFmtVal(v, pct) }} />;
    }
    return <LocCell key={loc} D={D} loc={loc} dataKey={key} idx={idx} subtractKey={subtractKey} />;
  }

  const subRows: React.ReactNode[] = [];
  if (hasSub && open) {
    for (const s of sub!) {
      const hasChildren = !!(s.children && s.children.length > 0);
      const isSubOpen = openSubs.has(s.key);
      subRows.push(
        <tr key={s.key} className="sub-row"
          onClick={hasChildren ? () => onToggleSub(s.key) : undefined}
          style={{ cursor: hasChildren ? 'pointer' : undefined }}>
          <td style={{ paddingLeft: 34 }}>
            {hasChildren
              ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isSubOpen ? '▼' : '▶'}</span>
              : <span style={{ display: 'inline-block', width: 14 }} />
            }
            {s.lbl}
          </td>
          {locs.map(loc => renderCell(loc, s.key, s.subKey))}
        </tr>
      );
      if (hasChildren && isSubOpen) {
        for (const child of s.children!) {
          const hasGrandChildren = !!(child.children && child.children.length > 0);
          const isChildOpen = openSubs.has(child.key);
          subRows.push(
            <tr key={'c3-' + child.key} className="sub-row"
              onClick={hasGrandChildren ? () => onToggleSub(child.key) : undefined}
              style={{ cursor: hasGrandChildren ? 'pointer' : undefined }}>
              <td style={{ paddingLeft: 54 }}>
                {hasGrandChildren
                  ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isChildOpen ? '▼' : '▶'}</span>
                  : <span style={{ display: 'inline-block', width: 14 }} />
                }
                {child.lbl}
              </td>
              {locs.map(loc => renderCell(loc, child.key))}
            </tr>
          );
          if (hasGrandChildren && isChildOpen) {
            for (const gc of child.children!) {
              subRows.push(
                <tr key={'c4-' + gc.key} className="sub-row">
                  <td style={{ paddingLeft: 74 }}>
                    <span style={{ display: 'inline-block', width: 14 }} />
                    {gc.lbl}
                  </td>
                  {locs.map(loc => renderCell(loc, gc.key))}
                </tr>
              );
            }
          }
        }
      }
    }
  }

  return (
    <>
      <tr className="row-group-hdr" onClick={hasSub ? onToggle : undefined} style={hasSub ? { cursor: 'pointer' } : undefined}>
        <td>{hasSub && <span className="toggle-icon">{open ? '▼' : '▶'}</span>}{lbl}</td>
        {locs.map(loc => renderCell(loc, dataKey))}
      </tr>
      {subRows}
    </>
  );
}

function TotRow({ D, lbl, dataKey, locs, idx }: {
  D: DashboardData; lbl: string; dataKey: string; locs: string[]; idx: number[];
}) {
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

// ── Detail mode (single entity): full Actual/Budget/PY + variance columns ──

interface RowVals { v: number; b: number; py: number; actPct: number | null; budPct: number | null; pyPct: number | null; }

function computeDetailRow(D: DashboardData, selectedLoc: string, dataKey: string, subtractKey: string | undefined, useEntity: string | undefined, idx: number[]): RowVals | null {
  let entity: string;
  let tsEntity: string;
  if (useEntity) {
    if (selectedLoc !== 'Consolidated') return null; // corporate rows only apply at the consolidated level
    entity = useEntity;
    tsEntity = 'Consolidated';
  } else {
    entity = selectedLoc;
    tsEntity = selectedLoc;
  }
  const a = agg(D, entity, dataKey, idx);
  let v = a.v, b = a.b, py = a.py;
  if (subtractKey) {
    const s = agg(D, entity, subtractKey, idx);
    v -= s.v; b -= s.b; py -= s.py;
  }
  const ts = agg(D, tsEntity, 'Total Sales', idx);
  const actPct = ts.v ? (v / ts.v) * 100 : null;
  const budPct = ts.b ? (b / ts.b) * 100 : null;
  const pyPct = ts.py ? (py / ts.py) * 100 : null;
  return { v, b, py, actPct, budPct, pyPct };
}

function DetailCells({ row }: { row: RowVals | null }) {
  if (!row) {
    return <>{Array.from({ length: 10 }).map((_, i) => <td key={i}>—</td>)}</>;
  }
  const { v, b, py, actPct, budPct, pyPct } = row;
  return (
    <>
      <td>{fmt$(v)}</td>
      <td>{fmtPct(actPct)}</td>
      <td>{fmt$(b)}</td>
      <td>{fmtPct(budPct)}</td>
      <td>{fmtVar(v - b)}</td>
      <td>{fmtVarPct(pctVar(v, b))}</td>
      <td>{fmt$(py)}</td>
      <td>{fmtPct(pyPct)}</td>
      <td>{fmtVar(v - py)}</td>
      <td>{fmtVarPct(pctVar(v, py))}</td>
    </>
  );
}

function DetailGrpRow({ D, selectedLoc, lbl, dataKey, sub, idx, open, onToggle, openSubs, onToggleSub, useEntity }: {
  D: DashboardData; selectedLoc: string; lbl: string; dataKey: string; sub?: SubItem[];
  idx: number[]; open: boolean; onToggle: () => void;
  openSubs: Set<string>; onToggleSub: (key: string) => void;
  useEntity?: string;
}) {
  const hasSub = sub && sub.length > 0;
  const rowVal = computeDetailRow(D, selectedLoc, dataKey, undefined, useEntity, idx);

  const subRows: React.ReactNode[] = [];
  if (hasSub && open) {
    for (const s of sub!) {
      const hasChildren = !!(s.children && s.children.length > 0);
      const isSubOpen = openSubs.has(s.key);
      const sVal = computeDetailRow(D, selectedLoc, s.key, s.subKey, useEntity, idx);
      subRows.push(
        <tr key={s.key} className="sub-row"
          onClick={hasChildren ? () => onToggleSub(s.key) : undefined}
          style={{ cursor: hasChildren ? 'pointer' : undefined }}>
          <td style={{ paddingLeft: 34 }}>
            {hasChildren
              ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isSubOpen ? '▼' : '▶'}</span>
              : <span style={{ display: 'inline-block', width: 14 }} />
            }
            {s.lbl}
          </td>
          <DetailCells row={sVal} />
        </tr>
      );
      if (hasChildren && isSubOpen) {
        for (const child of s.children!) {
          const hasGrandChildren = !!(child.children && child.children.length > 0);
          const isChildOpen = openSubs.has(child.key);
          const childVal = computeDetailRow(D, selectedLoc, child.key, undefined, useEntity, idx);
          subRows.push(
            <tr key={'c3-' + child.key} className="sub-row"
              onClick={hasGrandChildren ? () => onToggleSub(child.key) : undefined}
              style={{ cursor: hasGrandChildren ? 'pointer' : undefined }}>
              <td style={{ paddingLeft: 54 }}>
                {hasGrandChildren
                  ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isChildOpen ? '▼' : '▶'}</span>
                  : <span style={{ display: 'inline-block', width: 14 }} />
                }
                {child.lbl}
              </td>
              <DetailCells row={childVal} />
            </tr>
          );
          if (hasGrandChildren && isChildOpen) {
            for (const gc of child.children!) {
              const gcVal = computeDetailRow(D, selectedLoc, gc.key, undefined, useEntity, idx);
              subRows.push(
                <tr key={'c4-' + gc.key} className="sub-row">
                  <td style={{ paddingLeft: 74 }}>
                    <span style={{ display: 'inline-block', width: 14 }} />
                    {gc.lbl}
                  </td>
                  <DetailCells row={gcVal} />
                </tr>
              );
            }
          }
        }
      }
    }
  }

  return (
    <>
      <tr className="row-group-hdr" onClick={hasSub ? onToggle : undefined} style={hasSub ? { cursor: 'pointer' } : undefined}>
        <td>{hasSub && <span className="toggle-icon">{open ? '▼' : '▶'}</span>}{lbl}</td>
        <DetailCells row={rowVal} />
      </tr>
      {subRows}
    </>
  );
}

function DetailTotRow({ D, selectedLoc, lbl, dataKey, idx }: {
  D: DashboardData; selectedLoc: string; lbl: string; dataKey: string; idx: number[];
}) {
  const val = computeDetailRow(D, selectedLoc, dataKey, undefined, undefined, idx);
  return (
    <tr className="total-row">
      <td>{lbl}</td>
      <DetailCells row={val} />
    </tr>
  );
}

const GROUPS: (GrpRow & { type?: 'total' | 'sec' })[] = [
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
    { lbl: 'ZeroCater', key: 'Catering Sales - ZeroCater' },
    { lbl: 'Other 3rd Party', key: 'Total Catering Sales - Other 3rd Party', subKey: 'Catering Sales - EZ Cater' },
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
    { lbl: 'Food Costs', key: 'Total Food Costs', children: [
      { lbl: 'Produce', key: 'COGS - Produce' },
      { lbl: 'Grocery Dry & Canned', key: 'COGS - Grocery Dry & Canned' },
      { lbl: 'Poultry', key: 'COGS - Poultry' },
      { lbl: 'Dairy', key: 'COGS - Dairy' },
      { lbl: 'Frozen', key: 'COGS - Frozen' },
      { lbl: 'Meat', key: 'COGS - Meat' },
      { lbl: 'Seafood', key: 'COGS - Seafood' },
      { lbl: 'Spices', key: 'COGS - Spices' },
      { lbl: 'Prepped Food', key: 'COGS - Prepped Food' },
    ]},
    { lbl: 'Beverage Costs', key: 'Total Beverage Costs', children: [
      { lbl: 'N/A Beverage', key: 'COGS - N/A Beverage' },
      { lbl: 'Beer', key: 'COGS - Beer' },
      { lbl: 'Liquor', key: 'COGS - Liquor' },
      { lbl: 'Wine', key: 'COGS - Wine' },
    ]},
    { lbl: 'Paper Costs', key: 'Total Paper Costs', children: [
      { lbl: 'Paper Supplies', key: 'COGS - Paper Supplies' },
      { lbl: 'Catering Supplies', key: 'COGS - Catering Supplies' },
      { lbl: 'Event Supplies', key: 'COGS - Event Supplies' },
    ]},
    { lbl: 'Waste Costs', key: 'Total Waste Costs', children: [
      { lbl: 'Food', key: 'Waste - Food' },
      { lbl: 'N/A Beverage', key: 'Waste - N/A Beverage' },
      { lbl: 'Beer', key: 'Waste - Beer' },
      { lbl: 'Liquor', key: 'Waste - Liquor' },
      { lbl: 'Wine', key: 'Waste - Wine' },
    ]},
    { lbl: 'Freight & Other', key: 'COGS - Freight, Delivery, & Sales Tax' },
    { lbl: 'Fuel Surcharge', key: 'COGS - Fuel Surcharge' },
    { lbl: 'Credit for Discounts', key: 'COGS - Credit for Discounts' },
  ]},
  { type: 'total', lbl: 'Gross Profit', key: 'Gross Profit' },
  { type: 'sec', lbl: 'PAYROLL', key: '' },
  { lbl: 'Total Payroll Expenses', key: 'Total Payroll Expenses', sub: [
    { lbl: 'Management', key: 'Management' },
    { lbl: 'Hourly', key: 'Hourly' },
    { lbl: 'Overtime', key: 'Overtime' },
    { lbl: 'Bonus', key: 'Bonus' },
    { lbl: 'Payroll Taxes', key: 'Total Payroll Taxes', children: [
      { lbl: 'FICA Tax Expense', key: 'FICA Tax Expense' },
      { lbl: 'FUTA Tax Expense', key: 'FUTA Tax Expense' },
      { lbl: 'SUTA Tax Expense (VA)', key: 'SUTA Tax Expense (VA)' },
      { lbl: 'SUTA Tax Expense (DC)', key: 'SUTA Tax Expense (DC)' },
      { lbl: 'FL Tax Expense (DC)', key: 'FL Tax Expense (DC)' },
      { lbl: 'Other Payroll Taxes', key: 'Other Payroll Taxes' },
    ]},
    { lbl: 'Payroll Processing Fee', key: 'Payroll Processing Fee' },
    { lbl: 'Health Insurance', key: 'Health Insurance' },
  ]},
  { type: 'total', lbl: 'Prime Profit', key: 'Prime Profit' },
  { type: 'sec', lbl: 'OPERATING EXPENSES', key: '' },
  { lbl: 'Total Operating Expense', key: 'Total Operating Expense', sub: [
    { lbl: 'Supplies', key: 'Total Supplies', children: [
      { lbl: 'Cleaning & Maintenance Supplies', key: 'Cleaning & Maintenance Supplies' },
      { lbl: 'Kitchen Supplies', key: 'Kitchen Supplies' },
      { lbl: 'FOH Supplies', key: 'FOH Supplies' },
      { lbl: 'Towel & Doormat Service', key: 'Towel & Doormat Service' },
      { lbl: 'Kitchen Smallwares', key: 'Kitchen Smallwares' },
      { lbl: 'Uniforms', key: 'Uniforms' },
      { lbl: 'Office Supplies', key: 'Office Supplies' },
    ]},
    { lbl: 'Marketing', key: 'Total Marketing', children: [
      { lbl: 'Total Third-Party Promos', key: 'Total Third-Party Promos' },
      { lbl: 'Other Marketing Expenses', key: 'Other Marketing Expenses' },
    ]},
    { lbl: 'Delivery Fees', key: 'Total Delivery Fees', children: [
      { lbl: 'First Delivery Fees', key: 'First Delivery Fees' },
      { lbl: 'Nash Fees', key: 'Nash Fees' },
      { lbl: 'Open App Fees', key: 'Open App Fees' },
    ]},
    { lbl: '3rd Party Fees', key: 'Total Third-Party Fees', children: [
      { lbl: 'Delivery Partner Commissions', key: 'Total Delivery Partner Commissions' },
    ]},
    { lbl: 'Credit Card Fees', key: 'Total Credit Card Fees', children: [
      { lbl: 'Credit Card Fees', key: 'Credit Card Fees' },
      { lbl: 'Chargebacks', key: 'Chargebacks' },
    ]},
    { lbl: 'Insurance', key: 'Total Insurance', children: [
      { lbl: 'Workers Compensation Insurance', key: 'Workers Compensation Insurance' },
      { lbl: 'Business Owners Policy', key: 'Business Owners Policy' },
      { lbl: 'Auto Insurance', key: 'Auto Insurance' },
    ]},
    { lbl: 'Repairs & Maintenance', key: 'Total Repairs & Maintenance', children: [
      { lbl: 'Scrubber Expense', key: 'Scrubber Expense' },
      { lbl: 'Hood Cleaning', key: 'R&M - Hood Cleaning' },
      { lbl: 'Pest Control', key: 'R&M - Pest Control' },
      { lbl: 'Building, General', key: 'R&M - Building, General' },
      { lbl: 'Equipment, General', key: 'R&M - Equipment, General' },
      { lbl: 'Refrigeration', key: 'R&M - Refrigeration' },
      { lbl: 'HVAC', key: 'R&M - HVAC' },
      { lbl: 'Preventative Maintenance', key: 'R&M - Preventative Maintenance' },
    ]},
    { lbl: 'Other Expenses', key: 'Total Other Expenses', children: [
      { lbl: 'Equipment Rental', key: 'Equipment Rental' },
      { lbl: 'Bank Fees', key: 'Bank Fees' },
      { lbl: 'Employee Incentives (M&E)', key: 'Employee Incentives (M&E)' },
      { lbl: 'Ground Transportation', key: 'Ground Transportation (Auto Expense)' },
      { lbl: 'Parking Fees', key: 'Parking Fees' },
      { lbl: 'Tangible Property Tax', key: 'Tangible Property Tax' },
      { lbl: 'Equipment Lease', key: 'Equipment Lease' },
      { lbl: 'Phone/Internet', key: 'Phone/Internet' },
      { lbl: 'POS & Technology', key: 'POS & Technology' },
      { lbl: 'Cost for Discounts', key: 'Cost for Discounts' },
      { lbl: 'Licenses & Permits', key: 'Licenses & Permits' },
      { lbl: 'Cash Over/Short', key: 'Cash Over/Short' },
    ]},
  ]},
  { type: 'sec', lbl: 'OCCUPANCY', key: '' },
  { lbl: 'Total Occupancy Cost', key: 'Total Occupancy Cost', sub: [
    { lbl: 'Rent Expense', key: 'Rent Expense' },
    { lbl: 'Common Area Maintenance (CAM)', key: 'Common Area Maintenance (CAM)' },
    { lbl: 'Public Space Rental', key: 'Public Space Rental' },
    { lbl: 'Insurance - Building', key: 'Insurance - Building' },
    { lbl: 'Real Estate Tax', key: 'Real Estate Tax' },
    { lbl: 'Rent - 4/4/5', key: 'Rent - 4/4/5' },
    { lbl: 'Percentage Rent Expense', key: 'Percentage Rent Expense' },
    { lbl: 'Total Utilities', key: 'Total Utilities', children: [
      { lbl: 'Electric', key: 'Electric' },
      { lbl: 'Gas', key: 'Gas' },
      { lbl: 'Water/Sewer', key: 'Water/Sewer' },
      { lbl: 'Trash', key: 'Trash' },
    ]},
  ]},
  { type: 'total', lbl: 'Store Level Profit', key: 'Store Level Profit' },
  { type: 'sec', lbl: 'CORPORATE', key: '' },
  { lbl: 'Corporate Overhead', key: 'Total Corporate Overhead & Other', useEntity: 'RASA Worldwide', sub: [
    { lbl: 'Corp Payroll', key: 'Total Corp - Payroll Expenses', children: [
      { lbl: 'Salaries & Wages', key: 'Corp - Salaries & Wages' },
      { lbl: 'Payroll Taxes', key: 'Corp - Payroll Taxes' },
      { lbl: 'Payroll Processing Fee', key: 'Corp - Payroll Processing Fee' },
      { lbl: 'Bonus', key: 'Corp - Bonus' },
      { lbl: 'Health Insurance', key: 'Corp - Health Insurance' },
    ]},
    { lbl: 'Corp M&E & Travel', key: 'Total Corp - Meals, Entertainment, & Travel', children: [
      { lbl: 'Parking Fees', key: 'Corp - Parking Fees' },
      { lbl: 'Ground Transportation', key: 'Corp - Ground Transportation' },
      { lbl: 'M&E', key: 'Corp - M&E' },
      { lbl: 'Lodging', key: 'Corp - Lodging' },
      { lbl: 'Airfare', key: 'Corp - Airfare' },
      { lbl: 'Travel (New Market)', key: 'Corp - Travel (New Market)' },
    ]},
    { lbl: 'Corp - Marketing', key: 'Total Corp - Marketing', children: [
      { lbl: 'Corp - Marketing', key: 'Corp - Marketing' },
      { lbl: 'Corp - 3rd Party Marketing Fees', key: 'Total Corp - 3rd Party Marketing Fees', children: [
        { lbl: 'Corp - 3rd Party Marketing Fees', key: 'Corp - 3rd Party Marketing Fees' },
        { lbl: 'Corp - DoorDash Marketing Fees', key: 'Corp - DoorDash Marketing Fees' },
        { lbl: 'Corp - EZ Cater Marketing Fees', key: 'Corp - EZ Cater Marketing Fees' },
        { lbl: 'Corp - GrubHub Marketing Fees', key: 'Corp - GrubHub Marketing Fees' },
        { lbl: 'Corp - Uber Eats Marketing Fees', key: 'Corp - Uber Eats Marketing Fees' },
      ]},
      { lbl: 'Corp - Paid Media', key: 'Corp - Paid Media' },
      { lbl: 'Corp - SMS Marketing', key: 'Corp - SMS Marketing' },
    ]},
    { lbl: 'Corp Insurance', key: 'Corp - Insurance Expense' },
    { lbl: 'Corp IT & Technology', key: 'Corp - IT & Technology' },
    { lbl: 'Corp Accounting Fees', key: 'Corp - Accounting Fees' },
    { lbl: 'Corp Legal Fees', key: 'Corp - Legal Fees' },
    { lbl: 'Corp Other Professional Fees', key: 'Corp - Other Professional Fees' },
    { lbl: 'Corp Recruiting Fees', key: 'Corp - Recruiting Fees' },
    { lbl: 'Corp Dues & Subscriptions', key: 'Corp - Dues & Subscriptions' },
    { lbl: 'Corp Office Supplies', key: 'Corp - Office Supplies' },
    { lbl: 'Corp Other Taxes', key: 'Corp - Other Taxes' },
    { lbl: 'Corp Rent Expense', key: 'Corp - Rent Expense' },
    { lbl: 'Corp Charitable Contributions', key: 'Corp - Charitable Contributions' },
    { lbl: 'Corp Other Employee Incentives', key: 'Corp - Other Employee Incentives' },
    { lbl: 'Corp R&D', key: 'Corp - R&D' },
    { lbl: 'Corp Bank Fees', key: 'Corp - Bank Fees' },
    { lbl: 'Corp Licenses & Permits', key: 'Corp - Licenses & Permits' },
  ]},
  { type: 'total', lbl: 'EBITDA', key: 'EBITDA' },
  { type: 'total', lbl: 'Net Income', key: 'Net Income' },
];

export default function FullPnlPanel({ D, curPeriod }: Props) {
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const rangeLabel = idx.length > 1
    ? `${D.periods[idx[0]]} – ${D.periods[idx[idx.length - 1]]} (${idx.length} periods)`
    : D.periods[idx[0]];

  const [selectedLoc, setSelectedLoc] = useState('all');
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const [openGrps, setOpenGrps] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isCompare = selectedLoc === 'all';
  const activeLocs = ['Consolidated', ...ALL_LOCS];
  const colCount = 1 + (isCompare ? activeLocs.length : 10);

  function toggleGrp(key: string) {
    setOpenGrps(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSub(key: string) {
    setOpenSubs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const ddLabel = selectedLoc === 'all' ? 'All Locations' : selectedLoc;

  return (
    <div className="panel active" id="panel-fullpnl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="sel-label" style={{ color: '#7c3aed' }}>Location</span>
          <div className="loc-dd-wrap" ref={ddRef}>
            <div className="loc-dd-trigger" onClick={() => setDdOpen(o => !o)}>
              <span>{ddLabel}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
                <path d="M0 0l5 6 5-6z" fill="#7c3aed" />
              </svg>
            </div>
            {ddOpen && (
              <div className="loc-dd-menu open">
                {SELECT_OPTIONS.map((opt, i) => (
                  <div key={opt}>
                    <div
                      className={'loc-dd-item' + (opt === 'all' ? ' loc-dd-all' : '')}
                      onClick={() => { setSelectedLoc(opt); setDdOpen(false); }}
                    >
                      <span>{opt === 'all' ? 'All Locations' : opt}</span>
                    </div>
                    {i === 0 && <div className="loc-dd-sep" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <span className="tcard-title">Full P&L — {rangeLabel}</span>
          <span className="tcard-meta">{isCompare ? '$ (% of sales)' : 'Actual vs Budget vs Prior Year'}</span>
        </div>
        <div className="tscroll">
          <table className="dtable dtable-sticky-first">
            <thead>
              {isCompare ? (
                <tr>
                  <th style={{ minWidth: 220 }}>Line Item</th>
                  {activeLocs.map(l => <th key={l} style={{ minWidth: 150 }}>{l}</th>)}
                </tr>
              ) : (
                <tr>
                  <th style={{ minWidth: 220 }}>Line Item</th>
                  <th>Actual $</th><th>Actual %</th>
                  <th>Budget $</th><th>Budget %</th>
                  <th>Var $ vs Bud</th><th>Var % vs Bud</th>
                  <th>PY $</th><th>PY %</th>
                  <th>Var $ vs PY</th><th>Var % vs PY</th>
                </tr>
              )}
            </thead>
            <tbody>
              {GROUPS.map((g, gi) => {
                if (g.type === 'sec') return <SecHdr key={gi} label={g.lbl} colCount={colCount} />;
                if (g.type === 'total') {
                  return isCompare
                    ? <TotRow key={gi} D={D} lbl={g.lbl} dataKey={g.key} locs={activeLocs} idx={idx} />
                    : <DetailTotRow key={gi} D={D} selectedLoc={selectedLoc} lbl={g.lbl} dataKey={g.key} idx={idx} />;
                }
                return isCompare ? (
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
                    openSubs={openSubs}
                    onToggleSub={toggleSub}
                    useEntity={g.useEntity}
                  />
                ) : (
                  <DetailGrpRow
                    key={gi}
                    D={D}
                    selectedLoc={selectedLoc}
                    lbl={g.lbl}
                    dataKey={g.key}
                    sub={g.sub}
                    idx={idx}
                    open={openGrps.has(g.key + gi)}
                    onToggle={() => toggleGrp(g.key + gi)}
                    openSubs={openSubs}
                    onToggleSub={toggleSub}
                    useEntity={g.useEntity}
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
