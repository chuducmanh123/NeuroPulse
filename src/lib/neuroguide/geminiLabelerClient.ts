import fs from "fs";
import path from "path";
import type {
  RecommendationLabelInput,
  RecommendationLabelOutput,
  PivotalTrialRecord,
  OntologyFacetId,
  SubspecialtyType,
} from "../../types/neuroguide.ts";
import { NEUROLOGY_SUBSPECIALTIES } from "../../types/neuroguide.ts";
import { GEMINI_WATERFALL_MODELS, recordGeminiFallback } from "../gemini/models.ts";
import {
  STROKE_ONTOLOGY,
  validateLabelRecord,
  autoLabelRecommendationVerbatim,
  sanitizeControlChars,
  KEY_TRIAL_FACETS,
  EXCLUDED_TRIAL_TAG_IDS,
} from "./ontologyValidator.ts";
import { PIVOTAL_TRIALS_SEED } from "../../data/pivotalTrialsSeed.ts";

function readGeminiKeyFromEnvFile(envPath: string): string {
  if (!fs.existsSync(envPath)) return "";
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("GEMINI_API_KEY=")) {
        const val = trimmed
          .slice("GEMINI_API_KEY=".length)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (val) return val;
      }
    }
  } catch {
    // Ignore
  }
  return "";
}

function loadGeminiApiKey(): string {
  const envKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (envKey) return envKey;
  if (process.env.NODE_ENV === "production") return "";
  return (
    readGeminiKeyFromEnvFile(path.join(process.cwd(), ".env.local")) ||
    readGeminiKeyFromEnvFile(path.join(process.cwd(), ".env"))
  );
}

const GEMINI_MODELS = GEMINI_WATERFALL_MODELS;

/**
 * Renders a compact ontology reference block for the Gemini System Prompt.
 */
