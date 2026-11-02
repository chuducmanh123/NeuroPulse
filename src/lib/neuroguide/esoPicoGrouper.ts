import type { PracticeChangeDetail } from "@/types/neuroguide";
import type { EsoPicoItem, EsoEvidenceQuality, EsoRecommendationStrength } from "@/components/neuroguide/EsoGuidelineTable";

/**
 * Compare two PICO identifiers (e.g. "1a", "1b", "2", "3a", "10") in natural clinical order.
 */
export function comparePicoNumbers(a: string | number, b: string | number): number {
  const parsePico = (val: string | number) => {
    const s = String(val).trim().toLowerCase();
    const match = s.match(/^(\d+)([a-z]?)/);
    if (!match) return { num: 999, sub: s };
    return { num: parseInt(match[1], 10), sub: match[2] || "" };
  };
  const pa = parsePico(a);
  const pb = parsePico(b);
  if (pa.num !== pb.num) return pa.num - pb.num;
  return pa.sub.localeCompare(pb.sub);
}

export interface ParsedConsensusItem {
  number?: string | number;
  statement: string;
  voting?: string;
}

export function parseConsensusList(
  statementText?: string,
  statementsArray?: string[],
  fallbackVoting?: string
): ParsedConsensusItem[] {
  if (Array.isArray(statementsArray) && statementsArray.length > 0) {
    const parsed: ParsedConsensusItem[] = [];
    statementsArray.forEach((item, idx) => {
      if (!item || typeof item !== "string") return;
      const trimmed = item.trim();
      if (!trimmed) return;

      const voteMatch =
        trimmed.match(/\((?:Vote:\s*|Voting:\s*)([^\)]+)\)/i) ||
        trimmed.match(/Vote:\s*([0-9]+\/[0-9]+|Unanimous)/i);

      let stmt = trimmed;
      let voting = fallbackVoting;
      if (voteMatch) {
        voting = `Vote: ${voteMatch[1] || voteMatch[0].replace(/^Vote:\s*/i, "")}`;
        stmt = stmt.replace(voteMatch[0], "").trim();
        stmt = stmt.replace(/\s*\(\s*\)$/, "").trim();
      }
      stmt = stmt.replace(/^\d+[\.\)]\s*/, "").trim();

      if (stmt.length > 0) {
        parsed.push({
          number: idx + 1,
          statement: stmt,
          voting,
        });
      }
    });
    return parsed;
  }

  if (!statementText || !statementText.trim()) return [];

  const raw = statementText.trim();

  // 1. Check if string contains multiple numbered points (e.g. "1. ...\n2. ..." or "1. ... 2. ...")
  const hasNumberedItems = /(?:^|\n)\s*(\d+)[\.\)]\s+/.test(raw);

  if (hasNumberedItems) {
    const blocks = raw
      .split(/(?:^|\n+)(?=\d+[\.\)]\s+)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    if (blocks.length > 1 || /^\d+[\.\)]\s+/.test(blocks[0])) {
      return blocks
        .map((block, idx) => {
          const numMatch = block.match(/^(\d+)[\.\)]\s*/);
          const num = numMatch ? numMatch[1] : String(idx + 1);
          let cleaned = block.replace(/^(\d+)[\.\)]\s*/, "").trim();

          const voteMatch =
            cleaned.match(/\((?:Vote:\s*|Voting:\s*)([^\)]+)\)/i) ||
            cleaned.match(/Vote:\s*([0-9]+\/[0-9]+|Unanimous)/i);

          let voting = fallbackVoting;
          if (voteMatch) {
            voting = `Vote: ${voteMatch[1] || voteMatch[0].replace(/^Vote:\s*/i, "")}`;
            cleaned = cleaned.replace(voteMatch[0], "").trim();
            cleaned = cleaned.replace(/\s*\(\s*\)$/, "").trim();
          }

          return {
            number: num,
            statement: cleaned,
            voting,
          };
        })
        .filter((it) => it.statement.length > 0);
    }
  }

  // 2. Check if string contains multiple newline-separated paragraphs (\n\n+)
  const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (paragraphs.length > 1) {
    return paragraphs
      .map((para, idx) => {
        const voteMatch =
          para.match(/\((?:Vote:\s*|Voting:\s*)([^\)]+)\)/i) ||
          para.match(/Vote:\s*([0-9]+\/[0-9]+|Unanimous)/i);

        let voting = fallbackVoting;
        let cleaned = para;
        if (voteMatch) {
          voting = `Vote: ${voteMatch[1] || voteMatch[0].replace(/^Vote:\s*/i, "")}`;
          cleaned = cleaned.replace(voteMatch[0], "").trim();
          cleaned = cleaned.replace(/\s*\(\s*\)$/, "").trim();
        }
        return {
          number: idx + 1,
          statement: cleaned,
          voting,
        };
      })
      .filter((it) => it.statement.length > 0);
  }

  // 3. Single statement
  const voteMatch =
    raw.match(/\((?:Vote:\s*|Voting:\s*)([^\)]+)\)/i) ||
    raw.match(/Vote:\s*([0-9]+\/[0-9]+|Unanimous)/i);

  let voting = fallbackVoting;
  let cleaned = raw;
  if (voteMatch) {
    voting = `Vote: ${voteMatch[1] || voteMatch[0].replace(/^Vote:\s*/i, "")}`;
    cleaned = cleaned.replace(voteMatch[0], "").trim();
    cleaned = cleaned.replace(/\s*\(\s*\)$/, "").trim();
  }

  return [
    {
      statement: cleaned,
      voting,
    },
  ];
}

/**
 * Official ESO Guideline Quality of Evidence definitions and high-contrast color scheme:
 * - High: #059669 (Emerald Green - High certainty)
 * - Moderate: #0284c7 (Sky Blue - Moderate certainty)
 * - Low: #d97706 (Warm Amber - Low certainty)
 * - Very low: #7c3aed (Deep Violet / Purple - Very low certainty)
 */
export const ESO_GRADE_QUALITY_CONFIG: Record<
  string,
  { label: string; symbols: string; hex: string; darkHex: string; bgLight: string; borderLight: string }
