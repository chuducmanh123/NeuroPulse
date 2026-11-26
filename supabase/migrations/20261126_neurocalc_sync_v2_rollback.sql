-- NeuroCalc Sync v2 — Rollback Script
-- Removes ONLY Sync v2 objects created by 20261126_neurocalc_sync_v2.sql.

BEGIN;

do $$
begin
  alter publication supabase_realtime drop table public.neurocalc_sync_state;
exception
  when undefined_object then null;
  when undefined_table then null;
end
$$;

drop function if exists public.neurocalc_purge();
drop function if exists public.neurocalc_changes_since(bigint, int);
drop function if exists public.neurocalc_restore_revision(uuid, int, int, text, jsonb, jsonb, text);
drop function if exists public.neurocalc_delete_scale(uuid, int, text);
drop function if exists public.neurocalc_update_scale(uuid, int, jsonb, text, jsonb, jsonb, text);
drop function if exists public.neurocalc_create_scale(jsonb, text, jsonb, text, boolean);
drop function if exists public.neurocalc_recompute_root_hash();

drop table if exists public.neurocalc_scale_revisions;
drop table if exists public.neurocalc_scale_records;
drop table if exists public.neurocalc_sync_state;
drop table if exists public.neurocalc_sync_config;

drop sequence if exists public.neurocalc_change_seq;

COMMIT;
