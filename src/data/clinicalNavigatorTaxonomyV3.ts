import type { SubspecialtyType } from '../constants/subspecialties.ts';

export type Subspecialty = SubspecialtyType;

export const NAVIGATOR_SUBSPECIALTIES_V3: SubspecialtyType[] = [
    'Stroke',
    'Neurocritical Care',
    'Epilepsy',
    'Dementia',
    'Neuroimmunology',
    'Neuromuscular',
    'Movement Disorders',
    'Headache & Pain',
    'CNS Infections',
    'Neuro-Oncology',
];

export type ClinicalDomainV3 = 'all' | 'diagnosis' | 'treatment' | 'prevention';

export type RecommendationDirectionV3 = 'recommended' | 'conditional' | 'harm';

export type DirectionFilterV3 = 'all' | 'recommended' | 'conditional' | 'harm';

export interface TaxonomyTagV3 {
    id: string;
    label: string;
}

export interface DiagnosisCategoryV3 {
    id: string;
    label: string;
    description: string;
    items: TaxonomyTagV3[];
}

export interface ConditionTreatmentSchemaV3 {
    timeWindows: TaxonomyTagV3[];
    drugs: TaxonomyTagV3[];
    interventions: TaxonomyTagV3[];
    otherCare: TaxonomyTagV3[];
}

export interface ConditionPreventionSchemaV3 {
    pharmacologicalProphylaxis: TaxonomyTagV3[];
    proceduralDevice: TaxonomyTagV3[];
    lifestyleRehabMonitoring: TaxonomyTagV3[];
}

export interface ClinicalConditionV3 {
    id: string;
    label: string;
    subspecialties: Subspecialty[];
    treatment: ConditionTreatmentSchemaV3;
    prevention: ConditionPreventionSchemaV3;
}

/**
 * Deterministic canonical label ID generator.
 * Guarantees Cross-Domain Single Label Principle (Rule 2):
 * Any intervention label appearing in both Treatment and Prevention shares the exact same `id` and `label`.
 */
export function toCanonicalTagId(label: string): string {
    return (
        'tag_' +
        label
            .trim()
            .toLowerCase()
            .replace(/≤/g, 'le_')
            .replace(/≥/g, 'ge_')
            .replace(/</g, 'lt_')
            .replace(/>/g, 'gt_')
            .replace(/°/g, 'deg')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
    );
}

export function toTimeWindowId(conditionId: string, label: string): string {
    return (
        `${conditionId}_tw_` +
        label
            .trim()
            .toLowerCase()
            .replace(/≤/g, 'le_')
            .replace(/≥/g, 'ge_')
            .replace(/</g, 'lt_')
            .replace(/>/g, 'gt_')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
    );
}

function tags(labels: string[]): TaxonomyTagV3[] {
    return labels.map((label) => ({
        id: toCanonicalTagId(label),
        label,
    }));
}

function timeWindows(conditionId: string, labels: string[]): TaxonomyTagV3[] {
    return labels.map((label) => ({
        id: toTimeWindowId(conditionId, label),
        label,
    }));
}

function defineCondition(
    id: string,
    label: string,
    subspecialties: Subspecialty[],
    raw: {
        timeWindows: string[];
        drugs: string[];
        interventions: string[];
        otherCare: string[];
        pharmacologicalProphylaxis: string[];
        proceduralDevice: string[];
        lifestyleRehabMonitoring: string[];
    }
): ClinicalConditionV3 {
    return {
        id,
        label,
        subspecialties,
        treatment: {
            timeWindows: timeWindows(id, raw.timeWindows),
            drugs: tags(raw.drugs),
            interventions: tags(raw.interventions),
            otherCare: tags(raw.otherCare),
        },
        prevention: {
            pharmacologicalProphylaxis: tags(raw.pharmacologicalProphylaxis),
            proceduralDevice: tags(raw.proceduralDevice),
            lifestyleRehabMonitoring: tags(raw.lifestyleRehabMonitoring),
        },
    };
}

// ============================================================================
// AXIS 2 — BRANCH 1: SYSTEM-WIDE CANONICAL DIAGNOSIS MODALITIES (5 CATEGORIES)
// ============================================================================

export const DIAGNOSIS_CATEGORIES_V3: DiagnosisCategoryV3[] = [
    {
        id: 'diag_clinical_scales',
        label: 'Clinical Evaluation & Scales',
        description: 'Clinical examination, neurological deficit, severity, prognostic & disability scales',
        items: tags([
            'Clinical Examination',
            'Neurological Deficit',
            'Severity Scales',
            'Prognostic Scores',
            'Disability Scales',
        ]),
    },
    {
        id: 'diag_neuroimaging',
        label: 'Neuroimaging',
        description: 'Structural, vascular, and perfusion neuroimaging modalities',
        items: tags([
            'Non-contrast CT',
            'CT Angiography',
            'CT Perfusion',
            'Brain MRI',
            'MR Angiography',
            'MR Perfusion',
            'DSA Angiography',
            'Ultrasound Doppler',
        ]),
    },
    {
        id: 'diag_neurophysiology',
        label: 'Neurophysiology',
        description: 'EEG, EMG/NCS, evoked potentials, and polysomnography',
        items: tags([
            'Routine EEG',
            'Continuous EEG',
            'Video EEG',
            'Stereo-EEG',
            'EMG / NCS',
            'Evoked Potentials',
            'Polysomnography',
        ]),
    },
    {
        id: 'diag_lab_pathology',
        label: 'Laboratory & Pathology',
        description: 'Bloods, CSF, autoantibodies, genetics, biomarkers, and tissue biopsy',
        items: tags([
            'Routine Bloods',
            'CSF Analysis',
            'Autoantibody Panels',
            'Molecular Genetics',
            'Biochemical Biomarkers',
            'Tissue Biopsy',
        ]),
    },
    {
        id: 'diag_frameworks',
        label: 'Diagnostic Frameworks',
        description: 'Consensus criteria, etiology classification, differential & subtype stratification',
        items: tags([
            'Diagnostic Criteria',
            'Etiology Classification',
            'Differential Diagnosis',
            'Subtype Stratification',
        ]),
    },
];

// ============================================================================
// AXIS 1 & AXIS 2 (TREATMENT & PREVENTION): ALL 10 SUBSPECIALTIES & CONDITIONS
// Strictly follows Rules 1–6 (Max 1–3 words, Cross-Domain Single Label ID,
// Multi-Parent Canonical ID, Empty arrays [], Positive Harm Labels, No TBI/Anoxic)
// ============================================================================

