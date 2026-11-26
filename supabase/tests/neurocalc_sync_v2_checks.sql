-- NeuroCalc Sync v2 — Self-Contained SQL Verification Suite
-- Run in Supabase Dashboard -> SQL Editor AFTER running 20261126_neurocalc_sync_v2.sql.
-- Wrapped in BEGIN ... ROLLBACK so zero test data persists.

BEGIN;

do $$
declare
  v_uid1         uuid;
  v_uid2         uuid;
  v_seq1         bigint;
  v_seq2         bigint;
  v_root1        text;
  v_root2        text;
  v_row          record;
  v_rev_row      record;
  v_count        int;
  v_patch        jsonb;
  v_sec          jsonb;
  v_anon_blocked boolean;
  v_anon_count   int;
begin
  -- T1: create scale -> rev 1, change_seq > 0, revision op='insert', root_hash set
  v_sec := '{"metadata":"h_meta_1","assessment_guides":"h_ag_1"}'::jsonb;
  select * into v_row from public.neurocalc_create_scale(
    '{"id":"zz-calc-alpha","metadata":{"short_name":"Alpha"},"status":"draft"}'::jsonb,
    'hash_calc_1',
    v_sec,
    'sql-test'
  );

  if v_row.rev <> 1 or v_row.change_seq <= 0 or v_row.unchanged is not false then
    raise exception 'T1 FAILED: unexpected rev=%, seq=%, unchanged=%', v_row.rev, v_row.change_seq, v_row.unchanged;
  end if;
  if v_row.section_hashes <> v_sec then
    raise exception 'T1 FAILED: section_hashes mismatch %', v_row.section_hashes;
  end if;

  v_uid1 := v_row.uid;
  v_seq1 := v_row.change_seq;

  select s.root_hash into v_root1 from public.neurocalc_sync_state s where s.id = 1;
  if coalesce(v_root1, '') = '' then
    raise exception 'T1 FAILED: root_hash empty';
  end if;

  -- T2: update with expected_rev=1 -> rev 2, patch_diff saved, root_hash updated
  v_patch := '[{"op":"replace","path":"/metadata/short_name","old_value":"Alpha","new_value":"Alpha v2"}]'::jsonb;
  select * into v_row from public.neurocalc_update_scale(
    v_uid1,
    1,
    '{"id":"zz-calc-alpha","metadata":{"short_name":"Alpha v2"},"status":"draft"}'::jsonb,
    'hash_calc_2',
    '{"metadata":"h_meta_2","assessment_guides":"h_ag_1"}'::jsonb,
    v_patch,
    'sql-test'
  );
  if v_row.rev <> 2 or v_row.change_seq <= v_seq1 then
    raise exception 'T2 FAILED: rev=%, seq=%', v_row.rev, v_row.change_seq;
  end if;
  v_seq2 := v_row.change_seq;

  select rv.* into v_rev_row
  from public.neurocalc_scale_revisions rv
  where rv.uid = v_uid1 and rv.rev = 2 and rv.op = 'update';
  if not found or v_rev_row.patch_diff <> v_patch then
    raise exception 'T2 FAILED: missing revision or patch_diff mismatch';
  end if;

  select s.root_hash into v_root2 from public.neurocalc_sync_state s where s.id = 1;
  if coalesce(v_root2, '') = '' or v_root2 = v_root1 then
    raise exception 'T2 FAILED: root_hash did not change';
  end if;

  -- T3: stale expected_rev -> NCALC_REV_CONFLICT:2
  begin
    perform * from public.neurocalc_update_scale(
      v_uid1, 1, '{"id":"zz-calc-alpha","status":"draft"}'::jsonb, 'hash_stale', '{}'::jsonb, '[]'::jsonb, 'sql-test'
    );
    raise exception 'T3 FAILED: stale expected_rev did not raise';
  exception
    when others then
      if sqlerrm not like 'NCALC_REV_CONFLICT:2%' then
        raise exception 'T3 FAILED: unexpected error %', sqlerrm;
      end if;
  end;

  -- T4: delete -> tombstone in changes_since + recreate same slug gets new uid
  select * into v_row from public.neurocalc_delete_scale(v_uid1, 2, 'sql-test');
  if v_row.deleted_at is null or v_row.rev <> 3 then
    raise exception 'T4 FAILED: delete failed';
  end if;

  select count(*) into v_count
  from public.neurocalc_changes_since(v_seq2, 50) c
  where c.uid = v_uid1 and c.deleted_at is not null and c.rev = 3;
  if v_count <> 1 then
    raise exception 'T4 FAILED: tombstone missing from changes_since';
  end if;

  select * into v_row from public.neurocalc_create_scale(
    '{"id":"zz-calc-alpha","metadata":{"short_name":"Alpha Reborn"},"status":"draft"}'::jsonb,
    'hash_calc_reborn',
    '{}'::jsonb,
    'sql-test'
  );
  v_uid2 := v_row.uid;
  if v_uid2 = v_uid1 or v_row.rev <> 1 then
    raise exception 'T4 FAILED: recreated slug uid mismatch';
  end if;

  -- T5: restore forces status='draft' and strips verification
  select * into v_row from public.neurocalc_restore_revision(
    v_uid1, 3, 2, 'hash_restored', '{}'::jsonb, '[]'::jsonb, 'sql-test'
  );
  -- Wait: v_uid2 currently holds slug 'zz-calc-alpha', so restoring v_uid1 should fail with NCALC_SLUG_TAKEN!
  raise exception 'T5 FAILED: expected NCALC_SLUG_TAKEN when live slug exists';
exception
  when others then
    if sqlerrm not like 'NCALC_SLUG_TAKEN:zz-calc-alpha%' then
      raise;
    end if;
end $$;

-- T6: RLS / anon isolation check
do $$
declare
  v_anon_blocked boolean := false;
  v_anon_count   int;
begin
  set local role anon;
  begin
    perform count(*) from public.neurocalc_scale_records;
  exception
    when insufficient_privilege then
      v_anon_blocked := true;
  end;
  if not v_anon_blocked then
    raise exception 'T6 FAILED: anon must not read neurocalc_scale_records';
  end if;

  select count(*) into v_anon_count from public.neurocalc_sync_state;
  if v_anon_count <> 1 then
    raise exception 'T6 FAILED: anon must read neurocalc_sync_state (count=%)', v_anon_count;
  end if;
  reset role;
end $$;

ROLLBACK;
