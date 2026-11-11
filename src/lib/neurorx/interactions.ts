// Pure Drug-Drug Interaction (DDI) & Regimen Analysis Engine for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 5 & 6, NEURORX-GUARDRAILS.md (G1.6, G2.1)

import type {
  DrugRecord,
  Interaction,
  InteractionSeverity,
  InteractionAlternative,
  SourceRef,
} from "@/types/neurorx";

/**
 * Anticholinergic Cognitive Burden (ACB) alert threshold.
 * SPEC-neurorx.md §6 states: "ACB total ≥ 3".
 * Source: Campbell NL, Boustani MA, Lane KA, et al.
 * "Chronic Anticholinergic Use and the Aging Brain", Alzheimer's & Dementia, 2013; 9(4): 377-385.
 * DOI: https://doi.org/10.1016/j.jalz.2012.02.005
 * Regimen total ACB score ≥ 3 represents clinically definite anticholinergic burden.
 */
export const ACB_ALERT_THRESHOLD = 3;

export const ACB_CITATION = {
  id: "acb-campbell-2013",
  title: "Chronic Anticholinergic Use and the Aging Brain",
  doi: "https://doi.org/10.1016/j.jalz.2012.02.005",
};

export interface CuratedHit {
  id: string;
  drug_a: string;
  drug_b: string;
  severity: InteractionSeverity;
  mechanism: string;
  clinical_effect: string;
  management: string;
  alternatives: InteractionAlternative[];
  refs: SourceRef[];
}

export interface MechanismFlag {
  id: string;
  type: "cyp_pgp" | "serotonergic" | "qt_risk" | "acb";
  label: "Review suggested — mechanism-based";
  title: string;
  description: string;
  drugs: string[];
  refs: SourceRef[];
  details?: Record<string, unknown>;
}

export interface MgHit {
  drug_id: string;
  status: "may_worsen" | "avoid";
  note?: string;
  refs: SourceRef[];
}

export interface RegimenAnalysisResult {
  curated: CuratedHit[];
  mechanism: MechanismFlag[];
  mg: MgHit[];
  draftsExcluded: string[];
}

export interface InteractionDataStore {
  drugs?: DrugRecord[] | Record<string, DrugRecord> | Map<string, DrugRecord>;
  interactions?: Interaction[];
}

const SEVERITY_ORDER: Record<InteractionSeverity, number> = {
  contraindicated: 1,
  major: 2,
  moderate: 3,
  minor: 4,
};

function getDrugRecord(drugId: string, store: InteractionDataStore): DrugRecord | undefined {
  if (!store.drugs) return undefined;
  if (store.drugs instanceof Map) {
    return store.drugs.get(drugId);
  }
  if (Array.isArray(store.drugs)) {
    return store.drugs.find((d) => d.id === drugId);
  }
  return store.drugs[drugId];
}

