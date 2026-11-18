import fs from "node:fs";
import path from "node:path";

const SOURCES_DIR = path.resolve(process.cwd(), "data/neurorx/sources");
const INTERACTIONS_PATH = path.resolve(process.cwd(), "data/neurorx/interactions.json");

const cache = new Map();
function loadSource(sourceId) {
  if (!cache.has(sourceId)) {
    cache.set(
      sourceId,
      fs.readFileSync(path.join(SOURCES_DIR, `${sourceId}.txt`), "utf-8")
    );
  }
  return cache.get(sourceId);
}

function ref(sourceId, locator, anchor, maxLen = 340) {
  const text = loadSource(sourceId);
  const idx = text.indexOf(anchor);
  if (idx === -1) {
    throw new Error(`Anchor not found in ${sourceId}: ${anchor}`);
  }
  let slice = text.slice(idx, idx + maxLen);
  if (slice.length === maxLen) {
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 50) slice = slice.slice(0, lastSpace);
  }
  const quote = slice.trim();
  if (!text.includes(quote)) {
    throw new Error(`Verbatim check failed in ${sourceId} for: ${quote}`);
  }
  return { source_id: sourceId, locator, quote };
}

const ENO = "fda-enoxaparin-label";
const HEP = "fda-heparin-label";
const FLU = "fda-fluoxetine-label";
const SER = "fda-sertraline-label";
const ESC = "fda-escitalopram-label";
const CIT = "fda-citalopram-label";
const PAR = "fda-paroxetine-label";
const FLV = "fda-fluvoxamine-label";

