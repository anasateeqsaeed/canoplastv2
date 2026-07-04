-- Tighten two overly-permissive INSERT policies flagged by the security linter.
drop policy "Admins can insert profiles" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated with check (auth.uid() = user_id);

drop policy "Authenticated users can insert role activity log" on public.role_activity_log;
create policy "Admins can insert role activity log"
  on public.role_activity_log for insert
  to authenticated with check (public.has_role(auth.uid(), 'admin'));
