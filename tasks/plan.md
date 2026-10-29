# Implementation Plan: Automated Guideline Discovery, Batch Ingestion & Comprehensive Library

## Overview
The user identified a critical architectural gap in NeuroGuide: while the user expected NeuroGuide to automatically discover all official clinical practice guidelines (such as the extensive suite of 2023–2026 ESO, AHA, ESC, and ESVS guidelines), the application currently relies on a static mock dataset (`neuroguideMockData.ts`). Consequently, guidelines not manually hardcoded are invisible, forcing the user to manually prompt for missing items.

This plan establishes a robust **3-tier automated guideline discovery and ingestion architecture**:
1. **Automated PubMed & Journal RSS Ingestion Engine (`/api/neuroguide/sync-guidelines`)**: Scheduled and on-demand discovery of newly published and historical clinical practice guidelines directly from PubMed API (NCBI E-Utilities) and journal feeds (*European Stroke Journal*, *Stroke*, *Neurology*, *Epilepsia*, *Movement Disorders*).
2. **Local PDF Batch Ingestion / Drop-Zone Engine (`/api/neuroguide/import-local`)**: Allows instant batch scanning and parsing of the user's local guideline collection (matching the 16+ official guidelines in the user's screenshot).
3. **Comprehensive Seed Library Expansion**: Immediately index all 16 guidelines from the user's active library into NeuroGuide with structured metadata, chronological sorting, and practice changes.

---

## Architectural Decisions

### Decision 1: Separation of Discovery vs. Structured Extraction
- **Discovery Layer**: Fast, reliable querying using official NCBI PubMed API (`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`) with publication type filter `("Practice Guideline"[pt] OR "Guideline"[pt] OR "Consensus Development Conference"[pt])` targeting specific societies (`European Stroke Organisation`, `American Heart Association`, `American Academy of Neurology`, etc.).
- **Extraction Layer**: Structured parsing extracting Title, Authors, DOI, Publication Date, and Abstract. For full-text PDFs/HTML, an LLM extraction schema atomizes "What is New and of High Impact" into `PracticeChangeDetail` and `RecommendationAtom`.

### Decision 2: Local File / Folder Scanner Endpoint
- Provide an API endpoint (`/api/neuroguide/import-local` or client-side batch drop) that accepts guideline file lists or PDF metadata, maps standard naming conventions (e.g., `2025 ESO guideline on aphasia rehabilitation.pdf`), and automatically structures them into `GuidelineDoc` objects without manual typing.

### Decision 3: Unified Persistence & Dynamic Client Synchronization
- Rather than solely editing a static TypeScript file, introduce a JSON-backed or persistent store (`src/data/persistedGuidelines.json` or dynamic API route) merged with existing seed data at runtime. When the automated sync runs, new guidelines are saved and instantly discoverable via the client-side search.

---

## Task List

### Phase 1: Ingestion & Seed Library Expansion (Immediate Coverage)
- [ ] **Task 1: Index All 16 Guidelines from User's Library into NeuroGuide**
  - **Description**: Add all 16 guidelines from the user's screenshot (2023–2026 ESO Tenecteplase, Moyamoya, ESVS Carotid, ESC Atrial Fibrillation, Basilar Artery Occlusion, Small Vessel Disease Part 2, PFO, ICH 2025, Evidence Update 2025, Aphasia, Blood Pressure, Motor Rehab, Visual Impairment, aSAH, Stroke-Associated Pneumonia) with complete metadata and practice changes.
  - **Files touched**: `src/data/neuroguideMockData.ts`
  - **Scope**: Medium (1 file, rich data records)

### Phase 2: Automated Discovery Pipeline (Autonomous Ingestion Engine)
- [ ] **Task 2: Build PubMed E-Utilities Automated Discovery Service**
  - **Description**: Implement a server-side search utility (`src/lib/neuroguide/pubmedDiscovery.ts`) that queries NCBI E-Utilities (`esearch` + `esummary`) for major neurological societies (`ESO`, `AHA/ASA`, `AAN`, `EAN`, `ILAE`, `MDS`, `NCS`) with date-range filters and returns clean structured guideline documents.
  - **Files touched**: `src/lib/neuroguide/pubmedDiscovery.ts`, `src/app/api/neuroguide/sync-guidelines/route.ts`
  - **Scope**: Medium (2 files)

- [ ] **Task 3: Build Batch Local Guideline Ingestion / Parser API**
  - **Description**: Create `/api/neuroguide/import-batch` allowing batch import from filename manifests or file uploads, automatically parsing year, society, topic, and category.
  - **Files touched**: `src/app/api/neuroguide/import-batch/route.ts`
  - **Scope**: Small (1 file)

### Phase 3: UI Integration & Automated Radar Controls
- [ ] **Task 4: Add Automated Radar Sync & Import UI in NeuroGuide**
  - **Description**: Add a "⚡ Auto-Scan Guidelines (PubMed / Societies)" button and "📁 Import Batch" modal in the NeuroGuide header, allowing doctors to trigger instant automated discovery and view sync logs.
  - **Files touched**: `src/app/neuroguide/page.tsx`
  - **Scope**: Medium (1 file)

- [ ] **Task 5: Verification & End-to-End Search Validation**
  - **Description**: Run full TypeScript typecheck, production build (`next build`), and test searching across all newly ingested guidelines, dates, and topics.
  - **Files touched**: Verification commands
  - **Scope**: Small

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **PubMed API Rate Limiting** | Medium | Use NCBI tool name / email query parameters and implement 300ms request throttling. |
| **PDF Full-Text Access Restrictions** | High | Extract abstracts and official DOIs automatically via PubMed open metadata; allow manual PDF drop for proprietary full text. |
| **Duplicate Guideline Detection** | Medium | Deduplicate records based on DOI and normalized title before appending to the guideline library. |
