-- NeuroGuide Sync v2 — Phase 8.1 Self-Contained SQL Verification Suite (T1–T12)
-- Run in Supabase Dashboard -> SQL Editor AFTER running 20261118_neuroguide_granular_sync_v2.sql.
-- Wrapped in BEGIN ... ROLLBACK so zero test data persists.

BEGIN;

do $$
declare
  v_start_seq        bigint;
  v_uid_alpha        uuid;
  v_uid_reborn       uuid;
  v_uid_shared       uuid;
  v_uid_ich          uuid;
  v_uid_trial        uuid;
  v_uid_beta         uuid;
  v_uid_revtest      uuid;
  v_proto_aha_ais    uuid;
  v_proto_eso_ais    uuid;
  v_proto_aha_ich    uuid;
  v_hash_aha_ais_1   text;
  v_hash_eso_ais_1   text;
  v_hash_aha_ich_1   text;
  v_seq_aha_ich_1    bigint;
  v_seq1             bigint;
  v_seq2             bigint;
  v_seq_del          bigint;
  v_root1            text;
  v_root2            text;
  v_row              record;
  v_proto_row        record;
  v_rev_row          record;
  v_count            int;
  v_links_upserted   int;
  v_patch            jsonb;
  v_sec              jsonb;
  v_purge_res        jsonb;
  v_page_count       int;
  v_prev_seq         bigint;
  v_last_page_seq    bigint;
  v_rev_before_cnt   int;
  v_rev_after_cnt    int;
  v_rev_kept         int[];
  v_anon_blocked     boolean;
  v_anon_count       int;
