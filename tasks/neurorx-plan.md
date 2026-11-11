# Implementation Plan: NeuroRx v1

> Spec: [`SPEC-neurorx.md`](../SPEC-neurorx.md) (approved v1.0) · Map: [`CAPABILITY-MAP-neurorx.md`](../CAPABILITY-MAP-neurorx.md) · Guardrails: [`NEURORX-GUARDRAILS.md`](../NEURORX-GUARDRAILS.md) · Checklist: [`neurorx-todo.md`](./neurorx-todo.md)

## Overview
NeuroRx is the `/neurorx` route inside the existing Next.js 16 app: an offline-capable, English-only CDSS for neurology. Data is versioned JSON in `data/neurorx/`, with provenance (verbatim quotes) for every clinical value, human verification sealed by a content hash, and a pure-TS engine that never holds clinical constants. The software is completed with **Data Wave 1** (~25 drugs). Waves 2–4 follow, each gated by human verification.

## Architecture Decisions
| Decision | Rationale |
|---|---|
| JSON in repo + plain-TS validator (no Zod) | Git = audit trail; no new dependency; works offline and on Vercel |
| `Sourced<T>` + `rx:check-quotes` | Turns "don't hallucinate" into a machine-checkable rule: every quote must literally exist in the source text |
| `content_hash` sealing | Any edit after verification silently reverts the record to draft → cannot ship unreviewed changes |
| Engine = pure functions in `src/lib/neurorx` | Unit-testable with the Node test runner; UI holds no clinical logic |
| Admin = section inside existing `/admin` | Reuses passcode auth; approval = merging the GitHub PR |
| Mechanism flags ≠ curated severity | No licensed DDI database; rule engine only suggests review |

## Dependency Graph
```
T1 types+validator ─► T2 scripts (verify/hash/quotes) ─► T3 extraction workflow + pilot drug
        │                                                     │
        ├─► T4 patient/CrCl ─► T5 dose/infusion/formulation    ├─► T10–T13 Data Wave 1 (parallel with Phase 4)
        └─► T6 shell route ─► T7 list+omnibar ─► T8 detail T1-2 ─► T9 detail T3
                                                        │
                       T14 DDI engine ─► T15 Tab 2   T16 Tab 3   T17 Tab 4
                       T18 anticoag compass   T19 LEDD/NPO   T20 patient outputs
                       T21 PWA   T22 label watch ─► T23 admin section   T24 in-app extractor
                       T25–T27 Waves 2–4  ─►  T28 hardening & release
```

## How to use the prompts
1. Open a **new conversation** in Antigravity for each task (keeps context small).
2. Paste the prompt exactly as written. Every prompt starts with the shared preamble below; it is already included.
3. Wait for the agent's report. Run the **Verify** steps yourself. Tick the box in `neurorx-todo.md`.
4. At each **Checkpoint**, review before continuing. Never skip a checkpoint that requires your clinical verification.
5. If the agent asks a question that touches clinical content, answer with a source (file), not from memory.

> [!IMPORTANT]
> **Your manual inputs (cannot be delegated):** (a) place source PDFs and their text extracts in `data/neurorx/sources/`; (b) review drafts and run `npm run rx:verify -- <drug_id> --by "<Your Name>"`; (c) merge label-watch PRs.

**Shared preamble** (already embedded at the top of each prompt):
```text
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md, CAPABILITY-MAP-neurorx.md, tasks/neurorx-plan.md (this task's section only).
The guardrails are binding. If anything in this prompt conflicts with them or the spec, stop and ask me.
Work only on the task below. Do not start the next task. End with the G4 report.
```

---

## Phase 0 — Source Intake (you, before Phase 1 ends)

**Folder convention:** `data/neurorx/sources/<source_id>.pdf` + `<source_id>.txt` (plain text extracted from the PDF; T2 adds a helper). Suggested `source_id` style: `fda-levetiracetam-keppra-2024`, `ismp-tallman-2023`, `eurap-2018-lancetneurol`.

**Minimum for the pilot (T3):** FDA label of levetiracetam (DailyMed) + the ISMP/FDA Tall Man list.

**Wave 1 sources to collect (suggested, confirm editions yourself):**
- FDA labels (DailyMed SPL) or EU SmPC for each Wave 1 drug.
- Latest AHA/ASA acute ischemic stroke guideline and ESO thrombolysis guidance (alteplase, tenecteplase, BP targets).
- AHA/ASA spontaneous ICH guideline (latest) and NCS/SCCM anticoagulant reversal guideline.
- EHRA Practical Guide on NOACs (latest) and ASRA regional anesthesia & antithrombotic guideline (latest edition) for hold times.
- Status epilepticus: AES guideline, NCS guideline, ESETT trial (for loading doses).
- LactMed records (NIH) for lactation fields.

---

## Phase 1 — Foundation (`rx-data-core`, `rx-extraction` a)

### Task 1: Data types and validator
**Description:** Create the NeuroRx data contract (§5 of spec) as TypeScript types plus a plain-TS runtime validator, the empty data folders, and the source registry skeleton.

**Acceptance criteria:**
- [ ] `src/types/neurorx.ts` mirrors spec §5 exactly (`SourceRef`, `Sourced<T>`, `Source`, `DrugRecord`, `Regimen`, `ReproductiveRecord`, `Interaction`, controlled vocabularies `Subspecialty`, `AdverseEffectTag`, `EnzymeProfile`).
- [ ] `src/lib/neurorx/validate.ts` returns a list of errors: missing refs on a non-null value, unknown `source_id`, empty quote, severity outside the enum, MCM entry without registry.
- [ ] Validator tests cover each error type plus one valid fixture (fixtures use the placeholder drug `test-drug-a`, no real clinical numbers).

**Verify:** `npm test` passes · `npm run build` passes.
**Dependencies:** None · **Files:** `src/types/neurorx.ts`, `src/lib/neurorx/validate.ts`, `data/neurorx/sources.json` (`[]`), `data/neurorx/interactions.json` (`[]`), `tests/neurorxValidate.test.mjs` · **Scope:** M

```text
[NEURORX T1 — DATA CONTRACT & VALIDATOR]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md, CAPABILITY-MAP-neurorx.md, tasks/neurorx-plan.md (Task 1 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: implement the data contract of SPEC §5 for module rx-data-core.
1. Create src/types/neurorx.ts. Mirror SPEC §5 exactly, including the controlled vocabularies (Subspecialty, AdverseEffectTag, EnzymeProfile). Do not add or rename fields. If something in §5 is underspecified, choose the minimal shape and list it in your report as "contract gaps".
2. Create src/lib/neurorx/validate.ts with validateSources(sources), validateDrug(drug, sourceIds), validateInteractions(list, drugIds, sourceIds). Each returns { path, message }[].
   Rules: a non-null Sourced value requires refs ≥ 1; every ref.source_id must exist; quote must be non-empty and ≤ 400 chars; enums are enforced; every reproductive.mcm entry needs registry + refs; interaction severity must be a single enum value; alternatives must reference existing drug ids.
3. Create data/neurorx/sources.json and data/neurorx/interactions.json as empty arrays. Create data/neurorx/drugs/ and data/neurorx/sources/ with a .gitkeep in each.
4. Write tests/neurorxValidate.test.mjs (node:test, follow the style of tests/hotTopics.test.mjs). Use only a fictional fixture "test-drug-a" with obviously fake numbers (e.g. 1 mg). One test per rule plus one valid case.
Constraints: no new dependencies; no real clinical data anywhere in this task; plain TypeScript only.
Done = npm test and npm run build green, then the G4 report.
```

