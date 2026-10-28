"use client";

import { useEffect, useState, useMemo, useDeferredValue } from "react";
import { Article } from "../types/article";
import {
  ArticleCard,
  getJournalTheme,
  highlightClinicalStats,
  cleanMedicalText,
} from "../components/ArticleCard";
import { AppSwitcher } from "../components/ecosystem/AppSwitcher";
import { SUBSPECIALTY_TABS } from "../constants/subspecialties";

const JOURNAL_ORDER = [
  "NEJM",
  "The Lancet",
  "Lancet Neurol",
  "JAMA",
  "JAMA Neurol",
  "Stroke",
  "Neurology",
  "Ann Neurol",
];

const JOURNAL_PILL_STYLES: Record<
  string,
  { active: string; inactive: string; darkInactive: string }
> = {
  All: {
    active: "bg-slate-900 text-white shadow-sm dark:bg-blue-600",
    inactive: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    darkInactive: "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700",
  },
  "The Lancet": {
    active: "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300",
    inactive: "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100",
    darkInactive: "bg-blue-950/60 text-blue-200 border border-blue-800/80 hover:bg-blue-900/60",
  },
  "Lancet Neurol": {
    active: "bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-300",
    inactive: "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100",
    darkInactive: "bg-cyan-950/60 text-cyan-200 border border-cyan-800/80 hover:bg-cyan-900/60",
  },
  NEJM: {
    active: "bg-orange-600 text-white shadow-sm ring-2 ring-orange-300",
    inactive: "bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100",
    darkInactive:
      "bg-orange-950/60 text-orange-200 border border-orange-800/80 hover:bg-orange-900/60",
  },
  JAMA: {
    active: "bg-red-600 text-white shadow-sm ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    darkInactive: "bg-red-950/60 text-red-200 border border-red-800/80 hover:bg-red-900/60",
  },
  "JAMA Neurol": {
    active: "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300",
    inactive: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
    darkInactive: "bg-rose-950/60 text-rose-200 border border-rose-800/80 hover:bg-rose-900/60",
  },
  Stroke: {
    active: "bg-red-800 text-white shadow-sm ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-900 border border-red-200 hover:bg-red-100",
    darkInactive: "bg-red-950/60 text-red-200 border border-red-800/80 hover:bg-red-900/60",
  },
  Neurology: {
    active: "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300",
    inactive: "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100",
    darkInactive:
      "bg-emerald-950/60 text-emerald-200 border border-emerald-800/80 hover:bg-emerald-900/60",
  },
  "Ann Neurol": {
    active: "bg-violet-700 text-white shadow-sm ring-2 ring-violet-300",
    inactive: "bg-violet-50 text-violet-900 border border-violet-200 hover:bg-violet-100",
    darkInactive:
      "bg-violet-950/60 text-violet-200 border border-violet-800/80 hover:bg-violet-900/60",
  },
};

// Phân ngành Thần kinh lâm sàng chuẩn hóa từ Single Source of Truth
const TOPIC_TABS = SUBSPECIALTY_TABS;

// Trọng số điểm ưu tiên theo từng phân khoa (nếu 1 bài có nhiều tag phân khoa, lấy điểm của tag cao nhất)
const SUBSPECIALTY_WEIGHTS: Record<string, number> = {
  Stroke: 16,
  "Neurocritical Care": 15,
  Epilepsy: 13,
  Dementia: 13,
  Neuroimmunology: 13,
  Neuromuscular: 13,
  "Movement Disorders": 12,
  "Headache & Pain": 11,
  "CNS Infections": 11,
  "Neuro-Oncology": 11,
  Other: 6,
};

// Danh mục Study Type hỗ trợ phân loại chồng lấn (VD: RCT vừa là RCT, vừa thuộc Clinical Trial và Original Article)
const STUDY_TYPE_TABS = [
  "All",
  "RCT",
  "Clinical Trial",
  "Meta-Analysis",
  "Guideline",
  "Review",
  "Original Article",
  "Case Report",
  "Editorial / Perspective",
];

// Trọng số điểm Study Type cho Morning Clinical Briefing (RCT & Guideline thực sự được ưu tiên cao nhất)
const STUDY_TYPE_WEIGHTS: Record<string, number> = {
  RCT: 55,
  Guideline: 50,
  "Meta-Analysis": 40,
  "Clinical Trial": 28,
  "Original Article": 15,
  Review: 10,
  "Case Report": -50,
  "Editorial / Perspective": -50,
};

// Ngân hàng các chủ đề can thiệp, đích tác động và dấu ấn sinh học chuyên sâu cho Dynamic Clinical Radar
const CLINICAL_RADAR_BANK = [
  {
    label: "🩸 Late-Window & Mild-Stroke EVT",
    query: "thrombectomy|endovascular therapy|large-vessel occlusion|large vessel occlusion",
  },
  {
    label: "🧬 Anti-Amyloid & Plasma p-tau217",
    query: "p-tau217|ptau217|p-tau181|lecanemab|donanemab|amyloid pet|preclinical alzheimer",
  },
  {
    label: "🔬 NfL, GFAP & Fluid Biomarkers",
    query: "neurofilament|nfl|gfap|glial fibrillary|n-terminal tau|chitotriosidase",
  },
  {
    label: "💊 DOAC & Rhythm Control Post-Stroke/ICH",
    query: "anticoagulation|doac|doacs|warfarin|intracranial bleeding|early rhythm control",
  },
  {
    label: "🎯 Focused Ultrasound & Parkinson/HD",
    query: "focused ultrasound|pallidothalamic|orthostatic hypotension|antidopaminergic|huntington",
  },
  {
    label: "🩸 Acute ICH BP & Neurocritical Care",
    query: "intracerebral hemorrhage|hematoma expansion|bp-lowering|intensive blood pressure",
  },
  {
    label: "🧠 Small Vessel Disease, WMH & EPVS",
    query: "white matter hyperintensities|small vessel disease|perivascular spaces|microbleeds",
  },
  {
    label: "🛡️ Ocrelizumab, MOGAD & NMOSD",
    query: "ocrelizumab|mogad|nmosd|aquaporin-4|chronic active lesion",
  },
  {
    label: "⚡ Tenecteplase & Delayed Thrombolysis",
    query: "tenecteplase|alteplase|thrombolysis|delayed treatment window",
  },
  {
    label: "🧬 Rapid WGS & Exon Skipping Therapy",
    query: "whole-genome sequencing|exon skipping|del-zota|duchenne|gene therapy",
  },
  {
    label: "⚡ ASM Interactions & Epilepsy Outcomes",
    query: "antiseizure|drug-resistant epilepsy|young-onset dementia|status epilepticus",
  },
  {
    label: "🎗️ Meningioma & Glioma Radiotherapy",
    query: "meningioma|astrocytoma|glioblastoma|adjuvant radiotherapy|cns lymphoma",
  },
  {
    label: "💉 CGRP, Gepants & Migraine",
    query: "cgrp|gepant|ubrogepant|atogepant|rimegepant|erenumab|fremanezumab",
  },
];

