import { ClinicalCase, CaseDifficulty } from "@/types/clinicalCase";

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
  neuro_exam: string;
  key_labs_csf: string;
  modality: string;
  findings_summary: string;
  question: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correctOption: "A" | "B" | "C" | "D";
  final_diagnosis: string;
  clinical_discussion: string;
  teaching_points: string[];
  clinical_pitfalls: string[];
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
  if (/\b(stroke|infarct|thrombectomy|thrombolysis|basilar|carotid|aneurysm|hemorrhage|ich|cvst|venous sinus|moyamoya|dissection)\b/.test(t)) {
    return "Vascular & Stroke";
  }
  if (/\b(seizure|epilep|status epilepticus|eeg|ictal|spike-and-wave|levetiracetam)\b/.test(t)) {
    return "Epilepsy";
  }
  if (/\b(nmdar|lgi1|mog|aquaporin|nmosd|multiple sclerosis|demyelinat|autoimmune encephalitis|oligoclonal)\b/.test(t)) {
    return "Neuroimmunology";
  }
  if (/\b(dementia|alzheimer|frontotemporal|creutzfeldt|prion|amyloid|cognitive decline)\b/.test(t)) {
    return "Dementia & Cognitive";
  }
  if (/\b(neuropathy|guillain|miller fisher|myasthenia|myopathy|als|motor neuron|electromyography|emg)\b/.test(t)) {
    return "Neuromuscular";
  }
  if (/\b(parkinson|tremor|dystonia|chorea|huntington|ataxia|myoclonus)\b/.test(t)) {
    return "Movement Disorders";
  }
  if (/\b(coma|intracranial pressure|herniation|status|intubat|neurocritical)\b/.test(t)) {
    return "Neurocritical Care";
  }
  if (/\b(meningitis|encephalitis|hsv|neurosyphilis|tubercul|cryptococc|abscess)\b/.test(t)) {
    return "Neuroinfectious";
  }
  if (/\b(migraine|cluster headache|thunderclap|rcvs|trigeminal neuralgia)\b/.test(t)) {
    return "Headache & Pain";
  }
  if (/\b(glioblastoma|glioma|meningioma|metastasis|paraneoplastic|lymphoma)\b/.test(t)) {
    return "Neuro-oncology";
  }
  return "Vascular & Stroke";
}

/**
 * Extracts a structured clinical case from raw article text using Gemini API (if apiKey is provided)
 * or deterministic clinical NLP rules when no API key is set.
 */
