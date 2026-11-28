# Spec: NeuroGuide Clinical Navigator — V3.0 Filter Taxonomy, Right-Pane Search & Evidence Engine

## 1. Objective

Redesign the **Clinical Navigator** filter system and recommendation tagging architecture in **NeuroGuide** to **Version 3.0 (Dual-Primary Axis Taxonomy)**, completely removing all legacy 9-facet labels from both the filter UI and guideline cards, and adding an integrated **Right-Pane Content Search Bar** that combines with the left-pane filters.

### Why We Are Building This
1. **Eliminate Cluttered & Illogical Legacy Labels**: The previous 9-facet ontology (`stroke_ontology.json` v0.2.0) mixed heterogeneous concepts (`phase`, `intervention_type`, `drug_or_procedure`, `outcome_target`, `age_group`, `special_populations`) into flat, noisy lists and rendered cluttered verbatim substring chips (`evidenceChips`) on every guideline recommendation card.
2. **Align with Real-World Neurological Clinical Workflow (Dual-Primary Axis)**:
   - **Axis 1 (Clinical Context)**: `Subspecialty` (10 canonical neurology subspecialties) $\rightarrow$ `Clinical Condition` (condition-specific taxonomy with Multi-Parent Canonical mapping for cross-subspecialty entities `Lewy Body Dementia` and `Paraneoplastic Syndromes`, and complete removal of `TBI` and `Anoxic Brain Injury`).
   - **Axis 2 (Clinical Stage / Domain)**: `Clinical Domain` divided into 3 structured branches:
     1. `1. Diagnosis`: System-wide canonical 5-modality tree (`Clinical Evaluation & Scales`, `Neuroimaging`, `Neurophysiology`, `Laboratory & Pathology`, `Diagnostic Frameworks`).
     2. `2. Treatment`: Condition-specific acute & active interventions with an independent `Time Window` filter + 3 intervention groups (`Drug`, `Intervention / Surgical`, `Other`).
     3. `3. Prevention & Secondary Care`: Condition-specific maintenance & recurrence prevention (`Pharmacological Prophylaxis`, `Procedural & Device Interventions`, `Lifestyle, Rehab & Monitoring`).
   - **Secondary Filters**: `Society`, `Recommendation Direction / Harm Engine` (`Strong / Recommended [Class I, IIa]` vs. `Marginal / Conditional [Class IIb]` vs. `Contraindicated / Harm [Class III]`), and `Only New / Upgraded Recs`.
3. **Right-Pane Content Search Bar**: Provide a dedicated, always-accessible keyword search bar at the top of the right-hand content pane so clinicians can search free-text clinical details (dosing, thresholds, trial acronyms, PICO terms) either standalone or combined (`AND`) with the left-pane filters.

---

## 2. Comprehensive Feasibility & Logic Audit of V3.0 Specification

Before writing any code, we evaluated the uploaded **V3.0 Specification** against clinical logic, Boolean query algebra, and the existing NeuroGuide codebase (`555+` atomic recommendations across `12` guidelines, `PivotalTrialRecord[]`, and `Article[]`).

### 2.1. Feasibility Assessment: **HIGHLY FEASIBLE (100% Compatible)**
- **Zero Database Schema Migration Needed**: NeuroGuide persists guidelines and navigator metadata as JSONB in Supabase (`neuroguide_docs`) and `public/data/neuroguide_cloud.json`. Purging legacy `ontologyLabels` / `customRecLabels` and replacing the in-memory indexer with the V3.0 taxonomy engine requires zero SQL schema migrations.
- **Performance**: The full taxonomy dictionary (~70 conditions across 10 subspecialties) compiles to a ~35 KB static TypeScript/JSON structure. Indexing 555+ recommendations deterministically in memory takes `< 5 ms`.

### 2.2. Five Critical Logic Findings & Architectural Resolutions