> = {
  High: {
    label: "High",
    symbols: "⊕⊕⊕⊕",
    hex: "#059669",
    darkHex: "#34d399",
    bgLight: "rgba(5, 150, 105, 0.08)",
    borderLight: "rgba(5, 150, 105, 0.25)",
  },
  Moderate: {
    label: "Moderate",
    symbols: "⊕⊕⊕",
    hex: "#0284c7",
    darkHex: "#38bdf8",
    bgLight: "rgba(2, 132, 199, 0.08)",
    borderLight: "rgba(2, 132, 199, 0.25)",
  },
  Low: {
    label: "Low",
    symbols: "⊕⊕",
    hex: "#d97706",
    darkHex: "#fbbf24",
    bgLight: "rgba(217, 119, 6, 0.08)",
    borderLight: "rgba(217, 119, 6, 0.25)",
  },
  "Very low": {
    label: "Very low",
    symbols: "⊕",
    hex: "#7c3aed",
    darkHex: "#c084fc",
    bgLight: "rgba(124, 58, 237, 0.08)",
    borderLight: "rgba(124, 58, 237, 0.25)",
  },
  "Uncertain / Ongoing trial": {
    label: "Uncertain / Ongoing trial",
    symbols: "-",
    hex: "#64748b",
    darkHex: "#94a3b8",
    bgLight: "rgba(100, 116, 139, 0.08)",
    borderLight: "rgba(100, 116, 139, 0.25)",
  },
  "Uncertain / Ongoing trials": {
    label: "Uncertain / Ongoing trial",
    symbols: "-",
    hex: "#64748b",
    darkHex: "#94a3b8",
    bgLight: "rgba(100, 116, 139, 0.08)",
    borderLight: "rgba(100, 116, 139, 0.25)",
  },
  "uncertain/Ongoing trial (-)": {
    label: "Uncertain / Ongoing trial",
    symbols: "-",
    hex: "#64748b",
    darkHex: "#94a3b8",
    bgLight: "rgba(100, 116, 139, 0.08)",
    borderLight: "rgba(100, 116, 139, 0.25)",
  },
  "-": {
    label: "Uncertain / Ongoing trial",
    symbols: "-",
    hex: "#64748b",
    darkHex: "#94a3b8",
    bgLight: "rgba(100, 116, 139, 0.08)",
    borderLight: "rgba(100, 116, 139, 0.25)",
  },
};

/**
 * Canonical 2025 ESO Blood Pressure Guidelines (Synoptic Standard)
 * Full 8 PICOs with complete recommendations, official GRADE ratings, Expert Consensus Statements and voting ratios.
 */
