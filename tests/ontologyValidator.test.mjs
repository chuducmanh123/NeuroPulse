import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  STROKE_ONTOLOGY,
  validateLabelRecord,
  autoLabelRecommendationVerbatim,
  toLabelerInput,
  sanitizeControlChars,
  computeNormalizedTierFromGrade,
} from "../src/lib/neuroguide/ontologyValidator.ts";
import { PIVOTAL_TRIALS_SEED, mergePivotalTrialsWithConferences } from "../src/data/pivotalTrialsSeed.ts";

const examplesPath = path.join(process.cwd(), "core", "labeler", "labeler_fewshot_examples.json");
const examplesData = JSON.parse(fs.readFileSync(examplesPath, "utf8"));

test("TS validateLabelRecord matches Python selftest behavior on gold examples", () => {
  for (const ex of examplesData.examples) {
    const res = validateLabelRecord(ex.input, ex.expected_output, STROKE_ONTOLOGY);
    const expectedStatus = ex.input.rec_id.startsWith("DEMO") ? "needs_review" : "ai_checked";
    assert.equal(
      res.status,
      expectedStatus,
      `Expected ${ex.input.rec_id} to be ${expectedStatus}, got ${res.status} (errors=${JSON.stringify(res.errors)})`
    );
  }
});

test("TS validateLabelRecord catches fabricated spans, extra keys, and COR direction conflicts", () => {
  const imgExample = examplesData.examples.find((e) => e.input.rec_id === "AHA2026-AIS-imaging-02");
  const gliExample = examplesData.examples.find((e) => e.input.rec_id === "AHA2026-AIS-swelling-GLI");

  // 1. Fabricated evidence span -> reject
  const badSpanOut = structuredClone(imgExample.expected_output);
  badSpanOut.labels.drug_or_procedure[0].evidence_span = "NON_EXISTENT_MRI_SPAN";
  const resSpan = validateLabelRecord(imgExample.input, badSpanOut, STROKE_ONTOLOGY);
  assert.equal(resSpan.status, "reject");
  assert.ok(resSpan.errors.some((e) => e.code === "span_not_found"));

  // 2. AI outputs COR -> reject
  const extraKeyOut = { ...structuredClone(imgExample.expected_output), cor: "2a" };
  const resExtra = validateLabelRecord(imgExample.input, extraKeyOut, STROKE_ONTOLOGY);
  assert.equal(resExtra.status, "reject");
  assert.ok(resExtra.errors.some((e) => e.code === "extra_key"));

  // 3. COR 3 No Benefit vs direction='for' -> forced into needs_review
  const conflictOut = structuredClone(gliExample.expected_output);
  conflictOut.labels.direction.value = "for";
  const resConflict = validateLabelRecord(gliExample.input, conflictOut, STROKE_ONTOLOGY);
  assert.equal(resConflict.status, "needs_review");
  assert.ok(resConflict.reviews.some((r) => r.code === "cor_direction"));
});

test("autoLabelRecommendationVerbatim strips PDF control chars and produces valid verbatim spans", () => {
  const sampleDoc = {
    id: "aha2026_test",
    society: "AHA/ASA",
    year: 2026,
    title: "2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke",
    officialUrl: "https://ahajournals.org",
    journalTarget: "Stroke",
    documentType: "Clinical Practice Guideline",
    publishDate: "2026-01-26",
    subspecialty: "Stroke",
    executiveSummary: "Summary",
    allPracticeChanges: [],
    linkedScenarioIds: [],
  };

  const sampleChange = {
    id: "aha2026-tnk-01",
    category: "4.1. \u0007Intravenous Thrombolysis",
    topic: "\u0007Alteplase and Tenecteplase",
    changeType: "UPGRADED",
    currentText:
      "In adult patients with acute ischemic stroke eligible for intravenous thrombolysis within 4.5 hours of symptom onset, either intravenous tenecteplase (0.25 mg/kg bolus) or intravenous alteplase (0.9 mg/kg) is recommended to improve functional outcome.",
    currentGrade: "Class 1, Level A",
    cor: "1",
    loe: "A",
  };

  const inp = toLabelerInput(sampleDoc, sampleChange, 0);
  assert.ok(!inp.section_path.includes("\u0007"), "Control characters must be stripped");

  const labeled = autoLabelRecommendationVerbatim(inp, STROKE_ONTOLOGY);
  const validation = validateLabelRecord(inp, labeled, STROKE_ONTOLOGY);

  assert.notEqual(validation.status, "reject", `Auto-labeler must never produce rejected labels: ${JSON.stringify(validation.errors)}`);
  assert.ok(labeled.labels.condition.some((c) => c.value === "ais"));
  assert.ok(labeled.labels.drug_or_procedure.some((d) => d.value === "tenecteplase"));
  assert.ok(labeled.labels.drug_or_procedure.some((d) => d.value === "alteplase"));
  assert.ok(labeled.labels.time_window.some((w) => w.value === "within_4_5h"));
  assert.equal(labeled.labels.direction.value, "for");
  assert.equal(computeNormalizedTierFromGrade({ cor: "1", loe: "A" }), 1);
});

test("Compact Pivotal Trials seed stays under 35 KB and merges conference trials", () => {
  const jsonBytes = Buffer.byteLength(JSON.stringify(PIVOTAL_TRIALS_SEED), "utf8");
  assert.ok(jsonBytes < 35000, `Pivotal trials seed size (${jsonBytes} bytes) should be < 35 KB`);
  const merged = mergePivotalTrialsWithConferences(PIVOTAL_TRIALS_SEED, []);
  assert.ok(merged.length >= 15);
  assert.ok(merged.some((t) => t.acronym === "AcT"));
  assert.ok(merged.some((t) => t.acronym === "SELECT2"));
});
