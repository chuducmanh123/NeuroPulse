import { CaseDifficulty } from "@/types/clinicalCase";

export interface ExtractedCaseDraft {
  title: string;
  subspecialty: string;
  difficulty: CaseDifficulty;
  author_credit: string;
  doi_url: string;
  journal_short: string;
  demographics: string;
  chief_complaint: string;
  history_of_present_illness: string;
  past_medical_history: string;
  neuro_exam: string;
  key_labs_csf: string;
  modality: string;
  figure_caption: string;
  findings_summary: string;
  question: string;
  optA: string;
  optARationale: string;
  optB: string;
  optBRationale: string;
  optC: string;
  optCRationale: string;
  optD: string;
  optDRationale: string;
  correctOption: "A" | "B" | "C" | "D";
  final_diagnosis: string;
  clinical_discussion: string;
  teaching_points: string[];
  clinical_pitfalls: string[];
}

/**
 * Extracts plain text from uploaded .pdf, .docx, .doc, .txt, .md, or .xml files in the browser.
 */
export async function extractTextFromUploadedDocument(
  file: File
): Promise<{ text: string; pdfBase64?: string; extractedImages?: string[] }> {
  const name = file.name.toLowerCase();
  const extractedImages: string[] = [];

  // Helper to safely convert an Image or Canvas to WebP Data URL
  const processImageToWebp = async (blob: Blob, minDim = 120): Promise<string | null> => {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    const blobUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = blobUrl;
      await img.decode();
      if (img.width >= minDim && img.height >= minDim) {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL("image/webp", 0.85);
        }
      }
    } catch {
      // not a decodeable image slice
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
    return null;
  };

  // 1. PDF File (.pdf): Extract text via pdf.js CDN + scan embedded figures + keep base64
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const pdfBase64 = typeof btoa !== "undefined" ? btoa(binary) : "";

    // Method A: Fast stream scan for raw JPEG/JFIF medical figures (0xFF 0xD8 0xFF ... 0xFF 0xD9)
    try {
      let p = 0;
      while (p < bytes.length - 4 && extractedImages.length < 6) {
        if (bytes[p] === 0xff && bytes[p + 1] === 0xd8 && bytes[p + 2] === 0xff) {
          let q = p + 3;
          while (q < bytes.length - 1) {
            if (bytes[q] === 0xff && bytes[q + 1] === 0xd9) {
              break;
            }
            q++;
          }
          if (q < bytes.length - 1) {
            const sliceLen = q + 2 - p;
            if (sliceLen > 8192 && sliceLen < 15 * 1024 * 1024) {
              const sub = bytes.subarray(p, q + 2);
              const blob = new Blob([sub], { type: "image/jpeg" });
              const webp = await processImageToWebp(blob, 140);
              if (webp && !extractedImages.includes(webp)) {
                extractedImages.push(webp);
              }
            }
            p = q + 2;
            continue;
          }
        }
        p++;
      }
    } catch (e) {
      console.warn("Direct PDF JPEG stream scan error:", e);
    }

    try {
      const w = window as unknown as { pdfjsLib?: any };
      if (!w.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF parser"));
          document.head.appendChild(script);
        });
      }
      if (w.pdfjsLib) {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const pdfDoc = await w.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageTexts: string[] = [];
        const maxPages = Math.min(pdfDoc.numPages, 15);
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const content = await page.getTextContent();
          const pageStr = content.items.map((it: any) => it.str || "").join(" ");
          pageTexts.push(pageStr);

          // Fallback: If no direct JPEGs were extracted, render pages containing figure/neuroimaging keywords to WebP
          if (extractedImages.length === 0 && (pageNum <= 3 || /\b(fig|figure|mri|ct|dwi|panel)\b/i.test(pageStr))) {
            try {
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement("canvas");
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport }).promise;
                extractedImages.push(canvas.toDataURL("image/webp", 0.82));
              }
            } catch (renderErr) {
              console.warn("PDF page render fallback error:", renderErr);
            }
          }
        }
        const combined = pageTexts.join("\n\n").trim();
        if (combined.length > 30) {
          return { text: combined, pdfBase64, extractedImages };
        }
      }
    } catch (e) {
      console.warn("PDF.js client extraction fallback:", e);
    }

    return {
      text: `[PDF Uploaded: ${file.name} (${Math.round(file.size / 1024)} KB) — Ready for AI Extraction]`,
      pdfBase64,
      extractedImages,
    };
  }

  // 2. Word Document (.docx): Extract XML text & embedded figures from ZIP entries
  if (name.endsWith(".docx")) {
    try {
      const buf = await file.arrayBuffer();
      const view = new DataView(buf);
      const uint8 = new Uint8Array(buf);
      let offset = 0;
      const extractedChunks: string[] = [];

      while (offset + 30 < uint8.length) {
        const sig = view.getUint32(offset, true);
        if (sig !== 0x04034b50) {
          offset++;
          continue;
        }
        const compression = view.getUint16(offset + 8, true);
        const compSize = view.getUint32(offset + 18, true);
        const fileNameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);
        const entryName = new TextDecoder().decode(
          uint8.subarray(offset + 30, offset + 30 + fileNameLen)
        );
        const dataStart = offset + 30 + fileNameLen + extraLen;
        const compressedData = uint8.subarray(dataStart, dataStart + compSize);

        // A. Extract document body text from word/document.xml
        if (entryName === "word/document.xml" && compSize > 0) {
          if (compression === 0) {
            const xml = new TextDecoder().decode(compressedData);
            extractedChunks.push(xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
          } else if (compression === 8 && typeof DecompressionStream !== "undefined") {
            const ds = new DecompressionStream("deflate-raw");
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const decompressedBuf = await new Response(ds.readable).arrayBuffer();
            const xml = new TextDecoder().decode(decompressedBuf);
            extractedChunks.push(xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
          }
        }

        // B. Extract embedded images from word/media/*
        if (
          entryName.toLowerCase().startsWith("word/media/") &&
          /\.(jpe?g|png|webp|gif)$/i.test(entryName) &&
          compSize > 0 &&
          extractedImages.length < 6
        ) {
          try {
            let imgBuf: ArrayBuffer | null = null;
            if (compression === 0) {
              imgBuf = compressedData.slice().buffer;
            } else if (compression === 8 && typeof DecompressionStream !== "undefined") {
              const ds = new DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(compressedData);
              writer.close();
              imgBuf = await new Response(ds.readable).arrayBuffer();
            }
            if (imgBuf && imgBuf.byteLength > 4096) {
              const ext = entryName.split(".").pop()?.toLowerCase();
              const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
              const blob = new Blob([imgBuf], { type: mime });
              const webp = await processImageToWebp(blob, 100);
              if (webp && !extractedImages.includes(webp)) {
                extractedImages.push(webp);
              }
            }
          } catch (mediaErr) {
            console.warn("DOCX media extraction error:", mediaErr);
          }
        }

        offset = dataStart + compSize;
      }

      if (extractedChunks.length > 0 && extractedChunks[0].length > 20) {
        return { text: extractedChunks.join("\n\n"), extractedImages };
      }
    } catch (e) {
      console.warn("DOCX extraction fallback:", e);
    }
  }

  // 3. Legacy Word (.doc) or Plain Text (.txt, .md, .xml)
  const rawText = await file.text();
  if (name.endsWith(".doc")) {
    // Strip binary control chars from legacy .doc while preserving printable ASCII/UTF-8 sentences
    const cleanedDoc = rawText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { text: cleanedDoc, extractedImages };
  }

  return { text: rawText, extractedImages };
}

