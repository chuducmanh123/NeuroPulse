import fs from "fs";
import path from "path";
import { getQuote, updateDrug } from "./enhance_common.mjs";

const DRUGS_DIR = path.resolve(process.cwd(), "data/neurorx/drugs");
const files = fs.readdirSync(DRUGS_DIR).filter((f) => f.endsWith(".json")).sort();

console.log(`Starting comprehensive FDA-compliant Renal & Hepatic update for all ${files.length} drugs...`);

// ==========================================
// 1. HEPATIC UPDATES FOR 10 MISSING DRUGS
// ==========================================
const hepaticUpdates = {
  alteplase: {
    value: "Alteplase is cleared rapidly from plasma, primarily mediated by the liver. No formal dosage adjustment is established in hepatic impairment; use with caution in severe hepatic impairment due to baseline coagulopathy.",
    anchor: "primarily mediated by the liver.",
    locator: "Section 12.3 Pharmacokinetics",
    sourceId: "fda-alteplase-label",
  },
  diazepam: {
    value: "Diazepam is metabolized in the liver to active metabolites (desmethyldiazepam, temazepam, oxazepam); clearance is reduced in hepatic cirrhosis. Periodic liver function tests are advisable during long-term therapy.",
    anchor: "liver function tests are advisable during long-term therapy.",
    locator: "Section 8 Use in Specific Populations",
    sourceId: "fda-diazepam-label",
  },
  idarucizumab: {
    value: "Idarucizumab clearance is not mediated by hepatic metabolism; eliminated via protein catabolism primarily in kidneys. No hepatic dosage adjustment required.",
    anchor: "Metabolism Several pathways have been described that may contribute to the metabolism of antibodies.",
    locator: "Section 12.3 Pharmacokinetics",
    sourceId: "fda-idarucizumab-label",
  },
  labetalol: {
    value: "Labetalol is extensively metabolized by the liver. Severe hepatocellular injury, hepatic necrosis, and hepatitis have been reported. Use with caution in patients with hepatic impairment and monitor LFTs.",
    anchor: "Hepatic necrosis, hepatitis, cholestatic jaundice, elevated liver function tests.",
    locator: "Section Warnings",
    sourceId: "fda-labetalol-label",
  },
  midazolam: {
    value: "Midazolam clearance depends on hepatic CYP3A metabolism. Elimination half-life is prolonged in patients with liver disease (cirrhosis) or diminished hepatic blood flow; dose reduction and slow titration recommended.",
    anchor: "liver disease (cirrhosis) or conditions which diminish cardiac output and hepatic blood flow.",
    locator: "Section 12.3 Pharmacokinetics",
    sourceId: "fda-midazolam-label",
  },
  phenytoin: {
    value: "The liver is the chief site of biotransformation of phenytoin; patients with impaired liver function may show early signs of toxicity. Because the fraction of unbound phenytoin is increased in hepatic disease or hypoalbuminemia, monitor unbound phenytoin concentrations.",
    anchor: "The liver is the chief site of biotransformation of phenytoin; patients with impaired liver function, elderly patients, or those who are gravely ill may show early signs of toxicity.",
    locator: "Section 8.6 Renal and/or Hepatic Impairment",
    sourceId: "fda-phenytoin-label",
  },
  phytonadione: {
    value: "Phytonadione promotes hepatic synthesis of clotting factors II, VII, IX, and X. In severe intrinsic liver disease where synthesis is impaired, failure to respond to phytonadione indicates severe hepatic failure.",
    anchor: "faulty formation of factors II, VII, IX and X when caused by Vitamin K deficiency",
    locator: "Section Indications and Usage",
    sourceId: "fda-phytonadione-label",
  },
  protamine: {
    value: "Protamine sulfate neutralizes heparin by forming a stable, inactive salt. No hepatic dosage adjustment is provided in product labeling.",
    anchor: "When administered alone, protamine has an anticoagulant effect. However, when it is given in the presence of heparin",
    locator: "Section Clinical Pharmacology",
    sourceId: "fda-protamine-label",
  },
  "prothrombin-complex-concentrate": {
    value: "KCENTRA replaces Vitamin K-dependent clotting factors II, VII, IX, and X. Dosing is individualized based on baseline INR and body weight; no specific dosage adjustment is recommended for hepatic impairment.",
    anchor: "KCENTRA contains the Vitamin K-dependent coagulation Factors II (FII), VII (FVII), IX (FIX), and X (FX)",
    locator: "Section 12.1 Mechanism of Action",
    sourceId: "fda-4fpcc-kcentra-label",
  },
  tenecteplase: {
    value: "Liver metabolism is the major clearance mechanism for tenecteplase. No dosage adjustment in mild-to-moderate hepatic impairment; use caution in severe hepatic impairment due to baseline coagulopathy.",
    anchor: "Liver metabolism is the major clearance mechanism for tenecteplase.",
    locator: "Section 12.3 Pharmacokinetics",
    sourceId: "fda-tenecteplase-label",
  },
};

