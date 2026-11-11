# Capability Map: NeuroRx v1 (Drugs & Dosing — Neuro Ecosystem)

> Spec: [`SPEC-neurorx.md`](./SPEC-neurorx.md). Module ids are stable — never rename.

| Module id | Responsibility | Depends on |
|---|---|---|
| `rx-data-core` | TypeScript types + runtime validator for drug/source/interaction/reproductive records; `Sourced<T>` provenance contract; verification status + content hash; data loader; `rx:validate`, `rx:verify`, `rx:check-quotes` scripts | — |
| `rx-clinical-engine` | Pure functions: patient context (age/sex/weight/height/SCr µmol/L↔mg/dL), Cockcroft-Gault (ABW & normalized 1.73 m²), dose resolution (fixed / per-kg / caps / renal bands / HD), infusion & syringe helper (ml, ml/h), formulation → tablets/vials, Tall Man rendering, order-snippet text builder | `rx-data-core` |
| `rx-shell-ui` | `/neurorx` route, header (Night Shift, Admin, AppSwitcher), 4 pill tabs, Clinical Omnibar (generic/brand/class/reverse-AE/shorthand parser), global disclaimer, AppSwitcher link | `rx-data-core` |
| `rx-drug-directory` | Tab 1: list + subspecialty filters; drug detail (Tier 1 header + patient bar, Tier 2 two dose cards, Tier 3 tool buttons + accordions + audit trail); "Pending verification" gating | `rx-clinical-engine`, `rx-shell-ui` |
| `rx-interactions` | Tab 2: pill-tag regimen; curated pair lookup; mechanism flags (CYP3A4/P-gp inducer×substrate, serotonergic, QT, ACB) shown as "review suggested"; MG-worsening checker; swap simulation | `rx-data-core`, `rx-shell-ui` |
| `rx-reproductive` | Tab 3: disease-group selector; safety tier board with per-registry MCM + lactation RID; pregnancy detail card (preconception / trimester / postpartum) | `rx-data-core`, `rx-shell-ui` |
| `rx-novel-therapies` | Tab 4: clinical practice cards (eligibility, infusion schedule, monitoring e.g. ARIA MRI, vaccination prerequisites) + ecosystem links | `rx-data-core`, `rx-shell-ui` |
| `rx-anticoag-compass` | ICH reversal panel (with VN availability flag) + peri-procedural hold (LP / neurosurgery) + post-ICH restart timeline, per-source display | `rx-clinical-engine`, `rx-drug-directory` |
| `rx-parkinson-npo` | LEDD calculator + NPO / peri-operative conversion (e.g. rotigotine) with source-bound conversion factors | `rx-clinical-engine`, `rx-drug-directory` |
| `rx-patient-outputs` | Printable titration/taper schedules + missed-dose / vomiting instructions (English) | `rx-clinical-engine`, `rx-drug-directory` |
| `rx-offline` | PWA manifest + service worker caching app shell and full dataset; offline status indicator | `rx-shell-ui` |
| `rx-update-watch` | Weekly GitHub Action: OpenFDA/DailyMed SPL version diff → `updates_queue.json` + Pull Request; Admin `neurorx` section inside existing `/admin` (read-only diff, draft list, link to PR) | `rx-data-core` |
| `rx-extraction` | Source-bound extraction: (a) IDE-agent workflow, (b) in-app Gemini extractor (admin/dev only) → draft JSON + automatic verbatim-quote check | `rx-data-core` |

Build order:
`rx-data-core` → `rx-clinical-engine`, `rx-shell-ui` → `rx-drug-directory` → `rx-interactions`, `rx-reproductive`, `rx-novel-therapies` → `rx-anticoag-compass`, `rx-parkinson-npo`, `rx-patient-outputs` → `rx-offline`, `rx-update-watch`, `rx-extraction`

Data waves (content, not modules) run in parallel with software after `rx-data-core` + `rx-extraction(a)` exist: Wave 1 → 2 → 3 → 4, each gated by human verification.
