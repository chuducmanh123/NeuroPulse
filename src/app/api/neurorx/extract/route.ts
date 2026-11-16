import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { verifyAdminToken } from "@/utils/security";
import { extractTextFromDocument } from "@/lib/neuroguide/documentParser";
import { getAllSources } from "@/lib/neurorx/data";
import { validateDrug } from "@/lib/neurorx/validate";
import { applyQuoteGuard } from "@/lib/neurorx/extractGuard";
import { GEMINI_WATERFALL_MODELS, recordGeminiFallback } from "@/lib/gemini/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function loadGeminiKey(): string {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    try {
      const raw = fs.readFileSync(envPath, "utf-8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("GEMINI_API_KEY=")) {
          const val = trimmed.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
          if (val) return val;
        }
      }
    } catch {}
  }
  return (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
}

const GEMINI_MODELS = GEMINI_WATERFALL_MODELS;

export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin token
    const adminToken =
      req.headers.get("x-admin-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const isAuthenticated = verifyAdminToken(adminToken);
    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator session required." },
        { status: 401 }
      );
    }

    // 2. Parse request parameters (multipart or json)
    let drugId = "";
    let genericName = "";
    let sourceId = "";
    let sourceText = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      drugId = ((formData.get("drug_id") as string) || "").trim().toLowerCase();
      genericName = ((formData.get("generic_name") as string) || drugId).trim();
      sourceId = ((formData.get("source_id") as string) || "").trim();
      const directText = (formData.get("text") as string) || "";
      const file = formData.get("file") as File | null;

      if (file && file.size > 0) {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const parsedDoc = await extractTextFromDocument(buffer, file.name);
        sourceText = parsedDoc.text || "";
      } else if (directText) {
        sourceText = directText;
      }
    } else {
      const body = await req.json();
      drugId = (body.drug_id || "").trim().toLowerCase();
      genericName = (body.generic_name || drugId).trim();
      sourceId = (body.source_id || "").trim();
      sourceText = body.text || "";
    }

    if (!drugId) {
      return NextResponse.json(
        { ok: false, error: "drug_id is required (e.g. lacosamide)." },
        { status: 400 }
      );
    }
    if (!sourceId) {
      return NextResponse.json(
        { ok: false, error: "source_id is required (e.g. fda-lacosamide-2024)." },
        { status: 400 }
      );
    }
    if (!sourceText || sourceText.trim().length < 50) {
      return NextResponse.json(
        {
          ok: false,
          error: "Source text is missing or too short (minimum 50 characters). Please upload a valid document or paste text.",
        },
        { status: 400 }
      );
    }

    const apiKey = loadGeminiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "GEMINI_API_KEY is not configured in the server environment (.env).",
        },
        { status: 500 }
      );
    }

    // 3. Prepare Gemini extraction prompt
    const prompt = `You are an expert clinical pharmacologist and medical data engineer extracting drug information for NeuroRx (a point-of-care Clinical Decision Support System).
Your task is to extract clinical drug data strictly from the provided source text into a structured JSON DrugRecord object.

TARGET DRUG ID: "${drugId}"
GENERIC NAME: "${genericName}"
SOURCE ID: "${sourceId}"

CRITICAL MANDATORY RULES (ZERO HALLUCINATION):
1. Output ONLY a valid JSON object. No conversational prefix, no explanations, no markdown fences.
2. Every clinical value must be a Sourced<T> with { "value": ..., "refs": [{ "source_id": "${sourceId}", "locator": "<section or table>", "quote": "<VERBATIM QUOTE>" }] }.
3. VERBATIM QUOTE MANDATE: Every "quote" string MUST be an EXACT, character-for-character substring (max 400 characters) found in the source text below. Do NOT paraphrase, summarize, or edit any words. If a quote cannot be found verbatim in the source text, our server-side Quote-Guard will immediately reject and null out the entire field.
4. NULL POLICY: If the source text does NOT explicitly state or recommend information for a field, you MUST set "value": null and "refs": []. NEVER invent, extrapolate, or provide standard medical knowledge from outside this text.
5. STATUS & VERIFICATION: "status" MUST be "draft". "verification" MUST be { "verified_by": null, "verified_at": null, "content_hash": null }.
6. EXHAUSTIVE INDICATIONS, ROUTES & AGE/POPULATION STRATA ("regimens"):
   - Extract EVERY clinical indication in INDICATIONS AND USAGE and EVERY corresponding dosing regimen in DOSAGE AND ADMINISTRATION. Do NOT stop after a single representative or neurology-only indication.
   - Create a SEPARATE object in "regimens" for each distinct combination of: (a) clinical indication, (b) age/population group (e.g. Adults & Adolescents, Pediatrics, Neonates, Elderly), (c) route ("IV" | "PO" | "IM" | "SC" | "NG" | "TD"), and (d) setting ("acute_inpatient" | "maintenance_outpatient", e.g. acute/loading vs maintenance/prophylaxis).
   - Include the population/age group in "indication" when stratified (e.g. "Herpes Simplex Encephalitis — Pediatrics (3 months to 12 years)") and give each entry a unique slug in "id".
   - Provide a verbatim "quote" (<= 400 chars) from DOSAGE AND ADMINISTRATION for each regimen, plus complete "dose" (kind, amount, unit, frequency, max_single, max_daily) and full "dose_text" (infusion rate, duration, weight basis like IBW, titration, hydration).
7. REPRODUCTIVE, PREGNANCY & LACTATION ("reproductive") — SECTION-AGNOSTIC SEARCH & MULTI-AXIS SYNTHESIS:
   - Do NOT assume pregnancy/lactation is always in "Section 8.1 / 8.2". Search across ALL possible headings in the source text: BOXED WARNING, CONTRAINDICATIONS, WARNINGS AND PRECAUTIONS, PRECAUTIONS -> Pregnancy (Teratogenic/Nonteratogenic Effects) & Nursing Mothers, USE IN SPECIFIC POPULATIONS -> Pregnancy / Lactation / Females and Males of Reproductive Potential, and CLINICAL PHARMACOLOGY. Record the exact heading found in "locator", and quote directly from that pregnancy/lactation paragraph (never point reproductive refs to INDICATIONS AND USAGE).
   - Synthesize "reproductive.tier.value" ("preferred" | "caution" | "avoid" | null) by weighing 5 axes:
     (1) Contraindications/Boxed Warnings/REMS for fetal harm;
     (2) Human epidemiologic/registry data (sample size adequacy, MCM rate vs baseline, neonatal toxicity/withdrawal);
     (3) Animal teratogenicity & exposure margin (AUC/BSA vs maternal toxicity);
     (4) Maternal disease risk-benefit context;
     (5) Legacy Pregnancy Category (A/B/C/D/X) if stated.
   - Mapping standard:
     * "avoid": Pregnancy contraindication, fetal harm Boxed Warning, Category D/X, strong human teratogenicity/embryo-fetal toxicity, or explicit "avoid/do not use in pregnancy".
     * "caution": Limited/small-sample human data ("no adequate and well-controlled studies", "insufficient to evaluate"), "used during pregnancy only if the potential benefit justifies the potential risk to the fetus", Category C (or B with limited human data / high-dose animal signal), or requires pregnancy PK/TDM monitoring.
     * "preferred": Large-scale human registry/observational data showing no increased risk of MCM/miscarriage/adverse fetal outcomes + no major fetal toxicity warning (Category A, or B with robust reassuring human data), or explicitly recommended as preferred/first-line in pregnancy by a clinical guideline in the source. Do NOT assign "preferred" if the label cites small sample size and "only if potential benefit justifies risk".
     * null: No pregnancy data in source.
   - Record a concise 1-sentence synthesis in "reproductive.tier.note" explaining the evidence basis.

JSON SCHEMA STRUCTURE TO POPULATE:
{
  "id": "${drugId}",
  "generic_name": "${genericName}",
  "tall_man": { "value": "${drugId}", "refs": [...] },
  "classes": ["..."],
  "subspecialties": ["stroke" | "epilepsy" | "movement_disorders" | "headache" | "neuroimmunology" | "neuromuscular" | "dementia" | "neurocritical_care" | "neuro_infectious"],
  "vn_products": { "value": null, "refs": [] },
  "bhyt": { "value": null, "refs": [] },
  "regimens": [
    {
      "id": "${drugId}-<indication-population-route-slug>",
      "indication": "<Indication Name — Population/Age Group if stratified>",
      "setting": "acute_inpatient" | "maintenance_outpatient",
      "route": "IV" | "PO" | "IM" | "SC" | "NG" | "TD",
      "refs": [{ "source_id": "${sourceId}", "locator": "...", "quote": "..." }],
      "dose": {
        "kind": "fixed" | "per_kg",
        "amount": 0,
        "unit": "mg" | "mcg" | "g" | "IU" | "mL",
        "frequency": "...",
        "max_single": 0,
        "max_daily": 0
      },
      "dose_text": "..."
    }
  ],
  "renal_basis": { "value": "cg_abw", "refs": [...] },
  "hepatic": { "value": "<hepatic impairment recommendation or null>", "refs": [...] },
  "black_box": { "value": ["<boxed warning item>"] or null, "refs": [...] },
  "mg_safety": { "value": "safe" | "caution" | "may_worsen" | "avoid", "refs": [...] },
  "ng_tube": { "value": { "crushable": true, "instructions": "..." } or null, "refs": [...] },
  "pgx": { "value": "<pharmacogenomic recommendation or null>", "refs": [...] },
  "ae_tags": { "value": ["sedation_somnolence", ...] or null, "refs": [...] },
  "enzyme_profile": {
    "value": {},
    "refs": [...]
  },
  "reproductive": {
    "tier": { "value": "preferred" | "caution" | "avoid", "refs": [...] },
    "mcm": [],
    "folic_acid": { "value": null, "refs": [] },
    "pregnancy_pk": { "value": null, "refs": [] },
    "postpartum": { "value": null, "refs": [] },
    "contraception": { "value": null, "refs": [] },
    "lactation_rid": { "value": null, "refs": [] },
    "lactation_summary": { "value": null, "refs": [] }
  },
  "status": "draft",
  "verification": {
    "verified_by": null,
    "verified_at": null,
    "content_hash": null
  }
}

SOURCE TEXT:
${sourceText.slice(0, 120000)}
`;

    // 4. Call Gemini
    let rawJsonResponse = "";
    let usedModel = "";

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
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!res.ok) {
          const idx = GEMINI_MODELS.indexOf(model);
          recordGeminiFallback({
            source: "neurorx/extract",
            failedModel: model,
            status: res.status,
            reason: res.statusText || "HTTP error",
            nextModel: GEMINI_MODELS[idx + 1],
          });
          continue;
        }
        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim().length > 30) {
          rawJsonResponse = candidateText.trim();
          usedModel = model;
          break;
        }
      } catch (err: any) {
        const idx = GEMINI_MODELS.indexOf(model);
        recordGeminiFallback({
          source: "neurorx/extract",
          failedModel: model,
          reason: err?.message || "Network/fetch error",
          nextModel: GEMINI_MODELS[idx + 1],
        });
      }
    }

    if (!rawJsonResponse) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to extract draft using Gemini. Please check your network connection or API quota.",
        },
        { status: 502 }
      );
    }

    // 5. Parse JSON
    let parsedDraft: any;
    try {
      const cleanJson = rawJsonResponse
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedDraft = JSON.parse(cleanJson);
    } catch (parseErr) {
      return NextResponse.json(
        {
          ok: false,
          error: "Model returned invalid JSON syntax. Please re-run extraction.",
          raw: rawJsonResponse.slice(0, 1000),
        },
        { status: 500 }
      );
    }

    // 6. Apply Quote-Guard
    const { guardedDraft, rejectedValues } = applyQuoteGuard(parsedDraft, sourceText);

    // 7. Validate Drug schema
    const registeredSources = getAllSources();
    const knownSourceIds = new Set(registeredSources.map((s) => s.id));
    knownSourceIds.add(sourceId);

    const validationErrors = validateDrug(guardedDraft, knownSourceIds);

    return NextResponse.json({
      ok: true,
      draft: guardedDraft,
      rejected_values: rejectedValues,
      validation_errors: validationErrors,
      source_text: sourceText,
      model: usedModel,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal extraction error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
