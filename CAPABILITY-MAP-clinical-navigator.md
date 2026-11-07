# Capability Map: NeuroGuide Clinical Navigator & Ontology-Driven Evidence Engine

| Module id | Responsibility | Depends on |
|---|---|---|
| `ontology-and-labeler` | Controlled vocabulary (`stroke_ontology.json` v0.1.0+), atomic recommendation blocks, AI Labeler (Gemini/Claude compatible), independent code validator (`labeler_tools.py` / TS validator), and Admin Review Queue + Gold Set evaluation | — |
| `pivotal-trials-and-relations` | Ultra-compact Pivotal Trials Registry (~0.5–1 KB/trial JSON/JSONB with PICO + primary/safety endpoints + DOI/PMID), rule-based & AI-proposed recommendation relations (`same_section`, `refers_to`, `same_pico`, `supersedes`, `qualifies`, `differs`, `supports_evidence`), and NeuroPulse article matcher (`public/data/articles.json`) | `ontology-and-labeler` |
| `clinical-navigator-ui` | English-language **Clinical Navigator** tab in NeuroGuide (adjacent to Clinical Scenarios): left-pane faceted ontology & keyword search builder; right-pane dynamic Cross-Society Matrix, Sequential Guideline Diff, Pivotal Trials & Evidence Bridge, Evidence Concordance Appraisal, and Related NeuroPulse Articles | `ontology-and-labeler`, `pivotal-trials-and-relations` |

Build order: `ontology-and-labeler` → `pivotal-trials-and-relations` → `clinical-navigator-ui`
