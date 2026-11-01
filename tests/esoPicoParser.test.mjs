import test from "node:test";
import assert from "node:assert/strict";
import { parseNotebookLMContent } from "../src/lib/neuroguide/notebooklmParser.ts";
import { groupPracticeChangesIntoEsoPicos } from "../src/lib/neuroguide/esoPicoGrouper.ts";

test("ESO Guideline Ingestion and PICO Rendering Form", async (t) => {
  await t.test("should parse ESO markdown table with PICOs, GRADE ratings, expert consensus, and studies", () => {
    const rawEsoMarkdown = `
# 2024 European Stroke Organisation (ESO) Guidelines on Blood Pressure Management in Acute Stroke

Table 11 Synoptic table of all recommendations and expert consensus statements.

| PICO | Recommendation | Quality of evidence | Strength of recommendation | Expert consensus statement | Voting | Related studies |
| --- | --- | --- | --- | --- | --- | --- |
| PICO 1 In patients with suspected acute stroke, does pre-hospital blood pressure lowering with any drug, compared to no drug, improve outcome? | In patients with suspected stroke, we suggest against routine blood pressure lowering in the pre-hospital setting. | Moderate | Strong against intervention | Due to the potential harm to patients with ICH, treatment with transdermal glyceryl trinitrate should be avoided. Intravenous urapidil or labetalol could be the treatment of choice. | 10/10 | RIGHT-2, MR ASAP |
| PICO 2 In hospitalised patients with acute ischaemic stroke not treated with reperfusion therapies, does blood pressure lowering with any vasodepressor drug, compared to no drug, improve outcome? | In hospitalised patients with acute ischaemic stroke and blood pressure < 220/110 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, we suggest against the routine use of blood pressure-lowering agents at least in the first 24 h following symptom onset. | Moderate | Weak against intervention | In hospitalised patients with acute ischaemic stroke and blood pressure > 220/120 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, careful blood pressure reduction (<15% in 24 h) is reasonable and likely to be safe. | 10/10 | ENOS, SCAST |
| PICO 3 In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis, do blood pressure-lowering therapies compared to control improve outcome? | In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis, we suggest maintaining blood pressure below 185/110 mmHg before bolus, and below 180/105 mmHg after bolus and for 24 h. | Very low | Weak for intervention | | | ENCHANTED |
| PICO 3 In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis, do blood pressure-lowering therapies compared to control improve outcome? | In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis, we suggest against lowering systolic blood pressure to a target of 130–140 mmHg compared to < 180 mmHg during the first 72 h following symptom onset. | Low | Weak against intervention | | | ENCHANTED, OPTIMAL |
`;

    const parsed = parseNotebookLMContent(rawEsoMarkdown, {
      society: "ESO",
      year: 2024,
    });

    assert.equal(parsed.doc.society, "ESO");
    assert.equal(parsed.doc.allPracticeChanges.length, 4);

    // Verify PICO 1 item
    const pico1 = parsed.doc.allPracticeChanges[0];
    assert.equal(pico1.picoNumber, "1");
    assert.equal(pico1.quality, "Moderate");
    assert.equal(pico1.strength, "Strong against intervention");
    assert.ok(pico1.expertConsensusStatement?.includes("transdermal glyceryl trinitrate"));
    assert.ok(pico1.drivingTrials?.includes("RIGHT-2"));

    // Verify grouping into EsoPicoItems (PICO 3 must have 2 recommendations under 1 PICO)
    const groupedPicos = groupPracticeChangesIntoEsoPicos(parsed.doc.allPracticeChanges);
    assert.equal(groupedPicos.length, 3, "Should group 4 recommendations into 3 PICOs");

    // Check PICO 1
    assert.equal(groupedPicos[0].picoNumber, "1");
    assert.equal(groupedPicos[0].recommendations.length, 1);
    assert.equal(groupedPicos[0].recommendations[0].qualityOfEvidence, "Moderate");
    assert.equal(groupedPicos[0].recommendations[0].strengthOfRecommendation, "Strong against intervention");
    assert.ok(groupedPicos[0].expertConsensusStatement?.includes("transdermal glyceryl trinitrate"));
    assert.equal(groupedPicos[0].voting, "Vote: 10/10");

    // Check PICO 3
    assert.equal(groupedPicos[2].picoNumber, "3");
    assert.equal(groupedPicos[2].recommendations.length, 2, "PICO 3 must group both recommendations together");
    assert.equal(groupedPicos[2].recommendations[0].qualityOfEvidence, "Very low");
    assert.equal(groupedPicos[2].recommendations[0].strengthOfRecommendation, "Weak for intervention");
    assert.equal(groupedPicos[2].recommendations[1].qualityOfEvidence, "Low");
    assert.equal(groupedPicos[2].recommendations[1].strengthOfRecommendation, "Weak against intervention");
    assert.ok(groupedPicos[2].recommendations[0].drivingTrials?.includes("ENCHANTED"));
    assert.ok(groupedPicos[2].recommendations[1].drivingTrials?.includes("OPTIMAL"));
  });

  await t.test("should export distinct high-contrast colors for Quality of evidence", async () => {
    const { ESO_GRADE_QUALITY_CONFIG } = await import("../src/lib/neuroguide/esoPicoGrouper.ts");
    assert.equal(ESO_GRADE_QUALITY_CONFIG.High.hex, "#059669");
    assert.equal(ESO_GRADE_QUALITY_CONFIG.Moderate.hex, "#0284c7");
    assert.equal(ESO_GRADE_QUALITY_CONFIG.Low.hex, "#d97706");
    assert.equal(ESO_GRADE_QUALITY_CONFIG["Very low"].hex, "#7c3aed");
  });

  await t.test("normalizeEsoStrength should accurately resolve all ESO GRADE recommendation strengths", async () => {
    const { normalizeEsoStrength } = await import("../src/lib/neuroguide/esoPicoGrouper.ts");

    // Explicit standard values
    assert.equal(normalizeEsoStrength("Strong against intervention"), "Strong against intervention");
    assert.equal(normalizeEsoStrength("Weak against intervention"), "Weak against intervention");
    assert.equal(normalizeEsoStrength("Strong for intervention"), "Strong for intervention");
    assert.equal(normalizeEsoStrength("Weak for intervention"), "Weak for intervention");
    assert.equal(normalizeEsoStrength("Uncertain"), "Uncertain / Ongoing trials");
    assert.equal(normalizeEsoStrength("—"), "Uncertain / Ongoing trials");

    // Symbols
    assert.equal(normalizeEsoStrength("↓↓"), "Strong against intervention");
    assert.equal(normalizeEsoStrength("↓"), "Weak against intervention");
    assert.equal(normalizeEsoStrength("↑↑"), "Strong for intervention");
    assert.equal(normalizeEsoStrength("↑"), "Weak for intervention");

    // Direction resolution for bare "Strong"
    assert.equal(
      normalizeEsoStrength("Strong", "In patients with suspected stroke, we suggest against routine blood pressure lowering"),
      "Strong against intervention"
    );
    assert.equal(
      normalizeEsoStrength("Strong", "In patients with acute ischaemic stroke, we recommend blood pressure control"),
      "Strong for intervention"
    );

    // Direction resolution for bare "Conditional" or "Weak"
    assert.equal(
      normalizeEsoStrength("Conditional", "we suggest against routine use of blood pressure-lowering agents"),
      "Weak against intervention"
    );
    assert.equal(
      normalizeEsoStrength("Conditional", "we suggest maintaining blood pressure below 185/110 mmHg"),
      "Weak for intervention"
    );
  });
});
