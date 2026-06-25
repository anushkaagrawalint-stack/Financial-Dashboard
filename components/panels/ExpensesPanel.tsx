'use client';

import '@/lib/chartSetup';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useMemo, useState, useEffect } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, getLabels, fmt$, fmtPct, fmtVar, fmtVarPct, pctVar, varCls, hasBudget } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import { grd, tip, donutLabels as donutLabelsCfg } from '@/lib/chartSetup';

interface Props {
  D: DashboardData;
  curEntity: string;
  curPeriod: string;
}

interface ExpenseItem { lbl: string; key: string; children?: ExpenseItem[]; }
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
    ],
  },
  labor: {
    title: 'Labor & Payroll', color: '#f59e0b', totalKey: 'Total Payroll Expenses',
    items: [
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
    ],
  },
  opex: {
    title: 'Operating Expenses', color: '#8b5cf6', totalKey: 'Total Operating Expense',
    items: [
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
        { lbl: 'Total Third-Party Promos', key: 'Total Third-Party Promos', children: [
          { lbl: 'DoorDash Promos', key: 'DoorDash Promos' },
          { lbl: 'EZ Cater Promos', key: 'EZ Cater Promos' },
          { lbl: 'GrubHub Promos', key: 'GrubHub Promos' },
          { lbl: 'Uber Eats Promos', key: 'Uber Eats Promos' },
        ]},
        { lbl: 'Other Marketing Expenses', key: 'Other Marketing Expenses' },
      ]},
      { lbl: 'Delivery Fees', key: 'Total Delivery Fees', children: [
        { lbl: 'First Delivery Fees', key: 'First Delivery Fees' },
        { lbl: 'Nash Fees', key: 'Nash Fees' },
        { lbl: 'Open App Fees', key: 'Open App Fees' },
      ]},
      { lbl: '3rd Party Fees', key: 'Total Third-Party Fees', children: [
        { lbl: 'Delivery Partner Commissions', key: 'Total Delivery Partner Commissions', children: [
          { lbl: 'Cater Cow Commissions', key: 'Cater Cow Commissions' },
          { lbl: 'DoorDash Commissions', key: 'DoorDash Commissions' },
          { lbl: 'EZ Cater Commissions', key: 'EZ Cater Commissions' },
          { lbl: 'Fooda Commissions', key: 'Fooda Commissions' },
          { lbl: 'GrubHub Commissions', key: 'GrubHub Commissions' },
          { lbl: 'Too Good To Go Commissions', key: 'Too Good To Go Commissions' },
          { lbl: 'Uber Eats Commissions', key: 'Uber Eats Commissions' },
          { lbl: 'Sharebite Commissions', key: 'Sharebite Commissions' },
          { lbl: 'Aramark Commissions', key: 'Aramark Commissions' },
          { lbl: 'Eurest Commissions', key: 'Eurest Commissions' },
          { lbl: 'Metz Corp Commissions', key: 'Metz Corp Commissions' },
          { lbl: 'Guest Services Commissions', key: 'Guest Services Commissions' },
          { lbl: 'Foodworks Commissions', key: 'Foodworks Commissions' },
        ]},
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
    ],
  },
  occupancy: {
    title: 'Occupancy', color: '#60a5fa', totalKey: 'Total Occupancy Cost',
    items: [
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
    ],
  },
  corporate: {
    title: 'Corporate Overhead', color: '#10b981', totalKey: 'Total Corporate Overhead & Other',
    useEntity: 'RASA Worldwide',
    items: [
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const isAllLocations = curEntity === 'Consolidated';
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);

  useEffect(() => {
    if (!isAllLocations && curSub === 'corporate') setCurSub('cogs');
  }, [isAllLocations, curSub]);

  useEffect(() => {
    setExpandedRows(new Set());
  }, [curSub]);

  const labels = useMemo(() => getLabels(curPeriod, D.periods), [curPeriod, D.periods]);
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

  function toggleRow(key: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function renderRows(items: ExpenseItem[], depth: number): React.ReactNode[] {
    const rows: React.ReactNode[] = [];
    const isPctMode = isCogsOrLabor(curSub);
    for (const it of items) {
      const hasChildren = !!(it.children && it.children.length > 0);
      const isExpanded = expandedRows.has(it.key);
      const a = agg(D, UE, it.key, idx);
      if (!hasChildren && a.v === 0 && a.py === 0) continue;
      const paddingLeft = depth * 20 + 14;
      const fw = depth === 0 ? 600 : 400;
      const chevron = hasChildren
        ? <span style={{color:'#7c3aed',marginRight:5,fontSize:9,userSelect:'none'}}>{isExpanded ? '▼' : '▶'}</span>
        : <span style={{display:'inline-block',width:14}}/>;
      const labelTd = <td style={{paddingLeft, fontWeight: fw}}>{chevron}{it.lbl}</td>;

      let row: React.ReactNode;
      if (isPctMode) {
        const actualPct = a.v ? (a.v / (totalSalesAgg.v || 1)) * 100 : null;
        const lyPct = a.py ? (a.py / (totalSalesAgg.py || 1)) * 100 : null;
        const budgetPct = a.b ? (a.b / (totalSalesAgg.b || 1)) * 100 : null;
        const varLY = actualPct != null && lyPct != null ? lyPct - actualPct : null;
        const varBud = actualPct != null && budgetPct != null ? budgetPct - actualPct : null;
        row = (
          <tr key={it.key} onClick={hasChildren ? () => toggleRow(it.key) : undefined}
            style={{cursor: hasChildren ? 'pointer' : undefined}}>
            {labelTd}
            <td>{fmt$(a.v)}</td>
            <td>{fmtPct(actualPct)}</td>
            <td>{fmtPct(lyPct)}</td>
            <td className={varCls(varLY, false)}>{fmtVarPct(varLY)}</td>
            <td>{budgetPct != null ? fmtPct(budgetPct) : '—'}</td>
            <td className={budgetPct != null ? varCls(varBud, false) : ''}>{budgetPct != null ? fmtVarPct(varBud) : '—'}</td>
          </tr>
        );
      } else {
        const actualPct = a.v ? (a.v / (totalSalesAgg.v || 1)) * 100 : null;
        const varLY = pctVar(a.v, a.py);
        const varBud = pctVar(a.v, a.b);
        row = (
          <tr key={it.key} onClick={hasChildren ? () => toggleRow(it.key) : undefined}
            style={{cursor: hasChildren ? 'pointer' : undefined}}>
            {labelTd}
            <td>{fmt$(a.v)}</td>
            <td>{fmtPct(actualPct)}</td>
            <td>{fmt$(a.py)}</td>
            <td className={a.py ? varCls(varLY, true) : ''}>{a.py ? fmtVarPct(varLY) : '—'}</td>
            <td>{fmt$(a.b)}</td>
            <td className={a.b ? varCls(varBud, true) : ''}>{a.b ? fmtVarPct(varBud) : '—'}</td>
          </tr>
        );
      }
      rows.push(row);
      if (hasChildren && isExpanded) rows.push(...renderRows(it.children!, depth + 1));
    }
    return rows;
  }

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

  const renderTable = () => {
    if (isCogsOrLabor(curSub)) {
      const actualPct = ta.v ? (ta.v / (totalSalesAgg.v || 1)) * 100 : null;
      const lyPct = ta.py ? (ta.py / (totalSalesAgg.py || 1)) * 100 : null;
      const budgetPct = ta.b ? (ta.b / (totalSalesAgg.b || 1)) * 100 : null;
      const varLY = actualPct != null && lyPct != null ? lyPct - actualPct : null;
      const varBud = actualPct != null && budgetPct != null ? budgetPct - actualPct : null;
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
            {renderRows(cfg.items, 0)}
            <tr className="total-row">
              <td>Total {cfg.title}</td>
              <td>{fmt$(ta.v)}</td>
              <td>{fmtPct(actualPct)}</td>
              <td>{fmtPct(lyPct)}</td>
              <td className={varCls(varLY, false)}>{fmtVarPct(varLY)}</td>
              <td>{budgetPct != null ? fmtPct(budgetPct) : '—'}</td>
              <td className={budgetPct != null ? varCls(varBud, false) : ''}>{budgetPct != null ? fmtVarPct(varBud) : '—'}</td>
            </tr>
          </tbody>
        </table>
      );
    } else {
      const actualPct = ta.v ? (ta.v / (totalSalesAgg.v || 1)) * 100 : null;
      const varLY = pctVar(ta.v, ta.py);
      const varBud = pctVar(ta.v, ta.b);
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
            {renderRows(cfg.items, 0)}
            <tr className="total-row">
              <td>Total {cfg.title}</td>
              <td>{fmt$(ta.v)}</td>
              <td>{fmtPct(actualPct)}</td>
              <td>{fmt$(ta.py)}</td>
              <td className={ta.py ? varCls(varLY, true) : ''}>{ta.py ? fmtVarPct(varLY) : '—'}</td>
              <td>{fmt$(ta.b)}</td>
              <td className={ta.b ? varCls(varBud, true) : ''}>{ta.b ? fmtVarPct(varBud) : '—'}</td>
            </tr>
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
                    { label: 'Budget', data: idx.map(i => D.t12[UE][cfg.totalKey]?.b[i]), backgroundColor: '#6d28d9', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
                    { label: 'Prior Year', data: idx.map(i => D.t12[UE][cfg.totalKey]?.py[i]), backgroundColor: '#9ca3af', borderRadius: 3, barPercentage: 0.6, categoryPercentage: 0.7 },
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
                    datalabels: donutLabelsCfg,
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
                      { label: 'Budget', data: bPctVals, backgroundColor: '#6d28d9', borderRadius: 4, barPercentage: 0.8, categoryPercentage: 0.85 },
                      { label: 'Prior Year', data: pyPctVals, backgroundColor: '#9ca3af', borderRadius: 4, barPercentage: 0.8, categoryPercentage: 0.85 },
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
