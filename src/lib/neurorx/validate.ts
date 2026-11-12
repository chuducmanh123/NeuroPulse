// Runtime validator for NeuroRx clinical data
// Reference: NEURORX-GUARDRAILS.md (G1) & SPEC-neurorx.md Section 5

import type {
  DrugRecord,
  Interaction,
  Source,
  SourceRef,
  Sourced,
  Subspecialty,
  AdverseEffectTag,
  InteractionSeverity,
} from "@/types/neurorx";

export interface ValidationError {
  path: string;
  message: string;
}

const VALID_SUBSPECIALTIES: Set<Subspecialty> = new Set([
  "stroke",
  "epilepsy",
  "movement_disorders",
  "headache",
  "neuroimmunology",
  "neuromuscular",
  "dementia",
  "neurocritical_care",
  "neuro_infectious",
]);

const VALID_AE_TAGS: Set<AdverseEffectTag> = new Set([
  "hyponatremia",
  "myoclonus",
  "confusion_delirium",
  "extrapyramidal",
  "ataxia",
  "sedation_somnolence",
  "serotonin_syndrome",
  "qt_prolongation",
  "rash_sjs_ten",
  "psychiatric_behavioral",
  "hepatotoxicity",
  "weight_gain",
  "weight_loss",
  "hyperammonemia",
  "pancreatitis",
  "nephrolithiasis",
]);

const VALID_SEVERITIES: Set<InteractionSeverity> = new Set([
  "contraindicated",
  "major",
  "moderate",
  "minor",
]);

export function validateSourceRef(
  ref: unknown,
  path: string,
  knownSourceIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ref || typeof ref !== "object") {
    return [{ path, message: "SourceRef must be an object" }];
  }
  const r = ref as Partial<SourceRef>;

  if (!r.source_id || typeof r.source_id !== "string") {
    errors.push({ path: `${path}.source_id`, message: "source_id is required" });
  } else if (!knownSourceIds.has(r.source_id)) {
    errors.push({
      path: `${path}.source_id`,
      message: `Unknown source_id '${r.source_id}' not found in registered sources`,
    });
  }

  if (!r.locator || typeof r.locator !== "string" || r.locator.trim() === "") {
    errors.push({ path: `${path}.locator`, message: "locator is required" });
  }

  if (!r.quote || typeof r.quote !== "string" || r.quote.trim() === "") {
    errors.push({ path: `${path}.quote`, message: "verbatim quote is required" });
  } else if (r.quote.length > 400) {
    errors.push({
      path: `${path}.quote`,
      message: `quote length (${r.quote.length}) exceeds maximum allowed 400 characters`,
    });
  }

  return errors;
}

export function validateSourced<T>(
  sourced: unknown,
  path: string,
  knownSourceIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!sourced || typeof sourced !== "object") {
    return [{ path, message: "Sourced field must be an object with { value, refs }" }];
  }

  const s = sourced as Partial<Sourced<T>>;

  // Rule: value !== null => refs.length >= 1
  if (s.value !== null && s.value !== undefined) {
    if (!Array.isArray(s.refs) || s.refs.length === 0) {
      errors.push({
        path: `${path}.refs`,
        message: "Non-null clinical value must have at least one source reference",
      });
    } else {
      s.refs.forEach((ref, idx) => {
        errors.push(...validateSourceRef(ref, `${path}.refs[${idx}]`, knownSourceIds));
      });
    }
  }

  return errors;
}

export function validateSources(sources: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(sources)) {
    return [{ path: "sources", message: "sources must be an array" }];
  }

  const ids = new Set<string>();
  sources.forEach((src, idx) => {
    const p = `sources[${idx}]`;
    if (!src || typeof src !== "object") {
      errors.push({ path: p, message: "Source must be an object" });
      return;
    }
    const s = src as Partial<Source>;
    if (!s.id || typeof s.id !== "string") {
      errors.push({ path: `${p}.id`, message: "Source id is required" });
    } else if (ids.has(s.id)) {
      errors.push({ path: `${p}.id`, message: `Duplicate source id: '${s.id}'` });
    } else {
      ids.add(s.id);
    }

    if (!s.title || typeof s.title !== "string") {
      errors.push({ path: `${p}.title`, message: "Source title is required" });
    }
    if (!s.publisher || typeof s.publisher !== "string") {
      errors.push({ path: `${p}.publisher`, message: "Source publisher is required" });
    }
    if (!s.year || typeof s.year !== "number") {
      errors.push({ path: `${p}.year`, message: "Source year must be a number" });
    }
  });

  return errors;
}

