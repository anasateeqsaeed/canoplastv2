-- The July 12 v1-data import dropped doc_counters/next_doc_number, breaking
-- GRN/PO/requisition/lot numbering. Restore them exactly as phase 2 defined.
create table if not exists public.doc_counters (
  doc_type text primary key,
  prefix text not null,
  last_number int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.doc_counters enable row level security;

drop policy if exists "doc_counters_select_authenticated" on public.doc_counters;
create policy "doc_counters_select_authenticated"
  on public.doc_counters for select to authenticated using (true);

create or replace function public.next_doc_number(_doc_type text, _prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num int;
begin
  insert into public.doc_counters (doc_type, prefix, last_number)
  values (_doc_type, _prefix, 1)
  on conflict (doc_type) do update
    set last_number = public.doc_counters.last_number + 1,
        updated_at = now()
  returning last_number into v_num;
  return _prefix || '-' || to_char(now(), 'YYMM') || '-' || lpad(v_num::text, 4, '0');
end;
$$;
