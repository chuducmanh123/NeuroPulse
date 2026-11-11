// Type contract for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 5

export type SourceType =
  | "fda_label"
  | "smpc"
  | "guideline"
  | "registry"
  | "lactmed"
  | "vn_national_formulary"
  | "dav_registration"
  | "bhyt_list"
  | "ismp"
  | "review";

export interface SourceRef {
  source_id: string;
  locator: string; // section, table, or page reference
  quote: string;   // verbatim extract, <= 400 chars
}

export interface Sourced<T> {
  value: T | null;
  refs: SourceRef[];
  note?: string;
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  publisher: string;
  year: number;
  version?: string; // SPL set_id or guideline version
  url?: string;
  file?: string;
  accessed: string;
  license_note?: string;
}

export type Subspecialty =
  | "stroke"
  | "epilepsy"
  | "movement_disorders"
  | "headache"
  | "neuroimmunology"
  | "neuromuscular"
  | "dementia"
  | "neurocritical_care"
  | "neuro_infectious";

export type AdverseEffectTag =
  | "hyponatremia"
  | "myoclonus"
  | "confusion_delirium"
  | "extrapyramidal"
  | "ataxia"
  | "sedation_somnolence"
  | "serotonin_syndrome"
  | "qt_prolongation"
  | "rash_sjs_ten"
  | "psychiatric_behavioral"
  | "hepatotoxicity"
  | "weight_gain"
  | "weight_loss"
  | "hyperammonemia"
  | "pancreatitis"
  | "nephrolithiasis";

export type QtRiskTier = "none" | "conditional" | "possible" | "known";

export interface EnzymeProfile {
  cyp1a2?: "substrate" | "inducer_weak" | "inducer_strong" | "inhibitor_weak" | "inhibitor_strong";
  cyp2c9?: "substrate" | "inducer_weak" | "inducer_strong" | "inhibitor_weak" | "inhibitor_strong";
  cyp2c19?: "substrate" | "inducer_weak" | "inducer_strong" | "inhibitor_weak" | "inhibitor_strong";
  cyp2d6?: "substrate" | "inducer_weak" | "inducer_strong" | "inhibitor_weak" | "inhibitor_strong";
  cyp3a4?: "substrate" | "inducer_weak" | "inducer_strong" | "inhibitor_weak" | "inhibitor_strong";
  ugt?: string[];
  pgp?: "substrate" | "inducer" | "inhibitor";
  qt_risk?: QtRiskTier;
  serotonergic?: boolean;
  acb_score?: number; // Anticholinergic Cognitive Burden score (0-3)
}

export interface InfusionSpec {
  diluent?: string;
  final_concentration?: string;
  duration_min?: number;
  max_rate?: string;
}

export interface DoseSpec {
  kind: "fixed" | "per_kg";
  amount: number;
  unit: "mg" | "mcg" | "g" | "IU" | "mL";
  frequency: string;
  max_single?: number;
  max_daily?: number;
  infusion?: InfusionSpec;
}

export interface RenalBand {
  min: number | null;
  max: number | null;
  dose_text: string;
  dose?: DoseSpec;
  refs: SourceRef[];
}

export interface Regimen {
  id: string;
  indication: string;
  setting: "acute_inpatient" | "maintenance_outpatient";
  route: "IV" | "PO" | "IM" | "SC" | "NG" | "TD";
  refs: SourceRef[];
  dose: DoseSpec | null;
  dose_text?: string;
  renal_bands?: RenalBand[];
  hemodialysis?: Sourced<string>;
}

export interface RenalImpairmentGuidance {
  description: string;
  renal_basis: Sourced<"cg_abw" | "cg_normalized_1_73" | "egfr">;
  bands: RenalBand[];
  hemodialysis?: Sourced<string>;
  refs: SourceRef[];
}

export interface McmEntry {
  registry: string;
  percent: number;
  ci95?: string;
  n_exposed?: number;
  dose_stratum?: string;
  refs: SourceRef[];
}

