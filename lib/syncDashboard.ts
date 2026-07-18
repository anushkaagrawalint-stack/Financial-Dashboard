import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { PeriodEntry, DATA_DIR } from '@/lib/periods';
import { isGitHubConfigured, getDataFileBuffer, getDashboardData, saveDashboardData } from '@/lib/githubStorage';

// ── Constants ────────────────────────────────────────────────────────────────

export const SHEET_TO_ENTITY: Record<string, string> = {
  'Consolidated':               'Consolidated',
  '1 - RASA Worldwide':         'RASA Worldwide',
  '2 - RASA - Ballpark':        'Ballpark',
  '4 - RASA - MVT':             'MVT',
  '5 - RASA - National Landin': 'National Landing',
  '6 - RASA - Mosaic':          'Mosaic',
  '7 - RASA - Rockville':       'Rockville',
};

const COL_LABEL      = 0;
const COL_ACTUAL     = 1;
const COL_BUDGET     = 4;
const COL_PRIOR_YEAR = 10;

// Cumulative "YTD" block in the same sheet (columns Q/T/Z) — Excel's own
// running total through this period, used directly instead of summing
// monthly Actual columns across periods in JS.
const COL_YTD_ACTUAL     = 16;
const COL_YTD_BUDGET     = 19;
const COL_YTD_PRIOR_YEAR = 25;

const EXCEL_TO_JSON: Record<string, string> = {
  'ShareBite Commissions': 'Sharebite Commissions',
};

