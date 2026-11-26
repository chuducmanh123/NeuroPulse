import type { EcosystemLink, NormalizedTier, SubspecialtyType } from "./neuroguide.ts";

export type PathwaySourceType = "guideline" | "textbook";
export type PathwayDomain = "diagnosis" | "treatment" | "combined";
export type PathwayStatus = "draft" | "published" | "archived";
export type PathwayLangMode = "en" | "bilingual" | "vi";

export interface BilingualText {
  /** Primary canonical clinical text (English verbatim from source) */
  en: string;
  /** Optional concise Vietnamese clinical translation */
  vi?: string;
}

export interface PathwaySourceMeta {
  sourceType: PathwaySourceType;
  title: string;
  organizationOrAuthor: string;
  year: number;
  figureRef?: string;
  url?: string;
  linkedGuidelineId?: string;
}

export type PathwayNodeKind =
  | "entry"
  | "section"
  | "decision"
  | "criteria"
  | "checklist"
  | "action"
  | "diagnosis"
  | "treatment";

export type PathwayChoiceLayout = "auto" | "binary" | "grid2" | "row3" | "stack";

export interface PathwayAbbreviation {
  term: string;
  expansion: BilingualText;
}

export interface PathwayFootnote {
  symbol: string;
  text: BilingualText;
}

export interface PathwayCompoundItem {
  title: BilingualText;
  body?: BilingualText;
  tier?: NormalizedTier;
  evidenceBadge?: string;
}

export interface PathwayChecklistItem {
  id: string;
  label: BilingualText;
  role: "inclusion" | "exclusion";
}

export interface PathwayEdge {
  id: string;
  label: BilingualText;
  sublabel?: BilingualText;
  targetNodeId: string;
  tone?: "default" | "positive" | "warning" | "danger";
  checklistTrigger?: "pass" | "fail";
  /** When true on a loop-back edge, auto-unrolls one pass down to the next decision node */
  autoUnrollLoop?: boolean;
}

export interface PathwayNode {
  id: string;
  kind: PathwayNodeKind;
  title: BilingualText;
  body?: BilingualText;
  warning?: BilingualText;
  tier?: NormalizedTier;
  evidenceBadge?: string;
  checklistItems?: PathwayChecklistItem[];
  /** AHA-style paired/parallel compound items (AND / OR) rendered inside one cohesive card */
  compoundOperator?: "AND" | "OR";
  compoundItems?: PathwayCompoundItem[];
  /** Optional explicit grid layout override for multi-branch decision cards */
  choiceLayout?: PathwayChoiceLayout;
  edges: PathwayEdge[];
  ecosystemLinks?: EcosystemLink[];
  clinicalPearl?: BilingualText;
  blockUid?: string;
  blockRev?: number;
}

export interface ClinicalPathwayDoc {
  /** Stable deterministic UUID (= neuroguide_protocols.uid) */
  uid: string;
  slug: string;
  title: BilingualText;
  summary?: BilingualText;
  subspecialty: SubspecialtyType;
  conditionId?: string;
  domain: PathwayDomain;
  source: PathwaySourceMeta;
  sourceImageUrl: string;
  /** SHA-256 of uploaded source image for duplicate upload detection */
  sourceImageSha256?: string;
  sourceImageMeta?: {
    mimeType: string;
    fileName?: string;
    width?: number;
    height?: number;
  };
  entryNodeId: string;
  nodes: PathwayNode[];
  abbreviations?: PathwayAbbreviation[];
  footnotes?: PathwayFootnote[];
  status: PathwayStatus;
  /** Optimistic concurrency & Merkle metadata (= neuroguide_protocols) */
  rev: number;
  changeSeq?: number;
  protocolHash?: string;
  deletedAt?: string | null;
  extractionMeta?: {
    model?: string;
    extractedAt?: string;
    confidenceNotes?: string[];
  };
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClinicalPathwayProtocolMeta = Omit<
  ClinicalPathwayDoc,
  "nodes" | "rev" | "changeSeq" | "protocolHash" | "deletedAt"
>;

export type PathwayValidationCode =
  | "MISSING_TITLE"
  | "MISSING_SOURCE"
  | "MISSING_IMAGE"
  | "EMPTY_NODES"
  | "INVALID_ENTRY_NODE"
  | "DUPLICATE_NODE_ID"
  | "BROKEN_EDGE_TARGET"
  | "DEAD_END_DECISION"
  | "CHECKLIST_MISSING_ITEMS"
  | "ORPHAN_NODE"
  | "CYCLE_DETECTED"
  | "MISSING_VI_TRANSLATION"
  | "NON_TERMINAL_LEAF";

export interface PathwayValidationIssue {
  code: PathwayValidationCode;
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface PathwayValidationResult {
  valid: boolean;
  canPublish: boolean;
  errors: PathwayValidationIssue[];
  warnings: PathwayValidationIssue[];
}

export interface DuplicatePathwayMatch {
  uid: string;
  slug: string;
  titleEn: string;
  status: PathwayStatus;
  reason: "slug" | "image_sha256";
}
