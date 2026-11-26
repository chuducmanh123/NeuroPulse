-- NeuroCalc Sync v2 — Phase 2 Database Migration
-- Reference pattern: supabase/migrations/20261113_neurorx_sync_v2.sql
-- Idempotent migration wrapped in a single transaction; never modifies other apps' tables.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Global monotonic change sequence & core tables
-- ---------------------------------------------------------------------------

create sequence if not exists public.neurocalc_change_seq;

create table if not exists public.neurocalc_scale_records (
  uid            uuid primary key default gen_random_uuid(),
  slug           text not null check (slug = lower(btrim(slug)) and slug <> ''),
  data           jsonb not null,
  content_hash   text not null,
  section_hashes jsonb not null default '{}'::jsonb,
  rev            int not null default 1,
  change_seq     bigint not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     text not null default 'system',
  deleted_at     timestamptz,
  constraint neurocalc_data_id_matches_slug check (lower(btrim(data->>'id')) = slug)
);

create unique index if not exists neurocalc_scale_records_slug_live
  on public.neurocalc_scale_records (slug)
  where deleted_at is null;

create index if not exists neurocalc_scale_records_seq
  on public.neurocalc_scale_records (change_seq);

create table if not exists public.neurocalc_scale_revisions (
  id           bigserial primary key,
  uid          uuid not null,
  rev          int not null,
  change_seq   bigint not null,
  op           text not null check (op in ('insert', 'update', 'delete', 'restore')),
  slug         text not null,
  data         jsonb not null,
  content_hash text not null,
  patch_diff   jsonb not null default '[]'::jsonb,
  status       text,
  actor        text not null,
  created_at   timestamptz not null default now(),
  unique (uid, rev)
);

create index if not exists neurocalc_scale_revisions_uid
  on public.neurocalc_scale_revisions (uid, rev desc);

create index if not exists neurocalc_scale_revisions_created
  on public.neurocalc_scale_revisions (created_at);

-- Single-row Realtime signal table (ONLY table readable by anon).
create table if not exists public.neurocalc_sync_state (
  id                int primary key check (id = 1),
  max_seq           bigint not null default 0,
  purge_horizon_seq bigint not null default 0,
  root_hash         text not null default '',
  updated_at        timestamptz not null default now()
);

insert into public.neurocalc_sync_state (id)
values (1)
on conflict (id) do nothing;

-- Single-row retention config (90d / 90d / min 5 / 365d verified).
create table if not exists public.neurocalc_sync_config (
  id                               int primary key check (id = 1),
  tombstone_retention_days         int not null default 90,
  revision_retention_days          int not null default 90,
  revision_keep_min_per_uid        int not null default 5,
  verified_revision_retention_days int not null default 365
);

insert into public.neurocalc_sync_config (
  id,
  tombstone_retention_days,
  revision_retention_days,
  revision_keep_min_per_uid,
  verified_revision_retention_days
)
values (1, 90, 90, 5, 365)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Row-Level Security, Table/Sequence Privileges & Realtime
-- ---------------------------------------------------------------------------

alter table public.neurocalc_scale_records enable row level security;
alter table public.neurocalc_scale_revisions enable row level security;
alter table public.neurocalc_sync_state enable row level security;
alter table public.neurocalc_sync_config enable row level security;

revoke all on table public.neurocalc_scale_records from public, anon, authenticated;
revoke all on table public.neurocalc_scale_revisions from public, anon, authenticated;
revoke all on table public.neurocalc_sync_config from public, anon, authenticated;
revoke all on table public.neurocalc_sync_state from public, anon, authenticated;

revoke all on sequence public.neurocalc_change_seq from public, anon, authenticated;
revoke all on sequence public.neurocalc_scale_revisions_id_seq from public, anon, authenticated;

grant select on table public.neurocalc_sync_state to anon;

