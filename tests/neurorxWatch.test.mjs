import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSourceDrugMap,
  detectVersionChange,
  runLabelWatcher,
} from "../scripts/neurorx/watch-labels.ts";

test("Label Watcher: buildSourceDrugMap maps sources across regimens and tools", () => {
  const fakeDrugs = [
    {
      id: "drug-alpha",
      generic_name: "alpha",
      tall_man: { value: "alpha", refs: [{ source_id: "src-1", locator: "p.1", quote: "q" }] },
      regimens: [
        {
          id: "r1",
          indication: "Indication 1",
          setting: "acute_inpatient",
          refs: [{ source_id: "src-2", locator: "p.2", quote: "q" }],
        },
      ],
    },
    {
      id: "drug-beta",
      generic_name: "beta",
      tall_man: { value: "beta", refs: [{ source_id: "src-1", locator: "p.1", quote: "q" }] },
    },
  ];

  const map = buildSourceDrugMap(fakeDrugs);
  assert.deepEqual(map.get("src-1"), ["drug-alpha", "drug-beta"]);
  assert.deepEqual(map.get("src-2"), ["drug-alpha"]);
  assert.equal(map.get("src-unknown"), undefined);
});

test("Label Watcher: detectVersionChange handles unchanged vs changed versions", () => {
  const source = {
    id: "fda-apixaban",
    version: "set-id-v1",
    url: "https://dailymed.nlm.nih.gov/v1",
  };

  // Same version -> null
  assert.equal(detectVersionChange(source, "set-id-v1", ["apixaban"], []), null);

  // Changed version -> creates item
  const update = detectVersionChange(source, "set-id-v2", ["apixaban"], []);
  assert.ok(update);
  assert.equal(update.source_id, "fda-apixaban");
  assert.equal(update.old_version, "set-id-v1");
  assert.equal(update.new_version, "set-id-v2");
  assert.deepEqual(update.drug_ids, ["apixaban"]);
  assert.equal(update.status, "pending");
});

test("Label Watcher: Idempotency prevents duplicate pending updates", () => {
  const source = {
    id: "fda-apixaban",
    version: "set-id-v1",
  };

  const existingQueue = [
    {
      id: "update-1",
      source_id: "fda-apixaban",
      drug_ids: ["apixaban"],
      old_version: "set-id-v1",
      new_version: "set-id-v2",
      detected_at: "2026-11-10T00:00:00Z",
      url: "https://dailymed...",
      status: "pending",
    },
  ];

  // Identical new_version already pending -> should return null
  assert.equal(detectVersionChange(source, "set-id-v2", ["apixaban"], existingQueue), null);

  // Different newer version -> creates new entry
  const newerUpdate = detectVersionChange(source, "set-id-v3", ["apixaban"], existingQueue);
  assert.ok(newerUpdate);
  assert.equal(newerUpdate.new_version, "set-id-v3");
});
