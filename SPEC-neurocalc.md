# Spec: NeuroCalc v1 — Clinical Neurology Scales & Bedside Calculators

> Status: **APPROVED v1.0 (2026-11-26)** · Owner/clinical reviewer: user (neurologist)
> Capability Map: [`CAPABILITY-MAP-neurocalc.md`](./CAPABILITY-MAP-neurocalc.md) · Intent: [`docs/intent/neurocalc.md`](./docs/intent/neurocalc.md)

## 1. Objective

A bedside neurology and stroke scoring & calculation web application inside the Neuro Ecosystem (`/neurocalc`), built in **100% original clinical English** (matching `NeuroRx`), visually and typographically consistent with sibling apps (`.medical-journal-app`, `#0E7490` Cyan-Teal accent), backed by **Supabase PostgreSQL** using the **Granular Blocks & Merkle tree Sync v2** architecture for offline-first scale definitions and contextual bedside assessment guides.

### Core Clinical Goals
- **Fast, scannable bedside scoring (< 15 seconds for short scales, zero clutter for long scales):** Display all items in a clean vertical scrollable list with 1-tap tactile option pills/cards and a sticky live score & visual severity meter.
- **Contextual, zero-clutter assessment methodology:** Only items or specific score options known to cause clinical scoring confusion carry a selective *"How to assess / ?"* chip that reveals concise **text-only** bedside instructions, edge-case rules/pitfalls, and source citations in place (inline or slide-over drawer) without losing scroll or scoring state.
- **Granular Blocks & Merkle tree knowledge sync:** Scale definitions and assessment guidance blocks live in Supabase as versioned, section-hashed JSONB records (`section_hashes` → `content_hash` → `root_hash`) synced incrementally to browser IndexedDB, with quick Admin text editing and `draft → verified` clinical gating inside `/admin`.

### Non-Goals (Out of Scope for v1)
- Saving or syncing patient scoring sessions / history / PHI (all scoring state is strictly ephemeral in client memory).
- *Copy clinical summary* button or EMR note export.
- Visual/illustrated NIHSS stimulus cards or SVG drawings (text-only exam descriptions and prompts only in v1).
- Vietnamese or bilingual clinical content (100% original clinical English only).
- Visual drag-and-drop formula/scale builder in `/admin`.
- Highly specialized interactive 3D diagrams or deep multi-branching rules (e.g., full Kurtzke EDSS).

### User Stories (Acceptance-Level)
1. Opening `/neurocalc` displays a searchable, subspecialty-filterable scale directory using the exact `.medical-journal-app` typography, header sizing, Night Shift sync, and `#0E7490` Cyan-Teal accent; launching NeuroCalc works from both `/` (Ecosystem Hub) and `AppSwitcher`.
2. Selecting a point-sum scale (e.g., NIHSS) renders all 15 items vertically with 1-tap score pills, a live completion counter (`answered / 15`), and a sticky visual result card showing large `tabular-nums` total score, color+icon+label severity bar, active interpretation band, and any `UN` (untestable) items recorded.
3. On an ambiguous item (e.g., NIHSS `5a Left Arm Motor` or `10 Dysarthria`) or an ambiguous option boundary (e.g., mRS `2` vs `3`), a subtle *"How to assess"* / `?` chip appears; clicking it opens an inline callout or non-disruptive drawer containing text-only **(1) Bedside exam steps**, **(2) Edge cases & pitfalls**, and **(3) Source citation** without resetting selections or losing scroll position. Self-explanatory items display no chip.
4. Selecting a numeric formula calculator (e.g., ABC/2 ICH Volume or Corrected Phenytoin) provides numeric inputs with inline unit toggles, rejects out-of-range/empty inputs cleanly (never displaying `NaN` or invented defaults), and displays the computed value + interpretation band once required inputs are valid.
5. Clicking **Reset** clears the current session immediately; refreshing the page or navigating away leaves zero persisted patient input in `localStorage`, `sessionStorage`, or IndexedDB.
6. A scale in `draft` status (or with a `content_hash` mismatch) shows a clear *"Pending clinical verification"* banner and disables live clinical scoring output in `/neurocalc` (while remaining inspectable/verifiable in `/admin`).
7. Editing a single text block in `assessment_guides` via `/admin` updates **only** `section_hashes.assessment_guides`, recomputes `content_hash` and Supabase `neurocalc_sync_state.root_hash`, writes a JSON-Patch revision row, and propagates via delta sync (`/api/neurocalc/sync/changes`) + Realtime to open clients.
8. After initial hydration, `/neurocalc` continues to load and compute verified scales offline from IndexedDB cache.