begin
  select s.max_seq into v_start_seq from public.neuroguide_sync_state s where s.id = 1;

  -- -------------------------------------------------------------------------
  -- T1: create granular blocks + shared clinical block + 3 protocols
  --     -> rev=1, seq>0, insert revision, section_hashes, Tier-2 protocol_hash, Tier-1 root_hash
  -- -------------------------------------------------------------------------
  v_sec := '{"payload":"h_pay_a1","facetIndex":"h_fac_a1","meta":"h_met_a1"}'::jsonb;
  select * into v_row from public.neuroguide_create_block(
    '{
      "blockKey": "rec-zz-alpha-1",
      "blockType": "recommendation",
      "payload": {"kind": "recommendation", "practiceChange": {"id": "zz-alpha-1", "status": "draft", "currentText": "Alpha rec"}},
      "facetIndex": {
        "subspecialties": ["stroke", "neurocritical_care"],
        "conditionIds": ["ais"],
        "domains": ["treatment"],
        "timeWindowIds": ["0-4.5h"],
        "interventionTags": ["iv_thrombolysis"],
        "citedTrialKeys": ["ECASS III", "ecassiii"],
        "direction": "recommended"
      }
    }'::jsonb,
    'hash_block_alpha_1',
    v_sec,
    'sql-test'
  );
  if v_row.rev <> 1 or v_row.change_seq <= 0 or v_row.unchanged is not false or v_row.section_hashes <> v_sec then
    raise exception 'T1 FAILED: unexpected alpha block fields rev=%, seq=%, unchanged=%', v_row.rev, v_row.change_seq, v_row.unchanged;
  end if;
  v_uid_alpha := v_row.uid;
  v_seq1 := v_row.change_seq;

  select count(*) into v_count
  from public.neuroguide_block_revisions rv
  where rv.uid = v_uid_alpha and rv.rev = 1 and rv.op = 'insert';
  if v_count <> 1 then
    raise exception 'T1 FAILED: expected 1 insert revision row for alpha block, found %', v_count;
  end if;

  select * into v_row from public.neuroguide_create_block(
    '{
      "blockKey": "shared:zz-alteplase",
      "blockType": "shared_clinical_block",
      "payload": {"kind": "shared_clinical_block", "practiceChange": {"id": "zz-alteplase", "status": "verified", "currentText": "Alteplase 0.9 mg/kg"}},
      "facetIndex": {
        "subspecialties": ["stroke", "vascular"],
        "conditionIds": ["ais"],
        "domains": ["treatment"],
        "timeWindowIds": ["0-4.5h", "4.5-9h"],
        "interventionTags": ["iv_thrombolysis"],
        "citedTrialKeys": ["ECASS III", "EXTEND", "ecassiii", "extend"],
        "direction": "recommended"
      }
    }'::jsonb,
    'hash_block_shared_1',
    '{"payload":"h_shared_1"}'::jsonb,
    'sql-test'
  );
  v_uid_shared := v_row.uid;

  select * into v_row from public.neuroguide_create_block(
    '{
      "blockKey": "rec-zz-ich-1",
      "blockType": "recommendation",
      "payload": {"kind": "recommendation", "practiceChange": {"id": "zz-ich-1", "status": "draft", "currentText": "ICH BP target <140"}},
      "facetIndex": {
        "subspecialties": ["stroke", "neurocritical_care"],
        "conditionIds": ["ich"],
        "domains": ["treatment"],
        "timeWindowIds": ["0-6h"],
        "interventionTags": ["bp_lowering"],
        "citedTrialKeys": ["INTERACT2", "interact2"],
        "direction": "recommended"
      }
    }'::jsonb,
    'hash_block_ich_1',
    '{"payload":"h_ich_1"}'::jsonb,
    'sql-test'
  );
  v_uid_ich := v_row.uid;

  select * into v_row from public.neuroguide_create_block(
    '{
      "blockKey": "trial:zz-ecass3",
      "blockType": "pivotal_trial",
      "payload": {"kind": "pivotal_trial", "trial": {"id": "zz-ecass3", "acronym": "ECASS III"}},
      "facetIndex": {
        "subspecialties": ["stroke"],
        "conditionIds": ["ais"],
        "domains": ["treatment"],
        "timeWindowIds": ["3-4.5h"],
        "interventionTags": ["iv_thrombolysis"],
        "citedTrialKeys": ["ECASS III", "ecassiii"],
        "direction": "unspecified"
      }
    }'::jsonb,
    'hash_trial_ecass3_1',
    '{"payload":"h_trial_1"}'::jsonb,
    'sql-test'
  );
  v_uid_trial := v_row.uid;

  -- Upsert 3 protocols: zz-aha-ais & zz-eso-ais share shared:zz-alteplase; zz-aha-ich is independent
  select * into v_proto_row from public.neuroguide_upsert_protocol(
    'zz-aha-ais',
    'guideline',
    'AHA/ASA',
    2026,
    'AHA Acute Ischemic Stroke Check',
    'published',
    '["stroke"]'::jsonb,
    '{"kind":"guideline","doc":{"id":"zz-aha-ais"}}'::jsonb,
    array[v_uid_alpha, v_uid_shared],
    'meta_hash_aha_ais',
    jsonb_build_array(
      jsonb_build_object('blockUid', v_uid_alpha, 'position', 0, 'sectionPath', '3.1', 'role', 'recommendation'),
      jsonb_build_object('blockUid', v_uid_shared, 'position', 1, 'sectionPath', '3.2', 'role', 'shared')
    ),
    'sql-test'
  );
  if v_proto_row.rev <> 1 or v_proto_row.change_seq <= 0 or coalesce(v_proto_row.protocol_hash, '') = '' then
    raise exception 'T1 FAILED: unexpected zz-aha-ais protocol row';
  end if;
  v_proto_aha_ais := v_proto_row.uid;
  v_hash_aha_ais_1 := v_proto_row.protocol_hash;

  select * into v_proto_row from public.neuroguide_upsert_protocol(
    'zz-eso-ais',
    'guideline',
    'ESO',
    2025,
    'ESO IVT Check',
    'published',
    '["stroke"]'::jsonb,
    '{"kind":"guideline","doc":{"id":"zz-eso-ais"}}'::jsonb,
    array[v_uid_shared],
    'meta_hash_eso_ais',
    '[]'::jsonb,
    'sql-test'
  );
  v_proto_eso_ais := v_proto_row.uid;
  v_hash_eso_ais_1 := v_proto_row.protocol_hash;

  select * into v_proto_row from public.neuroguide_upsert_protocol(
    'zz-aha-ich',
    'guideline',
    'AHA/ASA',
    2022,
    'AHA ICH Check',
    'published',
    '["stroke","neurocritical_care"]'::jsonb,
    '{"kind":"guideline","doc":{"id":"zz-aha-ich"}}'::jsonb,
    array[v_uid_ich],
    'meta_hash_aha_ich',
    '[]'::jsonb,
    'sql-test'
  );
  v_proto_aha_ich := v_proto_row.uid;
  v_hash_aha_ich_1 := v_proto_row.protocol_hash;
  v_seq_aha_ich_1 := v_proto_row.change_seq;

  select s.max_seq, s.root_hash into v_seq2, v_root1
  from public.neuroguide_sync_state s where s.id = 1;
  if v_seq2 < v_seq_aha_ich_1 or coalesce(v_root1, '') = '' then
    raise exception 'T1 FAILED: sync_state invalid max_seq=%, root_hash=%', v_seq2, v_root1;
  end if;

  -- -------------------------------------------------------------------------
  -- T2: update shared block -> O(log N) selective Merkle re-hashing
  --     zz-aha-ais and zz-eso-ais rehash & appear in invalidated_tags; zz-aha-ich untouched!
  -- -------------------------------------------------------------------------
  v_patch := '[{"op":"replace","path":"/payload/practiceChange/currentText","old_value":"Alteplase 0.9 mg/kg","new_value":"Alteplase 0.9 mg/kg max 90mg"}]'::jsonb;
  select * into v_row from public.neuroguide_update_block(
    v_uid_shared,
    1,
    '{
      "blockKey": "shared:zz-alteplase",
      "blockType": "shared_clinical_block",
      "payload": {"kind": "shared_clinical_block", "practiceChange": {"id": "zz-alteplase", "status": "verified", "currentText": "Alteplase 0.9 mg/kg max 90mg"}},
      "facetIndex": {
        "subspecialties": ["stroke", "vascular"],
        "conditionIds": ["ais"],
        "domains": ["treatment"],
        "timeWindowIds": ["0-4.5h", "4.5-9h"],
        "interventionTags": ["iv_thrombolysis"],
        "citedTrialKeys": ["ECASS III", "EXTEND", "ecassiii", "extend"],
        "direction": "recommended"
      }
    }'::jsonb,
    'hash_block_shared_2',
    '{"payload":"h_shared_2"}'::jsonb,
    v_patch,
    'sql-test'
  );

  if v_row.rev <> 2 or v_row.change_seq <= v_seq2 or v_row.unchanged is not false then
    raise exception 'T2 FAILED: shared update rev=%, seq=%, unchanged=%', v_row.rev, v_row.change_seq, v_row.unchanged;
  end if;
  v_seq2 := v_row.change_seq;

  if not (v_row.invalidated_tags @> array['block:' || v_uid_shared::text, 'protocol:zz-aha-ais', 'protocol:zz-eso-ais']) then
    raise exception 'T2 FAILED: missing expected invalidated_tags, got %', v_row.invalidated_tags;
  end if;
  if 'protocol:zz-aha-ich' = any(v_row.invalidated_tags) then
    raise exception 'T2 FAILED: independent protocol zz-aha-ich unexpectedly invalidated: %', v_row.invalidated_tags;
  end if;

  select rv.* into v_rev_row
  from public.neuroguide_block_revisions rv
  where rv.uid = v_uid_shared and rv.rev = 2 and rv.op = 'update';
  if not found or v_rev_row.patch_diff <> v_patch then
    raise exception 'T2 FAILED: missing update revision or patch_diff mismatch';
  end if;

  select p.protocol_hash into v_root2 from public.neuroguide_protocols p where p.uid = v_proto_aha_ais;
  if v_root2 = v_hash_aha_ais_1 then
    raise exception 'T2 FAILED: zz-aha-ais protocol_hash did not update';
  end if;
  select p.protocol_hash into v_root2 from public.neuroguide_protocols p where p.uid = v_proto_eso_ais;
  if v_root2 = v_hash_eso_ais_1 then
    raise exception 'T2 FAILED: zz-eso-ais protocol_hash did not update';
  end if;

  select p.protocol_hash, p.change_seq into v_proto_row
  from public.neuroguide_protocols p where p.uid = v_proto_aha_ich;
  if v_proto_row.protocol_hash <> v_hash_aha_ich_1 or v_proto_row.change_seq <> v_seq_aha_ich_1 then
    raise exception 'T2 FAILED: O(log N) violated — unaffected zz-aha-ich mutated (% -> %, seq % -> %)',
      v_hash_aha_ich_1, v_proto_row.protocol_hash, v_seq_aha_ich_1, v_proto_row.change_seq;
  end if;

  select s.root_hash into v_root2 from public.neuroguide_sync_state s where s.id = 1;
  if coalesce(v_root2, '') = '' or v_root2 = v_root1 then
    raise exception 'T2 FAILED: root_hash did not update (% -> %)', v_root1, v_root2;
  end if;

  -- -------------------------------------------------------------------------
  -- T3: update block with stale expected_rev -> NG_REV_CONFLICT:2
  -- -------------------------------------------------------------------------
  begin
    perform * from public.neuroguide_update_block(
      v_uid_shared,
      1,
      '{"blockKey":"shared:zz-alteplase","blockType":"shared_clinical_block","status":"draft"}'::jsonb,
      'hash_stale',
      '{}'::jsonb,
      '[]'::jsonb,
      'sql-test'
    );
    raise exception 'T3 FAILED: stale expected_rev did not raise';
  exception
    when others then
      if sqlerrm not like 'NG_REV_CONFLICT:2%' then
        raise exception 'T3 FAILED: unexpected error %', sqlerrm;
      end if;
  end;

  -- -------------------------------------------------------------------------
  -- T4: soft-delete alpha block -> deleted_at set, rev=2, appears in changes_since, protocol_hash updates
  -- -------------------------------------------------------------------------
  select p.protocol_hash into v_hash_aha_ais_1 from public.neuroguide_protocols p where p.uid = v_proto_aha_ais;

  select * into v_row from public.neuroguide_delete_block(v_uid_alpha, 1, 'sql-test');
  if v_row.deleted_at is null or v_row.rev <> 2 or v_row.change_seq <= v_seq2 then
    raise exception 'T4 FAILED: delete block failed rev=%, deleted_at=%', v_row.rev, v_row.deleted_at;
  end if;
  v_seq_del := v_row.change_seq;

  select count(*) into v_count
  from public.neuroguide_changes_since(v_seq2, 50) c
  where c.uid = v_uid_alpha and c.deleted_at is not null and c.rev = 2;
  if v_count <> 1 then
    raise exception 'T4 FAILED: tombstone missing from neuroguide_changes_since (count=%)', v_count;
  end if;

  select p.protocol_hash into v_root2 from public.neuroguide_protocols p where p.uid = v_proto_aha_ais;
  if v_root2 = v_hash_aha_ais_1 then
    raise exception 'T4 FAILED: zz-aha-ais protocol_hash did not update after child block deletion';
  end if;

  -- -------------------------------------------------------------------------
  -- T5: recreate same blockKey after delete -> succeeds with DIFFERENT uid (Bug B4)
  -- -------------------------------------------------------------------------
  select * into v_row from public.neuroguide_create_block(
    '{"blockKey":"rec-zz-alpha-1","blockType":"recommendation","status":"draft","facetIndex":{"subspecialties":["stroke"]}}'::jsonb,
    'hash_alpha_reborn_1',
    '{}'::jsonb,
    'sql-test'
  );
  v_uid_reborn := v_row.uid;
  if v_uid_reborn = v_uid_alpha or v_row.rev <> 1 or v_row.deleted_at is not null then
    raise exception 'T5 FAILED: recreated blockKey uid2=% vs uid1=%, rev=%', v_uid_reborn, v_uid_alpha, v_row.rev;
  end if;

  -- -------------------------------------------------------------------------
  -- T6: duplicate live blockKey -> NG_SLUG_TAKEN
  -- -------------------------------------------------------------------------
  begin
    perform * from public.neuroguide_create_block(
      '{"blockKey":"shared:zz-alteplase","blockType":"shared_clinical_block","status":"draft"}'::jsonb,
      'hash_dup',
      '{}'::jsonb,
      'sql-test'
    );
    raise exception 'T6 FAILED: duplicate live blockKey did not raise';
  exception
    when others then
      if sqlerrm not like 'NG_SLUG_TAKEN:%' then
        raise exception 'T6 FAILED: unexpected error %', sqlerrm;
      end if;
  end;

  -- -------------------------------------------------------------------------
  -- T7: rename blockKey via update preserves uid & increments rev
  -- -------------------------------------------------------------------------
  select * into v_row from public.neuroguide_update_block(
    v_uid_reborn,
    1,
    '{"blockKey":"rec-zz-alpha-renamed","blockType":"recommendation","status":"draft"}'::jsonb,
    'hash_alpha_renamed_2',
    '{}'::jsonb,
    '[{"op":"replace","path":"/blockKey","old_value":"rec-zz-alpha-1","new_value":"rec-zz-alpha-renamed"}]'::jsonb,
    'sql-test'
  );
  if v_row.uid <> v_uid_reborn or v_row.rev <> 2 or v_row.slug <> 'rec-zz-alpha-renamed' or v_row.block_key <> 'rec-zz-alpha-renamed' then
    raise exception 'T7 FAILED: rename mismatch uid=%, rev=%, slug=%, key=%', v_row.uid, v_row.rev, v_row.slug, v_row.block_key;
  end if;

  -- -------------------------------------------------------------------------
  -- T12 (part 1): content-hash short-circuit (I13) on blocks & protocols
  -- -------------------------------------------------------------------------
  select count(*) into v_rev_before_cnt from public.neuroguide_block_revisions rv where rv.uid = v_uid_reborn;
  v_seq1 := v_row.change_seq;

  select * into v_row from public.neuroguide_update_block(
    v_uid_reborn,
    2,
    '{"blockKey":"rec-zz-alpha-renamed","blockType":"recommendation","status":"draft"}'::jsonb,
    'hash_alpha_renamed_2',
    '{}'::jsonb,
    '[]'::jsonb,
    'sql-test'
  );
  select count(*) into v_rev_after_cnt from public.neuroguide_block_revisions rv where rv.uid = v_uid_reborn;
  if v_row.unchanged is not true or v_row.rev <> 2 or v_row.change_seq <> v_seq1 or v_rev_after_cnt <> v_rev_before_cnt then
    raise exception 'T12 FAILED: block I13 short-circuit failed unchanged=%, rev=%, seq=%', v_row.unchanged, v_row.rev, v_row.change_seq;
  end if;

  select * into v_proto_row from public.neuroguide_upsert_protocol(
    'zz-aha-ich', 'guideline', 'AHA/ASA', 2022, 'AHA ICH Check', 'published',
    '["stroke","neurocritical_care"]'::jsonb,
    '{"kind":"guideline","doc":{"id":"zz-aha-ich"}}'::jsonb,
    array[v_uid_ich],
    'meta_hash_aha_ich',
    '[]'::jsonb,
    'sql-test'
  );
  if v_proto_row.unchanged is not true or v_proto_row.rev <> 1 or v_proto_row.change_seq <> v_seq_aha_ich_1 then
    raise exception 'T12 FAILED: protocol I13 short-circuit failed unchanged=%, rev=%', v_proto_row.unchanged, v_proto_row.rev;
  end if;

  -- -------------------------------------------------------------------------
  -- T12 (part 2): block links + overlapping multi-axis facet queries
  -- -------------------------------------------------------------------------
  v_links_upserted := public.neuroguide_replace_block_links(
    jsonb_build_array(
      jsonb_build_object(
        'srcBlockUid', v_uid_shared,
        'dstBlockUid', v_uid_trial,
        'linkType', 'cites_trial',
        'origin', 'rule',
        'status', 'approved',
        'evidenceSrc', 'Alteplase IVT',
        'evidenceDst', 'ECASS III'
      ),
      jsonb_build_object(
        'srcBlockUid', v_uid_ich,
        'dstBlockUid', v_uid_shared,
        'linkType', 'differs',
        'origin', 'rule',
        'status', 'approved',
        'evidenceSrc', 'ICH',
        'evidenceDst', 'AIS'
      )
    ),
    false
  );
  if v_links_upserted <> 2 then
    raise exception 'T12 FAILED: expected 2 block links upserted, got %', v_links_upserted;
  end if;

  select count(*) into v_count
  from public.neuroguide_query_blocks_by_facets(
    '{"subspecialties":["neurocritical_care"],"conditionIds":["ais"],"timeWindowIds":["0-4.5h"],"citedTrialKeys":["ECASS-III"]}'::jsonb
  );
  if v_count <> 0 then
    -- normalized trial key check: rec-zz-alpha-1 was soft-deleted and ECASS-III normalizes to ecassiii!
    -- Wait: v_uid_shared has subspecialties=['stroke','vascular'], not 'neurocritical_care'; let us query with ['stroke']!
    raise exception 'T12 FAILED: expected 0 blocks with neurocritical_care + ais after alpha delete, got %', v_count;
  end if;

  select count(*) into v_count
  from public.neuroguide_query_blocks_by_facets(
    '{"subspecialties":["stroke"],"conditionIds":["ais"],"timeWindowIds":["0-4.5h"],"citedTrialKeys":["ECASS-III"],"directions":["recommended"]}'::jsonb
  );
  if v_count <> 1 then
    raise exception 'T12 FAILED: expected 1 live block (shared:zz-alteplase) matching overlapping facets, got %', v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- T8: restore a verified revision -> strips verification (top-level & nested) and forces draft
  -- -------------------------------------------------------------------------
  select * into v_row from public.neuroguide_update_block(
    v_uid_reborn,
    2,
    '{
      "blockKey": "rec-zz-alpha-renamed",
      "blockType": "recommendation",
      "status": "verified",
      "verification": {"verified_by": "Clinician", "verified_at": "2026-11-18", "content_hash": "hash_v3"},
      "payload": {
        "kind": "recommendation",
        "practiceChange": {
          "id": "zz-alpha-1",
          "status": "verified",
          "verification": {"verified_by": "Clinician"}
        }
      }
    }'::jsonb,
    'hash_verified_3',
    '{}'::jsonb,
    '[{"op":"replace","path":"/status","old_value":"draft","new_value":"verified"}]'::jsonb,
    'sql-test'
  );
  if v_row.rev <> 3 then
    raise exception 'T8 SETUP FAILED: expected rev=3, got %', v_row.rev;
  end if;

  select * into v_row from public.neuroguide_restore_block_revision(
    v_uid_reborn,
    3,
    3,
    'hash_restored_draft_4',
    '{}'::jsonb,
    '[{"op":"replace","path":"/status","old_value":"verified","new_value":"draft"}]'::jsonb,
    'sql-test'
  );
  if v_row.rev <> 4
     or v_row.data->>'status' <> 'draft'
     or (v_row.data ? 'verification')
     or v_row.data#>>'{payload,practiceChange,status}' <> 'draft'
     or ((v_row.data#>'{payload,practiceChange}') ? 'verification') then
    raise exception 'T8 FAILED: restore did not strip verification or force draft (rev=%, data=%)', v_row.rev, v_row.data;
  end if;

  select rv.* into v_rev_row
  from public.neuroguide_block_revisions rv
  where rv.uid = v_uid_reborn and rv.rev = 4 and rv.op = 'restore' and rv.status = 'draft';
  if not found then
    raise exception 'T8 FAILED: missing restore revision row with status=draft';
  end if;

  -- -------------------------------------------------------------------------
  -- T9: changes_since & protocol_changes_since monotonic paging + protocol soft-delete
  -- -------------------------------------------------------------------------
  select (c.uid) into v_uid_beta from public.neuroguide_create_block(
    '{"blockKey":"zz-check-beta","blockType":"recommendation","status":"draft"}'::jsonb,
    'hash_beta_1',
    '{}'::jsonb,
    'sql-test'
  ) c;

  v_page_count := 0;
  v_prev_seq := v_start_seq;
  for v_row in
    select c.change_seq from public.neuroguide_changes_since(v_start_seq, 2) c
  loop
    v_page_count := v_page_count + 1;
    if v_row.change_seq <= v_prev_seq then
      raise exception 'T9 FAILED: non-increasing block sequence % <= %', v_row.change_seq, v_prev_seq;
    end if;
    v_prev_seq := v_row.change_seq;
  end loop;
  if v_page_count <> 2 then
    raise exception 'T9 FAILED: expected limit 2 block page rows, got %', v_page_count;
  end if;
  v_last_page_seq := v_prev_seq;

  select count(*) into v_count from public.neuroguide_changes_since(v_last_page_seq, 100);
  if v_count < 2 then
    raise exception 'T9 FAILED: second page from seq % expected >= 2 remaining block rows, got %', v_last_page_seq, v_count;
  end if;

  select count(*) into v_count from public.neuroguide_protocol_changes_since(v_start_seq, 2);
  if v_count <> 2 then
    raise exception 'T9 FAILED: expected 2 protocol changes in page 1, got %', v_count;
  end if;

  select * into v_proto_row from public.neuroguide_delete_protocol(v_proto_eso_ais, 1, 'sql-test');
  if v_proto_row.deleted_at is null or v_proto_row.rev <> 2 then
    raise exception 'T9 FAILED: protocol delete failed rev=%, deleted_at=%', v_proto_row.rev, v_proto_row.deleted_at;
  end if;

  -- -------------------------------------------------------------------------
  -- T10: purge retention rules (90d tombstone, 90d revision, keep-min-5, 365d verified)
  -- -------------------------------------------------------------------------
  perform 1
  from public.neuroguide_sync_config cfg
  where cfg.id = 1
    and cfg.tombstone_retention_days = 90
    and cfg.revision_retention_days = 90
    and cfg.revision_keep_min_per_uid = 5
    and cfg.verified_revision_retention_days = 365;
  if not found then
    raise exception 'T10 FAILED: neuroguide_sync_config defaults do not match 90/90/5/365';
  end if;

  update public.neuroguide_content_blocks b
  set deleted_at = now() - interval '91 days'
  where b.uid = v_uid_alpha;

  select b.rev into v_count from public.neuroguide_content_blocks b where b.uid = v_uid_beta;
  perform * from public.neuroguide_delete_block(v_uid_beta, v_count, 'sql-test');
  update public.neuroguide_content_blocks b
  set deleted_at = now() - interval '10 days'
  where b.uid = v_uid_beta;

  select (c.uid) into v_uid_revtest from public.neuroguide_create_block(
    '{"blockKey":"zz-check-revtest","blockType":"recommendation","status":"verified"}'::jsonb,
    'hash_rt_1',
    '{}'::jsonb,
    'sql-test'
  ) c;
  perform * from public.neuroguide_update_block(
    v_uid_revtest, 1,
    '{"blockKey":"zz-check-revtest","blockType":"recommendation","status":"verified"}'::jsonb,
    'hash_rt_2', '{}'::jsonb, '[]'::jsonb, 'sql-test'
  );
  for i in 3..8 loop
    perform * from public.neuroguide_update_block(
      v_uid_revtest, i - 1,
      jsonb_build_object('blockKey', 'zz-check-revtest', 'blockType', 'recommendation', 'status', 'draft', 'seqHint', i),
      'hash_rt_' || i::text, '{}'::jsonb, '[]'::jsonb, 'sql-test'
    );
  end loop;

  update public.neuroguide_block_revisions rv
  set created_at = case
    when rv.rev = 1 then now() - interval '370 days'
    when rv.rev = 2 then now() - interval '200 days'
    else now() - interval '100 days'
  end
  where rv.uid = v_uid_revtest;

  v_purge_res := public.neuroguide_purge();

  if coalesce((v_purge_res->>'tombstones_purged')::int, 0) < 1 then
    raise exception 'T10 FAILED: expected >= 1 tombstone purged, got %', v_purge_res;
  end if;
  if exists (select 1 from public.neuroguide_content_blocks b where b.uid = v_uid_alpha) then
    raise exception 'T10 FAILED: 91-day tombstone uid_alpha was not hard-deleted';
  end if;
  if not exists (select 1 from public.neuroguide_content_blocks b where b.uid = v_uid_beta) then
    raise exception 'T10 FAILED: 10-day tombstone uid_beta should NOT have been deleted';
  end if;
  if coalesce((v_purge_res->>'purge_horizon_seq')::bigint, 0) < v_seq_del then
    raise exception 'T10 FAILED: purge_horizon_seq (%) < deleted tombstone seq (%)',
      v_purge_res->>'purge_horizon_seq', v_seq_del;
  end if;

  select array_agg(rv.rev order by rv.rev) into v_rev_kept
  from public.neuroguide_block_revisions rv
  where rv.uid = v_uid_revtest;
  if v_rev_kept is distinct from array[2, 4, 5, 6, 7, 8] then
    raise exception 'T10 FAILED: kept revisions mismatch for uid_revtest: expected [2,4,5,6,7,8], got %', v_rev_kept;
  end if;

  -- -------------------------------------------------------------------------
  -- T11: role anon security boundary (§3.2)
  -- -------------------------------------------------------------------------
  begin
    set local role anon;

    -- Allowed: reading single-row signal table neuroguide_sync_state.
    select count(*) into v_anon_count from public.neuroguide_sync_state;
    if v_anon_count <> 1 then
      raise exception 'T11 FAILED: anon could not read neuroguide_sync_state (count=%)', v_anon_count;
    end if;

    -- Denied: reading restricted tables as anon.
    v_anon_blocked := false;
    begin
      select count(*) into v_anon_count from public.neuroguide_content_blocks;
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon read neuroguide_content_blocks';
    end if;

    v_anon_blocked := false;
    begin
      select count(*) into v_anon_count from public.neuroguide_protocols;
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon read neuroguide_protocols';
    end if;

    v_anon_blocked := false;
    begin
      select count(*) into v_anon_count from public.neuroguide_block_links;
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon read neuroguide_block_links';
    end if;

    -- Denied: executing read & mutating RPCs as anon.
    v_anon_blocked := false;
    begin
      perform * from public.neuroguide_changes_since(0, 10);
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon executed neuroguide_changes_since';
    end if;

    v_anon_blocked := false;
    begin
      perform * from public.neuroguide_query_blocks_by_facets('{}'::jsonb);
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon executed neuroguide_query_blocks_by_facets';
    end if;

    v_anon_blocked := false;
    begin
      perform * from public.neuroguide_create_block('{"blockKey":"zz-anon-test","status":"draft"}'::jsonb, 'h', '{}'::jsonb, 'anon');
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon executed neuroguide_create_block';
    end if;

    v_anon_blocked := false;
    begin
      perform public.neuroguide_purge();
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon executed neuroguide_purge';
    end if;

    reset role;
  exception
    when others then
      reset role;
      raise;
  end;

  raise notice 'ALL NEUROGUIDE GRANULAR SYNC V2 SQL CHECKS (T1-T12) PASSED';
end
$$;

ROLLBACK;