export async function extractClinicalCaseFromArticleText(
  rawText: string,
  geminiApiKey?: string
): Promise<ExtractedCaseDraft> {
  const cleaned = rawText.replace(/\r\n/g, "\n").trim();
  const { doi_url, journal_short } = detectJournalAndDoi(cleaned);

  // If Gemini API Key is provided, use Gemini 2.5 Flash for full USMLE/ABPN Board structuring
  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      const prompt = `You are an expert Academic Neurologist & Stroke Fellowship Director creating an interactive clinical challenge for NeuroCase (modeled after NEJM Clinical Problem-Solving & Neurology Resident & Fellow Section).
Read the following raw text from a published neurology article/case report and return ONLY a valid JSON object matching this exact schema (all in professional academic English, with the final diagnosis REDACTED/HIDDEN in the title, history, exam, and imaging findings so the reader must deduce it):
{
  "title": "Blind clinical presentation title without giving away the final diagnosis",
  "subspecialty": "One of: Vascular & Stroke | Neurocritical Care | Epilepsy | Neuroimmunology | Dementia & Cognitive | Neuromuscular | Movement Disorders | Headache & Pain | Neuroinfectious | Neuro-oncology | General Neurology",
  "difficulty": "Resident | Fellow | Attending",
  "demographics": "Age and sex, e.g., 54-year-old right-handed woman",
  "chief_complaint": "Concise presenting symptom(s)",
  "history_of_present_illness": "Detailed chronological clinical history from the paper without revealing the final diagnosis",
  "neuro_exam": "Detailed neurological examination findings from the paper",
  "key_labs_csf": "Relevant serum, CSF, or bedside workup findings",
  "modality": "Primary imaging/diagnostic modality (e.g., Brain MRI — Axial DWI & FLAIR)",
  "findings_summary": "Radiological or electrographic description of the figure",
  "question": "Board-style clinical decision question (diagnosis, localization, or acute management)",
  "optA": "Option A text",
  "optB": "Option B text",
  "optC": "Option C text",
  "optD": "Option D text",
  "correctOption": "A",
  "final_diagnosis": "Complete definitive diagnosis from the article",
  "clinical_discussion": "2-paragraph synthesis of the pathophysiology, diagnostic reasoning, and management from the article",
  "teaching_points": ["Teaching point 1", "Teaching point 2", "Teaching point 3"],
  "clinical_pitfalls": ["Clinical pitfall 1", "Clinical pitfall 2"]
}

ARTICLE TEXT:
${cleaned.slice(0, 12000)}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiApiKey.trim()
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = JSON.parse(jsonText);
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
          neuro_exam: parsed.neuro_exam || "Focal neurological deficits as documented in clinical vignette.",
          key_labs_csf: parsed.key_labs_csf || "Laboratory and CSF workup as detailed in text.",
          modality: parsed.modality || "Brain MRI / Neuroimaging",
          findings_summary: parsed.findings_summary || "Characteristic neuroimaging abnormality.",
          question:
            parsed.question ||
            "Based on the clinical presentation, neurological examination, and neuroimaging findings, what is the most likely diagnosis?",
          optA: parsed.optA || parsed.final_diagnosis || "Option A",
          optB: parsed.optB || "Alternative differential diagnosis B",
          optC: parsed.optC || "Alternative differential diagnosis C",
          optD: parsed.optD || "Alternative differential diagnosis D",
          correctOption: (["A", "B", "C", "D"].includes(parsed.correctOption)
            ? parsed.correctOption
            : "A") as "A" | "B" | "C" | "D",
          final_diagnosis: parsed.final_diagnosis || "Definitive Neurological Diagnosis",
          clinical_discussion: parsed.clinical_discussion || "",
          teaching_points: Array.isArray(parsed.teaching_points) ? parsed.teaching_points : [],
          clinical_pitfalls: Array.isArray(parsed.clinical_pitfalls) ? parsed.clinical_pitfalls : [],
        };
      }
    } catch (err) {
      console.warn("Gemini API extraction fallback triggered:", err);
    }
  }

  // Deterministic Clinical NLP Rule-Based Extraction (works offline / without API key)
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const demoMatch = cleaned.match(
    /\b(\d{1,2}-year-old\s+(?:right-handed\s+|left-handed\s+|previously healthy\s+)?(?:man|woman|male|female|boy|girl|patient))\b/i
  );
  const demographics = demoMatch ? demoMatch[1] : "Adult Patient";

  const subspecialty = detectSubspecialty(cleaned);

  const hpiSentences = sentences.filter((s) =>
    /\b(presented|admitted|history|developed|onset|complained|awoke|experienced|brought to)\b/i.test(s)
  );
  const examSentences = sentences.filter((s) =>
    /\b(examination|neurological exam|pupils|cranial nerve|NIHSS|GCS|reflex|weakness|hemiparesis|ataxia|aphasia|nystagmus|sensory|Babinski)\b/i.test(
      s
    )
  );
  const imagingSentences = sentences.filter((s) =>
    /\b(MRI|FLAIR|DWI|CT|CTA|MRA|DSA|angiography|EEG|hyperintensity|diffusion restriction|occlusion|enhancement)\b/i.test(
      s
    )
  );
  const labSentences = sentences.filter((s) =>
    /\b(CSF|cerebrospinal|pleocytosis|protein|oligoclonal|antibody|autoantibodies|serum|D-dimer|platelets|titer)\b/i.test(
      s
    )
  );
  const diagMatch = cleaned.match(
    /\b(?:diagnosed with|diagnosis of|consistent with|confirmed\s+(?:a\s+diagnosis\s+of)?|final diagnosis[:\s]+)\s*([^.;\n]{8,110})/i
  );

  const finalDiagnosis = diagMatch
    ? diagMatch[1].trim().replace(/^(a|an|the)\s+/i, "")
    : `${subspecialty} Clinical Syndrome`;

  const firstLine = cleaned.split("\n")[0]?.trim() || "";
  const title =
    firstLine.length > 20 && firstLine.length < 180
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
      hpiSentences.slice(0, 4).join(" ") || sentences.slice(0, 3).join(" ") || cleaned.slice(0, 500),
    neuro_exam:
      examSentences.slice(0, 3).join(" ") ||
      "Focal neurological deficits localized to the affected neuroanatomical pathway.",
    key_labs_csf:
      labSentences.slice(0, 2).join(" ") ||
      "Targeted serum, autoimmune, and CSF analysis performed as part of the diagnostic workup.",
    modality: "Brain MRI / Neurovascular Imaging",
    findings_summary:
      imagingSentences.slice(0, 2).join(" ") ||
      "Characteristic neuroimaging abnormality correlating with the clinical localization.",
    question:
      "Based on the clinical presentation, neurological localization, and diagnostic workup, what is the most likely diagnosis and optimal management strategy?",
    optA: finalDiagnosis,
    optB: "Acute cardioembolic middle cerebral artery infarction",
    optC: "Infectious meningoencephalitis (HSV-1)",
    optD: "High-grade infiltrative glial neoplasm",
    correctOption: "A",
    final_diagnosis: finalDiagnosis,
    clinical_discussion: sentences.slice(-4).join(" ") || cleaned.slice(-600),
    teaching_points: [
      "Correlate acute neuroanatomical localization with targeted MRI sequences (DWI/ADC, FLAIR, SWI, and vessel imaging).",
      "Early recognition of characteristic neuroimaging signatures prevents unnecessary invasive procedures and guides timely therapy.",
    ],
    clinical_pitfalls: [
      "Delaying definitive vascular or autoimmune workup when initial non-contrast head CT is unremarkable.",
    ],
  };
}