### Task 2: Integrity scripts (hash, verify, quote check, validate)
**Description:** CLI scripts that make provenance enforceable, wired into npm and CI.

**Acceptance criteria:**
- [ ] `npm run rx:validate`: validates all data, recomputes `content_hash` (SHA-256 of the record minus `verification`, canonical key order) and fails if a `verified` record's hash mismatches.
- [ ] `npm run rx:verify -- <id> --by "<Name>"`: refuses if validation or quote check fails; otherwise sets status/verified_by/verified_at/hash.
- [ ] `npm run rx:check-quotes`: every quote is found in `sources/<source_id>.txt` after normalization (whitespace, hyphenation, unicode quotes, case); reports misses with drug path.
- [ ] `npm run rx:pdf-to-text -- <source_id>` helper OR documented manual procedure if no PDF tool exists without new deps (ask before adding a dependency).
- [ ] Hash and normalization logic shared in `src/lib/neurorx/integrity.ts` (used at runtime too).

**Verify:** `npm test` · run each script on the fixture · confirm `rx:validate` exits non-zero after hand-editing a verified fixture.
**Dependencies:** T1 · **Files:** `src/lib/neurorx/integrity.ts`, `scripts/neurorx/validate.ts`, `scripts/neurorx/verify.ts`, `scripts/neurorx/check-quotes.ts`, `package.json`, `tests/neurorxIntegrity.test.mjs` · **Scope:** M

```text
[NEURORX T2 — INTEGRITY SCRIPTS]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md (§3, §5), tasks/neurorx-plan.md (Task 2 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: make provenance machine-enforced.
1. src/lib/neurorx/integrity.ts:
   - canonicalize(record): stable key order, verification field removed.
   - contentHash(record): SHA-256 hex. Must work in both Node and the browser (Web Crypto subtle.digest; async is fine).
   - normalizeForQuote(text): lowercase, collapse whitespace, join hyphenated line breaks, unify unicode quotes and dashes.
   - effectiveStatus(record): returns "draft" when status ≠ verified OR the hash mismatches.
2. Scripts in scripts/neurorx/ (run with node --experimental-strip-types, like the existing test command):
   - validate.ts: loads sources.json, drugs/*.json, interactions.json, tall-man.json (if present); runs the T1 validators plus hash checks; prints a summary; exits with code 1 on any error.
   - check-quotes.ts: for every SourceRef, the normalized quote must be a substring of the normalized sources/<source_id>.txt. Missing .txt is an error. Print the drug id, JSON path and the first 80 chars of each failing quote.
   - verify.ts <drug_id> --by "<Name>": runs validate + check-quotes for that drug and refuses on failure. On success sets status "verified", verified_by, verified_at (ISO date) and content_hash.
3. package.json scripts: rx:validate, rx:check-quotes, rx:verify. Append rx:validate and rx:check-quotes to the existing "test" script so CI covers them. Keep the existing tests unchanged.
4. PDF → text: check whether the repo already has a usable tool (scripts/.venv is Python; look for pypdf or pdfplumber there). If yes, add scripts/neurorx/pdf_to_text.py and the script rx:pdf-to-text. If no, DO NOT install anything: write the manual procedure in data/neurorx/sources/README.md and ask me.
5. tests/neurorxIntegrity.test.mjs: hash stability under key reordering; hash changes when a value changes; normalization cases; effectiveStatus downgrade.
Constraints: agents never call verify.ts on real drugs; tests use fixtures only.
Done = npm test and npm run build green, then the G4 report.
```

### Task 3: Extraction workflow and pilot drug (levetiracetam)
**Description:** Document the IDE-agent extraction procedure and prove it end-to-end on one drug, from your sources.

**Acceptance criteria:**
- [ ] `data/neurorx/EXTRACTION.md`: step-by-step workflow, field-by-field mapping to sources, null policy, and severity mapping (Decision 4).
- [ ] `data/neurorx/tall-man.json` populated **only** from the ISMP/FDA source file, with refs.
- [ ] `data/neurorx/drugs/levetiracetam.json` as `draft`. Every non-null value has a verbatim quote. `rx:validate` and `rx:check-quotes` pass.
- [ ] Report lists every field left `null` and why.

**Verify:** both scripts green · **you** read the record next to the PDF · if correct, run `npm run rx:verify -- levetiracetam --by "<Your Name>"`.
**Dependencies:** T2 + Phase 0 sources · **Files:** `data/neurorx/EXTRACTION.md`, `data/neurorx/sources.json`, `data/neurorx/tall-man.json`, `data/neurorx/drugs/levetiracetam.json` · **Scope:** S

```text
[NEURORX T3 — EXTRACTION WORKFLOW + PILOT DRUG]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (especially G1), SPEC-neurorx.md (§5, §12), tasks/neurorx-plan.md (Task 3 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: define the extraction workflow and apply it to ONE drug using ONLY files in data/neurorx/sources/.
1. List the files in data/neurorx/sources/. If the levetiracetam label or the Tall Man list is missing (or its .txt is missing), STOP and tell me exactly what to add.
2. Register each file in data/neurorx/sources.json (id, type, title, publisher, year, version/set_id if printed in the document, file, accessed = today, url only if printed in the document).
3. Write data/neurorx/EXTRACTION.md covering:
   - the procedure (read source → locate section → copy verbatim quote → map to field → value);
   - the null policy;
   - one-severity mapping rules ("avoid concomitant use" ⇒ contraindicated);
   - "never merge registries or sources";
   - how to record the locator (section number/heading/table + page).
4. Build data/neurorx/tall-man.json from the ISMP/FDA list text only: entries { generic, tall_man, refs }.
5. Build data/neurorx/drugs/levetiracetam.json with status "draft" and verification fields set to null.
   - Fill only what the provided sources state.
   - Regimens must be computable (kind/amount/unit/max…) only when the source states the numbers explicitly; otherwise put the text in dose_text and set dose to null.
   - renal_basis exactly as the label defines CrCl.
   - vn_products, bhyt and registration_no stay null (Decision 2) unless a provided VN source exists.
6. Run npm run rx:validate and npm run rx:check-quotes until both pass. Never "fix" a failing quote by editing the quote away from the source text; fix it by copying the exact text.
Forbidden: any value from memory; paraphrased quotes; setting verified fields; adding other drugs.
Report: the null-field table (field → reason) plus any ambiguity for me to decide.
```

### ✅ Checkpoint A (after T1–T3)
- [ ] `npm test`, `npm run rx:validate`, `npm run rx:check-quotes`, `npm run build` green
- [ ] You verified `levetiracetam` with `rx:verify`
- [ ] Hand-edit one number in `levetiracetam.json`: `rx:validate` must fail (hash). Revert.

---

## Phase 2 — Engine and Tab 1 vertical slice

### Task 4: Patient context and Cockcroft-Gault
**Acceptance criteria:**
- [ ] `src/lib/neurorx/patient.ts`: `parsePatient(input)` validates ranges (spec §6) and returns typed errors; `scrToMgDl(µmol/L)`; `crclCG({age, sex, weightKg, scr_mgdl})` with ABW; `bsaMosteller(height, weight)`; `crclNormalized173`.
- [ ] Returns `null` (not 0) when inputs are incomplete; an `age < 18` flag is exposed.
- [ ] Table-driven tests including boundaries and invalid inputs.