export const CLINICAL_CONDITIONS_V3: ClinicalConditionV3[] = [
    // ------------------------------------------------------------------------
    // 4.1. STROKE (7 Conditions)
    // ------------------------------------------------------------------------
    defineCondition('cond_ischemic_stroke', 'Ischemic Stroke', ['Stroke'], {
        timeWindows: ['Early Window (≤ 4.5h)', 'Extended Window (4.5h–24h)', 'Unknown Onset', 'Beyond 24h'],
        drugs: ['Tenecteplase', 'Alteplase', 'SAPT', 'DAPT', 'DOAC', 'VKA', 'Statin', 'Blood Pressure Control', 'Heparin'],
        interventions: ['Mechanical Thrombectomy', 'Basilar Thrombectomy', 'Intra-arterial Thrombolysis', 'Carotid Stenting', 'Angioplasty', 'Hemicraniectomy'],
        otherCare: ['Glucose Protocol', 'Temperature Normalization', 'Swallowing Screen', 'Early Mobilization'],
        pharmacologicalProphylaxis: ['SAPT', 'DAPT', 'DOAC', 'VKA', 'Statin', 'Blood Pressure Control'],
        proceduralDevice: ['Carotid Endarterectomy', 'Carotid Stenting', 'PFO Closure', 'LAAO'],
        lifestyleRehabMonitoring: ['BP Target Optimization', 'Glycemic Control', 'Smoking Cessation', 'Aerobic Exercise', 'Motor Rehab', 'Speech Therapy', 'Swallowing Rehab', 'Holter Telemetry'],
    }),
    defineCondition('cond_tia', 'TIA', ['Stroke'], {
        timeWindows: ['Hyperacute (< 24h)', 'Early Phase (Day 2–7)'],
        drugs: ['SAPT', 'DAPT', 'Statin', 'Blood Pressure Control', 'DOAC'],
        interventions: ['Carotid Endarterectomy', 'Carotid Stenting'],
        otherCare: ['ABCD2 Stratification', 'Holter Telemetry'],
        pharmacologicalProphylaxis: ['SAPT', 'DAPT', 'DOAC', 'Statin', 'Blood Pressure Control'],
        proceduralDevice: ['Carotid Endarterectomy', 'Carotid Stenting', 'PFO Closure', 'LAAO'],
        lifestyleRehabMonitoring: ['BP Target Optimization', 'Lipid Target Optimization', 'Lifestyle Modification', 'Holter Telemetry'],
    }),
    defineCondition('cond_ich', 'ICH', ['Stroke'], {
        timeWindows: ['Hyperacute (< 6h)', 'Acute Window (6h–24h)', 'Subacute (24h–72h)', 'Delayed (> 72h)'],
        drugs: ['Blood Pressure Control', 'PCC', 'Idarucizumab', 'Andexanet Alfa', 'Tranexamic Acid', 'Mannitol', 'Hypertonic Saline', 'Protamine Sulfate', 'Heparin', 'Platelet Transfusion'],
        interventions: ['Minimally Invasive Surgery', 'Craniotomy Evacuation', 'EVD', 'Endoscopic Evacuation'],
        otherCare: ['ICP Monitoring', 'Bundle Care', 'Neuro ICU Care', 'Pneumatic Compression'],
        pharmacologicalProphylaxis: ['Blood Pressure Control', 'Statin', 'DOAC', 'SAPT'],
        proceduralDevice: ['LAAO'],
        lifestyleRehabMonitoring: ['BP Target Optimization', 'CAA Microbleed Tracking', 'Fall Prevention', 'Motor Rehab', 'Alcohol Cessation'],
    }),
    defineCondition('cond_sah', 'SAH', ['Stroke'], {
        timeWindows: ['Pre-Securing (< 72h)', 'Vasospasm Window (Day 3–14)', 'Chronic (> 14 Days)'],
        drugs: ['Nimodipine', 'Clazosentan', 'Blood Pressure Control', 'Hypertonic Saline', 'Anticonvulsants', 'Tranexamic Acid'],
        interventions: ['Aneurysm Coiling', 'Surgical Clipping', 'Flow Diverter Stent', 'EVD', 'Lumbar Drain', 'Intra-arterial Vasodilator', 'Balloon Angioplasty'],
        otherCare: ['Euvolemia Maintenance', 'Sodium Optimization', 'TCD Surveillance', 'ICP Monitoring', 'Continuous EEG'],
        pharmacologicalProphylaxis: ['Blood Pressure Control', 'Nimodipine'],
        proceduralDevice: ['Aneurysm Obliteration', 'VP Shunt'],
        lifestyleRehabMonitoring: ['MRA Relative Screening', 'Smoking Cessation', 'Cognitive Rehab', 'Headache Care'],
    }),
    defineCondition('cond_cvt', 'CVT', ['Stroke'], {
        timeWindows: ['Acute Occlusion (< 48h)', 'Propagation Window (Day 2–7)', 'Beyond Day 7'],
        drugs: ['Heparin', 'LMWH', 'DOAC', 'Warfarin', 'Mannitol', 'Anticonvulsants'],
        interventions: ['Endovascular Thrombectomy', 'Catheter Thrombolysis', 'Hemicraniectomy'],
        otherCare: ['Papilledema Monitoring', 'ICP Monitoring', 'Visual Surveillance'],
        pharmacologicalProphylaxis: ['DOAC', 'Warfarin', 'LMWH'],
        proceduralDevice: ['VP Shunt', 'Optic Nerve Fenestration'],
        lifestyleRehabMonitoring: ['Thrombophilia Surveillance', 'Contraceptive Cessation', 'Weight Optimization', 'Visual Field Tracking'],
    }),
    defineCondition('cond_carotid', 'Carotid Disease', ['Stroke'], {
        timeWindows: ['Emergency (< 48h)', 'Early Phase (Day 2–14)', 'Elective (> 14 Days)'],
        drugs: ['SAPT', 'DAPT', 'Statin', 'Blood Pressure Control'],
        interventions: ['Carotid Endarterectomy', 'Carotid Stenting', 'TCAR'],
        otherCare: ['Hyperperfusion Protocol', 'Duplex Surveillance', 'Hemodynamic Protocol'],
        pharmacologicalProphylaxis: ['SAPT', 'DAPT', 'Statin', 'Blood Pressure Control'],
        proceduralDevice: ['Carotid Endarterectomy', 'Carotid Stenting', 'TCAR'],
        lifestyleRehabMonitoring: ['Duplex Surveillance', 'Lipid Target Optimization', 'Smoking Cessation'],
    }),
    defineCondition('cond_stroke_other', 'Other (Stroke)', ['Stroke'], {
        timeWindows: ['Complication Onset', 'Subacute Phase'],
        drugs: ['Broad Antibiotics', 'PPI', 'Central Analgesics', 'SSRI Antidepressants', 'Subcutaneous Heparin'],
        interventions: ['PEG Placement', 'IVC Filter'],
        otherCare: ['Pneumonia Bundle', 'Pressure Ulcer Care', 'DVT Surveillance'],
        pharmacologicalProphylaxis: ['Subcutaneous Heparin', 'SSRI Antidepressants', 'Central Analgesics'],
        proceduralDevice: ['PEG Placement', 'IVC Filter Removal'],
        lifestyleRehabMonitoring: ['Depression Care', 'Pain Rehabilitation', 'Caregiver Support'],
    }),

    // ------------------------------------------------------------------------
    // 4.2. NEUROCRITICAL CARE (4 Conditions — Excludes TBI & Anoxic Brain Injury per Rule 6)
    // ------------------------------------------------------------------------
    defineCondition('cond_status_epilepticus', 'Status Epilepticus', ['Neurocritical Care'], {
        timeWindows: ['Impending (0–5 min)', 'Established (5–30 min)', 'Refractory (30 min–24h)', 'Super-Refractory (> 24h)'],
        drugs: ['Midazolam', 'Lorazepam', 'Diazepam', 'Levetiracetam', 'Valproate Sodium', 'Fosphenytoin', 'Phenobarbital', 'Lacosamide', 'Propofol', 'Ketamine', 'Thiopental'],
        interventions: ['Endotracheal Intubation', 'Mechanical Ventilation', 'VNS Therapy'],
        otherCare: ['Continuous EEG', 'Burst Suppression', 'Hemodynamic Vasopressors', 'Ketogenic Diet', 'Hypothermia Protocol'],
        pharmacologicalProphylaxis: ['Levetiracetam', 'Valproate Sodium', 'Lacosamide', 'Lamotrigine'],
        proceduralDevice: ['VNS Therapy', 'RNS Therapy'],
        lifestyleRehabMonitoring: ['ASM Tapering Protocol', 'EEG Regular Tracking', 'Driving Restriction', 'Sleep Hygiene'],
    }),
    defineCondition('cond_cerebral_edema', 'Cerebral Edema', ['Neurocritical Care'], {
        timeWindows: ['Impending Herniation (< 24h)', 'Peak Edema (Day 2–5)', 'Resolution (> Day 5)'],
        drugs: ['Hypertonic Saline', 'Mannitol', 'Dexamethasone', 'Propofol', 'Cisatracurium', 'Thiopental'],
        interventions: ['Decompressive Craniectomy', 'EVD', 'Lumbar Drain'],
        otherCare: ['Head Elevation 30°', 'Controlled Hyperventilation', 'ICP Monitoring', 'Hypothermia Protocol'],
        pharmacologicalProphylaxis: ['Osmotic Optimization'],
        proceduralDevice: ['Cranioplasty', 'Shunt Revision'],
        lifestyleRehabMonitoring: ['Hydrocephalus Surveillance', 'Cognitive Rehab', 'Neurologic Follow-up'],
    }),
    defineCondition('cond_acute_nm_failure', 'Acute Neuromuscular Failure', ['Neurocritical Care'], {
        timeWindows: ['Rapid Progression (< 12h)', 'Critical Phase (12h–72h)', 'Stabilization (> 72h)'],
        drugs: ['IVIg', 'Glycopyrrolate', 'Ipratropium', 'Subcutaneous Heparin'],
        interventions: ['Endotracheal Intubation', 'PLEX', 'Tracheostomy'],
        otherCare: ['Forced Vital Capacity', 'NIF Monitoring', 'Non-Invasive Ventilation', 'Autonomic Care'],
        pharmacologicalProphylaxis: ['IVIg', 'Subcutaneous Ig', 'Subcutaneous Heparin'],
        proceduralDevice: ['Tracheostomy Decannulation', 'PEG Placement'],
        lifestyleRehabMonitoring: ['Pulmonary Rehab', 'Dysphagia Therapy', 'Home Ventilation'],
    }),
    defineCondition('cond_ncc_other', 'Other (Neurocritical Care)', ['Neurocritical Care'], {
        timeWindows: ['Resuscitation (< 24h)', 'ICU Stabilization (Day 2–7)', 'Weaning Phase'],
        drugs: ['Norepinephrine', 'Dexmedetomidine', 'Broad Antibiotics', 'Hydrocortisone', 'Prokinetics'],
        interventions: ['Arterial Line Access', 'Central Venous Line', 'Tracheostomy'],
        otherCare: ['ICU Delirium Bundle', 'Sepsis Care Bundle', 'Ventilator Weaning', 'Stress Ulcer Care'],
        pharmacologicalProphylaxis: ['Stress Ulcer Care', 'Subcutaneous Heparin'],
        proceduralDevice: ['Line Removal Protocol'],
        lifestyleRehabMonitoring: ['PICS Care', 'Early Mobilization', 'Psychological Support'],
    }),

    // ------------------------------------------------------------------------
    // 4.3. EPILEPSY (4 Conditions)
    // ------------------------------------------------------------------------
    defineCondition('cond_new_onset_seizure', 'New-Onset Seizure', ['Epilepsy'], {
        timeWindows: ['Hyperacute (< 24h)', 'Initiation (Week 1–4)', 'Stable Maintenance'],
        drugs: ['Levetiracetam', 'Lamotrigine', 'Valproate Sodium', 'Carbamazepine', 'Oxcarbazepine', 'Midazolam Nasal'],
        interventions: ['Lesionectomy', 'Cavernoma Resection'],
        otherCare: ['Trigger Counseling', 'Diagnostic EEG'],
        pharmacologicalProphylaxis: ['Levetiracetam', 'Lamotrigine', 'Valproate Sodium', 'Carbamazepine', 'Oxcarbazepine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Driving Restriction', 'Sleep Hygiene', 'Alcohol Cessation', 'Seizure Diary'],
    }),
    defineCondition('cond_dre', 'Drug-Resistant Epilepsy', ['Epilepsy'], {
        timeWindows: ['Pre-Surgical Workup', 'Post-Surgical Phase', 'Maintenance'],
        drugs: ['Cenobamate', 'Brivaracetam', 'Perampanel', 'Clobazam', 'Cannabidiol', 'Lacosamide', 'Topiramate', 'Zonisamide'],
        interventions: ['Temporal Lobectomy', 'Laser Ablation', 'VNS Therapy', 'DBS Surgery', 'RNS Therapy', 'Corpus Callosotomy'],
        otherCare: ['Ketogenic Diet', 'SUDEP Counseling', 'Neuropsychological Care'],
        pharmacologicalProphylaxis: ['Cenobamate', 'Brivaracetam', 'Perampanel', 'Clobazam', 'Lacosamide'],
        proceduralDevice: ['VNS Therapy', 'DBS Surgery', 'RNS Therapy'],
        lifestyleRehabMonitoring: ['Ketogenic Diet', 'SUDEP Counseling', 'Neuropsychological Care', 'Vocational Counseling'],
    }),
    defineCondition('cond_epilepsy_syndromes', 'Epilepsy Syndromes', ['Epilepsy'], {
        timeWindows: ['Infantile Phase', 'Cluster Flare Phase', 'Maintenance'],
        drugs: ['Fenfluramine', 'Cannabidiol', 'Stiripentol', 'Ethosuximide', 'Clobazam', 'ACTH', 'Vigabatrin', 'Rufinamide', 'Valproate Sodium'],
        interventions: ['Hemispherectomy', 'Corpus Callosotomy', 'VNS Therapy'],
        otherCare: ['Emergency Care Plan', 'Developmental Support'],
        pharmacologicalProphylaxis: ['Ethosuximide', 'Valproate Sodium', 'Clobazam', 'Cannabidiol', 'Fenfluramine'],
        proceduralDevice: ['VNS Therapy', 'Corpus Callosotomy'],
        lifestyleRehabMonitoring: ['Genetic Counseling', 'School Action Plan', 'Developmental Support'],
    }),
    defineCondition('cond_epilepsy_other', 'Other (Epilepsy)', ['Epilepsy'], {
        timeWindows: ['Seizure Cluster', 'Post-Ictal Phase', 'Pregnancy Maintenance'],
        drugs: ['Diazepam Rectal', 'Clonazepam Sublingual', 'Folic Acid High-Dose', 'Pyridoxine', 'Teratogenic ASMs'],
        interventions: ['Emergency Airway Support'],
        otherCare: ['Seizure Action Plan', 'Teratogenic Counseling'],
        pharmacologicalProphylaxis: ['Lamotrigine', 'Levetiracetam', 'Folic Acid High-Dose', 'Teratogenic ASMs'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Teratogenic Counseling', 'Bone Mineral Care', 'Pre-pregnancy Planning'],
    }),

    // ------------------------------------------------------------------------
    // 4.4. DEMENTIA (8 Conditions — `cond_lbd` shared with Movement Disorders)
    // ------------------------------------------------------------------------
    defineCondition('cond_alzheimer', 'Alzheimer Disease', ['Dementia'], {
        timeWindows: ['Mild Cognitive Stage', 'Mild Stage', 'Moderate Stage', 'Advanced Stage'],
        drugs: ['Lecanemab', 'Donanemab', 'Donepezil', 'Rivastigmine', 'Galantamine', 'Memantine', 'Brexpiprazole', 'Sertraline'],
        interventions: [],
        otherCare: ['ARIA Monitoring', 'Cognitive Therapy', 'Caregiver Respite', 'Home Safety Protocol'],
        pharmacologicalProphylaxis: ['Donepezil', 'Rivastigmine', 'Memantine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Aerobic Exercise', 'Mediterranean Diet', 'Cognitive Stimulation', 'Advance Care Planning', 'Driving Cessation'],
    }),
    defineCondition('cond_vascular_dementia', 'Vascular Dementia', ['Dementia'], {
        timeWindows: ['Post-Stroke Decline', 'Subacute Plateau', 'Chronic Progression'],
        drugs: ['Donepezil', 'Memantine', 'Sertraline', 'Blood Pressure Control', 'Statin'],
        interventions: [],
        otherCare: ['Vascular Risk Control', 'Physical Exercise'],
        pharmacologicalProphylaxis: ['Blood Pressure Control', 'Statin', 'SAPT'],
        proceduralDevice: ['Carotid Endarterectomy', 'Carotid Stenting'],
        lifestyleRehabMonitoring: ['Vascular Risk Control', 'Physical Exercise', 'Cognitive Rehab'],
    }),
    defineCondition('cond_lbd', 'Lewy Body Dementia', ['Dementia', 'Movement Disorders'], {
        timeWindows: ['Early Fluctuating', 'Motor-Cognitive Phase', 'Advanced Stage'],
        drugs: ['Donepezil', 'Rivastigmine', 'Memantine', 'Pimavanserin', 'Levodopa Low-Dose', 'Clonazepam', 'Melatonin', 'Typical Antipsychotics'],
        interventions: [],
        otherCare: ['Orthostatic Care', 'REM Sleep Care'],
        pharmacologicalProphylaxis: ['Donepezil', 'Rivastigmine', 'Melatonin'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Fall Prevention', 'Environmental Safety', 'Caregiver Support'],
    }),
    defineCondition('cond_ftd', 'FTD', ['Dementia'], {
        timeWindows: ['Early Behavioral', 'Established Stage', 'Late Stage'],
        drugs: ['Trazodone', 'Sertraline', 'Paroxetine', 'Quetiapine', 'Cholinesterase Inhibitors'],
        interventions: [],
        otherCare: ['Behavioral Modification'],
        pharmacologicalProphylaxis: ['Trazodone', 'SSRI Antidepressants'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Speech Therapy', 'Behavioral Redirection', 'Caregiver Respite'],
    }),
    defineCondition('cond_nph', 'Normal Pressure Hydrocephalus', ['Dementia'], {
        timeWindows: ['Diagnostic Trial Window', 'Post-Shunt Phase'],
        drugs: ['Acetazolamide'],
        interventions: ['VP Shunt', 'Endoscopic Ventriculostomy', 'Valve Revision'],
        otherCare: ['Gait Speed Assessment'],
        pharmacologicalProphylaxis: [],
        proceduralDevice: ['VP Shunt', 'Valve Revision'],
        lifestyleRehabMonitoring: ['Shunt Pressure Tracking', 'Gait Rehabilitation', 'Fall Prevention'],
    }),
    defineCondition('cond_mci', 'MCI', ['Dementia'], {
        timeWindows: ['Biomarker Positive Stage', 'Annual Tracking Phase'],
        drugs: ['Lecanemab', 'Donanemab', 'Vitamin B12'],
        interventions: [],
        otherCare: ['Multimodal Lifestyle', 'Sleep Optimization'],
        pharmacologicalProphylaxis: ['Vitamin B12', 'Lecanemab'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Mediterranean Diet', 'Aerobic Exercise', 'Sleep Optimization', 'Annual MoCA Tracking'],
    }),
    defineCondition('cond_cjd', 'CJD', ['Dementia'], {
        timeWindows: ['Rapid Decline Phase', 'Terminal Phase'],
        drugs: ['Clonazepam', 'Valproate Sodium', 'Quetiapine', 'Glycopyrrolate', 'Morphine'],
        interventions: [],
        otherCare: ['Prion Precautions', 'Palliative Care'],
        pharmacologicalProphylaxis: ['Palliative Sedatives'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Prion Decontamination', 'Bereavement Support', 'Hospice Care'],
    }),
    defineCondition('cond_dementia_other', 'Other (Dementia)', ['Dementia'], {
        timeWindows: ['Acute Delirium Onset', 'Reversible Workup'],
        drugs: ['Thiamine High-Dose', 'Haloperidol Low-Dose', 'Hyoscine Butylbromide'],
        interventions: [],
        otherCare: ['Wernicke Care Protocol', 'Palliative Care'],
        pharmacologicalProphylaxis: ['Thiamine High-Dose', 'Nutritional Supplements'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Alcohol Cessation', 'Nutritional Rehab', 'Driving Cessation'],
    }),

    // ------------------------------------------------------------------------
    // 4.5. NEUROIMMUNOLOGY (7 Conditions — `cond_paraneoplastic` shared with Neuro-Oncology)
    // ------------------------------------------------------------------------
    defineCondition('cond_ms', 'Multiple Sclerosis', ['Neuroimmunology'], {
        timeWindows: ['Acute Relapse (< 2 Weeks)', 'Induction Phase', 'Maintenance Phase'],
        drugs: ['Methylprednisolone', 'Ocrelizumab', 'Ofatumumab', 'Ublituximab', 'Natalizumab', 'Cladribine', 'Fingolimod', 'Siponimod', 'Dimethyl Fumarate', 'Teriflunomide', 'Fampridine', 'Baclofen'],
        interventions: ['PLEX', 'HSCT', 'Baclofen Pump'],
        otherCare: ['PML Surveillance', 'Pre-Vaccination Screen', 'Spasticity Protocol'],
        pharmacologicalProphylaxis: ['Ocrelizumab', 'Ofatumumab', 'Natalizumab', 'Cladribine', 'Fingolimod', 'Dimethyl Fumarate', 'Teriflunomide'],
        proceduralDevice: ['HSCT', 'Baclofen Pump'],
        lifestyleRehabMonitoring: ['Brain MRI Tracking', 'PML Surveillance', 'Vitamin D Repletion', 'Physical Therapy'],
    }),
    defineCondition('cond_nmosd', 'NMOSD', ['Neuroimmunology'], {
        timeWindows: ['Acute Flare (< 14 Days)', 'Long-Term Remission'],
        drugs: ['Methylprednisolone', 'Satralizumab', 'Inebilizumab', 'Eculizumab', 'Ravulizumab', 'Rituximab', 'Mycophenolate Mofetil', 'Azathioprine', 'MS DMDs'],
        interventions: ['PLEX'],
        otherCare: ['Meningococcal Vaccine'],
        pharmacologicalProphylaxis: ['Satralizumab', 'Inebilizumab', 'Eculizumab', 'Ravulizumab', 'Rituximab', 'Mycophenolate Mofetil', 'Azathioprine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['AQP4 Titer Tracking', 'Meningococcal Vaccine', 'Visual Rehabilitation', 'Bladder Care'],
    }),
    defineCondition('cond_mogad', 'MOGAD', ['Neuroimmunology'], {
        timeWindows: ['Acute Attack (< 14 Days)', 'Steroid Taper (2–6 Months)', 'Relapse Maintenance'],
        drugs: ['Methylprednisolone', 'Prednisone', 'IVIg', 'Rituximab', 'Mycophenolate Mofetil', 'Azathioprine', 'Tocilizumab'],
        interventions: ['PLEX'],
        otherCare: ['Prolonged Steroid Taper', 'MOG Titer Tracking'],
        pharmacologicalProphylaxis: ['Prednisone', 'IVIg', 'Rituximab', 'Mycophenolate Mofetil', 'Azathioprine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['MOG Titer Tracking', 'Osteoporosis Prophylaxis', 'Bladder Care'],
    }),
    defineCondition('cond_autoimmune_encephalitis', 'Autoimmune Encephalitis', ['Neuroimmunology'], {
        timeWindows: ['Acute Phase (Week 1–4)', 'Escalation (Month 1–3)', 'Maintenance Phase'],
        drugs: ['Methylprednisolone', 'IVIg', 'Rituximab', 'Cyclophosphamide', 'Tocilizumab', 'Bortezomib', 'Levetiracetam'],
        interventions: ['Teratoma Resection', 'Tumor Resection'],
        otherCare: ['Continuous EEG', 'Dysautonomia Care', 'Malignancy Screening'],
        pharmacologicalProphylaxis: ['Rituximab', 'Mycophenolate Mofetil', 'Levetiracetam'],
        proceduralDevice: ['Teratoma Resection'],
        lifestyleRehabMonitoring: ['Malignancy Screening', 'Cognitive Rehab', 'Seizure Tracking'],
    }),
    defineCondition('cond_cns_vasculitis', 'CNS Vasculitis', ['Neuroimmunology'], {
        timeWindows: ['Induction (Month 1–6)', 'Maintenance (Month 6–24)'],
        drugs: ['Methylprednisolone', 'Prednisone', 'Cyclophosphamide', 'Rituximab', 'Azathioprine', 'Mycophenolate Mofetil'],
        interventions: ['Intracranial Angioplasty'],
        otherCare: ['Infection Prophylaxis', 'Bone Density Care'],
        pharmacologicalProphylaxis: ['Azathioprine', 'Mycophenolate Mofetil', 'Rituximab', 'Prednisone'],
        proceduralDevice: ['Intracranial Angioplasty'],
        lifestyleRehabMonitoring: ['Serial MRA Tracking', 'Infection Prophylaxis', 'Bone Density Care'],
    }),
    defineCondition('cond_paraneoplastic', 'Paraneoplastic Syndromes', ['Neuroimmunology', 'Neuro-Oncology'], {
        timeWindows: ['Diagnostic Workup Phase', 'Anti-Tumor Phase', 'Maintenance'],
        drugs: ['Methylprednisolone', 'IVIg', 'Rituximab', 'Cyclophosphamide'],
        interventions: ['Primary Tumor Resection', 'Lymphadenectomy'],
        otherCare: ['PET-CT Surveillance', 'Palliative Care'],
        pharmacologicalProphylaxis: ['Rituximab', 'IVIg'],
        proceduralDevice: ['Primary Tumor Resection'],
        lifestyleRehabMonitoring: ['PET-CT Surveillance', 'Physical Therapy'],
    }),
    defineCondition('cond_neuroimm_other', 'Other (Neuroimmunology)', ['Neuroimmunology'], {
        timeWindows: ['Fulminant Onset', 'Chronic Maintenance'],
        drugs: ['IVIg', 'Methylprednisolone', 'Methotrexate', 'Cotrimoxazole', 'Valacyclovir'],
        interventions: [],
        otherCare: ['Latent TB Screening', 'Infection Prophylaxis'],
        pharmacologicalProphylaxis: ['Methotrexate', 'Azathioprine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Immune Titer Tracking', 'Post-Vaccinal Care'],
    }),

    // ------------------------------------------------------------------------
    // 4.6. NEUROMUSCULAR (12 Conditions)
    // ------------------------------------------------------------------------
    defineCondition('cond_als', 'ALS', ['Neuromuscular'], {
        timeWindows: ['Diagnostic Phase', 'Motor Decline', 'Respiratory Phase'],
        drugs: ['Riluzole', 'Edaravone', 'Tofersen', 'Sodium Phenylbutyrate', 'Dextromethorphan-Quinidine', 'Baclofen', 'Glycopyrrolate'],
        interventions: ['PEG Placement', 'Tracheostomy'],
        otherCare: ['Non-Invasive Ventilation', 'Cough Assist Device', 'Eye-Tracking Device'],
        pharmacologicalProphylaxis: ['Riluzole', 'Edaravone', 'Tofersen'],
        proceduralDevice: ['PEG Placement', 'Tracheostomy'],
        lifestyleRehabMonitoring: ['Non-Invasive Ventilation', 'Multidisciplinary Care', 'Palliative Care'],
    }),
    defineCondition('cond_gbs', 'GBS', ['Neuromuscular'], {
        timeWindows: ['Progressive (< 2 Weeks)', 'Plateau (Week 2–4)', 'Recovery Phase'],
        drugs: ['IVIg', 'Gabapentin', 'Pregabalin', 'Duloxetine', 'Heparin', 'Corticosteroids'],
        interventions: ['PLEX', 'Endotracheal Intubation'],
        otherCare: ['Forced Vital Capacity', 'Autonomic Care', 'Pneumatic Compression'],
        pharmacologicalProphylaxis: ['Gabapentin', 'Pregabalin', 'Duloxetine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Physical Therapy', 'Pain Rehabilitation', 'Fatigue Rehab'],
    }),
    defineCondition('cond_cidp', 'CIDP', ['Neuromuscular'], {
        timeWindows: ['Induction (Week 1–8)', 'Titration Phase', 'Refractory Stage'],
        drugs: ['IVIg', 'Subcutaneous Ig', 'Prednisone', 'Methylprednisolone', 'Efgartigimod', 'Azathioprine', 'Rituximab'],
        interventions: ['PLEX', 'Vascular Port Placement'],
        otherCare: ['INCAT Score Tracking', 'Physical Therapy'],
        pharmacologicalProphylaxis: ['Subcutaneous Ig', 'IVIg', 'Prednisone', 'Efgartigimod', 'Azathioprine'],
        proceduralDevice: ['Vascular Port Placement'],
        lifestyleRehabMonitoring: ['NCS Surveillance', 'Dexterity Training', 'Fall Prevention'],
    }),
    defineCondition('cond_anti_mag', 'Anti-MAG Neuropathy', ['Neuromuscular'], {
        timeWindows: ['Indolent Phase', 'Disabling Ataxia'],
        drugs: ['Rituximab', 'Cyclophosphamide', 'Chlorambucil', 'Pregabalin'],
        interventions: [],
        otherCare: ['Ataxia Gait Training', 'Walking Assist Fitting'],
        pharmacologicalProphylaxis: ['Rituximab', 'Pregabalin'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['IgM Titer Tracking', 'Hematology Follow-up', 'Ataxia Gait Training'],
    }),
    defineCondition('cond_mmn', 'Multifocal Motor Neuropathy', ['Neuromuscular'], {
        timeWindows: ['Acute Onset', 'Maintenance Titration'],
        drugs: ['IVIg', 'Subcutaneous Ig', 'Corticosteroids'],
        interventions: ['PLEX'],
        otherCare: ['Upper Limb Splinting'],
        pharmacologicalProphylaxis: ['IVIg', 'Subcutaneous Ig'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Motor Strength Tracking', 'Upper Limb Splinting', 'Occupational Therapy'],
    }),
    defineCondition('cond_poems', 'POEMS', ['Neuromuscular'], {
        timeWindows: ['Staging Phase', 'Consolidation Phase', 'Remission Phase'],
        drugs: ['Melphalan', 'Dexamethasone', 'Lenalidomide', 'Bortezomib', 'Furosemide'],
        interventions: ['Autologous SCT', 'Stereotactic Radiosurgery'],
        otherCare: ['VEGF Titer Tracking', 'Pulmonary Screen'],
        pharmacologicalProphylaxis: ['Lenalidomide', 'Dexamethasone'],
        proceduralDevice: ['Autologous SCT'],
        lifestyleRehabMonitoring: ['VEGF Titer Tracking', 'Endocrine Repletion', 'Cardiac Echo Tracking'],
    }),
    defineCondition('cond_mg', 'Myasthenia Gravis', ['Neuromuscular'], {
        timeWindows: ['Myasthenic Crisis', 'Initiation Phase', 'Remission Maintenance'],
        drugs: ['Pyridostigmine', 'IVIg', 'Methylprednisolone', 'Prednisone', 'Azathioprine', 'Mycophenolate Mofetil', 'Efgartigimod', 'Rozanolixizumab', 'Ravulizumab', 'Zilucoplan', 'Rituximab', 'Tacrolimus', 'Fluoroquinolones', 'Neuromuscular Blockers'],
        interventions: ['PLEX', 'Extended Thymectomy', 'VATS Thymectomy', 'Endotracheal Intubation'],
        otherCare: ['Single Breath Count'],
        pharmacologicalProphylaxis: ['Pyridostigmine', 'Prednisone', 'Azathioprine', 'Mycophenolate Mofetil', 'Efgartigimod', 'Tacrolimus'],
        proceduralDevice: ['Extended Thymectomy', 'VATS Thymectomy'],
        lifestyleRehabMonitoring: ['QMG Score Tracking', 'Trigger Drug Education', 'Crisis Action Plan'],
    }),
    defineCondition('cond_lems', 'Lambert-Eaton', ['Neuromuscular'], {
        timeWindows: ['Diagnostic Window', 'Maintenance Phase'],
        drugs: ['Amifampridine', 'Pyridostigmine', 'Prednisone', 'Azathioprine', 'IVIg'],
        interventions: ['Lung Tumor Resection'],
        otherCare: ['Chest CT Surveillance', 'Autonomic Care'],
        pharmacologicalProphylaxis: ['Amifampridine', 'Pyridostigmine', 'Azathioprine'],
        proceduralDevice: ['Lung Tumor Resection'],
        lifestyleRehabMonitoring: ['Chest CT Surveillance', 'Autonomic Care'],
    }),
    defineCondition('cond_myopathies', 'Myopathies', ['Neuromuscular'], {
        timeWindows: ['Acute Rhabdomyolysis', 'Active Myositis Phase', 'Maintenance Phase'],
        drugs: ['Methylprednisolone', 'Prednisone', 'Methotrexate', 'Azathioprine', 'IVIg', 'Rituximab', 'Alkaline Hydration'],
        interventions: [],
        otherCare: ['CK Surveillance', 'ILD Lung Screening', 'Malignancy Screening'],
        pharmacologicalProphylaxis: ['Prednisone', 'Methotrexate', 'Azathioprine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['CK Surveillance', 'ILD Lung Screening', 'Physical Exercise'],
    }),
    defineCondition('cond_dpn', 'Diabetic Polyneuropathy', ['Neuromuscular'], {
        timeWindows: ['Painful Flare Phase', 'Chronic Maintenance'],
        drugs: ['Duloxetine', 'Pregabalin', 'Gabapentin', 'Amitriptyline', 'Capsaicin Patch', 'Alpha Lipoic Acid'],
        interventions: [],
        otherCare: ['Diabetic Foot Care', 'Glycemic Control'],
        pharmacologicalProphylaxis: ['Duloxetine', 'Pregabalin', 'Alpha Lipoic Acid'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Glycemic Control', 'Diabetic Foot Care', 'Fall Prevention'],
    }),
    defineCondition('cond_sma', 'Spinal Muscular Atrophy', ['Neuromuscular'], {
        timeWindows: ['Infantile Onset', 'Presymptomatic Stage', 'Chronic Maintenance'],
        drugs: ['Nusinersen', 'Risdiplam', 'Onasemnogene Abeparvovec'],
        interventions: ['Scoliosis Surgery', 'PEG Placement'],
        otherCare: ['Pulmonary Care', 'Cough Assist Device'],
        pharmacologicalProphylaxis: ['Nusinersen', 'Risdiplam'],
        proceduralDevice: ['Scoliosis Surgery', 'PEG Placement'],
        lifestyleRehabMonitoring: ['Cough Assist Device', 'Orthotic Spine Fitting', 'Physical Therapy'],
    }),
    defineCondition('cond_nm_other', 'Other (Neuromuscular)', ['Neuromuscular'], {
        timeWindows: ['Acute Paralysis Attack', 'Toxin Elimination', 'Maintenance'],
        drugs: ['Potassium Chloride', 'Acetazolamide', 'Mexiletine', 'Carnitine'],
        interventions: [],
        otherCare: ['Drug Discontinuation', 'Periodic Paralysis Care'],
        pharmacologicalProphylaxis: ['Acetazolamide', 'Potassium Chloride', 'Mexiletine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Trigger Management', 'Potassium Monitoring', 'Orthotic Footwear'],
    }),

    // ------------------------------------------------------------------------
    // 4.7. MOVEMENT DISORDERS (11 Conditions — includes shared `cond_lbd`)
    // ------------------------------------------------------------------------
    defineCondition('cond_parkinson', 'Parkinson Disease', ['Movement Disorders'], {
        timeWindows: ['Early Untreated', 'Motor Fluctuations', 'Advanced Refractory'],
        drugs: ['Levodopa-Carbidopa', 'Pramipexole', 'Ropinirole', 'Rasagiline', 'Safinamide', 'Entacapone', 'Opicapone', 'Amantadine', 'Apomorphine Pump', 'Inhaled Levodopa', 'Pimavanserin', 'Quetiapine'],
        interventions: ['DBS Surgery', 'MRgFUS Thalamotomy', 'Levodopa Intestinal Gel', 'Subcutaneous Levodopa'],
        otherCare: ['Fall Prevention', 'Speech Therapy', 'Orthostatic Care'],
        pharmacologicalProphylaxis: ['Levodopa-Carbidopa', 'Rasagiline', 'Amantadine'],
        proceduralDevice: ['DBS Surgery', 'Levodopa Intestinal Gel', 'Subcutaneous Levodopa'],
        lifestyleRehabMonitoring: ['Physical Exercise', 'Fall Prevention', 'Speech Therapy', 'Swallowing Screen'],
    }),
    defineCondition('cond_essential_tremor', 'Essential Tremor', ['Movement Disorders'], {
        timeWindows: ['Early Mild Phase', 'Functionally Disabling'],
        drugs: ['Propranolol', 'Primidone', 'Topiramate', 'Gabapentin', 'Botulinum Toxin'],
        interventions: ['MRgFUS Thalamotomy', 'DBS Surgery', 'Stereotactic Radiosurgery'],
        otherCare: ['Weighted Utensils', 'Tremor Scoring'],
        pharmacologicalProphylaxis: ['Propranolol', 'Primidone'],
        proceduralDevice: ['DBS Surgery', 'MRgFUS Thalamotomy'],
        lifestyleRehabMonitoring: ['Weighted Utensils', 'Occupational Therapy', 'Caffeine Restriction'],
    }),
    defineCondition('cond_dystonia', 'Dystonia', ['Movement Disorders'], {
        timeWindows: ['Acute Dystonic Reaction', 'Chronic Maintenance'],
        drugs: ['Botulinum Toxin', 'Trihexyphenidyl', 'Baclofen', 'Clonazepam', 'Tetrabenazine', 'Diphenhydramine'],
        interventions: ['DBS Surgery', 'Baclofen Pump', 'Peripheral Denervation'],
        otherCare: ['Status Dystonicus Care', 'Physical Therapy'],
        pharmacologicalProphylaxis: ['Botulinum Toxin', 'Trihexyphenidyl', 'Baclofen'],
        proceduralDevice: ['DBS Surgery', 'Baclofen Pump'],
        lifestyleRehabMonitoring: ['Botulinum Schedule', 'Sensory Trick Training', 'Physical Therapy'],
    }),
    defineCondition('cond_msa', 'MSA', ['Movement Disorders'], {
        timeWindows: ['Autonomic Phase', 'Motor Decline', 'Advanced Phase'],
        drugs: ['Levodopa Trial', 'Midodrine', 'Fludrocortisone', 'Droxidopa', 'Mirabegron'],
        interventions: ['Tracheostomy', 'PEG Placement', 'Suprapubic Catheter'],
        otherCare: ['Stridor Surveillance', 'Compression Garments', 'High Salt Diet'],
        pharmacologicalProphylaxis: ['Midodrine', 'Fludrocortisone'],
        proceduralDevice: ['Tracheostomy', 'PEG Placement', 'Suprapubic Catheter'],
        lifestyleRehabMonitoring: ['Stridor Surveillance', 'High Salt Diet', 'Compression Garments', 'Fall Prevention'],
    }),
    defineCondition('cond_psp_cbd', 'PSP / CBD', ['Movement Disorders'], {
        timeWindows: ['Early Fall Phase', 'Advanced Disability'],
        drugs: ['Levodopa Trial', 'Amantadine', 'Botulinum Toxin', 'SSRI Antidepressants'],
        interventions: ['PEG Placement'],
        otherCare: ['Fall Prevention', 'Prism Glasses', 'Dysphagia Therapy'],
        pharmacologicalProphylaxis: ['Amantadine', 'Botulinum Toxin'],
        proceduralDevice: ['PEG Placement'],
        lifestyleRehabMonitoring: ['Weighted Walker Fitting', 'Prism Glasses', 'Dysphagia Therapy'],
    }),
    defineCondition('cond_vascular_parkinsonism', 'Vascular Parkinsonism', ['Movement Disorders'], {
        timeWindows: ['Post-Stroke Phase', 'Chronic Stability'],
        drugs: ['Levodopa Trial', 'SAPT', 'Statin', 'Blood Pressure Control'],
        interventions: [],
        otherCare: ['Gait Rehabilitation', 'Balance Training'],
        pharmacologicalProphylaxis: ['Blood Pressure Control', 'Statin', 'SAPT'],
        proceduralDevice: ['Carotid Stenting', 'Carotid Endarterectomy'],
        lifestyleRehabMonitoring: ['Gait Rehabilitation', 'Vascular Risk Control'],
    }),
    defineCondition('cond_dip', 'Drug-Induced Parkinsonism', ['Movement Disorders'], {
        timeWindows: ['Acute Onset (< 3 Months)', 'Drug Resolution Phase'],
        drugs: ['Drug Discontinuation', 'Quetiapine', 'Clozapine', 'Trihexyphenidyl', 'Amantadine', 'Typical Antipsychotics'],
        interventions: [],
        otherCare: ['Medication Review', 'Dyskinesia Surveillance'],
        pharmacologicalProphylaxis: ['Clozapine', 'Quetiapine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Medication Review', 'Psychiatric Consultation'],
    }),
    defineCondition('cond_wilson', 'Wilson Disease', ['Movement Disorders'], {
        timeWindows: ['Decoppering Phase', 'Maintenance Phase', 'Acute Hepatic Crisis'],
        drugs: ['Penicillamine', 'Trientine', 'Zinc Acetate', 'Trihexyphenidyl', 'Botulinum Toxin'],
        interventions: ['Liver Transplantation'],
        otherCare: ['Low Copper Diet', 'Urine Copper Tracking'],
        pharmacologicalProphylaxis: ['Zinc Acetate', 'Trientine', 'Penicillamine'],
        proceduralDevice: ['Liver Transplantation'],
        lifestyleRehabMonitoring: ['Low Copper Diet', 'Urine Copper Tracking', 'Slit-Lamp Surveillance'],
    }),
    defineCondition('cond_huntington', 'Huntington Disease', ['Movement Disorders'], {
        timeWindows: ['Pre-Motor Stage', 'Active Chorea Phase', 'Advanced Stage'],
        drugs: ['Tetrabenazine', 'Deutetrabenazine', 'Haloperidol', 'Olanzapine', 'SSRI Antidepressants'],
        interventions: [],
        otherCare: ['Genetic Counseling', 'Fall Prevention', 'Palliative Care'],
        pharmacologicalProphylaxis: ['Tetrabenazine', 'Deutetrabenazine'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Genetic Counseling', 'Fall Prevention', 'Nutritional Rehab'],
    }),
    defineCondition('cond_movement_other', 'Other (Movement Disorders)', ['Movement Disorders'], {
        timeWindows: ['Acute Ataxic Flare', 'Chronic Degenerative'],
        drugs: ['Clonazepam', 'Levetiracetam', 'Valproate Sodium', 'Coenzyme Q10'],
        interventions: [],
        otherCare: ['Physical Therapy'],
        pharmacologicalProphylaxis: ['Clonazepam', 'Coenzyme Q10'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Balance Training', 'Walking Assist Fitting', 'Fall Prevention'],
    }),

    // ------------------------------------------------------------------------
    // 4.8. HEADACHE & PAIN (7 Conditions)
    // ------------------------------------------------------------------------
    defineCondition('cond_migraine', 'Migraine', ['Headache & Pain'], {
        timeWindows: ['Acute Attack (< 2h)', 'Refractory Status (> 72h)', 'Prevention Phase'],
        drugs: ['Sumatriptan', 'Zolmitriptan', 'Rimegepant', 'Ubrogepant', 'Lasmiditan', 'Ketorolac', 'Metoclopramide', 'Dexamethasone', 'Erenumab', 'Galcanezumab', 'Fremanezumab', 'Eptinezumab', 'Atogepant', 'Propranolol', 'Topiramate', 'Amitriptyline', 'Flunarizine', 'OnabotulinumtoxinA', 'Opioids'],
        interventions: ['Occipital Nerve Block', 'SPG Block', 'Trigeminal Neuromodulation', 'Vagus Neuromodulation'],
        otherCare: ['Headache Diary', 'Medication Limit Protocol', 'Trigger Management'],
        pharmacologicalProphylaxis: ['Erenumab', 'Galcanezumab', 'Fremanezumab', 'Eptinezumab', 'Atogepant', 'Rimegepant', 'Propranolol', 'Topiramate', 'Amitriptyline', 'Flunarizine', 'OnabotulinumtoxinA'],
        proceduralDevice: ['Trigeminal Neuromodulation', 'Vagus Neuromodulation', 'Occipital Nerve Block'],
        lifestyleRehabMonitoring: ['Headache Diary', 'Trigger Management', 'Sleep Hygiene', 'Aerobic Exercise'],
    }),
    defineCondition('cond_tension_headache', 'Tension Headache', ['Headache & Pain'], {
        timeWindows: ['Acute Attack', 'Chronic Phase'],
        drugs: ['Paracetamol', 'Ibuprofen', 'Naproxen', 'Aspirin', 'Amitriptyline', 'Mirtazapine', 'Opioids', 'Triptans'],
        interventions: ['Trigger Point Injections', 'Acupuncture'],
        otherCare: ['CBT Therapy'],
        pharmacologicalProphylaxis: ['Amitriptyline', 'Mirtazapine'],
        proceduralDevice: ['Acupuncture', 'Trigger Point Injections'],
        lifestyleRehabMonitoring: ['CBT Therapy', 'Stress Reduction', 'Physical Therapy', 'Ergonomic Correction'],
    }),
    defineCondition('cond_cluster_headache', 'Cluster Headache', ['Headache & Pain'], {
        timeWindows: ['Acute Bout (< 15 min)', 'Active Cluster Period', 'Chronic Prophylaxis'],
        drugs: ['High-Flow Oxygen', 'Sumatriptan Subcutaneous', 'Zolmitriptan Nasal', 'Prednisone', 'Verapamil', 'Lithium', 'Galcanezumab'],
        interventions: ['Occipital Nerve Block', 'Vagus Neuromodulation', 'Hypothalamic DBS'],
        otherCare: ['ECG PR Surveillance', 'Alcohol Cessation'],
        pharmacologicalProphylaxis: ['Verapamil', 'Lithium', 'Galcanezumab', 'Prednisone'],
        proceduralDevice: ['Hypothalamic DBS', 'Occipital Nerve Block', 'Vagus Neuromodulation'],
        lifestyleRehabMonitoring: ['Alcohol Cessation', 'ECG PR Surveillance', 'Sleep Hygiene'],
    }),
    defineCondition('cond_trigeminal_neuralgia', 'Trigeminal Neuralgia', ['Headache & Pain'], {
        timeWindows: ['Paroxysmal Pain Bout', 'Remission Phase', 'Refractory Stage'],
        drugs: ['Carbamazepine', 'Oxcarbazepine', 'Lamotrigine', 'Baclofen', 'Gabapentin', 'Fosphenytoin'],
        interventions: ['Microvascular Decompression', 'Balloon Compression', 'Glycerol Rhizotomy', 'RF Thermocoagulation', 'Stereotactic Radiosurgery'],
        otherCare: ['Sodium Surveillance', 'Trigger Management'],
        pharmacologicalProphylaxis: ['Carbamazepine', 'Oxcarbazepine', 'Lamotrigine', 'Baclofen'],
        proceduralDevice: ['Microvascular Decompression', 'Stereotactic Radiosurgery', 'Balloon Compression'],
        lifestyleRehabMonitoring: ['Sodium Surveillance', 'Trigger Management', 'Dental Hygiene Care'],
    }),
    defineCondition('cond_secondary_headaches', 'Secondary Headaches', ['Headache & Pain'], {
        timeWindows: ['Acute Emergency', 'Maintenance Phase'],
        drugs: ['Acetazolamide', 'Topiramate', 'Methylprednisolone', 'Tocilizumab', 'Caffeine IV', 'Nimodipine'],
        interventions: ['Venous Sinus Stenting', 'Epidural Blood Patch', 'Optic Nerve Fenestration', 'VP Shunt'],
        otherCare: ['Visual Field Tracking', 'Weight Optimization'],
        pharmacologicalProphylaxis: ['Acetazolamide', 'Topiramate', 'Tocilizumab'],
        proceduralDevice: ['Venous Sinus Stenting', 'Epidural Blood Patch', 'VP Shunt'],
        lifestyleRehabMonitoring: ['Visual Field Tracking', 'Weight Optimization', 'ICP Monitoring'],
    }),
    defineCondition('cond_moh', 'Medication Overuse Headache', ['Headache & Pain'], {
        timeWindows: ['Withdrawal (Day 1–14)', 'Consolidation Phase'],
        drugs: ['Drug Discontinuation', 'Naproxen Bridge', 'Prednisone', 'Amitriptyline', 'Topiramate', 'CGRP mAbs'],
        interventions: ['Occipital Nerve Block'],
        otherCare: ['Withdrawal Protocol', 'Headache Diary'],
        pharmacologicalProphylaxis: ['Topiramate', 'Amitriptyline', 'CGRP mAbs', 'OnabotulinumtoxinA'],
        proceduralDevice: ['Occipital Nerve Block'],
        lifestyleRehabMonitoring: ['Medication Limit Protocol', 'Relapse Education', 'Headache Diary'],
    }),
    defineCondition('cond_headache_other', 'Other (Headache & Pain)', ['Headache & Pain'], {
        timeWindows: ['Acute Neuropathic Flare', 'Intractable Chronic Pain'],
        drugs: ['Ketamine Infusion', 'Lidocaine Infusion', 'Duloxetine', 'Capsaicin Patch', 'Buprenorphine Patch', 'Gabapentin', 'Pregabalin'],
        interventions: ['Spinal Cord Stimulation', 'Intrathecal Drug Pump', 'Stellate Ganglion Block'],
        otherCare: ['Pain Rehabilitation', 'CRPS Physical Therapy'],
        pharmacologicalProphylaxis: ['Duloxetine', 'Gabapentin', 'Pregabalin', 'Capsaicin Patch'],
        proceduralDevice: ['Spinal Cord Stimulation', 'Intrathecal Drug Pump'],
        lifestyleRehabMonitoring: ['Pain Rehabilitation', 'CRPS Physical Therapy', 'Palliative Care'],
    }),

    // ------------------------------------------------------------------------
    // 4.9. CNS INFECTIONS (7 Conditions)
    // ------------------------------------------------------------------------
    defineCondition('cond_cns_bacteria', 'Bacteria', ['CNS Infections'], {
        timeWindows: ['Door-to-Antibiotic (< 1h)', 'Acute Phase (Day 1–21)', 'Complication Phase'],
        drugs: ['Ceftriaxone', 'Cefotaxime', 'Vancomycin', 'Ampicillin', 'Dexamethasone', 'Meropenem', 'Metronidazole', 'Linezolid', 'Rifampicin', 'Intraventricular Colistin', 'Ciprofloxacin'],
        interventions: ['Abscess Aspiration', 'Abscess Excision', 'EVD'],
        otherCare: ['Droplet Isolation', 'Contact Prophylaxis', 'ICP Monitoring'],
        pharmacologicalProphylaxis: ['Rifampicin', 'Ciprofloxacin', 'Ceftriaxone'],
        proceduralDevice: ['Cochlear Implantation', 'VP Shunt'],
        lifestyleRehabMonitoring: ['Contact Prophylaxis', 'Meningococcal Vaccine', 'Audiology Tracking'],
    }),
    defineCondition('cond_cns_virus', 'Virus', ['CNS Infections'], {
        timeWindows: ['Hyperacute (< 2h)', 'Active Therapy (Day 1–21)'],
        drugs: ['Acyclovir IV', 'Valacyclovir', 'Ganciclovir', 'Foscarnet', 'Antiretroviral Therapy', 'Levetiracetam', 'Mannitol'],
        interventions: ['EVD'],
        otherCare: ['Renal Hydration Care', 'Continuous EEG', 'ICP Monitoring'],
        pharmacologicalProphylaxis: ['Valacyclovir', 'Antiretroviral Therapy'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Neuralgia Prophylaxis', 'Cognitive Rehab', 'HSV PCR Tracking'],
    }),
    defineCondition('cond_cns_tb', 'Tuberculosis', ['CNS Infections'], {
        timeWindows: ['Immediate (< 24h)', 'Intensive (Month 1–2)', 'Continuation (Month 3–12)'],
        drugs: ['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol', 'Dexamethasone', 'Levofloxacin', 'Pyridoxine'],
        interventions: ['VP Shunt', 'Endoscopic Ventriculostomy'],
        otherCare: ['Sodium Optimization', 'Hepatic Surveillance'],
        pharmacologicalProphylaxis: ['Isoniazid', 'Rifampicin', 'Pyridoxine'],
        proceduralDevice: ['VP Shunt'],
        lifestyleRehabMonitoring: ['Hepatic Surveillance', 'Visual Field Tracking', 'Contact Prophylaxis'],
    }),
    defineCondition('cond_cns_fungal', 'Fungal', ['CNS Infections'], {
        timeWindows: ['Induction (Week 1–4)', 'Consolidation (Week 3–10)', 'Maintenance (> 10 Weeks)'],
        drugs: ['Liposomal Amphotericin B', 'Flucytosine', 'Fluconazole', 'Voriconazole', 'Posaconazole', 'Isavuconazole'],
        interventions: ['Serial Lumbar Puncture', 'Surgical Debridement', 'Lumbar Drain', 'VP Shunt'],
        otherCare: ['ART Delay Protocol', 'IRIS Surveillance'],
        pharmacologicalProphylaxis: ['Fluconazole', 'Voriconazole'],
        proceduralDevice: ['VP Shunt'],
        lifestyleRehabMonitoring: ['Suppressive Antifungals', 'CD4 Cell Tracking', 'IRIS Surveillance'],
    }),
    defineCondition('cond_cns_parasitic', 'Parasitic', ['CNS Infections'], {
        timeWindows: ['Acute Encephalitic Window', 'Anti-Parasitic Initiation'],
        drugs: ['Albendazole', 'Praziquantel', 'Dexamethasone', 'Pyrimethamine', 'Sulfadiazine', 'Leucovorin', 'Artesunate IV', 'Cotrimoxazole'],
        interventions: ['Endoscopic Cyst Removal', 'EVD'],
        otherCare: ['Fundoscopy Eye Screen', 'Anticonvulsants'],
        pharmacologicalProphylaxis: ['Cotrimoxazole', 'Albendazole'],
        proceduralDevice: ['VP Shunt'],
        lifestyleRehabMonitoring: ['Food Hygiene Care', 'ASM Tapering Protocol', 'Brain MRI Tracking'],
    }),
    defineCondition('cond_neurosyphilis', 'Neurosyphilis', ['CNS Infections'], {
        timeWindows: ['Acute CSF Positive', 'Follow-up (Month 3–6)'],
        drugs: ['Aqueous Penicillin G', 'Ceftriaxone', 'Procaine Penicillin', 'Probenecid'],
        interventions: [],
        otherCare: ['Herxheimer Surveillance', 'Serial CSF Tracking', 'HIV Screening'],
        pharmacologicalProphylaxis: ['Aqueous Penicillin G', 'Ceftriaxone'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Serial CSF Tracking', 'Partner Notification', 'HIV Screening'],
    }),
    defineCondition('cond_cns_infection_other', 'Other (CNS Infections)', ['CNS Infections'], {
        timeWindows: ['Empirical Phase', 'Maintenance'],
        drugs: ['Doxycycline', 'Rifabutin', 'Clarithromycin'],
        interventions: [],
        otherCare: ['Prion Decontamination', 'Lyme Serology Protocol'],
        pharmacologicalProphylaxis: ['Doxycycline'],
        proceduralDevice: [],
        lifestyleRehabMonitoring: ['Tick Bite Prevention', 'Prion Decontamination', 'Droplet Isolation'],
    }),

    // ------------------------------------------------------------------------
    // 4.10. NEURO-ONCOLOGY (8 Conditions — includes shared `cond_paraneoplastic`)
    // ------------------------------------------------------------------------
    defineCondition('cond_gliomas', 'Gliomas', ['Neuro-Oncology'], {
        timeWindows: ['Surgical Window', 'Radiochemotherapy Phase', 'Adjuvant Phase', 'Recurrence Phase'],
        drugs: ['Dexamethasone', 'Temozolomide', 'Vorasidenib', 'Lomustine', 'Bevacizumab', 'Procarbazine', 'Vincristine', 'Levetiracetam', 'Cotrimoxazole'],
        interventions: ['Maximal Safe Resection', 'Fluorescence Surgery', 'Awake Brain Mapping', 'TTFields', 'Stereotactic Radiosurgery'],
        otherCare: ['IDH/1p19q Profiling', 'DVT Surveillance'],
        pharmacologicalProphylaxis: ['Temozolomide', 'Vorasidenib', 'Levetiracetam', 'Cotrimoxazole'],
        proceduralDevice: ['TTFields', 'Stereotactic Radiosurgery'],
        lifestyleRehabMonitoring: ['Brain MRI Tracking', 'Cognitive Rehab', 'Seizure Tracking'],
    }),
    defineCondition('cond_meningioma', 'Meningioma', ['Neuro-Oncology'], {
        timeWindows: ['Pre-Surgical Phase', 'Resection Phase', 'Adjuvant Radiation'],
        drugs: ['Dexamethasone', 'Hydroxyurea'],
        interventions: ['Simpson Resection', 'Preop Embolization', 'Stereotactic Radiosurgery', 'Fractionated Radiotherapy'],
        otherCare: ['Cranial Nerve Monitoring', 'Brain MRI Tracking'],
        pharmacologicalProphylaxis: [],
        proceduralDevice: ['Stereotactic Radiosurgery', 'Fractionated Radiotherapy'],
        lifestyleRehabMonitoring: ['Brain MRI Tracking', 'Cranial Nerve Rehab', 'Visual Surveillance'],
    }),
    defineCondition('cond_pcnsl', 'Lymphoma', ['Neuro-Oncology'], {
        timeWindows: ['Pre-Biopsy Window', 'Induction Phase', 'Consolidation Phase'],
        drugs: ['High-Dose Methotrexate', 'Cytarabine', 'Thiotepa', 'Rituximab', 'Leucovorin', 'Ibrutinib', 'Cotrimoxazole', 'Corticosteroids'],
        interventions: ['Stereotactic Biopsy', 'Autologous SCT'],
        otherCare: ['Slit-Lamp Surveillance'],
        pharmacologicalProphylaxis: ['Rituximab', 'Ibrutinib', 'Cotrimoxazole'],
        proceduralDevice: ['Autologous SCT'],
        lifestyleRehabMonitoring: ['Brain MRI Tracking', 'Cognitive Rehab', 'Infection Prophylaxis'],
    }),
    defineCondition('cond_brain_metastases', 'Brain Metastases', ['Neuro-Oncology'], {
        timeWindows: ['Presentation Window', 'Local Control Phase', 'Systemic Control Phase'],
        drugs: ['Dexamethasone', 'Osimertinib', 'Alectinib', 'Lorlatinib', 'Tucatinib', 'Dabrafenib', 'Trametinib', 'Nivolumab', 'Ipilimumab', 'Pembrolizumab', 'Trastuzumab Deruxtecan'],
        interventions: ['Stereotactic Radiosurgery', 'Whole-Brain Radiotherapy', 'Surgical Metastasectomy', 'Hippocampal Sparing WBRT'],
        otherCare: ['Radionecrosis Tracking', 'Oncology Alignment'],
        pharmacologicalProphylaxis: ['Osimertinib', 'Alectinib', 'Targeted TKI Therapy'],
        proceduralDevice: ['Stereotactic Radiosurgery', 'Whole-Brain Radiotherapy'],
        lifestyleRehabMonitoring: ['Brain MRI Tracking', 'Radionecrosis Tracking', 'Oncology Alignment'],
    }),
    defineCondition('cond_pituitary_adenoma', 'Pituitary Adenoma', ['Neuro-Oncology'], {
        timeWindows: ['Acute Apoplexy Window', 'Elective Surgical Phase', 'Maintenance Phase'],
        drugs: ['Hydrocortisone', 'Cabergoline', 'Bromocriptine', 'Octreotide', 'Pasireotide', 'Endocrine Repletion'],
        interventions: ['Endonasal Resection', 'Stereotactic Radiosurgery'],
        otherCare: ['Visual Surveillance', 'Endocrine Profiling'],
        pharmacologicalProphylaxis: ['Cabergoline', 'Octreotide', 'Endocrine Repletion'],
        proceduralDevice: ['Stereotactic Radiosurgery'],
        lifestyleRehabMonitoring: ['Brain MRI Tracking', 'Visual Field Tracking', 'Endocrine Profiling'],
    }),
    defineCondition('cond_spinal_tumors', 'Spinal Cord Tumors', ['Neuro-Oncology'], {
        timeWindows: ['Emergency (< 24h)', 'Surgical Phase', 'Radiotherapy Phase'],
        drugs: ['Dexamethasone', 'Central Analgesics'],
        interventions: ['Surgical Decompression', 'Spine Stabilization', 'Spine Radiosurgery'],
        otherCare: ['Neurologic Checks', 'Bladder Care'],
        pharmacologicalProphylaxis: ['Dexamethasone', 'Central Analgesics'],
        proceduralDevice: ['Spine Radiosurgery', 'Spine Stabilization'],
        lifestyleRehabMonitoring: ['Spinal Cord Rehab', 'Bladder Care', 'Spine MRI Tracking'],
    }),
    defineCondition('cond_neuroonc_other', 'Other (Neuro-Oncology)', ['Neuro-Oncology'], {
        timeWindows: ['Leptomeningeal Onset', 'Palliative Terminal Phase'],
        drugs: ['Intrathecal Methotrexate', 'Intrathecal Cytarabine', 'Megestrol', 'Haloperidol'],
        interventions: ['Ommaya Reservoir', 'Shunt Revision'],
        otherCare: ['CSF Cytology Tracking', 'Palliative Care'],
        pharmacologicalProphylaxis: ['Intrathecal Methotrexate', 'Intrathecal Cytarabine'],
        proceduralDevice: ['Ommaya Reservoir'],
        lifestyleRehabMonitoring: ['CSF Cytology Tracking', 'Leukoencephalopathy Care', 'Hospice Care'],
    }),
];

// ============================================================================
// HELPER FUNCTIONS FOR QUERY ENGINE & FILTER SIDEBAR
// ============================================================================

export function getConditionsForSubspecialtyV3(subspecialty: Subspecialty | 'all'): ClinicalConditionV3[] {
    if (subspecialty === 'all') {
        return CLINICAL_CONDITIONS_V3;
    }
    return CLINICAL_CONDITIONS_V3.filter((c) => c.subspecialties.includes(subspecialty));
}

export function getConditionsForSubspecialtiesV3(subspecialties: (Subspecialty | string)[]): ClinicalConditionV3[] {
    const valid = subspecialties.filter((s) => s && s !== 'all' && s !== 'All Subspecialties');
    if (valid.length === 0) {
        return CLINICAL_CONDITIONS_V3;
    }
    return CLINICAL_CONDITIONS_V3.filter((c) => c.subspecialties.some((s) => valid.includes(s as Subspecialty)));
}

export function getConditionByIdV3(conditionId: string): ClinicalConditionV3 | undefined {
    return CLINICAL_CONDITIONS_V3.find((c) => c.id === conditionId);
}

export function getAllDiagnosisTagsV3(): TaxonomyTagV3[] {
    return DIAGNOSIS_CATEGORIES_V3.flatMap((cat) => cat.items);
}

/**
 * Returns aggregated or condition-specific Treatment schema.
 * When `conditionId === 'all'`, merges unique tags across all conditions in the selected subspecialty.
 */
export function getTreatmentSchemaForScopeV3(
    subspecialty: Subspecialty | 'all',
    conditionId: string | 'all'
): ConditionTreatmentSchemaV3 {
    return getTreatmentSchemaForScopesV3(
        subspecialty === 'all' ? [] : [subspecialty],
        conditionId === 'all' ? [] : [conditionId]
    );
}

export function getTreatmentSchemaForScopesV3(
    subspecialties: (Subspecialty | string)[],
    conditionIds: string[]
): ConditionTreatmentSchemaV3 {
    const validCondIds = conditionIds.filter((c) => c && c !== 'all');
    if (validCondIds.length > 0) {
        const conditions = validCondIds.map((id) => getConditionByIdV3(id)).filter(Boolean) as ClinicalConditionV3[];
        const dedupe = (items: TaxonomyTagV3[]) => {
            const seen = new Map<string, TaxonomyTagV3>();
            for (const item of items) {
                if (!seen.has(item.id)) seen.set(item.id, item);
            }
            return Array.from(seen.values());
        };
        return {
            timeWindows: dedupe(conditions.flatMap((c) => c.treatment.timeWindows)),
            drugs: dedupe(conditions.flatMap((c) => c.treatment.drugs)),
            interventions: dedupe(conditions.flatMap((c) => c.treatment.interventions)),
            otherCare: dedupe(conditions.flatMap((c) => c.treatment.otherCare)),
        };
    }

    const conditions = getConditionsForSubspecialtiesV3(subspecialties);
    const dedupe = (items: TaxonomyTagV3[]) => {
        const seen = new Map<string, TaxonomyTagV3>();
        for (const item of items) {
            if (!seen.has(item.id)) seen.set(item.id, item);
        }
        return Array.from(seen.values());
    };

    return {
        timeWindows: dedupe(conditions.flatMap((c) => c.treatment.timeWindows)),
        drugs: dedupe(conditions.flatMap((c) => c.treatment.drugs)),
        interventions: dedupe(conditions.flatMap((c) => c.treatment.interventions)),
        otherCare: dedupe(conditions.flatMap((c) => c.treatment.otherCare)),
    };
}

/**
 * Returns aggregated or condition-specific Prevention & Secondary Care schema.
 * When `conditionId === 'all'`, merges unique tags across all conditions in the selected subspecialty.
 */
export function getPreventionSchemaForScopeV3(
    subspecialty: Subspecialty | 'all',
    conditionId: string | 'all'
): ConditionPreventionSchemaV3 {
    return getPreventionSchemaForScopesV3(
        subspecialty === 'all' ? [] : [subspecialty],
        conditionId === 'all' ? [] : [conditionId]
    );
}

export function getPreventionSchemaForScopesV3(
    subspecialties: (Subspecialty | string)[],
    conditionIds: string[]
): ConditionPreventionSchemaV3 {
    const validCondIds = conditionIds.filter((c) => c && c !== 'all');
    if (validCondIds.length > 0) {
        const conditions = validCondIds.map((id) => getConditionByIdV3(id)).filter(Boolean) as ClinicalConditionV3[];
        const dedupe = (items: TaxonomyTagV3[]) => {
            const seen = new Map<string, TaxonomyTagV3>();
            for (const item of items) {
                if (!seen.has(item.id)) seen.set(item.id, item);
            }
            return Array.from(seen.values());
        };
        return {
            pharmacologicalProphylaxis: dedupe(conditions.flatMap((c) => c.prevention.pharmacologicalProphylaxis)),
            proceduralDevice: dedupe(conditions.flatMap((c) => c.prevention.proceduralDevice)),
            lifestyleRehabMonitoring: dedupe(conditions.flatMap((c) => c.prevention.lifestyleRehabMonitoring)),
        };
    }

    const conditions = getConditionsForSubspecialtiesV3(subspecialties);
    const dedupe = (items: TaxonomyTagV3[]) => {
        const seen = new Map<string, TaxonomyTagV3>();
        for (const item of items) {
            if (!seen.has(item.id)) seen.set(item.id, item);
        }
        return Array.from(seen.values());
    };

    return {
        pharmacologicalProphylaxis: dedupe(conditions.flatMap((c) => c.prevention.pharmacologicalProphylaxis)),
        proceduralDevice: dedupe(conditions.flatMap((c) => c.prevention.proceduralDevice)),
        lifestyleRehabMonitoring: dedupe(conditions.flatMap((c) => c.prevention.lifestyleRehabMonitoring)),
    };
}

/**
 * Lookup map of all canonical tag IDs -> display label across Diagnosis, Treatment, and Prevention.
 */
const TAG_LABEL_CACHE = new Map<string, string>();

function ensureTagCache() {
    if (TAG_LABEL_CACHE.size > 0) return;
    for (const cat of DIAGNOSIS_CATEGORIES_V3) {
        for (const item of cat.items) {
            TAG_LABEL_CACHE.set(item.id, item.label);
        }
    }
    for (const cond of CLINICAL_CONDITIONS_V3) {
        for (const tw of cond.treatment.timeWindows) TAG_LABEL_CACHE.set(tw.id, tw.label);
        for (const d of cond.treatment.drugs) TAG_LABEL_CACHE.set(d.id, d.label);
        for (const i of cond.treatment.interventions) TAG_LABEL_CACHE.set(i.id, i.label);
        for (const o of cond.treatment.otherCare) TAG_LABEL_CACHE.set(o.id, o.label);
        for (const p of cond.prevention.pharmacologicalProphylaxis) TAG_LABEL_CACHE.set(p.id, p.label);
        for (const pr of cond.prevention.proceduralDevice) TAG_LABEL_CACHE.set(pr.id, pr.label);
        for (const l of cond.prevention.lifestyleRehabMonitoring) TAG_LABEL_CACHE.set(l.id, l.label);
    }
}

export function getTagLabelByIdV3(tagId: string): string {
    ensureTagCache();
    return TAG_LABEL_CACHE.get(tagId) || tagId;
}
