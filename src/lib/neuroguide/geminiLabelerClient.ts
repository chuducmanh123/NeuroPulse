import fs from "fs";
import path from "path";
import type {
  RecommendationLabelInput,
  RecommendationLabelOutput,
  PivotalTrialRecord,
  OntologyFacetId,
} from "../../types/neuroguide.ts";
import {
  STROKE_ONTOLOGY,
  validateLabelRecord,
  autoLabelRecommendationVerbatim,
  sanitizeControlChars,
} from "./ontologyValidator.ts";
import { PIVOTAL_TRIALS_SEED } from "../../data/pivotalTrialsSeed.ts";

function loadGeminiApiKey(): string {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
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
  }
  return (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
}

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash",
];

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
export async function lookupTrialByPmidOrDoi(
  identifier: string
): Promise<{
  ok: boolean;
  trial?: PivotalTrialRecord;
  source?: "seed" | "neuropulse-local" | "pubmed-api";
  error?: string;
}> {
  const q = (identifier || "").trim();
  if (!q) {
    return { ok: false, error: "Please provide a PMID, DOI, or Trial Acronym." };
  }

  const qLower = q.toLowerCase();
  const cleanDoi = qLower.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
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
    return { ok: true, trial: seedMatch, source: "seed" };
  }

  // 2. Check local public/data/articles.json
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
          (cleanDoi && aDoi === cleanDoi) ||
          aTitle.includes(`(${qLower})`) ||
          aTitle.startsWith(`${qLower}:`)
        );
      });

      if (localMatch) {
        const pubYear = Number(String(localMatch.publishedAt || "2025").slice(0, 4)) || 2025;
        const acronymGuess =
          q.length <= 18 && !q.includes("/")
            ? q.toUpperCase()
            : (String(localMatch.title || "").match(/\b([A-Z][A-Z0-9-]{2,14})\b/)?.[1] || "TRIAL");
        const draft: PivotalTrialRecord = {
          id: `${acronymGuess.replace(/[^a-z0-9]/gi, "").toLowerCase()}-${pubYear}`,
          acronym: acronymGuess,
          title: String(localMatch.title || ""),
          year: pubYear,
          journal: String(localMatch.journal || "Peer-Reviewed Journal"),
          doi: String(localMatch.doi || "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""),
          subspecialty: "Stroke",
          evidenceSource: "PEER_REVIEWED_PUBLISHED",
          design: "Phase 3 RCT",
          sampleSize: 500,
          pico: {
            population: String(localMatch.population || "Patients in neurovascular clinical study"),
            intervention: String(localMatch.keyPoints?.[0] || "Active intervention arm"),
            comparator: "Standard medical management / control arm",
          },
          primaryEndpoint: {
            metric: "Primary efficacy outcome",
            resultStats: String(localMatch.clinicalTakeaway || "Reported in study abstract").slice(0, 120),
            verdict: "POSITIVE",
          },
          safetyEndpoint: {
            sICH: "See full publication",
            mortality90d: "See full publication",
          },
          bottomLine: String(
            localMatch.clinicalTakeaway || localMatch.abstract || localMatch.title || ""
          ).slice(0, 320),
          ontologyTags: inferTrialOntologyTags(
            `${localMatch.title || ""} ${localMatch.abstract || ""} ${(localMatch.tags || []).join(" ")}`
          ),
        };
        return { ok: true, trial: draft, source: "neuropulse-local" };
      }
    }
  } catch {
    // Continue to PubMed lookup
  }

  // 3. Query NCBI PubMed E-utilities if online
  try {
    let pmid = isNumericPmid ? q : "";
    if (!pmid) {
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&term=${encodeURIComponent(
        cleanDoi.includes("10.") ? `${cleanDoi}[DOI]` : `${q}[Title/Abstract] AND (trial OR randomized)`
      )}`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        pmid = searchData?.esearchresult?.idlist?.[0] || "";
      }
    }

    if (pmid) {
      const sumUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`;
      const sumRes = await fetch(sumUrl, { signal: AbortSignal.timeout(6000) });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        const doc = sumData?.result?.[pmid];
        if (doc && doc.title) {
          const title = String(doc.title).replace(/\.$/, "");
          const year = Number(String(doc.pubdate || "2025").slice(0, 4)) || 2025;
          const journal = String(doc.fulljournalname || doc.source || "Major Medical Journal");
          const articleIds: any[] = Array.isArray(doc.articleids) ? doc.articleids : [];
          const doiObj = articleIds.find((x) => x.idtype === "doi");
          const doi = doiObj?.value || (cleanDoi.includes("10.") ? cleanDoi : undefined);
          const acronymMatch = title.match(/\b([A-Z][A-Z0-9-]{2,15})\b/);
          const acronym =
            !isNumericPmid && !q.includes("10.") && q.length <= 16
              ? q.toUpperCase()
              : acronymMatch?.[1] || `PMID-${pmid}`;

          const draft: PivotalTrialRecord = {
            id: `${acronym.replace(/[^a-z0-9]/gi, "").toLowerCase()}-${year}`,
            acronym,
            title,
            year,
            journal,
            pmid,
            doi,
            subspecialty: "Stroke",
            evidenceSource: "PEER_REVIEWED_PUBLISHED",
            design: "Phase 3 RCT",
            sampleSize: 500,
            pico: {
              population: "Patients enrolled in randomized clinical trial",
              intervention: "Investigational intervention arm",
              comparator: "Standard care / control arm",
            },
            primaryEndpoint: {
              metric: "Primary efficacy outcome (e.g., 90-day mRS)",
              resultStats: "Enter primary endpoint statistics (OR/RR/HR, 95% CI, p-value)",
              verdict: "POSITIVE",
            },
            safetyEndpoint: {
              sICH: "Enter sICH %",
              mortality90d: "Enter 90d mortality %",
            },
            bottomLine: `${title} (${journal} ${year}, PMID ${pmid}). Fill in specific primary and safety endpoint figures before saving.`,
            ontologyTags: inferTrialOntologyTags(title),
          };
          return { ok: true, trial: draft, source: "pubmed-api" };
        }
      }
    }
  } catch {
    // Ignore network timeout in sandboxed/offline environments
  }

  return {
    ok: false,
    error: `No matching trial found for "${q}" in local database or PubMed. You can still enter the trial fields manually below.`,
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
      out[facet as OntologyFacetId] = items.map((i) => i.value);
    }
  }
  return out;
}
