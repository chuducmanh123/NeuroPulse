# Implementation Plan: NeuroGuide & Conference Intelligence Hub Overhaul

## Overview
Based on a thorough gap analysis between the architecture blueprint in `NeuroGuide&Conf _ 2.docx`, the active live site (`https://neuro-pulse-lime.vercel.app/neuroguide`), and the local codebase, this plan overhauls **NeuroGuide** into a cohesive **Clinical Practice Guidelines & Conference Intelligence Hub**. 

The redesign eliminates the fragmented 3-tab experience by unifying it into:
1. **Live Intelligence Header**: Breaking Guidelines & Live Conferences Stream.
2. **Master-Detail Clinical Scenario Explorer (30/70 Layout)**: Instant search, 11 subspecialty filter chips, dynamic state badges.
3. **Deep Comparative Workspace**:
   - **Tab 1: Cross-Society Matrix** (AHA/ASA vs. ESO vs. VN/MOH with 5-tier normalized color coding).
   - **Tab 2: Temporal Diff** (Historical timeline comparing old vs. new versions, grade changes, and driving trials).
   - **Tab 3: Late-Breaking Conf & Landmark Trials** (Structured PICO trials, mRS 0-2, sICH, positive/neutral verdict).
   - **AI Clinical Appraisal Box**: Concordance level, reasoning for guideline divergence, and an on-call practice bottom-line.
   - **Ecosystem Action Bar**: Interactive deep links to NeuroRx (dose calculation), NeuroCalc (clinical scales), and NeuroPulse.
4. **Conference Intelligence Dashboard**: Structured PICO trial cards and the "Guideline Impact & Action Bridge" navigating to the affected scenario in 1 click.
5. **Responsive Mobile Ergonomics**: Emergency-room optimized view with swipeable scenario cards and vertical matrix stacks.

---

## Architecture & Data Model Decisions

### Decision 1: Relational Entity Normalization (Zero Data Duplication)
Maintain the clean 3-entity model specified in `NeuroGuide&Conf _ 2`:
- `ClinicalScenario`: The clinical anchor (e.g. `ais-ivt-tenecteplase-4.5h`, `ais-large-core-evt-aspects-3-5`). Holds AI appraisal, concordance, and ecosystem links.
- `GuidelineDoc`: The published document metadata (Title, Society, Year, Link, `allPracticeChanges`).
- `RecommendationAtom`: The atomic recommendation connecting a scenario to a guideline with a normalized 5-tier level (`1: Strong FOR`, `2: Moderate`, `3: Weak/Optional`, `4: Consensus`, `5: Against/Harm`).
- `ConferenceDetail` / `ConferenceEvent`: Conference intelligence with structured `lateBreakingTrials` containing PICO data and foreign key `impactedScenarioId`.

### Decision 2: Single Source of Truth for Subspecialties
Replace fragmented local subspecialty types in `neuroguide` with `@/constants/subspecialties` (`SUBSPECIALTY_TABS` and `SUBSPECIALTY_LIST`), ensuring 100% ecosystem-wide consistency across NeuroPulse, NeuroCase, NeuroGuide, and Admin.

### Decision 3: Vertical Slicing for Implementation
Instead of massive all-at-once rewrites, deliver five focused vertical slices:
- Phase 1: Data Schema & Seed Expansion (Types, Subspecialty alignment, Mock Data wiring).
- Phase 2: Master-Detail Clinical Scenario Workspace (30/70 layout, 3-column AHA vs ESO vs VN matrix, 5-tier color badges).
- Phase 3: Temporal Diff (Tab 2) & Landmark Trials Evidence Bridge (Tab 3).
- Phase 4: Conference Intelligence Hub & Guideline Impact Bridge (PICO cards, 1-click jump to scenario).
- Phase 5: Ecosystem Deep Links, Mobile Ergonomics & Quality Verification.

---

## Task List

### Phase 1: Data Foundations & Subspecialty Alignment
- [ ] **Task 1: Standardize Subspecialties and Enhance NeuroGuide Types**
  - **Description**: Update `src/types/neuroguide.ts` to import `SUBSPECIALTY_LIST` from `@/constants/subspecialties`, refine `ClinicalScenario`, `TemporalShift`, `PracticeChangeDetail`, and PICO trial structures in `ConferenceDetail`.
  - **Files**: `src/types/neuroguide.ts`
  - **Scope**: Small (1 file)

- [ ] **Task 2: Enrich Mock Datasets with PICO Trials, Temporal Shifts & Impact Links**
  - **Description**: Populate `src/data/neuroguideMockData.ts` with complete driving trials for core scenarios (Tenecteplase, Large Core ASPECTS 3-5, Basilar Artery Occlusion, ICH Blood Pressure, DAPT in minor stroke, Status Epilepticus, Autoimmune Encephalitis, ARIA in Amyloid mAb) and wire `impactedScenarioId` across conferences (ESOC, ISC, WSC, AAN).
  - **Files**: `src/data/neuroguideMockData.ts`
  - **Scope**: Medium (1 file)

### Checkpoint 1: Foundations
- [ ] TypeScript strict mode passes (`tsc --noEmit`)
- [ ] Automated tests pass (`npm test`)

