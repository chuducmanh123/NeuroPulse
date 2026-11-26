# Implementation Plan: NeuroCalc v1

> Spec: [`SPEC-neurocalc.md`](../SPEC-neurocalc.md) (Approved v1.0) · Map: [`CAPABILITY-MAP-neurocalc.md`](../CAPABILITY-MAP-neurocalc.md) · Intent: [`docs/intent/neurocalc.md`](../docs/intent/neurocalc.md) · Checklist: [`neurocalc-todo.md`](./neurocalc-todo.md)

## Overview

NeuroCalc (`/neurocalc`) is a bedside neurology scales and clinical calculators web application inside the Neuro Ecosystem. It uses 100% original clinical English, matches the visual language and `.medical-journal-app` typography of sibling apps (`#0E7490` Cyan-Teal accent), keeps all patient scoring sessions strictly ephemeral in client memory (zero persistence, zero Copy clinical summary button), and stores/syncs scale definitions and selective text-only bedside assessment guides in **Supabase PostgreSQL** via the **Granular Blocks & Merkle tree Sync v2** architecture (`section_hashes` → `content_hash` → `root_hash` → browser IndexedDB + Realtime).

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Reuse `src/lib/sync/*` primitives verbatim | Shared pure-JS FIPS 180-4 SHA-256, canonicalizer, RFC 6902 JSON Patch, `threeWayMergeSections`, `applyChanges`, `IdbLocalStore`, and `SyncEngine` avoid duplication and keep Sync v2 invariants identical to `NeuroRx` and `NeuroGuide`. |
| 6 Granular Blocks (`CALC_SECTIONS`) | `metadata`, `items`, `scoring`, `interpretation`, `assessment_guides`, `references` — editing a text-only clinical pitfall in `assessment_guides` mutates only `section_hashes.assessment_guides`, produces a minimal JSON-Patch diff, and enables conflict-free section merging. |
| Pure zero-UI scoring engine + named mathematical formula registry | Keeps clinical thresholds and labels strictly inside `ScaleRecord` JSON while allowing deterministic, table-driven unit tests for additive point scales (incl. NIHSS `UN`), ordinal grades, and published equations (`abc_2`, `corrected_na_katz`, `corrected_phenytoin_winter_tozer`, `serum_osmolality`). |
| Ephemeral client-only scoring state | Eliminates PHI storage risk and keeps bedside scoring instant and stateless; Reset clears state immediately. |
| Selective text-only *"How to assess / ?"* guides | Keeps the main scoring view scannable by rendering assessment chips only where `assessment_guides` explicitly targets an `item.id` or `(item.id, option.id)`, opening inline or in a non-disruptive drawer with zero visual NIHSS image assets in v1. |
| Pragmatic `/admin` integration (`adminTab === "neurocalc"`) | Mirrors `NeuroRxAdminSection` (reusing existing passcode auth): sync health, `section_hashes` & JSON-Patch history inspection, quick text-block editing with 3-way conflict resolution, and `draft → verified` approval gating. |

## Dependency Graph

```text
T1 Data contract, 6-block hashes & validator
 ├──► T2 Scoring engine & published formulas
 ├──► T3 CLI validate / verify / snapshot & package.json
 └──► T4 Supabase Sync v2 SQL migration & checks
       └──► T5 Sync v2 Repo (Memory + Supabase)
             └──► T6 Sync v2 Handlers + primary API routes
                   ├──► T7 History / Restore / Purge routes
                   ├──► T8 Client IndexedDB, SyncEngine, Realtime & hook
                   └──► T9 Supabase CLI sync scripts (migrate-v2 / pull / push)
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
 T10 /neurocalc shell & directory    T14 /admin NeuroCalc tab
  ├──► T11 Ecosystem Hub / Switcher
  └──► T12 Bedside workspace & live result card
        └──► T13 Selective "How to assess / ?" panel
                                          │
 [Parallel after T2+T3]: T15 Wave 1A (5 scales) ──► T16 Wave 1B (6 scales) ──► T17 Wave 2 (6 scales)
                                                                                      │
                                                                                      ▼
                                                                             T18 Release hardening
```

## Parallelization Opportunities
- **Safe to parallelize:**
  - `T2` (scoring engine), `T3` (CLI validation), and `T4` (Supabase SQL migration) can run in parallel once `T1` lands.
  - `T11` (Ecosystem Hub/AppSwitcher/CommandPalette) and `T14` (`/admin` tab) can run in parallel with `T12`–`T13` once `T8` & `T10` exist.
  - `T15`–`T16` (Wave 1 JSON datasets + embedded `test_cases`) can be authored in parallel with UI tasks (`T10`–`T14`) once `T2` + `T3` pass.
