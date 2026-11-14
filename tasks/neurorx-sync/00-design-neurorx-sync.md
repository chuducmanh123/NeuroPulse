# NeuroRx Sync v2 — Binding Design Contract

> **Status:** APPROVED v2.0 (2026-11-14) · **Owner:** user · **Applies to:** NeuroRx first, NeuroGuide later (Phase 8)
> **Read this file in full before any phase.** If a phase prompt, existing code, or your own idea conflicts with this file → STOP and ask the user. Do not "improve" the design silently.
> Companion files: [readme-neurorx-sync.md](./readme-neurorx-sync.md) · [10-phases-neurorx-sync.md](./10-phases-neurorx-sync.md) · [20-evaluation-neurorx-sync.md](./20-evaluation-neurorx-sync.md) · [progress-neurorx-sync.md](./progress-neurorx-sync.md) · [simulator-neurorx-sync.html](./simulator-neurorx-sync.html)

---

## 1. Problem statement (why this exists)

Current `src/lib/neurorx/data.ts` keeps drug data in 4 tiers (static files, `/tmp`, process memory, Supabase) with no ordering between them, slug-based tombstones in a separate list, heuristic merging (`mergeDrugRecords`), and `force-dynamic` + `router.push` page rendering. This reproduces the NeuroGuide bugs:

| ID | Bug | Root cause |
| :-- | :-- | :-- |
| B1 | Edit on machine A, machine B still shows old content | Per-instance `/tmp` + memory caches; no version to compare |
| B2 | Edit saved OK, gone after F5 | Read path may hit an instance/tier that never saw the write; no revision marker |
| B3 | Deleted item reappears | Tombstones live in a separate list; static files / other tiers resurrect it |
| B4 | New item invisible because it reuses a deleted ID | Tombstone keyed by slug, not by immutable identity |
| B5 | 5–10 s delay on page load and on every drug click | `force-dynamic` + Supabase round-trip per render + `router.push` RSC round-trip |
| B6 | Intentionally cleared fields come back | `mergeDrugRecords` re-fills empty fields from baseline |

## 2. Invariants (MUST hold at all times — evaluators check every one)

- **I1 Single source of truth.** At runtime, drug records are read **only** from Supabase table `neurorx_drug_records` (server) or from the client's IndexedDB mirror of it (client). No runtime reads of `data/neurorx/drugs/*.json`, `/tmp`, or module-level mutable caches for drug records.
- **I2 Immutable identity.** Every record has `uid uuid` that never changes. `slug` (= `data.id`, e.g. `levetiracetam`) is mutable and unique **only among non-deleted rows**.
- **I3 Tombstone on the row.** Delete = set `deleted_at`. No separate deleted-ID lists. Recreating the same slug creates a **new uid**.
- **I4 Monotonic change sequence.** Every insert/update/soft-delete assigns a new `change_seq` from one global sequence, and **commit order == change_seq order** (guaranteed by an advisory lock inside the write RPC — see §3.3).
- **I5 Per-record revision.** `rev` starts at 1 and increments by exactly 1 on each write.
- **I6 Optimistic concurrency.** Every update/delete must carry `expected_rev`. Mismatch → HTTP 409 with the current server row. Never silently overwrite.
- **I7 Client apply rule.** Client applies an incoming row only if `incoming.rev > local.rev` for that uid (or uid unknown). Tombstones remove the uid locally. Applying is idempotent and order-independent.
- **I8 Write-through on save.** After a successful write, the API returns the stored row; the client writes it to IndexedDB immediately (before any re-fetch).
- **I9 No HTTP caching of sync APIs.** All `/api/neurorx/sync/*` responses carry `Cache-Control: no-store`. The service worker never intercepts `/api/*`.
- **I10 Clinical integrity untouched.** `data` jsonb is exactly a `DrugRecord`. `uid/rev/change_seq/deleted_at/updated_*` live in columns, never inside `data`, so `computeContentHashSync` results are unchanged. Effective status (verified/draft/retired + hash match) is still computed with the existing `integrity.ts` logic on read.
- **I11 History is append-only and bounded.** Every write appends a row to `neurorx_drug_revisions`. Retention per §3.5. Revisions are never sent to normal clients.
- **I12 Reversible rollout.** Until Phase 7, the legacy read path stays available behind the flag `NEXT_PUBLIC_NEURORX_SYNC_V2` (`"1"` = v2). Legacy tables are not modified or dropped by any phase before Phase 7, and dropping requires explicit user approval.
- **I13 3-Tier Merkle Hashing, Content-Hash Short-Circuit & Batched Root Re-hashing.**
  - *Tier 3 (Leaf — Clinical Sections):* `neurorx_drug_records.section_hashes jsonb` hashes each clinical section (`regimens`, `renal_impairment`, `hepatic`, `reproductive`, `fda_interactions`, `adverse_effects`, `vn_products`, `core`) so conflict detection & 3-way merge skip unchanged sections in $O(1)$.
  - *Tier 2 (Branch — Drug Record):* `neurorx_drug_records.content_hash text not null` (SHA-256 of canonicalized `data`, matching `computeContentHashSync`). In `neurorx_update_drug`, if `deleted_at IS NULL` and both `content_hash` and `slug` are unchanged, the RPC returns early (`unchanged = true`) without bumping `rev`, `change_seq`, `neurorx_drug_revisions`, or waking Realtime clients.
  - *Tier 1 (Root — Collection):* `neurorx_sync_state.root_hash text not null` (SHA-256 over all live `uid:rev:content_hash` ordered by `uid`). Computed via batched statement-level `neurorx_recompute_root_hash()` (once per write RPC or once at the end of bulk migrations) and client-debounced (300 ms) on Realtime bursts.
