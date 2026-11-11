# NeuroRx v1 — Task Checklist

> Plan & prompts: [`neurorx-plan.md`](./neurorx-plan.md) · Spec: [`../SPEC-neurorx.md`](../SPEC-neurorx.md) · Guardrails: [`../NEURORX-GUARDRAILS.md`](../NEURORX-GUARDRAILS.md)
> One new Antigravity conversation per task. Tick only after you have run the Verify steps yourself.

## Phase 0 — Source intake (you)
- [x] Levetiracetam FDA label (PDF + .txt) in `data/neurorx/sources/`
- [x] ISMP/FDA Tall Man list (PDF + .txt)
- [ ] Wave 1 labels + guidelines collected (see plan Phase 0 list)

## Phase 1 — Foundation
- [x] T1 Data types & validator — Verify: `npm test`, `npm run build`
- [x] T2 Integrity scripts (hash / verify / check-quotes / validate) — Verify: scripts on fixture; hash-tamper fails
- [x] T3 Extraction workflow + pilot levetiracetam (draft) — Verify: validate + quotes green; you review vs PDF
### Checkpoint A
- [x] All commands green · levetiracetam verified via `rx:verify` · tamper test fails then reverted

## Phase 2 — Engine + Tab 1
- [x] T4 Patient context & Cockcroft-Gault — Verify: `npm test`
- [x] T5 Dose engine, infusion, formulation, order text — Verify: `npm test`, no constants in `src/lib/neurorx`
- [x] T6 `/neurorx` shell + AppSwitcher link — Verify: build; themes; 375 px
- [x] T7 Drug list, filters, Omnibar — Verify: story 1 parsing
- [x] T8 Drug detail Tier 1–2 — Verify: stories 1, 2, 3, 5
- [x] T9 Tier 3: tools row, accordions, source popover, audit trail — Verify: story 6
### Checkpoint B
- [x] Stories 1, 2, 3, 5, 6 · keyboard-only · no clinical numbers in `src/`

## Phase 3 — Data Wave 1 (parallel with Phase 4)
- [x] T10 Batch A: anticoagulants / antiplatelets / reversal agents (draft)
- [x] T11 Batch B: thrombolytics / BP / nimodipine / statin (draft)
- [x] T12 Batch C: acute ASMs (draft)
- [x] T13 Wave 1 curated interactions + tools data (hold/restart, reversal, missed dose)
### Checkpoint C — Clinical verification (you)
- [ ] Every Wave 1 record reviewed vs sources and `rx:verify`-ed

## Phase 4 — Tabs 2–4
- [x] T14 DDI engine — Verify: `npm test`
- [x] T15 Tab 2 UI + simulate swap — Verify: story 4
- [x] T16 Tab 3 Pregnancy & Lactation — Verify: per-registry MCM display
- [x] T17 Tab 4 Novel Therapies (UI) — Verify: empty/pending states
### Checkpoint D
- [x] Story 4 · themes · 375 px

## Phase 5 — Contextual tools
- [x] T18 Anticoag compass (reversal, hold/restart per source)
- [x] T19 LEDD & NPO conversion (needs LEDD source file)
- [x] T20 Titration schedule print + missed-dose message
### Checkpoint E
- [x] Per-source compass columns · clean print · disclaimer in copies

## Phase 6 — System
- [x] T21 Offline PWA (scope `/neurorx`) — Verify: story 7
- [x] T22 Label-watch GitHub Action → PR
- [x] T23 NeuroRx section in existing `/admin`
- [x] T24 In-app extractor (admin) with quote-guard
### Checkpoint F
- [x] Offline reload · manual dispatch opens PR · admin shows queue/drafts · fabricated quote nulled

## Phase 7 — Waves 2–4 & release
- [x] T25 Wave 2 (chronic epilepsy, neuromuscular, neuroimmunology) — batches ≤ 8 + interactions/tools + verification
- [x] T26 Wave 3 (movement disorders, dementia, novel) — batches ≤ 8 + interactions/tools + verification
- [x] T27 Wave 4 (headache, neuropathic, spasticity, neuro-infectious) — batches ≤ 8 + interactions/tools + verification
- [x] T28 Hardening & release check
### Checkpoint G — v1 Done
- [x] SPEC §11 success criteria all met