function detectJournalAndDoi(rawText: string): { doi_url: string; journal_short: string } {
  const doiMatch = rawText.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
  const doi = doiMatch ? doiMatch[1].replace(/[.,;)]+$/, "") : "";
  const doi_url = doi ? `https://doi.org/${doi}` : "";

  if (/10\.1056\/NEJM|New England Journal of Medicine/i.test(rawText)) {
    return { doi_url, journal_short: "N Engl J Med" };
  }
  if (/10\.1001\/jamaneurol|JAMA Neurology/i.test(rawText)) {
    return { doi_url, journal_short: "JAMA Neurol" };
  }
  if (/10\.1212\/WNL|10\.1212\/NXI|10\.1212\/CPJ|Neurology/i.test(rawText)) {
    return { doi_url, journal_short: "Neurology" };
  }
  if (/10\.1016\/S1474-4422|Lancet Neurology/i.test(rawText)) {
    return { doi_url, journal_short: "Lancet Neurol" };
  }
  if (/10\.1161\/STROKEAHA|Stroke/i.test(rawText)) {
    return { doi_url, journal_short: "Stroke" };
  }
  if (/10\.1136\/jnnp|10\.1136\/practneurol/i.test(rawText)) {
    return { doi_url, journal_short: "JNNP / Pract Neurol" };
  }
  if (/10\.1002\/acn3|10\.1002\/ana/i.test(rawText)) {
    return { doi_url, journal_short: "Ann Neurol" };
  }
  return { doi_url, journal_short: "Peer-Reviewed Neurology Journal" };
}

