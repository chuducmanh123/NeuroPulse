# Task List: Automated Guideline Discovery & Library Overhaul

## Task 1: Complete Ingestion of All 16 Guidelines from User's Collection [COMPLETED]
**Description:** Expand `MOCK_GUIDELINE_DOCS` to include all 16 guidelines shown in the user's personal PDF library, ensuring full coverage across all years (2023, 2024, 2025, 2026), correct societies (ESO, ESC, ESVS), official publication dates, and key practice changes.

**Acceptance criteria:**
- [x] All 16 guidelines from the user's screenshot are fully indexed in `MOCK_GUIDELINE_DOCS`:
  1. `2023 ESO expedited recommendation on tenecteplase for acute ischaemic stroke` (`eso-tenecteplase-2023`)
  2. `2023 ESO Guidelines on Moyamoya angiopathy` (`eso-moyamoya-2023`)
  3. `2023 European Society for Vascular Surgery (ESVS) Clinical Practice Guidelines on Carotid and Vertebral Artery Disease` (`esvs-carotid-2023`)
  4. `2024 ESC Guidelines for the management of atrial fibrillation developed in collaboration with EACTS` (`esc-af-2024`)
  5. `2024 ESO and ESMINT - Guideline on acute management of basilar artery occlusion` (`eso-esmint-bao-2024`)
  6. `2024 ESO and European society for minimally invasive neurological therapy guideline on intracranial stenosis` (`eso-esmint-icas-2024`)
  7. `2024 ESO guideline on cerebral small vessel disease, part 2, lacunar ischaemic stroke` (`eso-svd-lacunar-2024`)
  8. `2024 ESO Guidelines on the diagnosis and management of patent foramen ovale (PFO)` (`eso-pfo-2024`)
  9. `2025 ESO and EANS guideline on stroke due to spontaneous intracerebral haemorrhage` (`eso-eans-ich-2025`)
  10. `2025 ESO annual stroke evidence update 2025` (`eso-evidence-update-2025`)
  11. `2025 ESO guideline on aphasia rehabilitation` (`eso-aphasia-2025`)
  12. `2025 ESO guideline on blood pressure in acute ischemic stroke and intracerebral hemorrhage` (`eso-bp-management-2025`)
  13. `2025 ESO guideline on motor rehabilitation` (`eso-motor-rehab-2025`)
  14. `2025 ESO guideline on visual impairment in stroke` (`eso-visual-impairment-2025`)
  15. `2026 ESO EANS and ESMINT guideline on aneurysmal subarachnoid haemorrhage` (`eso-asah-2026`)
  16. `2026 ESO guideline on stroke-associated pneumonia` (`eso-sap-2026`)
- [x] Each guideline has valid `subspecialty`, `publishDate`, `officialUrl`, `documentType`, and structured `allPracticeChanges`.

**Verification:**
- [x] `node ./node_modules/typescript/bin/tsc --noEmit` exits with code 0.
- [x] `node ./node_modules/next/dist/bin/next build` compiles successfully.

**Dependencies:** None  
**Files likely touched:** `src/data/neuroguideMockData.ts`  
**Estimated scope:** Medium (1 file)

---

## Task 2: Build PubMed Automated Discovery & Query Service [COMPLETED]
**Description:** Implement `src/lib/neuroguide/pubmedDiscovery.ts` to query NCBI E-Utilities (`esearch.fcgi` and `esummary.fcgi`) and Europe PMC open registry programmatically, fetching guidelines from ESO, AHA, AAN, EAN, ESC, and NCS automatically with periodic cron scheduling.

**Acceptance criteria:**
- [x] Function `searchPubMedGuidelines(options)` queries open PubMed / Europe PMC API with `(TITLE:"guideline" OR KW:"Practice Guideline")`.
- [x] Parses responses into structured `GuidelineDoc` objects containing Title, Journal, Authors, DOI, Publish Date, subspecialty mapping, and key practice change highlights.
- [x] API endpoint `GET/POST /api/neuroguide/sync-guidelines` triggers the automated scan and returns newly discovered guidelines with deduplication against existing library.
- [x] Added `vercel.json` cron config (`0 6 * * *`) for daily automated background server scans.
- [x] Added client-side autonomous background radar in `src/app/neuroguide/page.tsx` running on load and recurring every 30 minutes with local storage persistence.

**Verification:**
- [x] `node ./node_modules/typescript/bin/tsc --noEmit` passes with 0 errors.
- [x] Test API endpoint returns structured results with HTTP 200 (`totalDiscovered: 15`).
- [x] `node ./node_modules/next/dist/bin/next build` compiles successfully.

**Dependencies:** Task 1  
**Files touched:** `src/lib/neuroguide/pubmedDiscovery.ts`, `src/app/api/neuroguide/sync-guidelines/route.ts`, `vercel.json`, `src/app/neuroguide/page.tsx`  
**Estimated scope:** Medium (4 files)

---

## Checkpoint: Foundation & Automated Service Complete [VERIFIED]
- [x] All 16 guidelines visible and searchable in NeuroGuide client.
- [x] Server-side PubMed/Europe PMC discovery service functional.
- [x] Automated periodic scanning active (Server Vercel Cron + Client 30-min background radar).
- [x] Type check and Next.js build pass cleanly.

---

## Task 3: Local Batch Manifest & PDF Ingestion API [COMPLETED]
**Description:** Create `/api/neuroguide/import-batch` allowing the user to provide a list of filenames or a manifest (matching their local folder) to automatically generate and register structured `GuidelineDoc` records without manual editing.

**Acceptance criteria:**
- [x] Endpoint parses filenames with year, society, and topic patterns (e.g. `2025 ESO guideline on motor rehabilitation.pdf`).
- [x] Automatically categorizes subspecialty, derives unique ID, and creates draft `GuidelineDoc`.
- [x] Returns structured preview list ready for one-click ingestion into the active library.

**Verification:**
- [x] API unit test passes with batch manifest input.
- [x] TypeScript check clean.

**Dependencies:** Task 2  
**Files touched:** `src/app/api/neuroguide/import-batch/route.ts`  
**Estimated scope:** Small (1 file)

---

## Task 4: UI Radar Sync & Batch Import Action Buttons [COMPLETED]
**Description:** Add an interactive header toolbar to NeuroGuide (`/neuroguide`) with buttons:
- `⚡ Auto-Scan Online (PubMed / ESO / AHA)`
- `📁 Batch Import from Local Manifest`
- Display live scan status indicator and newly synced guideline count.

**Acceptance criteria:**
- [x] Header includes action buttons that call `/api/neuroguide/sync-guidelines` and open the batch import modal.
- [x] Shows modal / toast notification with discovered guidelines and real-time status.
- [x] Newly synced guidelines immediately appear in the client-side list, search index, and localStorage persistence.

**Verification:**
- [x] UI buttons and modal render properly in Day Shift and Night Shift modes.
- [x] `node ./node_modules/next/dist/bin/next build` builds static pages without errors.

**Dependencies:** Task 3  
**Files touched:** `src/app/neuroguide/page.tsx`  
**Estimated scope:** Medium (1 file)

---

## Checkpoint: Full Autonomous Pipeline Complete [VERIFIED]
- [x] Zero manual reminders required: guidelines are either auto-scanned from PubMed/Europe PMC or batch-imported from local folders.
- [x] All 16 guidelines from user's screenshot live, indexed, and searchable.
- [x] Chronological sorting verified from 2026 down to historical guidelines.
