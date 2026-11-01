import { test, describe } from "node:test";
import assert from "node:assert";
import { parseNotebookLMContent } from "../src/lib/neuroguide/notebooklmParser.ts";

describe("Flexible Format Support for NotebookLM & DOCX Ingestion", () => {
  test("should parse PICO blocks without markdown table", () => {
    const textWithoutTable = `# 2025 ESO Guideline on Blood Pressure Management in Acute Ischaemic Stroke
Summary of key recommendations.

PICO 1: In patients with suspected acute stroke, does pre-hospital blood pressure lowering improve outcome?
Recommendation: In patients with suspected stroke, we suggest against routine blood pressure lowering in pre-hospital setting.
Quality of evidence: Moderate
Strength of recommendation: Strong against intervention
Expert consensus: Treatment with transdermal GTN should be avoided.
Related studies: RIGHT-2, MR ASAP

PICO 2: In patients with acute ischaemic stroke and BP < 220/110 mmHg...
Recommendation: We suggest against routine use of BP-lowering agents in first 24h.
Quality of evidence: Moderate
Strength of recommendation: Weak against intervention
`;

    const res = parseNotebookLMContent(textWithoutTable);
    assert.strictEqual(res.stats.totalRecommendations, 2);
    assert.strictEqual(res.doc.allPracticeChanges[0].strength, "Strong against intervention");
    assert.strictEqual(res.doc.allPracticeChanges[0].quality, "Moderate");
    assert.ok(res.doc.allPracticeChanges[0].expertConsensusStatement?.includes("transdermal GTN"));
  });

  test("should parse Vietnamese table headers", () => {
    const tableWithVietnamese = `# 2025 ESO Guideline on Blood Pressure Management
| PICO | Câu hỏi | Khuyến nghị lâm sàng | Mức độ | Bằng chứng |
| --- | --- | --- | --- | --- |
| PICO 1 | Tiền viện | Không hạ HA thường quy trước viện | Mạnh | Trung bình |
`;
    const res = parseNotebookLMContent(tableWithVietnamese);
    assert.strictEqual(res.stats.totalRecommendations, 1);
    assert.ok(res.doc.allPracticeChanges[0].currentText.includes("Không hạ HA"));
  });

  test("should parse ESO table without literal 'recommendation' in header", () => {
    const tableWithoutExplicitRecHeader = `# 2025 ESO Guideline
| PICO | Clinical Question | Evidence Quality | Strength | Expert Consensus |
| --- | --- | --- | --- | --- |
| PICO 1 | Prehospital BP | Moderate | Strong against intervention | Avoid GTN |
`;
    const res = parseNotebookLMContent(tableWithoutExplicitRecHeader);
    assert.strictEqual(res.stats.totalRecommendations, 1);
  });

  test("should parse numbered list with Class and Level of evidence", () => {
    const ahaNumberedList = `# 2025 AHA Stroke Guideline
1. In patients with acute ischemic stroke eligible for IVT, BP should be lowered to <185/110 mmHg. (Class 1, Level A)
2. Mechanical thrombectomy is recommended for large vessel occlusion up to 24 hours. (Class 1, Level A)
`;
    const res = parseNotebookLMContent(ahaNumberedList);
    assert.strictEqual(res.stats.totalRecommendations, 2);
  });
});
