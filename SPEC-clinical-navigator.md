# Spec: NeuroGuide Clinical Navigator & Ontology-Driven Evidence Engine

## 1. Objective

Build **Clinical Navigator**, a new primary tab in **NeuroGuide** positioned directly beside **Clinical Scenarios**, powered by an ontology-driven atomic recommendation and clinical trial evidence engine (`GUIDELINE_PIPELINE_SPEC.md`), harmonized with the existing NeuroPulse / NeuroGuide architecture.

### Why We Are Building This
- **Clinical Scenarios** remains the curated showcase for top high-impact clinical scenarios (`MOCK_CLINICAL_SCENARIOS` / `system_clinical_scenarios`).
- **Clinical Navigator** provides **interactive, ad-hoc evidence navigation** in **English**: clinicians can filter by any combination of controlled ontology facets (`condition`, `phase`, `intervention_type`, `drug_or_procedure`, `time_window`, `age_group`, `special_populations`, `outcome_target`, `direction`) or free-text keywords/aliases, and immediately view a structured synthesis across all 12+ guidelines (555+ recommendations), landmark clinical trials, and NeuroPulse articles—with an admin option to *"Save current query as a Clinical Scenario"*.

---

## 2. Second-Pass Audit: Harmonizing Claude's `files.zip` with Existing Project Architecture

Because the uploaded `files.zip` (`GUIDELINE_PIPELINE_SPEC.md`, `stroke_ontology.json`, `labeler_output_schema.json`, `labeler_tools.py`) was drafted without direct visibility into the `d:\NeuroPulse` repository, the following 6 architectural adjustments are required to avoid duplication and prevent schema conflicts:

1. **Reuse Existing 5-Core Pipeline & JSONB Storage (No Redundant SQL Tables or Manual Input Forms)**:
   - *Conflict*: `GUIDELINE_PIPELINE_SPEC.md` assumed guidelines were unsplit raw files and proposed 10 new PostgreSQL tables (`guidelines`, `recommendations`, `rec_labels`, etc.) plus manual AHA/ESO entry screens.
   - *Resolution*: NeuroGuide already has 12 parsed guidelines (555 atomic recommendations in `PracticeChangeDetail[]`) persisted in Supabase `neuroguide_docs` (JSONB) and `public/data/neuroguide_cloud.json`, plus `EditGuidelineModal.tsx` and `NotebookLMUploadModal.tsx`. We will store ontology labels (`ontologyLabels`), validation metadata (`labelValidation`), recommendation relations (`recRelations`), and pivotal trials (`pivotalTrials`) directly inside the existing JSONB payload architecture (`neuroguide_docs` + `neuroguide_cloud.json`).
2. **Field Adapter & PDF Control-Character Sanitizer (`toLabelerInput`)**:
   - *Conflict*: `labeler_tools.py` expects `{ rec_id, society, guideline_id, section_path, parent_context, text, cor, loe, strength_raw, quality_raw, change_type }`, whereas our codebase uses `PracticeChangeDetail` (`{ id, category, topic, currentText, cor, loe, strength, quality, changeType, picoNumber, picoQuestion }`). Additionally, some parsed PDF sections in `aha2026_test_latest.json` contain ASCII control characters (`\u0007`).
   - *Resolution*: Implement a deterministic adapter `toLabelerInput(doc, change)` that sanitizes control characters (`[\u0000-\u001F]`) and maps `PracticeChangeDetail` fields cleanly to the labeler contract without mutating the original `GuidelineDoc`.
3. **Ontology Expansion (`stroke_ontology.json` v0.1.0 → v0.2.0) for Existing Guidelines**:
   - *Conflict*: `stroke_ontology.json` v0.1.0 only covered acute stroke basics, whereas our 12 stored guidelines include **2024 AHA Primary Prevention (83 recs)**, **2023 ACC/AHA Atrial Fibrillation (86 recs)**, **2023 AHA & 2026 ESO aSAH (101 recs)**, **2025 ESO Aphasia Rehabilitation (10 recs)**, and **2025 ESO Motor Rehabilitation (7 recs)**. With v0.1.0, over 40% of existing recommendations would fall into `other_*` (`needs_review`).
   - *Resolution*: Extend `stroke_ontology.json` to **v0.2.0** (strictly additive so all 26 existing `selftest` checks in `labeler_tools.py` still pass):
     - Add to `condition`: `atrial_fibrillation`, `post_stroke_aphasia`, `post_stroke_motor_impairment`, `carotid_stenosis`, `status_epilepticus`.
     - Add to `phase`: `primary_prevention`.
     - Add to `intervention_type`: `speech_language_therapy`, `lifestyle_risk_modification`, `cardiac_rhythm_luge_management`, `aneurysm_securing`.
     - Add to `drug_or_procedure`: `doac`, `warfarin`, `left_atrial_appendage_occlusion`, `endovascular_coiling`, `microsurgical_clipping`, `nicardipine`, `labetalol`, `clevidipine`, `argatroban`, `levetiracetam`.
