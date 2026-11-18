-- NeuroGuide Sync v2 — Phase 8.1 Rollback Script
-- Removes ONLY NeuroGuide Sync v2 objects created by 20261118_neuroguide_granular_sync_v2.sql.
-- Never touches legacy neuroguide_docs or neurorx_* tables.

BEGIN;

do $$
begin
  alter publication supabase_realtime drop table public.neuroguide_sync_state;
exception
  when undefined_object then null;
  when undefined_table then null;
end
$$;

drop function if exists public.neuroguide_purge();
drop function if exists public.neuroguide_protocol_changes_since(bigint, int);
drop function if exists public.neuroguide_changes_since(bigint, int);
drop function if exists public.neuroguide_query_blocks_by_facets(jsonb);
drop function if exists public.neuroguide_replace_block_links(jsonb, boolean);
drop function if exists public.neuroguide_restore_block_revision(uuid, int, int, text, jsonb, jsonb, text);
drop function if exists public.neuroguide_delete_block(uuid, int, text);
drop function if exists public.neuroguide_update_block(uuid, int, jsonb, text, jsonb, jsonb, text);
drop function if exists public.neuroguide_create_block(jsonb, text, jsonb, text, uuid, boolean);
drop function if exists public.neuroguide_delete_protocol(uuid, int, text);
drop function if exists public.neuroguide_upsert_protocol(text, text, text, int, text, text, jsonb, jsonb, uuid[], text, jsonb, text, uuid, int, boolean);
drop function if exists public.neuroguide_recompute_affected_protocols(uuid, bigint);
drop function if exists public.neuroguide_recompute_root_hash();
drop function if exists public.neuroguide_recompute_protocol_hash(uuid);

drop table if exists public.neuroguide_block_links;
drop table if exists public.neuroguide_protocol_blocks;
drop table if exists public.neuroguide_block_revisions;
drop table if exists public.neuroguide_protocols;
drop table if exists public.neuroguide_content_blocks;
drop table if exists public.neuroguide_sync_state;
drop table if exists public.neuroguide_sync_config;

drop sequence if exists public.neuroguide_change_seq;

COMMIT;