**Verify:** `npm test` · **Dependencies:** T1 · **Files:** `patient.ts`, `tests/neurorxPatient.test.mjs` · **Scope:** S

```text
[NEURORX T4 — PATIENT CONTEXT & COCKCROFT-GAULT]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G2), SPEC-neurorx.md (§1 stories 2–3, §6), tasks/neurorx-plan.md (Task 4 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: implement src/lib/neurorx/patient.ts (pure functions, no React).
- PatientInput: { ageYears?, sex?: "male"|"female", weightKg?, heightCm?, scr?: { value, unit: "umol/L"|"mg/dL" }, crclManual?, onHemodialysis?: boolean }. µmol/L is the primary unit.
- parsePatient(input) → { patient, errors[] }. Ranges: weight 2–300 kg, age 0–120, height 50–250 cm, SCr > 0. Out-of-range values become errors and the field is unset.
- scrToMgDl(umol) = umol / 88.4.
- crclCG(): Cockcroft-Gault using actual body weight, female × 0.85. Returns null if any input is missing. Return { value, formula: "Cockcroft-Gault (actual body weight)", inputsUsed }.
- bsaMosteller(), crclNormalized173(crcl, bsa).
- resolveRenalFunction(patient, basis: "cg_abw"|"cg_normalized_1_73"|"egfr"):
  - crclManual wins and is labelled "entered";
  - otherwise compute according to the basis;
  - if the basis needs height and it is missing, return { value: null, warning };
  - for basis "egfr", only a manual value is accepted (no eGFR equation in v1; ask me if you think one is needed).
- isPediatric flag when age < 18.
Tests: tests/neurorxPatient.test.mjs, table-driven. Include exact-boundary values, missing fields, mg/dL vs µmol/L, and the female factor. Expected values must be computed from the formula by hand in comments; do not take them from drug labels.
Done = npm test and npm run build green, then the G4 report.
```

### Task 5: Dose resolution, infusion and formulation helper
**Acceptance criteria:**
- [ ] `dosing.ts`: `resolveRegimen(regimen, patient, renal)` returns `{ state: "needs_input"|"computed"|"text_only"|"blocked_draft", amount?, capped?, band?, explanation[] }`. Per-kg × weight with caps; band selection uses inclusive/exclusive boundaries exactly as the data declares them; HD branch.
- [ ] `infusion.ts`: volume (ml) from concentration, rate (ml/h) from volume and duration. Only computes when the data provides concentration and duration.
- [ ] `formulation.ts`: amount → units of a product strength (e.g. "2 × 500 mg tablets"), rounding rule from data, never exceeds the cap.
- [ ] `orderText.ts`: builds the copy-order string plus disclaimer, with no patient identifiers.
- [ ] Tests use fixtures (fake drug), including "empty weight ⇒ needs_input" and the draft-block case.

**Verify:** `npm test` · **Dependencies:** T2, T4 · **Files:** `dosing.ts`, `infusion.ts`, `formulation.ts`, `orderText.ts`, `tests/neurorxDosing.test.mjs` · **Scope:** M

```text
[NEURORX T5 — DOSE ENGINE, INFUSION, FORMULATION, ORDER TEXT]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1, G2), SPEC-neurorx.md (§5 Regimen, §6, §7 disclaimer), tasks/neurorx-plan.md (Task 5 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: pure engine functions in src/lib/neurorx/.
1. dosing.ts: resolveRegimen(drug, regimen, patient, renal).
   - If effectiveStatus(drug) is not "verified" → { state: "blocked_draft" }, with no numbers in the result object at all.
   - If regimen.dose is null → "text_only" (show dose_text).
   - If per_kg and weight is missing → "needs_input" with a rule string built from data (e.g. "<amount> <unit>/kg, max <max_single> <unit>").
   - Otherwise compute: apply caps (max_single, max_daily) and set capped:true; select the renal band from renal_bands using renal.value (band min inclusive, max exclusive unless the data says otherwise; document this in code); apply the hemodialysis text when onHemodialysis is set.
   - explanation[] lists every step in plain English.
2. infusion.ts: computeInfusion(amount, infusionSpec). Compute volume_ml and rate_ml_h only if the spec has a numeric concentration and duration; otherwise return null with a reason. Never assume a default diluent or volume.
3. formulation.ts: toProductUnits(amount, products[]) using only products with a numeric strength. If no exact combination exists, show the nearest lower combination plus the remainder text. Never round up past a cap.
4. orderText.ts: buildOrderText(drug, regimen, result) → single-line + multi-line versions. Always end with the disclaimer "Reference only. Verify against current product labelling. Prescriber is responsible." No name, ID or age of the patient; weight and renal function may appear as values.
5. tests/neurorxDosing.test.mjs: fixture drug "test-drug-a" (fake numbers). Cover each state, cap hit, band boundaries (exact min/max), HD, no-infusion-spec, product combination, and the order text containing the disclaimer.
Constraint: grep your diff — no clinical numbers in src/lib/neurorx (fixtures live in tests only).
Done = npm test and npm run build green, then the G4 report.
```

### Task 6: `/neurorx` shell (header, tabs, theme, AppSwitcher link)
**Acceptance criteria:**
- [ ] `src/app/neurorx/layout.tsx` + `page.tsx` render the header ("● CLINICAL NEUROPHARMACOLOGY SUITE", "NEURORX"), Night Shift toggle, `AdminButton`, `AppSwitcher`, and 4 pill tabs (💊 Drug Lookup, ⚡ Interactions, 🤰 Pregnancy & Lactation, 🆕 Novel Therapies) with empty states.
- [ ] Data is loaded statically from `data/neurorx` through `src/lib/neurorx/data.ts` (build-time import), exposing `effectiveStatus`.
- [ ] AppSwitcher NeuroRx `href` → `/neurorx`. Footer disclaimer present.
- [ ] Active tab is kept in the URL (`?tab=`) so it is shareable and preserved on reload.

**Verify:** `npm run build` · manual: both themes, 375 px, keyboard tab order.
**Dependencies:** T1 · **Files:** `src/app/neurorx/layout.tsx`, `src/app/neurorx/page.tsx`, `src/components/neurorx/NeuroRxShell.tsx`, `src/lib/neurorx/data.ts`, `src/components/ecosystem/AppSwitcher.tsx` · **Scope:** M

```text
[NEURORX T6 — APP SHELL]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G2.4, G3), SPEC-neurorx.md (§4, §7), tasks/neurorx-plan.md (Task 6 only).
Then read node_modules/next/dist/docs/ for App Router layouts/pages, searchParams handling and metadata in this Next.js version.
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: the /neurorx route shell.
1. Study src/app/neurocase/page.tsx and layout.tsx for header structure, darkMode handling (Night Shift), AdminButton and AppSwitcher usage. Reproduce the same visual language; do not refactor NeuroCase.
2. Create:
   - src/app/neurorx/layout.tsx (metadata title "NeuroRx — Drugs & Dosing");
   - src/app/neurorx/page.tsx;
   - src/components/neurorx/NeuroRxShell.tsx (client component) with: subtitle "● CLINICAL NEUROPHARMACOLOGY SUITE", title "NEURORX", right side [🌙 Night Shift] [AdminButton] [AppSwitcher]; pill tabs "💊 Drug Lookup", "⚡ Interactions", "🤰 Pregnancy & Lactation", "🆕 Novel Therapies"; the active tab synced to ?tab=lookup|interactions|pregnancy|novel; placeholder empty state per tab; footer disclaimer (G3.5).
3. src/lib/neurorx/data.ts: import JSON from data/neurorx at build time (sources, drugs, interactions, tall-man). Export getAllDrugs(), getDrug(id), getSources(), plus the effective status of each record using integrity.ts. If async hashing complicates build-time use, precompute hash status in a script and ask me first.
4. In src/components/ecosystem/AppSwitcher.tsx change only the NeuroRx href "#" → "/neurorx".
5. Layout: max-w-5xl mx-auto px-4, light #F8FAFC / night #0F172A, rounded-2xl cards, border-slate-200/80. Tabs are buttons with aria-selected and ≥ 44 px height.
Done = npm test and npm run build green, then the G4 report including a note on how you checked 375 px width and both themes.
```

