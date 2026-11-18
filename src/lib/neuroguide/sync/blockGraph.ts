/**
 * NeuroGuide 2-Tier Granular Blocks & Merkle Graph Engine (Phase 8).
 *
 * Pure TypeScript, zero `node:*` imports (client & server safe).
 * Models multi-axis overlapping labels (`subspecialties`, `conditionIds`, `domains`,
 * `timeWindowIds`, `interventionTags`, 9-facet `ontologyLabels`), cross-links
 * (`cites_trial`, `in_scenario`, `same_pico`, `same_section`, `refers_to`,
 * `supersedes`, `differs`, `supports_evidence`), shared clinical blocks across
 * N protocols, lossless store decomposition/assembly, and O(log N) Merkle re-hashing
 * with Next.js cache tag invalidation (`block:<uid>`, `protocol:<slug>`).
 */

import type {
  ClinicalScenario,
  ConferenceEvent,
  GuidelineDoc,
  LateBreakingTrial,
  OntologyFacetId,
  PivotalTrialRecord,
  PracticeChangeDetail,
  RecommendationAtom,
  RecommendationLabelOutput,
  SubspecialtyType,
} from "../../../types/neuroguide.ts";
import {
  canonicalizeSyncValue,
  cloneJson,
  computeRootHashFromEntries,
  sha256Hex,
} from "../../sync/jsonPatch.ts";
import { classifyPivotalTrialV3, classifyRecommendationV3 } from "../clinicalNavigatorV3Classifier.ts";
import {
  STROKE_ONTOLOGY,
  autoLabelRecommendationVerbatim,
  computeNormalizedTierFromGrade,
  sanitizeControlChars,
  toLabelerInput,
} from "../ontologyValidator.ts";
import { buildRecommendationRelations, type RelationCandidateNode } from "../relationBuilder.ts";
import type {
  NeuroGuideBlockFacetIndex,
  NeuroGuideBlockLinkEdge,
  NeuroGuideContentBlockData,
  NeuroGuideContentBlockRow,
  NeuroGuideGraphSnapshot,
  NeuroGuideOverlappingFacetFilter,
  NeuroGuideProtocolBlockEdge,
  NeuroGuideProtocolMetadata,
  NeuroGuideProtocolRow,
  NeuroGuideStoreInput,
  SelectiveMerkleUpdateResult,
} from "./types.ts";

const DEFAULT_TS = "2026-01-01T00:00:00.000Z";

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values).map((v) => String(v).trim()).filter(Boolean))).sort();
}

