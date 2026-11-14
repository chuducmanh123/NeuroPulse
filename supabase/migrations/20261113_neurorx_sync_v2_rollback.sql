-- NeuroRx Sync v2 — Phase 1 Rollback Script
-- Removes ONLY Sync v2 objects created by 20261113_neurorx_sync_v2.sql.

BEGIN;

do $$
begin
  alter publication supabase_realtime drop table public.neurorx_sync_state;
exception
  when undefined_object then null;
  when undefined_table then null;
end
$$;

drop function if exists public.neurorx_purge();
drop function if exists public.neurorx_changes_since(bigint, int);
drop function if exists public.neurorx_restore_revision(uuid, int, int, text, jsonb, jsonb, text);
drop function if exists public.neurorx_delete_drug(uuid, int, text);
drop function if exists public.neurorx_update_drug(uuid, int, jsonb, text, jsonb, jsonb, text);
drop function if exists public.neurorx_create_drug(jsonb, text, jsonb, text, boolean);
drop function if exists public.neurorx_recompute_root_hash();

drop table if exists public.neurorx_drug_revisions;
drop table if exists public.neurorx_drug_records;
drop table if exists public.neurorx_sync_state;
drop table if exists public.neurorx_sync_config;

drop sequence if exists public.neurorx_change_seq;

COMMIT;
