-- Phase 2 follow-up: the Stock Adjustment Log page (ported from v1) lets admins
-- edit and delete adjustment entries; add the missing RLS policies.
create policy "stock_adj_update_admin"
  on public.stock_adjustment_log for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "stock_adj_delete_admin"
  on public.stock_adjustment_log for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
