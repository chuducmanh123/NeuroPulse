import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const SOURCES_DIR = path.join(DATA_DIR, "sources");
const SOURCES_JSON = path.join(DATA_DIR, "sources.json");

const BATCH_2B_2C_DRUGS = [
  // Batch 2B: Neuromuscular / Immunosuppressants
  { id: "pyridostigmine", brand: "mestinon", generic: "pyridostigmine bromide" },
  { id: "prednisolone", brand: "millipred", generic: "prednisolone" },
  { id: "methylprednisolone", brand: "medrol", generic: "methylprednisolone" },
  { id: "azathioprine", brand: "imuran", generic: "azathioprine" },
  { id: "mycophenolate", brand: "cellcept", generic: "mycophenolate mofetil" },
  { id: "efgartigimod", brand: "vyvgart", generic: "efgartigimod alfa-fcab" },

  // Batch 2C: Biologics / Neuroimmunology
  { id: "rituximab", brand: "rituxan", generic: "rituximab" },
  { id: "ivig", brand: "privigen", generic: "immune globulin intravenous" },
  { id: "eculizumab", brand: "soliris", generic: "eculizumab" },
  { id: "ravulizumab", brand: "ultomiris", generic: "ravulizumab-cwvz" },
];

const SECTIONS = [
  "boxed_warning",
  "indications_and_usage",
  "dosage_and_administration",
  "dosage_forms_and_strengths",
  "contraindications",
  "warnings_and_cautions",
  "adverse_reactions",
  "drug_interactions",
  "use_in_specific_populations",
  "pregnancy",
  "pediatric_use",
  "geriatric_use",
  "hepatic_impairment",
  "renal_impairment",
  "overdosage",
  "description",
  "clinical_pharmacology",
  "mechanism_of_action",
  "pharmacokinetics",
  "nonclinical_toxicology",
  "clinical_studies",
  "how_supplied",
  "patient_counseling_information",
];

async function fetchLabel(drug) {
  console.log(`\nFetching ${drug.id} (brand: ${drug.brand}, generic: ${drug.generic})...`);
  const query = `openfda.brand_name:"${drug.brand}"`;
  const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1`;

  let res = await fetch(url);
  let doc = null;
  if (res.ok) {
    const json = await res.json();
    doc = json.results?.[0];
  }

  if (!doc) {
    console.log(`  Falling back to generic query for ${drug.id}...`);
    const fallbackUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drug.generic)}"&limit=1`;
    res = await fetch(fallbackUrl);
    if (res.ok) {
      const json = await res.json();
      doc = json.results?.[0];
    }
  }

  if (!doc) {
    // Try relaxed generic
    const simpleGeneric = drug.generic.split(" ")[0];
    console.log(`  Falling back to simple generic "${simpleGeneric}" for ${drug.id}...`);
    const fallbackUrl2 = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(simpleGeneric)}"&limit=1`;
    res = await fetch(fallbackUrl2);
    if (res.ok) {
      const json = await res.json();
      doc = json.results?.[0];
    }
  }

  if (!doc) {
    throw new Error(`Failed to find label for ${drug.id}`);
  }

  const setId = doc.set_id || doc.id || "unknown";
  const effectiveTime = doc.effective_time || "2024";
  const year = parseInt(effectiveTime.slice(0, 4), 10) || 2024;

  // Save raw json
  const jsonPath = path.join(SOURCES_DIR, `fda-${drug.id}-label.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2), "utf-8");

  // Construct text version
  const textParts = [];
  textParts.push(`TITLE: ${drug.brand.toUpperCase()} (${drug.generic}) PRESCRIBING INFORMATION`);
  textParts.push(`SET_ID: ${setId}`);
  textParts.push(`EFFECTIVE_TIME: ${effectiveTime}`);
  textParts.push(`PUBLISHER: US Food and Drug Administration / DailyMed\n`);

  for (const sec of SECTIONS) {
    if (doc[sec] && Array.isArray(doc[sec])) {
      textParts.push(`=== ${sec.toUpperCase().replace(/_/g, " ")} ===`);
      textParts.push(doc[sec].join("\n\n"));
      textParts.push("");
    }
  }

  const txtPath = path.join(SOURCES_DIR, `fda-${drug.id}-label.txt`);
  fs.writeFileSync(txtPath, textParts.join("\n"), "utf-8");

  console.log(`Saved fda-${drug.id}-label.json and .txt (set_id: ${setId}, year: ${year})`);
  return {
    id: `fda-${drug.id}-label`,
    type: "fda_label",
    title: `${drug.brand.charAt(0).toUpperCase() + drug.brand.slice(1)} (${drug.generic}) Prescribing Information`,
    publisher: "US FDA / DailyMed",
    year,
    version: setId,
    url: `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${setId}`,
    file: `fda-${drug.id}-label.txt`,
    accessed: new Date().toISOString().split("T")[0],
  };
}

async function main() {
  console.log("Fetching FDA Prescribing Information for Wave 2 Batches 2B & 2C...");
  const newSources = [];

  for (const drug of BATCH_2B_2C_DRUGS) {
    try {
      const src = await fetchLabel(drug);
      newSources.push(src);
    } catch (err) {
      console.error(`❌ Error fetching ${drug.id}:`, err.message);
    }
  }

  console.log(`\nSuccessfully fetched ${newSources.length} of ${BATCH_2B_2C_DRUGS.length} labels.`);

  // Update sources.json
  const existingSources = JSON.parse(fs.readFileSync(SOURCES_JSON, "utf-8"));
  for (const ns of newSources) {
    const idx = existingSources.findIndex((s) => s.id === ns.id);
    if (idx !== -1) {
      existingSources[idx] = ns;
    } else {
      existingSources.push(ns);
    }
  }

  fs.writeFileSync(SOURCES_JSON, JSON.stringify(existingSources, null, 2), "utf-8");
  console.log(`Updated ${SOURCES_JSON} (now ${existingSources.length} sources registered).`);
}

main().catch(console.error);