- **Must be sequential:** `T1 → T4 → T5 → T6 → T7/T8` (Supabase & Sync v2 contract chain); `T10 → T12 → T13` (UI component hierarchy).
- **Requires human gate:** Applying Supabase migration (`T4`) to live DB; clinical review & `draft → verified` approval of Wave 1 (`Checkpoint 5`) and Wave 2 (`Checkpoint 6`).

---

## Task List

### Phase 1: Foundation (`calc-data-core`, `calc-scoring-engine`)

#### Task 1: Data contract, 6-block Merkle hashing & runtime validator
**Description:** Define the `ScaleRecord` TypeScript schema (SPEC §5.2), implement 6-section granular hashing (`CALC_SECTIONS`) and `evaluateEffectiveScale()` on top of `src/lib/sync/jsonPatch.ts`, and implement the plain-TS runtime validator with comprehensive unit tests.

**Acceptance criteria:**
- [ ] `src/types/neurocalc.ts` matches SPEC §5.2 (`ScaleRecord`, `ScaleMetadata`, `SelectScaleItem`, `NumericScaleItem`, `ScoringConfig`, `InterpretationBand`, `AssessmentGuide`, `ScaleReference`, `ScaleTestCase`).
- [ ] `computeSectionHashes()` hashes the exact 6 blocks (`metadata`, `items`, `scoring`, `interpretation`, `assessment_guides`, `references`); mutating `assessment_guides` changes **only** `section_hashes.assessment_guides`.
- [ ] `evaluateEffectiveScale()` downgrades `verified` → `draft` when `verification.content_hash` mismatches `computeRecordContentHashSync()`.
- [ ] `validateScaleRecord()` catches missing/duplicate IDs, invalid `assessment_guides.target_id`/`option_id`, missing `references` linkage, invalid numeric bounds (`min_canonical >= max_canonical`), and non-monotonic/invalid bands.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --test "tests/neurocalcValidate.test.mjs"`
- [ ] Build succeeds: `npm run build`

**Dependencies:** None
**Files likely touched:**
- `src/types/neurocalc.ts`
- `src/lib/neurocalc/sync/jsonPatch.ts`
- `src/lib/neurocalc/integrity.ts`
- `src/lib/neurocalc/validate.ts`
- `tests/neurocalcValidate.test.mjs`

**Estimated scope:** Medium (5 files)

---

#### Task 2: Pure clinical scoring engine & published formula registry
**Description:** Build the zero-UI TypeScript scoring engine supporting `sum`, `single_select`, and `formula` scales, NIHSS `UN` (untestable) exclusion & tracking, numeric unit conversion + physiological bounds checks, completion progress (`answeredCount / requiredCount`), interpretation band matching, and `draft`/hash-mismatch gating.

**Acceptance criteria:**
- [ ] `src/lib/neurocalc/formulas.ts` implements pure equations only: `abc_2`, `corrected_na_katz` (1.6 per 100 mg/dL), `corrected_phenytoin_winter_tozer` (with renal-failure coefficient toggle), and `serum_osmolality` (`2*Na + Glucose/18 + BUN/2.8` in canonical units).
- [ ] `src/lib/neurocalc/engine.ts` computes exact totals, subscores, partial vs complete flags, NIHSS `UN` untestable lists, and active `InterpretationBand` strictly from `ScaleRecord` data.
- [ ] Empty or out-of-bounds numeric inputs return field-level validation errors and never produce `NaN` or fabricated numeric results.
- [ ] Table-driven unit tests cover min/max scores, band edges, `UN` handling, unit conversions (`mm↔cm`, `g/L↔g/dL`, `mmol/L↔mg/dL`), and `draft` gating.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --test "tests/neurocalcEngine.test.mjs"`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 1
**Files likely touched:**
- `src/lib/neurocalc/formulas.ts`
- `src/lib/neurocalc/engine.ts`
- `tests/neurocalcEngine.test.mjs`

**Estimated scope:** Medium (3 files)

---

#### Task 3: Data directory skeleton & CLI integrity scripts (`validate`, `verify`, `snapshot`)
**Description:** Initialize `data/neurocalc/` (`sources.json`, `scales/.gitkeep`), create CLI scripts for validation (including running embedded `scale.test_cases` and hash checks), human verification (`draft → verified`), and snapshot export, and wire `calc:*` scripts into `package.json` and `npm test`.

