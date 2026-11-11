import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeRegimen,
  ACB_ALERT_THRESHOLD,
} from "../src/lib/neurorx/interactions.ts";

// Helper to construct fixture drug record (strictly in-memory, no real data)
function makeFixtureDrug({
  id,
  generic_name = id,
  status = "verified",
  cyp3a4 = undefined,
  pgp = undefined,
  serotonergic = false,
  qt_risk = "none",
  acb_score = 0,
  mg_safety = "safe",
}) {
  return {
    id,
    generic_name,
    tall_man: { value: generic_name, refs: [] },
    classes: ["fixture_class"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [] },
    bhyt: { value: null, refs: [] },
    regimens: [],
    renal_basis: { value: "none", refs: [] },
    hepatic: { value: null, refs: [] },
    black_box: { value: null, refs: [] },
    mg_safety: {
      value: mg_safety,
      refs: [
        {
          source_id: "fixture-source",
          locator: "Section MG",
          quote: "Fixture quote for MG safety.",
        },
      ],
      note: `MG note for ${id}`,
    },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: null, refs: [] },
    mechanism_of_action: {
      value: "Fixture mechanism",
      refs: [],
    },
    enzyme_profile: {
      value: {
        cyp3a4,
        pgp,
        serotonergic,
        qt_risk,
        acb_score,
      },
      refs: [
        {
          source_id: "fixture-source",
          locator: "Section 12",
          quote: `Fixture quote for ${id} enzyme profile.`,
        },
      ],
    },
    status,
    verification: {
      verified_by: status === "verified" ? "Reviewer" : null,
      verified_at: status === "verified" ? "2026-11-11" : null,
      content_hash: status === "verified" ? "hash123" : null,
    },
  };
}

test("empty regimen or single drug returns empty analysis collections", () => {
  const store = { drugs: [], interactions: [] };
  const resEmpty = analyzeRegimen([], store);
  assert.deepEqual(resEmpty.curated, []);
  assert.deepEqual(resEmpty.mechanism, []);
  assert.deepEqual(resEmpty.mg, []);
  assert.deepEqual(resEmpty.draftsExcluded, []);

  const drugA = makeFixtureDrug({ id: "drugA" });
  const resSingle = analyzeRegimen(["drugA"], { drugs: [drugA], interactions: [] });
  assert.deepEqual(resSingle.curated, []);
  assert.deepEqual(resSingle.mechanism, []);
  assert.deepEqual(resSingle.mg, []);
  assert.deepEqual(resSingle.draftsExcluded, []);
});

test("curated DDI: matches both orders (a-b and b-a) without duplicates", () => {
  const drugA = makeFixtureDrug({ id: "drugA" });
  const drugB = makeFixtureDrug({ id: "drugB" });
  const interaction = {
    id: "int-ab",
    drug_a: "drugA",
    drug_b: "drugB",
    severity: "major",
    mechanism: "Competitive inhibition",
    clinical_effect: "Toxicity risk",
    management: "Dose reduction",
    alternatives: [
      {
        drug_id: "drugC",
        rationale: "No inhibition",
      },
    ],
    refs: [
      {
        source_id: "fixture-source",
        locator: "Section 7",
        quote: "Fixture DDI quote.",
      },
    ],
  };

  const store = { drugs: [drugA, drugB], interactions: [interaction] };

  // Order 1: [drugA, drugB]
  const res1 = analyzeRegimen(["drugA", "drugB"], store);
  assert.equal(res1.curated.length, 1);
  assert.equal(res1.curated[0].id, "int-ab");
  assert.equal(res1.curated[0].severity, "major");

  // Order 2: [drugB, drugA]
  const res2 = analyzeRegimen(["drugB", "drugA"], store);
  assert.equal(res2.curated.length, 1);
  assert.equal(res2.curated[0].id, "int-ab");
});

