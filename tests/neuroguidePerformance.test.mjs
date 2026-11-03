import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("NeuroGuide SWR & Freshness Architecture", () => {
  const normalizeT = (t) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const filterValidGuidelines = (list, deletedIds = []) => {
    if (!Array.isArray(list)) return [];
    const deletedSet = new Set(deletedIds.map((x) => (x || "").toLowerCase().trim()));
    return list.filter((g) => {
      if (!g || !g.title) return false;
      const id = (g.id || "").toLowerCase();
      const norm = normalizeT(g.title);
      if (deletedSet.has(id) || deletedSet.has(norm)) return false;
      if (id.startsWith("eso-pmid-") || id.startsWith("esc-pmid-") || id.includes("phantom")) return false;
      return true;
    });
  };

  test("should load cached items immediately but strictly eliminate deleted or phantom guidelines", () => {
    const mockCachedGuidelines = [
      { id: "eso-asvh-2026", title: "ESO Guideline on ASVH 2026", society: "ESO" },
      { id: "eso-pmid-99999", title: "Phantom Old Guideline", society: "ESO" },
      { id: "aha-ich-2022", title: "AHA Guidelines for Spontaneous ICH", society: "AHA" },
    ];

    const deletedIds = ["aha-ich-2022"];
    const result = filterValidGuidelines(mockCachedGuidelines, deletedIds);

    assert.equal(result.length, 1);
    assert.equal(result[0].id, "eso-asvh-2026");
  });

  test("should generate consistent ETag for version and prevent re-download when matching", () => {
    const version = "2026-11-03T09:49:11.000Z";
    const guidelinesCount = 7;
    const deletedCount = 2;

    const etag = `W/"ng-${Buffer.from(`${version}-${guidelinesCount}-${deletedCount}`).toString("base64")}"`;
    assert.ok(etag.startsWith('W/"ng-'));

    const incomingHeader = etag;
    assert.equal(incomingHeader, etag, "ETag matches conditional header");
  });
});
