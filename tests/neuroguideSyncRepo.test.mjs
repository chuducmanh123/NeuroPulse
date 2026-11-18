import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeJsonPatch } from "../src/lib/sync/jsonPatch.ts";
import {
  computeBlockContentHash,
  computeBlockSectionHashes,
  computeNeuroGuideRootHash,
  computeProtocolMerkleHash,
  computeProtocolMetadataHash,
} from "../src/lib/neuroguide/sync/blockGraph.ts";
import { applyNeuroGuideGraphChanges } from "../src/lib/neuroguide/sync/applyChanges.ts";
import { RepoError } from "../src/lib/neuroguide/sync/repo.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import { SupabaseNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoSupabase.ts";

function buildBlockData(blockKey, overrides = {}) {
  const blockType = overrides.blockType ?? "recommendation";
  const status = overrides.status ?? "draft";
  const text = overrides.text ?? `Clinical statement for ${blockKey}`;
  const subspecialties = overrides.subspecialties ?? ["stroke"];
  const conditionIds = overrides.conditionIds ?? ["ais"];
  const domains = overrides.domains ?? ["treatment"];
  const timeWindowIds = overrides.timeWindowIds ?? ["0-4.5h"];
  const interventionTags = overrides.interventionTags ?? ["iv_thrombolysis"];
  const citedTrialKeys = overrides.citedTrialKeys ?? ["ECASS III", "ecassiii"];
  const direction = overrides.direction ?? "recommended";
  const verification = overrides.verification;

  const practiceChange = {
    id: blockKey,
    topic: overrides.topic ?? "AIS Thrombolysis",
    currentText: text,
    cor: "Class I",
    loe: "Level A",
    status,
    ...(verification !== undefined ? { verification } : {}),
  };

  const payload =
    blockType === "pivotal_trial"
      ? {
          kind: "pivotal_trial",
          trial: {
            id: blockKey,
            acronym: overrides.acronym ?? "ECASS III",
            title: text,
            year: 2008,
            subspecialties,
            status,
            ...(verification !== undefined ? { verification } : {}),
          },
        }
      : {
          kind: blockType === "shared_clinical_block" ? "shared_clinical_block" : "recommendation",
          practiceChange,
        };

  return {
    blockKey,
    blockType,
    ...(overrides.topStatus ? { status: overrides.topStatus } : {}),
    ...(overrides.topVerification ? { verification: overrides.topVerification } : {}),
    payload,
    facetIndex: {
      recId: blockKey,
      subspecialties,
      conditionIds,
      domains,
      diagnosisTags: conditionIds,
      timeWindowIds,
      interventionTags,
      direction,
      normalizedTier: 1,
      ontologyFacets: null,
      v3Labels: null,
      customLabel: null,
      citedTrialKeys,
      linkedScenarioKeys: overrides.linkedScenarioKeys ?? [],
      picoKey: null,
      sectionPath: overrides.sectionPath ?? "3.1",
    },
  };
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe("NeuroGuideRepo Contract Suite — MemoryNeuroGuideRepo", () => {
  it("T1-T7 & T12: granular/shared blocks, O(log N) Merkle rehash, I13 short-circuit, conflicts, delete/recreate/rename, links & overlapping facets", async () => {
    const repo = new MemoryNeuroGuideRepo();

    const dAlpha = buildBlockData("rec-zz-alpha-1", {
      subspecialties: ["stroke", "neurocritical_care"],
      conditionIds: ["ais"],
      timeWindowIds: ["0-4.5h"],
      citedTrialKeys: ["ECASS III", "ecassiii"],
    });
    const dShared = buildBlockData("shared:zz-alteplase", {
      blockType: "shared_clinical_block",
      status: "verified",
      subspecialties: ["stroke", "vascular"],
      conditionIds: ["ais"],
      timeWindowIds: ["0-4.5h", "4.5-9h"],
      citedTrialKeys: ["ECASS III", "EXTEND", "ecassiii", "extend"],
      text: "Alteplase 0.9 mg/kg IV within 4.5h",
    });
    const dIch = buildBlockData("rec-zz-ich-1", {
      subspecialties: ["stroke", "neurocritical_care"],
      conditionIds: ["ich"],
      timeWindowIds: ["0-6h"],
      interventionTags: ["bp_lowering"],
      citedTrialKeys: ["INTERACT2", "interact2"],
      text: "Intensive BP lowering in acute ICH",
    });
    const dTrial = buildBlockData("trial:zz-ecass3", {
      blockType: "pivotal_trial",
      acronym: "ECASS III",
      timeWindowIds: ["3-4.5h"],
      citedTrialKeys: ["ECASS III", "ecassiii"],
      direction: "unspecified",
    });

    const alphaRes = await repo.createBlock(
      dAlpha,
      computeBlockContentHash(dAlpha),
      computeBlockSectionHashes(dAlpha),
      "tester"
    );
    const sharedRes = await repo.createBlock(
      dShared,
      computeBlockContentHash(dShared),
      computeBlockSectionHashes(dShared),
      "tester"
    );
    const ichRes = await repo.createBlock(
      dIch,
      computeBlockContentHash(dIch),
      computeBlockSectionHashes(dIch),
      "tester"
    );
    const trialRes = await repo.createBlock(
      dTrial,
      computeBlockContentHash(dTrial),
      computeBlockSectionHashes(dTrial),
      "tester"
    );

    assert.equal(alphaRes.row.rev, 1);
    assert.ok(alphaRes.row.changeSeq > 0);
    assert.equal(alphaRes.unchanged, false);

    const histAlpha1 = await repo.history(alphaRes.row.uid);
    assert.equal(histAlpha1.length, 1);
    assert.equal(histAlpha1[0].op, "insert");

    const makeProtoInput = (slug, society, year, title, subspecialties, blockOrder) => {
      const metadata = {
        kind: "guideline",
        doc: {
          id: slug,
          title,
          society,
          year,
          subspecialty: subspecialties[0],
          status: "published",
        },
      };
      return {
        slug,
        protocolType: "guideline",
        society,
        year,
        title,
        status: "published",
        subspecialties,
        metadata,
        blockOrder,
        metadataHash: computeProtocolMetadataHash(metadata),
      };
    };

    const pAhaAisInput = makeProtoInput(
      "zz-aha-ais",
      "AHA/ASA",
      2026,
      "AHA AIS Check",
      ["stroke"],
      [alphaRes.row.uid, sharedRes.row.uid]
    );
    const pEsoAisInput = makeProtoInput(
      "zz-eso-ais",
      "ESO",
      2025,
      "ESO AIS Check",
      ["stroke"],
      [sharedRes.row.uid]
    );
    const pAhaIchInput = makeProtoInput(
      "zz-aha-ich",
      "AHA/ASA",
      2022,
      "AHA ICH Check",
      ["stroke", "neurocritical_care"],
      [ichRes.row.uid]
    );

    const pAhaAis = await repo.upsertProtocol(pAhaAisInput, "tester");
    const pEsoAis = await repo.upsertProtocol(pEsoAisInput, "tester");
    const pAhaIch = await repo.upsertProtocol(pAhaIchInput, "tester");

    const expectedAhaAisHash = computeProtocolMerkleHash(pAhaAisInput.metadataHash, [
      alphaRes.row.contentHash,
      sharedRes.row.contentHash,
    ]);
    assert.equal(pAhaAis.row.protocolHash, expectedAhaAisHash);
    assert.equal(pAhaAis.unchanged, false);

    const state1 = await repo.getSyncState();
    assert.equal(
      state1.rootHash,
      computeNeuroGuideRootHash([pAhaAis.row, pEsoAis.row, pAhaIch.row])
    );

    // T12: I13 short-circuit on unchanged protocol & unchanged block
    const protoNoop = await repo.upsertProtocol(pAhaIchInput, "tester");
    assert.equal(protoNoop.unchanged, true);
    assert.equal(protoNoop.row.rev, 1);
    assert.equal(protoNoop.row.changeSeq, pAhaIch.row.changeSeq);

    const blockNoop = await repo.updateBlock(
      sharedRes.row.uid,
      1,
      dShared,
      sharedRes.row.contentHash,
      sharedRes.row.sectionHashes,
      [],
      "tester"
    );
    assert.equal(blockNoop.unchanged, true);
    assert.equal(blockNoop.row.rev, 1);
    assert.deepEqual(blockNoop.invalidatedTags, []);

    // T2: Update shared block -> ONLY zz-aha-ais and zz-eso-ais rehash; zz-aha-ich untouched
    const dSharedV2 = buildBlockData("shared:zz-alteplase", {
      blockType: "shared_clinical_block",
      status: "verified",
      subspecialties: ["stroke", "vascular"],
      conditionIds: ["ais"],
      timeWindowIds: ["0-4.5h", "4.5-9h"],
      citedTrialKeys: ["ECASS III", "EXTEND", "ecassiii", "extend"],
      text: "Alteplase 0.9 mg/kg IV (max 90 mg) within 4.5h",
    });
    const patch = computeJsonPatch(dShared, dSharedV2);
    const sharedUpdated = await repo.updateBlock(
      sharedRes.row.uid,
      1,
      dSharedV2,
      computeBlockContentHash(dSharedV2),
      computeBlockSectionHashes(dSharedV2),
      patch,
      "editor"
    );

    assert.equal(sharedUpdated.unchanged, false);
    assert.equal(sharedUpdated.row.rev, 2);
    assert.deepEqual(sharedUpdated.invalidatedTags, [
      `block:${sharedRes.row.uid}`,
      "protocol:zz-aha-ais",
      "protocol:zz-eso-ais",
    ]);

    const pAhaAisAfter = await repo.getProtocolByUid(pAhaAis.row.uid);
    const pEsoAisAfter = await repo.getProtocolByUid(pEsoAis.row.uid);
    const pAhaIchAfter = await repo.getProtocolByUid(pAhaIch.row.uid);
    assert.notEqual(pAhaAisAfter.protocolHash, pAhaAis.row.protocolHash);
    assert.notEqual(pEsoAisAfter.protocolHash, pEsoAis.row.protocolHash);
    assert.equal(pAhaIchAfter.protocolHash, pAhaIch.row.protocolHash);
    assert.equal(pAhaIchAfter.changeSeq, pAhaIch.row.changeSeq);

    const state2 = await repo.getSyncState();
    assert.notEqual(state2.rootHash, state1.rootHash);

    // T3: Stale expectedRev -> REV_CONFLICT with currentRev & currentRow
    await assert.rejects(
      () =>
        repo.updateBlock(
          sharedRes.row.uid,
          1,
          dSharedV2,
          "stale",
          {},
          [],
          "editor"
        ),
      (err) => {
        assert.ok(err instanceof RepoError);
        assert.equal(err.code, "REV_CONFLICT");
        assert.equal(err.currentRev, 2);
        assert.equal(err.currentRow?.uid, sharedRes.row.uid);
        return true;
      }
    );

    // T4: Soft-delete alpha -> tombstone appears & zz-aha-ais rehashes
    const delAlpha = await repo.removeBlock(alphaRes.row.uid, 1, "deleter");
    assert.ok(delAlpha.row.deletedAt !== null);
    assert.equal(delAlpha.row.rev, 2);
    assert.ok(delAlpha.invalidatedTags.includes("protocol:zz-aha-ais"));
    const pAhaAisAfterDel = await repo.getProtocolByUid(pAhaAis.row.uid);
    assert.equal(
      pAhaAisAfterDel.protocolHash,
      computeProtocolMerkleHash(pAhaAisInput.metadataHash, [sharedUpdated.row.contentHash])
    );

    // T5: Recreate same blockKey after delete -> succeeds with DIFFERENT uid
    const reborn = await repo.createBlock(
      dAlpha,
      computeBlockContentHash(dAlpha),
      computeBlockSectionHashes(dAlpha),
      "recreator"
    );
    assert.notEqual(reborn.row.uid, alphaRes.row.uid);
    assert.equal(reborn.row.rev, 1);
    assert.equal(reborn.row.deletedAt, null);

    // T6: Duplicate live blockKey -> SLUG_TAKEN
    await assert.rejects(
      () => repo.createBlock(dSharedV2, "dup", {}, "tester"),
      (err) => err instanceof RepoError && err.code === "SLUG_TAKEN"
    );

    // T7: Rename blockKey keeps same uid & increments rev
    const dRenamed = buildBlockData("rec-zz-alpha-renamed");
    const renamed = await repo.updateBlock(
      reborn.row.uid,
      1,
      dRenamed,
      computeBlockContentHash(dRenamed),
      computeBlockSectionHashes(dRenamed),
      [],
      "renamer"
    );
    assert.equal(renamed.row.uid, reborn.row.uid);
    assert.equal(renamed.row.slug, "rec-zz-alpha-renamed");
    assert.equal(renamed.row.blockKey, "rec-zz-alpha-renamed");
    assert.equal(renamed.row.rev, 2);

    // T12 links + overlapping multi-axis query
    const upsertedLinks = await repo.replaceBlockLinks(
      [
        {
          srcBlockUid: sharedRes.row.uid,
          dstBlockUid: trialRes.row.uid,
          linkType: "cites_trial",
          origin: "rule",
          status: "approved",
          evidenceSrc: "Alteplase IVT",
          evidenceDst: "ECASS III",
        },
        {
          srcBlockUid: sharedRes.row.uid,
          dstBlockUid: trialRes.row.uid,
          linkType: "cites_trial",
          origin: "rule",
          status: "approved",
          evidenceSrc: "Alteplase IVT",
          evidenceDst: "ECASS III",
        },
        {
          srcBlockUid: ichRes.row.uid,
          dstBlockUid: sharedRes.row.uid,
          linkType: "differs",
          origin: "rule",
          status: "approved",
        },
      ],
      true
    );
    assert.equal(upsertedLinks, 2);
    assert.equal((await repo.listBlockLinks(sharedRes.row.uid)).length, 1);

    const facetMatches = await repo.queryBlocksByFacets({
      subspecialties: ["vascular"],
      conditionIds: ["ais"],
      timeWindowIds: ["0-4.5h"],
      citedTrialKeys: ["ECASS-III"],
      directions: ["recommended"],
    });
    assert.deepEqual(
      facetMatches.map((b) => b.slug),
      ["shared:zz-alteplase"]
    );
  });

  it("T8 & T9 & batched recomputeRootHash: restore verified strips top/nested verification & forces draft; paging works", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const d1 = buildBlockData("rec-restore-test", { status: "draft" });
    const c1 = await repo.createBlock(
      d1,
      computeBlockContentHash(d1),
      computeBlockSectionHashes(d1),
      "author",
      { skipRootRehash: true }
    );
    const c2 = await repo.createBlock(
      buildBlockData("rec-paging-2"),
      "h2",
      {},
      "author",
      { skipRootRehash: true }
    );
    const c3 = await repo.createBlock(
      buildBlockData("rec-paging-3"),
      "h3",
      {},
      "author",
      { skipRootRehash: true }
    );
    const batchedRoot = await repo.recomputeRootHash();
    assert.ok(batchedRoot.length === 64);

    // Promote c1 to verified (both top-level and nested verification)
    const dVerified = buildBlockData("rec-restore-test", {
      status: "verified",
      topStatus: "verified",
      topVerification: { verified_by: "Dr. A", content_hash: "vh1" },
      verification: { verified_by: "Dr. A", content_hash: "vh1" },
    });
    const u2 = await repo.updateBlock(
      c1.row.uid,
      1,
      dVerified,
      computeBlockContentHash(dVerified),
      {},
      [],
      "reviewer"
    );
    assert.equal(u2.row.rev, 2);

    const restored = await repo.restoreBlock(
      c1.row.uid,
      2,
      2,
      "",
      {},
      [],
      "admin"
    );
    assert.equal(restored.row.rev, 3);
    assert.equal(restored.row.data.status, "draft");
    assert.equal("verification" in restored.row.data, false);
    assert.equal(restored.row.data.payload.practiceChange.status, "draft");
    assert.equal("verification" in restored.row.data.payload.practiceChange, false);

    const hist = await repo.history(c1.row.uid);
    assert.equal(hist[0].op, "restore");
    assert.equal(hist[0].status, "draft");

    // Paging on block changes
    const page1 = await repo.changesSince(0, 2);
    assert.equal(page1.rows.length, 2);
    assert.ok(page1.rows[1].changeSeq > page1.rows[0].changeSeq);
    const page2 = await repo.changesSince(page1.rows[1].changeSeq, 10);
    assert.equal(page2.rows.length, 1);
    assert.equal(page2.rows[0].uid, c1.row.uid);
    assert.ok(c2.row.uid && c3.row.uid);
  });

  it("T10: purge respects 90d block/protocol tombstones, 90d revisions, keep-min-5 & 365d verified rules", async () => {
    const now = new Date("2026-11-18T00:00:00.000Z");
    const repo = new MemoryNeuroGuideRepo({ now: () => now });

    const bOld = await repo.createBlock(buildBlockData("rec-old-tombstone"), "ho", {}, "t");
    const bRecent = await repo.createBlock(buildBlockData("rec-recent-tombstone"), "hr", {}, "t");
    const delOld = await repo.removeBlock(bOld.row.uid, 1, "t");
    await repo.removeBlock(bRecent.row.uid, 1, "t");

    repo.backdateBlockTombstone(bOld.row.uid, new Date(now.getTime() - 91 * 86_400_000));
    repo.backdateBlockTombstone(bRecent.row.uid, new Date(now.getTime() - 10 * 86_400_000));

    // Also create a tombstoned protocol aged 91 days
    const pOld = await repo.upsertProtocol(
      {
        slug: "proto-old-tombstone",
        protocolType: "guideline",
        society: "AHA",
        year: 2020,
        title: "Old",
        status: "published",
        subspecialties: ["stroke"],
        metadata: { kind: "guideline", doc: { id: "proto-old-tombstone" } },
        blockOrder: [],
        metadataHash: "mh-old",
      },
      "t"
    );
    await repo.deleteProtocol(pOld.row.uid, 1, "t");
    repo.backdateProtocolTombstone(pOld.row.uid, new Date(now.getTime() - 95 * 86_400_000));

    // Create 8 revisions matching SQL T10 matrix:
    // rev 1: verified 370d (purged), rev 2: verified 200d (kept), rev 3: draft 100d (purged), rev 4..8: draft 100d (kept)
    const rt = await repo.createBlock(
      buildBlockData("rec-revtest", { status: "verified" }),
      "rt1",
      {},
      "t"
    );
    await repo.updateBlock(
      rt.row.uid,
      1,
      buildBlockData("rec-revtest", { status: "verified", text: "v2" }),
      "rt2",
      {},
      [],
      "t"
    );
    for (let i = 3; i <= 8; i++) {
      await repo.updateBlock(
        rt.row.uid,
        i - 1,
        buildBlockData("rec-revtest", { status: "draft", text: `v${i}` }),
        `rt${i}`,
        {},
        [],
        "t"
      );
    }

    repo.backdateRevision(rt.row.uid, 1, new Date(now.getTime() - 370 * 86_400_000));
    repo.backdateRevision(rt.row.uid, 2, new Date(now.getTime() - 200 * 86_400_000));
    for (let i = 3; i <= 8; i++) {
      repo.backdateRevision(rt.row.uid, i, new Date(now.getTime() - 100 * 86_400_000));
    }

    const purgeRes = await repo.purge(now);
    assert.equal(purgeRes.tombstonesPurged, 2);
    assert.equal(purgeRes.revisionsPurged, 2);
    assert.ok(purgeRes.purgeHorizonSeq >= delOld.row.changeSeq);
    assert.equal(await repo.getBlockByUid(bOld.row.uid), null);
    assert.ok((await repo.getBlockByUid(bRecent.row.uid)) !== null);
    assert.equal(await repo.getProtocolByUid(pOld.row.uid), null);

    const keptRevs = (await repo.history(rt.row.uid))
      .map((r) => r.rev)
      .sort((a, b) => a - b);
    assert.deepEqual(keptRevs, [2, 4, 5, 6, 7, 8]);
  });
});

