import type { DashboardData } from './types';
import { agg } from './utils';

export const LOCATIONS = ['Ballpark', 'MVT', 'National Landing', 'Mosaic', 'Rockville'];

export const ppDiff = (a: number | null, b: number | null) => (a != null && b != null ? a - b : null);

function pctOfSales(x: number, base: number) {
  return base ? (x / base) * 100 : null;
}

export interface LocationRow {
  entity: string;
  sales: { v: number; b: number; py: number };
  ebitda: { v: number; b: number; py: number };
  ebitdaPct: number | null; ebitdaBudPct: number | null; ebitdaPyPct: number | null;
  cogsPct: number | null; cogsBudPct: number | null; cogsPyPct: number | null;
  laborPct: number | null; laborBudPct: number | null; laborPyPct: number | null;
  opexPct: number | null; opexBudPct: number | null; opexPyPct: number | null;
}

export function computeLocationRows(D: DashboardData, idx: number[]): { rows: LocationRow[]; totals: LocationRow } {
  const rows: LocationRow[] = LOCATIONS.map(entity => {
    const sales = agg(D, entity, 'Total Sales', idx);
    const ebitda = agg(D, entity, 'EBITDA', idx);
    const cogs = agg(D, entity, 'Total Cost of Goods Sold', idx);
    const labor = agg(D, entity, 'Total Payroll Expenses', idx);
    const opex = agg(D, entity, 'Total Operating Expense', idx);
    return {
      entity, sales, ebitda,
      ebitdaPct: pctOfSales(ebitda.v, sales.v), ebitdaBudPct: pctOfSales(ebitda.b, sales.b), ebitdaPyPct: pctOfSales(ebitda.py, sales.py),
      cogsPct: pctOfSales(cogs.v, sales.v), cogsBudPct: pctOfSales(cogs.b, sales.b), cogsPyPct: pctOfSales(cogs.py, sales.py),
      laborPct: pctOfSales(labor.v, sales.v), laborBudPct: pctOfSales(labor.b, sales.b), laborPyPct: pctOfSales(labor.py, sales.py),
      opexPct: pctOfSales(opex.v, sales.v), opexBudPct: pctOfSales(opex.b, sales.b), opexPyPct: pctOfSales(opex.py, sales.py),
    };
  });

  const sumField = (key: 'sales' | 'ebitda' | 'cogs' | 'labor' | 'opex', field: 'v' | 'b' | 'py') => {
    const metricKey: Record<string, string> = {
      sales: 'Total Sales', ebitda: 'EBITDA', cogs: 'Total Cost of Goods Sold',
      labor: 'Total Payroll Expenses', opex: 'Total Operating Expense',
    };
    return LOCATIONS.reduce((s, entity) => s + agg(D, entity, metricKey[key], idx)[field], 0);
  };
  const totalSales = { v: sumField('sales', 'v'), b: sumField('sales', 'b'), py: sumField('sales', 'py') };
  const totalEbitda = { v: sumField('ebitda', 'v'), b: sumField('ebitda', 'b'), py: sumField('ebitda', 'py') };
  const totalCogs = { v: sumField('cogs', 'v'), b: sumField('cogs', 'b'), py: sumField('cogs', 'py') };
  const totalLabor = { v: sumField('labor', 'v'), b: sumField('labor', 'b'), py: sumField('labor', 'py') };
  const totalOpex = { v: sumField('opex', 'v'), b: sumField('opex', 'b'), py: sumField('opex', 'py') };
  const totals: LocationRow = {
    entity: 'All Locations',
    sales: totalSales, ebitda: totalEbitda,
    ebitdaPct: pctOfSales(totalEbitda.v, totalSales.v), ebitdaBudPct: pctOfSales(totalEbitda.b, totalSales.b), ebitdaPyPct: pctOfSales(totalEbitda.py, totalSales.py),
    cogsPct: pctOfSales(totalCogs.v, totalSales.v), cogsBudPct: pctOfSales(totalCogs.b, totalSales.b), cogsPyPct: pctOfSales(totalCogs.py, totalSales.py),
    laborPct: pctOfSales(totalLabor.v, totalSales.v), laborBudPct: pctOfSales(totalLabor.b, totalSales.b), laborPyPct: pctOfSales(totalLabor.py, totalSales.py),
    opexPct: pctOfSales(totalOpex.v, totalSales.v), opexBudPct: pctOfSales(totalOpex.b, totalSales.b), opexPyPct: pctOfSales(totalOpex.py, totalSales.py),
  };

  return { rows, totals };
}