### Task 7: Drug list, filters and Clinical Omnibar
**Acceptance criteria:**
- [ ] `omnibar.ts`: parses `"<name> 60kg crcl 35"`, `"tenecteplase 58kg"`, `"scr 120 age 70 female"`; matches generic, brand and class (accent-insensitive via `vietnamese-search.ts`) and reverse AE tags (English labels of the controlled vocabulary).
- [ ] Tab 1 list: subspecialty filter pills (All, ⚡ Emergency/ICU, Stroke, Epilepsy, Headache, Neuromuscular, Dementia, Movement); draft drugs show a "Pending verification" badge.
- [ ] Selecting a result opens the drug with parsed patient values passed via state/URL.

**Verify:** `npm test` (parser tests) · manual: user story 1 with levetiracetam.
**Dependencies:** T4, T6 · **Files:** `src/lib/neurorx/omnibar.ts`, `src/components/neurorx/tabs/LookupTab.tsx`, `src/components/neurorx/Omnibar.tsx`, `tests/neurorxOmnibar.test.mjs` · **Scope:** M

```text
[NEURORX T7 — DRUG LIST, FILTERS, CLINICAL OMNIBAR]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md (§1 story 1, §7), tasks/neurorx-plan.md (Task 7 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: Tab 1 landing view.
1. src/lib/neurorx/omnibar.ts (pure):
   parseQuery(text) → { terms, weightKg?, crcl?, scr?: { value, unit }, age?, sex? }.
   Accepted tokens: "60kg"/"60 kg"; "crcl 35"/"clcr 35"; "scr 120" (µmol/L by default), "scr 1.4 mg/dl"; "age 70"/"70y"; "male"/"female".
   search(terms, drugs) ranks: exact generic > brand > class > ae_tag. Normalize with src/lib/vietnamese-search.ts. Reverse-AE search uses only ae_tags present in the data.
2. src/components/neurorx/Omnibar.tsx: one input, a results dropdown with ARIA combobox semantics (arrow keys + Enter), showing the parsed patient chips ("60 kg", "CrCl 35") under the input.
3. src/components/neurorx/tabs/LookupTab.tsx:
   - filter pills: All, ⚡ Emergency/ICU, Stroke, Epilepsy, Headache, Neuromuscular, Dementia, Movement. The mapping to Subspecialty values must come from SPEC §5 types; ask if a pill has no matching value.
   - drug list cards: Tall Man name (only from tall-man.json), classes, status badge ("Pending verification" for draft).
   - No dosing numbers in this view.
4. Selecting a drug sets ?drug=<id>&w=60&crcl=35 (only the parsed values) and renders a placeholder detail (filled in T8).
5. tests/neurorxOmnibar.test.mjs: token parsing table plus ranking cases with fixture drugs.
Done = npm test and npm run build green, then the G4 report.
```

### Task 8: Drug detail — Tier 1 and Tier 2 (patient bar and two dose cards)
**Acceptance criteria:**
- [ ] Tier 1: Tall Man name; VN products (or "No data yet"); badges MG safety and NG-tube (rendered only when non-null); black-box banner; patient bar (weight, age, sex, height, SCr µmol/L/mg/dL toggle, CrCl manual override, HD toggle) **empty by default**; computed CrCl shows its formula.
- [ ] Tier 2: "⚡ ACUTE / INPATIENT" and "💊 MAINTENANCE / OUTPATIENT" cards from regimens. States: needs_input / computed / text_only / blocked_draft. The active renal band is highlighted. Infusion line shown only when computed. `[📋 Copy order]` copies `orderText`.
- [ ] Draft or hash-mismatch: name + "Pending verification" only, with no numbers (user story 5).

**Verify:** `npm run build` · manual: user stories 1, 2, 3, 5 with levetiracetam (verified) and a draft copy.
**Dependencies:** T5, T7 · **Files:** `src/components/neurorx/drug/DrugDetail.tsx`, `PatientBar.tsx`, `DoseCard.tsx`, `src/store/useNeuroRxStore.ts` · **Scope:** M

```text
[NEURORX T8 — DRUG DETAIL TIERS 1–2]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G2.2, G2.3, G3), SPEC-neurorx.md (§1 stories 1/2/3/5, §6, §7), tasks/neurorx-plan.md (Task 8 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: the single-drug view, top two tiers. All clinical logic stays in src/lib/neurorx (T4/T5); components only render engine results.
1. src/store/useNeuroRxStore.ts (zustand): patient input shared across tabs, initialised from URL params; no persistence of patient data beyond the session (no localStorage).
2. PatientBar.tsx:
   - fields weight, age, sex, height, SCr with a µmol/L | mg/dL toggle (default µmol/L), CrCl manual override, HD toggle;
   - all fields EMPTY by default;
   - show the derived CrCl with its formula label and which weight was used;
   - show a warning text from resolveRenalFunction when present;
   - show the "Adult dosing only" banner when age < 18.
3. DoseCard.tsx: renders resolveRegimen() output.
   - needs_input → rule text + "Enter weight to calculate".
   - computed → dose, "capped at max" chip if capped, product units line, infusion line (ml, ml/h) only if computed, explanation in a <details>.
   - text_only → dose_text.
   - Renal bands listed with the active one highlighted (icon + text, not color only).
   - [📋 Copy order] button using buildOrderText, with a visual confirmation.
4. DrugDetail.tsx:
   - Tier 1 header: Tall Man name, VN products or "No data yet", MG-safety and NG-tube badges only when non-null, black-box banner when present.
   - Tier 2: two cards (acute/inpatient left, maintenance/outpatient right; stacked < md). If there are multiple regimens per setting, show a regimen selector inside the card.
5. Draft gate: if effectiveStatus ≠ verified render only the name, classes and "Pending verification". Write a small test helper (or use the existing engine tests) proving that no numeric dose string is produced for a draft.
Manual checks to report: stories 1, 2, 3, 5.
Done = npm test and npm run build green, then the G4 report.
```

### Task 9: Drug detail — Tier 3 (tools row, accordions, audit trail, source popover)
**Acceptance criteria:**
- [ ] Tool buttons render only when data exists (placeholders wired for T18–T20).
- [ ] Accordions: 🤰 Pregnancy & Lactation, ⚠️ Neuro clinical notes & Pharmacogenomics, 🧪 PK & Hepatic, 🔗 Ecosystem links. Null sections are hidden or show "No recommendation in sources".
- [ ] Every numeric value has an ⓘ that opens the source popover (title, publisher, year, version, locator, verbatim quote) — user story 6.
- [ ] Audit trail footer: verified_by, verified_at, sources list, effective status.

