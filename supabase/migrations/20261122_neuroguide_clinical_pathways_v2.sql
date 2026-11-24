-- NeuroGuide Clinical Pathways — Sync v2 Extension Migration
-- Reference contract:
--   SPEC-clinical-pathways.md (§2, §3, §7.1)
--   supabase/migrations/20261118_neuroguide_granular_sync_v2.sql
-- Idempotent migration wrapped in a single transaction; extends Sync v2 constraints & RPCs
-- without modifying legacy tables or altering the original 20261118 migration file.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend CHECK constraints for clinical_pathway, pathway_node, pathway_step
-- ---------------------------------------------------------------------------

alter table public.neuroguide_protocols
  drop constraint if exists neuroguide_protocols_protocol_type_check;

alter table public.neuroguide_protocols
  add constraint neuroguide_protocols_protocol_type_check
  check (protocol_type in ('guideline', 'conference', 'scenario_catalog', 'clinical_pathway'));

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
      'recommendation_atom',
      'pathway_node'
    )
  );

alter table public.neuroguide_protocol_blocks
  drop constraint if exists neuroguide_protocol_blocks_role_check;

alter table public.neuroguide_protocol_blocks
  add constraint neuroguide_protocol_blocks_role_check
  check (
    role in ('recommendation', 'shared', 'trial', 'scenario', 'atom', 'pathway_step')
  );

-- ---------------------------------------------------------------------------
-- 2. Update neuroguide_upsert_protocol to map pathway_node -> pathway_step
-- ---------------------------------------------------------------------------

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
          when 'pathway_node' then 'pathway_step'
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
        when 'pathway_node' then 'pathway_step'
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

revoke all on function public.neuroguide_upsert_protocol(
  text, text, text, int, text, text, jsonb, jsonb, uuid[], text, jsonb, text, uuid, int, boolean
) from public, anon, authenticated;

grant execute on function public.neuroguide_upsert_protocol(
  text, text, text, int, text, text, jsonb, jsonb, uuid[], text, jsonb, text, uuid, int, boolean
) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Update neuroguide_restore_block to force pathwayStatus = 'draft'
-- ---------------------------------------------------------------------------

create or replace function public.neuroguide_restore_block(
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

  if v_restored_data #>> '{payload,kind}' = 'pathway_node' then
    v_restored_data := jsonb_set(
      v_restored_data,
      '{payload,pathwayStatus}',
      '"draft"'::jsonb,
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

revoke all on function public.neuroguide_restore_block(
  uuid, int, int, text, jsonb, jsonb, text
) from public, anon, authenticated;

grant execute on function public.neuroguide_restore_block(
  uuid, int, int, text, jsonb, jsonb, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Atomic soft-delete protocol restore (always restored as 'draft')
-- ---------------------------------------------------------------------------

create or replace function public.neuroguide_restore_protocol(
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
  deleted_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing     public.neuroguide_protocols%rowtype;
  v_conflict_uid uuid;
  v_actor        text;
  v_seq          bigint;
  v_new_rev      int;
  v_metadata     jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('neuroguide_sync'));

  select p.*
  into v_existing
  from public.neuroguide_protocols p
  where p.uid = p_uid
    and p.deleted_at is not null
  for update;

  if not found then
    raise exception 'NG_NOT_FOUND:%', p_uid;
  end if;

  if v_existing.rev <> p_expected_rev then
    raise exception 'NG_REV_CONFLICT:%', v_existing.rev;
  end if;

  select p.uid
  into v_conflict_uid
  from public.neuroguide_protocols p
  where p.slug = v_existing.slug
    and p.deleted_at is null
    and p.uid <> p_uid
  for update;

  if found then
    raise exception 'NG_SLUG_TAKEN:%', v_existing.slug;
  end if;

  v_actor := coalesce(nullif(btrim(p_actor), ''), 'system');
  v_seq := nextval('public.neuroguide_change_seq');
  v_new_rev := v_existing.rev + 1;
  v_metadata := v_existing.metadata;

  if v_existing.protocol_type = 'clinical_pathway'
     and jsonb_typeof(v_metadata->'pathway') = 'object' then
    v_metadata := jsonb_set(v_metadata, '{pathway,status}', '"draft"'::jsonb, true);
  end if;

  update public.neuroguide_protocols p
  set
    deleted_at = null,
    status     = 'draft',
    metadata   = v_metadata,
    rev        = v_new_rev,
    change_seq = v_seq,
    updated_at = now(),
    updated_by = v_actor
  where p.uid = p_uid;

  perform public.neuroguide_recompute_protocol_hash(p_uid);

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
    p.deleted_at
  from public.neuroguide_protocols p
  where p.uid = p_uid;
end;
$$;

revoke all on function public.neuroguide_restore_protocol(uuid, int, text)
  from public, anon, authenticated;

grant execute on function public.neuroguide_restore_protocol(uuid, int, text)
  to service_role;

COMMIT;