const NEW_INTERACTIONS = [
  // === ENOXAPARIN ===
  {
    id: "enoxaparin-aspirin",
    drug_a: "enoxaparin",
    drug_b: "aspirin",
    severity: "major",
    mechanism: "Additive antithrombotic and antiplatelet effects (LMWH anti-Xa/IIa inhibition combined with irreversible platelet COX-1 inhibition).",
    clinical_effect: "Significantly increased risk of major hemorrhage and spinal/epidural hematoma during neuraxial procedures.",
    management: "Discontinue agents that enhance hemorrhage risk prior to initiating enoxaparin when possible; when coadministered (e.g. UA/NSTEMI or STEMI), conduct close clinical and laboratory monitoring.",
    alternatives: [],
    refs: [ref(ENO, "7 DRUG INTERACTIONS", "Whenever possible, agents which may enhance the risk of hemorrhage should be discontinued prior to initiation of Lovenox therapy. These agents include medications such as: anticoagulants, platelet inhibitors including acetylsalicylic acid, salicylates, NSAIDs (including ketorolac tromethamine), dipyridamole, or sulfinpyrazone.")],
  },
  {
    id: "enoxaparin-clopidogrel",
    drug_a: "enoxaparin",
    drug_b: "clopidogrel",
    severity: "major",
    mechanism: "Additive pharmacodynamic inhibition of coagulation (LMWH) and P2Y12-mediated platelet aggregation (clopidogrel).",
    clinical_effect: "Increased risk of major bleeding and neuraxial hematoma.",
    management: "Discontinue platelet inhibitors prior to enoxaparin whenever possible; if coadministration is essential, perform close clinical and laboratory monitoring.",
    alternatives: [],
    refs: [ref(ENO, "7 DRUG INTERACTIONS", "These agents include medications such as: anticoagulants, platelet inhibitors including acetylsalicylic acid, salicylates, NSAIDs (including ketorolac tromethamine), dipyridamole, or sulfinpyrazone. If coadministration is essential, conduct close clinical and laboratory monitoring")],
  },
  {
    id: "enoxaparin-warfarin",
    drug_a: "enoxaparin",
    drug_b: "warfarin",
    severity: "major",
    mechanism: "Combined inhibition of Factor Xa/IIa (enoxaparin) and vitamin K-dependent clotting factors (warfarin).",
    clinical_effect: "Additive bleeding risk during overlap bridging.",
    management: "Overlap only as clinically indicated (e.g., DVT/PE bridging for >=5 days until INR 2–3); monitor closely for signs of bleeding and check INR.",
    alternatives: [],
    refs: [ref(ENO, "7 DRUG INTERACTIONS", "Whenever possible, agents which may enhance the risk of hemorrhage should be discontinued prior to initiation of Lovenox therapy. These agents include medications such as: anticoagulants, platelet inhibitors")],
  },
  {
    id: "enoxaparin-ibuprofen",
    drug_a: "enoxaparin",
    drug_b: "ibuprofen",
    severity: "major",
    mechanism: "LMWH anticoagulation combined with NSAID-induced platelet dysfunction and GI mucosal injury.",
    clinical_effect: "Markedly increased risk of gastrointestinal and systemic hemorrhage.",
    management: "Discontinue NSAIDs prior to initiating enoxaparin whenever possible; if coadministration is essential, conduct close clinical and laboratory monitoring.",
    alternatives: [{ drug_id: "acetaminophen", rationale: "Acetaminophen does not impair platelet aggregation or cause GI mucosal injury" }],
    refs: [ref(ENO, "7 DRUG INTERACTIONS", "Whenever possible, agents which may enhance the risk of hemorrhage should be discontinued prior to initiation of Lovenox therapy. These agents include medications such as: anticoagulants, platelet inhibitors including acetylsalicylic acid, salicylates, NSAIDs")],
  },
  {
    id: "enoxaparin-protamine",
    drug_a: "enoxaparin",
    drug_b: "protamine",
    severity: "moderate",
    mechanism: "Ionic binding of basic protamine sulfate to acidic LMWH chains partially neutralizes enoxaparin anticoagulant activity.",
    clinical_effect: "Partial reversal of enoxaparin (anti-Factor Xa activity is never completely neutralized, maximum ~60%).",
    management: "For overdose/bleeding: 1 mg protamine per 1 mg enoxaparin slow IV if given <=8 h ago; 0.5 mg per 1 mg if >8 h ago or second dose needed.",
    alternatives: [],
    refs: [ref(ENO, "10 OVERDOSAGE", "Injected Lovenox may be largely neutralized by the slow intravenous injection of protamine sulfate (1% solution). The dose of protamine sulfate should be equal to the dose of Lovenox injected: 1 mg protamine sulfate should be administered to neutralize 1 mg Lovenox, if Lovenox was administered in the previous 8 hours.")],
  },

  // === HEPARIN (UFH) ===
  {
    id: "heparin-aspirin",
    drug_a: "heparin",
    drug_b: "aspirin",
    severity: "major",
    mechanism: "Salicylates interfere with platelet-aggregation reactions, the main hemostatic defense of heparinized patients.",
    clinical_effect: "Increased risk of major bleeding.",
    management: "Use with caution; a reduction in the dose of the antiplatelet agent or heparin is recommended to reduce bleeding risk.",
    alternatives: [],
    refs: [ref(HEP, "7.2 Platelet Inhibitors", "Drugs such as NSAIDS (including salicylic acid, ibuprofen, indomethacin, and celecoxib), dextran, phenylbutazone, thienopyridines, dipyridamole, hydroxychloroquine, glycoprotein IIb/IIIa antagonists (including abciximab, eptifibatide, and tirofiban), and others that interfere with platelet-aggregation reactions (the main hemostatic defense of heparin")],
  },
  {
    id: "heparin-clopidogrel",
    drug_a: "heparin",
    drug_b: "clopidogrel",
    severity: "major",
    mechanism: "Thienopyridines (clopidogrel) inhibit platelet aggregation, impairing the primary hemostatic defense in heparinized patients.",
    clinical_effect: "Increased risk of hemorrhage.",
    management: "Use with caution; consider reducing the dose of antiplatelet agent or heparin and monitor closely for bleeding.",
    alternatives: [],
    refs: [ref(HEP, "7.2 Platelet Inhibitors", "thienopyridines, dipyridamole, hydroxychloroquine, glycoprotein IIb/IIIa antagonists (including abciximab, eptifibatide, and tirofiban), and others that interfere with platelet-aggregation reactions (the main hemostatic defense of heparinized patients) may induce bleeding and should be used with caution in patients receiving heparin sodium.")],
  },
  {
    id: "heparin-ibuprofen",
    drug_a: "heparin",
    drug_b: "ibuprofen",
    severity: "major",
    mechanism: "NSAIDs (including ibuprofen) interfere with platelet aggregation and add to heparin-induced bleeding risk.",
    clinical_effect: "Increased risk of GI and systemic bleeding.",
    management: "Use with caution or avoid; reduce dose of antiplatelet/NSAID or heparin if coadministered.",
    alternatives: [{ drug_id: "acetaminophen", rationale: "Acetaminophen does not inhibit platelet aggregation" }],
    refs: [ref(HEP, "7.2 Platelet Inhibitors", "Drugs such as NSAIDS (including salicylic acid, ibuprofen, indomethacin, and celecoxib), dextran, phenylbutazone, thienopyridines, dipyridamole, hydroxychloroquine, glycoprotein IIb/IIIa antagonists (including abciximab, eptifibatide, and tirofiban), and others that interfere with platelet-aggregation reactions")],
  },
  {
    id: "heparin-warfarin",
    drug_a: "heparin",
    drug_b: "warfarin",
    severity: "moderate",
    mechanism: "Heparin sodium prolongs the one-stage prothrombin time (PT/INR), confounding warfarin INR monitoring.",
    clinical_effect: "Falsely elevated PT/INR if blood is drawn too soon after heparin administration, plus additive bleeding risk during bridging.",
    management: "Wait at least 5 hours after the last IV heparin dose or 24 hours after the last SC heparin dose before drawing blood for a valid PT/INR.",
    alternatives: [],
    refs: [ref(HEP, "7.1 Oral Anticoagulants", "Heparin sodium may prolong the one-stage prothrombin time. Therefore, when heparin sodium is given with dicumarol or warfarin sodium, a period of at least 5 hours after the last intravenous dose or 24 hours after the last subcutaneous dose should elapse before blood is drawn, if a valid prothrombin time is to be obtained.")],
  },
  {
    id: "heparin-protamine",
    drug_a: "heparin",
    drug_b: "protamine",
    severity: "moderate",
    mechanism: "Protamine sulfate forms an inactive salt complex with acidic heparin molecules.",
    clinical_effect: "Rapid neutralization of unfractionated heparin anticoagulation (each 1 mg protamine neutralizes ~100 USP heparin units).",
    management: "Administer 1% protamine sulfate by slow IV infusion; do not exceed 50 mg in any 10-minute period.",
    alternatives: [],
    refs: [ref(HEP, "10 OVERDOSAGE — Neutralization of Heparin Effect", "When clinical circumstances (bleeding) require reversal of the heparin effect, protamine sulfate (1% solution) by slow infusion will neutralize heparin sodium. No more than 50 mg should be administered, very slowly , in any 10-minute period. Each mg of protamine sulfate neutralizes approximately 100 USP heparin units.")],
  },

  // === FLUOXETINE ===
  {
    id: "fluoxetine-warfarin",
    drug_a: "fluoxetine",
    drug_b: "warfarin",
    severity: "major",
    mechanism: "SSRI-mediated inhibition of platelet serotonin uptake plus displacement from plasma protein binding / CYP2C9 inhibition.",
    clinical_effect: "Potentiated risk of bleeding and altered warfarin anticoagulant effect.",
    management: "Monitor INR closely and observe for signs of bleeding when initiating, titrating, or stopping fluoxetine.",
    alternatives: [],
    refs: [ref(FLU, "7 DRUG INTERACTIONS", "Drugs that Interfere with Hemostasis (e.g. NSAIDs, Aspirin, Warfarin): May potentiate the risk of bleeding")],
  },
  {
    id: "fluoxetine-aspirin",
    drug_a: "fluoxetine",
    drug_b: "aspirin",
    severity: "major",
    mechanism: "SSRIs deplete platelet serotonin, impairing platelet aggregation additively with aspirin.",
    clinical_effect: "Increased risk of upper GI and systemic bleeding.",
    management: "Advise patients of increased bleeding risk and monitor closely when combining fluoxetine with aspirin or NSAIDs.",
    alternatives: [],
    refs: [ref(FLU, "7 DRUG INTERACTIONS", "Drugs that Interfere with Hemostasis (e.g. NSAIDs, Aspirin, Warfarin): May potentiate the risk of bleeding")],
  },
  {
    id: "fluoxetine-carbamazepine",
    drug_a: "fluoxetine",
    drug_b: "carbamazepine",
    severity: "major",
    mechanism: "Fluoxetine inhibits hepatic metabolism of carbamazepine.",
    clinical_effect: "Elevated carbamazepine plasma levels and clinical anticonvulsant toxicity.",
    management: "Monitor serum carbamazepine levels and clinical signs of toxicity; adjust carbamazepine dose as needed.",
    alternatives: [{ drug_id: "levetiracetam-oral", rationale: "Levetiracetam is not hepatically metabolized by CYP enzymes" }],
    refs: [ref(FLU, "7 DRUG INTERACTIONS", "Anticonvulsants: Potential for elevated phenytoin and carbamazepine levels and clinical anticonvulsant toxicity")],
  },
  {
    id: "fluoxetine-phenytoin",
    drug_a: "fluoxetine",
    drug_b: "phenytoin",
    severity: "major",
    mechanism: "Fluoxetine inhibits hepatic CYP metabolism of phenytoin.",
    clinical_effect: "Elevated phenytoin levels and clinical anticonvulsant toxicity.",
    management: "Monitor phenytoin serum concentrations and signs of toxicity; adjust phenytoin dose accordingly.",
    alternatives: [{ drug_id: "levetiracetam-oral", rationale: "Levetiracetam has no CYP-mediated interactions with SSRIs" }],
    refs: [ref(FLU, "7 DRUG INTERACTIONS", "Anticonvulsants: Potential for elevated phenytoin and carbamazepine levels and clinical anticonvulsant toxicity")],
  },
  {
    id: "fluoxetine-tramadol",
    drug_a: "fluoxetine",
    drug_b: "tramadol",
    severity: "major",
    mechanism: "Additive serotonergic stimulation (SSRI + tramadol serotonin reuptake inhibition) plus CYP2D6 inhibition reducing tramadol O-desmethylation.",
    clinical_effect: "Increased risk of serotonin syndrome and reduced opioid analgesia.",
    management: "Monitor closely for serotonin syndrome, especially at initiation and dose increases; discontinue if serotonin syndrome occurs.",
    alternatives: [],
    refs: [ref(FLU, "7 DRUG INTERACTIONS", "serotonergic drugs (including other SSRIs, SNRIs, triptans, tricyclic antidepressants, opioids, lithium, buspirone, amphetamines, tryptophan, and St. John's Wort) with PROZAC increases the risk of serotonin syndrome.")],
  },
  {
    id: "fluoxetine-sumatriptan",
    drug_a: "fluoxetine",
    drug_b: "sumatriptan",
    severity: "major",
    mechanism: "Additive serotonergic activity (SSRI + 5-HT1B/1D agonist).",
    clinical_effect: "Increased risk of serotonin syndrome (agitation, hyperreflexia, autonomic instability, incoordination).",
    management: "Monitor patients for signs and symptoms of serotonin syndrome, particularly during initiation and dosage increases.",
    alternatives: [{ drug_id: "rimegepant", rationale: "CGRP receptor antagonist without serotonergic activity" }],
    refs: [ref(FLU, "7 DRUG INTERACTIONS", "serotonergic drugs (including other SSRIs, SNRIs, triptans, tricyclic antidepressants, opioids, lithium, buspirone, amphetamines, tryptophan, and St. John's Wort) with PROZAC increases the risk of serotonin syndrome.")],
  },
  {
    id: "fluoxetine-amiodarone",
    drug_a: "fluoxetine",
    drug_b: "amiodarone",
    severity: "major",
    mechanism: "Additive QTc interval prolongation (fluoxetine + Class III antiarrhythmic amiodarone).",
    clinical_effect: "Increased risk of QT prolongation and ventricular arrhythmias (Torsades de Pointes).",
    management: "Avoid concomitant use with QT-prolonging drugs when possible; monitor ECG/QTc if clinically necessary.",
    alternatives: [{ drug_id: "sertraline", rationale: "Lower QTc prolongation risk at therapeutic doses compared with fluoxetine or citalopram" }],
    refs: [ref(FLU, "7 DRUG INTERACTIONS", "Class III antiarrhythmics (e.g., amiodarone, sotalol); and others (e.g., pentamidine, levomethadyl acetate, methadone, halofantrine, mefloquine, dolasetron mesylate, probucol or tacrolimus).")],
  },

  // === SERTRALINE ===
  {
    id: "sertraline-warfarin",
    drug_a: "sertraline",
    drug_b: "warfarin",
    severity: "major",
    mechanism: "Additive bleeding risk from SSRI platelet serotonin depletion plus potential plasma protein-binding displacement.",
    clinical_effect: "Increased risk of hemorrhage and altered INR.",
    management: "Monitor INR and clinical signs of bleeding closely when starting, adjusting, or stopping sertraline.",
    alternatives: [],
    refs: [ref(SER, "7.1 Clinically Significant Drug Interactions", "Examples: aspirin, clopidogrel, heparin, warfarin Drugs Highly Bound to Plasma Protein Clinical Impact: ZOLOFT is highly bound to plasma protein.")],
  },
  {
    id: "sertraline-aspirin",
    drug_a: "sertraline",
    drug_b: "aspirin",
    severity: "major",
    mechanism: "Concurrent use of an antiplatelet agent with an SSRI impairs platelet hemostasis additively.",
    clinical_effect: "Increased risk of GI and systemic bleeding.",
    management: "Monitor for bleeding and consider gastroprotection when clinically indicated.",
    alternatives: [],
    refs: [ref(SER, "7.1 Clinically Significant Drug Interactions", "Drugs that Interfere with Hemostasis (antiplatelet agents and anticoagulants) Clinical Impact: The concurrent use of an antiplatelet agent or anticoagulant with ZOLOFT may potentiate the risk of bleeding.")],
  },
  {
    id: "sertraline-clopidogrel",
    drug_a: "sertraline",
    drug_b: "clopidogrel",
    severity: "major",
    mechanism: "Concurrent P2Y12 antiplatelet therapy with SSRI platelet serotonin depletion.",
    clinical_effect: "Potentiated risk of bleeding.",
    management: "Monitor closely for signs and symptoms of bleeding.",
    alternatives: [],
    refs: [ref(SER, "7.1 Clinically Significant Drug Interactions", "Examples: aspirin, clopidogrel, heparin, warfarin")],
  },
  {
    id: "sertraline-phenytoin",
    drug_a: "sertraline",
    drug_b: "phenytoin",
    severity: "major",
    mechanism: "Sertraline may increase plasma concentrations of phenytoin, a narrow therapeutic index drug.",
    clinical_effect: "Increased risk of phenytoin toxicity (ataxia, nystagmus, confusion).",
    management: "Monitor phenytoin levels when initiating or titrating sertraline and reduce phenytoin dosage if needed.",
    alternatives: [{ drug_id: "levetiracetam-oral", rationale: "Levetiracetam has no CYP-mediated interaction with sertraline" }],
    refs: [ref(SER, "7.1 Clinically Significant Drug Interactions", "Phenytoin Clinical Impact: Phenytoin is a narrow therapeutic index drug. ZOLOFT may increase phenytoin concentrations. Intervention: Monitor phenytoin levels when initiating or titrating ZOLOFT. Reduce phenytoin dosage if needed.")],
  },
  {
    id: "sertraline-metoprolol",
    drug_a: "sertraline",
    drug_b: "metoprolol",
    severity: "moderate",
    mechanism: "Sertraline inhibits CYP2D6, increasing plasma exposure of CYP2D6 substrates such as metoprolol.",
    clinical_effect: "Enhanced beta-blockade (bradycardia, hypotension).",
    management: "Reduce dosage of CYP2D6-metabolized drugs like metoprolol as clinically warranted.",
    alternatives: [{ drug_id: "bisoprolol", rationale: "Bisoprolol has balanced renal/CYP3A4 clearance and is less dependent on CYP2D6" }],
    refs: [ref(SER, "7 DRUG INTERACTIONS", "CYP2D6 substrates: Reduce dosage of drugs metabolized by CYP2D6.")],
  },
  {
    id: "sertraline-tramadol",
    drug_a: "sertraline",
    drug_b: "tramadol",
    severity: "major",
    mechanism: "Additive serotonergic activity (SSRI + opioid/serotonin reuptake inhibitor tramadol).",
    clinical_effect: "Increased risk of serotonin syndrome.",
    management: "Monitor closely for serotonin syndrome during initiation and dose escalation.",
    alternatives: [],
    refs: [ref(SER, "7.1 Clinically Significant Drug Interactions", "Examples: Other SSRIs, SNRIs, triptans, tricyclic antidepressants, opioids, lithium, tryptophan, buspirone, amphetamines, and St. John’s Wort.")],
  },
  {
    id: "sertraline-sumatriptan",
    drug_a: "sertraline",
    drug_b: "sumatriptan",
    severity: "major",
    mechanism: "Additive serotonergic stimulation (SSRI + triptan).",
    clinical_effect: "Risk of serotonin syndrome (weakness, hyperreflexia, incoordination, autonomic instability).",
    management: "Monitor closely for serotonin syndrome if concomitant use is clinically warranted.",
    alternatives: [{ drug_id: "rimegepant", rationale: "CGRP antagonist without serotonergic mechanism" }],
    refs: [ref(SER, "7.1 Clinically Significant Drug Interactions", "Examples: Other SSRIs, SNRIs, triptans, tricyclic antidepressants, opioids, lithium, tryptophan, buspirone, amphetamines, and St. John’s Wort.")],
  },

  // === ESCITALOPRAM ===
  {
    id: "escitalopram-warfarin",
    drug_a: "escitalopram",
    drug_b: "warfarin",
    severity: "major",
    mechanism: "Concomitant SSRI and anticoagulant therapy impairs both platelet serotonin-mediated aggregation and coagulation.",
    clinical_effect: "Potentiated risk of bleeding.",
    management: "Inform patients of increased bleeding risk and monitor INR and bleeding signs closely.",
    alternatives: [],
    refs: [ref(ESC, "7 DRUG INTERACTIONS", "Concomitant use of Lexapro and an antiplatelet or anticoagulant may potentiate the risk of bleeding.")],
  },
  {
    id: "escitalopram-aspirin",
    drug_a: "escitalopram",
    drug_b: "aspirin",
    severity: "major",
    mechanism: "Additive antiplatelet/hemostatic impairment between escitalopram and aspirin.",
    clinical_effect: "Increased risk of GI and systemic bleeding.",
    management: "Inform patients of increased bleeding risk and monitor clinically.",
    alternatives: [],
    refs: [ref(ESC, "7 DRUG INTERACTIONS", "Concomitant use of Lexapro and an antiplatelet or anticoagulant may potentiate the risk of bleeding.")],
  },
  {
    id: "escitalopram-sumatriptan",
    drug_a: "escitalopram",
    drug_b: "sumatriptan",
    severity: "major",
    mechanism: "Additive serotonergic stimulation (SSRI + 5-HT1B/1D agonist).",
    clinical_effect: "Postmarketing reports of weakness, hyperreflexia, and incoordination; risk of serotonin syndrome.",
    management: "If concomitant treatment with sumatriptan and an SSRI is clinically warranted, appropriate observation of the patient is advised.",
    alternatives: [{ drug_id: "rimegepant", rationale: "CGRP receptor antagonist without serotonergic activity" }],
    refs: [ref(ESC, "7 DRUG INTERACTIONS — Sumatriptan", "Sumatriptan Clinical Impact: There have been postmarketing reports describing patients with weakness, hyperreflexia, and incoordination following the use of an SSRI and sumatriptan.")],
  },
  {
    id: "escitalopram-tramadol",
    drug_a: "escitalopram",
    drug_b: "tramadol",
    severity: "major",
    mechanism: "Additive serotonergic activity (escitalopram + tramadol).",
    clinical_effect: "Increased risk of serotonin syndrome.",
    management: "Monitor patients for signs and symptoms of serotonin syndrome, particularly during initiation and dosage increases.",
    alternatives: [],
    refs: [ref(ESC, "7 DRUG INTERACTIONS — Other Serotonergic Drugs", "Concomitant use of Lexapro and other serotonergic drugs (including other SSRIs, SNRIs, triptans, tricyclic antidepressants, opioids, lithium, buspirone, amphetamines, tryptophan, and St. John's Wort) increases the risk of serotonin syndrome.")],
  },

  // === CITALOPRAM ===
  {
    id: "citalopram-warfarin",
    drug_a: "citalopram",
    drug_b: "warfarin",
    severity: "major",
    mechanism: "Additive bleeding risk with SSRIs and anticoagulants.",
    clinical_effect: "Increased risk of hemorrhage and potential INR instability.",
    management: "For patients taking warfarin, carefully monitor the international normalized ratio (INR) and observe for bleeding.",
    alternatives: [],
    refs: [ref(CIT, "7 DRUG INTERACTIONS", "For patients taking warfarin, carefully monitor the international normalized ratio")],
  },
  {
    id: "citalopram-omeprazole",
    drug_a: "citalopram",
    drug_b: "omeprazole",
    severity: "major",
    mechanism: "Omeprazole inhibits CYP2C19, increasing citalopram systemic exposure and dose-dependent QTc prolongation risk.",
    clinical_effect: "Elevated citalopram plasma levels and increased risk of QT prolongation / Torsades de Pointes.",
    management: "Maximum recommended dosage of citalopram when used concomitantly with a CYP2C19 inhibitor is 20 mg once daily.",
    alternatives: [{ drug_id: "pantoprazole", rationale: "Pantoprazole has minimal CYP2C19 inhibition compared with omeprazole" }],
    refs: [ref(CIT, "2.4 Dosage Modifications with Concomitant Use of CYP2C19 Inhibitors", "The maximum recommended dosage of CELEXA when used concomitantly with a CYP2C19 inhibitor is 20 mg once daily")],
  },
  {
    id: "citalopram-sumatriptan",
    drug_a: "citalopram",
    drug_b: "sumatriptan",
    severity: "major",
    mechanism: "Additive serotonergic stimulation (citalopram + triptan).",
    clinical_effect: "Increased risk of serotonin syndrome.",
    management: "Monitor patients for signs and symptoms of serotonin syndrome, particularly during initiation and dosage increases.",
    alternatives: [{ drug_id: "rimegepant", rationale: "Non-serotonergic CGRP receptor antagonist" }],
    refs: [ref(CIT, "7 DRUG INTERACTIONS", "Concomitant use of CELEXA and other serotonergic drugs (including other SSRIs, SNRIs, triptans, tricyclic antidepressants, opioids, lithium, buspirone, amphetamines, tryptophan, and St. John's Wort) increases the risk of serotonin syndrome.")],
  },
  {
    id: "citalopram-tramadol",
    drug_a: "citalopram",
    drug_b: "tramadol",
    severity: "major",
    mechanism: "Additive serotonergic activity (citalopram + tramadol).",
    clinical_effect: "Increased risk of serotonin syndrome.",
    management: "Monitor patients for signs and symptoms of serotonin syndrome, particularly during initiation and dosage increases.",
    alternatives: [],
    refs: [ref(CIT, "7 DRUG INTERACTIONS", "Concomitant use of CELEXA and other serotonergic drugs (including other SSRIs, SNRIs, triptans, tricyclic antidepressants, opioids, lithium, buspirone, amphetamines, tryptophan, and St. John's Wort) increases the risk of serotonin syndrome.")],
  },

  // === PAROXETINE ===
  {
    id: "paroxetine-warfarin",
    drug_a: "paroxetine",
    drug_b: "warfarin",
    severity: "major",
    mechanism: "High plasma protein binding displacement and SSRI platelet serotonin depletion.",
    clinical_effect: "Increased risk of bleeding and altered anticoagulant response.",
    management: "Monitor for adverse reactions (bleeding/INR) and reduce dosage of paroxetine or protein-bound drugs (e.g. warfarin) as warranted.",
    alternatives: [],
    refs: [ref(PAR, "7 DRUG INTERACTIONS", "Drugs Highly Bound to Plasma Protein: Monitor for adverse reactions and reduce dosage of PAXIL CR or other protein-bound drugs (e.g., warfarin) as warranted.")],
  },
  {
    id: "paroxetine-tramadol",
    drug_a: "paroxetine",
    drug_b: "tramadol",
    severity: "major",
    mechanism: "Additive serotonergic activity plus strong CYP2D6 inhibition by paroxetine (impairing tramadol bioactivation to O-desmethyltramadol).",
    clinical_effect: "Increased risk of serotonin syndrome and reduced analgesic efficacy.",
    management: "Monitor patients for signs and symptoms of serotonin syndrome with concomitant use.",
    alternatives: [],
    refs: [ref(PAR, "7.1 Clinically Significant Drug Interactions", "The concomitant use of serotonergic drugs with PAXIL CR increases the risk of serotonin syndrome.")],
  },

  // === FLUVOXAMINE ===
  {
    id: "fluvoxamine-tizanidine",
    drug_a: "fluvoxamine",
    drug_b: "tizanidine",
    severity: "contraindicated",
    mechanism: "Fluvoxamine potently inhibits CYP1A2, dramatically increasing tizanidine plasma concentrations.",
    clinical_effect: "Severe hypotension, profound sedation, and psychomotor impairment.",
    management: "Coadministration of tizanidine with fluvoxamine is contraindicated.",
    alternatives: [{ drug_id: "baclofen", rationale: "Baclofen is renally eliminated and not metabolized by CYP1A2" }],
    refs: [ref(FLV, "4 CONTRAINDICATIONS", "Coadministration of thioridazine, tizanidine, pimozide, alosetron, or ramelteon with fluvoxamine maleate extended-release capsules is contraindicated")],
  },
  {
    id: "fluvoxamine-warfarin",
    drug_a: "fluvoxamine",
    drug_b: "warfarin",
    severity: "major",
    mechanism: "Fluvoxamine inhibits CYP1A2 (R-warfarin) and CYP2C9 (S-warfarin), plus SSRI bleeding risk.",
    clinical_effect: "Markedly elevated warfarin exposure, prolonged PT/INR, and hemorrhage risk.",
    management: "Monitor PT/INR closely and reduce warfarin dose as needed when initiating or stopping fluvoxamine.",
    alternatives: [],
    refs: [ref(FLV, "7.1 Potential Interactions with CYP Isoenzymes", "CYP1A2 (e.g., warfarin, theophylline, propranolol, tizanidine), CYP2C9 (e.g., warfarin), CYP3A4 (e.g., alprazolam), and CYP2C19 (e.g., omeprazole).")],
  },
  {
    id: "fluvoxamine-carbamazepine",
    drug_a: "fluvoxamine",
    drug_b: "carbamazepine",
    severity: "major",
    mechanism: "Fluvoxamine inhibits hepatic CYP3A4/oxidative metabolism of carbamazepine.",
    clinical_effect: "Elevated carbamazepine levels and symptoms of toxicity.",
    management: "Monitor carbamazepine serum levels and clinical toxicity; adjust dose as indicated.",
    alternatives: [{ drug_id: "levetiracetam-oral", rationale: "Levetiracetam is not metabolized by CYP isoenzymes" }],
    refs: [ref(FLV, "7.2 Drug Interactions", "Carbamazepine: Elevated carbamazepine levels and symptoms of toxicity with coadministration")],
  },
  {
    id: "fluvoxamine-phenytoin",
    drug_a: "fluvoxamine",
    drug_b: "phenytoin",
    severity: "major",
    mechanism: "Fluvoxamine inhibits CYP2C9/CYP2C19 oxidative metabolism of phenytoin, a narrow therapeutic index drug.",
    clinical_effect: "Elevated phenytoin plasma concentrations and toxicity.",
    management: "Monitor phenytoin plasma levels and clinical effects closely; adjust phenytoin dose as needed.",
    alternatives: [{ drug_id: "levetiracetam-oral", rationale: "Levetiracetam has no CYP-mediated interaction with fluvoxamine" }],
    refs: [ref(FLV, "7.1 Potential Interactions with CYP Isoenzymes", "certain benzodiazepines, omeprazole, and phenytoin.")],
  },
  {
    id: "fluvoxamine-omeprazole",
    drug_a: "fluvoxamine",
    drug_b: "omeprazole",
    severity: "moderate",
    mechanism: "Fluvoxamine inhibits CYP2C19-mediated metabolism of omeprazole.",
    clinical_effect: "Increased plasma concentrations of omeprazole.",
    management: "Monitor for enhanced omeprazole exposure or consider a PPI less reliant on CYP2C19 if needed.",
    alternatives: [],
    refs: [ref(FLV, "7.1 Potential Interactions with CYP Isoenzymes", "CYP2C19 (e.g., omeprazole).")],
  },
  {
    id: "fluvoxamine-metoprolol",
    drug_a: "fluvoxamine",
    drug_b: "metoprolol",
    severity: "moderate",
    mechanism: "Fluvoxamine inhibits hepatic metabolism of beta-blockers (propranolol/metoprolol).",
    clinical_effect: "Elevated metoprolol plasma levels, increasing risk of bradycardia and hypotension.",
    management: "Reduce metoprolol dose if coadministered with fluvoxamine and titrate more cautiously.",
    alternatives: [],
    refs: [ref(FLV, "7.3 Drug Interactions", "Propranolol or Metoprolol: Reduce dose if coadministered with fluvoxamine and titrate more cautiously")],
  },
  {
    id: "fluvoxamine-sumatriptan",
    drug_a: "fluvoxamine",
    drug_b: "sumatriptan",
    severity: "major",
    mechanism: "Additive serotonergic activity (SSRI + sumatriptan).",
    clinical_effect: "Rare postmarketing reports of weakness, hyperreflexia, and incoordination.",
    management: "Monitor appropriately if concomitant treatment is clinically warranted.",
    alternatives: [{ drug_id: "rimegepant", rationale: "CGRP receptor antagonist without serotonergic activity" }],
    refs: [ref(FLV, "7.2 Drug Interactions", "Sumatriptan: Rare postmarketing reports of weakness, hyperreflexia, and incoordination following use of an SSRI and sumatriptan. Monitor appropriately if concomitant treatment is clinically warranted")],
  },
];

const existing = JSON.parse(fs.readFileSync(INTERACTIONS_PATH, "utf-8"));
const existingPairs = new Set(
  existing.map((x) => [x.drug_a, x.drug_b].sort().join("|"))
);
const existingIds = new Set(existing.map((x) => x.id));

let added = 0;
for (const item of NEW_INTERACTIONS) {
  const pairKey = [item.drug_a, item.drug_b].sort().join("|");
  if (existingIds.has(item.id) || existingPairs.has(pairKey)) {
    console.log(`Skipping duplicate: ${item.id}`);
    continue;
  }
  existing.push(item);
  existingIds.add(item.id);
  existingPairs.add(pairKey);
  added++;
}

fs.writeFileSync(
  INTERACTIONS_PATH,
  JSON.stringify(existing, null, 2) + "\n",
  "utf-8"
);
console.log(`✅ Added ${added} curated interactions (total: ${existing.length})`);
