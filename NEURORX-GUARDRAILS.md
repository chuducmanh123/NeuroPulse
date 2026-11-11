# NEURORX GUARDRAILS (read before every NeuroRx task)

> Binding for any agent working on NeuroRx. If a task prompt conflicts with this file or `SPEC-neurorx.md`, STOP and ask the user.
> Ground truth: `SPEC-neurorx.md` (approved v1.0) · `CAPABILITY-MAP-neurorx.md` · `tasks/neurorx-plan.md`.

## G1. Clinical data — zero hallucination
1. NEVER write a clinical number, threshold, schedule, severity, brand, strength, or recommendation from memory. Clinical content may only be **extracted** from a file in `data/neurorx/sources/` registered in `data/neurorx/sources.json`.
2. Every non-null clinical value is a `Sourced<T>` with ≥ 1 `SourceRef { source_id, locator, quote }`. `quote` is copied **verbatim** from the source text (no paraphrase, no translation, ≤ 400 chars).
3. If the source is silent or ambiguous → `value: null` (UI: "No recommendation in sources"). Do not interpolate, extrapolate, convert between populations, or "fill typical values".
4. Different sources disagreeing → keep both as separate entries/refs; never average or merge (e.g. MCM per registry, ASRA vs EHRA hold times).
5. Agents NEVER set `status: "verified"`, `verified_by`, `verified_at`, or `content_hash`. Only the human runs `npm run rx:verify`. New/edited records are always `draft`.
6. Interaction severity mapping (Decision 4): "avoid concomitant use/co-administration" or "contraindicated" ⇒ `contraindicated`; otherwise per source wording. Mechanism-based flags are never given a curated severity.
7. Tall Man casing only from `data/neurorx/tall-man.json` (ISMP/FDA source). Otherwise plain lowercase generic.
8. `bhyt` and `registration_no` stay `null` until the user supplies sources (Decision 2).
9. Forbidden sources: DrugBank Academic content, CredibleMeds list content, retired RxNav interaction API, copyrighted text copied beyond short quotes.

## G2. Code
1. `src/lib/neurorx/**` contains no clinical constants — only universal formulas (Cockcroft-Gault, SCr µmol/L ÷ 88.4, Mosteller BSA) and unit math. Doses/caps/bands/factors come from data.
2. Empty or invalid patient inputs ⇒ no computed dose anywhere (cards, omnibar, copy, print, drawer).
3. Records with `status !== "verified"` or hash mismatch ⇒ treated as draft ⇒ no dosing numbers rendered.
4. Next.js 16 has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before writing routes, metadata, manifest, service worker, or server code.
5. No new dependencies, no Supabase, no edits to other apps beyond: AppSwitcher NeuroRx `href`, mounting the NeuroRx section in `src/app/admin/page.tsx`. Ask first otherwise.
6. Each task touches ≤ ~5 files (data files excepted). Finish with `npm test` and `npm run build` green; report the output.
7. Do not delete or weaken existing tests; do not add `@ts-ignore`/`eslint-disable` to get green.

## G3. UI
1. English only. NeuroCase visual language: light `#F8FAFC`, Night Shift `#0F172A`, cards `rounded-2xl border border-slate-200/80`, sans-serif.
2. Single centered column `max-w-5xl mx-auto px-4`. No 3-column layouts. Two dose cards side-by-side ≥ md, stacked below.
3. Progressive disclosure: Tier 1 (header + patient bar) → Tier 2 (two dose cards) → Tier 3 (tool buttons, accordions, audit trail).
4. Color never the only signal (icon + text). WCAG AA in both themes. Touch targets ≥ 44 px. Test at 375 px width.
5. Disclaimer in footer and in every copied/printed text: "Reference only. Verify against current product labelling. Prescriber is responsible." No patient identifiers in copied/printed output.
6. Do not invent UI elements not in the spec/task (e.g. no "sample prescriptions" rows in Tab 2).

## G4. Done means
Acceptance criteria of the task met · `npm test` + `npm run rx:validate` (once it exists) + `npm run build` pass · short report: files changed, commands run with results, anything left `null` and why, questions for the user.
