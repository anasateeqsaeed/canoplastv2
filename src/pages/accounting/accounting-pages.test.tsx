/**
 * Render smoke test for the Phase 4 accounting screens.
 *
 * Supabase is mocked, so this proves the pages mount, their hooks wire up and
 * their empty states render — it does not exercise the posting logic, which
 * lives in Postgres functions and is covered by DB-level checks.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chartOfAccounts = [
  { id: 'a1', code: '1000', name: 'Assets', account_type: 'asset', parent_id: null, is_group: true, system_key: null, description: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'a2', code: '1130', name: 'Trade Debtors', account_type: 'asset', parent_id: 'a1', is_group: false, system_key: 'AR_CONTROL', description: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'a3', code: '1111', name: 'Cash in Hand', account_type: 'asset', parent_id: 'a1', is_group: false, system_key: 'CASH_IN_HAND', description: null, is_active: true, created_at: '', updated_at: '' },
];

const tableData: Record<string, unknown[]> = {
  chart_of_accounts: chartOfAccounts,
  vouchers: [
    { id: 'v1', voucher_type: 'JV', voucher_number: 'JV-2026-0001', voucher_date: '2026-07-01', status: 'posted', narration: 'Test entry', reference: null, source_table: null, source_id: null, reversal_of: null, created_by: null, posted_by: null, posted_at: null, created_at: '' },
  ],
  voucher_lines: [],
  ar_receipts: [],
  ap_bills: [],
  ap_payments: [],
  bank_accounts: [],
  cheque_register: [],
  sales_invoices: [],
  fiscal_years: [
    {
      id: 'fy1', year_label: 'FY 2026', start_date: '2026-01-01', end_date: '2026-12-31', status: 'open',
      accounting_periods: [
        { id: 'p1', fiscal_year_id: 'fy1', period_no: 1, name: 'Jan 2026', start_date: '2026-01-01', end_date: '2026-01-31', status: 'open' },
      ],
    },
  ],
  clients: [],
  suppliers: [],
};

/** Chainable PostgREST-ish stub that resolves to the fixture rows for a table. */
function makeQuery(table: string) {
  const rows = tableData[table] ?? [];
  const result = { data: rows, error: null };
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'gte', 'lte', 'is', 'or', 'order', 'limit', 'insert', 'update', 'delete', 'in']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => ({ data: rows[0] ?? null, error: null }));
  chain.maybeSingle = vi.fn(async () => ({ data: rows[0] ?? null, error: null }));
  chain.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const rpcResults: Record<string, unknown> = {
  trial_balance: [],
  profit_and_loss: [],
  balance_sheet: [],
  general_ledger: [],
  party_ledger: [],
  ar_aging: [],
  ap_aging: [],
  account_opening_balance: 0,
  party_opening_balance: 0,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeQuery(table),
    rpc: vi.fn(async (fn: string) => ({ data: rpcResults[fn] ?? null, error: null })),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'admin@canoplast.local' },
    session: null,
    roles: ['admin'],
    rolesLoading: false,
    sessionLoading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMyPermissions', () => ({
  useMyPermissions: () => ({ canViewModule: () => true, isAdmin: true, isLoading: false }),
}));

import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import AccountingDashboard from './AccountingDashboard';
import ChartOfAccounts from './ChartOfAccounts';
import JournalEntries from './JournalEntries';
import Receivables from './Receivables';
import Payables from './Payables';
import Banking from './Banking';
import FinancialReports from './FinancialReports';
import FiscalPeriods from './FiscalPeriods';

function renderPage(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <MemoryRouter>{ui}</MemoryRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('accounting pages', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const cases: Array<[string, React.ReactElement, string | RegExp]> = [
    ['dashboard', <AccountingDashboard />, /Recent Vouchers/i],
    ['chart of accounts', <ChartOfAccounts />, /Chart of Accounts/i],
    ['journal entries', <JournalEntries />, /JV-2026-0001/],
    ['receivables', <Receivables />, /Receipts/i],
    ['payables', <Payables />, /Bills/i],
    ['banking', <Banking />, /Cheque Register/i],
    ['financial reports', <FinancialReports />, /Trial Balance/i],
    ['fiscal periods', <FiscalPeriods />, /FY 2026/],
  ];

  it.each(cases)('%s renders without React errors', async (_name, ui, expected) => {
    renderPage(ui);
    await waitFor(() => expect(screen.getAllByText(expected).length).toBeGreaterThan(0));
    const reactErrors = consoleError.mock.calls.filter((c) =>
      /Warning|key|hook|Cannot read|undefined/i.test(String(c[0])),
    );
    expect(reactErrors).toEqual([]);
  });
});
