# NeuroRx Sync v2 — Phase Prompts & Step-by-Step Instructions

> Mỗi phase gồm: **Mô hình khuyến nghị (Argon / Hydrogen) · Mục tiêu · Điều kiện tiên quyết · Phạm vi file · Prompt (copy nguyên văn cho mô hình) · Tiêu chí nghiệm thu (AC) · Cổng người duyệt (Human gate)**.
> Phase nào chưa qua [20-evaluation-neurorx-sync.md](./20-evaluation-neurorx-sync.md) thì **không được** bắt đầu phase tiếp theo.
> Prompt viết bằng tiếng Anh để mô hình hiểu chính xác. Phần giải thích viết bằng tiếng Việt.

---

## Common Preamble (dán vào đầu MỌI prompt)

```text
You are implementing "NeuroRx Sync v2" in the repo d:\NeuroPulse (Windows, PowerShell, Next.js 16 App Router, React 19, TypeScript 7, Node test runner).

Before writing any code, read IN FULL:
  1. tasks/neurorx-sync/00-design-neurorx-sync.md      (binding contract — invariants I1–I15, pitfalls P1–P14)
  2. tasks/neurorx-sync/20-evaluation-neurorx-sync.md  (how your work will be judged & auto-remediation loop)
  3. tasks/neurorx-sync/progress-neurorx-sync.md       (what previous phases did; append to it when done)
  4. NEURORX-GUARDRAILS.md and AGENTS.md
  5. For any Next.js route/page/metadata/caching/service-worker code: the relevant guide under node_modules/next/dist/docs/. Quote the doc path you relied on in your report.

Hard rules:
  - Do ONLY the current phase. Do not start the next phase, do not refactor unrelated code.
  - If the design is ambiguous, contradicts the code, or seems wrong: STOP and ask. Never silently change the design.
  - No new npm dependencies. No @ts-ignore, eslint-disable, test.skip, or weakened/deleted tests.
  - Never write clinical values. Never set status "verified" / verification fields yourself (G1.5).
  - Never run SQL against the production Supabase project, and never run scripts with --apply, unless the user explicitly says so in this conversation.
  - Keep each task within ~5 non-data files (G2.6). If more are needed, split and say so.
  - When finished: run the phase's verification commands, then run the Evaluation Loop in 20-evaluation-neurorx-sync.md for this phase until it passes or you hit a stop condition. Append a phase entry to progress-neurorx-sync.md. Report: files changed, commands + results, open questions.
```

---

## Phase 0 — Preflight, kiểm kê và sao lưu (chỉ đọc, không đổi hành vi)

* **Mô hình khuyến nghị:** **Hydrogen** *(Rủi ro thấp — chỉ đọc & tạo snapshot)*
* **Mục tiêu:** Ghi lại chính xác dữ liệu người dùng đang thấy hiện nay, kiểm tra môi trường, và sửa guardrail để cho phép dùng Supabase.
* **Tiên quyết:** Người dùng đã duyệt [00-design-neurorx-sync.md](./00-design-neurorx-sync.md).
* **File:** `data/neurorx/_migration/*` (mới), `scripts/neurorx/export-effective-snapshot.ts` (mới), `NEURORX-GUARDRAILS.md` (sửa G2.5), `tasks/neurorx-sync/progress-neurorx-sync.md`.

### Prompt
```text
[Common Preamble]

PHASE 0 — Preflight & snapshot. Behaviour of the app must NOT change.

Tasks:
1. Inventory: list every place that reads or writes NeuroRx drug data (grep for lib/neurorx/data, neurorx_drugs, neurorx_drug_, deleted_drugs, TMP_DRUGS_DIR, inMemoryDrugs, rx:sync, rx:push). Write the list to tasks/neurorx-sync/progress-neurorx-sync.md under "Phase 0 / Inventory" with file:line.
2. Create scripts/neurorx/export-effective-snapshot.ts that:
   - calls the LEGACY getAllDrugsAsync() exactly as the app does today (read-only, with the Supabase sync),
   - writes data/neurorx/_migration/snapshot-<YYYYMMDD>.json  (array of DrugRecord, sorted by id),
   - writes data/neurorx/_migration/summary-<YYYYMMDD>.json with: total, countByEffectiveStatus, hashMatchCount, slugs[], perSlugContentHash{slug: computeContentHashSync(record)}, sourceTierHints (static/tmp/supabase if derivable), generatedAt.
   - Is read-only: it must not write to Supabase, /tmp or data/neurorx/drugs.
   Add npm script "rx:snapshot". Run it once and commit the outputs.
3. Environment check (do not print secret values): report whether NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are present in .env.local, and remind the user to check the same on Vercel.
4. Amend NEURORX-GUARDRAILS.md G2.5 to: "Supabase is allowed only through the Sync v2 design in tasks/neurorx-sync/00-design-neurorx-sync.md (tables neurorx_drug_records, neurorx_drug_revisions, neurorx_sync_state, neurorx_sync_config). No new dependencies." Do not change any other rule.
5. Create/update Phase 0 entry in tasks/neurorx-sync/progress-neurorx-sync.md as described in that file's template.

Acceptance: see Phase 0 AC in 10-phases-neurorx-sync.md.
```