grant all on table public.neurocalc_scale_records to service_role;
grant all on table public.neurocalc_scale_revisions to service_role;
grant all on table public.neurocalc_sync_state to service_role;
grant all on table public.neurocalc_sync_config to service_role;
grant all on sequence public.neurocalc_change_seq to service_role;
grant all on sequence public.neurocalc_scale_revisions_id_seq to service_role;

drop policy if exists neurocalc_sync_state_anon_select on public.neurocalc_sync_state;
create policy neurocalc_sync_state_anon_select
  on public.neurocalc_sync_state
  for select
  to anon
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.neurocalc_sync_state;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Helper & Write RPCs
-- ---------------------------------------------------------------------------

create or replace function public.neurocalc_recompute_root_hash()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload text;
  v_hash    text;
begin
  perform pg_advisory_xact_lock(hashtext('neurocalc_sync'));

  select coalesce(
    string_agg(r.uid::text || ':' || r.rev::text || ':' || r.content_hash, '|' order by r.uid),
    ''
  )
  into v_payload
  from public.neurocalc_scale_records r
  where r.deleted_at is null;

  v_hash := encode(sha256(convert_to(v_payload, 'UTF8')), 'hex');

  update public.neurocalc_sync_state s
  set
    root_hash  = v_hash,
    updated_at = now()
  where s.id = 1;

  return v_hash;
end;
$$;

create or replace function public.neurocalc_create_scale(
  p_data             jsonb,
  p_content_hash     text,
  p_section_hashes   jsonb default '{}'::jsonb,
  p_actor            text default 'system',
  p_skip_root_rehash boolean default false
)
returns table (
  uid            uuid,
  slug           text,
  data           jsonb,
  content_hash   text,
  section_hashes jsonb,
  rev            int,
  change_seq     bigint,
  created_at     timestamptz,
  updated_at     timestamptz,
  updated_by     text,
  deleted_at     timestamptz,
  unchanged      boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug         text;
  v_data         jsonb;
  v_actor        text;
  v_conflict_uid uuid;
  v_new_uid      uuid;
  v_seq          bigint;
  v_sec_hashes   jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('neurocalc_sync'));

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'NCALC_INVALID_DATA:p_data must be a JSON object';
  end if;

  v_slug := lower(btrim(coalesce(p_data->>'id', '')));
  if v_slug = '' then
    raise exception 'NCALC_INVALID_SLUG:data.id must be non-empty';
  end if;

  v_data := jsonb_set(p_data, '{id}', to_jsonb(v_slug), true);
  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_sec_hashes := coalesce(p_section_hashes, '{}'::jsonb);

  select r.uid
  into v_conflict_uid
  from public.neurocalc_scale_records r
  where r.slug = v_slug
    and r.deleted_at is null
  for update;

  if found then
    raise exception 'NCALC_SLUG_TAKEN:%', v_slug;
  end if;

  v_seq := nextval('public.neurocalc_change_seq');

  insert into public.neurocalc_scale_records as r (
    slug,
    data,
    content_hash,
    section_hashes,
    rev,
    change_seq,
    updated_by
  )
  values (
    v_slug,
    v_data,
    p_content_hash,
    v_sec_hashes,
    1,
    v_seq,
    v_actor
  )
  returning r.uid into v_new_uid;

  insert into public.neurocalc_scale_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    data,
    content_hash,
    patch_diff,
    status,
    actor
  )
  values (
    v_new_uid,
    1,
    v_seq,
    'insert',
    v_slug,
    v_data,
    p_content_hash,
    '[]'::jsonb,
    v_data->>'status',
    v_actor
  );

  update public.neurocalc_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  if not coalesce(p_skip_root_rehash, false) then
    perform public.neurocalc_recompute_root_hash();
  end if;

  return query
  select
    r.uid,
    r.slug,
    r.data,
    r.content_hash,
    r.section_hashes,
    r.rev,
    r.change_seq,
    r.created_at,
    r.updated_at,
    r.updated_by,
    r.deleted_at,
    false as unchanged
  from public.neurocalc_scale_records r
  where r.uid = v_new_uid;
