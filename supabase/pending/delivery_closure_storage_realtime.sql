-- NOT APPLIED. The Order Closure frontend was built without changing the
-- database; these two things are needed for every feature to work fully.
-- Review, then apply via the Supabase SQL editor / MCP and export it into
-- supabase/migrations/ as usual.

-- 1) Storage bucket for signed-DC (POD) and bilty photos.
--    The app saves the public URL into dispatch_delivery_confirmations.pod_url / bilty_url.
--    Until this exists, photo upload shows "bucket not set up"; the rest of the form saves.
insert into storage.buckets (id, name, public)
values ('delivery-proofs', 'delivery-proofs', true)
on conflict (id) do nothing;

create policy "Auth upload delivery proofs" on storage.objects
  for insert to authenticated with check (bucket_id = 'delivery-proofs');
create policy "Auth update delivery proofs" on storage.objects
  for update to authenticated using (bucket_id = 'delivery-proofs');
create policy "Read delivery proofs" on storage.objects
  for select using (bucket_id = 'delivery-proofs');

-- 2) Realtime: the UI subscribes to these, but they are not in the
--    supabase_realtime publication yet, so they emit nothing today.
alter publication supabase_realtime add table public.sales_invoices;
alter publication supabase_realtime add table public.dispatch_delivery_confirmations;
alter publication supabase_realtime add table public.sales_invoice_dispatches;
alter publication supabase_realtime add table public.ar_receipt_allocations;
alter publication supabase_realtime add table public.so_readiness_weights;
