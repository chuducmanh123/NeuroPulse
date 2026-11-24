import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  computePathwayNodeBlockKey,
  normalizePathwaySlug,
  validateClinicalPathway,
} from "../src/lib/neuroguide/pathwayValidator.ts";
import {
  assembleClinicalPathwayFromGraph,
  assembleNeuroGuideStoreFromGraph,
  computePathwayProtocolUid,
  decomposeClinicalPathwayToGraphEntries,
  decomposeNeuroGuideStoreToGraph,
} from "../src/lib/neuroguide/sync/blockGraph.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import { RepoError } from "../src/lib/neuroguide/sync/repo.ts";
import { handleGetChanges } from "../src/lib/neuroguide/sync/handlers.ts";
import {
  PathwayServiceError,
  computeImageSha256,
  createPathwayDraft,
  getPathwayByUid,
  listPathways,
  restorePathway,
  softDeletePathway,
  updatePathway,
} from "../src/lib/neuroguide/pathwayService.ts";

function makeSamplePathwayInput(overrides = {}) {
  return {
    title: { en: "Acute Ischemic Stroke IV Thrombolysis", vi: "Tiêu sợi huyết tĩnh mạch trong đột quỵ thiếu máu não cấp" },
    summary: { en: "Step-by-step IVT eligibility and dosing pathway", vi: "Lưu đồ đánh giá chỉ định tiêu sợi huyết" },
    subspecialty: "Stroke",
    conditionId: "ais",
    domain: "treatment",
    source: {
      sourceType: "guideline",
      title: "2026 AHA/ASA Acute Ischemic Stroke Guideline",
      organizationOrAuthor: "AHA/ASA",
      year: 2026,
      figureRef: "Figure 1",
    },
    sourceImageUrl: "https://example.org/stroke-ivt.png",
    sourceImageSha256: "a".repeat(64),
    entryNodeId: "n1",
    nodes: [
      {
        id: "n1",
        kind: "entry",
        title: { en: "Suspected Acute Ischemic Stroke", vi: "Nghi ngờ đột quỵ thiếu máu não cấp" },
        edges: [
          {
            id: "e1",
            label: { en: "Onset ≤ 4.5 hours", vi: "Khởi phát ≤ 4.5 giờ" },
            targetNodeId: "n2",
            tone: "positive",
          },
          {
            id: "e2",
            label: { en: "Onset > 4.5 hours", vi: "Khởi phát > 4.5 giờ" },
            targetNodeId: "n4",
            tone: "warning",
          },
        ],
      },
      {
        id: "n2",
        kind: "checklist",
        title: { en: "IVT Eligibility Checklist", vi: "Bảng kiểm tiêu chuẩn IVT" },
        checklistItems: [
          { id: "c1", label: { en: "No ICH on non-contrast CT", vi: "Không xuất huyết não trên CT" }, role: "inclusion" },
          { id: "c2", label: { en: "BP < 185/110 mmHg", vi: "HA < 185/110 mmHg" }, role: "inclusion" },
        ],
        edges: [
          {
            id: "e3",
            label: { en: "All criteria met", vi: "Đủ tiêu chuẩn" },
            targetNodeId: "n3",
            checklistTrigger: "pass",
            tone: "positive",
          },
          {
            id: "e4",
            label: { en: "Contraindicated", vi: "Chống chỉ định" },
            targetNodeId: "n4",
            checklistTrigger: "fail",
            tone: "danger",
          },
        ],
      },
      {
        id: "n3",
        kind: "treatment",
        title: { en: "Administer IV Alteplase 0.9 mg/kg", vi: "Truyền Alteplase 0.9 mg/kg" },
        tier: 1,
        evidenceBadge: "Class I, LOE A",
        edges: [],
      },
      {
        id: "n4",
        kind: "diagnosis",
        title: { en: "Evaluate for Mechanical Thrombectomy", vi: "Đánh giá lấy huyết khối cơ học" },
        tier: 1,
        edges: [],
      },
    ],
    ...overrides,
  };
}

