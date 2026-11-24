import type {
  BilingualText,
  ClinicalPathwayDoc,
  PathwayChecklistItem,
  PathwayLangMode,
  PathwayNode,
} from "../../types/clinicalPathways.ts";
import { matchesQuery } from "../vietnamese-search.ts";

export interface BilingualDisplay {
  primary: string;
  secondary?: string;
}

export function resolveBilingualDisplay(
  text: BilingualText | undefined,
  mode: PathwayLangMode
): BilingualDisplay {
  if (!text) return { primary: "" };
  const en = (text.en || "").trim();
  const vi = (text.vi || "").trim();

  if (mode === "en") {
    return { primary: en || vi };
  }

  if (mode === "vi") {
    if (vi) {
      return {
        primary: vi,
        ...(en && en !== vi ? { secondary: en } : {}),
      };
    }
    return { primary: en };
  }

  // bilingual: EN primary, VI secondary
  return {
    primary: en || vi,
    ...(vi && vi !== en ? { secondary: vi } : {}),
  };
}

export interface ChecklistEvaluation {
  inclusionTotal: number;
  inclusionChecked: number;
  exclusionTotal: number;
  exclusionChecked: number;
  status: "pass" | "fail" | "incomplete";
}

export function evaluateChecklistState(
  items: readonly PathwayChecklistItem[],
  checkedMap: Readonly<Record<string, boolean>>
): ChecklistEvaluation {
  let inclusionTotal = 0;
  let inclusionChecked = 0;
  let exclusionTotal = 0;
  let exclusionChecked = 0;

  for (const item of items) {
    const isChecked = Boolean(checkedMap[item.id]);
    if (item.role === "exclusion") {
      exclusionTotal++;
      if (isChecked) exclusionChecked++;
    } else {
      inclusionTotal++;
      if (isChecked) inclusionChecked++;
    }
  }

  let status: ChecklistEvaluation["status"] = "incomplete";
  if (exclusionChecked > 0) {
    status = "fail";
  } else if (
    (inclusionTotal > 0 && inclusionChecked === inclusionTotal) ||
    (inclusionTotal === 0 && exclusionTotal > 0)
  ) {
    status = "pass";
  }

  return {
    inclusionTotal,
    inclusionChecked,
    exclusionTotal,
    exclusionChecked,
    status,
  };
}

export function buildPathwaySummaryText(
  pathway: ClinicalPathwayDoc,
  trail: readonly { nodeTitle: string; chosenLabel?: string }[],
  finalNode: PathwayNode,
  mode: PathwayLangMode
): string {
  const title = resolveBilingualDisplay(pathway.title, mode).primary;
  const lines: string[] = [
    `[NeuroGuide Clinical Pathway] ${title}`,
    `Source: ${pathway.source.title} (${pathway.source.organizationOrAuthor}, ${pathway.source.year})${
      pathway.source.figureRef ? ` — ${pathway.source.figureRef}` : ""
    }`,
    "",
    "Decision Trail:",
  ];

  trail.forEach((step, idx) => {
    const stepText = step.chosenLabel
      ? `${idx + 1}. ${step.nodeTitle} -> ${step.chosenLabel}`
      : `${idx + 1}. ${step.nodeTitle}`;
    lines.push(stepText);
  });

  const outcomeTitle = resolveBilingualDisplay(finalNode.title, mode).primary;
  lines.push("");
  lines.push(`Conclusion (${finalNode.kind.toUpperCase()}): ${outcomeTitle}`);

  if (finalNode.evidenceBadge) {
    lines.push(`Evidence: ${finalNode.evidenceBadge}`);
  }
  if (finalNode.body) {
    lines.push(`Details: ${resolveBilingualDisplay(finalNode.body, mode).primary}`);
  }
  if (finalNode.warning) {
    lines.push(`Warning: ${resolveBilingualDisplay(finalNode.warning, mode).primary}`);
  }

  return lines.join("\n");
}

export interface PathwayCatalogFilter {
  query: string;
  subspecialty: string;
  domain: string;
  sourceType: string;
  statusFilter: "active" | "published" | "draft" | "archived" | "deleted";
  isAdmin: boolean;
}

export function filterCatalogPathways(
  pathways: readonly ClinicalPathwayDoc[],
  filter: PathwayCatalogFilter
): ClinicalPathwayDoc[] {
  const query = (filter.query || "").trim();

  return pathways.filter((p) => {
    const isDeleted = Boolean(p.deletedAt);

    if (!filter.isAdmin) {
      if (p.status !== "published" || isDeleted) return false;
    } else {
      if (filter.statusFilter === "deleted") {
        if (!isDeleted) return false;
      } else if (filter.statusFilter === "active") {
        if (isDeleted || p.status === "archived") return false;
      } else {
        if (isDeleted || p.status !== filter.statusFilter) return false;
      }
    }

    if (
      filter.subspecialty &&
      filter.subspecialty !== "All Subspecialties" &&
      p.subspecialty !== filter.subspecialty
    ) {
      return false;
    }

    if (filter.domain && filter.domain !== "ALL" && p.domain !== filter.domain) {
      return false;
    }

    if (
      filter.sourceType &&
      filter.sourceType !== "ALL" &&
      p.source.sourceType !== filter.sourceType
    ) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      p.title.en,
      p.title.vi || "",
      p.summary?.en || "",
      p.summary?.vi || "",
      p.source.title,
      p.source.organizationOrAuthor,
      p.subspecialty,
      ...(p.nodes || []).flatMap((n) => [n.title.en, n.title.vi || ""]),
    ].join(" ");

    return matchesQuery(haystack, query);
  });
}
