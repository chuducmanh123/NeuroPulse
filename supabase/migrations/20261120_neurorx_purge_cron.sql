-- NeuroRx Sync v2 — Phase 7 Weekly Retention Purge Schedule (pg_cron)
-- Design contract: tasks/neurorx-sync/00-design-neurorx-sync.md §3.5
--
-- Schedules public.neurorx_purge() every Sunday at 03:00 UTC.
-- Guarded in a DO block so projects on Supabase tiers without pg_cron exit cleanly
-- with a notice and fall back to `.github/workflows/neurorx_purge.yml`.

do $$
declare
  v_existing_job_id bigint;
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron extension unavailable on current tier (%). Using GitHub Actions fallback (.github/workflows/neurorx_purge.yml).', sqlerrm;
    return;
  end;

  select jobid
  into v_existing_job_id
  from cron.job
  where jobname = 'neurorx_purge_weekly'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'neurorx_purge_weekly',
    '0 3 * * 0',
    'select public.neurorx_purge()'
  );

  raise notice 'Scheduled pg_cron job neurorx_purge_weekly (0 3 * * 0 UTC).';
exception when others then
  raise notice 'Could not schedule pg_cron job (%). Using GitHub Actions fallback (.github/workflows/neurorx_purge.yml).', sqlerrm;
end;
$$;