---

## 2. Tech Stack

Existing `d:\NeuroPulse` stack:
- **Framework:** Next.js 16.4 App Router (`src/app`), React 19, TypeScript 7, Tailwind CSS 4, `lucide-react`, `@supabase/supabase-js`.
- **Shared Sync Core:** Reuse `src/lib/sync/` (`types.ts`, `jsonPatch.ts`, `applyChanges.ts`, `localStore.ts`, `syncEngine.ts`, `realtime.ts`, `repo.ts`).
- **Testing:** Node built-in test runner (`node --experimental-strip-types --test "tests/neurocalc*.test.mjs"`).
- **Zero new runtime npm dependencies** without explicit user approval.

> **Next.js 16 rule (`AGENTS.md`):** Before writing route, metadata, or `ViewTransition` code, verify conventions against `node_modules/next/dist/docs/`.

---

## 3. Commands

```bash
Dev:        npm run dev
Build:      npm run build
Test:       npm test
Calc Tests: node --experimental-strip-types --test "tests/neurocalc*.test.mjs"
Validate:   npm run calc:validate                         # schema + section/content hash + math fixture checks on data/neurocalc
Verify:     npm run calc:verify -- <scale_id> --by "<Name>"  # draft -> verified via Sync v2 repo + mirror refresh
Migrate v2: npm run calc:migrate-v2                       # seed/upsert validated local scales into Supabase Sync v2
Pull:       npm run calc:pull                             # export live Supabase Sync v2 rows -> read-only data/neurocalc/scales mirror
Push:       npm run calc:push -- --apply                  # push mirror edits -> Supabase Sync v2 via optimistic expectedRev
Snapshot:   npm run calc:snapshot                         # export effective snapshot JSON for CI/audit
```

---

## 4. Project Structure & Supabase Sync v2 Storage

