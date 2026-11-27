import type {
  ComputedOutputMetric,
  InterpretationBand,
  NumericScaleItem,
  RecordStatus,
  ScaleRecord,
  SelectScaleItem,
} from "../../types/neurocalc.ts";
import { evaluateExpression } from "./expression.ts";
import { evaluateFormulaDetailed } from "./formulas.ts";
import { evaluateEffectiveScale } from "./integrity.ts";

export interface NumericInputValue {
  value: string | number;
  unit?: string;
}

export type ScaleInputValue = string | number | NumericInputValue;
export type ScaleInputValues = Record<string, ScaleInputValue | undefined>;

export interface NumericFieldError {
  itemId: string;
  message: string;
}

export interface UntestableItemSummary {
  itemId: string;
  code?: string;
  label: string;
}

export interface SubscoreResult {
  id: string;
  label: string;
  score: number | null;
  answeredCount: number;
  totalCount: number;
}

export interface ScoreEvaluationResult {
  effectiveStatus: RecordStatus;
  hashMatches: boolean;
  isGated: boolean;
  isComplete: boolean;
  answeredCount: number;
  answeredRequiredCount: number;
  requiredCount: number;
  totalItemsCount: number;
  rawScore: number | null;
  score: number | null;
  formattedScore: string | null;
  componentNotation?: string;
  totalInvalidatedReason?: string;
  primaryMetricLabel?: string;
  modelLabel?: string;
  outputMetrics?: ComputedOutputMetric[];
  warnings?: string[];
  band: InterpretationBand | null;
  applicableBands: InterpretationBand[];
  subscores: SubscoreResult[];
  untestableItems: UntestableItemSummary[];
  fieldErrors: NumericFieldError[];
}

export interface EvaluateScaleOptions {
  allowDraftPreview?: boolean;
}

export function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, Math.max(0, precision));
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function convertToCanonical(
  item: NumericScaleItem,
  rawValue: number,
  unit?: string
): number | null {
  if (!Number.isFinite(rawValue)) return null;
  const targetUnit = unit ?? item.canonical_unit;
  const unitDef = item.units.find((u) => u.unit === targetUnit);
  if (!unitDef) return null;
  const offset = unitDef.to_canonical_offset ?? 0;
  return rawValue * unitDef.to_canonical_factor + offset;
}

function convertFromCanonical(
  item: NumericScaleItem,
  canonicalValue: number,
  unit?: string
): number {
  const targetUnit = unit ?? item.canonical_unit;
  const unitDef = item.units.find((u) => u.unit === targetUnit);
  if (!unitDef) return canonicalValue;
  const offset = unitDef.to_canonical_offset ?? 0;
  return (canonicalValue - offset) / unitDef.to_canonical_factor;
}

function formatBound(val: number): string {
  return Number.isInteger(val) ? String(val) : String(roundToPrecision(val, 2));
}

function parseNumericInput(
  raw: ScaleInputValue | undefined
): { rawStr: string; unit?: string } {
  if (raw === undefined) return { rawStr: "" };
  if (typeof raw === "number") {
    return { rawStr: Number.isFinite(raw) ? String(raw) : "" };
  }
  if (typeof raw === "string") {
    return { rawStr: raw.trim() };
  }
  if (typeof raw === "object" && raw !== null) {
    const valStr =
      typeof raw.value === "number"
        ? Number.isFinite(raw.value)
          ? String(raw.value)
          : ""
        : String(raw.value ?? "").trim();
    return { rawStr: valStr, unit: raw.unit };
  }
  return { rawStr: "" };
}

/**
 * Pure, deterministic evaluation of a ScaleRecord against ephemeral client inputs.
 */
