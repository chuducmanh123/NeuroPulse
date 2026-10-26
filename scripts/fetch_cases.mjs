import fs from "fs";
import path from "path";
import https from "https";

const FIGURES_DIR = path.join(process.cwd(), "public", "data", "figures");
fs.mkdirSync(FIGURES_DIR, { recursive: true });

const HIGH_IMPACT_JOURNAL_FILTER = [
  'JOURNAL:"J Neurol Neurosurg Psychiatry"',
  'JOURNAL:"Pract Neurol"',
  'JOURNAL:"Neurol Neuroimmunol Neuroinflamm"',
  'JOURNAL:"Neurol Clin Pract"',
  'JOURNAL:"Neurol Genet"',
  'JOURNAL:"Ann Clin Transl Neurol"',
  'JOURNAL:"Stroke"',
  'JOURNAL:"Stroke Vasc Interv Neurol"',
  'JOURNAL:"Eur Stroke J"',
  'JOURNAL:"J Neurointerv Surg"',
  'JOURNAL:"J Neurol"',
  'JOURNAL:"JAMA Netw Open"',
  'JOURNAL:"AJNR Am J Neuroradiol"',
  'JOURNAL:"BMJ Case Rep"',
  'JOURNAL:"Ther Adv Neurol Disord"',
  'JOURNAL:"Epilepsia Open"',
  'JOURNAL:"BMC Neurol"',
  'JOURNAL:"Front Neurol"',
].join(" OR ");

const EXCLUDED_JOURNALS = /cureus|world j clin cases|medicine \(baltimore\)|int j surg case rep/i;
const EXCLUDED_ARTICLE_TITLES =
  /\b(systematic review|meta-analysis|randomized|retrospective cohort|prospective cohort|study protocol|registry|bibliometric|mendelian randomization|alluvial)\b/i;
const EXCLUDED_CAPTION_WORDS =
  /\b(flow diagram|flowchart|prisma|forest plot|alluvial|schematic|study protocol|patient inclusion|eligibility|kaplan-meier|roc curve|bar graph|scatter plot|funnel plot|pedigree|timeline of the patient)\b/i;
const REQUIRED_IMAGING_CAPTION =
  /\b(MRI|FLAIR|DWI|diffusion-weighted|ADC|T1-weighted|T2-weighted|SWI|MRV|MRA|CTA|DSA|angiogram|angiography|hyperintense|hyperintensity|hypointense|infarction|occlusion|thrombosis|enhancement|gadolinium|EEG|electroencephalogram)\b/i;