```text
data/neurocalc/
  scales/<scale_id>.json          → curated seed & read-only mirror exported from Supabase (`calc:pull`) for CI validation (never read directly at runtime by `/neurocalc`)
  sources.json                    → shared reference registry (primary papers & guidelines)

supabase/
  migrations/
    YYYYMMDD_neurocalc_sync_v2.sql           → tables, RLS, Realtime, RPCs, Merkle root_hash function
    YYYYMMDD_neurocalc_sync_v2_rollback.sql  → clean rollback
  tests/
    neurocalc_sync_v2_checks.sql             → SQL invariants verification

src/
  types/neurocalc.ts                         → ScaleRecord, Granular Block types, engine I/O types
  lib/neurocalc/
    engine.ts                                → pure zero-UI scoring & formula engine (zero clinical thresholds hardcoded)
    formulas.ts                              → pure mathematical formula registry (universal equations only: ABC/2, Winter-Tozer, Katz Na, Osmolality)
    validate.ts                              → runtime & CLI schema + referential + bounds validator
    integrity.ts                             → canonicalization, 6-section hashing, effective status evaluation
    sync/
      types.ts                               → ScaleWithEffectiveStatus, SyncRow, RevisionRow
      jsonPatch.ts                           → CALC_SECTIONS (6 granular blocks) + thin wrappers around src/lib/sync/jsonPatch.ts
      repo.ts                                → ScaleRepo interface
      repoMemory.ts                          → deterministic in-memory repo for tests
      repoSupabase.ts                        → Supabase service_role repo calling atomic RPCs
      handlers.ts                            → HTTP-agnostic Sync v2 handlers (GET changes/304, CRUD/409, history, restore, purge)
      localStore.ts                          → IndexedDB (`neurocalc_sync_v2`) local store
      syncEngine.ts                          → client single-flight delta sync engine
      realtime.ts                            → Supabase Realtime bridge on `neurocalc_sync_state`
  hooks/
    useNeuroCalcScales.ts                    → React hook hydrating from IndexedDB + SyncEngine + Realtime
  app/
    neurocalc/
      layout.tsx                             → static metadata + `.medical-journal-app` wrapper
      page.tsx                               → `ViewTransition name="app-neurocalc"` + `DrawLoader` + `NeuroCalcShell`
    api/neurocalc/sync/
      changes/route.ts                       → GET delta changes (`ETag` / `If-None-Match` -> `304`, `Cache-Control: no-store`)
      scales/route.ts                        → GET list / POST create (Admin auth)
      scales/[uid]/route.ts                  → GET / PUT update (`expectedRev` -> `409`) / DELETE tombstone (Admin auth)
      scales/[uid]/history/route.ts          → GET revision history & JSON-Patch diffs (Admin auth)
      scales/[uid]/restore/route.ts          → POST restore from tombstone or prior rev (Admin auth)
      purge/route.ts                         → POST retention purge (Admin/cron auth)
  components/neurocalc/
    NeuroCalcShell.tsx                       → sticky header, search/subspecialty bar, directory + active workspace, footer
    ScaleDirectory.tsx                       → scannable grid/list of scales grouped/filtered by subspecialty
    ScaleWorkspace.tsx                       → 2-column bedside scorer (left scrollable items, right sticky visual result card)
    SelectItemCard.tsx                       → 1-tap tactile option pills/cards + optional item/option "How to assess" trigger
    NumericItemCard.tsx                      → numeric input + inline unit toggle + bounds hint + optional "How to assess" trigger
    ScoreResultCard.tsx                      → sticky visual result card (large tabular-nums score, segmented severity bar, interpretation, UN summary, Reset)
    AssessmentGuidePanel.tsx                 → inline callout & slide-over drawer for text-only bedside steps, pitfalls/exceptions, prompts, and citations
    admin/
      NeuroCalcAdminSection.tsx              → mounted in `/admin` (`adminTab === "neurocalc"`), sync health, section hash viewer, quick block editor, verify gate
      EditScaleBlockModal.tsx                → quick text editor for Assessment Guides, Interpretations, Clinical Pearls, References + 3-way conflict handling
      HistoryPanel.tsx                       → revision timeline & section-level JSON-Patch diff viewer
      ConflictDialog.tsx                     → 3-mode conflict resolution dialog

scripts/neurocalc/
  validate.ts                                → schema, hashes, refs & embedded math test cases
  verify.ts                                  → human-invoked draft -> verified CLI
  migrate-to-v2.ts                           → seed local JSON scales into Supabase Sync v2
  pull.ts                                    → export Supabase Sync v2 -> data/neurocalc/scales/
  push_local_to_v2.ts                        → push local edits -> Supabase Sync v2
  export-effective-snapshot.ts               → snapshot export

tests/
  neurocalcEngine.test.mjs                   → table-driven tests for all Wave 1 & Wave 2 scales/formulas & edge cases
  neurocalcValidate.test.mjs                 → schema, guide target linkage, hash mismatch gating
  neurocalcSyncRepo.test.mjs                 → repoMemory CRUD, optimistic rev 409, tombstone/restore, Merkle rootHash
  neurocalcSyncEngine.test.mjs               → delta sync, 304 ETag, reset on purge horizon, offline fallback
  neurocalcSyncApi.test.mjs                  → route handler contracts, auth gating, Cache-Control: no-store
```

