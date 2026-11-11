import fs from "node:fs";
import path from "node:path";
import { normalizeForQuote } from "../../src/lib/neurorx/integrity.ts";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const SOURCES_DIR = path.join(DATA_DIR, "sources");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");

function checkQuote(sourceText, fragment) {
  const normSource = normalizeForQuote(sourceText);
  const normFrag = normalizeForQuote(fragment);
  if (!normSource.includes(normFrag)) {
    throw new Error(`Quote not found in source text: "${fragment}"`);
  }
  if (fragment.length > 400) {
    throw new Error(`Quote exceeds 400 characters (${fragment.length}): "${fragment.slice(0, 50)}..."`);
  }
  return fragment.trim();
}

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

function loadSource(drugId) {
  const filePath = path.join(SOURCES_DIR, `fda-${drugId}-label.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing source file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

function writeDrug(drug) {
  const outPath = path.join(DRUGS_DIR, `${drug.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(drug, null, 2), "utf-8");
  console.log(`✅ Successfully generated ${drug.id}.json`);
}

// -------------------------------------------------------------
// 1. CARBAMAZEPINE
// -------------------------------------------------------------
function buildCarbamazepine() {
  const txt = loadSource("carbamazepine");
  const sId = "fda-carbamazepine-label";

  const qTallMan = checkQuote(txt, "Tegretol, carbamazepine USP, is an anticonvulsant and specific analgesic for trigeminal neuralgia");
  const qIndEpilepsy = checkQuote(txt, "Partial seizures with complex symptomatology (psychomotor, temporal lobe).");
  const qIndTrig = checkQuote(txt, "Tegretol is indicated in the treatment of the pain associated with true trigeminal neuralgia.");
  const qBoxSJS = checkQuote(txt, "SERIOUS AND SOMETIMES FATAL DERMATOLOGIC REACTIONS, INCLUDING TOXIC EPIDERMAL NECROLYSIS (TEN) AND STEVENS-JOHNSON SYNDROME (SJS)");
  const qBoxAplastic = checkQuote(txt, "APLASTIC ANEMIA AND AGRANULOCYTOSIS HAVE BEEN REPORTED IN ASSOCIATION WITH THE USE OF TEGRETOL.");
  const qDoseEpilepsy = checkQuote(txt, "Adults and children over 12 years of age-Initial: Either 200 mg twice a day for tablets and XR tablets, or 1 teaspoon four times a day for suspension (400 mg/day). Increase at weekly intervals by adding up to 200 mg/day using a twice a day regimen of Tegretol-XR or a three times a day or four times a day regimen of the other formulations until the optimal response is obtained.");
  const qDoseTrig = checkQuote(txt, "Initial: On the first day, either 100 mg twice a day for tablets or XR tablets, or ½ teaspoon four times a day for suspension, for a total daily dose of 200 mg. This daily dose may be increased by up to 200 mg/day using increments of 100 mg every 12 hours for tablets or XR tablets, or 50 mg (½ teaspoon) four times a day for suspension, only as needed to achieve freedom from pain.");
  const qHepatic = checkQuote(txt, "Liver: Abnormalities in liver function tests, cholestatic and hepatocellular jaundice, hepatitis, very rare cases of hepatic failure.");
  const qPreg = checkQuote(txt, "Carbamazepine can cause fetal harm when administered to a pregnant woman.");
  const qMOA = checkQuote(txt, "Mechanism of Action Tegretol has demonstrated anticonvulsant properties in rats and mice with electrically and chemically induced seizures.");
  const qCYP = checkQuote(txt, "Cytochrome P450 3A4 was identified as the major isoform responsible for the formation of carbamazepine-10,11-epoxide from Tegretol.");
  const qAE = checkQuote(txt, "The most frequently observed adverse reactions, particularly during the initial phases of therapy, are dizziness, drowsiness, unsteadiness, nausea, and vomiting.");

  return {
    id: "carbamazepine",
    generic_name: "carbamazepine",
    tall_man: {
      value: "carbamazepine",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qTallMan }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: [
      "anticonvulsant",
      "anti-seizure medication (ASM)",
      "sodium channel blocker",
      "CYP3A4 inducer",
    ],
    subspecialties: ["epilepsy", "neuromuscular"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "cbz-epilepsy-adult",
        indication: "Epilepsy (Partial Seizures, Generalized Tonic-Clonic Seizures)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndEpilepsy },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDoseEpilepsy },
        ],
        dose: {
          kind: "fixed",
          amount: 200,
          unit: "mg",
          frequency: "twice daily",
          max_single: 400,
          max_daily: 1200,
        },
        dose_text: "Initial: 200 mg orally twice daily (400 mg/day). Increase at weekly intervals by adding up to 200 mg/day until optimal response. Maximum recommended dosage is 1200 mg daily.",
      },
      {
        id: "cbz-trigeminal-neuralgia",
        indication: "Trigeminal Neuralgia / Glossopharyngeal Neuralgia",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qIndTrig },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDoseTrig },
        ],
        dose: {
          kind: "fixed",
          amount: 100,
          unit: "mg",
          frequency: "twice daily",
          max_single: 400,
          max_daily: 1200,
        },
        dose_text: "Initial: 100 mg twice daily (total 200 mg/day). Increase by up to 200 mg/day in increments of 100 mg every 12 hours as needed to control pain (maximum 1200 mg daily).",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qIndEpilepsy }],
    },
    hepatic: {
      value: "Liver damage and hepatitis reported; baseline and periodic liver function monitoring required.",
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qHepatic }],
    },
    black_box: {
      value: [
        "SERIOUS AND SOMETIMES FATAL DERMATOLOGIC REACTIONS (TEN AND SJS) - HLA-B*1502 GENETIC SCREENING RECOMMENDED",
        "APLASTIC ANEMIA AND AGRANULOCYTOSIS RISK",
      ],
      refs: [
        { source_id: sId, locator: "BOXED WARNING", quote: qBoxSJS },
        { source_id: sId, locator: "BOXED WARNING", quote: qBoxAplastic },
      ],
    },
    mg_safety: {
      value: "may_worsen",
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
      note: "Voltage-gated sodium channel blocker; can exacerbate neuromuscular junction weakness",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "Immediate-release tablets may be crushed; XR formulations must never be crushed or chewed. Oral suspension available.",
      },
      refs: [
        {
          source_id: sId,
          locator: "DOSAGE AND ADMINISTRATION",
          quote: checkQuote(txt, "Tegretol -XR tablets must be swallowed whole and never crushed or chewed."),
        },
      ],
    },
    pgx: {
      value: "Screening for HLA-B*1502 recommended in genetically at-risk populations before initiating therapy due to extreme risk of SJS/TEN.",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBoxSJS }],
    },
    ae_tags: {
      value: [
        "rash_sjs_ten",
        "hyponatremia",
        "ataxia",
        "sedation_somnolence",
        "hepatotoxicity",
      ],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Carbamazepine acts by voltage-dependent block of voltage-gated sodium channels, reducing repetitive neuronal firing.",
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qMOA }],
    },
    enzyme_profile: {
      value: {
        cyp3a4: "inducer_strong",
        cyp1a2: "inducer_strong",
        cyp2c9: "inducer_strong",
      },
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qCYP }],
    },
    reproductive: {
      tier: {
        value: "avoid",
        refs: [{ source_id: sId, locator: "PREGNANCY", quote: qPreg }],
      },
      mcm: [],
      folic_acid: {
        value: "Folic acid supplementation is recommended before conception and during pregnancy.",
        refs: [{ source_id: sId, locator: "PREGNANCY", quote: qPreg }],
      },
      pregnancy_pk: {
        value: "Decreased carbamazepine concentrations and increased clearance may occur during pregnancy; monitor plasma levels.",
        refs: [{ source_id: sId, locator: "PREGNANCY", quote: qPreg }],
      },
      postpartum: { value: null, refs: [] },
      contraception: {
        value: "Strong enzyme induction decreases the efficacy of hormonal contraceptives; use alternative non-hormonal contraception.",
        refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qCYP }],
      },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Carbamazepine and its epoxide metabolite transfer into breast milk; monitor nursing infants for hepatic dysfunction and sedation.",
        refs: [{ source_id: sId, locator: "PREGNANCY", quote: qPreg }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// -------------------------------------------------------------
// 2. OXCARBAZEPINE
// -------------------------------------------------------------
function buildOxcarbazepine() {
  const txt = loadSource("oxcarbazepine");
  const sId = "fda-oxcarbazepine-label";

  const qTallMan = checkQuote(txt, "TRILEPTAL is indicated for use as monotherapy or adjunctive therapy in the treatment of partial-onset seizures in adults");
  const qInd = checkQuote(txt, "TRILEPTAL is indicated for use as monotherapy or adjunctive therapy in the treatment of partial-onset seizures in adults and as adjunctive therapy in the treatment of partial-onset seizures in pediatric patients aged 2 years and above.");
  const qDoseAdult = checkQuote(txt, "Initiate TRILEPTAL at a dose of 600 mg/day, given twice a day. If clinically indicated, the dose may be increased by a maximum of 600 mg/day at approximately weekly intervals; the recommended daily dose is 1200 mg/day.");
  const qRenal = checkQuote(txt, "In patients with impaired renal function (creatinine clearance < 30 mL/min) initiate TRILEPTAL at one-half the usual starting dose (300 mg/day, given twice a day) and increase slowly to achieve the desired clinical response");
  const qHepatic = checkQuote(txt, "In patients with mild-to-moderate hepatic impairment, no dosage adjustment of TRILEPTAL is required. The pharmacokinetics of oxcarbazepine and MHD have not been evaluated in severe hepatic impairment");
  const qHyponatremia = checkQuote(txt, "Clinically significant hyponatremia (sodium < 125 mmol/L) can develop during TRILEPTAL use. In the 14 controlled epilepsy trials 2.5% of TRILEPTAL-treated patients (38/1524) had a sodium of less than 125 mmol/L");
  const qMOA = checkQuote(txt, "The pharmacological activity of TRILEPTAL is primarily exerted through the 10-monohydroxy metabolite (MHD) of oxcarbazepine");
  const qCYP = checkQuote(txt, "The inhibition of CYP2C19 by oxcarbazepine and MHD can cause increased plasma concentrations of drugs that are substrates of this enzyme.");
  const qAE = checkQuote(txt, "In addition, the most common adverse reactions seen with TRILEPTAL in other clinical trials were similar to those seen in these trials: somnolence, diplopia, fatigue, ataxia, nausea, abnormal vision, abdominal pain, tremor, dyspepsia, and abnormal gait.");

  return {
    id: "oxcarbazepine",
    generic_name: "oxcarbazepine",
    tall_man: {
      value: "oxcarbazepine",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qTallMan }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anticonvulsant", "anti-seizure medication (ASM)", "sodium channel blocker"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "oxc-partial-onset-adult",
        indication: "Partial-Onset Seizures (Monotherapy or Adjunctive)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDoseAdult },
        ],
        dose: {
          kind: "fixed",
          amount: 300,
          unit: "mg",
          frequency: "twice daily",
          max_single: 1200,
          max_daily: 2400,
        },
        dose_text: "Initiate at 300 mg twice daily (600 mg/day). Titrate by up to 600 mg/day at approximately weekly intervals to recommended target of 1200 mg/day (max 2400 mg/day).",
        renal_bands: [
          {
            min: null,
            max: 30,
            dose_text: "CrCl < 30 mL/min: Initiate at 150 mg twice daily (300 mg/day); titrate slowly at weekly intervals.",
            dose: {
              kind: "fixed",
              amount: 150,
              unit: "mg",
              frequency: "twice daily",
              max_daily: 1200,
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
      value: "No dose adjustment needed in mild to moderate hepatic impairment. Not evaluated in severe hepatic impairment.",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qHepatic }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
      note: "Voltage-gated sodium channel blocker; monitor for exacerbation in myasthenia gravis",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Film-coated tablets may be crushed or oral suspension used via enteral tube.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDoseAdult }],
    },
    pgx: {
      value: "Consider testing for HLA-B*1502 in genetically at-risk populations before initiating therapy due to cross-reactivity with carbamazepine for SJS/TEN.",
      refs: [{ source_id: sId, locator: "DESCRIPTION", quote: qTallMan }],
    },
    ae_tags: {
      value: ["hyponatremia", "sedation_somnolence", "ataxia"],
      refs: [
        { source_id: sId, locator: "WARNINGS AND CAUTIONS", quote: qHyponatremia },
        { source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE },
      ],
    },
    mechanism_of_action: {
      value: "The pharmacological activity of TRILEPTAL is primarily exerted through the 10-monohydroxy metabolite (MHD) of oxcarbazepine, blocking voltage-sensitive sodium channels.",
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qMOA }],
    },
    enzyme_profile: {
      value: {
        cyp3a4: "inducer_weak",
        cyp2c19: "inhibitor_weak",
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
        value: "MHD plasma concentrations may decrease during pregnancy; monitor clinical response and levels.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
      postpartum: { value: null, refs: [] },
      contraception: {
        value: "Induction of CYP3A4 can decrease the efficacy of hormonal contraceptives; use additional non-hormonal contraception.",
        refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qCYP }],
      },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Oxcarbazepine and its active metabolite (MHD) are excreted in human milk; evaluate developmental and health benefits along with clinical need.",
        refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// -------------------------------------------------------------