test("curated DDI: sorts by severity strictly contraindicated > major > moderate > minor", () => {
  const d1 = makeFixtureDrug({ id: "d1" });
  const d2 = makeFixtureDrug({ id: "d2" });
  const d3 = makeFixtureDrug({ id: "d3" });
  const d4 = makeFixtureDrug({ id: "d4" });

  const interactions = [
    {
      id: "int-minor",
      drug_a: "d1",
      drug_b: "d2",
      severity: "minor",
      mechanism: "Minor PK change",
      clinical_effect: "None expected",
      management: "No action required",
      alternatives: [],
      refs: [],
    },
    {
      id: "int-contra",
      drug_a: "d1",
      drug_b: "d3",
      severity: "contraindicated",
      mechanism: "Severe antagonism",
      clinical_effect: "Fatal arrhythmia",
      management: "Do not co-prescribe",
      alternatives: [],
      refs: [],
    },
    {
      id: "int-mod",
      drug_a: "d2",
      drug_b: "d3",
      severity: "moderate",
      mechanism: "Moderate clearance change",
      clinical_effect: "Increased sedation",
      management: "Monitor",
      alternatives: [],
      refs: [],
    },
    {
      id: "int-major",
      drug_a: "d1",
      drug_b: "d4",
      severity: "major",
      mechanism: "Major displacement",
      clinical_effect: "Hemorrhage",
      management: "Dose adjust",
      alternatives: [],
      refs: [],
    },
  ];

  const res = analyzeRegimen(["d1", "d2", "d3", "d4"], {
    drugs: [d1, d2, d3, d4],
    interactions,
  });

  assert.equal(res.curated.length, 4);
  assert.equal(res.curated[0].severity, "contraindicated");
  assert.equal(res.curated[1].severity, "major");
  assert.equal(res.curated[2].severity, "moderate");
  assert.equal(res.curated[3].severity, "minor");
});

test("mechanism flag (a): CYP3A4 / P-gp strong inducer + substrate", () => {
  const inducer = makeFixtureDrug({
    id: "inducer3A4",
    cyp3a4: "inducer_strong",
    pgp: "inducer",
  });
  const substrate = makeFixtureDrug({
    id: "substrate3A4",
    cyp3a4: "substrate",
    pgp: "substrate",
  });

  const res = analyzeRegimen(["inducer3A4", "substrate3A4"], {
    drugs: [inducer, substrate],
    interactions: [],
  });

  assert.equal(res.mechanism.length, 1);
  const flag = res.mechanism[0];
  assert.equal(flag.type, "cyp_pgp");
  assert.equal(flag.label, "Review suggested — mechanism-based");
  assert.equal(flag.severity, undefined, "Severity field must be absent from mechanism flags");
  assert.deepEqual(flag.drugs, ["inducer3A4", "substrate3A4"]);
  assert.ok(flag.description.includes("CYP3A4"));
  assert.ok(flag.refs.length >= 2);
});

test("mechanism flag (b): Serotonergic toxicity when ≥ 2 serotonergic drugs", () => {
  const s1 = makeFixtureDrug({ id: "s1", serotonergic: true });
  const s2 = makeFixtureDrug({ id: "s2", serotonergic: true });
  const nons = makeFixtureDrug({ id: "nons", serotonergic: false });

  // 1 serotonergic -> no flag
  const res1 = analyzeRegimen(["s1", "nons"], { drugs: [s1, nons], interactions: [] });
  assert.equal(res1.mechanism.filter((m) => m.type === "serotonergic").length, 0);

  // 2 serotonergic -> flag triggered
  const res2 = analyzeRegimen(["s1", "s2", "nons"], {
    drugs: [s1, s2, nons],
    interactions: [],
  });
  const serotFlags = res2.mechanism.filter((m) => m.type === "serotonergic");
  assert.equal(serotFlags.length, 1);
  assert.equal(serotFlags[0].label, "Review suggested — mechanism-based");
  assert.deepEqual(serotFlags[0].drugs, ["s1", "s2"]);
});

test("mechanism flag (c): QT prolongation risk when ≥ 2 drugs with QT risk", () => {
  const q1 = makeFixtureDrug({ id: "q1", qt_risk: "known" });
  const q2 = makeFixtureDrug({ id: "q2", qt_risk: "possible" });
  const qNone = makeFixtureDrug({ id: "qNone", qt_risk: "none" });

  const res = analyzeRegimen(["q1", "q2", "qNone"], {
    drugs: [q1, q2, qNone],
    interactions: [],
  });
  const qtFlags = res.mechanism.filter((m) => m.type === "qt_risk");
  assert.equal(qtFlags.length, 1);
  assert.equal(qtFlags[0].label, "Review suggested — mechanism-based");
  assert.deepEqual(qtFlags[0].drugs, ["q1", "q2"]);
});