### Single Source of Truth (Supabase PostgreSQL)
Mirroring `supabase/migrations/20261113_neurorx_sync_v2.sql`:
- `public.neurocalc_change_seq` — monotonic `bigint` sequence.
- `public.neurocalc_scale_records` — live & tombstoned `ScaleRecord` envelopes (`uid`, `slug`, `data jsonb`, `content_hash`, `section_hashes jsonb`, `rev`, `change_seq`, `created_at`, `updated_at`, `updated_by`, `deleted_at`, constraint `lower(btrim(data->>'id')) = slug`).
- `public.neurocalc_scale_revisions` — append-only revision log with `patch_diff jsonb` (RFC 6902 JSON Patch) and `actor`.
- `public.neurocalc_sync_state` — single-row Realtime signal table (`id = 1`, `max_seq`, `purge_horizon_seq`, `root_hash`, `updated_at`); **ONLY table granted `SELECT` to `anon`** and added to `supabase_realtime` publication.
- `public.neurocalc_sync_config` — single-row retention config (`90d` tombstones / `90d` revisions / min `5` per uid / `365d` verified revisions).
- **RLS & Security:** All tables enable RLS; `anon`/`authenticated` have zero write/read access except `SELECT` on `neurocalc_sync_state`; all API reads/writes go through Next.js route handlers using `service_role` (with Admin auth required for all mutating endpoints and `/history`).

---

## 5. Data Contract — Granular Blocks & Merkle Tree

### 5.1 Merkle Tree Hierarchy (3 Tiers)
1. **Tier 3 — Granular Blocks (`section_hashes`):** Deterministic SHA-256 hex for each of the **6 named sections** of a `ScaleRecord`, computed via `src/lib/sync/jsonPatch.ts` (`canonicalizeSyncValue` + `sha256Hex`):
   ```ts
   export const CALC_SECTIONS = [
     "metadata",
     "items",
     "scoring",
     "interpretation",
     "assessment_guides",
     "references",
   ] as const;
   ```
   Editing text inside `assessment_guides` changes **only** `section_hashes.assessment_guides`, leaving `items`, `scoring`, `interpretation`, `metadata`, and `references` hashes intact and enabling section-aware 3-way merge (`threeWayMergeSections`).
2. **Tier 2 — Record Leaf (`content_hash`):** SHA-256 of the canonicalized `ScaleRecord` excluding the `verification` object. If `status === "verified"` but `verification.content_hash !== computedHash`, runtime `evaluateEffectiveScale()` automatically downgrades `effectiveStatus` to `"draft"`.
3. **Tier 1 — Collection Merkle Root (`root_hash`):** Recomputed atomically in PostgreSQL (`public.neurocalc_recompute_root_hash()`) and mirrored by `computeRootHashFromEntries()` across all live (`deleted_at IS NULL`) rows sorted by `uid`, stored in `neurocalc_sync_state.root_hash`.

### 5.2 TypeScript Schema (`src/types/neurocalc.ts`)

