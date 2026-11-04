import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { detectSociety } from "@/lib/neuroguide/pubmedDiscovery";
import { detectGuidelineFormFormat } from "@/lib/neuroguide/guidelineFormat";

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
    } catch {
      // Ignore
    }
  }
  return (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
}

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = (body.text || "").trim();
    const title = (body.title || "").trim();
    const societyInput = (body.society || "").trim();

    if (!text || text.length < 20) {
      return NextResponse.json({ ok: false, error: "Nội dung văn bản quá ngắn để trích xuất." }, { status: 400 });
    }

    const apiKey = loadGeminiKey();
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy GEMINI_API_KEY trong cấu hình hệ thống." },
        { status: 500 }
      );
    }

    const effectiveSociety = societyInput || detectSociety(title, text.slice(0, 3000));
    const formFormat = detectGuidelineFormFormat({
      society: effectiveSociety,
      title,
      content: text,
    });

    let contentToAnalyze = text;
    // For guidelines with a Synoptic Table, prioritize the full synoptic recommendations table
    const synopticMatch = text.match(/(?:Table\s*(?:3|11|1|2|4|5|10)|Synoptic\s+table)[\s\S]*?(?:References|Acknowledgements|Funding|$)/i);
    if (synopticMatch && synopticMatch[0].length > 1000) {
      contentToAnalyze = `${text.slice(0, 8000)}\n\n---\n[OFFICIAL SYNOPTIC TABLE SECTION]\n${synopticMatch[0].slice(0, 60000)}`;
    } else if (text.length > 60000) {
      contentToAnalyze = text.slice(0, 60000);
    }

    const prompt = `You are a clinical neurology guideline extraction expert.
Transform the following clinical text/notes from a guideline summary (${title || "Clinical Guideline"}) into a clean, complete Markdown table of recommendations.
Preserve clinical specificity, numbers, timing windows, and evidence citations verbatim.

${
  formFormat === "ESO"
    ? `Since this is an ESO (European Stroke Organisation) guideline, extract ALL PICO items directly from the official Synoptic Table ("Synoptic table of all recommendations and expert consensus statements", e.g. Table 3).
Structure the table with these EXACT headers:
| PICO | Recommendation | Quality of evidence | Strength of recommendation | Expert consensus statement | Voting | Related studies |
| --- | --- | --- | --- | --- | --- | --- |
Rules:
1. PICO: Provide the exact PICO identifier (e.g. "PICO 1a", "PICO 1b", "PICO 2", "PICO 3a", "PICO 3b", "PICO 4", "PICO 5a", "PICO 5b", "PICO 6a", "PICO 6b", "PICO 7", "PICO 8", "PICO 9a", "PICO 9b", "PICO 10") followed by the full clinical question verbatim.
2. Recommendation: The exact evidence-based recommendation statement verbatim. If no recommendation could be made, state: "no recommendation can be made on...".
3. Quality of evidence: High, Moderate, Low, Very low, or -
4. Strength of recommendation: Strong for intervention, Weak for intervention, Strong against intervention, Weak against intervention, or -
5. Expert consensus statement: Extract ONLY the expert consensus statement(s) that belong to THIS SPECIFIC PICO in THIS DOCUMENT. Include numbered points and voting ratios (e.g. "Vote: 11/13", "Vote: 13/13"). If there is no expert consensus statement for this PICO, leave this cell completely EMPTY. NEVER invent or borrow consensus statements from other guidelines (such as acute ischaemic stroke or blood pressure guidelines).
6. Related studies: List key clinical trials cited (e.g. ULTRA, ISAT, BRAT, BRANT, IMCVS, etc.).`
    : formFormat === "AHA"
    ? `Since this is an ACC/AHA / ASA guideline, extract recommendations according to the official ACC/AHA COR and LOE taxonomy.
Structure the table with these EXACT headers:
| Clinical Domain / Topic | Recommendation (Verbatim Text) | Class (COR) & Level (LOE) | Related Studies & Evidence |
| --- | --- | --- | --- |
- Class (COR) format: Class 1, Class 2a, Class 2b, Class 3: No Benefit, or Class 3: Harm
- Level (LOE) format: LOE A, LOE B-R, LOE B-NR, LOE C-LD, or LOE C-EO`
    : `Since this is a ${effectiveSociety || "Standard"} clinical guideline, extract structured clinical recommendations.
Structure the table with these EXACT headers:
| Clinical Domain / Topic | Recommendation (Verbatim Text) | Grade / Level of Evidence | Related Studies & Evidence |
| --- | --- | --- | --- |
- Grade / Level of Evidence format: Extract the official society rating (e.g. Level A/B/C, Strong/Weak, Grade 1/2, or Good Practice Point)`
}

Include the Title as the first line: # ${title || "Clinical Practice Guideline"}
Do NOT add conversational greetings, explanations, or backtick wraps. Return ONLY the Markdown text with the table.

Document content:
${contentToAnalyze}`;

    for (const model of MODELS) {
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
            },
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        let formattedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (formattedText && formattedText.trim().length > 30) {
          formattedText = formattedText.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
          return NextResponse.json({
            ok: true,
            formattedText,
            model,
          });
        }
      } catch {
        // Try next model
      }
    }

    return NextResponse.json(
      { ok: false, error: "Không thể trích xuất khuyến cáo qua AI. Vui lòng kiểm tra kết nối mạng." },
      { status: 502 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
