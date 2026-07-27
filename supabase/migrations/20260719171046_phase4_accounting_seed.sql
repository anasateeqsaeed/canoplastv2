-- Phase 4 Accounting: seed chart of accounts (plan §3.1) + FY 2026 calendar.
do $$
declare
  fy_id uuid;
begin
  -- ===== Chart of Accounts =====
  -- level 1 classes
  insert into public.chart_of_accounts (code, name, account_type, is_group) values
    ('1000', 'Assets', 'asset', true),
    ('2000', 'Liabilities', 'liability', true),
    ('3000', 'Equity', 'equity', true),
    ('4000', 'Income', 'income', true),
    ('5000', 'Expenses', 'expense', true);

  -- Assets
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('1100', 'Current Assets', 'asset', true,  (select id from public.chart_of_accounts where code = '1000'), null),
    ('1200', 'Fixed Assets',   'asset', true,  (select id from public.chart_of_accounts where code = '1000'), null);
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('1110', 'Cash & Cash Equivalents', 'asset', true, (select id from public.chart_of_accounts where code = '1100'), null),
    ('1120', 'Bank Accounts', 'asset', true, (select id from public.chart_of_accounts where code = '1100'), 'BANK_GROUP'),
    ('1130', 'Trade Debtors', 'asset', false, (select id from public.chart_of_accounts where code = '1100'), 'AR_CONTROL'),
    ('1140', 'Advances & Prepayments', 'asset', true, (select id from public.chart_of_accounts where code = '1100'), null),
    ('1150', 'Stock in Hand', 'asset', true, (select id from public.chart_of_accounts where code = '1100'), null),
    ('1160', 'GST Input (Receivable)', 'asset', false, (select id from public.chart_of_accounts where code = '1100'), 'GST_INPUT');
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('1111', 'Cash in Hand', 'asset', false, (select id from public.chart_of_accounts where code = '1110'), 'CASH_IN_HAND'),
    ('1112', 'Petty Cash', 'asset', false, (select id from public.chart_of_accounts where code = '1110'), null),
    ('1141', 'Advances to Suppliers', 'asset', false, (select id from public.chart_of_accounts where code = '1140'), null),
    ('1142', 'Advances to Employees', 'asset', false, (select id from public.chart_of_accounts where code = '1140'), 'EMP_ADVANCES'),
    ('1151', 'Raw Material Stock', 'asset', false, (select id from public.chart_of_accounts where code = '1150'), 'RM_STOCK'),
    ('1152', 'Work in Process', 'asset', false, (select id from public.chart_of_accounts where code = '1150'), 'WIP_STOCK'),
    ('1153', 'Finished Goods Stock', 'asset', false, (select id from public.chart_of_accounts where code = '1150'), 'FG_STOCK'),
    ('1154', 'Packing Material Stock', 'asset', false, (select id from public.chart_of_accounts where code = '1150'), null),
    ('1210', 'Machinery & Equipment', 'asset', false, (select id from public.chart_of_accounts where code = '1200'), null),
    ('1220', 'Molds & Dies', 'asset', false, (select id from public.chart_of_accounts where code = '1200'), null),
    ('1230', 'Factory Building & Improvements', 'asset', false, (select id from public.chart_of_accounts where code = '1200'), null),
    ('1240', 'Vehicles', 'asset', false, (select id from public.chart_of_accounts where code = '1200'), null),
    ('1250', 'Office Equipment & Furniture', 'asset', false, (select id from public.chart_of_accounts where code = '1200'), null),
    ('1260', 'Accumulated Depreciation', 'asset', false, (select id from public.chart_of_accounts where code = '1200'), null);

  -- Liabilities
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('2100', 'Current Liabilities', 'liability', true, (select id from public.chart_of_accounts where code = '2000'), null),
    ('2200', 'Long Term Liabilities', 'liability', true, (select id from public.chart_of_accounts where code = '2000'), null);
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('2110', 'Trade Creditors', 'liability', false, (select id from public.chart_of_accounts where code = '2100'), 'AP_CONTROL'),
    ('2120', 'Salaries & Wages Payable', 'liability', false, (select id from public.chart_of_accounts where code = '2100'), 'SALARIES_PAYABLE'),
    ('2130', 'Utilities Payable (KE / SSGC)', 'liability', false, (select id from public.chart_of_accounts where code = '2100'), null),
    ('2140', 'Advances from Customers', 'liability', false, (select id from public.chart_of_accounts where code = '2100'), null),
    ('2150', 'GST Output (Payable)', 'liability', false, (select id from public.chart_of_accounts where code = '2100'), 'GST_OUTPUT'),
    ('2160', 'Withholding Tax Payable', 'liability', false, (select id from public.chart_of_accounts where code = '2100'), null),
    ('2210', 'Loans Payable', 'liability', false, (select id from public.chart_of_accounts where code = '2200'), null);

  -- Equity
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('3100', 'Owner''s Capital', 'equity', false, (select id from public.chart_of_accounts where code = '3000'), null),
    ('3200', 'Owner''s Drawings', 'equity', false, (select id from public.chart_of_accounts where code = '3000'), null),
    ('3300', 'Retained Earnings', 'equity', false, (select id from public.chart_of_accounts where code = '3000'), 'RETAINED_EARNINGS'),
    ('3900', 'Opening Balance Equity', 'equity', false, (select id from public.chart_of_accounts where code = '3000'), 'OPENING_BALANCE');

  -- Income
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('4100', 'Labour Rate Income — Blow Molding', 'income', false, (select id from public.chart_of_accounts where code = '4000'), null),
    ('4200', 'Labour Rate Income — Pouch / Sangla', 'income', false, (select id from public.chart_of_accounts where code = '4000'), null),
    ('4300', 'Product Sales', 'income', false, (select id from public.chart_of_accounts where code = '4000'), 'SALES_INCOME'),
    ('4400', 'Scrap Sales', 'income', false, (select id from public.chart_of_accounts where code = '4000'), null),
    ('4900', 'Other Income', 'income', false, (select id from public.chart_of_accounts where code = '4000'), null);

  -- Expenses
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('5100', 'Cost of Goods Sold', 'expense', true, (select id from public.chart_of_accounts where code = '5000'), null),
    ('5200', 'Admin Expenses', 'expense', true, (select id from public.chart_of_accounts where code = '5000'), null),
    ('5300', 'Selling & Distribution', 'expense', true, (select id from public.chart_of_accounts where code = '5000'), null),
    ('5400', 'Financial Charges', 'expense', true, (select id from public.chart_of_accounts where code = '5000'), null),
    ('5900', 'Miscellaneous Expenses', 'expense', false, (select id from public.chart_of_accounts where code = '5000'), null);
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('5110', 'Raw Material Consumed', 'expense', false, (select id from public.chart_of_accounts where code = '5100'), 'RM_CONSUMED'),
    ('5120', 'Direct Labour (Salaries & Wages)', 'expense', false, (select id from public.chart_of_accounts where code = '5100'), 'SALARY_EXPENSE'),
    ('5130', 'Factory Overheads', 'expense', true, (select id from public.chart_of_accounts where code = '5100'), null),
    ('5210', 'Admin Salaries', 'expense', false, (select id from public.chart_of_accounts where code = '5200'), null),
    ('5220', 'Office & Admin Expenses', 'expense', false, (select id from public.chart_of_accounts where code = '5200'), null),
    ('5230', 'Communication & Internet', 'expense', false, (select id from public.chart_of_accounts where code = '5200'), null),
    ('5310', 'Transport & Freight', 'expense', false, (select id from public.chart_of_accounts where code = '5300'), null),
    ('5320', 'Marketing & Business Development', 'expense', false, (select id from public.chart_of_accounts where code = '5300'), null),
    ('5410', 'Bank Charges', 'expense', false, (select id from public.chart_of_accounts where code = '5400'), null),
    ('5420', 'Markup / Interest', 'expense', false, (select id from public.chart_of_accounts where code = '5400'), null);
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id, system_key) values
    ('5131', 'Electricity (KE)', 'expense', false, (select id from public.chart_of_accounts where code = '5130'), null),
    ('5132', 'Gas (SSGC)', 'expense', false, (select id from public.chart_of_accounts where code = '5130'), null),
    ('5133', 'Repairs & Maintenance', 'expense', false, (select id from public.chart_of_accounts where code = '5130'), null),
    ('5134', 'Depreciation Expense', 'expense', false, (select id from public.chart_of_accounts where code = '5130'), null),
    ('5135', 'Factory Supplies & Consumables', 'expense', false, (select id from public.chart_of_accounts where code = '5130'), null);

  -- ===== Fiscal year 2026 (calendar year) with 12 monthly periods =====
  insert into public.fiscal_years (year_label, start_date, end_date)
  values ('FY 2026', '2026-01-01', '2026-12-31')
  returning id into fy_id;

  insert into public.accounting_periods (fiscal_year_id, period_no, name, start_date, end_date)
  select fy_id,
         gs.n,
         to_char(make_date(2026, gs.n, 1), 'Mon YYYY'),
         make_date(2026, gs.n, 1),
         (make_date(2026, gs.n, 1) + interval '1 month - 1 day')::date
    from generate_series(1, 12) as gs(n);
end $$;
