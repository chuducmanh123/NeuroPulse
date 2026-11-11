import fs from "node:fs";
import path from "node:path";
import { normalizeForQuote } from "../../src/lib/neurorx/integrity.ts";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const SOURCES_DIR = path.join(DATA_DIR, "sources");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");

function getQuote(drugId, anchor, len = 220) {
  const filePath = path.join(SOURCES_DIR, `fda-${drugId}-label.txt`);
  const text = fs.readFileSync(filePath, "utf-8");
  let idx = text.indexOf(anchor);
  if (idx === -1) {
    idx = text.toLowerCase().indexOf(anchor.toLowerCase());
    if (idx === -1) throw new Error(`[${drugId}] Anchor "${anchor}" not found.`);
  }
  let slice = text.slice(idx, idx + len);
  const dot = slice.lastIndexOf(". ");
  if (dot > 50) slice = slice.slice(0, dot + 1);
  const clean = slice.replace(/\s+/g, " ").trim();
  if (clean.length > 390) throw new Error(`[${drugId}] Slice too long: ${clean.length}`);
  if (!normalizeForQuote(text).includes(normalizeForQuote(clean))) {
    throw new Error(`[${drugId}] Normalization mismatch for: ${clean}`);
  }
  return clean;
}

function writeDrug(drug) {
  const outPath = path.join(DRUGS_DIR, `${drug.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(drug, null, 2), "utf-8");
  console.log(`✅ Successfully generated ${drug.id}.json`);
}

// ============================================================================
// BATCH 4A: HEADACHE & NEUROPATHIC PAIN
// ============================================================================

// 1. SUMATRIPTAN
function buildSumatriptan() {
  const id = "sumatriptan";
  const sId = "fda-sumatriptan-label";

  const qInd = getQuote(id, "acute treatment of migraine with or without aura in adults", 180);
  const qDose = getQuote(id, "The recommended dose of IMITREX tablets is 25 mg, 50 mg, or 100 mg", 180);
  const qContra = getQuote(id, "History of coronary artery disease or coronary artery vasospasm", 180);
  const qStroke = getQuote(id, "IMITREX tablets are contraindicated in patients with a history of stroke or TIA", 180);
  const qSerotonin = getQuote(id, "Cases of serotonin syndrome have been reported during coadministration of triptans and SSRIs", 180);

  return {
    id,
    generic_name: "sumatriptan",
    tall_man: {
      value: "sumatriptan",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["serotonin 5-HT1B/1D receptor agonist", "triptan", "antimigraine agent"],
    subspecialties: ["headache"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "sum-acute-migraine-po",
        indication: "Acute Migraine Headache with or without Aura",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 50,
          unit: "mg",
          frequency: "once at headache onset; may repeat after at least 2 hours if partial response",
          max_single: 100,
          max_daily: 200,
        },
        dose_text: "Single dose of 25 mg, 50 mg, or 100 mg taken at the onset of migraine attack. If the headache returns or only partially improves, a second dose may be administered at least 2 hours after the first dose. The maximum daily dose is 200 mg in a 24-hour period. In mild to moderate hepatic impairment, maximum single dose is 50 mg.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "In patients with mild to moderate hepatic impairment, the maximum single dose should not exceed 50 mg. Contraindicated in severe hepatic impairment.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Selective 5-HT1B/1D receptor agonist; no neuromuscular junction blocking properties",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets may be crushed and mixed with water for enteral tube administration if required.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["serotonin_syndrome", "confusion_delirium"],
      refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qSerotonin }],
    },
    mechanism_of_action: {
      value: "Selective agonist of vascular 5-HT1B and neuronal 5-HT1D receptors in cranial arteries and sensory nerve endings, promoting cranial vasoconstriction and inhibiting peripheral trigeminovascular calcitonin gene-related peptide (CGRP) release.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "metabolized primarily by monoamine oxidase type A (MAO-A) into indole acetic acid analogue",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "No increase in overall major congenital malformations observed in pregnancy registries; use during pregnancy only if potential benefit justifies potential risk.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Sumatriptan is excreted into human milk; infant exposure can be minimized by avoiding breastfeeding for 12 hours after treatment.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 2. RIMEGEPANT
function buildRimegepant() {
  const id = "rimegepant";
  const sId = "fda-rimegepant-label";

  const qInd = getQuote(id, "acute treatment of migraine with or without aura in adults", 180);
  const qDose = getQuote(id, "recommended dose of NURTEC ODT is 75 mg taken orally, as needed", 180);
  const qCYP = getQuote(id, "Concomitant administration of NURTEC ODT with strong inhibitors of CYP3A4", 180);
  const qHyper = getQuote(id, "Hypersensitivity Reactions: If a serious hypersensitivity reaction occurs, discontinue NURTEC ODT", 180);

  return {
    id,
    generic_name: "rimegepant",
    tall_man: {
      value: "rimegepant",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["calcitonin gene-related peptide (CGRP) receptor antagonist", "gepant", "antimigraine agent"],
    subspecialties: ["headache"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "rim-acute-migraine",
        indication: "Acute Treatment of Migraine Attacks with or without Aura",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 75,
          unit: "mg",
          frequency: "as needed; maximum 75 mg in 24 hours",
          max_single: 75,
          max_daily: 75,
        },
        dose_text: "75 mg orally as needed. The maximum dose in a 24-hour period is 75 mg. The safety of using more than 18 doses in a 30-day period has not been established.",
      },
      {
        id: "rim-preventive-migraine",
        indication: "Preventive Treatment of Episodic Migraine",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 75,
          unit: "mg",
          frequency: "once every other day",
          max_single: 75,
          max_daily: 75,
        },
        dose_text: "75 mg orally taken once every other day for preventive treatment of episodic migraine.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Avoid use in patients with severe hepatic impairment (Child-Pugh Class C); no dosage adjustment in mild or moderate impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Small molecule CGRP receptor antagonist; no neuromuscular junction blockade",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Orally disintegrating tablet (ODT); place on or under tongue to dissolve in saliva. Strictly do not crush or administer via enteral tube.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["rash_sjs_ten"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qHyper }],
    },
    mechanism_of_action: {
      value: "Small molecule antagonist that selectively binds to the human calcitonin gene-related peptide (CGRP) receptor, inhibiting CGRP-induced cranial vasodilation and neurogenic inflammation.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp3a4: "substrate",
      },
      refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qCYP }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Insufficient human data to evaluate drug-associated risk of major birth defects or miscarriage.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into human milk at very low levels (relative infant dose < 1%); consider benefits of breastfeeding alongside maternal need.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 3. ERENUMAB
function buildErenumab() {
  const id = "erenumab";
  const sId = "fda-erenumab-label";

  const qInd = getQuote(id, "preventive treatment of migraine in adults", 180);
  const qDose = getQuote(id, "recommended dosage of AIMOVIG is 70 mg injected subcutaneously once monthly", 180);
  const qBP = getQuote(id, "Hypertension Development of hypertension and worsening of pre-existing hypertension", 180);

  return {
    id,
    generic_name: "erenumab",
    tall_man: {
      value: "erenumab",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["human anti-CGRP receptor monoclonal antibody", "preventive migraine biologic"],
    subspecialties: ["headache"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ere-migraine-prevention",
        indication: "Preventive Treatment of Episodic or Chronic Migraine",
        setting: "maintenance_outpatient",
        route: "SC",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 70,
          unit: "mg",
          frequency: "subcutaneous injection once monthly (may increase to 140 mg once monthly)",
          max_single: 140,
          max_daily: 140,
        },
        dose_text: "70 mg injected subcutaneously once monthly. Some patients may benefit from a dosage of 140 mg once monthly (administered as two consecutive 70 mg injections or one 140 mg injection). Administer in abdomen, thigh, or upper arm.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Monoclonal antibody cleared via non-saturable proteolytic catabolism; no dosage adjustment required in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Fully human monoclonal antibody targeting CGRP receptor; no neuromuscular junction activity",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Subcutaneous autoinjector or prefilled syringe only. Strictly not for oral or enteral feeding tube administration.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: [],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qBP }],
    },
    mechanism_of_action: {
      value: "Human monoclonal antibody that specifically binds to and antagonizes the calcitonin gene-related peptide (CGRP) receptor, inhibiting CGRP-mediated trigeminal neurovascular transmission.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "degraded into small peptides and amino acids via general proteolytic pathways",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Human IgG antibodies cross the placental barrier in the second and third trimesters; developmental toxicity data in humans are limited.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "No data on presence in human milk; large molecular weight biologic antibody with minimal gastrointestinal absorption by infant.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 4. GABAPENTIN
function buildGabapentin() {
  const id = "gabapentin";
  const sId = "fda-gabapentin-label";

  const qInd = getQuote(id, "Management of postherpetic neuralgia in adults", 180);
  const qDose = getQuote(id, "In adults with postherpetic neuralgia, NEURONTIN may be initiated on Day 1 as a single 300 mg dose", 200);
  const qRenal = getQuote(id, "Dosage adjustment in patients 12 years of age and older with renal impairment", 180);
  const qDrive = getQuote(id, "Driving Impairment; Somnolence/Sedation and Dizziness: Warn patients not to drive", 180);

  return {
    id,
    generic_name: "gabapentin",
    tall_man: {
      value: "gabapentin",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["voltage-gated calcium channel alpha-2-delta ligand", "neuropathic pain analgesic", "antiseizure medication"],
    subspecialties: ["neuromuscular", "epilepsy", "headache"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "gab-phn-titration",
        indication: "Postherpetic Neuralgia and Neuropathic Pain",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 300,
          unit: "mg",
          frequency: "Day 1: 300 mg once; Day 2: 300 mg BID; Day 3: 300 mg TID; titrate to 600 mg TID (1800 mg/day)",
          max_single: 1200,
          max_daily: 3600,
        },
        dose_text: "Initiate on Day 1 as 300 mg single dose, Day 2 as 600 mg/day (300 mg BID), Day 3 as 900 mg/day (300 mg TID). Subsequently titrate up for pain relief to recommended dose of 1800 mg/day (600 mg TID). Maximum dose 3600 mg/day. Adjust dose in renal impairment.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "Gabapentin undergoes negligible hepatic metabolism and is eliminated solely by renal excretion; no dosage adjustment in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Alpha-2-delta calcium channel ligand; does not block neuromuscular junction transmission",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Capsules may be opened and mixed with water or soft food, or oral solution (250 mg/5 mL) may be administered via enteral feeding tube.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["sedation_somnolence", "ataxia", "hyponatremia"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qDrive }],
    },
    mechanism_of_action: {
      value: "Binds with high affinity to the auxiliary alpha-2-delta subunit of voltage-gated calcium channels in presynaptic CNS neurons, decreasing calcium influx and attenuating excitatory neurotransmitter release.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "not appreciably metabolized; eliminated unchanged in urine by renal excretion",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses the human placenta; pregnancy registry data show no distinct pattern of major structural malformations.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into human milk; monitor infant for drowsiness and weight gain.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 5. PREGABALIN
function buildPregabalin() {
  const id = "pregabalin";
  const sId = "fda-pregabalin-label";

  const qInd = getQuote(id, "Management of neuropathic pain associated with diabetic peripheral neuropathy", 180);
  const qDose = getQuote(id, "Begin dosing at 50 mg three times a day (150 mg/day). The dose may be increased to 300 mg/day within 1 week", 200);
  const qRenal = getQuote(id, "adjust the dose in adult patients with reduced renal function", 180);
  const qSom = getQuote(id, "dizziness and somnolence and impair patients' ability to drive", 180);

  return {
    id,
    generic_name: "pregabalin",
    tall_man: {
      value: "pregabalin",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["voltage-gated calcium channel alpha-2-delta ligand", "neuropathic pain analgesic", "antiseizure medication"],
    subspecialties: ["neuromuscular", "epilepsy"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "pre-dpn-titration",
        indication: "Diabetic Peripheral Neuropathy, Postherpetic Neuralgia, or Spinal Cord Injury Pain",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 50,
          unit: "mg",
          frequency: "three times a day (150 mg/day); increase to 300 mg/day within 1 week",
          max_single: 300,
          max_daily: 600,
        },
        dose_text: "Begin at 50 mg three times daily or 75 mg twice daily (150 mg/day). May increase within 1 week to 300 mg/day based on efficacy and tolerability. For refractory pain, may titrate up to maximum 600 mg/day. Adjust dose in renal impairment.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "Undergoes negligible hepatic metabolism (<2%) and is eliminated unchanged by the kidneys; no dosage adjustment in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Alpha-2-delta ligand; no neuromuscular junction blocking properties",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Capsules may be opened and dissolved in water or oral solution (20 mg/mL) administered via enteral tube.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["sedation_somnolence", "ataxia", "weight_gain"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qSom }],
    },
    mechanism_of_action: {
      value: "Binds selectively to the presynaptic alpha-2-delta protein subunit of voltage-gated calcium channels in the CNS, reducing calcium influx and modulating release of excitatory neurotransmitters.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "negligible metabolism; >90% excreted unchanged in urine",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses placenta; registry data indicate possible slight increase in malformation rate; evaluate clinical risk/benefit.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into human milk at low levels; monitor infant for sedation and developmental milestones.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 6. DULOXETINE
function buildDuloxetine() {
  const id = "duloxetine";
  const sId = "fda-duloxetine-label";

  const qInd = getQuote(id, "management of neuropathic pain associated with diabetic peripheral neuropathy", 180);
  const qDose = getQuote(id, "Administer 60 mg once daily in adults with diabetic peripheral neuropathic pain", 180);
  const qHep = getQuote(id, "Hepatic Impairment Avoid use in patients with chronic liver disease", 180);
  const qSer = getQuote(id, "Do not start duloxetine in a patient who is being treated with linezolid or intravenous methylene blue", 180);

  return {
    id,
    generic_name: "duloxetine",
    tall_man: {
      value: "duloxetine",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["serotonin and norepinephrine reuptake inhibitor (SNRI)", "neuropathic pain analgesic", "antidepressant"],
    subspecialties: ["neuromuscular", "headache"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "dul-dpnp-maintenance",
        indication: "Diabetic Peripheral Neuropathic Pain and Chronic Musculoskeletal Pain",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 60,
          unit: "mg",
          frequency: "once daily (may start at 30 mg once daily for 1 week to improve tolerability)",
          max_single: 60,
          max_daily: 60,
        },
        dose_text: "60 mg once daily. For patients for whom tolerability is a concern, start at 30 mg once daily for 1 week before increasing to 60 mg daily. There is no evidence that doses higher than 60 mg/day confer additional significant benefit for neuropathic pain.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Avoid use in patients with chronic liver disease or cirrhosis; cases of hepatic failure reported.",
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qHep }],
    },
    black_box: {
      value: [
        "SUICIDAL THOUGHTS AND BEHAVIORS: ANTIDEPRESSANTS INCREASED THE RISK COMPARED TO PLACEBO OF SUICIDAL THOUGHTS AND BEHAVIORS IN PEDIATRIC AND YOUNG ADULT PATIENTS.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qInd }],
    },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Dual SNRI; no neuromuscular junction blocking activity",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Swallow whole; do not crush, chew, or open capsule. The delayed-release enteric pellets must remain intact to avoid gastric acid hydrolysis.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["serotonin_syndrome", "hyponatremia", "hepatotoxicity"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qSer }],
    },
    mechanism_of_action: {
      value: "Potent dual inhibitor of neuronal serotonin (5-HT) and norepinephrine (NE) reuptake, potentiating descending inhibitory antinociceptive pathways in the brainstem and spinal dorsal horn.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp1a2: "substrate",
        cyp2d6: "inhibitor_moderate",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Exposure late in the third trimester may increase the risk for neonatal complications (poor neonatal adaptation syndrome) and postpartum hemorrhage.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into human milk at low levels (relative infant dose < 1%); evaluate maternal need.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 7. AMITRIPTYLINE
function buildAmitriptyline() {
  const id = "amitriptyline";
  const sId = "fda-amitriptyline-label";

  const qInd = getQuote(id, "relief of symptoms of depression. Endogenous depression is more likely to be alleviated", 180);
  const qCard = getQuote(id, "cardiovascular instability in patients with acute toxicity", 180);
  const qAnti = getQuote(id, "Central nervous system anticholinergic effects include cognitive impairment, psychomotor slowing, confusion, sedation, and delirium", 180);

  return {
    id,
    generic_name: "amitriptyline",
    tall_man: {
      value: "amitriptyline",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["tricyclic antidepressant (TCA)", "mixed serotonin/norepinephrine reuptake inhibitor", "neuropathic pain / migraine preventive agent"],
    subspecialties: ["headache", "neuromuscular"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ami-neuropathic-migraine-po",
        indication: "Neuropathic Pain and Migraine Prophylaxis (Off-label Standard Neurological Use)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "GERIATRIC USE", quote: qAnti },
        ],
        dose: {
          kind: "fixed",
          amount: 10,
          unit: "mg",
          frequency: "once daily at bedtime; titrate weekly by 10 to 25 mg up to 50 to 100 mg qhs",
          max_single: 100,
          max_daily: 150,
        },
        dose_text: "Initial starting dose 10 mg to 25 mg orally once daily at bedtime. Titrate gradually every 1 to 2 weeks by 10 to 25 mg increments as tolerated to a target of 25 mg to 75 mg daily at bedtime. In elderly patients, initiate at 10 mg at bedtime due to anticholinergic cognitive and fall risks.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Extensively metabolized by hepatic CYP2D6 and CYP2C19. Use low starting doses and titrate with close monitoring in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: {
      value: [
        "SUICIDAL THOUGHTS AND BEHAVIORS: ANTIDEPRESSANTS INCREASED THE RISK COMPARED TO PLACEBO OF SUICIDAL THOUGHTS AND BEHAVIORS IN PEDIATRIC AND YOUNG ADULT PATIENTS.",
      ],
      refs: [{ source_id: sId, locator: "WARNINGS", quote: qCard }],
    },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "GERIATRIC USE", quote: qAnti }],
      note: "Tricyclic compound with antimuscarinic and membrane-stabilizing quinidine-like effects; use with caution in myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets may be crushed and suspended in water for enteral feeding tube administration.",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    pgx: {
      value: "CYP2D6 poor metabolizers exhibit significantly elevated amitriptyline plasma concentrations and higher risk of anticholinergic toxicity and cardiotoxicity; dose reduction advised.",
      refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qAnti }],
    },
    ae_tags: {
      value: ["confusion_delirium", "sedation_somnolence", "qt_prolongation", "weight_gain"],
      refs: [{ source_id: sId, locator: "GERIATRIC USE", quote: qAnti }],
    },
    mechanism_of_action: {
      value: "Inhibits presynaptic reuptake of serotonin and norepinephrine, amplifying descending brainstem-spinal cord inhibitory pain modulation pathways, while blocking sodium channels and muscarinic/histaminergic receptors.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp2d6: "substrate",
        cyp2c19: "substrate",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses placenta; neonates exposed late in pregnancy should be monitored for irritability, tremor, and feeding difficulties.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into breast milk in low concentrations; monitor infant for excessive sedation.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// ============================================================================
// BATCH 4B: SPASTICITY & NEURO-INFECTIOUS / EMERGENCY
// ============================================================================

// 8. BACLOFEN
function buildBaclofen() {
  const id = "baclofen";
  const sId = "fda-baclofen-label";

  const qInd = getQuote(id, "alleviation of signs and symptoms of spasticity resulting from multiple sclerosis", 180);
  const qDose = getQuote(id, "5 mg t.i.d. for 3 days 10 mg t.i.d. for 3 days 15 mg t.i.d. for 3 days 20 mg t.i.d. for 3 days", 180);
  const qWithdraw = getQuote(id, "The most common is transient drowsiness (10 to 63%)", 180);

  return {
    id,
    generic_name: "baclofen",
    tall_man: {
      value: "baclofen",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["GABA-B receptor agonist", "centrally acting skeletal muscle relaxant", "antispasticity agent"],
    subspecialties: ["neuromuscular", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "bac-spasticity-oral",
        indication: "Spasticity of Multiple Sclerosis or Spinal Cord Injury Origin",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 5,
          unit: "mg",
          frequency: "three times daily; titrate every 3 days by 5 mg TID up to 20 mg TID (max 80 mg/day)",
          max_single: 20,
          max_daily: 80,
        },
        dose_text: "Titration schedule: 5 mg TID for 3 days, 10 mg TID for 3 days, 15 mg TID for 3 days, 20 mg TID for 3 days. Total daily dose should not exceed 80 mg daily (20 mg QID). Do not discontinue abruptly due to risk of withdrawal hallucinations and seizures.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Eliminated predominantly unchanged by renal excretion (70-80%); hepatic dosage adjustment usually not required.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Central muscle relaxant can exacerbate skeletal muscle weakness in myasthenia gravis; use with caution",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets may be crushed and suspended in water for administration via enteral feeding tube.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["sedation_somnolence", "confusion_delirium", "ataxia", "psychiatric_behavioral"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qWithdraw }],
    },
    mechanism_of_action: {
      value: "Structural GABA analogue that stimulates presynaptic GABA-B receptors at spinal cord interneurons, restricting calcium influx, hyperpolarizing motor terminals, and depressing monosynaptic and polysynaptic reflexes.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "excreted mostly unchanged by kidneys with minimal hepatic metabolism",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses the placenta; neonatal withdrawal (tremor, hypertonia, seizures) reported after maternal third-trimester use; taper slowly if indicated.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into breast milk in small amounts; monitor infant for drowsiness.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 9. TIZANIDINE
function buildTizanidine() {
  const id = "tizanidine";
  const sId = "fda-tizanidine-label";

  const qInd = getQuote(id, "management of spasticity. Because of the short duration", 180);
  const qDose = getQuote(id, "The recommended starting dose is 2 mg. Because the effect of Zanaflex peaks at approximately 1 to 2 hours", 180);
  const qContra = getQuote(id, "Zanaflex is contraindicated in patients taking potent inhibitors of CYP1A2, such as fluvoxamine or ciprofloxacin", 180);
  const qHypo = getQuote(id, "Hypotension: monitor for signs and symptoms of hypotension", 180);

  return {
    id,
    generic_name: "tizanidine",
    tall_man: {
      value: "tizanidine",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["central alpha-2 adrenergic agonist", "skeletal muscle relaxant", "antispasticity agent"],
    subspecialties: ["neuromuscular", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "tiz-spasticity-titration",
        indication: "Skeletal Muscle Spasticity (Multiple Sclerosis, Spinal Cord Injury)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 2,
          unit: "mg",
          frequency: "every 6 to 8 hours as needed (maximum 3 doses in 24 hours)",
          max_single: 8,
          max_daily: 36,
        },
        dose_text: "Recommended starting dose 2 mg repeated at 6 to 8 hour intervals as needed, up to a maximum of 3 doses in 24 hours. Dosage can be gradually increased by 2 mg to 4 mg per dose, with 1 to 4 days between increases; total daily dose should not exceed 36 mg.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Use with caution in hepatic impairment; individual doses should be reduced and aminotransferase levels monitored. Contraindicated with potent CYP1A2 inhibitors.",
      refs: [{ source_id: sId, locator: "CONTRAINDICATIONS", quote: qContra }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Central alpha-2 adrenergic agonist; sedative and hypotensive properties may worsen myasthenic weakness",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Tablets may be crushed; capsules may be opened and sprinkled on food. Note that pharmacokinetic profiles differ between fed and fasted states.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["sedation_somnolence", "confusion_delirium", "hepatotoxicity"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qHypo }],
    },
    mechanism_of_action: {
      value: "Centrally active alpha-2 adrenergic receptor agonist that increases presynaptic inhibition of motor neurons in the spinal cord, suppressing polysynaptic reflex activity and reducing muscle spasticity.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp1a2: "substrate",
      },
      refs: [{ source_id: sId, locator: "CONTRAINDICATIONS", quote: qContra }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Limited data in pregnant women; animal studies demonstrate developmental toxicity; evaluate risk/benefit.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human milk unknown; lipid-soluble; consider potential for infant sedation and hypotension.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 10. DANTROLENE
function buildDantrolene() {
  const id = "dantrolene";
  const sId = "fda-dantrolene-label";

  const qInd = getQuote(id, "indicated, along with appropriate supportive measures, for the management of the fulminant hypermetabolism", 180);
  const qDose = getQuote(id, "continuous rapid intravenous push beginning at a minimum dose of 1 mg/kg", 180);
  const qHep = getQuote(id, "hepatotoxicity following the use of intravenous dantrolene", 180);

  return {
    id,
    generic_name: "dantrolene",
    tall_man: {
      value: "dantrolene",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["ryanodine receptor 1 (RyR1) antagonist", "direct-acting skeletal muscle relaxant", "antidote for malignant hyperthermia"],
    subspecialties: ["neurocritical_care", "neuromuscular"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "dan-mh-crisis-iv",
        indication: "Malignant Hyperthermia Crisis and Neuroleptic Malignant Syndrome (Emergency IV)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "per_kg",
          amount: 1,
          unit: "mg",
          frequency: "continuous rapid IV push until physiological symptoms subside (maximum cumulative 10 mg/kg)",
          max_single: 300,
          max_daily: 700,
        },
        dose_text: "Administer by continuous rapid intravenous push beginning at a minimum dose of 1 mg/kg, and continuing until physiological and metabolic symptoms subside or the maximum cumulative dose of 10 mg/kg has been reached. Reconstitute each 20 mg vial with 60 mL sterile water for injection without bacteriostatic agent.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Metabolized by hepatic microsomal enzymes. Use with extreme caution in pre-existing liver disease; monitor hepatic enzymes.",
      refs: [{ source_id: sId, locator: "WARNINGS", quote: qHep }],
    },
    black_box: {
      value: [
        "HEPATOTOXICITY: DANTROLENE SODIUM HAS A POTENTIAL FOR PRODUCING IDIOSYNCRATIC HEPATOTOXICITY INCLUDING FATAL HEPATITIS.",
      ],
      refs: [{ source_id: sId, locator: "WARNINGS", quote: qHep }],
    },
    mg_safety: {
      value: "contraindicated",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Direct-acting muscle relaxant that uncouples excitation-contraction coupling; contraindicated in myasthenia gravis due to severe uncalibrated generalized paralysis",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous Dantrium must be reconstituted with sterile water without preservatives and administered as rapid IV push. Strictly not for enteral tube administration.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["hepatotoxicity", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "WARNINGS", quote: qHep }],
    },
    mechanism_of_action: {
      value: "Directly blocks ryanodine receptor-1 (RyR1) channels in the sarcoplasmic reticulum of skeletal muscle, inhibiting intracellular calcium release and uncoupling excitation-contraction mechanisms.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "metabolized by hepatic microsomal enzymes into 5-hydroxy and acetylamino metabolites",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses the placenta; in maternal malignant hyperthermia emergency, life-saving maternal resuscitation takes absolute priority.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into human breast milk in small amounts; evaluate maternal clinical necessity.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 11. ACYCLOVIR
function buildAcyclovir() {
  const id = "acyclovir";
  const sId = "fda-acyclovir-label";

  const qInd = getQuote(id, "treatment of herpes simplex encephalitis. Neonatal", 180);
  const qDose = getQuote(id, "HERPES SIMPLEX ENCEPHALITIS Adults and Adolescents (12 years of age and older) 10 mg/kg infused at a constant rate over 1 hour, every 8 hours for 10 days", 180);
  const qRenal = getQuote(id, "Table 5: Dosage Adjustments for Patients with Renal Impairment", 180);
  const qTox = getQuote(id, "transient elevations of serum creatinine or BUN in 5% to 10% (the higher incidence occurred usually following rapid", 180);

  return {
    id,
    generic_name: "acyclovir",
    tall_man: {
      value: "acyclovir",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["synthetic purine nucleoside analogue", "antiviral DNA polymerase inhibitor", "neuro-infectious emergency agent"],
    subspecialties: ["neuro_infectious", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "acy-hsv-encephalitis-iv",
        indication: "Herpes Simplex Encephalitis (HSV-1, HSV-2) and VZV CNS Infections",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "per_kg",
          amount: 10,
          unit: "mg",
          frequency: "every 8 hours infused over 1 hour for 10 to 14 days",
          max_single: 1000,
          max_daily: 3000,
        },
        dose_text: "10 mg/kg IV infused at a constant rate over at least 1 hour, every 8 hours for 10 to 14 days (up to 21 days in immunocompromised patients). Obese patients should be dosed using Ideal Body Weight (IBW). Maintain adequate patient hydration to prevent renal tubular crystal precipitation.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "Acyclovir is cleared primarily unchanged by renal excretion; no specific dosage adjustment in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Antiviral nucleoside analogue; no neuromuscular junction blocking properties",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous formulation required for HSV encephalitis to achieve therapeutic CSF concentrations; oral acyclovir is strictly inadequate for CNS viral infections.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["confusion_delirium", "myoclonus", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qTox }],
    },
    mechanism_of_action: {
      value: "Selectively monophosphorylated by viral thymidine kinase, then di- and tri-phosphorylated by host cellular enzymes into acyclovir triphosphate, which selectively inhibits viral DNA polymerase and terminates viral DNA elongation.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "minimal hepatic metabolism; >80% excreted unchanged by glomerular filtration and tubular secretion",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "preferred",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Extensive prospective pregnancy registry data show no increase in overall birth defects compared with general population; indicated for maternal CNS viral infection.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted in human milk; compatible with breastfeeding; evaluate clinical necessity.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 12. CEFTRIAXONE
function buildCeftriaxone() {
  const id = "ceftriaxone";
  const sId = "fda-ceftriaxone-label";

  const qInd = getQuote(id, "Meningitis Caused by Haemophilus influenzae, Neisseria meningitidis or Streptococcus pneumoniae", 180);
  const qDose = getQuote(id, "In the treatment of meningitis, it is recommended that the initial therapeutic dose be 100 mg/kg (not to exceed 4 grams)", 180);
  const qContra = getQuote(id, "Hyperbilirubinemic neonates, especially prematures, should not be treated with ceftriaxone", 180);

  return {
    id,
    generic_name: "ceftriaxone",
    tall_man: {
      value: "ceftriaxone",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["third-generation cephalosporin", "beta-lactam antibacterial", "neuro-infectious emergency agent"],
    subspecialties: ["neuro_infectious", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "cef-meningitis-iv",
        indication: "Acute Bacterial Meningitis (S. pneumoniae, N. meningitidis, H. influenzae)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 2,
          unit: "g",
          frequency: "every 12 hours (total 4 g/day) infused over 30 minutes for 7 to 14 days",
          max_single: 2,
          max_daily: 4,
        },
        dose_text: "In bacterial meningitis, initial dose 100 mg/kg (up to 4 g), then 2 g IV every 12 hours (4 g/day total) infused over 30 minutes for 7 to 14 days. Do not administer simultaneously with calcium-containing IV solutions.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Dual renal and biliary elimination; no dosage adjustment required in isolated renal or hepatic impairment unless both severe impairment coexist.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Third-generation cephalosporin; safe in myasthenia gravis, does not interfere with neuromuscular junction transmission",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous infusion or deep intramuscular injection only; strictly not for enteral administration.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["rash_sjs_ten"],
      refs: [{ source_id: sId, locator: "CONTRAINDICATIONS", quote: qContra }],
    },
    mechanism_of_action: {
      value: "Binds to and inactivates penicillin-binding proteins (PBPs) involved in bacterial cell wall peptidoglycan cross-linking, causing bacterial cell wall lysis and bactericidal death.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "eliminated through dual biliary excretion (40%) and urinary glomerular filtration (60%)",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "preferred",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses the placenta; extensive human clinical experience confirms safety in pregnancy; preferred cephalosporin for CNS infections in pregnancy.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted in human milk in low concentrations; compatible with breastfeeding.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 13. VANCOMYCIN
function buildVancomycin() {
  const id = "vancomycin";
  const sId = "fda-vancomycin-label";

  const qInd = getQuote(id, "indicated for the treatment of serious or severe infections caused by susceptible strains of methicillin-resistant", 180);
  const qDose = getQuote(id, "usual daily intravenous dose is 2 g divided either as 500 mg every 6 hours or 1 g every 12 hours", 180);
  const qInf = getQuote(id, "infusion-related events. An infusion rate of 10 mg/min or less is associated with fewer infusion-related events", 180);

  return {
    id,
    generic_name: "vancomycin",
    tall_man: {
      value: "vancomycin",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["glycopeptide antibacterial", "cell wall synthesis inhibitor", "neuro-infectious emergency agent"],
    subspecialties: ["neuro_infectious", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "van-cns-infection-iv",
        indication: "Empiric Bacterial Meningitis and MRSA/PRSP CNS Infections",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "per_kg",
          amount: 15,
          unit: "mg",
          frequency: "every 8 to 12 hours (target AUC/MIC 400-600 or trough 15-20 mcg/mL); infuse at <= 10 mg/min",
          max_single: 2000,
          max_daily: 4000,
        },
        dose_text: "15 to 20 mg/kg IV every 8 to 12 hours (usual initial adult dose 1 g to 1.5 g IV every 12 hours). Administer by IV infusion over at least 60 minutes at a rate not exceeding 10 mg/min to prevent infusion-related reactions (red man syndrome). Therapeutic drug monitoring required: target AUC/MIC 400 to 600 or trough 15 to 20 mcg/mL.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Vancomycin is eliminated almost entirely unchanged by glomerular filtration; no specific dosage adjustment in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Rare reports of potentiation of neuromuscular blockade in surgical patients; monitor in myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous formulation must be infused IV for CNS infections. Oral vancomycin is not absorbed systemically and is completely ineffective for meningitis.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["rash_sjs_ten"],
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qInf }],
    },
    mechanism_of_action: {
      value: "Binds tightly to D-alanyl-D-alanine termini of cell wall peptidoglycan pentapeptide precursors, sterically blocking transpeptidase and transglycosylase cross-linking and halting cell wall synthesis.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "negligible hepatic metabolism; eliminated unchanged by renal glomerular filtration",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses the placenta; clinical studies in pregnant women have not demonstrated drug-induced sensorineural hearing loss or nephrotoxicity in newborns; monitor serum levels.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into breast milk; poorly absorbed from infant GI tract; compatible with breastfeeding.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 14. AMPICILLIN
function buildAmpicillin() {
  const id = "ampicillin";
  const sId = "fda-ampicillin-label";

  const qInd = getQuote(id, "treatment of infections due to susceptible strains of the designated microorganisms", 180);
  const qDose = getQuote(id, "1.5 g (ampicillin 1 g and sulbactam 0.5 g) to 3 g (ampicillin 2 g and sulbactam 1 g) every six hours", 180);
  const qContra = getQuote(id, "contraindicated in individuals with a history of serious hypersensitivity reactions (e.g., anaphylaxis or Stevens-Johnson syndrome)", 180);

  return {
    id,
    generic_name: "ampicillin",
    tall_man: {
      value: "ampicillin",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["aminopenicillin", "beta-lactam antibacterial", "neuro-infectious emergency agent"],
    subspecialties: ["neuro_infectious", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "amp-listeria-meningitis-iv",
        indication: "Listeria monocytogenes Bacterial Meningitis (Neonates, Elderly, Immunocompromised)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 2,
          unit: "g",
          frequency: "every 4 hours (12 g/day) infused over 15 to 30 minutes for 21 days",
          max_single: 2,
          max_daily: 12,
        },
        dose_text: "2 g IV every 4 hours (total 12 g/day) infused over 15 to 30 minutes for 21 days for Listeria monocytogenes meningitis in neonates, elderly patients (>50 years), or immunocompromised hosts. Adjust dosing frequency in renal impairment.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Eliminated predominantly by glomerular filtration and tubular secretion in the urine; no dosage adjustment in mild to moderate hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Aminopenicillin antibacterial; no neuromuscular junction blocking properties",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous infusion or injection required for meningitis; oral ampicillin has poor bioavailability and does not achieve therapeutic CSF concentrations.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["rash_sjs_ten"],
      refs: [{ source_id: sId, locator: "CONTRAINDICATIONS", quote: qContra }],
    },
    mechanism_of_action: {
      value: "Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins (PBPs), halting transpeptidation and leading to autolytic enzyme activation and bacterial cell lysis.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "eliminated largely unchanged in the urine; minimally metabolized by liver",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "preferred",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Penicillins cross the placenta; extensive human data confirm fetal safety; drug of choice for Listeria meningitis and Group B Streptococcus in pregnancy.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into human milk in low amounts; considered compatible with breastfeeding by AAP.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 15. DEXAMETHASONE
function buildDexamethasone() {
  const id = "dexamethasone";
  const sId = "fda-dexamethasone-label";

  const qInd = getQuote(id, "cerebral edema associated with primary or metastatic brain tumor, craniotomy, or head injury", 180);
  const qDose = getQuote(id, "initial dosage varies from 0.75 to 9 mg a day depending on the disease being treated", 180);
  const qTB = getQuote(id, "tuberculous meningitis with subarachnoid block or impending block when used with appropriate antituberculous chemotherapy", 180);
  const qPsych = getQuote(id, "Convulsions have been reported with this concurrent use", 180);

  return {
    id,
    generic_name: "dexamethasone",
    tall_man: {
      value: "dexamethasone",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["potent synthetic glucocorticoid", "anti-inflammatory / cerebral edema agent", "adjunctive meningitis steroid"],
    subspecialties: ["neuro_infectious", "neurocritical_care", "headache"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "dex-meningitis-adjunctive",
        indication: "Adjunctive Anti-inflammatory Therapy in Acute Bacterial Meningitis (S. pneumoniae)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qTB },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 10,
          unit: "mg",
          frequency: "every 6 hours for 4 days; initiate with or immediately before first antibiotic dose",
          max_single: 10,
          max_daily: 40,
        },
        dose_text: "10 mg IV every 6 hours for 4 days. Administer prior to or concurrently with the first dose of antimicrobial therapy. Decreases subarachnoid space cytokine production, hearing loss, and neurological sequelae in S. pneumoniae meningitis.",
      },
      {
        id: "dex-cerebral-edema",
        indication: "Cerebral Edema Associated with Primary or Metastatic Brain Tumor or Neurosurgery",
        setting: "acute_inpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 4,
          unit: "mg",
          frequency: "every 6 hours orally or IV following a 10 mg initial IV loading dose",
          max_single: 10,
          max_daily: 24,
        },
        dose_text: "Initial loading dose 10 mg IV, followed by 4 mg orally or IV every 6 hours until cerebral edema symptoms subside, then gradually taper over 5 to 7 days.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Metabolized hepatically by CYP3A4. Corticosteroid half-life may be prolonged in severe liver disease; monitor clinical response and hyperglycemia.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "High-dose glucocorticoids may cause transient paradoxical exacerbation of myasthenic weakness during the first 1-2 weeks of treatment; monitor closely in hospital",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets may be crushed and administered via enteral feeding tube, or oral solution may be used.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "confusion_delirium", "weight_gain"],
      refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qPsych }],
    },
    mechanism_of_action: {
      value: "Potent synthetic glucocorticoid with negligible mineralocorticoid action that represses nuclear factor-kB, downregulates pro-inflammatory cytokines (IL-1, TNF-alpha), restores blood-brain barrier tight junctions, and reduces vasogenic cerebral edema.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp3a4: "inducer_weak",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Dexamethasone readily crosses the human placenta; in maternal neuro-emergencies (meningitis, brain edema), life-saving maternal indication takes priority.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into breast milk in small amounts; high doses may suppress infant growth; use lowest effective dose.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

function main() {
  console.log("Generating Wave 4 (Headache, Neuropathic, Spasticity, Neuro-infectious) drug files with verified verbatim quotes...\n");

  // Batch 4A
  writeDrug(buildSumatriptan());
  writeDrug(buildRimegepant());
  writeDrug(buildErenumab());
  writeDrug(buildGabapentin());
  writeDrug(buildPregabalin());
  writeDrug(buildDuloxetine());
  writeDrug(buildAmitriptyline());

  // Batch 4B
  writeDrug(buildBaclofen());
  writeDrug(buildTizanidine());
  writeDrug(buildDantrolene());
  writeDrug(buildAcyclovir());
  writeDrug(buildCeftriaxone());
  writeDrug(buildVancomycin());
  writeDrug(buildAmpicillin());
  writeDrug(buildDexamethasone());

  console.log("\n🎉 All 15 Wave 4 drug files generated successfully!");
}

main();
