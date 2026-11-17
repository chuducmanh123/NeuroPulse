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

const FDA = "fda-heparin-label";
const ACOG = "acog-pb196-vte-pregnancy";

const heparin = {
  id: "heparin",
  generic_name: "heparin",
  tall_man: {
    value: "heparin",
    refs: [
      ref(
        FDA,
        "1 INDICATIONS AND USAGE",
        "Heparin Sodium Injection is indicated for:",
        80
      ),
    ],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: [
    "anticoagulant",
    "unfractionated heparin",
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
      id: "hep-iv-infusion-therapeutic",
      indication:
        "Therapeutic Anticoagulant Effect (VTE, Atrial Fibrillation with Embolization, Arterial/Cardiac Thrombosis) — Continuous IV Infusion",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref(
          FDA,
          "2.4 Therapeutic Anticoagulant Effect (Table 1) & 2.3 Laboratory Monitoring",
          "Intravenous Infusion Initial dose 5,000 units by intravenous injection Continuous 20,000 to 40,000 units/24 hours in 1000 mL of 0.9% Sodium Chloride Injection, USP (or in any compatible solution) for infusion",
          220
        ),
        ref(
          FDA,
          "2.3 Laboratory Monitoring for Efficacy and Safety",
          "Dosage is considered adequate when the activated partial thromboplastin time (aPTT) is 1.5 to 2 times normal or when the whole blood clotting time is elevated approximately 2.5 to 3 times the control value.",
          220
        ),
      ],
      dose: {
        kind: "fixed",
        amount: 5000,
        unit: "IU",
        frequency:
          "IV bolus, followed by continuous IV infusion of 20,000 to 40,000 units/24 hours titrated to aPTT 1.5 to 2x normal",
        infusion: {
          diluent: "0.9% Sodium Chloride Injection, USP (1,000 mL) or compatible solution",
        },
      },
      dose_text:
        "Initial bolus 5,000 units IV, followed by continuous IV infusion of 20,000 to 40,000 units/24 hours in 1,000 mL 0.9% NaCl (based on 68 kg adult). Monitor aPTT every 4 hours initially; target aPTT 1.5 to 2 times normal.",
    },
    {
      id: "hep-iv-intermittent-therapeutic",
      indication:
        "Therapeutic Anticoagulant Effect — Intermittent Intravenous Injection",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref(
          FDA,
          "2.4 Therapeutic Anticoagulant Effect (Table 1)",
          "Intermittent Intravenous Injection Initial dose 10,000 units, either undiluted or in 50 to 100 mL of 0.9% Sodium Chloride Injection, USP Every 4 to 6 hours 5,000 to 10,000 units, either undiluted or in 50 to 100 mL of 0.9% Sodium Chloride Injection, USP",
          270
        ),
      ],
      dose: {
        kind: "fixed",
        amount: 10000,
        unit: "IU",
        frequency:
          "initial IV dose, then 5,000 to 10,000 units IV every 4 to 6 hours",
        max_single: 10000,
      },
      dose_text:
        "Initial dose 10,000 units IV (undiluted or in 50–100 mL 0.9% NaCl), then 5,000 to 10,000 units IV every 4 to 6 hours. Perform coagulation tests before each injection during initiation.",
    },
    {
      id: "hep-sc-deep-therapeutic",
      indication:
        "Therapeutic Anticoagulant Effect — Deep Subcutaneous (Intrafat) Injection",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.4 Therapeutic Anticoagulant Effect (Table 1)",
          "Initial Dose 5,000 units by intravenous injection, followed by 10,000 to 20,000 units of a concentrated solution, subcutaneously Every 8 hours or Every 12 hours 8,000 to 10,000 units of a concentrated solution 15,000 to 20,000 units of a concentrated solution",
          290
        ),
      ],
      dose: {
        kind: "fixed",
        amount: 5000,
        unit: "IU",
        frequency:
          "IV initial dose + 10,000 to 20,000 units SC, then 8,000–10,000 units SC q8h OR 15,000–20,000 units SC q12h",
        max_single: 20000,
      },
      dose_text:
        "Initial 5,000 units IV + 10,000 to 20,000 units deep SC, followed by 8,000 to 10,000 units SC every 8 hours OR 15,000 to 20,000 units SC every 12 hours (use a different site for each injection). Draw aPTT 4–6 hours post-injection.",
    },
    {
      id: "hep-sc-low-dose-prophylaxis",
      indication: "Low-Dose Prophylaxis of Postoperative Thromboembolism",
      setting: "acute_inpatient",
      route: "SC",
      refs: [
        ref(
          FDA,
          "2.7 Low-Dose Prophylaxis of Postoperative Thromboembolism",
          "The most widely used dosage has been 5,000 units 2 hours before surgery and 5,000 units every 8 to 12 hours thereafter for 7 days or until the patient is fully ambulatory, whichever is longer.",
          210
        ),
      ],
      dose: {
        kind: "fixed",
        amount: 5000,
        unit: "IU",
        frequency:
          "2 hours before surgery, then 5,000 units deep SC every 8 to 12 hours for 7 days or until fully ambulatory",
        max_single: 5000,
        max_daily: 15000,
      },
      dose_text:
        "5,000 units deep SC 2 hours before surgery, then 5,000 units deep SC every 8 to 12 hours for 7 days or until fully ambulatory, whichever is longer.",
    },
    {
      id: "hep-iv-dialysis",
      indication: "Extracorporeal Dialysis Anticoagulation",
      setting: "acute_inpatient",
      route: "IV",
      refs: [
        ref(
          FDA,
          "2.11 Extracorporeal Dialysis",
          "A dose of 25 units/kg to 30 units/kg followed by an infusion rate of 1,500 units/hour to 2,000 units/hour is suggested based on pharmacodynamic data if specific manufacturers' recommendations are not available.",
          220
        ),
      ],
      dose: {
        kind: "per_kg",
        amount: 25,
        unit: "IU",
        frequency:
          "(25 to 30 units/kg IV) followed by 1,500 to 2,000 units/hour IV infusion",
      },
      dose_text:
        "25 to 30 units/kg IV followed by 1,500 to 2,000 units/hour IV infusion (if specific equipment manufacturer directions are unavailable).",
    },
  ],
  renal_basis: {
    value: null,
    refs: [],
    note: "No specific renal dose adjustment or CrCl basis in FDA label; heparin is mainly cleared by the liver and reticuloendothelial cells.",
  },
  hepatic: {
    value: null,
    refs: [],
    note: "No specific hepatic impairment dosing recommendation in FDA label; cleared by liver and reticuloendothelial cells.",
  },
  black_box: {
    value: null,
    refs: [],
    note: "No boxed warning in this FDA Heparin Sodium Injection label.",
  },
  mg_safety: {
    value: "safe",
    refs: [
      ref(
        FDA,
        "12.1 Mechanism of Action",
        "Heparin interacts with the naturally occurring plasma protein, Antithrombin III, to induce a conformational change, which markedly enhances the serine protease activity of Antithrombin III",
        200
      ),
    ],
    note: "Unfractionated heparin does not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "Not applicable — parenteral (IV/SC) formulation only; not absorbed through the gastrointestinal tract.",
  },
  pgx: {
    value: null,
    refs: [],
    note: "No pharmacogenomic testing or dosing recommendations in FDA label.",
  },
  ae_tags: {
    value: null,
    refs: [],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Hemorrhage (chief complication)",
        "Thrombocytopenia",
        "Injection site irritation, erythema, hematoma, or ulceration (with deep SC)",
        "Elevations of aminotransferase levels",
        "General hypersensitivity reactions",
      ],
      refs: [
        ref(
          FDA,
          "6 ADVERSE REACTIONS",
          "Most common adverse reactions are hemorrhage, thrombocytopenia, HIT and HITTS, injection site irritation, general hypersensitivity reactions, and elevations of aminotransferase levels.",
          190
        ),
      ],
    },
    serious: {
      value: [
        "Major or fatal hemorrhage (including adrenal, ovarian/corpus luteum, and retroperitoneal hemorrhage)",
        "Heparin-Induced Thrombocytopenia (HIT) and HIT with Thrombosis Syndrome (HITTS), including delayed-onset cases",
        "Benzyl alcohol toxicity ('gasping syndrome') in neonates and infants with preserved formulations",
        "Hyperkalemia",
        "Anaphylactoid / hypersensitivity reactions",
      ],
      refs: [
        ref(
          FDA,
          "6.1 Postmarketing Experience",
          "Adrenal hemorrhage, with resultant acute adrenal insufficiency, has occurred with heparin therapy, including fatal cases. Ovarian (corpus luteum) hemorrhage developed in a number of women of reproductive age receiving short- or long-term heparin therapy. Retroperitoneal hemorrhage. HIT and HITT, including delayed onset cases",
          330
        ),
      ],
    },
  },
  mechanism_of_action: {
    value:
      "Heparin interacts with Antithrombin III to induce a conformational change that markedly enhances Antithrombin III serine protease inhibition of activated coagulation factors, particularly Factors Xa and IIa (thrombin), and prevents stable fibrin clot formation.",
    refs: [
      ref(
        FDA,
        "12.1 Mechanism of Action",
        "Heparin interacts with the naturally occurring plasma protein, Antithrombin III, to induce a conformational change, which markedly enhances the serine protease activity of Antithrombin III, thereby inhibiting the activated coagulation factors involved in the clotting sequence, particularly Xa and IIa.",
        310
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
        "12.3 Pharmacokinetics — Metabolism & Excretion",
        "Heparin does not undergo enzymatic degradation. Excretion Heparin is mainly cleared from the circulation by liver and reticuloendothelial cells mediated uptake into extravascular space.",
        200
      ),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Oral Anticoagulants (Warfarin, Dicumarol)",
        severity: "moderate",
        effect:
          "Heparin sodium may prolong the one-stage prothrombin time (PT/INR).",
        management:
          "Wait at least 5 hours after the last IV dose or 24 hours after the last SC dose of heparin before drawing blood for a valid prothrombin time.",
        refs: [
          ref(
            FDA,
            "7.1 Oral Anticoagulants",
            "Heparin sodium may prolong the one-stage prothrombin time. Therefore, when heparin sodium is given with dicumarol or warfarin sodium, a period of at least 5 hours after the last intravenous dose or 24 hours after the last subcutaneous dose should elapse before blood is drawn, if a valid prothrombin time is to be obtained.",
            330
          ),
        ],
      },
      {
        drug_or_class:
          "Platelet Inhibitors (NSAIDs, Salicylic Acid, Thienopyridines, Dipyridamole, GP IIb/IIIa Antagonists)",
        severity: "major",
        effect:
          "Interfere with platelet-aggregation reactions (the main hemostatic defense of heparinized patients) and may induce bleeding.",
        management:
          "Use with caution; a reduction in the dose of the antiplatelet agent or heparin is recommended to reduce bleeding risk.",
        refs: [
          ref(
            FDA,
            "7.2 Platelet Inhibitors",
            "others that interfere with platelet-aggregation reactions (the main hemostatic defense of heparinized patients) may induce bleeding and should be used with caution in patients receiving heparin sodium. To reduce the risk of bleeding, a reduction in the dose of antiplatelet agent or heparin is recommended.",
            310
          ),
        ],
      },
      {
        drug_or_class: "Intravenous Nitroglycerin",
        severity: "moderate",
        effect:
          "Concomitant IV nitroglycerin may decrease partial thromboplastin time (PTT) with subsequent rebound effect upon discontinuation.",
        management:
          "Carefully monitor aPTT and adjust heparin dosage during coadministration and upon stopping IV nitroglycerin.",
        refs: [
          ref(
            FDA,
            "7.3 Other Interactions",
            "Intravenous nitroglycerin administered to heparinized patients may result in a decrease of the partial thromboplastin time with subsequent rebound effect upon discontinuation of nitroglycerin. Careful monitoring of partial thromboplastin time and adjustment of heparin dosage are recommended during coadministration",
            320
          ),
        ],
      },
      {
        drug_or_class: "Antithrombin III (Human)",
        severity: "major",
        effect:
          "Enhances the anticoagulant effect of heparin in patients with hereditary antithrombin III deficiency.",
        management:
          "Reduce the dosage of heparin during concurrent treatment with antithrombin III (human) to reduce bleeding risk.",
        refs: [
          ref(
            FDA,
            "7.3 Other Interactions",
            "The anticoagulant effect of heparin is enhanced by concurrent treatment with antithrombin III (human) in patients with hereditary antithrombin III deficiency. To reduce the risk of bleeding, a reduced dosage of heparin is recommended during treatment with antithrombin III (human).",
            300
          ),
        ],
      },
    ],
    refs: [
      ref(
        FDA,
        "7 DRUG INTERACTIONS",
        "Drugs that interfere with platelet aggregation: May induce bleeding",
        70
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
            "Converting IV Heparin to Oral Anticoagulants Other Than Warfarin",
          hold_hours:
            "Stop continuous IV infusion immediately after first oral dose; for intermittent IV, start oral anticoagulant 0–2 hours before next scheduled heparin dose",
          restart_timing: "Discontinue heparin once oral anticoagulant is initiated",
        },
        {
          procedure: "Postpartum Anticoagulation Restart (Vaginal / Cesarean Delivery)",
          hold_hours: "Convert LMWH to UFH in anticipation of delivery as needed",
          restart_timing:
            "Resume no sooner than 4–6 hours after vaginal delivery or 6–12 hours after cesarean delivery once hemostasis is established",
        },
      ],
      refs: [
        ref(
          FDA,
          "2.10 Converting to Oral Anticoagulants other than Warfarin",
          "For patients currently receiving intravenous heparin, stop intravenous infusion of heparin sodium immediately after administering the first dose of oral anticoagulant; or for intermittent intravenous administration of heparin sodium, start oral anticoagulant 0 to 2 hours before the time that the next dose of heparin was to have been administered.",
          340
        ),
        ref(
          ACOG,
          "ACOG PB 196: Postpartum Anticoagulation Restart Timing (p. e10–e11)",
          "A reasonable approach to minimize postpartum bleeding complications is resumption of anticoagulation therapy no sooner than 4–6 hours after vaginal delivery or 6–12 hours after cesarean delivery",
          210
        ),
      ],
    },
    reversal: {
      value: [
        {
          agent: "Protamine Sulfate (1% slow IV infusion)",
          dose_rule:
            "Each 1 mg protamine sulfate neutralizes approximately 100 USP heparin units. Administer slowly; no more than 50 mg in any 10-minute period (assumed IV heparin half-life ~1/2 hour when calculating dose over time).",
          vn_available: true,
        },
      ],
      refs: [
        ref(
          FDA,
          "10 OVERDOSAGE — Neutralization of Heparin Effect",
          "When clinical circumstances (bleeding) require reversal of the heparin effect, protamine sulfate (1% solution) by slow infusion will neutralize heparin sodium. No more than 50 mg should be administered, very slowly , in any 10-minute period. Each mg of protamine sulfate neutralizes approximately 100 USP heparin units.",
          330
        ),
      ],
    },
    iv_infusion: {
      value: {
        diluent: "0.9% Sodium Chloride Injection, USP (1,000 mL) or compatible solution",
        rate: "20,000 to 40,000 units/24 hours continuous IV infusion (after 5,000 units IV bolus)",
        instructions:
          "Invert container repeatedly to ensure adequate mixing and prevent pooling of heparin in the solution; monitor aPTT every 4 hours initially.",
      },
      refs: [
        ref(
          FDA,
          "2.1 Preparation for Administration",
          "When heparin is added to an infusion solution for continuous intravenous administration, invert the container repeatedly to ensure adequate mixing and prevent pooling of the heparin in the solution.",
          200
        ),
      ],
    },
  },
  reproductive: {
    tier: {
      value: "preferred",
      note: "Published human reports did not show increased risk of adverse maternal or fetal outcomes; preservative-free Heparin Sodium Injection is recommended during pregnancy and lactation (avoid benzyl alcohol-preserved formulations in neonates). Preferred with LMWH in ACOG PB 196.",
      refs: [
        ref(
          FDA,
          "8.1 Pregnancy — Risk Summary",
          "In published reports, heparin exposure during pregnancy did not show evidence of an increased risk of adverse maternal or fetal outcomes in humans.",
          160
        ),
        ref(
          FDA,
          "8.1 Pregnancy — Risk Summary",
          "If available, preservative-free Heparin Sodium Injection is recommended when heparin therapy is needed during pregnancy.",
          130
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
        "Does not impair hormonal contraceptive efficacy.\n• ACOG Practice Bulletin No. 196 (2018): Transition from warfarin or DOACs to LMWH or UFH prepregnancy or as soon as pregnancy is recognized.",
      refs: [
        ref(
          ACOG,
          "ACOG PB 196: Prepregnancy Anticoagulation Transition (p. e4)",
          "Until more data are available, women should be transitioned to low-molecular-weight heparin prepregnancy or as soon as possible during pregnancy.",
          160
        ),
      ],
    },
    pregnancy_pk: {
      value:
        "Published human reports showed normal deliveries without increased adverse maternal or fetal outcomes; use preservative-free formulation when available.\n• ACOG Practice Bulletin No. 196 (2018): Used as an alternative to LMWH throughout pregnancy, in mechanical heart valve regimens (weeks 6–13 or throughout pregnancy), and as a shorter-acting conversion option prior to scheduled delivery or neuraxial anesthesia.",
      refs: [
        ref(
          FDA,
          "8.1 Pregnancy — Human Data",
          "The maternal and fetal outcomes associated with uses of heparin via various dosing methods and administration routes during pregnancy have been investigated in numerous studies. These studies generally reported normal deliveries with no maternal or fetal bleeding and no other complications.",
          300
        ),
        ref(
          ACOG,
          "ACOG PB 196: Mechanical Heart Valves & Delivery Conversion (p. e4, e8)",
          "Regimens include adjusted-dose low-molecular-weight heparin or unfractionated heparin throughout pregnancy or from the 6th week until the 13th week with substitution by vitamin K antagonists until close to delivery when low-molecular-weight heparin or unfractionated heparin is resumed.",
          300
        ),
      ],
    },
    postpartum: {
      value:
        "Compatible with breastfeeding (use preservative-free formulation).\n• ACOG Practice Bulletin No. 196 (2018): Resume anticoagulation no sooner than 4–6 hours after vaginal delivery or 6–12 hours after cesarean delivery; used to bridge postpartum warfarin (24 h post-delivery for mechanical heart valves) until INR 2.0–3.0 for 2 consecutive days.",
      refs: [
        ref(
          ACOG,
          "ACOG PB 196: Postpartum Resumption & Bridging (p. e10)",
          "For women with mechanical heart valves, warfarin can be resumed 24 hours after delivery, with overlapping intravenous unfractionated heparin (or low-molecular-weight heparin) until therapeutic on warfarin",
          210
        ),
      ],
    },
    lactation_rid: {
      value: null,
      refs: [],
      note: "No RID percentage reported in sources (FDA label: due to its large molecular weight, heparin is not likely to be excreted in human milk and would not be orally absorbed).",
    },
    lactation_summary: {
      value:
        "Due to its large molecular weight, heparin is not likely to be excreted in human milk and any heparin in milk would not be orally absorbed by a nursing infant; use preservative-free formulation during lactation to avoid benzyl alcohol transfer.\n• ACOG Practice Bulletin No. 196 (2018): Unfractionated heparin does not accumulate in breast milk or induce an anticoagulant effect in the infant; compatible with breastfeeding.",
      refs: [
        ref(
          FDA,
          "8.2 Lactation — Risk Summary",
          "Due to its large molecular weight, heparin is not likely to be excreted in human milk, and any heparin in milk would not be orally absorbed by a nursing infant.",
          165
        ),
        ref(
          FDA,
          "8.2 Lactation — Risk Summary",
          "If available, preservative-free Heparin Sodium Injection is recommended when heparin therapy is needed during lactation.",
          130
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

const outPath = path.join(DRUGS_DIR, "heparin.json");
fs.writeFileSync(outPath, JSON.stringify(heparin, null, 2) + "\n", "utf-8");
console.log(`✅ Created ${outPath}`);
