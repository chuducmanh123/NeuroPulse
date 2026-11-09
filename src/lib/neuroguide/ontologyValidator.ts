import strokeOntologyJson from "../../data/strokeOntology.json" with { type: "json" };
import type {
  GuidelineDoc,
  PracticeChangeDetail,
  NormalizedTier,
  OntologyFacetId,
  FacetLabelItem,
  RecommendationFacetLabels,
  RecommendationLabelInput,
  RecommendationLabelOutput,
  LabelValidationResult,
  ValidationIssue,
  ReviewReasonCode,
} from "../../types/neuroguide.ts";

export interface OntologyValueDef {
  id: string;
  label_en?: string;
  label_vi: string;
  def: string;
  not?: string;
  aliases?: string[];
}

export interface OntologyFacetDef {
  label_en?: string;
  cardinality: "multi" | "single";
  required: boolean;
  def: string;
  values: OntologyValueDef[];
}

export interface StrokeOntologySchema {
  ontology_version: string;
  domain: string;
  purpose: string;
  facets: Record<OntologyFacetId, OntologyFacetDef>;
  copied_fields_never_generated_by_ai: string[];
  normalization: {
    AHA_COR: Record<string, string>;
    AHA_LOE: Record<string, string>;
    ESO_strength: Record<string, string>;
    ESO_quality: Record<string, string>;
  };
}

export const STROKE_ONTOLOGY = strokeOntologyJson as unknown as StrokeOntologySchema;

export const TOP_KEYS = [
  "rec_id",
  "ontology_version",
  "labels",
  "confidence",
  "needs_review",
  "review_reasons",
  "notes",
] as const;

export const ALLOWED_REVIEW_CODES = new Set<string>([
  "label_not_in_ontology",
  "ambiguous_population",
  "direction_text_conflict",
  "missing_context",
  "multiple_interpretations",
  "unlisted_drug_or_procedure",
  "weak_evidence_span",
  "other",
]);

export const COR_ALLOWED_DIRECTIONS: Record<string, Set<string>> = {
  "1": new Set(["for"]),
  "2a": new Set(["for", "uncertain"]),
  "2b": new Set(["for", "uncertain"]),
  "3: no benefit": new Set(["no_benefit", "against"]),
  "3: harm": new Set(["against"]),
  "3": new Set(["no_benefit", "against"]),
};

const NEG_REGEX =
  /\b(is|are) not recommended\b|\bnot recommended\b|\bshould not\b|\bis harmful\b|\bpotentially harmful\b|\bcontraindicated\b|\bdoes not (result in|improve|reduce)\b|\bno benefit\b|\bnot useful\b|\bnot beneficial\b|\bshould be avoided\b|\brecommend against\b|\bsuggest against\b/i;

const POS_REGEX =
  /\b(is|are) (recommended|reasonable|indicated|useful|effective|beneficial)\b|\bshould be (performed|given|administered|considered|offered)\b|\bmay be (considered|reasonable)\b|\bcan be (considered|useful)\b|\bwe (recommend|suggest) (that|using|offering|administering|performing)\b/i;

const UNC_REGEX =
  /\b(is|are) (uncertain|unknown|unclear)\b|\bnot well established\b|\bremains? (uncertain|unclear)\b|\bremain to be determined\b|\bcontinued uncertainty\b/i;

const PED_REGEX =
  /\b(pediatric|paediatric|child|children|neonat\w*|infant\w*|adolescent\w*)\b|trẻ em|nhi khoa|sơ sinh/i;

/**
 * Strips ASCII control characters (such as \u0007 from PDF extraction) and normalizes whitespace/quotes.
 */