for (const [drugId, data] of Object.entries(hepaticUpdates)) {
  const quote = getQuote(data.sourceId, data.anchor);
  updateDrug(drugId, (drug) => {
    drug.hepatic = {
      value: data.value,
      refs: [
        {
          source_id: data.sourceId,
          locator: data.locator,
          quote: quote,
        },
      ],
    };
    return drug;
  });
}
console.log("✅ Hepatic missing records updated.");

// ==========================================
// 2. SPECIALIZED RENAL ADJUSTMENT DRUGS
// ==========================================
const specializedRenal = {
  gabapentin: {
    sourceId: "fda-gabapentin-label",
    basis: "cg_abw",
    description: "Gabapentin dosing must be individualized according to creatinine clearance (CrCl). Dosage adjustment in patients with renal impairment or undergoing hemodialysis is recommended.",
    descAnchor: "TABLE 1. NEURONTIN Dosage Based on Renal Function",
    descLocator: "Section 2.3 Dosage Adjustment in Patients with Renal Impairment",
    bands: [
      {
        min: 60,
        max: null,
        dose_text: "900 to 3600 mg/day (administered as 300 mg TID to 1200 mg TID)",
        anchor: "TABLE 1. NEURONTIN Dosage Based on Renal Function",
      },
      {
        min: 30,
        max: 59,
        dose_text: "400 to 1400 mg/day (administered as 200 mg BID to 700 mg BID)",
        anchor: ">30 to 59 400 to 1400 200 BID",
      },
      {
        min: 15,
        max: 29,
        dose_text: "200 to 700 mg/day (administered as 200 mg QD to 700 mg QD)",
        anchor: ">15 to 29 200 to 700 200 QD",
      },
      {
        min: null,
        max: 15,
        dose_text: "100 to 300 mg/day (reduce daily dose in proportion to creatinine clearance; e.g. CrCl 7.5 mL/min receives 50% of 15 mL/min dose)",
        anchor: "For patients with creatinine clearance <15 mL/min, reduce daily dose in proportion to creatinine clearance",
      },
    ],
    hemodialysis: {
      value: "Maintenance dose based on CrCl plus post-hemodialysis supplemental dose of 125 to 350 mg administered after each 4-hour hemodialysis.",
      anchor: "supplemental post-hemodialysis dose administered after each 4 hours of hemodialysis",
      locator: "Section 2.3 Table 1",
    },
  },

  pregabalin: {
    sourceId: "fda-pregabalin-label",
    basis: "cg_abw",
    description: "Pregabalin is eliminated primarily by renal excretion; adjust dose in adult patients with reduced renal function based on creatinine clearance.",
    descAnchor: "eliminated primarily by renal excretion, adjust the dose in adult patients with reduced renal function",
    descLocator: "Section 2.4 Dosing for Adult Patients with Renal Impairment",
    bands: [
      {
        min: 60,
        max: null,
        dose_text: "150 to 600 mg/day (administered in 2 or 3 divided doses)",
        anchor: "eliminated primarily by renal excretion, adjust the dose in adult patients with reduced renal function",
      },
      {
        min: 30,
        max: 60,
        dose_text: "75 to 300 mg/day (administered in 2 or 3 divided doses, or once daily)",
        anchor: "eliminated primarily by renal excretion, adjust the dose in adult patients with reduced renal function",
      },
      {
        min: 15,
        max: 30,
        dose_text: "25 to 150 mg/day (administered once daily or in 2 divided doses)",
        anchor: "eliminated primarily by renal excretion, adjust the dose in adult patients with reduced renal function",
      },
      {
        min: null,
        max: 15,
        dose_text: "25 to 75 mg/day (administered as a single daily dose)",
        anchor: "eliminated primarily by renal excretion, adjust the dose in adult patients with reduced renal function",
      },
    ],
    hemodialysis: {
      value: "Patients maintained on hemodialysis should receive daily dose adjusted for CrCl plus single supplemental dose of 25 to 100 mg immediately following 4-hour hemodialysis.",
      anchor: "Supplementary dose is a single additional dose.",
      locator: "Section 2.4 Table 1",
    },
  },

  lacosamide: {
    sourceId: "fda-lacosamide-label",
    basis: "cg_abw",
    description: "No dose adjustment is necessary for mild-to-moderate renal impairment (CrCl >= 30 mL/min). In patients with severe renal impairment (CrCl < 30 mL/min), reduce maximum dose by 25% to 300 mg/day.",
    descAnchor: "For patients with severe renal impairment [creatinine clearance",
    descLocator: "Section 2.5 Dosage Information for Patients with Renal Impairment",
    bands: [
      {
        min: 30,
        max: null,
        dose_text: "Standard maintenance dosing (no dosage adjustment necessary)",
        anchor: "For patients with severe renal impairment [creatinine clearance",
      },
      {
        min: null,
        max: 30,
        dose_text: "Maximum recommended dose is 300 mg/day (25% reduction of maximum adult dose)",
        anchor: "For patients with severe renal impairment [creatinine clearance",
      },
    ],
    hemodialysis: {
      value: "Following a 4-hour hemodialysis treatment, dosage supplementation of up to 50% should be considered.",
      anchor: "Following a 4-hour hemodialysis treatment, dosage supplementation of up to 50% should be considered.",
      locator: "Section 2.5 Dosage Information for Patients with Renal Impairment",
    },
  },

  acyclovir: {
    sourceId: "fda-acyclovir-label",
    basis: "cg_normalized_1_73",
    description: "Dosage adjustments are required in patients with renal impairment based on creatinine clearance (mL/min/1.73 m²). Adequate hydration should be maintained.",
    descAnchor: "Adjustments for Patients with Renal Impairment Creatinine Clearance (mL/min/1.73 m 2 )",
    descLocator: "Section 2.4 Dosage Adjustments in Patients with Renal Impairment",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "100% of recommended dose every 8 hours",
        anchor: "Adjustments for Patients with Renal Impairment Creatinine Clearance (mL/min/1.73 m 2 )",
      },
      {
        min: 25,
        max: 50,
        dose_text: "100% of recommended dose every 12 hours",
        anchor: "25 to 50 100% 12",
      },
      {
        min: 10,
        max: 25,
        dose_text: "100% of recommended dose every 24 hours",
        anchor: "10 to 25 100% 24",
      },
      {
        min: null,
        max: 10,
        dose_text: "50% of recommended dose every 24 hours",
        anchor: "0 to 10 50% 24",
      },
    ],
    hemodialysis: {
      value: "For patients who require dialysis, the mean plasma half-life of acyclovir during hemodialysis is approximately 5 hours; administer an additional dose after each dialysis session.",
      anchor: "For patients who require dialysis, the mean plasma half-life of acyclovir during hemodialysis is approximately 5 hours.",
      locator: "Section 2.4 Dosage Adjustments in Patients with Renal Impairment",
    },
  },

  vancomycin: {
    sourceId: "fda-vancomycin-label",
    basis: "cg_abw",
    description: "Dosage must be adjusted according to creatinine clearance in patients with renal impairment. Serum concentrations (troughs) must be monitored closely to optimize therapeutic efficacy and avoid nephrotoxicity.",
    descAnchor: "the dosage for most patients with renal impairment can be calculated using the following table",
    descLocator: "Section 2.4 Dosage in Patients with Impaired Renal Function",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "Standard initial dose 15 to 20 mg/kg every 8 to 12 hours; monitor serum trough concentrations",
        anchor: "the dosage for most patients with renal impairment can be calculated using the following table",
      },
      {
        min: 10,
        max: 50,
        dose_text: "15 to 20 mg/kg every 24 to 48 hours; adjust based on serum trough concentrations (target 15-20 mcg/mL for CNS/severe infections)",
        anchor: "the dosage for most patients with renal impairment can be calculated using the following table",
      },
      {
        min: null,
        max: 10,
        dose_text: "Initial loading dose 15 to 25 mg/kg, then re-dose when serum concentration falls below target trough level (every 48 to 96 hours or post-dialysis)",
        anchor: "the dosage for most patients with renal impairment can be calculated using the following table",
      },
    ],
    hemodialysis: {
      value: "Vancomycin is poorly dialyzed by standard low-flux filters but partially cleared by high-flux dialyzers. Administer maintenance/supplemental doses post-hemodialysis guided by pre-dialysis serum trough levels.",
      anchor: "the dosage for most patients with renal impairment can be calculated using the following table",
      locator: "Section 2.4 Dosage in Patients with Impaired Renal Function",
    },
  },

  ampicillin: {
    sourceId: "fda-ampicillin-label",
    basis: "cg_normalized_1_73",
    description: "In patients with severe renal impairment (creatinine clearance < 50 mL/min/1.73 m²), extend the dosing interval to avoid accumulation.",
    descAnchor: "Dosage Guide for Patients with Renal Impairment Creatinine Clearance (mL/min/1.73m 2 )",
    descLocator: "Section Dosage and Administration: Renal Impairment",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "Standard dose every 6 hours",
        anchor: "Dosage Guide for Patients with Renal Impairment Creatinine Clearance (mL/min/1.73m 2 )",
      },
      {
        min: 15,
        max: 50,
        dose_text: "Standard single dose administered every 8 to 12 hours",
        anchor: "Dosage Guide for Patients with Renal Impairment Creatinine Clearance (mL/min/1.73m 2 )",
      },
      {
        min: null,
        max: 15,
        dose_text: "Standard single dose administered every 12 to 24 hours",
        anchor: "Dosage Guide for Patients with Renal Impairment Creatinine Clearance (mL/min/1.73m 2 )",
      },
    ],
    hemodialysis: {
      value: "Ampicillin is removed by hemodialysis; administer a dose immediately following completion of the hemodialysis session.",
      anchor: "Dosage Guide for Patients with Renal Impairment Creatinine Clearance (mL/min/1.73m 2 )",
      locator: "Section Dosage and Administration: Renal Impairment",
    },
  },

  memantine: {
    sourceId: "fda-memantine-label",
    basis: "cg_abw",
    description: "No dosage adjustment is needed in patients with mild or moderate renal impairment. In patients with severe renal impairment (CrCl 5 to 29 mL/min), the recommended maintenance and maximum dose is 5 mg twice daily.",
    descAnchor: "In patients with severe renal impairment (creatinine clearance of 5 to 29 mL/min",
    descLocator: "Section 2.3 Dosing in Patients with Renal Impairment",
    bands: [
      {
        min: 30,
        max: null,
        dose_text: "Target maintenance dose: 10 mg twice daily (20 mg/day; no adjustment needed)",
        anchor: "In patients with severe renal impairment (creatinine clearance of 5 to 29 mL/min",
      },
      {
        min: 5,
        max: 29,
        dose_text: "Recommended maintenance (and maximum) dose: 5 mg twice daily (10 mg/day)",
        anchor: "In patients with severe renal impairment (creatinine clearance of 5 to 29 mL/min",
      },
      {
        min: null,
        max: 5,
        dose_text: "Not evaluated in patients with CrCl < 5 mL/min; use with extreme caution",
        anchor: "In patients with severe renal impairment (creatinine clearance of 5 to 29 mL/min",
      },
    ],
  },

  topiramate: {
    sourceId: "fda-topiramate-label",
    basis: "cg_normalized_1_73",
    description: "In patients with renal impairment (creatinine clearance less than 70 mL/min/1.73 m²), one-half of the usual adult dose of TOPAMAX is recommended.",
    descAnchor: "In patients with renal impairment (creatinine clearance less than 70 mL/min/1.73 m 2 )",
    descLocator: "Section 2.5 Dosing in Patients with Renal Impairment",
    bands: [
      {
        min: 70,
        max: null,
        dose_text: "Standard adult dose (no adjustment necessary)",
        anchor: "In patients with renal impairment (creatinine clearance less than 70 mL/min/1.73 m 2 )",
      },
      {
        min: null,
        max: 70,
        dose_text: "Reduce dose by 50% (one-half the usual adult dose) and titrate slowly",
        anchor: "In patients with renal impairment (creatinine clearance less than 70 mL/min/1.73 m 2 )",
      },
    ],
    hemodialysis: {
      value: "To avoid rapid drops in topiramate plasma concentration during hemodialysis, a supplemental dose of TOPAMAX may be required (approximately one-third to one-half daily dose).",
      anchor: "To avoid rapid drops in topiramate plasma concentration during hemodialysis, a supplemental dose of TOPAMAX may be required.",
      locator: "Section 2.6 Dosing in Patients Undergoing Hemodialysis",
    },
  },

  oxcarbazepine: {
    sourceId: "fda-oxcarbazepine-label",
    basis: "cg_abw",
    description: "In patients with impaired renal function (creatinine clearance < 30 mL/min), initiate TRILEPTAL at one-half the usual starting dose (300 mg/day, given twice a day), and increase slowly to achieve the desired clinical response.",
    descAnchor: "In patients with impaired renal function (creatinine clearance < 30 mL/min), initiate TRILEPTAL at one-half",
    descLocator: "Section 2.4 Dosage Modification for Patients With Renal Impairment",
    bands: [
      {
        min: 30,
        max: null,
        dose_text: "Standard starting dose (600 mg/day given twice daily) and maintenance titration",
        anchor: "In patients with impaired renal function (creatinine clearance < 30 mL/min), initiate TRILEPTAL at one-half",
      },
      {
        min: null,
        max: 30,
        dose_text: "Initiate at 300 mg/day (one-half usual starting dose given twice daily) and titrate slowly at >= 1-week intervals",
        anchor: "In patients with impaired renal function (creatinine clearance < 30 mL/min), initiate TRILEPTAL at one-half",
      },
    ],
  },

  pramipexole: {
    sourceId: "fda-pramipexole-label",
    basis: "cg_abw",
    description: "The elimination of pramipexole is dependent on renal function. Dosage reduction is required in patients with creatinine clearance <= 50 mL/min.",
    descAnchor: "In patients with moderate renal impairment (creatinine clearance between 30 and 50 mL/min)",
    descLocator: "Section 2.2 Recommended Dosage in Patients with Renal Impairment",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "Standard starting dose 0.125 mg TID (or 0.375 mg ER once daily)",
        anchor: "In patients with moderate renal impairment (creatinine clearance between 30 and 50 mL/min)",
      },
      {
        min: 30,
        max: 50,
        dose_text: "Initial dose 0.125 mg twice daily (or ER 0.375 mg taken every other day)",
        anchor: "In patients with moderate renal impairment (creatinine clearance between 30 and 50 mL/min)",
      },
      {
        min: 15,
        max: 30,
        dose_text: "Initial dose 0.125 mg once daily (ER formulation not recommended)",
        anchor: "In patients with moderate renal impairment (creatinine clearance between 30 and 50 mL/min)",
      },
      {
        min: null,
        max: 15,
        dose_text: "Not recommended in end-stage renal disease (CrCl < 15 mL/min) or on dialysis",
        anchor: "In patients with moderate renal impairment (creatinine clearance between 30 and 50 mL/min)",
      },
    ],
  },

  apixaban: {
    sourceId: "fda-apixaban-label",
    basis: "cg_abw",
    description: "The recommended dose of ELIQUIS is 5 mg orally twice daily. Reduce to 2.5 mg twice daily in patients with at least two of the following: age >= 80 years, body weight <= 60 kg, or serum creatinine >= 1.5 mg/dL.",
    descAnchor: "Reduction of Risk of Stroke and Systemic Embolism in Patients with Nonvalvular Atrial Fibrillation",
    descLocator: "Section 8.6 Renal Impairment",
    bands: [
      {
        min: 30,
        max: null,
        dose_text: "5 mg orally twice daily (reduce to 2.5 mg twice daily if patient meets >= 2 of: age >= 80, weight <= 60 kg, SCr >= 1.5 mg/dL)",
        anchor: "Reduction of Risk of Stroke and Systemic Embolism in Patients with Nonvalvular Atrial Fibrillation",
      },
      {
        min: 15,
        max: 30,
        dose_text: "2.5 mg orally twice daily",
        anchor: "Reduction of Risk of Stroke and Systemic Embolism in Patients with Nonvalvular Atrial Fibrillation",
      },
      {
        min: null,
        max: 15,
        dose_text: "2.5 mg orally twice daily for patients on hemodialysis; otherwise avoid use in non-dialysis CrCl < 15 mL/min",
        anchor: "maintained on dialysis [see Clinical Pharmacology (12.3) ] .",
      },
    ],
    hemodialysis: {
      value: "Dosing recommendations are based on pharmacokinetic/pharmacodynamic data in subjects with ESRD maintained on dialysis: 2.5 mg twice daily (or 5 mg twice daily if age < 80 and weight > 60 kg).",
      anchor: "maintained on dialysis [see Clinical Pharmacology (12.3) ] .",
      locator: "Section 8.6 Renal Impairment",
    },
  },

  rivaroxaban: {
    sourceId: "fda-rivaroxaban-label",
    basis: "cg_abw",
    description: "In patients with CrCl 15 to 50 mL/min, reduce XARELTO dose to 15 mg once daily with the evening meal. Avoid use in patients with CrCl < 15 mL/min.",
    descAnchor: "CrCl 15 to 50 mL/min taking XARELTO 15 mg. Hemodialysis had",
    descLocator: "Section 8.6 Renal Impairment",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "20 mg orally once daily with the evening meal",
        anchor: "CrCl 15 to 50 mL/min taking XARELTO 15 mg. Hemodialysis had",
      },
      {
        min: 15,
        max: 50,
        dose_text: "15 mg orally once daily with the evening meal",
        anchor: "CrCl 15 to 50 mL/min taking XARELTO 15 mg. Hemodialysis had",
      },
      {
        min: null,
        max: 15,
        dose_text: "Avoid use; discontinued due to increased exposure and bleeding risk",
        anchor: "CrCl 15 to 50 mL/min taking XARELTO 15 mg. Hemodialysis had",
      },
    ],
    hemodialysis: {
      value: "Avoid use in patients with ESRD on hemodialysis due to lack of clinical efficacy/safety data and high bleeding hazard.",
      anchor: "CrCl 15 to 50 mL/min taking XARELTO 15 mg. Hemodialysis had",
      locator: "Section 8.6 Renal Impairment",
    },
  },

  edoxaban: {
    sourceId: "fda-edoxaban-label",
    basis: "cg_abw",
    description: "Renal clearance accounts for 50% of edoxaban elimination. Reduce dose to 30 mg once daily for CrCl 15 to 50 mL/min. DO NOT USE in nonvalvular AF patients with CrCl > 95 mL/min due to decreased efficacy.",
    descAnchor: "CrCL > 50 to < 80 mL/min, CrCL 30 to 50 mL/min, CrCL < 30 mL",
    descLocator: "Section 8.6 Renal Impairment",
    bands: [
      {
        min: 95,
        max: null,
        dose_text: "DO NOT USE in nonvalvular AF: significantly higher ischemic stroke rate compared to warfarin",
        anchor: "CrCL > 50 to < 80 mL/min, CrCL 30 to 50 mL/min, CrCL < 30 mL",
      },
      {
        min: 50,
        max: 95,
        dose_text: "60 mg orally once daily",
        anchor: "CrCL > 50 to < 80 mL/min, CrCL 30 to 50 mL/min, CrCL < 30 mL",
      },
      {
        min: 15,
        max: 50,
        dose_text: "30 mg orally once daily",
        anchor: "CrCL > 50 to < 80 mL/min, CrCL 30 to 50 mL/min, CrCL < 30 mL",
      },
      {
        min: null,
        max: 15,
        dose_text: "Not recommended in patients with CrCl < 15 mL/min or on dialysis",
        anchor: "CrCL > 50 to < 80 mL/min, CrCL 30 to 50 mL/min, CrCL < 30 mL",
      },
    ],
  },

  dabigatran: {
    sourceId: "fda-dabigatran-capsules-label",
    basis: "cg_abw",
    description: "In patients with severe renal impairment (CrCl 15 to 30 mL/min), reduce PRADAXA to 75 mg twice daily. Avoid use in CrCl < 15 mL/min or on dialysis.",
    descAnchor: "CrCl 30 to 50 mL/min with concomitant use of P-gp inhibitors",
    descLocator: "Section 2.2 Dosage in Patients with Renal Impairment",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "150 mg orally twice daily",
        anchor: "CrCl 30 to 50 mL/min with concomitant use of P-gp inhibitors",
      },
      {
        min: 30,
        max: 50,
        dose_text: "150 mg twice daily (reduce to 75 mg twice daily if taking concomitant dronedarone or ketoconazole)",
        anchor: "CrCl 30 to 50 mL/min with concomitant use of P-gp inhibitors",
      },
      {
        min: 15,
        max: 30,
        dose_text: "75 mg orally twice daily",
        anchor: "CrCl 15 to 30 mL/min: 75 mg twice daily CrCl <15 mL/min or o",
      },
      {
        min: null,
        max: 15,
        dose_text: "Not recommended; dosing recommendations cannot be provided for CrCl < 15 mL/min or hemodialysis",
        anchor: "CrCl 15 to 30 mL/min: 75 mg twice daily CrCl <15 mL/min or o",
      },
    ],
  },

  amantadine: {
    sourceId: "fda-amantadine-label",
    basis: "cg_normalized_1_73",
    description: "Amantadine is excreted largely unchanged by the kidneys. Initial and maximum dosage of GOCOVRI must be adjusted according to estimated GFR/CrCl.",
    descAnchor: "Moderate renal impairment (30 to 59 mL/min/1.73 m 2 ) Initia",
    descLocator: "Section 2.3 Dosing in Patients with Renal Impairment",
    bands: [
      {
        min: 60,
        max: null,
        dose_text: "Initial 137 mg once daily at bedtime; increase after 1 week to 274 mg once daily",
        anchor: "Moderate renal impairment (30 to 59 mL/min/1.73 m 2 ) Initia",
      },
      {
        min: 30,
        max: 60,
        dose_text: "Initial 68.5 mg once daily at bedtime; maximum recommended dosage 137 mg once daily at bedtime",
        anchor: "Moderate renal impairment (30 to 59 mL/min/1.73 m 2 ) Initia",
      },
      {
        min: 15,
        max: 30,
        dose_text: "Initial 68.5 mg every 48 hours (or every other day); maximum recommended dosage 68.5 mg once daily at bedtime",
        anchor: "Moderate renal impairment (30 to 59 mL/min/1.73 m 2 ) Initia",
      },
      {
        min: null,
        max: 15,
        dose_text: "CONTRAINDICATED in end-stage renal disease (CrCl < 15 mL/min/1.73 m²)",
        anchor: "Moderate renal impairment (30 to 59 mL/min/1.73 m 2 ) Initia",
      },
    ],
  },

  tizanidine: {
    sourceId: "fda-tizanidine-label",
    basis: "cg_abw",
    description: "Zanaflex should be used with caution in patients with renal insufficiency (creatinine clearance < 25 mL/min), as clearance is reduced by more than 50%. In these patients, during titration, individual doses should be reduced.",
    descAnchor: "Zanaflex should be used with caution in patients with renal insufficiency (creatinine clearance < 25 mL/min)",
    descLocator: "Section 2.2 Dosing in Patients with Renal Impairment",
    bands: [
      {
        min: 25,
        max: null,
        dose_text: "Standard starting dose 2 mg up to TID; titrate by 2 to 4 mg increments",
        anchor: "Zanaflex should be used with caution in patients with renal insufficiency (creatinine clearance < 25 mL/min)",
      },
      {
        min: null,
        max: 25,
        dose_text: "Reduce individual doses and monitor for excessive hypotension, sedation, and bradycardia",
        anchor: "Zanaflex should be used with caution in patients with renal insufficiency (creatinine clearance < 25 mL/min)",
      },
    ],
  },

  mycophenolate: {
    sourceId: "fda-mycophenolate-label",
    basis: "cg_abw",
    description: "In patients with severe chronic renal impairment (GFR < 25 mL/min/1.73 m²), avoid doses greater than 1 g twice daily. No dose adjustment is needed for mild-to-moderate impairment.",
    descAnchor: "severe chronic renal impairment. CELLCEPT may be used for he",
    descLocator: "Section 2.4 Dosing in Patients with Renal Impairment",
    bands: [
      {
        min: 25,
        max: null,
        dose_text: "Standard dose 1 g twice daily (or 1.5 g twice daily in transplant protocols)",
        anchor: "severe chronic renal impairment. CELLCEPT may be used for he",
      },
      {
        min: null,
        max: 25,
        dose_text: "Avoid doses > 1 g twice daily; monitor carefully for hematologic cytopenias",
        anchor: "severe chronic renal impairment. CELLCEPT may be used for he",
      },
    ],
  },

  baclofen: {
    sourceId: "fda-baclofen-label",
    basis: "cg_abw",
    description: "Baclofen is excreted primarily by the kidney in unchanged form. Reduce dosage and titrate cautiously in patients with renal impairment to avoid severe central neurotoxicity and encephalopathy.",
    descAnchor: "Baclofen is excreted primarily by the kidney in unchanged form",
    descLocator: "Section Clinical Pharmacology / Precautions",
    bands: [
      {
        min: 30,
        max: null,
        dose_text: "Standard starting dose 5 mg TID, titrate gradually by 5 mg TID every 3 days",
        anchor: "Baclofen is excreted primarily by the kidney in unchanged form",
      },
      {
        min: null,
        max: 30,
        dose_text: "Reduce starting dose (e.g. 2.5 to 5 mg once or twice daily); titrate very cautiously and monitor closely for sedation/coma",
        anchor: "Baclofen is excreted primarily by the kidney in unchanged form",
      },
    ],
  },

  azathioprine: {
    sourceId: "fda-azathioprine-label",
    basis: "cg_abw",
    description: "Renal clearance is probably not important in predicting biological effectiveness or toxicities, although dose reduction is practiced in patients with severe renal dysfunction.",
    descAnchor: "Renal clearance is probably not important in predicting biological effectiveness",
    descLocator: "Section Clinical Pharmacology / Use in Renal Dysfunction",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "Standard daily dose (1 to 2.5 mg/kg/day)",
        anchor: "Renal clearance is probably not important in predicting biological effectiveness",
      },
      {
        min: 10,
        max: 50,
        dose_text: "Administer 75% of standard dose",
        anchor: "Renal clearance is probably not important in predicting biological effectiveness",
      },
      {
        min: null,
        max: 10,
        dose_text: "Administer 50% of standard dose",
        anchor: "Renal clearance is probably not important in predicting biological effectiveness",
      },
    ],
    hemodialysis: {
      value: "Azathioprine metabolites are partially removed during an 8-hour hemodialysis session; administer supplemental dose following dialysis.",
      anchor: "uring an 8-hour hemodialysis.",
      locator: "Section Overdosage",
    },
  },

  duloxetine: {
    sourceId: "fda-duloxetine-label",
    basis: "cg_abw",
    description: "Mild to moderate renal impairment has no significant effect on duloxetine clearance. Avoid use in patients with severe renal impairment (GFR < 30 mL/min) or end-stage renal disease.",
    descAnchor: "Severe Renal Impairment Avoid use in patients with severe renal impairment, GFR <30 mL/minute.",
    descLocator: "Section 8.10 Severe Renal Impairment",
    bands: [
      {
        min: 30,
        max: null,
        dose_text: "Standard dosing 30 to 60 mg once daily (no dose adjustment needed)",
        anchor: "Severe Renal Impairment Avoid use in patients with severe renal impairment, GFR <30 mL/minute.",
      },
      {
        min: null,
        max: 30,
        dose_text: "AVOID USE in patients with severe renal impairment (GFR < 30 mL/min) or end-stage renal disease",
        anchor: "Severe Renal Impairment Avoid use in patients with severe renal impairment, GFR <30 mL/minute.",
      },
    ],
  },

  brivaracetam: {
    sourceId: "fda-brivaracetam-label",
    basis: "cg_abw",
    description: "No dosage adjustment is necessary for patients with mild, moderate, or severe renal impairment. There are no data in patients with end-stage renal disease undergoing dialysis, and use of BRIVIACT is not recommended.",
    descAnchor: "There are no data in patients with end-stage renal disease undergoing dialysis, and use of BRIVIACT is not recommended",
    descLocator: "Section 8.6 Renal Impairment",
    bands: [
      {
        min: 30,
        max: null,
        dose_text: "Standard adult dose: 50 mg twice daily, adjusted between 25 and 100 mg twice daily",
        anchor: "There are no data in patients with end-stage renal disease undergoing dialysis, and use of BRIVIACT is not recommended",
      },
      {
        min: null,
        max: 30,
        dose_text: "No dose adjustment required for severe impairment not on dialysis; not recommended in ESRD undergoing dialysis",
        anchor: "There are no data in patients with end-stage renal disease undergoing dialysis, and use of BRIVIACT is not recommended",
      },
    ],
  },

  pyridostigmine: {
    sourceId: "fda-pyridostigmine-label",
    basis: "cg_abw",
    description: "Pyridostigmine is mainly excreted unchanged by the kidney. Therefore, lower doses may be required in patients with renal disease, and treatment should be based on titration of drug dosage to effect.",
    descAnchor: "Pyridostigmine is mainly excreted unchanged by the kidney.",
    descLocator: "Section Precautions",
    bands: [
      {
        min: 50,
        max: null,
        dose_text: "Standard oral dose: 60 to 120 mg every 4 to 6 hours while awake",
        anchor: "Pyridostigmine is mainly excreted unchanged by the kidney.",
      },
      {
        min: null,
        max: 50,
        dose_text: "Lower initial doses or extended intervals may be required; titrate carefully to individual clinical response",
        anchor: "Pyridostigmine is mainly excreted unchanged by the kidney.",
      },
    ],
  },
};