```ts
export type RecordStatus = "draft" | "verified" | "retired";
export type ScaleKind = "point_sum" | "ordinal_grade" | "formula";
export type SeverityLevel = "normal" | "mild" | "moderate" | "severe" | "critical" | "info";

export interface SourceRef {
  source_id: string;        // matches entry in scale.references[] or data/neurocalc/sources.json
  locator: string;          // e.g. "Table 1, Item 5a" or "p. 1344"
  quote?: string;           // optional short verbatim excerpt (<= 400 chars)
}

export interface ScaleMetadata {
  name: string;             // e.g. "National Institutes of Health Stroke Scale"
  short_name: string;       // e.g. "NIHSS"
  aliases: string[];        // e.g. ["NIH Stroke Scale", "stroke severity"]
  subspecialties: string[]; // subset of SUBSPECIALTY_LIST (src/constants/subspecialties.ts)
  kind: ScaleKind;
  summary: string;          // 1-2 line clinical purpose
  clinical_pearls?: string[];
  time_estimate?: string;   // e.g. "~3-5 min" or "< 30 sec"
  links?: {
    neuroguide_slug?: string;
    neurorx_slugs?: string[];
  };
}

export interface SelectOption {
  id: string;               // stable key, e.g. "opt_2" or "un"
  label: string;            // concise bedside label, e.g. "Some effort against gravity"
  description?: string;     // optional secondary clarifying line
  points: number | null;    // null when is_untestable === true (e.g. NIHSS UN)
  is_untestable?: boolean;  // true for NIHSS "UN" options
  badge?: string;           // e.g. "+2", "Grade 3", "UN"
}

export interface SelectScaleItem {
  kind: "select";
  id: string;               // e.g. "nihss_5a"
  code?: string;            // e.g. "5a"
  label: string;            // e.g. "Motor Arm — Left"
  subtitle?: string;        // short inline prompt shown under item title
  required: boolean;
  options: SelectOption[];
}

export interface NumericUnitOption {
  unit: string;             // e.g. "cm", "mm", "mg/dL", "mmol/L", "g/dL", "g/L"
  label: string;
  to_canonical_factor: number; // canonical = value * factor + offset
  to_canonical_offset?: number;
}

export interface NumericScaleItem {
  kind: "numeric";
  id: string;               // e.g. "ich_a"
  code?: string;            // e.g. "A"
  label: string;            // e.g. "Greatest hemorrhage diameter (A)"
  subtitle?: string;
  required: boolean;
  canonical_unit: string;   // e.g. "cm"
  units: NumericUnitOption[];
  min_canonical: number;    // physiological lower bound
  max_canonical: number;    // physiological upper bound
  step?: number;
  placeholder?: string;
}

export type ScaleItem = SelectScaleItem | NumericScaleItem;

export interface SubscoreDef {
  id: string;
  label: string;
  item_ids: string[];
}

export interface ScoringConfig {
  method: "sum" | "single_select" | "formula";
  min_score: number;
  max_score: number | null; // null for unbounded continuous outputs (e.g. volume mL)
  unit?: string;            // e.g. "points", "mL", "mEq/L", "mcg/mL", "mOsm/kg"
  precision?: number;       // decimal places for display (default 0 for point scales, 1 for formulas)
  formula_id?: "abc_2" | "corrected_na_katz" | "corrected_phenytoin_winter_tozer" | "serum_osmolality";
  untestable_policy?: "exclude_and_flag"; // NIHSS UN excluded from numeric sum and surfaced in result card
  subscores?: SubscoreDef[];
}

export interface InterpretationBand {
  id: string;
  min: number;              // inclusive
  max: number | null;       // inclusive; null = open upper bound
  label: string;            // e.g. "Moderate Stroke"
  severity: SeverityLevel;
  summary: string;          // concise clinical interpretation
  clinical_note?: string;   // optional evidence-based context
  refs: SourceRef[];
}

export interface AssessmentGuide {
  id: string;
  target_type: "scale" | "item" | "option";
  target_id: string;        // scale id or item.id
  option_id?: string;       // set when target_type === "option"
  chip_label?: string;      // default "How to assess" (item) or "?" (option)
  title: string;            // e.g. "Motor Arm (5a/5b) — Bedside Technique & Pitfalls"
  bedside_steps: string[];  // concise step-by-step maneuvers
  pitfalls_and_exceptions: string[]; // tricky edge cases (intubation, amputation, coma, grade boundaries)
  exam_prompts?: string[];  // optional text-only verbal/reading prompts (NO images in v1)
  refs: SourceRef[];
}

export interface ScaleReference {
  id: string;
  citation: string;         // standard AMA/Vancouver citation
  year: number;
  pmid?: string;
  doi?: string;
  url?: string;
}

export interface ScaleTestCase {
  name: string;
  inputs: Record<string, string | number>; // option.id for select items; numeric value (in canonical_unit) for numeric items
  expected_score: number | null;
  expected_band_id?: string;
  expected_untestable_ids?: string[];
}

export interface ScaleRecord {
  id: string;               // lowercase slug, e.g. "nihss", "mrs", "ich-score", "abc-2"
  schema_version: 1;
  metadata: ScaleMetadata;
  items: ScaleItem[];
  scoring: ScoringConfig;
  interpretation: InterpretationBand[];
  assessment_guides: AssessmentGuide[];
  references: ScaleReference[];
  test_cases?: ScaleTestCase[]; // verified automatically by `calc:validate` & unit tests
  status: RecordStatus;
  verification: {
    verified_by: string | null;
    verified_at: string | null;
    content_hash: string | null;
  };
}
```

