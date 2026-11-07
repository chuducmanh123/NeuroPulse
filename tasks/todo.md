# Task List: NeuroGuide Clinical Navigator & Ontology-Driven Evidence Engine

## Phase 1: Ontology v0.2.0, Python/TS Validator & Data Contracts

## Task 1: Integrate `core/labeler/` with upgraded `stroke_ontology.json` (v0.2.0) and Gemini API support in `labeler_tools.py`

**Description:** Copy the uploaded labeler suite into `core/labeler/`, upgrade `stroke_ontology.json` from `0.1.0` to `0.2.0` (strictly preserving all existing IDs while adding missing terms for Atrial Fibrillation, Primary Prevention, Aphasia Rehab, Motor Rehab, aSAH Coiling/Clipping, Antihypertensives, and DOACs to cover all 12 stored guidelines), regenerate `labeler_output_schema.json` and `labeler_system_prompt.rendered.txt`, and update `labeler_tools.py` so `run_api` supports Google Gemini (`gemini-2.5-flash`) as default alongside Claude while keeping all 26 `selftest` checks green.

**Acceptance criteria:**
- [x] `core/labeler/stroke_ontology.json` contains all original v0.1.0 IDs plus the new v0.2.0 IDs for AFib, Primary Prevention, Aphasia/Motor rehab, aSAH procedures, and acute antihypertensives/DOACs.
- [x] `core/labeler/labeler_tools.py` supports `--provider gemini` (default) with Gemini-compatible schema sanitization and passes `python core/labeler/labeler_tools.py selftest` (all 26+ tests pass).
- [x] `src/data/strokeOntology.json` is synchronized for TypeScript/frontend use.

**Verification:**
- [x] Tests pass: `python core/labeler/labeler_tools.py selftest`
- [x] Prompt render check: `python core/labeler/labeler_tools.py render-prompt`

**Dependencies:** None

**Files likely touched:**
- `core/labeler/stroke_ontology.json`
- `core/labeler/labeler_output_schema.json`
- `core/labeler/labeler_fewshot_examples.json`
- `core/labeler/labeler_system_prompt.template.md`
- `core/labeler/labeler_system_prompt.rendered.txt`
- `core/labeler/labeler_tools.py`
- `src/data/strokeOntology.json`

**Estimated scope:** Medium: 3-5 files (plus static JSON assets)

---

## Task 2: Extend TypeScript contracts in `src/types/neuroguide.ts` and port deterministic validator + verbatim span indexer to `src/lib/neuroguide/ontologyValidator.ts`

**Description:** Add TypeScript types for `OntologyFacetId`, `FacetLabelItem`, `RecommendationLabelOutput`, `ValidationIssue`, `ValidationResult`, `RecommendationRelation`, `PivotalTrialRecord`, and `NavigatorQuery` in `src/types/neuroguide.ts`. Implement `src/lib/neuroguide/ontologyValidator.ts` with exact parity to `labeler_tools.py`'s `validate_record()`, `toLabelerInput()` (stripping PDF control chars like `\u0007`), COR/LOE/ESO normalization, and a fast deterministic verbatim-span ontology indexer (`autoLabelRecommendationVerbatim`) so all 555 existing recommendations are immediately searchable with verified `evidence_span`s.