export const CANONICAL_ESO_2025_BP_PICOS: EsoPicoItem[] = [
  {
    picoNumber: 1,
    picoQuestion: "In patients with suspected acute stroke, does pre-hospital blood pressure lowering with any drug, compared to no drug, improve outcome?",
    expertConsensusStatement: "Due to the potential harm to patients with ICH, treatment with transdermal glyceryl trinitrate should be avoided. Intravenous urapidil or labetalol could be the treatment of choice.",
    voting: "Vote: 10/10",
    drivingTrials: ["RIGHT", "RIGHT-2", "MR ASAP", "INTERACT-4"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with suspected stroke, we suggest against routine blood pressure lowering in the pre-hospital setting.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["RIGHT", "RIGHT-2", "MR ASAP", "INTERACT-4"],
      },
    ],
  },
  {
    picoNumber: 2,
    picoQuestion: "In hospitalised patients with acute ischaemic stroke not treated with reperfusion therapies (intravenous thrombolysis or mechanical thrombectomy), does blood pressure lowering with any vasodepressor drug, compared to no drug, improve outcome?",
    expertConsensusStatement: "In hospitalised patients with acute ischaemic stroke and blood pressure > 220/120 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, careful blood pressure reduction (<15% systolic blood pressure reduction in 24 h) is reasonable and likely to be safe. No specific blood pressure-lowering agent can be recommended.",
    voting: "Vote: 10/10",
    drivingTrials: ["ENOS", "SCAST", "CATIS"],
    recommendations: [
      {
        number: 1,
        statement: "In hospitalised patients with acute ischaemic stroke and blood pressure < 220/110 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, we suggest against the routine use of blood pressure-lowering agents at least in the first 24 h following symptom onset, unless this is necessary for a specific comorbid condition that requires blood pressure lowering.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["ENOS", "SCAST", "CATIS"],
      },
    ],
  },
  {
    picoNumber: 3,
    picoQuestion: "In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), do blood pressure-lowering therapies compared to control improve outcome?",
    drivingTrials: ["ENCHANTED", "ENOS", "ENCHANTED2-MT"],
    recommendations: [
      {
        number: 1,
        statement: "In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), we suggest maintaining blood pressure below 185/110 mmHg before bolus, and below 180/105 mmHg after bolus and for 24 h. No specific blood pressure-lowering agent can be recommended.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Weak for intervention",
        drivingTrials: ["ENCHANTED", "ENOS", "ENCHANTED2-MT"],
      },
      {
        number: 2,
        statement: "In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), we suggest against lowering systolic blood pressure to a target of 130–140 mmHg compared to < 180 mmHg during the first 72 h following symptom onset.",
        qualityOfEvidence: "Low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["ENCHANTED", "OPTIMAL-BP", "BP-TARGET"],
      },
    ],
  },
  {
    picoNumber: 4,
    picoQuestion: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), does blood pressure lowering with any vasodepressor drug compared to no drug improve functional outcome?",
    expertConsensusStatement: "In patients with acute ischaemic stroke due to LVO who achieve successful reperfusion defined as modified thrombolysis in cerebral infarction grade of 3 following mechanical thrombectomy, we suggest against induced hypertension.",
    voting: "Vote: 10/10",
    drivingTrials: ["BP-TARGET", "ENCHANTED2-MT", "BEST-II", "OPTIMAL-BP"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), we suggest keeping blood pressure below 180/105 mmHg during, and for 24 h after, mechanical thrombectomy. No specific blood pressure-lowering agent can be recommended.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["BP-TARGET", "ENCHANTED2-MT", "BEST-II"],
      },
      {
        number: 2,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), we suggest against individualised blood pressure management (guided by pre-procedural blood pressure levels) during mechanical thrombectomy.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["INDIVIDUATE", "DETERMINE"],
      },
      {
        number: 3,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), we recommend against actively reducing systolic blood pressure < 140 mmHg for the first 24 h following successful mechanical thrombectomy.",
        qualityOfEvidence: "High",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["ENCHANTED2-MT", "OPTIMAL-BP", "BEST-II"],
      },
      {
        number: 4,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), systolic blood pressure drops should be avoided.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["SAGA", "SIESTA", "ANSTROKE", "GOLIATH"],
      },
    ],
  },
  {
    picoNumber: 5,
    picoQuestion: "In patients with acute ischaemic stroke not treated with reperfusion therapies (intravenous thrombolysis or mechanical thrombectomy) and with clinical deterioration, does induced hypertension by any vasopressor drug compared to no drug improve outcome?",
    expertConsensusStatement: "In patients with acute ischaemic stroke not treated with reperfusion therapies (IVT or MT) and with clinical deterioration where a haemodynamic mechanism is suspected or shown to be directly responsible for the deterioration, we suggest: • Stopping existing BP lowering therapy, • Administering intravenous fluids and • Introducing non-pharmacological procedures to raise BP Before considering • Careful use of vasopressor agents to increase BP with close monitoring of BP values.",
    voting: "Vote: 10/10",
    drivingTrials: ["SETIN-HYPERTENSION", "MAPAS"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ischaemic stroke not treated with reperfusion therapies (intravenous thrombolysis or mechanical thrombectomy) and with clinical deterioration, we suggest against the routine use of vasopressor drugs to increase blood pressure.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["SETIN-HYPERTENSION", "MAPAS"],
      },
    ],
  },
  {
    picoNumber: 6,
    picoQuestion: "In patients with acute ischaemic stroke, does continuing vs temporarily stopping previous oral blood pressure-lowering therapy improve outcome?",
    expertConsensusStatement: "In patients with acute ischaemic stroke, we suggest stopping previous oral blood pressure-lowering therapy in patients with dysphagia until swallowing is restored or a nasogastric tube is in place.",
    voting: "Vote: 10/10",
    drivingTrials: ["COSSACS", "ENOS", "CATIS-2"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ischaemic stroke, we suggest against routinely continuing previous oral blood pressure-lowering therapy.",
        qualityOfEvidence: "Low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["COSSACS", "ENOS", "CATIS-2"],
      },
    ],
  },
  {
    picoNumber: 7,
    picoQuestion: "In patients with acute ICH, does intensive blood pressure lowering with any vasodepressor drug compared to control improve outcome?",
    expertConsensusStatement: "1. We suggest lowering systolic blood pressure below 140 mmHg within 6 h of symptom onset in minor or moderate ICH (haematoma volume < 30 mL) to reduce haematoma expansion (Vote: 10/10).\n2. For patients with spontaneous ICH, we suggest avoiding a reduction in SBP of more than 70 mmHg from baseline and avoiding active reduction of SBP below 110 mmHg. Caution is advised when lowering very high SBP (>220 mmHg), in patients with large haematoma volumes (>30 mL) or when haematoma evacuation is planned (Vote: 10/10).\n3. In patients with acute ICH, blood pressure target-based interventions should be preferred over interventions based on fixed antihypertensive agents (Vote: 10/10).\n4. For patients with spontaneous minor or moderate ICH (<30 mL): In acute phase (<2 h), lower SBP to <140 mmHg and minimise variability. In sub-acute phase (up to 7 days), maintain SBP below 140 mmHg (Vote: 10/10).",
    voting: "Vote: 10/10",
    drivingTrials: ["INTERACT", "INTERACT2", "ATACH-2", "ICH-ADAPT", "INTERACT4"],
    recommendations: [
      {
        number: 1,
        statement: "For patients with acute spontaneous ICH and systolic blood pressure of 150–220 mmHg, the overall balance of beneficial and adverse effects is uncertain, so we recommend recruitment to ongoing randomised controlled trials.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Uncertain",
        drivingTrials: ["INTERACT", "INTERACT2", "ATACH-2", "ICH-ADAPT", "INTERACT4"],
      },
    ],
  },
  {
    picoNumber: 8,
    picoQuestion: "In patients with acute ICH, does continuing vs temporarily stopping previous oral antihypertensive therapy improve outcome?",
    expertConsensusStatement: "1. In patients with acute ICH who need BP-lowering therapy to maintain BP within the recommended range and who do not have swallowing difficulties, we suggest continuation of prior oral antihypertensive agents (Vote: 10/10).\n2. In patients with acute ICH who need BP-lowering therapy and who have dysphagia or decreased level of consciousness, we suggest temporarily stopping previous oral hypertensive therapy and using intravenous antihypertensive agents until swallowing is restored or a nasogastric tube is in place (Vote: 10/10).",
    voting: "Vote: 10/10",
    drivingTrials: ["COSSACS", "ENOS"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ICH there is continued uncertainty over the benefits and risks (advantages/disadvantages) of continuing vs temporarily stopping previous blood pressure-lowering therapy.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Uncertain",
        drivingTrials: ["COSSACS", "ENOS"],
      },
    ],
  },
];

/**
 * Canonical 2026 ESO/EANS/ESMINT Guideline on Aneurysmal Subarachnoid Haemorrhage (aSAH)
 * (Vergouwen MDI, et al. European Stroke Journal 2026, 11(5), 1-45. Table 3 Synoptic table, pp. 28-35)
 * Official 10 Topics / 15 PICO questions, 15 evidence-based recommendations and 37 expert consensus statements.
 */