**Acceptance criteria:**
- [ ] `npm run calc:validate` validates `data/neurocalc/sources.json` and all `data/neurocalc/scales/*.json`, checks `content_hash` on `verified` scales, and executes every embedded `test_cases` entry against `engine.ts`.
- [ ] `npm run calc:verify -- <scale_id> --by "<Name>"` computes `content_hash`, stamps `verified_by`/`verified_at`, and updates status to `verified` (with Sync v2 support added in Task 9).
- [ ] `npm run calc:snapshot` exports an effective snapshot JSON with `section_hashes`, `content_hash`, and `root_hash`.
- [ ] `npm test` runs `tests/neurocalc*.test.mjs` and `npm run calc:validate`.

**Verification:**
- [ ] Tests pass: `npm test && npm run calc:validate`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 1, Task 2
**Files likely touched:**
- `data/neurocalc/sources.json`
- `scripts/neurocalc/validate.ts`
- `scripts/neurocalc/verify.ts`
- `scripts/neurocalc/export-effective-snapshot.ts`
- `package.json`

**Estimated scope:** Medium (5 files)

---

### Checkpoint 1: Foundation
- [ ] `npm test`, `npm run calc:validate`, and `npm run build` pass cleanly
- [ ] Tampering with a verified fixture downgrades `effectiveStatus` to `draft` and fails `calc:validate`
- [ ] Editing only `assessment_guides` changes only `section_hashes.assessment_guides`

---

### Phase 2: Supabase Granular Blocks & Merkle Sync v2 (`calc-sync-v2`)

#### Task 4: Supabase PostgreSQL Sync v2 migration, rollback & SQL checks
**Description:** Author the idempotent PostgreSQL migration mirroring `20261113_neurorx_sync_v2.sql` for NeuroCalc: monotonic `neurocalc_change_seq`, `neurocalc_scale_records`, `neurocalc_scale_revisions`, `neurocalc_sync_state` (single-row Realtime table readable by `anon`), `neurocalc_sync_config`, RLS policies, atomic create/update/delete/restore/purge RPCs, and `neurocalc_recompute_root_hash()`.

**Acceptance criteria:**
- [ ] Migration runs idempotently inside a single `BEGIN; ... COMMIT;` transaction and never modifies tables of other apps.
- [ ] RLS revokes all access from `public`/`anon`/`authenticated` except `SELECT` on `neurocalc_sync_state`; `service_role` gets full operational privileges.
- [ ] `neurocalc_recompute_root_hash()` produces byte-identical SHA-256 hex to `computeRootHashFromEntries()` in `src/lib/sync/jsonPatch.ts`.
- [ ] Rollback migration cleanly drops all NeuroCalc sync objects, and `neurocalc_sync_v2_checks.sql` verifies all invariants.

**Verification:**
- [ ] Manual check: review SQL diff against `20261113_neurorx_sync_v2.sql` (ask user before applying to live Supabase)
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 1
**Files likely touched:**
- `supabase/migrations/20261126_neurocalc_sync_v2.sql`
- `supabase/migrations/20261126_neurocalc_sync_v2_rollback.sql`
- `supabase/tests/neurocalc_sync_v2_checks.sql`

**Estimated scope:** Medium (3 files)

---

#### Task 5: Sync v2 repositories (`repoMemory` & `repoSupabase`)
**Description:** Define NeuroCalc Sync v2 envelope types and `ScaleRepo` interface, implement deterministic `MemoryScaleRepo` (for fast hermetic tests) and `SupabaseScaleRepo` (calling the Task 4 PostgreSQL RPCs via `service_role`), and verify CRUD, optimistic `expectedRev` `409`, tombstone/restore, revision patch diffs, and Merkle `rootHash`.

**Acceptance criteria:**
- [ ] `MemoryScaleRepo` and `SupabaseScaleRepo` share the exact `ScaleRepo` contract (`getChanges`, `listScales`, `getScaleByUid`, `createScale`, `updateScale`, `deleteScale`, `getHistory`, `restoreScale`, `purge`).
- [ ] Stale `expectedRev` throws `RepoError("REV_CONFLICT")` with current row and rev.
- [ ] Creating/updating/deleting/restoring a scale updates `section_hashes`, `content_hash`, `change_seq`, `patch_diff`, and `syncState.rootHash` atomically.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --test "tests/neurocalcSyncRepo.test.mjs"`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 1, Task 4
**Files likely touched:**
- `src/lib/neurocalc/sync/types.ts`
- `src/lib/neurocalc/sync/repo.ts`
- `src/lib/neurocalc/sync/repoMemory.ts`
- `src/lib/neurocalc/sync/repoSupabase.ts`
- `tests/neurocalcSyncRepo.test.mjs`

**Estimated scope:** Medium (5 files)

---

#### Task 6: Sync v2 HTTP handlers & primary Next.js API routes
**Description:** Implement HTTP-agnostic Sync v2 request handlers (`handlers.ts`) and wire the primary Next.js 16 App Router endpoints (`/api/neurocalc/sync/changes`, `/scales`, `/scales/[uid]`) with `Cache-Control: no-store`, ETag `304 Not Modified`, optimistic `409`, and existing Admin auth enforcement on mutations.

**Acceptance criteria:**
- [ ] `GET /api/neurocalc/sync/changes` supports `since`, `limit`, and `If-None-Match` → `304`, always setting `Cache-Control: no-store`.
- [ ] `POST /api/neurocalc/sync/scales` and `PUT`/`DELETE /api/neurocalc/sync/scales/[uid]` enforce Admin authentication and validate payloads with `validateScaleRecord()`.
- [ ] API handler unit tests verify `200`, `304`, `400`, `401/403`, `404`, and `409` responses.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --test "tests/neurocalcSyncApi.test.mjs"`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 5
**Files likely touched:**
- `src/lib/neurocalc/sync/handlers.ts`
- `src/app/api/neurocalc/sync/changes/route.ts`
- `src/app/api/neurocalc/sync/scales/route.ts`
- `src/app/api/neurocalc/sync/scales/[uid]/route.ts`
- `tests/neurocalcSyncApi.test.mjs`