export const ALL_KEYS = [
  'Food','N/A Beverage','Beer','Liquor','Wine','Retail',
  'Total Single Plate In-House Sales',
  'Takeout Sales - RASA App','Takeout Sales - DoorDash','Takeout Sales - GrubHub',
  'Takeout Sales - Uber Eats','Takeout Sales - Too Good To Go',
  'Takeout Sales - RASA Website','Takeout Sales - Ritual',
  'Total Takeout Sales',
  'Delivery Sales - DoorDash','Delivery Sales - GrubHub','Delivery Sales - Uber Eats',
  'Delivery Sales - RASA App','Delivery Sales - RASA Website',
  'Delivery Sales - Hungry Marketplace','Delivery Sales - Google',
  'Total Delivery Sales',
  'Catering Sales - RASA Website','Catering Sales - EZ Cater',
  'Catering Sales - Foodworks','Catering Sales - Cater Cow',
  'Catering Sales - Territory Foods','Catering Sales - Hungry Marketplace',
  'Catering Sales - Sharebite','Catering Sales - Cater 2 Me',
  'Catering Sales - ZeroCater','Catering Sales - Food Fleet',
  'Catering Sales - Foodee','Catering Sales - WCK',
  'Total Catering Sales - Other 3rd Party','Total Catering Sales',
  'Offsites - Fooda','Offsites - Aramark','Offsites - Eurest',
  'Offsites - Metz Corp','Offsites - Guest Services','Offsites - Cureate',
  'Offsites - Compass','Offsites - Taher',
  'Total Offsites',
  'Delivery Fee - Online Ordering','Delivery Fee - EZ Cater',
  'Delivery Fee - Fooda','Delivery Fee - Cater Cow',
  'Delivery Fee - Uber Eats','Delivery Fee - GrubHub',
  'Delivery Fee - Sharebite','Delivery Fee - ZeroCater',
  'Delivery Fee - Cater 2 Me','Delivery Fee - Compass',
  'Delivery Fee - Delivery by DoorDash (WL)',
  'Total Delivery Fee Income',
  'Delivery Service Charge',
  'Sales Adjustments','Open App Sales Adjustments','Open Tickets',
  'Squad Meals','Open App Loyalty','SLT Comps','LSM Comps',
  'Manager Comps','Catering Comps','Open App Store Credits',
  'Open App Promos','Squad Discount','Partnerships',
  'Discounts / Refunds Given Other',
  'Free Meal Cards (This Ones on Us)','Magic Fund',
  'Total Discounts / Refunds',
  'Total Sales',
  'COGS - Produce','COGS - Grocery Dry & Canned','COGS - Poultry',
  'COGS - Dairy','COGS - Frozen','COGS - Meat','COGS - Seafood',
  'COGS - Spices','COGS - Prepped Food',
  'Total Food Costs',
  'COGS - N/A Beverage','COGS - Beer','COGS - Liquor','COGS - Wine',
  'Total Beverage Costs',
  'COGS - Paper Supplies','COGS - Catering Supplies','COGS - Event Supplies',
  'Total Paper Costs',
  'Waste - Food','Waste - N/A Beverage','Waste - Beer',
  'Waste - Liquor','Waste - Wine',
  'Total Waste Costs',
  'COGS - Freight, Delivery, & Sales Tax',
  'COGS - Fuel Surcharge',
  'COGS - Credit for Discounts',
  'Total Cost of Goods Sold',
  'Gross Profit',
  'Management','Hourly','Overtime','Bonus',
  'FICA Tax Expense','FUTA Tax Expense','SUTA Tax Expense (VA)',
  'SUTA Tax Expense (DC)','FL Tax Expense (DC)','Other Payroll Taxes',
  'Total Payroll Taxes',
  'Payroll Processing Fee','Health Insurance',
  'Total Payroll Expenses',
  'Prime Profit',
  'Cleaning & Maintenance Supplies','Kitchen Supplies','FOH Supplies',
  'Towel & Doormat Service','Kitchen Smallwares','Uniforms','Office Supplies',
  'Total Supplies',
  'DoorDash Promos','EZ Cater Promos','GrubHub Promos','Uber Eats Promos',
  'Total Third-Party Promos',
  'Other Marketing Expenses',
  'Total Marketing',
  'First Delivery Fees','Nash Fees','Open App Fees',
  'Total Delivery Fees',
  'Cater Cow Commissions','DoorDash Commissions','EZ Cater Commissions',
  'Fooda Commissions','GrubHub Commissions','Too Good To Go Commissions',
  'Uber Eats Commissions','Sharebite Commissions',
  'Aramark Commissions','Eurest Commissions','Metz Corp Commissions',
  'Guest Services Commissions','Foodworks Commissions',
  'Total Delivery Partner Commissions',
  'Total Third-Party Fees',
  'Credit Card Fees','Chargebacks',
  'Total Credit Card Fees',
  'Workers Compensation Insurance','Business Owners Policy','Auto Insurance',
  'Total Insurance',
  'Scrubber Expense','R&M - Hood Cleaning','R&M - Pest Control',
  'R&M - Building, General','R&M - Equipment, General','R&M - Refrigeration',
  'R&M - HVAC','R&M - Preventative Maintenance',
  'Total Repairs & Maintenance',
  'Equipment Rental','Bank Fees','Employee Incentives (M&E)',
  'Ground Transportation (Auto Expense)','Parking Fees','Tangible Property Tax',
  'Equipment Lease','Phone/Internet','POS & Technology',
  'Cost for Discounts','Licenses & Permits','Cash Over/Short',
  'Total Other Expenses',
  'Total Operating Expense',
  'Rent Expense','Common Area Maintenance (CAM)','Public Space Rental',
  'Insurance - Building','Real Estate Tax','Rent - 4/4/5',
  'Percentage Rent Expense',
  'Electric','Gas','Water/Sewer','Trash',
  'Total Utilities',
  'Total Occupancy Cost',
  'Store Level Profit',
  'Total Non Controllable Expense',
  'Corp - Salaries & Wages','Corp - Payroll Taxes','Corp - Payroll Processing Fee',
  'Corp - Bonus','Corp - Health Insurance',
  'Total Corp - Payroll Expenses',
  'Corp - Parking Fees','Corp - Ground Transportation','Corp - M&E',
  'Corp - Lodging','Corp - Airfare','Corp - Travel (New Market)',
  'Total Corp - Meals, Entertainment, & Travel',
  'Corp - Marketing','Corp - Marketing Food Drops',
  'Corp - 3rd Party Marketing Fees',
  'Corp - DoorDash Marketing Fees','Corp - EZ Cater Marketing Fees',
  'Corp - GrubHub Marketing Fees','Corp - Uber Eats Marketing Fees',
  'Total Corp - 3rd Party Marketing Fees',
  'Corp - Paid Media','Corp - SMS Marketing',
  'Total Corp - Marketing',
  'Corp - Insurance Expense','Corp - IT & Technology',
  'Corp - Accounting Fees','Corp - Legal Fees','Corp - Other Professional Fees',
  'Corp - Recruiting Fees','Corp - Dues & Subscriptions','Corp - Office Supplies',
  'Corp - Other Taxes','Corp - Rent Expense','Corp - Charitable Contributions',
  'Corp - Other Employee Incentives','Corp - R&D','Corp - Bank Fees',
  'Corp - Licenses & Permits',
  'Total Corporate Overhead & Other',
  'EBITDA','Net Income',
];