end;
$$;

create or replace function public.neurocalc_update_scale(
  p_uid            uuid,
  p_expected_rev   int,
  p_data           jsonb,
  p_content_hash   text,
  p_section_hashes jsonb default '{}'::jsonb,
  p_patch_diff     jsonb default '[]'::jsonb,
  p_actor          text default 'system'
)
returns table (
  uid            uuid,
  slug           text,
  data           jsonb,
  content_hash   text,
  section_hashes jsonb,
  rev            int,
  change_seq     bigint,
  created_at     timestamptz,
  updated_at     timestamptz,
  updated_by     text,
  deleted_at     timestamptz,
  unchanged      boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec          public.neurocalc_scale_records%rowtype;
  v_slug         text;
  v_data         jsonb;
  v_actor        text;
  v_conflict_uid uuid;
  v_seq          bigint;
  v_new_rev      int;
  v_sec_hashes   jsonb;
  v_patch_diff   jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('neurocalc_sync'));

  select r.*
  into v_rec
  from public.neurocalc_scale_records r
  where r.uid = p_uid
  for update;

  if not found or v_rec.deleted_at is not null then
    raise exception 'NCALC_NOT_FOUND:%', p_uid;
  end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'NCALC_INVALID_DATA:p_data must be a JSON object';
  end if;

  v_slug := lower(btrim(coalesce(p_data->>'id', '')));
  if v_slug = '' then
    raise exception 'NCALC_INVALID_SLUG:data.id must be non-empty';
  end if;

  if v_rec.rev <> p_expected_rev then
    raise exception 'NCALC_REV_CONFLICT:%', v_rec.rev;
  end if;

  if v_rec.deleted_at is null
     and v_rec.content_hash = p_content_hash
     and v_rec.slug = v_slug then
    return query
    select
      r.uid,
      r.slug,
      r.data,
      r.content_hash,
      r.section_hashes,
      r.rev,
      r.change_seq,
      r.created_at,
      r.updated_at,
      r.updated_by,
      r.deleted_at,
      true as unchanged
    from public.neurocalc_scale_records r
    where r.uid = p_uid;
    return;
  end if;

  if v_slug <> v_rec.slug then
    select r.uid
    into v_conflict_uid
    from public.neurocalc_scale_records r
    where r.slug = v_slug
      and r.deleted_at is null
      and r.uid <> p_uid
    for update;

    if found then
      raise exception 'NCALC_SLUG_TAKEN:%', v_slug;
    end if;
  end if;

  v_data := jsonb_set(p_data, '{id}', to_jsonb(v_slug), true);
  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_sec_hashes := coalesce(p_section_hashes, '{}'::jsonb);
  v_patch_diff := coalesce(p_patch_diff, '[]'::jsonb);
  v_seq := nextval('public.neurocalc_change_seq');
  v_new_rev := v_rec.rev + 1;

  update public.neurocalc_scale_records r
  set
    slug           = v_slug,
    data           = v_data,
    content_hash   = p_content_hash,
    section_hashes = v_sec_hashes,
    rev            = v_new_rev,
    change_seq     = v_seq,
    updated_at     = now(),
    updated_by     = v_actor
  where r.uid = p_uid;

  insert into public.neurocalc_scale_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    data,
    content_hash,
    patch_diff,
    status,
    actor
  )
  values (
    p_uid,
    v_new_rev,
    v_seq,
    'update',
    v_slug,
    v_data,
    p_content_hash,
    v_patch_diff,
    v_data->>'status',
    v_actor
  );

  update public.neurocalc_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  perform public.neurocalc_recompute_root_hash();

  return query
  select
    r.uid,
    r.slug,
    r.data,
    r.content_hash,
    r.section_hashes,
    r.rev,
    r.change_seq,
    r.created_at,
    r.updated_at,
    r.updated_by,
    r.deleted_at,
    false as unchanged
  from public.neurocalc_scale_records r
  where r.uid = p_uid;