4. **Google Gemini API Runner & Schema Sanitizer**:
   - *Conflict*: `labeler_tools.py` defaulted to Anthropic (`claude-sonnet-5-5`) and `labeler_output_schema.json` used JSON Schema Draft 2020-12 `allOf` / `if-then-else` / `type: ["string", "null"]`, which Google Gemini's OpenAPI 3.0 `responseSchema` rejects.
   - *Resolution*: Use **Google Gemini** (`gemini-2.5-flash` / `gemini-flash-lite-latest`) as the default labeler model. Convert the schema for Gemini's `responseSchema` (stripping `allOf`/`if-then-else` and converting nullable types) while keeping the 100% strict post-generation verification in `validate_record()`.
5. **ESO Synoptic Table & Normalization Alignment**:
   - *Conflict*: `stroke_ontology.json` normalization only mapped 5 lowercase ESO strings, whereas `src/lib/neuroguide/esoPicoGrouper.ts` produces `"Strong for"`, `"Weak for"`, `"Weak against"`, `"Strong against"`, `"Expert consensus"`, and `"No recommendation / Uncertain (Ongoing trial)"`.
   - *Resolution*: Align `normalization` and `validate_record` with `esoPicoGrouper.ts` and `TIER_CONFIG` (`NormalizedTier 1..5`).
6. **Admin Command Center Integration for Review Queue**:
   - *Conflict*: `GUIDELINE_PIPELINE_SPEC.md` assumed Review Queue was a tab inside `/neuroguide`, but `/neuroguide` already migrated Review Queue to `/admin` (`ReviewQueueTab.tsx`).
   - *Resolution*: Keep `/neuroguide` clean for clinicians (adding **Clinical Navigator** beside **Clinical Scenarios**), and integrate the Ontology Label Review & Gold Set accuracy metrics inside `ReviewQueueTab.tsx` in `/admin`.

---

## 3. Compact Pivotal Trial Storage (`PivotalTrialRecord`)

Each landmark trial is stored as a compact JSON object (~600–900 bytes, ~50–80 KB total for 60–100 trials) inside `neuroguide_cloud.json` and Supabase `neuroguide_docs` (`id = "system_clinical_navigator"`):
- **Core Fields**: `id`, `acronym`, `title`, `year`, `journal`, `pmid`, `doi`, `evidenceSource` (`"PEER_REVIEWED_PUBLISHED"` | `"CONFERENCE_LATE_BREAKING"`), `design`, `sampleSize`.
- **Compact PICO**: `{ population, intervention, comparator, timeWindow }` (concise strings $\le 160$ chars).
- **Endpoints**:
  - `primaryEndpoint`: `{ metric, resultStats, verdict: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NON_INFERIOR" }`
  - `safetyEndpoint`: `{ sICH?, mortality90d?, note? }`
- **Ontology Tags & Links**: `ontologyTags` (matching `stroke_ontology.json` facet IDs) + `linkedGuidelineIds` + automatic matching to `GuidelineDoc.allPracticeChanges[].drivingTrials` and NeuroPulse `public/data/articles.json`.
- **3-Way Input**:
  1. Pre-seeded landmark trials (`AcT`, `TRACE-2`, `EXTEND-IA TNK`, `DAWN`, `DEFUSE-3`, `SELECT2`, `ANGEL-ASPECT`, `TENSION`, `LASTE`, `ENCHANTED`, `INTERACT2`, `ATACH-2`, `ENRICH`, `MILD-MT`, `ESETT`, `ELAN`, `ARCADIA`, etc.) + auto-harvested conference trials.
  2. Admin 1-Click PMID/DOI Fetcher (auto-populates PICO & endpoint stats from PubMed / `articles.json`).
  3. Admin compact edit form (`PivotalTrialModal.tsx`).

---

## 4. Tech Stack & Commands

- **Stack**: Next.js `^16.4.3`, React `^19.3.1`, TypeScript `^7.0.2`, Tailwind CSS `^4.3.3`, Supabase (`@supabase/supabase-js`), Python 3.10+ (`core/labeler/labeler_tools.py`).
- **Commands**:
  - Typecheck: `cmd /c npx tsc --noEmit`
  - Build: `cmd /c npm run build`
  - Node Tests: `cmd /c npm test`
  - Python Labeler Self-Test: `python core/labeler/labeler_tools.py selftest`