#### Finding 1: Internal Contradiction Between Rule #5 (No `... Avoidance` Tags) and Section 4 Lists
- **Issue Detected**: Section 1, Rule 5 explicitly mandates: *"Xóa bỏ hoàn toàn các tag chữ dài phủ định dạng `... Avoidance`. Thuốc/can thiệp gốc (như `Corticosteroids`, `Typical Antipsychotics`, `Platelet Transfusion`) được gán trực tiếp thuộc tính `Direction = Contraindicated / Harm (Class III)` để cảnh báo người dùng."* However, Section 4 of the uploaded file still retained **18 legacy `... Avoidance` strings** (e.g., `Platelet Avoidance` in ICH, `Typical Antipsychotic Avoidance` in LBD, `Cholinesterase Inhibitor Avoidance` in FTD, `MS DMD Avoidance` in NMOSD, `Corticosteroid Avoidance` in GBS/MMN/Lymphoma, `PLEX Avoidance` in MMN, `Opioid Avoidance` & `Triptan Avoidance` in Tension Headache, `Neuromuscular Blocker Avoidance` & `Fluoroquinolone Avoidance` in MG, etc.).
- **Resolution**: Strictly enforce **Rule 5** across all 10 subspecialties:
  - Replace negative drug/procedure avoidance tags in `Treatment -> Other` with their canonical positive entity names in `Drug` or `Intervention / Surgical` (e.g., `Platelet Transfusion`, `Typical Antipsychotics`, `Cholinesterase Inhibitors`, `Corticosteroids`, `Opioids`, `Triptans`, `Fluoroquinolones`, `Neuromuscular Blockers`) so that recommendations advising against them are surfaced via `Direction = Contraindicated / Harm (Class III)`.
  - For genuine lifestyle/behavioral risk-factor modification in `Lifestyle, Rehab & Monitoring` (such as stopping alcohol, caffeine, or triggers), standardize to positive clinical counseling terms (`Alcohol Cessation`, `Trigger Management`, `Caffeine Restriction`, `Contraindicated Drug Education`) to eliminate all `... Avoidance` tags 100%.

#### Finding 2: Strict Enforcement of Rule #2 (Cross-Domain Single Label Principle)
- **Issue Detected**: Rule 2 mandates that any intervention appearing in both `Treatment` and `Prevention & Secondary Care` must share the exact same `label_id` and `Label String`. In Section 4 of the draft, several identical concepts had slight string variations between `Treatment` and `Prevention`:
  - `Fall Prevention Protocol` (Parkinson Treatment) vs. `Fall Prevention Care` (Parkinson Prevention) vs. `Fall Prevention` (Other Movement) $\rightarrow$ Standardized to **`Fall Prevention`** (`lbl_fall_prevention`).
  - `VP Shunt` (Fungal Treatment) vs. `VP Shunt Placement` (Fungal/SAH/TB Prevention) vs. `VP Shunt Insertion` (NPH) $\rightarrow$ Standardized to **`VP Shunt`** (`lbl_vp_shunt`).
  - `PEG Tube Placement` (ALS) vs. `PEG Placement` (MSA/Stroke) vs. `Gastrostomy Tube` (Acute Neuromuscular Failure) $\rightarrow$ Standardized to **`PEG Placement`** (`lbl_peg_placement`).
  - `High Salt Diet Protocol` (MSA Treatment) vs. `High Salt Diet` (MSA Prevention) $\rightarrow$ Standardized to **`High Salt Diet`** (`lbl_high_salt_diet`).
  - `CBT Therapy` (Tension Headache Treatment) vs. `Cognitive Behavioral Therapy` (Prevention) $\rightarrow$ Standardized to **`CBT Therapy`** (`lbl_cbt_therapy`).
  - `Headache Diary` (Migraine Treatment) vs. `Headache Electronic Diary` (Prevention) $\rightarrow$ Standardized to **`Headache Diary`** (`lbl_headache_diary`).
  - `Visual Field Tracking` (Secondary Headaches Treatment) vs. `Automated Visual Field Surveillance` (Prevention) $\rightarrow$ Standardized to **`Visual Field Tracking`** (`lbl_visual_field_tracking`).
  - `Prednisone` vs. `Prednisone Low-Dose`, `Dexamethasone High-Dose` vs. `Dexamethasone Taper` $\rightarrow$ Standardized to **`Prednisone`** (`lbl_prednisone`) and **`Dexamethasone`** (`lbl_dexamethasone`) so cross-domain filtering works seamlessly between acute induction and maintenance tapering.

