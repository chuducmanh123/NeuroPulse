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
    assert.equal(normalizeEsoStrength("–"), "Uncertain / Ongoing trials");
    assert.equal(normalizeEsoStrength("-"), "Uncertain / Ongoing trials");
    assert.equal(normalizeEsoStrength("Not assessable (–)"), "Uncertain / Ongoing trials");
    assert.equal(normalizeEsoStrength("Not assessable (-)"), "Uncertain / Ongoing trials");
    assert.equal(normalizeEsoStrength("Not assessable"), "Uncertain / Ongoing trials");
    assert.equal(normalizeEsoStrength("(–)"), "Uncertain / Ongoing trials");
    assert.equal(normalizeEsoStrength("(-)", "In patients with aSAH, we do not suggest routine screening"), "Uncertain / Ongoing trials");

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

  await t.test("should eliminate extra PICO 1 and leftover PICO 11..42 when grouping 42 raw unnumbered recommendations from PDF upload", async () => {
    const {
      groupPracticeChangesIntoEsoPicos,
      convertEsoPicoItemsToPracticeChanges,
    } = await import("../src/lib/neuroguide/esoPicoGrouper.ts");

    // Simulate the exact 42 raw items produced when a 2-batch PDF extractor extracted Page 3 box + 10 PICOs + 31 consensus statements without PICO prefixes
    const noisyRawChanges = [
      {
        id: "rec-1",
        category: "General Care",
        topic: "Specialized Neuro-ICU Admission",
        changeType: "NEW",
        currentText:
          "Admit or immediately transfer the patient to a dedicated neuro-ICU or high care unit in a centre that treats at least 70 patients with aSAH per year, or at least 35 patients with aSAH per year in geographically remote areas.",
        currentGrade: "GRADE Strong for intervention (Evidence: Moderate)",
        quality: "Moderate",
        strength: "Strong for intervention",
        drivingTrials: ["SYNAPSE-ICU"],
      },
      {
        id: "rec-2",
        category: "Prevention of Rebleeding",
        topic: "Antifibrinolytic Therapy",
        changeType: "NEW",
        currentText:
          "In adult patients with aSAH, we recommend against routine administration of antifibrinolytic drugs prior to treatment of the ruptured aneurysm to decrease the risk of poor functional outcome.",
        currentGrade: "GRADE Strong against intervention (Evidence: Moderate)",
        quality: "Moderate",
        strength: "Strong against intervention",
        drivingTrials: ["ULTRA"],
      },
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `rec-${i + 3}`,
        category: "Expert Consensus",
        topic:
          i === 8
            ? "Pre-treatment Blood Pressure Lowering"
            : i === 9
            ? "Blood Pressure Lowering Methodology"
            : i === 10
            ? "Timing of Aneurysm Occlusion"
            : i === 11
            ? "Interdisciplinary Discussion"
            : `Consensus Item ${i + 3}`,
        changeType: "NEW",
        currentText: `In adult patients with aSAH and systolic blood pressures higher than 160-180 mm Hg, consensus statement #${i + 1}.`,
        currentGrade: "GRADE Weak for intervention (Evidence: Moderate)",
      })),
    ];

    assert.equal(noisyRawChanges.length, 42);

    // 1. Test with title passed
    const groupedWithTitle = groupPracticeChangesIntoEsoPicos(
      noisyRawChanges,
      "2026 ESO EANS and ESMINT guideline on aneurysmal subarachnoid haemorrhage",
      "eso_asah_2026"
    );
    assert.equal(groupedWithTitle.length, 15, "Must return exactly the 15 canonical PICO questions (1a..10)");
    assert.equal(groupedWithTitle[0].picoNumber, "1a", "First PICO must be 1a, never standalone PICO 1");
    assert.equal(groupedWithTitle[1].picoNumber, "1b", "Second PICO must be 1b");
    assert.equal(groupedWithTitle[groupedWithTitle.length - 1].picoNumber, "10", "Last PICO must be 10, never PICO 11..42");
    assert.ok(!groupedWithTitle.some((p) => p.picoNumber === "1"), "Standalone PICO 1 must not exist");
    assert.ok(!groupedWithTitle.some((p) => Number(p.picoNumber) > 10), "PICO 11..42 must not exist");

    // 2. Test even WITHOUT title passed (auto-detected via content signature)
    const groupedWithoutTitle = groupPracticeChangesIntoEsoPicos(noisyRawChanges);
    assert.equal(groupedWithoutTitle.length, 15);
    assert.equal(groupedWithoutTitle[0].picoNumber, "1a");
    assert.equal(groupedWithoutTitle[groupedWithoutTitle.length - 1].picoNumber, "10");

    // 3. Test convertEsoPicoItemsToPracticeChanges round-trip
    const cleanChanges = convertEsoPicoItemsToPracticeChanges(groupedWithTitle);
    assert.equal(cleanChanges.length, 17, "15 PICO questions contain 17 formal recommendations in total");
    const regouped = groupPracticeChangesIntoEsoPicos(cleanChanges);
    assert.equal(regouped.length, 15);
    assert.equal(regouped[0].picoNumber, "1a");
    assert.equal(regouped[regouped.length - 1].picoNumber, "10");
  });

  await t.test("generic future ESO guideline with sub-PICOs (1a, 1b) should ignore unnumbered front-matter and consensus noise", () => {
    const genericFutureEsoChanges = [
      {
        id: "front-box",
        category: "General",
        topic: "General Stroke Unit Admission",
        changeType: "NEW",
        currentText: "Admit patients to a stroke unit.",
        currentGrade: "GRADE Strong",
      },
      {
        id: "pico-1a",
        category: "Acute Treatment",
        topic: "PICO 1a: In patients with condition X, does drug A vs placebo improve outcome?",
        picoNumber: "1a",
        picoQuestion: "In patients with condition X, does drug A vs placebo improve outcome?",
        changeType: "NEW",
        currentText: "We recommend drug A.",
        currentGrade: "GRADE Strong for intervention",
      },
      {
        id: "pico-1b",
        category: "Acute Treatment",
        topic: "PICO 1b: In patients with condition X, does drug B vs placebo improve outcome?",
        picoNumber: "1b",
        picoQuestion: "In patients with condition X, does drug B vs placebo improve outcome?",
        changeType: "NEW",
        currentText: "We suggest against drug B.",
        currentGrade: "GRADE Weak against intervention",
      },
      {
        id: "stray-consensus",
        category: "Consensus",
        topic: "Additional Clinical Advice",
        changeType: "NEW",
        currentText: "We suggest monitoring blood pressure every 15 minutes.",
        currentGrade: "GRADE Weak for intervention",
      },
    ];

    const grouped = groupPracticeChangesIntoEsoPicos(
      genericFutureEsoChanges,
      "2027 ESO Guideline on Novel Neurological Condition",
      "eso_novel_2027"
    );
    assert.equal(grouped.length, 2, "Must only include explicit PICO 1a and 1b, ignoring unnumbered noise");
    assert.equal(grouped[0].picoNumber, "1a");
    assert.equal(grouped[1].picoNumber, "1b");
  });

  await t.test("parseConsensusList should parse single, multiple numbered, and array consensus statements with voting", async () => {
    const { parseConsensusList } = await import("../src/lib/neuroguide/esoPicoGrouper.ts");

    // Single statement with vote
    const single = parseConsensusList("Due to potential harm, avoid GTN. (Vote: 10/10)");
    assert.equal(single.length, 1);
    assert.equal(single[0].statement, "Due to potential harm, avoid GTN.");
    assert.equal(single[0].voting, "Vote: 10/10");

    // Multiple numbered statements with individual voting
    const multi = parseConsensusList(
      "1. In patients with SBP > 160 mm Hg, lower blood pressure cautiously. (Vote: 11/13)\n" +
      "2. Continuous infusion of short-acting drugs like labetalol is preferred. (Vote: 12/13)"
    );
    assert.equal(multi.length, 2);
    assert.equal(multi[0].number, "1");
    assert.equal(multi[0].statement, "In patients with SBP > 160 mm Hg, lower blood pressure cautiously.");
    assert.equal(multi[0].voting, "Vote: 11/13");
    assert.equal(multi[1].number, "2");
    assert.equal(multi[1].statement, "Continuous infusion of short-acting drugs like labetalol is preferred.");
    assert.equal(multi[1].voting, "Vote: 12/13");

    // Array of statements
    const arr = parseConsensusList(undefined, [
      "First expert statement (Vote: 9/10)",
      "Second expert statement (Vote: 10/10)"
    ]);
    assert.equal(arr.length, 2);
    assert.equal(arr[0].statement, "First expert statement");
    assert.equal(arr[0].voting, "Vote: 9/10");
    assert.equal(arr[1].statement, "Second expert statement");
    assert.equal(arr[1].voting, "Vote: 10/10");
  });

  await t.test("should display expert consensus statement for EVERY recommendation under the same PICO", async () => {
    const { groupPracticeChangesIntoEsoPicos, convertEsoPicoItemsToPracticeChanges } = await import(
      "../src/lib/neuroguide/esoPicoGrouper.ts"
    );

    // PICO 5 with 2 recommendations, both having distinct expert consensus statements
    const changesWithMultipleConsensus = [
      {
        id: "rec-pico5-1",
        picoNumber: "5",
        picoQuestion: "In patients with acute stroke, does intervention X vs control improve outcome?",
        topic: "PICO 5: In patients with acute stroke, does intervention X vs control improve outcome?",
        category: "PICO 5",
        changeType: "NEW",
        currentText: "Recommendation 1: We recommend intervention X for subgroup A.",
        currentGrade: "GRADE Strong for intervention (Evidence: High)",
        quality: "High",
        strength: "Strong for intervention",
        expertConsensusStatement: "Expert Consensus for Recommendation 1: Panel advises careful monitoring during infusion.",
        voting: "Vote: 12/12",
        drivingTrials: ["TRIAL-A"],
      },
      {
        id: "rec-pico5-2",
        picoNumber: "5",
        picoQuestion: "In patients with acute stroke, does intervention X vs control improve outcome?",
        topic: "PICO 5: In patients with acute stroke, does intervention X vs control improve outcome?",
        category: "PICO 5",
        changeType: "NEW",
        currentText: "Recommendation 2: We suggest against intervention X for subgroup B.",
        currentGrade: "GRADE Weak against intervention (Evidence: Low)",
        quality: "Low",
        strength: "Weak against intervention",
        expertConsensusStatement: "Expert Consensus for Recommendation 2: In subgroup B with renal failure, avoid drug Y.",
        voting: "Vote: 11/12",
        drivingTrials: ["TRIAL-B"],
      },
    ];

    const grouped = groupPracticeChangesIntoEsoPicos(changesWithMultipleConsensus);
    assert.equal(grouped.length, 1, "Should group both into a single PICO 5");
    assert.equal(grouped[0].picoNumber, "5");
    assert.equal(grouped[0].recommendations.length, 2, "PICO 5 has 2 recommendations");

    // CRITICAL FIX VERIFICATION:
    // Recommendation 1 MUST have its consensus statement
    assert.equal(
      grouped[0].recommendations[0].expertConsensusStatement,
      "Expert Consensus for Recommendation 1: Panel advises careful monitoring during infusion."
    );
    assert.equal(grouped[0].recommendations[0].voting, "Vote: 12/12");

    // Recommendation 2 MUST have its consensus statement (previously lost!)
    assert.equal(
      grouped[0].recommendations[1].expertConsensusStatement,
      "Expert Consensus for Recommendation 2: In subgroup B with renal failure, avoid drug Y."
    );
    assert.equal(grouped[0].recommendations[1].voting, "Vote: 11/12");

    // The PICO-level fallback should also retain both statements combined
    assert.ok(grouped[0].expertConsensusStatement?.includes("Expert Consensus for Recommendation 1"));
    assert.ok(grouped[0].expertConsensusStatement?.includes("Expert Consensus for Recommendation 2"));

    // Verify roundtrip conversion back to PracticeChangeDetail preserves per-recommendation consensus
    const roundtrip = convertEsoPicoItemsToPracticeChanges(grouped);
    assert.equal(roundtrip.length, 2);
    assert.equal(
      roundtrip[0].expertConsensusStatement,
      "Expert Consensus for Recommendation 1: Panel advises careful monitoring during infusion."
    );
    assert.equal(
      roundtrip[1].expertConsensusStatement,
      "Expert Consensus for Recommendation 2: In subgroup B with renal failure, avoid drug Y."
    );
  });
});
