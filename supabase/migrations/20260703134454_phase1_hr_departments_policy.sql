-- HR managers can also maintain departments (parity with v1).
create policy "departments_write_hr_manager"
  on public.departments for insert to authenticated
  with check (public.has_role(auth.uid(), 'hr_manager'));

create policy "departments_update_hr_manager"
  on public.departments for update to authenticated
  using (public.has_role(auth.uid(), 'hr_manager'));