function deduplicateRefs(refs: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const r of refs) {
    const key = `${r.source_id}|${r.locator}|${r.quote}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

/**
 * Analyzes a medication regimen for curated DDIs, mechanism-based flags, and myasthenia gravis risks.
 *
 * Rules:
 * 1. Curated DDIs: Evaluated across all pairs in both directions (a-b / b-a). Sort by severity.
 * 2. Curated DDIs involving draft drugs are still shown (they are independent records).
 * 3. Mechanism flags: derived ONLY from verified drugs' enzyme_profile. Draft drugs have enzyme_profile excluded
 *    and are reported in draftsExcluded.
 * 4. Mechanism flags have label "Review suggested — mechanism-based" with NO severity field.
 * 5. Suppress duplicate mechanism flags when a curated pair already covers the same two drugs.
 * 6. MG safety: report drugs with mg_safety 'may_worsen' or 'avoid' plus refs.
 */
export function analyzeRegimen(
  drugIds: string[],
  data: InteractionDataStore
): RegimenAnalysisResult {
  const result: RegimenAnalysisResult = {
    curated: [],
    mechanism: [],
    mg: [],
    draftsExcluded: [],
  };

  const uniqueIds = Array.from(new Set(drugIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return result;
  }

  // 1. Resolve drug records and identify draft exclusions
  const recordsMap = new Map<string, DrugRecord>();
  const verifiedRecordsMap = new Map<string, DrugRecord>();

  for (const id of uniqueIds) {
    const record = getDrugRecord(id, data);
    if (record) {
      recordsMap.set(id, record);
      if (record.status === "verified") {
        verifiedRecordsMap.set(id, record);
      } else {
        result.draftsExcluded.push(id);
      }
    } else {
      // Unknown drug id treated as excluded/unverified
      result.draftsExcluded.push(id);
    }
  }

  // 2. Curated DDIs (check both orders for all pairs)
  const interactionsList = data.interactions ?? [];
  const coveredPairs = new Set<string>();
  const seenInteractionIds = new Set<string>();

  for (let i = 0; i < uniqueIds.length; i++) {
    for (let j = i + 1; j < uniqueIds.length; j++) {
      const d1 = uniqueIds[i];
      const d2 = uniqueIds[j];

      // Find matching interactions in either direction
      for (const item of interactionsList) {
        const isMatch =
          (item.drug_a === d1 && item.drug_b === d2) ||
          (item.drug_a === d2 && item.drug_b === d1);

        if (isMatch && !seenInteractionIds.has(item.id)) {
          seenInteractionIds.add(item.id);
          coveredPairs.add(`${d1}|${d2}`);
          coveredPairs.add(`${d2}|${d1}`);

          result.curated.push({
            id: item.id,
            drug_a: item.drug_a,
            drug_b: item.drug_b,
            severity: item.severity,
            mechanism: item.mechanism,
            clinical_effect: item.clinical_effect,
            management: item.management,
            alternatives: item.alternatives ?? [],
            refs: item.refs ?? [],
          });
        }
      }
    }
  }

  // Sort curated hits by severity then id
  result.curated.sort((a, b) => {
    const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  // 3. Mechanism flags (derived from non-draft verified drugs only)
  const verifiedDrugs = Array.from(verifiedRecordsMap.values());

  // (a) CYP3A4 / P-gp inducer × substrate
  for (let i = 0; i < verifiedDrugs.length; i++) {
    for (let j = 0; j < verifiedDrugs.length; j++) {
      if (i === j) continue;
      const inducer = verifiedDrugs[i];
      const substrate = verifiedDrugs[j];

      const cypMatch =
        inducer.enzyme_profile?.value?.cyp3a4 === "inducer_strong" &&
        substrate.enzyme_profile?.value?.cyp3a4 === "substrate";

      const pgpMatch =
        inducer.enzyme_profile?.value?.pgp === "inducer" &&
        substrate.enzyme_profile?.value?.pgp === "substrate";

      if (cypMatch || pgpMatch) {
        // Check suppression
        if (!coveredPairs.has(`${inducer.id}|${substrate.id}`)) {
          const pathways: string[] = [];
          if (cypMatch) pathways.push("CYP3A4 strong inducer + substrate");
          if (pgpMatch) pathways.push("P-gp inducer + substrate");

          const inducerRefs = inducer.enzyme_profile?.refs ?? [];
          const substrateRefs = substrate.enzyme_profile?.refs ?? [];

          result.mechanism.push({
            id: `mechanism-cyp-pgp-${inducer.id}-${substrate.id}`,
            type: "cyp_pgp",
            label: "Review suggested — mechanism-based",
            title: `CYP3A4 / P-gp induction interaction: ${inducer.generic_name} + ${substrate.generic_name}`,
            description: `Potential metabolic/transporter interaction via ${pathways.join("; ")}. Co-administration of a strong inducer may significantly reduce substrate plasma levels and clinical efficacy.`,
            drugs: [inducer.id, substrate.id],
            refs: deduplicateRefs([...inducerRefs, ...substrateRefs]),
          });
        }
      }
    }
  }

  // (b) Serotonergic drugs (≥ 2)
  const serotonergicDrugs = verifiedDrugs.filter(
    (d) => d.enzyme_profile?.value?.serotonergic === true
  );
  if (serotonergicDrugs.length >= 2) {
    const isTwoDrugsCovered =
      serotonergicDrugs.length === 2 &&
      coveredPairs.has(`${serotonergicDrugs[0].id}|${serotonergicDrugs[1].id}`);

    if (!isTwoDrugsCovered) {
      const allRefs = serotonergicDrugs.flatMap((d) => d.enzyme_profile?.refs ?? []);
      const names = serotonergicDrugs.map((d) => d.generic_name).join(", ");
      result.mechanism.push({
        id: "mechanism-serotonergic",
        type: "serotonergic",
        label: "Review suggested — mechanism-based",
        title: "Multiple serotonergic agents",
        description: `Regimen contains ${serotonergicDrugs.length} serotonergic agents (${names}). Concurrent administration increases the risk of additive serotonergic toxicity / serotonin syndrome.`,
        drugs: serotonergicDrugs.map((d) => d.id),
        refs: deduplicateRefs(allRefs),
      });
    }
  }

  // (c) QT risk (≥ 2)
  const qtDrugs = verifiedDrugs.filter((d) => {
    const risk = d.enzyme_profile?.value?.qt_risk;
    return risk === "conditional" || risk === "possible" || risk === "known";
  });
  if (qtDrugs.length >= 2) {
    const isTwoDrugsCovered =
      qtDrugs.length === 2 && coveredPairs.has(`${qtDrugs[0].id}|${qtDrugs[1].id}`);

    if (!isTwoDrugsCovered) {
      const allRefs = qtDrugs.flatMap((d) => d.enzyme_profile?.refs ?? []);
      const names = qtDrugs.map((d) => d.generic_name).join(", ");
      result.mechanism.push({
        id: "mechanism-qt-risk",
        type: "qt_risk",
        label: "Review suggested — mechanism-based",
        title: "Multiple QT-prolonging agents",
        description: `Regimen contains ${qtDrugs.length} agents with potential or known QT prolongation risk (${names}). Concurrent use increases the risk of additive QT prolongation and ventricular arrhythmias.`,
        drugs: qtDrugs.map((d) => d.id),
        refs: deduplicateRefs(allRefs),
      });
    }
  }

  // (d) Anticholinergic Cognitive Burden (total ACB ≥ 3)
  const acbDrugs = verifiedDrugs.filter(
    (d) => (d.enzyme_profile?.value?.acb_score ?? 0) > 0
  );
  const totalACB = acbDrugs.reduce(
    (sum, d) => sum + (d.enzyme_profile?.value?.acb_score ?? 0),
    0
  );
  if (totalACB >= ACB_ALERT_THRESHOLD) {
    const isTwoDrugsCovered =
      acbDrugs.length === 2 && coveredPairs.has(`${acbDrugs[0].id}|${acbDrugs[1].id}`);

    if (!isTwoDrugsCovered) {
      const allRefs = acbDrugs.flatMap((d) => d.enzyme_profile?.refs ?? []);
      const acbSourceRef: SourceRef = {
        source_id: "acb-campbell-2013",
        locator: "Findings",
        quote: "A definite anticholinergic cognitive burden is defined by an ACB score of 3 or greater. Exposure to medications with possible or definite anticholinergic activity with an cumulative ACB score of 3 or greater is associated with increased risk of cognitive impairment, incident dementia, and mortality.",
      };
      const breakdown = acbDrugs
        .map((d) => `${d.generic_name} (+${d.enzyme_profile?.value?.acb_score})`)
        .join(", ");
      result.mechanism.push({
        id: "mechanism-acb",
        type: "acb",
        label: "Review suggested — mechanism-based",
        title: "High Anticholinergic Cognitive Burden",
        description: `Total Anticholinergic Cognitive Burden (ACB score = ${totalACB}) meets or exceeds alert threshold of ${ACB_ALERT_THRESHOLD} (Campbell et al., Alzheimers Dement 2013; DOI: 10.1016/j.jalz.2012.02.005). Contributed by: ${breakdown}. High anticholinergic burden is associated with increased risk of delirium, cognitive decline, falls, and peripheral anticholinergic effects.`,
        drugs: acbDrugs.map((d) => d.id),
        refs: deduplicateRefs([...allRefs, acbSourceRef]),
        details: { totalACB, threshold: ACB_ALERT_THRESHOLD, citation: ACB_CITATION },
      });
    }
  }

  // 4. Myasthenia Gravis safety (mg_safety: may_worsen or avoid)
  for (const id of uniqueIds) {
    const drug = recordsMap.get(id);
    if (drug) {
      const val = drug.mg_safety?.value;
      if (val === "may_worsen" || val === "avoid") {
        result.mg.push({
          drug_id: drug.id,
          status: val,
          note: drug.mg_safety.note,
          refs: drug.mg_safety.refs ?? [],
        });
      }
    }
  }

  return result;
}