const JSON_KEYS_SET = new Set(ALL_KEYS);
const ENTITIES = Object.values(SHEET_TO_ENTITY);

// ── Types ────────────────────────────────────────────────────────────────────

type T12Entry = { v: number[]; b: number[]; py: number[]; ytdV: number[]; ytdB: number[]; ytdPy: number[] };
type T12 = Record<string, Record<string, T12Entry>>;

interface DashboardData {
  periods: string[];
  period_keys: string[];
  t12: T12;
}

// ── Extract one xlsx buffer ───────────────────────────────────────────────────

// Recursive formula evaluator for stub cells (t:'z') with stale cached values.
// Some R365 exports store formulas with v:0 instead of the computed result.
// This evaluator resolves cell references recursively so subtotals are correct.
function makeSheetEvaluator(ws: XLSX.WorkSheet[]) {
  const memo = new Map<string, number>();
  const evaluating = new Set<string>();

  function parseCellRef(ref: string): { col: number; row: number } | null {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) return null;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    return { col: col - 1, row: parseInt(m[2]) - 1 };
  }

  function getCellValue(col: number, row: number): number {
    const key = `${col},${row}`;
    if (memo.has(key)) return memo.get(key)!;
    if (evaluating.has(key)) return 0;

    const wsRow = (ws as unknown as XLSX.CellObject[][])[row];
    const cell = wsRow?.[col] as XLSX.CellObject | undefined;
    if (!cell) { memo.set(key, 0); return 0; }

    let val: number;
    if (cell.t === 'n') {
      val = (cell.v as number) ?? 0;
    } else if (cell.t === 'z' && cell.f) {
      evaluating.add(key);
      val = evalExpr(cell.f);
      evaluating.delete(key);
    } else {
      val = 0;
    }
    memo.set(key, val);
    return val;
  }

  function evalExpr(formula: string): number {
    let expr = formula;
    const iferr = expr.match(/^IFERROR\((.+),\s*(?:"[^"]*"|[^,]+)\)$/i);
    if (iferr) expr = iferr[1];

    const tokens = expr.split(/([+\-])/);
    let result = 0, sign = 1;
    for (const tok of tokens) {
      const t = tok.trim();
      if (t === '+') { sign = 1; continue; }
      if (t === '-') { sign = -1; continue; }
      if (!t) continue;
      const ref = parseCellRef(t);
      if (ref) result += sign * getCellValue(ref.col, ref.row);
    }
    return result;
  }

  return { getCellValue };
}

function readNumericCell(row: (XLSX.CellObject | undefined)[], col: number, r: number, ev: ReturnType<typeof makeSheetEvaluator>): number {
  const c = row[col] as XLSX.CellObject | undefined;
  if (!c) return 0;
  if (c.t === 'n') return (c.v as number) ?? 0;
  if (c.t === 'z' && c.f) return ev.getCellValue(col, r);
  return 0;
}

// Returns entity → jsonKey → [actual, budget, priorYear, ytdActual, ytdBudget, ytdPriorYear]
export function extractFromBuffer(buf: Buffer): Record<string, Record<string, [number, number, number, number, number, number]>> {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false, cellFormula: true, sheetStubs: true, dense: true });
  const result: Record<string, Record<string, [number, number, number, number, number, number]>> = {};

  for (const [sheetName, entity] of Object.entries(SHEET_TO_ENTITY)) {
    if (!wb.SheetNames.includes(sheetName)) continue;

    const ws = wb.Sheets[sheetName] as unknown as XLSX.WorkSheet[];
    const ev = makeSheetEvaluator(ws);
    const denseRows = ws as unknown as (XLSX.CellObject | undefined)[][];
    const entityData: Record<string, [number, number, number, number, number, number]> = {};

    for (let r = 0; r < denseRows.length; r++) {
      const row = denseRows[r];
      if (!row) continue;

      const labelCell = row[COL_LABEL] as XLSX.CellObject | undefined;
      if (!labelCell || labelCell.t !== 's') continue;
      const labelStr = String(labelCell.v);

      const jsonKey = EXCEL_TO_JSON[labelStr] ?? (JSON_KEYS_SET.has(labelStr) ? labelStr : null);
      if (!jsonKey || jsonKey in entityData) continue;

      // Get actual value — evaluate formula cells if cached value is stale (0 with formula)
      const actualCell = row[COL_ACTUAL] as XLSX.CellObject | undefined;
      if (!actualCell) continue;

      let actual: number;
      if (actualCell.t === 'n') {
        actual = (actualCell.v as number) ?? 0;
      } else if (actualCell.t === 'z' && actualCell.f) {
        actual = ev.getCellValue(COL_ACTUAL, r);
      } else {
        continue; // string, bool, error — skip
      }

      const budget = readNumericCell(row, COL_BUDGET, r, ev);
      const priorYear = readNumericCell(row, COL_PRIOR_YEAR, r, ev);
      const ytdActual = readNumericCell(row, COL_YTD_ACTUAL, r, ev);
      const ytdBudget = readNumericCell(row, COL_YTD_BUDGET, r, ev);
      const ytdPriorYear = readNumericCell(row, COL_YTD_PRIOR_YEAR, r, ev);

      entityData[jsonKey] = [actual, budget, priorYear, ytdActual, ytdBudget, ytdPriorYear];
    }
    result[entity] = entityData;
  }
  return result;
}