- **I14 Delta Audit Log (RFC 6902 JSON Patch) + Snapshot.** `neurorx_drug_revisions` stores `patch_diff jsonb not null default '[]'::jsonb` (RFC 6902 operations `{ op, path, old_value, new_value }` generated by zero-dependency `src/lib/neurorx/sync/jsonPatch.ts`) alongside `data jsonb` (full snapshot after write) and `content_hash text`. This enables instant field-level diff inspection in Admin History & Conflict views while keeping 1-click atomic restore.
- **I15 Tag-Based Cache Invalidation & Local Draft Auto-Save.** Server mutations invoke Next.js `revalidateTag('neurorx:drugs')` and `revalidateTag('neurorx:drug:' + uid)`. The Admin editor (`EditDrugModal`) auto-saves unsaved edits to `localStorage` (`neurorx-draft:${uid}:${baseRev}`) every 3 seconds and clears the draft only upon confirmed save, preventing clinical work loss on network drops or 409 conflicts.

## 3. Database (Supabase / Postgres)

### 3.1 Tables

```sql
create sequence if not exists neurorx_change_seq;

create table if not exists neurorx_drug_records (
  uid            uuid primary key default gen_random_uuid(),
  slug           text not null check (slug = lower(btrim(slug)) and slug <> ''),
  data           jsonb not null,
  content_hash   text not null,              -- Tier 2: SHA-256 of canonicalized data (matches computeContentHashSync)
  section_hashes jsonb not null default '{}'::jsonb, -- Tier 3: per-section SHA-256 leaf map
  rev            int not null default 1,
  change_seq     bigint not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     text not null default 'system',
  deleted_at     timestamptz,
  constraint data_id_matches_slug check (lower(btrim(data->>'id')) = slug)
);
create unique index if not exists neurorx_drug_records_slug_live
  on neurorx_drug_records (slug) where deleted_at is null;
create index if not exists neurorx_drug_records_seq on neurorx_drug_records (change_seq);

create table if not exists neurorx_drug_revisions (
  id           bigserial primary key,
  uid          uuid not null,
  rev          int not null,
  change_seq   bigint not null,
  op           text not null check (op in ('insert','update','delete','restore')),
  slug         text not null,
  data         jsonb not null,           -- full snapshot AFTER the write
  content_hash text not null,            -- SHA-256 of data at this revision
  patch_diff   jsonb not null default '[]'::jsonb, -- RFC 6902 JSON Patch ops (old_value -> new_value)
  status       text,                     -- data->>'status' copied for retention rules
  actor        text not null,
  created_at   timestamptz not null default now(),
  unique (uid, rev)
);
create index if not exists neurorx_drug_revisions_uid on neurorx_drug_revisions (uid, rev desc);
create index if not exists neurorx_drug_revisions_created on neurorx_drug_revisions (created_at);

-- Single-row signal table: the ONLY thing anonymous clients may read / subscribe to.
create table if not exists neurorx_sync_state (
  id                 int primary key check (id = 1),
  max_seq            bigint not null default 0,
  purge_horizon_seq  bigint not null default 0,  -- tombstones with seq <= this were hard-deleted
  root_hash          text not null default '',   -- Tier 1: Merkle root over live (uid:rev:content_hash)
  updated_at         timestamptz not null default now()
);
insert into neurorx_sync_state (id) values (1) on conflict do nothing;

create table if not exists neurorx_sync_config (
  id                               int primary key check (id = 1),
  tombstone_retention_days         int not null default 90,
  revision_retention_days          int not null default 90,
  revision_keep_min_per_uid        int not null default 5,
  verified_revision_retention_days int not null default 365
);
insert into neurorx_sync_config (id) values (1) on conflict do nothing;
```

