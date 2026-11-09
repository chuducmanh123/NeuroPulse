import type {
    GuidelineDoc,
    PracticeChangeDetail,
    RecommendationV3Labels,
    NormalizedTier,
    SubspecialtyType,
    PivotalTrialRecord,
} from '../../types/neuroguide.ts';
import {
    CLINICAL_CONDITIONS_V3,
    DIAGNOSIS_CATEGORIES_V3,
    toCanonicalTagId,
    toTimeWindowId,
    getConditionByIdV3,
} from '../../data/clinicalNavigatorTaxonomyV3.ts';
import { computeNormalizedTierFromGrade } from './ontologyValidator.ts';

interface KeywordRule {
    id: string;
    patterns: RegExp[];
}

// ============================================================================
// 1. CONDITION CLASSIFICATION RULES (69 Unique Canonical Conditions)
// ============================================================================

const CONDITION_RULES: { id: string; subspecialties: SubspecialtyType[]; patterns: RegExp[] }[] = [
    // Stroke
    {
        id: 'cond_tia',
        subspecialties: ['Stroke'],
        patterns: [/\btia\b/i, /\btransient isch(?:a)?emic attack/i, /\babcd2\b/i],
    },
    {
        id: 'cond_ich',
        subspecialties: ['Stroke'],
        patterns: [
            /\bich\b/i,
            /\bintracerebral h(?:a)?emorrhage/i,
            /\bspontaneous intracerebral/i,
            /\bintraparenchymal h(?:a)?emorrhage/i,
            /\bhematoma expansion/i,
            /\bcerebral amyloid angiopathy/i,
            /\bcaa\b/i,
        ],
    },
    {
        id: 'cond_sah',
        subspecialties: ['Stroke'],
        patterns: [
            /\basah\b/i,
            /\bsah\b/i,
            /\bsubarachnoid h(?:a)?emorrhage/i,
            /\bruptured aneurysm/i,
            /\baneurysmal subarachnoid/i,
            /\bcerebral vasospasm/i,
            /\bdelayed cerebral isch(?:a)?emia/i,
        ],
    },
    {
        id: 'cond_cvt',
        subspecialties: ['Stroke'],
        patterns: [
            /\bcvt\b/i,
            /\bcerebral venous thrombosis/i,
            /\bdural venous sinus thrombosis/i,
            /\bcerebral venous sinus/i,
        ],
    },
    {
        id: 'cond_carotid',
        subspecialties: ['Stroke'],
        patterns: [
            /\bcarotid stenosis/i,
            /\bcarotid artery disease/i,
            /\bcarotid endarterectomy/i,
            /\basymptomatic carotid/i,
            /\bsymptomatic carotid/i,
            /\bextracranial carotid/i,
            /\btcar\b/i,
        ],
    },
    {
        id: 'cond_stroke_other',
        subspecialties: ['Stroke'],
        patterns: [
            /\bstroke-associated pneumonia/i,
            /\bsap\b.*pneumonia/i,
            /\bpost-stroke depression/i,
            /\bpost-stroke pain/i,
            /\bcentral post-stroke/i,
            /\bdeep vein thrombosis.*stroke/i,
        ],
    },
    {
        id: 'cond_ischemic_stroke',
        subspecialties: ['Stroke'],
        patterns: [
            /\bisch(?:a)?emic stroke/i,
            /\bais\b/i,
            /\blarge vessel occlusion/i,
            /\blvo\b/i,
            /\bthrombolysis/i,
            /\btenecteplase/i,
            /\balteplase/i,
            /\bthrombectomy/i,
            /\baspects\b/i,
            /\batrial fibrillation/i,
            /\bleft atrial appendage/i,
            /\blaao\b/i,
            /\bpatent foramen ovale/i,
            /\bpfo closure/i,
            /\bcardioembolic/i,
            /\bprimary prevention of stroke/i,
            /\baphasia rehabilitation/i,
            /\bmotor rehabilitation/i,
            /\bvisual impairment in stroke/i,
        ],
    },

    // Neurocritical Care
    {
        id: 'cond_status_epilepticus',
        subspecialties: ['Neurocritical Care', 'Epilepsy'],
        patterns: [
            /\bstatus epilepticus/i,
            /\brse\b/i,
            /\bsrse\b/i,
            /\bnorse\b/i,
            /\brefractory status/i,
            /\bconvulsive status/i,
            /\bnonconvulsive status/i,
        ],
    },
    {
        id: 'cond_cerebral_edema',
        subspecialties: ['Neurocritical Care'],
        patterns: [
            /\bcerebral edema/i,
            /\bbrain edema/i,
            /\bintracranial hypertension/i,
            /\belevated icp\b/i,
            /\braised intracranial pressure/i,
            /\bmalignant mca/i,
            /\bherniation/i,
            /\bosmotherapy/i,
        ],
    },
    {
        id: 'cond_acute_nm_failure',
        subspecialties: ['Neurocritical Care'],
        patterns: [
            /\bacute neuromuscular respiratory/i,
            /\bneuromuscular respiratory failure/i,
            /\bnegative inspiratory force/i,
            /\bmyasthenic crisis.*intubation/i,
        ],
    },
    {
        id: 'cond_ncc_other',
        subspecialties: ['Neurocritical Care'],
        patterns: [
            /\bicu delirium/i,
            /\bpost-intensive care syndrome/i,
            /\bneurocritical care.*sepsis/i,
            /\bventilator weaning.*icu/i,
        ],
    },

    // Epilepsy
    {
        id: 'cond_new_onset_seizure',
        subspecialties: ['Epilepsy'],
        patterns: [
            /\bnew-onset seizure/i,
            /\bfirst unprovoked seizure/i,
            /\bfirst seizure/i,
            /\bnewly diagnosed epilepsy/i,
        ],
    },
    {
        id: 'cond_dre',
        subspecialties: ['Epilepsy'],
        patterns: [
            /\bdrug-resistant epilepsy/i,
            /\bpharmacoresistant epilepsy/i,
            /\brefractory epilepsy/i,
            /\bepilepsy surgery/i,
            /\btemporal lobectomy/i,
            /\bcenobamate/i,
            /\bsudep\b/i,
        ],
    },
    {
        id: 'cond_epilepsy_syndromes',
        subspecialties: ['Epilepsy'],
        patterns: [
            /\bdravet/i,
            /\blennox-gastaut/i,
            /\binfantile spasms/i,
            /\bwest syndrome/i,
            /\babsence epilepsy/i,
            /\bjuvenile myoclonic/i,
            /\bfenfluramine/i,
            /\bstiripentol/i,
            /\bvigabatrin/i,
        ],
    },
    {
        id: 'cond_epilepsy_other',
        subspecialties: ['Epilepsy'],
        patterns: [
            /\bteratogen/i,
            /\bchildbearing potential/i,
            /\bpregnancy.*epilepsy/i,
            /\bpregnancy.*antiseizure/i,
            /\bseizure cluster/i,
            /\bacute repetitive seizures/i,
        ],
    },

    // Dementia & Movement Disorders (including Multi-Parent `cond_lbd`)
    {
        id: 'cond_lbd',
        subspecialties: ['Dementia', 'Movement Disorders'],
        patterns: [
            /\blewy body/i,
            /\bdlb\b/i,
            /\bdementia with lewy bodies/i,
            /\bpimavanserin.*lewy/i,
        ],
    },
    {
        id: 'cond_alzheimer',
        subspecialties: ['Dementia'],
        patterns: [
            /\balzheimer/i,
            /\blecanemab/i,
            /\bdonanemab/i,
            /\banti-amyloid/i,
            /\baria-e\b/i,
            /\baria-h\b/i,
        ],
    },
    {
        id: 'cond_vascular_dementia',
        subspecialties: ['Dementia'],
        patterns: [
            /\bvascular dementia/i,
            /\bvascular cognitive impairment/i,
            /\bvci\b/i,
            /\bpost-stroke dementia/i,
        ],
    },
    {
        id: 'cond_ftd',
        subspecialties: ['Dementia'],
        patterns: [
            /\bfrontotemporal dementia/i,
            /\bbvftd\b/i,
            /\bprimary progressive aphasia/i,
            /\bftd\b/i,
        ],
    },
    {
        id: 'cond_nph',
        subspecialties: ['Dementia'],
        patterns: [
            /\bnormal pressure hydrocephalus/i,
            /\binph\b/i,
            /\bnph\b/i,
            /\bhakim triad/i,
        ],
    },
    {
        id: 'cond_mci',
        subspecialties: ['Dementia'],
        patterns: [/\bmild cognitive impairment/i, /\bmci\b/i],
    },
    {
        id: 'cond_cjd',
        subspecialties: ['Dementia'],
        patterns: [
            /\bcreutzfeldt-jakob/i,
            /\bcjd\b/i,
            /\bprion disease/i,
            /\brt-quic\b/i,
        ],
    },
    {
        id: 'cond_dementia_other',
        subspecialties: ['Dementia'],
        patterns: [/\bwernicke encephalopathy/i, /\breversible dementia/i],
    },

    // Neuroimmunology & Neuro-Oncology (including Multi-Parent `cond_paraneoplastic`)
    {
        id: 'cond_paraneoplastic',
        subspecialties: ['Neuroimmunology', 'Neuro-Oncology'],
        patterns: [
            /\bparaneoplastic/i,
            /\banti-hu\b/i,
            /\banti-yo\b/i,
            /\banti-ri\b/i,
            /\banti-ma2\b/i,
            /\bonconeural/i,
        ],
    },
    {
        id: 'cond_ms',
        subspecialties: ['Neuroimmunology'],
        patterns: [
            /\bmultiple sclerosis/i,
            /\brrms\b/i,
            /\bspms\b/i,
            /\bppms\b/i,
            /\bocrelizumab/i,
            /\bofatumumab/i,
            /\bnatalizumab/i,
            /\bmcdonald criteria/i,
        ],
    },
    {
        id: 'cond_nmosd',
        subspecialties: ['Neuroimmunology'],
        patterns: [
            /\bnmosd\b/i,
            /\bneuromyelitis optica/i,
            /\baqp4\b/i,
            /\baquaporin-4/i,
            /\bsatralizumab/i,
            /\binebilizumab/i,
        ],
    },
    {
        id: 'cond_mogad',
        subspecialties: ['Neuroimmunology'],
        patterns: [
            /\bmogad\b/i,
            /\bmog antibody/i,
            /\bmyelin oligodendrocyte glycoprotein/i,
        ],
    },
    {
        id: 'cond_autoimmune_encephalitis',
        subspecialties: ['Neuroimmunology'],
        patterns: [
            /\bautoimmune encephalitis/i,
            /\banti-nmda/i,
            /\bnmdar\b/i,
            /\blgi1\b/i,
            /\bcaspr2\b/i,
            /\bovarian teratoma/i,
        ],
    },
    {
        id: 'cond_cns_vasculitis',
        subspecialties: ['Neuroimmunology'],
        patterns: [
            /\bcns vasculitis/i,
            /\bprimary angiitis of the cns/i,
            /\bpacns\b/i,
            /\bcerebral vasculitis/i,
        ],
    },
    {
        id: 'cond_neuroimm_other',
        subspecialties: ['Neuroimmunology'],
        patterns: [/\badem\b/i, /\bacute disseminated encephalomyelitis/i, /\bneuro-sarcoidosis/i],
    },

    // Neuromuscular
    {
        id: 'cond_als',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\bamyotrophic lateral sclerosis/i,
            /\bals\b/i,
            /\bmotor neuron disease/i,
            /\briluzole/i,
            /\bedaravone/i,
            /\btofersen/i,
        ],
    },
    {
        id: 'cond_gbs',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\bguillain-barr[eé]/i,
            /\bgbs\b/i,
            /\baidp\b/i,
            /\baman\b/i,
            /\bmiller fisher/i,
        ],
    },
    {
        id: 'cond_cidp',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\bcidp\b/i,
            /\bchronic inflammatory demyelinating polyradiculoneuropathy/i,
            /\bincat\b/i,
        ],
    },
    {
        id: 'cond_anti_mag',
        subspecialties: ['Neuromuscular'],
        patterns: [/\banti-mag\b/i, /\bmyelin-associated glycoprotein/i, /\bigm paraproteinemic/i],
    },
    {
        id: 'cond_mmn',
        subspecialties: ['Neuromuscular'],
        patterns: [/\bmultifocal motor neuropathy/i, /\bmmn\b/i, /\banti-gm1/i],
    },
    {
        id: 'cond_poems',
        subspecialties: ['Neuromuscular'],
        patterns: [/\bpoems\b/i, /\bosteosclerotic myeloma/i],
    },
    {
        id: 'cond_mg',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\bmyasthenia gravis/i,
            /\bmyasthenic/i,
            /\bachr\b/i,
            /\bmusk\b/i,
            /\befgartigimod/i,
            /\brozanolixizumab/i,
            /\bzilucoplan/i,
            /\bthymectomy/i,
            /\bpyridostigmine/i,
        ],
    },
    {
        id: 'cond_lems',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\blambert-eaton/i,
            /\blems\b/i,
            /\bamifampridine/i,
            /\bp\/q-type voltage-gated calcium/i,
        ],
    },
    {
        id: 'cond_myopathies',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\bdermatomyositis/i,
            /\bpolymyositis/i,
            /\bimmune-mediated necrotizing myopathy/i,
            /\bimnm\b/i,
            /\brhabdomyolysis/i,
            /\binflammatory myopath/i,
        ],
    },
    {
        id: 'cond_dpn',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\bdiabetic polyneuropathy/i,
            /\bdiabetic peripheral neuropathy/i,
            /\bpainful diabetic neuropathy/i,
            /\bdpn\b/i,
        ],
    },
    {
        id: 'cond_sma',
        subspecialties: ['Neuromuscular'],
        patterns: [
            /\bspinal muscular atrophy/i,
            /\bsma\b/i,
            /\bnusinersen/i,
            /\brisdiplam/i,
            /\bonasemnogene/i,
        ],
    },
    {
        id: 'cond_nm_other',
        subspecialties: ['Neuromuscular'],
        patterns: [/\bperiodic paralysis/i, /\bchannelopath/i, /\bmyotonia congenita/i],
    },

    // Movement Disorders
    {
        id: 'cond_parkinson',
        subspecialties: ['Movement Disorders'],
        patterns: [
            /\bparkinson(?:'s)? disease/i,
            /\bidiopatic parkinson/i,
            /\blevodopa-carbidopa/i,
            /\bmotor fluctuations/i,
            /\bpramipexole/i,
            /\brasagiline/i,
        ],
    },
    {
        id: 'cond_essential_tremor',
        subspecialties: ['Movement Disorders'],
        patterns: [
            /\bessential tremor/i,
            /\bprimidone/i,
            /\bmrgfus thalamotomy/i,
            /\bfocused ultrasound thalamotomy/i,
        ],
    },
    {
        id: 'cond_dystonia',
        subspecialties: ['Movement Disorders'],
        patterns: [
            /\bdystonia/i,
            /\bcervical dystonia/i,
            /\bblepharospasm/i,
            /\bstatus dystonicus/i,
        ],
    },
    {
        id: 'cond_msa',
        subspecialties: ['Movement Disorders'],
        patterns: [/\bmultiple system atrophy/i, /\bmsa-p\b/i, /\bmsa-c\b/i],
    },
    {
        id: 'cond_psp_cbd',
        subspecialties: ['Movement Disorders'],
        patterns: [
            /\bprogressive supranuclear palsy/i,
            /\bpsp\b/i,
            /\bcorticobasal degeneration/i,
            /\bcorticobasal syndrome/i,
            /\bcbd\b/i,
        ],
    },
    {
        id: 'cond_vascular_parkinsonism',
        subspecialties: ['Movement Disorders'],
        patterns: [/\bvascular parkinsonism/i, /\blower-body parkinsonism/i],
    },
    {
        id: 'cond_dip',
        subspecialties: ['Movement Disorders'],
        patterns: [/\bdrug-induced parkinsonism/i, /\btardive dyskinesia/i],
    },
    {
        id: 'cond_wilson',
        subspecialties: ['Movement Disorders'],
        patterns: [
            /\bwilson(?:'s)? disease/i,
            /\bhepatolenticular degeneration/i,
            /\bpenicillamine/i,
            /\btrientine/i,
            /\bkayser-fleischer/i,
        ],
    },
    {
        id: 'cond_huntington',
        subspecialties: ['Movement Disorders'],
        patterns: [
            /\bhuntington(?:'s)? disease/i,
            /\bchorea\b/i,
            /\bdeutetrabenazine/i,
            /\btetrabenazine/i,
        ],
    },
    {
        id: 'cond_movement_other',
        subspecialties: ['Movement Disorders'],
        patterns: [/\bspinocerebellar ataxia/i, /\bmyoclonus/i],
    },

    // Headache & Pain
    {
        id: 'cond_migraine',
        subspecialties: ['Headache & Pain'],
        patterns: [
            /\bmigraine/i,
            /\bsumatriptan/i,
            /\brimegepant/i,
            /\bubrogepant/i,
            /\berenumab/i,
            /\bgalcanezumab/i,
            /\bfremanezumab/i,
            /\batogepant/i,
        ],
    },
    {
        id: 'cond_tension_headache',
        subspecialties: ['Headache & Pain'],
        patterns: [/\btension-type headache/i, /\btension headache/i, /\btth\b/i],
    },
    {
        id: 'cond_cluster_headache',
        subspecialties: ['Headache & Pain'],
        patterns: [
            /\bcluster headache/i,
            /\btrigeminal autonomic cephalalgia/i,
            /\bhigh-flow oxygen/i,
        ],
    },
    {
        id: 'cond_trigeminal_neuralgia',
        subspecialties: ['Headache & Pain'],
        patterns: [
            /\btrigeminal neuralgia/i,
            /\bmicrovascular decompression/i,
            /\btic douloureux/i,
        ],
    },
    {
        id: 'cond_secondary_headaches',
        subspecialties: ['Headache & Pain'],
        patterns: [
            /\bidiopatic intracranial hypertension/i,
            /\biih\b/i,
            /\bpseudotumor cerebri/i,
            /\bspontaneous intracranial hypotension/i,
            /\bgiant cell arteritis/i,
            /\btemporal arteritis/i,
            /\bepidural blood patch/i,
        ],
    },
    {
        id: 'cond_moh',
        subspecialties: ['Headache & Pain'],
        patterns: [/\bmedication overuse headache/i, /\bmoh\b/i, /\brebound headache/i],
    },
    {
        id: 'cond_headache_other',
        subspecialties: ['Headache & Pain'],
        patterns: [/\bcomplex regional pain syndrome/i, /\bcrps\b/i, /\bintractable neuropathic pain/i],
    },

    // CNS Infections
    {
        id: 'cond_cns_bacteria',
        subspecialties: ['CNS Infections'],
        patterns: [
            /\bbacterial meningitis/i,
            /\bbrain abscess/i,
            /\bmeningococcal/i,
            /\bpneumococcal meningitis/i,
            /\blisteria/i,
        ],
    },
    {
        id: 'cond_cns_virus',
        subspecialties: ['CNS Infections'],
        patterns: [
            /\bviral encephalitis/i,
            /\bhsv encephalitis/i,
            /\bherpes simplex encephalitis/i,
            /\bviral meningitis/i,
            /\bacyclovir/i,
            /\bcmv encephalitis/i,
        ],
    },
    {
        id: 'cond_cns_tb',
        subspecialties: ['CNS Infections'],
        patterns: [
            /\btuberculous meningitis/i,
            /\btbm\b/i,
            /\bcns tuberculosis/i,
            /\btuberculoma/i,
            /\bisoniazid/i,
        ],
    },
    {
        id: 'cond_cns_fungal',
        subspecialties: ['CNS Infections'],
        patterns: [
            /\bcryptococcal meningitis/i,
            /\bcryptococcus/i,
            /\bfungal meningitis/i,
            /\bamphotericin b/i,
            /\bflucytosine/i,
        ],
    },
    {
        id: 'cond_cns_parasitic',
        subspecialties: ['CNS Infections'],
        patterns: [
            /\bneurocysticercosis/i,
            /\bcerebral toxoplasmosis/i,
            /\bcerebral malaria/i,
            /\balbendazole/i,
            /\bpraziquantel/i,
        ],
    },
    {
        id: 'cond_neurosyphilis',
        subspecialties: ['CNS Infections'],
        patterns: [/\bneurosyphilis/i, /\btreponema pallidum/i, /\bcsf-vdrl\b/i],
    },
    {
        id: 'cond_cns_infection_other',
        subspecialties: ['CNS Infections'],
        patterns: [/\blyme neuroborreliosis/i, /\bneuroborreliosis/i],
    },

    // Neuro-Oncology
    {
        id: 'cond_gliomas',
        subspecialties: ['Neuro-Oncology'],
        patterns: [
            /\bglioma/i,
            /\bglioblastoma/i,
            /\bgbm\b/i,
            /\bastrocytoma/i,
            /\boligodendroglioma/i,
            /\btemozolomide/i,
            /\bvorasidenib/i,
            /\bttfields\b/i,
        ],
    },
    {
        id: 'cond_meningioma',
        subspecialties: ['Neuro-Oncology'],
        patterns: [/\bmeningioma/i, /\bsimpson grade/i, /\bsimpson resection/i],
    },
    {
        id: 'cond_pcnsl',
        subspecialties: ['Neuro-Oncology'],
        patterns: [
            /\bprimary cns lymphoma/i,
            /\bpcnsl\b/i,
            /\bcns lymphoma/i,
            /\bhigh-dose methotrexate/i,
        ],
    },
    {
        id: 'cond_brain_metastases',
        subspecialties: ['Neuro-Oncology'],
        patterns: [
            /\bbrain metastas[ei]s/i,
            /\bintracranial metastas[ei]s/i,
            /\bwhole-brain radiotherapy/i,
            /\bwbrt\b/i,
            /\bosimertinib.*brain/i,
        ],
    },
    {
        id: 'cond_pituitary_adenoma',
        subspecialties: ['Neuro-Oncology'],
        patterns: [
            /\bpituitary adenoma/i,
            /\bpituitary apoplexy/i,
            /\bprolactinoma/i,
            /\bcabergoline/i,
            /\bendonasal resection/i,
        ],
    },
    {
        id: 'cond_spinal_tumors',
        subspecialties: ['Neuro-Oncology'],
        patterns: [
            /\bspinal cord compression/i,
            /\bepidural spinal cord/i,
            /\bspinal cord tumor/i,
            /\bmescc\b/i,
        ],
    },
    {
        id: 'cond_neuroonc_other',
        subspecialties: ['Neuro-Oncology'],
        patterns: [/\bleptomeningeal metastas/i, /\bcarcinomatous meningitis/i, /\bommaya reservoir/i],
    },
];

// ============================================================================
// 2. DIAGNOSIS MODALITY CLASSIFICATION RULES (27 Canonical Tags)
// ============================================================================

const DIAGNOSIS_TAG_RULES: KeywordRule[] = [
    // 1. Clinical Evaluation & Scales
    { id: toCanonicalTagId('Clinical Examination'), patterns: [/\bclinical examination\b/i, /\bneurological exam/i, /\bbedside exam/i, /\bfundoscop/i] },
    { id: toCanonicalTagId('Neurological Deficit'), patterns: [/\bfocal neurological deficit/i, /\bacute neurological deficit/i, /\bcranial nerve palsy/i] },
    { id: toCanonicalTagId('Severity Scales'), patterns: [/\bnihss\b/i, /\bgcs\b/i, /\bglasgow coma/i, /\bwfns\b/i, /\bhunt and hess/i, /\bupdrs\b/i, /\bedss\b/i, /\bmoca\b/i, /\bmmse\b/i] },
    { id: toCanonicalTagId('Prognostic Scores'), patterns: [/\bich score\b/i, /\bmax-ich\b/i, /\babcd2\b/i, /\bhas-bled\b/i, /\bcha2ds2-vasc\b/i, /\bphased\b/i] },
    { id: toCanonicalTagId('Disability Scales'), patterns: [/\bmrs\b/i, /\bmodified rankin/i, /\bgos-e\b/i, /\bbarthel index/i, /\bincat\b/i] },

    // 2. Neuroimaging
    { id: toCanonicalTagId('Non-contrast CT'), patterns: [/\bnon-contrast ct\b/i, /\bncct\b/i, /\bhead ct\b/i, /\bplain ct\b/i, /\bcomputed tomography\b/i, /\baspects\b/i] },
    { id: toCanonicalTagId('CT Angiography'), patterns: [/\bct angiography\b/i, /\bcta\b/i, /\bct venography\b/i, /\bctv\b/i] },
    { id: toCanonicalTagId('CT Perfusion'), patterns: [/\bct perfusion\b/i, /\bctp\b/i, /\bperfusion imaging\b/i, /\bpenumbral mismatch/i] },
    { id: toCanonicalTagId('Brain MRI'), patterns: [/\bbrain mri\b/i, /\bmri\b/i, /\bdwi\b/i, /\bflair\b/i, /\bswi\b/i, /\bmicrobleed/i] },
    { id: toCanonicalTagId('MR Angiography'), patterns: [/\bmr angiography\b/i, /\bmra\b/i, /\bmr venography\b/i, /\bmrv\b/i] },
    { id: toCanonicalTagId('MR Perfusion'), patterns: [/\bmr perfusion\b/i, /\bmrp\b/i, /\barterial spin labeling/i] },
    { id: toCanonicalTagId('DSA Angiography'), patterns: [/\bdigital subtraction angiography\b/i, /\bdsa\b/i, /\bcatheter angiography\b/i, /\bcerebral angiography\b/i] },
    { id: toCanonicalTagId('Ultrasound Doppler'), patterns: [/\btranscranial doppler\b/i, /\btcd\b/i, /\bcarotid duplex\b/i, /\bdoppler ultrasound\b/i, /\bduplex ultrasound\b/i] },

    // 3. Neurophysiology
    { id: toCanonicalTagId('Routine EEG'), patterns: [/\broutine eeg\b/i, /\belectroencephalogra/i, /\bstandard eeg\b/i] },
    { id: toCanonicalTagId('Continuous EEG'), patterns: [/\bcontinuous eeg\b/i, /\bceeg\b/i] },
    { id: toCanonicalTagId('Video EEG'), patterns: [/\bvideo eeg\b/i, /\bvideo-eeg\b/i, /\bepilepsy monitoring unit/i] },
    { id: toCanonicalTagId('Stereo-EEG'), patterns: [/\bstereo-eeg\b/i, /\bseeg\b/i, /\bintracranial eeg\b/i] },
    { id: toCanonicalTagId('EMG / NCS'), patterns: [/\bemg\b/i, /\belectromyography\b/i, /\bnerve conduction\b/i, /\bncs\b.*conduction/i, /\brepetitive nerve stimulation/i, /\bsingle-fiber emg/i] },
    { id: toCanonicalTagId('Evoked Potentials'), patterns: [/\bevoked potential/i, /\bvep\b/i, /\bssep\b/i, /\bbaep\b/i] },
    { id: toCanonicalTagId('Polysomnography'), patterns: [/\bpolysomnography\b/i, /\bsleep study\b/i] },

    // 4. Laboratory & Pathology
    { id: toCanonicalTagId('Routine Bloods'), patterns: [/\bblood glucose\b/i, /\bcoagulation\b/i, /\binr\b/i, /\bplatelet count\b/i, /\bserum sodium\b/i, /\bhba1c\b/i, /\bliver function\b/i] },
    { id: toCanonicalTagId('CSF Analysis'), patterns: [/\bcsf\b/i, /\bcerebrospinal fluid\b/i, /\blumbar puncture\b/i, /\boligoclonal bands\b/i, /\bxanthochromia\b/i, /\brt-quic\b/i] },
    { id: toCanonicalTagId('Autoantibody Panels'), patterns: [/\baqp4\b/i, /\baquaporin-4\b/i, /\bmog-ig/i, /\banti-nmda/i, /\bachr antibod/i, /\banti-musk/i, /\banti-gm1/i, /\banti-mag\b/i, /\bonconeural antibod/i, /\bautoantibod/i] },
    { id: toCanonicalTagId('Molecular Genetics'), patterns: [/\bgenetic testing\b/i, /\bidh1\b/i, /\bidh2\b/i, /\b1p\/19q\b/i, /\bmgmt\b/i, /\bapoe\b/i, /\bsmn1\b/i, /\bsod1\b/i, /\bc9orf72\b/i, /\bhla-b\*15:02/i] },
    { id: toCanonicalTagId('Biochemical Biomarkers'), patterns: [/\btroponin\b/i, /\bd-dimer\b/i, /\bprocalcitonin\b/i, /\bvegf\b/i, /\bcreatine kinase\b/i, /\bck level/i, /\bp-tau\b/i, /\bamyloid pet\b/i] },
    { id: toCanonicalTagId('Tissue Biopsy'), patterns: [/\bbiopsy\b/i, /\bmuscle biopsy\b/i, /\bnerve biopsy\b/i, /\btemporal artery biopsy\b/i, /\bstereotactic biopsy\b/i] },

    // 5. Diagnostic Frameworks
    { id: toCanonicalTagId('Diagnostic Criteria'), patterns: [/\bdiagnostic criteria\b/i, /\bmcdonald criteria\b/i, /\bichd-3\b/i, /\befns\/pns\b/i] },
    { id: toCanonicalTagId('Etiology Classification'), patterns: [/\btoast\b/i, /\besus\b/i, /\betiologic workup\b/i, /\bcryptogenic stroke\b/i, /\bcausal-ich\b/i] },
    { id: toCanonicalTagId('Differential Diagnosis'), patterns: [/\bdifferential diagnosis\b/i, /\bstrike mimic/i, /\bstroke mimic/i] },
    { id: toCanonicalTagId('Subtype Stratification'), patterns: [/\brisk stratification\b/i, /\bsubtype\b/i, /\bphenotype stratification\b/i] },
];

// ============================================================================
// 3. INTERVENTION TAG SYNONYMS (Supplements exact label matching)
// ============================================================================

const INTERVENTION_SYNONYM_MAP: Record<string, RegExp[]> = {
    [toCanonicalTagId('Tenecteplase')]: [/\btenecteplase\b/i, /\btnk\b/i, /\btnk-tpa\b/i],
    [toCanonicalTagId('Alteplase')]: [/\balteplase\b/i, /\brt-pa\b/i, /\btpa\b/i, /\bintravenous thrombolysis\b/i, /\bivt\b/i],
    [toCanonicalTagId('SAPT')]: [/\bsapt\b/i, /\bsingle antiplatelet\b/i, /\baspirin monotherapy\b/i, /\bclopidogrel monotherapy\b/i, /\baspirin\b/i, /\bantiplatelet\b/i],
    [toCanonicalTagId('DAPT')]: [/\bdapt\b/i, /\bdual antiplatelet\b/i, /\baspirin plus clopidogrel\b/i, /\baspirin and clopidogrel\b/i, /\baspirin plus ticagrelor\b/i],
    [toCanonicalTagId('DOAC')]: [/\bdoac\b/i, /\bnoac\b/i, /\bdirect oral anticoagulan/i, /\bapixaban\b/i, /\brivaroxaban\b/i, /\bdabigatran\b/i, /\bedoxaban\b/i, /\boral anticoagulation\b/i],
    [toCanonicalTagId('VKA')]: [/\bvka\b/i, /\bvitamin k antagonist/i, /\bwarfarin\b/i],
    [toCanonicalTagId('Statin')]: [/\bstatin/i, /\batorvastatin\b/i, /\brosuvastatin\b/i, /\blipid-lowering/i, /\bldl-c\b/i],
    [toCanonicalTagId('Blood Pressure Control')]: [/\bblood pressure\b/i, /\bantihypertensive/i, /\bsystolic bp\b/i, /\bsbp\b/i, /\bnicardipine\b/i, /\blabetalol\b/i, /\bclevidipine\b/i, /\bhypertension\b/i],
    [toCanonicalTagId('Mechanical Thrombectomy')]: [/\bmechanical thrombectomy\b/i, /\bendovascular thrombectomy\b/i, /\bevt\b/i, /\bstent retriever/i],
    [toCanonicalTagId('Basilar Thrombectomy')]: [/\bbasilar artery.*thrombectomy/i, /\bbasilar occlusion.*endovascular/i],
    [toCanonicalTagId('Carotid Endarterectomy')]: [/\bcarotid endarterectomy\b/i, /\bcea\b/i, /\bcarotid revascularization\b/i],
    [toCanonicalTagId('Carotid Stenting')]: [/\bcarotid artery stenting\b/i, /\bcarotid stenting\b/i, /\bcas\b/i, /\bcarotid revascularization\b/i],
    [toCanonicalTagId('PFO Closure')]: [/\bpfo closure\b/i, /\bpatent foramen ovale closure\b/i],
    [toCanonicalTagId('LAAO')]: [/\blaao\b/i, /\bleft atrial appendage occlusion\b/i, /\bleft atrial appendage closure\b/i, /\bwatchman\b/i],
    [toCanonicalTagId('Hemicraniectomy')]: [/\bdecompressive hemicraniectomy\b/i, /\bhemicraniectomy\b/i],
    [toCanonicalTagId('Decompressive Craniectomy')]: [/\bdecompressive craniectomy\b/i, /\bdecompressive hemicraniectomy\b/i],
    [toCanonicalTagId('Swallowing Screen')]: [/\bdysphagia screen/i, /\bswallowing screen/i, /\bswallow assessment/i],
    [toCanonicalTagId('Holter Telemetry')]: [/\bholter\b/i, /\bcardiac telemetry\b/i, /\bimplantable loop recorder\b/i, /\bprolonged rhythm monitoring/i],
    [toCanonicalTagId('Motor Rehab')]: [/\bmotor rehabilitation\b/i, /\bmotor recovery\b/i, /\bupper limb rehabilitation/i, /\bgait training\b/i],
    [toCanonicalTagId('Speech Therapy')]: [/\bspeech and language therapy\b/i, /\bslt\b/i, /\baphasia rehabilitation\b/i, /\bspeech therapy\b/i, /\blsvt\b/i],
    [toCanonicalTagId('PCC')]: [/\bpcc\b/i, /\bprothrombin complex concentrate/i, /\b4-factor pcc\b/i],
    [toCanonicalTagId('Andexanet Alfa')]: [/\bandexanet/i],
    [toCanonicalTagId('Idarucizumab')]: [/\bidarucizumab\b/i],
    [toCanonicalTagId('Platelet Transfusion')]: [/\bplatelet transfusion\b/i],
    [toCanonicalTagId('Minimally Invasive Surgery')]: [/\bminimally invasive.*evacuation/i, /\bminimally invasive surgery\b/i, /\bmistie\b/i, /\bendoscopic evacuation\b/i],
    [toCanonicalTagId('EVD')]: [/\bevd\b/i, /\bexternal ventricular drain/i, /\bventricular drainage\b/i],
    [toCanonicalTagId('Bundle Care')]: [/\bcare bundle\b/i, /\bbundle of care\b/i, /\binteract3\b/i],
    [toCanonicalTagId('Pneumatic Compression')]: [/\bintermittent pneumatic compression\b/i, /\bipc\b/i],
    [toCanonicalTagId('Nimodipine')]: [/\bnimodipine\b/i],
    [toCanonicalTagId('Aneurysm Coiling')]: [/\bendovascular coiling\b/i, /\baneurysm coiling\b/i, /\bcoiling\b/i],
    [toCanonicalTagId('Surgical Clipping')]: [/\bsurgical clipping\b/i, /\bmicrosurgical clipping\b/i, /\bclipping\b/i],
    [toCanonicalTagId('VP Shunt')]: [/\bvp shunt\b/i, /\bventriculoperitoneal shunt\b/i, /\bcsf shunt\b/i, /\bpermanent shunt\b/i],
    [toCanonicalTagId('PEG Placement')]: [/\bpeg\b/i, /\bpercutaneous endoscopic gastrostomy\b/i, /\bgastrostomy tube\b/i, /\benteral feeding tube/i],
    [toCanonicalTagId('Continuous EEG')]: [/\bcontinuous eeg\b/i, /\bceeg\b/i],
    [toCanonicalTagId('Corticosteroids')]: [/\bcorticosteroid/i, /\bsteroid/i, /\bmethylprednisolone\b/i, /\bdexamethasone\b/i, /\bprednisone\b/i, /\bprednisolone\b/i],
    [toCanonicalTagId('PLEX')]: [/\bplex\b/i, /\bplasma exchange\b/i, /\bplasmapheresis\b/i],
    [toCanonicalTagId('IVIg')]: [/\bivig\b/i, /\bintravenous immunoglobulin/i, /\bimmunoglobulin\b/i],
    [toCanonicalTagId('Typical Antipsychotics')]: [/\btypical antipsychotic/i, /\bfirst-generation antipsychotic/i, /\bhaloperidol\b/i, /\bneuroleptic sensitivity/i],
    [toCanonicalTagId('Cholinesterase Inhibitors')]: [/\bcholinesterase inhibitor/i, /\bdonepezil\b/i, /\brivastigmine\b/i, /\bgalantamine\b/i],
    [toCanonicalTagId('Teratogenic ASMs')]: [/\bvalproate\b.*teratogen/i, /\bvalproic acid.*pregnancy/i, /\btopiramate.*pregnancy/i, /\bphenobarbital.*pregnancy/i, /\bteratogenic antiseizure/i],
    [toCanonicalTagId('Fluoroquinolones')]: [/\bfluoroquinolone/i, /\bciprofloxacin\b.*myasthenia/i, /\blevofloxacin\b.*myasthenia/i],
    [toCanonicalTagId('Neuromuscular Blockers')]: [/\bneuromuscular block/i, /\brocuronium\b/i, /\bsuccinylcholine\b/i],
    [toCanonicalTagId('MS DMDs')]: [/\binterferon-beta\b.*nmosd/i, /\bfingolimod\b.*nmosd/i, /\bnatalizumab\b.*nmosd/i, /\bms disease-modifying/i],
};

// ============================================================================
// 4. DIRECTION CLASSIFICATION (Recommended vs Conditional vs Harm)
// ============================================================================

export function classifyDirectionV3(
    rawGrade: string,
    cor?: string,
    strength?: string,
    text?: string,
    normalizedTier?: NormalizedTier
): 'recommended' | 'conditional' | 'harm' {
    const gradeStr = `${rawGrade || ''} ${cor || ''} ${strength || ''}`.toLowerCase();
    const txtLower = (text || '').toLowerCase();

    // Explicit Class III / Harm / No Benefit / Strong AGAINST
    if (
        normalizedTier === 5 ||
        /\bclass iii\b|\bclass 3\b|\bcor 3\b|\bno benefit\b|\bharm\b|\bstrong(?:ly)? against\b|\bweak against\b|\bcontraindicated\b/i.test(gradeStr) ||
        /\bis not recommended\b|\bare not recommended\b|\bshould not be performed\b|\bshould not be used\b|\bshould be avoided\b|\bis potentially harmful\b|\bcauses harm\b|\bcontraindicated\b|\bwe recommend against\b|\bwe suggest against\b/i.test(txtLower)
    ) {
        return 'harm';
    }

    // Conditional / Weak / Class IIb / Uncertain
    if (
        normalizedTier === 3 ||
        /\bclass iib\b|\bclass 2b\b|\bcor 2b\b|\bweak recommendation\b|\bconditional\b|\buncertain\b|\bmay be considered\b|\bmight be reasonable\b/i.test(gradeStr)
    ) {
        return 'conditional';
    }

    return 'recommended';
}

// ============================================================================
// 5. DOMAIN CLASSIFICATION (Diagnosis / Treatment / Prevention)
// ============================================================================

export function classifyDomainsV3(
    text: string,
    sectionPath: string,
    guidelineTitle: string,
    hasDiagnosisTags: boolean
): ('diagnosis' | 'treatment' | 'prevention')[] {
    const combined = `${sectionPath} ${text}`.toLowerCase();
    const titleLower = guidelineTitle.toLowerCase();
    const domains = new Set<'diagnosis' | 'treatment' | 'prevention'>();

    const isDiagnosisSection =
        /\bdiagnos(?:is|tic)|imaging|evaluation|screening|assessment|biomarker|workup|classification|scales|scoring|eeg|mri|ct angiography/i.test(
            sectionPath
        );
    const isDiagnosisText =
        /\bto diagnose\b|\bdiagnostic\b|\bfor evaluation of\b|\bbrain mri is recommended\b|\bnon-contrast ct\b|\bct angiography\b|\blumbar puncture\b|\bcsf analysis\b|\bseverity scale|\bmoca\b|\bmmse\b|\bnihss\b/i.test(
            text
        );

    if (isDiagnosisSection || (hasDiagnosisTags && isDiagnosisText)) {
        domains.add('diagnosis');
    }

    const isPreventionDoc =
        /\bprimary prevention\b|\bsecondary prevention\b|\brehabilitation\b|\blong-term recovery\b/i.test(titleLower);
    const isPreventionContext =
        /\bprevention\b|\bsecondary stroke\b|\bprophylaxis\b|\blong-term\b|\bmaintenance\b|\brecurrence\b|\brecurrent\b|\brehabilitation\b|\blifestyle\b|\bsmoking cessation\b|\bholter\b|\bcarotid endarterectomy\b|\bpfo closure\b|\blaao\b|\bvaccination\b|\bsudep\b|\bteratogen|\bchildbearing\b|\bpre-pregnancy\b/i.test(
            combined
        );

    const isAcuteTreatmentContext =
        /\bacute\b|\bhyperacute\b|\bearly management\b|\bthrombolysis\b|\btenecteplase\b|\balteplase\b|\bthrombectomy\b|\bbolus\b|\binfusion\b|\breversal\b|\bpcc\b|\bandexanet\b|\bidarucizumab\b|\bevd\b|\bcraniectomy\b|\bcraniotomy\b|\bcoiling\b|\bclipping\b|\bstatus epilepticus\b|\bintubation\b|\bresuscitation\b|\bicp\b|\bvasospasm\b|\bplex\b|\bivig\b|\bresection\b|\bradiotherapy\b|\bchemotherapy\b/i.test(
            combined
        );

    if (isPreventionDoc || isPreventionContext) {
        domains.add('prevention');
    }
    if (isAcuteTreatmentContext || (!domains.has('diagnosis') && !domains.has('prevention'))) {
        domains.add('treatment');
    }

    return Array.from(domains);
}

// ============================================================================
// 6. MAIN V3 RECOMMENDATION CLASSIFIER
// ============================================================================

export function classifyRecommendationV3(
    doc: Pick<GuidelineDoc, 'id' | 'title' | 'society' | 'year' | 'subspecialty'>,
    change: Pick<
        PracticeChangeDetail,
        | 'id'
        | 'category'
        | 'topic'
        | 'currentText'
        | 'currentGrade'
        | 'cor'
        | 'loe'
        | 'strength'
        | 'quality'
        | 'expertConsensusStatement'
        | 'drivingTrials'
        | 'v3Labels'
    >,
    precomputedTier?: NormalizedTier
): RecommendationV3Labels {
    if (change.v3Labels && change.v3Labels.conditionIds.length > 0) {
        return {
            ...change.v3Labels,
            isFallbackCondition: false,
            isExplicit: true,
        };
    }

    let isFallbackCondition = false;
    const sectionPath = `${change.category || ''} — ${change.topic || ''}`;
    const fullText = `${doc.title || ''} ${sectionPath} ${change.currentText || ''} ${change.expertConsensusStatement || ''} ${(change.drivingTrials || []).join(' ')}`;
    const recText = `${sectionPath} ${change.currentText || ''} ${change.expertConsensusStatement || ''}`;

    // 1. Identify matched conditions
    const matchedConditionIds = new Set<string>();
    const matchedSubspecialties = new Set<SubspecialtyType>();
    if (doc.subspecialty) {
        matchedSubspecialties.add(doc.subspecialty);
    }

    for (const rule of CONDITION_RULES) {
        if (rule.patterns.some((rx) => rx.test(recText))) {
            matchedConditionIds.add(rule.id);
            for (const sub of rule.subspecialties) {
                matchedSubspecialties.add(sub);
            }
        }
    }

    // Fallback to guideline-level condition if recommendation text is generic within that guideline,
    // or if a carotid/cardioembolic procedure appears inside an Ischemic Stroke / Stroke Prevention guideline
    if (
        matchedConditionIds.size === 0 ||
        (matchedConditionIds.has('cond_carotid') &&
            /\bisch(?:a)?emic stroke|\bprimary prevention of stroke/i.test(doc.title || ''))
    ) {
        for (const rule of CONDITION_RULES) {
            if (rule.patterns.some((rx) => rx.test(doc.title || ''))) {
                matchedConditionIds.add(rule.id);
                for (const sub of rule.subspecialties) {
                    matchedSubspecialties.add(sub);
                }
            }
        }
    }

    // Final fallback by subspecialty
    if (matchedConditionIds.size === 0) {
        isFallbackCondition = true;
        const defaultBySub: Record<string, string> = {
            Stroke: 'cond_ischemic_stroke',
            'Neurocritical Care': 'cond_status_epilepticus',
            Epilepsy: 'cond_new_onset_seizure',
            Dementia: 'cond_alzheimer',
            Neuroimmunology: 'cond_ms',
            Neuromuscular: 'cond_gbs',
            'Movement Disorders': 'cond_parkinson',
            'Headache & Pain': 'cond_migraine',
            'CNS Infections': 'cond_cns_bacteria',
            'Neuro-Oncology': 'cond_gliomas',
        };
        const fallbackCond = defaultBySub[doc.subspecialty || 'Stroke'] || 'cond_ischemic_stroke';
        matchedConditionIds.add(fallbackCond);
    }

    // Ensure multi-parent conditions always include both parent subspecialties (Rule 3)
    for (const cid of matchedConditionIds) {
        const condObj = getConditionByIdV3(cid);
        if (condObj) {
            for (const sub of condObj.subspecialties) {
                matchedSubspecialties.add(sub);
            }
        }
    }

    // 2. Identify Diagnosis Modalities
    // In multi-recommendation PICO contexts, match interventions and diagnoses
    // primarily against the specific recommendation text (currentText) to prevent
    // tags from the overarching PICO question or consensus statements leaking into every sub-recommendation.
    const specificRecText = (change.currentText || '').trim();
    const hasMeaningfulStatement = specificRecText.length >= 12;
    const scanText = hasMeaningfulStatement ? specificRecText : recText;

    const diagnosisTags = new Set<string>();
    for (const dRule of DIAGNOSIS_TAG_RULES) {
        if (dRule.patterns.some((rx) => rx.test(scanText))) {
            diagnosisTags.add(dRule.id);
        }
    }

    // 3. Identify Domains
    const domains = classifyDomainsV3(
        change.currentText || '',
        sectionPath,
        doc.title || '',
        diagnosisTags.size > 0
    );

    // 4. Identify Intervention Tags & Time Windows across matched conditions
    const interventionTags = new Set<string>();
    const timeWindowIds = new Set<string>();

    const candidateConditions = Array.from(matchedConditionIds)
        .map((id) => getConditionByIdV3(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));

    for (const cond of candidateConditions) {
        const allCondTags = [
            ...cond.treatment.drugs,
            ...cond.treatment.interventions,
            ...cond.treatment.otherCare,
            ...cond.prevention.pharmacologicalProphylaxis,
            ...cond.prevention.proceduralDevice,
            ...cond.prevention.lifestyleRehabMonitoring,
        ];

        for (const tag of allCondTags) {
            const labelLower = tag.label.toLowerCase();
            if (scanText.toLowerCase().includes(labelLower)) {
                interventionTags.add(tag.id);
                continue;
            }
            const synPatterns = INTERVENTION_SYNONYM_MAP[tag.id];
            if (synPatterns && synPatterns.some((rx) => rx.test(scanText))) {
                interventionTags.add(tag.id);
            }
        }

        // Time window detection for this condition
        const txtLower = scanText.toLowerCase();
        for (const tw of cond.treatment.timeWindows) {
            const twLower = tw.label.toLowerCase();
            if (
                (twLower.includes('4.5h') && !twLower.includes('24h') && /\b4\.5\s*h|\bwithin 4\.5|\b< ?4\.5|\bwithin 3\s*h|\b< ?3\s*h|\b0\s*(?:to|–|-)\s*3\s*h|\b3(?:\.0)?\s*(?:to|–|-)\s*4\.5\s*h|\bwithin 6\s*h|\b< ?6\s*h|\b0\s*(?:to|–|-)\s*6\s*h|\bearly window\b|\bgolden hour\b|\bdoor-to-needle\b|\bprehospital/i.test(txtLower)) ||
                ((twLower.includes('4.5h–24h') || twLower.includes('extended window')) && /\b4\.5\s*(?:to|–|-)\s*(?:9|12|16|24)|\b6\s*(?:to|–|-)\s*(?:12|16|24)|\bwithin (?:7|8|10|12|16|24)\s*h|\b< ?(?:12|16|24)\s*h|\blate window|\bextended window|\blate-window|\bextended-window/i.test(txtLower)) ||
                (twLower.includes('unknown onset') && /\bwake-up\b|\bunknown onset\b|\bunwitnessed\b|\bunclear onset\b|\blast known well\b|\bdwi-flair mismatch/i.test(txtLower)) ||
                (twLower.includes('beyond 24h') && /\bbeyond 24\s*h|\b> ?24\s*h|\b24\s*(?:to|–|-)\s*72\s*h|\bwithin 48\s*h|\b≤ ?48\s*h|\b< ?48\s*h|\bday 2|\bday 3|\bsubacute\b|\bday 0[–-]3\b|\bday 1[–-]2\b/i.test(txtLower)) ||
                (twLower.includes('< 6h') && /\bwithin 6\s*h|\b< ?6\s*h|\bwithin 4\.5\s*h|\bwithin 2\s*h|\bhyperacute|\bacute lowering of sbp|\bacute bp lowering|\b150 and 220 mm hg/i.test(txtLower)) ||
                (twLower.includes('6h–24h') && /\b6\s*(?:to|–|-)\s*24|\bfirst 24\s*h|\bwithin 24\s*h|\b< ?24\s*h/i.test(txtLower)) ||
                (twLower.includes('subacute (24h–72h)') && /\b24\s*(?:to|–|-)\s*72\s*h|\b12\s*(?:to|–|-)\s*72\s*h|\bsubacute\b|\bday 2|\bday 3/i.test(txtLower)) ||
                (twLower.includes('< 72h') && /\bwithin 72\s*h|\b< ?72\s*h|\bwithin 24\s*h|\bearly aneurysm\b|\bpre-securing\b|\bcoiling\b|\bclipping\b|\bobliteration of the ruptured aneurysm\b|\bsecure the rupture site\b/i.test(txtLower)) ||
                (twLower.includes('day 3–14') && /\bvasospasm\b|\bdelayed cerebral isch|\bday 3|\bdays 3/i.test(txtLower)) ||
                (twLower.includes('> 72h') && /\b> ?72\s*h|\bdelayed\b|\bweeks? after/i.test(txtLower)) ||
                (twLower.includes('> 14 days') && /\b> ?14\s*days?|\bchronic\b|\blong-term\b/i.test(txtLower)) ||
                (twLower.includes('0–5 min') && /\b0\s*(?:to|–|-)\s*5\s*min|\bfirst-line\b|\bimpending\b|\bprehospital/i.test(txtLower)) ||
                (twLower.includes('5–30 min') && /\b5\s*(?:to|–|-)\s*30\s*min|\bestablished status|\bsecond-line/i.test(txtLower)) ||
                (twLower.includes('30 min–24h') && /\brefractory status|\brse\b|\bmidazolam infusion|\bpropofol|\bketamine/i.test(txtLower)) ||
                (twLower.includes('> 24h') && /\bsuper-refractory|\bsrse\b/i.test(txtLower)) ||
                (twLower.includes('< 1h') && /\bwithin 1\s*h|\bdoor-to-antibiotic|\bimmediate empiric/i.test(txtLower))
            ) {
                timeWindowIds.add(tw.id);
            }
        }
    }

    // Global synonym check if no condition-specific intervention tag matched yet
    if (interventionTags.size === 0) {
        for (const [tagId, patterns] of Object.entries(INTERVENTION_SYNONYM_MAP)) {
            if (patterns.some((rx) => rx.test(scanText))) {
                interventionTags.add(tagId);
            }
        }
    }

    // Fallback to sectionPath only if specific recommendation text had zero tags and was uninformative
    if (interventionTags.size === 0 && !hasMeaningfulStatement) {
        for (const [tagId, patterns] of Object.entries(INTERVENTION_SYNONYM_MAP)) {
            if (patterns.some((rx) => rx.test(recText))) {
                interventionTags.add(tagId);
            }
        }
    }

    // Ensure if prevention tags are matched (e.g., Carotid Endarterectomy, PFO Closure, LAAO, Holter), prevention domain is included
    const preventionSignals = [
        toCanonicalTagId('Carotid Endarterectomy'),
        toCanonicalTagId('PFO Closure'),
        toCanonicalTagId('LAAO'),
        toCanonicalTagId('Holter Telemetry'),
        toCanonicalTagId('Smoking Cessation'),
        toCanonicalTagId('Mediterranean Diet'),
        toCanonicalTagId('Aerobic Exercise'),
    ];
    if (preventionSignals.some((id) => interventionTags.has(id)) && !domains.includes('prevention')) {
        domains.push('prevention');
    }

    // 5. Direction classification
    const tier =
        precomputedTier ??
        computeNormalizedTierFromGrade({
            cor: change.cor,
            loe: change.loe,
            strength: change.strength,
            quality: change.quality,
            currentGrade: change.currentGrade,
            expertConsensusStatement: change.expertConsensusStatement,
        });

    const direction = classifyDirectionV3(
        change.currentGrade,
        change.cor,
        change.strength,
        change.currentText,
        tier
    );

    return {
        subspecialties: Array.from(matchedSubspecialties),
        conditionIds: Array.from(matchedConditionIds),
        domains,
        diagnosisTags: Array.from(diagnosisTags),
        timeWindowIds: Array.from(timeWindowIds),
        interventionTags: Array.from(interventionTags),
        direction,
        isFallbackCondition,
        isExplicit: false,
    };
}

/**
 * Classifies a PivotalTrialRecord into V3.0 tags for seamless filtering alongside recommendations.
 */
export function classifyPivotalTrialV3(trial: PivotalTrialRecord): NonNullable<PivotalTrialRecord['v3Tags']> {
    if (trial.v3Tags && trial.v3Tags.conditionIds.length > 0) {
        return trial.v3Tags;
    }
    const syntheticDoc = {
        id: trial.id,
        title: trial.title,
        society: 'Trial',
        year: trial.year,
        subspecialty: trial.subspecialty,
    };
    const syntheticChange = {
        id: trial.id,
        category: trial.pico.population,
        topic: trial.pico.intervention,
        currentText: `${trial.title} ${trial.pico.population} ${trial.pico.timeWindow || ''} ${trial.pico.intervention} ${trial.bottomLine}`,
        currentGrade: 'Class I',
        drivingTrials: [trial.acronym],
    };
    const v3 = classifyRecommendationV3(syntheticDoc, syntheticChange, 1);
    return {
        conditionIds: v3.conditionIds,
        domains: v3.domains,
        diagnosisTags: v3.diagnosisTags,
        timeWindowIds: v3.timeWindowIds,
        interventionTags: v3.interventionTags,
    };
}