end;
$$;

create or replace function public.neurocalc_delete_scale(
  p_uid          uuid,
  p_expected_rev int,
  p_actor        text default 'system'
)
returns table (
  uid            uuid,
  slug           text,
  data           jsonb,
  content_hash   text,
  section_hashes jsonb,
  rev            int,
  change_seq     bigint,
  created_at     timestamptz,
  updated_at     timestamptz,
  updated_by     text,
  deleted_at     timestamptz,
  unchanged      boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec     public.neurocalc_scale_records%rowtype;
  v_actor   text;
  v_seq     bigint;
  v_new_rev int;
begin
  perform pg_advisory_xact_lock(hashtext('neurocalc_sync'));

  select r.*
  into v_rec
  from public.neurocalc_scale_records r
  where r.uid = p_uid
  for update;

  if not found or v_rec.deleted_at is not null then
    raise exception 'NCALC_NOT_FOUND:%', p_uid;
  end if;

  if v_rec.rev <> p_expected_rev then
    raise exception 'NCALC_REV_CONFLICT:%', v_rec.rev;
  end if;

  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_seq := nextval('public.neurocalc_change_seq');
  v_new_rev := v_rec.rev + 1;

  update public.neurocalc_scale_records r
  set
    deleted_at = now(),
    rev        = v_new_rev,
    change_seq = v_seq,
    updated_at = now(),
    updated_by = v_actor
  where r.uid = p_uid;

  insert into public.neurocalc_scale_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    data,
    content_hash,
    patch_diff,
    status,
    actor
  )
  values (
    p_uid,
    v_new_rev,
    v_seq,
    'delete',
    v_rec.slug,
    v_rec.data,
    v_rec.content_hash,
    '[]'::jsonb,
    v_rec.data->>'status',
    v_actor
  );

  update public.neurocalc_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  perform public.neurocalc_recompute_root_hash();

  return query
  select
    r.uid,
    r.slug,
    r.data,
    r.content_hash,
    r.section_hashes,
    r.rev,
    r.change_seq,
    r.created_at,
    r.updated_at,
    r.updated_by,
    r.deleted_at,
    false as unchanged
  from public.neurocalc_scale_records r
  where r.uid = p_uid;
end;
$$;