### AC
- AC0.1 Inventory có trong `progress-neurorx-sync.md`, mỗi mục có file:dòng.
- AC0.2 Có snapshot + summary; `total` khớp với số thuốc đang hiện trên `/neurorx`.
- AC0.3 `git diff` chỉ chạm vào các file được liệt kê ở trên; `npm test` và `npm run build` vẫn qua.
- AC0.4 Không in giá trị bí mật nào ra log hoặc báo cáo.

### Human gate
Người dùng xác nhận số lượng trong summary khớp với những gì đang thấy trên app.

---

## Phase 1 — Migration database (SQL), có kiểm thử bằng SQL

* **Mô hình khuyến nghị:** **Argon** *(Rủi ro rất cao — `plpgsql`, khóa `pg_advisory_xact_lock`, `FOR UPDATE`, RLS security)*
* **Mục tiêu:** Viết SQL đúng §3 của design: bảng, 3 tầng hash (`section_hashes`, `content_hash`, `root_hash`), index, RLS, publication, các RPC có advisory lock, hàm `neurorx_recompute_root_hash()` + `neurorx_purge()` (90/90/5/365), và SQL rollback.
* **File:** `supabase/migrations/20261113_neurorx_sync_v2.sql`, `supabase/migrations/20261113_neurorx_sync_v2_rollback.sql`, `supabase/tests/neurorx_sync_v2_checks.sql`, `tasks/neurorx-sync/progress-neurorx-sync.md`.

### Prompt
```text
[Common Preamble]

PHASE 1 — Database migration. Write SQL files only. Do NOT execute against any database.

Write supabase/migrations/20261113_neurorx_sync_v2.sql implementing 00-design-neurorx-sync.md §3 exactly:
  - sequence, 4 tables (including content_hash and section_hashes jsonb on neurorx_drug_records; content_hash and patch_diff jsonb on neurorx_drug_revisions; root_hash on neurorx_sync_state; confirmed retention defaults 90d tombstones / 90d revisions / min 5 per uid / 365d verified in neurorx_sync_config), constraints, partial unique index on live slug, indexes
  - RLS enabled on all 4 tables; only anon SELECT on neurorx_sync_state; add neurorx_sync_state to publication supabase_realtime (guard with a DO block so re-running is safe)
  - Helper RPC neurorx_recompute_root_hash(): computes deterministic sha256 over all live rows (uid:rev:content_hash ordered by uid) and updates neurorx_sync_state.root_hash (for single writes and end-of-batch bulk imports)
  - RPCs: neurorx_create_drug (accepts p_skip_root_rehash boolean default false), neurorx_update_drug, neurorx_delete_drug, neurorx_restore_revision, neurorx_changes_since, neurorx_purge
      * every mutating RPC begins with: perform pg_advisory_xact_lock(hashtext('neurorx_sync')); and locks target row via SELECT ... FOR UPDATE
      * assigns change_seq := nextval('neurorx_change_seq') inside the lock
      * content-hash short-circuit (I13): in neurorx_update_drug, if deleted_at IS NULL and content_hash = p_content_hash and slug = new_slug, return existing row with unchanged=true (do NOT bump rev, change_seq, or insert revision)
      * otherwise increments rev by exactly 1 (insert = 1)
      * appends a full snapshot + content_hash + patch_diff to neurorx_drug_revisions (op, status = data->>'status', actor)
      * updates neurorx_sync_state.max_seq and root_hash in the same transaction (unless p_skip_root_rehash = true)
      * raises exceptions whose MESSAGE starts with NRX_SLUG_TAKEN / NRX_NOT_FOUND / NRX_REV_CONFLICT (append ":<current_rev>" for conflicts)
      * restore forces data.status='draft' and removes data.verification
      * slug is derived from lower(btrim(p_data->>'id')); p_data is stored with data.id = slug
  - neurorx_purge implements §3.5 using neurorx_sync_config (90d / 90d / min 5 / 365d verified), updates purge_horizon_seq & root_hash, returns json counts
  - revoke execute from public, anon, authenticated; grant to service_role
  - whole file idempotent (create ... if not exists / create or replace) and wrapped in a transaction
  - does NOT touch legacy tables neurorx_drugs or neuroguide_docs

Write ..._rollback.sql that drops only the objects created above (never legacy tables).

Write supabase/tests/neurorx_sync_v2_checks.sql: a self-contained script that runs inside BEGIN ... ROLLBACK and uses RAISE EXCEPTION on failure, covering at least:
  T1 create → rev 1, seq > 0, revision row op=insert, sync_state.max_seq = seq, root_hash non-empty, section_hashes stored
  T2 update with correct rev & changed hash → rev 2, new seq greater than previous, patch_diff stored, root_hash updated
  T3 update with stale rev → NRX_REV_CONFLICT
  T4 delete → deleted_at set, rev+1, appears in neurorx_changes_since
  T5 create same slug after delete → succeeds with a DIFFERENT uid  (bug B4)
  T6 create duplicate live slug → NRX_SLUG_TAKEN
  T7 rename slug via update keeps uid
  T8 restore a verified revision → status draft, no verification key
  T9 changes_since paging order & limit
  T10 purge: backdate rows/revisions with UPDATE, run purge, assert retention rules (90d tombstone, 90d revision, keep-min-5 per uid, and verified 365d), and purge_horizon_seq updated
  T11 as role anon: select on neurorx_drug_records returns 0 rows / is denied; execute on RPC denied; select on neurorx_sync_state allowed
  T12 no-op update (identical content_hash and slug) returns unchanged=true and does NOT increment rev, change_seq, or revision count (I13)
Explain in tasks/neurorx-sync/progress-neurorx-sync.md how the user runs these in the Supabase SQL editor (migration first, then checks).
```