### 3.2 Security (RLS)

- Enable RLS on all four tables.
- `neurorx_drug_records`, `neurorx_drug_revisions`, `neurorx_sync_config`: **no** policies for `anon`/`authenticated` (server uses service role).
- `neurorx_sync_state`: `select` policy for `anon` only. Add to realtime publication:
  `alter publication supabase_realtime add table neurorx_sync_state;`
- All RPC functions: `revoke execute ... from public, anon, authenticated; grant execute ... to service_role;`
- Server must have `SUPABASE_SERVICE_ROLE_KEY`. `src/lib/supabase.ts` currently falls back to the anon key — v2 server code must **refuse to write** (return 503 with a clear message) when the service role key is missing, instead of silently falling back.

### 3.3 Write RPCs (the only way rows change)

All writes go through these `plpgsql` functions. Each one starts with
`perform pg_advisory_xact_lock(hashtext('neurorx_sync'));`
and locks the target row via `SELECT ... FOR UPDATE` so that:
- sequence assignment order equals commit order (prevents a reader from advancing past a seq that commits later — the "skipped change" bug), and
- concurrent editors cannot silently overwrite each other (`rev` check + revision append + row update happen in a single ACID transaction).

| Function | Args | Behaviour | Errors (raise with SQLSTATE / message prefix) |
| :-- | :-- | :-- | :-- |
| `neurorx_create_drug` | `p_data jsonb, p_content_hash text, p_section_hashes jsonb, p_actor text, p_skip_root_rehash boolean default false` | slug := lower(trim(p_data->>'id')); insert with rev 1, new seq; append revision op `insert` (with `patch_diff = []`); update `sync_state.max_seq` (& `root_hash` unless `p_skip_root_rehash`) | `NRX_SLUG_TAKEN` if a live row has that slug |
| `neurorx_update_drug` | `p_uid uuid, p_expected_rev int, p_data jsonb, p_content_hash text, p_section_hashes jsonb, p_patch_diff jsonb, p_actor text` | `SELECT ... FOR UPDATE`; if `deleted_at IS NULL` and `content_hash = p_content_hash` and `slug = new_slug` → **return row as-is (no-op, rev/seq unchanged)** (I13); else verify `rev = p_expected_rev`; update `rev+1`, new seq, slug from data (rename allowed); append revision `update` with `p_patch_diff`; update `sync_state.max_seq` & `root_hash` | `NRX_NOT_FOUND`, `NRX_REV_CONFLICT` (include current rev), `NRX_SLUG_TAKEN` |
| `neurorx_delete_drug` | `p_uid, p_expected_rev, p_actor` | `SELECT ... FOR UPDATE`; set `deleted_at`, `rev+1`, new seq; revision `delete`; update `sync_state` (`max_seq` & `root_hash`) | `NRX_NOT_FOUND`, `NRX_REV_CONFLICT` |
| `neurorx_restore_revision` | `p_uid, p_expected_rev, p_revision_rev int, p_new_content_hash text, p_section_hashes jsonb, p_patch_diff jsonb, p_actor` | `SELECT ... FOR UPDATE`; copy `data` from that revision into the live row (un-delete if needed, slug must be free); force `status='draft'` and strip `verification` (G1.5); `rev+1`, new seq; revision `restore`; update `sync_state` | `NRX_NOT_FOUND`, `NRX_REV_CONFLICT`, `NRX_SLUG_TAKEN` |
| `neurorx_recompute_root_hash` | — | **Batched re-hashing helper:** computes deterministic `root_hash = encode(sha256(string_agg(uid::text || ':' || rev::text || ':' || content_hash, '|' order by uid)::bytea), 'hex')` across all live rows and updates `neurorx_sync_state`. Called at the end of single writes and once after bulk batches (`migrate-to-v2`) | — |
| `neurorx_changes_since` | `p_since bigint, p_limit int` | returns rows with `change_seq > p_since` order by change_seq limit p_limit (includes tombstones) + `max_seq`, `purge_horizon_seq`, `root_hash` | — |
| `neurorx_purge` | — | retention per §3.5; updates `purge_horizon_seq` & `root_hash`; returns counts | — |

