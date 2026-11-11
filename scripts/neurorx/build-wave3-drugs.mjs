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
// BATCH 3A: MOVEMENT DISORDERS & PARKINSON'S DISEASE
// ============================================================================

// 1. LEVODOPA-CARBIDOPA
function buildLevodopaCarbidopa() {
  const id = "levodopa-carbidopa";
  const sId = "fda-levodopa-carbidopa-label";

  const qInd = getQuote(id, "treatment of Parkinson's disease, post-encephalitic parkinsonism", 180);
  const qDose = getQuote(id, "optimum daily dosage of SINEMET must be determined", 180);
  const qContra = getQuote(id, "Nonselective monoamine oxidase (MAO) inhibitors are contraindicated", 180);
  const qAE = getQuote(id, "most common adverse reactions reported with SINEMET have included dyskinesias", 180);

  return {
    id,
    generic_name: "carbidopa/levodopa",
    tall_man: {
      value: "carbidopa/levodopa",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["dopamine precursor / dopa decarboxylase inhibitor", "antiparkinson agent"],
    subspecialties: ["movement_disorders", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "cd-ld-initial-titration",
        indication: "Parkinson's Disease (Idiopathic, Post-encephalitic, or Symptomatic)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 100,
          unit: "mg",
          frequency: "three times daily (levodopa 100 mg / carbidopa 25 mg)",
          max_daily: 800,
        },
        dose_text: "Initial starting dose: one tablet of carbidopa/levodopa 25/100 mg three times daily. Titrate by adding one tablet every day or every other day as needed up to a daily dosage of 8 tablets of 25/100 mg (200/800 mg/day). At least 70 to 100 mg of carbidopa daily is required to prevent peripheral dopa decarboxylation side effects.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Decarboxylation occurs in peripheral tissues; no specific dosage adjustment in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "No deleterious effect on neuromuscular junction transmission; safe in myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets can be crushed and administered via enteral feeding tube or dissolved in ascorbic acid solution. Extended-release formulations (Sinemet CR) must not be crushed.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "confusion_delirium", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Levodopa is the metabolic precursor of dopamine that crosses the blood-brain barrier and is decarboxylated to dopamine in the striatum. Carbidopa inhibits peripheral dopa decarboxylase, increasing central levodopa availability without crossing the blood-brain barrier.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "peripheral aromatic L-amino acid decarboxylase (AADC) and catechol-O-methyltransferase (COMT)",
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
        value: "Levodopa crosses the placenta; limited human pregnancy data suggest low malformation risk, but evaluate maternal motor benefit vs fetal safety.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Levodopa inhibits prolactin secretion and may suppress lactation; excretion in human milk is documented.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 2. PRAMIPEXOLE
function buildPramipexole() {
  const id = "pramipexole";
  const sId = "fda-pramipexole-label";

  const qInd = getQuote(id, "extended-release tablets are indicated for the treatment of Parkinson's disease", 180);
  const qDose = getQuote(id, "Starting dose is 0.375 mg given once daily", 220);
  const qRenal = getQuote(id, "In patients with moderate renal impairment (creatinine clearance between 30 and 50 mL/min)", 200);
  const qSleep = getQuote(id, "falling asleep while engaged in activities of daily living", 180);
  const qCrush = getQuote(id, "Tablets must be swallowed whole and must not be chewed, crushed, or divided", 180);

  return {
    id,
    generic_name: "pramipexole",
    tall_man: {
      value: "pramipexole",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["non-ergot dopamine agonist", "D2/D3 receptor agonist", "antiparkinson agent"],
    subspecialties: ["movement_disorders"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "prami-pd-er",
        indication: "Parkinson's Disease (Monotherapy or Adjunct to Levodopa)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 0.375,
          unit: "mg",
          frequency: "once daily in morning",
          max_single: 4.5,
          max_daily: 4.5,
        },
        dose_text: "Extended-release: Starting dose is 0.375 mg once daily. Titrate gradually no more frequently than every 5-7 days: Week 2: 0.75 mg/day; Week 3: 1.5 mg/day; Week 4: 2.25 mg/day; Week 5: 3 mg/day (max 4.5 mg/day). In immediate-release, dose is given TID (initial 0.125 mg TID up to max 1.5 mg TID).",
        renal_bands: [
          {
            min: 30,
            max: 50,
            dose_text: "CrCl 30 to 50 mL/min: Take ER tablets initially every other day (0.375 mg Q48H); evaluate tolerability before advancing.",
            dose: {
              kind: "fixed",
              amount: 0.375,
              unit: "mg",
              frequency: "every other day",
              max_daily: 2.25,
            },
            refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
          },
        ],
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    hepatic: {
      value: "Excreted ~90% unchanged in urine; hepatic impairment is not expected to significantly alter clearance.",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Non-ergot dopamine agonist with no neuromuscular junction blockade",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Extended-release tablets (ER) must be swallowed whole and must not be chewed, crushed, or divided. Immediate-release tablets can be crushed if necessary for enteral tube feeding.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qCrush }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["sedation_somnolence", "psychiatric_behavioral", "confusion_delirium", "weight_gain"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qSleep }],
    },
    mechanism_of_action: {
      value: "Non-ergot dopamine agonist with high relative in vitro specificity and full intrinsic activity at dopamine D2 and D3 receptor sub-types, preferentially stimulating postsynaptic D3 striatal receptors.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        elimination: "renal tubular secretion via organic cation transport (OCT) system; inhibited by cimetidine",
      },
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "In animal studies, caused embryonic loss and inhibition of implantation; limited human pregnancy data available.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Dopamine agonism inhibits prolactin secretion and lactation; avoid during breastfeeding.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 3. ROPINIROLE
function buildRopinirole() {
  const id = "ropinirole";
  const sId = "fda-ropinirole-label";

  const qInd = getQuote(id, "non-ergoline dopamine agonist indicated for the treatment of Parkinson’s disease", 180);
  const qDose = getQuote(id, "recommended starting dose is 0.25 mg taken three times daily", 180);
  const qCYP = getQuote(id, "CYP1A2: May alter the clearance of ropinirole", 200);
  const qSleep = getQuote(id, "falling asleep while engaged in activities of daily living", 180);

  return {
    id,
    generic_name: "ropinirole",
    tall_man: {
      value: "ropinirole",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "ISMP Tall Man: ropiniROLE vs risperiDONE; generic name lowercase per EXTRACTION.md",
    },
    classes: ["non-ergot dopamine agonist", "D2/D3 receptor agonist", "antiparkinson agent"],
    subspecialties: ["movement_disorders"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "rop-pd-titration",
        indication: "Parkinson's Disease (Early Monotherapy or Adjunctive to Levodopa)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 0.25,
          unit: "mg",
          frequency: "three times daily",
          max_single: 8,
          max_daily: 24,
        },
        dose_text: "Starting dose: 0.25 mg three times daily (0.75 mg/day). Titrate weekly: Week 2: 0.5 mg TID; Week 3: 0.75 mg TID; Week 4: 1 mg TID. Then increase by up to 1.5 mg/day weekly up to 9 mg/day, and by up to 3 mg/day weekly up to maximum 24 mg/day.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Extensively metabolized in liver by CYP1A2; use with caution in hepatic impairment.",
      refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qCYP }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "No adverse effect on neuromuscular junction transmission",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release film-coated tablets can be crushed and administered via enteral tube. Extended-release tablets (Requip XL) must not be crushed.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["sedation_somnolence", "psychiatric_behavioral", "confusion_delirium"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qSleep }],
    },
    mechanism_of_action: {
      value: "Non-ergoline dopamine agonist with high in vitro specificity for dopamine D2 and D3 receptors, stimulating postsynaptic dopamine receptors in the corpus striatum.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp1a2: "substrate",
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
        value: "In animal studies, ropinirole disrupted implantation and caused digit malformations; avoid during pregnancy unless clinical need is compelling.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Inhibits prolactin secretion and suppresses lactation; contraindicated or avoided during nursing.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 4. RASAGILINE
function buildRasagiline() {
  const id = "rasagiline";
  const sId = "fda-rasagiline-label";

  const qInd = getQuote(id, "AZILECT (rasagiline tablets) is indicated for the treatment of Parkinson’s disease", 180);
  const qDose = getQuote(id, "Monotherapy: AZILECT 1 mg once daily", 180);
  const qMAO = getQuote(id, "irreversible inhibitor of MAO-B in platelets", 180);
  const qAE = getQuote(id, "May cause serotonin syndrome when used with antidepressants", 180);

  return {
    id,
    generic_name: "rasagiline",
    tall_man: {
      value: "rasagiline",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["MAO-B inhibitor", "irreversible monoamine oxidase inhibitor", "antiparkinson agent"],
    subspecialties: ["movement_disorders"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ras-pd-monotherapy",
        indication: "Parkinson's Disease (Monotherapy or Adjunct to Levodopa)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 1,
          unit: "mg",
          frequency: "once daily",
          max_single: 1,
          max_daily: 1,
        },
        dose_text: "Monotherapy: 1 mg once daily. Adjunct to levodopa: initiate at 0.5 mg once daily; if sufficient clinical response is not achieved, may increase to 1 mg once daily. When added to levodopa, levodopa dose reduction may be required to reduce dyskinesia.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Mild hepatic impairment: recommended dose is 0.5 mg once daily. Moderate to severe hepatic impairment: contraindicated.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Selective MAO-B inhibitor without adverse neuromuscular junction blockade",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Tablets may be crushed and administered via enteral feeding tube.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "serotonin_syndrome", "confusion_delirium"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Selective, irreversible inhibitor of monoamine oxidase type B (MAO-B), preventing the central enzymatic breakdown of dopamine and increasing striatal synaptic dopamine levels.",
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qMAO }],
    },
    enzyme_profile: {
      value: {
        cyp1a2: "substrate",
      },
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qMAO }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Limited human pregnancy data; animal studies showed decreased pup survival and weight at high exposures.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human milk unknown; may inhibit prolactin secretion due to enhanced dopaminergic tone.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 5. ENTACAPONE
function buildEntacapone() {
  const id = "entacapone";
  const sId = "fda-entacapone-label";

  const qInd = getQuote(id, "adjunct to levodopa and carbidopa to treat end-of-dose", 180);
  const qDose = getQuote(id, "recommended dose of entacapone is one 200 mg tablet administered concomitantly", 200);
  const qAE = getQuote(id, "Urine discoloration 10 0 BODY AS A WHOLE", 180);

  return {
    id,
    generic_name: "entacapone",
    tall_man: {
      value: "entacapone",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["COMT inhibitor", "catechol-O-methyltransferase inhibitor", "antiparkinson agent"],
    subspecialties: ["movement_disorders"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ent-pd-adjunct",
        indication: "Parkinson's Disease with End-of-Dose 'Wearing-Off' Motor Fluctuations",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 200,
          unit: "mg",
          frequency: "with each dose of levodopa/carbidopa",
          max_single: 200,
          max_daily: 1600,
        },
        dose_text: "200 mg taken concomitantly with each dose of carbidopa/levodopa, up to a maximum of 8 times daily (1600 mg/day). Levodopa dose may need reduction by 10-30% upon initiation to prevent dyskinesias. Harmless brownish-orange urine discoloration is common.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Metabolized extensively in liver; caution should be exercised when administering to patients with biliary obstruction or hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Selective peripheral COMT inhibitor without adverse effect on neuromuscular junction transmission",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Film-coated tablets may be crushed and administered via enteral feeding tube immediately prior to or with carbidopa/levodopa.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "confusion_delirium"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Reversible and selective inhibitor of catechol-O-methyltransferase (COMT) in peripheral tissues, preventing the O-methylation of levodopa to 3-O-methyldopa (3-OMD) and increasing the area under the curve (AUC) of levodopa reaching the brain.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        ugt: ["UGT1A9"],
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
        value: "In animal studies, entacapone crossed the placental barrier; human pregnancy data are lacking.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into animal milk; human milk excretion unknown. Use caution during breastfeeding.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 6. AMANTADINE
function buildAmantadine() {
  const id = "amantadine";
  const sId = "fda-amantadine-label";

  const qInd = getQuote(id, "treatment of dyskinesia in patients with Parkinson's disease", 180);
  const qDose = getQuote(id, "initial daily dosage is 137 mg; after 1 week, increase to the recommended daily dosage of 274 mg", 200);
  const qRenal = getQuote(id, "moderate and severe renal impairment", 180);
  const qPsych = getQuote(id, "Hallucinations/Psychotic Behavior: Patients with major psychotic disorder", 200);

  return {
    id,
    generic_name: "amantadine",
    tall_man: {
      value: "amantadine",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["NMDA receptor antagonist", "dopamine reuptake inhibitor", "antiparkinson agent"],
    subspecialties: ["movement_disorders", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ama-pd-dyskinesia",
        indication: "Levodopa-Induced Dyskinesia & 'Off' Episodes in Parkinson's Disease",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 137,
          unit: "mg",
          frequency: "once daily at bedtime",
          max_single: 274,
          max_daily: 274,
        },
        dose_text: "Extended-release: Initial dose 137 mg orally once daily at bedtime; after 1 week, increase to recommended maintenance dose of 274 mg once daily at bedtime. Immediate-release amantadine is dosed at 100 mg BID (max 400 mg/day). Do not discontinue abruptly due to risk of neuroleptic malignant-like syndrome.",
        renal_bands: [
          {
            min: 30,
            max: 59,
            dose_text: "Moderate renal impairment (eGFR 30 to 59 mL/min/1.73 m²): Initial 68.5 mg at bedtime; after 1 week, increase to 137 mg once daily at bedtime.",
            dose: {
              kind: "fixed",
              amount: 68.5,
              unit: "mg",
              frequency: "once daily at bedtime",
              max_daily: 137,
            },
            refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
          },
        ],
      },
    ],
    renal_basis: {
      value: "kdigo_ckd_epi",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    hepatic: {
      value: "Excreted largely unchanged by the kidneys (85-90%); hepatic impairment has minimal effect on clearance.",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Weak peripheral anticholinergic and NMDA receptor blocking effects; monitor for exacerbation in myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Extended-release capsules (Gocovri) should be swallowed whole; capsules may be opened and sprinkled on applesauce immediately before swallowing without chewing. Immediate-release capsules can be dissolved in water.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "confusion_delirium", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qPsych }],
    },
    mechanism_of_action: {
      value: "Weak, non-competitive antagonist of NMDA-type glutamate receptors, also stimulating dopamine release and inhibiting dopamine reuptake in central striatal pathways.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        elimination: "primarily excreted unchanged in urine by glomerular filtration and tubular secretion",
      },
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    reproductive: {
      tier: {
        value: "avoid",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Teratogenic in animal studies (cardiovascular and skeletal malformations); avoid during pregnancy unless potential benefit justifies risk.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into human milk; may cause vomiting, rash, and urinary retention in breastfed infants and suppresses lactation.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 7. TRIHEXYPHENIDYL
function buildTrihexyphenidyl() {
  const id = "trihexyphenidyl";
  const sId = "fda-trihexyphenidyl-label";

  const qInd = getQuote(id, "adjunct in the treatment of all forms of parkinsonism", 180);
  const qDose = getQuote(id, "Dosage should be individualized. The initial dose should be low and then increased gradually", 200);
  const qAE = getQuote(id, "Minor side effects, such as dryness of the mouth, blurred vision, dizziness", 180);
  const qContra = getQuote(id, "contraindicated in patients with hypersensitivity to trihexyphenidyl", 180);

  return {
    id,
    generic_name: "trihexyphenidyl",
    tall_man: {
      value: "trihexyphenidyl",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anticholinergic agent", "muscarinic antagonist", "antiparkinson agent"],
    subspecialties: ["movement_disorders"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "thp-pd-tremor",
        indication: "Parkinsonian Tremor & Medication-Induced Extrapyramidal Symptoms (Dystonia)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 1,
          unit: "mg",
          frequency: "once to three times daily",
          max_single: 5,
          max_daily: 15,
        },
        dose_text: "Initial starting dose: 1 mg daily. Gradually increase by 2 mg increments at intervals of 3 to 5 days, up to a total of 6 to 10 mg daily in 3 divided doses with meals. Avoid in elderly patients (>65 years) due to high risk of acute delirium, confusion, memory impairment, and urinary retention (Beer's Criteria).",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Metabolized by liver; use with caution in hepatic impairment.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "contraindicated",
      refs: [{ source_id: sId, locator: "CONTRAINDICATIONS", quote: qContra }],
      note: "Potent central and peripheral anticholinergic (ACB = 3); directly antagonizes acetylcholine receptor transmission and exacerbates myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets can be crushed; oral elixir (2 mg/5 mL) is available for enteral administration.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["confusion_delirium", "psychiatric_behavioral", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Synthetic tertiary amine muscarinic receptor antagonist that exerts a direct inhibitory effect upon the parasympathetic nervous system and central cholinergic striatal pathways, rebalancing the dopamine-acetylcholine ratio.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "hepatic hydroxylation and glucuronidation",
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
        value: "Animal reproduction studies have not been conducted with trihexyphenidyl; give to a pregnant woman only if clearly needed.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "May inhibit lactation due to anticholinergic effects on prolactin; excretion in human milk unknown.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// ============================================================================
// BATCH 3B: DEMENTIA & NOVEL ANTI-AMYLOID BIOLOGICS
// ============================================================================

// 8. DONEPEZIL
function buildDonepezil() {
  const id = "donepezil";
  const sId = "fda-donepezil-label";

  const qInd = getQuote(id, "ARICEPT is indicated for the treatment of dementia of the Alzheimer’s type", 180);
  const qDose = getQuote(id, "Mild to Moderate Alzheimer’s Disease: 5 mg to 10 mg once daily", 200);
  const qCholine = getQuote(id, "succinylcholine-type muscle relaxation during anesthesia", 180);
  const qAE = getQuote(id, "Nausea and Vomiting ARICEPT, as a predictable consequence", 180);

  return {
    id,
    generic_name: "donepezil",
    tall_man: {
      value: "donepezil",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["acetylcholinesterase inhibitor", "reversible AChEI", "anti-dementia agent"],
    subspecialties: ["dementia"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "don-ad-mild-moderate",
        indication: "Alzheimer's Disease (Mild, Moderate, or Severe Dementia)",
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
          frequency: "once daily at bedtime",
          max_single: 23,
          max_daily: 23,
        },
        dose_text: "Mild to moderate AD: Initial dose is 5 mg once daily at bedtime. May increase to 10 mg once daily after 4 to 6 weeks. Severe AD: 10 mg once daily; may increase to 23 mg once daily after at least 3 months on 10 mg daily. Take with or without food. Monitor for symptomatic bradycardia and syncope.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Metabolized by CYP2D6 and CYP3A4; clearance in mild to moderate hepatic impairment is decreased but no formal dose modification is mandated.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qCholine }],
      note: "Centrally selective reversible AChEI; can cause additive cholinergic stimulation or paradoxical cholinergic crisis if used with pyridostigmine",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "5 mg and 10 mg tablets can be crushed and administered via enteral feeding tube or orally disintegrating tablets (ODT) placed on tongue. 23 mg tablets must be swallowed whole and not crushed.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["weight_loss", "confusion_delirium", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Reversible inhibitor of the enzyme acetylcholinesterase, augmenting cholinergic neurotransmission in the cerebral cortex and hippocampus.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp2d6: "substrate",
        cyp3a4: "substrate",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "There are no adequate and well-controlled studies in pregnant women; use during pregnancy only if the potential benefit justifies potential fetal risk.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human breast milk is unknown; not recommended during nursing.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 9. RIVASTIGMINE
function buildRivastigmine() {
  const id = "rivastigmine";
  const sId = "fda-rivastigmine-label";

  const qInd = getQuote(id, "dementia of the Alzheimer’s type (AD). ( 1.1 ) • Mild-to-moderate dementia associated with Parkinson’s disease", 200);
  const qDose = getQuote(id, "intact skin for a 24-hour period; replace with a new patch every 24 hours", 180);
  const qAE = getQuote(id, "EXELON PATCH can cause gastrointestinal adverse reactions, including significant nausea", 180);

  return {
    id,
    generic_name: "rivastigmine",
    tall_man: {
      value: "rivastigmine",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["acetylcholinesterase & butyrylcholinesterase inhibitor", "pseudo-irreversible carbamate AChEI", "anti-dementia agent"],
    subspecialties: ["dementia", "movement_disorders"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "riv-ad-patch",
        indication: "Alzheimer's Disease or Parkinson's Disease Dementia",
        setting: "maintenance_outpatient",
        route: "TD",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 4.6,
          unit: "mg",
          frequency: "once daily (replace every 24 hours)",
          max_single: 13.3,
          max_daily: 13.3,
        },
        dose_text: "Transdermal patch: Initial dose 4.6 mg/24 hours patch applied once daily to clean, intact skin. After a minimum of 4 weeks, increase to recommended maintenance dose of 9.5 mg/24 hours. May increase to 13.3 mg/24 hours in severe dementia. Rotate application sites daily (upper/lower back, upper arm, chest); do not apply to same site for 14 days. Transdermal formulation significantly reduces gastrointestinal adverse effects.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "In patients with mild to moderate hepatic impairment, maximum recommended dose of transdermal patch is 4.6 mg/24 hours.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Inhibits AChE and BuChE; caution with concomitant pyridostigmine to avoid cholinergic excess",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Transdermal patch applied to intact skin; oral solution (2 mg/mL) is available for enteral feeding tube administration if required.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["weight_loss", "confusion_delirium", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Carbamate-derivative pseudoirreversible inhibitor of acetylcholinesterase and butyrylcholinesterase, slowing the degradation of acetylcholine released by functional cholinergic neurons.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "hydrolyzed by cholinesterase enzymes; independent of hepatic cytochrome P450 enzymes (low DDI risk)",
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
        value: "No adequate human data; in animal studies, no teratogenicity was observed.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human milk unknown; weigh clinical benefits against potential infant cholinergic adverse effects.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 10. MEMANTINE
function buildMemantine() {
  const id = "memantine";
  const sId = "fda-memantine-label";

  const qInd = getQuote(id, "treatment of moderate to severe dementia of the Alzheimer’s type", 180);
  const qDose = getQuote(id, "starting dose of memantine hydrochloride extended-release capsules is 7 mg once daily", 200);
  const qRenal = getQuote(id, "renal impairment: the recommended maintenance dose of memantine hydrochloride extended-release capsules is 14 mg once daily", 220);
  const qAE = getQuote(id, "dizziness. (6.1) To report SUSPECTED ADVERSE REACTIONS", 180);

  return {
    id,
    generic_name: "memantine",
    tall_man: {
      value: "memantine",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["uncompetitive NMDA receptor antagonist", "neuroprotective agent", "anti-dementia agent"],
    subspecialties: ["dementia"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "mem-ad-moderate-severe",
        indication: "Moderate to Severe Alzheimer's Disease Dementia",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 7,
          unit: "mg",
          frequency: "once daily",
          max_single: 28,
          max_daily: 28,
        },
        dose_text: "Extended-release: Initial dose is 7 mg once daily. Titrate in 7 mg weekly increments: Week 2: 14 mg/day; Week 3: 21 mg/day; Week 4: target 28 mg once daily. For immediate-release: initial 5 mg daily, titrate weekly to target 10 mg BID (20 mg/day). May be taken with or without food.",
        renal_bands: [
          {
            min: 5,
            max: 29,
            dose_text: "Severe renal impairment (CrCl 5 to 29 mL/min): Recommended target dose is 14 mg/day for extended-release capsules (or 5 mg twice daily for immediate-release).",
            dose: {
              kind: "fixed",
              amount: 14,
              unit: "mg",
              frequency: "once daily",
              max_daily: 14,
            },
            refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
          },
        ],
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "No dosage adjustment needed in mild or moderate hepatic impairment; caution in severe hepatic impairment.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Uncompetitive NMDA antagonist without significant peripheral neuromuscular blockade",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Extended-release capsules should not be crushed; capsules may be opened and the intact beads sprinkled on applesauce immediately before swallowing. Immediate-release tablets can be crushed; oral solution (2 mg/mL) is available for enteral feeding tubes.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["confusion_delirium", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Low- to moderate-affinity, uncompetitive, voltage-dependent NMDA receptor antagonist that binds to NMDA open channels, blocking pathological tonic levels of glutamate that lead to excitotoxicity without interfering with physiological neurotransmission.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        elimination: "primarily excreted unchanged in urine (~48%); alkalinization of urine (carbonic anhydrase inhibitors, sodium bicarbonate) markedly decreases clearance",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Animal reproduction studies showed adverse embryofetal effects at maternally toxic doses; no adequate human pregnancy data.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human milk unknown; evaluate maternal benefit vs infant risk.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 11. LECANEMAB
function buildLecanemab() {
  const id = "lecanemab";
  const sId = "fda-lecanemab-label";

  const qBox = getQuote(id, "AMYLOID RELATED IMAGING ABNORMALITIES Monoclonal antibodies directed against aggregated forms of beta amyloid, including LEQEMBI", 240);
  const qInd = getQuote(id, "treatment of Alzheimer’s disease. Treatment with LEQEMBI should be initiated in patients with mild cognitive impairment", 200);
  const qDose = getQuote(id, "10 mg/kg once every 2 weeks administered after dilution", 180);
  const qARIA = getQuote(id, "baseline brain magnetic resonance imaging (MRI) prior to initiating treatment", 180);

  return {
    id,
    generic_name: "lecanemab",
    tall_man: {
      value: "lecanemab",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anti-amyloid beta monoclonal antibody", "disease-modifying biologic", "targeted Alzheimer's biologic"],
    subspecialties: ["dementia"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "lec-ad-biweekly",
        indication: "Mild Cognitive Impairment (MCI) or Mild Dementia due to Alzheimer's Disease (Amyloid Positive)",
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
          frequency: "once every two weeks",
          max_single: 1200,
        },
        dose_text: "10 mg/kg IV infusion over approximately 1 hour every 2 weeks. Confirm presence of amyloid-beta pathology prior to initiation. Mandatory brain MRI monitoring protocol: baseline MRI within 1 year; safety monitoring MRIs prior to the 5th (Week 9), 7th (Week 13), and 14th (Week 27) infusions. ApoE epsilon 4 genotyping strongly recommended prior to initiation due to substantially higher ARIA risk in homozygotes.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Degraded into small peptides and amino acids by catabolic pathways; no dosage adjustment required.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: {
      value: [
        "AMYLOID RELATED IMAGING ABNORMALITIES (ARIA): ARIA-E (BRAIN EDEMA/EFFUSION) AND ARIA-H (MICROHEMORRHAGES AND SUPERFICIAL SIDEROSIS).",
        "APOE EPSILON 4 HOMOZYGOTES HAVE SUBSTANTIALLY HIGHER INCIDENCE AND SEVERITY OF ARIA AND INTRACEREBRAL HEMORRHAGE.",
        "MANDATORY BASELINE BRAIN MRI AND SCHEDULED SAFETY MRIS PRIOR TO 5TH, 7TH, AND 14TH INFUSIONS.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Humanized IgG1 monoclonal antibody targeting amyloid-beta; no neuromuscular junction blocking activity",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous infusion only; strictly not for oral or enteral feeding tube administration.",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    pgx: {
      value: "Testing for ApoE epsilon 4 status should be performed prior to initiation of treatment to inform the risk of developing ARIA; ApoE e4 homozygotes have the highest risk of ARIA-E (33%) and symptomatic ARIA.",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    ae_tags: {
      value: ["confusion_delirium"],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mechanism_of_action: {
      value: "Recombinant humanized IgG1 monoclonal antibody that selectively binds to soluble amyloid-beta protofibrils and fibrillar aggregates, clearing neurotoxic amyloid deposits and slowing clinical cognitive decline.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "cellular catabolism into small peptides and amino acids via general proteolytic pathways",
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
        value: "Crosses the placenta in late pregnancy; Alzheimer's disease predominantly affects post-reproductive populations.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human milk unknown; evaluate clinical necessity.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 12. DONANEMAB
function buildDonanemab() {
  const id = "donanemab";
  const sId = "fda-donanemab-label";

  const qBox = getQuote(id, "AMYLOID RELATED IMAGING ABNORMALITIES Monoclonal antibodies directed against aggregated forms of beta amyloid, including KISUNLA", 240);
  const qInd = getQuote(id, "treatment of Alzheimer's disease. Treatment with KISUNLA should be initiated in patients with mild cognitive impairment", 200);
  const qDose = getQuote(id, "700 mg Infusion 3: 1,050 mg Infusion 4 and beyond: 1,400 mg Consider stopping dosing with KISUNLA based on reduction of", 220);
  const qARIA = getQuote(id, "baseline brain magnetic resonance imaging (MRI) prior to initiating treatment", 180);

  return {
    id,
    generic_name: "donanemab",
    tall_man: {
      value: "donanemab",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anti-amyloid beta monoclonal antibody", "plaque-specific targeted biologic", "disease-modifying biologic"],
    subspecialties: ["dementia"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "don-ad-monthly",
        indication: "Mild Cognitive Impairment or Mild Dementia due to Alzheimer's Disease (Amyloid Positive)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 700,
          unit: "mg",
          frequency: "every 4 weeks × 3 doses, then 1400 mg every 4 weeks",
          max_single: 1400,
          max_daily: 1400,
        },
        dose_text: "700 mg IV infusion over 30 minutes every 4 weeks for the first 3 doses (Weeks 0, 4, 8), followed by 1400 mg IV every 4 weeks thereafter. Treatment may be paused or discontinued upon confirmed amyloid plaque clearance on PET imaging. Mandatory brain MRI monitoring: baseline within 1 year; safety MRIs prior to the 2nd, 3rd, 4th, and 7th infusions. ApoE epsilon 4 genotyping recommended prior to treatment.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Proteolytic catabolism; no dosage adjustment in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: {
      value: [
        "AMYLOID RELATED IMAGING ABNORMALITIES (ARIA): ARIA-E (BRAIN EDEMA/SWELLING) AND ARIA-H (MICROHEMORRHAGES AND SUPERFICIAL SIDEROSIS).",
        "APOE EPSILON 4 HOMOZYGOTES EXPERIENCE SUBSTANTIALLY HIGHER INCIDENCE AND SEVERITY OF ARIA.",
        "MANDATORY BASELINE BRAIN MRI AND SCHEDULED SAFETY MRIS PRIOR TO 2ND, 3RD, 4TH, AND 7TH INFUSIONS.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "safe",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Plaque-specific IgG1 monoclonal antibody without neuromuscular junction activity",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous infusion only; strictly not for oral or enteral feeding tube administration.",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    pgx: {
      value: "Testing for ApoE epsilon 4 status should be performed prior to initiation of treatment to inform the risk of developing ARIA; homozygotes have the highest risk.",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    ae_tags: {
      value: ["confusion_delirium"],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mechanism_of_action: {
      value: "Humanized IgG1 monoclonal antibody directed specifically against N-terminally truncated pyroglutamate-amyloid beta (pGlu-Abeta), an epitope present selectively within established brain amyloid plaques, clearing plaques through microglial phagocytosis.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        metabolism: "cleared by reticuloendothelial proteolysis into peptides and amino acids",
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
        value: "IgG1 antibodies cross the placenta; no human pregnancy data. Target population is post-reproductive.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human milk unknown; evaluate clinical benefit vs infant risk.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

function main() {
  console.log("Generating Wave 3 (Movement Disorders & Dementia) drug files with verified verbatim quotes...");
  // Batch 3A
  writeDrug(buildLevodopaCarbidopa());
  writeDrug(buildPramipexole());
  writeDrug(buildRopinirole());
  writeDrug(buildRasagiline());
  writeDrug(buildEntacapone());
  writeDrug(buildAmantadine());
  writeDrug(buildTrihexyphenidyl());

  // Batch 3B
  writeDrug(buildDonepezil());
  writeDrug(buildRivastigmine());
  writeDrug(buildMemantine());
  writeDrug(buildLecanemab());
  writeDrug(buildDonanemab());

  console.log("🎉 All 12 Wave 3 drug files generated successfully!");
}

main();