### AC
- AC1.1 Mọi đối tượng ở §3 đều có trong SQL; tên khớp chính xác với design (bao gồm `content_hash`, `section_hashes`, `patch_diff`, `root_hash`, `neurorx_recompute_root_hash`, và mặc định `90 / 90 / 5 / 365`).
- AC1.2 Mỗi RPC ghi dữ liệu đều lấy advisory lock **trước khi** gọi `nextval` và dùng `SELECT ... FOR UPDATE`.
- AC1.3 File migration chạy lại lần 2 không lỗi (idempotent).
- AC1.4 Kịch bản kiểm tra T1–T12 đều tồn tại và mỗi test có `RAISE EXCEPTION` khi thất bại.
- AC1.5 Không có lệnh nào đụng vào `neurorx_drugs` hay `neuroguide_docs`.

### Human gate (bắt buộc)
Người dùng chạy migration rồi chạy file checks trong Supabase SQL Editor. Dán kết quả ("all checks passed") vào `progress-neurorx-sync.md`. **Chưa qua bước này thì không bắt đầu Phase 3.** Phase 2 có thể làm song song.

---

## Phase 2 — Repository phía server + hàm apply, section hashing & JSON Patch thuần (chưa nối vào app)

* **Mô hình khuyến nghị:** **Argon** *(Rủi ro cao — đảm bảo `MemoryDrugRepo` khớp tuyệt đối SQL + 3-way merge + Merkle section hashes)*
* **File:** `src/lib/neurorx/sync/types.ts`, `jsonPatch.ts`, `sectionHash.ts` (hoặc trong `jsonPatch.ts`), `repo.ts`, `repoMemory.ts`, `repoSupabase.ts`, `applyChanges.ts`; test `tests/neurorxSyncRepo.test.mjs`, `tests/neurorxSyncApply.test.mjs`, `tests/neurorxSyncPatch.test.mjs`. (Chia 2 task: 2a = types/jsonPatch/sectionHash/repo/memory/tests; 2b = supabase repo/applyChanges/test.)

