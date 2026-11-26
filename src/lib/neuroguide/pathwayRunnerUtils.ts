import type {
  BilingualText,
  ClinicalPathwayDoc,
  PathwayChecklistItem,
  PathwayChoiceLayout,
  PathwayEdge,
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

// ============================================================================
// AHA Progressive Vertical Stack Engine
// ============================================================================

export interface PathwayDecisionChoice {
  instanceKey: string;
  nodeId: string;
  edgeId: string;
}

export type ResolvedChoiceLayout = "binary" | "row3" | "grid2" | "stack";

export interface PathwayStackItem {
  instanceKey: string;
  node: PathwayNode;
  selectedEdgeId?: string;
  selectedEdge?: PathwayEdge;
  isInteractive: boolean;
  choiceLayout: ResolvedChoiceLayout;
  manualLoopEdge?: PathwayEdge;
  isLoopIteration: boolean;
  isTerminal: boolean;
  hasCorAccent: boolean;
}

export interface ClinicalBodyBlock {
  type: "paragraph" | "bullets";
  lines: string[];
}

function normalizeComparisonText(raw?: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/[*†‡.,:;!?()[\]{}'"`]+/g, "")
    .replace(/\s+/g, " ");
}

export function resolveChoiceGridLayout(
  edges: readonly PathwayEdge[],
  explicitLayout?: PathwayChoiceLayout
): ResolvedChoiceLayout {
  if (explicitLayout && explicitLayout !== "auto") {
    return explicitLayout;
  }
  const maxLen = edges.reduce(
    (max, e) => Math.max(max, (e.label?.en || "").trim().length),
    0
  );
  if (edges.length === 2 && maxLen <= 44) return "binary";
  if (edges.length === 3 && maxLen <= 38) return "row3";
  if (edges.length === 4 && maxLen <= 56) return "grid2";
  return "stack";
}

/**
 * Detects pure wrapper/echo nodes created by older AI extractions that repeat
 * the incoming branch label verbatim and have only 1 outgoing edge with no
 * clinical payload of their own.
 */
export function isRedundantEchoNode(
  node: PathwayNode,
  incomingEdge?: PathwayEdge
): boolean {
  if (!incomingEdge) return false;
  if (node.edges.length !== 1) return false;
  if (node.kind === "entry" || node.kind === "checklist") return false;
  if (node.body?.en?.trim() || node.warning?.en?.trim() || node.clinicalPearl?.en?.trim()) {
    return false;
  }
  if (node.tier !== undefined || node.evidenceBadge?.trim()) return false;
  if (node.compoundItems && node.compoundItems.length > 0) return false;

  const nodeTitle = normalizeComparisonText(node.title?.en);
  const edgeLabel = normalizeComparisonText(incomingEdge.label?.en);
  return Boolean(nodeTitle && edgeLabel && nodeTitle === edgeLabel);
}

const MAX_STACK_STEPS = 40;

export function buildVisibleStack(
  pathway: ClinicalPathwayDoc,
  decisions: readonly PathwayDecisionChoice[]
): PathwayStackItem[] {
  const nodeMap = new Map<string, PathwayNode>();
  for (const n of pathway.nodes) {
    nodeMap.set(n.id, n);
  }

  const decisionByInstance = new Map<string, PathwayDecisionChoice>();
  for (const d of decisions) {
    decisionByInstance.set(d.instanceKey, d);
  }

  const occurrences = new Map<string, number>();
  const visitedNodeIds = new Set<string>();
  let seenInAutoPass = new Set<string>();
  let unrollingLoopPass = false;

  const stack: PathwayStackItem[] = [];
  let currentId: string | undefined = pathway.entryNodeId;
  let incomingEdge: PathwayEdge | undefined;
  let safetySteps = 0;

  while (currentId && safetySteps < MAX_STACK_STEPS) {
    safetySteps++;
    const node = nodeMap.get(currentId);
    if (!node) break;

    if (incomingEdge && isRedundantEchoNode(node, incomingEdge)) {
      const nextEdge = node.edges[0];
      if (!seenInAutoPass.has(nextEdge.targetNodeId)) {
        seenInAutoPass.add(node.id);
        currentId = nextEdge.targetNodeId;
        continue;
      }
    }

    const occ = occurrences.get(node.id) ?? 0;
    occurrences.set(node.id, occ + 1);
    const instanceKey = `${node.id}#${occ}`;
    const isLoopIteration = occ > 0;
    const hasCorAccent =
      node.tier !== undefined || Boolean(node.compoundItems && node.compoundItems.length > 0);

    const isChecklistInteractive =
      node.kind === "checklist" && Boolean(node.checklistItems && node.checklistItems.length > 0);
    const isDecision = node.edges.length >= 2 || isChecklistInteractive;

    if (node.edges.length === 0) {
      stack.push({
        instanceKey,
        node,
        isInteractive: false,
        choiceLayout: "stack",
        isLoopIteration,
        isTerminal: true,
        hasCorAccent,
      });
      break;
    }

    if (isDecision) {
      const picked = decisionByInstance.get(instanceKey);
      const chosenEdge = picked
        ? node.edges.find((e) => e.id === picked.edgeId)
        : undefined;

      stack.push({
        instanceKey,
        node,
        selectedEdgeId: chosenEdge?.id,
        selectedEdge: chosenEdge,
        isInteractive: true,
        choiceLayout: resolveChoiceGridLayout(node.edges, node.choiceLayout),
        isLoopIteration,
        isTerminal: false,
        hasCorAccent,
      });

      visitedNodeIds.add(node.id);
      unrollingLoopPass = false;

      if (!chosenEdge) {
        break;
      }

      incomingEdge = chosenEdge;
      currentId = chosenEdge.targetNodeId;
      seenInAutoPass = new Set<string>();
      continue;
    }

    // Single outgoing edge (linear auto-unfold)
    const onlyEdge = node.edges[0];
    const pickedLoop = decisionByInstance.get(instanceKey);
    const manualLoopTriggered = Boolean(pickedLoop && pickedLoop.edgeId === onlyEdge.id);

    if (manualLoopTriggered) {
      stack.push({
        instanceKey,
        node,
        selectedEdgeId: onlyEdge.id,
        selectedEdge: onlyEdge,
        isInteractive: false,
        choiceLayout: "stack",
        manualLoopEdge: onlyEdge,
        isLoopIteration,
        isTerminal: false,
        hasCorAccent,
      });
      visitedNodeIds.add(node.id);
      seenInAutoPass = new Set<string>([node.id]);
      unrollingLoopPass = true;
      incomingEdge = onlyEdge;
      currentId = onlyEdge.targetNodeId;
      continue;
    }

    if (visitedNodeIds.has(onlyEdge.targetNodeId)) {
      const canUnroll =
        (onlyEdge.autoUnrollLoop === true || unrollingLoopPass) &&
        !seenInAutoPass.has(onlyEdge.targetNodeId);

      if (canUnroll) {
        stack.push({
          instanceKey,
          node,
          isInteractive: false,
          choiceLayout: "stack",
          isLoopIteration,
          isTerminal: false,
          hasCorAccent,
        });
        visitedNodeIds.add(node.id);
        seenInAutoPass.add(node.id);
        if (onlyEdge.autoUnrollLoop === true) {
          unrollingLoopPass = true;
        }
        incomingEdge = onlyEdge;
        currentId = onlyEdge.targetNodeId;
        continue;
      }

      // Safe default: pause at loop-back point and offer manual loop button
      stack.push({
        instanceKey,
        node,
        isInteractive: false,
        choiceLayout: "stack",
        manualLoopEdge: onlyEdge,
        isLoopIteration,
        isTerminal: false,
        hasCorAccent,
      });
      visitedNodeIds.add(node.id);
      break;
    }

    stack.push({
      instanceKey,
      node,
      isInteractive: false,
      choiceLayout: "stack",
      isLoopIteration,
      isTerminal: false,
      hasCorAccent,
    });
    visitedNodeIds.add(node.id);
    seenInAutoPass.add(node.id);
    incomingEdge = onlyEdge;
    currentId = onlyEdge.targetNodeId;
  }

  return stack;
}

export function selectDecisionAt(
  decisions: readonly PathwayDecisionChoice[],
  instanceKey: string,
  nodeId: string,
  edgeId: string
): PathwayDecisionChoice[] {
  const existingIdx = decisions.findIndex((d) => d.instanceKey === instanceKey);
  if (existingIdx !== -1) {
    if (decisions[existingIdx].edgeId === edgeId) {
      return [...decisions];
    }
    return [
      ...decisions.slice(0, existingIdx),
      { instanceKey, nodeId, edgeId },
    ];
  }
  return [...decisions, { instanceKey, nodeId, edgeId }];
}

export function parseClinicalBodyBlocks(text: string): ClinicalBodyBlock[] {
  const rawLines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: ClinicalBodyBlock[] = [];
  let currentBlock: ClinicalBodyBlock | null = null;

  for (const line of rawLines) {
    const isBullet = /^(?:•|-|\*)\s+/.test(line);
    const cleanedLine = isBullet ? line.replace(/^(?:•|-|\*)\s+/, "").trim() : line;
    const blockType: ClinicalBodyBlock["type"] = isBullet ? "bullets" : "paragraph";

    if (!currentBlock || currentBlock.type !== blockType) {
      currentBlock = { type: blockType, lines: [cleanedLine] };
      blocks.push(currentBlock);
    } else {
      currentBlock.lines.push(cleanedLine);
    }
  }

  return blocks;
}

export function buildStackSummaryText(
  pathway: ClinicalPathwayDoc,
  stack: readonly PathwayStackItem[],
  mode: PathwayLangMode
): string {
  const title = resolveBilingualDisplay(pathway.title, mode).primary;
  const lines: string[] = [
    `[NeuroGuide Clinical Pathway] ${title}`,
    `Source: ${pathway.source.title} (${pathway.source.organizationOrAuthor}, ${pathway.source.year})${
      pathway.source.figureRef ? ` — ${pathway.source.figureRef}` : ""
    }`,
    "",
    "Clinical Pathway Flow:",
  ];

  stack.forEach((item, idx) => {
    const nodeTitle = resolveBilingualDisplay(item.node.title, mode).primary;
    const badge = item.node.evidenceBadge ? ` [${item.node.evidenceBadge}]` : "";
    if (item.selectedEdge) {
      const chosen = resolveBilingualDisplay(item.selectedEdge.label, mode).primary;
      lines.push(`${idx + 1}. ${nodeTitle}${badge} -> ${chosen}`);
    } else {
      lines.push(`${idx + 1}. ${nodeTitle}${badge}`);
    }
    if (item.node.body) {
      const bodyText = resolveBilingualDisplay(item.node.body, mode).primary;
      if (bodyText) {
        lines.push(`   ${bodyText.replace(/\n/g, "\n   ")}`);
      }
    }
    if (item.node.warning) {
      lines.push(`   Warning: ${resolveBilingualDisplay(item.node.warning, mode).primary}`);
    }
  });

  return lines.join("\n");
}
