# Spec: NeuroRx v1 — Neuro Drugs & Dosing (CDSS)

> Status: **APPROVED v1.0 (2026-11-11)** · Owner/clinical reviewer: user (neurologist) · Map: [`CAPABILITY-MAP-neurorx.md`](./CAPABILITY-MAP-neurorx.md)
> Input: `Plan_for_NeuroRx.md` (v0 ideas) + clarification Q&A (2026-11-11).

## 1. Objective

A clinical decision support tool for neurology & stroke physicians, used **personally / within one department**, offline-capable, English UI, that answers in < 10 seconds at the bedside:
- What dose, for this weight and renal function, in which VN-marketed product (tablets/vials, ml, ml/h)?
- Is this regimen safe (interactions, myasthenia worsening, pregnancy/lactation)?
- How to hold/restart antithrombotics, reverse anticoagulation in ICH, keep Parkinson patients on dopaminergic therapy while NPO?

**Non-goals (v1):** patient-facing app, storing patient data, commercial distribution, Code Stroke mode, TDM calculators, immunization passport, Vancomycin, runtime AI answers, Supabase.

### User stories (acceptance-level)
1. Typing `keppra 60kg crcl 35` opens Levetiracetam with weight 60 and CrCl 35 pre-filled and the matching renal band highlighted.
2. With weight empty, dose cards show only the rule (e.g. "X mg/kg, max Y mg") — **never a computed number**.
3. Entering age, sex, weight, SCr (µmol/L) computes CrCl (Cockcroft-Gault) and states the formula and weight basis used.
4. Adding Carbamazepine + Apixaban to the regimen shows a red curated alert with source, management, and "Simulate swap" buttons; clicking replaces the tag and re-runs analysis.
5. A drug in `draft` status shows name + "Pending verification" and no dosing numbers anywhere (cards, omnibar, drawer, print, copy).
6. Every displayed numeric clinical value can show its source (title, section, quote) in one click.
7. App works fully with network disabled after first load.

## 2. Tech Stack
Existing repo `d:\NeuroPulse`: Next.js 16.4 App Router (`src/app`), React 19, TypeScript 7, Tailwind 4, Zustand 5, lucide-react. Tests: Node test runner (`tests/*.test.mjs`, `--experimental-strip-types`). CI: GitHub Actions (`.github/workflows`). **No new runtime dependencies without approval** (validator written in plain TS).

> Next.js 16 has breaking changes: before writing route/metadata/PWA code, read `node_modules/next/dist/docs/` (notably `01-app/02-guides/progressive-web-apps.md`, `03-api-reference/03-file-conventions/01-metadata/manifest.md`).

## 3. Commands
```
Dev:       npm run dev
Build:     npm run build
Test:      npm test
Validate:  npm run rx:validate          # schema + provenance + hash checks on data/neurorx
Quotes:    npm run rx:check-quotes      # every verbatim quote must exist in its source text
Verify:    npm run rx:verify -- <drug_id> --by "<Name>"   # draft → verified, stamps hash/date
```
(`rx:*` scripts are added in `rx-data-core`.)

## 4. Project Structure
```
data/neurorx/
  sources/            → source PDFs + extracted .txt (one per source_id)   [user-provided]
  sources.json        → source registry
  tall-man.json       → official ISMP/FDA Tall Man list (verbatim, sourced)
  drugs/<drug_id>.json→ one record per drug
  interactions.json   → curated DDI pairs
  updates_queue.json  → written by rx-update-watch
src/app/neurorx/      → route (layout.tsx, page.tsx)
src/components/neurorx/admin/ → NeuroRx section mounted inside existing /admin
src/components/neurorx/ → UI components (tabs/, drug/, tools/)
src/lib/neurorx/      → engine (pure TS): patient.ts, dosing.ts, infusion.ts, interactions.ts, ledd.ts, omnibar.ts, tallman.ts, orderText.ts
src/types/neurorx.ts  → shared types
scripts/neurorx/      → validate.ts, verify.ts, check-quotes.ts, watch-labels.ts
tests/neurorx*.test.mjs
.github/workflows/neurorx_label_watch.yml
```

## 5. Data Contract (anti-hallucination core)

