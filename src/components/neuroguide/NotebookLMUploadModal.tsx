"use client";

import React, { useState, useRef, useMemo } from "react";
import { parseNotebookLMContent } from "@/lib/neuroguide/notebooklmParser";
import { GuidelineDoc, SubspecialtyType, NEUROLOGY_SUBSPECIALTIES } from "@/types/neuroguide";

interface NotebookLMUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: GuidelineDoc) => void;
  darkMode: boolean;
}

const SAMPLE_AHA_ASAH_TEXT = `2023 AHA/ASA Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage
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
| Subsequent Monitoring: Recurrent Imaging   | In patients with aSAH who have undergone aneurysm repair, perioperative cerebrovascular imaging is recommended to identify remnants or recurrence of the aneurysm that may require further treatment.   | Class 1  LOE B-NR   | • ISAT Trial (Molyneux et al. 2002, 2005, 2015; 30-day target aneurysm rebleed rate 1.9% coiled vs 0.6% clipped)   |`;

export function NotebookLMUploadModal({
  isOpen,
  onClose,
  onSuccess,
  darkMode,
}: NotebookLMUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("paste");
  const [rawText, setRawText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Editable overrides
  const [overrideTitle, setOverrideTitle] = useState<string>("");
  const [overrideSociety, setOverrideSociety] = useState<string>("");
  const [overrideYear, setOverrideYear] = useState<string>("");
  const [overrideSubspecialty, setOverrideSubspecialty] = useState<SubspecialtyType>("Stroke");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute live parsed preview whenever text changes
  const parsedPreview = useMemo(() => {
    if (!rawText || rawText.trim().length < 30) return null;
    try {
      return parseNotebookLMContent(rawText, {
        title: overrideTitle || undefined,
        society: overrideSociety || undefined,
        year: overrideYear ? parseInt(overrideYear, 10) : undefined,
        subspecialty: overrideSubspecialty,
      });
    } catch {
      return null;
    }
  }, [rawText, overrideTitle, overrideSociety, overrideYear, overrideSubspecialty]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Read text content from text-compatible files
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        setRawText(text);
      };
      reader.onerror = () => {
        setErrorMessage("Không thể đọc tệp. Vui lòng thử tải lại hoặc dán nội dung trực tiếp.");
      };
      reader.readAsText(file);
    }
  };

  const handleFillSample = () => {
    setRawText(SAMPLE_AHA_ASAH_TEXT);
    setOverrideTitle("2023 AHA/ASA Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage");
    setOverrideSociety("AHA/ASA");
    setOverrideYear("2023");
    setOverrideSubspecialty("Stroke");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText || rawText.trim().length < 20) {
      setErrorMessage("Vui lòng tải lên tệp tin (.md, .txt) hoặc dán nội dung tóm tắt từ NotebookLM.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/neuroguide/import-notebooklm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          fileName: selectedFile?.name || "notebooklm-guideline.md",
          title: overrideTitle || undefined,
          society: overrideSociety || undefined,
          year: overrideYear ? parseInt(overrideYear, 10) : undefined,
          subspecialty: overrideSubspecialty,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Lỗi xử lý tạo Guideline từ NotebookLM.");
      }

      setSuccessMessage(
        `🎉 Đã tạo thành công Practice Guideline "${data.guideline.title}" với ${data.stats?.totalRecommendations || 0} khuyến cáo!`
      );

      setTimeout(() => {
        onSuccess(data.guideline);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-xl text-white shadow-md">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Tải lên & Tạo Practice Guideline từ NotebookLM
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  AI + Rule-based Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động bóc tách bảng khuyến cáo COR / LOE, bằng chứng thử nghiệm lâm sàng và tạo thẻ Guideline hoàn chỉnh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switch & Quick Actions */}
        <div className="px-4 sm:px-5 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "paste"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📋 Dán Văn bản / Bảng Markdown
            </button>
            <button
              onClick={() => setActiveTab("file")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "file"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📁 Tải tệp tin (.md, .txt)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillSample}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>Dán thử mẫu AHA/ASA aSAH (36 Recs)</span>
            </button>
            {rawText && (
              <button
                type="button"
                onClick={() => {
                  setRawText("");
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors"
              >
                Xóa nội dung
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === "file" ? (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  selectedFile
                    ? "border-amber-500 bg-amber-500/5"
                    : darkMode
                    ? "border-slate-700 hover:border-amber-500 bg-slate-800/40"
                    : "border-slate-300 hover:border-amber-500 bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.csv,.json,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-amber-500/10 flex items-center justify-center text-2xl">
                  {selectedFile ? "📄" : "☁️"}
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Bấm để chọn tệp khác
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold">Kéo & thả tệp NotebookLM vào đây hoặc bấm để chọn tệp</p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ Markdown (.md), Plain Text (.txt), CSV (.csv)</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Nội dung Markdown hoặc Bảng từ NotebookLM:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Dán nội dung tóm tắt hoặc bảng Markdown từ NotebookLM vào đây... (Bao gồm tiêu đề và bảng khuyến cáo | Domain | Recommendation | COR/LOE | Evidence |)"
                rows={8}
                className={`w-full p-3.5 text-xs font-mono rounded-xl border outline-none transition-all ${
                  darkMode
                    ? "bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-500"
                    : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
                }`}
              />
            </div>
          )}

          {/* Metadata Customization Inputs */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Thông tin Guideline (Tự động nhận diện & Tùy chỉnh):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tiêu đề Guideline:</label>
                <input
                  type="text"
                  value={overrideTitle || parsedPreview?.doc.title || ""}
                  onChange={(e) => setOverrideTitle(e.target.value)}
                  placeholder="Ví dụ: 2023 AHA/ASA Guideline for aSAH"
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hội chuyên khoa (Society):</label>
                <input
                  type="text"
                  value={overrideSociety || parsedPreview?.doc.society || ""}
                  onChange={(e) => setOverrideSociety(e.target.value)}
                  placeholder="AHA/ASA, ESO, AAN..."
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Năm công bố:</label>
                <input
                  type="number"
                  value={overrideYear || (parsedPreview?.doc.year ? String(parsedPreview.doc.year) : "2023")}
                  onChange={(e) => setOverrideYear(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Chuyên khoa Thần kinh:</label>
                <select
                  value={overrideSubspecialty}
                  onChange={(e) => setOverrideSubspecialty(e.target.value as SubspecialtyType)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                  }`}
                >
                  {NEUROLOGY_SUBSPECIALTIES.filter((s) => s !== "All Subspecialties").map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Live Analysis Preview */}
          {parsedPreview && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">Bản xem trước phân tích tức thì:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {parsedPreview.stats.totalRecommendations} Khuyến cáo tìm thấy
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
                  {Object.entries(parsedPreview.stats.corBreakdown).map(([cor, count]) => {
                    let badgeClass = "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                    if (cor.includes("1")) badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                    else if (cor.includes("2a")) badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
                    else if (cor.includes("2b")) badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
                    else if (cor.includes("Harm") || cor.includes("3")) badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
                    return (
                      <span key={cor} className={`px-2 py-0.5 rounded-md font-bold ${badgeClass}`}>
                        {cor}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable table preview */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className={`sticky top-0 text-[10.5px] uppercase tracking-wider font-black ${
                    darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                  }`}>
                    <tr>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700 w-32">Chuyên đề</th>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700 w-28">Mức độ COR/LOE</th>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700">Nội dung Khuyến cáo</th>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700 w-44">Thử nghiệm / Bằng chứng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {parsedPreview.doc.allPracticeChanges.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                          <span className="text-[10px] text-slate-400 block">{rec.category}</span>
                          {rec.topic}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            rec.currentGrade.includes("Harm")
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              : rec.currentGrade.includes("No Benefit")
                              ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                              : rec.currentGrade.includes("Class 1")
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                          }`}>
                            {rec.currentGrade}
                          </span>
                        </td>
                        <td className="p-2 text-slate-800 dark:text-slate-200 leading-relaxed text-[11.5px]">
                          {rec.currentText}
                        </td>
                        <td className="p-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                          {rec.drivingTrials?.slice(0, 2).join(", ")}
                          {(rec.drivingTrials?.length || 0) > 2 ? "..." : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !rawText || (parsedPreview?.stats.totalRecommendations || 0) === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm ${
                isLoading || !rawText || (parsedPreview?.stats.totalRecommendations || 0) === 0
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600 shadow-md cursor-pointer"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang tổng hợp & Lưu trữ Guideline...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Tự động tạo Practice Guideline ({parsedPreview?.stats.totalRecommendations || 0} Khuyến cáo)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
