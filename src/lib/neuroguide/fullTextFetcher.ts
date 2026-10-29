import https from "https";

export interface FullTextFetchResult {
  status: "FULL_TEXT_PARSED" | "ABSTRACT_ONLY" | "UNAVAILABLE";
  source?: "PMC" | "EUROPE_PMC" | "OPEN_ACCESS_WEB";
  fullTextSnippet: string;
  wordCount: number;
  pmcid?: string;
  sectionsExtracted: string[];
}

/**
 * Downloads raw XML/text via HTTPS with timeout protection
 */
function fetchHttpsText(url: string, timeoutMs = 9000): Promise<string> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const req = https.get(
      url,
      {
        agent,
        headers: {
          "User-Agent": "NeuroPulse-GuidelineBot/2.5 (Clinical Research; mailto:contact@neuropulse.org)",
          Accept: "application/xml, text/xml, */*",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/**
 * Normalizes PMC ID into both "PMC123456" and numeric "123456"
 */
export function normalizePmcId(raw: string | undefined): { fullPmc: string; numPmc: string } | null {
  if (!raw) return null;
  const match = raw.match(/(?:PMC)?(\d+)/i);
  if (!match) return null;
  return {
    fullPmc: `PMC${match[1]}`,
    numPmc: match[1],
  };
}

/**
 * Clean text from XML tags and decode HTML/XML entities
 */
export function stripXmlTags(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Distills full-text XML by extracting critical sections (Recommendations, What's New, Executive Summary)
 * and dropping reference lists (<ref-list>), acknowledgments, and conflict-of-interest boilerplate.
 */
export function distillGuidelineXml(xmlString: string): {
  distilledText: string;
  sectionsFound: string[];
} {
  if (!xmlString || xmlString.length < 100) {
    return { distilledText: "", sectionsFound: [] };
  }

  // 1. Strip heavy non-content tags: references, acknowledgments, back matter
  let cleanedXml = xmlString
    .replace(/<ref-list[\s\S]*?<\/ref-list>/gi, "")
    .replace(/<ack[\s\S]*?<\/ack>/gi, "")
    .replace(/<fn-group[\s\S]*?<\/fn-group>/gi, "");

  const sectionsFound: string[] = [];
  const prioritySnippets: string[] = [];

  // 2. Extract structured Abstract if present
  const abstractMatch = cleanedXml.match(/<abstract[\s\S]*?<\/abstract>/i);
  if (abstractMatch) {
    const absText = stripXmlTags(abstractMatch[0]);
    if (absText.length > 50) {
      sectionsFound.push("Abstract");
      prioritySnippets.push(`=== EXECUTIVE ABSTRACT ===\n${absText}\n`);
    }
  }

  // 3. Scan for high-value recommendation sections (<sec> ... </sec>)
  const secRegex = /<sec\b[^>]*>([\s\S]*?)<\/sec>/gi;
  let secMatch: RegExpExecArray | null;

  const PRIORITY_KEYWORDS = [
    "recommendation",
    "recommendations",
    "what is new",
    "what's new",
    "practice change",
    "practice changes",
    "guideline statement",
    "summary of guideline",
    "summary of recommendation",
    "class of recommendation",
    "good practice",
    "executive summary",
    "key points",
    "key recommendations",
    "clinical guidance",
  ];

  while ((secMatch = secRegex.exec(cleanedXml)) !== null) {
    const secContent = secMatch[1];
    const titleMatch = secContent.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const titleText = titleMatch ? stripXmlTags(titleMatch[1]).toLowerCase() : "";

    const isPrioritySection = PRIORITY_KEYWORDS.some((kw) => titleText.includes(kw));

    if (isPrioritySection) {
      const sectionHeading = titleMatch ? stripXmlTags(titleMatch[1]) : "Priority Section";
      const cleanSecText = stripXmlTags(secContent);
      if (cleanSecText.length > 80) {
        sectionsFound.push(sectionHeading);
        prioritySnippets.push(`=== SECTION: ${sectionHeading.toUpperCase()} ===\n${cleanSecText}\n`);
      }
    }
  }

  // 4. If specific recommendation sections were found, join them
  if (prioritySnippets.length > 1) {
    const combined = prioritySnippets.join("\n\n");
    // Limit to ~30,000 characters to keep Gemini prompt fast and cost-effective
    return {
      distilledText: combined.slice(0, 32000),
      sectionsFound,
    };
  }

  // 5. Fallback: If no explicit recommendation section tags matched, grab the first 25,000 chars of body text
  const bodyMatch = cleanedXml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const cleanBody = stripXmlTags(bodyMatch[1]);
    sectionsFound.push("Body (Standard Full-Text)");
    const fullSnippet = (prioritySnippets.join("\n\n") + "\n\n=== MAIN BODY EXCERPT ===\n" + cleanBody).slice(0, 28000);
    return {
      distilledText: fullSnippet,
      sectionsFound,
    };
  }

  // 6. Last resort: clean whole XML
  return {
    distilledText: stripXmlTags(cleanedXml).slice(0, 25000),
    sectionsFound: sectionsFound.length > 0 ? sectionsFound : ["Full XML Stream"],
  };
}

/**
 * Main Fetcher: Tries Europe PMC fullTextXML and NCBI PMC efetch
 */
export async function fetchGuidelineFullText(options: {
  pmcid?: string;
  abstractText?: string;
  doi?: string;
}): Promise<FullTextFetchResult> {
  const normalized = normalizePmcId(options.pmcid);

  if (normalized) {
    // 1. Try Europe PMC REST API
    try {
      const epmcUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/PMC/${normalized.fullPmc}/fullTextXML`;
      const xml = await fetchHttpsText(epmcUrl, 8000);
      if (xml && xml.includes("<article") && xml.length > 1000) {
        const distilled = distillGuidelineXml(xml);
        if (distilled.distilledText.length > 300) {
          return {
            status: "FULL_TEXT_PARSED",
            source: "EUROPE_PMC",
            fullTextSnippet: distilled.distilledText,
            wordCount: distilled.distilledText.split(/\s+/).length,
            pmcid: normalized.fullPmc,
            sectionsExtracted: distilled.sectionsFound,
          };
        }
      }
    } catch {
      // Fallback to NCBI PMC E-utilities
    }

    // 2. Try NCBI PMC efetch
    try {
      const ncbiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${normalized.numPmc}&retmode=xml`;
      const xml = await fetchHttpsText(ncbiUrl, 8000);
      if (xml && xml.includes("<article") && xml.length > 1000) {
        const distilled = distillGuidelineXml(xml);
        if (distilled.distilledText.length > 300) {
          return {
            status: "FULL_TEXT_PARSED",
            source: "PMC",
            fullTextSnippet: distilled.distilledText,
            wordCount: distilled.distilledText.split(/\s+/).length,
            pmcid: normalized.fullPmc,
            sectionsExtracted: distilled.sectionsFound,
          };
        }
      }
    } catch {
      // PMC efetch failed
    }
  }

  // 3. Fallback to Abstract when full-text XML is paywalled or not present
  if (options.abstractText && options.abstractText.trim().length > 80) {
    return {
      status: "ABSTRACT_ONLY",
      source: "OPEN_ACCESS_WEB",
      fullTextSnippet: `=== STRUCTURED ABSTRACT ===\n${options.abstractText.trim()}`,
      wordCount: options.abstractText.split(/\s+/).length,
      pmcid: normalized ? normalized.fullPmc : undefined,
      sectionsExtracted: ["Structured Abstract"],
    };
  }

  return {
    status: "UNAVAILABLE",
    fullTextSnippet: "",
    wordCount: 0,
    pmcid: normalized ? normalized.fullPmc : undefined,
    sectionsExtracted: [],
  };
}
