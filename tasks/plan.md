# Implementation Plan: NeuroGuide Clinical Navigator & Ontology-Driven Evidence Engine

## Overview
Build the **Clinical Navigator** tab in NeuroGuide (positioned immediately beside **Clinical Scenarios**) along with its underlying **Ontology-Driven Recommendation Labeler, Independent Validator, Compact Pivotal Trials Registry, and NeuroPulse Literature Matcher**. All UI in Clinical Navigator is presented in English, allowing clinicians to search by keyword/alias or filter across 9 clinical ontology facets (`condition`, `phase`, `intervention_type`, `drug_or_procedure`, `time_window`, `age_group`, `special_populations`, `outcome_target`, `direction`) to compare guideline recommendations across societies, inspect sequential version diffs within a society, review compact pivotal trial endpoints, evaluate overall evidence concordance, and browse related articles in NeuroPulse.

---

## Architecture Decisions

### 1. Harmonized Ontology (`stroke_ontology.json` v0.2.0) & Gemini-Default Labeler (`core/labeler/`)
- **Decision:** Keep 100% of the existing v0.1.0 ontology IDs and validation rules from `labeler_tools.py` so all 26 offline self-tests (`selftest`) continue to pass, while extending `stroke_ontology.json` to v0.2.0 with terms covering the 12 actual guidelines already in NeuroGuide (Atrial Fibrillation, Primary Prevention, Aphasia Rehab, Motor Rehab, aSAH Coiling/Clipping, Antihypertensives, DOACs).
- **Rationale:** Without these additive terms, >40% of the 555 existing recommendations in `public/data/neuroguide_cloud.json` would fall into `other_*` buckets.
- **Gemini Default Runner:** Replace the Claude-only assumption in `labeler_tools.py` and Next.js API with a Google Gemini runner (`gemini-2.5-flash` / `gemini-flash-lite-latest`) that sanitizes JSON Schema Draft 2020-12 (`allOf`/`if-then-else`) into Gemini-compatible OpenAPI 3.0 `responseSchema` while enforcing all strict checks in `validate_record()`.

### 2. Zero-Migration JSONB Persistence (`neuroguide_docs` + `neuroguide_cloud.json`)
- **Decision:** Store recommendation ontology labels (`ontologyLabels`), validation status (`ai_checked` vs. `human_approved` vs. `needs_review`), recommendation relations (`recRelations`), and the compact pivotal trials registry (`pivotalTrials`) inside the existing JSONB storage pipeline (`neuroguide_docs` on Supabase + `public/data/neuroguide_cloud.json` local fallback).
- **Rationale:** Avoids breaking production or requiring manual SQL DDL migrations, works seamlessly on Vercel serverless and local dev, and keeps total payload size tiny (~80 KB for 100 pivotal trials).

### 3. Ultra-Compact Pivotal Trials Registry (`PivotalTrialRecord`)
- **Decision:** Represent each landmark clinical trial as a structured ~700-byte JSON card (`acronym`, `year`, `journal`, `pmid`, `doi`, `design`, `sampleSize`, compact `pico`, `primaryEndpoint` with statistical result & verdict, `safetyEndpoint` with sICH/mortality, and `ontologyTags`).
- **Rationale:** Provides clinicians with immediate quantitative trial evidence (e.g., AcT, TRACE-2, SELECT2, ANGEL-ASPECT, DAWN, DEFUSE-3, INTERACT2, ATACH-2, MILD-MT) without storing bulky PDFs. Supports 1-click PMID/DOI auto-fill from PubMed E-utilities or `public/data/articles.json`.

### 4. Stratified Query Engine & Deterministic Concordance Appraisal (`clinicalNavigatorEngine.ts`)
- **Decision:** Query results are stratified into **Core** (strict AND across selected facets, OR within each facet + keyword/alias match) and **Supporting** (connected via `same_section`, `same_pico`, `refers_to`, `qualifies` relations or shared condition + phase).
- **Concordance Calculation:** Computed deterministically by code from the matched societies' `direction` (`for`, `against`, `no_benefit`, `uncertain`) and normalized `Tier 1–5` grades (`HIGH_CONCORDANCE`, `MODERATE_VARIATION`, `MAJOR_DIVERGENCE`), never allowing AI to auto-reconcile conflicting societies.

### 5. Dual-Tab Workflow: Clinical Scenarios + Clinical Navigator
- **Decision:** Keep **Clinical Scenarios** for curated flagship clinical scenarios, and place **Clinical Navigator** immediately next to it for open-ended faceted/keyword exploration—with an Admin action *"Save Query as Clinical Scenario"* that converts any Navigator filter state into a persistent scenario.

---

## Dependency Graph