#### Finding 3: Rule #1 Optimization (1–3 Words per Chip Badge)
- **Issue Detected**: A few labels in `Lifestyle, Rehab & Monitoring` exceeded 3 words (e.g., `Post-Intensive Care Syndrome (PICS) Care`, `Periodic Malignancy Screening (Pelvic US/PET)`, `Strict Analgesic Limitation (< 10 Days/Month)`, `Longitudinal Whole-Body PET Surveillance`, `6-Month Lumbar Puncture CSF Tracking`).
- **Resolution**: Keep all UI badge labels concise (1–3 words, e.g., `PICS Care`, `Malignancy Screening`, `Analgesic Limit`, `Whole-Body PET`, `Serial CSF Tracking`) while preserving the full detailed clinical specification in the chip's `tooltip / description` metadata.

#### Finding 4: Query Logic When `Condition == 'all'` or `Clinical Domain == 'all'`
- **Issue Detected**: Since `2. Treatment` and `3. Prevention & Secondary Care` have **Condition-Specific** tag lists, what happens in the UI and Engine when:
  1. `Subspecialty` is selected (e.g. `Stroke`), `Condition == 'all'`, and `Domain == 'treatment'`?
  2. A user selects a shared cross-domain label (e.g. `DOAC` or `Blood Pressure Control`) and switches `Clinical Domain` between `ALL`, `Treatment`, and `Prevention`?
- **Resolution**:
  - When a specific `Condition` is chosen, the UI displays that condition's exact `Time Window` and `Treatment` / `Prevention` groups (hiding any empty `[]` groups per Rule 4).
  - When `Condition == 'all'` within a selected `Subspecialty`, the UI aggregates (deduplicated by `label_id`) the `Treatment` or `Prevention` tags across that subspecialty's conditions, or lets the user pick a condition first.
  - When switching `Clinical Domain` between `Treatment`, `Prevention`, and `ALL`, any selected `label_id` that exists in the target domain is preserved (per Rule 2 Cross-Domain Single Label Principle) so clinicians can seamlessly pivot from acute management to secondary prevention for the same drug/procedure.

#### Finding 5: Clean Removal of Legacy Labels from Guidelines & Deterministic V3.0 Indexing
- **Issue Detected**: Currently, `RecommendationMatrixCard` in `ClinicalNavigatorTab.tsx` renders up to 6 verbatim substring chips (`evidenceChips`) derived from the old 9-facet `STROKE_ONTOLOGY`. Furthermore, `PivotalTrialModal.tsx` and `pivotalTrialsSeed.ts` reference `STROKE_ONTOLOGY`.
- **Resolution**:
  - **Delete all legacy labels from Guideline Cards**: Remove `evidenceChips` rendering from `RecommendationMatrixCard` and remove `ontologyLabels` from `PracticeChangeDetail` / `customRecLabels` in storage. Guideline recommendation cards will remain clean, showing only official society grading (`COR/LOE` or `GRADE`), normalized tier, direction badge (`Recommended` vs. `Contraindicated / Harm`), practice-change status, and driving trial badges.
  - **Deterministic V3.0 Classification Engine**: Index recommendations and pivotal trials in memory against the V3.0 taxonomy (`subspecialty`, `conditionIds`, `domains`, `diagnosisModalityIds`, `timeWindowIds`, `labelIds`, `direction`) using curated keyword/section/trial mapping rules so that all 555+ existing recommendations and 25+ pivotal trials respond accurately to the new V3.0 filters + right-pane search bar.

