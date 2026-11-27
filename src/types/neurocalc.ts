export type RecordStatus = "draft" | "verified" | "retired";
export type ScaleKind = "point_sum" | "ordinal_grade" | "formula";
export type SeverityLevel =
  | "normal"
  | "mild"
  | "moderate"
  | "severe"
  | "critical"
  | "info";

export type FormulaId =
  | "abc_2"
  | "corrected_na_katz"
  | "corrected_phenytoin_winter_tozer"
  | "serum_osmolality"
  | "score2"
  | "score2_op"
  | "score2_diabetes"
  | "ascvd_pce"
  | "smart2"
  | "prevent"
  | "prevent_10y_cvd"
  | "grace_2_1y_death"
  | "rf_cl"
  | "cockcroft_gault_crcl"
  | "ckd_epi_2021_egfr";

export interface SourceRef {
  source_id: string;
  locator: string;
  quote?: string;
}

export interface ScaleMetadata {
  name: string;
  short_name: string;
  aliases: string[];
  subspecialties: string[];
  kind: ScaleKind;
  summary: string;
  clinical_pearls?: string[];
  time_estimate?: string;
  links?: {
    neuroguide_slug?: string;
    neurorx_slugs?: string[];
  };
}

export interface SelectOption {
  id: string;
  label: string;
  description?: string;
  points: number | null;
  is_untestable?: boolean;
  badge?: string;
}

export interface SelectScaleItem {
  kind: "select";
  id: string;
  code?: string;
  label: string;
  subtitle?: string;
  required: boolean;
  options: SelectOption[];
}

export interface NumericUnitOption {
  unit: string;
  label: string;
  to_canonical_factor: number;
  to_canonical_offset?: number;
}

export interface NumericScaleItem {
  kind: "numeric";
  id: string;
  code?: string;
  label: string;
  subtitle?: string;
  required: boolean;
  canonical_unit: string;
  units: NumericUnitOption[];
  min_canonical: number;
  max_canonical: number;
  step?: number;
  placeholder?: string;
}

export type ScaleItem = SelectScaleItem | NumericScaleItem;

export interface SubscoreDef {
  id: string;
  label: string;
  item_ids: string[];
}

export interface ScoringConfig {
  method: "sum" | "single_select" | "formula";
  min_score: number;
  max_score: number | null;
  unit?: string;
  precision?: number;
  formula_id?: FormulaId;
  expression?: string;
  untestable_policy?: "exclude_and_flag";
  subscores?: SubscoreDef[];
}

export interface InterpretationBand {
  id: string;
  min: number;
  max: number | null;
  condition?: string;
  label: string;
  severity: SeverityLevel;
  summary: string;
  clinical_note?: string;
  refs: SourceRef[];
}

export interface AssessmentGuide {
  id: string;
  target_type: "scale" | "item" | "option";
  target_id: string;
  option_id?: string;
  chip_label?: string;
  title: string;
  bedside_steps: string[];
  pitfalls_and_exceptions: string[];
  exam_prompts?: string[];
  refs: SourceRef[];
}

export type ScaleReferenceCategory = "primary" | "validation";

export interface ScaleReference {
  id: string;
  citation: string;
  year: number;
  pmid?: string;
  doi?: string;
  url?: string;
  category?: ScaleReferenceCategory;
}

export interface ScaleTestCase {
  name: string;
  inputs: Record<string, string | number>;
  expected_score: number | null;
  expected_band_id?: string;
  expected_untestable_ids?: string[];
}

export interface ScaleVerification {
  verified_by: string | null;
  verified_at: string | null;
  content_hash: string | null;
}

export interface ScaleRecord {
  id: string;
  schema_version: 1;
  metadata: ScaleMetadata;
  items: ScaleItem[];
  scoring: ScoringConfig;
  interpretation: InterpretationBand[];
  assessment_guides: AssessmentGuide[];
  references: ScaleReference[];
  test_cases?: ScaleTestCase[];
  status: RecordStatus;
  verification: ScaleVerification;
}

export interface ScaleWithEffectiveStatus {
  scale: ScaleRecord;
  effectiveStatus: RecordStatus;
  hashMatches: boolean;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ComputedOutputMetric {
  id: string;
  label: string;
  group: string;
  value: number | null;
  formattedValue: string | null;
  unit?: string;
  highlight?: boolean;
  note?: string;
}

export interface DetailedFormulaResult {
  primaryScore: number | null;
  primaryMetricLabel?: string;
  modelLabel?: string;
  outputs?: ComputedOutputMetric[];
  warnings?: string[];
}
