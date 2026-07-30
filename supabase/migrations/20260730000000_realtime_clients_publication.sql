-- Realtime: stream row changes for the clients master so the UI can stay
-- live across users (see src/hooks/useRealtimeSync.ts). Adding the table to
-- the supabase_realtime publication is what makes postgres_changes fire.
--
-- REPLICA IDENTITY FULL ensures UPDATE/DELETE events carry the full old row,
-- not just the primary key — useful for any consumer that reads payload.old.
-- Row Level Security still governs which changes each client is allowed to
-- receive, so this does not widen data access.

alter table public.clients replica identity full;

-- Idempotent add: skip if the table is already part of the publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clients'
  ) then
    alter publication supabase_realtime add table public.clients;
  end if;
end
$$;
