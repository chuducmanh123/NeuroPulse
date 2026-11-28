# Capability Map: NeuroGuide Clinical Navigator V3.0 (Dual-Primary Axis Taxonomy & Evidence Engine)

| Module id | Responsibility | Depends on |
|---|---|---|
| `v3-taxonomy-and-classifier` | V3.0 Dual-Primary Axis Filter Taxonomy (`clinicalNavigatorTaxonomyV3.ts`: 10 Subspecialties, 71 Clinical Conditions with Multi-Parent Canonical IDs, 5 System-Wide Diagnosis Modalities, Condition-Specific Treatment & Prevention with Cross-Domain Single Label IDs) and deterministic V3.0 recommendation/trial classifier (removing legacy 9-facet labels) | — |
| `v3-query-engine` | Boolean query engine (`clinicalNavigatorEngine.ts`) executing `(Subspecialty) AND (Condition) AND (Clinical Domain) AND (Domain Filters) AND (Secondary Filters) AND (Right-Pane Content Search)` across guidelines, pivotal trials, and NeuroPulse articles | `v3-taxonomy-and-classifier` |
| `clinical-navigator-ui-v3` | Updated `ClinicalNavigatorTab.tsx` & `PivotalTrialModal.tsx`: Left-pane Dual-Primary Axis filter explorer + Secondary filters; Right-pane persistent Content Search Bar + clean guideline synthesis cards (with all legacy ontology chips removed) | `v3-taxonomy-and-classifier`, `v3-query-engine` |

Build order: `v3-taxonomy-and-classifier` → `v3-query-engine` → `clinical-navigator-ui-v3`