All mutating functions return the full row (`uid, slug, data, content_hash, section_hashes, rev, change_seq, updated_at, updated_by, deleted_at`) plus `unchanged boolean` (true only on I13 no-op).
`sync_state.max_seq` and `sync_state.root_hash` are updated inside the same transaction whenever a change occurs (for bulk imports, pass `p_skip_root_rehash = true` per row and call `neurorx_recompute_root_hash()` once at the end to avoid $O(N^2)$ root re-hashing).

Verification (`rx:verify` / admin "verify") is just an `neurorx_update_drug` call whose `p_data` contains the new `status/verification/content_hash` computed server-side by existing `integrity.ts`.

### 3.4 Read API for clients

Clients never query tables directly. They use `GET /api/neurorx/sync/changes` (§4), which calls `neurorx_changes_since` with the service role.

### 3.5 Retention (history must be bounded)

`neurorx_purge()` (scheduled weekly, see Phase 7):
1. **Tombstones:** hard-delete rows in `neurorx_drug_records` with `deleted_at < now() - tombstone_retention_days`. Set `purge_horizon_seq = max(change_seq of purged rows, previous value)`.
2. **Revisions:** delete a revision only if **all** hold:
   - `created_at < now() - revision_retention_days`, and
   - it is not among the newest `revision_keep_min_per_uid` revisions of its uid, and
   - NOT (`status = 'verified'` and `created_at >= now() - verified_revision_retention_days`).
   Revisions of hard-deleted uids follow the same rule (they age out naturally).
3. Return `{ tombstones_purged, revisions_purged }`.

Confirmed defaults (stored in `neurorx_sync_config`, editable via SQL/admin): tombstones **90 d** · revisions **90 d** · always keep last **5** per drug · verified snapshots **365 d (1 year)**.

Scheduling: use `pg_cron` directly in Supabase (`select cron.schedule('neurorx_purge_weekly','0 3 * * 0','select neurorx_purge()')`). Also ship `.github/workflows/neurorx_purge.yml` (weekly Sunday cron calling `POST /api/neurorx/sync/purge` with admin token secret) as automatic fallback if the current Supabase tier does not have `pg_cron` enabled.

## 4. HTTP API (Next.js route handlers, `src/app/api/neurorx/sync/...`)

All responses: JSON, `Cache-Control: no-store`. Mutations require `verifyAdminToken` (existing `@/utils/security`). Server code uses a **repository interface** (§6) so routes are testable without Supabase.

| Method & path | Auth | Request | Success | Errors |
| :-- | :-- | :-- | :-- | :-- |
| `GET /api/neurorx/sync/changes?since=<int>&limit=<int≤500>` | public | optional `If-None-Match` | `200 { changes: SyncRow[], maxSeq, rootHash, hasMore, reset: boolean }` + header `ETag: "nrx-v2-<maxSeq>-<rootHash>"`; or `304 Not Modified` when `If-None-Match` matches current `ETag` (reads only single row `neurorx_sync_state`) | `400` bad params |
| `POST /api/neurorx/sync/drugs` | admin | `{ data: DrugRecord }` | `201 { row }` | `409 { code:"SLUG_TAKEN" }`, `400` invalid |
| `PUT /api/neurorx/sync/drugs/[uid]` | admin | `{ data, expectedRev }` | `200 { row, unchanged: boolean }` | `409 { code:"REV_CONFLICT", current: row }`, `409 SLUG_TAKEN`, `404` |
| `DELETE /api/neurorx/sync/drugs/[uid]?expectedRev=` | admin | — | `200 { row }` (tombstone) | `409 REV_CONFLICT`, `404` |
| `GET /api/neurorx/sync/drugs/[uid]/history` | admin | — | `200 { revisions: RevisionRow[] }` newest first (includes `patchDiff`) | `404` |
| `POST /api/neurorx/sync/drugs/[uid]/restore` | admin | `{ revisionRev, expectedRev }` | `200 { row }` | `409`, `404` |
| `POST /api/neurorx/sync/purge` | admin | — | `200 { tombstones_purged, revisions_purged }` | — |

