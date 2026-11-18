import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeProtocolMetadataHash } from "../src/lib/neuroguide/sync/blockGraph.ts";
import { RepoError } from "../src/lib/neuroguide/sync/repo.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import {
  formatNeuroGuideSyncETag,
  handleCreateBlock,
  handleDeleteBlock,
  handleDeleteProtocol,
  handleGetBlockHistory,
  handleGetBlockLinks,
  handleGetChanges,
  handleListProtocols,
  handlePurgeNeuroGuide,
  handleQueryBlocksByFacets,
  handleReplaceBlockLinks,
  handleRestoreBlockRevision,
  handleUpdateBlock,
  handleUpsertProtocol,
} from "../src/lib/neuroguide/sync/handlers.ts";

function buildValidBlock(blockKey, overrides = {}) {
  const blockType = overrides.blockType ?? "recommendation";
  return {
    blockKey,
    blockType,
    ...(overrides.topStatus ? { status: overrides.topStatus } : {}),
    ...(overrides.topVerification ? { verification: overrides.topVerification } : {}),
    payload: {
      kind: blockType === "shared_clinical_block" ? "shared_clinical_block" : "recommendation",
      practiceChange: {
        id: blockKey,
        topic: overrides.topic ?? "AIS Thrombolysis",
        currentText: overrides.text ?? `Clinical recommendation for ${blockKey}`,
        cor: "Class I",
        loe: "Level A",
        status: overrides.status ?? "draft",
        ...(overrides.verification !== undefined ? { verification: overrides.verification } : {}),
      },
    },
    facetIndex: {
      recId: blockKey,
      subspecialties: overrides.subspecialties ?? ["Stroke"],
      conditionIds: overrides.conditionIds ?? ["ais"],
      domains: ["treatment"],
      diagnosisTags: overrides.conditionIds ?? ["ais"],
      timeWindowIds: overrides.timeWindowIds ?? ["0-4.5h"],
      interventionTags: overrides.interventionTags ?? ["iv_thrombolysis"],
      direction: "recommended",
      normalizedTier: 1,
      ontologyFacets: null,
      v3Labels: null,
      customLabel: null,
      citedTrialKeys: overrides.citedTrialKeys ?? ["ECASS III", "ecassiii"],
      linkedScenarioKeys: [],
      picoKey: null,
      sectionPath: "3.1",
    },
  };
}