function fetchBuffer(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        family: 4,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          fetchBuffer(redirectUrl, timeoutMs).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

function stripTags(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x000a0;/gi, " ")
    .replace(/&#8211;|&#x2013;/gi, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCaseParagraphs(htmlStr) {
  const paragraphs = [];
  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  for (const m of htmlStr.matchAll(pRegex)) {
    const txt = stripTags(m[1]);
    if (
      txt.length > 110 &&
      /\b(year-old|years old|man|woman|patient|presented with|admitted|history of|neurological examination|examination revealed|MRI|CT|CSF|treated with)\b/i.test(
        txt
      )
    ) {
      paragraphs.push(txt);
      if (paragraphs.length >= 6) break;
    }
  }
  return paragraphs.join("\n\n");
}

const usedPmcIds = new Set(["PMC13510213", "PMC13560943", "PMC13445854"]);

async function findHighImpactPmcCase(topic) {
  const fullQuery = `(${topic.query}) AND (${HIGH_IMPACT_JOURNAL_FILTER}) AND OPEN_ACCESS:y`;
  const encoded = encodeURIComponent(fullQuery);
  const searchUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=25&resultType=core`;
  const buf = await fetchBuffer(searchUrl, 12000);
  const data = JSON.parse(buf.toString("utf-8"));
  const results = data?.resultList?.result || [];

  for (const item of results) {
    const pmcid = item.pmcid;
    const doi = item.doi || "";
    const pmid = item.pmid || "";
    const title = stripTags(item.title || "").replace(/\.$/, "");
    const journalTitle =
      item?.journalInfo?.journal?.title ||
      item?.journalInfo?.journal?.medlineAbbreviation ||
      "Neurology Journal";
    const journalIso = item?.journalInfo?.journal?.isoAbbreviation || journalTitle;
    const pubYear = String(item.pubYear || "2025");
    const abstractText = stripTags(item.abstractText || "");

    if (!pmcid || !doi || usedPmcIds.has(pmcid)) continue;
    if (EXCLUDED_JOURNALS.test(journalTitle)) continue;
    if (EXCLUDED_ARTICLE_TITLES.test(title)) continue;

    try {
      const pmcPageUrl = `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`;
      const htmlBuf = await fetchBuffer(pmcPageUrl, 12000);
      const htmlStr = htmlBuf.toString("utf-8");

      const figRegex = /<figure\b[^>]*>([\s\S]*?)<\/figure>/gi;
      const figMatches = [...htmlStr.matchAll(figRegex)];
      if (figMatches.length === 0) continue;

      const caseBodyText = extractCaseParagraphs(htmlStr);
      if (caseBodyText.length < 150) continue;

      const extractedFigs = [];
      for (const fm of figMatches) {
        const block = fm[1];
        const imgMatch = block.match(
          /<img\b[^>]*src=["'](https:\/\/cdn\.ncbi\.nlm\.nih\.gov\/pmc\/blobs\/[^"']+)["']/i
        );
        if (!imgMatch) continue;
        const cdnUrl = imgMatch[1];

        const capMatch = block.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        const caption = stripTags(capMatch ? capMatch[1] : "");
        if (caption.length < 40) continue;
        if (EXCLUDED_CAPTION_WORDS.test(caption)) continue;
        if (!REQUIRED_IMAGING_CAPTION.test(caption)) continue;

        try {
          const imgBuf = await fetchBuffer(cdnUrl, 12000);
          if (imgBuf.length > 9000) {
            const ext = path.extname(new URL(cdnUrl).pathname) || ".jpg";
            const fileName = `${pmcid}_fig${extractedFigs.length + 1}${ext}`;
            const localFsPath = path.join(FIGURES_DIR, fileName);
            fs.writeFileSync(localFsPath, imgBuf);

            extractedFigs.push({
              pmcid,
              doi,
              pmid,
              article_title: title,
              journal_title: journalTitle,
              journal_short: journalIso,
              pub_year: pubYear,
              abstract: abstractText,
              case_body_text: caseBodyText.slice(0, 2800),
              figure_label: `Figure ${extractedFigs.length + 1}`,
              caption: caption.slice(0, 650),
              cdn_url: cdnUrl,
              local_url: `/data/figures/${fileName}`,
            });
          }
        } catch {
          // continue
        }

        if (extractedFigs.length >= 2) break;
      }

      if (extractedFigs.length > 0) {
        usedPmcIds.add(pmcid);
        return extractedFigs;
      }
    } catch {
      continue;
    }
  }
  return [];
}

const RE_FETCH_TOPICS = [
  {
    key: "artery_of_percheron_stroke",
    query:
      '("Artery of Percheron" OR "basilar artery occlusion" OR "top of the basilar") AND "case report" AND (MRI OR DWI OR thrombectomy)',
  },
  {
    key: "wallenberg_dissection",
    query:
      '("Wallenberg syndrome" OR "lateral medullary" OR "vertebral artery dissection") AND "case report" AND (MRI OR DWI)',
  },
  {
    key: "cvst_venous_thrombosis",
    query:
      '("cerebral venous thrombosis" OR "cerebral venous sinus thrombosis") AND "case report" AND (MRI OR MRV)',
  },
  {
    key: "lgi1_or_nmdar_encephalitis",
    query:
      '("LGI1" OR "faciobrachial dystonic" OR "anti-LGI1" OR "CASPR2") AND "case report" AND MRI',
  },
  {
    key: "bickerstaff_or_miller_fisher",
    query:
      '("Bickerstaff brainstem encephalitis" OR "osmotic demyelination syndrome" OR "central pontine myelinolysis") AND "case report" AND MRI',
  },
];

async function main() {
  const targetDate = process.env.TARGET_DATE || new Date().toISOString().slice(0, 10);
  const forceFetch = process.argv.includes("--force");
  const casesPath = path.join(process.cwd(), "public", "data", "cases.json");

  if (!forceFetch && fs.existsSync(casesPath)) {
    try {
      const currentCases = JSON.parse(fs.readFileSync(casesPath, "utf-8"));
      const existingDailyForDate = currentCases.find(
        (c) =>
          c.is_daily_challenge === true &&
          (!c.status || c.status === "approved") &&
          c.published_date === targetDate
      );
      if (existingDailyForDate) {
        console.log(
          `✅ Daily Challenge already scheduled for ${targetDate} (${existingDailyForDate.case_code}: "${existingDailyForDate.title}"). Skipping automated AI/PMC case fetch for this date.`
        );
        return;
      }
    } catch (err) {
      console.warn("Could not check existing cases.json schedule:", err);
    }
  }

  const outPath = path.join(process.cwd(), "public", "data", "pmc_extracted_figures.json");
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, "utf-8"))
    : {};

  for (const t of RE_FETCH_TOPICS) {
    console.log(`Fetching genuine patient neuroimaging case report for: ${t.key} ...`);
    const figs = await findHighImpactPmcCase(t);
    if (figs.length > 0) {
      console.log(
        `  ✓ Found [${figs[0].journal_title}] (${figs[0].pmcid}): ${figs[0].article_title} (${figs.length} figs)`
      );
      existing[t.key] = figs;
    } else {
      console.log(`  ✗ No match for ${t.key}`);
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2), "utf-8");
  console.log(`\nUpdated ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
