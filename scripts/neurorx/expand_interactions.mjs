// Expand interactions.json with 8 pivotal neurological drug interactions
import fs from "fs";
import { getQuote } from "./enhance_common.mjs";

const FILE = "data/neurorx/interactions.json";
const interactions = JSON.parse(fs.readFileSync(FILE, "utf8"));

const newInteractions = [
  {
    id: "carbamazepine-valproate",
    drug_a: "carbamazepine",
    drug_b: "valproate",
    severity: "major",
    mechanism: "Carbamazepine induces hepatic microsomal oxidation of valproate, decreasing valproic acid serum concentrations; conversely, valproate inhibits microsomal epoxide hydrolase, causing accumulation of carbamazepine-10,11-epoxide (active neurotoxic metabolite).",
    clinical_effect: "Central neurotoxicity (ataxia, dizziness, diplopia, nystagmus, nausea) from toxic epoxide accumulation, accompanied by decreased valproate seizure control.",
    management: "Monitor clinical signs of neurotoxicity and serum levels of both valproate and carbamazepine. Adjust doses accordingly when initiating or withdrawing either agent.",
    alternatives: [
      {
        drug_id: "levetiracetam-oral",
        rationale: "Non-hepatic metabolism avoiding hepatic enzyme induction and epoxide hydrolase inhibition"
      }
    ],
    refs: [
      {
        source_id: "fda-carbamazepine-label",
        locator: "Section DRUG INTERACTIONS",
        quote: getQuote("fda-carbamazepine-label", "Monitor concentrations of valproate when Tegretol is introduced or withdrawn in patients using valproic acid", 20, 260)
      }
    ]
  },
  {
    id: "carbamazepine-lamotrigine",
    drug_a: "carbamazepine",
    drug_b: "lamotrigine",
    severity: "major",
    mechanism: "Carbamazepine is a potent inducer of hepatic glucuronidation (UGT1A4), reducing lamotrigine elimination half-life by more than 50%; in addition, concurrent use increases pharmacodynamic central nervous system toxicity through additive voltage-gated sodium channel inhibition.",
    clinical_effect: "Subtherapeutic lamotrigine serum levels risking seizure breakthrough; pharmacodynamic neurotoxicity manifest as severe dizziness, diplopia, ataxia, and headache.",
    management: "Patients receiving carbamazepine require approximately double the maintenance dose of lamotrigine according to official titration schedules. Monitor for neurotoxicity symptoms.",
    alternatives: [
      {
        drug_id: "levetiracetam-oral",
        rationale: "Does not induce lamotrigine glucuronidation or potentiate sodium-channel neurotoxicity"
      }
    ],
    refs: [
      {
        source_id: "fda-lamotrigine-label",
        locator: "Section 7.1 Antiepileptic Drugs",
        quote: getQuote("fda-lamotrigine-label", "Drugs that induce glucuronidation include carbamazepine, phenytoin, phenobarbital, primidone, rifampin", 20, 260)
      }
    ]
  },
  {
    id: "alteplase-warfarin",
    drug_a: "alteplase",
    drug_b: "warfarin",
    severity: "contraindicated",
    mechanism: "Warfarin-induced depletion of vitamin K-dependent clotting factors combined with alteplase-mediated systemic fibrinolysis dramatically impairs hemostasis.",
    clinical_effect: "Catastrophic intracranial hemorrhage (symptomatic hemorrhagic transformation of ischemic infarct) and severe systemic bleeding.",
    management: "Measure baseline INR prior to or immediately during acute ischemic stroke evaluation. Discontinue or withhold alteplase if pretreatment INR is greater than 1.7.",
    alternatives: [
      {
        drug_id: "prothrombin-complex-concentrate",
        rationale: "Urgent reversal of warfarin anticoagulation if life-threatening hemorrhage occurs"
      }
    ],
    refs: [
      {
        source_id: "fda-alteplase-label",
        locator: "Section 5.1 Bleeding",
        quote: getQuote("fda-alteplase-label", "Discontinue Activase if the pretreatment International Normalized Ratio (INR) is greater than 1.7", 20, 260)
      }
    ]
  },
  {
    id: "donanemab-alteplase",
    drug_a: "donanemab",
    drug_b: "alteplase",
    severity: "contraindicated",
    mechanism: "Anti-amyloid monoclonal antibodies cause Amyloid-Related Imaging Abnormalities (ARIA-E / ARIA-H) with cerebral vascular wall fragility, and ARIA-E can clinically mimic acute ischemic stroke.",
    clinical_effect: "Severe and fatal intracranial hemorrhage following intravenous thrombolysis in patients with amyloid-related cerebral vasculopathy or misdiagnosed ARIA-E.",
    management: "In patients receiving donanemab who present with acute focal neurological deficits, treating clinicians must consider whether symptoms are due to ARIA-E with emergent MRI prior to considering thrombolytic therapy.",
    alternatives: [
      {
        drug_id: "aspirin",
        rationale: "Antiplatelet therapy after ruling out ARIA-H/E and intracranial hemorrhage"
      }
    ],
    refs: [
      {
        source_id: "fda-donanemab-label",
        locator: "Section 5.1 Amyloid Related Imaging Abnormalities",
        quote: getQuote("fda-donanemab-label", "treating clinicians should consider whether such symptoms could be due to ARIA-E before giving thrombolytic therapy in a patient being treated with KISUNLA", 20, 260)
      }
    ]
  },
  {
    id: "amantadine-trihexyphenidyl",
    drug_a: "amantadine",
    drug_b: "trihexyphenidyl",
    severity: "major",
    mechanism: "Additive central and peripheral anticholinergic and dopaminergic pharmacodynamic effects.",
    clinical_effect: "High risk of acute toxic delirium, visual hallucinations, severe confusion, acute urinary retention, and paralytic ileus, especially in elderly parkinsonian patients.",
    management: "Avoid combination when possible; if co-prescribed, reduce the dosage of one or both agents and monitor closely for confusion, hallucinations, and atropine-like anticholinergic toxicity.",
    alternatives: [
      {
        drug_id: "levodopa-carbidopa",
        rationale: "First-line dopaminergic therapy without anticholinergic delirium risk"
      }
    ],
    refs: [
      {
        source_id: "fda-amantadine-label",
        locator: "Section 7.1 Other Anticholinergic Drugs",
        quote: getQuote("fda-amantadine-label", "Products with anticholinergic properties may potentiate the anticholinergic-like side effects of amantadine", 20, 260)
      }
    ]
  },
  {
    id: "memantine-amantadine",
    drug_a: "memantine",
    drug_b: "amantadine",
    severity: "major",
    mechanism: "Additive uncompetitive N-methyl-D-aspartate (NMDA) receptor antagonism and central dopamine release.",
    clinical_effect: "Increased frequency and severity of central adverse reactions, including toxic psychosis, agitation, confusion, visual hallucinations, and dizziness.",
    management: "Approach concomitant use with caution. Carefully monitor neurological and psychiatric status, and consider dose reduction or discontinuation if cognitive worsening or hallucinations occur.",
    alternatives: [
      {
        drug_id: "donepezil",
        rationale: "Acetylcholinesterase inhibitor that can be safely combined with memantine without additive NMDA blockade"
      }
    ],
    refs: [
      {
        source_id: "fda-memantine-label",
        locator: "Section 7.2 Concomitant Use with Other NMDA Antagonists",
        quote: getQuote("fda-memantine-label", "The combined use of memantine hydrochloride extended-release capsules with other NMDA antagonists (amantadine, ketamine, and dextromethorphan) has not been systematically evaluated", 20, 260)
      }
    ]
  },
  {
    id: "baclofen-diazepam",
    drug_a: "baclofen",
    drug_b: "diazepam",
    severity: "major",
    mechanism: "Additive central nervous system depression through synergistic stimulation of GABA-B (baclofen) and GABA-A (diazepam) inhibitory neuroreceptors.",
    clinical_effect: "Profound sedation, somnolence, generalized muscular hypotonia, respiratory depression, coma, and increased risk of fall injuries.",
    management: "Use lower starting doses of both agents, titrate very slowly, and closely monitor respiratory and conscious status. Avoid in elderly patients or patients with compromised respiratory drive.",
    alternatives: [
      {
        drug_id: "tizanidine",
        rationale: "Alternative alpha-2 adrenergic spasticity agent allowing single-agent titration"
      }
    ],
    refs: [
      {
        source_id: "fda-diazepam-label",
        locator: "Section 2 DOSAGE AND ADMINISTRATION",
        quote: getQuote("fda-diazepam-label", "Lower doses (usually 2 mg to 5 mg) and slow increase in dosage should be used for elderly or debilitated patients and when other sedative drugs are administered", 20, 260)
      }
    ]
  },
  {
    id: "phenytoin-carbamazepine",
    drug_a: "phenytoin",
    drug_b: "carbamazepine",
    severity: "major",
    mechanism: "Bidirectional hepatic microsomal enzyme induction: carbamazepine induces CYP2C9/2C19 lowering phenytoin levels; phenytoin induces CYP3A4 lowering carbamazepine levels, while both compete for metabolic pathways leading to unpredictable plasma level fluctuations.",
    clinical_effect: "Unstable antiepileptic drug serum concentrations with breakthrough seizures or unexpected acute neurotoxicity (nystagmus, ataxia, lethargy).",
    management: "Monitor total and free serum phenytoin and carbamazepine levels frequently upon co-administration or dosage adjustments. Individualize doses to maintain therapeutic target ranges.",
    alternatives: [
      {
        drug_id: "levetiracetam-oral",
        rationale: "Broad-spectrum antiepileptic with renal clearance that avoids bidirectional CYP enzyme induction"
      }
    ],
    refs: [
      {
        source_id: "fda-carbamazepine-label",
        locator: "Section DRUG INTERACTIONS",
        quote: getQuote("fda-carbamazepine-label", "Tegretol causes, or would be expected to cause, decreased levels of the following drugs, for which monitoring of concentrations or dosage adjustment may be necessary", 20, 260)
      }
    ]
  }
];

// Append non-duplicate interactions
for (const item of newInteractions) {
  const existingIdx = interactions.findIndex(it => it.id === item.id);
  if (existingIdx !== -1) {
    interactions[existingIdx] = item;
    console.log(`Updated existing interaction: ${item.id}`);
  } else {
    interactions.push(item);
    console.log(`Added new interaction: ${item.id}`);
  }
}

fs.writeFileSync(FILE, JSON.stringify(interactions, null, 2) + "\n", "utf8");
console.log(`Total interactions now: ${interactions.length}`);
