import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { runClinicalNavigatorQuery } from "../src/lib/neuroguide/clinicalNavigatorEngine.ts";
import { classifyPivotalTrialV3 } from "../src/lib/neuroguide/clinicalNavigatorV3Classifier.ts";

describe("Acute Stroke Studies Time Window Labeling & Navigator Integration", () => {
  const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
  const cloud = JSON.parse(fs.readFileSync(cloudPath, "utf-8"));
  const trials = cloud.pivotalTrials || [];

  it("should have zero trials with missing pico.timeWindow", () => {
    const missing = trials.filter((t) => !t.pico?.timeWindow);
    assert.equal(missing.length, 0, `Found trials without timeWindow: ${missing.map((t) => t.id).join(", ")}`);
  });

  it("should have valid v3Tags.timeWindowIds for all acute stroke trials", () => {
    const acuteStrokeTrials = trials.filter(
      (t) =>
        t.subspecialty === "Stroke" &&
        t.v3Tags?.conditionIds?.some((c) =>
          ["cond_ischemic_stroke", "cond_ich", "cond_sah", "cond_tia", "cond_cvt"].includes(c)
        )
    );

    assert.ok(acuteStrokeTrials.length >= 60, "Expected at least 60 stroke trials in database");

    // Spot-check landmark trials
    const ninds = trials.find((t) => t.id === "ninds-rtpa-1995");
    assert.ok(ninds, "NINDS trial not found");
    assert.match(ninds.pico.timeWindow, /≤ 3 hours/i);
    assert.deepEqual(ninds.v3Tags.timeWindowIds, ["cond_ischemic_stroke_tw_early_window_le_4_5h"]);

    const act = trials.find((t) => t.id === "act-2022");
    assert.ok(act, "AcT trial not found");
    assert.match(act.pico.timeWindow, /≤ 4.5 hours/i);
    assert.deepEqual(act.v3Tags.timeWindowIds, ["cond_ischemic_stroke_tw_early_window_le_4_5h"]);

    const dawn = trials.find((t) => t.id === "dawn-2018");
    assert.ok(dawn, "DAWN trial not found");
    assert.match(dawn.pico.timeWindow, /6 to 24 hours/i);
    assert.ok(dawn.v3Tags.timeWindowIds.includes("cond_ischemic_stroke_tw_extended_window_4_5h_24h"));

    const enrich = trials.find((t) => t.id === "enrich-2024");
    assert.ok(enrich, "ENRICH trial not found");
    assert.match(enrich.pico.timeWindow, /≤ 24 hours/i);
    assert.deepEqual(enrich.v3Tags.timeWindowIds, ["cond_ich_tw_acute_window_6h_24h"]);

    const interact2 = trials.find((t) => t.id === "interact2-2013");
    assert.ok(interact2, "INTERACT2 trial not found");
    assert.match(interact2.pico.timeWindow, /≤ 6 hours/i);
    assert.deepEqual(interact2.v3Tags.timeWindowIds, ["cond_ich_tw_hyperacute_lt_6h"]);
  });

  it("should accurately filter pivotal trials by timeWindowId in queryClinicalNavigator", () => {
    // 1. Query for Early Window (≤ 4.5h) in Ischemic Stroke
    const earlyResult = runClinicalNavigatorQuery({
      guidelines: cloud.guidelines,
      conferences: cloud.conferences,
      scenarios: cloud.scenarios,
      customPivotalTrials: trials,
      query: {
        subspecialty: "Stroke",
        conditionId: "cond_ischemic_stroke",
        timeWindowId: "cond_ischemic_stroke_tw_early_window_le_4_5h",
      },
    });

    const earlyAcronyms = earlyResult.pivotalTrials.map((t) => t.acronym);
    assert.ok(earlyAcronyms.includes("AcT"), "AcT must be present in Early Window (≤ 4.5h)");
    assert.ok(earlyAcronyms.includes("TRACE-2"), "TRACE-2 must be present in Early Window (≤ 4.5h)");
    assert.ok(earlyAcronyms.includes("NINDS tPA"), "NINDS tPA must be present in Early Window (≤ 4.5h)");
    assert.ok(!earlyAcronyms.includes("DAWN"), "DAWN (6-24h) must NOT be present in Early Window (≤ 4.5h)");
    assert.ok(!earlyAcronyms.includes("BAOCHE"), "BAOCHE (6-24h) must NOT be present in Early Window (≤ 4.5h)");

    // 2. Query for Extended Window (4.5h–24h) in Ischemic Stroke
    const lateResult = runClinicalNavigatorQuery({
      guidelines: cloud.guidelines,
      conferences: cloud.conferences,
      scenarios: cloud.scenarios,
      customPivotalTrials: trials,
      query: {
        subspecialty: "Stroke",
        conditionId: "cond_ischemic_stroke",
        timeWindowId: "cond_ischemic_stroke_tw_extended_window_4_5h_24h",
      },
    });

    const lateAcronyms = lateResult.pivotalTrials.map((t) => t.acronym);
    assert.ok(lateAcronyms.includes("DAWN"), "DAWN must be present in Extended Window (4.5-24h)");
    assert.ok(lateAcronyms.includes("DEFUSE-3"), "DEFUSE-3 must be present in Extended Window (4.5-24h)");
    assert.ok(lateAcronyms.includes("SELECT2"), "SELECT2 must be present in Extended Window (4.5-24h)");
    assert.ok(lateAcronyms.includes("ESCAPE"), "ESCAPE must be present in Extended Window (4.5-24h)");
    assert.ok(!lateAcronyms.includes("NINDS tPA"), "NINDS tPA (0-3h) must NOT be present in Extended Window");
  });
});
