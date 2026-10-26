export type CaseDifficulty = "Resident" | "Fellow" | "Attending";

export type CaseStatus = "pending" | "approved" | "needs_revision" | "rejected";

export interface CaseNeuroImaging {
  modality: string; // e.g. "Brain MRI (DWI / FLAIR)", "CTA Head & Neck"
  sequence_badge: string; // e.g. "Figure 1 • PMC Open Access"
  figure_label?: string; // e.g. "Figure 1"
  image_url: string; // Direct figure image URL from the published article
  pmcid?: string; // e.g. "PMC10423819"
  doi_url?: string; // Link to original published article
  caption: string; // Original figure caption from the published article
  findings_summary: string; // Key neuroimaging / electrophysiological takeaway
}

export interface CaseOption {
  id: "A" | "B" | "C" | "D";
  text: string;
  peer_percentage: number; // Percentage of peers selecting this option (sums to 100)
  rationale: string; // Detailed clinical explanation why right or ruled out
}

export interface ClinicalCase {
  id: string;
  case_code: string;
  title: string;
  subspecialty: string;
  subspecialties?: string[];
  difficulty: CaseDifficulty;
  estimated_time_sec: number;
  is_daily_challenge?: boolean;
  published_date: string;
  status?: CaseStatus;
  author_credit?: string;

  source_journal?: {
    name: string;
    short_name: string;
    doi_url: string;
    pmcid?: string;
    pmid?: string;
    pub_year: string;
  };

  // STEP 1: Clinical Presentation & Article Figures
  presentation: {
    demographics: string;
    chief_complaint: string;
    history_of_present_illness: string;
    past_medical_history: string;
    vitals: {
      bp: string;
      hr: string;
      rr: string;
      temp: string;
      spo2: string;
    };
    neuro_exam: string;
    key_labs_csf: string;
    imaging: CaseNeuroImaging[];
  };

  // STEP 2: 4-Option Clinical Decision MCQ
  challenge: {
    question: string;
    question_type: "Diagnosis" | "Acute Management" | "Next Best Step" | "Localization";
    options: CaseOption[];
    correct_option: "A" | "B" | "C" | "D";
  };

  // STEP 3: Discussion, Teaching Points & Clinical Pitfalls
  resolution: {
    final_diagnosis: string;
    clinical_discussion: string;
    teaching_points: string[];
    clinical_pitfalls: string[];
    related_keywords: string[];
  };
}