`reset: true` when `since > 0 && since < purge_horizon_seq` → client must wipe its store and re-pull from 0.
`hasMore: true` when the page is full → client keeps pulling with `since = last change_seq`.

Server-side validation on create/update: run the existing NeuroRx validator (`src/lib/neurorx/validate.ts`), compute `contentHash` (`computeContentHashSync`), `sectionHashes` (Tier-3 Merkle leaf map), and `patchDiff` (`computeJsonPatch` against the current server record, zero-dependency RFC 6902 diff in `src/lib/neurorx/sync/jsonPatch.ts`), force `status` to `draft` unless the request is the explicit verify action (G1.5), and call Next.js `revalidateTag('neurorx:drugs')` + `revalidateTag('neurorx:drug:' + uid)` when `unchanged === false`. Reject `data.id` that does not normalise to a slug.

```ts
type JsonPatchOp = {
  op: "replace" | "add" | "remove";
  path: string;          // JSON Pointer e.g. "/regimens/0/dose"
  old_value?: unknown;
  new_value?: unknown;
};

type SyncRow = {
  uid: string; slug: string; data: DrugRecord;
  contentHash: string; sectionHashes: Record<string, string>;
  rev: number; changeSeq: number; updatedAt: string; updatedBy: string; deletedAt: string | null;
};

type RevisionRow = {
  id: number; uid: string; rev: number; changeSeq: number;
  op: "insert" | "update" | "delete" | "restore";
  slug: string; data: DrugRecord; contentHash: string; patchDiff: JsonPatchOp[];
  status: string | null; actor: string; createdAt: string;
};
```

## 5. Client sync engine (browser)

Files under `src/lib/neurorx/sync/` (client-safe, no Node imports).

### 5.1 Local store
- IndexedDB database `neurorx-sync-v{SCHEMA_VERSION}` (start at 1), object stores: `drugs` (key `uid`, value `SyncRow`, only live rows), `meta` (`lastSeq`, `lastSyncAt`).
- Written with the raw IndexedDB API (no new dependency). Interface `LocalStore` with two implementations: `IdbLocalStore` (browser) and `MemoryLocalStore` (tests, and fallback when IndexedDB is unavailable, e.g. private mode).
- On `SCHEMA_VERSION` change: delete older `neurorx-sync-v*` databases.

### 5.2 Pure apply function
`applyChanges(current: Map<uid, SyncRow>, incoming: SyncRow[]) → { next, applied, removed }` — implements I7. Pure, fully unit-tested.

### 5.3 Engine
- `start()`: load local store → emit snapshot immediately → `pull()`.
- `pull()`: **single-flight** (concurrent triggers coalesce into one in-flight request + at most one queued follow-up). Sends `If-None-Match` matching the last known `ETag` (`"nrx-v2-<lastSeq>-<rootHash>"`) so unchanged polls return `304 Not Modified`. Loops while `hasMore`. Handles `reset`. Persists rows, `rootHash`, `eTag`, **and** `lastSeq` in one IndexedDB transaction. `lastSeq = max(changeSeq applied)`, never decreases except on reset.
- Triggers: start, `visibilitychange` → visible, `online`, Supabase Realtime update on `neurorx_sync_state` (debounced 300 ms to coalesce rapid consecutive edits; triggers `pull()` only when `max_seq > lastSeq` or `root_hash !== localRootHash`), and a safety poll every 60 s while visible (covers dropped realtime sockets).
- Realtime: `supabase.channel('neurorx-sync').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'neurorx_sync_state' }, ...)`. The payload is used only as a signal; data always comes from `/changes`.
- `applyLocalWrite(row)`: used after a successful admin save (I8).
- Exposes a subscribe API consumed by a React hook `useNeuroRxDrugs()` → `{ drugs: DrugWithEffectiveStatus[], status: 'loading'|'ready'|'syncing'|'offline'|'error', lastSyncAt, lastChangeCount }`. Effective status computed on the client with existing `integrity.ts` functions (they must stay isomorphic; if `computeContentHashSync` uses `node:crypto`, the hook uses the async `computeContentHash` instead — verify, do not guess).

