// Helper script to fetch official openFDA SPL label and extract clean structured text for NeuroRx sources
// Run with: node scripts/neurorx/fetch-fda-label.mjs <generic_name> <brand_name> <source_id>

import fs from "node:fs";
import path from "node:path";

const [genericName, brandName, sourceId] = process.argv.slice(2);

if (!genericName || !sourceId) {
  console.error("Usage: node fetch-fda-label.mjs <generic_name> <brand_name> <source_id>");
  process.exit(1);
}

const SOURCES_DIR = path.resolve(process.cwd(), "data/neurorx/sources");
const SOURCES_JSON = path.resolve(process.cwd(), "data/neurorx/sources.json");

async function main() {
  console.log(`🔍 Fetching openFDA SPL label for ${genericName} (Brand: ${brandName || 'N/A'})...`);
  
  // Try search by set_id if provided, else brand name, else generic name
  let query;
  if (brandName && brandName.startsWith("set_id:")) {
    query = `set_id:"${brandName.replace('set_id:', '')}"`;
  } else if (brandName && brandName.startsWith("query:")) {
    query = brandName.replace('query:', '');
  } else if (brandName) {
    query = `openfda.brand_name:"${brandName}"`;
  } else {
    query = `openfda.generic_name:"${genericName}"`;
  }

  let url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1`;
  let res = await fetch(url);
  let data = await res.json();

  if (!data.results || data.results.length === 0) {
    // Fallback search by generic name
    query = `openfda.generic_name:"${genericName}"`;
    url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1`;
    res = await fetch(url);
    data = await res.json();
  }

  if (!data.results || data.results.length === 0) {
    console.error(`❌ No SPL label found on openFDA for ${genericName}`);
    process.exit(1);
  }

  const result = data.results[0];
  const setId = result.set_id || result.id;
  const officialBrand = result.openfda?.brand_name?.[0] || brandName || genericName.toUpperCase();
  const officialManufacturer = result.openfda?.manufacturer_name?.[0] || "FDA Registered Manufacturer";
  const title = `${officialBrand} (${genericName}) Prescribing Information`;

  console.log(`✅ Found: ${title} (Set ID: ${setId})`);

  // Build clean structured text
  const sections = [
    { title: "BOXED WARNING", keys: ["boxed_warning"] },
    { title: "1 INDICATIONS AND USAGE", keys: ["indications_and_usage"] },
    { title: "2 DOSAGE AND ADMINISTRATION", keys: ["dosage_and_administration"] },
    { title: "3 DOSAGE FORMS AND STRENGTHS", keys: ["dosage_forms_and_strengths"] },
    { title: "4 CONTRAINDICATIONS", keys: ["contraindications"] },
    { title: "5 WARNINGS AND PRECAUTIONS", keys: ["warnings_and_precautions"] },
    { title: "6 ADVERSE REACTIONS", keys: ["adverse_reactions"] },
    { title: "7 DRUG INTERACTIONS", keys: ["drug_interactions"] },
    { title: "8 USE IN SPECIFIC POPULATIONS", keys: ["use_in_specific_populations", "pregnancy", "nursing_mothers", "pediatric_use", "geriatric_use"] },
    { title: "10 OVERDOSAGE", keys: ["overdosage"] },
    { title: "11 DESCRIPTION", keys: ["description"] },
    { title: "12 CLINICAL PHARMACOLOGY", keys: ["clinical_pharmacology", "mechanism_of_action", "pharmacokinetics"] },
  ];

  let fullText = `${title}\n\n`;

  for (const sec of sections) {
    let secContent = "";
    for (const k of sec.keys) {
      if (result[k] && Array.isArray(result[k])) {
        secContent += result[k].join("\n\n") + "\n\n";
      }
    }
    if (secContent.trim()) {
      fullText += `=== ${sec.title} ===\n\n${secContent.trim()}\n\n`;
    }
  }

  // Write raw json and txt
  const rawPath = path.join(SOURCES_DIR, `${sourceId}.json`);
  const txtPath = path.join(SOURCES_DIR, `${sourceId}.txt`);

  fs.writeFileSync(rawPath, JSON.stringify(result, null, 2), "utf-8");
  fs.writeFileSync(txtPath, fullText, "utf-8");
  console.log(`📄 Saved label text to ${txtPath} (${fullText.length} chars)`);

  // Register in sources.json if not already present
  let sources = [];
  if (fs.existsSync(SOURCES_JSON)) {
    sources = JSON.parse(fs.readFileSync(SOURCES_JSON, "utf-8"));
  }

  const existingIdx = sources.findIndex((s) => s.id === sourceId);
  const sourceEntry = {
    id: sourceId,
    type: "fda_label",
    title,
    publisher: `U.S. Food and Drug Administration / ${officialManufacturer}`,
    year: new Date().getFullYear(),
    version: setId,
    file: `${sourceId}.txt`,
    accessed: "2026-11-11",
  };

  if (existingIdx >= 0) {
    sources[existingIdx] = { ...sources[existingIdx], ...sourceEntry };
  } else {
    sources.push(sourceEntry);
  }

  fs.writeFileSync(SOURCES_JSON, JSON.stringify(sources, null, 2), "utf-8");
  console.log(`📚 Registered ${sourceId} in sources.json`);
}

main().catch(console.error);
