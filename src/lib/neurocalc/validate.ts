import { SUBSPECIALTY_LIST } from "../../constants/subspecialties.ts";
import { validateExpression } from "./expression.ts";
import type {
  FormulaId,
  RecordStatus,
  ScaleKind,
  ScaleRecord,
  ScaleReference,
  SeverityLevel,
  ValidationError,
} from "../../types/neurocalc.ts";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_STATUSES = new Set<RecordStatus>(["draft", "verified", "retired"]);
const VALID_KINDS = new Set<ScaleKind>(["point_sum", "ordinal_grade", "formula"]);
const VALID_METHODS = new Set(["sum", "single_select", "formula"]);
const VALID_SEVERITIES = new Set<SeverityLevel>([
  "normal",
  "mild",
  "moderate",
  "severe",
  "critical",
  "info",
]);
const VALID_FORMULA_IDS = new Set<FormulaId>([
  "abc_2",
  "corrected_na_katz",
  "corrected_phenytoin_winter_tozer",
  "serum_osmolality",
  "score2",
  "score2_op",
  "score2_diabetes",
  "ascvd_pce",
  "smart2",
  "prevent_10y_cvd",
  "grace_2_1y_death",
  "rf_cl",
]);
const VALID_SUBSPECIALTIES = new Set<string>(
  SUBSPECIALTY_LIST.filter((s) => s !== "All Subspecialties")
);

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isFiniteNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

function validateReferenceList(
  refs: unknown,
  basePath: string,
  errors: ValidationError[]
): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(refs)) {
    errors.push({ path: basePath, message: "Must be an array of references" });
    return ids;
  }

  refs.forEach((entry, idx) => {
    const p = `${basePath}[${idx}]`;
    if (!isPlainObject(entry)) {
      errors.push({ path: p, message: "Reference entry must be an object" });
      return;
    }
    if (!isNonEmptyString(entry.id) || !SLUG_RE.test(entry.id)) {
      errors.push({
        path: `${p}.id`,
        message: "Reference id must be a non-empty lowercase slug",
      });
    } else if (ids.has(entry.id)) {
      errors.push({
        path: `${p}.id`,
        message: `Duplicate reference id '${entry.id}'`,
      });
    } else {
      ids.add(entry.id);
    }

    if (!isNonEmptyString(entry.citation)) {
      errors.push({ path: `${p}.citation`, message: "Citation is required" });
    }
    if (
      !isFiniteNumber(entry.year) ||
      !Number.isInteger(entry.year) ||
      entry.year < 1900 ||
      entry.year > 2100
    ) {
      errors.push({
        path: `${p}.year`,
        message: "Year must be an integer between 1900 and 2100",
      });
    }
  });

  return ids;
}

function validateSourceRefs(
  refs: unknown,
  basePath: string,
  validSourceIds: ReadonlySet<string>,
  errors: ValidationError[]
): void {
  if (!Array.isArray(refs) || refs.length === 0) {
    errors.push({
      path: basePath,
      message: "At least one source reference is required",
    });
    return;
  }

  refs.forEach((ref, idx) => {
    const p = `${basePath}[${idx}]`;
    if (!isPlainObject(ref)) {
      errors.push({ path: p, message: "SourceRef must be an object" });
      return;
    }
    if (!isNonEmptyString(ref.source_id)) {
      errors.push({ path: `${p}.source_id`, message: "source_id is required" });
    } else if (!validSourceIds.has(ref.source_id)) {
      errors.push({
        path: `${p}.source_id`,
        message: `Unknown source_id '${ref.source_id}'`,
      });
    }
    if (!isNonEmptyString(ref.locator)) {
      errors.push({ path: `${p}.locator`, message: "locator is required" });
    }
    if (ref.quote !== undefined) {
      if (typeof ref.quote !== "string" || ref.quote.trim().length === 0) {
        errors.push({
          path: `${p}.quote`,
          message: "quote must be a non-empty string when provided",
        });
      } else if (ref.quote.length > 400) {
        errors.push({
          path: `${p}.quote`,
          message: "quote must be <= 400 characters",
        });
      }
    }
  });
}