export function evaluateScale(
  scale: ScaleRecord,
  inputs: ScaleInputValues,
  options: EvaluateScaleOptions = {}
): ScoreEvaluationResult {
  const { effectiveStatus, hashMatches } = evaluateEffectiveScale(scale);
  const isGated = effectiveStatus !== "verified" && !options.allowDraftPreview;

  const requiredItems = scale.items.filter((i) => i.required);
  const requiredCount = requiredItems.length;
  const totalItemsCount = scale.items.length;

  if (isGated) {
    return {
      effectiveStatus,
      hashMatches,
      isGated: true,
      isComplete: false,
      answeredCount: 0,
      answeredRequiredCount: 0,
      requiredCount,
      totalItemsCount,
      rawScore: null,
      score: null,
      formattedScore: null,
      band: null,
      applicableBands: scale.interpretation,
      subscores: [],
      untestableItems: [],
      fieldErrors: [],
    };
  }

  let answeredRequiredCount = 0;
  let answeredTotalCount = 0;
  const untestableItems: UntestableItemSummary[] = [];
  const untestableItemIds = new Set<string>();
  const fieldErrors: NumericFieldError[] = [];
  const selectPointsById: Record<string, number | null> = {};
  const canonicalNumericById: Record<string, number> = {};

  for (const item of scale.items) {
    if (item.kind === "select") {
      const selItem = item as SelectScaleItem;
      const raw = inputs[selItem.id];
      const optionId =
        typeof raw === "string"
          ? raw
          : typeof raw === "object" && raw !== null && typeof raw.value === "string"
            ? raw.value
            : undefined;
      const opt = optionId
        ? selItem.options.find((o) => o.id === optionId)
        : undefined;
      if (opt) {
        answeredTotalCount += 1;
        if (selItem.required) answeredRequiredCount += 1;
        if (opt.is_untestable) {
          untestableItems.push({
            itemId: selItem.id,
            code: selItem.code,
            label: selItem.label,
          });
          untestableItemIds.add(selItem.id);
          selectPointsById[selItem.id] = 0;
        } else {
          selectPointsById[selItem.id] = opt.points ?? 0;
        }
      }
    } else {
      const numItem = item as NumericScaleItem;
      const { rawStr, unit } = parseNumericInput(inputs[numItem.id]);
      if (rawStr.length === 0) {
        continue;
      }
      const parsed = Number(rawStr);
      if (!Number.isFinite(parsed)) {
        fieldErrors.push({
          itemId: numItem.id,
          message: "Enter a valid number",
        });
        continue;
      }
      const canonical = convertToCanonical(numItem, parsed, unit);
      if (canonical === null || !Number.isFinite(canonical)) {
        fieldErrors.push({
          itemId: numItem.id,
          message: `Unsupported unit '${String(unit)}'`,
        });
        continue;
      }
      if (canonical < numItem.min_canonical || canonical > numItem.max_canonical) {
        const displayUnit = unit ?? numItem.canonical_unit;
        const minDisplay = convertFromCanonical(numItem, numItem.min_canonical, displayUnit);
        const maxDisplay = convertFromCanonical(numItem, numItem.max_canonical, displayUnit);
        fieldErrors.push({
          itemId: numItem.id,
          message: `Value must be between ${formatBound(minDisplay)} and ${formatBound(
            maxDisplay
          )} ${displayUnit}`,
        });
        continue;
      }

      canonicalNumericById[numItem.id] = canonical;
      answeredTotalCount += 1;
      if (numItem.required) answeredRequiredCount += 1;
    }
  }

  const isComplete =
    answeredRequiredCount === requiredCount && fieldErrors.length === 0;

  const providedKeys = new Set<string>();
  const formulaValues: Record<string, number> = {};
  const mergedNumeric: Record<string, number> = {};
  for (const item of scale.items) {
    if (item.kind === "numeric" && !item.required) {
      mergedNumeric[item.id] = 0;
    }
  }
  for (const [k, v] of Object.entries(selectPointsById)) {
    if (typeof v === "number") {
      mergedNumeric[k] = v;
      formulaValues[k] = v;
      providedKeys.add(k);
    }
  }
  for (const [k, v] of Object.entries(canonicalNumericById)) {
    mergedNumeric[k] = v;
    formulaValues[k] = v;
    providedKeys.add(k);
  }

  let rawScore: number | null = null;
  let totalInvalidatedReason: string | undefined;
  let primaryMetricLabel: string | undefined;
  let modelLabel: string | undefined;
  let outputMetrics: ComputedOutputMetric[] | undefined;
  let warnings: string[] | undefined;
  const customExpr = scale.scoring.expression?.trim();
  if (customExpr) {
    if (isComplete) {
      rawScore = evaluateExpression(customExpr, mergedNumeric);
    }
  } else if (scale.scoring.method === "sum") {
    if (
      scale.scoring.untestable_policy === "invalidate_total_and_flag" &&
      untestableItems.length > 0
    ) {
      rawScore = null;
      totalInvalidatedReason =
        "Total score cannot be summed when one or more components are not testable (NT). Report individual components instead.";
    } else if (answeredTotalCount > 0) {
      let sum = 0;
      for (const item of scale.items) {
        const val = selectPointsById[item.id];
        if (typeof val === "number") {
          sum += val;
        }
      }
      rawScore = sum;
    }
  } else if (scale.scoring.method === "single_select") {
    const firstItem = scale.items[0];
    if (firstItem && firstItem.kind === "select") {
      const raw = inputs[firstItem.id];
      const optionId =
        typeof raw === "string"
          ? raw
          : typeof raw === "object" && raw !== null && typeof raw.value === "string"
            ? raw.value
            : undefined;
      const opt = optionId
        ? firstItem.options.find((o) => o.id === optionId)
        : undefined;
      if (opt && !opt.is_untestable && opt.points !== null) {
        rawScore = opt.points;
      }
    }
  } else if (scale.scoring.method === "formula") {
    if (isComplete && scale.scoring.formula_id) {
      const detailed = evaluateFormulaDetailed(
        scale.scoring.formula_id,
        formulaValues,
        providedKeys
      );
      rawScore = detailed.primaryScore;
      primaryMetricLabel = detailed.primaryMetricLabel;
      modelLabel = detailed.modelLabel;
      outputMetrics = detailed.outputs;
      warnings = detailed.warnings;
    }
  }

  const precision =
    scale.scoring.precision ?? (scale.scoring.method === "formula" ? 1 : 0);
  const score =
    rawScore !== null && Number.isFinite(rawScore)
      ? roundToPrecision(rawScore, precision)
      : null;
  const formattedScore = score !== null ? score.toFixed(precision) : null;

  const hasConditionalBands = scale.interpretation.some((b) =>
    Boolean(b.condition)
  );
  let applicableBands = scale.interpretation;
  if (hasConditionalBands) {
    const matchedConditional = scale.interpretation.filter((b) => {
      if (!b.condition) return true;
      const res = evaluateExpression(b.condition, mergedNumeric);
      return res !== null && res !== 0;
    });
    if (matchedConditional.length > 0) {
      applicableBands = matchedConditional;
    } else {
      const firstCond = scale.interpretation.find((b) => b.condition)?.condition;
      applicableBands = firstCond
        ? scale.interpretation.filter((b) => b.condition === firstCond)
        : scale.interpretation;
    }
  }

  let band: InterpretationBand | null = null;
  if (isComplete && score !== null) {
    band =
      applicableBands.find(
        (b) => score >= b.min && (b.max === null || score <= b.max)
      ) ?? null;
  }

  const subscores: SubscoreResult[] = (scale.scoring.subscores ?? []).map((sub) => {
    let subSum = 0;
    let subAnswered = 0;
    let hasInvalidUntestable = false;
    for (const itemId of sub.item_ids) {
      if (
        scale.scoring.untestable_policy === "invalidate_total_and_flag" &&
        untestableItemIds.has(itemId)
      ) {
        hasInvalidUntestable = true;
        subAnswered += 1;
        continue;
      }
      const val = selectPointsById[itemId];
      if (typeof val === "number") {
        subSum += val;
        subAnswered += 1;
      }
    }
    return {
      id: sub.id,
      label: sub.label,
      score: hasInvalidUntestable ? null : subAnswered > 0 ? subSum : null,
      answeredCount: subAnswered,
      totalCount: sub.item_ids.length,
    };
  });

  let componentNotation: string | undefined;
  if (scale.scoring.display_components && answeredTotalCount > 0) {
    const parts: string[] = [];
    for (const item of scale.items) {
      if (!item.code) continue;
      if (untestableItemIds.has(item.id)) {
        parts.push(`${item.code}(NT)`);
      } else if (typeof selectPointsById[item.id] === "number") {
        parts.push(`${item.code}${selectPointsById[item.id]}`);
      } else {
        parts.push(`${item.code}(—)`);
      }
    }
    if (parts.length > 0) {
      componentNotation = parts.join(" ");
    }
  }

  return {
    effectiveStatus,
    hashMatches,
    isGated: false,
    isComplete,
    answeredCount: answeredTotalCount,
    answeredRequiredCount,
    requiredCount,
    totalItemsCount,
    rawScore,
    score,
    formattedScore,
    componentNotation,
    totalInvalidatedReason,
    primaryMetricLabel,
    modelLabel,
    outputMetrics,
    warnings,
    band,
    applicableBands,
    subscores,
    untestableItems,
    fieldErrors,
  };
}

