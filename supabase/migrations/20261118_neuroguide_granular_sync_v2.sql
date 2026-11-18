-- NeuroGuide Sync v2 — Phase 8.1 Granular Blocks & 2-Tier Merkle Tree Migration
-- Reference contract:
--   tasks/neurorx-sync/00-design-neurorx-sync.md (§3, §10, I1–I15, P1–P14)
--   src/lib/neuroguide/sync/blockGraph.ts & types.ts
-- Idempotent migration wrapped in a single transaction; never modifies legacy tables.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Global monotonic change sequence & 7 normalized tables (§10)
-- ---------------------------------------------------------------------------

create sequence if not exists public.neuroguide_change_seq;

-- Tier-2 Protocol / Catalog Nodes (guideline metadata, conference, or catalog)
create table if not exists public.neuroguide_protocols (
  uid            uuid primary key default gen_random_uuid(),
  slug           text not null check (slug = lower(btrim(slug)) and slug <> ''),
  protocol_type  text not null check (protocol_type in ('guideline', 'conference', 'scenario_catalog')),
  society        text not null default '',
  year           int not null default 0,
  title          text not null default '',
  status         text not null default 'published',
  subspecialties jsonb not null default '[]'::jsonb,
  metadata       jsonb not null default '{}'::jsonb,
  block_order    uuid[] not null default '{}'::uuid[],
  metadata_hash  text not null,
  protocol_hash  text not null,
  rev            int not null default 1,
  change_seq     bigint not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     text not null default 'system',
  deleted_at     timestamptz
);

create unique index if not exists neuroguide_protocols_slug_live
  on public.neuroguide_protocols (slug)
  where deleted_at is null;

create index if not exists neuroguide_protocols_seq
  on public.neuroguide_protocols (change_seq);

create index if not exists neuroguide_protocols_subspecialties_gin
  on public.neuroguide_protocols
  using gin (subspecialties jsonb_path_ops);

-- Tier-3 Granular & Shared Clinical Blocks (leaf hashes + overlapping multi-axis facets)
create table if not exists public.neuroguide_content_blocks (
  uid            uuid primary key default gen_random_uuid(),
  slug           text not null check (slug = lower(btrim(slug)) and slug <> ''),
  block_key      text not null check (btrim(block_key) <> ''),
  block_type     text not null check (
    block_type in (
      'recommendation',
      'shared_clinical_block',
      'pivotal_trial',
      'late_breaking_trial',
      'clinical_scenario',
      'recommendation_atom'
    )
  ),
  data           jsonb not null,
  facets         jsonb not null default '{}'::jsonb,
  content_hash   text not null,
  section_hashes jsonb not null default '{}'::jsonb,
  rev            int not null default 1,
  change_seq     bigint not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     text not null default 'system',
  deleted_at     timestamptz,
  constraint block_slug_matches_key check (slug = lower(btrim(block_key)))
);

create unique index if not exists neuroguide_content_blocks_slug_live
  on public.neuroguide_content_blocks (slug)
  where deleted_at is null;

create index if not exists neuroguide_content_blocks_seq
  on public.neuroguide_content_blocks (change_seq);

create index if not exists neuroguide_content_blocks_type
  on public.neuroguide_content_blocks (block_type)
  where deleted_at is null;

create index if not exists neuroguide_content_blocks_facets_gin
  on public.neuroguide_content_blocks
  using gin (facets jsonb_path_ops);

-- Many-to-Many Protocol <-> Content Block Join (single source of truth for shared clinical blocks)
create table if not exists public.neuroguide_protocol_blocks (
  protocol_uid uuid not null references public.neuroguide_protocols(uid) on delete cascade,
  block_uid    uuid not null references public.neuroguide_content_blocks(uid) on delete cascade,
  position     int not null default 0,
  section_path text not null default '',
  role         text not null default 'recommendation' check (
    role in ('recommendation', 'shared', 'trial', 'scenario', 'atom')
  ),
  primary key (protocol_uid, block_uid, position)
);

create index if not exists neuroguide_protocol_blocks_block_uid
  on public.neuroguide_protocol_blocks (block_uid);

create index if not exists neuroguide_protocol_blocks_protocol_pos
  on public.neuroguide_protocol_blocks (protocol_uid, position asc);

-- Directed Cross-Links & Guideline Recommendation Relations
create table if not exists public.neuroguide_block_links (
  id            bigserial primary key,
  src_block_uid uuid not null references public.neuroguide_content_blocks(uid) on delete cascade,
  dst_block_uid uuid not null references public.neuroguide_content_blocks(uid) on delete cascade,
  link_type     text not null check (
    link_type in (
      'same_pico',
      'same_section',
      'refers_to',
      'supersedes',
      'differs',
      'supports_evidence',
      'cites_trial',
      'in_scenario',
      'shared_protocol'
    )
  ),
  origin       text not null default 'rule' check (origin in ('rule', 'ai', 'human')),
  status       text not null default 'approved' check (status in ('approved', 'proposed', 'rejected')),
  evidence_src text,
  evidence_dst text,
  created_at   timestamptz not null default now(),
  unique (src_block_uid, dst_block_uid, link_type)
);

create index if not exists neuroguide_block_links_src
  on public.neuroguide_block_links (src_block_uid, link_type);

create index if not exists neuroguide_block_links_dst
  on public.neuroguide_block_links (dst_block_uid, link_type);

-- Append-Only Content Block Revision History (RFC 6902 patch_diff + snapshot)
create table if not exists public.neuroguide_block_revisions (
  id           bigserial primary key,
  uid          uuid not null,
  rev          int not null,
  change_seq   bigint not null,
  op           text not null check (op in ('insert', 'update', 'delete', 'restore')),
  slug         text not null,
  block_type   text not null,
  data         jsonb not null,
  content_hash text not null,
  patch_diff   jsonb not null default '[]'::jsonb,
  status       text,
  actor        text not null,
  created_at   timestamptz not null default now(),
  unique (uid, rev)
);

create index if not exists neuroguide_block_revisions_uid
  on public.neuroguide_block_revisions (uid, rev desc);

create index if not exists neuroguide_block_revisions_created
  on public.neuroguide_block_revisions (created_at);

-- Single-row Realtime signal table (ONLY table readable by anon).
create table if not exists public.neuroguide_sync_state (
  id                int primary key check (id = 1),
  max_seq           bigint not null default 0,
  purge_horizon_seq bigint not null default 0,
  root_hash         text not null default '',
  updated_at        timestamptz not null default now()
);

insert into public.neuroguide_sync_state (id)
values (1)
on conflict (id) do nothing;

-- Single-row retention config (90d tombstones / 90d revisions / min 5 per uid / 365d verified)
create table if not exists public.neuroguide_sync_config (
  id                               int primary key check (id = 1),
  tombstone_retention_days         int not null default 90,
  revision_retention_days          int not null default 90,
  revision_keep_min_per_uid        int not null default 5,
  verified_revision_retention_days int not null default 365
);