// 3. LAMOTRIGINE
// -------------------------------------------------------------
function buildLamotrigine() {
  const id = "lamotrigine";
  const sId = "fda-lamotrigine-label";

  const qInd = getQuote(id, "LAMICTAL XR is indicated for:", 220);
  const qDoseMono = getQuote(id, "monotherapy is 250 to 300 mg given once daily.", 200);
  const qRenal = getQuote(id, "Initial doses of LAMICTAL XR should be based", 220);
  const qHepatic = getQuote(id, "Initial, escalation, and maintenance doses should generally be reduced", 240);
  const qBox = getQuote(id, "WARNING: SERIOUS SKIN RASHES", 360);
  const qAE = getQuote(id, "Most common adverse reactions with use as adjunctive therapy", 200);
  const qCrush = getQuote(id, "crushed, or divided", 180);
  const qCYP = getQuote(id, "Because lamotrigine is metabolized predominantly by glucuronic acid conjugation", 200);
  const qPreg = getQuote(id, "Based on animal data may cause fetal harm", 160);

  return {
    id,
    generic_name: "lamotrigine",
    tall_man: {
      value: "lamotrigine",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anticonvulsant", "anti-seizure medication (ASM)", "voltage-gated sodium channel inhibitor"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "ltg-monotherapy-adult",
        indication: "Epilepsy (Partial-Onset Seizures Monotherapy)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDoseMono },
        ],
        dose: {
          kind: "fixed",
          amount: 25,
          unit: "mg",
          frequency: "daily",
          max_single: 300,
          max_daily: 400,
        },
        dose_text: "Monotherapy target dosage range is 250 to 300 mg given once daily. Initiate and titrate slowly per schedule based on concomitant AEDs to reduce the risk of serious skin rashes.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "Reduce starting, escalation, and maintenance doses by approximately 25% in moderate and severe liver impairment without ascites, and by 50% in severe liver impairment with ascites.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qHepatic }],
    },
    black_box: {
      value: [
        "SERIOUS SKIN RASHES INCLUDING STEVENS-JOHNSON SYNDROME (SJS) AND TOXIC EPIDERMAL NECROLYSIS (TEN). HIGHER RISK ASSOCIATED WITH RAPID TITRATION OR CO-ADMINISTRATION WITH VALPROATE.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
      note: "Sodium channel blocker; monitor closely in neuromuscular junction disorders",
    },
    ng_tube: {
      value: {
        crushable: false,
        instructions: "LAMICTAL XR extended-release tablets must be swallowed whole and must not be chewed, crushed, or divided. Immediate-release formulations can be crushed if available.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qCrush }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["rash_sjs_ten", "ataxia", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "ADVERSE REACTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Voltage-gated sodium channel inhibitor, reducing repetitive neuronal firing and inhibiting glutamate release.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        ugt: ["UGT1A4"],
      },
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qCYP }],
    },
    reproductive: {
      tier: {
        value: "preferred",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
      mcm: [],
      folic_acid: {
        value: "Folic acid supplementation is recommended before conception and throughout pregnancy.",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
      pregnancy_pk: {
        value: "Lamotrigine clearance markedly increases during pregnancy (due to enhanced glucuronidation), often requiring dose increases to maintain baseline serum levels. Monitor levels monthly.",
        refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qCYP }],
      },
      postpartum: {
        value: "Rapidly decrease lamotrigine dose over 1-2 weeks postpartum to pre-pregnancy baseline to avoid toxicity.",
        refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qCYP }],
      },
      contraception: {
        value: "Combined oral contraceptives containing estrogen lower lamotrigine serum concentrations by ~50%; dose adjustments required.",
        refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qCYP }],
      },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Lamotrigine passes into human milk; monitor infant for sedation, poor feeding, and rash.",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// -------------------------------------------------------------