### Prompt
```text
[Common Preamble]

PHASE 2 — Repository layer, 3-tier Merkle section hashing, RFC 6902 JSON Patch utility, and pure apply function. Nothing in the app imports these yet.

2a. Create src/lib/neurorx/sync/types.ts (SyncRow including sectionHashes, RevisionRow, JsonPatchOp, RepoErrorCode), jsonPatch.ts (zero-dependency pure TS computeJsonPatch(before, after), applyJsonPatch(doc, ops), computeSectionHashes(drug) for Tier-3 leaf hashing of top-level clinical sections, threeWayMergeDrug(base, mine, cloud) → { merged, conflicts } using sectionHashes to skip unchanged sections in O(1)), repo.ts (DrugRepo interface + RepoError class exactly as 00-design-neurorx-sync.md §6), repoMemory.ts (MemoryDrugRepo with IDENTICAL semantics to the SQL: global seq, rev+1, live-slug uniqueness, tombstones, contentHash short-circuit no-op I13, sectionHashes, batched recomputeRootHash(), patchDiff storage I14, revisions, restore→draft, retention rules 90d/90d/min-5/365d with injectable `now`).
    Write tests/neurorxSyncPatch.test.mjs covering computeJsonPatch, round-trip applyJsonPatch, computeSectionHashes, and 3-way merge (non-conflicting sections auto-merged, conflicting fields flagged).
    Write tests/neurorxSyncRepo.test.mjs as a CONTRACT SUITE: export a function runRepoContract(makeRepo) and call it with MemoryDrugRepo. Cover the same cases as SQL T1–T10 + T12 (content_hash no-op). If NEURORX_SYNC_IT=1, also run it against SupabaseDrugRepo using slugs prefixed "zz-sync-test-" and clean up (hard delete via a dedicated cleanup step documented in the test; if hard delete is impossible with service role RPCs, soft-delete and note it).
2b. repoSupabase.ts: SupabaseDrugRepo using supabaseAdmin.rpc(...). Map NRX_* messages to RepoError codes (parse current rev from NRX_REV_CONFLICT:<n>). Map snake_case → camelCase SyncRow & RevisionRow (including contentHash, sectionHashes, and patchDiff). Implement getSyncState() and recomputeRootHash(). If SUPABASE_SERVICE_ROLE_KEY is missing, every write throws RepoError('SERVICE_UNAVAILABLE') (pitfall P8) — do NOT use the anon fallback in src/lib/supabase.ts.
    applyChanges.ts: pure function per §5.2 / invariant I7. tests/neurorxSyncApply.test.mjs must include: idempotency (apply twice = same), order independence (shuffle 100 random permutations), stale rev ignored, tombstone removes, tombstone for unknown uid is a no-op, recreated slug with new uid coexists correctly with removal of old uid.

Files must be importable by the Node test runner with --experimental-strip-types (check how existing tests import src/lib/neurorx/*.ts and follow the same pattern).
```

### AC
- AC2.1 Bộ test hợp đồng (contract suite) chạy qua hết với `MemoryDrugRepo` (bao gồm case T12 content_hash no-op & batched `recomputeRootHash`).
- AC2.2 Có test cho tính chất (property test) của `applyChanges`: idempotent và không phụ thuộc thứ tự; có test round-trip, `computeSectionHashes`, và 3-way merge cho `jsonPatch.ts`.
- AC2.3 Chưa có file nào của app import `src/lib/neurorx/sync/*` (kiểm bằng grep).
- AC2.4 Thiếu service key thì repo ném lỗi `SERVICE_UNAVAILABLE` (có test).

---

## Phase 3 — Script chuyển dữ liệu cũ sang v2 (dry-run → apply)

* **Mô hình khuyến nghị:** **Hydrogen** *(Rủi ro trung bình/thấp — gọi lại Repo đã kiểm thử ở Phase 2)*
* **File:** `scripts/neurorx/migrate-to-v2.ts`, npm script `rx:migrate-v2`, `data/neurorx/_migration/migrate-report-*.json`.
* **Tiên quyết:** Phase 1 đã qua human gate, Phase 2 đã qua đánh giá.

### Prompt
```text
[Common Preamble]

PHASE 3 — Data migration script. Default mode is DRY RUN.

Create scripts/neurorx/migrate-to-v2.ts:
  - Input: the latest data/neurorx/_migration/snapshot-*.json from Phase 0 (never re-derive from legacy tiers at this point).
  - Uses SupabaseDrugRepo (Phase 2). For each record: if a live row with that slug exists in neurorx_drug_records → skip (idempotent); else compute contentHash = computeContentHashSync(data) and sectionHashes = computeSectionHashes(data), then call create(data, contentHash, sectionHashes, "migration-v2", { skipRootRehash: true }). After the batch finishes, call repo.recomputeRootHash() ONCE (batched re-hashing).
  - Records are inserted byte-for-byte as in the snapshot (no field changes, no status changes).
  - --dry-run (default): print the plan (to create / to skip) and verify nothing is written.
  - --apply: perform, then POST-CHECK by reading changesSince(0): live slug set == snapshot slug set; per-slug computeContentHashSync equal to summary.perSlugContentHash; effective-status counts equal to summary; rootHash non-empty. Write data/neurorx/_migration/migrate-report-<ts>.json. Exit code 1 on any mismatch.
  - Never deletes anything.
Add npm script "rx:migrate-v2". Run ONLY --dry-run yourself and include its output. The user runs --apply.
```