export function validateDrug(drug: unknown, knownSourceIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!drug || typeof drug !== "object") {
    return [{ path: "drug", message: "DrugRecord must be an object" }];
  }

  const d = drug as Partial<DrugRecord>;

  if (!d.id || typeof d.id !== "string" || d.id.trim() === "") {
    errors.push({ path: "drug.id", message: "Drug id is required" });
  }
  if (!d.generic_name || typeof d.generic_name !== "string" || d.generic_name.trim() === "") {
    errors.push({ path: "drug.generic_name", message: "generic_name is required" });
  }

  // Sourced fields
  errors.push(...validateSourced(d.tall_man, "drug.tall_man", knownSourceIds));
  errors.push(...validateSourced(d.vn_products, "drug.vn_products", knownSourceIds));
  errors.push(...validateSourced(d.bhyt, "drug.bhyt", knownSourceIds));
  errors.push(...validateSourced(d.renal_basis, "drug.renal_basis", knownSourceIds));
  errors.push(...validateSourced(d.hepatic, "drug.hepatic", knownSourceIds));
  errors.push(...validateSourced(d.black_box, "drug.black_box", knownSourceIds));
  errors.push(...validateSourced(d.mg_safety, "drug.mg_safety", knownSourceIds));
  errors.push(...validateSourced(d.ng_tube, "drug.ng_tube", knownSourceIds));
  errors.push(...validateSourced(d.pgx, "drug.pgx", knownSourceIds));
  errors.push(...validateSourced(d.ae_tags, "drug.ae_tags", knownSourceIds));
  if (d.mechanism_of_action) {
    errors.push(...validateSourced(d.mechanism_of_action, "drug.mechanism_of_action", knownSourceIds));
  }
  if (d.adverse_effects) {
    errors.push(...validateSourced(d.adverse_effects.most_common, "drug.adverse_effects.most_common", knownSourceIds));
    errors.push(...validateSourced(d.adverse_effects.serious, "drug.adverse_effects.serious", knownSourceIds));
  }
  errors.push(...validateSourced(d.enzyme_profile, "drug.enzyme_profile", knownSourceIds));

  // FDA Drug Interactions (Section 7)
  if (d.fda_interactions) {
    errors.push(...validateSourced(d.fda_interactions, "drug.fda_interactions", knownSourceIds));
    if (Array.isArray(d.fda_interactions.value)) {
      d.fda_interactions.value.forEach((item, idx) => {
        const itemPath = `drug.fda_interactions.value[${idx}]`;
        if (!item.drug_or_class || typeof item.drug_or_class !== "string" || item.drug_or_class.trim() === "") {
          errors.push({ path: `${itemPath}.drug_or_class`, message: "drug_or_class is required" });
        }
        if (!item.effect || typeof item.effect !== "string" || item.effect.trim() === "") {
          errors.push({ path: `${itemPath}.effect`, message: "effect is required" });
        }
        if (!item.management || typeof item.management !== "string" || item.management.trim() === "") {
          errors.push({ path: `${itemPath}.management`, message: "management is required" });
        }
        if (item.severity && !VALID_SEVERITIES.has(item.severity)) {
          errors.push({ path: `${itemPath}.severity`, message: `Invalid severity: '${item.severity}'` });
        }
        if (item.refs && Array.isArray(item.refs)) {
          item.refs.forEach((ref, rIdx) => {
            errors.push(...validateSourceRef(ref, `${itemPath}.refs[${rIdx}]`, knownSourceIds));
          });
        }
      });
    }
  }

  // Subspecialties
  if (!Array.isArray(d.subspecialties) || d.subspecialties.length === 0) {
    errors.push({ path: "drug.subspecialties", message: "At least one subspecialty is required" });
  } else {
    d.subspecialties.forEach((sub, idx) => {
      if (!VALID_SUBSPECIALTIES.has(sub)) {
        errors.push({
          path: `drug.subspecialties[${idx}]`,
          message: `Invalid subspecialty: '${sub}'`,
        });
      }
    });
  }

  // Adverse Effect Tags validation if value exists
  if (d.ae_tags?.value && Array.isArray(d.ae_tags.value)) {
    d.ae_tags.value.forEach((tag, idx) => {
      if (!VALID_AE_TAGS.has(tag)) {
        errors.push({
          path: `drug.ae_tags.value[${idx}]`,
          message: `Invalid AdverseEffectTag: '${tag}'`,
        });
      }
    });
  }

  // Regimens validation
  if (!Array.isArray(d.regimens)) {
    errors.push({ path: "drug.regimens", message: "regimens must be an array" });
  } else {
    d.regimens.forEach((reg, rIdx) => {
      const rp = `drug.regimens[${rIdx}]`;
      if (!reg.id) errors.push({ path: `${rp}.id`, message: "Regimen id is required" });
      if (!reg.indication) errors.push({ path: `${rp}.indication`, message: "indication is required" });
      if (!reg.route) errors.push({ path: `${rp}.route`, message: "route is required" });
      if (!Array.isArray(reg.refs) || reg.refs.length === 0) {
        errors.push({ path: `${rp}.refs`, message: "Regimen must have at least one source ref" });
      } else {
        reg.refs.forEach((ref, refIdx) => {
          errors.push(...validateSourceRef(ref, `${rp}.refs[${refIdx}]`, knownSourceIds));
        });
      }

      // Renal bands inside regimen if present
      if (reg.renal_bands) {
        reg.renal_bands.forEach((b, bIdx) => {
          const bp = `${rp}.renal_bands[${bIdx}]`;
          if (!b.dose_text) errors.push({ path: `${bp}.dose_text`, message: "dose_text is required" });
          if (!Array.isArray(b.refs) || b.refs.length === 0) {
            errors.push({ path: `${bp}.refs`, message: "Renal band must have source refs" });
          } else {
            b.refs.forEach((bRef, bRefIdx) => {
              errors.push(...validateSourceRef(bRef, `${bp}.refs[${bRefIdx}]`, knownSourceIds));
            });
          }
        });
      }
    });
  }

  // Drug-level Renal Impairment Guidance (placed after clinical regimens)
  if (d.renal_impairment) {
    const rip = "drug.renal_impairment";
    errors.push(...validateSourced(d.renal_impairment.renal_basis, `${rip}.renal_basis`, knownSourceIds));
    if (d.renal_impairment.hemodialysis) {
      errors.push(...validateSourced(d.renal_impairment.hemodialysis, `${rip}.hemodialysis`, knownSourceIds));
    }
    if (!Array.isArray(d.renal_impairment.refs) || d.renal_impairment.refs.length === 0) {
      errors.push({ path: `${rip}.refs`, message: "renal_impairment must have source refs" });
    } else {
      d.renal_impairment.refs.forEach((r, idx) => {
        errors.push(...validateSourceRef(r, `${rip}.refs[${idx}]`, knownSourceIds));
      });
    }
    if (Array.isArray(d.renal_impairment.bands)) {
      d.renal_impairment.bands.forEach((b, bIdx) => {
        const bp = `${rip}.bands[${bIdx}]`;
        if (!b.dose_text) errors.push({ path: `${bp}.dose_text`, message: "dose_text is required" });
        if (!Array.isArray(b.refs) || b.refs.length === 0) {
          errors.push({ path: `${bp}.refs`, message: "Renal band must have source refs" });
        } else {
          b.refs.forEach((bRef, bRefIdx) => {
            errors.push(...validateSourceRef(bRef, `${bp}.refs[${bRefIdx}]`, knownSourceIds));
          });
        }
      });
    }
  }

  // Reproductive Record
  if (d.reproductive) {
    errors.push(...validateSourced(d.reproductive.tier, "drug.reproductive.tier", knownSourceIds));
    errors.push(...validateSourced(d.reproductive.folic_acid, "drug.reproductive.folic_acid", knownSourceIds));
    errors.push(...validateSourced(d.reproductive.pregnancy_pk, "drug.reproductive.pregnancy_pk", knownSourceIds));
    errors.push(...validateSourced(d.reproductive.postpartum, "drug.reproductive.postpartum", knownSourceIds));
    errors.push(...validateSourced(d.reproductive.contraception, "drug.reproductive.contraception", knownSourceIds));
    errors.push(...validateSourced(d.reproductive.lactation_rid, "drug.reproductive.lactation_rid", knownSourceIds));
    errors.push(...validateSourced(d.reproductive.lactation_summary, "drug.reproductive.lactation_summary", knownSourceIds));

    if (Array.isArray(d.reproductive.mcm)) {
      d.reproductive.mcm.forEach((mcm, mIdx) => {
        const mp = `drug.reproductive.mcm[${mIdx}]`;
        if (!mcm.registry || typeof mcm.registry !== "string") {
          errors.push({ path: `${mp}.registry`, message: "MCM registry name is required" });
        }
        if (typeof mcm.percent !== "number") {
          errors.push({ path: `${mp}.percent`, message: "MCM percent must be a number" });
        }
        if (!Array.isArray(mcm.refs) || mcm.refs.length === 0) {
          errors.push({ path: `${mp}.refs`, message: "MCM entry must have at least one source ref" });
        } else {
          mcm.refs.forEach((mRef, mRefIdx) => {
            errors.push(...validateSourceRef(mRef, `${mp}.refs[${mRefIdx}]`, knownSourceIds));
          });
        }
      });
    }
  }

  // Status and Verification
  if (!["draft", "verified", "retired"].includes(d.status || "")) {
    errors.push({ path: "drug.status", message: "status must be 'draft', 'verified', or 'retired'" });
  }

  if (!d.verification || typeof d.verification !== "object") {
    errors.push({ path: "drug.verification", message: "verification metadata object is required" });
  }

  return errors;
}