export const CANONICAL_ESO_2026_ASAH_PICOS: EsoPicoItem[] = [
  {
    picoNumber: "1a",
    picoQuestion: "In adult patients with aneurysmal subarachnoid haemorrhage (aSAH), does treatment with antifibrinolytic drugs compared to no antifibrinolytic drugs decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, we recommend against routine administration of antifibrinolytic drugs prior to treatment of the ruptured aneurysm to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["ULTRA"],
      },
    ],
    drivingTrials: ["ULTRA"],
  },
  {
    picoNumber: "1b",
    picoQuestion: "In adult patients with aSAH, does treatment with antihypertensive drugs compared to no antihypertensive drugs decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on the administration of blood pressure lowering drugs prior to treatment of the ruptured aneurysm to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
      },
    ],
    expertConsensusStatement: "1. In adult patients with aSAH and systolic blood pressures higher than 160-180 mm Hg persisting after installment of analgesics, oral nimodipine and urinary catheter prior to aneurysm treatment, we suggest considering blood pressure lowering drugs to lower systolic blood pressure to around 160 mm Hg to reduce the risk of rebleeding. (Vote: 11/13)\n2. If it is decided to give blood pressure lowering drugs, we suggest continuous infusion of short-acting drugs, e.g. labetalol, and avoiding diuretic drugs to maintain normovolemia. Care should be taken to ensure that the blood pressure reduction is gradual, with systolic blood pressure reduced cautiously over time (corresponding to no more than a 10% reduction in mean arterial pressure within the first 2 hours) to decrease the risk of DCI. (Vote: 11/13)",
    voting: "Vote: 11/13",
  },
  {
    picoNumber: "2",
    picoQuestion: "In adult patients with aSAH, does early aneurysm occlusion compared to no early aneurysm occlusion decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on treating the ruptured aneurysm as early as possible to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
      },
    ],
    expertConsensusStatement: "In adult patients with aSAH, we suggest treatment of the ruptured aneurysm within 24 hours after ictus. The timing should be optimized to ensure that the most dedicated team of experts is available when needed. (Vote: 13/13)",
    voting: "Vote: 13/13",
  },
  {
    picoNumber: "3a",
    picoQuestion: "In adult patients with aSAH, does any type of endovascular aneurysm occlusion compared to neurosurgical aneurysm occlusion decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH in good clinical condition (WFNS I-III) with aneurysms of either the anterior or posterior circulation that can be treated by either regular coiling (i.e. without adjunctive devices) or neurosurgical clipping, we recommend regular coiling as the preferred strategy to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "High",
        strengthOfRecommendation: "Strong for intervention",
        drivingTrials: ["ISAT", "BRAT"],
      },
    ],
    expertConsensusStatement: "1. We suggest that all patients with aSAH are discussed in an interdisciplinary manner, with at least one neurosurgeon and one neuro-interventionalist. (Vote: 13/13)\n2. In adult patients with aSAH, we suggest that the team discuss which modality would result in the best clinical outcome of the specific patient, with the safest and optimal occlusion of the specific aneurysm. (Vote: 13/13)\n3. In adult patients with aSAH younger than 45 years of age, we suggest that the better long-term protection from clipping compared to coiling is taken into consideration for choosing the treatment modality of the aneurysm. (Vote: 12/13)\n4. In adult patients with aSAH admitted in a poor clinical condition (defined as GCS < 13), we suggest a multidisciplinary approach to decide on type and timing of aneurysm treatment taking into account the (presumed) cause of the poor clinical condition. (Vote: 13/13)\n5. In adult patients with aSAH and a poor or worsening clinical condition from a space-occupying intracerebral or subdural haematoma, we suggest immediate surgery for aneurysm clipping and haematoma removal. (Vote: 11/13)",
    voting: "Vote: 13/13",
    drivingTrials: ["ISAT", "BRAT"],
  },
  {
    picoNumber: "3b",
    picoQuestion: "In adult patients with aSAH, does any type of endovascular aneurysm treatment other than coiling compared to coiling of the ruptured aneurysm decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on the use of endovascular treatment options other than regular coiling for treatment of the ruptured aneurysm to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
        drivingTrials: ["ISAT-2", "CLARYS"],
      },
    ],
    expertConsensusStatement: "1. Given the limited comparative evidence available, we suggest that in adult patients with subarachnoid haemorrhage from a ruptured aneurysm which cannot be treated with regular coiling, the multidisciplinary team discusses the safety, effectiveness, and durability of microsurgical and alternative endovascular options to determine the preferred treatment strategy. (Vote: 12/13)\n2. In adult patients with aSAH, we suggest stent-assisted coiling in selected cases where other treatment options are not feasible. (Vote: 13/13)\n3. In adult patients with aSAH, we suggest to reserve flow diversion as a last-line treatment option. (Vote: 12/13)",
    voting: "Vote: 13/13",
    drivingTrials: ["ISAT-2", "CLARYS"],
  },
  {
    picoNumber: "4",
    picoQuestion: "In adult patients with aSAH, does any type of medical treatment aiming to reduce the risk of delayed cerebral ischaemia (DCI) compared to no such treatment decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, we recommend prophylactic treatment with oral nimodipine to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "High",
        strengthOfRecommendation: "Strong for intervention",
        drivingTrials: ["BRANT"],
      },
      {
        number: 2,
        statement: "In adult patients with aSAH, we do not recommend prophylactic treatment with either tirilazad, statins, magnesium sulfate, or endothelin receptor antagonists to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["MASH-2", "IMASH", "CONSCIOUS-1", "CONSCIOUS-2", "REACT", "STASH"],
      },
      {
        number: 3,
        statement: "In adult patients with aSAH, no recommendation can be made on prophylactic treatment with antiplatelet drugs or lumbar drainage to decrease the risk of poor functional outcome until further data from RCT are available.",
        qualityOfEvidence: "Low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
        drivingTrials: ["PILLAR"],
      },
    ],
    drivingTrials: ["BRANT", "MASH-2", "REACT"],
  },
  {
    picoNumber: "5a",
    picoQuestion: "In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia, does hypertension induction compared to no hypertension induction decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia, no recommendation can be made on hypertension induction to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
        drivingTrials: ["HIMALAIA"],
      },
    ],
    expertConsensusStatement: "In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia, we suggest considering induced hypertension, provided that the ruptured aneurysm is treated and after standard therapy has proven insufficient. Clinical contraindications and potential complications of induced hypertension should be considered. (Vote: 11/13)",
    voting: "Vote: 11/13",
    drivingTrials: ["HIMALAIA"],
  },
  {
    picoNumber: "5b",
    picoQuestion: "In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia, does endovascular treatment of vasospasm compared to no endovascular treatment decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia, no recommendation can be made on endovascular treatment of vasospasm to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
        drivingTrials: ["IMCVS"],
      },
    ],
    expertConsensusStatement: "1. In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia in combination with refractory and severe vasospasm, we suggest considering intra-arterial pharmacological treatment as a rescue therapy in selected patients to decrease the risk of poor functional outcome. (Vote: 11/13)\n2. In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia in combination with refractory severe vasospasm, the current evidence is insufficient to support the routine use of mechanical vasodilatation with balloon angioplasty. In selected cases, this approach may be considered as a last-line rescue treatment after careful multidisciplinary discussion of the potential risks and uncertain benefits. (Vote: 12/13)\n3. In adult patients with aSAH and clinical deterioration due to delayed cerebral ischaemia in combination with refractory severe vasospasm, the current data are insufficient to support the use of mechanical vasodilatation with temporary deployment of retrievable stents to decrease the risk of poor functional outcome. (Vote: 13/13)",
    voting: "Vote: 13/13",
    drivingTrials: ["IMCVS"],
  },
  {
    picoNumber: "6a",
    picoQuestion: "In adult patients with aSAH, does any type of neuroimaging compared to regular neurological examination decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on neuroimaging to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
      },
    ],
    expertConsensusStatement: "1. In adult patients with aSAH and clinical deterioration, we suggest plain head CT in combination with CT-Perfusion (CTP) imaging to detect the cause of deterioration. (Vote: 11/13)\n2. In adult patients with aSAH who are neurologically not assessable but at high risk for DCI, we suggest plain head CT and CTP at least once between day 4 and 14. (Vote: 10/13)\n3. In adult patients with aSAH, we do not suggest a routine DSA for screening of macrovascular vasospasm. (Vote: 13/13)",
    voting: "Vote: 13/13",
  },
  {
    picoNumber: "6b",
    picoQuestion: "In adult patients with aSAH, does any type of neuromonitoring compared to regular neurological examination decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on neuromonitoring to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
        drivingTrials: ["SYNAPSE-ICU"],
      },
    ],
    expertConsensusStatement: "1. In adult patients with aSAH, no suggestion can be given on the use of TCD monitoring. (Vote: 10/13)\n2. In adult patients with aSAH and radiological hydrocephalus who are neurologically not assessable, we suggest ICP monitoring via EVD if an EVD is in place. (Vote: 13/13)\n3. In adult patients with aSAH without radiological hydrocephalus who are neurologically not assessable, no suggestion can be given on ICP monitoring. (Vote: 11/13)\n4. In adult patients with aSAH who are neurologically not assessable, we do not suggest invasive multimodal neuromonitoring with continuous measurement of partial pressure of brain tissue oxygen (PbtO2) and/or microdialysis due to the uncertain risk/benefit ratio of these modalities. (Vote: 10/13)\n5. In adult patients with aSAH who are neurologically not assessable, we do not suggest the routine use of continuous EEG monitoring. (Vote: 13/13)",
    voting: "Vote: 13/13",
    drivingTrials: ["SYNAPSE-ICU"],
  },
  {
    picoNumber: "7",
    picoQuestion: "In adult patients with aSAH, does treatment of hydrocephalus (either by EVD, VP-shunt or lumbar drainage) compared to no treatment of hydrocephalus decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH and hydrocephalus, no recommendation can be made on CSF diversion strategies to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
      },
    ],
    expertConsensusStatement: "1. In adult patients with aSAH who present with radiological hydrocephalus and a decreased level of consciousness, we suggest CSF drainage. (Vote: 13/13)\n2. In adult patients with aSAH who present with obstructive hydrocephalus and a decreased level of consciousness, we suggest EVD placement. (Vote: 13/13)\n3. In adult patients with aSAH who present with communicating hydrocephalus and a decreased level of consciousness, we suggest LD or repeated LPs as the strategy of first choice for CSF drainage. (Vote: 11/13)\n4. In adult patients with aSAH who present with radiological hydrocephalus and a normal level of consciousness, we do not suggest CSF drainage. (Vote: 12/13)\n5. In adult patients with aSAH who come at a point at which prolonged CSF drainage (by EVD, LD or repeated LPs) carries a higher risk of severe complications than placement of a permanent CSF diversion, we suggest permanent CSF diversion. (Vote: 13/13)\n6. In adult patients with aSAH who present with symptomatic chronic hydrocephalus, we suggest permanent CSF diversion. (Vote: 13/13)",
    voting: "Vote: 13/13",
  },
  {
    picoNumber: "8",
    picoQuestion: "In adult patients with aSAH, does treatment on a dedicated neuro-ICU or high care unit compared to a general ICU or high care unit decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on admission to a dedicated neuro-ICU or high care unit to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
      },
    ],
    expertConsensusStatement: "In adult patients with aSAH, we suggest admission and management in a dedicated neuro-ICU or high care unit to decrease the risk of poor functional outcome. (Vote: 13/13)",
    voting: "Vote: 13/13",
  },
  {
    picoNumber: "9a",
    picoQuestion: "In adult patients with aSAH, does treatment in a high-volume centre compared to a low-volume centre decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on admission/transfer to a high-volume centre to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
      },
    ],
    expertConsensusStatement: "We suggest that all patients with spontaneous SAH are admitted or immediately transferred to centres that treat at least 70 patients with aSAH per year, or at least 35 patients with aSAH per year in remote areas where access is limited. (Vote: 12/13)",
    voting: "Vote: 12/13",
  },
  {
    picoNumber: "9b",
    picoQuestion: "In adult patients with aSAH, does aneurysm treatment by a high-volume neurosurgeon or neurointerventionalist compared to a low-volume neurosurgeon or neurointerventionalist decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on case-volume per neurosurgeon and neurointerventionalist to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
      },
    ],
    expertConsensusStatement: "In adult patients with aSAH, we suggest that aneurysms are repaired by neurosurgeons or neurointerventionalists who perform the treatment of choice in more than 30 patients with aneurysms (ruptured and unruptured) per year. (Vote: 12/13)",
    voting: "Vote: 12/13",
  },
  {
    picoNumber: "10",
    picoQuestion: "In adult patients with aSAH, does a radiological follow-up beyond 6 months after aneurysm treatment compared to a maximum radiological follow-up duration of 6 months decrease the risk of poor functional outcome?",
    recommendations: [
      {
        number: 1,
        statement: "In adult patients with aSAH, no recommendation can be made on radiological follow-up beyond 6 months after microsurgical or endovascular aneurysm treatment to decrease the risk of poor functional outcome.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Uncertain / Ongoing trials",
        drivingTrials: ["ISAT"],
      },
    ],
    expertConsensusStatement: "1. In adult patients with aSAH who are treated with coils and adequate occlusion within 6 months, we suggest at least one additional radiological follow-up at or beyond 12 months after aneurysm repair to investigate potential aneurysm recanalization, as long as a potential re-treatment remains an option. (Vote: 13/13)\n2. In adult patients with aSAH who were treated with clip reconstruction and adequate occlusion within 6 months, we do not suggest further radiological follow-up to investigate potential aneurysm recanalization. (Vote: 11/13)\n3. In adult patients with aSAH who have neck remnants or partially occluded aneurysms (irrespective of type of aneurysm treatment), we suggest radiological follow-up beyond 6 months after aneurysm treatment as long as a potential re-treatment remains an option. (Vote: 13/13)\n4. In adult patients with aSAH who are treated with endovascular devices other than coils, we suggest radiological follow-up at least five years after treatment, regardless of the degree of occlusion, to ensure adequate long-term occlusion and as long as a potential re-treatment remains an option. (Vote: 11/13)\n5. In adult patients with aSAH, we suggest radiological follow-up beyond 6 months after aneurysm treatment in order to evaluate for de novo aneurysms at 5-year intervals as long as a potential treatment remains an option, in those with a high-risk profile (such as young age, positive family history for aSAH, autosomal dominant polycystic kidney disease). (Vote: 12/13)",
    voting: "Vote: 13/13",
    drivingTrials: ["ISAT"],
  },
];

