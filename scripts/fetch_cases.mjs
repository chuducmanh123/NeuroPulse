import fs from "fs";
import path from "path";
import https from "https";

const FIGURES_DIR = path.join(process.cwd(), "public", "data", "figures");
fs.mkdirSync(FIGURES_DIR, { recursive: true });

function fetchBuffer(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        family: 4,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
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
    .replace(/\s+/g, " ")
    .trim();
}

const NEUROIMAGING_CAPTION_REGEX = /\b(MRI|FLAIR|DWI|diffusion|medulla|infarct|hyperintens|lesion|EEG|delta|spike|angiograph|MRA|CTA|thymoma|chest CT)\b/i;

async function findPmcCaseWithCdnFigures(query) {
  const encoded = encodeURIComponent(`${query} AND OPEN_ACCESS:y`);
  const searchUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=10&resultType=core`;
  const buf = await fetchBuffer(searchUrl, 8000);
  const data = JSON.parse(buf.toString("utf-8"));
  const results = data?.resultList?.result || [];

  for (const item of results) {
    const pmcid = item.pmcid;
    const doi = item.doi || "";
    const pmid = item.pmid || "";
    const title = (item.title || "").replace(/\.$/, "");
    const journalTitle = item?.journalInfo?.journal?.title || "PubMed Central";
    const pubYear = String(item.pubYear || "2024");
    const abstractText = stripTags(item.abstractText || "");

    if (!pmcid) continue;

    try {
      const pmcPageUrl = `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`;
      const htmlBuf = await fetchBuffer(pmcPageUrl, 8000);
      const htmlStr = htmlBuf.toString("utf-8");

      const figRegex = /<figure\b[^>]*>([\s\S]*?)<\/figure>/gi;
      const figMatches = [...htmlStr.matchAll(figRegex)];
      if (figMatches.length === 0) continue;

      const extractedFigs = [];
      for (const fm of figMatches) {
        const block = fm[1];
        const imgMatch = block.match(/<img\b[^>]*src=["'](https:\/\/cdn\.ncbi\.nlm\.nih\.gov\/pmc\/blobs\/[^"']+)["']/i);
        if (!imgMatch) continue;
        const cdnUrl = imgMatch[1];

        const capMatch = block.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        const caption = stripTags(capMatch ? capMatch[1] : "");
        if (caption.length < 30 || !NEUROIMAGING_CAPTION_REGEX.test(caption)) continue;

        try {
          const imgBuf = await fetchBuffer(cdnUrl, 8000);
          if (imgBuf.length > 5000) {
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
              pub_year: pubYear,
              abstract: abstractText,
              figure_label: `Figure ${extractedFigs.length + 1}`,
              caption: caption.slice(0, 520),
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
        return extractedFigs;
      }
    } catch {
      continue;
    }
  }
  return [];
}

async function main() {
  const existingPath = path.join(process.cwd(), "public", "data", "pmc_extracted_figures.json");
  const existing = fs.existsSync(existingPath)
    ? JSON.parse(fs.readFileSync(existingPath, "utf-8"))
    : {};

  const RE_FETCH = [
    {
      key: "wallenberg",
      query: 'TITLE:"Wallenberg syndrome" AND "lateral medullary" AND MRI AND "case report"',
    },
    {
      key: "nmda_encephalitis",
      query: 'TITLE:"anti-N-methyl-D-aspartate receptor encephalitis" AND MRI AND "case report"',
    },
  ];

  for (const t of RE_FETCH) {
    console.log(`Refining neuroimaging figure for: ${t.key} ...`);
    const figs = await findPmcCaseWithCdnFigures(t.query);
    if (figs.length > 0) {
      console.log(`  -> Updated ${t.key}: ${figs[0].pmcid} - ${figs[0].article_title}`);
      existing[t.key] = figs;
    }
  }

  fs.writeFileSync(existingPath, JSON.stringify(existing, null, 2), "utf-8");
  console.log("Refinement complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
