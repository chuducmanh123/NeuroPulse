import fs from "node:fs";
import path from "node:path";

const SOURCES_DIR = path.resolve(process.cwd(), "data/neurorx/sources");
const DRUGS_DIR = path.resolve(process.cwd(), "data/neurorx/drugs");

const cache = new Map();
function loadSource(sourceId) {
  if (!cache.has(sourceId)) {
    cache.set(
      sourceId,
      fs.readFileSync(path.join(SOURCES_DIR, `${sourceId}.txt`), "utf-8")
    );
  }
  return cache.get(sourceId);
}

function ref(sourceId, locator, anchor, maxLen = 360) {
  const text = loadSource(sourceId);
  const idx = text.indexOf(anchor);
  if (idx === -1) {
    throw new Error(`Anchor not found in ${sourceId}: ${anchor}`);
  }
  let slice = text.slice(idx, idx + maxLen);
  if (slice.length === maxLen) {
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 50) slice = slice.slice(0, lastSpace);
  }
  const quote = slice.trim();
  if (!text.includes(quote)) {
    throw new Error(`Verbatim check failed in ${sourceId} for: ${quote}`);
  }
  return { source_id: sourceId, locator, quote };
}

const FDA = "fda-enoxaparin-label";
const ACOG = "acog-pb196-vte-pregnancy";
const REPRO3 = "neuro-repro-wave3-guidelines";