**Acceptance criteria:**
- [x] `src/types/neuroguide.ts` exports all ontology, label, pivotal trial, and navigator query types without breaking existing components.
- [x] `validateLabelRecord()` in `src/lib/neuroguide/ontologyValidator.ts` enforces all ERROR (`reject`), REVIEW (`needs_review`), and WARN checks identically to `labeler_tools.py`.
- [x] `autoLabelRecommendationVerbatim()` assigns only ontology IDs backed by exact verbatim substrings in `text` or `parent_context` and never fabricates spans.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --test "tests/ontologyValidator.test.mjs"`
- [x] TypeScript check: `cmd /c npx tsc --noEmit`

**Dependencies:** Task 1

**Files likely touched:**
- `src/types/neuroguide.ts`
- `src/lib/neuroguide/ontologyValidator.ts`
- `tests/ontologyValidator.test.mjs`

**Estimated scope:** Small: 3 files

---

## Task 3: Seed the Compact Pivotal Trials Registry (`src/data/pivotalTrialsSeed.ts`) covering landmark stroke & neurocritical trials

**Description:** Create `src/data/pivotalTrialsSeed.ts` containing compact (<1 KB each) `PivotalTrialRecord` entries for the landmark clinical trials cited across our guidelines and scenarios (e.g., `AcT`, `TRACE-2`, `EXTEND-IA TNK`, `ORIGINAL`, `ATTEST-2`, `DAWN`, `DEFUSE-3`, `SELECT2`, `ANGEL-ASPECT`, `TENSION`, `LASTE`, `RESCUE-Japan LIMIT`, `TESLA`, `BAOCHE`, `ATTENTION`, `ENCHANTED`, `OPTIMAL-BP`, `ENCHANTED2/MT`, `INTERACT2`, `ATACH-2`, `INTERACT3`, `ENRICH`, `MILD-MT`, `DISTAL`, `ESCAPE-MeVO`, `DISCOUNT`, `CHANCE`, `POINT`, `THALES`, `ELAN`, `TIMING`, `OPTIMAS`, `ESETT`) plus helper functions to merge with conference late-breaking trials (`CONFERENCE_LATE_BREAKING`).

**Acceptance criteria:**
- [x] Each `PivotalTrialRecord` has structured PICO ($\le 160$ chars per field), quantitative `primaryEndpoint` and `safetyEndpoint`, `pmid`/`doi`, `evidenceSource`, and `ontologyTags`.
- [x] Total serialized JSON size of the entire seed registry is under 35 KB.
- [x] Automatic trial-to-recommendation linker matches `drivingTrials` strings (e.g., `"AcT (Lancet 2022)"` -> `"AcT"`) and verbatim trial mentions in recommendation texts.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --test "tests/ontologyValidator.test.mjs"`
- [x] TypeScript check: `cmd /c npx tsc --noEmit`

**Dependencies:** Task 2

**Files likely touched:**
- `src/data/pivotalTrialsSeed.ts`
- `tests/ontologyValidator.test.mjs`

**Estimated scope:** Small: 2 files

---

## Checkpoint: After Tasks 1-3
- [x] `python core/labeler/labeler_tools.py selftest` passes 100%
- [x] `node --experimental-strip-types --test "tests/ontologyValidator.test.mjs"` passes 100%
- [x] `cmd /c npx tsc --noEmit` passes with zero errors

---

## Phase 2: Clinical Navigator Query Engine, Concordance & NeuroPulse Article Matcher

## Task 4: Build `src/lib/neuroguide/clinicalNavigatorEngine.ts` (Faceted + Keyword Search, Cross-Society Matrix, Version Diff, Concordance Appraisal, and NeuroPulse Article Matcher)

**Description:** Implement the core query and synthesis engine in `src/lib/neuroguide/clinicalNavigatorEngine.ts` that takes `(guidelines, pivotalTrials, conferences, neuroPulseArticles, query)` and returns:
1. Stratified **Core** (AND across selected facets, OR within facet + keyword/alias match) and **Supporting** (related via `same_section`, `same_pico`, `refers_to`, `qualifies`) recommendations, filtered by approval status (`human_approved` / `ai_checked`, never `reject`).
2. **Cross-Society Matrix** grouped by society (`AHA/ASA`, `ESO`, `VN-MOH`, `AAN`, `NCS`, `ILAE`) with raw grades, normalized Tiers (`1..5`), and highlighted `evidence_span`s.
3. **Sequential Guideline Diff** comparing earlier vs. current editions of the same society (`previousGrade` vs. `currentGrade`, `changeType`, `previousText` vs. `currentText`).
4. **Pivotal Trials & Evidence Bridge** separating `PEER_REVIEWED_PUBLISHED` landmark trials from `CONFERENCE_LATE_BREAKING` trials.
5. **Deterministic Evidence Concordance Appraisal** (`HIGH_CONCORDANCE`, `MODERATE_VARIATION`, `MAJOR_DIVERGENCE`) with `[rec_id]`-cited summary bullets.
6. **Related NeuroPulse Articles** matched from `public/data/articles.json` via trial acronym, DOI/PMID, ontology aliases, and subspecialty.