**Verify:** `npm run build` · manual: story 6 on 5 random values.
**Dependencies:** T8 · **Files:** `DrugAccordions.tsx`, `SourcePopover.tsx`, `AuditTrail.tsx`, `ToolsRow.tsx` · **Scope:** M

```text
[NEURORX T9 — TIER 3: TOOLS ROW, ACCORDIONS, SOURCES, AUDIT TRAIL]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md (§1 story 6, §5, §7), tasks/neurorx-plan.md (Task 9 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: complete the drug view.
1. SourcePopover.tsx: given SourceRef[], show source title, publisher, year, version, locator and the verbatim quote in a blockquote. Accessible (button trigger, Esc closes, focus returns to the trigger). Reuse it everywhere a Sourced value is displayed, including Tier 1/2 from T8 (wire it in).
2. DrugAccordions.tsx (native <details> or an accessible equivalent, collapsed by default):
   - "🤰 Pregnancy & Lactation" (summary only; full board is Tab 3);
   - "⚠️ Neuro clinical notes & Pharmacogenomics" (pgx, black box, ae_tags);
   - "🧪 Pharmacokinetics & Hepatic";
   - "🔗 Ecosystem links" (NeuroGuide / NeuroCase / NeuroVision / NeuroPulse links only if present in data).
   A section whose values are all null is hidden. A partially null section shows "No recommendation in sources" for the missing items.
3. ToolsRow.tsx: buttons [⏱️ Hold / Restart antithrombotic], [🔄 LEDD / NPO], [🖨️ Titration schedule], [❓ Missed dose]. Each renders only if the corresponding data block exists in drug.tools; on click it opens a modal shell with "Coming in T18/T19/T20" (no clinical content).
4. AuditTrail.tsx: effective status badge, verified_by, verified_at, content hash (first 8 chars), list of sources used (deduplicated) with locator counts.
Done = npm test and npm run build green, then the G4 report.
```

### ✅ Checkpoint B (after T4–T9)
- [ ] Stories 1, 2, 3, 5, 6 pass with levetiracetam
- [ ] Both themes, 375 px, keyboard-only navigation OK
- [ ] `grep` shows no clinical numbers in `src/lib/neurorx` or `src/components/neurorx`

---

## Phase 3 — Data Wave 1 (parallel with Phase 4; each batch = new conversation)

Batches: **T10** anticoagulants, antiplatelets, reversal (apixaban, rivaroxaban, dabigatran, edoxaban, warfarin, aspirin, clopidogrel, ticagrelor, idarucizumab, 4F-PCC, vitamin K, protamine) · **T11** thrombolytics, BP control, other (alteplase, tenecteplase, nicardipine, labetalol, nimodipine, atorvastatin) · **T12** acute ASMs (valproate, phenytoin, phenobarbital, lacosamide, midazolam, diazepam; levetiracetam is already done) · **T13** curated interactions for Wave 1 drugs + `tools` data blocks (hold/restart, reversal, missed dose).

```text
[NEURORX T10/T11/T12 — DATA WAVE 1, BATCH <X>: <drug list>]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1 is binding), SPEC-neurorx.md (§5, §12), data/neurorx/EXTRACTION.md, tasks/neurorx-plan.md (Phase 3 only).
Use data/neurorx/drugs/levetiracetam.json (verified) as the format reference.

Goal: create draft records for exactly these drugs: <drug list>.
For each drug:
1. Check data/neurorx/sources/ for its label/SmPC and the relevant guidelines. If a needed source or its .txt is missing, do not create a partial guess: list it under "Missing sources" and skip the fields that depend on it (null).
2. Register any new source in sources.json.
3. Extract per EXTRACTION.md:
   - every non-null value has a verbatim quote;
   - regimens are computable only if the numbers are explicit in the source;
   - acute doses come from the guideline/label that states them, with that source cited;
   - when label and guideline differ, add both regimens with separate refs (indication text names the source);
   - vn_products/bhyt/registration_no stay null (Decision 2).
4. status "draft", verification fields null.
After all drugs: run npm run rx:validate and npm run rx:check-quotes until green. Never edit a quote away from the source text.
Report per drug: fields filled, fields null with reason, conflicts between sources, missing sources. Do not create interactions in this task.
```

```text
[NEURORX T13 — WAVE 1 INTERACTIONS + TOOLS DATA]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1.4, G1.6), SPEC-neurorx.md (§5 Interaction, §12 decision 4), data/neurorx/EXTRACTION.md, tasks/neurorx-plan.md (Phase 3 only).

Goal:
A) Curated interactions among the Wave 1 drugs present in data/neurorx/drugs, plus carbamazepine and lamotrigine pairs ONLY if those records exist.
   - Each pair is extracted from a label/SmPC or guideline statement that names the drug or its exact class.
   - Severity per decision 4 ("avoid concomitant use" ⇒ contraindicated). Record the quote that justifies the severity.
   - alternatives[] only if a source recommends them, or if they are Wave 1 drugs that the same source states lack the interaction; otherwise leave alternatives empty. Every switch_note must be sourced or null.
   - Do not create class-wide pairs by inference.
B) For drugs whose sources contain them, add drug.tools blocks:
   - antithrombotic hold before LP/neurosurgery and post-ICH restart: one entry per source (ASRA vs EHRA vs ICH guideline), never merged;
   - reversal agents for each anticoagulant with dose rules exactly as stated;
   - missed-dose instructions from the label.
   Every entry has refs. Keep all records "draft"; editing a verified record turns it back to draft automatically, so mention which ones I must re-verify.
Run rx:validate and rx:check-quotes until green. Report pairs created, pairs considered but rejected (and why), and records needing re-verification.
```

### ✅ Checkpoint C — Clinical verification (you)
- [ ] Review each Wave 1 record against its sources (suggested pace: 5 drugs/day)
- [ ] `npm run rx:verify -- <id> --by "<Name>"` for each approved record; fix requests go back to the agent as "correct field X per source Y page Z"
- [ ] All Wave 1 records `verified`; `npm test` green

---

## Phase 4 — Interactions, Pregnancy and Novel tabs

### Task 14: DDI engine
**Acceptance criteria:**
- [ ] `interactions.ts`: `analyzeRegimen(ids)` returns curated hits (both orders a-b / b-a), mechanism flags (strong CYP3A4/P-gp inducer × substrate, ≥ 2 serotonergic, ≥ 2 QT-risk, total ACB ≥ 3) labelled "Review suggested — mechanism-based", and MG hits (`may_worsen`/`avoid`). Curated hits suppress duplicate mechanism flags for the same pair.
- [ ] Thresholds and tag values come from the data/vocabulary. The ACB threshold of 3 is stated in the spec; cite its source in the vocabulary file or ask.
- [ ] Tests with fixtures.

**Dependencies:** T1, T5 · **Files:** `interactions.ts`, `tests/neurorxInteractions.test.mjs` · **Scope:** S

