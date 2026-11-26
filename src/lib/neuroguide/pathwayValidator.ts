import type {
  ClinicalPathwayDoc,
  PathwayNode,
  PathwayValidationIssue,
  PathwayValidationResult,
} from "../../types/clinicalPathways.ts";

function slugifySegment(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Produces a deterministic canonical slug for a clinical pathway.
 */
export function normalizePathwaySlug(
  titleEn: string,
  organizationOrAuthor?: string,
  year?: number
): string {
  const base = slugifySegment(titleEn || "");
  const parts: string[] = base ? [base] : [];

  if (organizationOrAuthor) {
    const orgSlug = slugifySegment(organizationOrAuthor);
    if (orgSlug && !base.includes(orgSlug)) {
      parts.push(orgSlug);
    }
  }

  if (typeof year === "number" && Number.isFinite(year) && year >= 1900) {
    const yearStr = String(Math.trunc(year));
    if (!base.includes(yearStr)) {
      parts.push(yearStr);
    }
  }

  const combined = parts.join("-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return combined || "clinical-pathway";
}

/**
 * Produces the canonical Sync v2 block_key for a PathwayNode.
 */
export function computePathwayNodeBlockKey(pathwaySlug: string, nodeId: string): string {
  const cleanSlug = (pathwaySlug || "").trim().toLowerCase();
  const cleanNodeId = (nodeId || "").trim().toLowerCase();
  return `pathway-node::${cleanSlug}::${cleanNodeId}`;
}

/**
 * Deterministic graph validator for ClinicalPathwayDoc.
 * Blocking errors prevent publishing (`canPublish === false`); warnings alert admins during review.
 */
export function validateClinicalPathway(
  doc: Partial<ClinicalPathwayDoc>
): PathwayValidationResult {
  const errors: PathwayValidationIssue[] = [];
  const warnings: PathwayValidationIssue[] = [];

  if (!doc.title?.en?.trim()) {
    errors.push({
      code: "MISSING_TITLE",
      severity: "error",
      message: "Pathway English title is required.",
    });
  } else if (!doc.title.vi?.trim()) {
    warnings.push({
      code: "MISSING_VI_TRANSLATION",
      severity: "warning",
      message: "Pathway title is missing a Vietnamese translation.",
    });
  }

  const sourceTitle = doc.source?.title?.trim();
  const sourceYear = doc.source?.year;
  if (!sourceTitle || !Number.isFinite(sourceYear) || (sourceYear ?? 0) < 1900) {
    errors.push({
      code: "MISSING_SOURCE",
      severity: "error",
      message: "Source title and a valid publication year (1900 or later) are required.",
    });
  }

  if (!doc.sourceImageUrl?.trim()) {
    errors.push({
      code: "MISSING_IMAGE",
      severity: "error",
      message: "Original flowchart image is required.",
    });
  }

  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  if (nodes.length === 0) {
    errors.push({
      code: "EMPTY_NODES",
      severity: "error",
      message: "Pathway must contain at least one step.",
    });
    return {
      valid: false,
      canPublish: false,
      errors,
      warnings,
    };
  }

  const nodeById = new Map<string, PathwayNode>();
  const stepIndexById = new Map<string, number>();
  const duplicateIds = new Set<string>();

  nodes.forEach((node, idx) => {
    const id = (node.id || "").trim();
    if (!id) return;
    if (nodeById.has(id)) {
      duplicateIds.add(id);
    } else {
      nodeById.set(id, node);
      stepIndexById.set(id, idx);
    }
  });

  const formatStep = (id: string): string => {
    const idx = stepIndexById.get(id);
    const n = nodeById.get(id);
    const title = n?.title?.en?.trim();
    if (idx !== undefined && title) return `Step ${idx + 1} ("${title}")`;
    if (idx !== undefined) return `Step ${idx + 1}`;
    return `"${id}"`;
  };

  for (const dupId of duplicateIds) {
    errors.push({
      code: "DUPLICATE_NODE_ID",
      severity: "error",
      message: `Duplicate internal step ID detected ("${dupId}").`,
      nodeId: dupId,
    });
  }

  const entryId = (doc.entryNodeId || "").trim();
  if (!entryId || !nodeById.has(entryId)) {
    errors.push({
      code: "INVALID_ENTRY_NODE",
      severity: "error",
      message: "Please select a valid first step for this pathway.",
      nodeId: entryId || undefined,
    });
  }

  for (const node of nodes) {
    const nodeId = (node.id || "").trim();
    const stepLabel = formatStep(nodeId);
    const edges = Array.isArray(node.edges) ? node.edges : [];

    if (!node.title?.vi?.trim()) {
      warnings.push({
        code: "MISSING_VI_TRANSLATION",
        severity: "warning",
        message: `${stepLabel} is missing a Vietnamese title.`,
        nodeId,
      });
    }

    if (
      (node.kind === "entry" || node.kind === "decision" || node.kind === "checklist") &&
      edges.length === 0
    ) {
      errors.push({
        code: "DEAD_END_DECISION",
        severity: "error",
        message: `${stepLabel} (${node.kind}) has no next steps.`,
        nodeId,
      });
    }

    if (
      (node.kind === "action" || node.kind === "section" || node.kind === "criteria") &&
      edges.length === 0
    ) {
      warnings.push({
        code: "NON_TERMINAL_LEAF",
        severity: "warning",
        message: `${stepLabel} is marked as ${node.kind} but has no next steps — consider changing its type to Diagnosis or Treatment.`,
        nodeId,
      });
    }

    if (
      node.kind === "checklist" &&
      (!Array.isArray(node.checklistItems) || node.checklistItems.length === 0)
    ) {
      errors.push({
        code: "CHECKLIST_MISSING_ITEMS",
        severity: "error",
        message: `${stepLabel} is a Checklist step and needs at least one item.`,
        nodeId,
      });
    }

    for (const edge of edges) {
      const targetId = (edge.targetNodeId || "").trim();
      const branchName = edge.label?.en?.trim() || "Untitled";
      if (!targetId || !nodeById.has(targetId)) {
        errors.push({
          code: "BROKEN_EDGE_TARGET",
          severity: "error",
          message: `Branch "${branchName}" in ${stepLabel} points to a missing step.`,
          nodeId,
          edgeId: edge.id,
        });
      }
      if (edges.length >= 2 && !edge.label?.vi?.trim()) {
        warnings.push({
          code: "MISSING_VI_TRANSLATION",
          severity: "warning",
          message: `Branch "${branchName}" in ${stepLabel} is missing a Vietnamese label.`,
          nodeId,
          edgeId: edge.id,
        });
      }
    }
  }

  // BFS reachability check from entryNodeId
  if (entryId && nodeById.has(entryId)) {
    const visited = new Set<string>();
    const queue: string[] = [entryId];
    visited.add(entryId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = nodeById.get(currentId);
      if (!currentNode) continue;
      for (const edge of currentNode.edges || []) {
        const targetId = (edge.targetNodeId || "").trim();
        if (targetId && nodeById.has(targetId) && !visited.has(targetId)) {
          visited.add(targetId);
          queue.push(targetId);
        }
      }
    }

    for (const node of nodes) {
      const nodeId = (node.id || "").trim();
      if (nodeId && !visited.has(nodeId)) {
        warnings.push({
          code: "ORPHAN_NODE",
          severity: "warning",
          message: `${formatStep(nodeId)} cannot be reached from the first step.`,
          nodeId,
        });
      }
    }

    // DFS 3-color cycle detection
    const color = new Map<string, 0 | 1 | 2>(); // 0=unvisited, 1=visiting, 2=done
    const dfs = (uId: string) => {
      color.set(uId, 1);
      const uNode = nodeById.get(uId);
      if (uNode) {
        for (const edge of uNode.edges || []) {
          const vId = (edge.targetNodeId || "").trim();
          if (!vId || !nodeById.has(vId)) continue;
          const vColor = color.get(vId) ?? 0;
          if (vColor === 1) {
            warnings.push({
              code: "CYCLE_DETECTED",
              severity: "warning",
              message: `${formatStep(uId)} loops back to ${formatStep(vId)}.`,
              nodeId: uId,
              edgeId: edge.id,
            });
          } else if (vColor === 0) {
            dfs(vId);
          }
        }
      }
      color.set(uId, 2);
    };

    for (const node of nodes) {
      const nodeId = (node.id || "").trim();
      if (nodeId && (color.get(nodeId) ?? 0) === 0) {
        dfs(nodeId);
      }
    }
  }

  return {
    valid: errors.length === 0,
    canPublish: errors.length === 0,
    errors,
    warnings,
  };
}
