import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanMedicalText } from "../src/utils/textCleaner.ts";
import { detectStudyTypes } from "../src/utils/studyTypeDetector.ts";

describe("Text Cleaner & Clinical Normalization Engine", () => {
  it("should strip LaTeX math delimiters and replace Greek symbols", () => {
    const raw = "Patients treated with \\beta-blockers showed reduced \\alpha-synuclein ($p = 0.001$).";
    const cleaned = cleanMedicalText(raw);
    assert.ok(cleaned.includes("β-blockers"), "Failed to convert \\beta to β");
    assert.ok(cleaned.includes("α-synuclein"), "Failed to convert \\alpha to α");
    assert.ok(!cleaned.includes("$"), "Failed to remove LaTeX $ delimiter");
  });

  it("should convert LaTeX superscripts and subscripts to Unicode", () => {
    const raw = "Biomarker concentration was 10^{-4} for A\\beta_{42}.";
    const cleaned = cleanMedicalText(raw);
    assert.ok(cleaned.includes("10⁻⁴"), "Failed to convert superscript 10^{-4}");
    assert.ok(cleaned.includes("Aβ₄₂"), "Failed to convert subscript A\\beta_{42}");
  });

  it("should automatically separate glued abstract section headers", () => {
    const raw =
      "BackgroundWe evaluated tenecteplase. MethodsPatients were randomized. ResultsEndovascular therapy resulted in benefit.";
    const cleaned = cleanMedicalText(raw);
    assert.ok(cleaned.includes("Background: We evaluated"), "Failed to separate Background");
    assert.ok(cleaned.includes("Methods: Patients"), "Failed to separate Methods");
    assert.ok(cleaned.includes("Results: Endovascular"), "Failed to separate Results");
  });

  it("should decode quadruple nested HTML entities safely", () => {
    const raw = "Significant &amp;amp;lt; 0.05 reduction in &quot;infarct volume&quot;.";
    const cleaned = cleanMedicalText(raw);
    assert.ok(cleaned.includes("< 0.05"), "Failed to unescape nested HTML entities");
    assert.ok(cleaned.includes('"infarct volume"'), "Failed to unescape quot entities");
  });
});

describe("Study Type & RCT Classification Engine", () => {
  it("should NOT classify an observational cohort as RCT even if it mentions future RCTs", () => {
    const title = "Nationwide cohort study of stroke outcomes after tenecteplase";
    const abstract =
      "In this retrospective cohort of 10,000 patients, findings warrant confirmation in future randomized controlled trials.";
    const [primaryType, allTypes] = detectStudyTypes(title, abstract, "10.1001/jamaneurol.2026.01");

    assert.equal(primaryType, "Original Article");
    assert.ok(!allTypes.includes("RCT"), "Observational study must not be tagged as RCT");
  });

  it("should identify a multicenter double-blind trial as RCT and Clinical Trial", () => {
    const title = "Tenecteplase versus Alteplase in Acute Stroke with Large Vessel Occlusion";
    const abstract =
      "In this multicenter, randomized, double-blind, placebo-controlled phase 3 trial, patients were randomly assigned in a 1:1 ratio to receive tenecteplase or alteplase.";
    const [primaryType, allTypes] = detectStudyTypes(title, abstract, "10.1056/nejmoa2601");

    assert.equal(primaryType, "RCT");
    assert.ok(allTypes.includes("Clinical Trial"));
    assert.ok(allTypes.includes("Original Article"));
  });

  it("should identify clinical practice consensus statements as Guideline", () => {
    const title = "2026 AHA/ASA Guidelines for the Early Management of Acute Ischemic Stroke";
    const abstract = "Recommendations from the American Heart Association and American Stroke Association.";
    const [primaryType, allTypes] = detectStudyTypes(title, abstract, "10.1161/STR.0000000000000450");

    assert.equal(primaryType, "Guideline");
    assert.ok(allTypes.includes("Review"));
  });

  it("should identify pooled individual participant data analysis as Meta-Analysis", () => {
    const title = "Individual Participant Data Meta-Analysis of Endovascular Thrombectomy in Distal Occlusions";
    const abstract = "We conducted a systematic review and pooled analysis of 8 prospective registries.";
    const [primaryType, allTypes] = detectStudyTypes(title, abstract, "10.1016/S1474-4422(26)00012-3");

    assert.equal(primaryType, "Meta-Analysis");
    assert.ok(allTypes.includes("Review"));
  });
});
