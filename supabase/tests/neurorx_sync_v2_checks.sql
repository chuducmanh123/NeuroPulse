-- NeuroRx Sync v2 — Phase 1 Self-Contained Verification Suite (T1–T12)
-- Run in Supabase Dashboard -> SQL Editor AFTER running 20261113_neurorx_sync_v2.sql.
-- Wrapped in BEGIN ... ROLLBACK so zero test data persists.

BEGIN;

do $$
declare
  v_start_seq      bigint;
  v_uid1           uuid;
  v_uid2           uuid;
  v_uid_beta       uuid;
  v_uid_gamma      uuid;
  v_uid_revtest    uuid;
  v_seq1           bigint;
  v_seq2           bigint;
  v_seq4           bigint;
  v_root1          text;
  v_root2          text;
  v_row            record;
  v_rev_row        record;
  v_count          int;
  v_patch          jsonb;
  v_sec            jsonb;
  v_purge_res      jsonb;
  v_page_count     int;
  v_prev_seq       bigint;
  v_last_page_seq  bigint;
  v_rev_before_cnt int;
  v_rev_after_cnt  int;
  v_rev_kept       int[];
  v_anon_blocked   boolean;
  v_anon_count     int;
begin
  select s.max_seq into v_start_seq from public.neurorx_sync_state s where s.id = 1;

  -- -------------------------------------------------------------------------
  -- T1: create -> rev 1, seq > 0, revision op='insert', max_seq, root_hash, section_hashes
  -- -------------------------------------------------------------------------
  v_sec := '{"core":"h_core_1","regimens":"h_reg_1"}'::jsonb;
  select * into v_row from public.neurorx_create_drug(
    '{"id":"zz-check-alpha","generic_name":"Alpha","status":"draft"}'::jsonb,
    'hash_alpha_1',
    v_sec,
    'sql-test'
  );

  if v_row.rev <> 1 or v_row.change_seq <= 0 or v_row.unchanged is not false then
    raise exception 'T1 FAILED: unexpected row fields rev=%, seq=%, unchanged=%', v_row.rev, v_row.change_seq, v_row.unchanged;
  end if;
  if v_row.section_hashes <> v_sec then
    raise exception 'T1 FAILED: section_hashes mismatch %', v_row.section_hashes;
  end if;

  v_uid1 := v_row.uid;
  v_seq1 := v_row.change_seq;

  select count(*) into v_count
  from public.neurorx_drug_revisions rv
  where rv.uid = v_uid1 and rv.rev = 1 and rv.op = 'insert';
  if v_count <> 1 then
    raise exception 'T1 FAILED: expected 1 insert revision row, found %', v_count;
  end if;

  select s.max_seq, s.root_hash into v_seq2, v_root1
  from public.neurorx_sync_state s where s.id = 1;
  if v_seq2 <> v_seq1 or coalesce(v_root1, '') = '' then
    raise exception 'T1 FAILED: sync_state max_seq=% vs %, root_hash=%', v_seq2, v_seq1, v_root1;
  end if;

  -- -------------------------------------------------------------------------
  -- T2: update with correct rev & changed hash -> rev 2, seq >, patch_diff, root_hash changed
  -- -------------------------------------------------------------------------
  v_patch := '[{"op":"replace","path":"/generic_name","old_value":"Alpha","new_value":"Alpha v2"}]'::jsonb;
  select * into v_row from public.neurorx_update_drug(
    v_uid1,
    1,
    '{"id":"zz-check-alpha","generic_name":"Alpha v2","status":"draft"}'::jsonb,
    'hash_alpha_2',
    '{"core":"h_core_2","regimens":"h_reg_1"}'::jsonb,
    v_patch,
    'sql-test'
  );

  if v_row.rev <> 2 or v_row.change_seq <= v_seq1 or v_row.unchanged is not false then
    raise exception 'T2 FAILED: rev=%, seq=% (prev %), unchanged=%', v_row.rev, v_row.change_seq, v_seq1, v_row.unchanged;
  end if;
  v_seq2 := v_row.change_seq;

  select rv.* into v_rev_row
  from public.neurorx_drug_revisions rv
  where rv.uid = v_uid1 and rv.rev = 2 and rv.op = 'update';
  if not found or v_rev_row.patch_diff <> v_patch then
    raise exception 'T2 FAILED: missing update revision or patch_diff mismatch';
  end if;

  select s.root_hash into v_root2 from public.neurorx_sync_state s where s.id = 1;
  if coalesce(v_root2, '') = '' or v_root2 = v_root1 then
    raise exception 'T2 FAILED: root_hash did not update (% -> %)', v_root1, v_root2;
  end if;

  -- -------------------------------------------------------------------------
  -- T3: update with stale expected_rev -> NRX_REV_CONFLICT:2
  -- -------------------------------------------------------------------------
  begin
    perform * from public.neurorx_update_drug(
      v_uid1,
      1,
      '{"id":"zz-check-alpha","generic_name":"Stale Write","status":"draft"}'::jsonb,
      'hash_stale',
      '{}'::jsonb,
      '[]'::jsonb,
      'sql-test'
    );
    raise exception 'T3 FAILED: stale expected_rev did not raise';
  exception
    when others then
      if sqlerrm not like 'NRX_REV_CONFLICT:2%' then
        raise exception 'T3 FAILED: unexpected error %', sqlerrm;
      end if;
  end;

  -- -------------------------------------------------------------------------
  -- T4: delete -> deleted_at set, rev 3, appears in neurorx_changes_since
  -- -------------------------------------------------------------------------
  select * into v_row from public.neurorx_delete_drug(v_uid1, 2, 'sql-test');
  if v_row.deleted_at is null or v_row.rev <> 3 or v_row.change_seq <= v_seq2 then
    raise exception 'T4 FAILED: delete failed rev=%, deleted_at=%', v_row.rev, v_row.deleted_at;
  end if;
  v_seq4 := v_row.change_seq;

  select count(*) into v_count
  from public.neurorx_changes_since(v_seq2, 50) c
  where c.uid = v_uid1 and c.deleted_at is not null and c.rev = 3;
  if v_count <> 1 then
    raise exception 'T4 FAILED: tombstone missing from neurorx_changes_since (count=%)', v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- T5: create same slug after delete -> succeeds with DIFFERENT uid (Bug B4)
  -- -------------------------------------------------------------------------
  select * into v_row from public.neurorx_create_drug(
    '{"id":"zz-check-alpha","generic_name":"Alpha Reborn","status":"draft"}'::jsonb,
    'hash_alpha_reborn_1',
    '{}'::jsonb,
    'sql-test'
  );
  v_uid2 := v_row.uid;
  if v_uid2 = v_uid1 or v_row.rev <> 1 or v_row.deleted_at is not null then
    raise exception 'T5 FAILED: recreated slug uid2=% vs uid1=%, rev=%', v_uid2, v_uid1, v_row.rev;
  end if;

  -- -------------------------------------------------------------------------
  -- T6: create duplicate live slug -> NRX_SLUG_TAKEN
  -- -------------------------------------------------------------------------
  begin
    perform * from public.neurorx_create_drug(
      '{"id":"zz-check-alpha","generic_name":"Duplicate","status":"draft"}'::jsonb,
      'hash_dup',
      '{}'::jsonb,
      'sql-test'
    );
    raise exception 'T6 FAILED: duplicate live slug did not raise';
  exception
    when others then
      if sqlerrm not like 'NRX_SLUG_TAKEN:%' then
        raise exception 'T6 FAILED: unexpected error %', sqlerrm;
      end if;
  end;

  -- -------------------------------------------------------------------------
  -- T7: rename slug via update keeps same uid_2
  -- -------------------------------------------------------------------------
  select * into v_row from public.neurorx_update_drug(
    v_uid2,
    1,
    '{"id":"zz-check-alpha-renamed","generic_name":"Alpha Reborn","status":"draft"}'::jsonb,
    'hash_alpha_renamed_2',
    '{}'::jsonb,
    '[{"op":"replace","path":"/id","old_value":"zz-check-alpha","new_value":"zz-check-alpha-renamed"}]'::jsonb,
    'sql-test'
  );
  if v_row.uid <> v_uid2 or v_row.rev <> 2 or v_row.slug <> 'zz-check-alpha-renamed' or v_row.data->>'id' <> 'zz-check-alpha-renamed' then
    raise exception 'T7 FAILED: rename mismatch uid=%, rev=%, slug=%', v_row.uid, v_row.rev, v_row.slug;
  end if;

  -- -------------------------------------------------------------------------
  -- T12: content-hash short-circuit (I13) — unchanged hash & slug -> no-op
  -- -------------------------------------------------------------------------
  select count(*) into v_rev_before_cnt from public.neurorx_drug_revisions rv where rv.uid = v_uid2;
  v_seq1 := v_row.change_seq;

  select * into v_row from public.neurorx_update_drug(
    v_uid2,
    2,
    '{"id":"zz-check-alpha-renamed","generic_name":"Alpha Reborn","status":"draft"}'::jsonb,
    'hash_alpha_renamed_2',
    '{}'::jsonb,
    '[]'::jsonb,
    'sql-test'
  );

  select count(*) into v_rev_after_cnt from public.neurorx_drug_revisions rv where rv.uid = v_uid2;
  if v_row.unchanged is not true or v_row.rev <> 2 or v_row.change_seq <> v_seq1 or v_rev_after_cnt <> v_rev_before_cnt then
    raise exception 'T12 FAILED: unchanged=%, rev=%, seq=% (expected %), rev_cnt=% -> %',
      v_row.unchanged, v_row.rev, v_row.change_seq, v_seq1, v_rev_before_cnt, v_rev_after_cnt;
  end if;

  -- -------------------------------------------------------------------------
  -- T8: restore a verified revision -> forces status='draft' and removes 'verification'
  -- -------------------------------------------------------------------------
  select * into v_row from public.neurorx_update_drug(
    v_uid2,
    2,
    '{"id":"zz-check-alpha-renamed","generic_name":"Alpha Reborn","status":"verified","verification":{"verified_by":"Clinician","verified_at":"2026-11-14","content_hash":"hash_verified_snap"}}'::jsonb,
    'hash_verified_3',
    '{}'::jsonb,
    '[{"op":"replace","path":"/status","old_value":"draft","new_value":"verified"}]'::jsonb,
    'sql-test'
  );
  if v_row.rev <> 3 then
    raise exception 'T8 SETUP FAILED: expected rev=3, got %', v_row.rev;
  end if;

  select * into v_row from public.neurorx_restore_revision(
    v_uid2,
    3,
    3,
    'hash_restored_draft_4',
    '{}'::jsonb,
    '[{"op":"replace","path":"/status","old_value":"verified","new_value":"draft"}]'::jsonb,
    'sql-test'
  );
  if v_row.rev <> 4 or v_row.data->>'status' <> 'draft' or (v_row.data ? 'verification') then
    raise exception 'T8 FAILED: restore did not strip verification or force draft (rev=%, status=%, has_verif=%)',
      v_row.rev, v_row.data->>'status', (v_row.data ? 'verification');
  end if;

  -- -------------------------------------------------------------------------
  -- T9: changes_since paging order & limit
  -- -------------------------------------------------------------------------
  select (c.uid) into v_uid_beta from public.neurorx_create_drug(
    '{"id":"zz-check-beta","generic_name":"Beta","status":"draft"}'::jsonb,
    'hash_beta_1',
    '{}'::jsonb,
    'sql-test'
  ) c;
  select (c.uid) into v_uid_gamma from public.neurorx_create_drug(
    '{"id":"zz-check-gamma","generic_name":"Gamma","status":"draft"}'::jsonb,
    'hash_gamma_1',
    '{}'::jsonb,
    'sql-test'
  ) c;

  v_page_count := 0;
  v_prev_seq := v_start_seq;
  for v_row in
    select c.change_seq from public.neurorx_changes_since(v_start_seq, 2) c
  loop
    v_page_count := v_page_count + 1;
    if v_row.change_seq <= v_prev_seq then
      raise exception 'T9 FAILED: non-increasing sequence % <= %', v_row.change_seq, v_prev_seq;
    end if;
    v_prev_seq := v_row.change_seq;
  end loop;
  if v_page_count <> 2 then
    raise exception 'T9 FAILED: expected limit 2 page rows, got %', v_page_count;
  end if;
  v_last_page_seq := v_prev_seq;

  select count(*) into v_count from public.neurorx_changes_since(v_last_page_seq, 100);
  if v_count < 2 then
    raise exception 'T9 FAILED: second page from seq % expected >= 2 remaining rows, got %', v_last_page_seq, v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- T10: purge retention rules (90d tombstone, 90d revision, keep-min-5, 365d verified)
  -- -------------------------------------------------------------------------
  perform 1
  from public.neurorx_sync_config cfg
  where cfg.id = 1
    and cfg.tombstone_retention_days = 90
    and cfg.revision_retention_days = 90
    and cfg.revision_keep_min_per_uid = 5
    and cfg.verified_revision_retention_days = 365;
  if not found then
    raise exception 'T10 FAILED: neurorx_sync_config defaults do not match 90/90/5/365';
  end if;

  -- Backdate uid1 tombstone to 91 days ago; create a 10-day tombstone on zz-check-beta.
  update public.neurorx_drug_records r
  set deleted_at = now() - interval '91 days'
  where r.uid = v_uid1;

  select r.rev into v_count from public.neurorx_drug_records r where r.uid = v_uid_beta;
  perform * from public.neurorx_delete_drug(v_uid_beta, v_count, 'sql-test');
  update public.neurorx_drug_records r
  set deleted_at = now() - interval '10 days'
  where r.uid = v_uid_beta;

  -- Create a drug with 8 revisions to verify all retention rules cleanly:
  --   rev 1: verified, 370d old (> 365d, rn=8>5) -> PURGED
  --   rev 2: verified, 200d old (< 365d, rn=7>5) -> KEPT (verified 1y rule)
  --   rev 3: draft,    100d old (>  90d, rn=6>5) -> PURGED
  --   rev 4..8: draft, 100d old (>  90d, rn=1..5) -> KEPT (min-5 per uid rule)
  select (c.uid) into v_uid_revtest from public.neurorx_create_drug(
    '{"id":"zz-check-revtest","generic_name":"Rev1","status":"verified"}'::jsonb,
    'hash_rt_1',
    '{}'::jsonb,
    'sql-test'
  ) c;
  perform * from public.neurorx_update_drug(
    v_uid_revtest, 1,
    '{"id":"zz-check-revtest","generic_name":"Rev2","status":"verified"}'::jsonb,
    'hash_rt_2', '{}'::jsonb, '[]'::jsonb, 'sql-test'
  );
  for i in 3..8 loop
    perform * from public.neurorx_update_drug(
      v_uid_revtest, i - 1,
      jsonb_build_object('id', 'zz-check-revtest', 'generic_name', 'Rev' || i::text, 'status', 'draft'),
      'hash_rt_' || i::text, '{}'::jsonb, '[]'::jsonb, 'sql-test'
    );
  end loop;

  update public.neurorx_drug_revisions rv
  set created_at = case
    when rv.rev = 1 then now() - interval '370 days'
    when rv.rev = 2 then now() - interval '200 days'
    else now() - interval '100 days'
  end
  where rv.uid = v_uid_revtest;

  v_purge_res := public.neurorx_purge();

  if coalesce((v_purge_res->>'tombstones_purged')::int, 0) < 1 then
    raise exception 'T10 FAILED: expected >= 1 tombstone purged, got %', v_purge_res;
  end if;

  if exists (select 1 from public.neurorx_drug_records r where r.uid = v_uid1) then
    raise exception 'T10 FAILED: 91-day tombstone uid1 was not hard-deleted';
  end if;
  if not exists (select 1 from public.neurorx_drug_records r where r.uid = v_uid_beta) then
    raise exception 'T10 FAILED: 10-day tombstone uid_beta should NOT have been deleted';
  end if;
  if coalesce((v_purge_res->>'purge_horizon_seq')::bigint, 0) < v_seq4 then
    raise exception 'T10 FAILED: purge_horizon_seq (%) < deleted tombstone seq (%)',
      v_purge_res->>'purge_horizon_seq', v_seq4;
  end if;

  select array_agg(rv.rev order by rv.rev) into v_rev_kept
  from public.neurorx_drug_revisions rv
  where rv.uid = v_uid_revtest;
  if v_rev_kept is distinct from array[2, 4, 5, 6, 7, 8] then
    raise exception 'T10 FAILED: kept revisions mismatch for uid_revtest: expected [2,4,5,6,7,8], got %', v_rev_kept;
  end if;

  -- -------------------------------------------------------------------------
  -- T11: role anon security boundary (§3.2)
  -- -------------------------------------------------------------------------
  begin
    set local role anon;

    -- Allowed: reading single-row signal table neurorx_sync_state.
    select count(*) into v_anon_count from public.neurorx_sync_state;
    if v_anon_count <> 1 then
      raise exception 'T11 FAILED: anon could not read neurorx_sync_state (count=%)', v_anon_count;
    end if;

    -- Denied: reading neurorx_drug_records as anon.
    v_anon_blocked := false;
    begin
      select count(*) into v_anon_count from public.neurorx_drug_records;
      if v_anon_count = 0 then
        v_anon_blocked := true;
      end if;
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon read non-zero rows from neurorx_drug_records';
    end if;

    -- Denied: executing read & mutating RPCs as anon.
    v_anon_blocked := false;
    begin
      perform * from public.neurorx_changes_since(0, 10);
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon executed neurorx_changes_since';
    end if;

    v_anon_blocked := false;
    begin
      perform * from public.neurorx_create_drug('{"id":"zz-anon-test","status":"draft"}'::jsonb, 'h', '{}'::jsonb, 'anon');
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon executed neurorx_create_drug';
    end if;

    v_anon_blocked := false;
    begin
      perform public.neurorx_purge();
    exception
      when insufficient_privilege then
        v_anon_blocked := true;
    end;
    if not v_anon_blocked then
      raise exception 'T11 FAILED: anon executed neurorx_purge';
    end if;

    reset role;
  exception
    when others then
      reset role;
      raise;
  end;

  raise notice 'ALL NEURORX SYNC V2 SQL CHECKS (T1-T12) PASSED';
end
$$;

ROLLBACK;
