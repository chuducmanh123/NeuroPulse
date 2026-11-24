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
      message: "Pathway English title (title.en) is required.",
    });
  } else if (!doc.title.vi?.trim()) {
    warnings.push({
      code: "MISSING_VI_TRANSLATION",
      severity: "warning",
      message: "Pathway title is missing a Vietnamese translation (title.vi).",
    });
  }

  const sourceTitle = doc.source?.title?.trim();
  const sourceYear = doc.source?.year;
  if (!sourceTitle || !Number.isFinite(sourceYear) || (sourceYear ?? 0) < 1900) {
    errors.push({
      code: "MISSING_SOURCE",
      severity: "error",
      message: "Source title and a valid publication year (>= 1900) are required.",
    });
  }

  if (!doc.sourceImageUrl?.trim()) {
    errors.push({
      code: "MISSING_IMAGE",
      severity: "error",
      message: "Original flowchart image URL (sourceImageUrl) is required.",
    });
  }

  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  if (nodes.length === 0) {
    errors.push({
      code: "EMPTY_NODES",
      severity: "error",
      message: "Pathway must contain at least one node.",
    });
    return {
      valid: false,
      canPublish: false,
      errors,
      warnings,
    };
  }

  const nodeById = new Map<string, PathwayNode>();
  const duplicateIds = new Set<string>();

  for (const node of nodes) {
    const id = (node.id || "").trim();
    if (!id) continue;
    if (nodeById.has(id)) {
      duplicateIds.add(id);
    } else {
      nodeById.set(id, node);
    }
  }

  for (const dupId of duplicateIds) {
    errors.push({
      code: "DUPLICATE_NODE_ID",
      severity: "error",
      message: `Duplicate node ID detected: "${dupId}".`,
      nodeId: dupId,
    });
  }

  const entryId = (doc.entryNodeId || "").trim();
  if (!entryId || !nodeById.has(entryId)) {
    errors.push({
      code: "INVALID_ENTRY_NODE",
      severity: "error",
      message: entryId
        ? `entryNodeId "${entryId}" does not match any node in the pathway.`
        : "entryNodeId is required.",
      nodeId: entryId || undefined,
    });
  }

  for (const node of nodes) {
    const nodeId = (node.id || "").trim();
    const edges = Array.isArray(node.edges) ? node.edges : [];

    if (!node.title?.vi?.trim()) {
      warnings.push({
        code: "MISSING_VI_TRANSLATION",
        severity: "warning",
        message: `Node "${nodeId}" is missing a Vietnamese title (title.vi).`,
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
        message: `Node "${nodeId}" (${node.kind}) has no outgoing edges.`,
        nodeId,
      });
    }

    if (node.kind === "action" && edges.length === 0) {
      warnings.push({
        code: "NON_TERMINAL_LEAF",
        severity: "warning",
        message: `Action node "${nodeId}" has no outgoing edges; consider marking it as diagnosis or treatment.`,
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
        message: `Checklist node "${nodeId}" must define at least one checklist item.`,
        nodeId,
      });
    }

    for (const edge of edges) {
      const targetId = (edge.targetNodeId || "").trim();
      if (!targetId || !nodeById.has(targetId)) {
        errors.push({
          code: "BROKEN_EDGE_TARGET",
          severity: "error",
          message: `Edge "${edge.id}" on node "${nodeId}" points to missing targetNodeId "${targetId}".`,
          nodeId,
          edgeId: edge.id,
        });
      }
      if (!edge.label?.vi?.trim()) {
        warnings.push({
          code: "MISSING_VI_TRANSLATION",
          severity: "warning",
          message: `Edge "${edge.id}" on node "${nodeId}" is missing a Vietnamese label (label.vi).`,
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
          message: `Node "${nodeId}" is unreachable from entryNodeId "${entryId}".`,
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
              message: `Directed cycle detected from "${uId}" to "${vId}" via edge "${edge.id}".`,
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
