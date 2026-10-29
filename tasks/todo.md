# Task List: NeuroGuide & Conference Intelligence Hub Overhaul

## Task 1: Standardize Subspecialties and Enhance NeuroGuide Types
**Description:** Refactor `src/types/neuroguide.ts` to import `SUBSPECIALTY_LIST` from `@/constants/subspecialties`, ensuring total ecosystem alignment. Enhance `ClinicalScenario`, `TemporalShift`, `PracticeChangeDetail`, and `ConferenceDetail` with PICO attributes and foreign keys.

**Acceptance criteria:**
- [ ] `src/types/neuroguide.ts` imports and re-exports subspecialties from `@/constants/subspecialties`.
- [ ] `ClinicalScenario` schema includes `aiSynthesisAppraisal` with `consensusLevel`, `whyTheyDiffer`, and `clinicalBottomLine`.
- [ ] `ConferenceDetail` includes structured PICO trial fields (`populationSummary`, `interventionGroup`, `controlGroup`, `primaryOutcome`, `safetyOutcome`, `impactedScenarioId`).
- [ ] `TemporalShift` type supports `previousYear`, `previousGrade`, `currentYear`, `currentGrade`, and `drivingTrials`.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --test tests/clinicalClassification.test.mjs tests/neurocaseApi.test.mjs`
- [ ] Typecheck succeeds: `node ./node_modules/typescript/bin/tsc --noEmit`

**Dependencies:** None  
**Files likely touched:** `src/types/neuroguide.ts`  
**Estimated scope:** Small (1 file)

---

## Task 2: Enrich Mock Datasets with PICO Trials, Temporal Shifts & Impact Links
**Description:** Expand `src/data/neuroguideMockData.ts` with complete clinical content covering core neurological scenarios (Tenecteplase, Large Core ASPECTS 3-5, Basilar Artery Occlusion, ICH Blood Pressure, DAPT, Status Epilepticus, Autoimmune Encephalitis, ARIA in Amyloid mAb) and wire `impactedScenarioId` across conferences.

**Acceptance criteria:**
- [ ] At least 8 core scenarios have complete AHA, ESO, and VN recommendation atoms with 5-tier normalized levels.
- [ ] Conference events (ISC, ESOC, WSC, AAN) have structured late-breaking trials with PICO stats and `impactedScenarioId`.
- [ ] Temporal shift records exist for major guideline changes (e.g. TNK 4.5h, Large Core EVT).

**Verification:**
- [ ] Typecheck succeeds: `node ./node_modules/typescript/bin/tsc --noEmit`
- [ ] Build succeeds: `node ./node_modules/next/dist/bin/next build`

**Dependencies:** Task 1  
**Files likely touched:** `src/data/neuroguideMockData.ts`  
**Estimated scope:** Medium (1 file)

---

## Checkpoint 1: Foundations
- [ ] All tests pass
- [ ] Static typecheck clean with `strict: true`

---

## Task 3: Build 30/70 Master-Detail Layout with Subspecialty Filter Chips
**Description:** Build the two-column master-detail clinical layout in `src/app/neuroguide/page.tsx` featuring quick search, 11 subspecialty filter chips, dynamic scenario badges (`Class I`, `Practice-Changing`, `New Conf Evidence`), and responsive mobile drawer.

**Acceptance criteria:**
- [ ] Left column (30% on desktop) displays searchable scenario list with subspecialty chips from `@/constants/subspecialties`.
- [ ] Selecting a scenario highlights it and immediately updates the active scenario in the right workspace.
- [ ] Mobile view collapses smoothly into horizontal swipeable chips or drawer without horizontal layout breakage.

**Verification:**
- [ ] Typecheck: `node ./node_modules/typescript/bin/tsc --noEmit`
- [ ] Build: `node ./node_modules/next/dist/bin/next build`

**Dependencies:** Task 2  
**Files likely touched:** `src/app/neuroguide/page.tsx`, `src/components/neuroguide/ScenarioExplorer.tsx`  
**Estimated scope:** Medium (2 files)

---

## Task 4: Build Tab 1: Cross-Society Matrix (AHA/ASA vs. ESO vs. VN/MOH)
**Description:** Implement the 3-column international comparative matrix component displaying original grades, 5-tier color badges (Emerald, Blue, Amber, Purple, Rose), 2-sentence recommendation summaries, and specific clinical eligibility criteria.

**Acceptance criteria:**
- [ ] Renders 3 columns side-by-side on desktop: AHA/ASA (US), ESO (Europe), and Vietnam (BYT).
- [ ] Uses normalized 5-tier color badges with clear legend.
- [ ] Displays specific patient eligibility conditions and clinical context.

**Verification:**
- [ ] Build succeeds: `node ./node_modules/next/dist/bin/next build`

**Dependencies:** Task 3  
**Files likely touched:** `src/components/neuroguide/CrossSocietyMatrix.tsx`  
**Estimated scope:** Small (1 file)

---

## Task 5: Implement AI Clinical Appraisal & On-Call Bottom-Line Box
**Description:** Create the clinical synthesis card featuring Concordance Level badge (High Concordance / Moderate Variation / Major Divergence), rationale for guideline differences (publication lag, evidence weighting), and the highlighted on-call bottom-line for duty doctors.

**Acceptance criteria:**
- [ ] Displays Concordance Level badge with appropriate status coloring.
- [ ] Clearly articulates why recommendations differ between societies.
- [ ] Features a distinct "On-Call Clinical Bottom-Line" card with acute dosage and caveats.

**Verification:**
- [ ] Typecheck: `node ./node_modules/typescript/bin/tsc --noEmit`

**Dependencies:** Task 4  
**Files likely touched:** `src/components/neuroguide/ClinicalAppraisalBox.tsx`  
**Estimated scope:** Small (1 file)

---

## Checkpoint 2: Core Matrix & Appraisal
- [ ] Doctor can select any scenario and see the 3-column international comparison and AI appraisal.
- [ ] Application builds without errors.

---

## Task 6: Build Tab 2: Temporal Diff (Historical Evolution & Grade Shifts)
**Description:** Implement the timeline view comparing older recommendations (e.g. AHA 2019 Class IIb) with newer updates (ESO 2024 / AHA Update Class I) alongside driving landmark trials badges.

**Acceptance criteria:**
- [ ] Visual timeline clearly contrasting previous vs. current grade and wording.
- [ ] Displays driving trials pills (e.g., SELECT2, ANGEL-ASPECT, TENSION).
- [ ] Shows change type badge (NEW, UPGRADED, DOWNGRADED, REVISED).

**Verification:**
- [ ] Build: `node ./node_modules/next/dist/bin/next build`

**Dependencies:** Task 5  
**Files likely touched:** `src/components/neuroguide/TemporalDiffView.tsx`  
**Estimated scope:** Small (1 file)

---

## Task 7: Build Tab 3: Landmark Trials & Conf Evidence View
**Description:** Implement trial summary cards inside each scenario detailing Sample Size (N), Primary Outcome (mRS 0-2), Safety (sICH), and Positive/Neutral outcome pills.

**Acceptance criteria:**
- [ ] Renders structured cards for landmark trials associated with the scenario (e.g. AcT, TRACE-2, TIMELESS).
- [ ] Displays Sample Size (N), primary efficacy percentage, safety bleeding rate, and p-value.
- [ ] Includes link to original full text / PubMed if available.

**Verification:**
- [ ] Typecheck: `node ./node_modules/typescript/bin/tsc --noEmit`

**Dependencies:** Task 6  
**Files likely touched:** `src/components/neuroguide/TrialEvidenceView.tsx`  
**Estimated scope:** Small (1 file)

---

## Checkpoint 3: Temporal & Evidence Tabs
- [ ] Doctor can toggle between Matrix, Temporal Diff, and Trial Evidence seamlessly.
- [ ] Tests and build clean.

---

## Task 8: Upgrade Conference Hub with PICO Trial Snapshots & Verdict Badges
**Description:** Redesign the Conference View with executive summaries, metrics bar, and structured PICO trial cards (Population, Intervention vs Control, Primary Endpoint, Safety Endpoint, Clinical Takeaway).

**Acceptance criteria:**
- [ ] Conference cards show metrics (Total Late-Breaking Trials, Positive count, Practice-Changing count).
- [ ] Trial snapshots display PICO breakdown and Positive/Neutral verdict badges.
- [ ] Filter by Subspecialty and Verdict.

**Verification:**
- [ ] Build: `node ./node_modules/next/dist/bin/next build`

**Dependencies:** Task 7  
**Files likely touched:** `src/components/neuroguide/ConferenceHub.tsx`  
**Estimated scope:** Medium (1 file)

---

## Task 9: Implement 1-Click Guideline Impact Bridge (Conf ➔ Scenario Navigation)
**Description:** Add the "Impact on Current Guidelines" action box on each trial card with a one-click button: `[Open Scenario in Comparison Matrix ➔]` that scrolls and selects the linked scenario.

**Acceptance criteria:**
- [ ] Each relevant late-breaking trial card has a highlighted "Guideline Impact" box.
- [ ] Clicking `[Open Scenario in Comparison Matrix ➔]` switches to the Matrix tab and automatically selects and focuses that scenario.

**Verification:**
- [ ] Manual test of 1-click bridge navigation.
- [ ] Build: `node ./node_modules/next/dist/bin/next build`

**Dependencies:** Task 8  
**Files likely touched:** `src/app/neuroguide/page.tsx`, `src/components/neuroguide/ConferenceHub.tsx`  
**Estimated scope:** Small (2 files)

---

## Checkpoint 4: Conference & Bi-directional Bridge
- [ ] Clicking a trial's impact button navigates directly to the corresponding scenario in the Matrix view.

---

## Task 10: Integrate Ecosystem Action Bar (NeuroRx, NeuroCalc, NeuroPulse)
**Description:** Add interactive deep-link action pills in the scenario header (e.g., `[Open NeuroRx: TNK Dosing]`, `[Open NeuroCalc: NIHSS Scale]`, `[View Related Articles on NeuroPulse]`).

**Acceptance criteria:**
- [ ] Header of active scenario includes dedicated Ecosystem Action Bar.
- [ ] Action pills route to appropriate modules or trigger calculators with relevant context.

**Verification:**
- [ ] Build: `node ./node_modules/next/dist/bin/next build`

**Dependencies:** Task 9  
**Files likely touched:** `src/components/neuroguide/EcosystemActionBar.tsx`  
**Estimated scope:** Small (1 file)

---

## Task 11: Emergency-Room Mobile Ergonomics & Visual Polish
**Description:** Optimize for on-call smartphones: horizontal swipeable scenario chips, responsive vertical matrix stacking, and smooth tab switching.

**Acceptance criteria:**
- [ ] Emergency room smartphone testing shows no horizontal overflow.
- [ ] Matrix stacks cleanly as collapsible or swipeable cards on mobile viewports (<640px).
- [ ] Fast, zero-lag tab transitions.

**Verification:**
- [ ] `node ./node_modules/typescript/bin/tsc --noEmit` passes with 0 errors.
- [ ] `node --experimental-strip-types --test tests/clinicalClassification.test.mjs tests/neurocaseApi.test.mjs` passes 15/15 tests.
- [ ] `node ./node_modules/next/dist/bin/next build` compiles clean.

**Dependencies:** Task 10  
**Files likely touched:** `src/app/neuroguide/page.tsx`  
**Estimated scope:** Small (1 file)

---

## Final Checkpoint: Full Verification
- [ ] `tsc --noEmit` passes with 0 errors (`strict: true`).
- [ ] `npm test` passes all test suites.
- [ ] `next build` compiles in <1s.
- [ ] Complete alignment with `NeuroGuide&Conf _ 2.docx`.
