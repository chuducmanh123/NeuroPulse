import type {
  JsonPatchOp,
  MergeConflict,
  RepoErrorCode,
  RevisionEnvelope,
  RevisionOp,
  SyncEnvelope,
  SyncRetentionConfig,
  SyncState,
  ThreeWayMergeResult,
} from "../../sync/types.ts";

export type {
  JsonPatchOp,
  MergeConflict,
  RepoErrorCode,
  RevisionOp,
  SyncRetentionConfig,
  SyncState,
  ThreeWayMergeResult,
};
import type {
  ClinicalScenario,
  ConferenceEvent,
  GuidelineDoc,
  LateBreakingTrial,
  OntologyFacetId,
  PivotalTrialRecord,
  PracticeChangeDetail,
  RecommendationAtom,
  RecommendationLabelOutput,
  RecommendationRelationType,
  RecommendationV3Labels,
  SubspecialtyType,
} from "../../../types/neuroguide.ts";

export type NeuroGuideProtocolType = "guideline" | "conference" | "scenario_catalog";

export type NeuroGuideBlockType =
  | "recommendation"
  | "shared_clinical_block"
  | "pivotal_trial"
  | "late_breaking_trial"
  | "clinical_scenario"
  | "recommendation_atom";

export type NeuroGuideBlockPayload =
  | { kind: "recommendation"; practiceChange: PracticeChangeDetail }
  | { kind: "shared_clinical_block"; practiceChange: PracticeChangeDetail }
  | { kind: "pivotal_trial"; trial: PivotalTrialRecord }
  | { kind: "late_breaking_trial"; trial: LateBreakingTrial; conferenceId: string }
  | { kind: "clinical_scenario"; scenario: ClinicalScenario }
  | { kind: "recommendation_atom"; atom: RecommendationAtom };

export interface NeuroGuideBlockFacetIndex {
  recId?: string;
  subspecialties: SubspecialtyType[];
  conditionIds: string[];
  domains: ("diagnosis" | "treatment" | "prevention")[];
  diagnosisTags: string[];
  timeWindowIds: string[];
  interventionTags: string[];
  direction: "recommended" | "conditional" | "harm" | "unspecified";
  normalizedTier?: number;
  ontologyFacets: Partial<Record<OntologyFacetId, string[]>> | null;
  v3Labels: RecommendationV3Labels | null;
  customLabel: RecommendationLabelOutput | null;
  citedTrialKeys: string[];
  linkedScenarioKeys: string[];
  picoKey: string | null;
  sectionPath: string | null;
}

export interface NeuroGuideContentBlockData {
  blockKey: string;
  blockType: NeuroGuideBlockType;
  payload: NeuroGuideBlockPayload;
  facetIndex: NeuroGuideBlockFacetIndex;
}

export interface NeuroGuideContentBlockRow extends SyncEnvelope<NeuroGuideContentBlockData> {
  blockKey: string;
  blockType: NeuroGuideBlockType;
}

export type NeuroGuideProtocolMetadata =
  | {
      kind: "guideline";
      doc: Omit<GuidelineDoc, "allPracticeChanges">;
    }
  | {
      kind: "conference";
      conference: Omit<ConferenceEvent, "lateBreakingTrials">;
    }
  | {
      kind: "scenario_catalog";
      catalogKind:
        | "clinical_scenarios"
        | "pivotal_trials"
        | "recommendation_atoms"
        | "system_meta";
      deletedGuidelineIds?: string[];
      deletedTrialIds?: string[];
      orphanCustomRecLabels?: Record<string, RecommendationLabelOutput>;
    };

export interface NeuroGuideProtocolRow {
  uid: string;
  slug: string;
  protocolType: NeuroGuideProtocolType;
  society: string;
  year: number;
  title: string;
  status: string;
  subspecialties: SubspecialtyType[];
  metadata: NeuroGuideProtocolMetadata;
  blockOrder: string[];
  metadataHash: string;
  protocolHash: string;
  rev: number;
  changeSeq: number;
  createdAt?: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface NeuroGuideProtocolBlockEdge {
  protocolUid: string;
  blockUid: string;
  position: number;
  sectionPath: string;
  role: "recommendation" | "shared" | "trial" | "scenario" | "atom";
}

export type NeuroGuideBlockLinkType =
  | RecommendationRelationType
  | "cites_trial"
  | "in_scenario"
  | "shared_protocol";

export interface NeuroGuideBlockLinkEdge {
  srcBlockUid: string;
  dstBlockUid: string;
  linkType: NeuroGuideBlockLinkType;
  origin: "rule" | "ai" | "human";
  status: "approved" | "proposed" | "rejected";
  evidenceSrc?: string;
  evidenceDst?: string;
}

export interface NeuroGuideGraphSnapshot {
  protocols: NeuroGuideProtocolRow[];
  blocks: NeuroGuideContentBlockRow[];
  protocolBlocks: NeuroGuideProtocolBlockEdge[];
  blockLinks: NeuroGuideBlockLinkEdge[];
  rootHash: string;
}

export interface NeuroGuideStoreInput {
  guidelines: GuidelineDoc[];
  conferences: ConferenceEvent[];
  scenarios: ClinicalScenario[];
  recommendationAtoms?: RecommendationAtom[];
  pivotalTrials?: PivotalTrialRecord[];
  customRecLabels?: Record<string, RecommendationLabelOutput>;
  deletedGuidelineIds?: string[];
  deletedTrialIds?: string[];
}

export interface NeuroGuideOverlappingFacetFilter {
  subspecialties?: SubspecialtyType[];
  conditionIds?: string[];
  domains?: ("diagnosis" | "treatment" | "prevention")[];
  timeWindowIds?: string[];
  interventionTags?: string[];
  citedTrialKeys?: string[];
  linkedScenarioKeys?: string[];
  directions?: ("recommended" | "conditional" | "harm" | "unspecified")[];
  blockTypes?: NeuroGuideBlockType[];
}

export interface SelectiveMerkleUpdateResult {
  updatedBlockUid: string;
  updatedContentHash: string;
  updatedProtocolUids: string[];
  affectedProtocolSlugs: string[];
  unchangedProtocolUids: string[];
  rootHash: string;
  cacheTagsToInvalidate: string[];
}

export interface NeuroGuideBlockRevisionRow extends RevisionEnvelope<NeuroGuideContentBlockData> {
  blockType: NeuroGuideBlockType;
}

export interface NeuroGuideProtocolEdgeInput {
  blockUid: string;
  position: number;
  sectionPath: string;
  role: "recommendation" | "shared" | "trial" | "scenario" | "atom";
}

export interface NeuroGuideProtocolUpsertInput {
  slug: string;
  protocolType: NeuroGuideProtocolType;
  society: string;
  year: number;
  title: string;
  status: string;
  subspecialties: SubspecialtyType[];
  metadata: NeuroGuideProtocolMetadata;
  blockOrder: string[];
  metadataHash: string;
  edges?: NeuroGuideProtocolEdgeInput[];
  uid?: string;
  expectedRev?: number;
  skipRootRehash?: boolean;
}

export interface NeuroGuideBlockMutateResult {
  row: NeuroGuideContentBlockRow;
  unchanged: boolean;
  invalidatedTags: string[];
}

export interface NeuroGuideProtocolMutateResult {
  row: NeuroGuideProtocolRow;
  unchanged: boolean;
}
