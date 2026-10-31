import { test, describe } from "node:test";
import assert from "node:assert";
import { parseNotebookLMContent } from "../src/lib/neuroguide/notebooklmParser.ts";

const SAMPLE_NOTEBOOKLM_TEXT = `2023 AHA/ASA Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage
Comprehensive Summary of Clinical Recommendations, COR/LOE Ratings, and Supporting Evidence
This document presents a structured compilation of recommendations, Class of Recommendation (COR), Level of Evidence (LOE), and cited supporting clinical studies extracted from the 2023 American Heart Association / American Stroke Association (AHA/ASA) Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage (aSAH). All recommendation texts are preserved verbatim.
| Clinical Domain / Topic   | Guideline Recommendation (Verbatim Text)   | Class (COR) & Level (LOE)   | Related Studies & Evidence   |
| Natural History & Grading   | In patients with aSAH, use of clinical scales (eg, the Hunt and Hess [HH] grade or World Federation of Neurosurgical Societies [WFNS] grade) is recommended to determine initial clinical severity and predict outcome.   | Class 1  LOE B-NR   | • Mocco et al. 2006  • Rosen & Macdonald 2004  • Predictive models: VASOGRADE, HAIR, SAHIT score (Jaja et al. BMJ 2018)   |
| Natural History & High-Grade aSAH   | In patients with high-grade aSAH, aneurysm treatment is reasonable, after careful discussion of likely prognosis with family members, to optimize patient outcome.   | Class 2a  LOE B-NR   | • Mocco et al. 2006 (40% favorable outcome at 12 mo in HH grade 4-5)  • Meta-analysis by Zhao et al. 2017 (85 studies, 4506 poor-grade patients; 39% good outcomes)   |
| Natural History & Unsalvageable Injury   | In patients with aSAH who do not improve after correction of modifiable conditions and are deemed unsalvageable because of evidence of irreversible neurological injury, treatment of the aneurysm is not beneficial.   | Class 3: No Benefit  LOE B-NR   | • Juvela & Siironen 2012  • Claassen et al. 2002 (Irreversible early brain injury/global cerebral edema)   |
| Diagnosis: Acute Workup   | In patients with acute onset of severe headache, prompt diagnostic workup and evaluation are recommended to diagnose/exclude aSAH and minimize morbidity and mortality.   | Class 1  LOE B-NR   | • Beck et al. 2006  • Kowalski et al. 2004  • Perry et al. 2013  • Polmear 2003 (Sentinel headache recognition)   |
| Diagnosis: Presentation >6 Hours / Deficit   | In patients with acute onset of severe headache who present >6 hours from symptom onset or who have a new neurological deficit, a noncontrast head CT and, if negative for aSAH, lumbar puncture (LP) should be performed to diagnose/exclude aSAH.   | Class 1  LOE B-NR   | • Kameda-Smith et al. 2021  • Walton et al. 2022 (Spectrophotometric xanthochromia: 100% sensitivity, 95.2% specificity)   |
| Diagnosis: Presentation <6 Hours   | In patients with acute onset of severe headache who present <6 hours from symptom onset and without new neurological deficit, a noncontrast head CT performed on a high-quality scanner and interpreted by a board-certified neuroradiologist is reasonable to diagnose/exclude aSAH.   | Class 2a  LOE B-NR   | • Meta-analysis by Dubosh et al. 2016 (8907 patients; CT <6h sensitivity 98.7%, specificity 99.9%)  • Perry et al. BMJ 2011  • Backes et al. 2012  • Blok et al. 2015   |
| Diagnosis: Ottawa SAH Rule   | In patients with acute onset of severe headache without a new neurological deficit, application of the Ottawa SAH Rule may be reasonable to identify those at high risk for aSAH.   | Class 2b  LOE B-NR   | • Perry et al. JAMA 2013  • Bellolio et al. 2015  • Perry et al. CMAJ 2017 (100% sensitivity, 7.6%–15.3% specificity)   |
| Diagnosis: Vascular Imaging (CTA / DSA)   | In patients with spontaneous SAH with high level of concern for aneurysmal source and a negative or inconclusive CT angiography (CTA), digital subtraction angiography (DSA) is indicated to diagnose/exclude cerebral aneurysm(s).   | Class 1  LOE B-NR   | • Agid et al. 2010  • Catapano et al. 2020  • Heit et al. 2016  • Howard et al. 2019   |
| Systems of Care: High-Volume Centers   | For patients with aSAH, timely transfer from hospitals with low case volume to higher-volume centers with multidisciplinary neurointensive care services, comprehensive stroke center capabilities, and experienced cerebrovascular surgeons/neuroendovascular interventionalists is recommended to improve outcomes.   | Class 1  LOE B-NR   | • Lindekleiv et al. 2015  • Kurogi et al. 2020  • Leifer et al. 2021  • Goertz et al. 2020  • Gatollari et al. 2017  • Lindgren et al. 2019   |
| Systems of Care: Dedicated Neuro-ICU   | For patients with aSAH, care should be provided in a dedicated neurocritical care unit by a multidisciplinary team.   | Class 1  LOE B-NR   | • PRINCE Study (Venkatasubba Rao et al. 2020; Suarez et al. 2020)   |
| Rebleeding: Anticoagulation Reversal   | In patients with aSAH who are receiving anticoagulants, emergency anticoagulation reversal with appropriate reversal agents should be performed to prevent rebleeding.   | Class 1  LOE C-EO   | • Greenberg et al. 2022 (AHA/ASA ICH Guideline)  • Frontera et al. 2016 (NCS/SCCM Antithrombotic Reversal Guidelines)   |
| Rebleeding: Antifibrinolytics   | In patients with aSAH, routine use of antifibrinolytic therapy is not useful to improve functional outcome.   | Class 3: No Benefit  LOE A   | • ULTRA Trial (Post et al. Lancet 2021: Ultra-early tranexamic acid showed no significant reduction in rebleeding and no functional outcome improvement)  • Shi et al. 2021  • Baharoglu et al. Cochrane 2013   |
| Aneurysm Repair: Timing   | For patients with aSAH, surgical or endovascular treatment of the ruptured aneurysm should be performed as early as feasible after presentation, preferably within 24 hours of onset, to improve outcome.   | Class 1  LOE B-NR   | • Ohman & Heiskanen 1989 (RCT of early vs late surgery)  • Meta-analyses: Rawal et al. 2017, Yao et al. 2017, Oudshoorn et al. 2014, Zhao et al. 2017   |
| Aneurysm Repair: Posterior Circulation   | For patients with aSAH from ruptured aneurysms of the posterior circulation that are amenable to coiling, coiling is indicated in preference to clipping to improve outcome.   | Class 1  LOE B-R   | • Cochrane Review (Lindgren et al. 2018; RR 0.41 for death/dependency)  • BRAT Trial (Spetzler et al. 2013, 2015)   |
| Aneurysm Repair: Large Hematoma   | For patients with aSAH deemed salvageable and with depressed level of consciousness due to large intraparenchymal hematoma, emergency clot evacuation should be performed to reduce mortality.   | Class 1  LOE B-R   | • Heiskanen et al. 1988 (RCT showing 27% vs 80% mortality benefit for clot evacuation)  • Guresir et al. 2008   |
| Aneurysm Repair: Anterior Circulation (Equal Suitability)   | For patients with good-grade aSAH from ruptured aneurysms of the anterior circulation equally suitable for both primary coiling and clipping, primary coiling is recommended in preference to clipping to improve 1-year functional outcome.   | Class 1  LOE A   | • ISAT Trial (Molyneux et al. Lancet 2002, 2005; RR 0.77 for death/dependency at 1 yr)  • Cochrane Review (Lindgren et al. 2018)   |
| Aneurysm Repair: Stents & Flow Diverters in Saccular Aneurysms   | For patients with aSAH from ruptured saccular aneurysms amenable to either primary coiling or clipping, stents or flow diverters should not be used to avoid higher risk of complications.   | Class 3: Harm  LOE B-NR   | • Bsat et al. 2020 & Cagnazzo et al. 2020 (Higher risk of ventriculostomy-related hemorrhagic complications on dual antiplatelets)   |
| Anesthetic Care: Intraoperative Osmotherapy   | In patients with aSAH, the intraoperative use of mannitol or hypertonic saline can be effective in reducing ICP and cerebral edema.   | Class 2a  LOE B-R   | • Al-Rawi et al. 2010  • Pasarikovski et al. 2017   |
| Anesthetic Care: Intraoperative Hypothermia   | In patients with good-grade aSAH, the routine use of induced mild hypothermia during aneurysm surgery is not beneficial.   | Class 3: No Benefit  LOE B-R   | • IHAST Trial (Todd et al. N Engl J Med 2005; 1000 patients, no outcome improvement)  • Anderson et al. 2006   |
| Medical Complications: Volume Management   | In patients with aSAH, close monitoring and goal-directed treatment of volume status are reasonable to maintain euvolemia.   | Class 2a  LOE B-R   | • Mutoh et al. 2014  • Chui et al. 2022  • Hoff et al. 2009   |
| Medical Complications: Mineralocorticoids   | In patients with aSAH, use of mineralocorticoids is reasonable to treat natriuresis and hyponatremia.   | Class 2a  LOE B-R   | • Fludrocortisone RCTs: Hasan et al. 1989, Mistry et al. 2016   |
| Medical Complications: Prophylactic Hypervolemia   | In patients with aSAH, induction of hypervolemia is potentially harmful because of the association with excess morbidity.   | Class 3: Harm  LOE B-R   | • Tagami et al. 2014  • Egge et al. 2001 (Volume expansion increases medical complications without outcome benefit)   |
| Medical Complications: VTE Prophylaxis   | In patients with aSAH whose ruptured aneurysm has been secured, pharmacological or mechanical venous thromboembolism (VTE) prophylaxis is recommended to reduce the risk for VTE.   | Class 1  LOE C-LD   | • CLOTS 3 Trial (Lancet 2013)  • Manoel et al. 2014   |
| Vasospasm & DCI Prophylaxis: Nimodipine   | In patients with aSAH, early initiation of enteral nimodipine is beneficial in preventing DCI and improving functional outcomes.   | Class 1  LOE A   | • Allen et al. NEJM 1983  • Cochrane Meta-analysis (Dorhout Mees et al. 2007, 16 trials, 3361 patients)  • Samseethong et al. 2018 & Hernandez-Duran et al. 2019   |
| Vasospasm & DCI Prophylaxis: Statins   | In patients with aSAH, routine use of statin therapy to improve outcomes is not recommended.   | Class 3: No Benefit  LOE A   | • Meta-analyses: Shen et al. 2017 & Vergouwen et al. 2010 (No significant benefit in DCI or mortality)   |
| Vasospasm & DCI Prophylaxis: Magnesium   | In patients with aSAH, routine use of intravenous magnesium to improve neurological outcomes is not recommended.   | Class 3: No Benefit  LOE A   | • IMASH Trial (Wong et al. 2010)  • Jeon et al. 2012  • Reddy et al. 2014   |
| DCI Management: Prophylactic Augmentation   | For patients with aSAH at risk of DCI, prophylactic hemodynamic augmentation should not be performed to reduce iatrogenic patient harm.   | Class 3: Harm  LOE B-R   | • IMPROVES Trial (Togashi et al. 2015)  • Tagami et al. 2014  • Loan et al. 2018   |
| DCI Management: Induced Hypertension   | In patients with aSAH and symptomatic vasospasm, elevating systolic BP values may be reasonable to reduce the progression and severity of DCI.   | Class 2b  LOE B-NR   | • HIMALAIA Trial (Gathier et al. 2015, 2018)  • Haegens et al. 2018  • Roy et al. 2017   |
| Hydrocephalus: Acute Diversion   | In patients with aSAH and acute symptomatic hydrocephalus, urgent CSF diversion (EVD and/or lumbar drainage) should be performed to improve neurological outcome.   | Class 1  LOE B-NR   | • Ransom et al. 2007  • McIver et al. 2002  • Rajshekhar & Harbaugh 1992   |
| Hydrocephalus: EVD Bundles   | In patients with aSAH and hydrocephalus who require an EVD, implementation and adherence to an EVD bundled protocol that addresses insertion, management, education, and monitoring are recommended to reduce complication and infection rates.   | Class 1  LOE B-NR   | • Flint et al. 2013, 2017 (Infection rates reduced from up to 37% to 0%–9%)  • Dasic et al. 2006  • Hepburn-Smith et al. 2016   |
| Seizures: Continuous EEG Monitoring   | In patients with aSAH and either fluctuating neurological examination, depressed mental state, ruptured MCA aneurysm, high-grade SAH, ICH, hydrocephalus, or cortical infarction, cEEG monitoring is reasonable to detect seizures.   | Class 2a  LOE B-NR   | • Kondziella et al. 2015  • O'Connor et al. 2014   |
| Seizures: High-Risk Prophylaxis   | In patients with aSAH and high-seizure-risk features (ie, ruptured MCA aneurysm, high-grade SAH, ICH, hydrocephalus, and cortical infarction), use of prophylactic antiseizure medication(s) may be reasonable to prevent seizures.   | Class 2b  LOE B-NR   | • Marigold et al. Cochrane 2013  • Panczykowski et al. 2016  • Chen et al. 2021   |
| Seizures: Phenytoin Harm   | In patients with aSAH, phenytoin for seizure prevention and/or antiseizure prophylaxis is associated with excess morbidity and mortality.   | Class 3: Harm  LOE B-NR   | • Naidech et al. Stroke 2005 (Phenytoin associated with functional and cognitive disability)  • Szaflarski et al. 2010  • Radic et al. 2014   |
| Seizures: Duration for Onset Seizures   | In patients with aSAH who present with seizures, treatment with antiseizure medications for ≤7 days is reasonable to reduce seizure-related complications in the perioperative period.   | Class 2a  LOE B-NR   | • Raper et al. 2013  • Murphy-Human et al. 2011  • Claassen et al. 2003   |
| Recovery: Multidisciplinary Team & Rehab   | In patients with aSAH, an early multidisciplinary team–based approach to treatment and rehabilitation is recommended to reduce LOS and identify discharge needs.   | Class 1  LOE B-NR   | • Alaraj et al. 2017 (Multidisciplinary huddles reduced hospital LOS from 21.6 to 14.1 days)   |
| Subsequent Monitoring: Recurrent Imaging   | In patients with aSAH who have undergone aneurysm repair, perioperative cerebrovascular imaging is recommended to identify remnants or recurrence of the aneurysm that may require further treatment.   | Class 1  LOE B-NR   | • ISAT Trial (Molyneux et al. 2002, 2005, 2015; 30-day target aneurysm rebleed rate 1.9% coiled vs 0.6% clipped)   |
`;