**Acceptance criteria:**
- [x] Querying `condition: ["ais"]` + `drug_or_procedure: ["tenecteplase"]` returns matching AHA/ASA and ESO recommendations, sequential version diffs, `AcT` / `TRACE-2` trials, concordance level, and related Stroke articles.
- [x] Conflicting society recommendations (e.g., `for` vs. `against` or `uncertain`) produce `MODERATE_VARIATION` or `MAJOR_DIVERGENCE` and are displayed side-by-side without auto-reconciling.
- [x] Records with `validatorStatus === "reject"` are strictly excluded from all outputs.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --test "tests/clinicalNavigatorEngine.test.mjs"`
- [x] TypeScript check: `cmd /c npx tsc --noEmit`

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/lib/neuroguide/clinicalNavigatorEngine.ts`
- `src/lib/neuroguide/relationBuilder.ts`
- `tests/clinicalNavigatorEngine.test.mjs`

**Estimated scope:** Medium: 3 files

---

## Task 5: Create `/api/neuroguide/navigator` route & update `guidelineStorage.ts` for JSONB persistence and PMID/DOI trial auto-fill

**Description:** Extend `src/lib/neuroguide/guidelineStorage.ts` to persist `pivotalTrials` and custom `recLabels` inside the existing JSONB storage (`neuroguide_docs` + `public/data/neuroguide_cloud.json`). Create `src/app/api/neuroguide/navigator/route.ts` supporting:
- `GET`: Returns merged `pivotalTrials`, ontology metadata, and custom label overrides.
- `POST`: Supports (a) upserting a `PivotalTrialRecord`, (b) auto-fetching compact trial metadata from PubMed E-utilities or `public/data/articles.json` by PMID/DOI/acronym, (c) running Gemini AI labeling (`geminiLabelerClient.ts`) on a recommendation with `validateLabelRecord()`, and (d) saving a Navigator query as a `ClinicalScenario`.