function detectSubspecialty(text: string): string {
  const t = text.toLowerCase();
  if (
    /\b(stroke|infarct|thrombectomy|thrombolysis|basilar|carotid|aneurysm|hemorrhage|ich|cvst|venous sinus|moyamoya|dissection)\b/.test(
      t
    )
  ) {
    return "Stroke";
  }
  if (/\b(seizure|epilep|status epilepticus|eeg|ictal|spike-and-wave|levetiracetam)\b/.test(t)) {
    return "Epilepsy";
  }
  if (
    /\b(nmdar|lgi1|mog|aquaporin|nmosd|multiple sclerosis|demyelinat|autoimmune encephalitis|oligoclonal)\b/.test(
      t
    )
  ) {
    return "Neuroimmunology";
  }
  if (/\b(dementia|alzheimer|frontotemporal|creutzfeldt|prion|amyloid|cognitive decline)\b/.test(t)) {
    return "Dementia";
  }
  if (
    /\b(neuropathy|guillain|miller fisher|myasthenia|myopathy|als|motor neuron|electromyography|emg|bickerstaff)\b/.test(
      t
    )
  ) {
    return "Neuromuscular";
  }
  if (/\b(parkinson|tremor|dystonia|chorea|huntington|ataxia|myoclonus)\b/.test(t)) {
    return "Movement Disorders";
  }
  if (/\b(coma|intracranial pressure|herniation|intubat|neurocritical|traumatic brain|tbi|concussion)\b/.test(t)) {
    return "Neurocritical Care";
  }
  if (/\b(migraine|cluster headache|thunderclap|rcvs|trigeminal neuralgia)\b/.test(t)) {
    return "Headache & Pain";
  }
  if (
    /\b(meningit|brain abscess|neurosyphilis|tuberculous|cryptococc|encephalitis herpes|hsv|neuroborreliosis|cns infection)\b/.test(
      t
    )
  ) {
    return "CNS Infections";
  }
  if (/\b(glioblastoma|glioma|meningioma|metastasis|paraneoplastic|lymphoma)\b/.test(t)) {
    return "Neuro-Oncology";
  }
  return "Stroke";
}

/**
 * Extracts a structured clinical case from raw article text (or PDF base64) using Gemini API (if apiKey is provided)
 * or deterministic clinical NLP rules when no API key is set.
 */
