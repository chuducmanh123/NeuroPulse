// Pure formulation to product units converter for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 6 & NEURORX-GUARDRAILS.md (G1, G2)

import type { VnProduct } from "@/types/neurorx";

export interface ProductUnitResult {
  product: VnProduct;
  units: number;
  remainderMg: number;
  displayText: string;
}

/**
 * Parses numeric strength from formulation string (e.g. "500 mg", "250 mg", "50 mg/vial").
 */
export function parseProductStrength(strengthStr: string): number | null {
  if (!strengthStr) return null;
  const match = strengthStr.match(/^([\d.]+)\s*mg/i);
  if (match) {
    const val = parseFloat(match[1]);
    return val > 0 ? val : null;
  }
  return null;
}

/**
 * Converts a theoretical dose in mg to practical physical units (tablets, vials)
 * of available formulations in Vietnam hospitals.
 * Never rounds up past a maximum single dose cap.
 */
export function toProductUnits(
  doseMg: number,
  products?: VnProduct[] | null
): ProductUnitResult[] {
  if (!products || products.length === 0 || doseMg <= 0) {
    return [];
  }

  const results: ProductUnitResult[] = [];

  for (const prod of products) {
    const strength = parseProductStrength(prod.strength);
    if (!strength) continue;

    // Direct division
    const exactCount = doseMg / strength;
    if (Number.isInteger(exactCount) && exactCount > 0) {
      results.push({
        product: prod,
        units: exactCount,
        remainderMg: 0,
        displayText: `${exactCount} × ${prod.brand || "tablet/vial"} (${prod.strength})`,
      });
      continue;
    }

    // Half-tablet check
    const isHalf = Math.abs(exactCount * 2 - Math.round(exactCount * 2)) < 0.01;
    if (isHalf) {
      results.push({
        product: prod,
        units: exactCount,
        remainderMg: 0,
        displayText: `${exactCount} × ${prod.brand || "tablet"} (${prod.strength})`,
      });
      continue;
    }

    // Nearest lower combination with remainder
    const floorCount = Math.floor(doseMg / strength);
    const remainder = doseMg - floorCount * strength;
    if (floorCount > 0) {
      results.push({
        product: prod,
        units: floorCount,
        remainderMg: remainder,
        displayText: `${floorCount} × ${prod.brand || "tablet/vial"} (${prod.strength}) + remainder ${remainder} mg`,
      });
    }
  }

  return results;
}