test("mechanism flag (d): Anticholinergic Cognitive Burden when total ACB ≥ 3", () => {
  const acb2 = makeFixtureDrug({ id: "acb2", acb_score: 2 });
  const acb1 = makeFixtureDrug({ id: "acb1", acb_score: 1 });
  const acb0 = makeFixtureDrug({ id: "acb0", acb_score: 0 });

  // Sum = 2 -> under threshold 3 -> no flag
  const resBelow = analyzeRegimen(["acb2", "acb0"], {
    drugs: [acb2, acb0],
    interactions: [],
  });
  assert.equal(resBelow.mechanism.filter((m) => m.type === "acb").length, 0);

  // Sum = 3 -> meets threshold 3 -> flag triggered
  const resAt = analyzeRegimen(["acb2", "acb1"], {
    drugs: [acb2, acb1],
    interactions: [],
  });
  const acbFlags = resAt.mechanism.filter((m) => m.type === "acb");
  assert.equal(acbFlags.length, 1);
  assert.equal(acbFlags[0].label, "Review suggested — mechanism-based");
  assert.equal(acbFlags[0].details?.totalACB, 3);
  assert.equal(acbFlags[0].details?.threshold, ACB_ALERT_THRESHOLD);
});

test("suppression: curated interaction suppresses duplicate mechanism flag for same pair", () => {
  const inducer = makeFixtureDrug({ id: "dInd", cyp3a4: "inducer_strong" });
  const substrate = makeFixtureDrug({ id: "dSub", cyp3a4: "substrate" });

  const interaction = {
    id: "curated-dInd-dSub",
    drug_a: "dInd",
    drug_b: "dSub",
    severity: "major",
    mechanism: "CYP3A4 clearance induction",
    clinical_effect: "Decreased efficacy",
    management: "Avoid combination or adjust dose",
    alternatives: [],
    refs: [],
  };

  const res = analyzeRegimen(["dInd", "dSub"], {
    drugs: [inducer, substrate],
    interactions: [interaction],
  });

  // Curated hit is returned
  assert.equal(res.curated.length, 1);
  assert.equal(res.curated[0].id, "curated-dInd-dSub");

  // Duplicate CYP/P-gp mechanism flag must be SUPPRESSED
  assert.equal(res.mechanism.length, 0);
});

test("draft exclusion: draft drugs excluded from mechanism flags but curated pairs shown", () => {
  const draftInducer = makeFixtureDrug({
    id: "draftInd",
    status: "draft",
    cyp3a4: "inducer_strong",
    serotonergic: true,
  });
  const verifiedSub = makeFixtureDrug({
    id: "verSub",
    status: "verified",
    cyp3a4: "substrate",
    serotonergic: true,
  });

  const interaction = {
    id: "curated-draft-verified",
    drug_a: "draftInd",
    drug_b: "verSub",
    severity: "contraindicated",
    mechanism: "Severe interaction",
    clinical_effect: "Adverse effect",
    management: "Avoid",
    alternatives: [],
    refs: [],
  };

  const res = analyzeRegimen(["draftInd", "verSub"], {
    drugs: [draftInducer, verifiedSub],
    interactions: [interaction],
  });

  // Draft drug reported in draftsExcluded
  assert.deepEqual(res.draftsExcluded, ["draftInd"]);

  // Curated interaction still shown
  assert.equal(res.curated.length, 1);
  assert.equal(res.curated[0].id, "curated-draft-verified");

  // Mechanism flags excluded because draft drug's enzyme profile is ignored
  assert.equal(res.mechanism.length, 0);
});

test("myasthenia gravis safety: reports drugs with may_worsen or avoid", () => {
  const dAvoid = makeFixtureDrug({ id: "dAvoid", mg_safety: "avoid" });
  const dWorsen = makeFixtureDrug({ id: "dWorsen", mg_safety: "may_worsen" });
  const dCaution = makeFixtureDrug({ id: "dCaution", mg_safety: "caution" });
  const dSafe = makeFixtureDrug({ id: "dSafe", mg_safety: "safe" });

  const res = analyzeRegimen(["dAvoid", "dWorsen", "dCaution", "dSafe"], {
    drugs: [dAvoid, dWorsen, dCaution, dSafe],
    interactions: [],
  });

  assert.equal(res.mg.length, 2);
  const ids = res.mg.map((m) => m.drug_id);
  assert.ok(ids.includes("dAvoid"));
  assert.ok(ids.includes("dWorsen"));
  assert.ok(!ids.includes("dCaution"));
  assert.ok(!ids.includes("dSafe"));
  assert.equal(res.mg.find((m) => m.drug_id === "dAvoid")?.status, "avoid");
  assert.equal(res.mg.find((m) => m.drug_id === "dWorsen")?.status, "may_worsen");
});