create or replace function public.neurocalc_restore_revision(
  p_uid              uuid,
  p_expected_rev     int,
  p_revision_rev     int,
  p_new_content_hash text,
  p_section_hashes   jsonb default '{}'::jsonb,
  p_patch_diff       jsonb default '[]'::jsonb,
  p_actor            text default 'system'
)
returns table (
  uid            uuid,
  slug           text,
  data           jsonb,
  content_hash   text,
  section_hashes jsonb,
  rev            int,
  change_seq     bigint,
  created_at     timestamptz,
  updated_at     timestamptz,
  updated_by     text,
  deleted_at     timestamptz,
  unchanged      boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec           public.neurocalc_scale_records%rowtype;
  v_rev_row       public.neurocalc_scale_revisions%rowtype;
  v_slug          text;
  v_conflict_uid  uuid;
  v_restored_data jsonb;
  v_content_hash  text;
  v_sec_hashes    jsonb;
  v_patch_diff    jsonb;
  v_actor         text;
  v_seq           bigint;
  v_new_rev       int;
begin
  perform pg_advisory_xact_lock(hashtext('neurocalc_sync'));

  select r.*
  into v_rec
  from public.neurocalc_scale_records r
  where r.uid = p_uid
  for update;

  if not found then
    raise exception 'NCALC_NOT_FOUND:%', p_uid;
  end if;

  if v_rec.rev <> p_expected_rev then
    raise exception 'NCALC_REV_CONFLICT:%', v_rec.rev;
  end if;

  select rv.*
  into v_rev_row
  from public.neurocalc_scale_revisions rv
  where rv.uid = p_uid
    and rv.rev = p_revision_rev;

  if not found then
    raise exception 'NCALC_NOT_FOUND:revision % for %', p_revision_rev, p_uid;
  end if;

  v_slug := lower(btrim(coalesce(v_rev_row.data->>'id', v_rev_row.slug)));
  if v_slug = '' then
    raise exception 'NCALC_INVALID_SLUG:revision slug empty';
  end if;

  select r.uid
  into v_conflict_uid
  from public.neurocalc_scale_records r
  where r.slug = v_slug
    and r.deleted_at is null
    and r.uid <> p_uid
  for update;

  if found then
    raise exception 'NCALC_SLUG_TAKEN:%', v_slug;
  end if;

  -- Restoring any revision forces status='draft' and strips verification metadata.
  v_restored_data := (v_rev_row.data - 'verification')
    || jsonb_build_object(
      'id', v_slug,
      'status', 'draft',
      'verification', jsonb_build_object('verified_by', null, 'verified_at', null, 'content_hash', null)
    );

  v_content_hash := coalesce(nullif(btrim(p_new_content_hash), ''), v_rev_row.content_hash);
  v_sec_hashes := coalesce(p_section_hashes, '{}'::jsonb);
  v_patch_diff := coalesce(p_patch_diff, '[]'::jsonb);
  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_seq := nextval('public.neurocalc_change_seq');
  v_new_rev := v_rec.rev + 1;

  update public.neurocalc_scale_records r
  set
    slug           = v_slug,
    data           = v_restored_data,
    content_hash   = v_content_hash,
    section_hashes = v_sec_hashes,
    rev            = v_new_rev,
    change_seq     = v_seq,
    deleted_at     = null,
    updated_at     = now(),
    updated_by     = v_actor
  where r.uid = p_uid;

  insert into public.neurocalc_scale_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    data,
    content_hash,
    patch_diff,
    status,
    actor
  )
  values (
    p_uid,
    v_new_rev,
    v_seq,
    'restore',
    v_slug,
    v_restored_data,
    v_content_hash,
    v_patch_diff,
    'draft',
    v_actor
  );

  update public.neurocalc_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  perform public.neurocalc_recompute_root_hash();

  return query
  select
    r.uid,
    r.slug,
    r.data,
    r.content_hash,
    r.section_hashes,
    r.rev,
    r.change_seq,
    r.created_at,
    r.updated_at,
    r.updated_by,
    r.deleted_at,
    false as unchanged
  from public.neurocalc_scale_records r
  where r.uid = p_uid;
end;
$$;