// ── Blank t12 structure ───────────────────────────────────────────────────────

function blankT12(nPeriods: number): T12 {
  const t12: T12 = {};
  for (const entity of ENTITIES) {
    t12[entity] = {};
    for (const key of ALL_KEYS) {
      t12[entity][key] = {
        v: new Array(nPeriods).fill(0),
        b: new Array(nPeriods).fill(0),
        py: new Array(nPeriods).fill(0),
        ytdV: new Array(nPeriods).fill(0),
        ytdB: new Array(nPeriods).fill(0),
        ytdPy: new Array(nPeriods).fill(0),
      };
    }
  }
  return t12;
}

// ── Load / save dashboard-data.json ─────────────────────────────────────────

async function loadDashboardData(periods: PeriodEntry[]): Promise<DashboardData> {
  // Try GitHub first
  if (isGitHubConfigured()) {
    try {
      const fromGH = await getDashboardData<DashboardData>();
      if (fromGH) return fromGH;
    } catch { }
  }
  // Fall back to local file
  try {
    const localPath = path.join(process.cwd(), 'lib', 'dashboard-data.json');
    return JSON.parse(fs.readFileSync(localPath, 'utf8')) as DashboardData;
  } catch { }
  // Bootstrap blank
  return {
    periods: periods.map(p => p.label),
    period_keys: periods.map(p => p.label.replace(/ /g, '_')),
    t12: blankT12(periods.length),
  };
}

async function persistDashboardData(data: DashboardData): Promise<void> {
  if (isGitHubConfigured()) {
    await saveDashboardData(data);
  } else {
    const localPath = path.join(process.cwd(), 'lib', 'dashboard-data.json');
    fs.writeFileSync(localPath, JSON.stringify(data));
  }
}

// ── Apply extracted values into t12 at a specific period index ──────────────