describe("SupabaseNeuroGuideRepo — Configuration & Error Mapping (Pitfall P8)", () => {
  it("throws SERVICE_UNAVAILABLE without falling back to anon key when service role key is missing", async () => {
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-must-not-be-used";
      const repo = new SupabaseNeuroGuideRepo({
        url: "https://example.supabase.co",
        serviceRoleKey: "",
      });
      await assert.rejects(
        () => repo.getSyncState(),
        (err) => err instanceof RepoError && err.code === "SERVICE_UNAVAILABLE"
      );
    } finally {
      if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
      if (prevAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon;
    }
  });

  it("maps NG_REV_CONFLICT, NG_SLUG_TAKEN, and NG_NOT_FOUND RPC errors cleanly via mock client", async () => {
    const mockRow = {
      uid: "u-block-1",
      slug: "shared:test",
      block_key: "shared:test",
      block_type: "shared_clinical_block",
      data: buildBlockData("shared:test"),
      content_hash: "h1",
      section_hashes: {},
      rev: 5,
      change_seq: 9,
      updated_at: "2026-11-18T00:00:00Z",
      updated_by: "admin",
      deleted_at: null,
    };

    const mockClient = {
      from(table) {
        assert.equal(table, "neuroguide_content_blocks");
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: mockRow, error: null };
                  },
                };
              },
            };
          },
        };
      },
      async rpc(fn) {
        if (fn === "neuroguide_update_block") {
          return { data: null, error: { message: "NG_REV_CONFLICT:5" } };
        }
        if (fn === "neuroguide_create_block") {
          return { data: null, error: { message: "NG_SLUG_TAKEN:shared:test" } };
        }
        if (fn === "neuroguide_delete_block") {
          return { data: null, error: { message: "NG_NOT_FOUND:u-missing" } };
        }
        return { data: null, error: { message: "unexpected rpc" } };
      },
    };

    const repo = new SupabaseNeuroGuideRepo({ client: mockClient });
    await assert.rejects(
      () =>
        repo.updateBlock(
          "u-block-1",
          4,
          buildBlockData("shared:test"),
          "h2",
          {},
          [],
          "editor"
        ),
      (err) => {
        assert.ok(err instanceof RepoError);
        assert.equal(err.code, "REV_CONFLICT");
        assert.equal(err.currentRev, 5);
        assert.equal(err.currentRow?.slug, "shared:test");
        return true;
      }
    );

    await assert.rejects(
      () => repo.createBlock(buildBlockData("shared:test"), "h1", {}, "editor"),
      (err) => err instanceof RepoError && err.code === "SLUG_TAKEN"
    );

    await assert.rejects(
      () => repo.removeBlock("u-missing", 1, "editor"),
      (err) => err instanceof RepoError && err.code === "NOT_FOUND"
    );
  });
});

