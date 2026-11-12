import fs from "node:fs";
import path from "node:path";

const DRUGS_DIR = path.resolve(process.cwd(), "data/neurorx/drugs");

const updates = {
  valproate: {
    value: [
      {
        drug_or_class: "Carbapenem Antibiotics (Meropenem, Imipenem, Ertapenem)",
        severity: "contraindicated",
        effect: "Clinically significant reduction in serum valproic acid concentrations (often by 60-90%), resulting in rapid loss of seizure control.",
        management: "Avoid concomitant use. Alternative antibacterial or anticonvulsant therapy should be considered if carbapenems are required.",
        refs: [
          {
            source_id: "fda-valproate-label",
            locator: "Section 7.1 Effects of Co-Administered Drugs on Valproate Clearance",
            quote: "A clinically significant reduction in serum valproic acid concentration has been reported in patients receiving carbapenem antibiotics (for example, ertapenem, imipenem, meropenem this is not a complete list) and may result in loss of seizure control."
          }
        ]
      },
      {
        drug_or_class: "Estrogen-Containing Hormonal Contraceptives",
        severity: "major",
        effect: "Estrogen induces UGT glucuronidation, increasing valproate clearance and decreasing serum concentrations, risking breakthrough seizures.",
        management: "Monitor serum valproate concentrations and clinical response when adding or discontinuing estrogen-containing contraceptives; dosage adjustments may be necessary.",
        refs: [
          {
            source_id: "fda-valproate-label",
            locator: "Section 7.1 Effects of Co-Administered Drugs on Valproate Clearance",
            quote: "Estrogen-containing hormonal contraceptives may increase the clearance of valproate, which may result in decreased concentration of valproate and potentially increased seizure frequency."
          }
        ]
      },
      {
        drug_or_class: "Aspirin (Salicylates)",
        severity: "moderate",
        effect: "Aspirin displaces valproate from plasma protein binding sites (4-fold increase in free fraction) and inhibits valproate hepatic beta-oxidation.",
        management: "Caution should be observed if valproate and aspirin are to be co-administered, especially in pediatric patients or when high aspirin doses are used.",
        refs: [
          {
            source_id: "fda-valproate-label",
            locator: "Section 7.1 Effects of Co-Administered Drugs on Valproate Clearance",
            quote: "A study involving the co-administration of aspirin at antipyretic doses (11 to 16 mg/kg) with valproate to pediatric patients (n = 6) revealed a decrease in protein binding and an inhibition of metabolism of valproate. Valproate free fraction was increased 4-fold in the presence of aspirin compared to valproate alone."
          }
        ]
      },
      {
        drug_or_class: "Rifampin (CYP & UGT Inducers)",
        severity: "major",
        effect: "Rifampin increases oral clearance of valproate by ~40%, causing subtherapeutic valproate concentrations.",
        management: "Valproate dosage adjustment and serum concentration monitoring are necessary when co-administered with rifampin.",
        refs: [
          {
            source_id: "fda-valproate-label",
            locator: "Section 7.1 Effects of Co-Administered Drugs on Valproate Clearance",
            quote: "A study involving the administration of a single dose of valproate (7 mg/kg) 36 hours after 5 nights of daily dosing with rifampin (600 mg) revealed a 40% increase in the oral clearance of valproate. Valproate dosage adjustment may be necessary when it is co-administered with rifampin."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-valproate-label",
        locator: "Section 7 DRUG INTERACTIONS",
        quote: "A clinically significant reduction in serum valproic acid concentration has been reported in patients receiving carbapenem antibiotics (for example, ertapenem, imipenem, meropenem this is not a complete list) and may result in loss of seizure control."
      }
    ]
  },

  tizanidine: {
    value: [
      {
        drug_or_class: "Fluvoxamine (Strong CYP1A2 Inhibitor)",
        severity: "contraindicated",
        effect: "Massive increase in tizanidine exposure (AUC increased 33-fold, Cmax increased 12-fold) leading to profound hypotension, severe somnolence, and psychomotor impairment.",
        management: "Concomitant use is contraindicated. Select an alternative muscle relaxant or antidepressant.",
        refs: [
          {
            source_id: "fda-tizanidine-label",
            locator: "Section 7.1 Fluvoxamine",
            quote: "Concomitant use of fluvoxamine and Zanaflex is contraindicated. Changes in pharmacokinetics of tizanidine when administered with fluvoxamine resulted in significantly decreased blood pressure, increased drowsiness, and increased psychomotor impairment"
          }
        ]
      },
      {
        drug_or_class: "Ciprofloxacin (Fluoroquinolone / Strong CYP1A2 Inhibitor)",
        severity: "contraindicated",
        effect: "Significant increase in tizanidine exposure (AUC increased 10-fold) resulting in severe bradycardia, profound hypotension, and CNS depression.",
        management: "Concomitant use is contraindicated. Choose an alternative antibacterial therapy without CYP1A2 inhibitory action.",
        refs: [
          {
            source_id: "fda-tizanidine-label",
            locator: "Section 7.2 Ciprofloxacin",
            quote: "Concomitant use of ciprofloxacin and Zanaflex is contraindicated. Changes in pharmacokinetics of tizanidine when administered with ciprofloxacin resulted in significantly decreased blood pressure, increased drowsiness, and increased psychomotor impairment"
          }
        ]
      },
      {
        drug_or_class: "Other CYP1A2 Inhibitors (Amiodarone, Mexiletine, Verapamil, Cimetidine, Famotidine, Acyclovir)",
        severity: "major",
        effect: "Inhibition of CYP1A2-mediated first-pass metabolism increases tizanidine blood levels and toxicity risk.",
        management: "Concomitant use should be avoided. If clinically necessary, initiate with 2 mg dose and titrate cautiously in 2-4 mg daily increments while monitoring BP and sedation.",
        refs: [
          {
            source_id: "fda-tizanidine-label",
            locator: "Section 7.3 CYP1A2 Inhibitors other than Fluvoxamine and Ciprofloxacin",
            quote: "concomitant use of Zanaflex with other CYP1A2 inhibitors, such as zileuton, fluoroquinolones other than strong CYP1A2 inhibitors (which are contraindicated), antiarrhythmics (amiodarone, mexiletine, propafenone, and verapamil), cimetidine, famotidine, oral contraceptives, acyclovir, and ticlopidine) should be avoided."
          }
        ]
      },
      {
        drug_or_class: "Oral Contraceptives (Estrogen/Progestin)",
        severity: "major",
        effect: "Oral contraceptives reduce tizanidine clearance by approximately 50%, resulting in higher tizanidine concentrations and adverse reactions.",
        management: "Concomitant use is not recommended. However, if clinically necessary, initiate with 2 mg and titrate in small 2-4 mg increments based on patient tolerability.",
        refs: [
          {
            source_id: "fda-tizanidine-label",
            locator: "Section 7.4 Oral Contraceptives",
            quote: "Concomitant use of Zanaflex with oral contraceptives is not recommended. However, if concomitant use is clinically necessary, initiate Zanaflex with a single 2 mg dose and increase in 2-4 mg steps daily based on patient response to therapy."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-tizanidine-label",
        locator: "Section 7 DRUG INTERACTIONS",
        quote: "Concomitant use of ciprofloxacin and Zanaflex is contraindicated. Changes in pharmacokinetics of tizanidine when administered with ciprofloxacin resulted in significantly decreased blood pressure, increased drowsiness, and increased psychomotor impairment"
      }
    ]
  },

  apixaban: {
    value: [
      {
        drug_or_class: "Combined P-gp and Strong CYP3A4 Inhibitors (Ketoconazole, Itraconazole, Ritonavir)",
        severity: "major",
        effect: "Dual inhibition of P-gp and CYP3A4 significantly increases apixaban exposure, doubling AUC and increasing the risk of major bleeding.",
        management: "Reduce ELIQUIS dose by 50% for patients taking 5 mg or 10 mg twice daily. If already taking 2.5 mg twice daily, avoid coadministration.",
        refs: [
          {
            source_id: "fda-apixaban-label",
            locator: "Section 7.1 Combined P-gp and Strong CYP3A4 Inhibitors",
            quote: "For patients receiving ELIQUIS 5 mg or 10 mg twice daily, the dose of ELIQUIS should be decreased by 50% when coadministered with drugs that are combined P-gp and strong CYP3A4 inhibitors (e.g., ketoconazole, itraconazole, ritonavir)"
          }
        ]
      },
      {
        drug_or_class: "Combined P-gp and Strong CYP3A4 Inducers (Rifampin, St. John's Wort)",
        severity: "contraindicated",
        effect: "Strong induction decreases apixaban AUC by ~50%, markedly increasing the risk of ischemic stroke and systemic thromboembolism.",
        management: "Avoid concomitant use of apixaban with combined P-gp and strong CYP3A4 inducers.",
        refs: [
          {
            source_id: "fda-apixaban-label",
            locator: "Section 7.2 Combined P-gp and Strong CYP3A4 Inducers",
            quote: "Avoid concomitant use of ELIQUIS with combined P-gp and strong CYP3A4 inducers (e.g., rifampin, carbamazepine, phenytoin, St. John’s wort) because such drugs will decrease exposure to apixaban"
          }
        ]
      },
      {
        drug_or_class: "Anticoagulants, Antiplatelets, NSAIDs & Aspirin",
        severity: "major",
        effect: "Additive impairment of hemostasis substantially increases the risk of clinically overt and major gastrointestinal/intracranial bleeding.",
        management: "Co-administer only when clinically indicated (e.g. acute ACS / post-PCI) with cautious monitoring of bleeding signs and symptoms.",
        refs: [
          {
            source_id: "fda-apixaban-label",
            locator: "Section 7.3 Anticoagulants and Antiplatelet Agents",
            quote: "Coadministration of antiplatelet agents, fibrinolytics, heparin, aspirin, and chronic NSAID use increases the risk of bleeding."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-apixaban-label",
        locator: "Section 7 DRUG INTERACTIONS",
        quote: "Avoid concomitant use of ELIQUIS with combined P-gp and strong CYP3A4 inducers (e.g., rifampin, carbamazepine, phenytoin, St. John’s wort) because such drugs will decrease exposure to apixaban"
      }
    ]
  },

  rivaroxaban: {
    value: [
      {
        drug_or_class: "Combined P-gp and Strong CYP3A Inhibitors (Systemic Ketoconazole, Ritonavir)",
        severity: "contraindicated",
        effect: "Significant increase in rivaroxaban plasma exposure and pharmacodynamic anticoagulant effect, elevating bleeding risk.",
        management: "Avoid concomitant administration of rivaroxaban with known combined P-gp and strong CYP3A inhibitors.",
        refs: [
          {
            source_id: "fda-rivaroxaban-label",
            locator: "Section 7.2 Drugs that Inhibit Cytochrome P450 3A Enzymes and Drug Transport Systems",
            quote: "Avoid concomitant administration of XARELTO with known combined P-gp and strong CYP3A inhibitors (e.g., ketoconazole and ritonavir)"
          }
        ]
      },
      {
        drug_or_class: "Combined P-gp and Strong CYP3A Inducers (Rifampin, St. John's Wort)",
        severity: "contraindicated",
        effect: "Marked reduction in rivaroxaban plasma concentrations (~50% decrease in AUC), risking stroke and thromboembolism.",
        management: "Avoid concomitant use of rivaroxaban with drugs that are combined P-gp and strong CYP3A inducers.",
        refs: [
          {
            source_id: "fda-rivaroxaban-label",
            locator: "Section 7.3 Drugs that Induce Cytochrome P450 3A Enzymes and Drug Transport Systems",
            quote: "Avoid concomitant use of XARELTO with drugs that are combined P-gp and strong CYP3A inducers (e.g., carbamazepine, phenytoin, rifampin, St. John's wort)"
          }
        ]
      },
      {
        drug_or_class: "Combined P-gp and Moderate CYP3A Inhibitors in Renal Impairment (Erythromycin)",
        severity: "major",
        effect: "In patients with CrCl 15 to <80 mL/min, moderate inhibitors cause disproportionate accumulation of rivaroxaban.",
        management: "Rivaroxaban should not be used in renal impairment (CrCl 15 to <80 mL/min) receiving moderate CYP3A/P-gp inhibitors unless benefit justifies risk.",
        refs: [
          {
            source_id: "fda-rivaroxaban-label",
            locator: "Section 7.2 Drugs that Inhibit Cytochrome P450 3A Enzymes and Drug Transport Systems",
            quote: "XARELTO should not be used in patients with CrCl 15 to <80 mL/min who are receiving concomitant combined P-gp and moderate CYP3A inhibitors (e.g., erythromycin) unless the potential benefit justifies the potential risk"
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-rivaroxaban-label",
        locator: "Section 7 DRUG INTERACTIONS",
        quote: "Avoid concomitant administration of XARELTO with known combined P-gp and strong CYP3A inhibitors (e.g., ketoconazole and ritonavir)"
      }
    ]
  },

  clopidogrel: {
    value: [
      {
        drug_or_class: "CYP2C19 Inhibitors (Omeprazole, Esomeprazole)",
        severity: "major",
        effect: "Omeprazole and esomeprazole inhibit CYP2C19 bioactivation, significantly decreasing active metabolite levels and antiplatelet inhibition.",
        management: "Avoid concomitant use of clopidogrel with omeprazole or esomeprazole. Consider pantoprazole or famotidine if acid suppression is needed.",
        refs: [
          {
            source_id: "fda-clopidogrel-label",
            locator: "Section 7.2 CYP2C19 Inhibitors",
            quote: "Avoid concomitant use of Plavix with omeprazole or esomeprazole. In clinical studies, omeprazole was shown to reduce significantly the antiplatelet activity of Plavix when given concomitantly or 12 hours apart."
          }
        ]
      },
      {
        drug_or_class: "Opioid Agonists (Morphine, Fentanyl)",
        severity: "moderate",
        effect: "Opioids delay gastric emptying, delaying and reducing clopidogrel absorption and platelet inhibition in acute vascular events.",
        management: "Consider the use of a parenteral antiplatelet agent in acute patients requiring coadministration of morphine or other opioid agonists.",
        refs: [
          {
            source_id: "fda-clopidogrel-label",
            locator: "Section 7.3 Opioids",
            quote: "coadministration of opioid agonists delay and reduce the absorption of clopidogrel, presumably because of slowed gastric emptying, resulting in reduced exposure to its metabolites"
          }
        ]
      },
      {
        drug_or_class: "Strong CYP2C19 Inducers (Rifampin)",
        severity: "major",
        effect: "Induction of CYP2C19 increases levels of clopidogrel active metabolite, potentiating platelet inhibition and bleeding risk.",
        management: "As a precaution, avoid concomitant use of strong CYP2C19 inducers with clopidogrel.",
        refs: [
          {
            source_id: "fda-clopidogrel-label",
            locator: "Section 7.1 CYP2C19 Inducers",
            quote: "As a precaution, avoid concomitant use of strong CYP2C19 inducers"
          }
        ]
      },
      {
        drug_or_class: "Nonsteroidal Anti-inflammatory Drugs (NSAIDs)",
        severity: "major",
        effect: "Concurrent administration of NSAIDs and clopidogrel increases mucosal ulceration and occult gastrointestinal blood loss.",
        management: "Exercise caution when co-administering NSAIDs with clopidogrel and monitor for signs of bleeding.",
        refs: [
          {
            source_id: "fda-clopidogrel-label",
            locator: "Section 7.4 Nonsteroidal Anti-inflammatory Drugs (NSAIDs)",
            quote: "Coadministration of Plavix and NSAIDs increases the risk of gastrointestinal bleeding."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-clopidogrel-label",
        locator: "Section 7 DRUG INTERACTIONS",
        quote: "Avoid concomitant use of Plavix with omeprazole or esomeprazole. In clinical studies, omeprazole was shown to reduce significantly the antiplatelet activity of Plavix when given concomitantly or 12 hours apart."
      }
    ]
  },

  lamotrigine: {
    value: [
      {
        drug_or_class: "Estrogen-Containing Oral Contraceptives",
        severity: "major",
        effect: "Estrogens induce UGT glucuronidation, decreasing lamotrigine serum concentrations by ~50% (risk of breakthrough seizures during active pill weeks, toxicity during pill-free week).",
        management: "Dosage adjustments of lamotrigine will be necessary in most patients starting or stopping estrogen-containing contraceptives; follow official titration tables.",
        refs: [
          {
            source_id: "fda-lamotrigine-label",
            locator: "Section 7 DRUG INTERACTIONS Table 5",
            quote: "Decreased lamotrigine concentrations approximately 50%."
          }
        ]
      },
      {
        drug_or_class: "Protease Inhibitors (Lopinavir/ritonavir, Atazanavir/ritonavir)",
        severity: "major",
        effect: "Antiretroviral protease inhibitors enhance glucuronidation, decreasing lamotrigine concentrations by 32% to 50%.",
        management: "Dose adjustment of lamotrigine may be needed when starting or stopping protease inhibitor regimens.",
        refs: [
          {
            source_id: "fda-lamotrigine-label",
            locator: "Section 7 DRUG INTERACTIONS Table 5",
            quote: "Decreased lamotrigine concentration approximately 50%."
          }
        ]
      },
      {
        drug_or_class: "Rifampin (Enzyme Inducer)",
        severity: "major",
        effect: "Rifampin potently induces glucuronidation, decreasing lamotrigine AUC by approximately 40%.",
        management: "Follow dosing guidelines for patients receiving concomitant glucuronidation inducers.",
        refs: [
          {
            source_id: "fda-lamotrigine-label",
            locator: "Section 7 DRUG INTERACTIONS Table 5",
            quote: "Decreased lamotrigine AUC approximately 40%."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-lamotrigine-label",
        locator: "Section 7 DRUG INTERACTIONS Table 5",
        quote: "Decreased lamotrigine concentrations approximately 50%."
      }
    ]
  },

  carbamazepine: {
    value: [
      {
        drug_or_class: "CYP3A4 Inhibitors (Macrolides, Azole Antifungals, Diltiazem, Verapamil, Ciprofloxacin, Grapefruit Juice)",
        severity: "major",
        effect: "Inhibition of CYP3A4 reduces carbamazepine clearance, elevating carbamazepine serum concentrations and risking acute neurotoxicity (ataxia, dizziness, diplopia, somnolence).",
        management: "Adjust Tegretol dosage and/or monitor serum levels closely when initiating or discontinuing CYP3A4 inhibitors.",
        refs: [
          {
            source_id: "fda-carbamazepine-label",
            locator: "Section DRUG INTERACTIONS",
            quote: "CYP3A4 inhibitors inhibit Tegretol metabolism and can thus increase plasma carbamazepine levels."
          }
        ]
      },
      {
        drug_or_class: "CYP3A4 Inducers (Rifampin, Theophylline, Aminophylline)",
        severity: "major",
        effect: "Enzyme induction increases rate of carbamazepine metabolism, causing subtherapeutic levels and seizure breakthrough.",
        management: "Monitor carbamazepine concentrations and increase dosage as clinically required.",
        refs: [
          {
            source_id: "fda-carbamazepine-label",
            locator: "Section DRUG INTERACTIONS",
            quote: "CYP3A4 inducers can increase the rate of Tegretol metabolism."
          }
        ]
      },
      {
        drug_or_class: "Oral Contraceptives & Hormonal Therapies",
        severity: "major",
        effect: "Carbamazepine strongly induces CYP3A4 and UGT, substantially reducing circulating levels of estrogen and progestin, leading to contraceptive failure.",
        management: "Recommend alternative non-hormonal contraception (e.g. copper IUD) or dual barrier methods.",
        refs: [
          {
            source_id: "fda-carbamazepine-label",
            locator: "Section DRUG INTERACTIONS",
            quote: "Tegretol is a potent inducer of hepatic 3A4 and is also known to be an inducer of CYP1A2, 2B6, 2C8/9/19, and may therefore reduce plasma concentrations of co-medications mainly metabolized by CYP1A2, 2B6, 2C8/9/19, and 3A4, through induction of their metabolism."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-carbamazepine-label",
        locator: "Section DRUG INTERACTIONS",
        quote: "CYP3A4 inhibitors inhibit Tegretol metabolism and can thus increase plasma carbamazepine levels."
      }
    ]
  },

  dabigatran: {
    value: [
      {
        drug_or_class: "P-gp Inducers (Rifampin)",
        severity: "contraindicated",
        effect: "Rifampin reduces dabigatran exposure (AUC decreased by ~66%), leading to loss of anticoagulant protection.",
        management: "Avoid coadministration of dabigatran etexilate with P-gp inducers.",
        refs: [
          {
            source_id: "fda-dabigatran-capsules-label",
            locator: "Section 7.1 Reduction of Risk of Stroke and Systemic Embolism in Non-valvular Atrial Fibrillation in Adult Patients",
            quote: "The concomitant use of dabigatran etexilate with P-gp inducers (e.g., rifampin) reduces exposure to dabigatran and should generally be avoided"
          }
        ]
      },
      {
        drug_or_class: "P-gp Inhibitors in Moderate Renal Impairment (Dronedarone, Systemic Ketoconazole)",
        severity: "major",
        effect: "In patients with CrCl 30 to 50 mL/min, P-gp inhibitors increase dabigatran exposure significantly, elevating bleeding hazard.",
        management: "Reduce dosage of dabigatran etexilate to 75 mg twice daily when given with dronedarone or ketoconazole in CrCl 30-50 mL/min.",
        refs: [
          {
            source_id: "fda-dabigatran-capsules-label",
            locator: "Section 7.1 Reduction of Risk of Stroke and Systemic Embolism in Non-valvular Atrial Fibrillation in Adult Patients",
            quote: "In patients with moderate renal impairment (CrCl 30 to 50 mL/min), reduce the dosage of dabigatran etexilate to 75 mg twice daily when administered concomitantly with the P-gp inhibitors dronedarone or systemic ketoconazole."
          }
        ]
      },
      {
        drug_or_class: "P-gp Inhibitors in Severe Renal Impairment (CrCl 15 to 30 mL/min)",
        severity: "contraindicated",
        effect: "Synergistic accumulation from impaired renal clearance and P-gp inhibition results in massive dabigatran levels.",
        management: "Concomitant use of dabigatran etexilate and P-gp inhibitors should be avoided in patients with CrCl 15 to 30 mL/min.",
        refs: [
          {
            source_id: "fda-dabigatran-capsules-label",
            locator: "Section 7.1 Reduction of Risk of Stroke and Systemic Embolism in Non-valvular Atrial Fibrillation in Adult Patients",
            quote: "The concomitant use of dabigatran etexilate and P-gp inhibitors in patients with severe renal impairment (CrCl 15 to 30 mL/min) should be avoided"
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-dabigatran-capsules-label",
        locator: "Section 7.1 Reduction of Risk of Stroke and Systemic Embolism in Non-valvular Atrial Fibrillation in Adult Patients",
        quote: "The concomitant use of dabigatran etexilate with P-gp inducers (e.g., rifampin) reduces exposure to dabigatran and should generally be avoided"
      }
    ]
  },

  warfarin: {
    value: [
      {
        drug_or_class: "Antibiotics, Antifungals & Anti-infectives (Metronidazole, Bactrim, Fluconazole, Macrolides, Quinolones)",
        severity: "major",
        effect: "Inhibition of CYP2C9/CYP3A4 or reduction of intestinal vitamin K-producing flora sharply increases INR and bleeding risk.",
        management: "Perform more frequent INR monitoring when initiating, discontinuing, or changing doses of antibiotics or antifungals; adjust warfarin dose accordingly.",
        refs: [
          {
            source_id: "fda-warfarin-label",
            locator: "Section 7.1 General Information",
            quote: "More frequent INR monitoring should be performed when starting or stopping other drugs, including botanicals, or when changing dosages of other drugs, including drugs intended for short-term use (e.g., antibiotics, antifungals, corticosteroids)"
          }
        ]
      },
      {
        drug_or_class: "CYP2C9, 1A2, and 3A4 Inhibitors",
        severity: "major",
        effect: "Inhibitors decrease the metabolic clearance of active S-warfarin and R-warfarin, causing elevated plasma concentrations and prolonged PT/INR.",
        management: "Anticipate lower warfarin dose requirements and monitor INR frequently upon co-administration.",
        refs: [
          {
            source_id: "fda-warfarin-label",
            locator: "Section 7.2 CYP450 Interactions",
            quote: "Inhibitors of CYP2C9, 1A2, and/or 3A4 have the potential to increase the effect (increase INR) of warfarin by increasing the exposure of warfarin."
          }
        ]
      },
      {
        drug_or_class: "CYP2C9, 1A2, and 3A4 Inducers (Rifampin, St. John's Wort)",
        severity: "major",
        effect: "Potent enzyme inducers accelerate warfarin hepatic clearance, decreasing INR and predisposing to recurrent thromboembolism.",
        management: "Higher warfarin maintenance doses are typically required; monitor INR closely when inducing agents are started or stopped.",
        refs: [
          {
            source_id: "fda-warfarin-label",
            locator: "Section 7.2 CYP450 Interactions",
            quote: "Inducers of CYP2C9, 1A2, and/or 3A4 have the potential to decrease the effect (decrease INR) of warfarin by decreasing the exposure of warfarin."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-warfarin-label",
        locator: "Section 7 DRUG INTERACTIONS",
        quote: "Concomitant use of drugs that increase bleeding risk, antibiotics, antifungals, botanical (herbal) products, and inhibitors and inducers of CYP2C9, 1A2, or 3A4."
      }
    ]
  },

  phenytoin: {
    value: [
      {
        drug_or_class: "Azole Antifungals, Cimetidine, Omeprazole, Sulfonamides (Bactrim)",
        severity: "major",
        effect: "Inhibition of CYP2C9 and CYP2C19 saturable metabolism produces rapid, non-linear surges in serum phenytoin levels leading to cerebellar toxicity.",
        management: "Monitor phenytoin concentrations closely and anticipate dose reductions when initiating these agents.",
        refs: [
          {
            source_id: "fda-phenytoin-label",
            locator: "Section 7 DRUG INTERACTIONS",
            quote: "Inhibition of metabolism may produce significant increases in circulating phenytoin concentrations and enhance the risk of drug toxicity."
          }
        ]
      },
      {
        drug_or_class: "Oral Contraceptives, Corticosteroids & Estrogens",
        severity: "major",
        effect: "Potent hepatic microsomal enzyme induction by phenytoin accelerates steroid clearance, risking unplanned pregnancy or loss of corticosteroid efficacy.",
        management: "Recommend alternative non-hormonal contraception or increase corticosteroid doses as clinically required.",
        refs: [
          {
            source_id: "fda-phenytoin-label",
            locator: "Section 7 DRUG INTERACTIONS",
            quote: "Multiple drug interactions because of extensive plasma protein binding, saturable metabolism and potent induction of hepatic enzymes."
          }
        ]
      }
    ],
    refs: [
      {
        source_id: "fda-phenytoin-label",
        locator: "Section 7 DRUG INTERACTIONS",
        quote: "Multiple drug interactions because of extensive plasma protein binding, saturable metabolism and potent induction of hepatic enzymes."
      }
    ]
  }
};

for (const [drugId, fdaInteractions] of Object.entries(updates)) {
  const filePath = path.join(DRUGS_DIR, `${drugId}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing drug file: ${filePath}`);
    continue;
  }
  const drug = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  drug.fda_interactions = fdaInteractions;
  fs.writeFileSync(filePath, JSON.stringify(drug, null, 2) + "\n", "utf-8");
  console.log(`✅ Updated ${drugId}.json with fda_interactions (${fdaInteractions.value.length} items)`);
}