/**
 * Detect if a guideline document corresponds specifically to the ESO 2025 Blood Pressure Guideline
 */
export function isEsoBpGuideline(title?: string, id?: string): boolean {
  const normTitle = (title || "").toLowerCase();
  const normId = (id || "").toLowerCase();

  if (normId.includes("eso-bp") || normId.includes("esobp")) return true;
  // Exclude other vascular guidelines that might mention BP in passes
  if (
    normTitle.includes("subarachnoid") ||
    normTitle.includes("haemorrhage") ||
    normTitle.includes("hemorrhage") ||
    normTitle.includes("aneurysm") ||
    normTitle.includes("pneumonia")
  ) {
    return false;
  }
  return normTitle.includes("blood pressure") || normTitle.includes("huyết áp");
}

/**
 * Detect if a guideline document corresponds specifically to the ESO/EANS/ESMINT 2026 aSAH Guideline
 */
export function isEsoAsahGuideline(title?: string, id?: string): boolean {
  const normTitle = (title || "").toLowerCase();
  const normId = (id || "").toLowerCase();

  return (
    normId.includes("asah") ||
    normId.includes("sah") ||
    normTitle.includes("subarachnoid") ||
    normTitle.includes("xuất huyết dưới nhện") ||
    (normTitle.includes("aneurysm") && (normTitle.includes("haemorrhage") || normTitle.includes("hemorrhage")))
  );
}