insert into public.neuroguide_sync_config (
  id,
  tombstone_retention_days,
  revision_retention_days,
  revision_keep_min_per_uid,
  verified_revision_retention_days
)
values (1, 90, 90, 5, 365)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Row-Level Security, Privileges & Realtime (§3.2)
-- ---------------------------------------------------------------------------

alter table public.neuroguide_protocols enable row level security;
alter table public.neuroguide_content_blocks enable row level security;
alter table public.neuroguide_protocol_blocks enable row level security;
alter table public.neuroguide_block_links enable row level security;
alter table public.neuroguide_block_revisions enable row level security;
alter table public.neuroguide_sync_state enable row level security;
alter table public.neuroguide_sync_config enable row level security;

revoke all on table public.neuroguide_protocols from public, anon, authenticated;
revoke all on table public.neuroguide_content_blocks from public, anon, authenticated;
revoke all on table public.neuroguide_protocol_blocks from public, anon, authenticated;
revoke all on table public.neuroguide_block_links from public, anon, authenticated;
revoke all on table public.neuroguide_block_revisions from public, anon, authenticated;
revoke all on table public.neuroguide_sync_state from public, anon, authenticated;
revoke all on table public.neuroguide_sync_config from public, anon, authenticated;

revoke all on sequence public.neuroguide_change_seq from public, anon, authenticated;
revoke all on sequence public.neuroguide_block_revisions_id_seq from public, anon, authenticated;
revoke all on sequence public.neuroguide_block_links_id_seq from public, anon, authenticated;

grant select on table public.neuroguide_sync_state to anon;

grant all on table public.neuroguide_protocols to service_role;
grant all on table public.neuroguide_content_blocks to service_role;
grant all on table public.neuroguide_protocol_blocks to service_role;
grant all on table public.neuroguide_block_links to service_role;
grant all on table public.neuroguide_block_revisions to service_role;
grant all on table public.neuroguide_sync_state to service_role;
grant all on table public.neuroguide_sync_config to service_role;

grant all on sequence public.neuroguide_change_seq to service_role;
grant all on sequence public.neuroguide_block_revisions_id_seq to service_role;
grant all on sequence public.neuroguide_block_links_id_seq to service_role;

drop policy if exists neuroguide_sync_state_anon_select on public.neuroguide_sync_state;
create policy neuroguide_sync_state_anon_select
  on public.neuroguide_sync_state
  for select
  to anon
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.neuroguide_sync_state;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Merkle Tree & Write/Read RPCs (§3.3 & §10)
-- ---------------------------------------------------------------------------

