# NeuroCalc v1 — Task Checklist

> Plan: [`neurocalc-plan.md`](./neurocalc-plan.md) · Spec: [`../SPEC-neurocalc.md`](../SPEC-neurocalc.md) · Map: [`../CAPABILITY-MAP-neurocalc.md`](../CAPABILITY-MAP-neurocalc.md)
> Tick each item only after running its Verification commands.

## Phase 1 — Foundation (`calc-data-core`, `calc-scoring-engine`)
- [x] T1 Data contract, 6-block Merkle hashing & runtime validator — Verify: `neurocalcValidate.test.mjs`, `npm run build`
- [x] T2 Pure clinical scoring engine & published formula registry — Verify: `neurocalcEngine.test.mjs`, `npm run build`
- [x] T3 Data directory skeleton & CLI scripts (`validate`, `verify`, `snapshot`) — Verify: `npm test`, `npm run calc:validate`, `npm run build`
### Checkpoint 1: Foundation
- [x] `npm test`, `npm run calc:validate`, `npm run build` green · 6-section hash isolation & tamper downgrade verified

## Phase 2 — Supabase Granular Blocks & Merkle Sync v2 (`calc-sync-v2`)
- [x] T4 Supabase PostgreSQL Sync v2 migration, rollback & SQL checks — Verify: SQL review + `npm run build`
- [x] T5 Sync v2 repositories (`MemoryScaleRepo` & `SupabaseScaleRepo`) — Verify: `neurocalcSyncRepo.test.mjs`, `npm run build`
- [x] T6 Sync v2 HTTP handlers & primary API routes (`changes`, `scales`, `scales/[uid]`) — Verify: `neurocalcSyncApi.test.mjs`, `npm run build`
- [x] T7 Revision History, Restore & Purge API routes — Verify: `neurocalcSyncApi.test.mjs`, `npm run build`
- [x] T8 Client IndexedDB `localStore`, `SyncEngine`, Realtime bridge & `useNeuroCalcScales` hook — Verify: `neurocalcSyncEngine.test.mjs`, `npm run build`
- [x] T9 Supabase CLI sync scripts (`migrate-v2`, `pull`, `push`) — Verify: `npm test`, dry-run check, `npm run build`
### Checkpoint 2: Supabase Sync v2 & Merkle Tree
- [x] All Sync v2 unit tests green · Supabase migration approved & applied · `neurocalc_sync_v2_checks.sql` passes

## Phase 3 — Bedside UI Shell, Scorer & Contextual Guides (`calc-shell-ui`, `calc-scorer-ui`, `calc-assessment-guides`)
- [x] T10 `/neurocalc` route, `.medical-journal-app` sticky header & searchable `ScaleDirectory` — Verify: `npm run build`, Light/Night Shift, 375px
- [x] T11 Ecosystem Hub (`/`), `AppSwitcher` & `GlobalCommandPalette` activation (`SOON → BETA`) — Verify: `npm run build`, navigation check
- [x] T12 Bedside `ScaleWorkspace` & sticky visual `ScoreResultCard` (no Copy button, ephemeral state) — Verify: `npm test`, `npm run build`, manual check
- [x] T13 Selective text-only *"How to assess / ?"* panel (`AssessmentGuidePanel`) — Verify: `npm run build`, scroll/state preservation check
### Checkpoint 3: Bedside UX & Ecosystem Parity
- [ ] Visual parity vs `/neurorx` confirmed · Desktop & 375px mobile clean · Offline reload works

## Phase 4 — Admin Governance Tab (`calc-admin-v2`)
- [x] T14 `/admin` NeuroCalc section (Sync health, `section_hashes`, `HistoryPanel`, `EditScaleBlockModal`, `ConflictDialog`, `Verify`) — Verify: `npm test`, `npm run build`, live edit → Realtime sync check
### Checkpoint 4: Admin Granular Edit & Verification Flow
- [ ] Editing `assessment_guides` changes only its section hash, logs JSON-Patch diff, updates `root_hash`, and refreshes `/neurocalc`

## Phase 5 — Curated English Data Waves & Release Hardening (`calc-seed-waves`)
- [x] T15 Wave 1 Batch A: `nihss`, `mrs`, `gcs`, `four-score`, `ich-score` (draft + text-only guides + `test_cases`) — Verify: `npm test`, `npm run calc:validate`
- [x] T16 Wave 1 Batch B: `abc-2`, `abcd2`, `cha2ds2-vasc`, `has-bled`, `wfns`, `hunt-and-hess` (draft + guides + `test_cases`) — Verify: `npm test`, `npm run calc:validate`
### Checkpoint 5: Wave 1 Clinical Review & Supabase Seeding (Human Gate)
- [ ] All 11 Wave 1 scales clinically reviewed & verified (`calc:verify` / `/admin`) · `calc:migrate-v2` synced to Supabase
- [x] T17 Wave 2: `barthel-index`, `mg-adl`, `hoehn-and-yahr`, `corrected-sodium`, `corrected-phenytoin`, `serum-osmolality` — Verify: `npm test`, `npm run calc:validate`
- [x] T18 End-to-end release hardening & zero-PHI / offline audit — Verify: `npm test`, `npm run calc:validate`, `npm run build`
### Checkpoint 6: v1 Complete
- [ ] All 8 Capability Map modules implemented · All `SPEC-neurocalc.md` §11 success criteria met