### 5.4 UI rules
- `/neurorx` page: no `force-dynamic`, no Supabase call at render. Static shell + static `sources`/`interactions` (unchanged, file-based). Drugs come from the hook.
- Selecting a drug updates the URL with `window.history.pushState` (no `router.push`), so detail opens from memory (< 150 ms, 0 network requests). Confirm Next 16 behaviour of native `pushState` with `useSearchParams` in `node_modules/next/dist/docs/` before relying on it.
- First visit with empty store: show skeleton, pull from 0.
- Small sync indicator (extend `OfflineStatus.tsx`): "Up to date · 12:03 · seq #N", "Updating…", "Offline — showing saved data", "N drugs updated".
- Admin:
  - **Local Draft Auto-Save (I15):** `EditDrugModal` persists unsaved changes to `localStorage` (`neurorx-draft:${uid}:${baseRev}`) every 3 seconds and restores on reopen if newer than server; clears draft only after confirmed API save.
  - **3-Mode Conflict Dialog (I6):** every save/delete sends `expectedRev`; on HTTP 409 show `ConflictDialog.tsx` displaying field-level diff (`jsonPatch.ts`: mine vs cloud) and three actions: **Use Cloud** (`KEEP_SERVER`: discard local conflict and `applyLocalWrite(current)`), **Smart Merge** (`MERGE`: 3-way merge non-conflicting fields and resend with `current.rev`), and **Force Overwrite** (`KEEP_MINE`: resend mine with `current.rev`).
  - **Delta History Panel (I14):** `HistoryPanel.tsx` renders each revision's `rev`, `op`, `actor`, `createdAt`, human-readable `patch_diff` entries (`path`, `old_value` → `new_value`), and offers "Restore as draft".

## 6. Server repository layer

`src/lib/neurorx/sync/repo.ts` defines:

```ts
interface DrugRepo {
  getSyncState(): Promise<{ maxSeq: number; purgeHorizonSeq: number; rootHash: string }>;
  changesSince(since: number, limit: number): Promise<{ rows: SyncRow[]; maxSeq: number; purgeHorizonSeq: number; rootHash: string }>;
  getByUid(uid: string): Promise<SyncRow | null>;
  create(data: DrugRecord, contentHash: string, sectionHashes: Record<string, string>, actor: string, opts?: { skipRootRehash?: boolean }): Promise<SyncRow>; // throws RepoError('SLUG_TAKEN')
  recomputeRootHash(): Promise<string>;
  update(uid: string, expectedRev: number, data: DrugRecord, contentHash: string, sectionHashes: Record<string, string>, patchDiff: JsonPatchOp[], actor: string): Promise<{ row: SyncRow; unchanged: boolean }>; // REV_CONFLICT | NOT_FOUND | SLUG_TAKEN
  remove(uid: string, expectedRev: number, actor: string): Promise<SyncRow>;
  history(uid: string): Promise<RevisionRow[]>;
  restore(uid: string, expectedRev: number, revisionRev: number, contentHash: string, sectionHashes: Record<string, string>, patchDiff: JsonPatchOp[], actor: string): Promise<SyncRow>;
  purge(now?: Date): Promise<{ tombstonesPurged: number; revisionsPurged: number }>;
}
```

- `SupabaseDrugRepo` calls the RPCs (`supabaseAdmin.rpc(...)`) and maps `NRX_*` errors to `RepoError` codes.
- `MemoryDrugRepo` re-implements the **same semantics** (seq, rev, slug-live uniqueness, tombstones, revisions, retention) for unit tests. A shared contract test suite runs against `MemoryDrugRepo` always and against `SupabaseDrugRepo` only when `NEURORX_SYNC_IT=1` (integration, uses slugs prefixed `zz-sync-test-` and cleans up).

## 7. Migration of existing data

The **effective state users see today** (output of legacy `getAllDrugs()` after Supabase sync — already merged and tombstone-filtered) is the migration source. Steps (Phase 0 + Phase 3):
1. Export snapshot JSON + summary (count, verified count, hash-match count, list of slugs) to `data/neurorx/_migration/` — committed for audit.
2. Import into `neurorx_drug_records` via `neurorx_create_drug` (actor `migration-v2`), idempotent: skip slugs that already exist live.
3. Post-check: same slug set, same per-slug `computeContentHashSync`, same verified/hash-match counts. Any difference = stop.
4. Legacy `deleted_drugs.json` / `neurorx_system_deleted_drugs` are **not** migrated as tombstones (those drugs are simply absent).