---

## 5. Project Structure

```text
d:\NeuroPulse\
├── core/
│   └── labeler/
│       ├── stroke_ontology.json              # Upgraded v0.2.0 ontology (backward-compatible with v0.1.0)
│       ├── labeler_output_schema.json        # Updated JSON Schema for v0.2.0
│       ├── labeler_fewshot_examples.json     # Few-shot examples
│       ├── labeler_system_prompt.template.md # System prompt template
│       ├── labeler_system_prompt.rendered.txt# Rendered prompt
│       └── labeler_tools.py                  # Python validator, Gemini default runner, selftest (26+ tests)
├── src/
│   ├── types/
│   │   └── neuroguide.ts                     # OntologyFacetId, RecommendationLabelSet, PivotalTrialRecord, NavigatorQueryResult
│   ├── data/
│   │   ├── strokeOntology.json               # Frontend copy of stroke_ontology.json v0.2.0
│   │   └── pivotalTrialsSeed.ts              # Compact landmark trials registry seed (25+ trials)
│   ├── lib/
│   │   └── neuroguide/
│   │       ├── ontologyValidator.ts          # TS port of validate_record, toLabelerInput, deterministic rule-assisted labeler
│   │       ├── clinicalNavigatorEngine.ts    # Facet + keyword search engine, Core/Supporting stratification, Concordance appraisal, Article matcher
│   │       └── geminiLabelerClient.ts        # Gemini API runner with schema sanitization & fallback
│   ├── components/
│   │   └── neuroguide/
│   │       ├── ClinicalNavigatorTab.tsx      # English UI: Left search/facet explorer + Right 5-section evidence synthesis
│   │       └── PivotalTrialModal.tsx         # Compact trial editor & PMID/DOI auto-fill modal
│   └── app/
│       ├── neuroguide/
│       │   └── page.tsx                      # Adds "Clinical Navigator" tab beside "Clinical Scenarios"
│       └── api/
│           └── neuroguide/
│               └── navigator/route.ts        # GET/POST API for navigator trials, labels, and saving query as Scenario
└── tests/
    ├── ontologyValidator.test.mjs            # TS validator parity & normalization tests
    └── clinicalNavigatorEngine.test.mjs      # Query engine, cross-society matrix, version diff, trial & NeuroPulse article matching tests
```

---

## 6. Code Style & Safety Boundaries

- **Always do**:
  - Render **Clinical Navigator** UI 100% in **English** (preserving verbatim quotes in their source language).
  - Never allow AI to generate or modify `COR`, `LOE`, `strength`, `quality`, dosing, or thresholds.
  - Validate every label against `stroke_ontology.json` and require verbatim `evidence_span` matching.
  - Display conflicting society recommendations side-by-side without auto-reconciling.
  - Badge conference trials as `Late-Breaking / Conference` (`CONFERENCE_LATE_BREAKING`) to keep them distinct from published guideline evidence.
  - Separate `AI Checked` (`ai_checked`) and `Clinician Approved` (`human_approved`) badges.
- **Ask first**:
  - Adding external npm packages or changing Supabase table schemas.
- **Never do**:
  - Show `reject` records to users or pass unapproved dosing to clinical calculators.

---

## 7. Success Criteria

1. `python core/labeler/labeler_tools.py selftest` passes 100% with the upgraded `stroke_ontology.json` and Gemini runner support.
2. All 555+ existing recommendations across the 12 guidelines are indexed with validated ontology facets (`condition`, `phase`, `intervention_type`, `drug_or_procedure`, `time_window`, `age_group`, `direction`) and verbatim `evidence_span`s.
3. **Clinical Navigator** tab appears right beside **Clinical Scenarios** in `/neuroguide` with English UI:
   - Left column: Keyword/alias search + 9-facet interactive filter + quick clinical query presets + Verified/AI-Checked toggle.
   - Right column:
     1. **Cross-Society Guideline Matrix** (AHA/ASA vs. ESO vs. VN-MOH/AAN/NCS/ILAE)
     2. **Sequential Guideline Diff** (Intra-society version comparison, e.g., previous vs. current grade/text)
     3. **Pivotal Trials & Evidence Bridge** (Compact PICO + primary/safety endpoints + late-breaking conference trials)
     4. **Evidence Concordance & Appraisal Summary** (Objective concordance level + `[rec_id]`-cited synthesis)
     5. **Related NeuroPulse Articles** (Matched from `public/data/articles.json`)
   - Admin button: *"Save Query as Clinical Scenario"* and *"Add/Edit Pivotal Trial"*.
4. `cmd /c npm test`, `cmd /c npx tsc --noEmit`, and `cmd /c npm run build` pass with zero errors.
