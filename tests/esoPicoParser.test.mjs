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
    assert.equal(ESO_GRADE_QUALITY_CONFIG["Uncertain / Ongoing trial"].symbols, "-");
    assert.equal(ESO_GRADE_QUALITY_CONFIG["Uncertain / Ongoing trial"].hex, "#64748b");
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

  await t.test("should parse ESO aSAH sub-PICO questions (1a, 1b, 3a, 10) without falling back to sequential counters", async () => {
    const rawAsahMarkdown = `
# European Stroke Organisation (ESO) guideline on aneurysmal subarachnoid haemorrhage

Table 3 Synoptic table of all recommendations and expert consensus statements.

| PICO | Recommendation | Quality of evidence | Strength of recommendation | Expert consensus statement | Voting | Related studies |
| --- | --- | --- | --- | --- | --- | --- |
| PICO 1a In adult patients with aSAH, does treatment with antifibrinolytic drugs compared to no antifibrinolytic drugs decrease the risk of poor functional outcome? | In adult patients with aSAH, we recommend against routine administration of antifibrinolytic drugs prior to treatment of the ruptured aneurysm to decrease the risk of poor functional outcome. | Moderate | Strong against intervention | | | ULTRA |
| PICO 1b In adult patients with aSAH, does treatment with antihypertensive drugs compared to no antihypertensive drugs decrease the risk of poor functional outcome? | In adult patients with aSAH, no recommendation can be made on the administration of blood pressure lowering drugs prior to treatment of the ruptured aneurysm to decrease the risk of poor functional outcome. | Very low | - | In adult patients with aSAH and systolic blood pressures higher than 160-180 mm Hg, we suggest considering blood pressure lowering drugs to lower systolic blood pressure to around 160 mm Hg. | 11/13 | |
| PICO 3a In adult patients with aSAH, does any type of endovascular aneurysm occlusion compared to neurosurgical aneurysm occlusion decrease the risk of poor functional outcome? | In adult patients with aSAH in good clinical condition with aneurysms that can be treated by regular coiling or neurosurgical clipping, we recommend regular coiling as the preferred strategy. | High | Strong for intervention | We suggest that all patients with aSAH are discussed in an interdisciplinary manner. | 13/13 | ISAT, BRAT |
| PICO 10 In adult patients with aSAH, does radiological follow-up beyond 6 months decrease the risk of poor functional outcome? | In adult patients with aSAH, no recommendation can be made on radiological follow-up beyond 6 months. | Very low | - | In adult patients with aSAH who are treated with coils, we suggest at least one additional radiological follow-up at or beyond 12 months. | 13/13 | ISAT |
`;

    const parsed = parseNotebookLMContent(rawAsahMarkdown, {
      society: "ESO",
      year: 2026,
    });

    assert.equal(parsed.doc.allPracticeChanges.length, 4);
    assert.equal(parsed.doc.allPracticeChanges[0].picoNumber, "1a");
    assert.equal(parsed.doc.allPracticeChanges[1].picoNumber, "1b");
    assert.equal(parsed.doc.allPracticeChanges[2].picoNumber, "3a");
    assert.equal(parsed.doc.allPracticeChanges[3].picoNumber, "10");

    const grouped = groupPracticeChangesIntoEsoPicos(parsed.doc.allPracticeChanges);
    assert.equal(grouped.length, 4);
    assert.equal(grouped[0].picoNumber, "1a");
    assert.equal(grouped[1].picoNumber, "1b");
    assert.equal(grouped[2].picoNumber, "3a");
    assert.equal(grouped[3].picoNumber, "10");
  });

  await t.test("CANONICAL_ESO_2026_ASAH_PICOS should accurately contain all 15 PICO questions and 37 expert consensus statements", async () => {
    const {
      CANONICAL_ESO_2026_ASAH_PICOS,
      getCanonicalEsoPicos,
      isEsoAsahGuideline,
      isEsoBpGuideline,
    } = await import("../src/lib/neuroguide/esoPicoGrouper.ts");

    assert.equal(CANONICAL_ESO_2026_ASAH_PICOS.length, 15, "Table 3 has 15 PICO questions across 10 topics");

    const totalRecs = CANONICAL_ESO_2026_ASAH_PICOS.reduce((acc, p) => acc + p.recommendations.length, 0);
    assert.equal(totalRecs, 17, "Table 3 contains 17 recommendation statements across the 15 PICO questions (PICO 4 has 3 recommendations)");

    // Count individual expert consensus statements (numbered 1., 2., etc.)
    let consensusStatementCount = 0;
    CANONICAL_ESO_2026_ASAH_PICOS.forEach((p) => {
      if (p.expertConsensusStatement) {
        const lines = p.expertConsensusStatement.split(/\n+/).filter((l) => l.trim().length > 0);
        consensusStatementCount += lines.length;
      }
    });
    assert.equal(consensusStatementCount, 37, "Must have exactly 37 expert consensus statements as stated in paper");

    // Verify isolation: aSAH must not be confused with BP
    const asahTitle = "European Stroke Organisation (ESO) guideline on aneurysmal subarachnoid haemorrhage";
    assert.ok(isEsoAsahGuideline(asahTitle));
    assert.ok(!isEsoBpGuideline(asahTitle));

    const asahCanonical = getCanonicalEsoPicos(asahTitle);
    assert.equal(asahCanonical?.length, 15);
    assert.ok(asahCanonical?.[0].picoQuestion.includes("subarachnoid"));

    const bpTitle = "ESO Guideline on Blood Pressure Management in Acute Ischemic Stroke";
    assert.ok(isEsoBpGuideline(bpTitle));
    assert.ok(!isEsoAsahGuideline(bpTitle));

    const bpCanonical = getCanonicalEsoPicos(bpTitle);
    assert.equal(bpCanonical?.length, 8);
    assert.ok(bpCanonical?.[0].picoQuestion.includes("blood pressure"));
  });
});