### AC
- AC3.1 Dry-run không ghi gì vào DB (kiểm bằng `max_seq` trước và sau khi chạy không đổi, hoặc bằng test với MemoryDrugRepo).
- AC3.2 Chạy apply lần 2 thì toàn bộ thuốc ở trạng thái skip (idempotent).
- AC3.3 Bước post-check so sánh hash từng thuốc + kiểm `rootHash` được tính 1 lần ở cuối batch; lệch thì exit code 1.

### Human gate
Người dùng chạy `npm run rx:migrate-v2 -- --apply`, sau đó dán báo cáo vào `progress-neurorx-sync.md`. Số thuốc verified trước và sau phải bằng nhau.

---

## Phase 4 — API routes Sync v2

* **Mô hình khuyến nghị:** **4a: Argon** *(Rủi ro cao/trung bình — core handlers, validation, ETag, error mapping)* · **4b: Hydrogen** *(Rủi ro thấp — thin Next 16 route wrappers)*
* **File:** `src/app/api/neurorx/sync/changes/route.ts`, `.../drugs/route.ts`, `.../drugs/[uid]/route.ts`, `.../drugs/[uid]/history/route.ts`, `.../drugs/[uid]/restore/route.ts`, `.../purge/route.ts`, `src/lib/neurorx/sync/handlers.ts`, `tests/neurorxSyncApi.test.mjs`. (Chia 4a: handlers + test; 4b: các file route mỏng.)

### Prompt
```text
[Common Preamble]

PHASE 4 — HTTP API exactly as 00-design-neurorx-sync.md §4.

First read node_modules/next/dist/docs/ for: route handlers, dynamic route params (in Next 16 `params` may be a Promise — verify), caching/revalidation defaults for route handlers. Cite the files.

4a. src/lib/neurorx/sync/handlers.ts: framework-free functions (input: parsed request including optional ifNoneMatch header + DrugRepo + isAdmin + optional onInvalidateTag hook; output: {status, headers?, body}). Implements:
    - ETag fast-path on GET /changes: compute ETag `"nrx-v2-${maxSeq}-${rootHash}"` from repo.getSyncState(); if header `If-None-Match` matches AND since === maxSeq (or since is omitted and cached ETag matches), return status 304 without scanning drug rows. Always include `ETag` and `Cache-Control: no-store`.
    - Validation (existing validate.ts), status forced to draft on create/update (unless explicit verify action — keep that in the admin manage-drug adapter in Phase 6).
    - Computes contentHash (computeContentHashSync), sectionHashes (computeSectionHashes), and RFC 6902 patchDiff (computeJsonPatch against current server row).
    - Handles no-op unchanged writes (I13), reset logic (since>0 && since<purgeHorizonSeq), paging (limit default 500, max 500), error mapping (REV_CONFLICT→409 with current row, SLUG_TAKEN→409, NOT_FOUND→404, SERVICE_UNAVAILABLE→503).
    tests/neurorxSyncApi.test.mjs drives handlers with MemoryDrugRepo and covers every row of the §4 table plus: unauthenticated mutation → 401; reset flag; hasMore paging loop reaches all rows; ETag / If-None-Match → 304; no-op update preserves rev/seq and does not trigger invalidation.
4b. Thin route files that: parse request (including `if-none-match` header), call verifyAdminToken for mutations, construct SupabaseDrugRepo, pass Next.js revalidateTag callback (`neurorx:drugs`, `neurorx:drug:${uid}`) into handler, call handler, return NextResponse (empty 304 or JSON body with `Cache-Control: no-store` and `ETag` when present). Mark them dynamic per the Next 16 docs.
Do NOT modify existing /api/neurorx/* routes in this phase.
```

### AC
- AC4.1 Mỗi route trả header `Cache-Control: no-store` (có test ở mức handler và grep ở mức route), và `/changes` trả thêm `ETag` + hỗ trợ `If-None-Match` → `304 Not Modified`.
- AC4.2 Mọi thao tác ghi đều kiểm tra quyền admin.
- AC4.3 Có test chứng minh mã 409 trả về kèm bản ghi hiện tại trên server.
- AC4.4 Route chỉ đóng vai trò mỏng; logic nằm trong `handlers.ts` và đã được test.

---

## Phase 5 — Client: Local store + Sync engine + Realtime

