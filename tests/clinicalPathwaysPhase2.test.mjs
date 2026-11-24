import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractPathwayFromImage,
  normalizeExtractedPathwayPayload,
} from "../src/lib/neuroguide/pathwayExtractor.ts";
import {
  handleCreatePathway,
  handleDeletePathway,
  handleExtractPathway,
  handleGetPathway,
  handleListPathways,
  handlePatchPathway,
  handleRestorePathway,
} from "../src/lib/neuroguide/pathwayHandlers.ts";
import { computeImageSha256 } from "../src/lib/neuroguide/pathwayService.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";

const SAMPLE_META = {
  sourceType: "guideline",
  title: "Acute Vertigo & HINTS Exam Pathway",
  sourceTitle: "2023 GRACE-3 Acute Dizziness Guideline",
  organizationOrAuthor: "SAEM GRACE-3",
  year: 2023,
  figureRef: "Figure 2",
  subspecialty: "Stroke",
  domain: "diagnosis",
};

describe("Phase 2 — Gemini Vision Extractor & Clinical Pathways API Handlers", () => {
  it("T2.1: normalizeExtractedPathwayPayload sanitizes noisy AI output and computes validation", () => {
    const rawFromAi = {
      title: { en: "Acute Vestibular Syndrome (AVS)", vi: "Hội chứng tiền đình cấp" },
      summary: { en: "HINTS bedside differentiation" },
      entryNodeId: "", // missing -> should fallback to first node
      nodes: [
        {
          id: "n1",
          kind: "invalid_kind", // should coerce to 'decision' because it has edges
          title: { en: "Continuous acute vertigo + nystagmus?" },
          tier: 99, // invalid tier -> dropped
          edges: [
            {
              id: "",
              label: { en: "Yes — perform HINTS", vi: "Có — khám HINTS" },
              targetNodeId: "n2",
              tone: "positive",
            },
          ],
        },
        {
          id: "n2",
          kind: "checklist",
          title: { en: "HINTS Central Signs", vi: "Dấu hiệu trung ương trên HINTS" },
          checklistItems: [
            { id: "", label: { en: "Normal Head Impulse Test" }, role: "exclusion" },
            { id: "c2", label: { en: "Direction-changing nystagmus" }, role: "inclusion" },
          ],
          edges: [
            {
              id: "e_central",
              label: { en: "Any central sign present" },
              targetNodeId: "n3",
              checklistTrigger: "fail",
              tone: "danger",
            },
          ],
        },
        {
          id: "n3",
          kind: "diagnosis",
          title: { en: "Suspected Central / Posterior Circulation Stroke", vi: "Nghi ngờ đột quỵ tuần hoàn sau" },
          tier: 1,
          evidenceBadge: "Strong, Moderate LOE",
          edges: [],
        },
      ],
      confidenceNotes: ["Bottom arrow slightly cropped", ""],
    };

    const { draft, validation, confidenceNotes } = normalizeExtractedPathwayPayload(
      rawFromAi,
      {
        imageUrl: "/uploads/pathways/avs.png",
        imageSha256: "b".repeat(64),
        mimeType: "image/png",
        fileName: "avs.png",
        metadata: SAMPLE_META,
        model: "gemini-4-hydrogen",
      }
    );

    assert.equal(draft.entryNodeId, "n1");
    assert.equal(draft.nodes[0].kind, "decision");
    assert.equal(draft.nodes[0].tier, undefined);
    assert.equal(draft.nodes[1].checklistItems.length, 2);
    assert.equal(draft.nodes[1].checklistItems[0].id, "n2_c1");
    assert.equal(draft.nodes[2].tier, 1);
    assert.equal(confidenceNotes.length, 1);
    assert.equal(validation.canPublish, true);
  });

  it("T2.1: extractPathwayFromImage waterfalls across Gemini models and parses markdown-fenced JSON", async () => {
    const calledModels = [];
    const mockFetch = async (url) => {
      const m = String(url).match(/models\/([^:]+):generateContent/);
      calledModels.push(m ? m[1] : "unknown");
      if (calledModels.length === 1) {
        return new Response("Service Unavailable", { status: 503, statusText: "Unavailable" });
      }
      const fenced = "```json\n" + JSON.stringify({
        title: { en: "AVS Algorithm", vi: "Lưu đồ AVS" },
        entryNodeId: "start",
        nodes: [
          {
            id: "start",
            kind: "entry",
            title: { en: "Acute dizziness", vi: "Chóng mặt cấp" },
            edges: [{ id: "e1", label: { en: "Proceed", vi: "Tiếp tục" }, targetNodeId: "end" }],
          },
          {
            id: "end",
            kind: "diagnosis",
            title: { en: "Peripheral vestibulopathy", vi: "Bệnh lý tiền đình ngoại biên" },
            edges: [],
          },
        ],
        confidenceNotes: [],
      }) + "\n```";
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: fenced }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await extractPathwayFromImage({
      imageBuffer: Buffer.from("png-bytes"),
      mimeType: "image/png",
      imageUrl: "/uploads/pathways/test.png",
      imageSha256: "c".repeat(64),
      metadata: SAMPLE_META,
      apiKey: "test-key",
      fetchImpl: mockFetch,
      models: ["model-primary", "model-fallback"],
    });

    assert.deepEqual(calledModels, ["model-primary", "model-fallback"]);
    assert.equal(result.model, "model-fallback");
    assert.equal(result.validation.canPublish, true);
    assert.equal(result.draft.nodes.length, 2);

    await assert.rejects(
      () =>
        extractPathwayFromImage({
          imageBuffer: Buffer.from("png-bytes"),
          mimeType: "image/png",
          imageUrl: "/uploads/pathways/test.png",
          imageSha256: "c".repeat(64),
          metadata: SAMPLE_META,
          apiKey: "test-key",
          fetchImpl: async () => new Response("Err", { status: 500 }),
          models: ["m1", "m2"],
        }),
      (err) => err.code === "STORAGE_ERROR"
    );
  });

  it("T2.2 & T2.3: enforces auth, duplicate warnings, baseRev 409, publish gate, delete & restore via pathwayHandlers", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const invalidatedTags = [];
    const imgBuf = Buffer.from("fake-flowchart-image-data");
    const imgSha = computeImageSha256(imgBuf);

    // 1. Non-admin guards
    const unauthCreate = await handleCreatePathway({ repo, isAdmin: false }, {});
    assert.equal(unauthCreate.status, 401);
    const unauthPatch = await handlePatchPathway({ repo, isAdmin: false }, "uid-1", { baseRev: 1 });
    assert.equal(unauthPatch.status, 401);
    const unauthDelete = await handleDeletePathway({ repo, isAdmin: false }, "uid-1", { baseRev: 1 });
    assert.equal(unauthDelete.status, 401);
    const unauthRestore = await handleRestorePathway({ repo, isAdmin: false }, "uid-1", { baseRev: 1 });
    assert.equal(unauthRestore.status, 401);
    const unauthExtract = await handleExtractPathway(
      { repo, isAdmin: false },
      { imageBuffer: imgBuf, fileName: "a.png", mimeType: "image/png", metadata: SAMPLE_META }
    );
    assert.equal(unauthExtract.status, 401);

    // 2. Extract handler (mocked upload & Gemini)
    const mockDepsAdmin = {
      repo,
      isAdmin: true,
      actor: "dr.minh",
      onInvalidateTag: (tag) => invalidatedTags.push(tag),
      uploadImageFn: async (buf, name, mime) => ({
        url: `/uploads/pathways/${name}`,
        sha256: computeImageSha256(buf),
        mimeType: mime,
        fileName: name,
      }),
      extractFn: async (inp) => ({
        ok: true,
        model: "gemini-mock",
        confidenceNotes: ["Clear diagram"],
        validation: { valid: true, canPublish: true, errors: [], warnings: [] },
        draft: {
          slug: "avs-hints-saem-grace-3-2023",
          title: { en: "Acute Vertigo HINTS", vi: "Chóng mặt cấp HINTS" },
          subspecialty: inp.metadata.subspecialty,
          domain: inp.metadata.domain,
          source: {
            sourceType: inp.metadata.sourceType,
            title: inp.metadata.sourceTitle,
            organizationOrAuthor: inp.metadata.organizationOrAuthor,
            year: inp.metadata.year,
          },
          sourceImageUrl: inp.imageUrl,
          sourceImageSha256: inp.imageSha256,
          entryNodeId: "n1",
          nodes: [
            {
              id: "n1",
              kind: "entry",
              title: { en: "AVS?", vi: "AVS?" },
              edges: [{ id: "e1", label: { en: "Yes", vi: "Có" }, targetNodeId: "n2" }],
            },
            {
              id: "n2",
              kind: "diagnosis",
              title: { en: "HINTS", vi: "HINTS" },
              edges: [],
            },
          ],
        },
      }),
    };

    const extractRes = await handleExtractPathway(mockDepsAdmin, {
      imageBuffer: imgBuf,
      fileName: "avs.png",
      mimeType: "image/png",
      metadata: SAMPLE_META,
    });
    assert.equal(extractRes.status, 200);
    assert.equal(extractRes.body.duplicateWarning, null);

    // 3. Create draft -> 201
    const createRes = await handleCreatePathway(mockDepsAdmin, extractRes.body.draft);
    assert.equal(createRes.status, 201);
    const created = createRes.body.pathway;
    assert.equal(created.status, "draft");
    assert.ok(invalidatedTags.includes(`protocol:${created.slug}`));

    // Re-extracting same image now surfaces duplicateWarning!
    const extractDupRes = await handleExtractPathway(mockDepsAdmin, {
      imageBuffer: imgBuf,
      fileName: "avs.png",
      mimeType: "image/png",
      metadata: SAMPLE_META,
    });
    assert.equal(extractDupRes.status, 200);
    assert.ok(extractDupRes.body.duplicateWarning);
    assert.equal(extractDupRes.body.duplicates[0].uid, created.uid);

    // Duplicate create -> 409 DUPLICATE_PATHWAY
    const dupCreateRes = await handleCreatePathway(mockDepsAdmin, extractRes.body.draft);
    assert.equal(dupCreateRes.status, 409);
    assert.equal(dupCreateRes.body.code, "DUPLICATE_PATHWAY");

    // 4. Non-admin GET cannot see draft even with includeDrafts: true
    const publicList = await handleListPathways(
      { repo, isAdmin: false },
      { includeDrafts: true }
    );
    assert.equal(publicList.status, 200);
    assert.equal(publicList.body.count, 0);

    const publicGet = await handleGetPathway(
      { repo, isAdmin: false },
      created.uid,
      { includeDrafts: true }
    );
    assert.equal(publicGet.status, 404);

    // 5. Patch validation: missing baseRev -> 400; invalid publish -> 422; valid publish -> 200
    const missingRevPatch = await handlePatchPathway(mockDepsAdmin, created.uid, {
      status: "published",
    });
    assert.equal(missingRevPatch.status, 400);

    const badNodes = structuredClone(created.nodes);
    badNodes[0].edges = [];
    const badPublish = await handlePatchPathway(mockDepsAdmin, created.uid, {
      baseRev: created.rev,
      status: "published",
      nodes: badNodes,
    });
    assert.equal(badPublish.status, 422);
    assert.equal(badPublish.body.code, "VALIDATION_FAILED");

    const goodPublish = await handlePatchPathway(mockDepsAdmin, created.uid, {
      baseRev: created.rev,
      status: "published",
    });
    assert.equal(goodPublish.status, 200);
    assert.equal(goodPublish.body.pathway.status, "published");
    assert.equal(goodPublish.body.pathway.rev, 2);

    // Stale baseRev -> 409 REV_CONFLICT
    const stalePatch = await handlePatchPathway(mockDepsAdmin, created.uid, {
      baseRev: 1,
      title: { en: "Stale edit" },
    });
    assert.equal(stalePatch.status, 409);
    assert.equal(stalePatch.body.code, "REV_CONFLICT");
    assert.equal(stalePatch.body.currentRev, 2);

    // Public list now sees published pathway
    const publicPublished = await handleListPathways({ repo, isAdmin: false }, {});
    assert.equal(publicPublished.body.count, 1);

    // 6. Soft-delete & restore
    const delRes = await handleDeletePathway(mockDepsAdmin, created.uid, { baseRev: 2 });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.deletedBlockUids.length, 2);

    const afterDelPublic = await handleListPathways({ repo, isAdmin: false }, {});
    assert.equal(afterDelPublic.body.count, 0);

    const restoreRes = await handleRestorePathway(mockDepsAdmin, created.uid, {
      baseRev: delRes.body.protocol.rev,
    });
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.pathway.status, "draft");
    assert.equal(restoreRes.body.pathway.nodes.length, 2);
  });
});
