import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildStackSummaryText,
  buildVisibleStack,
  isRedundantEchoNode,
  parseClinicalBodyBlocks,
  resolveChoiceGridLayout,
  selectDecisionAt,
} from "../src/lib/neuroguide/pathwayRunnerUtils.ts";
import { normalizeExtractedPathwayPayload } from "../src/lib/neuroguide/pathwayExtractor.ts";
import {
  callGeminiWaterfallJson,
  GEMINI_WATERFALL_MODELS,
} from "../src/lib/gemini/models.ts";
import { validateClinicalPathway } from "../src/lib/neuroguide/pathwayValidator.ts";
import { createPathwayDraft, updatePathway } from "../src/lib/neuroguide/pathwayService.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import { pullLivePathwaysToLocal } from "../scripts/neuroguide/pull-pathways.ts";

function makeAhaBpPathway() {
  return {
    uid: "aha-bp-1",
    slug: "aha-bp-thresholds-2025",
    title: { en: "BP Thresholds and Recommendations", vi: "Ngưỡng huyết áp và khuyến cáo" },
    subspecialty: "Stroke",
    domain: "treatment",
    source: {
      sourceType: "guideline",
      title: "2025 High Blood Pressure Guideline",
      organizationOrAuthor: "AHA/ACC",
      year: 2025,
      figureRef: "Figure 7",
    },
    sourceImageUrl: "/uploads/pathways/bp.png",
    abbreviations: [
      { term: "BP", expansion: { en: "Blood pressure" } },
      { term: "DM", expansion: { en: "Diabetes mellitus" } },
    ],
    footnotes: [
      { symbol: "*", text: { en: "Based on PREVENT calculator." } },
    ],
    entryNodeId: "n_bp",
    nodes: [
      {
        id: "n_bp",
        kind: "decision",
        title: { en: "Patient's BP Thresholds" },
        edges: [
          { id: "e_normal", label: { en: "Normal BP (<120/80 mm Hg)" }, targetNodeId: "n_lifestyle" },
          { id: "e_stage1", label: { en: "Stage 1 Hypertension" }, targetNodeId: "n_banner" },
          { id: "e_stage2", label: { en: "Stage 2 Hypertension" }, targetNodeId: "n_stage2_med" },
          { id: "e_elev", label: { en: "Elevated BP" }, targetNodeId: "n_lifestyle" },
        ],
      },
      {
        id: "n_banner",
        kind: "section",
        title: { en: "Promote Lifestyle Therapy at All Thresholds" },
        edges: [{ id: "e_b1", label: { en: "Next" }, targetNodeId: "n_lifestyle_1" }],
      },
      {
        id: "n_lifestyle_1",
        kind: "action",
        title: { en: "Lifestyle therapy" },
        tier: 1,
        evidenceBadge: "Class 1",
        edges: [{ id: "e_l1", label: { en: "Next" }, targetNodeId: "n_dm_ckd" }],
      },
      {
        id: "n_dm_ckd",
        kind: "decision",
        title: { en: "DM, CKD or 10-year PREVENT risk >=7.5%?" },
        edges: [
          { id: "e_no", label: { en: "No" }, targetNodeId: "n_reassess_3_6" },
          { id: "e_yes", label: { en: "Yes" }, targetNodeId: "n_med_compound" },
        ],
      },
      {
        id: "n_reassess_3_6",
        kind: "treatment",
        title: { en: "Reassess in 3-6 mo" },
        tier: 1,
        evidenceBadge: "Class 1",
        edges: [],
      },
      {
        id: "n_stage2_med",
        kind: "action",
        title: { en: "Lifestyle therapy" },
        tier: 1,
        evidenceBadge: "Class 1",
        edges: [{ id: "e_s2", label: { en: "Next" }, targetNodeId: "n_med_compound" }],
      },
      {
        id: "n_med_compound",
        kind: "action",
        title: { en: "BP-lowering medication AND Reassess in 1 mo" },
        compoundOperator: "AND",
        compoundItems: [
          { title: { en: "BP-lowering medication" }, tier: 1, evidenceBadge: "Class 1" },
          { title: { en: "Reassess in 1 mo" }, tier: 1, evidenceBadge: "Class 1" },
        ],
        edges: [{ id: "e_goal", label: { en: "Next" }, targetNodeId: "n_goal_met" }],
      },
      {
        id: "n_goal_met",
        kind: "decision",
        title: { en: "BP goal met?" },
        edges: [
          { id: "e_goal_no", label: { en: "No" }, targetNodeId: "n_intensify" },
          { id: "e_goal_yes", label: { en: "Yes" }, targetNodeId: "n_reassess_3_6" },
        ],
      },
      {
        id: "n_intensify",
        kind: "action",
        title: { en: "Consider intensification of therapy while optimizing adherence" },
        edges: [
          {
            id: "e_loop_med",
            label: { en: "Re-evaluate BP-lowering medication" },
            targetNodeId: "n_med_compound",
            autoUnrollLoop: true,
          },
        ],
      },
      {
        id: "n_lifestyle",
        kind: "treatment",
        title: { en: "Lifestyle therapy" },
        tier: 1,
        evidenceBadge: "Class 1",
        edges: [],
      },
    ],
    status: "published",
    rev: 1,
    createdAt: "2026-11-26T00:00:00.000Z",
    updatedAt: "2026-11-26T00:00:00.000Z",
  };
}