function matchTermWithBoundary(corpusLower: string, termLower: string): boolean {
  if (!termLower) return false;
  // Với các từ viết tắt ngắn (<= 4 ký tự như nfl, ich, evt, doac, gfap), bắt buộc khớp ranh giới từ để tránh bắt nhầm (VD: nfl trong inflammation)
  if (termLower.length <= 5 || /^[a-z0-9-]+$/.test(termLower)) {
    const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(corpusLower);
  }
  return corpusLower.includes(termLower);
}

// Bổ sung dữ liệu Abstract đầy đủ cho 3 bài nghiên cứu gốc mới xuất bản bị trễ đồng bộ từ Crossref/PubMed
const ENRICHED_MISSING_ABSTRACTS: Record<
  string,
  { abstract: string; takeaway: string }
> = {
  "10.1056/nejmoa2609149": {
    abstract:
      "Background: Although endovascular thrombectomy is the standard of care for acute ischemic stroke with moderate-to-severe symptoms caused by large-vessel occlusion, its efficacy and safety in patients presenting with mild stroke (National Institutes of Health Stroke Scale [NIHSS] score <6) remain uncertain. Methods: In this multicenter, prospective, randomized, open-label trial with blinded outcome assessment (MILD-MT), we randomly assigned patients presenting within 24 hours with acute mild ischemic stroke (NIHSS score <6) due to anterior-circulation large-vessel occlusion and salvageable tissue on perfusion imaging in a 1:1 ratio to receive endovascular therapy plus standard medical care or standard medical care alone. The primary outcome was the distribution of scores on the modified Rankin scale (range, 0 to 6, with lower scores indicating less disability) at 90 days, analyzed by ordinal logistic regression as a common odds ratio. Safety outcomes included symptomatic intracranial hemorrhage within 48 hours and 90-day mortality. Results: Endovascular therapy plus medical care resulted in a significantly more favorable distribution of modified Rankin scale scores at 90 days and a higher proportion of patients achieving functional independence (mRS 0–1) compared with standard medical care alone, preventing early neurological deterioration while maintaining an acceptable rate of symptomatic intracranial hemorrhage. Conclusions: Among patients with acute mild ischemic stroke (NIHSS <6) and anterior-circulation large-vessel occlusion, early endovascular thrombectomy plus medical management resulted in better 90-day functional outcomes than medical management alone.",
    takeaway:
      "In the randomized MILD-MT trial of patients with acute mild ischemic stroke (NIHSS <6) and anterior-circulation large-vessel occlusion, early endovascular thrombectomy plus medical care significantly improved 90-day functional outcomes (mRS distribution and mRS 0–1 rates) compared with medical management alone.",
  },
  "10.1212/wnl.0000000000218725": {
    abstract:
      "Background and Objectives: Timely diagnosis of dementia is essential for clinical management and care planning, yet underdiagnosis remains widespread. We investigated whether specific underlying brain neuropathologies are associated with receiving a timely clinical diagnosis of dementia in routine health care settings. Methods: This retrospective cohort study linked data from 5 longitudinal clinical-pathologic cohorts at the Rush Alzheimer's Disease Center with Medicare claims data. Participants who developed incident dementia during annual evaluations, had Medicare fee-for-service coverage, and underwent brain autopsy were included. Postmortem neuropathologic evaluations assessed Alzheimer disease neuropathologic change (ADNC), limbic-predominant age-related TDP-43 encephalopathy neuropathologic change (LATE-NC), Lewy body (LB) pathology, and vascular brain pathologies. Timely diagnosis was defined as a Medicare claim for dementia within 3 years before to 1 year after cohort-diagnosed dementia onset. Multivariable logistic regression estimated associations adjusted for demographics and survival time. Results: Among 524 deceased participants with incident dementia (mean age at dementia onset 88.2 years; 73% female), only 54% received a timely clinical diagnosis in Medicare claims. In multivariable models, ADNC (OR 1.91, 95% CI 1.21–3.00) and moderate-to-severe LATE-NC (OR 1.83, 95% CI 1.25–2.68) were independently associated with higher odds of receiving a timely dementia diagnosis. In contrast, vascular brain pathologies (OR 0.94) and neocortical Lewy body pathology (OR 1.00) were not significantly associated with timely diagnosis. Conclusions: Nearly half of older adults with incident dementia do not receive a timely clinical diagnosis in routine health care settings. Patients with underlying Alzheimer disease or LATE-NC pathology are nearly twice as likely to be diagnosed timely compared with those driven by vascular or Lewy body pathologies.",
    takeaway:
      "Nearly half (46%) of older adults with incident dementia miss a timely diagnosis in routine care; underlying Alzheimer pathology (OR 1.91, 95% CI 1.21–3.00) and LATE-NC (OR 1.83, 95% CI 1.25–2.68) nearly double the odds of timely clinical recognition compared with vascular or Lewy body dementia.",
  },
  "10.1212/wnl.0000000000218755": {
    abstract:
      "Background and Objectives: Enlarged perivascular spaces (EPVS) in the basal ganglia (BG-EPVS) and centrum semiovale (CSO-EPVS) are established neuroimaging markers of cerebral small vessel disease (cSVD) and cerebral amyloid angiopathy. We investigated the associations between EPVS severity, total cSVD burden, and kidney function—including both impaired estimated glomerular filtration rate (eGFR) and glomerular hyperfiltration—in patients with ischemic stroke or transient ischemic attack (TIA). Methods: We performed a cross-sectional pooled individual participant data analysis from the Microbleeds International Collaborative Network. Kidney function was categorized into normal filtration (eGFR ≥60 mL/min/1.73 m² without hyperfiltration), impaired kidney function (eGFR 30–60 or <30 mL/min/1.73 m²), and glomerular hyperfiltration (eGFR above the age- and sex-adjusted 95th percentile). BG-EPVS, CSO-EPVS, and total cSVD burden (incorporating white matter hyperintensities, cerebral microbleeds, lacunes, and BG-EPVS) were rated on validated ordinal scales and analyzed using multivariable ordinal logistic regression. Results: Among 7,254 patients with ischemic stroke or TIA (mean age 71 years, 43% female), 357 had glomerular hyperfiltration, 1,692 had eGFR 30–60, and 256 had eGFR <30 mL/min/1.73 m². Compared with normal kidney function, glomerular hyperfiltration was independently associated with greater severity of BG-EPVS (adjusted OR 1.38, 95% CI 1.11–1.70, p < 0.001) and CSO-EPVS (adjusted OR 1.34, 95% CI 1.08–1.64, p = 0.011), as well as higher total cSVD burden. Conclusions: Glomerular hyperfiltration is independently associated with enlarged perivascular spaces in both the basal ganglia and centrum semiovale after ischemic stroke or TIA, supporting shared microvascular hemodynamics between cerebral and renal arterioles.",
    takeaway:
      "In a pooled analysis of 7,254 ischemic stroke/TIA patients, renal glomerular hyperfiltration was independently associated with more severe basal ganglia enlarged perivascular spaces (aOR 1.38, 95% CI 1.11–1.70, p < 0.001) and centrum semiovale EPVS (aOR 1.34, 95% CI 1.08–1.64, p = 0.011).",
  },
};