```ts
type SourceRef = { source_id: string; locator: string; quote: string }; // quote = verbatim, ≤ 400 chars
type Sourced<T> = { value: T | null; refs: SourceRef[]; note?: string };
// RULE: value !== null  ⇒  refs.length ≥ 1   (validator error otherwise)
// RULE: value === null  ⇒  UI shows "No recommendation in sources"

type Source = {
  id: string; type: "fda_label"|"smpc"|"guideline"|"registry"|"lactmed"|"vn_national_formulary"|"dav_registration"|"bhyt_list"|"ismp"|"review";
  title: string; publisher: string; year: number; version?: string; // e.g. SPL set_id + version
  url?: string; file?: string; accessed: string; license_note?: string;
};

type DrugRecord = {
  id: string; generic_name: string; tall_man: Sourced<string>; // only from tall-man.json (ISMP/FDA)
  classes: string[]; subspecialties: Subspecialty[];
  vn_products: Sourced<{ brand: string; strength: string; form: string; registration_no?: string }[]>;
  bhyt: Sourced<{ listed: boolean; conditions?: string }>;
  regimens: Regimen[];                 // computable dose rules (see below)
  renal_basis: Sourced<"cg_abw"|"cg_normalized_1_73"|"egfr">; // as stated by the source
  hepatic: Sourced<string>; black_box: Sourced<string[]>;
  mg_safety: Sourced<"safe"|"caution"|"may_worsen"|"avoid">;
  ng_tube: Sourced<{ crushable: boolean; instructions: string }>;
  pgx: Sourced<string>; ae_tags: Sourced<AdverseEffectTag[]>;  // controlled vocabulary
  enzyme_profile: Sourced<EnzymeProfile>; // inducer/inhibitor/substrate, qt_risk, serotonergic, acb
  reproductive?: ReproductiveRecord; tools?: ContextualToolsData; novel?: NovelTherapyData;
  links?: EcosystemLinks;
  status: "draft"|"verified"|"retired";
  verification: { verified_by: string|null; verified_at: string|null; content_hash: string|null };
};

type Regimen = {
  id: string; indication: string; setting: "acute_inpatient"|"maintenance_outpatient";
  route: "IV"|"PO"|"IM"|"SC"|"NG"; refs: SourceRef[];
  dose: { kind: "fixed"|"per_kg"; amount: number; unit: "mg"|"mcg"|"g"|"IU"|"mL";
          frequency: string; max_single?: number; max_daily?: number;
          infusion?: { diluent?: string; final_concentration?: string; duration_min?: number; max_rate?: string } };
  renal_bands?: { min: number|null; max: number|null; dose_text: string; dose?: Regimen["dose"]; refs: SourceRef[] }[];
  hemodialysis?: Sourced<string>;
};

type ReproductiveRecord = {
  tier: Sourced<"preferred"|"caution"|"avoid">;
  mcm: { registry: string; percent: number; ci95?: string; n_exposed?: number; dose_stratum?: string; refs: SourceRef[] }[]; // never merged across registries
  folic_acid: Sourced<string>; pregnancy_pk: Sourced<string>; postpartum: Sourced<string>;
  contraception: Sourced<string>; lactation_rid: Sourced<string>; lactation_summary: Sourced<string>;
};
```
Interaction: `{ a, b, severity: "contraindicated"|"major"|"moderate"|"minor", mechanism, effect, management, alternatives: {drug_id, rationale, switch_note}[], refs }` — one severity value, no ranges.

**Verification hash:** `content_hash` = SHA-256 of the record minus `verification`. If the stored hash ≠ current hash, the record is treated as `draft` at runtime and `rx:validate` fails in CI. Any edit therefore requires re-verification.

## 6. Clinical Engine Rules
- Engine files contain **zero clinical constants** except universal formulas (Cockcroft-Gault, unit conversions SCr µmol/L ÷ 88.4 = mg/dL, BSA Mosteller). All doses, caps, bands, conversion factors (LEDD) come from data.
- Inputs empty ⇒ no computed dose. Out-of-range inputs (weight < 2 or > 300 kg, age < 0 or > 120, SCr ≤ 0) ⇒ validation error, no output.
- Renal band selection uses the drug's `renal_basis`; if basis = normalized 1.73 m² and height missing ⇒ warn and do not auto-select.
- Rounding: display rule from data; never round past a cap; caps always shown when applied ("capped at max").
- Pediatric dosing out of scope: age < 18 ⇒ banner "Adult dosing only".
- Mechanism flags (CYP/P-gp, serotonergic, QT, ACB) are labelled **"Review suggested — mechanism-based"**, never assigned a curated severity.

## 7. UI / Design Rules
- Match NeuroCase visual language (light `#F8FAFC`, Night Shift `#0F172A`, `rounded-2xl`, `border-slate-200/80`), reuse [`AdminButton`](src/components/ecosystem/AdminButton.tsx), [`AppSwitcher`](src/components/ecosystem/AppSwitcher.tsx), and [`vietnamese-search.ts`](src/lib/vietnamese-search.ts) for accent-insensitive search on VN brand names.
- Single centered column `max-w-5xl mx-auto px-4`; two dose cards side-by-side ≥ md, stacked on mobile.
- Progressive disclosure: Tier 1 header + patient bar; Tier 2 two dose cards; Tier 3 tool buttons + accordions + audit trail footer.
- Tall Man only from `tall-man.json`; otherwise plain generic name.
- Color is never the only signal (icons + text labels for red/amber/green). WCAG AA contrast in both themes. Touch targets ≥ 44 px.
- Global disclaimer (footer + copied/printed text): "Reference only. Verify against current product labelling. Prescriber is responsible." Copied orders contain no patient identifiers.
- "Simulate swap" (not "safe swap"): shows switch note/cross-titration before replacing.