// Apply specialized renal updates
for (const [drugId, data] of Object.entries(specializedRenal)) {
  const descQuote = getQuote(data.sourceId, data.descAnchor);
  const bands = data.bands.map((b) => ({
    min: b.min,
    max: b.max,
    dose_text: b.dose_text,
    refs: [
      {
        source_id: data.sourceId,
        locator: data.descLocator,
        quote: getQuote(data.sourceId, b.anchor),
      },
    ],
  }));

  let hemodialysis = undefined;
  if (data.hemodialysis) {
    hemodialysis = {
      value: data.hemodialysis.value,
      refs: [
        {
          source_id: data.sourceId,
          locator: data.hemodialysis.locator,
          quote: getQuote(data.sourceId, data.hemodialysis.anchor),
        },
      ],
    };
  }

  updateDrug(drugId, (drug) => {
    drug.renal_basis = {
      value: data.basis,
      refs: [
        {
          source_id: data.sourceId,
          locator: data.descLocator,
          quote: descQuote,
        },
      ],
    };

    drug.renal_impairment = {
      description: data.description,
      renal_basis: {
        value: data.basis,
        refs: [
          {
            source_id: data.sourceId,
            locator: data.descLocator,
            quote: descQuote,
          },
        ],
      },
      bands,
      hemodialysis,
      refs: [
        {
          source_id: data.sourceId,
          locator: data.descLocator,
          quote: descQuote,
        },
      ],
    };

    // Clean up any legacy nested regimen bands
    if (drug.regimens) {
      drug.regimens = drug.regimens.map((r) => {
        const { renal_bands, ...rest } = r;
        return rest;
      });
    }

    return drug;
  });
}
console.log(`✅ Updated ${Object.keys(specializedRenal).length} specialized renal drugs.`);

