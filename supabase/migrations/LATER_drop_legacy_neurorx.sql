-- ============================================================================
-- WARNING: DO NOT RUN THIS SCRIPT IMMEDIATELY AT CUTOVER!
-- Wait at least 30 days after Phase 7 cutover (once production Sync v2 stability
-- and backups are confirmed). Running this permanently removes legacy drug data
-- stored in `neuroguide_docs` and drops `public.neurorx_drugs`.
-- ============================================================================

begin;

-- 1. Remove legacy NeuroRx records persisted inside `neuroguide_docs`
delete from public.neuroguide_docs
where id in ('neurorx_system_deleted_drugs', 'neurorx_interactions')
   or id like 'neurorx_drug_%';

-- 2. Drop legacy dedicated table if present
drop table if exists public.neurorx_drugs;

commit;
