-- Realtime: stream row changes for the suppliers master so the UI can stay
-- live across users (see src/hooks/useRealtimeSync.ts, wired in SupplierMaster).
--
-- REPLICA IDENTITY FULL ensures UPDATE/DELETE events carry the full old row.
-- Row Level Security still governs which changes each client receives.

alter table public.suppliers replica identity full;

-- Idempotent add: skip if the table is already part of the publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'suppliers'
  ) then
    alter publication supabase_realtime add table public.suppliers;
  end if;
end
$$;