```text
[NEURORX T14 — DDI ENGINE]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1.6, G2.1), SPEC-neurorx.md (§5, §6 last bullet), tasks/neurorx-plan.md (Task 14 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: src/lib/neurorx/interactions.ts, a pure function analyzeRegimen(drugIds, data) →
{ curated: Hit[], mechanism: Flag[], mg: MgHit[], draftsExcluded: string[] }.
- Curated: look up both orders of every pair; return severity, mechanism, effect, management, alternatives, refs. Sort by severity.
- Mechanism flags from enzyme_profile only:
  (a) strong inducer of CYP3A4 and/or P-gp + a drug that is a substrate of the same pathway;
  (b) ≥ 2 serotonergic drugs;
  (c) ≥ 2 drugs with QT risk;
  (d) ACB total ≥ 3.
  Each flag lists contributing drugs and the enzyme_profile refs. Severity field absent; label "Review suggested — mechanism-based". If the ACB threshold has no source in data, put it in a config with a TODO and ask me for the source.
- Suppress a mechanism flag when a curated pair already covers the same two drugs.
- MG: list drugs with mg_safety may_worsen/avoid plus refs.
- Drafts: curated pairs involving a draft drug are still shown (they are separate records), but enzyme_profile data from draft drugs is excluded and reported in draftsExcluded.
Tests with fixture drugs; no real data.
Done = npm test and npm run build green, then the G4 report.
```

### Task 15: Tab 2 UI — regimen tags and swap simulation
**Acceptance criteria:**
- [ ] Single tag input (generic/brand), chips with ×, [Clear all]. No sample-prescription rows.
- [ ] Result cards: 🔴 Contraindicated, 🟠 Major, 🟡 Moderate/Minor, 🔵 Review suggested (mechanism), 💪 MG worsening. Each shows Mechanism → Effect → 💡 Management, plus a source popover.
- [ ] `[🔄 Simulate swap → X]` opens a confirmation showing switch_note, then replaces the tag and re-runs the analysis (user story 4). An "Undo" restores the previous list.

**Dependencies:** T14, T9 · **Files:** `InteractionsTab.tsx`, `RegimenTagInput.tsx`, `InteractionCard.tsx` · **Scope:** M

```text
[NEURORX T15 — TAB 2 INTERACTIONS UI]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G3), SPEC-neurorx.md (§1 story 4, §7), tasks/neurorx-plan.md (Task 15 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: Tab 2 using analyzeRegimen from T14 (no logic in components).
1. RegimenTagInput.tsx: one input with autocomplete (reuse the omnibar search), chips "[ Apixaban × ]", [Clear all] on the right, regimen synced to ?rx=a,b,c. Do NOT add sample/quick prescriptions.
2. InteractionCard.tsx:
   - header with icon + text label per category (🔴 Contraindicated / 🟠 Major / 🟡 Moderate·Minor / 🔵 Review suggested — mechanism-based / 💪 May worsen myasthenia);
   - body: Mechanism → Clinical effect → 💡 Management;
   - SourcePopover on each.
3. Simulate swap:
   - buttons "[🔄 Simulate swap: <from> → <to>]" only from curated alternatives;
   - clicking opens a dialog with the alternative's rationale and switch_note (or "No switching guidance in sources"), plus Confirm/Cancel;
   - Confirm replaces the chip and re-analyses; an Undo toast restores the previous list.
   - Wording must never say "safe".
4. Empty state when < 2 drugs; "No curated interaction found in NeuroRx data — this is not proof of safety" when nothing is found.
Manual check: story 4 with the Wave 1 pair you have in data. If carbamazepine is not yet in the data, test with any curated pair and report it.
Done = npm test and npm run build green, then the G4 report.
```

### Task 16: Tab 3 — Pregnancy and Lactation
**Acceptance criteria:**
- [ ] Disease group selector (Epilepsy (ASM), Migraine, MS & NMOSD, Myasthenia, Stroke) driven by subspecialty/class data.
- [ ] Board: 🟢 Preferred, 🟡 Caution, 🔴 Avoid columns (from `reproductive.tier`), each drug showing MCM **per registry** (registry, %, n, dose stratum), plus a 🍼 Lactation column (RID text). Missing data → "No data in sources".
- [ ] Click → detail card with 3 stages: preconception (folic acid, contraception), pregnancy PK/monitoring, postpartum.

**Dependencies:** T9 · **Files:** `PregnancyTab.tsx`, `ReproBoard.tsx`, `ReproDetail.tsx` · **Scope:** M

```text
[NEURORX T16 — TAB 3 PREGNANCY & LACTATION]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1.4, G3), SPEC-neurorx.md (§5 ReproductiveRecord), tasks/neurorx-plan.md (Task 16 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: Tab 3, rendering only data/neurorx reproductive records.
1. Group selector pills: Epilepsy (ASM), Migraine, MS & NMOSD, Myasthenia, Stroke. The membership rule (subspecialty/class) is documented in code; ask me if a group cannot be derived from the data.
2. ReproBoard.tsx:
   - columns 🟢 Preferred / 🟡 Caution / 🔴 Avoid from reproductive.tier, plus 🍼 Lactation;
   - each drug chip lists its MCM entries separately: "<registry>: <percent>% (n=<n>, <dose_stratum>)" with a source popover;
   - never compute an average or pick "the" value;
   - drugs without a tier go in a "Not classified in sources" row;
   - mobile: the columns stack.
3. ReproDetail.tsx (opens on click):
   - three stages: (1) Preconception — folic_acid, contraception; (2) Pregnancy — pregnancy_pk; (3) Postpartum — postpartum;
   - lactation block: lactation_rid, lactation_summary;
   - null → "No recommendation in sources".
4. Draft drugs: show the name + "Pending verification" without numbers.
Done = npm test and npm run build green, then the G4 report.
```

### Task 17: Tab 4 — Novel Therapies
**Acceptance criteria:**
- [ ] Cards rendered from drugs with a `novel` block: approval (agency, date, indication), eligibility, administration schedule, monitoring timeline (e.g. MRI before infusion N **as stated per drug**), prerequisites (vaccination, genotype), ecosystem link buttons (only if URLs exist in data).
- [ ] Data for these drugs is created in Wave 2/3; until then the tab shows "Pending verification" cards or an empty state.

**Dependencies:** T9 · **Files:** `NovelTab.tsx`, `NovelCard.tsx`, `MonitoringTimeline.tsx` · **Scope:** S

```text
[NEURORX T17 — TAB 4 NOVEL THERAPIES]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md (§5 novel, §7), tasks/neurorx-plan.md (Task 17 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: Tab 4 UI only (no clinical data creation).
1. If SPEC §5 NovelTherapyData is underspecified, propose a minimal typed shape:
   { approvals: Sourced<{agency, date, indication}[]>, eligibility: Sourced<string[]>, administration: Sourced<string>,
     monitoring: Sourced<{ timepoint: string; action: string }[]>, prerequisites: Sourced<string[]>, links }.
   STOP and ask me before changing src/types/neurorx.ts.
2. NovelCard.tsx: sections rendered only when non-null; SourcePopover on each; ecosystem buttons ("👁️ NeuroVision", "📄 NeuroPulse", "📖 NeuroGuide") only when the link exists in data.
3. MonitoringTimeline.tsx: vertical timeline of monitoring entries in data order. Each drug has its own timeline; never share or copy a schedule between drugs.
4. Group cards by subspecialty. Show an empty state "Novel therapy records arrive in Data Waves 2–3".
Done = npm test and npm run build green, then the G4 report.
```

### ✅ Checkpoint D (after T14–T17)
- [ ] Story 4 passes · Tab 3 shows per-registry values · Tab 4 empty state OK · both themes, 375 px

---

## Phase 5 — Contextual Tools