---

## 6. Clinical Scoring Engine Rules (`src/lib/neurocalc/engine.ts`)

1. **Pure & deterministic:** Zero React/DOM/Node-only imports; all state passed as arguments, returning a deterministic `ScoreEvaluationResult`.
2. **Zero clinical cutoffs in engine code:** All item labels, point values, physiological bounds, and interpretation thresholds come exclusively from `ScaleRecord`. `formulas.ts` contains only pure, named published mathematical equations (`abc_2`, `corrected_na_katz`, `corrected_phenytoin_winter_tozer`, `serum_osmolality`).
3. **Strict completeness & bounds safety:**
   - Missing required inputs → `isComplete: false` (never fabricate `0` for unanswered required items; partial progress is shown as `answeredCount / requiredCount`, and partial sum is clearly labelled *"Partial score — X items remaining"* for `point_sum` scales, while `formula` scales show no numeric result until all required numeric inputs are valid).
   - Out-of-bounds or non-finite numeric input (`< min_canonical`, `> max_canonical`, `NaN`) → inline field error, no formula output.
4. **NIHSS `UN` (Untestable) handling:** Selecting an option with `is_untestable: true` satisfies the item as answered (so completion tracks accurately), adds `0` to the numeric total, and adds `{ itemId, code, label }` to `untestableItems[]` so the sticky result card prominently lists untestable items alongside the score.
5. **Runtime verification gate:** If `effectiveStatus !== "verified"` (i.e. `draft`, `retired`, or `hashMatches === false`), the public `/neurocalc` UI blocks live score display and shows *"Pending clinical verification"*.

---

## 7. UI / Design & Typography Rules (Ecosystem Parity)

Must visually match `NeuroRx` (`src/components/neurorx/NeuroRxShell.tsx`) and `NeuroGuide`:
- **Typography & Theme Wrapper:** `src/app/neurocalc/layout.tsx` wraps children in `<div className="min-h-screen medical-journal-app">` inheriting `IBM Plex Sans`, `Newsreader` (`.font-journal`), `IBM Plex Mono`, `tabular-nums`, and warm paper (`--bg-paper: #FAF8F5`) / Night Shift (`--bg-paper: #151412`) tokens from `src/app/globals.css`.
- **Accent Palette:** Cyan-Teal `#0E7490` (dark mode `cyan-400` / `#22D3EE`) — already registered in `src/app/page.tsx` (`BENTO_APPS`) and `src/components/ecosystem/AppSwitcher.tsx`.
- **Sticky Header:** Identical structure, heights, and font sizes to `NeuroRxShell`:
  - `sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 px-4 py-3.5 backdrop-blur-md sm:px-8`
  - Eyebrow: `text-[10.5px] font-bold uppercase tracking-widest` + animated `#0E7490` dot (`CLINICAL SCALES & BEDSIDE CALCULATORS`)
  - Title: `<h1 className="font-journal text-xl font-bold tracking-tight sm:text-2xl">NEUROCALC</h1>` + `#0E7490` `BETA` pill (`text-[10px] font-bold uppercase`)
  - Right controls: Admin-only Sync/Offline indicator (`isAdmin`), mobile Night Shift toggle + `AdminButton`, `<AppSwitcher currentApp="neurocalc" darkMode={darkMode} />`.