describe("NotebookLM Practice Guideline Ingestion Engine", () => {
  test("should accurately parse metadata, all 36 recommendations, COR/LOE ratings, and trials", () => {
    const { doc, stats } = parseNotebookLMContent(SAMPLE_NOTEBOOKLM_TEXT);

    // Metadata checks
    assert.strictEqual(doc.year, 2023);
    assert.ok(doc.society.includes("AHA") || doc.society.includes("ASA"), `Expected AHA/ASA, got: ${doc.society}`);
    assert.ok(doc.title.includes("Aneurysmal Subarachnoid Hemorrhage"));
    assert.strictEqual(stats.totalRecommendations, 36);
    assert.strictEqual(doc.allPracticeChanges.length, 36);

    // Top Takeaways checks
    assert.ok(doc.topTakeaways && doc.topTakeaways.length >= 8);

    // Subspecialty check
    assert.ok(
      doc.subspecialty === "Stroke" || doc.subspecialty === "Neurocritical Care",
      `Expected Stroke or Neurocritical Care, got: ${doc.subspecialty}`
    );

    // First recommendation checks
    const firstRec = doc.allPracticeChanges[0];
    assert.strictEqual(firstRec.category, "Natural History");
    assert.strictEqual(firstRec.topic, "Natural History & Grading");
    assert.ok(firstRec.currentText.includes("clinical scales"));
    assert.strictEqual(firstRec.currentGrade, "Class 1, Level B-NR");
    assert.strictEqual(firstRec.changeType, "UPGRADED");
    assert.ok(firstRec.drivingTrials.some((t) => t.includes("Mocco et al. 2006")));

    // Harm recommendation checks (Phenytoin)
    const phenytoinRec = doc.allPracticeChanges.find((r) => r.topic.includes("Phenytoin Harm"));
    assert.ok(phenytoinRec, "Expected phenytoin recommendation to exist");
    assert.strictEqual(phenytoinRec.changeType, "DOWNGRADED");
    assert.ok(phenytoinRec.currentGrade.includes("Harm"));
    assert.ok(phenytoinRec.drivingTrials.some((t) => t.includes("Naidech et al.")));

    // Nimodipine recommendation checks
    const nimodipineRec = doc.allPracticeChanges.find((r) => r.topic.includes("Nimodipine"));
    assert.ok(nimodipineRec, "Expected nimodipine recommendation");
    assert.strictEqual(nimodipineRec.currentGrade, "Class 1, Level A");
    assert.ok(nimodipineRec.drivingTrials.some((t) => t.includes("Allen et al.") || t.includes("Cochrane")));

    // Executive summaries
    assert.ok(doc.executiveSummary.length > 50);
    assert.ok(doc.executiveSummaryVi && doc.executiveSummaryVi.includes("Xuất huyết dưới nhện"));
  });
});
