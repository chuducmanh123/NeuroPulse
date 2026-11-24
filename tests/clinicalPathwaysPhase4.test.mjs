import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearLocalPathwayDraft,
  createBlankChecklistItem,
  createBlankEdge,
  createBlankNode,
  createStarterPathwayDraft,
  deleteNodeAndCleanupEdges,
  loadLocalPathwayDraft,
  saveLocalPathwayDraft,
} from "../src/lib/neuroguide/pathwayEditorUtils.ts";
import { validateClinicalPathway } from "../src/lib/neuroguide/pathwayValidator.ts";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe("Phase 4 — PathwayAdminModal Editor Utils & Local Autosave", () => {
  it("persists, recovers, handles corrupted JSON, and clears localStorage drafts", () => {
    const storage = createMemoryStorage();
    const starter = createStarterPathwayDraft({
      titleEn: "Acute Stroke IVT",
      sourceType: "guideline",
      sourceTitle: "2026 AHA/ASA AIS Guideline",
      organizationOrAuthor: "AHA/ASA",
      year: 2026,
      subspecialty: "Stroke",
      domain: "treatment",
      sourceImageUrl: "/uploads/pathways/ivt.png",
    });

    saveLocalPathwayDraft(
      "new",
      { doc: starter, baseRev: 1, savedAt: "2026-11-24T00:00:00.000Z" },
      storage
    );

    const loaded = loadLocalPathwayDraft("new", storage);
    assert.ok(loaded);
    assert.equal(loaded.baseRev, 1);
    assert.equal(loaded.doc.title.en, "Acute Stroke IVT");

    // Corrupted JSON returns null safely
    storage.setItem("neuroguide:pathway-editor-draft:bad", "{not-json");
    assert.equal(loadLocalPathwayDraft("bad", storage), null);

    clearLocalPathwayDraft("new", storage);
    assert.equal(loadLocalPathwayDraft("new", storage), null);
  });

  it("createStarterPathwayDraft produces a valid publishable 2-node starter graph", () => {
    const starter = createStarterPathwayDraft({
      titleEn: "Acute Vertigo HINTS",
      sourceType: "textbook",
      sourceTitle: "Adams & Victor",
      organizationOrAuthor: "Ropper",
      year: 2023,
      subspecialty: "Stroke",
      domain: "diagnosis",
      sourceImageUrl: "/uploads/pathways/hints.png",
    });

    assert.equal(starter.status, "draft");
    assert.equal(starter.entryNodeId, "n1");
    assert.equal(starter.nodes.length, 2);
    assert.equal(starter.nodes[1].kind, "diagnosis");
    const val = validateClinicalPathway(starter);
    assert.equal(val.canPublish, true);
  });

  it("createBlankNode, createBlankEdge, createBlankChecklistItem generate unique IDs and deleteNodeAndCleanupEdges cleans references", () => {
    const starter = createStarterPathwayDraft({
      titleEn: "Test Pathway",
      sourceType: "guideline",
      sourceTitle: "ESO",
      organizationOrAuthor: "ESO",
      year: 2025,
      subspecialty: "Stroke",
      domain: "treatment",
      sourceImageUrl: "/img.png",
    });

    const n3 = createBlankNode(starter.nodes);
    assert.equal(n3.id, "n3");

    const e2 = createBlankEdge("n1", starter.nodes[0].edges, "n3");
    assert.equal(e2.id, "n1_e2");

    const c1 = createBlankChecklistItem("n2", []);
    assert.equal(c1.id, "n2_c1");

    const withN3 = { ...starter, nodes: [...starter.nodes, n3] };
    // Delete n2 -> n1_e1 pointing to n2 should be stripped cleanly
    const afterDelN2 = deleteNodeAndCleanupEdges(withN3, "n2");
    assert.equal(afterDelN2.nodes.length, 2);
    assert.equal(afterDelN2.nodes[0].edges.length, 0);
    assert.equal(afterDelN2.entryNodeId, "n1");

    // Delete entry node n1 -> entryNodeId reassigned to first remaining node
    const afterDelN1 = deleteNodeAndCleanupEdges(withN3, "n1");
    assert.equal(afterDelN1.entryNodeId, "n2");
  });
});