---

## 3. Tech Stack & Commands

- **Stack**: Next.js `^16.4.3`, React `^19.3.1`, TypeScript `^7.0.2`, Tailwind CSS `^4.3.3`, Supabase (`@supabase/supabase-js`).
- **Commands**:
  - Typecheck: `cmd /c npx tsc --noEmit`
  - Build: `cmd /c npm run build`
  - Node Tests: `cmd /c npm test`

---

## 4. Project Structure

```text
d:\NeuroPulse\
├── src/
│   ├── types/
│   │   └── neuroguide.ts                        # Updated V3.0 Navigator types (ClinicalDomainId, DiagnosisCategoryId, NavigatorQueryV3, etc.)
│   ├── data/
│   │   ├── clinicalNavigatorTaxonomyV3.ts       # Complete V3.0 Dual-Axis Taxonomy (10 Subspecialties, 71 Conditions, 5 Diagnosis Modalities, Condition-Specific Treatment & Prevention)
│   │   └── pivotalTrialsSeed.ts                 # Landmark trials mapped to V3.0 conditionIds, domains, and labelIds
│   ├── lib/
│   │   └── neuroguide/
│   │       ├── clinicalNavigatorEngine.ts       # V3.0 Boolean Query Engine + Right-Pane Content Search + Cross-Society Matrix + Concordance
│   │       └── ontologyValidator.ts             # Clean grade/tier/direction normalizer & V3.0 recommendation classifier
│   ├── components/
│   │   └── neuroguide/
│   │       ├── ClinicalNavigatorTab.tsx         # Left-Pane V3.0 Dual-Axis Filter + Right-Pane Content Search Bar & Clean Synthesis Cards
│   │       └── PivotalTrialModal.tsx            # Updated trial modal aligned with V3.0 condition & intervention tags
└── tests/
    └── clinicalNavigatorEngine.test.mjs         # Comprehensive unit & integration tests for V3.0 taxonomy, cross-domain labels, multi-parent conditions, and right-pane search
```

---

## 5. V3.0 Architecture & UI Specification

### 5.1. Left Pane: Dual-Primary Axis Filter System

1. **Filter Search Input (Left Pane)**:
   - Quickly filters available conditions, diagnosis modalities, drugs, interventions, or societies inside the filter box.
2. **Primary Axis 1 — Disease Context (`Subspecialty` $\rightarrow$ `Clinical Condition`)**:
   - **Step 1 (`Subspecialty`)**: 10 canonical subspecialties (`Stroke`, `Neurocritical Care`, `Epilepsy`, `Dementia`, `Neuroimmunology`, `Neuromuscular`, `Movement Disorders`, `Headache & Pain`, `CNS Infections`, `Neuro-Oncology`).
   - **Step 2 (`Clinical Condition`)**: Displays `All Conditions` + the specific conditions belonging to the selected Subspecialty.
   - **Multi-Parent Canonical Mapping**:
     - `cond_lbd` (`Lewy Body Dementia`) appears under both `Dementia` and `Movement Disorders` with 100% identical child tags and query results.
     - `cond_paraneoplastic` (`Paraneoplastic Syndromes`) appears under both `Neuroimmunology` and `Neuro-Oncology` with 100% identical child tags and query results.
3. **Primary Axis 2 — Clinical Stage (`Clinical Domain`)**:
   - 4-option segmented selector: `All Domains` | `1. Diagnosis` | `2. Treatment` | `3. Prevention & Secondary Care`.
   - **When `1. Diagnosis` is selected**:
     - Displays the 5 system-wide canonical modality categories (`Clinical Evaluation & Scales`, `Neuroimaging`, `Neurophysiology`, `Laboratory & Pathology`, `Diagnostic Frameworks`). `OR` logic across selected modality tags.
   - **When `2. Treatment` is selected**:
     - Displays `[Independent Filter] Time Window` (condition-specific windows) + `[Intervention Filters]` grouped into `Drug`, `Intervention / Surgical`, and `Other`.
     - Empty groups (`[]`) are automatically hidden (Rule 4: No `None` labels).
     - Query formula: `TimeMatch AND InterventionMatch`.
   - **When `3. Prevention & Secondary Care` is selected**:
     - Displays `Pharmacological Prophylaxis`, `Procedural & Device Interventions`, and `Lifestyle, Rehab & Monitoring` (hiding any empty `[]` groups).
     - Query formula: `OR` across selected prevention tags.