* **Mô hình khuyến nghị:** **Argon** *(Rủi ro cao — transaction nguyên tử IndexedDB, single-flight pull, Realtime debounce)*
* **File:** `src/lib/neurorx/sync/localStore.ts` (interface + Memory + Idb), `syncEngine.ts`, `realtime.ts`, `src/hooks/useNeuroRxDrugs.ts` (hoặc đặt cạnh component theo quy ước sẵn có của repo), `tests/neurorxSyncEngine.test.mjs`.

### Prompt
```text
[Common Preamble]

PHASE 5 — Client sync engine per 00-design-neurorx-sync.md §5. Not wired into the UI yet.

- localStore.ts: LocalStore interface { load(): {rows, lastSeq, rootHash, eTag}; commit(applied: SyncRow[], removedUids: string[], lastSeq, rootHash?, eTag?): Promise<void> (ONE transaction — pitfall P2); reset(): Promise<void> }. MemoryLocalStore and IdbLocalStore (raw indexedDB API, db name neurorx-sync-v1, stores drugs & meta, deletes older neurorx-sync-v* dbs). IdbLocalStore must fall back to MemoryLocalStore if indexedDB.open fails (P12).
- syncEngine.ts: createSyncEngine({ store, fetchChanges, now, onSignal }) with start(), pull(), applyLocalWrite(row), subscribe(listener), stop(). Single-flight pull with at most one queued follow-up (P4). Sends `If-None-Match` with stored eTag; treats HTTP 304 as clean up-to-date. Loops on hasMore. Handles reset (store.reset() then pull from 0, once). Never decreases lastSeq except on reset. Emits snapshot from local store BEFORE first network call.
- Triggers wired in a separate browser-only module: visibilitychange, online, 60s poll while visible, and realtime.ts subscription to postgres_changes UPDATE on public.neurorx_sync_state using the existing anon client from src/lib/supabase.ts; debounced 300ms to coalesce rapid bursts, triggering pull() only if payload max_seq > lastSeq or root_hash !== localRootHash (or always pull if payload missing).
- useNeuroRxDrugs(): React hook exposing { drugs: DrugWithEffectiveStatus[], status, lastSyncAt, lastChangeCount, lastSeq, applyLocalWrite }. Compute effective status with existing integrity.ts — first check whether computeContentHashSync depends on node:crypto; if so use the async variant on the client. Report what you found.
- tests/neurorxSyncEngine.test.mjs with MemoryLocalStore + fake fetchChanges covering: offline start shows local data; pull applies delta and advances lastSeq; 304 Not Modified leaves rows intact; 5 concurrent pull() calls → ≤2 fetches; hasMore loop; reset path; out-of-order page delivery doesn't regress data; commit failure leaves lastSeq unchanged; applyLocalWrite then stale pull doesn't overwrite.
```

### AC
- AC5.1 Có test chứng minh single-flight: gọi 5 lần đồng thời thì chỉ có tối đa 2 request; test `304 Not Modified` không sửa dữ liệu local.
- AC5.2 Rows và `lastSeq` được ghi trong cùng một transaction; nếu commit thất bại thì `lastSeq` giữ nguyên.
- AC5.3 Không có import Node (`node:*`) trong các file chạy phía client.
- AC5.4 Realtime chỉ đóng vai trò tín hiệu (debounce 300 ms); dữ liệu luôn được lấy qua `/changes`.

---

## Phase 6 — Nối vào UI (đặt sau cờ `NEXT_PUBLIC_NEURORX_SYNC_V2`)

* **Mô hình khuyến nghị:** **6a: Hydrogen** *(Rủi ro trung bình — UI tra cứu & `history.pushState`)* · **6b: Argon** *(Rủi ro cao — Admin Draft Auto-Save, 3-Mode ConflictDialog, HistoryPanel, Verify adapter)*
* **File (6a, trang tra cứu):** `src/app/neurorx/page.tsx`, `NeuroRxShell.tsx`, `tabs/LookupTab.tsx`, `OfflineStatus.tsx`.
* **File (6b, admin):** `admin/NeuroRxAdminSection.tsx`, `admin/EditDrugModal.tsx`, `admin/ConflictDialog.tsx` (mới), `admin/HistoryPanel.tsx` (mới), `src/app/api/neurorx/manage-drug/route.ts` (adapter cho v2).