export function normalizeLookupKey(raw?: string | null): string {
  return (raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Generates a deterministic RFC-4122-shaped UUID from SHA-256(namespace:key)
 * so migrations and decompositions produce stable immutable UIDs.
 */
export function deterministicUuidFromKey(namespace: string, key: string): string {
  const hex = sha256Hex(`${namespace}:${key}`);
  const timeLow = hex.slice(0, 8);
  const timeMid = hex.slice(8, 12);
  const timeHi = `4${hex.slice(13, 16)}`;
  const variantNibble = ["8", "9", "a", "b"][parseInt(hex[16], 16) % 4];
  const clockSeq = `${variantNibble}${hex.slice(17, 20)}`;
  const node = hex.slice(20, 32);
  return `${timeLow}-${timeMid}-${timeHi}-${clockSeq}-${node}`;
}

export function computeBlockContentHash(data: Pick<NeuroGuideContentBlockData, "blockType" | "payload" | "facetIndex">): string {
  return sha256Hex(
    JSON.stringify(
      canonicalizeSyncValue(
        {
          blockType: data.blockType,
          payload: data.payload,
          facetIndex: data.facetIndex,
        },
        false
      )
    )
  );
}

export function computeBlockSectionHashes(data: NeuroGuideContentBlockData): Record<string, string> {
  return {
    payload: sha256Hex(JSON.stringify(canonicalizeSyncValue(data.payload, false))),
    facetIndex: sha256Hex(JSON.stringify(canonicalizeSyncValue(data.facetIndex, false))),
    meta: sha256Hex(JSON.stringify({ blockKey: data.blockKey, blockType: data.blockType })),
  };
}

export function computeProtocolMetadataHash(metadata: NeuroGuideProtocolMetadata): string {
  return sha256Hex(JSON.stringify(canonicalizeSyncValue(metadata, false)));
}

export function computeProtocolMerkleHash(
  metadataHash: string,
  orderedLiveBlockHashes: readonly string[]
): string {
  return sha256Hex(`${metadataHash}|${orderedLiveBlockHashes.join("|")}`);
}

export function computeNeuroGuideRootHash(protocols: readonly NeuroGuideProtocolRow[]): string {
  return computeRootHashFromEntries(
    protocols
      .filter((p) => p.deletedAt === null)
      .map((p) => ({
        uid: p.uid,
        rev: p.rev,
        contentHash: p.protocolHash,
      }))
  );
}

function collapseOntologyFacets(
  recLabels?: RecommendationLabelOutput | null
): Partial<Record<OntologyFacetId, string[]>> | null {
  if (!recLabels?.labels) return null;
  const result: Partial<Record<OntologyFacetId, string[]>> = {};
  for (const [facetKey, val] of Object.entries(recLabels.labels)) {
    const facet = facetKey as OntologyFacetId;
    if (Array.isArray(val)) {
      const vals = uniqueSorted(val.map((item) => item.value).filter((v) => v && v !== "unspecified"));
      if (vals.length > 0) result[facet] = vals;
    } else if (val && typeof val === "object" && "value" in val && val.value && val.value !== "unspecified") {
      result[facet] = [val.value];
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function buildRecommendationFacetIndex(
  doc: GuidelineDoc,
  chg: PracticeChangeDetail,
  idx: number,
  customLabel: RecommendationLabelOutput | null
): {
  facetIndex: NeuroGuideBlockFacetIndex;
  relationNode: RelationCandidateNode;
} {
  const inp = toLabelerInput(doc, chg, idx);
  const tier = computeNormalizedTierFromGrade({
    cor: chg.cor,
    loe: chg.loe,
    strength: chg.strength,
    quality: chg.quality,
    currentGrade: chg.currentGrade,
    expertConsensusStatement: chg.expertConsensusStatement,
  });

  const computedLabels = chg.ontologyLabels ?? autoLabelRecommendationVerbatim(inp, STROKE_ONTOLOGY);
  const v3 = chg.v3Labels ?? classifyRecommendationV3(doc, chg, tier);
  const effectiveLabelOut = customLabel ?? computedLabels;

  const citedTrialKeys = uniqueSorted(
    (chg.drivingTrials || []).flatMap((t) => [t.trim(), normalizeLookupKey(t)])
  );
  const linkedScenarioKeys = uniqueSorted([
    ...(chg.scenarioId ? [chg.scenarioId, normalizeLookupKey(chg.scenarioId)] : []),
    ...(doc.linkedScenarioIds || []).flatMap((s) => [s, normalizeLookupKey(s)]),
  ]);

  const facetIndex: NeuroGuideBlockFacetIndex = {
    recId: inp.rec_id,
    subspecialties: uniqueSorted(v3.subspecialties) as SubspecialtyType[],
    conditionIds: uniqueSorted(v3.conditionIds),
    domains: uniqueSorted(v3.domains) as ("diagnosis" | "treatment" | "prevention")[],
    diagnosisTags: uniqueSorted(v3.diagnosisTags),
    timeWindowIds: uniqueSorted(v3.timeWindowIds),
    interventionTags: uniqueSorted(v3.interventionTags),
    direction: v3.direction || "recommended",
    normalizedTier: tier,
    ontologyFacets: collapseOntologyFacets(effectiveLabelOut),
    v3Labels: chg.v3Labels ? cloneJson(chg.v3Labels) : cloneJson(v3),
    customLabel: customLabel ? cloneJson(customLabel) : null,
    citedTrialKeys,
    linkedScenarioKeys,
    picoKey: chg.picoNumber !== undefined ? String(chg.picoNumber) : null,
    sectionPath: inp.section_path || null,
  };

  const relationNode: RelationCandidateNode = {
    recId: inp.rec_id,
    guidelineId: doc.id,
    society: doc.society,
    year: doc.year,
    sectionPath: inp.section_path,
    picoNumber: chg.picoNumber,
    text: inp.text || chg.currentText || "",
    normalizedTier: tier,
    labels: effectiveLabelOut,
  };

  return { facetIndex, relationNode };
}

function buildPivotalTrialFacetIndex(trial: PivotalTrialRecord): NeuroGuideBlockFacetIndex {
  const v3Tags = trial.v3Tags ?? classifyPivotalTrialV3(trial);
  const subspecs = uniqueSorted([trial.subspecialty]) as SubspecialtyType[];
  const verdictDir =
    trial.primaryEndpoint?.verdict === "NEGATIVE"
      ? "harm"
      : trial.primaryEndpoint?.verdict === "NEUTRAL"
      ? "conditional"
      : "recommended";

  return {
    recId: trial.id,
    subspecialties: subspecs,
    conditionIds: uniqueSorted(v3Tags.conditionIds || []),
    domains: uniqueSorted(v3Tags.domains || ["treatment"]) as ("diagnosis" | "treatment" | "prevention")[],
    diagnosisTags: uniqueSorted(v3Tags.diagnosisTags || []),
    timeWindowIds: uniqueSorted(v3Tags.timeWindowIds || []),
    interventionTags: uniqueSorted(v3Tags.interventionTags || []),
    direction: verdictDir,
    ontologyFacets: trial.ontologyTags ? cloneJson(trial.ontologyTags) : null,
    v3Labels: {
      subspecialties: subspecs,
      conditionIds: uniqueSorted(v3Tags.conditionIds || []),
      domains: uniqueSorted(v3Tags.domains || ["treatment"]) as ("diagnosis" | "treatment" | "prevention")[],
      diagnosisTags: uniqueSorted(v3Tags.diagnosisTags || []),
      timeWindowIds: uniqueSorted(v3Tags.timeWindowIds || []),
      interventionTags: uniqueSorted(v3Tags.interventionTags || []),
      direction: verdictDir,
    },
    customLabel: null,
    citedTrialKeys: uniqueSorted([trial.id, normalizeLookupKey(trial.id), normalizeLookupKey(trial.acronym)]),
    linkedScenarioKeys: uniqueSorted(
      (trial.linkedScenarioIds || []).flatMap((s) => [s, normalizeLookupKey(s)])
    ),
    picoKey: null,
    sectionPath: trial.journal || null,
  };
}

function makeBlockRow(
  blockKey: string,
  blockType: NeuroGuideContentBlockData["blockType"],
  payload: NeuroGuideContentBlockData["payload"],
  facetIndex: NeuroGuideBlockFacetIndex,
  seqCounter: { value: number }
): NeuroGuideContentBlockRow {
  const uid = deterministicUuidFromKey("ng-block", blockKey);
  const data: NeuroGuideContentBlockData = {
    blockKey,
    blockType,
    payload: cloneJson(payload),
    facetIndex: cloneJson(facetIndex),
  };
  const contentHash = computeBlockContentHash(data);
  const sectionHashes = computeBlockSectionHashes(data);
  seqCounter.value += 1;

  return {
    uid,
    slug: blockKey,
    blockKey,
    blockType,
    data,
    contentHash,
    sectionHashes,
    rev: 1,
    changeSeq: seqCounter.value,
    updatedAt: DEFAULT_TS,
    updatedBy: "migration-v2",
    deletedAt: null,
  };
}

function buildProtocolRow(params: {
  slug: string;
  protocolType: NeuroGuideProtocolRow["protocolType"];
  society: string;
  year: number;
  title: string;
  status: string;
  subspecialties: SubspecialtyType[];
  metadata: NeuroGuideProtocolMetadata;
  blockOrder: string[];
  orderedBlockHashes: string[];
  seqCounter: { value: number };
}): NeuroGuideProtocolRow {
  const metadataHash = computeProtocolMetadataHash(params.metadata);
  const protocolHash = computeProtocolMerkleHash(metadataHash, params.orderedBlockHashes);
  params.seqCounter.value += 1;

  return {
    uid: deterministicUuidFromKey("ng-protocol", params.slug),
    slug: params.slug,
    protocolType: params.protocolType,
    society: params.society,
    year: params.year,
    title: params.title,
    status: params.status,
    subspecialties: uniqueSorted(params.subspecialties) as SubspecialtyType[],
    metadata: cloneJson(params.metadata),
    blockOrder: [...params.blockOrder],
    metadataHash,
    protocolHash,
    rev: 1,
    changeSeq: params.seqCounter.value,
    updatedAt: DEFAULT_TS,
    updatedBy: "migration-v2",
    deletedAt: null,
  };
}

/**
 * Decomposes legacy multi-tier NeuroGuide payload into a normalized 2-tier Granular
 * Blocks + Merkle Tree + Cross-Link graph with zero information loss.
 */
export function decomposeNeuroGuideStoreToGraph(store: NeuroGuideStoreInput): NeuroGuideGraphSnapshot {
  const seqCounter = { value: 0 };
  const protocols: NeuroGuideProtocolRow[] = [];
  const blockByUid = new Map<string, NeuroGuideContentBlockRow>();
  const protocolBlocks: NeuroGuideProtocolBlockEdge[] = [];
  const blockLinks: NeuroGuideBlockLinkEdge[] = [];

  const trialUidByKey = new Map<string, string>();
  const scenarioUidByKey = new Map<string, string>();
  const recUidByRecId = new Map<string, string[]>();
  const matchedCustomLabelKeys = new Set<string>();
  const relationCandidates: RelationCandidateNode[] = [];
  const candidateBlockUidByRecKey = new Map<string, string>();

  // 1. Catalog Clinical Scenarios (created early so downstream blocks link to scenario UIDs)
  const scenarioCatalogOrder: string[] = [];
  const scenarioCatalogHashes: string[] = [];
  const scenarioCatalogUid = deterministicUuidFromKey("ng-protocol", "catalog-clinical-scenarios");

  for (let idx = 0; idx < (store.scenarios || []).length; idx++) {
    const scenario = store.scenarios[idx];
    const blockKey = `scenario:${scenario.id}`;
    const facetIndex: NeuroGuideBlockFacetIndex = {
      recId: scenario.id,
      subspecialties: [scenario.subspecialty],
      conditionIds: [],
      domains: ["treatment"],
      diagnosisTags: [],
      timeWindowIds: [],
      interventionTags: [],
      direction: "recommended",
      ontologyFacets: null,
      v3Labels: null,
      customLabel: null,
      citedTrialKeys: [],
      linkedScenarioKeys: [scenario.id, normalizeLookupKey(scenario.id)],
      picoKey: null,
      sectionPath: scenario.title,
    };
    const row = makeBlockRow(blockKey, "clinical_scenario", { kind: "clinical_scenario", scenario }, facetIndex, seqCounter);
    blockByUid.set(row.uid, row);
    scenarioUidByKey.set(scenario.id.toLowerCase(), row.uid);
    scenarioUidByKey.set(normalizeLookupKey(scenario.id), row.uid);

    scenarioCatalogOrder.push(row.uid);
    scenarioCatalogHashes.push(row.contentHash);
    protocolBlocks.push({
      protocolUid: scenarioCatalogUid,
      blockUid: row.uid,
      position: idx,
      sectionPath: scenario.title,
      role: "scenario",
    });
  }

  // 2. Catalog Pivotal Trials (registry + custom)
  const trialCatalogOrder: string[] = [];
  const trialCatalogHashes: string[] = [];
  const trialCatalogUid = deterministicUuidFromKey("ng-protocol", "catalog-pivotal-trials");

  for (let idx = 0; idx < (store.pivotalTrials || []).length; idx++) {
    const trial = store.pivotalTrials![idx];
    const blockKey = `trial:${trial.id}`;
    const facetIndex = buildPivotalTrialFacetIndex(trial);
    const row = makeBlockRow(blockKey, "pivotal_trial", { kind: "pivotal_trial", trial }, facetIndex, seqCounter);
    blockByUid.set(row.uid, row);

    for (const k of [
      trial.id.toLowerCase(),
      normalizeLookupKey(trial.id),
      trial.acronym.toLowerCase(),
      normalizeLookupKey(trial.acronym),
      normalizeLookupKey(`${trial.acronym}${trial.year}`),
    ]) {
      if (k) trialUidByKey.set(k, row.uid);
    }

    trialCatalogOrder.push(row.uid);
    trialCatalogHashes.push(row.contentHash);
    protocolBlocks.push({
      protocolUid: trialCatalogUid,
      blockUid: row.uid,
      position: idx,
      sectionPath: `${trial.acronym} (${trial.year})`,
      role: "trial",
    });

    for (const scenId of trial.linkedScenarioIds || []) {
      const dstUid = scenarioUidByKey.get(scenId.toLowerCase()) ?? scenarioUidByKey.get(normalizeLookupKey(scenId));
      if (dstUid) {
        blockLinks.push({
          srcBlockUid: row.uid,
          dstBlockUid: dstUid,
          linkType: "in_scenario",
          origin: "rule",
          status: "approved",
          evidenceSrc: trial.acronym,
          evidenceDst: scenId,
        });
      }
    }
  }

  // 3. Conference Protocols & Late-Breaking Trials
  for (const conf of store.conferences || []) {
    const { lateBreakingTrials, ...confMeta } = conf;
    const protocolSlug = `conf:${conf.id}`;
    const protocolUid = deterministicUuidFromKey("ng-protocol", protocolSlug);
    const blockOrder: string[] = [];
    const blockHashes: string[] = [];

    const lbtList = Array.isArray(lateBreakingTrials) ? lateBreakingTrials : [];
    for (let idx = 0; idx < lbtList.length; idx++) {
      const lbt = lbtList[idx];
      const blockKey = `lbt:${conf.id}:${idx}:${lbt.id}`;
      const facetIndex: NeuroGuideBlockFacetIndex = {
        recId: lbt.id,
        subspecialties: [lbt.subspecialty],
        conditionIds: [],
        domains: ["treatment"],
        diagnosisTags: [],
        timeWindowIds: [],
        interventionTags: [],
        direction:
          lbt.verdict === "NEGATIVE"
            ? "harm"
            : lbt.verdict === "NEUTRAL"
            ? "conditional"
            : "recommended",
        ontologyFacets: null,
        v3Labels: null,
        customLabel: null,
        citedTrialKeys: uniqueSorted([lbt.id, lbt.trialAcronym, normalizeLookupKey(lbt.trialAcronym)]),
        linkedScenarioKeys: lbt.impactedScenarioId ? [lbt.impactedScenarioId] : [],
        picoKey: null,
        sectionPath: lbt.trialAcronym,
      };
      const row = makeBlockRow(
        blockKey,
        "late_breaking_trial",
        { kind: "late_breaking_trial", trial: lbt, conferenceId: conf.id },
        facetIndex,
        seqCounter
      );
      blockByUid.set(row.uid, row);
      blockOrder.push(row.uid);
      blockHashes.push(row.contentHash);
      protocolBlocks.push({
        protocolUid,
        blockUid: row.uid,
        position: idx,
        sectionPath: lbt.trialAcronym,
        role: "trial",
      });

      const canonicalTrialUid =
        trialUidByKey.get(normalizeLookupKey(lbt.trialAcronym)) ??
        trialUidByKey.get(normalizeLookupKey(lbt.id));
      if (canonicalTrialUid && canonicalTrialUid !== row.uid) {
        blockLinks.push({
          srcBlockUid: row.uid,
          dstBlockUid: canonicalTrialUid,
          linkType: "supports_evidence",
          origin: "rule",
          status: "approved",
          evidenceSrc: lbt.trialAcronym,
          evidenceDst: conf.acronym,
        });
      }
      if (lbt.impactedScenarioId) {
        const scenUid =
          scenarioUidByKey.get(lbt.impactedScenarioId.toLowerCase()) ??
          scenarioUidByKey.get(normalizeLookupKey(lbt.impactedScenarioId));
        if (scenUid) {
          blockLinks.push({
            srcBlockUid: row.uid,
            dstBlockUid: scenUid,
            linkType: "in_scenario",
            origin: "rule",
            status: "approved",
            evidenceSrc: lbt.trialAcronym,
            evidenceDst: lbt.impactedScenarioId,
          });
        }
      }
    }

    protocols.push(
      buildProtocolRow({
        slug: protocolSlug,
        protocolType: "conference",
        society: conf.acronym,
        year: conf.year,
        title: conf.name,
        status: conf.status,
        subspecialties: conf.subspecialties,
        metadata: { kind: "conference", conference: confMeta },
        blockOrder,
        orderedBlockHashes: blockHashes,
        seqCounter,
      })
    );
  }

  // 4. Guideline Protocols & Granular / Shared Recommendation Blocks
  for (const doc of store.guidelines || []) {
    const { allPracticeChanges, ...docMeta } = doc;
    const protocolSlug = doc.id;
    const protocolUid = deterministicUuidFromKey("ng-protocol", protocolSlug);
    const blockOrder: string[] = [];
    const blockHashes: string[] = [];

    const changes = Array.isArray(allPracticeChanges) ? allPracticeChanges : [];
    for (let idx = 0; idx < changes.length; idx++) {
      const chg = changes[idx];
      const inp = toLabelerInput(doc, chg, idx);
      const customLabel = store.customRecLabels?.[inp.rec_id] ?? null;
      if (customLabel) {
        matchedCustomLabelKeys.add(inp.rec_id);
      }

      const isShared = Boolean(chg.sharedBlockKey && chg.sharedBlockKey.trim());
      const blockKey = isShared
        ? chg.sharedBlockKey!.trim()
        : `rec:${doc.id}:${idx}:${chg.id || `slot-${idx}`}`;
      const blockUid = deterministicUuidFromKey("ng-block", blockKey);

      const { facetIndex, relationNode } = buildRecommendationFacetIndex(doc, chg, idx, customLabel);
      let blockRow = blockByUid.get(blockUid);

      if (!blockRow) {
        blockRow = makeBlockRow(
          blockKey,
          isShared ? "shared_clinical_block" : "recommendation",
          {
            kind: isShared ? "shared_clinical_block" : "recommendation",
            practiceChange: chg,
          },
          facetIndex,
          seqCounter
        );
        blockByUid.set(blockUid, blockRow);
      } else {
        // Shared clinical block referenced across multiple guidelines merges multi-axis facet tags
        const mergedFacet: NeuroGuideBlockFacetIndex = {
          ...blockRow.data.facetIndex,
          subspecialties: uniqueSorted([
            ...blockRow.data.facetIndex.subspecialties,
            ...facetIndex.subspecialties,
          ]) as SubspecialtyType[],
          conditionIds: uniqueSorted([
            ...blockRow.data.facetIndex.conditionIds,
            ...facetIndex.conditionIds,
          ]),
          domains: uniqueSorted([
            ...blockRow.data.facetIndex.domains,
            ...facetIndex.domains,
          ]) as ("diagnosis" | "treatment" | "prevention")[],
          diagnosisTags: uniqueSorted([
            ...blockRow.data.facetIndex.diagnosisTags,
            ...facetIndex.diagnosisTags,
          ]),
          timeWindowIds: uniqueSorted([
            ...blockRow.data.facetIndex.timeWindowIds,
            ...facetIndex.timeWindowIds,
          ]),
          interventionTags: uniqueSorted([
            ...blockRow.data.facetIndex.interventionTags,
            ...facetIndex.interventionTags,
          ]),
          citedTrialKeys: uniqueSorted([
            ...blockRow.data.facetIndex.citedTrialKeys,
            ...facetIndex.citedTrialKeys,
          ]),
          linkedScenarioKeys: uniqueSorted([
            ...blockRow.data.facetIndex.linkedScenarioKeys,
            ...facetIndex.linkedScenarioKeys,
          ]),
        };
        blockRow.data = {
          ...blockRow.data,
          facetIndex: mergedFacet,
        };
        blockRow.contentHash = computeBlockContentHash(blockRow.data);
        blockRow.sectionHashes = computeBlockSectionHashes(blockRow.data);
      }

      blockOrder.push(blockRow.uid);
      blockHashes.push(blockRow.contentHash);
      protocolBlocks.push({
        protocolUid,
        blockUid: blockRow.uid,
        position: idx,
        sectionPath: facetIndex.sectionPath || chg.topic || doc.title,
        role: isShared ? "shared" : "recommendation",
      });

      const list = recUidByRecId.get(inp.rec_id) ?? [];
      list.push(blockRow.uid);
      recUidByRecId.set(inp.rec_id, list);

      const relKey = `${doc.id}::${idx}::${inp.rec_id}`;
      const scopedRelNode: RelationCandidateNode = {
        ...relationNode,
        recId: relKey,
      };
      relationCandidates.push(scopedRelNode);
      candidateBlockUidByRecKey.set(relKey, blockRow.uid);

      // Link cited trials & clinical scenarios
      for (const trialName of chg.drivingTrials || []) {
        const trialUid =
          trialUidByKey.get(trialName.toLowerCase().trim()) ??
          trialUidByKey.get(normalizeLookupKey(trialName));
        if (trialUid) {
          blockLinks.push({
            srcBlockUid: blockRow.uid,
            dstBlockUid: trialUid,
            linkType: "cites_trial",
            origin: "rule",
            status: "approved",
            evidenceSrc: inp.rec_id,
            evidenceDst: trialName,
          });
        }
      }

      if (chg.scenarioId) {
        const scenUid =
          scenarioUidByKey.get(chg.scenarioId.toLowerCase()) ??
          scenarioUidByKey.get(normalizeLookupKey(chg.scenarioId));
        if (scenUid) {
          blockLinks.push({
            srcBlockUid: blockRow.uid,
            dstBlockUid: scenUid,
            linkType: "in_scenario",
            origin: "rule",
            status: "approved",
            evidenceSrc: inp.rec_id,
            evidenceDst: chg.scenarioId,
          });
        }
      }
    }

    const docSubspecs =
      doc.subspecialties && doc.subspecialties.length > 0
        ? doc.subspecialties
        : [doc.subspecialty];

    protocols.push(
      buildProtocolRow({
        slug: protocolSlug,
        protocolType: "guideline",
        society: doc.society,
        year: doc.year,
        title: doc.title,
        status: doc.status || "approved",
        subspecialties: docSubspecs,
        metadata: { kind: "guideline", doc: docMeta },
        blockOrder,
        orderedBlockHashes: blockHashes,
        seqCounter,
      })
    );
  }

  // 5. Catalog Recommendation Atoms & System Metadata (orphan customRecLabels / tombstones)
  const atomCatalogOrder: string[] = [];
  const atomCatalogHashes: string[] = [];
  const atomCatalogUid = deterministicUuidFromKey("ng-protocol", "catalog-recommendation-atoms");
  const atoms = store.recommendationAtoms || [];

  for (let idx = 0; idx < atoms.length; idx++) {
    const atom = atoms[idx];
    const blockKey = `atom:${atom.id}`;
    const facetIndex: NeuroGuideBlockFacetIndex = {
      recId: atom.id,
      subspecialties: ["Stroke"],
      conditionIds: [],
      domains: ["treatment"],
      diagnosisTags: [],
      timeWindowIds: [],
      interventionTags: [],
      direction: "recommended",
      normalizedTier: atom.normalizedTier,
      ontologyFacets: null,
      v3Labels: null,
      customLabel: null,
      citedTrialKeys: uniqueSorted(
        (atom.citedTrials || []).flatMap((t) => [t, normalizeLookupKey(t)])
      ),
      linkedScenarioKeys: atom.scenarioId ? [atom.scenarioId, normalizeLookupKey(atom.scenarioId)] : [],
      picoKey: null,
      sectionPath: atom.guidelineDocId,
    };
    const row = makeBlockRow(blockKey, "recommendation_atom", { kind: "recommendation_atom", atom }, facetIndex, seqCounter);
    blockByUid.set(row.uid, row);
    atomCatalogOrder.push(row.uid);
    atomCatalogHashes.push(row.contentHash);
    protocolBlocks.push({
      protocolUid: atomCatalogUid,
      blockUid: row.uid,
      position: idx,
      sectionPath: atom.scenarioId,
      role: "atom",
    });

    const scenUid =
      scenarioUidByKey.get(atom.scenarioId.toLowerCase()) ??
      scenarioUidByKey.get(normalizeLookupKey(atom.scenarioId));
    if (scenUid) {
      blockLinks.push({
        srcBlockUid: row.uid,
        dstBlockUid: scenUid,
        linkType: "in_scenario",
        origin: "rule",
        status: "approved",
        evidenceSrc: atom.id,
        evidenceDst: atom.scenarioId,
      });
    }
    for (const tName of atom.citedTrials || []) {
      const trialUid =
        trialUidByKey.get(tName.toLowerCase()) ?? trialUidByKey.get(normalizeLookupKey(tName));
      if (trialUid) {
        blockLinks.push({
          srcBlockUid: row.uid,
          dstBlockUid: trialUid,
          linkType: "cites_trial",
          origin: "rule",
          status: "approved",
          evidenceSrc: atom.id,
          evidenceDst: tName,
        });
      }
    }
  }

  // 6. Cross-recommendation relations (`same_pico`, `same_section`, `refers_to`, `supersedes`, `differs`)
  const recRelations = buildRecommendationRelations(relationCandidates);
  for (const rel of recRelations) {
    const srcUid = candidateBlockUidByRecKey.get(rel.src_rec_id);
    const dstUid = candidateBlockUidByRecKey.get(rel.dst_rec_id);
    if (srcUid && dstUid && srcUid !== dstUid) {
      blockLinks.push({
        srcBlockUid: srcUid,
        dstBlockUid: dstUid,
        linkType: rel.type,
        origin: rel.origin,
        status: rel.status,
        evidenceSrc: rel.evidence_src,
        evidenceDst: rel.evidence_dst,
      });
    }
  }

  // Deduplicate blockLinks cleanly
  const dedupedLinks: NeuroGuideBlockLinkEdge[] = [];
  const seenLinkKeys = new Set<string>();
  for (const edge of blockLinks) {
    const key = `${edge.srcBlockUid}::${edge.dstBlockUid}::${edge.linkType}`;
    if (!seenLinkKeys.has(key)) {
      seenLinkKeys.add(key);
      dedupedLinks.push(edge);
    }
  }

  // Register catalog protocols
  protocols.push(
    buildProtocolRow({
      slug: "catalog-clinical-scenarios",
      protocolType: "scenario_catalog",
      society: "NeuroGuide",
      year: 2026,
      title: "Clinical Scenarios Catalog",
      status: "approved",
      subspecialties: ["Stroke"],
      metadata: { kind: "scenario_catalog", catalogKind: "clinical_scenarios" },
      blockOrder: scenarioCatalogOrder,
      orderedBlockHashes: scenarioCatalogHashes,
      seqCounter,
    }),
    buildProtocolRow({
      slug: "catalog-pivotal-trials",
      protocolType: "scenario_catalog",
      society: "NeuroGuide",
      year: 2026,
      title: "Pivotal Trials Registry",
      status: "approved",
      subspecialties: ["Stroke"],
      metadata: { kind: "scenario_catalog", catalogKind: "pivotal_trials" },
      blockOrder: trialCatalogOrder,
      orderedBlockHashes: trialCatalogHashes,
      seqCounter,
    }),
    buildProtocolRow({
      slug: "catalog-recommendation-atoms",
      protocolType: "scenario_catalog",
      society: "NeuroGuide",
      year: 2026,
      title: "Recommendation Atoms Catalog",
      status: "approved",
      subspecialties: ["Stroke"],
      metadata: { kind: "scenario_catalog", catalogKind: "recommendation_atoms" },
      blockOrder: atomCatalogOrder,
      orderedBlockHashes: atomCatalogHashes,
      seqCounter,
    })
  );

  const orphanCustomRecLabels: Record<string, RecommendationLabelOutput> = {};
  for (const [k, v] of Object.entries(store.customRecLabels || {})) {
    if (!matchedCustomLabelKeys.has(k)) {
      orphanCustomRecLabels[k] = v;
    }
  }
  if (
    Object.keys(orphanCustomRecLabels).length > 0 ||
    (store.deletedGuidelineIds && store.deletedGuidelineIds.length > 0) ||
    (store.deletedTrialIds && store.deletedTrialIds.length > 0)
  ) {
    protocols.push(
      buildProtocolRow({
        slug: "catalog-system-meta",
        protocolType: "scenario_catalog",
        society: "NeuroGuide",
        year: 2026,
        title: "NeuroGuide Sync System Metadata",
        status: "system",
        subspecialties: ["Stroke"],
        metadata: {
          kind: "scenario_catalog",
          catalogKind: "system_meta",
          deletedGuidelineIds: cloneJson(store.deletedGuidelineIds || []),
          deletedTrialIds: cloneJson(store.deletedTrialIds || []),
          orphanCustomRecLabels,
        },
        blockOrder: [],
        orderedBlockHashes: [],
        seqCounter,
      })
    );
  }

  const rootHash = computeNeuroGuideRootHash(protocols);

  return {
    protocols,
    blocks: Array.from(blockByUid.values()),
    protocolBlocks,
    blockLinks: dedupedLinks,
    rootHash,
  };
}

/**
 * Reconstructs the NeuroGuide store views losslessly from a normalized Granular Block Graph.
 */
export function assembleNeuroGuideStoreFromGraph(
  graph: NeuroGuideGraphSnapshot
): NeuroGuideStoreInput {
  const blocksByUid = new Map<string, NeuroGuideContentBlockRow>();
  for (const block of graph.blocks) {
    if (block.deletedAt === null) {
      blocksByUid.set(block.uid, block);
    }
  }

  const edgesByProtocol = new Map<string, NeuroGuideProtocolBlockEdge[]>();
  for (const edge of graph.protocolBlocks) {
    const arr = edgesByProtocol.get(edge.protocolUid) ?? [];
    arr.push(edge);
    edgesByProtocol.set(edge.protocolUid, arr);
  }
  for (const arr of edgesByProtocol.values()) {
    arr.sort((a, b) => a.position - b.position);
  }

  const guidelines: GuidelineDoc[] = [];
  const conferences: ConferenceEvent[] = [];
  const scenarios: ClinicalScenario[] = [];
  const pivotalTrials: PivotalTrialRecord[] = [];
  const recommendationAtoms: RecommendationAtom[] = [];
  const customRecLabels: Record<string, RecommendationLabelOutput> = {};
  let deletedGuidelineIds: string[] = [];
  let deletedTrialIds: string[] = [];

  for (const proto of graph.protocols) {
    if (proto.deletedAt !== null) continue;

    const orderedEdges = edgesByProtocol.get(proto.uid) ?? [];
    const orderedUids =
      orderedEdges.length > 0
        ? orderedEdges.map((e) => e.blockUid)
        : proto.blockOrder;

    if (proto.metadata.kind === "guideline") {
      const allPracticeChanges: PracticeChangeDetail[] = [];
      for (const bUid of orderedUids) {
        const b = blocksByUid.get(bUid);
        if (!b) continue;
        if (b.data.payload.kind === "recommendation" || b.data.payload.kind === "shared_clinical_block") {
          allPracticeChanges.push(cloneJson(b.data.payload.practiceChange));
          if (b.data.facetIndex.recId && b.data.facetIndex.customLabel) {
            customRecLabels[b.data.facetIndex.recId] = cloneJson(b.data.facetIndex.customLabel);
          }
        }
      }
      guidelines.push({
        ...cloneJson(proto.metadata.doc),
        allPracticeChanges,
      });
    } else if (proto.metadata.kind === "conference") {
      const lateBreakingTrials: LateBreakingTrial[] = [];
      for (const bUid of orderedUids) {
        const b = blocksByUid.get(bUid);
        if (b && b.data.payload.kind === "late_breaking_trial") {
          lateBreakingTrials.push(cloneJson(b.data.payload.trial));
        }
      }
      conferences.push({
        ...cloneJson(proto.metadata.conference),
        lateBreakingTrials,
      });
    } else if (proto.metadata.kind === "scenario_catalog") {
      if (proto.metadata.catalogKind === "clinical_scenarios") {
        for (const bUid of orderedUids) {
          const b = blocksByUid.get(bUid);
          if (b && b.data.payload.kind === "clinical_scenario") {
            scenarios.push(cloneJson(b.data.payload.scenario));
          }
        }
      } else if (proto.metadata.catalogKind === "pivotal_trials") {
        for (const bUid of orderedUids) {
          const b = blocksByUid.get(bUid);
          if (b && b.data.payload.kind === "pivotal_trial") {
            pivotalTrials.push(cloneJson(b.data.payload.trial));
          }
        }
      } else if (proto.metadata.catalogKind === "recommendation_atoms") {
        for (const bUid of orderedUids) {
          const b = blocksByUid.get(bUid);
          if (b && b.data.payload.kind === "recommendation_atom") {
            recommendationAtoms.push(cloneJson(b.data.payload.atom));
          }
        }
      } else if (proto.metadata.catalogKind === "system_meta") {
        deletedGuidelineIds = cloneJson(proto.metadata.deletedGuidelineIds || []);
        deletedTrialIds = cloneJson(proto.metadata.deletedTrialIds || []);
        Object.assign(customRecLabels, cloneJson(proto.metadata.orphanCustomRecLabels || {}));
      }
    }
  }

  return {
    guidelines,
    conferences,
    scenarios,
    recommendationAtoms,
    pivotalTrials,
    customRecLabels,
    deletedGuidelineIds,
    deletedTrialIds,
  };
}

/**
 * O(log N) selective Merkle re-hashing when a single content block (or shared block)
 * changes. Updates ONLY protocols referencing `changedBlockUid`, recomputes rootHash,
 * and returns exact cache invalidation tags (`block:<uid>`, `protocol:<slug>`).
 */
export function recomputeAffectedProtocolsForBlock(
  graph: NeuroGuideGraphSnapshot,
  changedBlockUid: string,
  options?: { bumpBlockRev?: boolean; bumpProtocolRev?: boolean }
): SelectiveMerkleUpdateResult {
  const blocksByUid = new Map<string, NeuroGuideContentBlockRow>();
  for (const b of graph.blocks) {
    blocksByUid.set(b.uid, b);
  }

  const targetBlock = blocksByUid.get(changedBlockUid);
  if (!targetBlock) {
    throw new Error(`Block UID not found in graph: ${changedBlockUid}`);
  }

  const nextContentHash = computeBlockContentHash(targetBlock.data);
  targetBlock.contentHash = nextContentHash;
  targetBlock.sectionHashes = computeBlockSectionHashes(targetBlock.data);
  if (options?.bumpBlockRev) {
    targetBlock.rev += 1;
  }

  const affectedProtocolUidsSet = new Set<string>();
  for (const edge of graph.protocolBlocks) {
    if (edge.blockUid === changedBlockUid) {
      affectedProtocolUidsSet.add(edge.protocolUid);
    }
  }
  for (const proto of graph.protocols) {
    if (proto.blockOrder.includes(changedBlockUid)) {
      affectedProtocolUidsSet.add(proto.uid);
    }
  }

  const updatedProtocolUids: string[] = [];
  const affectedProtocolSlugs: string[] = [];
  const unchangedProtocolUids: string[] = [];

  for (const proto of graph.protocols) {
    if (!affectedProtocolUidsSet.has(proto.uid)) {
      unchangedProtocolUids.push(proto.uid);
      continue;
    }

    const orderedLiveHashes: string[] = [];
    for (const bUid of proto.blockOrder) {
      const b = blocksByUid.get(bUid);
      if (b && b.deletedAt === null) {
        orderedLiveHashes.push(b.contentHash);
      }
    }

    proto.protocolHash = computeProtocolMerkleHash(proto.metadataHash, orderedLiveHashes);
    if (options?.bumpProtocolRev) {
      proto.rev += 1;
    }
    updatedProtocolUids.push(proto.uid);
    affectedProtocolSlugs.push(proto.slug);
  }

  const nextRootHash = computeNeuroGuideRootHash(graph.protocols);
  graph.rootHash = nextRootHash;

  const sortedSlugs = [...affectedProtocolSlugs].sort();
  return {
    updatedBlockUid: changedBlockUid,
    updatedContentHash: nextContentHash,
    updatedProtocolUids,
    affectedProtocolSlugs: sortedSlugs,
    unchangedProtocolUids,
    rootHash: nextRootHash,
    cacheTagsToInvalidate: [
      `block:${changedBlockUid}`,
      ...sortedSlugs.map((slug) => `protocol:${slug}`),
    ],
  };
}

function hasAnyOverlap(haystack: readonly string[], needles: readonly string[]): boolean {
  if (needles.length === 0) return true;
  const set = new Set(haystack.map((v) => v.toLowerCase()));
  return needles.some((n) => set.has(n.toLowerCase()));
}

/**
 * Queries normalized content blocks across overlapping multi-axis labels
 * (`subspecialties`, `conditionIds`, `domains`, `timeWindowIds`, `interventionTags`,
 * `citedTrialKeys`, `directions`) and returns matching blocks plus outgoing cross-links.
 */
export function queryBlocksByOverlappingFacets(
  graph: NeuroGuideGraphSnapshot,
  filter: NeuroGuideOverlappingFacetFilter
): {
  blocks: NeuroGuideContentBlockRow[];
  outgoingLinksByBlockUid: ReadonlyMap<string, NeuroGuideBlockLinkEdge[]>;
} {
  const allowedBlockTypes =
    filter.blockTypes && filter.blockTypes.length > 0 ? new Set(filter.blockTypes) : null;

  const normalizedTrialNeedles = (filter.citedTrialKeys || []).map((t) => normalizeLookupKey(t));

  const matched = graph.blocks.filter((row) => {
    if (row.deletedAt !== null) return false;
    if (allowedBlockTypes && !allowedBlockTypes.has(row.blockType)) return false;

    const f = row.data.facetIndex;
    if (filter.subspecialties?.length && !hasAnyOverlap(f.subspecialties, filter.subspecialties)) {
      return false;
    }
    if (filter.conditionIds?.length && !hasAnyOverlap(f.conditionIds, filter.conditionIds)) {
      return false;
    }
    if (filter.domains?.length && !hasAnyOverlap(f.domains, filter.domains)) {
      return false;
    }
    if (filter.timeWindowIds?.length && !hasAnyOverlap(f.timeWindowIds, filter.timeWindowIds)) {
      return false;
    }
    if (filter.interventionTags?.length && !hasAnyOverlap(f.interventionTags, filter.interventionTags)) {
      return false;
    }
    if (filter.directions?.length && !filter.directions.includes(f.direction)) {
      return false;
    }
    if (
      normalizedTrialNeedles.length > 0 &&
      !hasAnyOverlap(f.citedTrialKeys.map(normalizeLookupKey), normalizedTrialNeedles)
    ) {
      return false;
    }

    return true;
  });

  const matchedUids = new Set(matched.map((m) => m.uid));
  const outgoingLinksByBlockUid = new Map<string, NeuroGuideBlockLinkEdge[]>();
  for (const edge of graph.blockLinks) {
    if (!matchedUids.has(edge.srcBlockUid)) continue;
    const list = outgoingLinksByBlockUid.get(edge.srcBlockUid) ?? [];
    list.push(edge);
    outgoingLinksByBlockUid.set(edge.srcBlockUid, list);
  }

  return { blocks: matched, outgoingLinksByBlockUid };
}

export function sanitizeGraphLabelText(raw?: string | null): string {
  return sanitizeControlChars(raw);
}