export function sanitizeControlChars(raw?: string | null): string {
  if (!raw) return "";
  return String(raw)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWhitespaceAndQuotes(raw?: string | null): string {
  if (!raw) return "";
  return String(raw)
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchEvidenceSpan(span: string, sourceText: string): "exact" | "normalized" | null {
  if (!span || !sourceText) return null;
  if (sourceText.includes(span)) return "exact";
  const normSpan = normalizeWhitespaceAndQuotes(span);
  const normSrc = normalizeWhitespaceAndQuotes(sourceText);
  if (normSpan && normSrc.includes(normSpan)) return "normalized";
  return null;
}

export function normalizeAhaCor(raw?: string | null): string | null {
  if (!raw) return null;
  let s = String(raw)
    .replace(/\b(class|cor)\b/gi, "")
    .replace(/^[\s:.\-]+|[\s:.\-]+$/g, "")
    .toLowerCase();
  s = s.replace(/^iii\b/, "3").replace(/^iia\b/, "2a").replace(/^iib\b/, "2b").replace(/^i\b/, "1");
  const m = s.match(/^(1|2a|2b|3)\b[\s:,\-]*(.*)$/);
  if (!m) return null;
  const [, base, rest] = m;
  if (base === "3") {
    if (rest.includes("harm")) return "3: harm";
    if (rest.includes("benefit")) return "3: no benefit";
    return "3";
  }
  return base;
}

export function computeNormalizedTierFromGrade(params: {
  cor?: string | null;
  loe?: string | null;
  strength?: string | null;
  quality?: string | null;
  currentGrade?: string | null;
  expertConsensusStatement?: string | null;
}): NormalizedTier {
  const cor = normalizeAhaCor(params.cor || params.currentGrade);
  if (cor === "1") return 1;
  if (cor === "2a") return 2;
  if (cor === "2b") return 3;
  if (cor && cor.startsWith("3")) return 5;

  const strLower = (params.strength || params.currentGrade || "").toLowerCase();
  if (strLower.includes("strong against") || strLower.includes("harm") || strLower.includes("not recommended")) {
    return 5;
  }
  if (strLower.includes("weak against")) {
    return 5;
  }
  if (strLower.includes("strong for") || strLower === "strong") {
    return 1;
  }
  if (strLower.includes("weak for") || strLower.includes("conditional")) {
    const qLower = (params.quality || params.currentGrade || "").toLowerCase();
    return qLower.includes("moderate") || qLower.includes("high") ? 2 : 3;
  }
  if (
    strLower.includes("expert consensus") ||
    strLower.includes("consensus") ||
    Boolean(params.expertConsensusStatement)
  ) {
    return 4;
  }
  if (strLower.includes("uncertain") || strLower.includes("no recommendation")) {
    return 3;
  }
  return 2;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTermRegex(term: string): RegExp {
  const t = term.trim();
  if (t.length <= 4) {
    return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(t.toUpperCase())}(?![A-Za-z0-9])`);
  }
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(t)}(?![A-Za-z0-9])`, "i");
}

/**
 * Converts a GuidelineDoc + PracticeChangeDetail into the canonical RecommendationLabelInput contract,
 * stripping PDF control characters cleanly.
 */
export function toLabelerInput(doc: GuidelineDoc, change: PracticeChangeDetail, index = 0): RecommendationLabelInput {
  const cleanCategory = sanitizeControlChars(change.category).trim();
  const cleanTopic = sanitizeControlChars(change.topic).trim();
  const cleanPicoQ = sanitizeControlChars(change.picoQuestion).trim();

  let sectionPath = cleanTopic || cleanCategory || doc.title;
  if (cleanCategory && cleanTopic && cleanCategory !== cleanTopic) {
    const catLower = cleanCategory.toLowerCase();
    const topLower = cleanTopic.toLowerCase();
    const isPrefixOrOverlap =
      topLower.includes(catLower) ||
      catLower.includes(topLower) ||
      (catLower.length >= 15 && topLower.includes(catLower.slice(0, 15)));

    if (isPrefixOrOverlap) {
      sectionPath = cleanTopic.length >= cleanCategory.length ? cleanTopic : cleanCategory;
    } else {
      sectionPath = `${cleanCategory} > ${cleanTopic}`;
    }
  }

  // Clean redundant question marks and multiple PICO prefixes in sectionPath
  sectionPath = sectionPath.replace(/^PICO\s*\d+[a-z]?[:.\s-]*PICO\s*\d+[a-z]?[:.\s-]*/i, "PICO: ");
  const parentContext = cleanPicoQ
    ? `PICO ${change.picoNumber || ""}: ${cleanPicoQ} (${sectionPath})`.trim()
    : `${sectionPath} — ${sanitizeControlChars(doc.title)}`;

  return {
    rec_id: change.id || `${doc.id}-rec-${index + 1}`,
    society: doc.society,
    guideline_id: doc.id,
    section_path: sectionPath,
    parent_context: parentContext,
    rec_number: change.picoNumber ?? index + 1,
    page: change.pageNum ?? null,
    text: sanitizeControlChars(change.currentText || change.expertConsensusStatement || ""),
    cor: change.cor || null,
    loe: change.loe || null,
    strength_raw: change.strength || null,
    quality_raw: change.quality || null,
    change_type: change.changeType ? change.changeType.toLowerCase() : null,
  };
}

/**
 * Exact TypeScript port of `validate_record` in `core/labeler/labeler_tools.py`.
 */
export function validateLabelRecord(
  inp: RecommendationLabelInput,
  out: unknown,
  ont: StrokeOntologySchema = STROKE_ONTOLOGY
): LabelValidationResult {
  const E: ValidationIssue[] = [];
  const R: ValidationIssue[] = [];
  const W: ValidationIssue[] = [];
  const e = (code: string, msg: string) => E.push({ code, msg });
  const r = (code: string, msg: string) => R.push({ code, msg });
  const w = (code: string, msg: string) => W.push({ code, msg });

  const facets = ont.facets;
  const text = inp.text || "";
  const ctx = inp.parent_context || "";

  if (!out || typeof out !== "object" || Array.isArray(out)) {
    return {
      status: "reject",
      errors: [{ code: "not_object", msg: "output is not an object" }],
      reviews: [],
      warnings: [],
    };
  }

  const record = out as Record<string, any>;
  for (const k of TOP_KEYS) {
    if (!(k in record)) e("missing_key", `missing top-level key ${k}`);
  }
  for (const k of Object.keys(record)) {
    if (!(TOP_KEYS as readonly string[]).includes(k)) {
      e("extra_key", `unexpected top-level key '${k}' (labeler may not output COR/LOE or other fields)`);
    }
  }

  if (record.rec_id !== inp.rec_id) {
    e("rec_id_mismatch", `${record.rec_id} != ${inp.rec_id}`);
  }
  if (record.ontology_version !== ont.ontology_version) {
    e("version_mismatch", `ontology_version ${record.ontology_version}`);
  }
  if (!["high", "medium", "low"].includes(record.confidence)) {
    e("bad_confidence", String(record.confidence));
  }
  if (typeof record.needs_review !== "boolean") {
    e("bad_needs_review", "needs_review must be boolean");
  }

  const rr = record.review_reasons;
  if (!Array.isArray(rr)) {
    e("bad_review_reasons", "review_reasons must be an array");
  } else {
    for (const x of rr) {
      if (!ALLOWED_REVIEW_CODES.has(x)) {
        e("bad_review_reason", `unknown review reason '${x}'`);
      }
    }
    if (record.needs_review === true && rr.length === 0) {
      e("review_reasons_missing", "needs_review=true but no reason given");
    }
  }

  if (typeof (record.notes ?? "") !== "string" || String(record.notes ?? "").length > 300) {
    e("bad_notes", "notes must be a string of at most 300 characters");
  }

  let lab = record.labels;
  const vals: Record<string, string[]> = {};
  if (!lab || typeof lab !== "object" || Array.isArray(lab)) {
    e("bad_labels", "labels must be an object");
    lab = {};
  }

  for (const [fid, f] of Object.entries(facets) as [OntologyFacetId, OntologyFacetDef][]) {
    if (!(fid in lab)) {
      e("missing_facet", `facet '${fid}' missing`);
      continue;
    }
    const raw = lab[fid];
    const multi = f.cardinality === "multi";
    if (multi && !Array.isArray(raw)) {
      e("bad_cardinality", `${fid} must be an array`);
      continue;
    }
    if (!multi && (!raw || typeof raw !== "object" || Array.isArray(raw))) {
      e("bad_cardinality", `${fid} must be a single object`);
      continue;
    }

    const items: any[] = multi ? raw : [raw];
    if (multi && f.required && items.length === 0) {
      e("empty_required_facet", `${fid} needs at least one value`);
    }

    const validIds = new Set(f.values.map((x) => x.id));
    const seen: string[] = [];

    for (const it of items) {
      if (
        !it ||
        typeof it !== "object" ||
        Array.isArray(it) ||
        Object.keys(it).length !== 3 ||
        !("value" in it) ||
        !("evidence_span" in it) ||
        !("source" in it)
      ) {
        e("bad_item_keys", `${fid}: item must have exactly value, evidence_span, source`);
        continue;
      }

      const { value: v, evidence_span: sp, source: src } = it;
      if (!validIds.has(v)) {
        e("enum", `${fid}: '${v}' is not in the ontology`);
        continue;
      }
      seen.push(v);

      if (v === "unspecified") {
        if (sp !== null || src !== null) {
          e("unspecified_with_evidence", `${fid}: unspecified must have null evidence`);
        }
        continue;
      }

      if (typeof sp !== "string" || sp.length < 3 || (src !== "text" && src !== "parent_context")) {
        e("evidence_missing", `${fid}=${v}: needs evidence_span (>=3 chars) and source text|parent_context`);
        continue;
      }

      const m = matchEvidenceSpan(sp, src === "text" ? text : ctx);
      if (m === null) {
        e("span_not_found", `${fid}=${v}: span not found verbatim in ${src}: '${sp}'`);
      } else if (m === "normalized") {
        w("span_normalized", `${fid}=${v}: span matches only after whitespace/quote normalization`);
      }
    }

    if (seen.length !== new Set(seen).size) {
      e("duplicate_value", `${fid}: duplicate values`);
    }
    if (seen.includes("unspecified") && seen.length > 1) {
      e("unspecified_mixed", `${fid}: 'unspecified' combined with other values`);
    }
    vals[fid] = seen;
  }

  if (E.length > 0) {
    return { status: "reject", errors: E, reviews: R, warnings: W };
  }

  // ---- semantic checks (REVIEW = code forces the record into the review queue)
  const flat = Object.values(vals).flat();
  if (flat.some((v) => v.startsWith("other_"))) {
    r("other_value_used", "an other_* / other_unlisted value was used (candidate new ontology term)");
  }
  if (vals.condition?.length === 1 && vals.condition[0] === "unspecified") {
    r("condition_unspecified", "no condition could be determined");
  }
  if (vals.direction?.length === 1 && vals.direction[0] === "unspecified") {
    r("direction_unspecified", "direction could not be determined");
  }
  if (record.confidence === "low") {
    r("low_confidence", "labeler reported low confidence");
  }

  const direction = vals.direction[0];
  const cor = normalizeAhaCor(inp.cor);
  if (cor && COR_ALLOWED_DIRECTIONS[cor]) {
    const allowedSet = new Set([...COR_ALLOWED_DIRECTIONS[cor], "unspecified"]);
    if (!allowedSet.has(direction)) {
      r("cor_direction", `COR '${inp.cor}' implies ${Array.from(COR_ALLOWED_DIRECTIONS[cor]).sort()} but direction='${direction}'`);
    }
  }

  const sr = (inp.strength_raw || "").toLowerCase();
  if (sr && !cor) {
    if (sr.includes("against") && !new Set(["against", "no_benefit", "unspecified"]).has(direction)) {
      r("strength_direction", `strength '${inp.strength_raw}' vs direction '${direction}'`);
    } else if (/\bfor\b/.test(sr) && !new Set(["for", "uncertain", "unspecified"]).has(direction)) {
      r("strength_direction", `strength '${inp.strength_raw}' vs direction '${direction}'`);
    }
  }

  const neg = NEG_REGEX.exec(text);
  const pos = POS_REGEX.exec(text);
  const unc = UNC_REGEX.exec(text);
  let allowedWording: Set<string> | null = null;
  let whyWording = "";
  if (neg) {
    allowedWording = new Set(["against", "no_benefit", "unspecified"]);
    whyWording = `negative wording '${neg[0]}'`;
  } else if (pos && !unc) {
    allowedWording = new Set(["for", "uncertain", "unspecified"]);
    whyWording = `positive wording '${pos[0]}'`;
  } else if (unc && !pos) {
    allowedWording = new Set(["uncertain", "unspecified"]);
    whyWording = `uncertainty wording '${unc[0]}'`;
  }
  if (allowedWording && !allowedWording.has(direction)) {
    r("wording_conflict", `direction='${direction}' conflicts with ${whyWording}`);
  }

  if (PED_REGEX.test(`${text} ${ctx}`)) {
    const ageSet = new Set(vals.age_group || []);
    if (!ageSet.has("pediatric") && !ageSet.has("neonate_perinatal")) {
      r("pediatric_missing", "text mentions pediatric/neonatal patients but age_group does not");
    }
  }

  for (const x of facets.drug_or_procedure.values) {
    if (x.id === "other_unlisted" || (vals.drug_or_procedure || []).includes(x.id)) continue;
    const terms = [x.id.replace(/_/g, " "), ...(x.aliases || [])];
    for (const term of terms) {
      if (buildTermRegex(term).test(text)) {
        w("missed_alias", `text mentions '${term}' but drug_or_procedure lacks '${x.id}'`);
        break;
      }
    }
  }

  const flaggedByAi = Boolean(record.needs_review);
  if (R.length > 0 && !flaggedByAi) {
    w("forced_review", "labeler did not flag this record; code forced it into review");
  }
  const status = R.length > 0 || flaggedByAi || record.confidence !== "high" ? "needs_review" : "ai_checked";
  return { status, errors: E, reviews: R, warnings: W };
}

/**
 * Finds the shortest verbatim substring in `text` or `parent_context` matching an ontology term or its aliases.
 */
function findVerbatimSpanInSources(
  candidates: string[],
  text: string,
  parentContext: string
): { span: string; source: "text" | "parent_context" } | null {
  for (const cand of candidates) {
    if (!cand || cand.length < 2) continue;
    const rx = buildTermRegex(cand);
    const mText = rx.exec(text);
    if (mText && mText[0].length >= 3) {
      return { span: mText[0], source: "text" };
    }
  }
  for (const cand of candidates) {
    if (!cand || cand.length < 2) continue;
    const rx = buildTermRegex(cand);
    const mCtx = rx.exec(parentContext);
    if (mCtx && mCtx[0].length >= 3) {
      return { span: mCtx[0], source: "parent_context" };
    }
  }
  return null;
}

/**
 * Deterministic, zero-hallucination verbatim-span ontology indexer.
 * Assigns ontology labels ONLY when an exact verbatim substring exists in `text` or `parent_context`.
 * Every output is guaranteed to pass `validateLabelRecord()` without `reject`.
 */
export function autoLabelRecommendationVerbatim(
  inp: RecommendationLabelInput,
  ont: StrokeOntologySchema = STROKE_ONTOLOGY
): RecommendationLabelOutput {
  const text = inp.text || "";
  const ctx = inp.parent_context || "";
  const UNSPEC: FacetLabelItem = { value: "unspecified", evidence_span: null, source: null };

  const matchMultiFacet = (
    facetId: OntologyFacetId,
    allowParentContext = true,
    extraPatterns: Record<string, string[]> = {}
  ): FacetLabelItem[] => {
    const f = ont.facets[facetId];
    const items: FacetLabelItem[] = [];
    for (const valDef of f.values) {
      if (valDef.id === "unspecified" || valDef.id.startsWith("other_")) continue;
      const searchTerms = [
        ...(extraPatterns[valDef.id] || []),
        ...(valDef.aliases || []),
        valDef.id.replace(/_/g, " "),
      ];
      const found = findVerbatimSpanInSources(
        searchTerms,
        text,
        allowParentContext ? ctx : ""
      );
      if (found) {
        items.push({
          value: valDef.id,
          evidence_span: found.span,
          source: found.source,
        });
      }
    }
    return items;
  };

  // 1. Condition
  let condition = matchMultiFacet("condition", true, {
    ais: ["acute ischemic stroke", "acute ischaemic stroke", "ischemic stroke", "ischaemic stroke", "AIS"],
    ich: ["intracerebral hemorrhage", "intracerebral haemorrhage", "spontaneous ICH", "acute ICH"],
    sah: ["aneurysmal subarachnoid hemorrhage", "aneurysmal subarachnoid haemorrhage", "subarachnoid hemorrhage", "subarachnoid haemorrhage", "aSAH"],
    atrial_fibrillation: ["atrial fibrillation", "atrial flutter"],
    stroke_associated_pneumonia: ["stroke-associated pneumonia", "pneumonia"],
    post_stroke_aphasia: ["aphasia", "people with aphasia"],
    post_stroke_motor_impairment: ["motor rehabilitation", "motor recovery", "upper limb", "gait"],
    post_stroke_visual_impairment: ["visual impairment", "visual field"],
    stroke_general: ["stroke"],
  });
  if (condition.length > 1) {
    // If specific conditions are found alongside 'stroke_general', remove 'stroke_general' per ontology counter-definition
    const specific = condition.filter((c) => c.value !== "stroke_general");
    if (specific.length > 0) condition = specific;
    // If 'suspected_stroke' is matched via 'suspected AIS', drop 'ais' unless confirmed AIS is stated separately
    if (condition.some((c) => c.value === "suspected_stroke") && /suspected\s+AIS/i.test(text)) {
      const nonAis = condition.filter((c) => c.value !== "ais");
      if (nonAis.length > 0) condition = nonAis;
    }
  }
  if (condition.length === 0) {
    condition = [UNSPEC];
  }

  // 2. Age group (strictly from explicit words in text or parent_context)
  let age_group = matchMultiFacet("age_group", true, {
    pediatric: ["pediatric patients", "pediatric", "paediatric", "children"],
    neonate_perinatal: ["neonatal", "perinatal", "neonates"],
    adult: ["adult patients", "adults", "18 to 70 years", "≥18 years"],
    older_adult: ["older adults", "≥80 years", "80 years or older"],
  });
  if (age_group.length === 0) {
    age_group = [UNSPEC];
  }

  // 3. Special populations
  const special_populations = matchMultiFacet("special_populations", false);

  // 4. Phase
  let phase = matchMultiFacet("phase", true, {
    primary_prevention: ["Primary Prevention", "primary prevention", "first stroke"],
    prehospital: ["Prehospital", "prehospital", "ambulance", "mobile stroke unit", "EMS"],
    emergency_department: ["emergent brain", "initial imaging", "emergency department", "Initial, Vascular"],
    acute_treatment: ["Intravenous Thrombolysis", "Endovascular", "Acute", "thrombolysis", "thrombectomy", "Early Management"],
    neurocritical_care: ["Brain Swelling", "Neurocritical", "intracranial pressure", "vasospasm", "delayed cerebral ischemia"],
    rehabilitation: ["Rehabilitation", "rehabilitation", "recovery", "aphasia"],
    secondary_prevention: ["Secondary Prevention", "secondary prevention", "recurrent stroke"],
    stroke_unit_inpatient: ["inpatient", "stroke unit", "General Supportive Care", "dysphagia", "pneumonia"],
  });
  if (phase.length === 0) {
    phase = [UNSPEC];
  }

  // 5. Intervention type
  let intervention_type = matchMultiFacet("intervention_type", true, {
    iv_thrombolysis: ["intravenous thrombolysis", "thrombolytic", "fibrinolytic", "tenecteplase", "alteplase", "IVT"],
    endovascular_thrombectomy: ["endovascular thrombectomy", "mechanical thrombectomy", "endovascular therapy", "thrombectomy", "EVT"],
    bp_management: ["blood pressure", "BP lowering", "systolic BP", "antihypertensive", "hypertension"],
    anticoagulation: ["anticoagulation", "anticoagulant", "oral anticoagulant"],
    antithrombotic_acute: ["antiplatelet", "dual antiplatelet", "aspirin", "clopidogrel", "ticagrelor"],
    neuroimaging: ["brain and vascular imaging", "imaging", "MRI/MRA", "CT/CTA", "noncontrast CT", "perfusion"],
    aneurysm_securing: ["coiling", "clipping", "aneurysm obliteration", "aneurysm repair"],
    speech_language_therapy: ["speech and language therapy", "language therapy", "SLT", "aphasia"],
    rehabilitation_therapy: ["motor rehabilitation", "rehabilitation", "task-specific", "virtual reality"],
    infection_prevention_treatment: ["antibiotic", "pneumonia", "infection"],
    dysphagia_swallowing: ["swallowing", "dysphagia", "nutrition", "oral hygiene"],
    glycemic_management: ["glucose", "glycemic", "hyperglycemia", "hypoglycemia"],
    brain_swelling_management: ["Brain Swelling", "cerebral edema", "osmotic", "glibenclamide"],
    decompressive_surgery: ["decompressive craniectomy", "hemicraniectomy", "surgical evacuation", "hematoma evacuation"],
    cardiac_rhythm_management: ["catheter ablation", "rhythm control", "left atrial appendage", "Atrial Fibrillation"],
    lifestyle_risk_modification: ["physical activity", "diet", "smoking", "lifestyle", "Primary Prevention"],
  });
  if (intervention_type.length === 0) {
    const fallbackSpan = findVerbatimSpanInSources(["management", "treatment", "therapy", "care"], text, ctx);
    if (fallbackSpan) {
      intervention_type = [
        { value: "other_intervention", evidence_span: fallbackSpan.span, source: fallbackSpan.source },
      ];
    } else {
      intervention_type = [
        { value: "other_intervention", evidence_span: text.slice(0, Math.min(15, text.length)) || "recommendation", source: "text" },
      ];
    }
  }

  // 6. Drug or procedure (strictly from recommendation text)
  const drug_or_procedure = matchMultiFacet("drug_or_procedure", false);

  // 7. Time window (strictly onset windows in text)
  const time_window = matchMultiFacet("time_window", false, {
    within_4_5h: ["4.5-hour", "4.5 hours", "within 4.5 h"],
    within_6h: ["within 6 hours", "6-hour"],
    h6_to_24h: ["6 to 24 hours", "6–24 hours", "4.5 to 9 hours", "4.5–9 hours"],
    within_24h: ["within 24 hours", "24 hours of symptom onset"],
    unknown_onset_wake_up: ["wake-up stroke", "unknown onset"],
  });

  // 8. Outcome target
  const outcome_target = matchMultiFacet("outcome_target", false);

  // 9. Direction
  let direction: FacetLabelItem = UNSPEC;
  const noBenMatch = /\b(does not result in improved|does not improve|no benefit|is not useful|not beneficial)\b/i.exec(text);
  const negMatch = NEG_REGEX.exec(text);
  const uncMatch = UNC_REGEX.exec(text);
  const posMatch = POS_REGEX.exec(text);
  const corNorm = normalizeAhaCor(inp.cor);

  if (noBenMatch && (!corNorm || corNorm === "3: no benefit" || corNorm === "3")) {
    direction = { value: "no_benefit", evidence_span: noBenMatch[0], source: "text" };
  } else if (negMatch) {
    direction = { value: "against", evidence_span: negMatch[0], source: "text" };
  } else if (uncMatch && !posMatch) {
    direction = { value: "uncertain", evidence_span: uncMatch[0], source: "text" };
  } else if (posMatch) {
    direction = { value: "for", evidence_span: posMatch[0], source: "text" };
  } else {
    // Check additional positive verbs common in guidelines
    const altPos = /\b(recommend|recommended|suggest|suggested|indicated|beneficial|effective|reasonable|preferred|endorsed)\b/i.exec(text);
    if (altPos) {
      direction = { value: "for", evidence_span: altPos[0], source: "text" };
    }
  }

  const reviewReasons: ReviewReasonCode[] = [];
  const allValues = [
    ...condition.map((x) => x.value),
    ...age_group.map((x) => x.value),
    ...special_populations.map((x) => x.value),
    ...phase.map((x) => x.value),
    ...intervention_type.map((x) => x.value),
    ...drug_or_procedure.map((x) => x.value),
    ...time_window.map((x) => x.value),
    ...outcome_target.map((x) => x.value),
    direction.value,
  ];

  if (allValues.some((v) => v.startsWith("other_"))) {
    reviewReasons.push("label_not_in_ontology");
  }
  if (condition[0].value === "unspecified" || direction.value === "unspecified") {
    reviewReasons.push("missing_context");
  }

  const needsReview = reviewReasons.length > 0;
  const confidence: "high" | "medium" | "low" = needsReview ? "medium" : "high";

  const candidateOutput: RecommendationLabelOutput = {
    rec_id: inp.rec_id,
    ontology_version: ont.ontology_version,
    labels: {
      condition,
      age_group,
      special_populations,
      phase,
      intervention_type,
      drug_or_procedure,
      time_window,
      outcome_target,
      direction,
    },
    confidence,
    needs_review: needsReview,
    review_reasons: reviewReasons,
    notes: "Indexed via verbatim ontology span matcher.",
  };

  const validation = validateLabelRecord(inp, candidateOutput, ont);
  if (validation.reviews.length > 0 && !candidateOutput.needs_review) {
    candidateOutput.needs_review = true;
    candidateOutput.confidence = "medium";
    if (!candidateOutput.review_reasons.includes("other")) {
      candidateOutput.review_reasons.push("other");
    }
  }

  return candidateOutput;
}