---

### Phase 2: Master-Detail Clinical Scenario Workspace
- [ ] **Task 3: Build 30/70 Master-Detail Layout with Subspecialty Filter Chips**
  - **Description**: Build the two-column clinical layout in `src/app/neuroguide/page.tsx` featuring search, 11 subspecialty chips, scenario badges (`Class I`, `Practice-Changing`, `New Conf Evidence`), and mobile collapsible drawer.
  - **Files**: `src/app/neuroguide/page.tsx`, `src/components/neuroguide/ScenarioExplorer.tsx`
  - **Scope**: Medium (2 files)

- [ ] **Task 4: Build Tab 1: Cross-Society Matrix (AHA/ASA vs. ESO vs. VN/MOH)**
  - **Description**: Implement the 3-column comparative matrix displaying original grades, 5-tier normalized badges, 2-sentence recommendation summaries, and specific clinical eligibility criteria.
  - **Files**: `src/components/neuroguide/CrossSocietyMatrix.tsx`
  - **Scope**: Small (1 file)

- [ ] **Task 5: Implement AI Clinical Appraisal & On-Call Bottom-Line Box**
  - **Description**: Create the bottom verdict card featuring Concordance Level pill (High / Moderate / Divergent), rationale for guideline variations, and the highlighted on-call bottom-line.
  - **Files**: `src/components/neuroguide/ClinicalAppraisalBox.tsx`
  - **Scope**: Small (1 file)

### Checkpoint 2: Core Matrix & Appraisal
- [ ] Doctor can select any scenario and see the 3-column international comparison and AI appraisal.
- [ ] Builds without warnings.

---

### Phase 3: Temporal Evolution & Landmark Trials Evidence Bridge
- [ ] **Task 6: Build Tab 2: Temporal Diff (Historical Evolution & Grade Shifts)**
  - **Description**: Implement the timeline view comparing older recommendations (e.g. AHA 2019 Class IIb) with newer updates (ESO 2024 / AHA Update Class I) with driving landmark trials badges.
  - **Files**: `src/components/neuroguide/TemporalDiffView.tsx`
  - **Scope**: Small (1 file)

- [ ] **Task 7: Build Tab 3: Landmark Trials & Conf Evidence View**
  - **Description**: Implement trial summary cards inside each scenario detailing Sample Size (N), Primary Outcome (mRS 0-2), Safety (sICH), and Positive/Neutral outcome pills.
  - **Files**: `src/components/neuroguide/TrialEvidenceView.tsx`
  - **Scope**: Small (1 file)

### Checkpoint 3: Temporal & Evidence Tabs
- [ ] Doctor can toggle between Matrix, Temporal Diff, and Trial Evidence seamlessly.
- [ ] Tests and build clean.

---

### Phase 4: Conference Intelligence Hub & Guideline Impact Bridge
- [ ] **Task 8: Upgrade Conference Hub with PICO Trial Snapshots & Verdict Badges**
  - **Description**: Redesign the Conference View with executive summaries, metrics bar, and structured PICO trial cards (Population, Intervention vs Control, Primary Endpoint, Safety Endpoint, Clinical Takeaway).
  - **Files**: `src/components/neuroguide/ConferenceHub.tsx`
  - **Scope**: Medium (1 file)

- [ ] **Task 9: Implement 1-Click Guideline Impact Bridge (Conf ➔ Scenario Navigation)**
  - **Description**: Add the "Impact on Current Guidelines" action box on each trial card with a one-click button: `[Open Scenario in Comparison Matrix ➔]` that scrolls and selects the linked scenario.
  - **Files**: `src/app/neuroguide/page.tsx`, `src/components/neuroguide/ConferenceHub.tsx`
  - **Scope**: Small (2 files)

### Checkpoint 4: Conference & Bi-directional Bridge
- [ ] Clicking a trial's impact button navigates directly to the corresponding scenario in the Matrix view.

---

### Phase 5: Ecosystem Deep-Links, Mobile Optimization & Polish
- [ ] **Task 10: Integrate Ecosystem Action Bar (NeuroRx, NeuroCalc, NeuroPulse)**
  - **Description**: Add interactive deep-link action pills in the scenario header (e.g., `[Open NeuroRx: TNK Dosing]`, `[Open NeuroCalc: NIHSS Scale]`, `[View Related Articles on NeuroPulse]`).
  - **Files**: `src/components/neuroguide/EcosystemActionBar.tsx`
  - **Scope**: Small (1 file)

- [ ] **Task 11: Emergency-Room Mobile Ergonomics & Visual Polish**
  - **Description**: Optimize for on-call smartphones: horizontal swipeable scenario chips, responsive vertical matrix stacking, and smooth tab switching.
  - **Files**: `src/app/neuroguide/page.tsx`
  - **Scope**: Small (1 file)

### Final Checkpoint: Full Verification
- [ ] `tsc --noEmit` passes with 0 errors (`strict: true`).
- [ ] `npm test` passes all test suites.
- [ ] `next build` compiles in <1s.
- [ ] Verified on desktop and mobile viewports.
