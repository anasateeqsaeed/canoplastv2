-- Phase 4 Accounting: report functions. All SECURITY INVOKER so the RLS on
-- vouchers/voucher_lines gates who can read financials. Reversed vouchers
-- stay included (their reversal JV nets them out).

create or replace function public.trial_balance(p_from date, p_to date)
returns table(account_id uuid, code text, name text, account_type text, is_group boolean,
              parent_id uuid, opening numeric, period_debit numeric, period_credit numeric, closing numeric)
language sql stable
set search_path to 'public'
as $$
  select a.id, a.code, a.name, a.account_type::text, a.is_group, a.parent_id,
         coalesce(sum(l.debit - l.credit) filter (where v.voucher_date < p_from), 0) as opening,
         coalesce(sum(l.debit)  filter (where v.voucher_date between p_from and p_to), 0) as period_debit,
         coalesce(sum(l.credit) filter (where v.voucher_date between p_from and p_to), 0) as period_credit,
         coalesce(sum(l.debit - l.credit), 0) as closing
    from public.chart_of_accounts a
    join public.voucher_lines l on l.account_id = a.id
    join public.vouchers v on v.id = l.voucher_id
   where v.status in ('posted','reversed')
     and v.voucher_date <= p_to
   group by a.id, a.code, a.name, a.account_type, a.is_group, a.parent_id
   order by a.code
$$;

create or replace function public.profit_and_loss(p_from date, p_to date)
returns table(account_id uuid, code text, name text, account_type text, amount numeric)
language sql stable
set search_path to 'public'
as $$
  select a.id, a.code, a.name, a.account_type::text,
         case when a.account_type = 'income'
              then coalesce(sum(l.credit - l.debit), 0)
              else coalesce(sum(l.debit - l.credit), 0) end as amount
    from public.chart_of_accounts a
    join public.voucher_lines l on l.account_id = a.id
    join public.vouchers v on v.id = l.voucher_id
   where v.status in ('posted','reversed')
     and v.voucher_date between p_from and p_to
     and a.account_type in ('income','expense')
   group by a.id, a.code, a.name, a.account_type
  having round(sum(case when a.account_type = 'income' then l.credit - l.debit else l.debit - l.credit end), 2) <> 0
   order by a.code
$$;

create or replace function public.balance_sheet(p_as_of date)
returns table(section text, account_id uuid, code text, name text, amount numeric)
language sql stable
set search_path to 'public'
as $$
  select a.account_type::text as section, a.id, a.code, a.name,
         case when a.account_type = 'asset'
              then coalesce(sum(l.debit - l.credit), 0)
              else coalesce(sum(l.credit - l.debit), 0) end as amount
    from public.chart_of_accounts a
    join public.voucher_lines l on l.account_id = a.id
    join public.vouchers v on v.id = l.voucher_id
   where v.status in ('posted','reversed')
     and v.voucher_date <= p_as_of
     and a.account_type in ('asset','liability','equity')
   group by a.id, a.code, a.name, a.account_type
  having round(sum(l.debit - l.credit), 2) <> 0
  union all
  select 'equity', null::uuid, '3999', 'Current Earnings (P&L to date)',
         coalesce(sum(case when a.account_type = 'income' then l.credit - l.debit
                           else -(l.debit - l.credit) end), 0)
    from public.chart_of_accounts a
    join public.voucher_lines l on l.account_id = a.id
    join public.vouchers v on v.id = l.voucher_id
   where v.status in ('posted','reversed')
     and v.voucher_date <= p_as_of
     and a.account_type in ('income','expense')
   order by 1, 3
$$;

create or replace function public.account_opening_balance(p_account_id uuid, p_before date)
returns numeric
language sql stable
set search_path to 'public'
as $$
  select coalesce(sum(l.debit - l.credit), 0)
    from public.voucher_lines l
    join public.vouchers v on v.id = l.voucher_id
   where l.account_id = p_account_id
     and v.status in ('posted','reversed')
     and v.voucher_date < p_before
$$;

create or replace function public.general_ledger(p_account_id uuid, p_from date, p_to date)
returns table(entry_date date, voucher_id uuid, voucher_number text, voucher_type text,
              narration text, description text, party_type text, party_id uuid,
              debit numeric, credit numeric, running_balance numeric)