4. **Secondary Filters**:
   - **Recommendation Direction / Harm Filter**:
     - `ALL`
     - `Recommended (Class I / IIa / Strong & Weak FOR)`
     - `Conditional / Uncertain (Class IIb / Consensus)`
     - `Contraindicated / Harm (Class III / AGAINST)`
   - **Society Filter**: Multi-select chips (`AHA/ASA`, `ESO`, `AAN`, `EAN`, `ILAE`, `NCS`, `MDS`, `VN-MOH`).
   - **Only New / Upgraded Recs**: Checkbox toggle (`changeType !== "STANDARD"`).

### 5.2. Right Pane: Content Search Bar + 5-Section Evidence Synthesis

1. **Right-Pane Content Search Bar (NEW)**:
   - Positioned prominently at the top of the right content pane (`lg:col-span-8`).
   - Allows free-text multi-token search across recommendation text, section headers, PICO questions, dosing numbers, trial acronyms (`AcT`, `SELECT2`, `DAWN`, `ENRICH`), and NeuroPulse articles.
   - **Combined Logic (`AND`)**:
     - When used **with** Left-Pane Filters: narrows the filtered results in real time (`LeftFilterMatch AND RightSearchMatch`).
     - When used **standalone** (without Left-Pane Filters): activates the synthesis view directly and searches across the entire guideline & trial repository.
   - Includes a quick `Clear (✕)` button and live match count indicator.
2. **Clean Guideline Recommendation Cards**:
   - All legacy ontology span tags (`evidenceChips`) are removed from `RecommendationMatrixCard` and from guideline data.

### 5.3. Code Style Example

```typescript
export interface NavigatorQueryV3 {
  subspecialty?: SubspecialtyType;
  conditionId?: string; // e.g., "cond_ischemic_stroke", "cond_lbd", or "all"
  domain?: "all" | "diagnosis" | "treatment" | "prevention";
  diagnosisTags?: string[]; // Canonical diagnosis modality IDs
  timeWindowId?: string;    // Condition-specific time window ID
  interventionTags?: string[]; // Shared canonical label_ids (Cross-Domain Single Label Principle)
  directionFilter?: "all" | "recommended" | "conditional" | "harm";
  societies?: string[];
  onlyPracticeChanges?: boolean;
  contentSearchText?: string; // Right-pane content search bar query
}
```

---

## 6. Testing Strategy & Boundaries

### Testing Strategy
- **Unit & Integration Tests (`tests/clinicalNavigatorEngine.test.mjs`)**:
  1. Verify all 10 Subspecialties and all Clinical Conditions from V3.0 exist, with `TBI` and `Anoxic Brain Injury` absent, no `"None"` labels, and no `... Avoidance` tags.
  2. Verify Cross-Domain Single Label Principle: shared interventions (e.g., `lbl_sapt`, `lbl_dapt`, `lbl_doac`, `lbl_vka`, `lbl_statin`, `lbl_bp_control`, `lbl_carotid_stenting`) have identical IDs and labels in both `Treatment` and `Prevention & Secondary Care`.
  3. Verify Multi-Parent Canonical Conditions (`cond_lbd` under `Dementia` & `Movement Disorders`; `cond_paraneoplastic` under `Neuroimmunology` & `Neuro-Oncology`) return identical tag sets and query results.
  4. Verify Boolean Query Execution for `Diagnosis`, `Treatment` (`TimeMatch AND InterventionMatch`), `Prevention`, `Direction = Harm (Class III)`, and `Right-Pane Content Search` combined with filters.