### Prompt
```text
[Common Preamble]

PHASE 6 — UI integration behind NEXT_PUBLIC_NEURORX_SYNC_V2 === "1". With the flag off, behaviour must be byte-identical to before.

Read node_modules/next/dist/docs/ on: static vs dynamic rendering in Next 16 (route segment config, caching / "use cache" if applicable), useSearchParams + native window.history.pushState, metadata. Cite files.

6a. Lookup:
  - page.tsx: when flag on, no getAllDrugsAsync, no force-dynamic; pass only file-based sources/interactions/dataVersion. When flag off, keep current code path.
  - NeuroRxShell: when flag on, drugs come from useNeuroRxDrugs(); show skeleton while status === 'loading' and store empty.
  - LookupTab: selecting a drug / back uses window.history.pushState (flag on), so no server round-trip. Keep deep links (?drug=...&w=...) working on first load.
  - OfflineStatus: show sync status texts from 00-design-neurorx-sync.md §5.4 (English UI per G3.1). Color never the only signal.
6b. Admin:
  - Admin list/edit reads from the same engine/hook (or GET /changes since 0) — never from legacy tiers when flag on.
  - Local Draft Auto-Save (I15): EditDrugModal auto-saves unsaved form edits to localStorage (`neurorx-draft:${uid}:${baseRev}`) every 3 seconds, offers restore if present on reopen, and clears on confirmed save.
  - Save/Delete call the v2 endpoints with expectedRev; on success call applyLocalWrite(row) (I8).
  - 409 REV_CONFLICT → ConflictDialog: shows field-level diff (jsonPatch.ts: mine vs cloud) and 3 actions: Use Cloud (applyLocalWrite(current)), Smart Merge (threeWayMergeDrug auto-merging non-conflicting sections via sectionHashes and resending with current.rev; conflicting fields require explicit selection), Force Overwrite (resend mine with current.rev), plus Cancel.
  - HistoryPanel: GET history, list rev/op/actor/time + human-readable `patchDiff` changes (`path`, `old_value` → `new_value`), "Restore as draft" → POST restore.
  - "Verify" action: compute status/verification/content_hash server-side with existing integrity.ts and call repo.update with expectedRev (adapter inside manage-drug route when flag on). Only a human clicking Verify in admin triggers it (G1.5).
  - Rename = update slug on same uid (P6). Remove old_id delete+create behaviour on the v2 path.
Measure and report: time from click on a drug card to detail render (performance.now marks) with flag on, in `next build && next start`.
```

### AC
- AC6.1 Khi tắt cờ: `npm test` qua và hành vi app không đổi (chạy lại toàn bộ test hiện có).
- AC6.2 Khi bật cờ: bấm vào thuốc thì mở chi tiết trong dưới 150 ms, không có request mạng (xem DevTools Network).
- AC6.3 Lỗi 409 hiện ConflictDialog với 3 lựa chọn (Use Cloud / Smart Merge / Force Overwrite); không bao giờ ghi đè im lặng.
- AC6.4 Restore một revision thì bản ghi luôn về trạng thái draft; HistoryPanel hiển thị chi tiết `patchDiff` từng trường.
- AC6.5 EditDrugModal tự lưu nháp localStorage mỗi 3s và tự dọn khi lưu thành công.
- AC6.6 Đạt tiêu chuẩn UI G3 (tiếng Anh, AA, vùng chạm ≥ 44 px, hiển thị đúng ở 375 px).

---

## Phase 7 — Chuyển hẳn sang v2, dọn dẹp và lên lịch purge

* **Mô hình khuyến nghị:** **Argon** *(Rủi ro cao — cutover hoàn toàn, xóa code cũ theo grep gate, cấu hình lịch `pg_cron` + GitHub Actions)*
* **Tiên quyết:** Bật cờ trên production ≥ 3 ngày, bộ kịch bản E2E (20-evaluation-neurorx-sync.md §4) qua hết trên production.

