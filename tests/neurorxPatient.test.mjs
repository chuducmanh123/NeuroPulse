import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parsePatient,
  scrToMgDl,
  crclCG,
  bsaMosteller,
  crclNormalized173,
  resolveRenalFunction,
} from "../src/lib/neurorx/patient.ts";

describe("NeuroRx Patient Context & Cockcroft-Gault Engine (T4)", () => {
  describe("Input Validation & Range Checking (parsePatient)", () => {
    it("should accept valid patient inputs and flag adult/pediatric status", () => {
      const resAdult = parsePatient({
        ageYears: 65,
        sex: "male",
        weightKg: 70,
        heightCm: 170,
        scr: { value: 90, unit: "umol/L" },
      });
      assert.equal(resAdult.errors.length, 0);
      assert.equal(resAdult.patient.ageYears, 65);
      assert.equal(resAdult.patient.isPediatric, false);

      const resPed = parsePatient({
        ageYears: 12,
        sex: "female",
        weightKg: 35,
      });
      assert.equal(resPed.errors.length, 0);
      assert.equal(resPed.patient.isPediatric, true);
    });

    it("should reject out-of-range physiological inputs", () => {
      const res = parsePatient({
        ageYears: 130, // max 120
        weightKg: 1, // min 2
        heightCm: 260, // max 250
        scr: { value: -5, unit: "mg/dL" }, // must be > 0
      });

      assert.equal(res.errors.length, 4);
      assert.ok(res.errors.some((e) => e.includes("Invalid age")));
      assert.ok(res.errors.some((e) => e.includes("Invalid weight")));
      assert.ok(res.errors.some((e) => e.includes("Invalid height")));
      assert.ok(res.errors.some((e) => e.includes("Invalid serum creatinine")));
    });

    it("should handle empty patient inputs safely without crashing", () => {
      const res = parsePatient({});
      assert.equal(res.errors.length, 0);
      assert.equal(res.patient.ageYears, undefined);
      assert.equal(res.patient.weightKg, undefined);
    });
  });

  describe("Unit Conversion (scrToMgDl)", () => {
    it("should convert µmol/L to mg/dL accurately (88.4 conversion factor)", () => {
      // 88.4 umol/L = exactly 1.0 mg/dL
      assert.equal(Math.round(scrToMgDl(88.4) * 100) / 100, 1.0);
      // 176.8 umol/L = exactly 2.0 mg/dL
      assert.equal(Math.round(scrToMgDl(176.8) * 100) / 100, 2.0);
    });
  });

  describe("Cockcroft-Gault Calculations (crclCG)", () => {
    it("should calculate exact male CrCl: Age 60, Male, 70 kg, SCr 1.0 mg/dL", () => {
      // Formula: [(140 - 60) * 70] / (72 * 1.0) = 5600 / 72 = 77.777... -> 77.8 mL/min
      const patient = {
        ageYears: 60,
        sex: "male",
        weightKg: 70,
        scr: { value: 1.0, unit: "mg/dL" },
        isPediatric: false,
      };

      const result = crclCG(patient);
      assert.ok(result !== null);
      assert.equal(result.value, 77.8);
      assert.equal(result.formula, "Cockcroft-Gault (actual body weight)");
    });

    it("should apply female factor (0.85): Age 60, Female, 70 kg, SCr 1.0 mg/dL", () => {
      // Formula: 77.777... * 0.85 = 66.111... -> 66.1 mL/min
      const patient = {
        ageYears: 60,
        sex: "female",
        weightKg: 70,
        scr: { value: 1.0, unit: "mg/dL" },
        isPediatric: false,
      };

      const result = crclCG(patient);
      assert.ok(result !== null);
      assert.equal(result.value, 66.1);
    });

    it("should compute correctly when SCr is provided in SI unit (µmol/L)", () => {
      // 88.4 umol/L = 1.0 mg/dL
      const patient = {
        ageYears: 60,
        sex: "male",
        weightKg: 70,
        scr: { value: 88.4, unit: "umol/L" },
        isPediatric: false,
      };

      const result = crclCG(patient);
      assert.ok(result !== null);
      assert.equal(result.value, 77.8);
    });

    it("should return null if any required variable is missing", () => {
      assert.equal(crclCG({ ageYears: 60, isPediatric: false }), null);
      assert.equal(crclCG({ ageYears: 60, sex: "male", isPediatric: false }), null);
      assert.equal(crclCG({ ageYears: 60, sex: "male", weightKg: 70, isPediatric: false }), null);
    });
  });

  describe("Mosteller BSA and Normalization to 1.73 m²", () => {
    it("should calculate Mosteller BSA: Height 170 cm, Weight 70 kg", () => {
      // BSA = sqrt((170 * 70) / 3600) = sqrt(11900 / 3600) = sqrt(3.3055) = 1.818 -> 1.82 m²
      const bsa = bsaMosteller(170, 70);
      assert.equal(bsa, 1.82);
    });

    it("should normalize CrCl to 1.73 m²: CrCl 77.8 mL/min, BSA 1.82 m²", () => {
      // Normalized = (77.8 / 1.82) * 1.73 = 42.747 * 1.73 = 73.95 -> 74.0 mL/min/1.73m²
      const normalized = crclNormalized173(77.8, 1.82);
      assert.equal(normalized, 74.0);
    });
  });

  describe("Renal Function Resolution (resolveRenalFunction)", () => {
    const basePatient = {
      ageYears: 60,
      sex: "male",
      weightKg: 70,
      heightCm: 170,
      scr: { value: 1.0, unit: "mg/dL" },
      isPediatric: false,
    };

    it("RULE: Manual override must win over computed values", () => {
      const patientWithManual = {
        ...basePatient,
        crclManual: 45,
      };

      const res = resolveRenalFunction(patientWithManual, "cg_abw");
      assert.equal(res.value, 45);
      assert.equal(res.basisUsed, "manual");
      assert.ok(res.label.includes("Manual override: 45 mL/min"));
    });

    it("should resolve standard Cockcroft-Gault ABW", () => {
      const res = resolveRenalFunction(basePatient, "cg_abw");
      assert.equal(res.value, 77.8);
      assert.equal(res.basisUsed, "cg_abw");
      assert.ok(res.label.includes("Actual Body Weight"));
    });

    it("should resolve BSA-normalized CrCl when height is provided", () => {
      const res = resolveRenalFunction(basePatient, "cg_normalized_1_73");
      assert.equal(res.value, 74.0);
      assert.equal(res.basisUsed, "cg_normalized_1_73");
      assert.ok(res.label.includes("mL/min/1.73m²"));
    });

    it("should warn and return null value if normalized basis is requested but height is missing", () => {
      const patientNoHeight = {
        ...basePatient,
        heightCm: undefined,
      };

      const res = resolveRenalFunction(patientNoHeight, "cg_normalized_1_73");
      assert.equal(res.value, null);
      assert.ok(res.warning !== undefined);
      assert.ok(res.warning.includes("height (cm) is required to calculate BSA"));
    });

    it("should return warning for eGFR basis without manual input", () => {
      const res = resolveRenalFunction(basePatient, "egfr");
      assert.equal(res.value, null);
      assert.equal(res.basisUsed, "egfr");
      assert.ok(res.warning !== undefined);
      assert.ok(res.warning.includes("requires eGFR"));
    });
  });
});
