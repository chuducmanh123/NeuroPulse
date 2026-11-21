-- ============================================================================
-- WARNING: DO NOT RUN THIS SCRIPT IMMEDIATELY AT CUTOVER!
-- Wait at least 30 days after Phase 8 cutover (once production NeuroGuide Sync v2
-- stability and backups are confirmed). Running this permanently removes legacy
-- NeuroGuide records stored in `public.neuroguide_docs`.
-- ============================================================================

begin;

-- Remove legacy NeuroGuide documents & system scenario records stored inside `neuroguide_docs`
-- while preserving any remaining rows belonging to other apps if not yet dropped.
delete from public.neuroguide_docs
where id not like 'neurorx_%';

commit;