/**
 * Safely resolves the canonical ESO PICO collection for known guidelines.
 * Returns null if the guideline is generic or another topic (prevents content bleed between guidelines).
 */
export function getCanonicalEsoPicos(title?: string, id?: string): EsoPicoItem[] | null {
  if (isEsoAsahGuideline(title, id)) {
    return CANONICAL_ESO_2026_ASAH_PICOS;
  }
  if (isEsoBpGuideline(title, id)) {
    return CANONICAL_ESO_2025_BP_PICOS;
  }
  return null;
}

/**
 * Canonical normalizer for ESO recommendation strengths according to GRADE standard:
 * - "Strong against intervention" (↓↓ - Red: #d32f2f)
 * - "Weak against intervention" (↓ - Orange: #ea580c)
 * - "Strong for intervention" (↑↑ - Dark Green: #15803d)
 * - "Weak for intervention" (↑ - Green: #16a34a)
 * - "Uncertain / Ongoing trials" (— - Slate: #64748b)
 */
export function normalizeEsoStrength(raw?: string, statement?: string): EsoRecommendationStrength {
  const norm = (raw || "").trim().toLowerCase();
  const stmtNorm = (statement || "").trim().toLowerCase();

  // 1. Uncertain / No recommendation grade (—) / Not assessable (–)
  if (
    norm.includes("uncertain") ||
    norm.includes("not assessable") ||
    norm.includes("unassessable") ||
    norm.includes("not assessed") ||
    norm.includes("không thể đánh giá") ||
    norm.includes("không đánh giá") ||
    norm.includes("không khuyến cáo được") ||
    norm.includes("no recommendation") ||
    norm.includes("ongoing trial") ||
    norm.includes("insufficient") ||
    norm.includes("chưa rõ") ||
    norm.includes("không xác định") ||
    norm.includes("(–)") ||
    norm.includes("(-)") ||
    norm.includes("(—)") ||
    norm === "—" ||
    norm === "-" ||
    norm === "–" ||
    norm === "not graded" ||
    norm === "ungraded" ||
    norm === "none" ||
    norm === "n/a"
  ) {
    return "Uncertain / Ongoing trials";
  }

  // 2. Explicit Strong Against
  if (
    norm.includes("strong against") ||
    norm.includes("chống lại mạnh") ||
    norm.includes("khuyến cáo mạnh chống lại") ||
    norm.includes("strong recommendation against") ||
    norm === "↓↓"
  ) {
    return "Strong against intervention";
  }

  // 3. Explicit Strong For
  if (
    norm.includes("strong for") ||
    norm.includes("ủng hộ mạnh") ||
    norm.includes("khuyến cáo mạnh ủng hộ") ||
    norm.includes("strong recommendation for") ||
    norm === "↑↑"
  ) {
    return "Strong for intervention";
  }

  // 4. Explicit Weak Against
  if (
    norm.includes("weak against") ||
    norm.includes("conditional against") ||
    norm.includes("chống lại yếu") ||
    norm.includes("khuyến cáo yếu chống lại") ||
    norm === "↓" ||
    norm === "↓?"
  ) {
    return "Weak against intervention";
  }

  // 5. Explicit Weak For
  if (
    norm.includes("weak for") ||
    norm.includes("conditional for") ||
    norm.includes("ủng hộ yếu") ||
    norm.includes("khuyến cáo yếu ủng hộ") ||
    norm === "↑" ||
    norm === "↑?"
  ) {
    return "Weak for intervention";
  }

  // 6. Generic "Strong" (resolve direction via statement or raw text)
  if (norm.includes("strong") || norm.includes("mạnh")) {
    if (
      norm.includes("against") ||
      stmtNorm.includes("suggest against") ||
      stmtNorm.includes("recommend against") ||
      stmtNorm.includes("against") ||
      stmtNorm.includes("avoid") ||
      stmtNorm.includes("harm") ||
      stmtNorm.includes("chống") ||
      stmtNorm.includes("không") ||
      stmtNorm.includes("tránh")
    ) {
      return "Strong against intervention";
    }
    return "Strong for intervention";
  }

  // 7. Generic "Conditional" or "Weak" (resolve direction via statement or raw text)
  if (norm.includes("conditional") || norm.includes("weak") || norm.includes("yếu")) {
    if (
      norm.includes("against") ||
      stmtNorm.includes("suggest against") ||
      stmtNorm.includes("recommend against") ||
      stmtNorm.includes("against") ||
      stmtNorm.includes("avoid") ||
      stmtNorm.includes("harm") ||
      stmtNorm.includes("chống") ||
      stmtNorm.includes("không") ||
      stmtNorm.includes("tránh")
    ) {
      return "Weak against intervention";
    }
    return "Weak for intervention";
  }

  // 8. Fallback inference purely from clinical statement text if strength is missing/empty
  if (
    stmtNorm.includes("no recommendation can be") ||
    stmtNorm.includes("no recommendation is made") ||
    stmtNorm.includes("no suggestion can be given") ||
    stmtNorm.includes("insufficient evidence to recommend") ||
    stmtNorm.includes("current evidence is insufficient") ||
    stmtNorm.includes("current data are insufficient") ||
    stmtNorm.includes("chưa đủ bằng chứng để khuyến cáo") ||
    stmtNorm.includes("không đưa ra khuyến cáo")
  ) {
    return "Uncertain / Ongoing trials";
  }
  if (
    stmtNorm.includes("recommend against") ||
    stmtNorm.includes("strongly suggest against") ||
    stmtNorm.includes("khuyến cáo mạnh không")
  ) {
    return "Strong against intervention";
  }
  if (
    stmtNorm.includes("suggest against") ||
    stmtNorm.includes("avoid") ||
    stmtNorm.includes("should be avoided") ||
    stmtNorm.includes("không khuyến cáo") ||
    stmtNorm.includes("không hạ")
  ) {
    return "Weak against intervention";
  }
  if (
    stmtNorm.includes("recommend for") ||
    stmtNorm.includes("we recommend") ||
    stmtNorm.includes("khuyến cáo mạnh")
  ) {
    return "Strong for intervention";
  }
  if (
    stmtNorm.includes("suggest") ||
    stmtNorm.includes("we suggest") ||
    stmtNorm.includes("đề xuất")
  ) {
    return "Weak for intervention";
  }

  return "Weak for intervention";
}