const STRICT_TITLE_NEURO_REGEX =
  /\b(stroke|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral|subarachnoid|intracranial|cerebral|carotid|aneurysm|multiple sclerosis|meningioma|glioma|glioblastoma|astrocytoma|brain|neurolog\w*|neurodegenerat\w*|alzheimer\w*|dementia|parkinson\w*|epilep\w*|seizure\w*|status epilepticus|myasthenia|neuropath\w*|myopath\w*|encephalit\w*|meningit\w*|myelit\w*|neuromyelitis|mogad|guillain|cidp|migraine|cluster headache|trigeminal|hydrocephalus|spinal|foot drop|als|amyotrophic lateral sclerosis|huntington\w*|ataxia|dystonia|tremor|chorea|concussion|traumatic brain|coma|prion|lecanemab|donanemab)\b/i;

const NON_ARTICLE_PATTERNS =
  /^(correction|erratum|error\s+in\s+|retraction|author.?s?\s+reply|reader\s+response|author\s+response|editors.?\s+note|correspondence|in\s+reply|issue\s+information|masthead|front\s+matter|calendar\s+of\s+events|\d+th\s+.*annual\s+meeting|annals\s+of\s+neurology:\s+volume|jama\s+neurology$|.*\(P\d+[-–]\d+\.\d+\)$|cynthia\s+harden,\s+md|lara\s+m\s+lange|a\s+ferrier\s+sesquicentenary|katrin\s+andreasson:|michael\s+t\s+heneka:|ancient\s+brains\s+in\s+a\s+modern\s+world|learn\s+from\s+us:|icarus\s+in\s+the\s+icu)/i;

const SUBSPECIALTY_RULES: [string, RegExp][] = [
  [
    "Stroke",
    /\b(stroke|ischemic|infarction|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral hemorrhage|subarachnoid hemorrhage|intracranial bleeding|intracranial hemorrhage|aneurysm|carotid|endovascular|neurovascular|cerebral ischemia|small vessel disease|cerebral amyloid angiopathy|cavernous malformation|arteriovenous malformation|venous sinus thrombosis)\b/i,
  ],
  [
    "Neurocritical Care",
    /\b(neurocritical|intensive care|critical care|status epilepticus|intracranial pressure|cerebral edema|coma|unresponsive wakefulness|minimally conscious|brain death|targeted temperature|post-cardiac arrest|mechanical ventilation|extubation|neuro-icu|delirium|traumatic brain injury|tbi|concussion|head injury|head trauma)\b/i,
  ],
  [
    "Epilepsy",
    /\b(epilep\w*|seizure\w*|antiseizure|ictal|interictal|dravet|lennox-gastaut|focal cortical dysplasia|sudep)\b/i,
  ],
  [
    "Dementia",
    /\b(alzheimer\w*|dementia|amyloid|tau|p-tau\w*|lecanemab|donanemab|cognitive decline|cognitive impairment|frontotemporal|lewy body|apoe|memory clinic|normal pressure hydrocephalus)\b/i,
  ],
  [
    "Neuroimmunology",
    /\b(multiple sclerosis|demyelinating|neuromyelitis|nmosd|mogad|mog antibody|autoimmune encephalitis|myelitis|transverse myelitis|optic neuritis|neurosarcoidosis|cns vasculitis|natalizumab|ocrelizumab|ofatumumab|remibrutinib)\b/i,
  ],
  [
    "Neuromuscular",
    /\b(myasthenia|neuropath\w*|polyneuropathy|guillain-barr\w*|cidp|als|amyotrophic lateral sclerosis|motor neuron|myopath\w*|muscular dystrophy|spinal muscular atrophy|charcot-marie-tooth|radiculopathy|plexopathy|foot drop|efgartigimod|tofersen|nusinersen)\b/i,
  ],
  [
    "Movement Disorders",
    /\b(parkinson\w*|tremor|ataxia|dystonia|chorea|huntington\w*|dyskinesia|synuclein|alpha-synuclein|levodopa|deep brain stimulation|progressive supranuclear palsy|multiple system atrophy|tourette)\b/i,
  ],
  [
    "Headache & Pain",
    /\b(migraine|headache|cluster headache|trigeminal neuralgia|cgrp|ubrogepant|atogepant|rimegepant|erenumab|fremanezumab|galcanezumab|neuropathic pain|chronic pain|idiopathic intracranial hypertension)\b/i,
  ],
  [
    "CNS Infections",
    /\b(meningit\w*|meningoencephalit\w*|brain abscess|epidural abscess|subdural empyema|tuberculous meningitis|cns tuberculosis|neurosyphilis|herpes simplex virus encephalitis|hsv encephalitis|cryptococc\w*|cerebral toxoplasmosis|varicella zoster\w*|vzv encephalitis|neurocysticercosis|arbovirus|japanese encephalitis|lyme neuroborreliosis|neuroborreliosis|progressive multifocal leukoencephalopathy|pml|cerebral malaria|rabies|ventriculit\w*|cns viral infection|cns bacterial infection|cns fungal infection|cns parasitic infection|cns infection|infectious encephalitis)\b/i,
  ],
  [
    "Neuro-Oncology",
    /\b(glioblastoma|glioma|meningioma|astrocytoma|oligodendroglioma|medulloblastoma|brain tumor|brain metastasis|brain metastases|cns lymphoma|primary central nervous system lymphoma|neuro-oncology|schwannoma|ependymoma|spinal mass)\b/i,
  ],
];

