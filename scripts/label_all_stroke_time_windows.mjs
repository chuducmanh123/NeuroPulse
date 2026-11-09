import fs from "fs";
import path from "path";
import { CLINICAL_CONDITIONS_V3, toTimeWindowId } from "../src/data/clinicalNavigatorTaxonomyV3.ts";

/**
 * MASTER CLINICAL DICTIONARY FOR ACUTE STROKE STUDIES & PIVOTAL TRIALS
 * Contains verified publication evidence from NEJM, Lancet, JAMA, Stroke.
 */
export const STROKE_STUDY_TIME_WINDOWS = {
  // 1. Prehospital & Mobile Stroke Unit
  "trial-wsc-msu-asia": {
    acronym: "ASIA-MSU",
    timeWindow: "≤ 4.5 hours from symptom onset (prehospital MSU golden hour)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase"],
  },
  "best-msu-2021": {
    acronym: "BEST-MSU",
    timeWindow: "≤ 4.5 hours from onset (median 72 min to tPA on MSU)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },
  "b-proud-2021": {
    acronym: "B_PROUD",
    timeWindow: "≤ 4.5 hours from onset (hyperacute prehospital MSU)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },

  // 2. IV Thrombolysis (0 - 4.5h)
  "ninds-rtpa-1995": {
    acronym: "NINDS tPA",
    timeWindow: "≤ 3 hours from symptom onset (0–180 min)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },
  "ecass-iii-2008": {
    acronym: "ECASS III",
    timeWindow: "3.0 to 4.5 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },
  "act-2022": {
    acronym: "AcT",
    timeWindow: "≤ 4.5 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase", "cond_ischemic_stroke_int_alteplase"],
  },
  "trace-2-2023": {
    acronym: "TRACE-2",
    timeWindow: "≤ 4.5 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase", "cond_ischemic_stroke_int_alteplase"],
  },
  "attest-2-2024": {
    acronym: "ATTEST-2",
    timeWindow: "≤ 4.5 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase", "cond_ischemic_stroke_int_alteplase"],
  },
  "taste-2024": {
    acronym: "TASTE",
    timeWindow: "≤ 4.5 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase", "cond_ischemic_stroke_int_alteplase"],
  },
  "nor-test-2-2022": {
    acronym: "NOR-TEST 2",
    timeWindow: "≤ 4.5 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase"],
  },
  "extend-ia-tnk-2018": {
    acronym: "EXTEND-IA TNK",
    timeWindow: "≤ 4.5 hours from symptom onset (bridging prior to EVT)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase", "cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "raise-2024": {
    acronym: "RAISE",
    timeWindow: "≤ 4.5 hours from last known normal",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },
  "prost-2023": {
    acronym: "PROST",
    timeWindow: "≤ 4.5 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },
  "prisms-2018": {
    acronym: "PRISMS",
    timeWindow: "≤ 3 hours from symptom onset (mild non-disabling AIS)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase", "cond_ischemic_stroke_int_sapt"],
  },
  "most-2024": {
    acronym: "MOST",
    timeWindow: "≤ 3 hours from symptom onset",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },

  // 3. Extended Window & Wake-Up Thrombolysis
  "wake-up-2018": {
    acronym: "WAKE-UP",
    timeWindow: "Unknown onset / wake-up stroke, ≤ 4.5h from symptom recognition (DWI-FLAIR mismatch)",
    ontTW: ["unknown_onset_wake_up", "within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_unknown_onset", "cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },
  "extend-2019": {
    acronym: "EXTEND",
    timeWindow: "4.5 to 9.0 hours from onset or wake-up stroke (CTP/MRP mismatch)",
    ontTW: ["h6_to_24h", "unknown_onset_wake_up"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_ischemic_stroke_tw_unknown_onset"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_alteplase"],
  },
  "timeless-2024": {
    acronym: "TIMELESS",
    timeWindow: "4.5 to 24 hours from last known well (penumbral mismatch on CTP/MRP)",
    ontTW: ["h6_to_24h", "within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase"],
  },
  "trial-trace-3": {
    acronym: "TRACE-III",
    timeWindow: "4.5 to 24 hours from onset or wake-up stroke (penumbral mismatch without immediate EVT)",
    ontTW: ["h6_to_24h", "within_24h", "unknown_onset_wake_up"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_ischemic_stroke_tw_unknown_onset"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_tenecteplase"],
  },

  // 4. Endovascular Thrombectomy (0 - 6h early window)
  "mr-clean-2015": {
    acronym: "MR CLEAN",
    timeWindow: "≤ 6 hours from symptom onset",
    ontTW: ["within_6h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h", "cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },

  // 5. Extended Window EVT (6 - 24h & up to 12h/24h)
  "escape-2015": {
    acronym: "ESCAPE",
    timeWindow: "≤ 12 hours from symptom onset (good collaterals on multiphase CTA)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "dawn-2018": {
    acronym: "DAWN",
    timeWindow: "6 to 24 hours from last known well (including wake-up stroke; clinical-core mismatch)",
    ontTW: ["h6_to_24h", "within_24h", "unknown_onset_wake_up"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_ischemic_stroke_tw_unknown_onset"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "defuse-3-2018": {
    acronym: "DEFUSE-3",
    timeWindow: "6 to 16 hours from last known well (perfusion mismatch on CTP/MRP)",
    ontTW: ["h6_to_24h", "within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "select2-2023": {
    acronym: "SELECT2",
    timeWindow: "≤ 24 hours from last known well (large core: ASPECTS 3–5 or core ≥ 50 mL)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "angel-aspect-2023": {
    acronym: "ANGEL-ASPECT",
    timeWindow: "≤ 24 hours from symptom onset (large core: ASPECTS 3–5 or infarct vol 70–100 mL)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "tension-2023": {
    acronym: "TENSION",
    timeWindow: "≤ 12 hours from symptom onset or wake-up stroke (ASPECTS 3–5 on NCCT/MRI)",
    ontTW: ["within_24h", "unknown_onset_wake_up"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_ischemic_stroke_tw_unknown_onset"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "rescue-japan-limit-2022": {
    acronym: "RESCUE-Japan LIMIT",
    timeWindow: "≤ 6 hours or 6–24 hours with no change on FLAIR (ASPECTS 3–5)",
    ontTW: ["within_6h", "h6_to_24h", "within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h", "cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "trial-laste": {
    acronym: "LASTE",
    timeWindow: "≤ 6.5 hours from last known well (extremely large core: ASPECTS 0–2 or core > 50 mL)",
    ontTW: ["within_6h", "h6_to_24h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h", "cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "attention-2022": {
    acronym: "ATTENTION",
    timeWindow: "≤ 12 hours of estimated basilar artery occlusion onset",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_basilar_thrombectomy", "cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "baoche-2022": {
    acronym: "BAOCHE",
    timeWindow: "6 to 24 hours from basilar artery occlusion onset",
    ontTW: ["h6_to_24h", "within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_basilar_thrombectomy", "cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "mild-mt-2026": {
    acronym: "MILD-MT",
    timeWindow: "≤ 24 hours from symptom onset (mild AIS with LVO, NIHSS ≤ 5)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "trial-wsc-mevo": {
    acronym: "DISTAL-EVT",
    timeWindow: "≤ 12 hours from symptom onset (distal M2/M3, A2/A3 occlusions)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "trial-escape-mevo": {
    acronym: "ESCAPE-MeVO",
    timeWindow: "≤ 12 hours from symptom onset (medium vessel occlusions: M2/M3, A2/A3, P2/P3)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "choice-2022": {
    acronym: "CHOICE",
    timeWindow: "≤ 24 hours from onset (adjunctive intra-arterial Alteplase post-EVT reperfusion)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_intra_arterial_thrombolysis", "cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "discount-2025": {
    acronym: "DISCOUNT",
    timeWindow: "≤ 12 hours from symptom onset (distal medium vessel EVT)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },
  "racecat-2022": {
    acronym: "RACECAT",
    timeWindow: "≤ 7 hours from symptom onset (prehospital direct-to-EVT triage)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_mechanical_thrombectomy"],
  },

  // 6. Acute Antiplatelet / DAPT
  "chance-2013": {
    acronym: "CHANCE",
    timeWindow: "≤ 24 hours from symptom onset (minor AIS NIHSS ≤ 3 or high-risk TIA ABCD2 ≥ 4)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_tia_tw_hyperacute_lt_24h"],
    conditionIds: ["cond_ischemic_stroke", "cond_tia"],
    interventionTags: ["cond_ischemic_stroke_int_dapt"],
  },
  "point-2018": {
    acronym: "POINT",
    timeWindow: "≤ 12 hours from symptom onset (minor AIS NIHSS ≤ 3 or high-risk TIA ABCD2 ≥ 4)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_tia_tw_hyperacute_lt_24h"],
    conditionIds: ["cond_ischemic_stroke", "cond_tia"],
    interventionTags: ["cond_ischemic_stroke_int_dapt"],
  },
  "chance-2-2021": {
    acronym: "CHANCE-2",
    timeWindow: "≤ 24 hours from onset (CYP2C19 loss-of-function: Ticagrelor + ASA vs Clopidogrel + ASA)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_tia_tw_hyperacute_lt_24h"],
    conditionIds: ["cond_ischemic_stroke", "cond_tia"],
    interventionTags: ["cond_ischemic_stroke_int_dapt"],
  },
  "thales-2020": {
    acronym: "THALES",
    timeWindow: "≤ 24 hours from onset (minor AIS NIHSS ≤ 5 or high-risk TIA: Ticagrelor + ASA)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_tia_tw_hyperacute_lt_24h"],
    conditionIds: ["cond_ischemic_stroke", "cond_tia"],
    interventionTags: ["cond_ischemic_stroke_int_dapt"],
  },
  "aramis-2023": {
    acronym: "ARAMIS",
    timeWindow: "≤ 4.5 hours from onset (minor non-disabling AIS: DAPT vs Alteplase)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_dapt", "cond_ischemic_stroke_int_alteplase"],
  },
  "inspires-2023": {
    acronym: "INSPIRES",
    timeWindow: "24 to 72 hours from symptom onset (delayed DAPT initiation)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_beyond_24h", "cond_tia_tw_early_phase_day_2_7"],
    conditionIds: ["cond_ischemic_stroke", "cond_tia"],
    interventionTags: ["cond_ischemic_stroke_int_dapt"],
  },

  // 7. Early Anticoagulation / DOAC
  "elan-2023": {
    acronym: "ELAN",
    timeWindow: "Early DOAC initiation: ≤ 48h (minor stroke), Day 3–4 (moderate), Day 6–7 (major)",
    ontTW: ["within_24h", "beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h", "cond_ischemic_stroke_tw_beyond_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_doac"],
  },
  "trial-wsc-prevent-doac": {
    acronym: "PREVENT-DOAC",
    timeWindow: "≤ 24 hours from symptom onset (Immediate Day 1 vs Early Day 3–4 DOAC in AF-AIS)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_doac"],
  },
  "trial-oceanic-stroke": {
    acronym: "OCEANIC-STROKE",
    timeWindow: "≤ 7 days post-stroke (subacute secondary prevention with Asundexian FXIa inhibitor)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_beyond_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_sapt"],
  },

  // 8. Acute Hemodynamics & Critical Care
  "interact2-2013": {
    acronym: "INTERACT2",
    timeWindow: "≤ 6 hours from symptom onset (intensive BP lowering SBP < 140 mmHg within 1h)",
    ontTW: ["within_6h"],
    v3TW: ["cond_ich_tw_hyperacute_lt_6h"],
    conditionIds: ["cond_ich"],
    interventionTags: ["cond_ich_int_blood_pressure_control"],
  },
  "atach-2-2016": {
    acronym: "ATACH-2",
    timeWindow: "≤ 4.5 hours from symptom onset (intensive BP lowering target 110–139 mmHg)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ich_tw_hyperacute_lt_6h"],
    conditionIds: ["cond_ich"],
    interventionTags: ["cond_ich_int_blood_pressure_control"],
  },
  "interact4-2024": {
    acronym: "INTERACT4",
    timeWindow: "≤ 2 hours from symptom onset in the ambulance (prehospital BP reduction)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ich_tw_hyperacute_lt_6h", "cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ich", "cond_ischemic_stroke"],
    interventionTags: ["cond_ich_int_blood_pressure_control"],
  },
  "right-2-2019": {
    acronym: "RIGHT-2",
    timeWindow: "≤ 4 hours from symptom onset in the ambulance (prehospital GTN patch)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h", "cond_ich_tw_hyperacute_lt_6h"],
    conditionIds: ["cond_ischemic_stroke", "cond_ich"],
    interventionTags: ["cond_ischemic_stroke_int_blood_pressure_control"],
  },
  "enchanted2-mt-2022": {
    acronym: "ENCHANTED2/MT",
    timeWindow: "Post-reperfusion (first 72 hours post-successful EVT; SBP target < 120 mmHg harmful)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_beyond_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_blood_pressure_control"],
  },
  "optimal-bp-2023": {
    acronym: "OPTIMAL-BP",
    timeWindow: "First 24h post-successful EVT (intensive SBP < 140 mmHg vs conventional 140–180 mmHg)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_blood_pressure_control"],
  },
  "bp-target-2021": {
    acronym: "BP-TARGET",
    timeWindow: "Within 1 hour post-successful reperfusion (intensive SBP 100–129 mmHg vs 130–180 mmHg)",
    ontTW: ["within_4_5h"],
    v3TW: ["cond_ischemic_stroke_tw_early_window_le_4_5h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_blood_pressure_control"],
  },
  "catis-2014": {
    acronym: "CATIS",
    timeWindow: "≤ 48 hours from symptom onset (antihypertensive treatment in acute ischemic stroke)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_beyond_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_blood_pressure_control"],
  },
  "shine-2019": {
    acronym: "SHINE",
    timeWindow: "≤ 12 hours from symptom onset (intensive IV insulin target 80–130 mg/dL)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_blood_pressure_control"],
  },
  "charm-2023": {
    acronym: "CHARM",
    timeWindow: "≤ 10 hours from symptom onset (Cirara/IV glibenclamide for large hemispheric infarction)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_hemicraniectomy"],
  },
  "destiny-ii-2014": {
    acronym: "DESTINY II",
    timeWindow: "≤ 48 hours from onset (decompressive hemicraniectomy in elderly malignant MCA stroke)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_beyond_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_hemicraniectomy"],
  },
  "clots-3-2013": {
    acronym: "CLOTS 3",
    timeWindow: "Day 0–3 of acute stroke admission (intermittent pneumatic compression for DVT prevention)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_beyond_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_heparin"],
  },
  "avert-2015": {
    acronym: "AVERT",
    timeWindow: "≤ 24 hours from onset (very early out-of-bed mobilization within 24h reduced good recovery)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_early_mobilization"],
  },
  "pass-2015": {
    acronym: "PASS",
    timeWindow: "≤ 24 hours from stroke onset (preventive Ceftriaxone 2g daily for 4 days)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ischemic_stroke_tw_extended_window_4_5h_24h"],
    conditionIds: ["cond_ischemic_stroke", "cond_stroke_other"],
    interventionTags: ["cond_stroke_other_int_broad_antibiotics"],
  },
  "stroke-inf-2015": {
    acronym: "STROKE-INF",
    timeWindow: "≤ 48 hours from symptom onset in dysphagic stroke (preventive clarithromycin/co-amoxiclav)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ischemic_stroke_tw_beyond_24h", "cond_stroke_other_tw_complication_onset"],
    conditionIds: ["cond_ischemic_stroke", "cond_stroke_other"],
    interventionTags: ["cond_stroke_other_int_broad_antibiotics"],
  },

  // 9. Intracerebral Hemorrhage (ICH)
  "enrich-2024": {
    acronym: "ENRICH",
    timeWindow: "≤ 24 hours from last known normal (trans-sulcal para-fascicular MIPS hematoma evacuation)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ich_tw_acute_window_6h_24h"],
    conditionIds: ["cond_ich"],
    interventionTags: ["cond_ich_int_minimally_invasive_surgery"],
  },
  "mistie-iii-2019": {
    acronym: "MISTIE III",
    timeWindow: "12 to 72 hours from symptom onset (stereotactic catheter evacuation + Alteplase irrigation)",
    ontTW: ["beyond_24h"],
    v3TW: ["cond_ich_tw_subacute_24h_72h"],
    conditionIds: ["cond_ich"],
    interventionTags: ["cond_ich_int_minimally_invasive_surgery"],
  },
  "patch-2016": {
    acronym: "PATCH",
    timeWindow: "≤ 6 hours from symptom onset in antiplatelet-associated acute ICH (platelet transfusion harmful)",
    ontTW: ["within_6h"],
    v3TW: ["cond_ich_tw_hyperacute_lt_6h"],
    conditionIds: ["cond_ich"],
    interventionTags: ["cond_ich_int_platelet_transfusion"],
  },
  "annexa-4-2019": {
    acronym: "ANNEXA-4",
    timeWindow: "Acute presentation of life-threatening bleeding (within 18h of FXIa inhibitor intake)",
    ontTW: ["within_24h"],
    v3TW: ["cond_ich_tw_hyperacute_lt_6h", "cond_ich_tw_acute_window_6h_24h"],
    conditionIds: ["cond_ich"],
    interventionTags: ["cond_ich_int_andexanet_alfa"],
  },

  // 10. Aneurysmal Subarachnoid Hemorrhage (aSAH)
  "isatch-isat-2002": {
    acronym: "ISAT",
    timeWindow: "Acute aSAH admission (< 72 hours from rupture; endovascular coiling vs surgical clipping)",
    ontTW: ["within_24h", "beyond_24h"],
    v3TW: ["cond_sah_tw_pre_securing_lt_72h"],
    conditionIds: ["cond_sah"],
    interventionTags: ["cond_sah_int_aneurysm_coiling", "cond_sah_int_surgical_clipping"],
  },
  "brat-2012": {
    acronym: "BRAT",
    timeWindow: "Hyperacute aSAH admission (< 72 hours; coiling vs clipping)",
    ontTW: ["within_24h", "beyond_24h"],
    v3TW: ["cond_sah_tw_pre_securing_lt_72h"],
    conditionIds: ["cond_sah"],
    interventionTags: ["cond_sah_int_aneurysm_coiling", "cond_sah_int_surgical_clipping"],
  },

  // 11. Long-term Secondary & Primary Prevention
  "aristotle-2011": {
    acronym: "ARISTOTLE",
    timeWindow: "Long-term secondary and primary stroke prevention (median 1.8 years)",
    ontTW: [],
    v3TW: [],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_doac"],
  },
  "re-ly-2009": {
    acronym: "RE-LY",
    timeWindow: "Long-term secondary stroke prevention in AF (median 2.0 years)",
    ontTW: [],
    v3TW: [],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_doac"],
  },
  "east-afnet-4-2020": {
    acronym: "EAST-AFNET 4",
    timeWindow: "Within 1 year of AF diagnosis (early rhythm-control therapy)",
    ontTW: [],
    v3TW: [],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_doac"],
  },
  "sprint-2015": {
    acronym: "SPRINT",
    timeWindow: "Long-term primary prevention (median follow-up 3.26 years)",
    ontTW: [],
    v3TW: [],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_blood_pressure_control"],
  },
  "acst-2-2021": {
    acronym: "ACST-2",
    timeWindow: "5-year follow-up for primary prevention of stroke in asymptomatic carotid stenosis",
    ontTW: [],
    v3TW: ["cond_carotid_tw_elective_gt_14_days"],
    conditionIds: ["cond_carotid"],
    interventionTags: ["cond_carotid_int_carotid_stenting", "cond_carotid_int_carotid_endarterectomy"],
  },
  "aspree-2018": {
    acronym: "ASPREE",
    timeWindow: "Long-term primary prevention (median follow-up 4.7 years in healthy elderly)",
    ontTW: [],
    v3TW: [],
    conditionIds: ["cond_ischemic_stroke"],
    interventionTags: ["cond_ischemic_stroke_int_sapt"],
  },

  // 12. Non-stroke trials in registry
  "esett-2019": {
    acronym: "ESETT",
    timeWindow: "Established Status Epilepticus (5 to 30 minutes of continuous seizure)",
    ontTW: [],
    v3TW: ["cond_status_epilepticus_tw_5_30_min"],
    conditionIds: ["cond_status_epilepticus"],
    interventionTags: ["cond_status_epilepticus_int_levetiracetam"],
  },
  "trial-aes-ketamine-rse": {
    acronym: "KET-RSE",
    timeWindow: "Refractory Status Epilepticus (30 minutes to 24 hours of seizure activity)",
    ontTW: [],
    v3TW: ["cond_status_epilepticus_tw_30_min_24h"],
    conditionIds: ["cond_status_epilepticus"],
    interventionTags: ["cond_status_epilepticus_int_ketamine"],
  },
  "trial-donanemab-realworld": {
    acronym: "TRAILBLAZER-EXT",
    timeWindow: "Early symptomatic Alzheimer's disease (scheduled baseline & surveillance MRIs)",
    ontTW: [],
    v3TW: [],
    conditionIds: ["cond_ad"],
    interventionTags: ["cond_ad_int_donanemab"],
  },
};

