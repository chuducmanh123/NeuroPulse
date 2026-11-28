import fs from "node:fs";
import path from "node:path";
import { getQuote } from "./enhance_common.mjs";

const DRUGS_DIR = path.resolve(process.cwd(), "data/neurorx/drugs");
const INTERACTIONS_FILE = path.resolve(process.cwd(), "data/neurorx/interactions.json");

const ICU_GUIDE = "icu-vasopressor-guidelines";
const LACT_VASO = "lactmed-vasopressors";
const TALL_MAN = "fda-tallman-list";

function writeDrug(drug) {
  const filePath = path.join(DRUGS_DIR, `${drug.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(drug, null, 2) + "\n", "utf-8");
  console.log(`✅ Wrote ${drug.id}.json`);
}

function ref(source_id, locator, anchor, minLen = 25, maxLen = 350) {
  return {
    source_id,
    locator,
    quote: getQuote(source_id, anchor, minLen, maxLen),
  };
}

function naField() {
  return {
    value: null,
    refs: [],
    note: "Not clinically applicable",
  };
}

// 1. NOREPINEPHRINE (Noradrenaline)
const norepinephrine = {
  id: "norepinephrine",
  generic_name: "norepinephrine",
  aliases: ["noradrenaline", "norad", "levophed", "levarterenol"],
  tall_man: {
    value: "norepinephrine",
    refs: [
      ref("fda-norepinephrine-label", "Section 11 DESCRIPTION", "Norepinephrine (sometimes referred to as l-arterenol/Levarterenol"),
    ],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: [
    "vasopressor",
    "catecholamine",
    "alpha-1 and beta-1 adrenergic agonist",
  ],
  subspecialties: ["neurocritical_care", "stroke"],
  vn_products: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  bhyt: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  regimens: [
    {
      id: "ne-iv-hypotension-adult",
      indication: "Acute Hypotension / Septic & Neurogenic Shock (Adults — Continuous IV Infusion)",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref("fda-norepinephrine-label", "Section 1 INDICATIONS AND USAGE", "LEVOPHED is indicated to raise blood pressure in adult patients with severe, acute hypotension."),
        ref("fda-norepinephrine-label", "Section 2 DOSAGE AND ADMINISTRATION", "Initial dose of 0.25 mL to 0.375 mL (from 8 mcg to 12 mcg of base) per minute"),
        ref(ICU_GUIDE, "Section 1 Surviving Sepsis Campaign (SSC 2021)", "For adults with septic shock, recommend norepinephrine as the first-line agent"),
      ],
      dose: null,
      dose_text:
        "FDA label: Initiate at 8 to 12 mcg/min (0.25 to 0.375 mL/min of 4 mg/1000 mL dilution) and titrate to maintain low-normal BP (usually SBP 80-100 mmHg, or MAP >= 65 mmHg per SSC 2021); average maintenance 2 to 4 mcg/min (weight-based ICU titration typically 0.01 to 0.5+ mcg/kg/min). Correct occult hypovolemia prior to or during therapy.",
    },
    {
      id: "ne-iv-sci-sah-map",
      indication: "Neurocritical Care Hemodynamic Augmentation (Acute SCI MAP 85-90 mmHg / SAH DCI Induced HTN)",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref(ICU_GUIDE, "Section 2 Neurocritical Care Hemodynamic Targets", "In acute traumatic cervical or thoracic spinal cord injury, avoid hypotension"),
        ref(ICU_GUIDE, "Section 2 Neurocritical Care Hemodynamic Targets", "For symptomatic cerebral vasospasm and delayed cerebral ischemia (DCI)"),
      ],
      dose: null,
      dose_text:
        "Acute SCI: Titrate IV norepinephrine to maintain MAP 85 to 90 mmHg for 5 to 7 days post-injury. Symptomatic aSAH DCI: Titrate stepwise to target MAP 90 to 110 mmHg (+20% to 30% above baseline) until clinical reversal or safety limits.",
    },
  ],
  renal_basis: {
    value: null,
    refs: [],
    note: "No formal renal dose-adjustment bands; titrate to hemodynamic response",
  },
  hepatic: {
    value: "No formal hepatic dose-adjustment schedule; titrate carefully in patients with hepatic, renal, or cardiac dysfunction.",
    refs: [
      ref("fda-norepinephrine-label", "Section 8.5 Geriatric Use", "hepatic, renal, or cardiac function, and of concomitant disease or other drug therapy."),
    ],
  },
  black_box: {
    value: null,
    refs: [],
  },
  mg_safety: {
    value: "safe",
    refs: [
      ref("fda-norepinephrine-label", "Section 12.1 Mechanism of Action", "Norepinephrine is a peripheral vasoconstrictor (alpha-adrenergic action)"),
    ],
    note: "No neuromuscular junction blockade reported; safe for hemodynamic support in myasthenia gravis when clinically indicated",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "Intravenous infusion only; inactive orally",
  },
  pgx: {
    value: null,
    refs: [],
    note: "No pharmacogenomic testing required",
  },
  ae_tags: {
    value: null,
    refs: [],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Hypertension and reflex bradycardia",
        "Peripheral vasoconstriction and cold extremities",
        "Anxiety, transient headache",
      ],
      refs: [
        ref("fda-norepinephrine-label", "Section 6 ADVERSE REACTIONS", "The most common adverse reactions are hypertension and bradycardia."),
      ],
    },
    serious: {
      value: [
        "Tissue ischemia and extravasation necrosis at injection site",
        "Severe hypertension and reflex bradycardia (overdose)",
        "Cardiac arrhythmias (especially with hypoxia or hypercarbia)",
      ],
      refs: [
        ref("fda-norepinephrine-label", "Section 6 ADVERSE REACTIONS", "Tissue Ischemia [see Warnings and Precautions (5.1) ]"),
        ref("fda-norepinephrine-label", "Section 10 OVERDOSAGE", "Overdosage with LEVOPHED may result in headache, severe hypertension, reflex bradycardia"),
      ],
    },
  },
  mechanism_of_action: {
    value: "Norepinephrine is a peripheral vasoconstrictor (alpha-adrenergic action) and an inotropic stimulator of the heart and dilator of coronary arteries (beta-adrenergic action).",
    refs: [
      ref("fda-norepinephrine-label", "Section 12.1 Mechanism of Action", "Norepinephrine is a peripheral vasoconstrictor (alpha-adrenergic action) and an inotropic stimulator of the heart"),
    ],
  },
  enzyme_profile: {
    value: {
      qt_risk: "none",
      serotonergic: false,
    },
    refs: [
      ref("fda-norepinephrine-label", "Section 12.1 Mechanism of Action", "Norepinephrine is a peripheral vasoconstrictor (alpha-adrenergic action)"),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAO Inhibitors (e.g., linezolid, rasagiline, phenelzine) & Tricyclic Antidepressants",
        severity: "major",
        effect: "Co-administration can cause severe, prolonged hypertension.",
        management: "Avoid if possible; if unavoidable, initiate at very low rates and monitor arterial blood pressure continuously.",
        refs: [
          ref("fda-norepinephrine-label", "Section 7.1 MAO-Inhibiting Drugs", "Co-administration of LEVOPHED with monoamine oxidase (MAO) inhibitors or other drugs with MAO-inhibiting properties"),
        ],
      },
      {
        drug_or_class: "Halogenated / Cyclopropane Anesthetics",
        severity: "major",
        effect: "Increases cardiac autonomic irritability and risk of ventricular arrhythmias.",
        management: "Monitor continuous ECG and avoid concomitant use with sensitizing volatile anesthetics where possible.",
        refs: [
          ref("fda-norepinephrine-label", "Section 7 DRUG INTERACTIONS", "Cyclopropane and halothane anesthetics increase cardiac autonomic irritability."),
        ],
      },
    ],
    refs: [
      ref("fda-norepinephrine-label", "Section 7.1 MAO-Inhibiting Drugs", "Co-administration of LEVOPHED with monoamine oxidase (MAO) inhibitors"),
    ],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "5-axis synthesis: Limited published human data at delivery have not identified an increased risk of major birth defects, but alpha-adrenergic uterine vasoconstriction can reduce uteroplacental perfusion; maternal hemodynamic stabilization in shock takes priority.",
      refs: [
        ref("fda-norepinephrine-label", "Section 8.1 Pregnancy", "Limited published data consisting of a small number of case reports and multiple small trials involving the use of norepinephrine"),
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "In pregnant patients with septic, cardiogenic, or anaphylactic shock, maternal hemodynamic stabilization"),
      ],
    },
    mcm: [],
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: {
      value: "No formal pregnancy PK dose-adjustment schedule; titrate to lowest effective dose maintaining maternal MAP >= 65 mmHg with continuous fetal heart rate monitoring when viable.",
      refs: [
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "Because alpha-adrenergic vasoconstriction can reduce uterine blood flow, titrate to the lowest effective dose"),
      ],
    },
    postpartum: {
      value: "Standard adult ICU vasopressor titration applies postpartum; no routine postpartum dose-reduction schedule required beyond hemodynamic weaning.",
      refs: [
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "Following delivery, standard adult ICU vasopressor titration applies with close monitoring"),
      ],
    },
    lactation_rid: {
      value: "Not established (expected negligible oral infant absorption)",
      refs: [
        ref(LACT_VASO, "LactMed [norepinephrine] Drug Levels", "No data are available on the excretion of norepinephrine into human milk. Because norepinephrine has poor oral bioavailability"),
      ],
    },
    lactation_summary: {
      value: "No data on human milk excretion; because norepinephrine has poor oral bioavailability and a 1 to 2 minute plasma half-life, clinically relevant infant exposure is not expected.",
      refs: [
        ref("fda-norepinephrine-label", "Section 8.2 Lactation", "There are no data on the presence of norepinephrine in either human or animal milk"),
        ref(LACT_VASO, "LactMed [norepinephrine] Summary of Use", "Because norepinephrine is poorly absorbed orally and has a short half-life, amounts ingested by the infant"),
      ],
    },
  },
  tools: {
    iv_infusion: {
      value: {
        diluent: "Dilute in 5% dextrose (D5W) or 5% dextrose in 0.9% NaCl (D5NS) to protect against oxidation; e.g., 4 mg/50 mL (80 mcg/mL) for syringe pump or 4 mg/250 mL (16 mcg/mL).",
        rate: "Initiate at 8-12 mcg/min (or 0.05-0.1 mcg/kg/min) and titrate every 2-5 min to target MAP.",
        instructions: "Infuse into a large central vein whenever possible. Avoid leg veins in elderly or occlusive vascular disease. Short-term peripheral infusion (<24-48 h) only in or proximal to antecubital fossa with q1-2h site checks.",
      },
      refs: [
        ref("fda-norepinephrine-label", "Section 2 DOSAGE AND ADMINISTRATION", "Dilute LEVOPHED prior to use [see Dosage and Administration (2.3) ] . Infuse LEVOPHED into a large vein."),
        ref(ICU_GUIDE, "Section 1 Peripheral Vasopressor Initiation", "For adults with septic shock, suggest starting vasopressors peripherally to restore MAP"),
      ],
    },
  },
  links: {
    neurocalc: "/neurocalc?tab=tools&tool=vasopressor-titration&drug=norepinephrine",
  },
  status: "draft",
  verification: {
    verified_by: null,
    verified_at: null,
    content_hash: null,
  },
};

// 2. EPINEPHRINE (Adrenaline)
const epinephrine = {
  id: "epinephrine",
  generic_name: "epinephrine",
  aliases: ["adrenaline", "adrenalin", "epi"],
  tall_man: {
    value: "epinephrine",
    refs: [
      ref("fda-epinephrine-label", "Section 1 INDICATIONS AND USAGE", "Adrenalin ® is a non-selective alpha and beta adrenergic agonist indicated for:"),
    ],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: [
    "vasopressor",
    "inotrope",
    "catecholamine",
    "non-selective alpha and beta adrenergic agonist",
  ],
  subspecialties: ["neurocritical_care"],
  vn_products: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  bhyt: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  regimens: [
    {
      id: "epi-iv-septic-shock-adult",
      indication: "Hypotension Associated with Septic Shock (Adults — Continuous IV Infusion)",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref("fda-epinephrine-label", "Section 1 INDICATIONS AND USAGE", "To increase mean arterial blood pressure in adult patients with hypotension associated with septic shock"),
        ref("fda-epinephrine-label", "Section 2.3 Septic Shock", "0.05 mcg/kg/min to 2 mcg/kg/min, titrated to achieve desired mean arterial pressure"),
      ],
      dose: null,
      dose_text:
        "0.05 mcg/kg/min to 2 mcg/kg/min continuous IV infusion, titrated every 10-15 minutes to achieve desired MAP (typically second-line add-on to norepinephrine or when cardiac dysfunction coexists). Wean gradually when hemodynamic stability is achieved.",
    },
    {
      id: "epi-im-anaphylaxis-adult",
      indication: "Anaphylaxis — Adults and Children >= 30 kg (IM/SC)",
      setting: "acute_inpatient",
      route: "IM",
      refs: [
        ref("fda-epinephrine-label", "Section 2.2 Anaphylaxis", "Adults and Children 30 kg (66 lbs) or more : 0.3 mg to 0.5 mg (0.3 mL to 0.5 mL) intramuscularly or subcutaneously"),
      ],
      dose: {
        kind: "fixed",
        amount: 0.3,
        unit: "mg",
        frequency: "IM into anterolateral thigh every 5-10 minutes as necessary (range 0.3-0.5 mg)",
        max_single: 0.5,
      },
      dose_text: "0.3 mg to 0.5 mg (0.3 mL to 0.5 mL of 1 mg/mL) IM or SC into anterolateral aspect of the thigh every 5 to 10 minutes as necessary.",
    },
  ],
  renal_basis: {
    value: null,
    refs: [],
    note: "No renal adjustment required; cleared rapidly via COMT and MAO",
  },
  hepatic: {
    value: null,
    refs: [],
    note: "No formal hepatic dose adjustment in labeling; titrate to hemodynamic response",
  },
  black_box: {
    value: null,
    refs: [],
  },
  mg_safety: {
    value: "safe",
    refs: [
      ref("fda-epinephrine-label", "Section 12.1 Mechanism of Action", "Epinephrine acts on both alpha and beta-adrenergic receptors."),
    ],
    note: "No neuromuscular junction blockade; safe in myasthenia gravis for acute anaphylaxis or shock",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "Parenteral administration only; rapidly inactivated in GI tract",
  },
  pgx: {
    value: null,
    refs: [],
    note: "No pharmacogenomic testing required",
  },
  ae_tags: {
    value: null,
    refs: [],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Anxiety, restlessness, tremor, headache",
        "Palpitations, tachycardia, diaphoresis",
        "Nausea, vomiting, pallor",
      ],
      refs: [
        ref("fda-epinephrine-label", "Section 6 ADVERSE REACTIONS", "Common adverse reactions to systemically administered epinephrine include anxiety, apprehensiveness, restlessness"),
      ],
    },
    serious: {
      value: [
        "Severe hypertension and cerebrovascular hemorrhage",
        "Pulmonary edema and ventricular arrhythmias",
        "Injection site necrosis / necrotizing fasciitis (rare IM thigh)",
      ],
      refs: [
        ref("fda-epinephrine-label", "Section 10 OVERDOSAGE", "Overdosage of epinephrine may produce extremely elevated arterial pressure, which may result in cerebrovascular hemorrhage"),
        ref("fda-epinephrine-label", "Section 5 Warnings", "Rare cases of serious skin and soft tissue infections, including necrotizing fasciitis"),
      ],
    },
  },
  mechanism_of_action: {
    value: "Epinephrine acts on both alpha and beta-adrenergic receptors, increasing ventricular contractility (positive inotropic), heart rate (positive chronotropic), and peripheral vasoconstriction.",
    refs: [
      ref("fda-epinephrine-label", "Section 12.1 Mechanism of Action", "Epinephrine acts on both alpha and beta-adrenergic receptors. The mechanism of the rise in blood pressure is 3-fold"),
    ],
  },
  enzyme_profile: {
    value: {
      qt_risk: "none",
      serotonergic: false,
    },
    refs: [
      ref("fda-epinephrine-label", "Section 12.3 Pharmacokinetics", "Following intravenous injection, epinephrine is rapidly cleared from the plasma with an effective half-life of < 5 minutes."),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Tricyclic Antidepressants, MAO Inhibitors, COMT Inhibitors (e.g., entacapone)",
        severity: "major",
        effect: "Potentiates cardiovascular pressor and arrhythmogenic effects of epinephrine.",
        management: "Monitor blood pressure and ECG continuously; start at lower infusion rates.",
        refs: [
          ref("fda-epinephrine-label", "Section 7.2 Drugs that Potentiate Epinephrine", "Drugs that potentiate the effects of epinephrine include sympathomimetics, beta blockers, tricyclic antidepressants, MAO inhibitors"),
        ],
      },
      {
        drug_or_class: "Non-selective Beta Blockers (e.g., labetalol, propranolol)",
        severity: "major",
        effect: "Unopposed alpha-adrenergic vasoconstriction can cause severe hypertension and reflex bradycardia.",
        management: "Monitor arterial blood pressure closely; consider alternative pressor/vasodilator strategies.",
        refs: [
          ref("fda-epinephrine-label", "Section 7.2 Drugs that Potentiate Epinephrine", "Drugs that potentiate the effects of epinephrine include sympathomimetics, beta blockers"),
        ],
      },
    ],
    refs: [
      ref("fda-epinephrine-label", "Section 7 DRUG INTERACTIONS", "Drugs that counter the pressor effects of epinephrine include alpha blockers"),
    ],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "5-axis synthesis: Prolonged human experience has not identified increased major birth defects, though label notes potential fetal harm from uterine vasoconstriction/hypoxia; in maternal anaphylaxis or shock, epinephrine must not be withheld.",
      refs: [
        ref("fda-epinephrine-label", "Section 8.1 Pregnancy", "Prolonged experience with epinephrine use in pregnant women over several decades, based on published literature"),
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "In pregnant patients with septic, cardiogenic, or anaphylactic shock, maternal hemodynamic stabilization"),
      ],
    },
    mcm: [],
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: {
      value: "No formal pregnancy PK dose adjustment; titrate to lowest effective dose for maternal MAP/anaphylaxis reversal with continuous fetal monitoring.",
      refs: [
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "Because alpha-adrenergic vasoconstriction can reduce uterine blood flow, titrate to the lowest effective dose"),
      ],
    },
    postpartum: {
      value: "Standard adult ICU titration and gradual weaning apply postpartum.",
      refs: [
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "Following delivery, standard adult ICU vasopressor titration applies with close monitoring"),
      ],
    },
    lactation_rid: {
      value: "Not established (expected negligible oral infant absorption)",
      refs: [
        ref(LACT_VASO, "LactMed [epinephrine] Drug Levels", "No data are available on the excretion of epinephrine into human milk. Epinephrine is rapidly destroyed"),
      ],
    },
    lactation_summary: {
      value: "Poor oral bioavailability and plasma half-life < 5 minutes make clinically significant infant exposure via breastmilk unlikely.",
      refs: [
        ref("fda-epinephrine-label", "Section 8.2 Lactation", "There is no information regarding the presence of epinephrine in human milk or the effects of epinephrine"),
        ref(LACT_VASO, "LactMed [epinephrine] Summary of Use", "Because epinephrine is poorly absorbed orally and rapidly inactivated in the infant gastrointestinal tract"),
      ],
    },
  },
  tools: {
    iv_infusion: {
      value: {
        diluent: "Dilute 1 mg/mL concentrate in D5W or 0.9% NaCl; e.g., 5 mg/50 mL (100 mcg/mL) for syringe pump or 4 mg/250 mL (16 mcg/mL).",
        rate: "Septic shock: 0.05 to 2 mcg/kg/min continuous IV infusion; titrate q10-15 min and wean gradually.",
        instructions: "Infuse via central venous catheter when possible; inspect solution for discoloration/precipitate before use.",
      },
      refs: [
        ref("fda-epinephrine-label", "Section 2.3 Septic Shock", "0.05 mcg/kg/min to 2 mcg/kg/min, titrated to achieve desired mean arterial pressure"),
        ref("fda-epinephrine-label", "Section 2.1 General Considerations", "Inspect visually for particulate matter and discoloration prior to administration; solution should be clear and colorless."),
      ],
    },
  },
  links: {
    neurocalc: "/neurocalc?tab=tools&tool=vasopressor-titration&drug=epinephrine",
  },
  status: "draft",
  verification: {
    verified_by: null,
    verified_at: null,
    content_hash: null,
  },
};

// 3. DOPAMINE
const dopamine = {
  id: "dopamine",
  generic_name: "dopamine",
  aliases: ["intropin", "dopamine hydrochloride"],
  tall_man: {
    value: "DOPamine",
    refs: [
      ref(TALL_MAN, "FDA Name Differentiation List", "DOPamine"),
    ],
    note: "ISMP/FDA Tall Man lettering distinguishes DOPamine from DOBUTamine",
  },
  classes: [
    "vasopressor",
    "inopressor",
    "catecholamine",
    "adrenergic and dopaminergic sympathomimetic",
  ],
  subspecialties: ["neurocritical_care", "stroke"],
  vn_products: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  bhyt: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  regimens: [
    {
      id: "dopa-iv-shock-adult",
      indication: "Hemodynamic Imbalance in Shock / Symptomatic Bradycardia (Adults — Continuous IV Infusion)",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref("fda-dopamine-label", "Section 2 DOSAGE AND ADMINISTRATION", "2 to 5 mcg/kg/minute as a continuous intravenous infusion. Titrate in 5 to 10 mcg/kg/minute increments"),
        ref(ICU_GUIDE, "Section 1 Dopamine Restriction", "Recommend against using dopamine for septic shock except in highly selected patients with low risk"),
      ],
      dose: null,
      dose_text:
        "Initiate at 2 to 5 mcg/kg/min continuous IV infusion; titrate in 5 to 10 mcg/kg/min increments up to 20-50 mcg/kg/min (SSC 2021 recommends against dopamine in septic shock except select patients with bradycardia and low arrhythmia risk; avoid low-dose dopamine for renal protection).",
    },
  ],
  renal_basis: {
    value: null,
    refs: [],
    note: "No renal adjustment required; short plasma half-life < 2 minutes",
  },
  hepatic: {
    value: null,
    refs: [],
    note: "No hepatic dose-adjustment bands specified in FDA labeling",
  },
  black_box: {
    value: null,
    refs: [],
  },
  mg_safety: {
    value: "safe",
    refs: [
      ref("fda-dopamine-label", "Section 12.1 Mechanism of Action", "Dopamine is a natural catecholamine formed by the decarboxylation of 3,4-dihydroxyphenylalanine (DOPA)."),
    ],
    note: "No neuromuscular junction blockade reported",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "Intravenous infusion only; inactive orally",
  },
  pgx: {
    value: null,
    refs: [],
    note: "No pharmacogenomic testing required",
  },
  ae_tags: {
    value: null,
    refs: [],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Tachycardia and ectopic beats",
        "Nausea, vomiting, headache",
        "Vasoconstriction and dyspnea",
      ],
      refs: [
        ref("fda-dopamine-label", "Section 12.1 Mechanism of Action", "Dopamine is a natural catecholamine formed by the decarboxylation of 3,4-dihydroxyphenylalanine (DOPA)."),
      ],
    },
    serious: {
      value: [
        "Ventricular arrhythmias and tachyarrhythmias",
        "Tissue ischemia and extravasation sloughing/necrosis",
        "Severe hypertension (especially with MAOIs)",
      ],
      refs: [
        ref("fda-dopamine-label", "Section 6 ADVERSE REACTIONS", "Hypotension [see Warnings and Precautions (5.3) ]"),
        ref("fda-dopamine-label", "Section 7 DRUG INTERACTIONS", "monoamine oxidase (MAO), inhibition of this enzyme prolongs and potentiates the effect of dopamine"),
      ],
    },
  },
  mechanism_of_action: {
    value: "Endogenous catecholamine acting on dopaminergic (D1/D2), beta-1 adrenergic (inotropic/chronotropic at 5-10 mcg/kg/min), and alpha-1 adrenergic (vasoconstriction >10 mcg/kg/min) receptors.",
    refs: [
      ref("fda-dopamine-label", "Section 12.1 Mechanism of Action", "Dopamine is a natural catecholamine formed by the decarboxylation of 3,4-dihydroxyphenylalanine (DOPA). It is a precursor to norepinephrine"),
    ],
  },
  enzyme_profile: {
    value: {
      qt_risk: "none",
      serotonergic: false,
    },
    refs: [
      ref("fda-dopamine-label", "Section 12.3 Pharmacokinetics", "The half-life of dopamine in adults is less than 2 minutes."),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAO Inhibitors (e.g., linezolid, rasagiline)",
        severity: "major",
        effect: "Prolongs and potentiates dopamine pressor effect, causing severe hypertension and arrhythmias.",
        management: "Reduce recommended starting dosage of dopamine to no greater than one-tenth (1/10) of the usual dose.",
        refs: [
          ref("fda-dopamine-label", "Section 7 DRUG INTERACTIONS", "monoamine oxidase (MAO), inhibition of this enzyme prolongs and potentiates the effect of dopamine which may result in severe hypertension"),
        ],
      },
      {
        drug_or_class: "Tricyclic Antidepressants (e.g., amitriptyline)",
        severity: "major",
        effect: "Concomitant use may potentiate cardiovascular pressor effects (hypertension).",
        management: "Monitor arterial blood pressure continuously and titrate cautiously.",
        refs: [
          ref("fda-dopamine-label", "Section 7 DRUG INTERACTIONS", "Tricyclic Antidepressants Clinical Impact: Concomitant use may potentiate the cardiovascular effects of dopamine"),
        ],
      },
    ],
    refs: [
      ref("fda-dopamine-label", "Section 7 DRUG INTERACTIONS", "monoamine oxidase (MAO), inhibition of this enzyme prolongs and potentiates the effect of dopamine"),
    ],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "5-axis synthesis: No human pregnancy data; norepinephrine is preferred in maternal shock because dopamine carries higher arrhythmia risk and potential uterine vasoconstriction.",
      refs: [
        ref("fda-dopamine-label", "Section 8.1 Pregnancy", "There are no human data with dopamine use in pregnant women. There are risks to the mother and fetus from hypotension"),
      ],
    },
    mcm: [],
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: {
      value: "No pregnancy PK adjustment established; reserve for select bradycardic shock where norepinephrine is unsuitable, with fetal monitoring.",
      refs: [
        ref("fda-dopamine-label", "Section 8.1 Pregnancy", "There are risks to the mother and fetus from hypotension associated with shock, which can be fatal if left untreated"),
      ],
    },
    postpartum: {
      value: "Standard ICU weaning applies postpartum; note that dopamine suppresses maternal prolactin and may inhibit lactation initiation.",
      refs: [
        ref(LACT_VASO, "LactMed [dopamine] Summary of Use", "However, dopamine is a physiological prolactin-inhibiting factor that suppresses maternal serum prolactin secretion"),
      ],
    },
    lactation_rid: {
      value: "Not established (poor oral absorption; suppresses maternal prolactin)",
      refs: [
        ref(LACT_VASO, "LactMed [dopamine] Drug Levels", "No data are available on the excretion of dopamine into human milk. Dopamine has poor oral bioavailability"),
      ],
    },
    lactation_summary: {
      value: "Oral infant absorption is negligible, but intravenous dopamine suppresses maternal prolactin and can inhibit milk production during infusion; production recovers after stopping.",
      refs: [
        ref("fda-dopamine-label", "Section 8.2 Lactation", "There are no data regarding the presence of dopamine in human milk, the effects of dopamine on the breastfed infant"),
        ref(LACT_VASO, "LactMed [dopamine] Summary of Use", "However, dopamine is a physiological prolactin-inhibiting factor that suppresses maternal serum prolactin secretion"),
      ],
    },
  },
  tools: {
    iv_infusion: {
      value: {
        diluent: "Compatible with D5W or 0.9% NaCl (avoid alkaline solutions such as sodium bicarbonate); e.g., 200 mg/50 mL (4,000 mcg/mL) syringe or 400 mg/250 mL (1,600 mcg/mL).",
        rate: "2 to 5 mcg/kg/min initial; titrate in 5-10 mcg/kg/min increments (max 50 mcg/kg/min).",
        instructions: "Infuse into a large central vein via calibrated infusion pump; avoid extravasation (phentolamine rescue if extravasation occurs).",
      },
      refs: [
        ref("fda-dopamine-label", "Section 2 DOSAGE AND ADMINISTRATION", "Administer Dopamine HCl in Dextrose Injection into a large vein"),
      ],
    },
  },
  links: {
    neurocalc: "/neurocalc?tab=tools&tool=vasopressor-titration&drug=dopamine",
  },
  status: "draft",
  verification: {
    verified_by: null,
    verified_at: null,
    content_hash: null,
  },
};

// 4. DOBUTAMINE
const dobutamine = {
  id: "dobutamine",
  generic_name: "dobutamine",
  aliases: ["dobutrex", "dobutamine hydrochloride"],
  tall_man: {
    value: "DOBUTamine",
    refs: [
      ref(TALL_MAN, "FDA Name Differentiation List", "DOBUTamine"),
    ],
    note: "ISMP/FDA Tall Man lettering distinguishes DOBUTamine from DOPamine",
  },
  classes: [
    "inotrope",
    "beta-1 adrenergic agonist",
    "catecholamine",
  ],
  subspecialties: ["neurocritical_care"],
  vn_products: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  bhyt: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  regimens: [
    {
      id: "dobut-iv-inotropic-adult",
      indication: "Short-Term Inotropic Support in Cardiac Decompensation / Septic Cardiomyopathy (Adults — Continuous IV)",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref("fda-dobutamine-label", "1 INDICATIONS AND USAGE", "Dobutamine in 5% Dextrose Injection, USP is indicated when parenteral therapy is necessary for inotropic support"),
        ref("fda-dobutamine-label", "2 DOSAGE AND ADMINISTRATION", "0.5 to 1.0 µg/kg/min) and titrated at intervals of a few minutes, guided by the patient's response"),
        ref(ICU_GUIDE, "Section 1 Epinephrine & Dobutamine", "For adults with septic shock and cardiac dysfunction with persistent hypoperfusion despite adequate volume status"),
      ],
      dose: null,
      dose_text:
        "Start at 0.5 to 1.0 mcg/kg/min (usual clinical range 2 to 20 mcg/kg/min, max 40 mcg/kg/min) continuous IV infusion via calibrated pump; titrate every few minutes based on cardiac output, BP, heart rate, ectopy, and urine output. Often combined with norepinephrine if vasodilatory hypotension coexists.",
    },
  ],
  renal_basis: {
    value: null,
    refs: [],
    note: "No renal adjustment required; short plasma half-life ~2 minutes",
  },
  hepatic: {
    value: null,
    refs: [],
    note: "No hepatic dose-adjustment bands specified in labeling",
  },
  black_box: {
    value: null,
    refs: [],
  },
  mg_safety: {
    value: "safe",
    refs: [
      ref("fda-dobutamine-label", "12 CLINICAL PHARMACOLOGY", "Dobutamine is a direct-acting inotropic agent whose primary activity results from stimulation of the"),
    ],
    note: "No neuromuscular junction blockade reported",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "Intravenous infusion only; inactive orally",
  },
  pgx: {
    value: null,
    refs: [],
    note: "No pharmacogenomic testing required",
  },
  ae_tags: {
    value: null,
    refs: [],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Increase in heart rate (5-15 bpm) and systolic BP (10-20 mmHg)",
        "Ventricular ectopic activity",
        "Nausea, headache, angina, dyspnea",
      ],
      refs: [
        ref("fda-dobutamine-label", "6 ADVERSE REACTIONS", "A 10- to 20-mm Hg increase in systolic blood pressure and an increase in heart rate of 5 to 15 beats/minute"),
      ],
    },
    serious: {
      value: [
        "Exaggerated tachycardia, ventricular arrhythmias, myocardial ischemia",
        "Hypotension (beta-2 mediated vasodilation if hypovolemic)",
        "Contraindicated in idiopathic hypertrophic subaortic stenosis (IHSS/HOCM)",
      ],
      refs: [
        ref("fda-dobutamine-label", "4 CONTRAINDICATIONS", "Dobutamine in 5% Dextrose Injection, USP is contraindicated in patients with idiopathic hypertrophic subaortic stenosis"),
      ],
    },
  },
  mechanism_of_action: {
    value: "Direct-acting synthetic catecholamine whose primary inotropic activity results from cardiac beta-1 adrenergic receptor stimulation with mild beta-2 vasodilation.",
    refs: [
      ref("fda-dobutamine-label", "12 CLINICAL PHARMACOLOGY", "Dobutamine is a direct-acting inotropic agent whose primary activity results from stimulation of the"),
    ],
  },
  enzyme_profile: {
    value: {
      qt_risk: "none",
      serotonergic: false,
    },
    refs: [
      ref("fda-dobutamine-label", "12 CLINICAL PHARMACOLOGY", "Dobutamine is a direct-acting inotropic agent"),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "COMT Inhibitors (e.g., entacapone)",
        severity: "moderate",
        effect: "May result in higher heart rate, arrhythmias, and exaggerated blood pressure fluctuations.",
        management: "Monitor ECG and arterial pressure closely during concomitant therapy.",
        refs: [
          ref("fda-dobutamine-label", "PRECAUTIONS Drug Interactions", "Concomitant use of dobutamine and catechol-O-methyltranferase (COMT) inhibitors (e.g., entacapone) may result"),
        ],
      },
      {
        drug_or_class: "Nitroprusside",
        severity: "moderate",
        effect: "Additive hemodynamic effect yielding higher cardiac output and lower pulmonary wedge pressure.",
        management: "Monitor arterial blood pressure and cardiac filling pressures.",
        refs: [
          ref("fda-dobutamine-label", "PRECAUTIONS Drug Interactions", "nitroprusside results in a higher cardiac output and, usually, a lower pulmonary wedge pressure"),
        ],
      },
    ],
    refs: [
      ref("fda-dobutamine-label", "PRECAUTIONS Drug Interactions", "Concomitant use of dobutamine and catechol-O-methyltranferase (COMT) inhibitors"),
    ],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "5-axis synthesis: Animal reproduction studies in rats/rabbits showed no fetal harm, but adequate human pregnancy studies are lacking; reserve for clear maternal cardiac decompensation.",
      refs: [
        ref("fda-dobutamine-label", "PRECAUTIONS Pregnancy", "Reproduction studies performed in rats and rabbits have revealed no evidence of harm to the fetus due to dobutamine."),
      ],
    },
    mcm: [],
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: {
      value: "No formal pregnancy PK adjustment; titrate to maternal hemodynamic/cardiac output response.",
      refs: [
        ref("fda-dobutamine-label", "PRECAUTIONS Pregnancy", "The drug, however, has not been administered to pregnant women and should be used only when the expected benefit"),
      ],
    },
    postpartum: {
      value: "Standard ICU hemodynamic tapering applies postpartum (e.g., peripartum cardiomyopathy).",
      refs: [
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "Following delivery, standard adult ICU vasopressor titration applies with close monitoring"),
      ],
    },
    lactation_rid: {
      value: "Not established (inactive orally; half-life ~2 min)",
      refs: [
        ref(LACT_VASO, "LactMed [dobutamine] Drug Levels", "No data are available on the excretion of dobutamine into human milk. Dobutamine is inactive when given orally"),
      ],
    },
    lactation_summary: {
      value: "Dobutamine is inactive orally and has a ~2 minute plasma half-life; clinically significant infant exposure via breastmilk is not expected.",
      refs: [
        ref(LACT_VASO, "LactMed [dobutamine] Summary of Use", "Because dobutamine is poorly absorbed orally and has an extremely short plasma half-life"),
      ],
    },
  },
  tools: {
    iv_infusion: {
      value: {
        diluent: "Dilute in D5W or 0.9% NaCl (avoid alkaline solutions); e.g., 250 mg/50 mL (5,000 mcg/mL) syringe or 250 mg/250 mL (1,000 mcg/mL).",
        rate: "Usual 2 to 20 mcg/kg/min (initiate 0.5-1 mcg/kg/min); titrate by cardiac output, BP, and HR.",
        instructions: "Use calibrated electronic infusion pump; correct hypovolemia before initiation to avoid beta-2 mediated hypotension.",
      },
      refs: [
        ref("fda-dobutamine-label", "2 DOSAGE AND ADMINISTRATION", "A calibrated electronic infusion device is recommended for controlling the rate of flow in mL/hour or drops/minute."),
      ],
    },
  },
  links: {
    neurocalc: "/neurocalc?tab=tools&tool=vasopressor-titration&drug=dobutamine",
  },
  status: "draft",
  verification: {
    verified_by: null,
    verified_at: null,
    content_hash: null,
  },
};

// 5. VASOPRESSIN
const vasopressin = {
  id: "vasopressin",
  generic_name: "vasopressin",
  aliases: ["argipressin", "vasostrict", "pitressin", "adh", "arginine vasopressin"],
  tall_man: {
    value: "vasopressin",
    refs: [
      ref("fda-vasopressin-label", "Section 11 DESCRIPTION", "Vasopressin is a polypeptide hormone that causes contraction of vascular and other smooth muscles"),
    ],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: [
    "vasopressor",
    "non-catecholamine vasopressin V1/V2 agonist",
    "antidiuretic hormone analogue",
  ],
  subspecialties: ["neurocritical_care"],
  vn_products: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  bhyt: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  regimens: [
    {
      id: "vaso-iv-septic-shock-adult",
      indication: "Vasodilatory / Septic Shock (Adults — Continuous IV Infusion, Catecholamine-Sparing)",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref("fda-vasopressin-label", "Section 1 INDICATIONS AND USAGE", "Vasostrict ® is indicated to increase blood pressure in adults with vasodilatory shock"),
        ref("fda-vasopressin-label", "Section 2.2 Septic Shock", "For septic shock, start with a dose of 0.01 units/minute. If the target blood pressure response is not achieved"),
        ref(ICU_GUIDE, "Section 1 Vasopressin Escalation", "suggest adding vasopressin (up to 0.03 units/min) instead of escalating the dose of norepinephrine alone"),
      ],
      dose: null,
      dose_text:
        "Septic shock: Fixed 0.03 units/min continuous IV infusion (SSC 2021) or FDA range 0.01 to 0.07 units/min (titrate by 0.005 units/min q10-15 min). Post-cardiotomy vasodilatory shock: 0.03 to 0.1 units/min. Administer via central venous line.",
    },
  ],
  renal_basis: {
    value: null,
    refs: [],
    note: "No renal adjustment required; short plasma t1/2 <= 10 minutes",
  },
  hepatic: {
    value: null,
    refs: [],
    note: "No hepatic dose-adjustment bands specified in labeling",
  },
  black_box: {
    value: null,
    refs: [],
  },
  mg_safety: {
    value: "safe",
    refs: [
      ref("fda-vasopressin-label", "Section 12.1 Mechanism of Action", "The vasoconstrictive effects of vasopressin are mediated by vascular V 1 receptors."),
    ],
    note: "No neuromuscular junction blockade; monitor serum sodium for hyponatremia",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "Intravenous infusion only; peptide inactivated by GI trypsin",
  },
  pgx: {
    value: null,
    refs: [],
    note: "No pharmacogenomic testing required",
  },
  ae_tags: {
    value: ["hyponatremia"],
    refs: [
      ref("fda-vasopressin-label", "Section 10 OVERDOSAGE", "Overdosage with Vasostrict ® can be expected to manifest as consequences of vasoconstriction"),
    ],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Decreased cardiac output and bradycardia",
        "Hyponatremia and water intoxication",
        "Peripheral / digital vasoconstriction",
      ],
      refs: [
        ref("fda-vasopressin-label", "Section 10 OVERDOSAGE", "Overdosage with Vasostrict ® can be expected to manifest as consequences of vasoconstriction"),
      ],
    },
    serious: {
      value: [
        "Mesenteric, coronary, and severe peripheral/digital ischemia",
        "Severe hyponatremia",
        "Hypersensitivity / anaphylaxis to 8-L-arginine vasopressin or chlorobutanol",
      ],
      refs: [
        ref("fda-vasopressin-label", "Section 4 CONTRAINDICATIONS", "Vasostrict ® is contraindicated in patients with known allergy or hypersensitivity to 8-L-arginine vasopressin"),
        ref("fda-vasopressin-label", "Section 10 OVERDOSAGE", "Overdosage with Vasostrict ® can be expected to manifest as consequences of vasoconstriction of various vascular beds"),
      ],
    },
  },
  mechanism_of_action: {
    value: "Non-catecholamine vasoconstrictor acting on vascular V1 receptors (coupled to phospholipase C, increasing intracellular calcium) and renal V2 receptors (antidiuretic).",
    refs: [
      ref("fda-vasopressin-label", "Section 12.1 Mechanism of Action", "The vasoconstrictive effects of vasopressin are mediated by vascular V 1 receptors."),
    ],
  },
  enzyme_profile: {
    value: {
      qt_risk: "none",
      serotonergic: false,
    },
    refs: [
      ref("fda-vasopressin-label", "Section 12.3 Pharmacokinetics", "The apparent t 1/2 of vasopressin at these levels is ≤10 minutes."),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Catecholamines (norepinephrine, epinephrine, dopamine)",
        severity: "moderate",
        effect: "Pressor effects on mean arterial blood pressure are additive (catecholamine-sparing).",
        management: "Titrate catecholamine infusion downward as MAP target is achieved.",
        refs: [
          ref("fda-vasopressin-label", "Section 7.1 Catecholamines", "Use with catecholamines is expected to result in an additive effect on mean arterial blood pressure"),
        ],
      },
      {
        drug_or_class: "Indomethacin & Drugs Causing SIADH (e.g., carbamazepine, SSRIs)",
        severity: "moderate",
        effect: "May prolong or increase the pressor and antidiuretic response to vasopressin.",
        management: "Monitor arterial blood pressure and serum sodium closely.",
        refs: [
          ref("fda-vasopressin-label", "Section 7 DRUG INTERACTIONS", "Indomethacin may prolong effects of Vasostrict ® . ( 7.2 ) Co-administration of ganglionic blockers or drugs causing SIADH"),
        ],
      },
    ],
    refs: [
      ref("fda-vasopressin-label", "Section 7.1 Catecholamines", "Use with catecholamines is expected to result in an additive effect"),
    ],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "5-axis synthesis: Pregnancy Category C with no adequate human trials; may induce uterine contractions via oxytocin/V1a cross-reactivity, especially near term — reserve for catecholamine-refractory maternal shock.",
      refs: [
        ref("fda-vasopressin-label", "Section 8.1 Pregnancy", "There are no adequate or well-controlled studies of Vasostrict ® in pregnant women."),
        ref("fda-vasopressin-label", "Section 8 USE IN SPECIFIC POPULATIONS", "Pregnancy: May induce uterine contractions."),
      ],
    },
    mcm: [],
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: {
      value: "Clearance of vasopressin may increase in late pregnancy due to placental vasopressinase; use lowest effective dose with uterine/fetal monitoring.",
      refs: [
        ref("fda-vasopressin-label", "Section 8.1 Pregnancy", "There are no adequate or well-controlled studies of Vasostrict ® in pregnant women."),
      ],
    },
    postpartum: {
      value: "Standard ICU weaning applies postpartum; avoid abrupt withdrawal before catecholamines are minimized.",
      refs: [
        ref(ICU_GUIDE, "Section 4 Peripartum & Obstetric Critical Care", "Following delivery, standard adult ICU vasopressor titration applies with close monitoring"),
      ],
    },
    lactation_rid: {
      value: "Not established (peptide inactivated by GI trypsin)",
      refs: [
        ref(LACT_VASO, "LactMed [vasopressin] Drug Levels", "No data are available on the excretion of exogenous vasopressin into human milk."),
      ],
    },
    lactation_summary: {
      value: "Peptide hormone rapidly destroyed by trypsin in the infant GI tract; oral absorption by a nursing infant is unlikely.",
      refs: [
        ref("fda-vasopressin-label", "Section 8.3 Nursing Mothers", "It is not known whether vasopressin is present in human milk. However, oral absorption by a nursing infant is unlikely"),
        ref(LACT_VASO, "LactMed [vasopressin] Summary of Use", "Because vasopressin is a peptide rapidly degraded in the gastrointestinal tract with negligible oral bioavailability"),
      ],
    },
  },
  tools: {
    iv_infusion: {
      value: {
        diluent: "Dilute in 0.9% NaCl or D5W to 0.1 units/mL (or 0.4 units/mL = 20 U/50 mL syringe; max 1 unit/mL). Discard unused diluted solution after 18 h at room temperature or 24 h refrigerated.",
        rate: "Septic shock: 0.01 to 0.07 units/min (SSC 2021 standard: 0.03 units/min fixed). Post-cardiotomy: 0.03 to 0.1 units/min.",
        instructions: "Central venous catheter strongly preferred/mandatory (no phentolamine reversal for extravasation). Do not bolus.",
      },
      refs: [
        ref("fda-vasopressin-label", "Section 2 DOSAGE AND ADMINISTRATION", "Dilute Vasostrict ® with normal saline (0.9% sodium chloride) or 5% dextrose in water (D5W) to either 0.1 units/mL"),
      ],
    },
  },
  links: {
    neurocalc: "/neurocalc?tab=tools&tool=vasopressor-titration&drug=vasopressin",
  },
  status: "draft",
  verification: {
    verified_by: null,
    verified_at: null,
    content_hash: null,
  },
};

for (const d of [norepinephrine, epinephrine, dopamine, dobutamine, vasopressin]) {
  writeDrug(d);
}

// Curated Interactions
const newInteractions = [
  {
    id: "norepinephrine-amitriptyline",
    drug_a: "norepinephrine",
    drug_b: "amitriptyline",
    severity: "major",
    mechanism: "Tricyclic antidepressants inhibit neuronal reuptake of norepinephrine, markedly potentiating alpha-adrenergic pressor response.",
    clinical_effect: "Severe, prolonged hypertension and reflex bradycardia or cardiac arrhythmias.",
    management: "Avoid if possible; if vasopressor support is required, initiate norepinephrine at reduced rates with continuous arterial blood pressure and ECG monitoring.",
    alternatives: [],
    refs: [
      ref("fda-norepinephrine-label", "Section 7.1 MAO-Inhibiting Drugs", "antidepressants of the triptyline or imipramine types may result in hypertension."),
    ],
  },
  {
    id: "norepinephrine-rasagiline",
    drug_a: "norepinephrine",
    drug_b: "rasagiline",
    severity: "major",
    mechanism: "Monoamine oxidase inhibition impairs catecholamine degradation, prolonging and amplifying norepinephrine pressor activity.",
    clinical_effect: "Severe, prolonged hypertension and hypertensive crisis.",
    management: "Avoid concomitant use where possible; if norepinephrine is clinically essential, start at minimal infusion rates under continuous invasive BP monitoring.",
    alternatives: [
      {
        drug_id: "vasopressin",
        rationale: "Non-catecholamine V1 vasoconstrictor not metabolized by MAO",
      },
    ],
    refs: [
      ref("fda-norepinephrine-label", "Section 7.1 MAO-Inhibiting Drugs", "Co-administration of LEVOPHED with monoamine oxidase (MAO) inhibitors or other drugs with MAO-inhibiting properties"),
    ],
  },
  {
    id: "epinephrine-amitriptyline",
    drug_a: "epinephrine",
    drug_b: "amitriptyline",
    severity: "major",
    mechanism: "Tricyclic antidepressants block presynaptic catecholamine reuptake, potentiating alpha- and beta-adrenergic cardiovascular effects.",
    clinical_effect: "Marked hypertension, tachycardia, and ventricular arrhythmias.",
    management: "Use lowest effective epinephrine rate and monitor continuous ECG and arterial blood pressure.",
    alternatives: [],
    refs: [
      ref("fda-epinephrine-label", "Section 7.2 Drugs that Potentiate Epinephrine", "Drugs that potentiate the effects of epinephrine include sympathomimetics, beta blockers, tricyclic antidepressants, MAO inhibitors"),
    ],
  },
  {
    id: "epinephrine-labetalol",
    drug_a: "epinephrine",
    drug_b: "labetalol",
    severity: "major",
    mechanism: "Beta-adrenergic blockade leaves alpha-1 mediated vasoconstriction unopposed when exogenous epinephrine is infused.",
    clinical_effect: "Paradoxical severe hypertension and reflex bradycardia.",
    management: "Monitor blood pressure closely; avoid non-selective beta-blockers during acute epinephrine infusion unless specifically indicated.",
    alternatives: [],
    refs: [
      ref("fda-epinephrine-label", "Section 7.2 Drugs that Potentiate Epinephrine", "Drugs that potentiate the effects of epinephrine include sympathomimetics, beta blockers, tricyclic antidepressants"),
    ],
  },
  {
    id: "dopamine-rasagiline",
    drug_a: "dopamine",
    drug_b: "rasagiline",
    severity: "major",
    mechanism: "MAO inhibition prevents breakdown of exogenous dopamine and its norepinephrine metabolite, markedly prolonging pressor activity.",
    clinical_effect: "Severe hypertension and cardiac arrhythmias.",
    management: "Reduce the recommended starting dosage of dopamine to no greater than one-tenth (1/10) of the usual dose and monitor continuously.",
    alternatives: [],
    refs: [
      ref("fda-dopamine-label", "Section 7 DRUG INTERACTIONS", "monoamine oxidase (MAO), inhibition of this enzyme prolongs and potentiates the effect of dopamine which may result in severe hypertension"),
    ],
  },
  {
    id: "dobutamine-entacapone",
    drug_a: "dobutamine",
    drug_b: "entacapone",
    severity: "moderate",
    mechanism: "COMT inhibition impairs metabolic inactivation of dobutamine.",
    clinical_effect: "Higher heart rate, arrhythmias, and exaggerated blood pressure changes.",
    management: "Monitor continuous ECG and arterial blood pressure when infusing dobutamine in patients receiving entacapone.",
    alternatives: [],
    refs: [
      ref("fda-dobutamine-label", "PRECAUTIONS Drug Interactions", "Concomitant use of dobutamine and catechol-O-methyltranferase (COMT) inhibitors (e.g., entacapone) may result"),
    ],
  },
  {
    id: "vasopressin-carbamazepine",
    drug_a: "vasopressin",
    drug_b: "carbamazepine",
    severity: "moderate",
    mechanism: "Carbamazepine enhances renal V2 antidiuretic sensitivity and SIADH risk, potentiating vasopressin effects.",
    clinical_effect: "Increased pressor and antidiuretic response with heightened risk of hyponatremia.",
    management: "Monitor serum sodium and arterial blood pressure closely during concomitant vasopressin infusion.",
    alternatives: [],
    refs: [
      ref("fda-vasopressin-label", "Section 7 DRUG INTERACTIONS", "Co-administration of ganglionic blockers or drugs causing SIADH may increase the pressor response."),
    ],
  },
];

const existingInteractions = JSON.parse(fs.readFileSync(INTERACTIONS_FILE, "utf-8"));
const newIds = new Set(newInteractions.map((x) => x.id));
const mergedInteractions = [
  ...existingInteractions.filter((x) => !newIds.has(x.id)),
  ...newInteractions,
];
fs.writeFileSync(INTERACTIONS_FILE, JSON.stringify(mergedInteractions, null, 2) + "\n", "utf-8");
console.log(`✅ Merged ${newInteractions.length} vasopressor interactions into interactions.json (total: ${mergedInteractions.length})`);