### Task 18: Anticoagulation compass (ICH reversal, hold and restart)
```text
[NEURORX T18 — ANTICOAG COMPASS]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1.4, G2), SPEC-neurorx.md, tasks/neurorx-plan.md (Task 18 only), and the drug.tools blocks created in T13.
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: implement the [⏱️ Hold / Restart antithrombotic] modal and an "ICH reversal" panel. Rendering only; all values come from drug.tools.
1. src/lib/neurorx/compass.ts (pure):
   holdPlan(drug, procedure: "lumbar_puncture"|"neurosurgery", renal) → one entry PER SOURCE (e.g. ASRA vs EHRA), each with hours/doses as stated and the renal-dependent row selected by renal value if the source stratifies by CrCl;
   restartPlan(drug) → per-source post-ICH restart statements;
   reversal(drug) → agents with dose rules; per-kg agents are computed through resolveRegimen-style logic (reuse dosing.ts).
2. HoldRestartModal.tsx:
   - procedure selector; side-by-side (stacked on mobile) source columns labelled by source title;
   - a timeline visual (last dose → procedure → restart) per source;
   - a note when sources disagree: "Sources differ — choose per local protocol".
3. ReversalPanel.tsx: in the drug detail of anticoagulants; lists agents, computed doses (only with weight entered), source popovers. A "VN availability" field renders only if present in data; otherwise nothing is shown.
4. Tests for compass.ts with fixtures.
Done = npm test and npm run build green, then the G4 report.
```
**Files:** `compass.ts`, `HoldRestartModal.tsx`, `ReversalPanel.tsx`, `tests/neurorxCompass.test.mjs` · **Dependencies:** T13, T9 · **Scope:** M

### Task 19: Levodopa LEDD and NPO conversion
```text
[NEURORX T19 — LEDD & NPO CONVERSION]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1, G2.1), SPEC-neurorx.md, tasks/neurorx-plan.md (Task 19 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Precondition: a LEDD conversion source (e.g. the LEDD review paper you choose) must be in data/neurorx/sources/ with .txt. If it is missing, STOP and ask me. Conversion factors are DATA:
- create data/neurorx/ledd-factors.json: { drug_id, factor, unit, conditions?, refs };
- add an NPO conversion block { from, to, rule_text, computable?: {...}, refs } only from the source;
- every factor gets a verbatim quote; rx:check-quotes must cover this file (extend validate/check-quotes minimally).
Then:
1. src/lib/neurorx/ledd.ts: totalLEDD(regimenItems, factors) where items = { drug_id, dose_mg, times_per_day }; modifier rules (e.g. COMT inhibitor) only if a factor entry encodes them. Return per-item contributions plus the total.
2. LeddModal.tsx (opened from the ToolsRow [🔄 LEDD / NPO] on Parkinson drugs):
   - add-medication rows; total LEDD;
   - an NPO section showing the sourced conversion option(s) with rule_text and, if computable, the computed equivalent;
   - disclaimer;
   - all factors shown with source popovers.
3. Tests with fixture factors (fake numbers).
Done = npm test, npm run rx:validate and npm run build green, then the G4 report.
```
**Files:** `data/neurorx/ledd-factors.json`, `ledd.ts`, `LeddModal.tsx`, `scripts/neurorx/validate.ts`, `tests/neurorxLedd.test.mjs` · **Dependencies:** T9 (+ Wave 3 for real Parkinson drugs; fixtures until then) · **Scope:** M

### Task 20: Patient outputs (titration schedule, missed dose)
```text
[NEURORX T20 — TITRATION SCHEDULE PRINT & MISSED-DOSE INSTRUCTIONS]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1, G3.5), SPEC-neurorx.md (§12 decision 1: English), tasks/neurorx-plan.md (Task 20 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: patient-facing outputs, in English, generated only from drug.tools data.
1. Data shape (ask before changing types if not yet in §5):
   tools.titration: { schedules: { id, label, condition_text, steps: { week_from, week_to, dose_text, dose_mg_per_day? }[], refs }[] }
   tools.missed_dose: Sourced<string>; tools.vomiting: Sourced<string>.
   Multiple schedules (e.g. with/without an interacting comedication) are separate entries; the clinician must pick one, never a default.
2. src/lib/neurorx/schedule.ts: buildSchedule(schedule, startDate, productStrengths?) → dated weekly rows, plus tablet counts only when a product strength exists in data.
3. TitrationModal.tsx: schedule picker (no preselection), start date, preview table, [🖨️ Print] with a print stylesheet (A4, large font, no app chrome), footer with drug name, source short title and the disclaimer. No patient name field.
4. MissedDoseModal.tsx: shows the sourced text plus [📋 Copy message], disclaimer included.
5. Tests for schedule.ts (date math, week ranges, no schedule ⇒ null).
Done = npm test and npm run build green, then the G4 report.
```
**Files:** `schedule.ts`, `TitrationModal.tsx`, `MissedDoseModal.tsx`, `src/types/neurorx.ts`, `tests/neurorxSchedule.test.mjs` · **Dependencies:** T9 · **Scope:** M

### ✅ Checkpoint E
- [ ] Compass shows per-source columns for each Wave 1 DOAC · print preview clean · missed-dose copy includes disclaimer

---

## Phase 6 — System: Offline, Update Watch, Admin, In-app Extractor

### Task 21: Offline PWA
```text
[NEURORX T21 — OFFLINE PWA]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G2.4, G2.5), SPEC-neurorx.md (§1 story 7), tasks/neurorx-plan.md (Task 21 only).
Then read node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md and 01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md fully, and follow them (this Next.js version differs from older guides).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: NeuroRx works fully offline after first load, without new dependencies.
1. Manifest scoped to /neurorx (name "NeuroRx", start_url "/neurorx", theme colors from G3.1). Icons: reuse existing assets in public/ or ask me.
2. A service worker (public/neurorx-sw.js) with scope /neurorx:
   - precache the app shell and the static data bundle;
   - cache-first for data with a version key derived from a build-time data hash;
   - network-first for HTML with an offline fallback.
   It must not intercept other apps' routes (/, /neurocase, /neuroguide, /neurovision, /admin, /api).
3. Register it only on /neurorx pages.
4. OfflineStatus.tsx in the footer: "⚡ Offline-ready • data v<hash8> cached" / "Caching…" / "Online only", based on real cache state (not hard-coded).
5. On a data version change, show "New verified data available — Reload" (no silent swap mid-use).
Manual test to report: build + start, load /neurorx, disable network in DevTools, reload, open a drug and compute a dose.
Done = npm test and npm run build green, then the G4 report.
```
**Files:** `src/app/neurorx/manifest.ts` (or per docs), `public/neurorx-sw.js`, `src/components/neurorx/OfflineStatus.tsx`, `src/app/neurorx/layout.tsx` · **Dependencies:** T6 · **Scope:** M

### Task 22: Label watch GitHub Action
```text
[NEURORX T22 — LABEL WATCH (OpenFDA / DailyMed)]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md, tasks/neurorx-plan.md (Task 22 only), and .github/workflows/guide_daily.yml + pulse_daily.yml as style references.
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: a weekly job that detects label changes and proposes them for human review. It never edits drug records.
1. scripts/neurorx/watch-labels.ts:
   - for each source of type fda_label with a set_id/version in sources.json, query the public DailyMed or openFDA endpoint for the current SPL version (read their public docs; no API key unless documented as optional);
   - if the version differs, append an item to data/neurorx/updates_queue.json:
     { id, source_id, drug_ids, old_version, new_version, detected_at, url, sections_changed? (only if the API provides it), status: "pending" };
   - no LLM, no auto-edit of drug JSON; idempotent (no duplicate items).
2. .github/workflows/neurorx_label_watch.yml: weekly cron plus workflow_dispatch; runs the script; if the queue changed, creates a branch and opens a Pull Request (use the GitHub CLI available on runners with GITHUB_TOKEN; permissions contents: write and pull-requests: write). Never push to main directly.
3. Tests for the diff/idempotency logic with mocked responses (no network in tests).
Done = npm test and npm run build green, then the G4 report including how I trigger it manually.
```
**Files:** `scripts/neurorx/watch-labels.ts`, `.github/workflows/neurorx_label_watch.yml`, `data/neurorx/updates_queue.json`, `tests/neurorxWatch.test.mjs` · **Dependencies:** T2 · **Scope:** M

