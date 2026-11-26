import type { FormulaId } from "../../types/neurocalc.ts";

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Evaluates a named, published mathematical equation using canonical-unit numeric inputs.
 * Contains zero clinical interpretation thresholds or UI concerns.
 */
export function evaluateFormula(
  formulaId: FormulaId,
  values: Record<string, number>
): number | null {
  switch (formulaId) {
    case "abc_2": {
      const a = values.a;
      const b = values.b;
      if (!isFiniteNum(a) || !isFiniteNum(b)) return null;
      const c = isFiniteNum(values.c)
        ? values.c
        : isFiniteNum(values.slices) && isFiniteNum(values.slice_thickness)
          ? values.slices * values.slice_thickness
          : null;
      if (c === null) return null;
      return (a * b * c) / 2;
    }

    case "corrected_na_katz": {
      const measuredNa = values.measured_na;
      const glucose = values.glucose;
      if (!isFiniteNum(measuredNa) || !isFiniteNum(glucose)) return null;
      return measuredNa + 0.016 * Math.max(0, glucose - 100);
    }

    case "corrected_phenytoin_winter_tozer": {
      const measuredPhenytoin = values.measured_phenytoin;
      const albumin = values.albumin;
      const renalCoeff = isFiniteNum(values.renal_coefficient)
        ? values.renal_coefficient
        : 0.2;
      if (!isFiniteNum(measuredPhenytoin) || !isFiniteNum(albumin)) return null;
      const denom = renalCoeff * albumin + 0.1;
      if (denom <= 0) return null;
      return measuredPhenytoin / denom;
    }

    case "serum_osmolality": {
      const sodium = values.sodium;
      const glucose = values.glucose;
      const bun = values.bun;
      const ethanol = isFiniteNum(values.ethanol) ? values.ethanol : 0;
      if (!isFiniteNum(sodium) || !isFiniteNum(glucose) || !isFiniteNum(bun)) {
        return null;
      }
      return 2 * sodium + glucose / 18 + bun / 2.8 + ethanol / 4.6;
    }

    default:
      return null;
  }
}