describe("Phase 5 — AHA Progressive Vertical Stack, Extractor Rules & Local Sync", () => {
  it("resolveChoiceGridLayout selects binary, row3, grid2, and stack accurately", () => {
    assert.equal(
      resolveChoiceGridLayout([
        { id: "1", label: { en: "No" }, targetNodeId: "a" },
        { id: "2", label: { en: "Yes" }, targetNodeId: "b" },
      ]),
      "binary"
    );
    assert.equal(
      resolveChoiceGridLayout([
        { id: "1", label: { en: "LDL-C <55 mg/dL" }, targetNodeId: "a" },
        { id: "2", label: { en: "LDL-C 55-69 mg/dL" }, targetNodeId: "b" },
        { id: "3", label: { en: "LDL-C >=70 mg/dL" }, targetNodeId: "c" },
      ]),
      "row3"
    );
    assert.equal(
      resolveChoiceGridLayout([
        { id: "1", label: { en: "Normal BP (<120/80 mm Hg)" }, targetNodeId: "a" },
        { id: "2", label: { en: "Elevated BP" }, targetNodeId: "b" },
        { id: "3", label: { en: "Stage 1 Hypertension" }, targetNodeId: "c" },
        { id: "4", label: { en: "Stage 2 Hypertension" }, targetNodeId: "d" },
      ]),
      "grid2"
    );
    assert.equal(
      resolveChoiceGridLayout([
        { id: "1", label: { en: "Very long clinical option description exceeding 44 characters threshold" }, targetNodeId: "a" },
        { id: "2", label: { en: "Short" }, targetNodeId: "b" },
      ]),
      "stack"
    );
  });

  it("buildVisibleStack auto-unfolds linear chains, switches branches inline, and unrolls loop once", () => {
    const pathway = makeAhaBpPathway();

    // Initial state: stops at n_bp (first decision)
    const stack0 = buildVisibleStack(pathway, []);
    assert.equal(stack0.length, 1);
    assert.equal(stack0[0].node.id, "n_bp");
    assert.equal(stack0[0].isInteractive, true);
    assert.equal(stack0[0].choiceLayout, "grid2");

    // Select Stage 1 -> auto-unfolds section banner + lifestyle_1 -> stops at n_dm_ckd
    let decisions = selectDecisionAt([], stack0[0].instanceKey, "n_bp", "e_stage1");
    const stack1 = buildVisibleStack(pathway, decisions);
    assert.deepEqual(
      stack1.map((s) => s.node.id),
      ["n_bp", "n_banner", "n_lifestyle_1", "n_dm_ckd"]
    );
    assert.equal(stack1[3].choiceLayout, "binary");

    // Inline switch on n_bp from Stage 1 -> Stage 2: truncates downstream & unfolds Stage 2 path
    decisions = selectDecisionAt(decisions, stack0[0].instanceKey, "n_bp", "e_stage2");
    const stack2 = buildVisibleStack(pathway, decisions);
    assert.deepEqual(
      stack2.map((s) => s.node.id),
      ["n_bp", "n_stage2_med", "n_med_compound", "n_goal_met"]
    );

    // Select BP goal met = No -> unrolls n_intensify -> n_med_compound#1 -> stops at n_goal_met#1
    decisions = selectDecisionAt(decisions, stack2[3].instanceKey, "n_goal_met", "e_goal_no");
    const stack3 = buildVisibleStack(pathway, decisions);
    assert.deepEqual(
      stack3.map((s) => s.instanceKey),
      ["n_bp#0", "n_stage2_med#0", "n_med_compound#0", "n_goal_met#0", "n_intensify#0", "n_med_compound#1", "n_goal_met#1"]
    );
    assert.equal(stack3[5].isLoopIteration, true);

    const summary = buildStackSummaryText(pathway, stack3, "en");
    assert.match(summary, /BP-lowering medication AND Reassess in 1 mo/);
  });

  it("isRedundantEchoNode suppresses empty wrapper nodes without hiding clinical content", () => {
    const incomingEdge = { id: "e1", label: { en: "Rate control" }, targetNodeId: "n2" };
    assert.equal(
      isRedundantEchoNode(
        {
          id: "n2",
          kind: "decision",
          title: { en: "Rate control" },
          edges: [{ id: "e2", label: { en: "Proceed" }, targetNodeId: "n3" }],
        },
        incomingEdge
      ),
      true
    );
    assert.equal(
      isRedundantEchoNode(
        {
          id: "n2",
          kind: "action",
          title: { en: "Rate control" },
          body: { en: "Use beta-blocker" },
          edges: [{ id: "e2", label: { en: "Proceed" }, targetNodeId: "n3" }],
        },
        incomingEdge
      ),
      false
    );
  });

  it("parseClinicalBodyBlocks splits paragraphs and bullet items cleanly", () => {
    const blocks = parseClinicalBodyBlocks("Any of:\n• GRACE >140\n• Dynamic ST changes");
    assert.equal(blocks.length, 2);
    assert.deepEqual(blocks[0], { type: "paragraph", lines: ["Any of:"] });
    assert.deepEqual(blocks[1], {
      type: "bullets",
      lines: ["GRACE >140", "Dynamic ST changes"],
    });
  });

  it("normalizeExtractedPathwayPayload parses AHA extensions, strips tier from decision nodes, and compacts echo nodes", () => {
    const raw = {
      title: { en: "Test AHA Pathway", vi: "Lưu đồ thử nghiệm" },
      entryNodeId: "n1",
      abbreviations: [{ term: "EVT", expansion: { en: "Endovascular thrombectomy", vi: "Lấy huyết khối" } }],
      footnotes: [{ symbol: "*", text: { en: "LVO definition", vi: "Định nghĩa LVO" } }],
      nodes: [
        {
          id: "n1",
          kind: "decision",
          title: { en: "Eligible?" },
          tier: 1, // Should be stripped from decision node!
          evidenceBadge: "COR 1",
          edges: [
            { id: "e1", label: { en: "Yes" }, targetNodeId: "n_echo" },
            { id: "e2", label: { en: "No" }, targetNodeId: "n_end" },
          ],
        },
        {
          id: "n_echo",
          kind: "decision",
          title: { en: "Yes" }, // Pure echo node -> should be compacted!
          edges: [{ id: "e3", label: { en: "Next" }, targetNodeId: "n_compound" }],
        },
        {
          id: "n_compound",
          kind: "treatment",
          title: { en: "Paired Therapy" },
          compoundOperator: "AND",
          compoundItems: [
            { title: { en: "Drug A" }, tier: 1, evidenceBadge: "Class 1" },
            { title: { en: "Reassess" }, tier: 2, evidenceBadge: "Class 2a" },
          ],
          edges: [],
        },
        {
          id: "n_end",
          kind: "criteria",
          title: { en: "Any of:" },
          body: { en: "• Criterion 1" },
          edges: [],
        },
      ],
    };

    const { draft, validation } = normalizeExtractedPathwayPayload(raw, {
      imageUrl: "/uploads/pathways/test.png",
      imageSha256: "d".repeat(64),
      mimeType: "image/png",
      metadata: {
        sourceType: "guideline",
        sourceTitle: "AHA 2026",
        organizationOrAuthor: "AHA",
        year: 2026,
        subspecialty: "Stroke",
        domain: "treatment",
      },
      model: "gemini-test",
    });

    assert.equal(draft.nodes[0].tier, undefined);
    assert.equal(draft.nodes[0].evidenceBadge, undefined);
    assert.equal(draft.nodes.some((n) => n.id === "n_echo"), false);
    assert.equal(draft.nodes[0].edges[0].targetNodeId, "n_compound");
    assert.equal(draft.abbreviations?.length, 1);
    assert.equal(draft.footnotes?.length, 1);
    assert.equal(draft.nodes[1].compoundOperator, "AND");
    assert.equal(draft.nodes[1].compoundItems?.length, 2);
    assert.equal(validation.canPublish, true);
    assert.equal(validateClinicalPathway(draft).canPublish, true);

    // Terminal 'action' leaf promotion + bilingual Continue fallback on unnamed single-edge transition
    const leafTest = normalizeExtractedPathwayPayload(
      {
        title: { en: "Leaf Promotion Test", vi: "Kiểm tra node cuối" },
        entryNodeId: "s1",
        nodes: [
          {
            id: "s1",
            kind: "section",
            title: { en: "Section Banner", vi: "Phân đoạn" },
            edges: [{ id: "e_unnamed", label: "", targetNodeId: "a1" }],
          },
          {
            id: "a1",
            kind: "action",
            title: { en: "Reassess in 1 y", vi: "Đánh giá lại sau 1 năm" },
            edges: [],
          },
        ],
      },
      {
        imageUrl: "/uploads/pathways/test2.png",
        imageSha256: "e".repeat(64),
        mimeType: "image/png",
        metadata: {
          sourceType: "guideline",
          sourceTitle: "AHA 2026",
          organizationOrAuthor: "AHA",
          year: 2026,
          subspecialty: "Stroke",
          domain: "treatment",
        },
        model: "gemini-test",
      }
    );
    assert.deepEqual(leafTest.draft.nodes[0].edges[0].label, {
      en: "Continue",
      vi: "Tiếp tục",
    });
    assert.equal(leafTest.draft.nodes[1].kind, "treatment");
    assert.equal(
      leafTest.validation.warnings.some((w) => w.code === "NON_TERMINAL_LEAF"),
      false
    );
  });

  it("pullLivePathwaysToLocal writes snapshot & per-slug mirror and prunes stale files", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const p = makeAhaBpPathway();
    const { pathway } = await createPathwayDraft(repo, p, "tester");
    await updatePathway(repo, pathway.uid, pathway.rev, { status: "published" }, "tester");

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ng-pull-test-"));
    const snapshotPath = path.join(tmpRoot, "neuroguide_pathways.json");
    const mirrorDir = path.join(tmpRoot, "mirror");
    fs.mkdirSync(mirrorDir, { recursive: true });
    fs.writeFileSync(path.join(mirrorDir, "stale-old-pathway.json"), "{}", "utf-8");

    const res = await pullLivePathwaysToLocal({
      repo,
      snapshotPath,
      mirrorDir,
      prune: true,
    });

    assert.equal(res.written, 1);
    assert.deepEqual(res.pruned, ["stale-old-pathway.json"]);
    assert.ok(fs.existsSync(snapshotPath));
    assert.ok(fs.existsSync(path.join(mirrorDir, `${pathway.slug}.json`)));
    assert.equal(fs.existsSync(path.join(mirrorDir, "stale-old-pathway.json")), false);

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("callGeminiWaterfallJson prioritizes Gen-4 waterfall, skips thought parts, and strips markdown fences", async () => {
    assert.equal(GEMINI_WATERFALL_MODELS[0], "gemini-4-hydrogen");

    const visitedModels = [];
    const mockFetch = async (url) => {
      const m = String(url).match(/models\/([^:]+):generateContent/);
      visitedModels.push(m ? m[1] : "unknown");
      if (visitedModels.length === 1) {
        return new Response("Rate Limited", { status: 429, statusText: "Too Many Requests" });
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: "internal reasoning...", thought: true },
                  { text: "```json\n{\"ok\":true,\"value\":42}\n```" },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const res = await callGeminiWaterfallJson({
      source: "test/waterfall",
      apiKey: "test-key",
      parts: [{ text: "hello" }],
      models: ["gemini-4-hydrogen", "gemini-3.6-flash"],
      fetchImpl: mockFetch,
    });

    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.model, "gemini-3.6-flash");
      assert.deepEqual(res.data, { ok: true, value: 42 });
    }
    assert.deepEqual(visitedModels, ["gemini-4-hydrogen", "gemini-3.6-flash"]);
  });

  it("regression: all 10 pulled local pathways unfold cleanly without loops or crashes", () => {
    const snapshotFile = path.resolve(process.cwd(), "public", "data", "neuroguide_pathways.json");
    assert.ok(fs.existsSync(snapshotFile), "public/data/neuroguide_pathways.json must exist");
    const parsed = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
    assert.ok(Array.isArray(parsed.pathways) && parsed.pathways.length >= 10);

    for (const pathway of parsed.pathways) {
      const initialStack = buildVisibleStack(pathway, []);
      assert.ok(
        initialStack.length >= 1,
        `Pathway ${pathway.slug} should render at least 1 card initially`
      );
      const last = initialStack[initialStack.length - 1];
      assert.ok(
        last.isInteractive || last.isTerminal || Boolean(last.manualLoopEdge),
        `Pathway ${pathway.slug} initial stack should stop at decision, terminal, or loop trigger`
      );
    }
  });
});
