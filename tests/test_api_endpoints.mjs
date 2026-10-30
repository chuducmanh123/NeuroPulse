import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("API Catalog route reads data/guidelines_store/catalog.json correctly", async () => {
  const catalogPath = path.join(process.cwd(), "data", "guidelines_store", "catalog.json");
  assert.ok(fs.existsSync(catalogPath), "catalog.json must exist");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
  assert.ok(typeof catalog === "object", "catalog must be an object");
});

test("API Review Queue reads _latest.json records correctly", async () => {
  const storeDir = path.join(process.cwd(), "data", "guidelines_store");
  const files = fs.readdirSync(storeDir).filter(f => f.endsWith("_latest.json"));
  assert.ok(files.length > 0, "Must have at least one _latest.json file");

  const latestPath = path.join(storeDir, files[0]);
  const rec = JSON.parse(fs.readFileSync(latestPath, "utf-8"));
  assert.ok(rec.guideline_id, "Record must have guideline_id");
  assert.ok(Array.isArray(rec.recommendations), "Record must have recommendations list");
});

test("API Pipeline Jobs file is valid if present", async () => {
  const jobsFile = path.join(process.cwd(), "data", "guidelines_store", "jobs.json");
  if (fs.existsSync(jobsFile)) {
    const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
    assert.ok(typeof jobs === "object");
  }
});