-- Tier-2 Protocol Merkle Hash: sha256(metadata_hash || '|' || ordered_live_block_hashes_joined)
create or replace function public.neuroguide_recompute_protocol_hash(
  p_protocol_uid uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proto         public.neuroguide_protocols%rowtype;
  v_joined_hashes text;
  v_proto_hash    text;
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select p.*
  into v_proto
  from public.neuroguide_protocols p
  where p.uid = p_protocol_uid
  for update;

  if not found then
    raise exception 'NG_NOT_FOUND:protocol %', p_protocol_uid;
  end if;

  select coalesce(string_agg(b.content_hash, '|' order by u.ord), '')
  into v_joined_hashes
  from unnest(v_proto.block_order) with ordinality as u(block_uid, ord)
  join public.neuroguide_content_blocks b
    on b.uid = u.block_uid
   and b.deleted_at is null;

  v_proto_hash := encode(
    sha256(convert_to(v_proto.metadata_hash || '|' || coalesce(v_joined_hashes, ''), 'UTF8')),
    'hex'
  );

  update public.neuroguide_protocols p
  set
    protocol_hash = v_proto_hash,
    updated_at    = now()
  where p.uid = p_protocol_uid;

  return v_proto_hash;
end;
$$;

-- Tier-1 Global Root Merkle Hash
create or replace function public.neuroguide_recompute_root_hash()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_protocols boolean;
  v_payload       text;
  v_hash          text;
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select exists (
    select 1
    from public.neuroguide_protocols p
    where p.deleted_at is null
  )
  into v_has_protocols;

  if v_has_protocols then
    select coalesce(
      string_agg(p.uid::text || ':' || p.rev::text || ':' || p.protocol_hash, '|' order by p.uid::text),
      ''
    )
    into v_payload
    from public.neuroguide_protocols p
    where p.deleted_at is null;
  else
    select coalesce(
      string_agg(b.uid::text || ':' || b.rev::text || ':' || b.content_hash, '|' order by b.uid::text),
      ''
    )
    into v_payload
    from public.neuroguide_content_blocks b
    where b.deleted_at is null;
  end if;

  v_hash := encode(sha256(convert_to(coalesce(v_payload, ''), 'UTF8')), 'hex');

  update public.neuroguide_sync_state s
  set
    root_hash  = v_hash,
    updated_at = now()
  where s.id = 1;

  return v_hash;
end;
$$;

-- Selective O(log N) Merkle Propagation for one changed block UID
create or replace function public.neuroguide_recompute_affected_protocols(
  p_block_uid uuid,
  p_seq       bigint default null
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proto      record;
  v_proto_tags text[] := '{}'::text[];
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  for v_proto in
    select p.uid, p.slug
    from public.neuroguide_protocols p
    where p.deleted_at is null
      and (
        exists (
          select 1
          from public.neuroguide_protocol_blocks pb
          where pb.protocol_uid = p.uid
            and pb.block_uid = p_block_uid
        )
        or p.block_order @> array[p_block_uid]
      )
    order by p.slug asc
  loop
    perform public.neuroguide_recompute_protocol_hash(v_proto.uid);

    if p_seq is not null then
      update public.neuroguide_protocols p
      set
        change_seq = p_seq,
        updated_at = now()
      where p.uid = v_proto.uid;
    end if;

    v_proto_tags := array_append(v_proto_tags, 'protocol:' || v_proto.slug);
  end loop;

  return array['block:' || p_block_uid::text] || coalesce(v_proto_tags, '{}'::text[]);
end;
$$;

-- Upsert Protocol + Replace Edges in neuroguide_protocol_blocks
create or replace function public.neuroguide_upsert_protocol(
  p_slug             text,
  p_protocol_type    text,
  p_society          text,
  p_year             int,
  p_title            text,
  p_status           text,
  p_subspecialties   jsonb,
  p_metadata         jsonb,
  p_block_order      uuid[],
  p_metadata_hash    text,
  p_edges            jsonb default '[]'::jsonb,
  p_actor            text default 'system',
  p_uid              uuid default null,
  p_expected_rev     int default null,
  p_skip_root_rehash boolean default false
)
returns table (
  uid            uuid,
  slug           text,
  protocol_type  text,
  society        text,
  year           int,
  title          text,
  status         text,
  subspecialties jsonb,
  metadata       jsonb,
  block_order    uuid[],
  metadata_hash  text,
  protocol_hash  text,
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
  v_slug          text;
  v_actor         text;
  v_subspec       jsonb;
  v_metadata      jsonb;
  v_block_order   uuid[];
  v_edges         jsonb;
  v_existing      public.neuroguide_protocols%rowtype;
  v_has_existing  boolean := false;
  v_conflict_uid  uuid;
  v_uid           uuid;
  v_seq           bigint;
  v_new_rev       int;
  v_joined_hashes text;
  v_proto_hash    text;
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  v_slug := lower(btrim(coalesce(p_slug, '')));
  if v_slug = '' then
    raise exception 'NG_INVALID_SLUG:p_slug must be non-empty';
  end if;

  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_subspec := coalesce(p_subspecialties, '[]'::jsonb);
  v_metadata := coalesce(p_metadata, '{}'::jsonb);
  v_block_order := coalesce(p_block_order, '{}'::uuid[]);
  v_edges := coalesce(p_edges, '[]'::jsonb);

  if p_uid is not null then
    select p.*
    into v_existing
    from public.neuroguide_protocols p
    where p.uid = p_uid
      and p.deleted_at is null
    for update;
    v_has_existing := found;
  end if;

  if not v_has_existing then
    select p.*
    into v_existing
    from public.neuroguide_protocols p
    where p.slug = v_slug
      and p.deleted_at is null
    for update;
    v_has_existing := found;
  end if;

  select coalesce(string_agg(b.content_hash, '|' order by u.ord), '')
  into v_joined_hashes
  from unnest(v_block_order) with ordinality as u(block_uid, ord)
  join public.neuroguide_content_blocks b
    on b.uid = u.block_uid
   and b.deleted_at is null;

  v_proto_hash := encode(
    sha256(convert_to(coalesce(p_metadata_hash, '') || '|' || coalesce(v_joined_hashes, ''), 'UTF8')),
    'hex'
  );

  if v_has_existing then
    if p_expected_rev is not null and v_existing.rev <> p_expected_rev then
      raise exception 'NG_REV_CONFLICT:%', v_existing.rev;
    end if;

    if v_existing.metadata_hash = coalesce(p_metadata_hash, '')
       and v_existing.protocol_hash = v_proto_hash
       and v_existing.block_order = v_block_order
       and v_existing.slug = v_slug then
      return query
      select
        p.uid,
        p.slug,
        p.protocol_type,
        p.society,
        p.year,
        p.title,
        p.status,
        p.subspecialties,
        p.metadata,
        p.block_order,
        p.metadata_hash,
        p.protocol_hash,
        p.rev,
        p.change_seq,
        p.created_at,
        p.updated_at,
        p.updated_by,
        p.deleted_at,
        true as unchanged
      from public.neuroguide_protocols p
      where p.uid = v_existing.uid;
      return;
    end if;

    if v_slug <> v_existing.slug then
      select p.uid
      into v_conflict_uid
      from public.neuroguide_protocols p
      where p.slug = v_slug
        and p.deleted_at is null
        and p.uid <> v_existing.uid
      for update;

      if found then
        raise exception 'NG_SLUG_TAKEN:%', v_slug;
      end if;
    end if;

    delete from public.neuroguide_protocol_blocks pb
    where pb.protocol_uid = v_existing.uid;

    if jsonb_typeof(v_edges) = 'array' and jsonb_array_length(v_edges) > 0 then
      insert into public.neuroguide_protocol_blocks (
        protocol_uid,
        block_uid,
        position,
        section_path,
        role
      )
      select distinct on (
        coalesce((e->>'blockUid')::uuid, (e->>'block_uid')::uuid),
        coalesce((e->>'position')::int, (u.ord - 1)::int)
      )
        v_existing.uid,
        coalesce((e->>'blockUid')::uuid, (e->>'block_uid')::uuid),
        coalesce((e->>'position')::int, (u.ord - 1)::int),
        coalesce(e->>'sectionPath', e->>'section_path', ''),
        coalesce(nullif(btrim(e->>'role'), ''), 'recommendation')
      from jsonb_array_elements(v_edges) with ordinality as u(e, ord)
      order by
        coalesce((e->>'blockUid')::uuid, (e->>'block_uid')::uuid),
        coalesce((e->>'position')::int, (u.ord - 1)::int),
        u.ord desc
      on conflict (protocol_uid, block_uid, position) do update
      set
        section_path = excluded.section_path,
        role         = excluded.role;
    elsif array_length(v_block_order, 1) > 0 then
      insert into public.neuroguide_protocol_blocks (
        protocol_uid,
        block_uid,
        position,
        section_path,
        role
      )
      select
        v_existing.uid,
        u.block_uid,
        (u.ord - 1)::int,
        coalesce(b.facets->>'sectionPath', ''),
        case b.block_type
          when 'shared_clinical_block' then 'shared'
          when 'pivotal_trial' then 'trial'
          when 'late_breaking_trial' then 'trial'
          when 'clinical_scenario' then 'scenario'
          when 'recommendation_atom' then 'atom'
          else 'recommendation'
        end
      from unnest(v_block_order) with ordinality as u(block_uid, ord)
      join public.neuroguide_content_blocks b
        on b.uid = u.block_uid
      on conflict (protocol_uid, block_uid, position) do nothing;
    end if;

    v_seq := nextval('public.neuroguide_change_seq');
    v_new_rev := v_existing.rev + 1;

    update public.neuroguide_protocols p
    set
      slug           = v_slug,
      protocol_type  = coalesce(nullif(btrim(p_protocol_type), ''), p.protocol_type),
      society        = coalesce(p_society, p.society),
      year           = coalesce(p_year, p.year),
      title          = coalesce(p_title, p.title),
      status         = coalesce(nullif(btrim(p_status), ''), p.status),
      subspecialties = v_subspec,
      metadata       = v_metadata,
      block_order    = v_block_order,
      metadata_hash  = coalesce(p_metadata_hash, ''),
      protocol_hash  = v_proto_hash,
      rev            = v_new_rev,
      change_seq     = v_seq,
      updated_at     = now(),
      updated_by     = v_actor
    where p.uid = v_existing.uid;

    update public.neuroguide_sync_state s
    set
      max_seq    = v_seq,
      updated_at = now()
    where s.id = 1;

    if not coalesce(p_skip_root_rehash, false) then
      perform public.neuroguide_recompute_root_hash();
    end if;

    return query
    select
      p.uid,
      p.slug,
      p.protocol_type,
      p.society,
      p.year,
      p.title,
      p.status,
      p.subspecialties,
      p.metadata,
      p.block_order,
      p.metadata_hash,
      p.protocol_hash,
      p.rev,
      p.change_seq,
      p.created_at,
      p.updated_at,
      p.updated_by,
      p.deleted_at,
      false as unchanged
    from public.neuroguide_protocols p
    where p.uid = v_existing.uid;
    return;
  end if;

  -- Insert new protocol node
  if p_uid is not null and not exists (select 1 from public.neuroguide_protocols p where p.uid = p_uid) then
    v_uid := p_uid;
  else
    v_uid := gen_random_uuid();
  end if;

  v_seq := nextval('public.neuroguide_change_seq');

  insert into public.neuroguide_protocols (
    uid,
    slug,
    protocol_type,
    society,
    year,
    title,
    status,
    subspecialties,
    metadata,
    block_order,
    metadata_hash,
    protocol_hash,
    rev,
    change_seq,
    updated_by
  )
  values (
    v_uid,
    v_slug,
    p_protocol_type,
    coalesce(p_society, ''),
    coalesce(p_year, 0),
    coalesce(p_title, ''),
    coalesce(nullif(btrim(p_status), ''), 'published'),
    v_subspec,
    v_metadata,
    v_block_order,
    coalesce(p_metadata_hash, ''),
    v_proto_hash,
    1,
    v_seq,
    v_actor
  );

  if jsonb_typeof(v_edges) = 'array' and jsonb_array_length(v_edges) > 0 then
    insert into public.neuroguide_protocol_blocks (
      protocol_uid,
      block_uid,
      position,
      section_path,
      role
    )
    select distinct on (
      coalesce((e->>'blockUid')::uuid, (e->>'block_uid')::uuid),
      coalesce((e->>'position')::int, (u.ord - 1)::int)
    )
      v_uid,
      coalesce((e->>'blockUid')::uuid, (e->>'block_uid')::uuid),
      coalesce((e->>'position')::int, (u.ord - 1)::int),
      coalesce(e->>'sectionPath', e->>'section_path', ''),
      coalesce(nullif(btrim(e->>'role'), ''), 'recommendation')
    from jsonb_array_elements(v_edges) with ordinality as u(e, ord)
    order by
      coalesce((e->>'blockUid')::uuid, (e->>'block_uid')::uuid),
      coalesce((e->>'position')::int, (u.ord - 1)::int),
      u.ord desc
    on conflict (protocol_uid, block_uid, position) do update
    set
      section_path = excluded.section_path,
      role         = excluded.role;
  elsif array_length(v_block_order, 1) > 0 then
    insert into public.neuroguide_protocol_blocks (
      protocol_uid,
      block_uid,
      position,
      section_path,
      role
    )
    select
      v_uid,
      u.block_uid,
      (u.ord - 1)::int,
      coalesce(b.facets->>'sectionPath', ''),
      case b.block_type
        when 'shared_clinical_block' then 'shared'
        when 'pivotal_trial' then 'trial'
        when 'late_breaking_trial' then 'trial'
        when 'clinical_scenario' then 'scenario'
        when 'recommendation_atom' then 'atom'
        else 'recommendation'
      end
    from unnest(v_block_order) with ordinality as u(block_uid, ord)
    join public.neuroguide_content_blocks b
      on b.uid = u.block_uid
    on conflict (protocol_uid, block_uid, position) do nothing;
  end if;

  perform public.neuroguide_recompute_protocol_hash(v_uid);

  update public.neuroguide_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  if not coalesce(p_skip_root_rehash, false) then
    perform public.neuroguide_recompute_root_hash();
  end if;

  return query
  select
    p.uid,
    p.slug,
    p.protocol_type,
    p.society,
    p.year,
    p.title,
    p.status,
    p.subspecialties,
    p.metadata,
    p.block_order,
    p.metadata_hash,
    p.protocol_hash,
    p.rev,
    p.change_seq,
    p.created_at,
    p.updated_at,
    p.updated_by,
    p.deleted_at,
    false as unchanged
  from public.neuroguide_protocols p
  where p.uid = v_uid;
end;
$$;

create or replace function public.neuroguide_delete_protocol(
  p_uid          uuid,
  p_expected_rev int,
  p_actor        text default 'system'
)
returns table (
  uid            uuid,
  slug           text,
  protocol_type  text,
  society        text,
  year           int,
  title          text,
  status         text,
  subspecialties jsonb,
  metadata       jsonb,
  block_order    uuid[],
  metadata_hash  text,
  protocol_hash  text,
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
  v_rec     public.neuroguide_protocols%rowtype;
  v_actor   text;
  v_seq     bigint;
  v_new_rev int;
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select p.*
  into v_rec
  from public.neuroguide_protocols p
  where p.uid = p_uid
  for update;

  if not found or v_rec.deleted_at is not null then
    raise exception 'NG_NOT_FOUND:%', p_uid;
  end if;

  if v_rec.rev <> p_expected_rev then
    raise exception 'NG_REV_CONFLICT:%', v_rec.rev;
  end if;

  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_seq := nextval('public.neuroguide_change_seq');
  v_new_rev := v_rec.rev + 1;

  update public.neuroguide_protocols p
  set
    deleted_at = now(),
    rev        = v_new_rev,
    change_seq = v_seq,
    updated_at = now(),
    updated_by = v_actor
  where p.uid = p_uid;

  update public.neuroguide_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  perform public.neuroguide_recompute_root_hash();

  return query
  select
    p.uid,
    p.slug,
    p.protocol_type,
    p.society,
    p.year,
    p.title,
    p.status,
    p.subspecialties,
    p.metadata,
    p.block_order,
    p.metadata_hash,
    p.protocol_hash,
    p.rev,
    p.change_seq,
    p.created_at,
    p.updated_at,
    p.updated_by,
    p.deleted_at,
    false as unchanged
  from public.neuroguide_protocols p
  where p.uid = p_uid;
end;
$$;

-- Create a Granular / Shared Content Block
create or replace function public.neuroguide_create_block(
  p_data             jsonb,
  p_content_hash     text,
  p_section_hashes   jsonb default '{}'::jsonb,
  p_actor            text default 'system',
  p_uid              uuid default null,
  p_skip_root_rehash boolean default false
)
returns table (
  uid              uuid,
  slug             text,
  block_key        text,
  block_type       text,
  data             jsonb,
  facets           jsonb,
  content_hash     text,
  section_hashes   jsonb,
  rev              int,
  change_seq       bigint,
  created_at       timestamptz,
  updated_at       timestamptz,
  updated_by       text,
  deleted_at       timestamptz,
  unchanged        boolean,
  invalidated_tags text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block_key    text;
  v_slug         text;
  v_block_type   text;
  v_data         jsonb;
  v_facets       jsonb;
  v_status       text;
  v_actor        text;
  v_sec_hashes   jsonb;
  v_conflict_uid uuid;
  v_new_uid      uuid;
  v_seq          bigint;
  v_tags         text[] := '{}'::text[];
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'NG_INVALID_DATA:p_data must be a JSON object';
  end if;

  v_block_key := btrim(coalesce(p_data->>'blockKey', p_data->>'id', ''));
  if v_block_key = '' then
    raise exception 'NG_INVALID_SLUG:data.blockKey must be non-empty';
  end if;

  v_slug := lower(v_block_key);
  v_block_type := coalesce(nullif(btrim(p_data->>'blockType'), ''), 'recommendation');
  v_facets := coalesce(p_data->'facetIndex', p_data->'facets', '{}'::jsonb);
  v_status := coalesce(
    nullif(btrim(p_data->>'status'), ''),
    nullif(btrim(p_data#>>'{payload,practiceChange,status}'), ''),
    nullif(btrim(p_data#>>'{payload,trial,status}'), ''),
    'draft'
  );
  if (p_data ? 'blockKey') and btrim(p_data->>'blockKey') = v_block_key then
    v_data := p_data;
  else
    v_data := jsonb_set(p_data, '{blockKey}', to_jsonb(v_block_key), true);
  end if;

  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_sec_hashes := coalesce(p_section_hashes, '{}'::jsonb);

  select b.uid
  into v_conflict_uid
  from public.neuroguide_content_blocks b
  where b.slug = v_slug
    and b.deleted_at is null
  for update;

  if found then
    raise exception 'NG_SLUG_TAKEN:%', v_slug;
  end if;

  if p_uid is not null and not exists (select 1 from public.neuroguide_content_blocks b where b.uid = p_uid) then
    v_new_uid := p_uid;
  else
    v_new_uid := gen_random_uuid();
  end if;

  v_seq := nextval('public.neuroguide_change_seq');

  insert into public.neuroguide_content_blocks (
    uid,
    slug,
    block_key,
    block_type,
    data,
    facets,
    content_hash,
    section_hashes,
    rev,
    change_seq,
    updated_by
  )
  values (
    v_new_uid,
    v_slug,
    v_block_key,
    v_block_type,
    v_data,
    v_facets,
    p_content_hash,
    v_sec_hashes,
    1,
    v_seq,
    v_actor
  );

  insert into public.neuroguide_block_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    block_type,
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
    v_block_type,
    v_data,
    p_content_hash,
    '[]'::jsonb,
    v_status,
    v_actor
  );

  update public.neuroguide_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  if not coalesce(p_skip_root_rehash, false) then
    v_tags := public.neuroguide_recompute_affected_protocols(v_new_uid, v_seq);
    perform public.neuroguide_recompute_root_hash();
  else
    v_tags := array['block:' || v_new_uid::text];
  end if;

  return query
  select
    b.uid,
    b.slug,
    b.block_key,
    b.block_type,
    b.data,
    b.facets,
    b.content_hash,
    b.section_hashes,
    b.rev,
    b.change_seq,
    b.created_at,
    b.updated_at,
    b.updated_by,
    b.deleted_at,
    false as unchanged,
    v_tags as invalidated_tags
  from public.neuroguide_content_blocks b
  where b.uid = v_new_uid;
end;
$$;

-- Update Content Block with O(log N) Selective Merkle Re-Hashing
create or replace function public.neuroguide_update_block(
  p_uid            uuid,
  p_expected_rev   int,
  p_data           jsonb,
  p_content_hash   text,
  p_section_hashes jsonb default '{}'::jsonb,
  p_patch_diff     jsonb default '[]'::jsonb,
  p_actor          text default 'system'
)
returns table (
  uid              uuid,
  slug             text,
  block_key        text,
  block_type       text,
  data             jsonb,
  facets           jsonb,
  content_hash     text,
  section_hashes   jsonb,
  rev              int,
  change_seq       bigint,
  created_at       timestamptz,
  updated_at       timestamptz,
  updated_by       text,
  deleted_at       timestamptz,
  unchanged        boolean,
  invalidated_tags text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec          public.neuroguide_content_blocks%rowtype;
  v_block_key    text;
  v_slug         text;
  v_block_type   text;
  v_data         jsonb;
  v_facets       jsonb;
  v_status       text;
  v_actor        text;
  v_conflict_uid uuid;
  v_seq          bigint;
  v_new_rev      int;
  v_sec_hashes   jsonb;
  v_patch_diff   jsonb;
  v_tags         text[] := '{}'::text[];
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select b.*
  into v_rec
  from public.neuroguide_content_blocks b
  where b.uid = p_uid
  for update;

  if not found or v_rec.deleted_at is not null then
    raise exception 'NG_NOT_FOUND:%', p_uid;
  end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'NG_INVALID_DATA:p_data must be a JSON object';
  end if;

  v_block_key := btrim(coalesce(p_data->>'blockKey', p_data->>'id', ''));
  if v_block_key = '' then
    raise exception 'NG_INVALID_SLUG:data.blockKey must be non-empty';
  end if;

  v_slug := lower(v_block_key);

  if v_rec.rev <> p_expected_rev then
    raise exception 'NG_REV_CONFLICT:%', v_rec.rev;
  end if;

  -- Invariant I13: short-circuit identical writes without advancing rev/seq/revisions.
  if v_rec.deleted_at is null
     and v_rec.content_hash = p_content_hash
     and v_rec.slug = v_slug then
    return query
    select
      b.uid,
      b.slug,
      b.block_key,
      b.block_type,
      b.data,
      b.facets,
      b.content_hash,
      b.section_hashes,
      b.rev,
      b.change_seq,
      b.created_at,
      b.updated_at,
      b.updated_by,
      b.deleted_at,
      true as unchanged,
      '{}'::text[] as invalidated_tags
    from public.neuroguide_content_blocks b
    where b.uid = p_uid;
    return;
  end if;

  if v_slug <> v_rec.slug then
    select b.uid
    into v_conflict_uid
    from public.neuroguide_content_blocks b
    where b.slug = v_slug
      and b.deleted_at is null
      and b.uid <> p_uid
    for update;

    if found then
      raise exception 'NG_SLUG_TAKEN:%', v_slug;
    end if;
  end if;

  v_block_type := coalesce(nullif(btrim(p_data->>'blockType'), ''), v_rec.block_type);
  v_facets := coalesce(p_data->'facetIndex', p_data->'facets', '{}'::jsonb);
  v_status := coalesce(
    nullif(btrim(p_data->>'status'), ''),
    nullif(btrim(p_data#>>'{payload,practiceChange,status}'), ''),
    nullif(btrim(p_data#>>'{payload,trial,status}'), ''),
    'draft'
  );
  if (p_data ? 'blockKey') and btrim(p_data->>'blockKey') = v_block_key then
    v_data := p_data;
  else
    v_data := jsonb_set(p_data, '{blockKey}', to_jsonb(v_block_key), true);
  end if;

  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_sec_hashes := coalesce(p_section_hashes, '{}'::jsonb);
  v_patch_diff := coalesce(p_patch_diff, '[]'::jsonb);
  v_seq := nextval('public.neuroguide_change_seq');
  v_new_rev := v_rec.rev + 1;

  update public.neuroguide_content_blocks b
  set
    slug           = v_slug,
    block_key      = v_block_key,
    block_type     = v_block_type,
    data           = v_data,
    facets         = v_facets,
    content_hash   = p_content_hash,
    section_hashes = v_sec_hashes,
    rev            = v_new_rev,
    change_seq     = v_seq,
    updated_at     = now(),
    updated_by     = v_actor
  where b.uid = p_uid;

  insert into public.neuroguide_block_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    block_type,
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
    v_block_type,
    v_data,
    p_content_hash,
    v_patch_diff,
    v_status,
    v_actor
  );

  v_tags := public.neuroguide_recompute_affected_protocols(p_uid, v_seq);

  update public.neuroguide_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  perform public.neuroguide_recompute_root_hash();

  return query
  select
    b.uid,
    b.slug,
    b.block_key,
    b.block_type,
    b.data,
    b.facets,
    b.content_hash,
    b.section_hashes,
    b.rev,
    b.change_seq,
    b.created_at,
    b.updated_at,
    b.updated_by,
    b.deleted_at,
    false as unchanged,
    v_tags as invalidated_tags
  from public.neuroguide_content_blocks b
  where b.uid = p_uid;
end;
$$;

-- Soft-delete Content Block + Recompute Affected Protocols
create or replace function public.neuroguide_delete_block(
  p_uid          uuid,
  p_expected_rev int,
  p_actor        text default 'system'
)
returns table (
  uid              uuid,
  slug             text,
  block_key        text,
  block_type       text,
  data             jsonb,
  facets           jsonb,
  content_hash     text,
  section_hashes   jsonb,
  rev              int,
  change_seq       bigint,
  created_at       timestamptz,
  updated_at       timestamptz,
  updated_by       text,
  deleted_at       timestamptz,
  unchanged        boolean,
  invalidated_tags text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec     public.neuroguide_content_blocks%rowtype;
  v_status  text;
  v_actor   text;
  v_seq     bigint;
  v_new_rev int;
  v_tags    text[] := '{}'::text[];
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select b.*
  into v_rec
  from public.neuroguide_content_blocks b
  where b.uid = p_uid
  for update;

  if not found or v_rec.deleted_at is not null then
    raise exception 'NG_NOT_FOUND:%', p_uid;
  end if;

  if v_rec.rev <> p_expected_rev then
    raise exception 'NG_REV_CONFLICT:%', v_rec.rev;
  end if;

  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_seq := nextval('public.neuroguide_change_seq');
  v_new_rev := v_rec.rev + 1;
  v_status := coalesce(
    nullif(btrim(v_rec.data->>'status'), ''),
    nullif(btrim(v_rec.data#>>'{payload,practiceChange,status}'), ''),
    nullif(btrim(v_rec.data#>>'{payload,trial,status}'), ''),
    'draft'
  );

  update public.neuroguide_content_blocks b
  set
    deleted_at = now(),
    rev        = v_new_rev,
    change_seq = v_seq,
    updated_at = now(),
    updated_by = v_actor
  where b.uid = p_uid;

  insert into public.neuroguide_block_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    block_type,
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
    v_rec.block_type,
    v_rec.data,
    v_rec.content_hash,
    '[]'::jsonb,
    v_status,
    v_actor
  );

  v_tags := public.neuroguide_recompute_affected_protocols(p_uid, v_seq);

  update public.neuroguide_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  perform public.neuroguide_recompute_root_hash();

  return query
  select
    b.uid,
    b.slug,
    b.block_key,
    b.block_type,
    b.data,
    b.facets,
    b.content_hash,
    b.section_hashes,
    b.rev,
    b.change_seq,
    b.created_at,
    b.updated_at,
    b.updated_by,
    b.deleted_at,
    false as unchanged,
    v_tags as invalidated_tags
  from public.neuroguide_content_blocks b
  where b.uid = p_uid;
end;
$$;

-- Restore a Block Revision (Pitfall P9: forces status='draft' & strips verification)
create or replace function public.neuroguide_restore_block_revision(
  p_uid              uuid,
  p_expected_rev     int,
  p_revision_rev     int,
  p_new_content_hash text,
  p_section_hashes   jsonb default '{}'::jsonb,
  p_patch_diff       jsonb default '[]'::jsonb,
  p_actor            text default 'system'
)
returns table (
  uid              uuid,
  slug             text,
  block_key        text,
  block_type       text,
  data             jsonb,
  facets           jsonb,
  content_hash     text,
  section_hashes   jsonb,
  rev              int,
  change_seq       bigint,
  created_at       timestamptz,
  updated_at       timestamptz,
  updated_by       text,
  deleted_at       timestamptz,
  unchanged        boolean,
  invalidated_tags text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec           public.neuroguide_content_blocks%rowtype;
  v_rev_row       public.neuroguide_block_revisions%rowtype;
  v_block_key     text;
  v_slug          text;
  v_conflict_uid  uuid;
  v_restored_data jsonb;
  v_facets        jsonb;
  v_content_hash  text;
  v_sec_hashes    jsonb;
  v_patch_diff    jsonb;
  v_actor         text;
  v_seq           bigint;
  v_new_rev       int;
  v_tags          text[] := '{}'::text[];
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select b.*
  into v_rec
  from public.neuroguide_content_blocks b
  where b.uid = p_uid
  for update;

  if not found then
    raise exception 'NG_NOT_FOUND:%', p_uid;
  end if;

  if v_rec.rev <> p_expected_rev then
    raise exception 'NG_REV_CONFLICT:%', v_rec.rev;
  end if;

  select rv.*
  into v_rev_row
  from public.neuroguide_block_revisions rv
  where rv.uid = p_uid
    and rv.rev = p_revision_rev;

  if not found then
    raise exception 'NG_NOT_FOUND:revision % for %', p_revision_rev, p_uid;
  end if;

  v_block_key := btrim(coalesce(v_rev_row.data->>'blockKey', v_rev_row.data->>'id', v_rev_row.slug));
  if v_block_key = '' then
    raise exception 'NG_INVALID_SLUG:revision blockKey empty';
  end if;
  v_slug := lower(v_block_key);

  select b.uid
  into v_conflict_uid
  from public.neuroguide_content_blocks b
  where b.slug = v_slug
    and b.deleted_at is null
    and b.uid <> p_uid
  for update;

  if found then
    raise exception 'NG_SLUG_TAKEN:%', v_slug;
  end if;

  -- Pitfall P9 / G1.5: strip verification & force status='draft' at top-level and nested payload objects.
  v_restored_data := (v_rev_row.data - 'verification')
    || jsonb_build_object('blockKey', v_block_key, 'status', 'draft');

  if jsonb_typeof(v_restored_data#>'{payload,practiceChange}') = 'object' then
    v_restored_data := jsonb_set(
      v_restored_data,
      '{payload,practiceChange}',
      ((v_restored_data#>'{payload,practiceChange}') - 'verification') || '{"status":"draft"}'::jsonb,
      true
    );
  end if;

  if jsonb_typeof(v_restored_data#>'{payload,trial}') = 'object' then
    v_restored_data := jsonb_set(
      v_restored_data,
      '{payload,trial}',
      ((v_restored_data#>'{payload,trial}') - 'verification') || '{"status":"draft"}'::jsonb,
      true
    );
  end if;

  v_facets := coalesce(v_restored_data->'facetIndex', v_restored_data->'facets', '{}'::jsonb);
  v_content_hash := coalesce(nullif(btrim(p_new_content_hash), ''), v_rev_row.content_hash);
  v_sec_hashes := coalesce(p_section_hashes, '{}'::jsonb);
  v_patch_diff := coalesce(p_patch_diff, '[]'::jsonb);
  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_seq := nextval('public.neuroguide_change_seq');
  v_new_rev := v_rec.rev + 1;

  update public.neuroguide_content_blocks b
  set
    slug           = v_slug,
    block_key      = v_block_key,
    block_type     = v_rev_row.block_type,
    data           = v_restored_data,
    facets         = v_facets,
    content_hash   = v_content_hash,
    section_hashes = v_sec_hashes,
    rev            = v_new_rev,
    change_seq     = v_seq,
    deleted_at     = null,
    updated_at     = now(),
    updated_by     = v_actor
  where b.uid = p_uid;

  insert into public.neuroguide_block_revisions (
    uid,
    rev,
    change_seq,
    op,
    slug,
    block_type,
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
    v_rev_row.block_type,
    v_restored_data,
    v_content_hash,
    v_patch_diff,
    'draft',
    v_actor
  );

  v_tags := public.neuroguide_recompute_affected_protocols(p_uid, v_seq);

  update public.neuroguide_sync_state s
  set
    max_seq    = v_seq,
    updated_at = now()
  where s.id = 1;

  perform public.neuroguide_recompute_root_hash();

  return query
  select
    b.uid,
    b.slug,
    b.block_key,
    b.block_type,
    b.data,
    b.facets,
    b.content_hash,
    b.section_hashes,
    b.rev,
    b.change_seq,
    b.created_at,
    b.updated_at,
    b.updated_by,
    b.deleted_at,
    false as unchanged,
    v_tags as invalidated_tags
  from public.neuroguide_content_blocks b
  where b.uid = p_uid;
end;
$$;

-- Upsert / Replace Cross-Links between Content Blocks
create or replace function public.neuroguide_replace_block_links(
  p_links          jsonb,
  p_clear_existing boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upserted int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  if coalesce(p_clear_existing, false) then
    delete from public.neuroguide_block_links;
  end if;

  if p_links is null or jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) = 0 then
    return 0;
  end if;

  with upserted as (
    insert into public.neuroguide_block_links (
      src_block_uid,
      dst_block_uid,
      link_type,
      origin,
      status,
      evidence_src,
      evidence_dst
    )
    select distinct on (
      coalesce((l->>'srcBlockUid')::uuid, (l->>'src_block_uid')::uuid),
      coalesce((l->>'dstBlockUid')::uuid, (l->>'dst_block_uid')::uuid),
      coalesce(l->>'linkType', l->>'link_type')
    )
      coalesce((l->>'srcBlockUid')::uuid, (l->>'src_block_uid')::uuid),
      coalesce((l->>'dstBlockUid')::uuid, (l->>'dst_block_uid')::uuid),
      coalesce(l->>'linkType', l->>'link_type'),
      coalesce(nullif(btrim(l->>'origin'), ''), 'rule'),
      coalesce(nullif(btrim(l->>'status'), ''), 'approved'),
      coalesce(l->>'evidenceSrc', l->>'evidence_src'),
      coalesce(l->>'evidenceDst', l->>'evidence_dst')
    from jsonb_array_elements(p_links) with ordinality as u(l, ord)
    order by
      coalesce((l->>'srcBlockUid')::uuid, (l->>'src_block_uid')::uuid),
      coalesce((l->>'dstBlockUid')::uuid, (l->>'dst_block_uid')::uuid),
      coalesce(l->>'linkType', l->>'link_type'),
      u.ord desc
    on conflict (src_block_uid, dst_block_uid, link_type) do update
    set
      origin       = excluded.origin,
      status       = excluded.status,
      evidence_src = excluded.evidence_src,
      evidence_dst = excluded.evidence_dst
    returning id
  )
  select count(*)::int
  into v_upserted
  from upserted;

  return v_upserted;
end;
$$;

-- Query Live Content Blocks across Overlapping Multi-Axis Facets
create or replace function public.neuroguide_query_blocks_by_facets(
  p_filter jsonb default '{}'::jsonb
)
returns table (
  uid            uuid,
  slug           text,
  block_key      text,
  block_type     text,
  data           jsonb,
  facets         jsonb,
  content_hash   text,
  section_hashes jsonb,
  rev            int,
  change_seq     bigint,
  created_at     timestamptz,
  updated_at     timestamptz,
  updated_by     text,
  deleted_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filter jsonb := coalesce(p_filter, '{}'::jsonb);
begin
  return query
  select
    b.uid,
    b.slug,
    b.block_key,
    b.block_type,
    b.data,
    b.facets,
    b.content_hash,
    b.section_hashes,
    b.rev,
    b.change_seq,
    b.created_at,
    b.updated_at,
    b.updated_by,
    b.deleted_at
  from public.neuroguide_content_blocks b
  where b.deleted_at is null
    and (
      jsonb_typeof(coalesce(v_filter->'blockTypes', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'blockTypes') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'blockTypes') as needle(val)
        where lower(needle.val) = lower(b.block_type)
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'subspecialties', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'subspecialties') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'subspecialties') as needle(val)
        join jsonb_array_elements_text(coalesce(b.facets->'subspecialties', '[]'::jsonb)) as hay(val)
          on lower(hay.val) = lower(needle.val)
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'conditionIds', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'conditionIds') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'conditionIds') as needle(val)
        join jsonb_array_elements_text(coalesce(b.facets->'conditionIds', '[]'::jsonb)) as hay(val)
          on lower(hay.val) = lower(needle.val)
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'domains', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'domains') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'domains') as needle(val)
        join jsonb_array_elements_text(coalesce(b.facets->'domains', '[]'::jsonb)) as hay(val)
          on lower(hay.val) = lower(needle.val)
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'timeWindowIds', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'timeWindowIds') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'timeWindowIds') as needle(val)
        join jsonb_array_elements_text(coalesce(b.facets->'timeWindowIds', '[]'::jsonb)) as hay(val)
          on lower(hay.val) = lower(needle.val)
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'interventionTags', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'interventionTags') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'interventionTags') as needle(val)
        join jsonb_array_elements_text(coalesce(b.facets->'interventionTags', '[]'::jsonb)) as hay(val)
          on lower(hay.val) = lower(needle.val)
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'citedTrialKeys', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'citedTrialKeys') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'citedTrialKeys') as needle(val)
        join jsonb_array_elements_text(coalesce(b.facets->'citedTrialKeys', '[]'::jsonb)) as hay(val)
          on regexp_replace(lower(hay.val), '[^a-z0-9]', '', 'g')
           = regexp_replace(lower(needle.val), '[^a-z0-9]', '', 'g')
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'linkedScenarioKeys', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'linkedScenarioKeys') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'linkedScenarioKeys') as needle(val)
        join jsonb_array_elements_text(coalesce(b.facets->'linkedScenarioKeys', '[]'::jsonb)) as hay(val)
          on regexp_replace(lower(hay.val), '[^a-z0-9]', '', 'g')
           = regexp_replace(lower(needle.val), '[^a-z0-9]', '', 'g')
      )
    )
    and (
      jsonb_typeof(coalesce(v_filter->'directions', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(v_filter->'directions') = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_filter->'directions') as needle(val)
        where lower(needle.val) = lower(coalesce(b.facets->>'direction', ''))
      )
    )
  order by b.slug asc;
end;
$$;

-- Paged Delta Query: Content Blocks
create or replace function public.neuroguide_changes_since(
  p_since bigint default 0,
  p_limit int default 500
)
returns table (
  uid               uuid,
  slug              text,
  block_key         text,
  block_type        text,
  data              jsonb,
  facets            jsonb,
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
  v_state public.neuroguide_sync_state%rowtype;
  v_since bigint;
  v_limit int;
begin
  select s.*
  into v_state
  from public.neuroguide_sync_state s
  where s.id = 1;

  v_since := coalesce(p_since, 0);
  v_limit := greatest(1, least(coalesce(p_limit, 500), 500));

  return query
  select
    b.uid,
    b.slug,
    b.block_key,
    b.block_type,
    b.data,
    b.facets,
    b.content_hash,
    b.section_hashes,
    b.rev,
    b.change_seq,
    b.created_at,
    b.updated_at,
    b.updated_by,
    b.deleted_at,
    v_state.max_seq,
    v_state.purge_horizon_seq,
    v_state.root_hash
  from public.neuroguide_content_blocks b
  where b.change_seq > v_since
  order by b.change_seq asc
  limit v_limit;
end;
$$;

-- Paged Delta Query: Protocol Nodes
create or replace function public.neuroguide_protocol_changes_since(
  p_since bigint default 0,
  p_limit int default 500
)
returns table (
  uid               uuid,
  slug              text,
  protocol_type     text,
  society           text,
  year              int,
  title             text,
  status            text,
  subspecialties    jsonb,
  metadata          jsonb,
  block_order       uuid[],
  metadata_hash     text,
  protocol_hash     text,
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
  v_state public.neuroguide_sync_state%rowtype;
  v_since bigint;
  v_limit int;
begin
  select s.*
  into v_state
  from public.neuroguide_sync_state s
  where s.id = 1;

  v_since := coalesce(p_since, 0);
  v_limit := greatest(1, least(coalesce(p_limit, 500), 500));

  return query
  select
    p.uid,
    p.slug,
    p.protocol_type,
    p.society,
    p.year,
    p.title,
    p.status,
    p.subspecialties,
    p.metadata,
    p.block_order,
    p.metadata_hash,
    p.protocol_hash,
    p.rev,
    p.change_seq,
    p.created_at,
    p.updated_at,
    p.updated_by,
    p.deleted_at,
    v_state.max_seq,
    v_state.purge_horizon_seq,
    v_state.root_hash
  from public.neuroguide_protocols p
  where p.change_seq > v_since
  order by p.change_seq asc
  limit v_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Bounded Retention Purge RPC (§3.5)
-- ---------------------------------------------------------------------------

create or replace function public.neuroguide_purge()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg               public.neuroguide_sync_config%rowtype;
  v_tombstones_purged int := 0;
  v_revisions_purged  int := 0;
  v_max_purged_seq    bigint := 0;
  v_horizon           bigint := 0;
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select cfg.*
  into v_cfg
  from public.neuroguide_sync_config cfg
  where cfg.id = 1;

  with purged_blocks as (
    delete from public.neuroguide_content_blocks b
    where b.deleted_at is not null
      and b.deleted_at < now() - make_interval(days => v_cfg.tombstone_retention_days)
    returning b.change_seq
  ),
  purged_protocols as (
    delete from public.neuroguide_protocols p
    where p.deleted_at is not null
      and p.deleted_at < now() - make_interval(days => v_cfg.tombstone_retention_days)
    returning p.change_seq
  ),
  all_purged as (
    select change_seq from purged_blocks
    union all
    select change_seq from purged_protocols
  )
  select count(*)::int, coalesce(max(all_purged.change_seq), 0)
  into v_tombstones_purged, v_max_purged_seq
  from all_purged;

  if v_max_purged_seq > 0 then
    update public.neuroguide_sync_state s
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
    from public.neuroguide_block_revisions rv
  ),
  purged_revisions as (
    delete from public.neuroguide_block_revisions rv
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

  perform public.neuroguide_recompute_root_hash();

  select s.purge_horizon_seq
  into v_horizon
  from public.neuroguide_sync_state s
  where s.id = 1;

  return jsonb_build_object(
    'tombstones_purged', v_tombstones_purged,
    'revisions_purged', v_revisions_purged,
    'purge_horizon_seq', v_horizon
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Lock down RPC execution to service_role only (§3.2)
-- ---------------------------------------------------------------------------

revoke execute on function public.neuroguide_recompute_protocol_hash(uuid) from public, anon, authenticated;
grant  execute on function public.neuroguide_recompute_protocol_hash(uuid) to service_role;

revoke execute on function public.neuroguide_recompute_root_hash() from public, anon, authenticated;
grant  execute on function public.neuroguide_recompute_root_hash() to service_role;

revoke execute on function public.neuroguide_recompute_affected_protocols(uuid, bigint) from public, anon, authenticated;
grant  execute on function public.neuroguide_recompute_affected_protocols(uuid, bigint) to service_role;

revoke execute on function public.neuroguide_upsert_protocol(text, text, text, int, text, text, jsonb, jsonb, uuid[], text, jsonb, text, uuid, int, boolean) from public, anon, authenticated;
grant  execute on function public.neuroguide_upsert_protocol(text, text, text, int, text, text, jsonb, jsonb, uuid[], text, jsonb, text, uuid, int, boolean) to service_role;

revoke execute on function public.neuroguide_delete_protocol(uuid, int, text) from public, anon, authenticated;
grant  execute on function public.neuroguide_delete_protocol(uuid, int, text) to service_role;

revoke execute on function public.neuroguide_create_block(jsonb, text, jsonb, text, uuid, boolean) from public, anon, authenticated;
grant  execute on function public.neuroguide_create_block(jsonb, text, jsonb, text, uuid, boolean) to service_role;

revoke execute on function public.neuroguide_update_block(uuid, int, jsonb, text, jsonb, jsonb, text) from public, anon, authenticated;
grant  execute on function public.neuroguide_update_block(uuid, int, jsonb, text, jsonb, jsonb, text) to service_role;

revoke execute on function public.neuroguide_delete_block(uuid, int, text) from public, anon, authenticated;
grant  execute on function public.neuroguide_delete_block(uuid, int, text) to service_role;

revoke execute on function public.neuroguide_restore_block_revision(uuid, int, int, text, jsonb, jsonb, text) from public, anon, authenticated;
grant  execute on function public.neuroguide_restore_block_revision(uuid, int, int, text, jsonb, jsonb, text) to service_role;

revoke execute on function public.neuroguide_replace_block_links(jsonb, boolean) from public, anon, authenticated;
grant  execute on function public.neuroguide_replace_block_links(jsonb, boolean) to service_role;

revoke execute on function public.neuroguide_query_blocks_by_facets(jsonb) from public, anon, authenticated;
grant  execute on function public.neuroguide_query_blocks_by_facets(jsonb) to service_role;

revoke execute on function public.neuroguide_changes_since(bigint, int) from public, anon, authenticated;
grant  execute on function public.neuroguide_changes_since(bigint, int) to service_role;

revoke execute on function public.neuroguide_protocol_changes_since(bigint, int) from public, anon, authenticated;
grant  execute on function public.neuroguide_protocol_changes_since(bigint, int) to service_role;

revoke execute on function public.neuroguide_purge() from public, anon, authenticated;
grant  execute on function public.neuroguide_purge() to service_role;

COMMIT;