export interface ReproductiveRecord {
  tier: Sourced<"preferred" | "caution" | "avoid">;
  mcm: McmEntry[];
  folic_acid: Sourced<string>;
  pregnancy_pk: Sourced<string>;
  postpartum: Sourced<string>;
  contraception: Sourced<string>;
  lactation_rid: Sourced<string>;
  lactation_summary: Sourced<string>;
}

export interface VnProduct {
  brand: string;
  strength: string;
  form: string;
  registration_no?: string;
}

export interface BhytInfo {
  listed: boolean;
  conditions?: string;
}

export interface NgTubeGuide {
  crushable: boolean;
  instructions: string;
}

export interface TitrationStep {
  week_from: number;
  week_to: number;
  dose_text: string;
  dose_mg_per_day?: number;
}

export interface TitrationSchedule {
  id: string;
  label: string;
  condition_text: string;
  steps: TitrationStep[];
  refs: SourceRef[];
}

export interface ContextualToolsData {
  titration?: {
    schedules: TitrationSchedule[];
  };
  missed_dose?: Sourced<string>;
  vomiting?: Sourced<string>;
  hold_restart?: Sourced<{
    procedure: string;
    hold_hours: string;
    restart_timing: string;
  }[]>;
  reversal?: Sourced<{
    agent: string;
    dose_rule: string;
    vn_available?: boolean;
  }[]>;
}

export interface NovelTherapyData {
  approvals: Sourced<{ agency: string; date: string; indication: string }[]>;
  eligibility: Sourced<string[]>;
  administration: Sourced<string>;
  monitoring: Sourced<{ timepoint: string; action: string }[]>;
  prerequisites: Sourced<string[]>;
  links?: Record<string, string>;
}

export interface EcosystemLinks {
  neuroguide?: string;
  neurocase?: string;
  neurovision?: string;
  neuropulse?: string;
}

export type RecordStatus = "draft" | "verified" | "retired";

export interface DrugRecord {
  id: string;
  generic_name: string;
  tall_man: Sourced<string>;
  classes: string[];
  subspecialties: Subspecialty[];
  vn_products: Sourced<VnProduct[]>;
  bhyt: Sourced<BhytInfo>;
  regimens: Regimen[];
  renal_impairment?: RenalImpairmentGuidance;
  renal_basis: Sourced<"cg_abw" | "cg_normalized_1_73" | "egfr">;
  hepatic: Sourced<string>;
  black_box: Sourced<string[]>;
  mg_safety: Sourced<"safe" | "caution" | "may_worsen" | "avoid">;
  ng_tube: Sourced<NgTubeGuide>;
  pgx: Sourced<string>;
  ae_tags: Sourced<AdverseEffectTag[]>;
  adverse_effects?: {
    most_common: Sourced<string[]>;
    serious: Sourced<string[]>;
  };
  mechanism_of_action?: Sourced<string>;
  enzyme_profile: Sourced<EnzymeProfile>;
  reproductive?: ReproductiveRecord;
  tools?: ContextualToolsData;
  novel?: NovelTherapyData;
  links?: EcosystemLinks;
  status: RecordStatus;
  verification: {
    verified_by: string | null;
    verified_at: string | null;
    content_hash: string | null;
  };
}

export type InteractionSeverity = "contraindicated" | "major" | "moderate" | "minor";

export interface InteractionAlternative {
  drug_id: string;
  rationale: string;
  switch_note?: string;
}

export interface Interaction {
  id: string;
  drug_a: string; // drug id
  drug_b: string; // drug id
  severity: InteractionSeverity;
  mechanism: string;
  clinical_effect: string;
  management: string;
  alternatives: InteractionAlternative[];
  refs: SourceRef[];
}

export interface TallManEntry {
  generic: string;
  tall_man: string;
  refs: SourceRef[];
}

export interface UpdateQueueItem {
  id: string;
  source_id: string;
  drug_ids: string[];
  old_version: string;
  new_version: string;
  detected_at: string;
  url: string;
  sections_changed?: string[];
  status: "pending" | "reviewed" | "dismissed";
}