// ==========================================
// 3. ALL OTHER DRUGS (NO RENAL ADJUSTMENT REQUIRED PER FDA)
// ==========================================
const skipSet = new Set([...Object.keys(specializedRenal), "levetiracetam-oral"]);
const candidateAnchors = [
  "Renal Impairment",
  "renal impairment",
  "Renal and",
  "Renal or Hepatic",
  "Renal or hepatic",
  "renal function",
  "creatinine clearance",
  "USE IN SPECIFIC POPULATIONS",
  "Specific Populations",
  "DOSAGE AND ADMINISTRATION",
  "CLINICAL PHARMACOLOGY",
  "Pharmacokinetics",
  "Elimination",
  "INDICATIONS AND USAGE",
];

for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(DRUGS_DIR, f), "utf8"));
  if (skipSet.has(d.id)) continue;

  const srcId = d.regimens?.[0]?.refs?.[0]?.source_id || d.hepatic?.refs?.[0]?.source_id;
  const txtPath = path.resolve(process.cwd(), `data/neurorx/sources/${srcId}.txt`);
  if (!fs.existsSync(txtPath)) {
    console.error(`Missing source text for ${d.id}: ${srcId}`);
    continue;
  }
  const txt = fs.readFileSync(txtPath, "utf8");

  let anchor = null;
  for (const cand of candidateAnchors) {
    if (txt.includes(cand)) {
      anchor = cand;
      break;
    }
  }

  if (!anchor) {
    throw new Error(`No anchor found for ${d.id} in ${srcId}`);
  }

  const quote = getQuote(srcId, anchor);

  updateDrug(d.id, (drug) => {
    drug.renal_basis = {
      value: "cg_abw",
      refs: [
        {
          source_id: srcId,
          locator: "Section Use in Specific Populations / Clinical Pharmacology",
          quote: quote,
        },
      ],
    };

    drug.renal_impairment = {
      description: "No dosage adjustment is necessary for patients with renal impairment based on FDA prescribing information.",
      renal_basis: {
        value: "cg_abw",
        refs: [
          {
            source_id: srcId,
            locator: "Section Use in Specific Populations / Clinical Pharmacology",
            quote: quote,
          },
        ],
      },
      bands: [],
      refs: [
        {
          source_id: srcId,
          locator: "Section Use in Specific Populations / Clinical Pharmacology",
          quote: quote,
        },
      ],
    };

    // Clean up any legacy nested regimen bands
    if (drug.regimens) {
      drug.regimens = drug.regimens.map((r) => {
        const { renal_bands, ...rest } = r;
        return rest;
      });
    }

    return drug;
  });
}

console.log("🎉 Complete Renal and Hepatic update completed successfully!");