/**
 * Validates the shared NeuroCalc source registry (`data/neurocalc/sources.json`).
 */
export function validateSources(sources: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  validateReferenceList(sources, "sources", errors);
  return errors;
}

/**
 * Validates a ScaleRecord against SPEC-neurocalc.md §5.2 invariants.
 */
export function validateScaleRecord(
  scale: unknown,
  knownGlobalSourceIds: ReadonlySet<string> = new Set()
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isPlainObject(scale)) {
    return [{ path: "scale", message: "ScaleRecord must be an object" }];
  }

  // Top-level identity & status
  if (!isNonEmptyString(scale.id) || !SLUG_RE.test(scale.id)) {
    errors.push({
      path: "id",
      message: "id must be a non-empty lowercase kebab-case slug",
    });
  }
  if (scale.schema_version !== 1) {
    errors.push({ path: "schema_version", message: "schema_version must be 1" });
  }
  if (!isNonEmptyString(scale.status) || !VALID_STATUSES.has(scale.status as RecordStatus)) {
    errors.push({
      path: "status",
      message: "status must be 'draft', 'verified', or 'retired'",
    });
  }
  if (!isPlainObject(scale.verification)) {
    errors.push({
      path: "verification",
      message: "verification object is required",
    });
  }

  // References (block 6) — validate first so bands and guides can link to them
  let localSourceIds = new Set<string>();
  if (!Array.isArray(scale.references) || scale.references.length === 0) {
    errors.push({
      path: "references",
      message: "At least one reference in references[] is required",
    });
  } else {
    localSourceIds = validateReferenceList(scale.references, "references", errors);
  }
  const validSourceIds = new Set<string>([
    ...knownGlobalSourceIds,
    ...localSourceIds,
  ]);

  // Metadata (block 1)
  if (!isPlainObject(scale.metadata)) {
    errors.push({ path: "metadata", message: "metadata object is required" });
  } else {
    const m = scale.metadata;
    if (!isNonEmptyString(m.name)) {
      errors.push({ path: "metadata.name", message: "name is required" });
    }
    if (!isNonEmptyString(m.short_name)) {
      errors.push({
        path: "metadata.short_name",
        message: "short_name is required",
      });
    }
    if (!isNonEmptyString(m.summary)) {
      errors.push({ path: "metadata.summary", message: "summary is required" });
    }
    if (!Array.isArray(m.aliases) || !m.aliases.every((a) => typeof a === "string")) {
      errors.push({
        path: "metadata.aliases",
        message: "aliases must be an array of strings",
      });
    }
    if (!isNonEmptyString(m.kind) || !VALID_KINDS.has(m.kind as ScaleKind)) {
      errors.push({
        path: "metadata.kind",
        message: "kind must be 'point_sum', 'ordinal_grade', or 'formula'",
      });
    }
    if (!Array.isArray(m.subspecialties) || m.subspecialties.length === 0) {
      errors.push({
        path: "metadata.subspecialties",
        message: "At least one subspecialty is required",
      });
    } else {
      m.subspecialties.forEach((sub, idx) => {
        if (typeof sub !== "string" || !VALID_SUBSPECIALTIES.has(sub)) {
          errors.push({
            path: `metadata.subspecialties[${idx}]`,
            message: `Invalid subspecialty '${String(sub)}'`,
          });
        }
      });
    }
  }

  // Items (block 2)
  const itemById = new Map<string, Record<string, unknown>>();
  const selectOptionsByItemId = new Map<string, Set<string>>();

  if (!Array.isArray(scale.items) || scale.items.length === 0) {
    errors.push({
      path: "items",
      message: "At least one item is required",
    });
  } else {
    scale.items.forEach((item, idx) => {
      const p = `items[${idx}]`;
      if (!isPlainObject(item)) {
        errors.push({ path: p, message: "Item must be an object" });
        return;
      }
      if (!isNonEmptyString(item.id)) {
        errors.push({ path: `${p}.id`, message: "Item id is required" });
      } else if (itemById.has(item.id)) {
        errors.push({
          path: `${p}.id`,
          message: `Duplicate item id '${item.id}'`,
        });
      } else {
        itemById.set(item.id, item);
      }

      if (!isNonEmptyString(item.label)) {
        errors.push({ path: `${p}.label`, message: "Item label is required" });
      }
      if (typeof item.required !== "boolean") {
        errors.push({
          path: `${p}.required`,
          message: "required must be a boolean",
        });
      }

      if (item.kind === "select") {
        if (!Array.isArray(item.options) || item.options.length < 2) {
          errors.push({
            path: `${p}.options`,
            message: "Select item must have at least 2 options",
          });
        } else {
          const optIds = new Set<string>();
          item.options.forEach((opt, optIdx) => {
            const op = `${p}.options[${optIdx}]`;
            if (!isPlainObject(opt)) {
              errors.push({ path: op, message: "Option must be an object" });
              return;
            }
            if (!isNonEmptyString(opt.id)) {
              errors.push({ path: `${op}.id`, message: "Option id is required" });
            } else if (optIds.has(opt.id)) {
              errors.push({
                path: `${op}.id`,
                message: `Duplicate option id '${opt.id}'`,
              });
            } else {
              optIds.add(opt.id);
            }
            if (!isNonEmptyString(opt.label)) {
              errors.push({
                path: `${op}.label`,
                message: "Option label is required",
              });
            }
            if (opt.is_untestable === true) {
              if (opt.points !== null) {
                errors.push({
                  path: `${op}.points`,
                  message: "Untestable option (is_untestable: true) must have points: null",
                });
              }
            } else if (!isFiniteNumber(opt.points)) {
              errors.push({
                path: `${op}.points`,
                message: "Option points must be a finite number (or null when is_untestable is true)",
              });
            }
          });
          if (isNonEmptyString(item.id)) {
            selectOptionsByItemId.set(item.id, optIds);
          }
        }
      } else if (item.kind === "numeric") {
        if (!isNonEmptyString(item.canonical_unit)) {
          errors.push({
            path: `${p}.canonical_unit`,
            message: "canonical_unit is required",
          });
        }
        if (!isFiniteNumber(item.min_canonical) || !isFiniteNumber(item.max_canonical)) {
          errors.push({
            path: `${p}.min_canonical`,
            message: "min_canonical and max_canonical must be finite numbers",
          });
        } else if (item.min_canonical >= item.max_canonical) {
          errors.push({
            path: `${p}.min_canonical`,
            message: "min_canonical must be strictly less than max_canonical",
          });
        }

        if (!Array.isArray(item.units) || item.units.length === 0) {
          errors.push({
            path: `${p}.units`,
            message: "At least one unit option is required",
          });
        } else {
          let hasCanonicalUnit = false;
          item.units.forEach((u, uIdx) => {
            const up = `${p}.units[${uIdx}]`;
            if (!isPlainObject(u)) {
              errors.push({ path: up, message: "Unit option must be an object" });
              return;
            }
            if (!isNonEmptyString(u.unit) || !isNonEmptyString(u.label)) {
              errors.push({
                path: up,
                message: "Unit option requires non-empty unit and label",
              });
            }
            if (!isFiniteNumber(u.to_canonical_factor) || u.to_canonical_factor <= 0) {
              errors.push({
                path: `${up}.to_canonical_factor`,
                message: "to_canonical_factor must be a positive finite number",
              });
            }
            if (
              u.to_canonical_offset !== undefined &&
              !isFiniteNumber(u.to_canonical_offset)
            ) {
              errors.push({
                path: `${up}.to_canonical_offset`,
                message: "to_canonical_offset must be a finite number",
              });
            }
            if (
              u.unit === item.canonical_unit &&
              u.to_canonical_factor === 1 &&
              (u.to_canonical_offset ?? 0) === 0
            ) {
              hasCanonicalUnit = true;
            }
          });
          if (!hasCanonicalUnit) {
            errors.push({
              path: `${p}.units`,
              message: `units must include canonical_unit '${String(
                item.canonical_unit
              )}' with to_canonical_factor: 1 and offset: 0`,
            });
          }
        }
      } else {
        errors.push({
          path: `${p}.kind`,
          message: "Item kind must be 'select' or 'numeric'",
        });
      }
    });
  }

  // Scoring (block 3)
  if (!isPlainObject(scale.scoring)) {
    errors.push({ path: "scoring", message: "scoring object is required" });
  } else {
    const s = scale.scoring;
    if (!isNonEmptyString(s.method) || !VALID_METHODS.has(s.method)) {
      errors.push({
        path: "scoring.method",
        message: "scoring.method must be 'sum', 'single_select', or 'formula'",
      });
    } else if (isPlainObject(scale.metadata) && isNonEmptyString(scale.metadata.kind)) {
      const expectedMethod =
        scale.metadata.kind === "point_sum"
          ? "sum"
          : scale.metadata.kind === "ordinal_grade"
            ? "single_select"
            : "formula";
      if (s.method !== expectedMethod) {
        errors.push({
          path: "scoring.method",
          message: `scoring.method '${s.method}' does not match metadata.kind '${scale.metadata.kind}'`,
        });
      }
    }

    if (!isFiniteNumber(s.min_score)) {
      errors.push({
        path: "scoring.min_score",
        message: "min_score must be a finite number",
      });
    }
    if (s.max_score !== null && !isFiniteNumber(s.max_score)) {
      errors.push({
        path: "scoring.max_score",
        message: "max_score must be a finite number or null",
      });
    } else if (
      isFiniteNumber(s.min_score) &&
      s.max_score !== null &&
      s.max_score < s.min_score
    ) {
      errors.push({
        path: "scoring.max_score",
        message: "max_score must be >= min_score",
      });
    }

    const hasExpression = isNonEmptyString(s.expression);
    if (s.expression !== undefined) {
      if (!isNonEmptyString(s.expression)) {
        errors.push({
          path: "scoring.expression",
          message: "scoring.expression must be a non-empty math expression",
        });
      } else {
        const exprCheck = validateExpression(
          s.expression,
          new Set(itemById.keys())
        );
        if (!exprCheck.valid) {
          errors.push({
            path: "scoring.expression",
            message: exprCheck.error ?? "Invalid scoring expression",
          });
        }
      }
    }

    if (s.method === "formula") {
      const hasFormulaId =
        isNonEmptyString(s.formula_id) &&
        VALID_FORMULA_IDS.has(s.formula_id as FormulaId);
      if (!hasFormulaId && !hasExpression) {
        errors.push({
          path: "scoring.formula_id",
          message:
            "Formula scales require a valid formula_id or a custom scoring.expression",
        });
      }
    }

    if (s.subscores !== undefined) {
      if (!Array.isArray(s.subscores)) {
        errors.push({
          path: "scoring.subscores",
          message: "subscores must be an array",
        });
      } else {
        s.subscores.forEach((sub, idx) => {
          const sp = `scoring.subscores[${idx}]`;
          if (!isPlainObject(sub) || !isNonEmptyString(sub.id) || !isNonEmptyString(sub.label)) {
            errors.push({ path: sp, message: "Subscore requires id and label" });
            return;
          }
          if (!Array.isArray(sub.item_ids) || sub.item_ids.length === 0) {
            errors.push({
              path: `${sp}.item_ids`,
              message: "Subscore requires non-empty item_ids",
            });
            return;
          }
          sub.item_ids.forEach((itemId, iIdx) => {
            if (typeof itemId !== "string" || !itemById.has(itemId)) {
              errors.push({
                path: `${sp}.item_ids[${iIdx}]`,
                message: `Subscore references unknown item_id '${String(itemId)}'`,
              });
            }
          });
        });
      }
    }
  }

  // Interpretation (block 4)
  const bandIds = new Set<string>();
  const parsedBandsByCondition = new Map<
    string,
    Array<{ min: number; max: number | null; idx: number }>
  >();
  if (!Array.isArray(scale.interpretation) || scale.interpretation.length === 0) {
    errors.push({
      path: "interpretation",
      message: "At least one interpretation band is required",
    });
  } else {
    const validItemIdsForBands = new Set(itemById.keys());
    scale.interpretation.forEach((band, idx) => {
      const bp = `interpretation[${idx}]`;
      if (!isPlainObject(band)) {
        errors.push({ path: bp, message: "Interpretation band must be an object" });
        return;
      }
      if (!isNonEmptyString(band.id)) {
        errors.push({ path: `${bp}.id`, message: "Band id is required" });
      } else if (bandIds.has(band.id)) {
        errors.push({
          path: `${bp}.id`,
          message: `Duplicate band id '${band.id}'`,
        });
      } else {
        bandIds.add(band.id);
      }
      if (band.condition !== undefined) {
        if (!isNonEmptyString(band.condition)) {
          errors.push({
            path: `${bp}.condition`,
            message: "Band condition must be a non-empty expression",
          });
        } else {
          const condCheck = validateExpression(
            band.condition,
            validItemIdsForBands
          );
          if (!condCheck.valid) {
            errors.push({
              path: `${bp}.condition`,
              message: condCheck.error ?? "Invalid band condition",
            });
          }
        }
      }
      if (!isNonEmptyString(band.label)) {
        errors.push({ path: `${bp}.label`, message: "Band label is required" });
      }
      if (!isNonEmptyString(band.summary)) {
        errors.push({ path: `${bp}.summary`, message: "Band summary is required" });
      }
      if (
        !isNonEmptyString(band.severity) ||
        !VALID_SEVERITIES.has(band.severity as SeverityLevel)
      ) {
        errors.push({
          path: `${bp}.severity`,
          message: "Invalid band severity level",
        });
      }
      if (!isFiniteNumber(band.min)) {
        errors.push({ path: `${bp}.min`, message: "Band min must be a finite number" });
      }
      if (band.max !== null && !isFiniteNumber(band.max)) {
        errors.push({
          path: `${bp}.max`,
          message: "Band max must be a finite number or null",
        });
      } else if (
        isFiniteNumber(band.min) &&
        band.max !== null &&
        band.max < band.min
      ) {
        errors.push({
          path: `${bp}.max`,
          message: "Band max must be >= min",
        });
      }
      if (isFiniteNumber(band.min) && (band.max === null || isFiniteNumber(band.max))) {
        const condKey = isNonEmptyString(band.condition)
          ? band.condition.trim()
          : "__default__";
        const bucket = parsedBandsByCondition.get(condKey) ?? [];
        bucket.push({ min: band.min, max: band.max, idx });
        parsedBandsByCondition.set(condKey, bucket);
      }

      validateSourceRefs(band.refs, `${bp}.refs`, validSourceIds, errors);
    });

    // Check for overlapping interpretation bands within each condition group
    for (const parsedBands of parsedBandsByCondition.values()) {
      const sorted = [...parsedBands].sort((a, b) => a.min - b.min);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.max === null || curr.min <= prev.max) {
          errors.push({
            path: `interpretation[${curr.idx}].min`,
            message: `Interpretation band overlaps with band at index ${prev.idx} (min ${curr.min} <= prev max ${String(
              prev.max
            )})`,
          });
        }
      }
    }
  }

  // Assessment Guides (block 5)
  if (!Array.isArray(scale.assessment_guides)) {
    errors.push({
      path: "assessment_guides",
      message: "assessment_guides must be an array",
    });
  } else {
    const guideIds = new Set<string>();
    scale.assessment_guides.forEach((guide, idx) => {
      const gp = `assessment_guides[${idx}]`;
      if (!isPlainObject(guide)) {
        errors.push({ path: gp, message: "AssessmentGuide must be an object" });
        return;
      }
      if (!isNonEmptyString(guide.id)) {
        errors.push({ path: `${gp}.id`, message: "Guide id is required" });
      } else if (guideIds.has(guide.id)) {
        errors.push({
          path: `${gp}.id`,
          message: `Duplicate guide id '${guide.id}'`,
        });
      } else {
        guideIds.add(guide.id);
      }

      if (!isNonEmptyString(guide.title)) {
        errors.push({ path: `${gp}.title`, message: "Guide title is required" });
      }

      const stepsOk =
        Array.isArray(guide.bedside_steps) &&
        guide.bedside_steps.every((s) => isNonEmptyString(s));
      const pitfallsOk =
        Array.isArray(guide.pitfalls_and_exceptions) &&
        guide.pitfalls_and_exceptions.every((s) => isNonEmptyString(s));

      if (!stepsOk || !pitfallsOk) {
        errors.push({
          path: gp,
          message:
            "bedside_steps and pitfalls_and_exceptions must be arrays of non-empty strings",
        });
      } else if (
        (guide.bedside_steps as unknown[]).length === 0 &&
        (guide.pitfalls_and_exceptions as unknown[]).length === 0
      ) {
        errors.push({
          path: gp,
          message:
            "Guide must include at least one entry in bedside_steps or pitfalls_and_exceptions",
        });
      }

      if (guide.target_type === "scale") {
        if (guide.target_id !== scale.id) {
          errors.push({
            path: `${gp}.target_id`,
            message: `Scale guide target_id must equal scale.id '${String(scale.id)}'`,
          });
        }
        if (guide.option_id !== undefined) {
          errors.push({
            path: `${gp}.option_id`,
            message: "option_id is only allowed when target_type is 'option'",
          });
        }
      } else if (guide.target_type === "item") {
        if (!isNonEmptyString(guide.target_id) || !itemById.has(guide.target_id)) {
          errors.push({
            path: `${gp}.target_id`,
            message: `Guide references unknown item_id '${String(guide.target_id)}'`,
          });
        }
        if (guide.option_id !== undefined) {
          errors.push({
            path: `${gp}.option_id`,
            message: "option_id is only allowed when target_type is 'option'",
          });
        }
      } else if (guide.target_type === "option") {
        const optionSet = isNonEmptyString(guide.target_id)
          ? selectOptionsByItemId.get(guide.target_id)
          : undefined;
        if (!optionSet) {
          errors.push({
            path: `${gp}.target_id`,
            message: `Option guide target_id '${String(
              guide.target_id
            )}' must reference an existing select item`,
          });
        } else if (!isNonEmptyString(guide.option_id) || !optionSet.has(guide.option_id)) {
          errors.push({
            path: `${gp}.option_id`,
            message: `Option guide option_id '${String(
              guide.option_id
            )}' does not exist on item '${String(guide.target_id)}'`,
          });
        }
      } else {
        errors.push({
          path: `${gp}.target_type`,
          message: "target_type must be 'scale', 'item', or 'option'",
        });
      }

      validateSourceRefs(guide.refs, `${gp}.refs`, validSourceIds, errors);
    });
  }

  // Test cases (optional)
  if (scale.test_cases !== undefined) {
    if (!Array.isArray(scale.test_cases)) {
      errors.push({ path: "test_cases", message: "test_cases must be an array" });
    } else {
      scale.test_cases.forEach((tc, idx) => {
        const tp = `test_cases[${idx}]`;
        if (!isPlainObject(tc)) {
          errors.push({ path: tp, message: "TestCase must be an object" });
          return;
        }
        if (!isNonEmptyString(tc.name)) {
          errors.push({ path: `${tp}.name`, message: "TestCase name is required" });
        }
        if (!isPlainObject(tc.inputs)) {
          errors.push({
            path: `${tp}.inputs`,
            message: "TestCase inputs must be an object",
          });
        }
        if (tc.expected_score !== null && !isFiniteNumber(tc.expected_score)) {
          errors.push({
            path: `${tp}.expected_score`,
            message: "expected_score must be a finite number or null",
          });
        }
        if (
          tc.expected_band_id !== undefined &&
          (typeof tc.expected_band_id !== "string" || !bandIds.has(tc.expected_band_id))
        ) {
          errors.push({
            path: `${tp}.expected_band_id`,
            message: `Unknown expected_band_id '${String(tc.expected_band_id)}'`,
          });
        }
      });
    }
  }

  return errors;
}

export type { ScaleRecord, ScaleReference };
