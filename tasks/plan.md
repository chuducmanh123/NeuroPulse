# Technical Plan: Clinical Navigator V3.0 Filter Taxonomy, 30-Case Verification & Right-Pane Search

> **Ground-Truth Spec:** [`SPEC-clinical-navigator.md`](file:///d:/NeuroPulse/SPEC-clinical-navigator.md) & [`CAPABILITY-MAP-clinical-navigator.md`](file:///d:/NeuroPulse/CAPABILITY-MAP-clinical-navigator.md)

## 1. Architecture Overview

1. **V3.0 Dual-Primary Axis Filter Taxonomy (`src/data/clinicalNavigatorTaxonomyV3.ts`)**:
   - **Axis 1 (Disease Context)**: 10 Canonical Subspecialties $\rightarrow$ 71 Clinical Conditions (with Multi-Parent Canonical IDs `cond_lbd` for Lewy Body Dementia and `cond_paraneoplastic` for Paraneoplastic Syndromes; complete exclusion of `TBI` and `Anoxic Brain Injury`).
   - **Axis 2 (Clinical Stage / Domain)**:
     - `all` (`All Domains`)
     - `diagnosis` (`1. Diagnosis`): 5 canonical modality categories (`Clinical Evaluation & Scales`, `Neuroimaging`, `Neurophysiology`, `Laboratory & Pathology`, `Diagnostic Frameworks`) with 27 canonical tags.
     - `treatment` (`2. Treatment`): Condition-specific `Time Window` pills + 3 intervention groups (`Drug`, `Intervention / Surgical`, `Other`), dynamically hiding empty `[]` groups.
     - `prevention` (`3. Prevention & Secondary Care`): Condition-specific `Pharmacological Prophylaxis`, `Procedural & Device Interventions`, and `Lifestyle, Rehab & Monitoring`, dynamically hiding empty `[]` groups.
   - **6 System Tagging Rules**:
     - Rule 1: 1–3 words per chip, canonical drug/procedure names.
     - Rule 2: Cross-Domain Single Label ID (`label_id`) shared across `Treatment` and `Prevention`.
     - Rule 3: Multi-Parent Canonical Condition ID (`cond_lbd`, `cond_paraneoplastic`).
     - Rule 4: Hide empty `[]` groups in UI.
     - Rule 5: Zero `... Avoidance` tags — use canonical positive entity names paired with `direction = 'harm'`.
     - Rule 6: Exclude `TBI` and `Anoxic Brain Injury`.

2. **V3.0 Query Engine & Deterministic Classifier (`src/lib/neuroguide/clinicalNavigatorEngine.ts`)**:
   - Purge legacy 9-facet ontology chip builders (`evidenceChips`, `ontologyLabels` display chips).
   - Implement `classifyRecommendationV3(doc, change, index)` to assign structured `RecommendationV3Labels` (`subspecialties`, `conditionIds`, `domains`, `diagnosisTags`, `timeWindowIds`, `interventionTags`, `direction`).
   - Implement V3.0 Boolean Query Engine (`runClinicalNavigatorQuery`):
     $$\text{Results} = (\text{Subspecialty}) \ \mathbf{AND} \ (\text{Condition}) \ \mathbf{AND} \ (\text{Domain}) \ \mathbf{AND} \ (\text{Domain Sub-filters}) \ \mathbf{AND} \ (\text{Direction / Harm}) \ \mathbf{AND} \ (\text{Society}) \ \mathbf{AND} \ (\text{Right-Pane Search})$$

3. **30-Case Clinical Feasibility Verification (`tests/clinicalNavigatorV3Feasibility.test.mjs`)**:
   - Execute 30 representative clinical scenarios spanning all 10 subspecialties, Diagnosis modalities, Treatment + Time Windows, Prevention, Cross-Domain Single Label (`DOAC`, `SAPT`, `DAPT`, `Blood Pressure Control`, `VP Shunt`, `PEG Placement`), Multi-Parent conditions (`cond_lbd`, `cond_paraneoplastic`), Class III Harm contraindications (`Platelet Transfusion`, `Corticosteroids`, `Andexanet Alfa`), and Right-Pane Content Search.

4. **Guideline Recommendation Re-labeling (`public/data/neuroguide_cloud.json`)**:
   - Purge legacy `ontologyLabels` and `customRecLabels` from `public/data/neuroguide_cloud.json` and `guidelineStorage.ts`.
   - Re-label all 555+ recommendations across all 12 guidelines in `public/data/neuroguide_cloud.json` with validated `v3Labels`.

5. **Clinical Navigator UI & Right-Pane Content Search (`src/components/neuroguide/ClinicalNavigatorTab.tsx`)**:
   - Left Sidebar (`lg:col-span-4`): V3.0 Dual-Primary Axis Filter (Subspecialty $\rightarrow$ Condition $\rightarrow$ Clinical Domain $\rightarrow$ Dynamic Sub-filters $\rightarrow$ Direction/Harm & Society).
   - Right Content Pane (`lg:col-span-8`): Persistent **Right-Pane Content Search Bar** at the top of the right column + clean recommendation cards without legacy ontology label chips.