export interface ScaleTestCaseResult {
  name: string;
  passed: boolean;
  message?: string;
}

/**
 * Runs embedded `scale.test_cases` against `evaluateScale` (for `calc:validate` & unit tests).
 */
export function runScaleTestCases(scale: ScaleRecord): ScaleTestCaseResult[] {
  const cases = scale.test_cases ?? [];
  return cases.map((tc) => {
    const res = evaluateScale(scale, tc.inputs, { allowDraftPreview: true });

    if (tc.expected_score === null) {
      if (res.score !== null) {
        return {
          name: tc.name,
          passed: false,
          message: `Expected null score, got ${res.score}`,
        };
      }
    } else if (res.score === null || Math.abs(res.score - tc.expected_score) > 1e-6) {
      return {
        name: tc.name,
        passed: false,
        message: `Expected score ${tc.expected_score}, got ${String(res.score)}`,
      };
    }

    if (tc.expected_band_id !== undefined) {
      const actualBandId = res.band?.id ?? null;
      if (actualBandId !== tc.expected_band_id) {
        return {
          name: tc.name,
          passed: false,
          message: `Expected band '${tc.expected_band_id}', got '${String(actualBandId)}'`,
        };
      }
    }

    if (tc.expected_untestable_ids !== undefined) {
      const actualIds = res.untestableItems.map((u) => u.itemId).sort();
      const expectedIds = [...tc.expected_untestable_ids].sort();
      if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
        return {
          name: tc.name,
          passed: false,
          message: `Expected untestable ${JSON.stringify(
            expectedIds
          )}, got ${JSON.stringify(actualIds)}`,
        };
      }
    }

    return { name: tc.name, passed: true };
  });
}