language sql stable
set search_path to 'public'
as $$
  select v.voucher_date, v.id, v.voucher_number, v.voucher_type, v.narration, l.description,
         l.party_type, l.party_id, l.debit, l.credit,
         public.account_opening_balance(p_account_id, p_from)
           + sum(l.debit - l.credit) over (order by v.voucher_date, v.created_at, l.line_no
                                           rows unbounded preceding) as running_balance
    from public.voucher_lines l
    join public.vouchers v on v.id = l.voucher_id
   where l.account_id = p_account_id
     and v.status in ('posted','reversed')
     and v.voucher_date between p_from and p_to
   order by v.voucher_date, v.created_at, l.line_no
$$;

-- Customer / vendor statement from party-tagged control-account lines.
create or replace function public.party_opening_balance(p_party_type text, p_party_id uuid, p_before date)
returns numeric
language sql stable
set search_path to 'public'
as $$
  select coalesce(sum(l.debit - l.credit), 0)
    from public.voucher_lines l
    join public.vouchers v on v.id = l.voucher_id
   where l.party_type = p_party_type and l.party_id = p_party_id
     and v.status in ('posted','reversed')
     and v.voucher_date < p_before
$$;

create or replace function public.party_ledger(p_party_type text, p_party_id uuid, p_from date, p_to date)
returns table(entry_date date, voucher_id uuid, voucher_number text, voucher_type text,
              narration text, description text, debit numeric, credit numeric, running_balance numeric)
language sql stable
set search_path to 'public'
as $$
  select v.voucher_date, v.id, v.voucher_number, v.voucher_type, v.narration, l.description,
         l.debit, l.credit,
         public.party_opening_balance(p_party_type, p_party_id, p_from)
           + sum(l.debit - l.credit) over (order by v.voucher_date, v.created_at, l.line_no
                                           rows unbounded preceding) as running_balance
    from public.voucher_lines l
    join public.vouchers v on v.id = l.voucher_id
   where l.party_type = p_party_type and l.party_id = p_party_id
     and v.status in ('posted','reversed')
     and v.voucher_date between p_from and p_to
   order by v.voucher_date, v.created_at, l.line_no
$$;

create or replace function public.ar_aging(p_as_of date)
returns table(client_id uuid, client_name text, current_0_30 numeric, days_31_60 numeric,
              days_61_90 numeric, days_over_90 numeric, total_outstanding numeric)
language sql stable
set search_path to 'public'
as $$
  select c.id, c.name,
         coalesce(sum(i.total_amount - i.amount_paid) filter (where p_as_of - i.invoice_date <= 30), 0),
         coalesce(sum(i.total_amount - i.amount_paid) filter (where p_as_of - i.invoice_date between 31 and 60), 0),
         coalesce(sum(i.total_amount - i.amount_paid) filter (where p_as_of - i.invoice_date between 61 and 90), 0),
         coalesce(sum(i.total_amount - i.amount_paid) filter (where p_as_of - i.invoice_date > 90), 0),
         coalesce(sum(i.total_amount - i.amount_paid), 0)
    from public.clients c
    join public.sales_invoices i on i.client_id = c.id
   where i.status = 'issued'
     and i.invoice_date <= p_as_of
     and i.total_amount - i.amount_paid > 0.005
   group by c.id, c.name
   order by 7 desc
$$;

create or replace function public.ap_aging(p_as_of date)
returns table(supplier_id uuid, supplier_name text, current_0_30 numeric, days_31_60 numeric,
              days_61_90 numeric, days_over_90 numeric, total_outstanding numeric)
language sql stable
set search_path to 'public'
as $$
  select s.id, s.name,
         coalesce(sum(b.total_amount - b.amount_paid) filter (where p_as_of - b.bill_date <= 30), 0),
         coalesce(sum(b.total_amount - b.amount_paid) filter (where p_as_of - b.bill_date between 31 and 60), 0),
         coalesce(sum(b.total_amount - b.amount_paid) filter (where p_as_of - b.bill_date between 61 and 90), 0),
         coalesce(sum(b.total_amount - b.amount_paid) filter (where p_as_of - b.bill_date > 90), 0),
         coalesce(sum(b.total_amount - b.amount_paid), 0)
    from public.suppliers s
    join public.ap_bills b on b.supplier_id = s.id
   where b.status = 'posted'
     and b.bill_date <= p_as_of
     and b.total_amount - b.amount_paid > 0.005
   group by s.id, s.name
   order by 7 desc
$$;