## 8. Testing Strategy
- Unit (Node test runner): engine functions with table-driven cases (CG, unit conversion, per-kg + cap, band edges at exact boundaries, empty inputs, HD toggle, infusion ml/h, LEDD sums, omnibar parsing).
- Data tests: `rx:validate` + `rx:check-quotes` run in `npm test` and CI.
- Gating test: no numeric dose rendered for draft or hash-mismatched records (render-level test via engine selectors).
- Manual checkpoint per tab in both themes, mobile width 375 px, offline mode.

## 9. Boundaries
- **Always:** cite a source for every clinical value; keep `null` when the source is silent; run `npm test` + `npm run build` before declaring a task done; read Next 16 docs before route/PWA code; keep VN units (µmol/L) as primary input.
- **Ask first:** adding dependencies; changing the data contract; adding a drug outside the agreed wave list; changing severity of a curated interaction; any Supabase work; touching other apps' code beyond the AppSwitcher link / AdminButton reuse.
- **Never:** write clinical numbers from model memory; set `status: "verified"` or `verified_by` (only the human via `rx:verify`); merge MCM values across registries; invent Tall Man casing; use DrugBank Academic, CredibleMeds list content, or the retired RxNav interaction API; send patient data to any server; show computed doses with empty inputs.

## 10. Data Waves (proposal — user confirms list before each wave)
| Wave | Scope (~drugs) | Examples |
|---|---|---|
| 1 | Stroke / ICU / anticoagulation / acute seizures (~25) | alteplase, tenecteplase, apixaban, rivaroxaban, dabigatran, edoxaban, warfarin, aspirin, clopidogrel, ticagrelor, nicardipine, labetalol, nimodipine, idarucizumab, 4F-PCC, vitamin K, protamine, levetiracetam, valproate, phenytoin, phenobarbital, lacosamide, midazolam, diazepam, atorvastatin |
| 2 | Chronic epilepsy + neuromuscular/neuroimmunology (~22) | carbamazepine, oxcarbazepine, lamotrigine, topiramate, perampanel, brivaracetam, clobazam, pyridostigmine, prednisolone, methylprednisolone, azathioprine, mycophenolate, rituximab, IVIG, eculizumab, ravulizumab, efgartigimod |
| 3 | Movement disorders + dementia (~20) | levodopa/carbidopa, levodopa/benserazide, pramipexole, ropinirole, rotigotine, rasagiline, amantadine, entacapone, donepezil, rivastigmine, memantine, lecanemab, donanemab, quetiapine, clozapine |
| 4 | Headache, neuropathic pain, spasticity, neuro-infectious (~20) | sumatriptan, propranolol, amitriptyline, flunarizine, erenumab, galcanezumab, fremanezumab, rimegepant, onabotulinumtoxinA, gabapentin, pregabalin, duloxetine, baclofen, tizanidine, acyclovir |

## 11. Success Criteria (v1 done)
- All 13 modules implemented; `npm test`, `npm run rx:validate`, `npm run rx:check-quotes`, `npm run build` pass.
- Wave 1 fully verified by the clinical reviewer; Waves 2–4 at least drafted with 100% quote-check pass.
- All 7 user stories pass manually; Lighthouse PWA installable; offline reload works.
- Zero numeric clinical values in `src/` outside universal formulas (grep check in CI).

## 12. Decisions Log (resolved open questions — 2026-11-11)
1. **Language:** everything in English, including patient-facing outputs (titration schedules, missed-dose instructions). No translation layer.
2. **BHYT & DAV:** `bhyt` and `vn_products[].registration_no` stay `null` ("No data yet") until the user provides source files. `vn_products` brand/strength may be filled only from a provided source (e.g. label/package insert of the VN product); otherwise `null`.
3. **Wave 1 list:** as in §10 (provisional; may be amended per wave).
4. **Severity mapping:** label wording "avoid concomitant use" / "avoid co-administration" ⇒ `contraindicated`. "Contraindicated" ⇒ `contraindicated`. Dose adjustment / monitoring required ⇒ `major` or `moderate` per source wording; the mapping used is recorded in the interaction's `refs[].quote`.
5. **Admin:** integrated as a new `"neurorx"` section in the existing `/admin` page (`adminTab` union in `src/app/admin/page.tsx`), reusing existing passcode auth. No `/neurorx/admin` route. (Project structure §4 `src/app/neurorx/admin/` is therefore dropped.)

## 13. Open Questions
None blocking. New questions are raised per task via "Ask first" boundaries.
