import test from "node:test";
import assert from "node:assert/strict";
import { applyQuoteGuard, verifyQuoteInSource } from "../src/lib/neurorx/extractGuard.ts";

const SAMPLE_SOURCE_TEXT = `
HIGHLIGHTS OF PRESCRIBING INFORMATION
These highlights do not include all the information needed to use VIMPAT safely and effectively.
VIMPAT (lacosamide) tablets, oral solution, and injection.

INDICATIONS AND USAGE
VIMPAT is indicated for the treatment of partial-onset seizures in patients 4 years of age and older.

DOSAGE AND ADMINISTRATION
The initial recommended dosage is 50 mg twice daily (100 mg per day).
Based on individual patient response and tolerability, the dosage may be increased at weekly intervals by 50 mg twice daily.
The maximum recommended daily dosage is 400 mg per day.

USE IN SPECIFIC POPULATIONS
8.6 Hepatic Impairment
For patients with mild to moderate hepatic impairment, the maximum recommended dosage is 300 mg per day.
`;

test("verifyQuoteInSource detects verbatim quotes and rejects non-matching", () => {
  const normSource = "vimpat is indicated for the treatment of partial-onset seizures in patients 4 years of age and older.";

  const valid = verifyQuoteInSource(
    {
      source_id: "fda-vimpat",
      locator: "Section 1",
      quote: "VIMPAT is indicated for the treatment of partial-onset seizures",
    },
    normSource
  );
  assert.equal(valid.valid, true);

  const invalid = verifyQuoteInSource(
    {
      source_id: "fda-vimpat",
      locator: "Section 1",
      quote: "VIMPAT is indicated for treating heart failure",
    },
    normSource
  );
  assert.equal(invalid.valid, false);
  assert.match(invalid.reason, /not found verbatim/i);
});

test("applyQuoteGuard nulls fields with fabricated quotes and populates rejectedValues", () => {
  const mockedModelDraft = {
    id: "lacosamide",
    generic_name: "lacosamide",
    status: "verified", // Model tries to set verified
    verification: {
      verified_by: "Dr. AI",
      verified_at: "2026-11-11",
      content_hash: "abcd1234fakehash",
    },
    classes: ["anti_seizure_medication"],
    subspecialties: ["epilepsy"],
    tall_man: {
      value: "lacosamide",
      refs: [
        {
          source_id: "fda-vimpat",
          locator: "Highlights",
          quote: "VIMPAT (lacosamide) tablets, oral solution, and injection.",
        },
      ],
    },
    hepatic: {
      value: "Max dosage 300 mg per day in mild to moderate impairment",
      refs: [
        {
          source_id: "fda-vimpat",
          locator: "Section 8.6",
          quote: "For patients with mild to moderate hepatic impairment, the maximum recommended dosage is 300 mg per day.",
        },
      ],
    },
    black_box: {
      value: ["Risk of severe cardiac arrest"], // FABRICATED VALUE AND QUOTE
      refs: [
        {
          source_id: "fda-vimpat",
          locator: "Boxed Warning",
          quote: "WARNING: RISK OF SUDDEN CARDIAC DEATH AND ARREST IN ALL PATIENTS",
        },
      ],
    },
    regimens: [
      {
        id: "lacosamide-partial-onset",
        indication: "Partial-onset seizures",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          {
            source_id: "fda-vimpat",
            locator: "Section 1",
            quote: "VIMPAT is indicated for the treatment of partial-onset seizures in patients 4 years of age and older.",
          },
        ],
        dose: {
          kind: "fixed",
          amount: 50,
          unit: "mg",
          frequency: "BID",
        },
      },
      {
        id: "lacosamide-fabricated-indication",
        indication: "Fabricated indication",
        setting: "acute_inpatient",
        route: "IV",
        refs: [
          {
            source_id: "fda-vimpat",
            locator: "Section 99",
            quote: "This medicine should be taken 1000 mg IV stat for headache",
          },
        ],
        dose: {
          kind: "fixed",
          amount: 1000,
          unit: "mg",
          frequency: "once",
        },
      },
    ],
  };

  const result = applyQuoteGuard(mockedModelDraft, SAMPLE_SOURCE_TEXT);

  // 1. Invariants
  assert.equal(result.guardedDraft.status, "draft");
  assert.equal(result.guardedDraft.verification.verified_by, null);
  assert.equal(result.guardedDraft.verification.verified_at, null);
  assert.equal(result.guardedDraft.verification.content_hash, null);

  // 2. Valid fields remain untouched
  assert.equal(result.guardedDraft.tall_man.value, "lacosamide");
  assert.equal(
    result.guardedDraft.hepatic.value,
    "Max dosage 300 mg per day in mild to moderate impairment"
  );
  assert.equal(result.guardedDraft.regimens[0].dose?.amount, 50);

  // 3. Fabricated black_box must be nulled
  assert.equal(result.guardedDraft.black_box.value, null);
  assert.equal(result.guardedDraft.black_box.refs.length, 0);

  // 4. Fabricated regimen refs must fail and dose nulled
  assert.equal(result.guardedDraft.regimens[1].dose, null);

  // 5. Rejected values list must contain the fabricated items
  assert.ok(result.rejectedValues.length >= 2);
  const blackBoxRejection = result.rejectedValues.find((r) => r.path === "black_box");
  assert.ok(blackBoxRejection);
  assert.match(blackBoxRejection.reason, /not found verbatim/i);
  assert.equal(
    blackBoxRejection.attempted_quote,
    "WARNING: RISK OF SUDDEN CARDIAC DEATH AND ARREST IN ALL PATIENTS"
  );
});

test("applyQuoteGuard rejects quotes exceeding 400 characters", () => {
  const longQuote = "A".repeat(450);
  const draft = {
    id: "test",
    tall_man: {
      value: "test",
      refs: [
        {
          source_id: "src",
          locator: "sec",
          quote: longQuote,
        },
      ],
    },
  };

  const res = applyQuoteGuard(draft, longQuote);
  assert.equal(res.guardedDraft.tall_man.value, null);
  assert.ok(res.rejectedValues.some((r) => r.reason.includes("exceeds 400 characters")));
});

test("applyQuoteGuard rejects non-null value with empty refs", () => {
  const draft = {
    id: "test",
    hepatic: {
      value: "No adjustment",
      refs: [],
    },
  };

  const res = applyQuoteGuard(draft, "some text");
  assert.equal(res.guardedDraft.hepatic.value, null);
  assert.ok(res.rejectedValues.some((r) => r.reason.includes("has no source references")));
});