```text
core/labeler/ (stroke_ontology.json v0.2.0 + labeler_tools.py)
    │
    ├── src/types/neuroguide.ts & src/data/strokeOntology.json
    │       │
    │       ├── src/lib/neuroguide/ontologyValidator.ts (TS Validator + Sanitizer + Auto-Indexer for 555 recs)
    │       │       │
    │       │       └── src/lib/neuroguide/clinicalNavigatorEngine.ts (Core/Supporting Query + Diff + Concordance + Article Matcher)
    │       │               │
    │       │               ├── src/app/api/neuroguide/navigator/route.ts (Persistence & PMID/DOI Trial Auto-Fill API)
    │       │               │
    │       │               └── src/components/neuroguide/ClinicalNavigatorTab.tsx & PivotalTrialModal.tsx
    │       │                       │
    │       │                       └── src/app/neuroguide/page.tsx (Tab Integration & State Sync)
    │       │
    │       └── src/data/pivotalTrialsSeed.ts (Compact Landmark Trials Seed)
```

---

## Task List

### Phase 1: Ontology v0.2.0, Python/TS Validator & Data Contracts
- [ ] Task 1: Integrate `core/labeler/` with upgraded `stroke_ontology.json` (v0.2.0) and Gemini API support in `labeler_tools.py`
- [ ] Task 2: Extend TypeScript contracts in `src/types/neuroguide.ts` and port deterministic validator + verbatim span indexer to `src/lib/neuroguide/ontologyValidator.ts`
- [ ] Task 3: Seed the Compact Pivotal Trials Registry (`src/data/pivotalTrialsSeed.ts`) covering landmark stroke & neurocritical trials

### Checkpoint: Foundation & Validator Parity
- [ ] `python core/labeler/labeler_tools.py selftest` passes all 26+ checks
- [ ] Unit tests in `tests/ontologyValidator.test.mjs` pass 100%

### Phase 2: Clinical Navigator Query Engine, Concordance & NeuroPulse Article Matcher
- [ ] Task 4: Build `src/lib/neuroguide/clinicalNavigatorEngine.ts` (Faceted + Keyword Search, Cross-Society Matrix grouping, Intra-Society Version Diff, Evidence Concordance Calculator, and NeuroPulse `articles.json` Matcher)
- [ ] Task 5: Create `/api/neuroguide/navigator` route & update `guidelineStorage.ts` for JSONB persistence of pivotal trials, ontology labels, and PMID/DOI trial auto-fill

### Checkpoint: Engine & API Verified
- [ ] Unit tests in `tests/clinicalNavigatorEngine.test.mjs` pass 100%
- [ ] TypeScript check `npx tsc --noEmit` passes cleanly

### Phase 3: Clinical Navigator English UI & NeuroGuide Integration
- [ ] Task 6: Build `src/components/neuroguide/ClinicalNavigatorTab.tsx` and `src/components/neuroguide/PivotalTrialModal.tsx` (100% English UI with Left Search/Facet Explorer & Right 5-Section Evidence Dashboard)
- [ ] Task 7: Wire `ClinicalNavigatorTab` into `src/app/neuroguide/page.tsx` beside `Clinical Scenarios` and add Ontology Label status indicators in `ReviewQueueTab.tsx`

### Checkpoint: Complete & Production Ready
- [ ] All unit and integration tests (`npm test` & `labeler_tools.py selftest`) pass
- [ ] Production build (`npm run build`) succeeds with zero errors

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini `responseSchema` rejects JSON Schema `allOf` / `if-then-else` | High | Strip conditional schema keywords before sending to Gemini `responseSchema`; enforce all conditional rules (`unspecified` vs. `evidence_span`) in `validate_record()` |
| Existing 555 recommendations across 12 guidelines need immediate searchability in Clinical Navigator without waiting for 555 slow LLM calls | High | Provide a deterministic **Verbatim Alias & Section Span Indexer** (`indexRecommendationWithOntology`) that extracts exact verbatim spans from `text` and `parent_context` + `COR/LOE` consistency rules instantaneously, while supporting batch Gemini AI refinement (`ai_checked`) and clinician approval (`human_approved`) |
| PDF control characters (`\u0007`) in extracted guideline sections break verbatim `span_match` | Med | Normalize and strip ASCII control characters in `toLabelerInput` and `span_match` before comparison |
| Storage growth from pivotal trials | Med | Enforce compact `PivotalTrialRecord` (<1 KB/trial) with max 160-char PICO fields; never store trial PDFs |

## Open Questions
- All initial architectural questions have been resolved with the user (Gemini default, JSONB storage, keeping both Clinical Scenarios & Clinical Navigator, and writing the plan to `tasks/plan.md` & `tasks/todo.md`).