function applyExtracted(
  t12: T12,
  periodIdx: number,
  extracted: Record<string, Record<string, [number, number, number, number, number, number]>>,
): void {
  for (const [entity, keyMap] of Object.entries(extracted)) {
    if (!t12[entity]) continue;
    for (const [jsonKey, [v, b, py, ytdV, ytdB, ytdPy]] of Object.entries(keyMap)) {
      if (!t12[entity][jsonKey]) continue;
      t12[entity][jsonKey].v[periodIdx] = v;
      t12[entity][jsonKey].b[periodIdx] = b;
      t12[entity][jsonKey].py[periodIdx] = py;
      t12[entity][jsonKey].ytdV[periodIdx] = ytdV;
      t12[entity][jsonKey].ytdB[periodIdx] = ytdB;
      t12[entity][jsonKey].ytdPy[periodIdx] = ytdPy;
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

// Called after uploading a replacement file for an existing period.
// Reads current dashboard-data.json, updates only that period's column, saves.
export async function syncOnUpload(period: PeriodEntry, buf: Buffer, allPeriods: PeriodEntry[]): Promise<void> {
  const data = await loadDashboardData(allPeriods);

  // Ensure arrays are long enough (handles edge case where data was bootstrapped short)
  const needed = period.idx + 1;
  for (const entity of Object.keys(data.t12)) {
    for (const key of Object.keys(data.t12[entity])) {
      const entry = data.t12[entity][key];
      if (!entry.ytdV) entry.ytdV = new Array(entry.v.length).fill(0);
      if (!entry.ytdB) entry.ytdB = new Array(entry.v.length).fill(0);
      if (!entry.ytdPy) entry.ytdPy = new Array(entry.v.length).fill(0);
      while (entry.v.length < needed) {
        entry.v.push(0); entry.b.push(0); entry.py.push(0);
        entry.ytdV.push(0); entry.ytdB.push(0); entry.ytdPy.push(0);
      }
    }
  }

  const extracted = extractFromBuffer(buf);
  applyExtracted(data.t12, period.idx, extracted);
  await persistDashboardData(data);
}

// Called after adding a brand-new period.
// Extends all arrays by one slot (for the new period.idx), then fills it.
export async function syncOnAddPeriod(period: PeriodEntry, buf: Buffer, allPeriods: PeriodEntry[]): Promise<void> {
  const data = await loadDashboardData(allPeriods);

  // Add new period metadata
  if (!data.periods.includes(period.label)) {
    data.periods.push(period.label);
    data.period_keys.push(period.label.replace(/ /g, '_'));
  }

  // Extend t12 arrays to cover new idx
  const needed = period.idx + 1;
  for (const entity of ENTITIES) {
    if (!data.t12[entity]) {
      data.t12[entity] = {};
      for (const key of ALL_KEYS) data.t12[entity][key] = { v: [], b: [], py: [], ytdV: [], ytdB: [], ytdPy: [] };
    }
    for (const key of ALL_KEYS) {
      if (!data.t12[entity][key]) data.t12[entity][key] = { v: [], b: [], py: [], ytdV: [], ytdB: [], ytdPy: [] };
      const entry = data.t12[entity][key];
      if (!entry.ytdV) entry.ytdV = new Array(entry.v.length).fill(0);
      if (!entry.ytdB) entry.ytdB = new Array(entry.v.length).fill(0);
      if (!entry.ytdPy) entry.ytdPy = new Array(entry.v.length).fill(0);
      while (entry.v.length < needed) {
        entry.v.push(0); entry.b.push(0); entry.py.push(0);
        entry.ytdV.push(0); entry.ytdB.push(0); entry.ytdPy.push(0);
      }
    }
  }

  const extracted = extractFromBuffer(buf);
  applyExtracted(data.t12, period.idx, extracted);
  await persistDashboardData(data);
}

// Full resync: reads every xlsx file and rebuilds dashboard-data.json from scratch.
export async function fullSync(periods: PeriodEntry[]): Promise<{ warnings: string[] }> {
  const nPeriods = periods.length;
  const t12 = blankT12(nPeriods);
  const warnings: string[] = [];

  for (const period of periods) {
    let buf: Buffer | null = null;
    const localPath = path.join(DATA_DIR, period.filename);
    if (fs.existsSync(localPath)) {
      buf = fs.readFileSync(localPath);
    } else if (isGitHubConfigured()) {
      buf = await getDataFileBuffer(period.filename);
    }

    if (!buf) { warnings.push(`File not found: ${period.filename}`); continue; }

    const extracted = extractFromBuffer(buf);
    applyExtracted(t12, period.idx, extracted);
  }

  const data: DashboardData = {
    periods: periods.map(p => p.label),
    period_keys: periods.map(p => p.label.replace(/ /g, '_')),
    t12,
  };
  await persistDashboardData(data);
  return { warnings };
}