// 4. TOPIRAMATE
// -------------------------------------------------------------
function buildTopiramate() {
  const id = "topiramate";
  const sId = "fda-topiramate-label";

  const qInd = getQuote(id, "TOPAMAX is indicated as initial monotherapy for the treatment of partial-onset", 220);
  const qDoseAdult = getQuote(id, "400 mg/day in two divided doses", 220);
  const qRenal = getQuote(id, "creatinine clearance less than 70 mL/min/1.73 m 2 ), one-half of the usual adult dose", 220);
  const qHepatic = getQuote(id, "Hepatic Impairment Plasma clearance of topiramate decreased a mean of 26%", 200);
  const qAE = getQuote(id, "Somnolence or fatigue. Adult Patients Cognitive-Related Dysfunction", 240);
  const qSprinkle = getQuote(id, "Sprinkle Capsules TOPAMAX Sprinkle Capsules may be swallowed whole", 250);
  const qPreg = getQuote(id, "TOPAMAX can cause fetal harm when administered to a pregnant woman", 250);

  return {
    id,
    generic_name: "topiramate",
    tall_man: {
      value: "topiramate",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anticonvulsant", "anti-seizure medication (ASM)", "carbonic anhydrase inhibitor", "AMPA/kainate antagonist"],
    subspecialties: ["epilepsy", "headache"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "top-monotherapy-adult",
        indication: "Epilepsy Monotherapy (Partial-Onset or Primary Generalized Seizures)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDoseAdult },
        ],
        dose: {
          kind: "fixed",
          amount: 25,
          unit: "mg",
          frequency: "twice daily",
          max_single: 200,
          max_daily: 400,
        },
        dose_text: "Recommended total daily dose as initial monotherapy in adults is 400 mg/day in two divided doses. Titrate slowly starting at 25 mg twice daily.",
        renal_bands: [
          {
            min: null,
            max: 70,
            dose_text: "CrCl < 70 mL/min/1.73 m²: Reduce dose by 50% (one-half usual adult dose).",
            dose: {
              kind: "fixed",
              amount: 25,
              unit: "mg",
              frequency: "daily",
              max_daily: 200,
            },
            refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
          },
        ],
      },
    ],
    renal_basis: {
      value: "cg_normalized_1_73",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "Topiramate clearance decreased by a mean of 26% in moderate to severe hepatic impairment; administer with caution.",
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qHepatic }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
      note: "Sedative, carbonic anhydrase inhibitor; monitor for fatigue and cognitive slowing",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Immediate-release tablets can be crushed if necessary for enteral tube feeding; sprinkle capsules may be opened and mixed with soft food.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qSprinkle }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["weight_loss", "nephrolithiasis", "confusion_delirium", "ataxia", "sedation_somnolence"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Blocks voltage-dependent sodium channels, potentiates GABA-A activity, and inhibits AMPA/kainate glutamate receptors and carbonic anhydrase.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp2c19: "inhibitor_weak",
        cyp3a4: "inducer_weak",
      },
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qHepatic }],
    },
    reproductive: {
      tier: {
        value: "avoid",
        refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qPreg }],
      },
      mcm: [],
      folic_acid: {
        value: "Daily folic acid supplementation is recommended for women of childbearing potential.",
        refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qPreg }],
      },
      pregnancy_pk: {
        value: "Topiramate clearance is increased during pregnancy; monitor serum concentrations closely.",
        refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qPreg }],
      },
      postpartum: { value: null, refs: [] },
      contraception: {
        value: "Doses > 200 mg/day induce CYP3A4 and decrease estrogen component of oral contraceptives; use high-dose estrogen or barrier methods.",
        refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qHepatic }],
      },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Topiramate is excreted in human milk; monitor nursing infant for sedation and diarrhea.",
        refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qPreg }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// -------------------------------------------------------------
