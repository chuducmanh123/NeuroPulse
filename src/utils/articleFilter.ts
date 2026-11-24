import { cleanMedicalText } from "@/utils/textCleaner";

export interface FilterableArticle {
  title?: string;
  authors?: unknown[];
  abstract?: string;
  journal?: {
    short_name?: string;
  } | null;
}

export const STRICT_TITLE_NEURO_REGEX =
  /\b(stroke|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral|subarachnoid|intracranial|cerebral|carotid|aneurysm|multiple sclerosis|meningioma|glioma|glioblastoma|astrocytoma|brain|neurolog\w*|neurodegenerat\w*|alzheimer\w*|dementia|parkinson\w*|epilep\w*|seizure\w*|status epilepticus|myasthenia|neuropath\w*|neuralgi\w*|myopath\w*|encephalit\w*|meningit\w*|myelit\w*|neuromyelitis|mogad|guillain|cidp|migraine|cluster headache|trigeminal|hydrocephalus|spinal|foot drop|als|amyotrophic lateral sclerosis|huntington\w*|ataxia|dystonia|tremor|chorea|concussion|traumatic brain|coma|prion|tau|tauopath\w*|lecanemab|donanemab)\b/i;

export const NON_ARTICLE_PATTERNS =
  /^(correction|erratum|error\s+in\s+|retraction|author.?s?\s+reply|reader\s+response|author\s+response|editors.?\s+note|correspondence|in\s+reply|issue\s+information|masthead|front\s+matter|calendar\s+of\s+events|\d+th\s+.*annual\s+meeting|annals\s+of\s+neurology:\s+volume|jama\s+neurology$|.*\(P\d+[-–]\d+\.\d+\)$|cynthia\s+harden,\s+md|lara\s+m\s+lange|a\s+ferrier\s+sesquicentenary|katrin\s+andreasson:|michael\s+t\s+heneka:|ancient\s+brains\s+in\s+a\s+modern\s+world|learn\s+from\s+us:|icarus\s+in\s+the\s+icu)/i;

/**
 * Returns true when a raw article record from `articles.json` represents a
 * valid, neurology-relevant article that should be displayed and counted.
 */
export function isValidNeuroPulseArticle(raw: FilterableArticle): boolean {
  const title = cleanMedicalText(raw.title);
  if (!title || NON_ARTICLE_PATTERNS.test(title)) return false;

  const authorCount = raw.authors?.length || 0;
  const rawAbsCheck = (raw.abstract || "").toLowerCase();
  if (
    authorCount === 0 &&
    (!rawAbsCheck || rawAbsCheck.startsWith("original abstract"))
  ) {
    return false;
  }

  const jShort = raw.journal?.short_name || "";
  const isSpecialty = !["NEJM", "The Lancet", "JAMA"].includes(jShort);
  if (!isSpecialty && !STRICT_TITLE_NEURO_REGEX.test(title)) {
    return false;
  }

  return true;
}

/**
 * Filters a raw list of articles using the canonical NeuroPulse cleaning rules.
 */
export function filterValidNeuroPulseArticles<T extends FilterableArticle>(
  rawList: T[]
): T[] {
  return rawList.filter(isValidNeuroPulseArticle);
}