**Acceptance criteria:**
- [x] `GET /api/neuroguide/navigator` returns the merged pivotal trials registry and ontology version `0.2.0`.
- [x] `POST /api/neuroguide/navigator` with `action: "upsert_trial"` persists the compact trial to active storage (Supabase JSONB + local disk fallback).
- [x] `POST /api/neuroguide/navigator` with `action: "lookup_pmid"` extracts title, journal, year, DOI, and abstract-derived endpoints from PubMed / local articles.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --test "tests/clinicalNavigatorEngine.test.mjs"`
- [x] TypeScript check: `cmd /c npx tsc --noEmit`

**Dependencies:** Task 4

**Files likely touched:**
- `src/lib/neuroguide/guidelineStorage.ts`
- `src/lib/neuroguide/geminiLabelerClient.ts`
- `src/app/api/neuroguide/navigator/route.ts`

**Estimated scope:** Medium: 3 files

---

## Checkpoint: After Tasks 4-5
- [x] All engine and API unit tests pass (`cmd /c npm test`)
- [x] `cmd /c npx tsc --noEmit` passes with zero errors

---

## Phase 3: Clinical Navigator English UI & NeuroGuide Integration

## Task 6: Build `src/components/neuroguide/ClinicalNavigatorTab.tsx` and `src/components/neuroguide/PivotalTrialModal.tsx` (100% English UI)

**Description:** Create the **Clinical Navigator** component (`src/components/neuroguide/ClinicalNavigatorTab.tsx`) with 100% English interface:
- **Left Column (4/12)**:
  - Keyword / Trial / Drug search input with instant alias matching.
  - Quick Clinical Presets (e.g., *AIS IV Thrombolysis (TNK vs. tPA)*, *Large Core EVT (ASPECTS 3–5)*, *Acute ICH BP Lowering*, *aSAH Nimodipine & Aneurysm Securing*, *AFib Anticoagulation & Stroke Prevention*, *Post-Stroke Pneumonia / Dysphagia*).
  - Accordion/pill selectors for the 9 Ontology Facets (`Condition`, `Care Phase`, `Intervention Type`, `Drug / Procedure`, `Time Window`, `Age Group`, `Special Population`, `Outcome Target`, `Direction`) with live match counts.
  - Verification filter toggle (`Clinician Approved + AI Checked` vs. `Clinician Approved Only`).
- **Right Column (8/12)**:
  - Active Query Header with matched counts (Societies, Guidelines, Core/Supporting Recommendations, Pivotal Trials, NeuroPulse Articles) + Admin buttons (*"+ Add Pivotal Trial"*, *"Save Query as Scenario"*).
  - **Sub-view / Section 1: Cross-Society Guideline Matrix**: Side-by-side comparison across societies (`AHA/ASA`, `ESO`, `VN-MOH`, etc.) with raw grade, normalized Tier badge, `AI Checked` / `Clinician Approved` badge, verbatim quote with highlighted `evidence_span` chips, section/page provenance, and cited trials.
  - **Sub-view / Section 2: Sequential Guideline Diff (Intra-Society Evolution)**: Compares previous vs. current versions of the same society (`UPGRADED`, `NEW`, `REVISED`, `DOWNGRADED`).
  - **Sub-view / Section 3: Pivotal Trials & Evidence Bridge**: Renders compact `PivotalTrialRecord` cards (PICO + primary/safety endpoints + verdict badge) and `Late-Breaking Conference Trials` with distinct provenance badges.
  - **Sub-view / Section 4: Evidence Concordance & Appraisal Summary**: Visual concordance meter (`High Concordance`, `Moderate Variation`, `Major Divergence`), cross-society agreement breakdown, and `[rec_id]`-cited synthesis.
  - **Sub-view / Section 5: Related NeuroPulse Literature**: Displays matching articles from `public/data/articles.json` with journal badge, publication date, study type, and key clinical takeaway.
- Also build `src/components/neuroguide/PivotalTrialModal.tsx` for Admin 1-click PMID/DOI auto-fill and compact trial editing.

**Acceptance criteria:**
- [x] All UI labels, filter facets, section headers, and appraisals in `ClinicalNavigatorTab.tsx` and `PivotalTrialModal.tsx` are in English.
- [x] Selecting facets or typing keywords updates the 5 synthesis sections in real time without page reload.
- [x] Verbatim `evidence_span` substrings are highlighted inside recommendation cards with tooltips showing the matched facet (`facet = value`).

**Verification:**
- [x] TypeScript check: `cmd /c npx tsc --noEmit`
- [x] Build succeeds: `cmd /c npm run build`

**Dependencies:** Task 4, Task 5

**Files likely touched:**
- `src/components/neuroguide/ClinicalNavigatorTab.tsx`
- `src/components/neuroguide/PivotalTrialModal.tsx`

**Estimated scope:** Medium: 2 files

---

## Task 7: Wire `ClinicalNavigatorTab` into `src/app/neuroguide/page.tsx` beside `Clinical Scenarios` and update `ReviewQueueTab.tsx`

**Description:** Update `src/app/neuroguide/page.tsx` to add the `"Clinical Navigator"` tab (`activeTab === "navigator"`) directly next to `"Clinical Scenarios"`, load `/api/neuroguide/navigator` and `/data/articles.json` for seamless cross-ecosystem linking, allow jumping from a Clinical Scenario into Clinical Navigator ("Explore in Clinical Navigator"), and add Ontology Label & `evidence_span` status badges in `src/components/neuroguide/ReviewQueueTab.tsx`.

**Acceptance criteria:**
- [x] The top navigation bar in `/neuroguide` displays `Practice Guidelines`, `Conferences & Late-Breaking Trials`, `Clinical Scenarios`, and `Clinical Navigator` side-by-side.
- [x] Clicking `"Clinical Navigator"` renders `ClinicalNavigatorTab` with full access to loaded guidelines, conferences, pivotal trials, and NeuroPulse articles.
- [x] `ReviewQueueTab.tsx` displays distinct `ai_checked` vs. `human_approved` vs. `needs_review` badges and ontology facet tags.

**Verification:**
- [x] Tests pass: `cmd /c npm test`
- [x] Python validator self-test passes: `python core/labeler/labeler_tools.py selftest`
- [x] Build succeeds: `cmd /c npm run build`

**Dependencies:** Task 6

**Files likely touched:**
- `src/app/neuroguide/page.tsx`
- `src/components/neuroguide/ReviewQueueTab.tsx`

**Estimated scope:** Small: 2 files

---

## Checkpoint: Complete
- [x] All 26+ Python labeler self-tests pass (`python core/labeler/labeler_tools.py selftest`)
- [x] All Node.js unit and integration tests pass (`cmd /c npm test`)
- [x] Next.js production build (`cmd /c npm run build`) completes with zero errors
- [x] Ready for human review