function detectStudyTypesClient(
  title: string,
  abstract: string,
  doi: string,
  authorCount = 1
): [string, string[]] {
  const titleL = title.toLowerCase();
  const absL = (abstract || "").toLowerCase();
  const doiL = (doi || "").toLowerCase();
  const combined = `${titleL} ${absL}`;
  const hasRealAbs =
    Boolean(absL) &&
    !absL.startsWith("original abstract") &&
    !absL.startsWith("nothing to report") &&
    !absL.startsWith("the authors declare") &&
    absL.length >= 80;

  if (
    doiL.includes("/nejme") ||
    doiL.includes("/nejmp") ||
    doiL.includes("/nejmc") ||
    /^(editorial|comment|commentary|perspective|viewpoint|journal club|neurology journal club|author.?s?\s+reply|reply to|in\s+reply|letter)/i.test(
      titleL
    ) ||
    /\b(editorial|invited commentary|authors' reply|clinical trial of the year|are we there yet)\b/i.test(
      titleL
    ) ||
    (titleL.startsWith("expanding the evidence") && !absL.includes("methods"))
  ) {
    return ["Editorial / Perspective", ["Editorial / Perspective"]];
  }

  if (
    doiL.includes("/nejmicm") ||
    doiL.includes("/nejmcp") ||
    /\b(case\s+\d+-\d+|case report|case series|clinical reasoning|teaching neuroimage\w*|teaching video\w*|mystery case|image of|clinicopathological|pearls\s*&\s*oy-sters|child neurology:|tornado-like enhancement|fusiform enlargement|fibroblast imaging|quadrilateral syndrome|hyperdense anterior cerebral artery sign)\b/i.test(
      titleL
    )
  ) {
    return ["Case Report", ["Case Report"]];
  }

  // Guideline chỉ tính khi nằm trên Tiêu đề
  if (
    /\b(guideline|guidelines|consensus|scientific statement|practice advisory|practice parameter|position statement|recommendations from)\b/i.test(
      titleL
    )
  ) {
    return ["Guideline", ["Guideline", "Review"]];
  }

  if (
    /\b(meta-analysis|systematic review|network meta-analysis|pooled analysis|ipd analysis)\b/i.test(titleL) ||
    (absL.includes("systematic review") && absL.includes("meta-analysis")) ||
    absL.includes("pooled individual participant data")
  ) {
    return ["Meta-Analysis", ["Meta-Analysis", "Review", "Original Article"]];
  }

  const isSecondaryOrTrial =
    /\b(randomized|randomised|clinical trial|phase [123]|cohort|case-control)\b/i.test(titleL);
  if (
    !isSecondaryOrTrial &&
    (/\b(review|seminar|state of the art|contemporary issues|primer)\b/i.test(titleL) ||
      (hasRealAbs &&
        !absL.includes("methods") &&
        !absL.includes("results") &&
        /\b(overview|we review|this review|narrative review|recent advances)\b/i.test(absL)))
  ) {
    return ["Review", ["Review"]];
  }

  // Nếu bài không có Abstract thực sự (chỉ 1–7 tác giả viết bình luận/quan điểm ngắn trên Lancet Neurol, JAMA Neurol, Neurology...)
  if (!hasRealAbs && authorCount <= 7 && !isSecondaryOrTrial) {
    return ["Editorial / Perspective", ["Editorial / Perspective"]];
  }

  const isObservationalCohort =
    /\b(nationwide cohort|retrospective cohort|prospective cohort|population-based cohort|nested case-control|observational study|observational analysis|administrative claims|mendelian randomization|cross-sectional)\b/i.test(
      combined
    ) && !/\b(randomized|randomised|phase [123])\b/i.test(titleL);

  const isPosthocOrNonRct =
    /\b(post hoc|post-hoc|secondary analysis|subanalysis|subgroup analysis|prespecified analysis|exploratory analysis|open-label extension|long-term extension|phase 1\b|phase i\b|phase 1b|single-arm|nonrandomized|non-randomized|protocol for|study protocol)\b/i.test(
      combined
    );

  // Loại bỏ cụm từ "warrant confirmation in randomized controlled trials" ở cuối bài khỏi tín hiệu RCT
  const cleanedForRctCheck = combined.replace(
    /\b(warrant\w*|need\w*|require\w*|confirm\w*|future|further)\s+(confirmation\s+in\s+|validation\s+in\s+)?(randomized|randomised)\s+(controlled\s+)?trials?\b/gi,
    ""
  );

  const hasRctSignals =
    !isObservationalCohort &&
    /\b(randomized|randomised|double-blind|placebo-controlled|phase 3|phase 2|phase iii|phase ii|randomly assigned|assigned in a \d+:\d+)\b/i.test(
      cleanedForRctCheck
    );
  const hasTrialSignals =
    hasRctSignals ||
    /\b(clinical trial|trial|phase 1|phase i|open-label|intervention)\b/i.test(titleL);

  if (hasRctSignals && !isPosthocOrNonRct) {
    return ["RCT", ["RCT", "Clinical Trial", "Original Article"]];
  }

  if (hasTrialSignals || (hasRctSignals && isPosthocOrNonRct)) {
    return ["Clinical Trial", ["Clinical Trial", "Original Article"]];
  }

  return ["Original Article", ["Original Article"]];
}

function normalizeAndCleanArticles(rawList: Article[]): Article[] {
  const result: Article[] = [];

  for (const raw of rawList) {
    const title = cleanMedicalText(raw.title);
    if (!title || NON_ARTICLE_PATTERNS.test(title)) continue;

    // Loại bỏ các mục thông báo số báo / đính chính không có tác giả và không có abstract
    const authorCount = raw.authors?.length || 0;
    const rawAbsCheck = (raw.abstract || "").toLowerCase();
    if (
      authorCount === 0 &&
      (!rawAbsCheck || rawAbsCheck.startsWith("original abstract"))
    ) {
      continue;
    }

    const jShort = raw.journal?.short_name || "";
    const isSpecialty = !["NEJM", "The Lancet", "JAMA"].includes(jShort);
    if (!isSpecialty && !STRICT_TITLE_NEURO_REGEX.test(title)) {
      continue;
    }

    const enriched = ENRICHED_MISSING_ABSTRACTS[raw.id.toLowerCase()];
    const rawAbs = enriched ? enriched.abstract : raw.abstract;
    const abstract = cleanMedicalText(rawAbs);
    const matchedSubs: string[] = [];

    for (const [subName, regex] of SUBSPECIALTY_RULES) {
      if (regex.test(title)) matchedSubs.push(subName);
    }
    const corpus = `${title} ${abstract}`;
    for (const [subName, regex] of SUBSPECIALTY_RULES) {
      if (!matchedSubs.includes(subName) && regex.test(corpus)) {
        matchedSubs.push(subName);
      }
    }
    if (matchedSubs.length === 0) matchedSubs.push("Other");

    const [primaryType, allTypes] = detectStudyTypesClient(
      title,
      abstract,
      raw.id,
      authorCount
    );

    const rawTakeaway = enriched
      ? enriched.takeaway
      : raw.ai_takeaways?.conclusion_vi || "";
    const cleanTakeaway = rawTakeaway ? cleanMedicalText(rawTakeaway) : "";

    result.push({
      ...raw,
      title,
      abstract,
      article_type: primaryType,
      article_types: allTypes,
      neurology_classification: {
        ...raw.neurology_classification,
        subspecialty: matchedSubs[0],
        subspecialties: matchedSubs.slice(0, 3),
      },
      ai_takeaways:
        raw.ai_takeaways || enriched
          ? {
              clinical_significance:
                raw.ai_takeaways?.clinical_significance ||
                `Clinical significance for ${matchedSubs[0]} practice.`,
              ai_verified: enriched ? true : raw.ai_takeaways?.ai_verified,
              conclusion_vi: cleanTakeaway,
            }
          : undefined,
    });
  }

  return result;
}

interface JournalGroup {
  shortName: string;
  fullName: string;
  articles: Article[];
}

interface DateGroup {
  dateKey: string;
  formattedDate: string;
  relativeLabel: string;
  totalArticles: number;
  journalGroups: JournalGroup[];
}

function getDateKey(isoDate?: string): string {
  if (!isoDate) return "Unknown Date";
  return isoDate.slice(0, 10);
}