### Boundaries
- **Always do**:
  - Follow V3.0 Tagging Rules (1–3 words per chip, Cross-Domain Single Label ID, Multi-Parent Canonical Condition ID, hide empty `[]` groups, no `... Avoidance` tags).
  - Preserve verbatim guideline quotes, original `COR/LOE` / `GRADE` ratings, and driving trial badges.
- **Ask first**:
  - Adding external npm dependencies or altering Supabase table schemas.
- **Never do**:
  - Render legacy 9-facet ontology chips on guideline cards or in the filter sidebar.
  - Create `"None"` filter badges or negative `... Avoidance` drug tags.

---

## 7. Success Criteria

1. All legacy 9-facet filter groups and all ontology label chips previously displayed on guideline recommendation cards are 100% removed.
2. The new V3.0 Dual-Primary Axis Filter (`Subspecialty` $\rightarrow$ `Clinical Condition` $\rightarrow$ `Clinical Domain [Diagnosis | Treatment | Prevention]` + `Secondary Filters`) is fully interactive and follows all 6 System Tagging Rules.
3. The Right-Pane Content Search Bar is rendered at the top of the right content pane and filters recommendations, diffs, pivotal trials, concordance summary, and NeuroPulse articles both standalone and in combination (`AND`) with the left-pane filters.
4. `cmd /c npm test`, `cmd /c npx tsc --noEmit`, and `cmd /c npm run build` pass with zero errors.

---

## 8. Open Questions for Human Review

1. **Chuẩn hóa 18 nhãn `... Avoidance` còn sót trong Mục 4 của file V3.0**: Theo Quy tắc 5 (Mục 1), hệ thống xóa bỏ hoàn toàn các tag phủ định dạng `... Avoidance` và chuyển thành tên thuốc/can thiệp gốc kết hợp với bộ lọc `Direction = Contraindicated / Harm (Class III)`. Bạn có đồng ý để hệ thống tự động chuẩn hóa toàn bộ 18 nhãn `... Avoidance` còn sót trong Mục 4 (ví dụ: `Platelet Avoidance` $\rightarrow$ `Platelet Transfusion`, `Corticosteroid Avoidance` $\rightarrow$ `Corticosteroids`, `Typical Antipsychotic Avoidance` $\rightarrow$ `Typical Antipsychotics`, `Opioid Avoidance` $\rightarrow$ `Opioids`, `Alcohol Avoidance` $\rightarrow$ `Alcohol Cessation`) để tuân thủ tuyệt đối Quy tắc 5 không?
2. **Đồng bộ tên nhãn giữa Treatment và Prevention (Quy tắc 2)**: Một số nhãn cùng bản chất trong Mục 4 có tên hơi lệch chữ giữa 2 nhánh (ví dụ: `VP Shunt` vs `VP Shunt Placement`, `Fall Prevention Protocol` vs `Fall Prevention Care`, `CBT Therapy` vs `Cognitive Behavioral Therapy`, `Prednisone` vs `Prednisone Low-Dose`). Bạn có đồng ý chuẩn hóa chúng về cùng 1 tên ngắn gọn (1–3 từ, ví dụ: `VP Shunt`, `Fall Prevention`, `CBT Therapy`, `Prednisone`) để tính năng lọc liên nhánh (Cross-Domain Single Label) hoạt động chính xác 100% không?
3. **Vị trí hiển thị Thanh tìm kiếm bên phải (Right-Pane Search Bar)**: Bạn muốn thanh tìm kiếm ở ô bên phải luôn hiển thị cố định trên cùng của cột phải (ngay cả khi chưa chọn filter bên trái, giúp bác sĩ có thể gõ tìm kiếm trực tiếp ngay lập tức hoặc kết hợp thêm với filter bên trái), đúng không?
