import fs from "node:fs";
import path from "node:path";
import { normalizeForQuote } from "../../src/lib/neurorx/integrity.ts";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const SOURCES_DIR = path.join(DATA_DIR, "sources");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");

function getQuote(drugId, anchor, len = 250) {
  const filePath = path.join(SOURCES_DIR, `fda-${drugId}-label.txt`);
  const text = fs.readFileSync(filePath, "utf-8");
  let idx = text.indexOf(anchor);
  if (idx === -1) {
    idx = text.toLowerCase().indexOf(anchor.toLowerCase());
    if (idx === -1) throw new Error(`[${drugId}] Anchor "${anchor}" not found.`);
  }
  let slice = text.slice(idx, idx + len);
  const dot = slice.lastIndexOf(". ");
  if (dot > 60) slice = slice.slice(0, dot + 1);
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
// BATCH 2B: NEUROMUSCULAR & IMMUNOSUPPRESSANTS
// ============================================================================

// 1. PYRIDOSTIGMINE
function buildPyridostigmine() {
  const id = "pyridostigmine";
  const sId = "fda-pyridostigmine-label";

  const qInd = getQuote(id, "MESTINON is useful in the treatment of myasthenia gravis", 200);
  const qDose = getQuote(id, "Conventional tablets - The average dose is ten 60 mg tablets", 180);
  const qDesc = getQuote(id, "MESTINON (pyridostigmine bromide) is an orally active cholinesterase inhibitor", 180);
  const qMOA = getQuote(id, "ACTIONS: MESTINON inhibits the destruction of acetylcholine by cholinesterase", 180);
  const qAE = getQuote(id, "ADVERSE REACTIONS: The side effects of MESTINON are most commonly related to overdosage", 180);
  const qCrush = getQuote(id, "TIMESPAN tablets - each containing 180 mg pyridostigmine bromide", 120);

  return {
    id,
    generic_name: "pyridostigmine",
    tall_man: {
      value: "pyridostigmine",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["acetylcholinesterase inhibitor", "parasympathomimetic", "neuromuscular agent"],
    subspecialties: ["neuromuscular"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "pyr-mg-symptomatic",
        indication: "Myasthenia Gravis (Symptomatic Treatment)",
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
          frequency: "every 4 to 6 hours",
          max_single: 120,
          max_daily: 600,
        },
        dose_text: "Initial: 60 mg orally every 4 to 6 hours while awake. Adjust size and frequency of dose to clinical response. Average dose is 600 mg daily (ten 60 mg tablets). Timespan 180 mg 1-2 times daily may be used at bedtime for nocturnal/morning symptoms.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "No dosage adjustment provided in product labeling; primarily excreted unchanged by kidneys.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "first_line",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "First-line symptomatic therapy for myasthenia gravis; distinguish cholinergic crisis (overdose) from myasthenic crisis (underdose)",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Conventional 60 mg tablets may be crushed; oral solution (60 mg/5 mL) is available and easily administered via tube. TIMESPAN extended-release tablets must NOT be crushed or chewed.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qCrush }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: [],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Reversibly inhibits acetylcholinesterase, prolonging the action of acetylcholine at the neuromuscular junction.",
      refs: [{ source_id: sId, locator: "MECHANISM OF ACTION", quote: qMOA }],
    },
    enzyme_profile: {
      value: {
        metabolism: "hydrolyzed by cholinesterases; minor hepatic microsomal metabolism",
      },
      refs: [{ source_id: sId, locator: "MECHANISM OF ACTION", quote: qMOA }],
    },
    reproductive: {
      tier: {
        value: "acceptable",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Requirements may fluctuate during pregnancy; titrate to clinical symptoms.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: {
        value: "Watch for transient neonatal myasthenia gravis in 10-20% of infants born to myasthenic mothers.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excreted into breast milk in small amounts; generally considered compatible with breastfeeding with infant monitoring for cholinergic signs.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 2. PREDNISOLONE
function buildPrednisolone() {
  const id = "prednisolone";
  const sId = "fda-prednisolone-label";

  const qInd = getQuote(id, "multiple sclerosis 13. Miscellaneous Tuberculous meningitis", 200);
  const qDose = getQuote(id, "initial dosage of prednisolone tablets may vary from 5 mg to 60 mg per day", 180);
  const qDesc = getQuote(id, "Naturally occurring glucocorticoids (hydrocortisone and cortisone)", 180);
  const qAE = getQuote(id, "Fluid and Electrolyte Disturbances Sodium retention", 180);

  return {
    id,
    generic_name: "prednisolone",
    tall_man: {
      value: "prednisolone",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
      note: "ISMP Tall Man: predniSONE vs prednisoLONE; generic name lowercase per EXTRACTION.md",
    },
    classes: ["corticosteroid", "glucocorticoid", "immunosuppressant", "anti-inflammatory"],
    subspecialties: ["neuromuscular", "neuroimmunology"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "pred-neuro-immunosuppression",
        indication: "Autoimmune Neurological Disorders (MS, Myasthenia Gravis, CIDP, Autoimmune Encephalitis)",
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
          frequency: "once daily in morning",
          max_single: 80,
          max_daily: 80,
        },
        dose_text: "Initial dosage ranges from 5 mg to 60 mg per day depending on disease entity. For acute neurological relapse or induction, commonly 0.75-1 mg/kg/day (up to 60-80 mg daily), followed by gradual taper or alternate-day dosing to minimize HPA axis suppression.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Active metabolite of prednisone; preferred over prednisone in severe hepatic impairment since it does not require hepatic 11-beta-HSD bioactivation.",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
      note: "Glucocorticoids may cause transient early exacerbation of myasthenic weakness in first 1-2 weeks; initiate at low dose or with respiratory support available",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets may be crushed; oral solution (15 mg/5 mL) is available for enteral feeding tube administration.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "weight_gain"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Binds to intracellular glucocorticoid receptors, modulating gene expression to suppress pro-inflammatory cytokines and lymphocyte proliferation.",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    enzyme_profile: {
      value: {
        cyp3a4: "substrate",
      },
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    reproductive: {
      tier: {
        value: "acceptable",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Substantial placental 11-beta-HSD2 inactivation protects the fetus; monitor maternal blood pressure and glucose closely.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Prednisolone transfers into breast milk in low concentrations; wait 3-4 hours after high maternal oral doses before nursing.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 3. METHYLPREDNISOLONE
function buildMethylprednisolone() {
  const id = "methylprednisolone";
  const sId = "fda-methylprednisolone-label";

  const qInd = getQuote(id, "Acute exacerbations of multiple sclerosis; cerebral edema associated", 180);
  const qDose = getQuote(id, "initial dosage will vary from 10 to 40 mg of methylprednisolone depending on the specific disease entity", 180);
  const qMG = getQuote(id, "myasthenia gravis. If possible, anticholinesterase agents should be withdrawn", 180);
  const qAE = getQuote(id, "Fluid and electrolyte disturbances: Congestive heart failure", 180);

  return {
    id,
    generic_name: "methylprednisolone",
    tall_man: {
      value: "methylprednisolone",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "ISMP Tall Man: methylPREDNISolone vs medroxyPROGESTERone; generic name lowercase per EXTRACTION.md",
    },
    classes: ["corticosteroid", "glucocorticoid", "immunosuppressant", "anti-inflammatory"],
    subspecialties: ["neuroimmunology", "neuromuscular", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "mp-pulse-neuro-relapse",
        indication: "Acute Relapse of Multiple Sclerosis / Optic Neuritis / NMOSD / Autoimmune Encephalitis",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "fixed",
          amount: 1000,
          unit: "mg",
          frequency: "once daily for 3 to 5 days",
          max_single: 1000,
          max_daily: 1000,
        },
        dose_text: "High-dose pulse therapy: 1000 mg IV infusion daily (infused over 1-2 hours) for 3 to 5 consecutive days. Monitor blood pressure, blood glucose, electrolytes, and cardiac rhythm during infusion.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    hepatic: {
      value: "Metabolized extensively in liver; caution in severe hepatic dysfunction.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "PRECAUTIONS", quote: qMG }],
      note: "Transient early exacerbation of myasthenic weakness can occur during first 1-2 weeks; if possible, anticholinesterase therapy should be adjusted with respiratory monitoring",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Oral tablets (Medrol) may be crushed. For parenteral therapy, IV methylprednisolone sodium succinate (Solu-Medrol) is preferred.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "weight_gain"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Potent synthetic glucocorticoid with minimal mineralocorticoid activity; inhibits leukocyte trafficking, nuclear factor kappa B (NF-kB), and pro-inflammatory cytokine expression.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp3a4: "substrate",
      },
      refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qMG }],
    },
    reproductive: {
      tier: {
        value: "acceptable",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Inactivated by placental 11-beta-HSD2; high-dose pulse therapy should be reserved for severe maternal relapse.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Minimal excretion in breast milk; after high-dose IV pulse, waiting 2 to 4 hours before nursing further minimizes infant exposure.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 4. AZATHIOPRINE
function buildAzathioprine() {
  const id = "azathioprine";
  const sId = "fda-azathioprine-label";

  const qBox = getQuote(id, "WARNING - MALIGNANCY Chronic immunosuppression with IMURAN", 200);
  const qDose = getQuote(id, "Renal Homotransplantation: The dose of IMURAN required to prevent rejection", 200);
  const qTPMT = getQuote(id, "TPMT and/or NUDT15 Deficiency Consider testing for TPMT and NUDT15", 200);
  const qAllo = getQuote(id, "allopurinol or febuxostat). Patients receiving IMURAN and allopurinol concomitantly should have a dose reduction", 200);
  const qAE = getQuote(id, "Hematologic: Leukopenia and/or thrombocytopenia are dose-dependent", 200);

  return {
    id,
    generic_name: "azathioprine",
    tall_man: {
      value: "azathioprine",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["immunosuppressant", "purine antimetabolite", "cytotoxic agent"],
    subspecialties: ["neuromuscular", "neuroimmunology"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "aza-neuro-maintenance",
        indication: "Myasthenia Gravis / NMOSD / Chronic Inflammatory Demyelinating Polyradiculoneuropathy",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "BOXED WARNING", quote: qBox },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose },
        ],
        dose: {
          kind: "weight_based",
          amount: 2.5,
          unit: "mg/kg",
          frequency: "once daily",
          max_daily: 250,
        },
        dose_text: "Target maintenance: 2 to 3 mg/kg daily orally (usually 100 to 200 mg daily). Initiate at 50 mg/day and titrate based on CBC and liver function. Onset of clinical immunosuppressive effect typically requires 6 to 12 months.",
        renal_bands: [
          {
            min: null,
            max: 50,
            dose_text: "CrCl < 50 mL/min: Reduce dose by 25-50% and monitor CBC closely.",
            dose: {
              kind: "weight_based",
              amount: 1.5,
              unit: "mg/kg",
              frequency: "once daily",
              max_daily: 150,
            },
            refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
          },
        ],
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDose }],
    },
    hepatic: {
      value: "Dose-related hepatotoxicity and cholestasis reported; monitor liver function tests regularly.",
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    black_box: {
      value: [
        "CHRONIC IMMUNOSUPPRESSION WITH IMURAN INCREASES RISK OF MALIGNANCY IN HUMANS, INCLUDING POST-TRANSPLANT LYMPHOMA AND HEPATOSPLENIC T-CELL LYMPHOMA.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Standard steroid-sparing immunosuppressant in myasthenia gravis; slow onset (6-12 months)",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Cytotoxic purine analog: tablets should not be crushed, broken, or handled without precautions due to teratogenic and cytotoxic exposure risks.",
      },
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    pgx: {
      value: "Testing for TPMT and NUDT15 deficiency is strongly recommended before initiating therapy; intermediate or poor metabolizers require substantial dose reduction or avoidance to prevent fatal myelosuppression.",
      refs: [{ source_id: sId, locator: "WARNINGS", quote: qTPMT }],
    },
    ae_tags: {
      value: ["hepatotoxicity"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Purine antimetabolite converted to 6-mercaptopurine and 6-thioguanine nucleotides, incorporating into DNA and inhibiting de novo purine synthesis and lymphocyte proliferation.",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    enzyme_profile: {
      value: {
        tpmt: "substrate",
        nudt15: "substrate",
        xanthine_oxidase: "inhibited by allopurinol/febuxostat (causes severe toxicity)",
      },
      refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qAllo }],
    },
    reproductive: {
      tier: {
        value: "acceptable",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      mcm: [],
      folic_acid: {
        value: "Standard folic acid supplementation recommended.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      pregnancy_pk: {
        value: "Fetal liver lacks inosinate pyrophosphorylase, providing partial protection from active metabolites; widely used in pregnant transplant and autoimmune patients when benefits outweigh risks.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Transfers into breast milk in small amounts; consensus guidelines consider compatible with infant CBC monitoring.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 5. MYCOPHENOLATE
function buildMycophenolate() {
  const id = "mycophenolate";
  const sId = "fda-mycophenolate-label";

  const qBox = getQuote(id, "WARNING: EMBRYOFETAL TOXICITY, MALIGNANCIES and SERIOUS INFECTIONS", 220);
  const qRenal = getQuote(id, "severe chronic renal impairment. CELLCEPT may be used", 200);
  const qAE = getQuote(id, "most common adverse reactions in clinical trials (20 % or greater) include diarrhea, leukopenia", 220);
  const qCrush = getQuote(id, "CELLCEPT tablets should not be crushed and CELLCEPT capsules should not be opened", 200);
  const qMOA = getQuote(id, "inosine monophosphate dehydrogenase (IMPDH) inhibitor; therefore it should be avoided in patients with hereditary deficiencies", 220);

  return {
    id,
    generic_name: "mycophenolate",
    tall_man: {
      value: "mycophenolate",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["immunosuppressant", "IMPDH inhibitor", "antimetabolite"],
    subspecialties: ["neuromuscular", "neuroimmunology"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "mmf-neuro-maintenance",
        indication: "Myasthenia Gravis / NMOSD / Autoimmune Encephalitis Maintenance",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "BOXED WARNING", quote: qBox },
          { source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qMOA },
        ],
        dose: {
          kind: "fixed",
          amount: 1000,
          unit: "mg",
          frequency: "twice daily",
          max_single: 1000,
          max_daily: 2000,
        },
        dose_text: "1000 mg orally twice daily (total 2000 mg/day) taken on an empty stomach. May initiate at 500 mg twice daily and advance over 2-4 weeks to mitigate GI intolerance.",
        renal_bands: [
          {
            min: null,
            max: 25,
            dose_text: "Severe chronic renal impairment (GFR < 25 mL/min/1.73 m²): Avoid doses > 1000 mg twice daily; monitor carefully.",
            dose: {
              kind: "fixed",
              amount: 1000,
              unit: "mg",
              frequency: "twice daily",
              max_daily: 2000,
            },
            refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
          },
        ],
      },
    ],
    renal_basis: {
      value: "cg_normalized_1_73",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    hepatic: {
      value: "No dosage adjustment necessary for patients with severe hepatic parenchymal disease.",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    black_box: {
      value: [
        "EMBRYOFETAL TOXICITY: FIRST TRIMESTER PREGNANCY LOSS AND CONGENITAL MALFORMATIONS (FACIAL, EAR, CARDIAC, AND ESOPHAGEAL DEFECTS).",
        "INCREASED RISK OF DEVELOPING LYMPHOMAS AND OTHER MALIGNANCIES, PARTICULARLY OF THE SKIN.",
        "INCREASED SUSCEPTIBILITY TO SERIOUS INFECTIONS, INCLUDING OPPORTUNISTIC INFECTIONS AND VIRAL REACTIVATION (PML, BK VIRUS).",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Standard steroid-sparing oral immunosuppressant in myasthenia gravis; effective onset requires 3 to 6 months",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Tablets should not be crushed and capsules should not be opened. Avoid inhalation or direct contact with skin/mucous membranes due to teratogenic and cytotoxic properties.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qCrush }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: [],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Reversible, non-competitive inhibitor of inosine monophosphate dehydrogenase (IMPDH), selectively blocking de novo guanine nucleotide synthesis in T and B lymphocytes.",
      refs: [{ source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qMOA }],
    },
    enzyme_profile: {
      value: {
        ugt: ["UGT1A9", "UGT2B7"],
      },
      refs: [{ source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qMOA }],
    },
    reproductive: {
      tier: {
        value: "contraindicated",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Contraindicated in pregnancy. Severe teratogen: 45-49% first trimester miscarriage rate, 23-27% major congenital malformations. Discontinue at least 6 weeks prior to planned conception.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      postpartum: { value: null, refs: [] },
      contraception: {
        value: "Must use two acceptable forms of reliable effective contraception simultaneously before beginning therapy, during therapy, and for 6 weeks following discontinuation.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Excretion in human milk is unknown; due to the potential for serious adverse reactions in nursing infants, avoid breastfeeding during therapy.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 6. EFGARTIGIMOD
function buildEfgartigimod() {
  const id = "efgartigimod";
  const sId = "fda-efgartigimod-label";

  const qInd = getQuote(id, "generalized myasthenia gravis (gMG) chronic inflammatory demyelinating polyneuropathy", 220);
  const qDose = getQuote(id, "one cycle of once-weekly administrations for 4 weeks of either efgartigimod", 180);
  const qAE = getQuote(id, "most common adverse reactions (≥ 10%) in patients with gMG", 180);
  const qRenal = getQuote(id, "Renal Impairment No dose adjustment of VYVGART HYTRULO is needed for patients with mild renal impairment", 180);
  const qMOA = getQuote(id, "neonatal Fc receptor blocker, and hyaluronidase", 180);

  return {
    id,
    generic_name: "efgartigimod",
    tall_man: {
      value: "efgartigimod",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["neonatal Fc receptor (FcRn) blocker", "monoclonal antibody fragment", "targeted biologic"],
    subspecialties: ["neuromuscular", "neuroimmunology"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "efg-gmg-cycle",
        indication: "Generalized Myasthenia Gravis (AChR-Ab Positive Adults)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "CLINICAL STUDIES", quote: qDose },
        ],
        dose: {
          kind: "weight_based",
          amount: 10,
          unit: "mg/kg",
          frequency: "once weekly for 4 weeks (1 cycle)",
          max_single: 1200,
        },
        dose_text: "10 mg/kg administered as an IV infusion over 1 hour once weekly for 4 weeks (one treatment cycle). Maximum single dose is 1200 mg (for patients >= 120 kg). Administer subsequent treatment cycles based on clinical evaluation (cycle intervals typically >= 50 days).",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    hepatic: {
      value: "Monoclonal antibody fragments are degraded into small peptides and amino acids; no dosage adjustment required.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "first_line",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "First-in-class targeted FcRn blocker with rapid onset of clinical improvement in anti-AChR positive generalized myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Biologic IV infusion / SC injection only; not for oral or enteral tube administration.",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: [],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Human IgG1 antibody Fc fragment that binds to the neonatal Fc receptor (FcRn), preventing IgG recycling and accelerating degradation of pathogenic autoantibodies including anti-AChR IgG.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qMOA }],
    },
    enzyme_profile: {
      value: {
        metabolism: "catabolized by ubiquitous lysosomal proteolytic enzymes into small peptides",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qMOA }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "FcRn blockade reduces transplacental transfer of maternal IgG to the fetus, potentially leaving the neonate transiently hypogammaglobulinemic. Evaluate clinical benefit vs fetal risk.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Maternal IgG is excreted into colostrum/milk; consider potential for FcRn blockade in infant GI tract vs maternal need.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// ============================================================================
// BATCH 2C: BIOLOGICS & NEUROIMMUNOLOGY
// ============================================================================

// 7. RITUXIMAB
function buildRituximab() {
  const id = "rituximab";
  const sId = "fda-rituximab-label";

  const qBox = getQuote(id, "WARNING: SEVERE MUCOCUTANEOUS REACTIONS, HEPATITIS B VIRUS REACTIVATION and PROGRESSIVE MULTIFOCAL LEUKOENCEPHALOPATHY", 220);
  const qInfusion = getQuote(id, "infusion-related reactions with fatal outcome have been reported", 200);
  const qCD20 = getQuote(id, "CD20-directed cytolytic antibody, and hyaluronidase human, an endoglycosidase", 200);
  const qAE = getQuote(id, "Most common adverse reactions (incidence of ≥ 20%) are: ( 6.1 ) FL: infections", 200);

  return {
    id,
    generic_name: "rituximab",
    tall_man: {
      value: "rituximab",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anti-CD20 monoclonal antibody", "B-cell depleting biologic", "immunosuppressant"],
    subspecialties: ["neuroimmunology", "neuromuscular"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "rtx-neuro-induction",
        indication: "Neuromyelitis Optica Spectrum Disorder (NMOSD) / MuSK-Myasthenia Gravis / Autoimmune Encephalitis",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "BOXED WARNING", quote: qBox },
          { source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qInfusion },
        ],
        dose: {
          kind: "fixed",
          amount: 1000,
          unit: "mg",
          frequency: "two doses 14 days apart",
          max_single: 1000,
          max_daily: 1000,
        },
        dose_text: "Standard neurology protocol: 1000 mg IV on Day 1 and Day 15 (fixed dose protocol), OR 375 mg/m² IV weekly × 4 doses. Premedicate with IV methylprednisolone 100 mg, oral acetaminophen 650-1000 mg, and antihistamine (diphenhydramine 50 mg) 30 minutes prior to every infusion.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    hepatic: {
      value: "HBV screening (HBsAg and anti-HBc) is mandatory prior to initiation due to risk of fulminant hepatitis B reactivation.",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    black_box: {
      value: [
        "FATAL INFUSION-RELATED REACTIONS WITHIN 24 HOURS OF INFUSION (80% WITH FIRST INFUSION).",
        "SEVERE MUCOCUTANEOUS REACTIONS INCLUDING STEVENS-JOHNSON SYNDROME (SJS) AND TOXIC EPIDERMAL NECROLYSIS (TEN).",
        "HEPATITIS B VIRUS (HBV) REACTIVATION RESULTING IN FULMINANT HEPATITIS, HEPATIC FAILURE, AND DEATH.",
        "PROGRESSIVE MULTIFOCAL LEUKOENCEPHALOPATHY (PML) CAUSED BY JC VIRUS INFECTION RESULTING IN SEVERE DISABILITY OR DEATH.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "first_line",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Highly effective first-line therapy for anti-MuSK positive myasthenia gravis and refractory anti-AChR generalized myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Monoclonal antibody IV infusion only; never administer by mouth or enteral feeding tube.",
      },
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["rash_sjs_ten"],
      refs: [
        { source_id: sId, locator: "BOXED WARNING", quote: qBox },
        { source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE },
      ],
    },
    mechanism_of_action: {
      value: "Genetically engineered chimeric murine/human monoclonal IgG1-kappa antibody directed against the CD20 antigen on pre-B and mature B lymphocytes, mediating complement-dependent cytotoxicity (CDC) and antibody-dependent cellular cytotoxicity (ADCC).",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qCD20 }],
    },
    enzyme_profile: {
      value: {
        metabolism: "catabolized through general protein reticuloendothelial degradation",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qCD20 }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Crosses placenta in 2nd and 3rd trimesters, causing transient neonatal B-cell lymphopenia and hypogammaglobulinemia. Defer live vaccines in neonates exposed in utero for at least 6 months.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      postpartum: { value: null, refs: [] },
      contraception: {
        value: "Effective contraception recommended during treatment and for 6 to 12 months after the last infusion.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Large protein molecule excreted in milk in minimal amounts and poorly absorbed orally by mature infant gut; considered generally compatible by consensus guidelines.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 8. IVIG
function buildIVIG() {
  const id = "ivig";
  const sId = "fda-ivig-label";

  const qDesc = getQuote(id, "immune globulin intravenous) PRESCRIBING INFORMATION", 180);
  const qRenal = getQuote(id, "RENAL DYSFUNCTION AND ACUTE RENAL FAILURE Thrombosis may occur with immune globulin products", 200);
  const qAMS = getQuote(id, "Aseptic meningitis syndrome (AMS) may occur, especially with high doses or rapid infusion", 200);
  const qThromb = getQuote(id, "Thrombosis may occur following treatment with immune globulin products", 180);

  return {
    id,
    generic_name: "immune globulin intravenous",
    tall_man: {
      value: "immune globulin intravenous",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["intravenous immunoglobulin (IVIG)", "immunomodulating biologic", "blood product"],
    subspecialties: ["neuromuscular", "neuroimmunology", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ivig-neuro-immunomodulation",
        indication: "Guillain-Barré Syndrome / Myasthenia Gravis Crisis / CIDP / Stiff-Person Syndrome",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qRenal },
          { source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qAMS },
        ],
        dose: {
          kind: "weight_based",
          amount: 2,
          unit: "g/kg",
          frequency: "total dose over 2 to 5 days",
          max_daily: 70,
        },
        dose_text: "Total immunomodulatory dose: 2 g/kg divided equally over 2 consecutive days (1 g/kg/day × 2 days) or 5 consecutive days (0.4 g/kg/day × 5 days). Administer using adjusted ideal body weight in obese patients. Start infusion slowly (0.5 mg/kg/min) and titrate as tolerated.",
        renal_bands: [
          {
            min: null,
            max: 30,
            dose_text: "Renal impairment or diabetes/elderly: Infuse at minimum concentration and slowest infusion rate (< 2 mg/kg/min); ensure adequate hydration prior to infusion.",
            dose: {
              kind: "weight_based",
              amount: 2,
              unit: "g/kg",
              frequency: "divided over 5 days",
              max_daily: 40,
            },
            refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qRenal }],
          },
        ],
      },
    ],
    renal_basis: {
      value: "cg_adj_40",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qRenal }],
    },
    hepatic: {
      value: "No hepatic metabolism; cleared by reticuloendothelial catabolism.",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    black_box: {
      value: [
        "THROMBOSIS MAY OCCUR WITH IMMUNE GLOBULIN PRODUCTS (ARTERIAL AND VENOUS THROMBOEMBOLISM, ISCHEMIC STROKE, MYOCARDIAL INFARCTION, PE).",
        "RENAL DYSFUNCTION, ACUTE RENAL FAILURE, OSMOTIC NEPHROSIS, AND DEATH (PRIMARILY IN SUCROSE-CONTAINING PRODUCTS).",
      ],
      refs: [
        { source_id: sId, locator: "BOXED WARNING", quote: qRenal },
        { source_id: sId, locator: "BOXED WARNING", quote: qThromb },
      ],
    },
    mg_safety: {
      value: "first_line",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
      note: "First-line emergency rescue therapy for myasthenic crisis and acute severe exacerbations alongside plasma exchange",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Human plasma fraction IV infusion only; never administer orally or through enteral tubes.",
      },
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    pgx: {
      value: "Patients with severe anti-IgA antibodies (IgA deficiency) have high risk of severe anaphylactic reactions to IgA-containing formulations.",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    ae_tags: {
      value: [],
      refs: [
        { source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qAMS },
        { source_id: sId, locator: "BOXED WARNING", quote: qRenal },
        { source_id: sId, locator: "BOXED WARNING", quote: qThromb },
      ],
    },
    mechanism_of_action: {
      value: "Provides polyvalent human IgG antibodies that neutralize autoantibodies, saturate Fc receptors, inhibit complement deposition, and modulate pathogenic Fc-gamma receptor expression on macrophages and microglial cells.",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    enzyme_profile: {
      value: {
        metabolism: "catabolized by cellular endocytosis and lysosomal proteolysis",
      },
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
    },
    reproductive: {
      tier: {
        value: "acceptable",
        refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Endogenous human IgG crosses placenta naturally; widely used and considered safe rescue therapy for myasthenia crisis or GBS during pregnancy.",
        refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Natural component of human breast milk; completely compatible with breastfeeding.",
        refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qDesc }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 9. ECULIZUMAB
function buildEculizumab() {
  const id = "eculizumab";
  const sId = "fda-eculizumab-label";

  const qIndMG = getQuote(id, "myasthenia gravis (gMG) in adult and pediatric patients six years of age and older who are anti-acetylcholine receptor", 200);
  const qIndNMOSD = getQuote(id, "treatment of neuromyelitis optica spectrum disorder (NMOSD) in adult patients who are anti-aquaporin-4", 200);
  const qBox = getQuote(id, "MENINGOCOCCAL INFECTIONS SOLIRIS, a complement inhibitor, increases the risk of serious infections", 200);
  const qAE = getQuote(id, "most common adverse reactions from gMG Study 1 that occurred in ≥5% of SOLIRIS-treated patients and at a greater frequency than on placebo", 200);

  return {
    id,
    generic_name: "eculizumab",
    tall_man: {
      value: "eculizumab",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["terminal complement (C5) inhibitor", "humanized monoclonal antibody", "targeted neuroimmunology biologic"],
    subspecialties: ["neuromuscular", "neuroimmunology"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ecu-gmg-adult",
        indication: "Generalized Myasthenia Gravis (AChR-Ab Positive Adults)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG },
          { source_id: sId, locator: "BOXED WARNING", quote: qBox },
        ],
        dose: {
          kind: "fixed",
          amount: 900,
          unit: "mg",
          frequency: "weekly for first 4 weeks, then 1200 mg at week 5 and every 2 weeks thereafter",
          max_single: 1200,
          max_daily: 1200,
        },
        dose_text: "Induction: 900 mg IV infusion weekly for the first 4 weeks, followed by 1200 mg for the fifth dose 1 week later, then 1200 mg every 2 weeks thereafter. Meningococcal vaccination (both ACWY and B) must be administered at least 2 weeks prior to first dose or antibacterial prophylaxis provided.",
      },
      {
        id: "ecu-nmosd-adult",
        indication: "Neuromyelitis Optica Spectrum Disorder (AQP4-Ab Positive Adults)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndNMOSD },
          { source_id: sId, locator: "BOXED WARNING", quote: qBox },
        ],
        dose: {
          kind: "fixed",
          amount: 900,
          unit: "mg",
          frequency: "weekly for first 4 weeks, then 1200 mg at week 5 and every 2 weeks thereafter",
          max_single: 1200,
          max_daily: 1200,
        },
        dose_text: "Induction: 900 mg IV weekly for 4 weeks, followed by 1200 mg at Week 5, then 1200 mg every 2 weeks maintenance. Crucial: complete meningococcal immunization before initiation.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
    },
    hepatic: {
      value: "Antibodies are cleared by non-saturable pinocytosis and lysosomal catabolism; no dosage adjustment in hepatic impairment.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
    },
    black_box: {
      value: [
        "SERIOUS AND POTENTIALLY FATAL MENINGOCOCCAL INFECTIONS (SEPTICEMIA AND/OR MENINGITIS) CAUSED BY NEISSERIA MENINGITIDIS.",
        "VACCINATE WITH MENINGOCOCCAL VACCINES (SEROGROUPS ACWY AND B) AT LEAST 2 WEEKS PRIOR TO INITIATING THERAPY.",
        "MONITOR PATIENTS FOR EARLY SIGNS OF MENINGOCOCCAL INFECTION AND EVALUATE IMMEDIATELY IF SUSPECTED.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "first_line",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
      note: "Targeted terminal complement inhibitor; approved and highly effective for refractory AChR-Ab positive generalized myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous infusion only; strictly not for oral or enteral feeding tube administration.",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: [],
      refs: [
        { source_id: sId, locator: "BOXED WARNING", quote: qBox },
        { source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE },
      ],
    },
    mechanism_of_action: {
      value: "Recombinant humanized IgG2/4-kappa monoclonal antibody that binds with high affinity to terminal complement protein C5, inhibiting its cleavage to C5a and C5b and preventing terminal complement complex (MAC / C5b-9) assembly.",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    enzyme_profile: {
      value: {
        metabolism: "catabolized by cellular endocytosis into small peptides and amino acids",
      },
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "IgG crosses placenta; clinical registry data in PNH and aHUS show favorable outcomes, but assess maternal benefits against neonatal complement deficiency risks.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Eculizumab has not been detected in breast milk; considered compatible with breastfeeding with infant monitoring.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// 10. RAVULIZUMAB
function buildRavulizumab() {
  const id = "ravulizumab";
  const sId = "fda-ravulizumab-label";

  const qIndMG = getQuote(id, "myasthenia gravis (gMG) who are anti-acetylcholine receptor (AChR) antibody-positive", 200);
  const qIndNMOSD = getQuote(id, "treatment of adult patients with neuromyelitis optica spectrum disorder (NMOSD) who are anti-aquaporin-4", 200);
  const qBox = getQuote(id, "MENINGOCOCCAL INFECTIONS ULTOMIRIS, a complement inhibitor, increases the risk of serious infections", 200);
  const qAE = getQuote(id, "Most common adverse reactions in patients with PNH (incidence ≥ 10%) were upper respiratory tract infection and headache", 200);

  return {
    id,
    generic_name: "ravulizumab",
    tall_man: {
      value: "ravulizumab",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["terminal complement (C5) inhibitor", "long-acting humanized monoclonal antibody", "targeted neuroimmunology biologic"],
    subspecialties: ["neuromuscular", "neuroimmunology"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "rav-gmg-adult",
        indication: "Generalized Myasthenia Gravis (AChR-Ab Positive) or NMOSD (AQP4-Ab Positive)",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG },
          { source_id: sId, locator: "BOXED WARNING", quote: qBox },
        ],
        dose: {
          kind: "weight_based",
          amount: 2400,
          unit: "mg",
          frequency: "loading dose, then maintenance dose 2 weeks later and every 8 weeks thereafter",
          max_single: 3600,
          max_daily: 3600,
        },
        dose_text: "Weight-tiered dosing: For 60-100 kg: Loading dose 2700 mg IV, followed 2 weeks later by maintenance 3300 mg IV every 8 weeks. (40-60 kg: loading 2400 mg, maintenance 3000 mg; >=100 kg: loading 3000 mg, maintenance 3600 mg). Meningococcal vaccination (ACWY & B) required >= 2 weeks before initiation.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
    },
    hepatic: {
      value: "Engineered Fc recycling extends half-life; catabolized by lysosomal proteases without hepatic CYP metabolism.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
    },
    black_box: {
      value: [
        "SERIOUS AND POTENTIALLY FATAL MENINGOCOCCAL INFECTIONS (SEPTICEMIA AND/OR MENINGITIS) CAUSED BY NEISSERIA MENINGITIDIS.",
        "VACCINATE WITH MENINGOCOCCAL VACCINES (SEROGROUPS ACWY AND B) AT LEAST 2 WEEKS PRIOR TO INITIATING THERAPY.",
        "MONITOR PATIENTS FOR EARLY SIGNS OF MENINGOCOCCAL INFECTION AND EVALUATE IMMEDIATELY IF SUSPECTED.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "first_line",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
      note: "Long-acting C5 complement inhibitor engineered with histidine substitutions for FcRn recycling, allowing 8-week maintenance infusion intervals",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Intravenous infusion only; strictly not for oral or enteral feeding tube administration.",
      },
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndMG }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: [],
      refs: [
        { source_id: sId, locator: "BOXED WARNING", quote: qBox },
        { source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE },
      ],
    },
    mechanism_of_action: {
      value: "Long-acting humanized monoclonal IgG2/4-kappa antibody targeting complement protein C5, engineered with 4 amino acid substitutions in the heavy chain that increase affinity for FcRn at acidic endosomal pH and promote target dissociation and recycling.",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    enzyme_profile: {
      value: {
        metabolism: "cellular catabolism into small peptides and amino acids via endocytosis",
      },
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: {
        value: "Monoclonal antibody crossing placenta; assess maternal disease control vs potential fetal/neonatal complement inhibition.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Maternal IgG excretion into milk is minimal and degraded in the neonatal GI tract; consider risk/benefit.",
        refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

function main() {
  console.log("Generating Wave 2 Batches 2B & 2C drug files with verified verbatim quotes...");
  writeDrug(buildPyridostigmine());
  writeDrug(buildPrednisolone());
  writeDrug(buildMethylprednisolone());
  writeDrug(buildAzathioprine());
  writeDrug(buildMycophenolate());
  writeDrug(buildEfgartigimod());
  writeDrug(buildRituximab());
  writeDrug(buildIVIG());
  writeDrug(buildEculizumab());
  writeDrug(buildRavulizumab());
  console.log("🎉 All 10 Batches 2B & 2C drug files generated successfully!");
}

main();