/**
 * Parses ESO GRADE metadata from strings like:
 * "GRADE Strong for intervention (Evidence: High)"
 * "GRADE Weak for intervention (Evidence: Very Low, Voting: 8/8)"
 * "Conditional" (with statement-aware inference)
 */
export function parseEsoGrade(gradeStr?: string, statement?: string): {
  strength: EsoRecommendationStrength;
  quality: EsoEvidenceQuality;
  voting?: string;
} {
  const strength = normalizeEsoStrength(gradeStr, statement);
  let quality: EsoEvidenceQuality = "Moderate";
  let voting: string | undefined = undefined;

  const lower = (gradeStr || "").toLowerCase();

  // Quality parsing
  if (lower.includes("very low") || lower.includes("rất thấp")) quality = "Very low";
  else if ((lower.includes("low") || lower.includes("thấp")) && !lower.includes("very") && !lower.includes("rất")) quality = "Low";
  else if (lower.includes("high") || lower.includes("cao")) quality = "High";
  else if (lower.includes("moderate") || lower.includes("trung bình")) quality = "Moderate";
  else if (
    lower.includes("uncertain") ||
    lower.includes("not assessable") ||
    lower.includes("ongoing") ||
    lower.trim() === "-" ||
    lower.trim() === "—" ||
    lower.trim() === "–"
  ) quality = "Uncertain / Ongoing trial";

  // Voting parsing
  const voteMatch = (gradeStr || "").match(/Voting:\s*([0-9]+\/[0-9]+|Unanimous)/i);
  if (voteMatch && voteMatch[1]) {
    voting = `Vote: ${voteMatch[1]}`;
  }

  return { strength, quality, voting };
}

/**
 * Converts canonical or grouped EsoPicoItem[] into clean PracticeChangeDetail[]
 * so active storage and editors maintain exact 1-to-1 fidelity with the ESO Synoptic Table.
 */
export function convertEsoPicoItemsToPracticeChanges(
  picos: EsoPicoItem[],
  defaultCategory = "ESO Synoptic Table Recommendation"
): PracticeChangeDetail[] {
  const result: PracticeChangeDetail[] = [];
  picos.forEach((pico) => {
    const pNumStr = String(pico.picoNumber).trim();
    const pQuestion = pico.picoQuestion.trim();
    const consensus = pico.expertConsensusStatement?.trim() || undefined;
    const voting = pico.voting?.trim() || undefined;
    const picoTrials = pico.drivingTrials || [];

    pico.recommendations.forEach((rec, rIdx) => {
      const q = rec.qualityOfEvidence || "Moderate";
      const s = normalizeEsoStrength(rec.strengthOfRecommendation, rec.statement);
      const trials = rec.drivingTrials && rec.drivingTrials.length > 0 ? rec.drivingTrials : picoTrials;
      const suffix = pico.recommendations.length > 1 ? `-rec${rIdx + 1}` : "";
      const recConsensus = rec.expertConsensusStatement?.trim() || (pico.recommendations.length === 1 ? consensus : undefined);
      const recVoting = rec.voting?.trim() || (recConsensus && recConsensus === consensus ? voting : undefined);
      result.push({
        id: `eso-pico-${pNumStr.toLowerCase()}${suffix}`,
        picoNumber: pico.picoNumber,
        picoQuestion: pQuestion,
        category: defaultCategory,
        topic: `PICO ${pNumStr} ${pQuestion}`.trim(),
        changeType: s.toLowerCase().includes("against") ? "DOWNGRADED" : "NEW",
        quality: q,
        strength: s,
        voting: recVoting,
        currentGrade: `GRADE ${s} (Evidence: ${q}${recVoting ? `, Voting: ${recVoting}` : ""})`,
        currentText: rec.statement,
        expertConsensusStatement: recConsensus,
        drivingTrials: trials,
      });
    });
  });
  return result;
}

/**
 * Intelligent PICO Grouper for ESO Clinical Practice Guidelines (Matching Synoptic Table structure)
 * Groups multiple recommendations that belong to the same PICO question,
 * attaches expert consensus statements and voting ratios, and retains pivotal driving trials.
 */
