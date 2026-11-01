import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = (body.text || "").trim();
    const title = (body.title || "").trim();
    const society = (body.society || "").trim();

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

    const isEso =
      society.toUpperCase().includes("ESO") ||
      title.toUpperCase().includes("ESO") ||
      text.toUpperCase().includes("ESO") ||
      text.toLowerCase().includes("pico");

    const prompt = `You are a clinical neurology guideline extraction expert.
Transform the following clinical text/notes from a guideline summary (${title || "Clinical Guideline"}) into a clean, complete Markdown table of recommendations.
Preserve clinical specificity, numbers, blood pressure thresholds, and evidence citations verbatim.

${
  isEso
    ? `Since this is an ESO (European Stroke Organisation) guideline, structure the table with these EXACT headers:
| PICO | Recommendation | Quality of evidence | Strength of recommendation | Expert consensus statement | Voting | Related studies |
| --- | --- | --- | --- | --- | --- | --- |
- Quality of evidence must be: High, Moderate, Low, or Very low
- Strength of recommendation must be: Strong for intervention, Weak for intervention, Strong against intervention, or Weak against intervention`
    : `Structure the table with these EXACT headers:
| Clinical Domain / Topic | Recommendation (Verbatim Text) | Class (COR) & Level (LOE) | Related Studies & Evidence |
| --- | --- | --- | --- |
- Class (COR) format: Class 1, Class 2a, Class 2b, Class 3: No Benefit, or Class 3: Harm
- Level (LOE) format: LOE A, LOE B-R, LOE B-NR, LOE C-LD, or LOE C-EO`
}

Include the Title as the first line: # ${title || "Clinical Practice Guideline"}
Do NOT add conversational greetings, explanations, or backtick wraps. Return ONLY the Markdown text with the table.

Document content:
${text.slice(0, 15000)}`;

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