export async function extractClinicalCaseFromArticleText(
  rawText: string,
  geminiApiKey?: string,
  pdfBase64?: string
): Promise<ExtractedCaseDraft> {
  const cleaned = rawText.replace(/\r\n/g, "\n").trim();
  const { doi_url, journal_short } = detectJournalAndDoi(cleaned);

  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      const prompt = `You are an expert Academic Neurologist & Stroke Fellowship Director creating an interactive clinical challenge for NeuroCase (modeled after NEJM Image Challenge & Neurology Resident & Fellow Section).
Read the following published neurology article/case report and return ONLY a valid JSON object matching this exact schema (all in professional academic English, with the final diagnosis REDACTED/HIDDEN in the title, history, exam, and imaging findings so the reader must deduce it):
{
  "title": "Blind clinical presentation title without giving away the final diagnosis",
  "subspecialty": "One of: Stroke | Neurocritical Care | Epilepsy | Dementia | Neuroimmunology | Neuromuscular | Movement Disorders | Headache & Pain | CNS Infections | Neuro-Oncology | Other",
  "difficulty": "Resident | Fellow | Attending",
  "demographics": "Age and sex, e.g., 54-year-old right-handed woman",
  "chief_complaint": "Concise presenting symptom(s)",
  "history_of_present_illness": "Detailed chronological clinical history from the paper without revealing the final diagnosis",
  "past_medical_history": "Relevant past medical history",
  "neuro_exam": "Detailed neurological examination findings from the paper",
  "key_labs_csf": "Relevant serum, CSF, or bedside workup findings",
  "modality": "Primary clinical or diagnostic modality (e.g., Clinical photograph, Brain MRI, CTA, EMG, Fundoscopy)",
  "figure_caption": "Original figure caption from the article",
  "findings_summary": "Radiological or clinical interpretation of the figure",
  "question": "Single-focus question asking ONE concept only (e.g., 'Which of the following is the most likely diagnosis?' OR 'What is the most appropriate initial management?' — NEVER combine diagnosis and management in the same question)",
  "optA": "Option A text",
  "optARationale": "Detailed rationale explaining why Option A is correct or incorrect",
  "optB": "Option B text",
  "optBRationale": "Detailed rationale explaining why Option B is correct or incorrect",
  "optC": "Option C text",
  "optCRationale": "Detailed rationale explaining why Option C is correct or incorrect",
  "optD": "Option D text",
  "optDRationale": "Detailed rationale explaining why Option D is correct or incorrect",
  "correctOption": "A",
  "final_diagnosis": "Complete definitive diagnosis from the article",
  "clinical_discussion": "2-paragraph synthesis of the pathophysiology, diagnostic reasoning, and management from the article",
  "teaching_points": ["Teaching point 1", "Teaching point 2", "Teaching point 3"],
  "clinical_pitfalls": ["Clinical pitfall 1", "Clinical pitfall 2"]
}

ARTICLE TEXT:
${cleaned.slice(0, 14000)}`;

      const parts: any[] = [{ text: prompt }];
      if (pdfBase64) {
        parts.unshift({
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        });
      }

      const waterfallModels = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-pro",
      ];

      for (const modelName of waterfallModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
              geminiApiKey.trim()
            )}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: "application/json",
                },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const candidateParts = data?.candidates?.[0]?.content?.parts || [];
            const textParts = candidateParts.filter((p: any) => p?.text && !p?.thought).map((p: any) => p.text);
            let rawJson = textParts.join("").trim();
            if (!rawJson && candidateParts[0]?.text) rawJson = candidateParts[0].text.trim();
            const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) rawJson = jsonMatch[0];
            const parsed = JSON.parse(rawJson);
            return {
              title: parsed.title || "Acute Neurological Syndrome — Clinical Challenge",
              subspecialty: parsed.subspecialty || detectSubspecialty(cleaned),
              difficulty: (parsed.difficulty as CaseDifficulty) || "Fellow",
              author_credit: `${journal_short}${doi_url ? ` • ${doi_url}` : ""}`,
              doi_url,
              journal_short,
              demographics: parsed.demographics || "Adult Neurology Patient",
              chief_complaint: parsed.chief_complaint || parsed.title || "Acute neurological deficit",
              history_of_present_illness: parsed.history_of_present_illness || cleaned.slice(0, 600),
              past_medical_history: parsed.past_medical_history || "As documented in clinical vignette.",
              neuro_exam: parsed.neuro_exam || "Focal neurological deficits as documented in clinical vignette.",
              key_labs_csf: parsed.key_labs_csf || "Laboratory and CSF workup as detailed in text.",
              modality: parsed.modality || "Brain MRI / Neuroimaging",
              figure_caption:
                parsed.figure_caption || "Published clinical neuroimaging figure from the source article.",
              findings_summary: parsed.findings_summary || "Characteristic neuroimaging abnormality.",
              question:
                parsed.question || "Which of the following is the most likely diagnosis?",
              optA: parsed.optA || parsed.final_diagnosis || "Option A",
              optARationale:
                parsed.optARationale || "Correct answer based on clinical and neuroimaging localization.",
              optB: parsed.optB || "Alternative differential diagnosis B",
              optBRationale:
                parsed.optBRationale || "Excluded based on clinical course and neuroimaging sequence profile.",
              optC: parsed.optC || "Alternative differential diagnosis C",
              optCRationale:
                parsed.optCRationale || "Excluded based on CSF and electrodiagnostic workup.",
              optD: parsed.optD || "Alternative differential diagnosis D",
              optDRationale:
                parsed.optDRationale || "Does not account for the neuroanatomical localization.",
              correctOption: (["A", "B", "C", "D"].includes(parsed.correctOption)
                ? parsed.correctOption
                : "A") as "A" | "B" | "C" | "D",
              final_diagnosis: parsed.final_diagnosis || "Definitive Neurological Diagnosis",
              clinical_discussion: parsed.clinical_discussion || "",
              teaching_points: Array.isArray(parsed.teaching_points) ? parsed.teaching_points : [],
              clinical_pitfalls: Array.isArray(parsed.clinical_pitfalls) ? parsed.clinical_pitfalls : [],
            };
          }
        } catch (modelErr) {
          console.warn(`Gemini model ${modelName} failed, trying next model in waterfall:`, modelErr);
        }
      }
    } catch (err) {
      console.warn("Gemini API extraction fallback triggered:", err);
    }
  }

  // Deterministic Clinical NLP Rule-Based Extraction (works offline / without API key)
  // Strip PDF download watermarks, publisher copyright footers, and trailing References section
  const bodyWithoutRefs = cleaned
    .replace(/\n\s*(?:References|Bibliography|Acknowledgments|Disclosures|Author Contributions)\s*\n[\s\S]*$/i, "")
    .replace(/NEJM Evidence is produced by NEJM Group[^.\n]*\.?/gi, "")
    .replace(/Downloaded from [^\s]+ by [^\n]+/gi, "")
    .replace(/Copyright © \d{4}[^.\n]*\.?/gi, "")
    .replace(/-\s+/g, "");

  const sentences = bodyWithoutRefs
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 30 &&
        !/\b(DOI:\s*10\.|et al\.|JAMA|Stroke\s+\d{4};\d+|N Engl J Med\s+\d{4}|Morning Report is a time-honored tradition)\b/i.test(
          s
        )
    );

  const demoMatch = bodyWithoutRefs.match(
    /\b(\d{1,2}-year-\s*old\s+(?:right-handed\s+|left-handed\s+|previously healthy\s+)?(?:man|woman|male|female|boy|girl|patient))\b/i
  );
  const demographics = demoMatch ? demoMatch[1].replace(/\s+/g, " ") : "Adult Patient";

  const subspecialty = detectSubspecialty(bodyWithoutRefs);

  const hpiSentences = sentences.filter((s) =>
    /\b(presented|admitted|history|developed|onset|complained|awoke|experienced|brought to|preceding\s+\d+\s+months)\b/i.test(
      s
    )
  );
  const examSentences = sentences.filter((s) =>
    /\b(examination|neurological exam|pupils|cranial nerve|NIHSS|GCS|reflex|weakness|hemiparesis|ataxia|aphasia|nystagmus|sensory|Babinski|blood pressure|vital signs)\b/i.test(
      s
    )
  );
  const imagingSentences = sentences.filter((s) =>
    /\b(MRI|FLAIR|DWI|CT|CTA|MRA|DSA|angiography|EEG|hyperintensity|diffusion restriction|occlusion|enhancement|stenosis|infarct)\b/i.test(
      s
    )
  );
  const labSentences = sentences.filter((s) =>
    /\b(CSF|cerebrospinal|pleocytosis|protein|oligoclonal|antibody|autoantibodies|serum|D-dimer|platelets|titer|ESR|CRP|biopsy)\b/i.test(
      s
    )
  );
  const discussionSentences = sentences.filter((s) =>
    /\b(pathophysiology|mechanism|characterized by|management|treatment|diagnosis|syndrome|vasculitis|moyamoya|arteritis|takayasu|hallmark|distinguish|differential)\b/i.test(
      s
    )
  );

  const diagMatch = bodyWithoutRefs.match(
    /\b(?:diagnosed with|diagnosis of|consistent with|confirmed\s+(?:a\s+diagnosis\s+of)?|final diagnosis[:\s]+)\s*([^.;\n]{8,110})/i
  );

  const finalDiagnosis = diagMatch
    ? diagMatch[1].trim().replace(/^(a|an|the)\s+/i, "")
    : `${subspecialty} Clinical Syndrome`;

  const firstLine = bodyWithoutRefs.split("\n")[0]?.trim() || "";
  const title =
    firstLine.length > 20 &&
    firstLine.length < 160 &&
    !/published|morning report|abstract/i.test(firstLine)
      ? firstLine
      : `Acute ${subspecialty} Presentation in a ${demographics}`;

  return {
    title,
    subspecialty,
    difficulty: "Fellow",
    author_credit: `${journal_short}${doi_url ? ` • ${doi_url}` : ""}`,
    doi_url,
    journal_short,
    demographics,
    chief_complaint: hpiSentences[0]?.slice(0, 160) || title,
    history_of_present_illness:
      hpiSentences.slice(0, 4).join(" ") || sentences.slice(0, 3).join(" ") || bodyWithoutRefs.slice(0, 500),
    past_medical_history: "As documented in clinical vignette.",
    neuro_exam:
      examSentences.slice(0, 3).join(" ") ||
      "Focal neurological deficits localized to the affected neuroanatomical pathway.",
    key_labs_csf:
      labSentences.slice(0, 2).join(" ") ||
      "Targeted serum, autoimmune, and CSF analysis performed as part of the diagnostic workup.",
    modality: "Brain MRI / Neurovascular Imaging",
    figure_caption:
      imagingSentences[0] || "Clinical neuroimaging figure demonstrating characteristic lesion.",
    findings_summary:
      imagingSentences.slice(0, 2).join(" ") ||
      "Characteristic neuroimaging abnormality correlating with the clinical localization.",
    question: "Which of the following is the most likely diagnosis?",
    optA: finalDiagnosis,
    optARationale:
      "Correct! Matches the clinical presentation, neuroanatomical localization, and diagnostic workup.",
    optB: "Acute cardioembolic middle cerebral artery infarction",
    optBRationale: "Excluded by the clinical timeline and neuroimaging distribution.",
    optC: "Infectious meningoencephalitis (HSV-1)",
    optCRationale: "Excluded by the clinical course and CSF profile.",
    optD: "High-grade infiltrative glial neoplasm",
    optDRationale: "Excluded by acute/subacute evolution and imaging characteristics.",
    correctOption: "A",
    final_diagnosis: finalDiagnosis,
    clinical_discussion:
      discussionSentences.slice(-4).join(" ") ||
      sentences.slice(Math.max(0, sentences.length - 5), sentences.length - 1).join(" ") ||
      bodyWithoutRefs.slice(0, 600),
    teaching_points: [
      "Correlate acute neuroanatomical localization with targeted MRI sequences (DWI/ADC, FLAIR, SWI, and vessel imaging).",
      "Early recognition of characteristic neuroimaging signatures prevents unnecessary invasive procedures and guides timely therapy.",
    ],
    clinical_pitfalls: [
      "Delaying definitive vascular or autoimmune workup when initial non-contrast head CT is unremarkable.",
    ],
  };
}