describe("applyNeuroGuideGraphChanges — Property Convergence Test", () => {
  it("50 random permutations & multi-chunk batch splits converge to identical final graph state", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const historyEvents = { protocols: [], blocks: [] };

    const blockUids = [];
    for (let i = 0; i < 30; i++) {
      const data = buildBlockData(`prop-block-${i}`);
      const c = await repo.createBlock(
        data,
        computeBlockContentHash(data),
        computeBlockSectionHashes(data),
        "seed",
        { skipRootRehash: i < 29 }
      );
      blockUids.push(c.row.uid);
      historyEvents.blocks.push(structuredClone(c.row));
    }

    for (let p = 0; p < 10; p++) {
      const bOrder = blockUids.slice(p * 3, p * 3 + 3);
      const metadata = {
        kind: "guideline",
        doc: { id: `prop-proto-${p}`, title: `Proto ${p}`, society: "AHA", year: 2026 },
      };
      const up = await repo.upsertProtocol(
        {
          slug: `prop-proto-${p}`,
          protocolType: "guideline",
          society: "AHA",
          year: 2026,
          title: `Proto ${p}`,
          status: "published",
          subspecialties: ["stroke"],
          metadata,
          blockOrder: bOrder,
          metadataHash: computeProtocolMetadataHash(metadata),
          skipRootRehash: p < 9,
        },
        "seed"
      );
      historyEvents.protocols.push(structuredClone(up.row));
    }

    // Mutate subset (updates + deletes) so deltas span multiple revisions & tombstones
    for (let i = 0; i < 8; i++) {
      const nextData = buildBlockData(`prop-block-${i}`, { text: `Updated ${i}` });
      const u = await repo.updateBlock(
        blockUids[i],
        1,
        nextData,
        computeBlockContentHash(nextData),
        computeBlockSectionHashes(nextData),
        [],
        "mutator"
      );
      historyEvents.blocks.push(structuredClone(u.row));
      const pAffected = await repo.getProtocolByUid(historyEvents.protocols[Math.floor(i / 3)].uid);
      if (pAffected) historyEvents.protocols.push(structuredClone(pAffected));
    }

    for (let i = 20; i < 24; i++) {
      const d = await repo.removeBlock(blockUids[i], 1, "deleter");
      historyEvents.blocks.push(structuredClone(d.row));
      const pAffected = await repo.getProtocolByUid(historyEvents.protocols[Math.floor(i / 3)].uid);
      if (pAffected) historyEvents.protocols.push(structuredClone(pAffected));
    }

    const expectedBlocks = await repo.changesSince(0, 500);
    const expectedProtos = await repo.protocolChangesSince(0, 500);
    const baseline = applyNeuroGuideGraphChanges(
      new Map(),
      expectedProtos.rows,
      new Map(),
      expectedBlocks.rows
    );
    assert.equal(baseline.blocks.next.size, 26);
    assert.equal(baseline.protocols.next.size, 10);

    const rng = makeRng(20261118);
    for (let trial = 0; trial < 50; trial++) {
      const shuffledBlocks = [...historyEvents.blocks];
      const shuffledProtos = [...historyEvents.protocols];
      for (const arr of [shuffledBlocks, shuffledProtos]) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      }

      let curP = new Map();
      let curB = new Map();
      const chunkCount = 1 + Math.floor(rng() * 5);
      const bChunkSize = Math.max(1, Math.ceil(shuffledBlocks.length / chunkCount));
      const pChunkSize = Math.max(1, Math.ceil(shuffledProtos.length / chunkCount));

      for (let c = 0; c < chunkCount; c++) {
        const res = applyNeuroGuideGraphChanges(
          curP,
          shuffledProtos.slice(c * pChunkSize, (c + 1) * pChunkSize),
          curB,
          shuffledBlocks.slice(c * bChunkSize, (c + 1) * bChunkSize)
        );
        curP = res.protocols.next;
        curB = res.blocks.next;
      }

      assert.deepEqual(Array.from(curB.keys()), Array.from(baseline.blocks.next.keys()));
      assert.deepEqual(Array.from(curP.keys()), Array.from(baseline.protocols.next.keys()));
      for (const [uid, row] of curB.entries()) {
        assert.deepEqual(row, baseline.blocks.next.get(uid));
      }
      assert.equal(
        computeNeuroGuideRootHash(Array.from(curP.values())),
        computeNeuroGuideRootHash(Array.from(baseline.protocols.next.values()))
      );
    }
  });
});