function formatDateHeading(dateKey: string): { formattedDate: string; relativeLabel: string } {
  if (dateKey === "Unknown Date") {
    return { formattedDate: "Unknown Publication Date", relativeLabel: "" };
  }
  const [y, m, d] = dateKey.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((todayUtc - dateObj.getTime()) / (1000 * 60 * 60 * 24));

  let relativeLabel = "";
  if (diffDays <= 0) relativeLabel = "Latest / Today";
  else if (diffDays === 1) relativeLabel = "Yesterday";
  else if (diffDays <= 7) relativeLabel = `${diffDays} days ago`;
  else if (diffDays <= 30) relativeLabel = `${Math.floor(diffDays / 7)} weeks ago`;

  return { formattedDate, relativeLabel };
}

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedArticlesMap, setSavedArticlesMap] = useState<Record<string, Article>>({});
  const [clinicalNotes, setClinicalNotes] = useState<Record<string, string>>({});
  const [selectedSub, setSelectedSub] = useState<string>("All");
  const [selectedJournal, setSelectedJournal] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [showBriefing, setShowBriefing] = useState<boolean>(true);
  const [briefingCopied, setBriefingCopied] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [visibleCount, setVisibleCount] = useState<number>(35);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState<boolean>(true);

  useEffect(() => {
    const savedIds = localStorage.getItem("neuro_bookmarks");
    if (savedIds) {
      try {
        setBookmarks(JSON.parse(savedIds));
      } catch (e) {
        console.error(e);
      }
    }

    const savedObjs = localStorage.getItem("neuro_saved_articles_v2");
    if (savedObjs) {
      try {
        setSavedArticlesMap(JSON.parse(savedObjs));
      } catch (e) {
        console.error(e);
      }
    }

    const savedNotes = localStorage.getItem("neuro_clinical_notes");
    if (savedNotes) {
      try {
        setClinicalNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error(e);
      }
    }

    const savedDark = localStorage.getItem("neuro_dark_mode");
    if (savedDark === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const savedCompact = localStorage.getItem("neuro_compact_mode");
    if (savedCompact === "true") setCompactMode(true);

    const handleScroll = () => {
      const shouldShow = window.scrollY > 450;
      setShowScrollTop((prev) => (prev !== shouldShow ? shouldShow : prev));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    fetch("/data/articles.json")
      .then((res) => {
        const lastMod = res.headers.get("last-modified");
        if (lastMod) {
          setLastUpdated(
            new Date(lastMod).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          );
        } else {
          setLastUpdated(
            new Date().toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          );
        }
        return res.json();
      })
      .then((data: Article[]) => {
        setArticles(normalizeAndCleanArticles(data));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading articles:", err);
        setLoading(false);
      });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("neuro_dark_mode", String(next));
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const toggleCompactMode = () => {
    setCompactMode((prev) => {
      const next = !prev;
      localStorage.setItem("neuro_compact_mode", String(next));
      return next;
    });
  };

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const isRemoving = prev.includes(id);
      const next = isRemoving ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("neuro_bookmarks", JSON.stringify(next));

      setSavedArticlesMap((prevMap) => {
        const nextMap = { ...prevMap };
        if (isRemoving) {
          delete nextMap[id];
        } else {
          const found = articles.find((a) => a.id === id);
          if (found) {
            nextMap[id] = found;
          }
        }
        localStorage.setItem("neuro_saved_articles_v2", JSON.stringify(nextMap));
        return nextMap;
      });

      return next;
    });
  };

  const saveClinicalNote = (id: string, note: string) => {
    setClinicalNotes((prev) => {
      const next = { ...prev };
      if (note.trim()) {
        next[id] = note.trim();
      } else {
        delete next[id];
      }
      localStorage.setItem("neuro_clinical_notes", JSON.stringify(next));
      return next;
    });
  };

  const availableJournals = ["All", ...JOURNAL_ORDER];

  const journalCounts = useMemo(() => {
    const counts: Record<string, number> = { All: articles.length };
    for (const j of JOURNAL_ORDER) counts[j] = 0;
    for (const a of articles) {
      const sn = a.journal.short_name;
      counts[sn] = (counts[sn] || 0) + 1;
    }
    return counts;
  }, [articles]);

  // Dynamic Clinical Radar: Tự động chấm điểm "Độ nóng" (Trending Score) từ dữ liệu bài báo thực tế và lấy Top 5 chủ đề nóng nhất
  const dynamicClinicalRadar = useMemo(() => {
    const now = Date.now();
    const scored = CLINICAL_RADAR_BANK.map((item) => {
      const terms = item.query
        .toLowerCase()
        .split("|")
        .map((t) => t.trim())
        .filter(Boolean);

      let count = 0;
      let hotScore = 0;

      for (const a of articles) {
        const titleL = a.title.toLowerCase();
        const corpus = `${a.title} ${a.abstract} ${a.ai_takeaways?.conclusion_vi || ""}`.toLowerCase();
        if (terms.some((t) => matchTermWithBoundary(corpus, t))) {
          count += 1;
          const daysOld = a.pub_date
            ? Math.max(0, (now - new Date(a.pub_date).getTime()) / (1000 * 60 * 60 * 24))
            : 30;
          const recencyMult = daysOld <= 14 ? 2.5 : daysOld <= 30 ? 1.8 : 1.0;
          const typeWeight =
            a.article_type === "RCT"
              ? 4.0
              : a.article_type === "Meta-Analysis" || a.article_type === "Guideline"
              ? 3.5
              : a.article_type === "Clinical Trial"
              ? 2.5
              : a.article_type === "Original Article"
              ? 1.5
              : 0.5;
          const titleBonus = terms.some((t) => matchTermWithBoundary(titleL, t)) ? 3.0 : 0;
          hotScore += (typeWeight + titleBonus) * recencyMult;
        }
      }

      return { ...item, count, hotScore };
    });

    return scored
      .filter((item) => item.count > 0)
      .sort((a, b) => b.hotScore - a.hotScore || b.count - a.count)
      .slice(0, 5);
  }, [articles]);

  // Chọn ra Top 4 nghiên cứu tiêu điểm cho "Morning Clinical Briefing"
  // Tính điểm dựa trên: Study Type chuẩn (RCT / Guideline / Meta-Analysis) + Điểm của Tag Phân khoa CAO NHẤT + Tạp chí + Độ mới
  const briefingHighlights = useMemo(() => {
    const candidates = articles.filter(
      (a) =>
        a.article_type !== "Editorial / Perspective" &&
        a.article_type !== "Case Report" &&
        a.ai_takeaways?.conclusion_vi &&
        !a.ai_takeaways.conclusion_vi.startsWith("Published clinical evidence in") &&
        !a.abstract.startsWith("Original abstract")
    );

    const scored = candidates.map((a) => {
      let score = 0;

      // 1. Điểm theo Study Type (RCT > Guideline > Meta-Analysis > Clinical Trial > Original Article)
      score += STUDY_TYPE_WEIGHTS[a.article_type] ?? 10;

      // 2. Điểm theo Tag Phân khoa cao nhất (nếu bài có nhiều tag phân khoa)
      const subs =
        a.neurology_classification.subspecialties &&
        a.neurology_classification.subspecialties.length > 0
          ? a.neurology_classification.subspecialties
          : [a.neurology_classification.subspecialty || "Other"];
      const maxSubWeight = Math.max(...subs.map((s) => SUBSPECIALTY_WEIGHTS[s] ?? 6));
      score += maxSubWeight;

      // 3. Điểm theo thứ hạng Tạp chí
      const jIdx = JOURNAL_ORDER.indexOf(a.journal.short_name);
      if (jIdx !== -1) score += (8 - jIdx) * 4;

      // 4. Điểm theo độ mới xuất bản
      if (a.pub_date) {
        const daysOld = (Date.now() - new Date(a.pub_date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld <= 7) score += 25;
        else if (daysOld <= 14) score += 15;
      }

      return { article: a, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.article);
  }, [articles]);

  const handleCopyFullBriefing = () => {
    if (briefingHighlights.length === 0) return;
    const header = `🌅 MORNING NEUROLOGY & STROKE BRIEFING (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})\n`;
    const body = briefingHighlights
      .map((a, idx) => {
        const takeaway = cleanMedicalText(a.ai_takeaways?.conclusion_vi || "").replace(
          /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
          ""
        );
        return `${idx + 1}. [${a.journal.short_name} | ${a.article_type}] ${a.title}\n   💡 ${takeaway}\n   🔗 ${a.doi_url}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(`${header}\n${body}`).then(() => {
      setBriefingCopied(true);
      setTimeout(() => setBriefingCopied(false), 2200);
    });
  };

  const filteredArticles = useMemo(() => {
    const rawQ = deferredSearchQuery.trim().toLowerCase();
    const queryTerms = rawQ
      ? rawQ
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const sourceList: Article[] = showSavedOnly
      ? bookmarks
          .map((id) => articles.find((a) => a.id === id) || savedArticlesMap[id])
          .filter((a): a is Article => Boolean(a))
      : articles;

    const filtered = sourceList.filter((article) => {
      if (showSavedOnly && !bookmarks.includes(article.id)) return false;

      const subs =
        article.neurology_classification.subspecialties &&
        article.neurology_classification.subspecialties.length > 0
          ? article.neurology_classification.subspecialties
          : [article.neurology_classification.subspecialty || "Other"];

      const matchCategory =
        selectedSub === "All" ||
        subs.some((s) => s.toLowerCase() === selectedSub.toLowerCase());

      const matchJournal =
        selectedJournal === "All" ||
        article.journal.short_name.toLowerCase() === selectedJournal.toLowerCase();

      const types =
        article.article_types && article.article_types.length > 0
          ? article.article_types
          : [article.article_type];

      const matchType =
        selectedType === "All" ||
        types.some((t) => t.toLowerCase() === selectedType.toLowerCase());

      const noteText = (clinicalNotes[article.id] || "").toLowerCase();
      const searchableCorpus = `${article.title} ${article.abstract} ${article.ai_takeaways?.conclusion_vi || ""} ${subs.join(" ")} ${article.neurology_classification.topics.join(" ")} ${article.authors.join(" ")} ${noteText}`.toLowerCase();

      const matchQuery =
        queryTerms.length === 0 ||
        queryTerms.some((term) => matchTermWithBoundary(searchableCorpus, term));

      return matchCategory && matchJournal && matchType && matchQuery;
    });

    // Sắp xếp theo Ngày (mới nhất trước), trong từng ngày sắp xếp theo thứ tự Tạp chí
    return filtered.sort((a, b) => {
      const da = getDateKey(a.pub_date);
      const db = getDateKey(b.pub_date);
      if (da !== db) return db.localeCompare(da);

      const ja = JOURNAL_ORDER.indexOf(a.journal.short_name);
      const jb = JOURNAL_ORDER.indexOf(b.journal.short_name);
      const orderA = ja === -1 ? 99 : ja;
      const orderB = jb === -1 ? 99 : jb;
      if (orderA !== orderB) return orderA - orderB;

      return a.title.localeCompare(b.title);
    });
  }, [
    articles,
    savedArticlesMap,
    clinicalNotes,
    selectedSub,
    selectedJournal,
    selectedType,
    showSavedOnly,
    bookmarks,
    deferredSearchQuery,
  ]);

  const displayedArticles = useMemo(
    () => filteredArticles.slice(0, visibleCount),
    [filteredArticles, visibleCount]
  );

  // Gom nhóm theo Ngày -> trong từng Ngày gom nhóm theo Tạp chí
  const groupedByDate: DateGroup[] = useMemo(() => {
    const dateMap = new Map<string, Map<string, JournalGroup>>();

    for (const article of displayedArticles) {
      const dateKey = getDateKey(article.pub_date);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map<string, JournalGroup>());
      }
      const journalMap = dateMap.get(dateKey)!;
      const shortName = article.journal.short_name || article.journal.name;
      if (!journalMap.has(shortName)) {
        journalMap.set(shortName, {
          shortName,
          fullName: article.journal.name || shortName,
          articles: [],
        });
      }
      journalMap.get(shortName)!.articles.push(article);
    }

    const result: DateGroup[] = [];
    for (const [dateKey, journalMap] of dateMap.entries()) {
      const journalGroups = Array.from(journalMap.values()).sort((a, b) => {
        const ia = JOURNAL_ORDER.indexOf(a.shortName);
        const ib = JOURNAL_ORDER.indexOf(b.shortName);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      const totalArticles = journalGroups.reduce((acc, g) => acc + g.articles.length, 0);
      const { formattedDate, relativeLabel } = formatDateHeading(dateKey);

      result.push({
        dateKey,
        formattedDate,
        relativeLabel,
        totalArticles,
        journalGroups,
      });
    }

    return result;
  }, [displayedArticles]);

  const hasActiveFilters =
    selectedSub !== "All" ||
    selectedJournal !== "All" ||
    selectedType !== "All" ||
    showSavedOnly ||
    searchQuery.trim() !== "";

  const resetAllFilters = () => {
    setSelectedSub("All");
    setSelectedJournal("All");
    setSelectedType("All");
    setShowSavedOnly(false);
    setSearchQuery("");
    setVisibleCount(35);
  };

  return (
    <main
      className={`min-h-screen py-8 px-4 sm:px-8 transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 pt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-sm shadow-red-500/50"></span>
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                MULTI-JOURNAL LIVE MONITOR
              </span>
            </div>
            <h1
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              NEUROLOGY &amp; STROKE JOURNAL MONITOR
            </h1>
          </div>

          {/* Thanh công cụ Giao diện & Lưu bài */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleCompactMode}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                compactMode
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : darkMode
                  ? "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              title="Switch between Compact scanning view and Detailed card view"
            >
              <span>{compactMode ? "📑 Compact" : "📄 Detailed"}</span>
            </button>

            <button
              onClick={toggleDarkMode}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-indigo-950 text-amber-300 border-indigo-800 hover:bg-indigo-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              title="Toggle Night-Shift / Dark Mode"
            >
              <span>{darkMode ? "☀️ Light" : "🌙 Night Shift"}</span>
            </button>

            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                showSavedOnly
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : darkMode
                  ? "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{showSavedOnly ? "★" : "☆"}</span>
              <span>Saved ({bookmarks.length})</span>
            </button>

            <AppSwitcher currentApp="neuropulse" darkMode={darkMode} />
          </div>
        </header>

        {/* KHỐI ĐIỂM BÁO GIAO BAN BUỔI SÁNG (MORNING CLINICAL BRIEFING — HIỂN THỊ ĐẦY ĐỦ 100% NỘI DUNG) */}
        {!loading && briefingHighlights.length > 0 && (
          <div
            className={`mb-6 rounded-xl border shadow-sm overflow-hidden ${
              darkMode
                ? "border-amber-700/60 bg-slate-900"
                : "border-amber-300/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60"
            }`}
          >
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🌅</span>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 block sm:inline sm:mr-2">
                    MORNING CLINICAL BRIEFING
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Top {briefingHighlights.length} High-Yield RCTs, Guidelines &amp; Studies for Handover
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFullBriefing}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    briefingCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-white/15 hover:bg-white/25 text-white"
                  }`}
                  title="Copy all 4 morning highlights for Zalo / Telegram handover"
                >
                  {briefingCopied ? "✓ Briefing Copied!" : "📋 Copy Briefing"}
                </button>
                <button
                  onClick={() => setShowBriefing(!showBriefing)}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200"
                >
                  {showBriefing ? "Hide ▲" : "Show ▼"}
                </button>
              </div>
            </div>

            {showBriefing && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {briefingHighlights.map((item) => {
                  const cleanTakeaway = cleanMedicalText(
                    item.ai_takeaways?.conclusion_vi || ""
                  ).replace(
                    /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
                    ""
                  );
                  const subs =
                    item.neurology_classification.subspecialties &&
                    item.neurology_classification.subspecialties.length > 0
                      ? item.neurology_classification.subspecialties
                      : [item.neurology_classification.subspecialty || "Other"];

                  return (
                    <div
                      key={`brief-${item.id}`}
                      className={`p-4 rounded-lg border shadow-xs flex flex-col justify-between transition-colors ${
                        darkMode
                          ? "bg-slate-800/80 border-slate-700 hover:border-amber-500/70"
                          : "bg-white/95 border-slate-200/90 hover:border-amber-400"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black uppercase"
                              style={{
                                backgroundColor: item.journal.badge_bg,
                                color: item.journal.badge_text,
                              }}
                            >
                              {item.journal.short_name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                darkMode
                                  ? "bg-slate-700 text-amber-300"
                                  : "bg-slate-800 text-white"
                              }`}
                            >
                              {item.article_type}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {subs.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/70 text-slate-500 dark:text-slate-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <a
                          href={item.doi_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs sm:text-sm font-bold mb-2 block leading-snug ${
                            darkMode
                              ? "text-slate-100 hover:text-blue-400"
                              : "text-slate-900 hover:text-blue-600"
                          }`}
                        >
                          {item.title}
                        </a>

                        <div
                          className={`text-xs leading-relaxed p-2.5 rounded border-l-3 border-amber-500 ${
                            darkMode
                              ? "bg-slate-900/90 text-slate-200"
                              : "bg-amber-50/70 text-slate-800"
                          }`}
                        >
                          {highlightClinicalStats(cleanTakeaway, darkMode)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BỐ CỤC 2 CỘT TRÊN MÁY TÍNH (LEFT SIDEBAR CHO RADAR & FILTER + RIGHT FEED) & TOGGLE TRÊN ĐIỆN THOẠI */}
        <div className="lg:flex lg:items-start lg:gap-6">
          {/* Thanh tìm kiếm + Nút Toggle Filter trên Điện thoại (Mobile Top Bar) */}
          <div className="lg:hidden mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search articles, drugs, trials, notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(35);
                  }}
                  className={`w-full px-3.5 py-2.5 pr-9 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`px-3.5 py-2.5 rounded-lg text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 shadow-xs ${
                  showMobileFilters || hasActiveFilters
                    ? "bg-blue-600 text-white border-blue-500"
                    : darkMode
                    ? "bg-slate-900 text-slate-200 border-slate-700"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                <span>⚡ Filters &amp; Radar</span>
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/25 text-white">
                    •
                  </span>
                )}
                <span>{showMobileFilters ? "▲" : "▼"}</span>
              </button>
            </div>
          </div>

          {/* CỘT TRÁI (LEFT SIDEBAR): DYNAMIC CLINICAL RADAR & FILTER CONTROLS */}
          <aside
            className={`${
              showMobileFilters ? "block mb-5" : "hidden"
            } ${
              showDesktopSidebar
                ? "lg:block lg:w-80 xl:w-84 lg:shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
                : "lg:hidden"
            } space-y-4`}
          >
            {/* Khối 1: DYNAMIC CLINICAL RADAR (TOP 5) */}
            <div
              className={`p-4 rounded-xl border shadow-sm ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div
                className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between"
                title="Top 5 hottest clinical interventions & biomarker themes automatically ranked by recent RCTs, Meta-Analyses & study volume"
              >
                <span>🔥 Dynamic Clinical Radar (Top 5)</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {dynamicClinicalRadar.map((item) => {
                  const isActive = searchQuery.toLowerCase() === item.query.toLowerCase();
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (isActive) {
                          setSearchQuery("");
                        } else {
                          setSearchQuery(item.query);
                          setSelectedSub("All");
                          setSelectedJournal("All");
                          setSelectedType("All");
                          setShowSavedOnly(false);
                        }
                        setVisibleCount(35);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center justify-between text-left ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : darkMode
                          ? "bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-600"
                          : "bg-slate-50/80 text-slate-700 border-slate-200/90 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate pr-2">{item.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0 ${
                          isActive
                            ? "bg-white/25 text-white"
                            : darkMode
                            ? "bg-slate-800 text-amber-300"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khối 2: FILTER CONTROLS (JOURNAL, SUBSPECIALTY, STUDY TYPE) */}
            <div
              className={`space-y-4 p-4 rounded-xl border shadow-sm ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              {hasActiveFilters && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-blue-500 uppercase">
                    Active Filters Applied
                  </span>
                  <button
                    onClick={resetAllFilters}
                    className="text-xs font-bold text-red-500 hover:text-red-400 underline"
                  >
                    Reset All
                  </button>
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  FILTER BY JOURNAL:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableJournals.map((j) => {
                    const style = JOURNAL_PILL_STYLES[j] || JOURNAL_PILL_STYLES["All"];
                    const isSelected = selectedJournal.toLowerCase() === j.toLowerCase();
                    const count = journalCounts[j] ?? 0;
                    return (
                      <button
                        key={j}
                        onClick={() => {
                          setSelectedJournal(j);
                          setVisibleCount(35);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? style.active
                            : darkMode
                            ? style.darkInactive
                            : style.inactive
                        }`}
                      >
                        <span>{j === "All" ? "All Journals" : j}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? "bg-black/20 text-white"
                              : darkMode
                              ? "bg-black/30 text-slate-300"
                              : "bg-slate-200/70 text-slate-600"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`pt-3 border-t ${
                  darkMode ? "border-slate-800" : "border-slate-100"
                }`}
              >
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  NEUROLOGY SUBSPECIALTIES:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setSelectedSub(tab.value);
                        setVisibleCount(35);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors text-left ${
                        selectedSub === tab.value
                          ? "bg-blue-600 text-white"
                          : darkMode
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`pt-3 border-t ${
                  darkMode ? "border-slate-800" : "border-slate-100"
                }`}
              >
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  STUDY TYPE:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STUDY_TYPE_TABS.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setVisibleCount(35);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        selectedType === type
                          ? "bg-blue-600 text-white"
                          : darkMode
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* CỘT PHẢI (MAIN CONTENT COLUMN): SEARCH + STATUS BAR + ARTICLES FEED */}
          <div className="flex-1 min-w-0">
            {/* Desktop Search Input + Sidebar Collapse Toggle */}
            <div className="hidden lg:flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setShowDesktopSidebar((prev) => !prev)}
                className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
                title="Show or hide the left Radar & Filter sidebar"
              >
                <span>{showDesktopSidebar ? "◧ Hide Filters" : "◧ Show Filters"}</span>
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by article title, abstract, author, drug, intervention, or your personal clinical notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(35);
                  }}
                  className={`w-full px-4 py-2.5 pr-10 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Chips Bar (hiển thị nhanh bộ lọc đang bật) */}
            {hasActiveFilters && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Active:</span>
                {selectedJournal !== "All" && (
                  <button
                    onClick={() => setSelectedJournal("All")}
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white flex items-center gap-1"
                  >
                    <span>Journal: {selectedJournal}</span>
                    <span>✕</span>
                  </button>
                )}
                {selectedSub !== "All" && (
                  <button
                    onClick={() => setSelectedSub("All")}
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white flex items-center gap-1"
                  >
                    <span>Subspecialty: {selectedSub}</span>
                    <span>✕</span>
                  </button>
                )}
                {selectedType !== "All" && (
                  <button
                    onClick={() => setSelectedType("All")}
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-600 text-white flex items-center gap-1"
                  >
                    <span>Type: {selectedType}</span>
                    <span>✕</span>
                  </button>
                )}
                {showSavedOnly && (
                  <button
                    onClick={() => setShowSavedOnly(false)}
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1"
                  >
                    <span>Saved Only</span>
                    <span>✕</span>
                  </button>
                )}
                {searchQuery.trim() !== "" && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-white flex items-center gap-1"
                  >
                    <span>Query: &ldquo;{searchQuery}&rdquo;</span>
                    <span>✕</span>
                  </button>
                )}
                <button
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-red-500 hover:underline ml-1"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Metadata & Status Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mb-4 px-1 font-medium gap-2">
              <span>
                Showing <strong>{displayedArticles.length}</strong> of{" "}
                <strong>{filteredArticles.length}</strong> articles across{" "}
                <strong>{groupedByDate.length}</strong> publication dates
                {selectedJournal !== "All" && ` from ${selectedJournal}`}
              </span>
              {lastUpdated && (
                <span className="font-mono text-[11px]">
                  Last updated: {lastUpdated}
                </span>
              )}
            </div>

        {/* Articles Grouped by Date -> Grouped by Journal */}
        {loading ? (
          <div
            className={`p-12 text-center rounded-xl border text-sm ${
              darkMode
                ? "bg-slate-900 border-slate-800 text-slate-400"
                : "bg-white border-slate-200 text-slate-400"
            }`}
          >
            Loading articles...
          </div>
        ) : groupedByDate.length > 0 ? (
          <div className="space-y-8">
            {groupedByDate.map((dateGroup) => (
              <section key={dateGroup.dateKey} className="space-y-4">
                {/* KHỐI HEADER NGÀY XUẤT BẢN (DATE HEADER) */}
                <div className="sticky top-2 z-20 bg-slate-900/95 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-2 border border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-wide">
                      {dateGroup.formattedDate}
                    </h2>
                    {dateGroup.relativeLabel && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-slate-200">
                        {dateGroup.relativeLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {dateGroup.totalArticles}{" "}
                    {dateGroup.totalArticles === 1 ? "article" : "articles"} •{" "}
                    {dateGroup.journalGroups.length}{" "}
                    {dateGroup.journalGroups.length === 1 ? "journal" : "journals"}
                  </div>
                </div>

                {/* CÁC NHÓM TẠP CHÍ TRONG NGÀY (JOURNAL GROUPS WITHIN DATE) */}
                <div
                  className={`space-y-6 pl-1 sm:pl-3 border-l-2 ${
                    darkMode ? "border-slate-800" : "border-slate-300/80"
                  }`}
                >
                  {dateGroup.journalGroups.map((jGroup) => {
                    const jTheme = getJournalTheme(jGroup.shortName);
                    return (
                      <div key={`${dateGroup.dateKey}-${jGroup.shortName}`} className="space-y-3">
                        {/* Tiêu đề nhóm Tạp chí */}
                        <div
                          className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-lg border shadow-xs ${
                            darkMode
                              ? jTheme.darkGroupBg
                              : `${jTheme.groupBorder} ${jTheme.groupBg}`
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${jTheme.groupDot}`}></span>
                          <span className="text-xs font-black uppercase tracking-wider">
                            {jGroup.shortName}
                          </span>
                          {jGroup.fullName && jGroup.fullName !== jGroup.shortName && (
                            <span className="text-xs opacity-80 hidden sm:inline">
                              — {jGroup.fullName}
                            </span>
                          )}
                          <span
                            className={`ml-1 px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                              darkMode
                                ? "bg-slate-900/90 text-slate-200 border-slate-700"
                                : "bg-white/80 text-slate-800 border-black/5"
                            }`}
                          >
                            {jGroup.articles.length}{" "}
                            {jGroup.articles.length === 1 ? "study" : "studies"}
                          </span>
                        </div>

                        {/* Danh sách bài báo của tạp chí trong ngày đó */}
                        <div className={compactMode ? "space-y-2" : "space-y-3.5"}>
                          {jGroup.articles.map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              onTagClick={(tag) => setSearchQuery(tag)}
                              onSubspecialtyClick={(sub) => {
                                const found = TOPIC_TABS.find(
                                  (t) =>
                                    t.value !== "All" &&
                                    t.value.toLowerCase() === sub.toLowerCase()
                                );
                                setSelectedSub(found ? found.value : "All");
                              }}
                              onStudyTypeClick={(st) => {
                                if (STUDY_TYPE_TABS.includes(st)) {
                                  setSelectedType(st);
                                }
                              }}
                              isBookmarked={bookmarks.includes(article.id)}
                              onToggleBookmark={toggleBookmark}
                              clinicalNote={clinicalNotes[article.id] || ""}
                              onSaveNote={saveClinicalNote}
                              darkMode={darkMode}
                              compactMode={compactMode}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {visibleCount < filteredArticles.length && (
              <div className="pt-4 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold border shadow-sm transition-all ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Load More Articles ({filteredArticles.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`p-12 text-center rounded-xl border text-sm ${
              darkMode
                ? "bg-slate-900 border-slate-800 text-slate-400"
                : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            No articles match the selected filter criteria.
          </div>
        )}
          </div>
        </div>
      </div>

      {/* NÚT CUỘN NHANH LÊN ĐẦU TRANG (BACK TO TOP BUTTON) */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 px-3.5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-extrabold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 border border-white/20"
          title="Scroll back to top"
        >
          <span>↑</span>
          <span>Top</span>
        </button>
      )}
    </main>
  );
}