### Prompt
```text
[Common Preamble]

PHASE 7 — Cutover & cleanup. Requires explicit user "GO CUTOVER" in the conversation.

1. Make v2 the only path: remove the flag branches; delete from src/lib/neurorx/data.ts every drug-record tier (TMP_*, inMemoryDrugs, inMemoryDeletedIds, getDeletedDrugIds, recordDeletedDrugId, unmarkDeletedDrugId, syncFromSupabase, mergeDrugRecords, getAllDrugs*, saveDrugToStorage, deleteDrugFromStorage, verify*InStorage, getDrugById). Keep file-based sources/interactions/tall-man loaders. Move DrugWithEffectiveStatus type to src/lib/neurorx/sync/types.ts and update imports.
2. Delete legacy routes /api/neurorx/drugs and the legacy branches of manage-drug/admin-data (or make them thin adapters to v2 — choose the smaller diff and justify).
3. Tooling (00-design-neurorx-sync.md §8): rx:pull exports live rows → data/neurorx/drugs/*.json (read-only mirror; add data/neurorx/drugs/README.md "generated mirror, do not edit"); rx:verify and rx:push write via repo with expectedRev; remove rx:sync legacy script. CI keeps running rx:validate on the mirror.
4. Purge scheduling: create BOTH supabase/migrations/20261120_neurorx_purge_cron.sql (using pg_cron directly in Supabase at 03:00 UTC every Sunday, guarded safely) AND .github/workflows/neurorx_purge.yml (weekly Sunday cron calling POST /api/neurorx/sync/purge with an admin token secret as automatic fallback if pg_cron is unavailable on the current Supabase tier).
5. Service worker: bump cache name; ensure /api/* never intercepted; shell precache unchanged.
6. Grep gate (must return nothing): TMP_DRUGS_DIR|inMemoryDrugs|deleted_drugs|mergeDrugRecords|syncFromSupabase|neurorx_system_deleted_drugs|getAllDrugsAsync in src/ and scripts/ (except _migration docs).
7. Update SPEC-neurorx.md (storage section) and NEURORX-GUARDRAILS.md to describe v2. Do NOT drop legacy tables; write supabase/migrations/LATER_drop_legacy_neurorx.sql for the user to run after 30 days.
```

### AC
- AC7.1 Lệnh grep ở bước 6 không trả về kết quả nào.
- AC7.2 `npm test`, `rx:validate` (chạy trên mirror) và `build` đều qua.
- AC7.3 Có đủ cả script `pg_cron` lẫn fallback workflow GitHub Actions chạy mỗi Chủ Nhật.
- AC7.4 Bảng cũ chưa bị xóa; đã có sẵn file SQL để xóa sau.

---

## Phase 8 — Áp dụng cho NeuroGuide với mô hình Granular Blocks & Merkle Tree

* **Mô hình khuyến nghị:** **Argon** cho phần tách lõi `src/lib/sync/` + SQL Granular Blocks; **Hydrogen** cho script migrate & nối UI tra cứu.
* **Tiên quyết:** NeuroRx Phase 7 đã cutover thành công và ổn định trên production ≥ 7 ngày.

1. **Tách lõi Sync dùng chung (`src/lib/sync/`):**
   - Tham số hóa `applyChanges`, `LocalStore`, `createSyncEngine`, `jsonPatch`, `RepoError`, `realtime` theo `collection` (ví dụ `neurorx_drugs` và `neuroguide_blocks`).
2. **Thiết kế 2 tầng Granular Blocks + Merkle Tree (chi tiết tại [00-design-neurorx-sync.md §10](./00-design-neurorx-sync.md) và mô phỏng tại [simulator-neurorx-sync.html](./simulator-neurorx-sync.html)):**
   - Bảng `neuroguide_protocols` (metadata + `block_order uuid[]` + `protocol_hash`), `neuroguide_content_blocks` (`uid`, `block_type`, `content jsonb`, `content_hash`, `rev`, `change_seq`, `deleted_at`), bảng nối `neuroguide_protocol_blocks`, và `neuroguide_block_revisions` (lưu `patch_diff` RFC 6902 + snapshot + retention policy `90 / 90 / 5 / 365`).
   - Shared clinical blocks (ví dụ liều tiêu sợi huyết, mục tiêu huyết áp, thử nghiệm bản lề) chỉ lưu **1 bản duy nhất**, nhiều phác đồ dùng chung qua `protocol_blocks`.
   - Next.js `unstable_cache` gắn tag `block:<uid>` + `protocol:<slug>`; RPC ghi thành công gọi `revalidateTag('block:' + uid)` để chỉ làm mới các trang bị ảnh hưởng ($O(\log N)$).
3. **Thay thế `src/lib/neuroguide/guidelineStorage.ts`:**
   - Gỡ bỏ cơ chế hợp nhất nhiều tầng (`getFromLocalDisk` + `deletedGuidelineIds` + `getStoredGuidelinesAsDocs` + `neuroguide_cloud.json`).
   - Lặp lại quy trình Phase 0 (snapshot dữ liệu hiệu lực hiện tại) → Phase 1 (SQL + tests) → Phase 2 → Phase 3 (migrate) → Phase 4 → Phase 5 → Phase 6 (kèm Local Draft Auto-Save + 3-mode ConflictDialog + HistoryPanel) → Phase 7 (cutover), giữ nguyên vòng lặp đánh giá tại [20-evaluation-neurorx-sync.md](./20-evaluation-neurorx-sync.md).