const enoxaparin = {
  id: "enoxaparin",
  generic_name: "enoxaparin",
  tall_man: {
    value: "enoxaparin",
    refs: [
      ref(
        FDA,
        "1 INDICATIONS AND USAGE",
        "Lovenox is a low molecular weight heparin (LMWH) indicated for:",
        140
      ),
    ],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: [
    "anticoagulant",
    "low molecular weight heparin",
    "antithrombotic",
  ],
  subspecialties: ["stroke", "neurocritical_care"],
  vn_products: {
    value: null,
    refs: [],
    note: "Pending user source submission",
  },
  bhyt: {
    value: null,
    refs: [],
    note: "BHYT circular data pending user source submission",
  },
  regimens: [
    {
      id: "enox-sc-dvt-prophylaxis-medical",
      indication:
        "Prophylaxis of Deep Vein Thrombosis in Medical Patients with Severely Restricted Mobility During Acute Illness",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.2 Adult Dosage — Medical Patients during Acute Illness",
          "The recommended dose of Lovenox is 40 mg once a day administered by subcutaneous injection for medical patients at risk for thromboembolic complications due to severely restricted mobility during acute illness. The usual duration of administration is 6 to 11 days",
          270
        ),
      ],
      dose: {
        kind: "fixed",
        amount: 40,
        unit: "mg",
        frequency: "once daily SC (usual duration 6 to 11 days)",
        max_single: 40,
        max_daily: 40,
      },
      dose_text:
        "40 mg subcutaneously once daily for 6 to 11 days. Reduce to 30 mg subcutaneously once daily if CrCl <30 mL/min.",
      renal_bands: [
        {
          min: 0,
          max: 29,
          dose_text:
            "30 mg administered subcutaneously once daily (CrCl <30 mL/min).",
          dose: {
            kind: "fixed",
            amount: 30,
            unit: "mg",
            frequency: "once daily SC",
            max_single: 30,
            max_daily: 30,
          },
          refs: [
            ref(
              FDA,
              "2.3 Dose Reduction for Patients with Severe Renal Impairment (Table 1)",
              "Prophylaxis in medical patients during acute illness 30 mg administered subcutaneously once daily",
              120
            ),
          ],
        },
      ],
    },
    {
      id: "enox-sc-dvt-prophylaxis-abdominal",
      indication: "Prophylaxis of Deep Vein Thrombosis in Abdominal Surgery",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.2 Adult Dosage — Abdominal Surgery",
          "The recommended dose of Lovenox is 40 mg by subcutaneous injection once a day (with the initial dose given 2 hours prior to surgery) in patients undergoing abdominal surgery who are at risk for thromboembolic complications. The usual duration of administration is 7 to 10 days",
          285
        ),
      ],
      dose: {
        kind: "fixed",
        amount: 40,
        unit: "mg",
        frequency: "once daily SC (initial dose 2 hours prior to surgery; 7 to 10 days)",
        max_single: 40,
        max_daily: 40,
      },
      dose_text:
        "40 mg subcutaneously once daily (initial dose 2 hours prior to surgery) for 7 to 10 days. Reduce to 30 mg once daily if CrCl <30 mL/min.",
      renal_bands: [
        {
          min: 0,
          max: 29,
          dose_text:
            "30 mg administered subcutaneously once daily (CrCl <30 mL/min).",
          dose: {
            kind: "fixed",
            amount: 30,
            unit: "mg",
            frequency: "once daily SC",
            max_single: 30,
            max_daily: 30,
          },
          refs: [
            ref(
              FDA,
              "2.3 Dose Reduction for Patients with Severe Renal Impairment (Table 1)",
              "Prophylaxis in abdominal surgery 30 mg administered subcutaneously once daily",
              100
            ),
          ],
        },
      ],
    },
    {
      id: "enox-sc-dvt-prophylaxis-ortho",
      indication:
        "Prophylaxis of Deep Vein Thrombosis in Hip or Knee Replacement Surgery",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.2 Adult Dosage — Hip or Knee Replacement Surgery",
          "The recommended dose of Lovenox is 30 mg every 12 hours administered by subcutaneous injection in patients undergoing hip or knee replacement surgery. Administer the initial dose 12 to 24 hours after surgery, provided that hemostasis has been established. The usual duration of administration is 7 to 10 days",
          320
        ),
      ],
      dose: {
        kind: "fixed",
        amount: 30,
        unit: "mg",
        frequency: "every 12 hours SC (start 12 to 24 h post-op; or 40 mg once daily for hip replacement)",
        max_single: 40,
        max_daily: 60,
      },
      dose_text:
        "30 mg subcutaneously every 12 hours (initial dose 12–24 hours post-op once hemostasis is established; 7–10 days), or 40 mg once daily for hip replacement (up to 3 weeks). Reduce to 30 mg once daily if CrCl <30 mL/min.",
      renal_bands: [
        {
          min: 0,
          max: 29,
          dose_text:
            "30 mg administered subcutaneously once daily (CrCl <30 mL/min).",
          dose: {
            kind: "fixed",
            amount: 30,
            unit: "mg",
            frequency: "once daily SC",
            max_single: 30,
            max_daily: 30,
          },
          refs: [
            ref(
              FDA,
              "2.3 Dose Reduction for Patients with Severe Renal Impairment (Table 1)",
              "Prophylaxis in hip or knee replacement surgery 30 mg administered subcutaneously once daily",
              110
            ),
          ],
        },
      ],
    },
    {
      id: "enox-sc-dvt-pe-treatment-q12h",
      indication:
        "Treatment of Acute Deep Vein Thrombosis with or without Pulmonary Embolism (q12h Regimen)",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.2 Adult Dosage — Treatment of Deep Vein Thrombosis with or without Pulmonary Embolism",
          "The recommended dose of Lovenox is 1 mg/kg every 12 hours administered subcutaneously in patients with acute deep vein thrombosis without pulmonary embolism, who can be treated at home in an outpatient setting.",
          240
        ),
      ],
      dose: {
        kind: "per_kg",
        amount: 1,
        unit: "mg",
        frequency: "every 12 hours SC (minimum 5 days and until INR 2 to 3 with warfarin)",
      },
      dose_text:
        "1 mg/kg subcutaneously every 12 hours (inpatient with/without PE, or outpatient without PE); overlap with warfarin for >=5 days until INR 2–3. Reduce to 1 mg/kg once daily if CrCl <30 mL/min.",
      renal_bands: [
        {
          min: 0,
          max: 29,
          dose_text:
            "1 mg/kg administered subcutaneously once daily (CrCl <30 mL/min).",
          dose: {
            kind: "per_kg",
            amount: 1,
            unit: "mg",
            frequency: "once daily SC",
          },
          refs: [
            ref(
              FDA,
              "2.3 Dose Reduction for Patients with Severe Renal Impairment (Table 1)",
              "Inpatient treatment of acute deep vein thrombosis with or without pulmonary embolism, when administered in conjunction with warfarin sodium 1 mg/kg administered subcutaneously once daily",
              200
            ),
          ],
        },
      ],
    },
    {
      id: "enox-sc-dvt-pe-treatment-qd",
      indication:
        "Inpatient Treatment of Acute Deep Vein Thrombosis with or without Pulmonary Embolism (Once-Daily Regimen)",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.2 Adult Dosage — Treatment of Deep Vein Thrombosis with or without Pulmonary Embolism",
          "The recommended dose of Lovenox is 1 mg/kg every 12 hours administered subcutaneously or 1.5 mg/kg once a day administered subcutaneously at the same time every day for inpatient (hospital) treatment of patients with acute deep vein thrombosis with pulmonary embolism",
          290
        ),
      ],
      dose: {
        kind: "per_kg",
        amount: 1.5,
        unit: "mg",
        frequency: "once daily SC at the same time every day",
      },
      dose_text:
        "1.5 mg/kg subcutaneously once daily at the same time every day (inpatient); overlap with warfarin for >=5 days until INR 2–3. Reduce to 1 mg/kg once daily if CrCl <30 mL/min.",
      renal_bands: [
        {
          min: 0,
          max: 29,
          dose_text:
            "1 mg/kg administered subcutaneously once daily (CrCl <30 mL/min).",
          dose: {
            kind: "per_kg",
            amount: 1,
            unit: "mg",
            frequency: "once daily SC",
          },
          refs: [
            ref(
              FDA,
              "2.3 Dose Reduction for Patients with Severe Renal Impairment (Table 1)",
              "Inpatient treatment of acute deep vein thrombosis with or without pulmonary embolism, when administered in conjunction with warfarin sodium 1 mg/kg administered subcutaneously once daily",
              200
            ),
          ],
        },
      ],
    },
    {
      id: "enox-sc-ua-nstemi",
      indication:
        "Prophylaxis of Ischemic Complications of Unstable Angina and Non-Q-Wave Myocardial Infarction",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.2 Adult Dosage — Unstable Angina and Non–Q-Wave Myocardial Infarction",
          "The recommended dose of Lovenox is 1 mg/kg administered subcutaneously every 12 hours in conjunction with oral aspirin therapy (100 to 325 mg once daily) in patients with unstable angina or non–Q-wave myocardial infarction.",
          250
        ),
      ],
      dose: {
        kind: "per_kg",
        amount: 1,
        unit: "mg",
        frequency: "every 12 hours SC with oral aspirin 100 to 325 mg once daily (2 to 8 days)",
      },
      dose_text:
        "1 mg/kg subcutaneously every 12 hours with oral aspirin (100–325 mg once daily) for a minimum of 2 days until clinical stabilization (usual duration 2–8 days). Reduce to 1 mg/kg once daily if CrCl <30 mL/min.",
      renal_bands: [
        {
          min: 0,
          max: 29,
          dose_text:
            "1 mg/kg administered subcutaneously once daily (CrCl <30 mL/min).",
          dose: {
            kind: "per_kg",
            amount: 1,
            unit: "mg",
            frequency: "once daily SC",
          },
          refs: [
            ref(
              FDA,
              "2.3 Dose Reduction for Patients with Severe Renal Impairment (Table 1)",
              "Prophylaxis of ischemic complications of unstable angina and non–Q-wave myocardial infarction, when concurrently administered with aspirin 1 mg/kg administered subcutaneously once daily",
              210
            ),
          ],
        },
      ],
    },
    {
      id: "enox-iv-sc-stemi",
      indication:
        "Treatment of Acute ST-Segment Elevation Myocardial Infarction (STEMI; Adults <75 Years)",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.2 Adult Dosage — Treatment of Acute ST-Segment Elevation Myocardial Infarction",
          "The recommended dose of Lovenox is a single intravenous bolus of 30 mg plus a 1 mg/kg subcutaneous dose followed by 1 mg/kg administered subcutaneously every 12 hours (maximum 100 mg for the first two doses only, followed by 1 mg/kg dosing for the remaining doses) in patients with acute ST-segment elevation myocardial infarction.",
          340
        ),
      ],
      dose: {
        kind: "per_kg",
        amount: 1,
        unit: "mg",
        frequency:
          "every 12 hours SC after initial 30 mg IV bolus + 1 mg/kg SC (max 100 mg for first two SC doses); >=75 y: no IV bolus, 0.75 mg/kg SC q12h",
      },
      dose_text:
        "Adults <75 y: 30 mg single IV bolus + 1 mg/kg SC, then 1 mg/kg SC every 12 hours (max 100 mg for first two SC doses only) with aspirin 75–325 mg daily for 8 days or until discharge. Geriatric >=75 y: omit IV bolus; 0.75 mg/kg SC every 12 hours (max 75 mg for first two doses). CrCl <30 mL/min: reduce maintenance to once daily.",
      renal_bands: [
        {
          min: 0,
          max: 29,
          dose_text:
            "<75 years: 30 mg single IV bolus + 1 mg/kg SC followed by 1 mg/kg SC once daily. >=75 years: 1 mg/kg SC once daily (no initial bolus).",
          dose: {
            kind: "per_kg",
            amount: 1,
            unit: "mg",
            frequency: "once daily SC (after 30 mg IV bolus if <75 y; no bolus if >=75 y)",
          },
          refs: [
            ref(
              FDA,
              "2.3 Dose Reduction for Patients with Severe Renal Impairment (Table 1)",
              "Treatment of acute ST-segment elevation myocardial infarction in patients <75 years of age, when administered in conjunction with aspirin 30 mg single intravenous bolus plus a 1 mg/kg subcutaneous dose followed by 1 mg/kg administered subcutaneously once daily",
              280
            ),
          ],
        },
      ],
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [
      ref(
        FDA,
        "8.7 Renal Impairment",
        "Because exposure of enoxaparin sodium is significantly increased in patients with severe renal impairment (creatinine clearance <30 mL/min), a dosage adjustment is recommended for therapeutic and prophylactic dosage ranges.",
        235
      ),
    ],
  },
  renal_impairment: {
    description:
      "Dose reduction is required in severe renal impairment (CrCl <30 mL/min) due to a 65% increase in steady-state AUC. No dose adjustment is recommended for CrCl 30–80 mL/min, though patients should be observed frequently for bleeding.",
    renal_basis: {
      value: "cg_abw",
      refs: [
        ref(
          FDA,
          "8.7 Renal Impairment",
          "No dosage adjustment is recommended in patients with creatinine clearance 30 to <50 mL/min and creatinine clearance 50 to 80 mL/min",
          150
        ),
      ],
    },
    bands: [
      {
        min: 30,
        max: 80,
        dose_text:
          "No dosage adjustment recommended; observe frequently for signs and symptoms of bleeding (anti-Factor Xa monitoring may be used).",
        refs: [
          ref(
            FDA,
            "2.3 Dose Reduction for Patients with Severe Renal Impairment",
            "Although no dose adjustment is recommended in patients with creatinine clearance 30 to 50 mL/min and creatinine clearance 50 to 80 mL/min, observe these patients frequently for signs and symptoms of bleeding.",
            220
          ),
        ],
      },
      {
        min: 0,
        max: 29,
        dose_text:
          "Severe renal impairment (CrCl <30 mL/min): Prophylaxis -> 30 mg SC once daily; Treatment (DVT/PE, UA/NSTEMI, STEMI maintenance) -> 1 mg/kg SC once daily.",
        refs: [
          ref(
            FDA,
            "12.3 Pharmacokinetics — Renal impairment",
            "In patients with severe renal impairment (creatinine clearance <30 mL/min), the AUC at steady state is significantly increased on average by 65% after repeated subcutaneous 40 mg once-daily doses",
            210
          ),
        ],
      },
    ],
    hemodialysis: {
      value:
        "In a single study, elimination rate appeared similar but AUC was two-fold higher than control population, after a single 0.25 or 0.5 mg/kg intravenous dose.",
      refs: [
        ref(
          FDA,
          "12.3 Pharmacokinetics — Hemodialysis",
          "In a single study, elimination rate appeared similar but AUC was two-fold higher than control population, after a single 0.25 or 0.5 mg/kg intravenous dose.",
          180
        ),
      ],
    },
    refs: [
      ref(
        FDA,
        "8.7 Renal Impairment",
        "Because exposure of enoxaparin sodium is significantly increased in patients with severe renal impairment (creatinine clearance <30 mL/min), a dosage adjustment is recommended for therapeutic and prophylactic dosage ranges.",
        235
      ),
    ],
  },
  hepatic: {
    value:
      "Studies with Lovenox in patients with hepatic impairment have not been conducted and the impact of hepatic impairment on the exposure to enoxaparin is unknown.",
    refs: [
      ref(
        FDA,
        "12.3 Pharmacokinetics — Hepatic impairment",
        "Studies with Lovenox in patients with hepatic impairment have not been conducted and the impact of hepatic impairment on the exposure to enoxaparin is unknown.",
        180
      ),
    ],
  },
  black_box: {
    value: [
      "WARNING: SPINAL/EPIDURAL HEMATOMAS: Epidural or spinal hematomas may occur in patients anticoagulated with LMWH who receive neuraxial anesthesia or undergo spinal puncture, risking long-term or permanent paralysis. Monitor frequently for neurological impairment.",
    ],
    refs: [
      ref(
        FDA,
        "BOXED WARNING",
        "WARNING: SPINAL/EPIDURAL HEMATOMAS Epidural or spinal hematomas may occur in patients who are anticoagulated with low molecular weight heparins (LMWH) or heparinoids and are receiving neuraxial anesthesia or undergoing spinal puncture. These hematomas may result in long-term or permanent paralysis.",
        320
      ),
    ],
  },
  mg_safety: {
    value: "safe",
    refs: [
      ref(
        FDA,
        "12.1 Mechanism of Action",
        "Enoxaparin is a low molecular weight heparin which has antithrombotic properties.",
        100
      ),
    ],
    note: "Low molecular weight heparins do not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "Not applicable — parenteral (SC/IV) solution only; do not administer orally or intramuscularly.",
  },
  pgx: {
    value: null,
    refs: [],
    note: "No pharmacogenomic testing or dosing recommendations in FDA label.",
  },
  ae_tags: {
    value: ["confusion_delirium"],
    refs: [
      ref(
        FDA,
        "6.1 Clinical Trials Experience",
        "Most common adverse reactions (>1%) were bleeding, anemia, thrombocytopenia, elevation of serum aminotransferase, diarrhea, nausea, ecchymosis, fever, edema, peripheral edema, dyspnea, confusion, and injection site pain.",
        240
      ),
    ],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Bleeding and ecchymosis",
        "Anemia and thrombocytopenia",
        "Elevation of serum aminotransferases",
        "Injection site pain",
        "Nausea, diarrhea, fever, edema, dyspnea, and confusion",
      ],
      refs: [
        ref(
          FDA,
          "6.1 Clinical Trials Experience",
          "Most common adverse reactions (>1%) were bleeding, anemia, thrombocytopenia, elevation of serum aminotransferase, diarrhea, nausea, ecchymosis, fever, edema, peripheral edema, dyspnea, confusion, and injection site pain.",
          240
        ),
      ],
    },
    serious: {
      value: [
        "Spinal or epidural hematomas with neuraxial anesthesia/spinal puncture (risk of permanent paralysis)",
        "Major or fatal hemorrhage",
        "Heparin-induced thrombocytopenia (HIT)",
        "Hyperkalemia (particularly in patients with renal failure)",
        "Anaphylactic/anaphylactoid reactions and benzyl alcohol toxicity ('gasping syndrome' in neonates from multi-dose vials)",
      ],
      refs: [
        ref(
          FDA,
          "6 ADVERSE REACTIONS",
          "The following serious adverse reactions are also discussed in other sections of the labeling: • Spinal/epidural hematomas [see Boxed Warning and Warnings and Precautions (5.1) ] • Increased Risk of Hemorrhage [see Warnings and Precautions (5.1) ] • Thrombocytopenia [see Warnings and Precautions (5.5) ]",
          310
        ),
        ref(
          FDA,
          "8.7 Renal Impairment",
          "In patients with renal failure, treatment with Lovenox has been associated with the development of hyperkalemia [see Adverse Reactions (6.2) ].",
          160
        ),
      ],
    },
  },
  mechanism_of_action: {
    value:
      "Enoxaparin is a low molecular weight heparin (LMWH) with antithrombotic properties characterized by a higher ratio of anti-Factor Xa to anti-Factor IIa activity (mean 14.0 ± 3.1) compared with unfractionated heparin.",
    refs: [
      ref(
        FDA,
        "12.1 Mechanism of Action & 12.2 Pharmacodynamics",
        "Enoxaparin is a low molecular weight heparin which has antithrombotic properties. 12.2 Pharmacodynamics In humans, enoxaparin given at a dose of 1.5 mg/kg subcutaneously is characterized by a higher ratio of anti-Factor Xa to anti-Factor IIa activity (mean ±SD, 14.0±3.1)",
        290
      ),
    ],
  },
  enzyme_profile: {
    value: {
      qt_risk: "none",
      serotonergic: false,
    },
    refs: [
      ref(
        FDA,
        "12.3 Pharmacokinetics — Metabolism",
        "Enoxaparin sodium is primarily metabolized in the liver by desulfation and/or depolymerization to lower molecular weight species with much reduced biological potency.",
        180
      ),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class:
          "Anticoagulants, Platelet Inhibitors (Aspirin/Salicylates, Dipyridamole), NSAIDs, Sulfinpyrazone",
        severity: "major",
        effect:
          "Additive pharmacodynamic effect increases the risk of hemorrhage and spinal/epidural hematoma during neuraxial procedures.",
        management:
          "Discontinue agents that enhance hemorrhage risk prior to initiating Lovenox whenever possible; if coadministration is essential, conduct close clinical and laboratory monitoring.",
        refs: [
          ref(
            FDA,
            "7 DRUG INTERACTIONS",
            "Whenever possible, agents which may enhance the risk of hemorrhage should be discontinued prior to initiation of Lovenox therapy. These agents include medications such as: anticoagulants, platelet inhibitors including acetylsalicylic acid, salicylates, NSAIDs (including ketorolac tromethamine), dipyridamole, or sulfinpyrazone. If coadministration is essential, conduct",
            360
          ),
        ],
      },
    ],
    refs: [
      ref(
        FDA,
        "7 DRUG INTERACTIONS",
        "Discontinue agents which may enhance hemorrhage risk prior to initiation of Lovenox or conduct close clinical and laboratory monitoring.",
        160
      ),
    ],
  },
  tools: {
    missed_dose: {
      value: null,
      refs: [],
      note: "No specific missed-dose guidance in FDA label.",
    },
    hold_restart: {
      value: [
        {
          procedure:
            "Scheduled Induction of Labor, Cesarean Delivery, or Neuraxial Anesthesia (Prophylactic LMWH)",
          hold_hours: "At least 12 hours prior to procedure",
          restart_timing:
            "No sooner than 4–6 hours after vaginal delivery or 6–12 hours after cesarean delivery once hemostasis is secure",
        },
        {
          procedure:
            "Scheduled Induction of Labor, Cesarean Delivery, or Neuraxial Anesthesia (Therapeutic / Adjusted-Dose LMWH)",
          hold_hours:
            "At least 24 hours prior to procedure (or convert to UFH near delivery)",
          restart_timing:
            "No sooner than 4–6 h after vaginal delivery or 6–12 h after cesarean delivery, AND >=24 hours after neuraxial blockade and >=4 hours after catheter removal",
        },
      ],
      refs: [
        ref(
          ACOG,
          "ACOG PB 196: Delivery & Neuraxial Anesthesia Bridge Timing (p. e8, e10–e11)",
          "For women who are receiving prophylactic low-molecular-weight heparin, discontinuation is recommended at least 12 hours before scheduled induction of labor or cesarean delivery; a 24-hour interval is recommended for patients on an adjusted-dose regimen, or women may be converted from low-molecular-weight heparin to unfractionated heparin in anticipation of delivery.",
          360
        ),
        ref(
          ACOG,
          "ACOG PB 196: Postpartum Anticoagulation Restart Timing (p. e10–e11)",
          "A reasonable approach to minimize postpartum bleeding complications is resumption of anticoagulation therapy no sooner than 4–6 hours after vaginal delivery or 6–12 hours after cesarean delivery (and at least 24 hours after neuraxial blockade and 4 hours after catheter removal for therapeutic LMWH).",
          320
        ),
      ],
    },
    reversal: {
      value: [
        {
          agent: "Protamine Sulfate (1% IV solution)",
          dose_rule:
            "If Lovenox given <=8 h ago: 1 mg protamine per 1 mg Lovenox slow IV. If >8 h ago or second dose needed: 0.5 mg protamine per 1 mg Lovenox. Anti-Factor Xa activity is never completely neutralized (max ~60%); if >=12 h elapsed, protamine may not be required.",
          vn_available: true,
        },
      ],
      refs: [
        ref(
          FDA,
          "10 OVERDOSAGE",
          "The dose of protamine sulfate should be equal to the dose of Lovenox injected: 1 mg protamine sulfate should be administered to neutralize 1 mg Lovenox, if Lovenox was administered in the previous 8 hours. An infusion of 0.5 mg protamine per 1 mg of Lovenox may be administered if Lovenox was administered greater than 8 hours previous to the protamine",
          360
        ),
        ref(
          FDA,
          "10 OVERDOSAGE",
          "In all cases, the anti-Factor Xa activity is never completely neutralized (maximum about 60%).",
          110
        ),
      ],
    },
  },
  reproductive: {
    tier: {
      value: "preferred",
      note: "Guideline-recommended preferred anticoagulant in pregnancy (ACOG PB 196): replaces warfarin and DOACs; human retrospective cohort (n=693 live births) showed congenital anomaly rate (2.5%) similar to background (2–4%). Monitor closely for peripartum bleeding and avoid benzyl alcohol-preserved multi-dose vials in neonates.",
      refs: [
        ref(
          ACOG,
          "ACOG PB 196: Warfarin Switch to LMWH (p. e4)",
          "Therefore, for most women receiving prolonged anticoagulation therapy who become pregnant, it is recommended that low-molecular-weight heparin be used in place of warfarin.",
          180
        ),
        ref(
          FDA,
          "8.1 Pregnancy — Risk Summary",
          "Human data from a retrospective cohort study, which included 693 live births, suggest that enoxaparin does not increase the risk of major developmental abnormalities",
          180
        ),
      ],
    },
    mcm: [],
    folic_acid: {
      value: null,
      refs: [],
      note: "Not clinically applicable",
    },
    contraception: {
      value:
        "Does not impair hormonal contraceptive efficacy.\n• ACOG Practice Bulletin No. 196 (2018): Women on DOACs or warfarin should transition to LMWH prepregnancy or as soon as pregnancy is recognized.",
      refs: [
        ref(
          ACOG,
          "ACOG PB 196: Prepregnancy Switch to LMWH (p. e4)",
          "Until more data are available, women should be transitioned to low-molecular-weight heparin prepregnancy or as soon as possible during pregnancy.",
          160
        ),
      ],
    },
    pregnancy_pk: {
      value:
        "Human retrospective cohort (604 women, 624 pregnancies, 693 live births) showed major congenital anomalies at background rate (2.5%); monitor carefully for bleeding and consider shorter-acting anticoagulants as delivery approaches (multi-dose vials contain benzyl alcohol 15 mg/mL).\n• ACOG Practice Bulletin No. 196 (2018): Preferred anticoagulant in pregnancy (used in place of warfarin and DOACs). Hold prophylactic LMWH >=12 hours and adjusted-dose/therapeutic LMWH >=24 hours before scheduled induction of labor, cesarean delivery, or neuraxial anesthesia (or convert to UFH near delivery).",
      refs: [
        ref(
          FDA,
          "8.1 Pregnancy — Human Data",
          "A retrospective study reviewed the records of 604 women who used Lovenox during pregnancy. A total of 624 pregnancies resulted in 693 live births. There were 72 hemorrhagic events (11 serious) in 63 women. There were 14 cases of neonatal hemorrhage. Major congenital anomalies in live births occurred at rates (2.5%) similar to background rates.",
          360
        ),
        ref(
          ACOG,
          "ACOG PB 196: Delivery & Neuraxial Anesthesia Bridge Timing (p. e8, e11)",
          "For women who are receiving prophylactic low-molecular-weight heparin, discontinuation is recommended at least 12 hours before scheduled induction of labor or cesarean delivery; a 24-hour interval is recommended for patients on an adjusted-dose regimen, or women may be converted from low-molecular-weight heparin to unfractionated heparin in anticipation of delivery.",
          360
        ),
      ],
    },
    postpartum: {
      value:
        "Compatible with breastfeeding.\n• ACOG Practice Bulletin No. 196 (2018): Resume anticoagulation no sooner than 4–6 hours after vaginal delivery or 6–12 hours after cesarean delivery once hemostasis is established (and >=24 hours after neuraxial blockade and >=4 hours after catheter removal for therapeutic LMWH). Also used to bridge postpartum warfarin until INR 2.0–3.0 for 2 consecutive days.",
      refs: [
        ref(
          ACOG,
          "ACOG PB 196: Postpartum Anticoagulation Restart Timing (p. e10–e11)",
          "A reasonable approach to minimize postpartum bleeding complications is resumption of anticoagulation therapy no sooner than 4–6 hours after vaginal delivery or 6–12 hours after cesarean delivery (and at least 24 hours after neuraxial blockade and 4 hours after catheter removal for therapeutic LMWH).",
          320
        ),
        ref(
          ACOG,
          "ACOG PB 196: Postpartum Bridging (p. e10)",
          "Women who will be treated with warfarin should be bridged with adjusted-dose low-molecular-weight heparin or unfractionated heparin until an international normalized ratio in the therapeutic range (2.0–3.0) is achieved for 2 consecutive days",
          260
        ),
      ],
    },
    lactation_rid: {
      value: null,
      refs: [],
      note: "No RID percentage reported in sources (FDA label: unknown whether Lovenox is excreted in human milk).",
    },
    lactation_summary: {
      value:
        "FDA label states it is unknown whether enoxaparin is excreted in human milk (very limited passage in lactating rats).\n• ACOG Practice Bulletin No. 196 (2018): Low-molecular-weight heparin does not accumulate in breast milk and does not induce an anticoagulant effect in the infant; compatible with breastfeeding.",
      refs: [
        ref(
          FDA,
          "8.2 Lactation — Risk Summary",
          "It is unknown whether Lovenox is excreted in human milk. In lactating rats, the passage of enoxaparin or its metabolites in the milk is very limited.",
          160
        ),
        ref(
          ACOG,
          "ACOG PB 196: Lactation Safety (p. e10–e11)",
          "Because warfarin, low-molecular-weight heparin, and unfractionated heparin do not accumulate in breast milk and do not induce an anticoagulant effect in the infant, these anticoagulants are compatible with breastfeeding.",
          240
        ),
      ],
    },
  },
  status: "draft",
  verification: {
    verified_by: null,
    verified_at: null,
    content_hash: null,
  },
};

const outPath = path.join(DRUGS_DIR, "enoxaparin.json");
fs.writeFileSync(outPath, JSON.stringify(enoxaparin, null, 2) + "\n", "utf-8");
console.log(`✅ Created ${outPath}`);
