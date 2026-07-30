// Shared P&L line-item hierarchy for the Full P&L panel and its Excel export.
// Framework-agnostic (no 'use client'/React) so both the client component and
// the server-side export route can import it without duplicating the config.

export interface SubItem { lbl: string; key: string; children?: SubItem[]; subKey?: string; }
export interface GrpRow { lbl: string; key: string; sub?: SubItem[]; useEntity?: string; }
export type GroupEntry = GrpRow & { type?: 'total' | 'sec'; isExp?: boolean };

export const ALL_LOCS = ['Ballpark', 'MVT', 'National Landing', 'Mosaic', 'Rockville'];
export const SELECT_OPTIONS = ['all', 'Consolidated', ...ALL_LOCS];

// Groups whose Var % vs Bud/PY is Actual% of sales minus Budget/PY% of sales
// (a percentage-point diff), not the relative $ variance used elsewhere —
// applies to the whole subtree under these keys.
export const PCT_LINE_KEYS = new Set(['Total Cost of Goods Sold', 'Total Payroll Expenses']);

// Groups classified as expenses for variance coloring (positive var = unfavorable/red).
// Everything else (Sales-related rows, profit subtotals) is treated as non-expense
// (positive var = favorable/green).
export const EXPENSE_KEYS = new Set([
  'Total Cost of Goods Sold',
  'Total Payroll Expenses',
  'Total Operating Expense',
  'Total Occupancy Cost',
  'Total Corporate Overhead & Other',
]);

export const GROUPS: GroupEntry[] = [
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
  { lbl: 'Total COGS', key: 'Total Cost of Goods Sold', isExp: true, sub: [
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
  { lbl: 'Total Payroll Expenses', key: 'Total Payroll Expenses', isExp: true, sub: [
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
  { lbl: 'Total Operating Expense', key: 'Total Operating Expense', isExp: true, sub: [
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
  { lbl: 'Total Occupancy Cost', key: 'Total Occupancy Cost', isExp: true, sub: [
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
  { lbl: 'Corporate Overhead', key: 'Total Corporate Overhead & Other', useEntity: 'RASA Worldwide', isExp: true, sub: [
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