### Task 23: NeuroRx section in existing `/admin`
```text
[NEURORX T23 — ADMIN SECTION IN /admin]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G2.5), SPEC-neurorx.md (§12 decision 5), tasks/neurorx-plan.md (Task 23 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: add a "NeuroRx" section to src/app/admin/page.tsx with minimal edits.
1. In admin/page.tsx only: extend the adminTab union with "neurorx", add the tab button, and render <NeuroRxAdminSection darkMode={darkMode} /> when it is active. No other changes to that file.
2. src/components/neurorx/admin/NeuroRxAdminSection.tsx (read-only):
   (a) Data health: counts by effective status (verified / draft / hash-mismatch), drugs with missing sources, last rx:validate result if available at build time;
   (b) Update queue: items from updates_queue.json as cards with old vs new version, affected drugs, link to the source and a "Review in GitHub PR" link; status chips;
   (c) Draft list: each draft with the exact command to verify after review: npm run rx:verify -- <id> --by "<Name>";
   (d) Export: download the current data bundle as JSON (backup).
   No in-browser editing or approving (approval = merging the PR, per decision).
3. Reuse the existing admin passcode gate; no new auth.
Done = npm test and npm run build green, then the G4 report.
```
**Files:** `src/app/admin/page.tsx`, `src/components/neurorx/admin/NeuroRxAdminSection.tsx`, `UpdateQueueList.tsx`, `DataHealth.tsx` · **Dependencies:** T22 · **Scope:** M

### Task 24: In-app Gemini extractor (admin/dev only)
```text
[NEURORX T24 — IN-APP SOURCE-BOUND EXTRACTOR]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md (G1 entirely), SPEC-neurorx.md, data/neurorx/EXTRACTION.md, tasks/neurorx-plan.md (Task 24 only).
Study src/app/api/neuroguide/ai-extract-guideline/ and src/app/api/neuroguide/parse-document/ to reuse the existing Gemini client and document parsing. Read node_modules/next/dist/docs/ for Route Handlers in this version.
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: an admin-only tool that turns an uploaded source document into a DRAFT drug JSON for download. It never writes to the repo and never marks anything verified.
1. POST /api/neurorx/extract:
   - admin token required (same mechanism as the other admin APIs);
   - input: file + target drug_id + source metadata;
   - parse text with the existing parser;
   - prompt Gemini with EXTRACTION.md rules: JSON output only, verbatim quotes required, null when absent;
   - then SERVER-SIDE run the same normalizeForQuote substring check against the parsed text; any value whose quote is not found is set to null and listed in "rejected_values";
   - run validateDrug;
   - return { draft, rejected_values, validation_errors, source_text } (source_text so it can be saved as sources/<id>.txt).
2. Admin UI: an "Extractor" sub-tab inside NeuroRxAdminSection: upload, show the draft with a red list of rejected values, download draft.json and source.txt. A banner explains: "Commit both files via the repo; then review and run rx:verify."
3. Tests for the quote-rejection step with a mocked model response containing one fabricated quote, which must be nulled.
Done = npm test and npm run build green, then the G4 report.
```
**Files:** `src/app/api/neurorx/extract/route.ts`, `src/lib/neurorx/extractGuard.ts`, `src/components/neurorx/admin/ExtractorPanel.tsx`, `tests/neurorxExtractGuard.test.mjs` · **Dependencies:** T23 · **Scope:** M

### ✅ Checkpoint F
- [ ] Offline reload works (story 7) · label-watch manual dispatch opens a PR · admin section shows queue and drafts · extractor nulls fabricated quotes

---

## Phase 7 — Waves 2–4 and Release

**T25 / T26 / T27:** reuse the Phase 3 batch prompt with the drug lists from SPEC §10 (Wave 2, 3, 4; split each wave into batches of ≤ 8 drugs). After each wave, reuse the T13 prompt for that wave's interactions and tools data (including `novel`, `titration`, `ledd`), then do your clinical verification (Checkpoint C procedure). You can also use the T24 extractor to speed up drafting; the same rules apply.

### Task 28: Hardening and release
```text
[NEURORX T28 — HARDENING & RELEASE CHECK]
You are working on NeuroRx in d:\NeuroPulse. Before anything else read, in order:
NEURORX-GUARDRAILS.md, SPEC-neurorx.md (§8, §11), tasks/neurorx-plan.md (Task 28 only).
The guardrails are binding. If anything conflicts with them or the spec, stop and ask me.

Goal: verify the success criteria; fix only what fails, as small separate changes.
1. Add scripts/neurorx/check-no-clinical-constants.ts: flags numeric literals in src/lib/neurorx and src/components/neurorx except an allowlist (88.4, 0.85, 72, 140, Mosteller constants, 1.73, UI sizes in className strings, 0/1/100). Add it to npm test.
2. Run and report: npm test, rx:validate, rx:check-quotes, build.
3. Accessibility pass on all 4 tabs and modals: keyboard only, focus visibility, aria labels, contrast in both themes (list issues, fix the trivial ones, ask about the rest).
4. Walk through user stories 1–7 and report pass/fail with steps.
5. Lighthouse (PWA installable, accessibility ≥ 90) if available locally; otherwise list the manual checks done.
6. Update README.md with a short NeuroRx section: data workflow, commands, verification procedure.
Do not change clinical data in this task.
```
**Dependencies:** all · **Scope:** M

### ✅ Checkpoint G — v1 Done
- [ ] All SPEC §11 success criteria met · Wave 1 verified · Waves 2–4 drafted with 100% quote pass (verified as you review)

---

## Parallelization
- **Safe in parallel:** Phase 3 data batches ∥ Phase 4 UI; T16 ∥ T17; T19 ∥ T20; T21 ∥ T22.
- **Sequential:** T1→T2→T3; T4→T5; T6→T7→T8→T9; T14→T15; T22→T23→T24.
- **Shared contract:** `src/types/neurorx.ts`. Any change must be asked first and done in one task before dependants run.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Agent writes clinical values from memory | High | G1 rules + `rx:check-quotes` (substring proof) + extractor null-on-miss + human `rx:verify` |
| Sources disagree (ASRA vs EHRA, registries) | High | Per-source entries, never merged; UI shows "Sources differ" |
| Verified record edited silently | High | `content_hash` → auto-draft at runtime + CI failure |
| PDF text extraction garbles tables, so quote check fails | Medium | Manual .txt correction allowed **only** to match the PDF verbatim; locator includes page |
| Verification bottleneck (60–100 drugs) | Medium | Waves; 5 drugs/day pace; drafts hidden from dosing |
| Next.js 16 API differences | Medium | Docs-first rule in every route/PWA prompt |
| Service worker breaks other apps | Medium | Scope `/neurorx` only; explicit exclusion test in T21 |
| Contract change mid-build | Medium | Types are "ask first"; single task to change, then rerun validate |

## Open Questions
None blocking. Decisions recorded in SPEC §12.
