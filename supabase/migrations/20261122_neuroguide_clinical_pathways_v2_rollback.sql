-- Rollback for NeuroGuide Clinical Pathways Sync v2 Extension
-- Restores original CHECK constraints and drops neuroguide_restore_protocol.

BEGIN;

drop function if exists public.neuroguide_restore_protocol(uuid, int, text);

alter table public.neuroguide_protocol_blocks
  drop constraint if exists neuroguide_protocol_blocks_role_check;

alter table public.neuroguide_protocol_blocks
  add constraint neuroguide_protocol_blocks_role_check
  check (role in ('recommendation', 'shared', 'trial', 'scenario', 'atom'));

alter table public.neuroguide_content_blocks
  drop constraint if exists neuroguide_content_blocks_block_type_check;

alter table public.neuroguide_content_blocks
  add constraint neuroguide_content_blocks_block_type_check
  check (
    block_type in (
      'recommendation',
      'shared_clinical_block',
      'pivotal_trial',
      'late_breaking_trial',
      'clinical_scenario',
      'recommendation_atom'
    )
  );

alter table public.neuroguide_protocols
  drop constraint if exists neuroguide_protocols_protocol_type_check;

alter table public.neuroguide_protocols
  add constraint neuroguide_protocols_protocol_type_check
  check (protocol_type in ('guideline', 'conference', 'scenario_catalog'));

COMMIT;
