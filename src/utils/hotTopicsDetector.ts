export interface HotTopicArticle {
  id?: string;
  title: string;
  abstract?: string;
  pub_date?: string;
  article_type?: string;
  ai_takeaways?: {
    conclusion_vi?: string;
  };
}

export interface HotTopicDefinition {
  label: string;
  query: string;
}

export interface HotTopicResult {
  label: string;
  query: string;
  count: number;
  recentCount: number;
  hotScore: number;
}

// Ngân hàng các chủ đề can thiệp, đích tác động và dấu ấn sinh học lâm sàng chuyên sâu
export const HOT_TOPICS_BANK: HotTopicDefinition[] = [
  {
    label: "🩸 Late-Window & Mild-Stroke EVT",
    query: "thrombectomy|endovascular therapy|large-vessel occlusion|large vessel occlusion",
  },
  {
    label: "🧬 Anti-Amyloid & Plasma p-tau217",
    query: "p-tau217|ptau217|p-tau181|lecanemab|donanemab|amyloid pet|preclinical alzheimer",
  },
  {
    label: "🔬 NfL, GFAP & Fluid Biomarkers",
    query: "neurofilament|nfl|gfap|glial fibrillary|n-terminal tau|chitotriosidase",
  },
  {
    label: "💊 DOAC & Rhythm Control Post-Stroke/ICH",
    query: "anticoagulation|doac|doacs|warfarin|intracranial bleeding|early rhythm control",
  },
  {
    label: "🎯 Focused Ultrasound & Parkinson/DBS",
    query: "focused ultrasound|deep brain stimulation|pallidothalamic|parkinson|levodopa|dyskinesia",
  },
  {
    label: "🩸 Acute ICH BP & Neurocritical Care",
    query: "intracerebral hemorrhage|hematoma expansion|bp-lowering|intensive blood pressure",
  },
  {
    label: "🧠 Small Vessel Disease, WMH & EPVS",
    query: "white matter hyperintensities|small vessel disease|perivascular spaces|microbleeds",
  },
  {
    label: "🛡️ Ocrelizumab, MOGAD & NMOSD",
    query: "ocrelizumab|mogad|nmosd|aquaporin-4|chronic active lesion|multiple sclerosis",
  },
  {
    label: "⚡ Tenecteplase & Delayed Thrombolysis",
    query: "tenecteplase|alteplase|thrombolysis|delayed treatment window",
  },
  {
    label: "🧬 ALS & Motor Neuron Therapies",
    query: "tofersen|amyotrophic lateral sclerosis|motor neuron disease|exon skipping|gene therapy",
  },
  {
    label: "⚡ ASM Interactions & Epilepsy Outcomes",
    query: "antiseizure|drug-resistant epilepsy|young-onset dementia|status epilepticus|seizure",
  },
  {
    label: "🎗️ Meningioma & Glioma Radiotherapy",
    query: "meningioma|astrocytoma|glioblastoma|adjuvant radiotherapy|cns lymphoma",
  },
  {
    label: "💉 CGRP, Gepants & Migraine",
    query: "cgrp|gepant|ubrogepant|atogepant|rimegepant|erenumab|fremanezumab|migraine",
  },
  {
    label: "🫀 Carotid Stenosis & Revascularization",
    query: "carotid stenting|carotid endarterectomy|carotid stenosis|endarterectomy",
  },
];

export function matchTermWithBoundary(corpusLower: string, termLower: string): boolean {
  if (!termLower) return false;
  // Với các từ viết tắt ngắn (<= 5 ký tự như nfl, ich, evt, doac, gfap, dbs), bắt buộc khớp ranh giới từ để tránh bắt nhầm
  if (termLower.length <= 5 || /^[a-z0-9-]+$/.test(termLower)) {
    const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(corpusLower);
  }
  return corpusLower.includes(termLower);
}

/**
 * Cơ chế tìm ra Hot Topics mỗi ngày từ tập bài báo lâm sàng:
 * - Đếm số lượng bài báo nhắc tới chủ đề (bài viết chứa thuật ngữ trong title, abstract, kết luận).
 * - Ưu tiên các bài báo mới xuất bản trong ngày / tuần gần nhất (Recency multiplier).
 * - Đánh giá trọng số loại nghiên cứu (RCT, Guideline, Meta-Analysis mang giá trị lâm sàng cao hơn).
 * - Xếp hạng theo độ nóng tổng hợp và số lượng bài báo.
 */
export function calculateDailyHotTopics(
  articles: HotTopicArticle[],
  topN: number = 5,
  nowMs: number = Date.now()
): HotTopicResult[] {
  if (!articles || articles.length === 0) return [];

  const scored: HotTopicResult[] = HOT_TOPICS_BANK.map((item) => {
    const terms = item.query
      .toLowerCase()
      .split("|")
      .map((t) => t.trim())
      .filter(Boolean);

    let count = 0;
    let recentCount = 0;
    let hotScore = 0;

    for (const a of articles) {
      const titleL = (a.title || "").toLowerCase();
      const corpus = `${a.title || ""} ${a.abstract || ""} ${a.ai_takeaways?.conclusion_vi || ""}`.toLowerCase();

      if (terms.some((t) => matchTermWithBoundary(corpus, t))) {
        count += 1;
        const daysOld = a.pub_date
          ? Math.max(0, (nowMs - new Date(a.pub_date).getTime()) / (1000 * 60 * 60 * 24))
          : 30;

        if (daysOld <= 14) recentCount += 1;

        // Hệ số độ mới theo ngày (Mỗi ngày có bài mới sẽ thúc đẩy hot score)
        const recencyMult = daysOld <= 7 ? 3.0 : daysOld <= 14 ? 2.0 : daysOld <= 30 ? 1.4 : 1.0;

        const typeWeight =
          a.article_type === "RCT"
            ? 4.0
            : a.article_type === "Meta-Analysis" || a.article_type === "Guideline"
            ? 3.5
            : a.article_type === "Clinical Trial"
            ? 2.5
            : a.article_type === "Original Article"
            ? 1.5
            : 0.5;

        const titleBonus = terms.some((t) => matchTermWithBoundary(titleL, t)) ? 2.5 : 0;
        hotScore += (typeWeight + titleBonus) * recencyMult;
      }
    }

    // Điểm tổng hợp: Cơ số chính từ số lượng bài báo nhắc tới chủ đề (count * 2) + điểm nóng nghiên cứu & độ mới
    const totalScore = Math.round(hotScore + count * 2.0);

    return {
      label: item.label,
      query: item.query,
      count,
      recentCount,
      hotScore: totalScore,
    };
  });

  return scored
    .filter((item) => item.count > 0)
    .sort((a, b) => b.hotScore - a.hotScore || b.count - a.count)
    .slice(0, topN);
}