- **Main Container:** `max-w-7xl mx-auto px-4 sm:px-8 pt-6` + `<MedicalDisclaimerFooter darkMode={darkMode} />`.
- **Visual Scoring Layout:**
  - **All-items scrollable list:** Desktop 2-column layout (`lg:grid-cols-[minmax(0,1fr)_340px] gap-6`) with scrollable item cards on the left and a **sticky live `ScoreResultCard`** on the right (`lg:sticky lg:top-24`); mobile shows a compact sticky bottom score summary bar expandable on tap.
  - **1-tap Option Cards/Pills:** Minimum `44px` touch target, clear point badge (`font-mono tabular-nums`), unmistakable selected state (Cyan-Teal border + soft tint + check indicator), full keyboard navigation.
  - **Progress Bar:** Shown on multi-item scales (`items.length >= 4`) as `answered / total` with a subtle completion bar and quick scroll-to-next-unanswered control.
  - **Visual Severity Meter:** Large `tabular-nums` score (`text-4xl font-bold`), segmented horizontal band bar marking the active threshold, semantic color + icon + text label (WCAG AA contrast in light & Night Shift; never color-only), concise interpretation text, `UN` list if present, and **Reset** button (**NO Copy clinical summary button**).
  - **Selective Contextual Assessment Guides (`AssessmentGuidePanel`):**
    - Item-level chip (`How to assess` with `?` / book icon) rendered **only** if `assessment_guides` has an entry targeting that `item.id`.
    - Option-level compact `?` button rendered **only** if `assessment_guides` has an entry targeting `{ target_id: item.id, option_id: opt.id }`.
    - Clicking opens an inline expandable callout (default on mobile / short option tips) or a non-disruptive right slide-over drawer (desktop detailed guides) without losing scroll position or selections. Displays up to 3 text-only sections: **Bedside Exam Steps**, **Edge Cases & Pitfalls** (plus optional text-only **Exam Prompts**), and **Source Citation**.

---

## 8. Testing Strategy

- **Unit tests (`tests/neurocalcEngine.test.mjs`):** Table-driven tests covering every Wave 1 & Wave 2 scale/formula: minimum/maximum scores, exact interpretation band boundaries, partial/incomplete states, NIHSS `UN` handling, unit conversions (mm↔cm, g/L↔g/dL, mmol/L↔mg/dL), out-of-bounds rejection, and draft/hash-mismatch gating.
- **Validation & Merkle tests (`tests/neurocalcValidate.test.mjs`):** Deterministic `section_hashes` (editing `assessment_guides` changes ONLY `assessment_guides` hash), `content_hash` tamper detection, invalid `assessment_guides.target_id` rejection, missing reference rejection, and automatic execution of embedded `scale.test_cases`.
- **Sync v2 tests (`tests/neurocalcSyncRepo.test.mjs`, `tests/neurocalcSyncEngine.test.mjs`, `tests/neurocalcSyncApi.test.mjs`):** CRUD, optimistic `expectedRev` `409`, `304 Not Modified` via ETag, tombstone/restore, `root_hash` determinism, `purge_horizon_seq` reset, offline IndexedDB fallback, Admin auth enforcement, and `Cache-Control: no-store`.
- **CI integration:** `npm test` runs all `tests/neurocalc*.test.mjs` + `npm run calc:validate`.
- **Manual verification checkpoints:** Light & Night Shift themes, desktop (1280px+) and mobile (375px), offline reload after hydration, `/admin` NeuroCalc tab edit → Realtime sync to `/neurocalc`.

---

## 9. Boundaries

- **Always:**
  - Keep all clinical copy 100% original English.
  - Anchor every scale, cutoff, formula, and assessment guide to a published citation in `references[]`.
  - Keep scoring sessions strictly ephemeral in React memory (zero persistence / zero PHI).
  - Compute `section_hashes` and `content_hash` exclusively through `src/lib/sync/jsonPatch.ts`.
  - Run `npm test`, `npm run calc:validate`, and `npm run build` before declaring any implementation task done.
  - Check `node_modules/next/dist/docs/` before writing Next.js 16 route/metadata/`ViewTransition` code.
- **Ask first:**
  - Adding any runtime npm dependency.
  - Modifying shared `src/lib/sync/*` primitives.
  - Running Supabase migrations or writes against the live production project.
  - Adding scales outside the approved Wave 1 / Wave 2 list.
  - Modifying files in sibling apps beyond Ecosystem Hub (`src/app/page.tsx`), `AppSwitcher.tsx`, `DrawLoader.tsx`, and `/admin` (`src/app/admin/page.tsx`).