create or replace function public.neurocalc_changes_since(
  p_since bigint default 0,
  p_limit int default 500
)
returns table (
  uid               uuid,
  slug              text,
  data              jsonb,
  content_hash      text,
  section_hashes    jsonb,
  rev               int,
  change_seq        bigint,
  created_at        timestamptz,
  updated_at        timestamptz,
  updated_by        text,
  deleted_at        timestamptz,
  max_seq           bigint,
  purge_horizon_seq bigint,
  root_hash         text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.neurocalc_sync_state%rowtype;
  v_since bigint;
  v_limit int;
begin
  select s.*
  into v_state
  from public.neurocalc_sync_state s
  where s.id = 1;

  v_since := coalesce(p_since, 0);
  v_limit := greatest(1, least(coalesce(p_limit, 500), 500));

  return query
  select
    r.uid,
    r.slug,
    r.data,
    r.content_hash,
    r.section_hashes,
    r.rev,
    r.change_seq,
    r.created_at,
    r.updated_at,
    r.updated_by,
    r.deleted_at,
    v_state.max_seq,
    v_state.purge_horizon_seq,
    v_state.root_hash
  from public.neurocalc_scale_records r
  where r.change_seq > v_since
  order by r.change_seq asc
  limit v_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Bounded Retention Purge RPC
-- ---------------------------------------------------------------------------

create or replace function public.neurocalc_purge()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg               public.neurocalc_sync_config%rowtype;
  v_tombstones_purged int := 0;
  v_revisions_purged  int := 0;
  v_max_purged_seq    bigint := 0;
  v_horizon           bigint := 0;
begin
  perform pg_advisory_xact_lock(hashtext('neurocalc_sync'));

  select cfg.*
  into v_cfg
  from public.neurocalc_sync_config cfg
  where cfg.id = 1;

  with purged_tombstones as (
    delete from public.neurocalc_scale_records r
    where r.deleted_at is not null
      and r.deleted_at < now() - make_interval(days => v_cfg.tombstone_retention_days)
    returning r.change_seq
  )
  select count(*)::int, coalesce(max(purged_tombstones.change_seq), 0)
  into v_tombstones_purged, v_max_purged_seq
  from purged_tombstones;

  if v_max_purged_seq > 0 then
    update public.neurocalc_sync_state s
    set
      purge_horizon_seq = greatest(s.purge_horizon_seq, v_max_purged_seq),
      updated_at        = now()
    where s.id = 1;
  end if;

  with ranked as (
    select
      rv.id,
      rv.created_at,
      rv.status,
      row_number() over (partition by rv.uid order by rv.rev desc) as rn
    from public.neurocalc_scale_revisions rv
  ),
  purged_revisions as (
    delete from public.neurocalc_scale_revisions rv
    using ranked rk
    where rv.id = rk.id
      and rk.rn > v_cfg.revision_keep_min_per_uid
      and rk.created_at < now() - make_interval(days => v_cfg.revision_retention_days)
      and not (
        coalesce(rk.status, '') = 'verified'
        and rk.created_at >= now() - make_interval(days => v_cfg.verified_revision_retention_days)
      )
    returning rv.id
  )
  select count(*)::int
  into v_revisions_purged
  from purged_revisions;

  perform public.neurocalc_recompute_root_hash();

  select s.purge_horizon_seq
  into v_horizon
  from public.neurocalc_sync_state s
  where s.id = 1;

  return jsonb_build_object(
    'tombstones_purged', v_tombstones_purged,
    'revisions_purged', v_revisions_purged,
    'purge_horizon_seq', v_horizon
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Lock down RPC execution to service_role only
-- ---------------------------------------------------------------------------

revoke execute on function public.neurocalc_recompute_root_hash() from public, anon, authenticated;
grant  execute on function public.neurocalc_recompute_root_hash() to service_role;

revoke execute on function public.neurocalc_create_scale(jsonb, text, jsonb, text, boolean) from public, anon, authenticated;
grant  execute on function public.neurocalc_create_scale(jsonb, text, jsonb, text, boolean) to service_role;

revoke execute on function public.neurocalc_update_scale(uuid, int, jsonb, text, jsonb, jsonb, text) from public, anon, authenticated;
grant  execute on function public.neurocalc_update_scale(uuid, int, jsonb, text, jsonb, jsonb, text) to service_role;

revoke execute on function public.neurocalc_delete_scale(uuid, int, text) from public, anon, authenticated;
grant  execute on function public.neurocalc_delete_scale(uuid, int, text) to service_role;

revoke execute on function public.neurocalc_restore_revision(uuid, int, int, text, jsonb, jsonb, text) from public, anon, authenticated;
grant  execute on function public.neurocalc_restore_revision(uuid, int, int, text, jsonb, jsonb, text) to service_role;

revoke execute on function public.neurocalc_changes_since(bigint, int) from public, anon, authenticated;
grant  execute on function public.neurocalc_changes_since(bigint, int) to service_role;

revoke execute on function public.neurocalc_purge() from public, anon, authenticated;
grant  execute on function public.neurocalc_purge() to service_role;

COMMIT;
