import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadMergedNeuroGuideData } from "../src/lib/neuroguide/guidelineStorage.ts";
import {
  assembleNeuroGuideStoreFromGraph,
  decomposeNeuroGuideStoreToGraph,
  queryBlocksByOverlappingFacets,
  recomputeAffectedProtocolsForBlock,
} from "../src/lib/neuroguide/sync/blockGraph.ts";

describe("Phase 8 — NeuroGuide 2-Tier Granular Blocks, Overlapping Labels & Merkle Tree", () => {
  it("losslessly decomposes and reassembles live NeuroGuide store (guidelines, recs, conferences, scenarios, trials, customRecLabels & cross-links)", async () => {
    const store = await loadMergedNeuroGuideData();
    const graph = decomposeNeuroGuideStoreToGraph(store);

    assert.ok(graph.protocols.length >= store.guidelines.length + store.conferences.length + 3);
    assert.ok(graph.blocks.length > 0);
    assert.ok(/^[0-9a-f]{64}$/.test(graph.rootHash));

    // Verify rich cross-links exist (`cites_trial`, `same_section`/`same_pico`/`differs`, etc.)
    assert.ok(graph.blockLinks.length > 0, "Expected normalized cross-links in graph.blockLinks");
    assert.ok(
      graph.blockLinks.some((e) => e.linkType === "cites_trial"),
      "Expected cites_trial cross-links from recommendations to pivotal trial blocks"
    );

    // Lossless round-trip assembly
    const assembled = assembleNeuroGuideStoreFromGraph(graph);
    assert.equal(assembled.guidelines.length, store.guidelines.length);
    assert.equal(assembled.conferences.length, store.conferences.length);
    assert.equal(assembled.scenarios.length, store.scenarios.length);
    assert.equal((assembled.pivotalTrials || []).length, store.pivotalTrials.length);
    assert.equal((assembled.recommendationAtoms || []).length, store.recommendationAtoms.length);
    assert.deepEqual(assembled.customRecLabels, store.customRecLabels);

    for (let i = 0; i < store.guidelines.length; i++) {
      assert.deepEqual(assembled.guidelines[i], store.guidelines[i]);
    }
    for (let i = 0; i < store.conferences.length; i++) {
      assert.deepEqual(assembled.conferences[i], store.conferences[i]);
    }
  });

  it("performs O(log N) selective Merkle re-hashing and emits block + protocol cache tags when a shared clinical block changes", () => {
    const sharedRec = {
      id: "shared-ivt-bolus",
      sharedBlockKey: "shared:ais-ivt-alteplase-dosing",
      category: "IV Thrombolysis",
      topic: "Alteplase 0.9 mg/kg Standard Dosing",
      changeType: "STANDARD",
      currentGrade: "Class I, Level A",
      currentText: "IV Alteplase 0.9 mg/kg (max 90 mg) within 4.5 hours for eligible AIS.",
      drivingTrials: ["NINDS", "ECASS III"],
    };

    const syntheticStore = {
      guidelines: [
        {
          id: "proto-aha-ais",
          society: "AHA/ASA",
          year: 2026,
          title: "AHA Acute Ischemic Stroke 2026",
          officialUrl: "https://example.org/aha",
          journalTarget: "Stroke",
          documentType: "Clinical Practice Guideline",
          publishDate: "2026-01-26",
          subspecialty: "Stroke",
          subspecialties: ["Stroke", "Neurocritical Care"],
          executiveSummary: "AHA AIS summary",
          linkedScenarioIds: [],
          allPracticeChanges: [
            sharedRec,
            {
              id: "aha-unique-evt",
              category: "Endovascular",
              topic: "Large Core EVT",
              changeType: "UPGRADED",
              currentGrade: "Class I, Level A",
              currentText: "Mechanical thrombectomy is recommended for large-core LVO.",
              drivingTrials: ["SELECT2"],
            },
          ],
        },
        {
          id: "proto-eso-ivt",
          society: "ESO",
          year: 2025,
          title: "ESO IV Thrombolysis Update",
          officialUrl: "https://example.org/eso",
          journalTarget: "European Stroke Journal",
          documentType: "Clinical Practice Guideline",
          publishDate: "2025-05-01",
          subspecialty: "Stroke",
          executiveSummary: "ESO IVT summary",
          linkedScenarioIds: [],
          allPracticeChanges: [sharedRec],
        },
        {
          id: "proto-ilae-epilepsy",
          society: "ILAE",
          year: 2025,
          title: "ILAE Status Epilepticus Guideline",
          officialUrl: "https://example.org/ilae",
          journalTarget: "Epilepsia",
          documentType: "Clinical Practice Guideline",
          publishDate: "2025-03-01",
          subspecialty: "Epilepsy",
          subspecialties: ["Epilepsy", "Neurocritical Care"],
          executiveSummary: "ILAE SE summary",
          linkedScenarioIds: [],
          allPracticeChanges: [
            {
              id: "ilae-levetiracetam",
              category: "Status Epilepticus",
              topic: "Second-line ASM",
              changeType: "STANDARD",
              currentGrade: "Class I, Level A",
              currentText: "Administer IV Levetiracetam 60 mg/kg (max 4500 mg) for established SE.",
              drivingTrials: ["ESETT"],
            },
          ],
        },
      ],
      conferences: [],
      scenarios: [],
      pivotalTrials: [],
      recommendationAtoms: [],
      customRecLabels: {},
    };

    const graph = decomposeNeuroGuideStoreToGraph(syntheticStore);
    const sharedBlock = graph.blocks.find((b) => b.blockKey === "shared:ais-ivt-alteplase-dosing");
    assert.ok(sharedBlock);
    assert.equal(sharedBlock.blockType, "shared_clinical_block");

    const beforeAha = graph.protocols.find((p) => p.slug === "proto-aha-ais")?.protocolHash;
    const beforeEso = graph.protocols.find((p) => p.slug === "proto-eso-ivt")?.protocolHash;
    const beforeIlae = graph.protocols.find((p) => p.slug === "proto-ilae-epilepsy")?.protocolHash;
    const beforeRoot = graph.rootHash;

    // Edit ONLY the shared clinical block
    sharedBlock.data.payload.practiceChange.currentText =
      "IV Alteplase 0.9 mg/kg (10% bolus over 1 min, remainder over 60 min; max 90 mg) within 4.5h.";

    const updateRes = recomputeAffectedProtocolsForBlock(graph, sharedBlock.uid, {
      bumpBlockRev: true,
    });

    const afterAha = graph.protocols.find((p) => p.slug === "proto-aha-ais")?.protocolHash;
    const afterEso = graph.protocols.find((p) => p.slug === "proto-eso-ivt")?.protocolHash;
    const afterIlae = graph.protocols.find((p) => p.slug === "proto-ilae-epilepsy")?.protocolHash;

    assert.notEqual(afterAha, beforeAha, "AHA protocol hash must change when shared block changes");
    assert.notEqual(afterEso, beforeEso, "ESO protocol hash must change when shared block changes");
    assert.equal(afterIlae, beforeIlae, "Unrelated ILAE protocol hash must remain untouched (O(log N))");
    assert.notEqual(updateRes.rootHash, beforeRoot);
    assert.equal(sharedBlock.rev, 2);
    assert.deepEqual(updateRes.affectedProtocolSlugs, ["proto-aha-ais", "proto-eso-ivt"]);
    assert.deepEqual(updateRes.cacheTagsToInvalidate, [
      `block:${sharedBlock.uid}`,
      "protocol:proto-aha-ais",
      "protocol:proto-eso-ivt",
    ]);
  });

  it("queries blocks across overlapping multi-axis labels and resolves cited pivotal trials + scenario links", () => {
    const store = {
      guidelines: [
        {
          id: "aha-ais-2026",
          society: "AHA/ASA",
          year: 2026,
          title: "2026 AIS Guideline",
          officialUrl: "https://example.org",
          journalTarget: "Stroke",
          documentType: "Clinical Practice Guideline",
          publishDate: "2026-01-26",
          subspecialty: "Stroke",
          executiveSummary: "AIS guideline",
          linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h"],
          allPracticeChanges: [
            {
              id: "rec-tnk-multi",
              scenarioId: "ais-ivt-tenecteplase-4.5h",
              category: "Reperfusion",
              topic: "Tenecteplase for AIS",
              changeType: "NEW",
              currentGrade: "Class I, Level A",
              currentText: "IV Tenecteplase 0.25 mg/kg within 4.5 hours is recommended for acute ischemic stroke.",
              drivingTrials: ["AcT"],
              v3Labels: {
                subspecialties: ["Stroke", "Neurocritical Care"],
                conditionIds: ["cond_ischemic_stroke"],
                domains: ["treatment", "prevention"],
                diagnosisTags: [],
                timeWindowIds: ["tw_ais_early_4_5h"],
                interventionTags: ["tag_tenecteplase"],
                direction: "recommended",
                isExplicit: true,
              },
            },
          ],
        },
      ],
      conferences: [],
      scenarios: [
        {
          id: "ais-ivt-tenecteplase-4.5h",
          title: "AIS IVT Tenecteplase ≤ 4.5h",
          subspecialty: "Stroke",
          summary: "Early IVT",
          keyTags: ["tenecteplase"],
          aiSynthesisAppraisal: {
            consensusLevel: "HIGH_CONCORDANCE",
            clinicalBottomLine: "TNK 0.25 mg/kg bolus",
          },
        },
      ],
      pivotalTrials: [
        {
          id: "act-2022",
          acronym: "AcT",
          title: "AcT Trial",
          year: 2022,
          journal: "Lancet",
          subspecialty: "Stroke",
          evidenceSource: "PEER_REVIEWED_PUBLISHED",
          design: "Phase 3 RCT",
          pico: { population: "AIS", intervention: "TNK", comparator: "Alteplase" },
          primaryEndpoint: { metric: "mRS 0-1", resultStats: "non-inferior", verdict: "NON_INFERIOR" },
          safetyEndpoint: {},
          bottomLine: "Non-inferior",
          ontologyTags: {},
          linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h"],
        },
      ],
      recommendationAtoms: [],
      customRecLabels: {},
    };

    const graph = decomposeNeuroGuideStoreToGraph(store);
    const { blocks, outgoingLinksByBlockUid } = queryBlocksByOverlappingFacets(graph, {
      subspecialties: ["Neurocritical Care"],
      conditionIds: ["cond_ischemic_stroke"],
      domains: ["prevention"],
      citedTrialKeys: ["AcT"],
      blockTypes: ["recommendation"],
    });

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].data.facetIndex.recId, "rec-tnk-multi");
    const links = outgoingLinksByBlockUid.get(blocks[0].uid) ?? [];
    assert.ok(links.some((l) => l.linkType === "cites_trial" && l.evidenceDst === "AcT"));
    assert.ok(links.some((l) => l.linkType === "in_scenario" && l.evidenceDst === "ais-ivt-tenecteplase-4.5h"));
  });
});