export function renderCompactOntologyBlock(): string {
  const lines: string[] = [];
  for (const [facetName, facetObj] of Object.entries(STROKE_ONTOLOGY.facets)) {
    const desc = facetObj.def || "";
    const card = facetObj.cardinality || "multi";
    lines.push(`### Facet: \`${facetName}\` (cardinality: ${card}) — ${desc}`);
    for (const term of facetObj.values || []) {
      const aliases = (term.aliases || []).slice(0, 6).join(", ");
      lines.push(`- \`${term.id}\` (${term.label_en || term.label_vi}): [${aliases}]`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Calls Google Gemini REST API to label a single recommendation against STROKE_ONTOLOGY,
 * then strictly validates via validateLabelRecord(). Falls back to deterministic verbatim
 * labeler if API key is absent or validation fails after repair.
 */
export async function labelRecommendationWithGemini(
  inp: RecommendationLabelInput
): Promise<{
  record: RecommendationLabelOutput;
  provider: "gemini" | "deterministic-verbatim";
  validationErrors: string[];
}> {
  const cleanInput: RecommendationLabelInput = {
    rec_id: inp.rec_id,
    society: inp.society,
    guideline_id: inp.guideline_id,
    section_path: sanitizeControlChars(inp.section_path),
    parent_context: sanitizeControlChars(inp.parent_context),
    rec_number: inp.rec_number ?? null,
    page: inp.page ?? null,
    text: sanitizeControlChars(inp.text),
    cor: inp.cor ?? null,
    loe: inp.loe ?? null,
    strength_raw: inp.strength_raw ?? null,
    quality_raw: inp.quality_raw ?? null,
    change_type: inp.change_type ?? null,
  };

  const apiKey = loadGeminiApiKey();
  if (!apiKey) {
    const fallback = autoLabelRecommendationVerbatim(cleanInput);
    return {
      record: fallback,
      provider: "deterministic-verbatim",
      validationErrors: [],
    };
  }

  const systemInstruction = [
    `You are a clinical guideline recommendation labeler for NeuroGuide (ontology_version="${STROKE_ONTOLOGY.ontology_version}").`,
    `STRICT RULES:`,
    `1. ONLY use term IDs from the controlled ontology below.`,
    `2. Every label MUST have an "evidence_span" that is an EXACT verbatim substring of input.text (source="text") or input.parent_context (source="parent_context").`,
    `3. NEVER invent or modify COR, LOE, strength, quality, dosing, or thresholds.`,
    `4. "direction" is a single object { "value": "for"|"against"|"no_benefit"|"uncertain", "evidence_span": "...", "source": "text" }.`,
    "",
    renderCompactOntologyBlock(),
  ].join("\n");

  const userPrompt = `Label this recommendation and return ONLY valid JSON matching RecommendationLabelOutput:\n${JSON.stringify(
    cleanInput,
    null,
    2
  )}`;

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      let rawJson = parts
        .filter((p: any) => p?.text && !p?.thought)
        .map((p: any) => p.text)
        .join("")
        .trim();
      if (!rawJson && parts[0]?.text) rawJson = parts[0].text.trim();
      if (!rawJson) continue;
      rawJson = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

      const parsed = JSON.parse(rawJson) as RecommendationLabelOutput;
      parsed.rec_id = cleanInput.rec_id;
      parsed.ontology_version = STROKE_ONTOLOGY.ontology_version;

      const check = validateLabelRecord(cleanInput, parsed);
      if (check.status !== "reject") {
        return {
          record: parsed,
          provider: "gemini",
          validationErrors: check.errors.map((e) => e.msg),
        };
      }
    } catch {
      // Try next model
    }
  }

  // Safe deterministic fallback if Gemini fails or produces non-verbatim spans
  const fallback = autoLabelRecommendationVerbatim(cleanInput);
  return {
    record: fallback,
    provider: "deterministic-verbatim",
    validationErrors: [],
  };
}

/**
 * Looks up a clinical trial by PMID, DOI, or Acronym from:
 * 1. Existing PIVOTAL_TRIALS_SEED
 * 2. Local NeuroPulse articles (public/data/articles.json)
 * 3. NCBI PubMed E-utilities API (esearch + esummary)
 * and synthesizes a draft PivotalTrialRecord for 1-click Admin Auto-Fill.
 */
interface FetchedArticleMeta {
  title: string;
  abstract: string;
  journal: string;
  year: number;
  pmid?: string;
  doi?: string;
  source: "neuropulse-local" | "pubmed-api" | "europepmc-api";
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePubMedEfetchXml(xml: string, fallbackPmid: string, fallbackDoi?: string): FetchedArticleMeta | null {
  const titleMatch = xml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/i);
  const title = titleMatch ? decodeXmlEntities(titleMatch[1]).replace(/\.$/, "") : "";
  if (!title) return null;

  const abstractMatches = [...xml.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/gi)];
  const abstractParts = abstractMatches
    .map((m) => {
      const attrs = m[1] || "";
      const labelMatch = attrs.match(/Label=["']([^"']+)["']/i);
      const body = decodeXmlEntities(m[2]);
      if (!body) return "";
      return labelMatch?.[1] ? `${labelMatch[1]}: ${body}` : body;
    })
    .filter(Boolean);
  const abstract = abstractParts.join("\n");

  const journalMatch =
    xml.match(/<Journal>[\s\S]*?<ISOAbbreviation>([\s\S]*?)<\/ISOAbbreviation>/i) ||
    xml.match(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/i);
  const journal = journalMatch ? decodeXmlEntities(journalMatch[1]) : "";

  const yearMatch =
    xml.match(/<JournalIssue[^>]*>[\s\S]*?<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/i) ||
    xml.match(/<JournalIssue[^>]*>[\s\S]*?<PubDate>[\s\S]*?<MedlineDate>(\d{4})/i);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const pmidMatch = xml.match(/<ArticleId\s+IdType=["']pmid["']>([^<]+)<\/ArticleId>/i);
  const doiMatch = xml.match(/<ArticleId\s+IdType=["']doi["']>([^<]+)<\/ArticleId>/i);

  return {
    title,
    abstract,
    journal,
    year,
    pmid: pmidMatch?.[1]?.trim() || fallbackPmid || undefined,
    doi: doiMatch?.[1]?.trim() || fallbackDoi || undefined,
    source: "pubmed-api",
  };
}

async function fetchArticleFromPubMedOrEuropePmc(
  q: string,
  cleanDoi: string,
  isDoi: boolean,
  isNumericPmid: boolean
): Promise<FetchedArticleMeta | null> {
  // 1. Try PubMed E-utilities
  try {
    let pmid = isNumericPmid ? q : "";
    if (!pmid) {
      const term = isDoi
        ? `${cleanDoi}[DOI]`
        : `${q}[Title/Abstract] AND (trial OR randomized OR study)`;
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&term=${encodeURIComponent(
        term
      )}`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        pmid = searchData?.esearchresult?.idlist?.[0] || "";
      }
    }

    if (pmid) {
      const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(
        pmid
      )}&retmode=xml`;
      const efetchRes = await fetch(efetchUrl, { signal: AbortSignal.timeout(8000) });
      if (efetchRes.ok) {
        const xml = await efetchRes.text();
        const parsed = parsePubMedEfetchXml(xml, pmid, isDoi ? cleanDoi : undefined);
        if (parsed) {
          if (isDoi && parsed.doi && parsed.doi.toLowerCase() !== cleanDoi) {
            // Mismatched DOI, ignore
          } else {
            return parsed;
          }
        }
      }
    }
  } catch {
    // Fall through to Europe PMC
  }

  // 2. Fallback to Europe PMC (great for DOIs not yet indexed or when PubMed esearch misses)
  try {
    const query = isDoi ? `DOI:"${cleanDoi}"` : `TITLE:"${q}" OR "${q}"`;
    const epmcUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
      query
    )}&format=json&resultType=core&pageSize=1`;
    const epmcRes = await fetch(epmcUrl, { signal: AbortSignal.timeout(8000) });
    if (epmcRes.ok) {
      const epmcData = await epmcRes.json();
      const hit = epmcData?.resultList?.result?.[0];
      if (hit && hit.title) {
        const hitDoi = String(hit.doi || "").trim().toLowerCase();
        if (isDoi && hitDoi && hitDoi !== cleanDoi) {
          return null;
        }
        return {
          title: decodeXmlEntities(String(hit.title)).replace(/\.$/, ""),
          abstract: decodeXmlEntities(String(hit.abstractText || "")),
          journal: String(hit.journalInfo?.journal?.medlineAbbreviation || hit.journalTitle || ""),
          year: Number(hit.pubYear) || new Date().getFullYear(),
          pmid: hit.pmid ? String(hit.pmid) : undefined,
          doi: hit.doi ? String(hit.doi) : isDoi ? cleanDoi : undefined,
          source: "europepmc-api",
        };
      }
    }
  } catch {
    // Ignore network error
  }

  return null;
}

function renderTrialOntologyBlock(): string {
  const lines: string[] = [];
  for (const facetName of KEY_TRIAL_FACETS) {
    const facetObj = STROKE_ONTOLOGY.facets[facetName];
    if (!facetObj) continue;
    lines.push(`### Facet: \`${facetName}\``);
    for (const term of facetObj.values || []) {
      if (EXCLUDED_TRIAL_TAG_IDS.has(term.id)) continue;
      lines.push(`- \`${term.id}\` (${term.label_en || term.label_vi})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function sanitizeTrialOntologyTags(
  rawTags: unknown
): Partial<Record<OntologyFacetId, string[]>> {
  const out: Partial<Record<OntologyFacetId, string[]>> = {};
  if (!rawTags || typeof rawTags !== "object") return out;
  for (const facetKey of KEY_TRIAL_FACETS) {
    const arr = (rawTags as Record<string, unknown>)[facetKey];
    if (!Array.isArray(arr)) continue;
    const allowedIds = new Set(
      (STROKE_ONTOLOGY.facets[facetKey]?.values || [])
        .map((v) => v.id)
        .filter((id) => !EXCLUDED_TRIAL_TAG_IDS.has(id))
    );
    const filtered = [...new Set(arr.map(String).filter((id) => allowedIds.has(id)))];
    if (filtered.length > 0) {
      out[facetKey] = filtered;
    }
  }
  return out;
}

async function extractTrialFromAbstractWithGemini(
  meta: FetchedArticleMeta,
  queryHint: string
): Promise<{ trial: PivotalTrialRecord; usedGemini: boolean }> {
  const apiKey = loadGeminiApiKey();
  const validSubspecialties = NEUROLOGY_SUBSPECIALTIES.filter((s) => s !== "All Subspecialties");
  const validDesigns = [
    "Phase 3 RCT",
    "Phase 2 RCT",
    "Meta-Analysis",
    "Prospective Registry",
  ] as const;
  const validVerdicts = ["POSITIVE", "NON_INFERIOR", "NEUTRAL", "NEGATIVE"] as const;

  if (apiKey && meta.abstract.trim().length > 20) {
    const systemInstruction = [
      `You are a clinical neurology research assistant extracting structured trial data strictly from an article's Title and Abstract.`,
      `RULES:`,
      `1. Extract ONLY information explicitly stated in the Title and Abstract. NEVER invent or guess numbers, sample sizes, statistics, sICH rates, mortality rates, or endpoints.`,
      `2. If any field is NOT stated in the abstract, return "" (empty string) for strings, or null for sampleSize.`,
      `3. For "acronym": extract the official trial acronym if mentioned (e.g. "NOR-TEST 2", "SELECT2", "ANGEL-ASPECT"), otherwise "".`,
      `4. For "subspecialty": pick the best match from [${validSubspecialties.map((s) => `"${s}"`).join(", ")}].`,
      `5. For "design": pick the best match from ["Phase 3 RCT", "Phase 2 RCT", "Meta-Analysis", "Prospective Registry"].`,
      `6. For "verdict": pick from ["POSITIVE", "NON_INFERIOR", "NEUTRAL", "NEGATIVE"] based strictly on the primary outcome result in the abstract (default "NEUTRAL" if unclear).`,
      `7. For "ontologyTags": select ONLY relevant term IDs from the allowed facets below. Do NOT invent IDs.`,
      `8. For "bottomLine": write 1 concise clinical takeaway sentence summarizing the abstract's main finding, or "" if unclear.`,
      "",
      renderTrialOntologyBlock(),
    ].join("\n");

    const userPrompt = JSON.stringify(
      {
        title: meta.title,
        journal: meta.journal,
        year: meta.year,
        pmid: meta.pmid || "",
        doi: meta.doi || "",
        abstract: meta.abstract,
        outputSchema: {
          acronym: "string",
          sampleSize: "number | null",
          subspecialty: "string",
          design: "Phase 3 RCT | Phase 2 RCT | Meta-Analysis | Prospective Registry",
          population: "string",
          timeWindow: "string",
          intervention: "string",
          comparator: "string",
          primaryMetric: "string",
          primaryStats: "string",
          verdict: "POSITIVE | NON_INFERIOR | NEUTRAL | NEGATIVE",
          sICH: "string",
          mortality90d: "string",
          safetyNote: "string",
          bottomLine: "string",
          ontologyTags: {
            condition: ["string"],
            phase: ["string"],
            intervention_type: ["string"],
            drug_or_procedure: ["string"],
            time_window: ["string"],
            outcome_target: ["string"],
          },
        },
      },
      null,
      2
    );

    for (const model of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.0,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        let rawJson = parts
          .filter((p: any) => p?.text && !p?.thought)
          .map((p: any) => p.text)
          .join("")
          .trim();
        if (!rawJson && parts[0]?.text) rawJson = parts[0].text.trim();
        if (!rawJson) continue;
        rawJson = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

        const parsed = JSON.parse(rawJson);
        const acronym = String(parsed.acronym || "").trim();
        const subspecialty = validSubspecialties.includes(parsed.subspecialty)
          ? (parsed.subspecialty as SubspecialtyType)
          : "Stroke";
        const design = validDesigns.includes(parsed.design)
          ? parsed.design
          : "Phase 3 RCT";
        const verdict = validVerdicts.includes(parsed.verdict)
          ? parsed.verdict
          : "NEUTRAL";
        const sampleSize =
          typeof parsed.sampleSize === "number" && parsed.sampleSize > 0
            ? parsed.sampleSize
            : undefined;

        const idSlug = (acronym || queryHint || `pmid-${meta.pmid || meta.year}`)
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase();

        const trial: PivotalTrialRecord = {
          id: `${idSlug}-${meta.year}`,
          acronym,
          title: meta.title,
          year: meta.year,
          journal: meta.journal,
          pmid: meta.pmid,
          doi: meta.doi,
          subspecialty,
          evidenceSource: "PEER_REVIEWED_PUBLISHED",
          design,
          sampleSize,
          pico: {
            population: String(parsed.population || "").trim(),
            intervention: String(parsed.intervention || "").trim(),
            comparator: String(parsed.comparator || "").trim(),
            timeWindow: String(parsed.timeWindow || "").trim() || undefined,
          },
          primaryEndpoint: {
            metric: String(parsed.primaryMetric || "").trim(),
            resultStats: String(parsed.primaryStats || "").trim(),
            verdict,
          },
          safetyEndpoint: {
            sICH: String(parsed.sICH || "").trim() || undefined,
            mortality90d: String(parsed.mortality90d || "").trim() || undefined,
            note: String(parsed.safetyNote || "").trim() || undefined,
          },
          bottomLine: String(parsed.bottomLine || "").trim(),
          ontologyTags: sanitizeTrialOntologyTags(parsed.ontologyTags),
        };
        return { trial, usedGemini: true };
      } catch {
        // Try next Gemini model
      }
    }
  }

  // Fallback when Gemini is unavailable or abstract is missing: keep empty fields blank (no fake placeholders)
  const acronymMatch = meta.title.match(/\(([A-Z][A-Z0-9-]{2,15})\)/);
  const acronym = acronymMatch?.[1] || "";
  const idSlug = (acronym || `pmid-${meta.pmid || meta.year}`)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return {
    usedGemini: false,
    trial: {
      id: `${idSlug}-${meta.year}`,
      acronym,
      title: meta.title,
      year: meta.year,
      journal: meta.journal,
      pmid: meta.pmid,
      doi: meta.doi,
      subspecialty: "Stroke",
      evidenceSource: "PEER_REVIEWED_PUBLISHED",
      design: "Phase 3 RCT",
      sampleSize: undefined,
      pico: {
        population: "",
        intervention: "",
        comparator: "",
        timeWindow: undefined,
      },
      primaryEndpoint: {
        metric: "",
        resultStats: "",
        verdict: "POSITIVE",
      },
      safetyEndpoint: {
        sICH: undefined,
        mortality90d: undefined,
        note: undefined,
      },
      bottomLine: "",
      ontologyTags: inferTrialOntologyTags(`${meta.title} ${meta.abstract}`),
    },
  };
}

/**
 * Looks up a clinical trial by PMID, DOI, or Acronym from:
 * 1. Existing PIVOTAL_TRIALS_SEED
 * 2. Local NeuroPulse articles (public/data/articles.json)
 * 3. NCBI PubMed E-utilities (esearch + efetch XML) / Europe PMC API
 * and triggers Gemini to extract structured trial fields from the abstract.
 */
export async function lookupTrialByPmidOrDoi(
  identifier: string
): Promise<{
  ok: boolean;
  trial?: PivotalTrialRecord;
  source?: "seed" | "neuropulse-local" | "pubmed-api" | "europepmc-api";
  usedGemini?: boolean;
  error?: string;
}> {
  const q = (identifier || "").trim();
  if (!q) {
    return { ok: false, error: "Vui lòng nhập PMID, DOI hoặc tên viết tắt nghiên cứu." };
  }

  const qLower = q.toLowerCase();
  const cleanDoi = qLower
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
  const isDoi = /^10\.\d{4,9}\/\S+$/i.test(cleanDoi);
  const isNumericPmid = /^\d{6,9}$/.test(q);

  // 1. Check PIVOTAL_TRIALS_SEED first
  const seedMatch = PIVOTAL_TRIALS_SEED.find(
    (t) =>
      t.pmid === q ||
      (t.doi && t.doi.toLowerCase() === cleanDoi) ||
      t.acronym.toLowerCase() === qLower ||
      t.id.toLowerCase() === qLower
  );
  if (seedMatch) {
    return {
      ok: true,
      trial: {
        ...seedMatch,
        ontologyTags: sanitizeTrialOntologyTags(seedMatch.ontologyTags),
      },
      source: "seed",
      usedGemini: false,
    };
  }

  // 2. Check local public/data/articles.json (if it has abstract, run Gemini on it)
  try {
    const articlesPath = path.join(process.cwd(), "public", "data", "articles.json");
    if (fs.existsSync(articlesPath)) {
      const articles = JSON.parse(fs.readFileSync(articlesPath, "utf-8")) as any[];
      const localMatch = articles.find((a) => {
        const aDoi = String(a.doi || "")
          .toLowerCase()
          .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
          .trim();
        const aTitle = String(a.title || "").toLowerCase();
        return (
          (isDoi && aDoi === cleanDoi) ||
          aTitle.includes(`(${qLower})`) ||
          aTitle.startsWith(`${qLower}:`)
        );
      });

      if (localMatch && String(localMatch.abstract || "").trim().length > 20) {
        const meta: FetchedArticleMeta = {
          title: String(localMatch.title || ""),
          abstract: String(localMatch.abstract || ""),
          journal: String(localMatch.journal || ""),
          year: Number(String(localMatch.publishedAt || "2025").slice(0, 4)) || 2025,
          doi: String(localMatch.doi || "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") || undefined,
          source: "neuropulse-local",
        };
        const extracted = await extractTrialFromAbstractWithGemini(meta, q);
        return {
          ok: true,
          trial: extracted.trial,
          source: "neuropulse-local",
          usedGemini: extracted.usedGemini,
        };
      }
    }
  } catch {
    // Continue to PubMed/EuropePMC lookup
  }

  // 3. Query NCBI PubMed E-utilities (esearch + efetch XML) / Europe PMC
  const remoteMeta = await fetchArticleFromPubMedOrEuropePmc(q, cleanDoi, isDoi, isNumericPmid);
  if (remoteMeta) {
    const extracted = await extractTrialFromAbstractWithGemini(remoteMeta, q);
    return {
      ok: true,
      trial: extracted.trial,
      source: remoteMeta.source,
      usedGemini: extracted.usedGemini,
    };
  }

  return {
    ok: false,
    error: isDoi
      ? `Không tìm thấy bài báo nào có DOI "${cleanDoi}" trên PubMed hoặc Europe PMC.`
      : `Không tìm thấy nghiên cứu khớp với "${q}" trên PubMed hoặc thư viện nội bộ.`,
  };
}

/**
 * Infers ontology tags for a trial based on its title/abstract text.
 */
export function inferTrialOntologyTags(
  text: string
): Partial<Record<OntologyFacetId, string[]>> {
  const dummyRec: RecommendationLabelInput = {
    rec_id: "TEMP_TRIAL",
    society: "TRIAL",
    guideline_id: "TRIAL",
    section_path: text,
    parent_context: text,
    text,
  };
  const labeled = autoLabelRecommendationVerbatim(dummyRec);
  const out: Partial<Record<OntologyFacetId, string[]>> = {};
  for (const [facet, items] of Object.entries(labeled.labels)) {
    if (facet === "direction") continue;
    if (Array.isArray(items) && items.length > 0) {
      const filtered = items
        .map((i) => i.value)
        .filter((id) => !EXCLUDED_TRIAL_TAG_IDS.has(id));
      if (filtered.length > 0) {
        out[facet as OntologyFacetId] = filtered;
      }
    }
  }
  return out;
}