- **Never:**
  - Persist or transmit patient scores or PHI.
  - Add a *Copy clinical summary* button or visual NIHSS image cards in v1.
  - Hardcode clinical thresholds, cutoffs, or interpretations inside UI components.
  - Auto-mark a scale `status: "verified"` without explicit human clinical review (`calc:verify` or `/admin` Verify button).
  - Render computed scores on `/neurocalc` for `draft` or hash-mismatched scales.

---

## 10. Data Waves (Curated English Datasets)

| Wave | Scope | Scales / Calculators |
|---|---|---|
| **Wave 1** | Stroke & Neurocritical Care (~10) | `nihss` (15 items, `UN` rules, rich text-only bedside guides & verbal prompts), `mrs` (with 2 vs 3 & 3 vs 4 distinction guides), `gcs` (intubated/eye-swollen pitfalls), `four-score`, `ich-score`, `abc-2` (formula, cm/mm), `abcd2`, `cha2ds2-vasc`, `has-bled`, `wfns` + `hunt-and-hess` |
| **Wave 2** | General Neurology, Neuromuscular, Movement & Metabolic (~6) | `barthel-index`, `mg-adl`, `hoehn-and-yahr`, `corrected-sodium` (Katz formula, mmol/L & mg/dL), `corrected-phenytoin` (Winter-Tozer with renal-failure toggle), `serum-osmolality` (mmol/L & mg/dL) |

---

## 11. Success Criteria (v1 Done)

- All 8 modules in `CAPABILITY-MAP-neurocalc.md` implemented and integrated cleanly into `/neurocalc`, `/admin`, `/`, and `AppSwitcher`.
- `npm test`, `npm run calc:validate`, and `npm run build` pass with zero errors.
- Supabase Sync v2 migration applied cleanly with verified SQL invariants (`neurocalc_sync_v2_checks.sql`), and Wave 1 scales seeded and synced to IndexedDB offline-first.
- Editing an `assessment_guides` text block in `/admin` mutates only `section_hashes.assessment_guides`, updates `root_hash`, logs a JSON-Patch revision, and reflects live in `/neurocalc`.
- All 8 acceptance user stories pass manually across Light/Night Shift, Desktop/Mobile (375px), and Offline mode.

---

## 12. Decisions Log

1. **2026-11-26 — Granular Blocks scope:** Only scale definitions and assessment/interpretation content blocks use Granular Blocks & Merkle tree (stored in Supabase); patient scoring sessions are ephemeral and never saved.
2. **2026-11-26 — Language:** 100% original clinical English (matching `NeuroRx`).
3. **2026-11-26 — Bedside layout & outputs:** Full vertical scrollable item list + 1-tap score pills + sticky visual result card with severity bar; **no** *Copy clinical summary* button.
4. **2026-11-26 — Assessment methodology UX:** Selective *"How to assess / ?"* chip only on ambiguous items or options (inline expand / non-disruptive drawer); **text-only** in v1 (no NIHSS visual image cards; 6 granular blocks instead of 7).
5. **2026-11-26 — Admin workflow:** Pragmatic `NeuroRx` v2 model — curated JSON + CLI (`validate`, `migrate-v2`, `snapshot`, `pull`, `push`, `verify`) + `/admin` NeuroCalc tab for sync health, `section_hashes`/revision diff inspection, quick text-block editing, and `draft → verified` approval (no drag-and-drop formula builder in v1).
6. **2026-11-26 — Spec approval & formula details:** `hunt-and-hess` and `wfns` are implemented as two separate scales in Wave 1; `corrected-sodium` uses the standard Katz formula (1.6 mEq/L per 100 mg/dL glucose).

## 13. Open Questions

None blocking. Spec approved on 2026-11-26; see `tasks/neurocalc-plan.md` and `tasks/neurocalc-todo.md` for execution.