describe("Phase 8.4 — NeuroGuide Sync v2 HTTP Handlers (§4, O(log N) Tag Invalidation)", () => {
  it("AC8.4.1: rejects all mutations and admin history/links/purge with 401 when isAdmin=false", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const deps = { repo, isAdmin: false };
    const sample = buildValidBlock("unauth-rec");

    const responses = await Promise.all([
      handleCreateBlock(deps, { data: sample }),
      handleUpdateBlock(deps, "uid-1", { data: sample, expectedRev: 1 }),
      handleDeleteBlock(deps, "uid-1", { expectedRevParam: "1" }),
      handleGetBlockHistory(deps, "uid-1"),
      handleRestoreBlockRevision(deps, "uid-1", { revisionRev: 1, expectedRev: 2 }),
      handleUpsertProtocol(deps, {
        slug: "unauth-proto",
        protocolType: "guideline",
        metadata: { kind: "guideline", doc: { id: "unauth-proto" } },
        blockOrder: [],
      }),
      handleDeleteProtocol(deps, "uid-proto-1", { expectedRevParam: "1" }),
      handleReplaceBlockLinks(deps, {
        links: [{ srcBlockUid: "a", dstBlockUid: "b", linkType: "differs" }],
      }),
      handlePurgeNeuroGuide(deps),
    ]);

    for (const res of responses) {
      assert.equal(res.status, 401);
      assert.equal(res.headers["Cache-Control"], "no-store");
      assert.equal(res.body.code, "UNAUTHORIZED");
    }
  });

  it("AC8.4.2: GET /changes supports tier=blocks/protocols/graph, ETag 304 fast-path, bad param 400, paging, and purgeHorizon reset", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const adminDeps = { repo, isAdmin: true, actor: "dr-admin" };

    assert.equal((await handleGetChanges({ repo }, { sinceParam: "-1" })).status, 400);
    assert.equal((await handleGetChanges({ repo }, { limitParam: "501" })).status, 400);
    assert.equal((await handleGetChanges({ repo }, { tierParam: "bad" })).status, 400);

    const c1 = await handleCreateBlock(adminDeps, { data: buildValidBlock("rec-1") });
    const c2 = await handleCreateBlock(adminDeps, { data: buildValidBlock("rec-2") });
    await handleCreateBlock(adminDeps, { data: buildValidBlock("rec-3") });
    assert.equal(c1.status, 201);
    assert.equal(c2.status, 201);

    const pMeta = { kind: "guideline", doc: { id: "g-1" } };
    const p1 = await handleUpsertProtocol(adminDeps, {
      slug: "g-1",
      protocolType: "guideline",
      society: "AHA",
      year: 2026,
      title: "G1",
      subspecialties: ["Stroke"],
      metadata: pMeta,
      metadataHash: computeProtocolMetadataHash(pMeta),
      blockOrder: [c1.body.row.uid, c2.body.row.uid],
    });
    assert.equal(p1.status, 200);

    // Paging limit=2 over 3 blocks
    const page1 = await handleGetChanges(
      { repo },
      { sinceParam: 0, limitParam: 2, tierParam: "blocks" }
    );
    assert.equal(page1.status, 200);
    assert.equal(page1.headers["Cache-Control"], "no-store");
    assert.equal(page1.body.changes.length, 2);
    assert.equal(page1.body.hasMore, true);
    assert.equal(page1.body.reset, false);
    assert.equal(
      page1.headers.ETag,
      formatNeuroGuideSyncETag(page1.body.maxSeq, page1.body.rootHash, "blocks")
    );

    // Tier=graph with includeLinks=1
    await handleReplaceBlockLinks(adminDeps, {
      links: [
        {
          srcBlockUid: c1.body.row.uid,
          dstBlockUid: c2.body.row.uid,
          linkType: "same_section",
          origin: "rule",
          status: "approved",
        },
      ],
    });
    const graphRes = await handleGetChanges(
      { repo },
      { sinceParam: 0, limitParam: 100, tierParam: "graph", includeLinksParam: "1" }
    );
    assert.equal(graphRes.status, 200);
    assert.equal(graphRes.body.changes.length, 3);
    assert.equal(graphRes.body.protocolChanges.length, 1);
    assert.equal(graphRes.body.blockLinks.length, 1);
    assert.equal(graphRes.body.hasMore, false);

    // Tier=protocols
    const protosOnly = await handleGetChanges(
      { repo },
      { sinceParam: 0, limitParam: 10, tierParam: "protocols" }
    );
    assert.equal(protosOnly.status, 200);
    assert.equal(protosOnly.body.changes.length, 1);

    // ETag 304 fast-path without calling changesSince/protocolChangesSince
    let scannedRows = false;
    const fastPathRepo = {
      async getSyncState() {
        return { maxSeq: 9, purgeHorizonSeq: 2, rootHash: "hash-ng-9" };
      },
      async changesSince() {
        scannedRows = true;
        throw new Error("should not scan changesSince on 304");
      },
      async protocolChangesSince() {
        scannedRows = true;
        throw new Error("should not scan protocolChangesSince on 304");
      },
    };
    const fastETag = formatNeuroGuideSyncETag(9, "hash-ng-9", "graph");
    const res304 = await handleGetChanges(
      { repo: fastPathRepo },
      { sinceParam: "9", tierParam: "graph", ifNoneMatch: fastETag }
    );
    assert.equal(res304.status, 304);
    assert.equal(res304.body, null);
    assert.equal(res304.headers.ETag, fastETag);
    assert.equal(res304.headers["Cache-Control"], "no-store");
    assert.equal(scannedRows, false);

    // Purge horizon reset
    const resReset = await handleGetChanges(
      { repo: fastPathRepo },
      { sinceParam: "1", tierParam: "blocks", ifNoneMatch: fastETag }
    );
    assert.equal(resReset.status, 200);
    assert.equal(resReset.body.reset, true);
    assert.deepEqual(resReset.body.changes, []);
  });

  it("AC8.4.3: forces draft on normal write, skips I13 no-op tags, performs O(log N) selective tag invalidation on shared blocks, and returns 409 REV_CONFLICT", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const invalidatedTags = [];
    const deps = {
      repo,
      isAdmin: true,
      actor: "editor",
      onInvalidateTag: (tag) => invalidatedTags.push(tag),
    };

    const sharedCreate = await handleCreateBlock(deps, {
      data: buildValidBlock("shared:alteplase", {
        blockType: "shared_clinical_block",
        status: "verified",
        verification: { verified_by: "Spoofed" },
        subspecialties: ["Stroke", "Vascular"],
        conditionIds: ["ais"],
        timeWindowIds: ["0-4.5h"],
        citedTrialKeys: ["ECASS III", "ecassiii"],
      }),
    });
    assert.equal(sharedCreate.status, 201);
    const sharedUid = sharedCreate.body.row.uid;
    assert.equal(sharedCreate.body.row.data.payload.practiceChange.status, "draft");
    assert.equal("verification" in sharedCreate.body.row.data.payload.practiceChange, false);

    const ichCreate = await handleCreateBlock(deps, {
      data: buildValidBlock("rec-ich-1", { conditionIds: ["ich"], citedTrialKeys: ["INTERACT2"] }),
    });
    const ichUid = ichCreate.body.row.uid;

    // Bind sharedUid to aha-ais & eso-ais, and ichUid only to aha-ich
    for (const [slug, blockOrder] of [
      ["aha-ais", [sharedUid]],
      ["eso-ais", [sharedUid]],
      ["aha-ich", [ichUid]],
    ]) {
      const metadata = { kind: "guideline", doc: { id: slug } };
      await handleUpsertProtocol(deps, {
        slug,
        protocolType: "guideline",
        metadata,
        metadataHash: computeProtocolMetadataHash(metadata),
        blockOrder,
      });
    }

    // I13 identical no-op update -> must NOT emit invalidation tags
    invalidatedTags.length = 0;
    const noopRes = await handleUpdateBlock(deps, sharedUid, {
      expectedRev: 1,
      data: sharedCreate.body.row.data,
    });
    assert.equal(noopRes.status, 200);
    assert.equal(noopRes.body.unchanged, true);
    assert.deepEqual(invalidatedTags, []);

    // Real update on shared block -> O(log N) invalidation of block:<uid> + aha-ais + eso-ais (NOT aha-ich)
    const updatedRes = await handleUpdateBlock(deps, sharedUid, {
      expectedRev: 1,
      data: buildValidBlock("shared:alteplase", {
        blockType: "shared_clinical_block",
        text: "Updated 0.9 mg/kg dosing",
        subspecialties: ["Stroke", "Vascular"],
        conditionIds: ["ais"],
        timeWindowIds: ["0-4.5h"],
        citedTrialKeys: ["ECASS III", "ecassiii"],
      }),
    });
    assert.equal(updatedRes.status, 200);
    assert.equal(updatedRes.body.unchanged, false);
    assert.equal(updatedRes.body.row.rev, 2);
    assert.ok(invalidatedTags.includes(`block:${sharedUid}`));
    assert.ok(invalidatedTags.includes("protocol:aha-ais"));
    assert.ok(invalidatedTags.includes("protocol:eso-ais"));
    assert.equal(invalidatedTags.includes("protocol:aha-ich"), false);

    // Stale expectedRev -> 409 REV_CONFLICT with current row
    const conflictRes = await handleUpdateBlock(deps, sharedUid, {
      expectedRev: 1,
      data: buildValidBlock("shared:alteplase", { text: "Stale write" }),
    });
    assert.equal(conflictRes.status, 409);
    assert.equal(conflictRes.headers["Cache-Control"], "no-store");
    assert.equal(conflictRes.body.code, "REV_CONFLICT");
    assert.equal(conflictRes.body.currentRev, 2);
    assert.equal(conflictRes.body.current.uid, sharedUid);

    const listProtos = await handleListProtocols({ repo });
    assert.equal(listProtos.status, 200);
    assert.equal(listProtos.body.protocols.length, 3);
  });

  it("AC8.4.4: restore strips verification & forces draft, queries overlapping facets, and maps SERVICE_UNAVAILABLE to 503", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const deps = { repo, isAdmin: true, actor: "reviewer" };

    const c = await handleCreateBlock(deps, {
      data: buildValidBlock("rec-verify-restore", {
        subspecialties: ["Stroke", "Neurocritical Care"],
        conditionIds: ["ais"],
        timeWindowIds: ["0-4.5h"],
        citedTrialKeys: ["ECASS III", "ecassiii"],
      }),
    });
    const uid = c.body.row.uid;

    const verifyUpdate = await handleUpdateBlock(deps, uid, {
      expectedRev: 1,
      allowVerified: true,
      data: buildValidBlock("rec-verify-restore", {
        status: "verified",
        topStatus: "verified",
        topVerification: { verified_by: "Dr. Clinician" },
        verification: { verified_by: "Dr. Clinician" },
        subspecialties: ["Stroke", "Neurocritical Care"],
        conditionIds: ["ais"],
        timeWindowIds: ["0-4.5h"],
        citedTrialKeys: ["ECASS III", "ecassiii"],
      }),
    });
    assert.equal(verifyUpdate.status, 200);
    assert.equal(verifyUpdate.body.row.data.status, "verified");

    const restored = await handleRestoreBlockRevision(deps, uid, {
      expectedRev: 2,
      revisionRev: 2,
    });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.row.rev, 3);
    assert.equal(restored.body.row.data.status, "draft");
    assert.equal("verification" in restored.body.row.data, false);
    assert.equal(restored.body.row.data.payload.practiceChange.status, "draft");
    assert.equal("verification" in restored.body.row.data.payload.practiceChange, false);

    const facetQuery = await handleQueryBlocksByFacets(
      { repo },
      {
        subspecialties: ["Neurocritical Care"],
        conditionIds: ["ais"],
        timeWindowIds: ["0-4.5h"],
        citedTrialKeys: ["ECASS-III"],
      }
    );
    assert.equal(facetQuery.status, 200);
    assert.equal(facetQuery.body.blocks.length, 1);
    assert.equal(facetQuery.body.blocks[0].uid, uid);

    const linksRes = await handleGetBlockLinks({ repo });
    assert.equal(linksRes.status, 200);
    assert.deepEqual(linksRes.body.links, []);

    const unavailableRepo = {
      async getSyncState() {
        throw new RepoError("SERVICE_UNAVAILABLE", "Missing SUPABASE_SERVICE_ROLE_KEY");
      },
      async removeBlock() {
        throw new RepoError("SERVICE_UNAVAILABLE", "Missing SUPABASE_SERVICE_ROLE_KEY");
      },
    };
    const res503Get = await handleGetChanges({ repo: unavailableRepo });
    assert.equal(res503Get.status, 503);
    assert.equal(res503Get.headers["Cache-Control"], "no-store");
    assert.equal(res503Get.body.code, "SERVICE_UNAVAILABLE");

    const res503Del = await handleDeleteBlock(
      { repo: unavailableRepo, isAdmin: true },
      "uid-1",
      { expectedRevParam: "1" }
    );
    assert.equal(res503Del.status, 503);
    assert.equal(res503Del.headers["Cache-Control"], "no-store");
    assert.equal(res503Del.body.code, "SERVICE_UNAVAILABLE");
  });
});