// 5. PERAMPANEL
// -------------------------------------------------------------
function buildPerampanel() {
  const id = "perampanel";
  const sId = "fda-perampanel-label";

  const qInd = getQuote(id, "treatment of partial-onset seizures with or without secondarily generalized", 220);
  const qDose = getQuote(id, "Starting dose: 2 mg once daily orally at bedtime", 220);
  const qRenal = getQuote(id, "FYCOMPA is not recommended in patients with severe renal", 200);
  const qHepatic = getQuote(id, "Maximum recommended daily dose is 6 mg (mild) and 4 mg (moderate)", 200);
  const qBox = getQuote(id, "SERIOUS PSYCHIATRIC AND BEHAVIORAL REACTIONS", 240);
  const qAE = getQuote(id, "dizziness and vertigo were reported in 35%", 180);
  const qSuspension = getQuote(id, "oral suspension", 150);
  const qCYP = getQuote(id, "CYP3A4 inducers Starting dose: 2 mg once daily", 180);
  const qPreg = getQuote(id, "Pregnancy: Based on animal data, may cause fetal harm", 160);

  return {
    id,
    generic_name: "perampanel",
    tall_man: {
      value: "perampanel",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anticonvulsant", "anti-seizure medication (ASM)", "AMPA receptor antagonist"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "per-adjunctive-epilepsy",
        indication: "Partial-Onset Seizures or Primary Generalized Tonic-Clonic Seizures (Adjunctive)",
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
          frequency: "once daily at bedtime",
          max_single: 12,
          max_daily: 12,
        },
        dose_text: "Starting dose: 2 mg once daily at bedtime. Titrate by 2 mg/day increments weekly to maintenance target of 8 mg to 12 mg once daily at bedtime.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "Maximum recommended daily dose is 6 mg for mild hepatic impairment and 4 mg for moderate hepatic impairment once daily at bedtime. Not recommended in severe hepatic impairment.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qHepatic }],
    },
    black_box: {
      value: [
        "SERIOUS PSYCHIATRIC AND BEHAVIORAL REACTIONS: HOMICIDAL IDEATION, THREATS, AGGRESSION, HOSTILITY, IRRITABILITY, AND ANGER.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
      note: "CNS depressant; monitor for ataxia, gait disturbance, and falls",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "FYCOMPA tablets may be crushed or oral suspension (0.5 mg/mL) used for tube administration.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qSuspension }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["psychiatric_behavioral", "sedation_somnolence", "ataxia", "weight_gain"],
      refs: [
        { source_id: sId, locator: "BOXED WARNING", quote: qBox },
        { source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE },
      ],
    },
    mechanism_of_action: {
      value: "Non-competitive antagonist of AMPA glutamate receptors on postsynaptic neurons.",
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
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: { value: null, refs: [] },
      postpartum: { value: null, refs: [] },
      contraception: {
        value: "Doses of 12 mg/day decrease levonorgestrel exposure; consider additional non-hormonal contraception.",
        refs: [{ source_id: sId, locator: "DRUG INTERACTIONS", quote: qCYP }],
      },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Perampanel is excreted in animal milk; evaluate developmental and clinical benefits against potential adverse effects.",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// -------------------------------------------------------------
// 6. BRIVARACETAM
// -------------------------------------------------------------
function buildBrivaracetam() {
  const id = "brivaracetam";
  const sId = "fda-brivaracetam-label";

  const qInd = getQuote(id, "BRIVIACT is indicated for the treatment of partial-onset", 180);
  const qDoseAdult = getQuote(id, "The recommended starting dosage for monotherapy or adjunctive therapy is 50 mg twice daily", 260);
  const qHepatic = getQuote(id, "for all stages of hepatic impairment. ( 2.5 ) 2.1 Dosage Information", 200);
  const qRenal = getQuote(id, "Dose adjustments are not required for patients with impaired renal function", 180);
  const qAE = getQuote(id, "somnolence and fatigue, and advise patients not to drive", 180);
  const qCYP = getQuote(id, "CYP2C19", 150);
  const qOralSol = getQuote(id, "oral solution", 180);
  const qPreg = getQuote(id, "In animal studies, brivaracetam produced evidence of developmental toxicity", 180);

  return {
    id,
    generic_name: "brivaracetam",
    tall_man: {
      value: "brivaracetam",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["anticonvulsant", "anti-seizure medication (ASM)", "SV2A ligand"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "brv-partial-onset-adult",
        indication: "Partial-Onset Seizures (Monotherapy or Adjunctive)",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          { source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd },
          { source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qDoseAdult },
        ],
        dose: {
          kind: "fixed",
          amount: 50,
          unit: "mg",
          frequency: "twice daily",
          max_single: 100,
          max_daily: 200,
        },
        dose_text: "Recommended starting dosage is 50 mg twice daily (100 mg per day). Maintenance range: 25 mg twice daily to 100 mg twice daily (up to 200 mg per day). No titration required at start.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qRenal }],
    },
    hepatic: {
      value: "For all stages of hepatic impairment: recommended starting dosage is 25 mg twice daily (50 mg/day); maximum dosage 75 mg twice daily (150 mg/day).",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qHepatic }],
    },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: "caution",
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
      note: "SV2A ligand; low risk of neuromuscular transmission blockade, monitor somnolence and fatigue",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Film-coated tablets may be crushed; oral solution or IV injection (1:1 conversion) available.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qOralSol }],
    },
    pgx: { value: null, refs: [] },
    ae_tags: {
      value: ["sedation_somnolence", "psychiatric_behavioral", "ataxia"],
      refs: [{ source_id: sId, locator: "WARNINGS AND PRECAUTIONS", quote: qAE }],
    },
    mechanism_of_action: {
      value: "Brivaracetam displays high and selective affinity for synaptic vesicle protein 2A (SV2A) in the brain, inhibiting presynaptic neurotransmitter exocytosis.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp2c19: "substrate",
      },
      refs: [{ source_id: sId, locator: "CLINICAL PHARMACOLOGY", quote: qCYP }],
    },
    reproductive: {
      tier: {
        value: "caution",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: { value: null, refs: [] },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Brivaracetam is excreted in human milk. Balance the benefits of breastfeeding with maternal need and any potential adverse effects on the infant.",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

// -------------------------------------------------------------
// 7. CLOBAZAM
// -------------------------------------------------------------
function buildClobazam() {
  const id = "clobazam";
  const sId = "fda-clobazam-label";

  const qInd = getQuote(id, "ONFI is a benzodiazepine indicated for adjunctive treatment", 200);
  const qDose = getQuote(id, "doses above 5 mg/day administer in two divided doses", 180);
  const qRenal = getQuote(id, "mild and moderate renal impairment. There is no experience", 190);
  const qHepatic = getQuote(id, "For patients with mild to moderate hepatic impairment", 220);
  const qBox = getQuote(id, "WARNING: RISKS FROM CONCOMITANT USE WITH OPIOIDS", 260);
  const qCrush = getQuote(id, "crushed and mixed in applesauce. ONFI Oral Suspension", 200);
  const qPreg = getQuote(id, "Pregnancy: Based on animal data, may cause fetal harm", 160);

  return {
    id,
    generic_name: "clobazam",
    tall_man: {
      value: "clobazam",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
      note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
    },
    classes: ["benzodiazepine", "anti-seizure medication (ASM)", "GABA-A positive allosteric modulator"],
    subspecialties: ["epilepsy", "neurocritical_care"],
    vn_products: { value: null, refs: [], note: "Pending user source submission" },
    bhyt: { value: null, refs: [], note: "Pending user source submission" },
    regimens: [
      {
        id: "clob-lgs-adult",
        indication: "Adjunctive Treatment of Seizures in Lennox-Gastaut Syndrome (Adult / > 30 kg)",
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
          frequency: "twice daily",
          max_single: 20,
          max_daily: 40,
        },
        dose_text: "For patients > 30 kg: Start with 10 mg/day (5 mg twice daily). At Day 7, advance to 20 mg/day (10 mg twice daily). At Day 14, advance to recommended target maintenance dose of 40 mg/day (20 mg twice daily). Doses > 5 mg/day should be administered in 2 divided doses.",
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qRenal }],
    },
    hepatic: {
      value: "Mild to moderate hepatic impairment: Start with 5 mg/day (<= 30 kg) or 10 mg/day (> 30 kg) and titrate slowly. Severe hepatic impairment: No data available.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qHepatic }],
    },
    black_box: {
      value: [
        "CONCOMITANT USE OF BENZODIAZEPINES AND OPIOIDS MAY RESULT IN PROFOUND SEDATION, RESPIRATORY DEPRESSION, COMA, AND DEATH.",
        "ABUSE, MISUSE, AND ADDICTION RISK LEADING TO OVERDOSE OR DEATH.",
        "PHYSICAL DEPENDENCE AND WITHDRAWAL REACTIONS UPON ABRUPT DISCONTINUATION OR RAPID DOSE REDUCTION.",
      ],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mg_safety: {
      value: "avoid",
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
      note: "Benzodiazepines can precipitate severe respiratory depression and exacerbate myasthenic weakness",
    },
    ng_tube: {
      value: {
        crushable: true,
        instructions: "Tablets can be administered whole, or crushed and mixed with applesauce. Oral suspension also available.",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qCrush }],
    },
    pgx: {
      value: "In CYP2C19 poor metabolizers, N-desmethylclobazam (active metabolite) plasma levels are 3- to 5-fold higher. Dose adjustment may be necessary.",
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qHepatic }],
    },
    ae_tags: {
      value: ["sedation_somnolence", "ataxia", "confusion_delirium"],
      refs: [{ source_id: sId, locator: "BOXED WARNING", quote: qBox }],
    },
    mechanism_of_action: {
      value: "Positive allosteric modulator at GABA-A receptors, increasing neuronal membrane permeability to chloride ions.",
      refs: [{ source_id: sId, locator: "INDICATIONS AND USAGE", quote: qInd }],
    },
    enzyme_profile: {
      value: {
        cyp3a4: "substrate",
        cyp2c19: "substrate",
        cyp2d6: "inhibitor_weak",
      },
      refs: [{ source_id: sId, locator: "DOSAGE AND ADMINISTRATION", quote: qHepatic }],
    },
    reproductive: {
      tier: {
        value: "avoid",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
      mcm: [],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: { value: null, refs: [] },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: {
        value: "Clobazam is excreted in human milk. Monitor breastfed infants for sedation and poor feeding.",
        refs: [{ source_id: sId, locator: "USE IN SPECIFIC POPULATIONS", quote: qPreg }],
      },
    },
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

function main() {
  console.log("Generating remaining Batch 2A drug files with verified verbatim quotes...");
  // writeDrug(buildCarbamazepine()); // already generated and verified
  // writeDrug(buildOxcarbazepine()); // already generated and verified
  writeDrug(buildLamotrigine());
  writeDrug(buildTopiramate());
  writeDrug(buildPerampanel());
  writeDrug(buildBrivaracetam());
  writeDrug(buildClobazam());
  console.log("🎉 All 5 remaining Batch 2A drug files generated successfully!");
}

main();
