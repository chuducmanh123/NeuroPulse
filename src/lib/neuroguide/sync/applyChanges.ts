import { applyChanges, type ApplyChangesResult } from "../../sync/applyChanges.ts";
import type {
  NeuroGuideContentBlockRow,
  NeuroGuideProtocolRow,
} from "./types.ts";

export { applyChanges, type ApplyChangesResult };

export interface NeuroGuideGraphApplyResult {
  protocols: ApplyChangesResult<NeuroGuideProtocolRow>;
  blocks: ApplyChangesResult<NeuroGuideContentBlockRow>;
}

/**
 * Pure Invariant I7 delta application across both tiers of the NeuroGuide graph
 * (protocol nodes + granular/shared content blocks).
 */
export function applyNeuroGuideGraphChanges(
  currentProtocols: ReadonlyMap<string, NeuroGuideProtocolRow>,
  incomingProtocols: readonly NeuroGuideProtocolRow[],
  currentBlocks: ReadonlyMap<string, NeuroGuideContentBlockRow>,
  incomingBlocks: readonly NeuroGuideContentBlockRow[]
): NeuroGuideGraphApplyResult {
  return {
    protocols: applyChanges(currentProtocols, incomingProtocols, {
      allowSameRevHigherSeq: true,
    }),
    blocks: applyChanges(currentBlocks, incomingBlocks),
  };
}