## 8. File-based tooling after cutover

`rx:validate`, `rx:check-quotes`, `rx:check-constants` and CI read `data/neurorx/drugs/*.json`. After cutover those files become a **read-only mirror exported from the DB** (`npm run rx:pull` = export live rows to files; confirmed by user in [readme-neurorx-sync.md](./readme-neurorx-sync.md)). `rx:verify` and `rx:push` write through the API/RPC with `expectedRev` instead of writing files. The mirror is never read by the app at runtime (I1).

## 9. Known pitfalls (evaluators actively look for these)

| # | Pitfall | Required defence |
| :-- | :-- | :-- |
| P1 | Seq assigned before commit → reader skips a change | Advisory lock in every write RPC (§3.3) |
| P2 | Client sets `lastSeq` before rows are persisted | Rows + lastSeq in one IndexedDB transaction |
| P3 | Out-of-order responses overwrite newer data | I7 rev comparison |
| P4 | Concurrent pulls (realtime + focus + poll) race | Single-flight in engine |
| P5 | Browser/CDN/SW caches `/changes` | `no-store` + SW exclusion + no `fetch` cache option |
| P6 | Rename via delete+create (old behaviour) loses history and uid | Rename = update slug on same uid |
| P7 | Anon key can write or read full table | RLS, RPC grants to service_role only, anon only on `neurorx_sync_state` |
| P8 | Service key missing → silent anon fallback | v2 write path returns 503 instead |
| P9 | Restoring a verified revision bypasses human verification | Restore forces `draft` and strips `verification` |
| P10 | `data` gains sync fields → content hash changes → verified drugs drop to draft | I10; test hash equality before/after import |
| P11 | Realtime disconnects silently | 60 s visible poll + focus/online triggers |
| P12 | Private mode / IndexedDB blocked | `MemoryLocalStore` fallback, app still works online |
| P13 | Reset storm (purge horizon) | Reset once, then normal pulls |
| P14 | Legacy code still reachable after cutover | Phase 7 grep gate: no imports of legacy functions |

## 10. Phase 8 Extension — NeuroGuide Granular Blocks & Merkle Tree

After NeuroRx Sync v2 is verified in production, Phase 8 extracts the shared sync core (`src/lib/sync/`: `applyChanges`, `LocalStore`, `createSyncEngine`, `jsonPatch`, `RepoError`) and applies it to NeuroGuide (`src/lib/neuroguide/guidelineStorage.ts` and `neuroguide_docs`) with **2-tier Granular Blocks** (see interactive demo in [simulator-neurorx-sync.html](./simulator-neurorx-sync.html)):

1. **Normalized Schema:**
   - `neuroguide_protocols (uid, slug, title, block_order uuid[], protocol_hash, rev, change_seq, deleted_at)` — stores guideline metadata and ordered block references.
   - `neuroguide_content_blocks (uid, block_type, content jsonb, content_hash, rev, change_seq, deleted_at)` — each clinical recommendation atom, PICO table, dosing box, or pivotal trial summary is an independent block with its own `uid`, `rev`, `change_seq`, and `content_hash`.
   - `neuroguide_protocol_blocks (protocol_uid, block_uid)` — many-to-many join so shared clinical blocks (e.g., Alteplase eligibility/dosing or BP target) have a **single source of truth**.
   - `neuroguide_block_revisions` — RFC 6902 `patch_diff` + snapshot history with the same bounded retention policy as §3.5.
2. **Merkle Tree Re-Hashing ($O(\log N)$) & Debounced Root:**
   - Leaf = `content_blocks.content_hash`; Parent = `protocols.protocol_hash = sha256(block_order hashes)`; Root = `neuroguide_sync_state.root_hash`.
   - Editing one shared block only re-computes hashes along the affected protocol paths; unaffected guidelines remain cache-hit.
3. **Tag-Based Cache Invalidation:**
   - Every Next.js cached block reader tags `block:${blockUid}`; mutations call `revalidateTag('block:' + blockUid)` + `revalidateTag('protocol:' + slug)` so all referencing guidelines refresh automatically without full-site invalidation.