console.log("Master stroke study time window map defined with", Object.keys(STROKE_STUDY_TIME_WINDOWS).length, "trials.");

export function applyTimeWindowLabels() {
  const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
  const cloud = JSON.parse(fs.readFileSync(cloudPath, "utf-8"));
  let updatedCount = 0;

  for (const trial of cloud.pivotalTrials || []) {
    const meta = STROKE_STUDY_TIME_WINDOWS[trial.id] || STROKE_STUDY_TIME_WINDOWS[trial.acronym?.toLowerCase()];
    if (!meta) continue;

    // 1. Update pico.timeWindow
    trial.pico = trial.pico || {};
    trial.pico.timeWindow = meta.timeWindow;

    // 2. Update ontologyTags.time_window
    trial.ontologyTags = trial.ontologyTags || {};
    if (meta.ontTW && meta.ontTW.length > 0) {
      trial.ontologyTags.time_window = meta.ontTW;
    } else if (trial.ontologyTags.time_window) {
      delete trial.ontologyTags.time_window;
    }

    // 3. Update v3Tags
    const existingDomains = trial.v3Tags?.domains || (
      meta.timeWindow.includes("prevention") || meta.timeWindow.includes("secondary")
        ? ["treatment", "prevention"]
        : ["treatment"]
    );

    trial.v3Tags = {
      conditionIds: meta.conditionIds || trial.v3Tags?.conditionIds || ["cond_ischemic_stroke"],
      domains: existingDomains,
      diagnosisTags: trial.v3Tags?.diagnosisTags || [],
      timeWindowIds: meta.v3TW || [],
      interventionTags: meta.interventionTags || trial.v3Tags?.interventionTags || [],
    };

    updatedCount++;
  }

  // Also update conferences lateBreakingTrials
  for (const conf of cloud.conferences || []) {
    for (const lbt of conf.lateBreakingTrials || []) {
      const meta = STROKE_STUDY_TIME_WINDOWS[lbt.id] || STROKE_STUDY_TIME_WINDOWS[lbt.trialAcronym?.toLowerCase()];
      if (meta && meta.timeWindow) {
        if (!lbt.populationSummary.toLowerCase().includes("window") && !lbt.populationSummary.toLowerCase().includes("within")) {
          lbt.populationSummary = `${lbt.populationSummary} Time window: ${meta.timeWindow}.`;
        }
      }
    }
  }

  cloud.lastSyncedAt = new Date().toISOString();
  fs.writeFileSync(cloudPath, JSON.stringify(cloud, null, 2), "utf-8");
  console.log(`Successfully updated and labeled ${updatedCount} trials in ${cloudPath}!`);

  // Update src/data/pivotalTrialsSeed.ts
  const seedPath = path.join(process.cwd(), "src", "data", "pivotalTrialsSeed.ts");
  let seedContent = fs.readFileSync(seedPath, "utf-8");

  // For each trial in STROKE_STUDY_TIME_WINDOWS, if it exists in seed, update its timeWindow and v3Tags
  for (const [id, meta] of Object.entries(STROKE_STUDY_TIME_WINDOWS)) {
    if (!seedContent.includes(`id: "${id}"`)) continue;

    // Ensure timeWindow in PICO is updated
    const picoRegex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?pico:\\s*\\{[\\s\\S]*?)(timeWindow:\\s*"[^"]*",?)?([\\s\\S]*?\\},)`, "m");
    const m = seedContent.match(picoRegex);
    if (m) {
      const beforeTW = m[1].replace(/timeWindow:\s*"[^"]*",?\r?\n\s*/g, "");
      const afterTW = m[3];
      const replacement = `${beforeTW}timeWindow: "${meta.timeWindow}",\n    ${afterTW}`;
      seedContent = seedContent.replace(m[0], replacement);
    }

    // Ensure v3Tags is present
    if (meta.v3TW && meta.v3TW.length > 0) {
      const v3TagBlock = `v3Tags: {\n      conditionIds: ${JSON.stringify(meta.conditionIds)},\n      domains: ["treatment"],\n      timeWindowIds: ${JSON.stringify(meta.v3TW)},\n      interventionTags: ${JSON.stringify(meta.interventionTags)},\n    },`;
      
      const v3Regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?)(v3Tags:\\s*\\{[\\s\\S]*?\\},)?([\\s\\S]*?ontologyTags:)`, "m");
      const vm = seedContent.match(v3Regex);
      if (vm) {
        const pre = vm[1].replace(/v3Tags:\s*\{[\s\S]*?\},?\r?\n\s*/g, "");
        const post = vm[3];
        seedContent = seedContent.replace(vm[0], `${pre}${v3TagBlock}\n    ${post}`);
      }
    }
  }
  fs.writeFileSync(seedPath, seedContent, "utf-8");
  console.log(`Successfully updated ${seedPath}!`);
}

applyTimeWindowLabels();