export function validateInteractions(
  interactions: unknown,
  knownDrugIds: Set<string>,
  knownSourceIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(interactions)) {
    return [{ path: "interactions", message: "interactions must be an array" }];
  }

  interactions.forEach((item, idx) => {
    const p = `interactions[${idx}]`;
    if (!item || typeof item !== "object") {
      errors.push({ path: p, message: "Interaction must be an object" });
      return;
    }
    const it = item as Partial<Interaction>;

    if (!it.id) errors.push({ path: `${p}.id`, message: "Interaction id is required" });
    if (!it.drug_a || !knownDrugIds.has(it.drug_a)) {
      errors.push({ path: `${p}.drug_a`, message: `drug_a '${it.drug_a}' not found in known drug IDs` });
    }
    if (!it.drug_b || !knownDrugIds.has(it.drug_b)) {
      errors.push({ path: `${p}.drug_b`, message: `drug_b '${it.drug_b}' not found in known drug IDs` });
    }

    if (!VALID_SEVERITIES.has(it.severity as InteractionSeverity)) {
      errors.push({
        path: `${p}.severity`,
        message: `severity must be one of: ${Array.from(VALID_SEVERITIES).join(", ")}`,
      });
    }

    if (!it.mechanism) errors.push({ path: `${p}.mechanism`, message: "mechanism is required" });
    if (!it.clinical_effect) errors.push({ path: `${p}.clinical_effect`, message: "clinical_effect is required" });
    if (!it.management) errors.push({ path: `${p}.management`, message: "management is required" });

    if (!Array.isArray(it.refs) || it.refs.length === 0) {
      errors.push({ path: `${p}.refs`, message: "Interaction must have at least one source ref" });
    } else {
      it.refs.forEach((ref, refIdx) => {
        errors.push(...validateSourceRef(ref, `${p}.refs[${refIdx}]`, knownSourceIds));
      });
    }

    if (Array.isArray(it.alternatives)) {
      it.alternatives.forEach((alt, aIdx) => {
        const ap = `${p}.alternatives[${aIdx}]`;
        if (!alt.drug_id || !knownDrugIds.has(alt.drug_id)) {
          errors.push({
            path: `${ap}.drug_id`,
            message: `Alternative drug_id '${alt.drug_id}' not found in known drugs`,
          });
        }
        if (!alt.rationale) {
          errors.push({ path: `${ap}.rationale`, message: "Alternative rationale is required" });
        }
      });
    }
  });

  return errors;
}