export function groupPracticeChangesIntoEsoPicos(
  changes: PracticeChangeDetail[],
  guidelineTitle?: string,
  guidelineId?: string
): EsoPicoItem[] {
  const extractExplicitPico = (item: PracticeChangeDetail): { num: string; question: string } | null => {
    const rawTopic = (item.topic || "").trim();
    const rawCategory = (item.category || "").trim();
    if (item.picoNumber !== undefined && item.picoNumber !== null && String(item.picoNumber).trim() !== "") {
      const pStr = String(item.picoNumber).trim().replace(/^PICO\s*/i, "");
      if (/^\d+[a-z]?$/i.test(pStr)) {
        return {
          num: pStr,
          question: (item.picoQuestion || rawTopic || rawCategory).trim(),
        };
      }
    }
    const matchTopic = rawTopic.match(/^PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
    if (matchTopic) {
      return { num: matchTopic[1], question: matchTopic[2]?.trim() || rawTopic };
    }
    const matchCat = rawCategory.match(/^PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
    if (matchCat) {
      return { num: matchCat[1], question: matchCat[2]?.trim() || rawTopic };
    }
    return null;
  };

  const allHaveExplicitPico =
    Array.isArray(changes) && changes.length > 0 && changes.every((it) => extractExplicitPico(it) !== null);

  // 1. Check if this guideline matches a canonical ESO Synoptic Table (either via title/id or content signature)
  let canonicalList = getCanonicalEsoPicos(guidelineTitle, guidelineId);
  if (!canonicalList && changes && changes.length > 0 && !allHaveExplicitPico) {
    const combinedText = changes
      .slice(0, 10)
      .map((c) => `${c.topic || ""} ${c.currentText || ""} ${c.category || ""}`)
      .join(" ")
      .toLowerCase();
    if (
      combinedText.includes("asah") ||
      combinedText.includes("subarachnoid") ||
      combinedText.includes("ruptured aneurysm")
    ) {
      canonicalList = CANONICAL_ESO_2026_ASAH_PICOS;
    } else if (
      combinedText.includes("pre-hospital blood pressure") ||
      (combinedText.includes("acute ischaemic stroke") && combinedText.includes("spontaneous ich"))
    ) {
      canonicalList = CANONICAL_ESO_2025_BP_PICOS;
    }
  }

  // If canonical list is matched, use it as the authoritative PICO set (prevents bogus PICO 1 or PICO 11..42 from fallback counters)
  if (canonicalList && canonicalList.length > 0) {
    const clonedCanonical: EsoPicoItem[] = canonicalList.map((cp) => ({
      ...cp,
      recommendations: cp.recommendations.map((r) => ({
        ...r,
        drivingTrials: r.drivingTrials ? [...r.drivingTrials] : undefined,
      })),
      drivingTrials: cp.drivingTrials ? [...cp.drivingTrials] : undefined,
    }));

    return clonedCanonical.sort((a, b) => comparePicoNumbers(a.picoNumber, b.picoNumber));
  }

  if (!changes || changes.length === 0) return [];

  // 2. For generic/future ESO guidelines: check whether explicit PICO identifiers exist
  const hasExplicitPicos = changes.some((it) => extractExplicitPico(it) !== null);

  const picoMap = new Map<string, EsoPicoItem>();
  let fallbackCounter = 1;

  changes.forEach((item) => {
    const explicit = extractExplicitPico(item);

    // If the document has explicit PICO items, ignore unnumbered noise (such as front-matter summary boxes or stray consensus statements)
    if (hasExplicitPicos && !explicit) {
      return;
    }

    const rawTopic = (item.topic || "").trim();
    const rawCategory = (item.category || "").trim();

    let picoNum: number | string = explicit ? explicit.num : fallbackCounter++;
    let picoQuestion = explicit ? explicit.question : rawTopic || rawCategory;

    // Clean up question text
    picoQuestion = picoQuestion.replace(/^PICO\s*\d+[a-z]?[:.\s-]*/i, "").trim();
    if (!picoQuestion) {
      picoQuestion = rawTopic.replace(/^PICO\s*\d+[a-z]?[:.\s-]*/i, "").trim() || rawCategory;
    }
    if (picoQuestion && !picoQuestion.endsWith("?") && !picoQuestion.endsWith(".")) {
      picoQuestion = `${picoQuestion}?`;
    }

    const picoKey = `PICO-${String(picoNum).toLowerCase()}`;
    const { strength, quality, voting } = parseEsoGrade(item.currentGrade, item.currentText);

    const consensusText =
      item.expertConsensusStatement ||
      (item.previousText && !item.previousText.startsWith("Driving Evidence:") ? item.previousText : undefined);

    const recConsensus = consensusText?.trim() || undefined;
    const recVoting =
      item.voting ||
      (recConsensus && recConsensus.includes("Vote:")
        ? `Vote: ${recConsensus.split("Vote:")[1]?.split(")")[0]?.trim()}`
        : voting || (recConsensus ? "Vote: 10/10" : undefined));

    if (!picoMap.has(picoKey)) {
      picoMap.set(picoKey, {
        picoNumber: picoNum,
        picoQuestion,
        recommendations: [],
        expertConsensusStatement: recConsensus,
        voting: recVoting,
        drivingTrials: item.drivingTrials || [],
      });
    }

    const targetPico = picoMap.get(picoKey)!;

    if (!targetPico.expertConsensusStatement && recConsensus) {
      targetPico.expertConsensusStatement = recConsensus;
      if (!targetPico.voting) {
        targetPico.voting = recVoting;
      }
    } else if (recConsensus && !targetPico.expertConsensusStatement?.includes(recConsensus)) {
      targetPico.expertConsensusStatement = `${targetPico.expertConsensusStatement}\n\n${recConsensus}`;
    }

    if (item.drivingTrials && item.drivingTrials.length > 0) {
      const mergedTrials = new Set([...(targetPico.drivingTrials || []), ...item.drivingTrials]);
      targetPico.drivingTrials = Array.from(mergedTrials);
    }

    const normalizedStrength = normalizeEsoStrength(item.strength || strength || item.currentGrade, item.currentText);

    targetPico.recommendations.push({
      number: targetPico.recommendations.length + 1,
      statement: item.currentText,
      qualityOfEvidence: item.quality || quality,
      strengthOfRecommendation: normalizedStrength,
      drivingTrials: item.drivingTrials || [],
      expertConsensusStatement: recConsensus,
      voting: recVoting,
    });
  });

  // If Topic 1 uses sub-questions (1a / 1b), ensure no standalone PICO-1 artifact remains
  if ((picoMap.has("PICO-1a") || picoMap.has("PICO-1b")) && picoMap.has("PICO-1")) {
    picoMap.delete("PICO-1");
  }

  return Array.from(picoMap.values()).sort((a, b) => comparePicoNumbers(a.picoNumber, b.picoNumber));
}