**Estimated scope:** Medium (5 files)

---

#### Task 7: Revision History, Restore & Retention Purge API routes
**Description:** Add the remaining Sync v2 operational routes (`/history`, `/restore`, `/purge`) reusing existing Admin/cron authorization helpers and extend `tests/neurocalcSyncApi.test.mjs` to cover them.

**Acceptance criteria:**
- [ ] `GET /api/neurocalc/sync/scales/[uid]/history` returns chronological revisions with RFC 6902 `patch_diff` (Admin auth required).
- [ ] `POST /api/neurocalc/sync/scales/[uid]/restore` restores a tombstoned scale or rolls back to a prior revision with audit actor recorded (Admin auth required).
- [ ] `POST /api/neurocalc/sync/purge` executes retention cleanup (Admin or cron secret required) and advances `purge_horizon_seq`.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --test "tests/neurocalcSyncApi.test.mjs"`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 6
**Files likely touched:**
- `src/app/api/neurocalc/sync/scales/[uid]/history/route.ts`
- `src/app/api/neurocalc/sync/scales/[uid]/restore/route.ts`
- `src/app/api/neurocalc/sync/purge/route.ts`
- `tests/neurocalcSyncApi.test.mjs`

**Estimated scope:** Small (4 files)

---

#### Task 8: Client IndexedDB `localStore`, `SyncEngine`, Realtime bridge & `useNeuroCalcScales` hook
**Description:** Wire browser-side offline-first sync on top of `src/lib/sync/*`: IndexedDB store (`neurocalc_sync_v2`), single-flight delta `SyncEngine`, Supabase Realtime listener on `neurocalc_sync_state`, and the `useNeuroCalcScales` React hook returning evaluated scales (`ScaleWithEffectiveStatus[]`), sync status, `rootHash`, `lastSeq`, and `applyLocalWrite`.

**Acceptance criteria:**
- [ ] First load hydrates from IndexedDB immediately (when present) and pulls delta changes from `/api/neurocalc/sync/changes`.
- [ ] `purge_horizon_seq` reset clears stale local rows and re-bootstraps cleanly.
- [ ] Network offline fallback preserves cached verified scales with `status: "offline"` and zero crashes.
- [ ] Realtime updates on `neurocalc_sync_state` trigger coalesced delta pulls when `max_seq > lastSeq`.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --test "tests/neurocalcSyncEngine.test.mjs"`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 6
**Files likely touched:**
- `src/lib/neurocalc/sync/localStore.ts`
- `src/lib/neurocalc/sync/syncEngine.ts`
- `src/lib/neurocalc/sync/realtime.ts`
- `src/hooks/useNeuroCalcScales.ts`
- `tests/neurocalcSyncEngine.test.mjs`

**Estimated scope:** Medium (5 files)

---

#### Task 9: Supabase CLI sync scripts (`migrate-v2`, `pull`, `push`)
**Description:** Create CLI scripts mirroring `scripts/neurorx/` for seeding local curated scales into Supabase Sync v2, exporting live Supabase records to read-only `data/neurocalc/scales/` mirrors for CI, and pushing local edits via optimistic `expectedRev`, and wire them into `package.json`.

**Acceptance criteria:**
- [ ] `npm run calc:migrate-v2` validates and idempotently upserts local scales into Supabase Sync v2 via `SupabaseScaleRepo`.
- [ ] `npm run calc:pull` exports live Supabase rows deterministically into `data/neurocalc/scales/<slug>.json`.
- [ ] `npm run calc:push -- --apply` diffs local mirror vs live Supabase (dry-run by default without `--apply`) and pushes updates with `expectedRev`.
- [ ] `scripts/neurocalc/verify.ts` updates Supabase Sync v2 directly (when credentials present) and refreshes the local mirror.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: `npm run calc:push` dry-run prints clean diff summary without mutating DB

**Dependencies:** Task 3, Task 5
**Files likely touched:**
- `scripts/neurocalc/migrate-to-v2.ts`
- `scripts/neurocalc/pull.ts`
- `scripts/neurocalc/push_local_to_v2.ts`
- `scripts/neurocalc/verify.ts`
- `package.json`

**Estimated scope:** Medium (5 files)

---

### Checkpoint 2: Supabase Sync v2 & Merkle Tree
- [ ] All Sync v2 tests (`neurocalcSyncRepo`, `neurocalcSyncApi`, `neurocalcSyncEngine`) pass
- [ ] User approves applying `20261126_neurocalc_sync_v2.sql` to Supabase and `neurocalc_sync_v2_checks.sql` passes
- [ ] `npm run build` passes cleanly

---

### Phase 3: Bedside UI Shell, Scorer & Contextual Guides (`calc-shell-ui`, `calc-scorer-ui`, `calc-assessment-guides`)

#### Task 10: `/neurocalc` route, `.medical-journal-app` shell & searchable `ScaleDirectory`
**Description:** Create the `/neurocalc` Next.js 16 route (`layout.tsx`, `page.tsx`), add the `calc` icon variant to `DrawLoader`, build `NeuroCalcShell` matching `NeuroRxShell`'s exact sticky header, typography, `#0E7490` Cyan-Teal accent, Night Shift sync, Admin-only Sync status indicator, and `MedicalDisclaimerFooter`, plus `ScaleDirectory` with instant search and subspecialty filter pills (`src/constants/subspecialties.ts`).

**Acceptance criteria:**
- [ ] Check `node_modules/next/dist/docs/` before writing `layout.tsx`/`page.tsx` (`ViewTransition name="app-neurocalc"`).
- [ ] Header height, eyebrow (`text-[10.5px]`), `.font-journal` title (`text-xl sm:text-2xl`), `BETA` badge (`#0E7490`), container (`max-w-7xl px-4 sm:px-8`), and Night Shift tokens match `NeuroRxShell` verbatim.
- [ ] `ScaleDirectory` supports instant search (name, short_name, aliases), subspecialty filter chips, scale kind badges (`Point Scale` / `Grade` / `Formula`), and clear `Pending verification` badges on `draft` scales.
- [ ] URL query `?scale=<slug>` deep-links directly to a scale and supports browser Back/Forward cleanly.

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: inspect `/neurocalc` in Light & Night Shift modes at desktop (1280px) and mobile (375px)

**Dependencies:** Task 8
**Files likely touched:**
- `src/app/neurocalc/layout.tsx`
- `src/app/neurocalc/page.tsx`
- `src/components/neurocalc/NeuroCalcShell.tsx`
- `src/components/neurocalc/ScaleDirectory.tsx`
- `src/components/ecosystem/DrawLoader.tsx`

**Estimated scope:** Medium (5 files)

---

#### Task 11: Ecosystem Hub, `AppSwitcher` & `GlobalCommandPalette` activation
**Description:** Promote NeuroCalc from `SOON` to `BETA` (`href: "/neurocalc"`, `isComingSoon: false`) across the Neuro Ecosystem navigation entry points.

**Acceptance criteria:**
- [ ] Homepage Bento card (`src/app/page.tsx`) launches `/neurocalc` with `BETA` badge and `#0E7490` accent.
- [ ] `AppSwitcher` lists `NeuroCalc` as active (`href: "/neurocalc"`, `badge: "BETA"`) and highlights it when `currentApp === "neurocalc"`.
- [ ] `GlobalCommandPalette` navigates to `/neurocalc` cleanly.

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: navigate `/` → `/neurocalc` → `AppSwitcher` → `/neurorx` and back

**Dependencies:** Task 10
**Files likely touched:**
- `src/app/page.tsx`
- `src/components/ecosystem/AppSwitcher.tsx`
- `src/components/ecosystem/GlobalCommandPalette.tsx`

**Estimated scope:** Small (3 files)

---

#### Task 12: Bedside scoring workspace & sticky visual `ScoreResultCard`
**Description:** Build `ScaleWorkspace` (desktop 2-column scrollable list + sticky right result card; mobile compact expandable bottom score bar), 1-tap tactile `SelectItemCard` (≥ 44px touch targets, `tabular-nums` point badges, `UN` styling), `NumericItemCard` (inline unit toggle, bounds hints, inline validation errors), progress bar (`answered / total` with jump-to-next-unanswered for scales with ≥ 4 items), and visual `ScoreResultCard` (large `tabular-nums` score, segmented color+icon+label severity bar, interpretation card, `UN` untestable summary, Reset button — explicitly NO Copy clinical summary button, and `draft` gating banner).

**Acceptance criteria:**
- [ ] All items render in a clean vertical scrollable list (no step-by-step wizard).
- [ ] Sticky `ScoreResultCard` displays large `tabular-nums` score, segmented severity bar with WCAG AA color + icon + text label, concise interpretation, `UN` summary (if any), and **Reset** button — with **zero** Copy clinical summary button.
- [ ] All scoring state lives strictly in React state (zero writes to `localStorage`, `sessionStorage`, or IndexedDB); **Reset** clears immediately.
- [ ] Scales with `effectiveStatus !== "verified"` display a clear *"Pending clinical verification"* banner and suppress live numeric scoring output.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: test a point-sum scale (partial + complete + `UN`), ordinal scale, and formula scale (unit switch + out-of-bounds) in Light & Night Shift on Desktop & 375px mobile

**Dependencies:** Task 2, Task 10
**Files likely touched:**
- `src/components/neurocalc/ScaleWorkspace.tsx`
- `src/components/neurocalc/SelectItemCard.tsx`
- `src/components/neurocalc/NumericItemCard.tsx`
- `src/components/neurocalc/ScoreResultCard.tsx`

**Estimated scope:** Medium (4 files)

---

#### Task 13: Selective text-only *"How to assess / ?"* contextual guide (`AssessmentGuidePanel`)
**Description:** Implement `AssessmentGuidePanel` and attach selective triggers to `SelectItemCard` (item-level *"How to assess"* chip and option-level compact `?` button) and `NumericItemCard` ONLY when `scale.assessment_guides` contains a matching guide. Clicking opens an inline expandable callout (compact option tips / mobile) or a non-disruptive right slide-over drawer (desktop detailed guides) without losing scroll position or selections.

**Acceptance criteria:**
- [ ] Items and options without a matching `AssessmentGuide` show zero extra buttons or visual clutter.
- [ ] Opening/closing a guide preserves scroll position and never clears or alters selected scores.
- [ ] Panel renders strictly text-only structured blocks: **(1) Bedside Exam Steps**, **(2) Edge Cases & Pitfalls** (plus optional text-only **Exam Prompts**), and **(3) Source Citation** — zero visual NIHSS image assets.
- [ ] Full keyboard accessibility (`Escape` closes drawer, `aria-expanded` / `aria-controls` on inline callouts).

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: open item-level & option-level guides mid-scroll on NIHSS and mRS in Desktop & 375px mobile (Light + Night Shift)

**Dependencies:** Task 12
**Files likely touched:**
- `src/components/neurocalc/AssessmentGuidePanel.tsx`
- `src/components/neurocalc/SelectItemCard.tsx`
- `src/components/neurocalc/NumericItemCard.tsx`
- `src/components/neurocalc/ScaleWorkspace.tsx`

**Estimated scope:** Small (4 files)

---

### Checkpoint 3: Bedside UX & Ecosystem Parity
- [ ] Visual parity check vs `/neurorx` (header, font families/sizes, Night Shift, spacing)
- [ ] Desktop (1280px) & Mobile (375px) ergonomics verified (≥ 44px tap targets, sticky score visibility, selective *"How to assess / ?"* UX)
- [ ] Offline reload after initial hydration serves verified scales from IndexedDB cleanly

---

### Phase 4: Admin Governance Tab (`calc-admin-v2`)

#### Task 14: `/admin` NeuroCalc section — Sync Health, Section Hashes, History & Quick Text-Block Editor
**Description:** Mount a new `"neurocalc"` tab inside existing `/admin` (`src/app/admin/page.tsx`) mirroring `NeuroRxAdminSection`: Sync v2 health bar (`rootHash`, `maxSeq`, verified/draft/hash-mismatch counts), scale list with 6-section `section_hashes` badges, `HistoryPanel` (revision timeline + RFC 6902 JSON-Patch diffs + Restore), `EditScaleBlockModal` (quick text editing for `assessment_guides`, `interpretation`, `metadata.clinical_pearls`, `references`), `ConflictDialog` (3-mode conflict resolution on `409` using `threeWayMergeSections`), and one-click `Verify` (`draft → verified`).

**Acceptance criteria:**
- [ ] `adminTab` union in `src/app/admin/page.tsx` includes `"neurocalc"` and reuses existing Admin passcode authentication.
- [ ] Editing a single `assessment_guides` text block updates **only** `section_hashes.assessment_guides`, increments `rev`, writes a JSON-Patch revision, updates `root_hash`, and refreshes `/neurocalc` via Realtime/delta sync.
- [ ] Concurrent edit (`409 REV_CONFLICT`) opens `ConflictDialog` with 3-way section merge preview.
- [ ] Admin can preview a `draft` scale and click **Verify** to seal `content_hash` and promote `draft → verified`.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: edit an assessment guide in `/admin` → inspect `HistoryPanel` JSON-Patch diff → verify live update in `/neurocalc`

**Dependencies:** Task 7, Task 8, Task 12
**Files likely touched:**
- `src/components/neurocalc/admin/NeuroCalcAdminSection.tsx`
- `src/components/neurocalc/admin/EditScaleBlockModal.tsx`
- `src/components/neurocalc/admin/HistoryPanel.tsx`
- `src/components/neurocalc/admin/ConflictDialog.tsx`
- `src/app/admin/page.tsx`

**Estimated scope:** Medium (5 files)

---

### Checkpoint 4: Admin Granular Edit & Verification Flow
- [ ] `/admin` NeuroCalc tab displays live `rootHash`, `maxSeq`, and all 6 `section_hashes` per scale
- [ ] Text-block edit → `HistoryPanel` diff → `Verify` → Realtime update in `/neurocalc` verified end-to-end

---

### Phase 5: Curated English Data Waves & Release Hardening (`calc-seed-waves`)

#### Task 15: Wave 1 Batch A — Acute Stroke & Neurocritical Care core scales (5 scales)
**Description:** Author curated, source-cited, 100% original clinical English JSON records (initial `status: "draft"`) with rich text-only `assessment_guides` and embedded `test_cases` for: `nihss` (all 15 items, `UN` rules, text-only bedside exam steps & verbal/reading prompts), `mrs` (with 2 vs 3 and 3 vs 4 boundary guides), `gcs` (intubated/eye-swollen/painful-stimulus pitfalls), `four-score` (brainstem & respiration guides), and `ich-score`.

**Acceptance criteria:**
- [ ] Every scale has primary published references in `data/neurocalc/sources.json` & `scale.references[]`.
- [ ] Every ambiguous item/option carries concise text-only `assessment_guides` (zero image references).
- [ ] Every scale includes ≥ 4 embedded `test_cases` (min, max, boundary transitions, and edge cases like NIHSS `UN`).
- [ ] `npm run calc:validate` and `npm test` pass with zero errors.

**Verification:**
- [ ] Tests pass: `npm test && npm run calc:validate`

**Dependencies:** Task 2, Task 3
**Files likely touched:**
- `data/neurocalc/sources.json`
- `data/neurocalc/scales/nihss.json`
- `data/neurocalc/scales/mrs.json`
- `data/neurocalc/scales/gcs.json`
- `data/neurocalc/scales/four-score.json`
- `data/neurocalc/scales/ich-score.json`

**Estimated scope:** Medium (6 data files)

---

#### Task 16: Wave 1 Batch B — Stroke Risk, ICH Volume & SAH Grading (6 scales)
**Description:** Author curated, source-cited English JSON records (`status: "draft"`) with selective text-only `assessment_guides` and embedded `test_cases` for: `abc-2` (formula with cm/mm toggle + slice thickness guidance), `abcd2`, `cha2ds2-vasc`, `has-bled`, `wfns`, and `hunt-and-hess` (two separate SAH grading scales per approved spec).

**Acceptance criteria:**
- [ ] `abc-2` validates cm/mm conversions and slice-counting rule (`0.5` for 25–75% area, `0` for < 25%) in `assessment_guides`.
- [ ] `wfns` and `hunt-and-hess` are cleanly separated with motor-deficit & GCS boundary assessment guides.
- [ ] All 6 scales include ≥ 4 embedded `test_cases` and pass `npm run calc:validate` + `npm test`.

**Verification:**
- [ ] Tests pass: `npm test && npm run calc:validate`

**Dependencies:** Task 15
**Files likely touched:**
- `data/neurocalc/sources.json`
- `data/neurocalc/scales/abc-2.json`
- `data/neurocalc/scales/abcd2.json`
- `data/neurocalc/scales/cha2ds2-vasc.json`
- `data/neurocalc/scales/has-bled.json`
- `data/neurocalc/scales/wfns.json`
- `data/neurocalc/scales/hunt-and-hess.json`

**Estimated scope:** Medium (7 data files)

---

### Checkpoint 5: Wave 1 Clinical Review & Supabase Seeding (Human Gate)
- [ ] Human neurologist reviews Wave 1 drafts (`11` scales) against primary sources
- [ ] Verified via `npm run calc:verify` or `/admin` Verify button
- [ ] `npm run calc:migrate-v2` pushes verified Wave 1 scales to Supabase Sync v2 and `npm run calc:pull` confirms clean mirror

---

#### Task 17: Wave 2 — General Neurology, Neuromuscular, Movement & Metabolic (6 scales)
**Description:** Author curated, source-cited English JSON records (`status: "draft"`) with selective text-only `assessment_guides` and embedded `test_cases` for: `barthel-index`, `mg-adl`, `hoehn-and-yahr`, `corrected-sodium` (Katz 1.6 formula, mmol/L & mg/dL), `corrected-phenytoin` (Winter-Tozer with CrCl < 10 / ESRD coefficient toggle), and `serum-osmolality` (mmol/L & mg/dL).

**Acceptance criteria:**
- [ ] All 3 metabolic formulas support both SI (`mmol/L`, `g/L`) and conventional (`mg/dL`, `g/dL`) unit toggles with verified round-trip math tests.
- [ ] `mg-adl` includes clear recall-window ("past 7 days") and respiratory/bulbar scoring pitfalls in `assessment_guides`.
- [ ] All 6 scales pass `npm run calc:validate` and `npm test`.

**Verification:**
- [ ] Tests pass: `npm test && npm run calc:validate`

**Dependencies:** Task 16
**Files likely touched:**
- `data/neurocalc/sources.json`
- `data/neurocalc/scales/barthel-index.json`
- `data/neurocalc/scales/mg-adl.json`
- `data/neurocalc/scales/hoehn-and-yahr.json`
- `data/neurocalc/scales/corrected-sodium.json`
- `data/neurocalc/scales/corrected-phenytoin.json`
- `data/neurocalc/scales/serum-osmolality.json`

**Estimated scope:** Medium (7 data files)

---

#### Task 18: End-to-end Release Hardening & Audit
**Description:** Perform final verification against all 8 SPEC §1 user stories and SPEC §11 success criteria: run full test suite and production build, audit zero-PHI/zero-persistence (`localStorage`/`sessionStorage`/IndexedDB contain zero user inputs), verify offline reload, verify zero Copy clinical summary button or NIHSS image assets, and verify ecosystem navigation.

**Acceptance criteria:**
- [ ] `npm test`, `npm run calc:validate`, and `npm run build` pass with zero errors/warnings.
- [ ] All 8 user stories in `SPEC-neurocalc.md` §1 verified manually (Desktop + 375px mobile, Light + Night Shift, Offline).
- [ ] Zero patient inputs stored in browser storage; zero unverified scales render live scores on `/neurocalc`.

**Verification:**
- [ ] Tests pass: `npm test && npm run calc:validate`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 11, Task 13, Task 14, Task 17
**Files likely touched:**
- Minor polish fixes only if surfaced by audit (target 0–2 files)

**Estimated scope:** Small (0–2 files)

---

### Checkpoint 6: v1 Complete
- [ ] All 8 Capability Map modules complete and verified
- [ ] All `SPEC-neurocalc.md` §11 success criteria met
- [ ] Wave 1 & Wave 2 scales verified and live in Supabase Sync v2

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Subtle formula/unit conversion errors (e.g., mg/dL vs mmol/L, Katz vs Winter-Tozer ESRD) | High | Keep all unit conversions declarative (`to_canonical_factor` / `offset`), enforce physiological bounds, and require ≥ 4 published reference `test_cases` per scale verified automatically in `npm run calc:validate`. |
| Merkle `root_hash` drift between PostgreSQL RPC and TypeScript `computeRootHashFromEntries()` | High | Mirror `20261113_neurorx_sync_v2.sql`'s exact `encode(digest(...), 'hex')` ordering (`ORDER BY uid ASC`) and assert byte-for-byte equality in `neurocalc_sync_v2_checks.sql` + `neurocalcSyncRepo.test.mjs`. |
| Long scales (NIHSS 15 items, Barthel 10 items) feeling cluttered on 375px mobile | Medium | Keep *"How to assess / ?"* chips strictly selective (only on ambiguous items/options), use compact 1-tap cards + sticky bottom score summary bar, and add an `answered / total` progress bar with jump-to-unanswered. |
| Next.js 16 breaking changes (`ViewTransition`, route handlers, `searchParams`) | Medium | Check `node_modules/next/dist/docs/` before writing `src/app/neurocalc/*` and API route files, matching proven patterns in `src/app/neurorx/*`. |
| Accidental persistence of patient inputs | High | Keep all scoring answers exclusively in component `useState`; explicitly audit `localStorage`, `sessionStorage`, and IndexedDB in Task 18. |

## Open Questions
None blocking — all architectural, clinical, and UX decisions are locked in `SPEC-neurocalc.md` (Approved v1.0).
