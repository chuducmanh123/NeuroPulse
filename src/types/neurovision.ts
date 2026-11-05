/**
 * NeuroVision - Anatomical and Clinical Ontology Types (Phase 1B)
 *
 * Strict Medical Governance Rules:
 * - Every medical entry must carry `source: string[]` citing peer-reviewed/official sources.
 * - `review_status` defaults to 'unreviewed'; only the human expert can transition to 'reviewed'.
 * - `evidence_level`:
 *   - 'atlas_direct': Directly resolved from MNI152 1 mm stereotaxic atlas labels.
 *   - 'approximate': Approximate spatial/vessel boundary (e.g. perforators, venous drainage).
 *   - 'literature': Medical knowledge derived from neurology literature/guidelines.
 */

export type NeuroAtlasId =
  | 'anatomy'
  | 'arterial'
  | 'arterial_level2'
  | 'venous'
  | 'aspects'
  | 'whitematter'
  | 'brainstem_aan'
  | 'aal3'
  | 'glasser'
  | 'brainnetome';

export type BaseModality = 'T1' | 'T2' | 'CT';

export type ActiveOverlay =
  | 'none'
  | 'aspects'
  | 'arterial'
  | 'arterial_level2'
  | 'anatomy'
  | 'whitematter'
  | 'venous'
  | 'brainstem_aan'
  | 'aal3'
  | 'glasser'
  | 'brainnetome';

export type ViewMode = 'multiplanar' | 'axial' | 'coronal' | 'sagittal' | '3d';

export interface CrosshairPosition {
  mm: [number, number, number];
  vox: [number, number, number];
}

export interface ClipPlaneState {
  depth: number;     // 0.0 to ~2.0, >2.0 disables
  azimuth: number;   // 0 to 360 degrees
  elevation: number; // -90 to 90 degrees
}

export type AnatomicalCategory =
  | 'cortex'
  | 'subcortical'
  | 'brainstem'
  | 'cerebellum'
  | 'white_matter'
  | 'vascular_territory';

export type EvidenceLevel = 'atlas_direct' | 'approximate' | 'literature';

export type ReviewStatus = 'unreviewed' | 'reviewed';

export interface ArterialSupply {
  primary: string[];     // Major arterial trunk / branch IDs (e.g. 'MCA-M1', 'ACA-A2', 'BA')
  perforators: string[]; // Perforating micro-vessels (e.g. 'lenticulostriate', 'thalamoperforating')
}

export interface ClinicalSyndrome {
  name: string;        // E.g. 'Weber syndrome', 'Wallenberg syndrome', 'Dejerine-Roussy'
  description: string; // Clinical manifestation, deficit triad, localization value
}

export interface HcpMetrics {
  macro_region: string;
  synonyms: string[];
  myelin_profile: string;
  cortical_thickness: string;
  task_contrasts: string[];
  original_profile: string;
}

export interface BrainnetomeMetrics {
  lobe: string;
  gyrus: string;
  cyto_architecture: string;
  yeo_network_7: string;
  yeo_network_overlap_pct: number;
  behavioral_domains: {
    cognition: number;
    action: number;
    perception: number;
    emotion: number;
    interoception: number;
  };
  primary_subdomains: string[];
}

export interface OntologyEntry {
  atlas: NeuroAtlasId;
  label_id: number;
  code: string;
  name_vi: string;
  name_en: string;
  category: AnatomicalCategory;
  brodmann_area: string[];
  functions: string[];
  arterial_supply: ArterialSupply;
  venous_drainage: string[];
  aspects_zone: string | null;
  clinical_syndromes: ClinicalSyndrome[];
  evidence_level: EvidenceLevel;
  source: string[];
  review_status: ReviewStatus;
  hcp_metrics?: HcpMetrics;
  brainnetome_metrics?: BrainnetomeMetrics;
}

export interface NeuroOntology {
  schema_version: '1.0';
  target_space: 'MNI152NLin2009cAsym';
  created_at: string;
  description: string;
  entries: OntologyEntry[];
}

/**
 * Standard NiiVue Label Colormap format
 * R, G, B, A: [0..255]
 * I: label_id (index in NIfTI atlas)
 * labels: human-readable label strings
 */
export interface NVLabelColormap {
  R: number[];
  G: number[];
  B: number[];
  A: number[];
  I: number[];
  labels: string[];
}