describe("Phase 1 — Clinical Pathways Schema, Validator, Sync v2 Merkle & Service", () => {
  it("T1.2: validateClinicalPathway catches all 9 blocking errors and emits non-blocking warnings", () => {
    const validDoc = makeSamplePathwayInput();
    const okRes = validateClinicalPathway(validDoc);
    assert.equal(okRes.valid, true);
    assert.equal(okRes.canPublish, true);
    assert.equal(okRes.errors.length, 0);
    assert.equal(okRes.warnings.length, 0);

    // 1. MISSING_TITLE, MISSING_SOURCE, MISSING_IMAGE, EMPTY_NODES
    const emptyRes = validateClinicalPathway({
      title: { en: "  " },
      source: { sourceType: "guideline", title: "", organizationOrAuthor: "", year: 1800 },
      sourceImageUrl: "",
      nodes: [],
      entryNodeId: "",
    });
    const emptyCodes = new Set(emptyRes.errors.map((e) => e.code));
    assert.ok(emptyCodes.has("MISSING_TITLE"));
    assert.ok(emptyCodes.has("MISSING_SOURCE"));
    assert.ok(emptyCodes.has("MISSING_IMAGE"));
    assert.ok(emptyCodes.has("EMPTY_NODES"));
    assert.equal(emptyRes.canPublish, false);

    // 2. DUPLICATE_NODE_ID, INVALID_ENTRY_NODE, BROKEN_EDGE_TARGET, DEAD_END_DECISION, CHECKLIST_MISSING_ITEMS
    const brokenRes = validateClinicalPathway({
      title: { en: "Broken Graph" },
      source: { sourceType: "textbook", title: "Adams & Victor", organizationOrAuthor: "Ropper", year: 2023 },
      sourceImageUrl: "/img.png",
      entryNodeId: "missing-entry",
      nodes: [
        { id: "n1", kind: "decision", title: { en: "Q1" }, edges: [] },
        { id: "n1", kind: "checklist", title: { en: "Dup & empty checklist" }, checklistItems: [], edges: [{ id: "e1", label: { en: "Go" }, targetNodeId: "nope" }] },
      ],
    });
    const brokenCodes = new Set(brokenRes.errors.map((e) => e.code));
    assert.ok(brokenCodes.has("DUPLICATE_NODE_ID"));
    assert.ok(brokenCodes.has("INVALID_ENTRY_NODE"));
    assert.ok(brokenCodes.has("DEAD_END_DECISION"));
    assert.ok(brokenCodes.has("CHECKLIST_MISSING_ITEMS"));
    assert.ok(brokenCodes.has("BROKEN_EDGE_TARGET"));

    // 3. Warnings: ORPHAN_NODE, CYCLE_DETECTED, MISSING_VI_TRANSLATION, NON_TERMINAL_LEAF
    const warnRes = validateClinicalPathway({
      title: { en: "Warning Graph" },
      source: { sourceType: "guideline", title: "ESO", organizationOrAuthor: "ESO", year: 2025 },
      sourceImageUrl: "/img.png",
      entryNodeId: "n1",
      nodes: [
        {
          id: "n1",
          kind: "entry",
          title: { en: "Start" },
          edges: [{ id: "e1", label: { en: "Next" }, targetNodeId: "n2" }],
        },
        {
          id: "n2",
          kind: "action",
          title: { en: "Reassess" },
          edges: [{ id: "e2", label: { en: "Loop" }, targetNodeId: "n1" }],
        },
        {
          id: "n3",
          kind: "action",
          title: { en: "Orphan action" },
          edges: [],
        },
      ],
    });
    assert.equal(warnRes.canPublish, true);
    const warnCodes = new Set(warnRes.warnings.map((w) => w.code));
    assert.ok(warnCodes.has("ORPHAN_NODE"));
    assert.ok(warnCodes.has("CYCLE_DETECTED"));
    assert.ok(warnCodes.has("MISSING_VI_TRANSLATION"));
    assert.ok(warnCodes.has("NON_TERMINAL_LEAF"));

    assert.equal(
      normalizePathwaySlug("Acute Stroke IVT", "AHA/ASA", 2026),
      "acute-stroke-ivt-aha-asa-2026"
    );
    assert.equal(
      computePathwayNodeBlockKey("Acute-Stroke", "N1"),
      "pathway-node::acute-stroke::n1"
    );
  });

  it("T1.3: decomposes and reassembles ClinicalPathwayDoc losslessly in Sync v2 Merkle Graph", () => {
    const slug = "ais-ivt-aha-asa-2026";
    const pathwayDoc = {
      ...makeSamplePathwayInput(),
      uid: computePathwayProtocolUid(slug),
      slug,
      status: "published",
      rev: 1,
      createdAt: "2026-11-22T00:00:00.000Z",
      updatedAt: "2026-11-22T00:00:00.000Z",
    };

    const { protocol, blocks, edges } = decomposeClinicalPathwayToGraphEntries(pathwayDoc);
    assert.equal(protocol.protocolType, "clinical_pathway");
    assert.equal(blocks.length, 4);
    assert.equal(edges.length, 4);
    assert.ok(edges.every((e) => e.role === "pathway_step"));
    assert.ok(blocks.every((b) => b.blockType === "pathway_node"));

    const blocksMap = new Map(blocks.map((b) => [b.uid, b]));
    const reassembled = assembleClinicalPathwayFromGraph(protocol, blocksMap);
    assert.ok(reassembled);
    assert.equal(reassembled.slug, slug);
    assert.equal(reassembled.nodes.length, 4);
    assert.equal(reassembled.nodes[0].blockUid, blocks[0].uid);

    // Store round-trip & draft exclusion
    const draftPathway = {
      ...pathwayDoc,
      uid: computePathwayProtocolUid("draft-pathway"),
      slug: "draft-pathway",
      status: "draft",
    };
    const graph = decomposeNeuroGuideStoreToGraph({
      guidelines: [],
      conferences: [],
      scenarios: [],
      clinicalPathways: [pathwayDoc, draftPathway],
    });

    const publicAssembled = assembleNeuroGuideStoreFromGraph(graph, { excludeDrafts: true });
    assert.equal(publicAssembled.clinicalPathways.length, 1);
    assert.equal(publicAssembled.clinicalPathways[0].slug, slug);

    const adminAssembled = assembleNeuroGuideStoreFromGraph(graph, { excludeDrafts: false });
    assert.equal(adminAssembled.clinicalPathways.length, 2);
  });

  it("T1.5: enforces anti-duplication, optimistic concurrency (409), granular O(log N) edit, publish gate, tombstone delete & restore", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const imgSha = computeImageSha256(Buffer.from("fake-png-bytes"));
    const input = makeSamplePathwayInput({ sourceImageSha256: imgSha });

    // 1. Create draft
    const { pathway: created } = await createPathwayDraft(repo, input, "dr.linh");
    assert.equal(created.status, "draft");
    assert.equal(created.rev, 1);
    assert.equal(created.nodes.length, 4);

    // 2. Non-admin cannot see draft in listPathways or handleGetChanges
    const publicList = await listPathways(repo, { includeDrafts: false });
    assert.equal(publicList.length, 0);
    const adminList = await listPathways(repo, { includeDrafts: true });
    assert.equal(adminList.length, 1);

    const nonAdminDelta = await handleGetChanges(
      { repo, isAdmin: false },
      { tierParam: "graph", sinceParam: "0" }
    );
    assert.equal(nonAdminDelta.body.changes.length, 0);
    assert.equal(nonAdminDelta.body.protocolChanges.length, 0);

    // 3. Anti-duplication: slug collision & image SHA-256 collision
    await assert.rejects(
      () => createPathwayDraft(repo, input, "dr.linh"),
      (err) => err instanceof PathwayServiceError && err.code === "DUPLICATE_PATHWAY"
    );
    await assert.rejects(
      () =>
        createPathwayDraft(
          repo,
          makeSamplePathwayInput({
            title: { en: "Completely Different Title" },
            sourceImageSha256: imgSha,
          }),
          "dr.linh"
        ),
      (err) => err instanceof PathwayServiceError && err.code === "DUPLICATE_PATHWAY"
    );

    // 4. Granular edit of 1 node: unchanged 3 nodes keep exact rev & changeSeq
    const beforeBlocks = await Promise.all(
      created.nodes.map((n) => repo.getBlockByUid(n.blockUid))
    );
    const editedNodes = structuredClone(created.nodes);
    editedNodes[2].title.en = "Administer IV Tenecteplase 0.25 mg/kg or Alteplase 0.9 mg/kg";

    const updateRes = await updatePathway(
      repo,
      created.uid,
      created.rev,
      { nodes: editedNodes },
      "dr.linh"
    );
    assert.equal(updateRes.stats.updatedBlocks, 1);
    assert.equal(updateRes.stats.unchangedBlocks, 3);
    assert.equal(updateRes.pathway.rev, 2);

    const afterBlocks = await Promise.all(
      updateRes.pathway.nodes.map((n) => repo.getBlockByUid(n.blockUid))
    );
    assert.equal(afterBlocks[0].rev, beforeBlocks[0].rev);
    assert.equal(afterBlocks[0].changeSeq, beforeBlocks[0].changeSeq);
    assert.equal(afterBlocks[1].rev, beforeBlocks[1].rev);
    assert.equal(afterBlocks[2].rev, beforeBlocks[2].rev + 1);
    assert.equal(afterBlocks[3].rev, beforeBlocks[3].rev);

    // 5. Optimistic concurrency: stale rev throws REV_CONFLICT without mutating child blocks
    const n0RevBeforeConflict = afterBlocks[0].rev;
    const conflictNodes = structuredClone(updateRes.pathway.nodes);
    conflictNodes[0].title.en = "Should not persist";
    await assert.rejects(
      () => updatePathway(repo, created.uid, 1, { nodes: conflictNodes }, "dr.other"),
      (err) => err instanceof RepoError && err.code === "REV_CONFLICT"
    );
    const n0AfterConflict = await repo.getBlockByUid(afterBlocks[0].uid);
    assert.equal(n0AfterConflict.rev, n0RevBeforeConflict);
    assert.equal(n0AfterConflict.data.payload.node.title.en, "Suspected Acute Ischemic Stroke");

    // 6. Publish gate: invalid graph blocked from publishing
    const invalidNodes = structuredClone(updateRes.pathway.nodes);
    invalidNodes[0].edges = []; // DEAD_END_DECISION
    await assert.rejects(
      () =>
        updatePathway(
          repo,
          created.uid,
          updateRes.pathway.rev,
          { status: "published", nodes: invalidNodes },
          "dr.linh"
        ),
      (err) => err instanceof PathwayServiceError && err.code === "VALIDATION_FAILED"
    );

    // Valid publish succeeds
    const publishedRes = await updatePathway(
      repo,
      created.uid,
      updateRes.pathway.rev,
      { status: "published" },
      "dr.linh"
    );
    assert.equal(publishedRes.pathway.status, "published");
    assert.equal(publishedRes.pathway.reviewedBy, "dr.linh");
    const publicVisible = await listPathways(repo, { includeDrafts: false });
    assert.equal(publicVisible.length, 1);

    // 7. Soft-delete tombstone sync & restore back to draft
    const deleted = await softDeletePathway(
      repo,
      publishedRes.pathway.uid,
      publishedRes.pathway.rev,
      "dr.linh"
    );
    assert.ok(deleted.protocol.deletedAt);
    assert.equal(deleted.deletedBlockUids.length, 4);
    assert.equal((await listPathways(repo, { includeDrafts: true })).length, 0);
    assert.equal(await getPathwayByUid(repo, publishedRes.pathway.uid, { includeDrafts: true }), null);

    // Tombstones propagate to non-admin sync clients
    const tombstoneDelta = await handleGetChanges(
      { repo, isAdmin: false },
      { tierParam: "graph", sinceParam: "0" }
    );
    assert.ok(tombstoneDelta.body.protocolChanges.some((p) => p.uid === created.uid && p.deletedAt !== null));
    assert.ok(tombstoneDelta.body.changes.some((b) => b.uid === afterBlocks[0].uid && b.deletedAt !== null));

    // Restore brings pathway and nodes back as 'draft' (never auto-published)
    const restored = await restorePathway(
      repo,
      deleted.protocol.uid,
      deleted.protocol.rev,
      "dr.linh"
    );
    assert.equal(restored.status, "draft");
    assert.equal(restored.deletedAt, null);
    assert.equal(restored.nodes.length, 4);
    assert.equal((await listPathways(repo, { includeDrafts: false })).length, 0);
    assert.equal((await listPathways(repo, { includeDrafts: true })).length, 1);
  });

  it("T1.4: SQL migration and rollback follow NeuroGuide Sync v2 contract", () => {
    const root = process.cwd();
    const fwdPath = path.join(root, "supabase", "migrations", "20261122_neuroguide_clinical_pathways_v2.sql");
    const rbPath = path.join(root, "supabase", "migrations", "20261122_neuroguide_clinical_pathways_v2_rollback.sql");

    assert.equal(fs.existsSync(fwdPath), true);
    assert.equal(fs.existsSync(rbPath), true);

    const fwd = fs.readFileSync(fwdPath, "utf8");
    const rb = fs.readFileSync(rbPath, "utf8");
    const strip = (s) => s.split(/\r?\n/).map((l) => l.replace(/--.*$/, "")).join("\n");
    const cleanFwd = strip(fwd);
    const cleanRb = strip(rb);

    assert.match(cleanFwd, /\bBEGIN;/);
    assert.match(cleanFwd, /\bCOMMIT;/);
    assert.match(cleanRb, /\bBEGIN;/);
    assert.match(cleanRb, /\bCOMMIT;/);
    assert.equal(/\b(neuroguide_docs|neurorx_drugs|neurorx_drug_records)\b/i.test(cleanFwd), false);
    assert.equal(/\b(neuroguide_docs|neurorx_drugs|neurorx_drug_records)\b/i.test(cleanRb), false);

    assert.match(cleanFwd, /'clinical_pathway'/);
    assert.match(cleanFwd, /'pathway_node'/);
    assert.match(cleanFwd, /'pathway_step'/);
    assert.match(cleanFwd, /create\s+or\s+replace\s+function\s+public\.neuroguide_restore_protocol\b/i);
    assert.match(cleanFwd, /grant\s+execute\s+on\s+function\s+public\.neuroguide_restore_protocol\s*\(\s*uuid\s*,\s*int\s*,\s*text\s*\)\s+to\s+service_role/i);
    assert.match(cleanRb, /drop\s+function\s+if\s+exists\s+public\.neuroguide_restore_protocol\s*\(\s*uuid\s*,\s*int\s*,\s*text\s*\)/i);
  });
});
