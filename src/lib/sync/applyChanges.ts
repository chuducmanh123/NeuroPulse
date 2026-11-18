/**
 * Pure Invariant I7 delta application function shared across collections
 * (`neurorx_drugs`, `neuroguide_blocks`, etc.).
 * Rule: accept incoming row only if incoming.rev > maxKnownRev for that uid;
 * tombstones remove uid locally and prevent stale lower-rev events from resurrecting it.
 */

import type { SyncRowLike } from "./types.ts";

export interface ApplyChangesResult<TRow extends SyncRowLike> {
  next: Map<string, TRow>;
  applied: TRow[];
  removed: string[];
}

// Tracks highest tombstone revisions associated with previous Map snapshots so
// multi-chunk out-of-order deliveries remain order-independent without resurrecting deleted rows.
const tombstoneRevWatermarks = new WeakMap<
  ReadonlyMap<string, SyncRowLike>,
  Map<string, number>
>();

export interface ApplyChangesOptions {
  /**
   * For Tier-2 composite parent nodes (e.g. NeuroGuide protocols), allow live
   * rows with the same `rev` to advance monotonically when `changeSeq` is newer.
   */
  allowSameRevHigherSeq?: boolean;
}

export function applyChanges<TRow extends SyncRowLike>(
  current: ReadonlyMap<string, TRow>,
  incoming: readonly TRow[],
  options?: ApplyChangesOptions
): ApplyChangesResult<TRow> {
  const working = new Map<string, TRow>();
  for (const [uid, row] of current.entries()) {
    working.set(uid, structuredClone(row));
  }

  const prevTombstones = tombstoneRevWatermarks.get(current);
  const nextTombstones = new Map<string, number>(prevTombstones ?? []);

  // Reduce incoming rows per uid to the highest rev (prefer tombstone on equal rev).
  const latestPerUid = new Map<string, TRow>();
  for (const row of incoming) {
    if (!row || !row.uid) continue;
    const prev = latestPerUid.get(row.uid);
    if (
      !prev ||
      row.rev > prev.rev ||
      (row.rev === prev.rev && row.deletedAt !== null && prev.deletedAt === null) ||
      (Boolean(options?.allowSameRevHigherSeq) &&
        row.rev === prev.rev &&
        row.deletedAt === null &&
        prev.deletedAt === null &&
        row.changeSeq > prev.changeSeq)
    ) {
      latestPerUid.set(row.uid, row);
    }
  }

  // Sort deterministically by changeSeq then uid so returned arrays are order-independent.
  const orderedCandidates = Array.from(latestPerUid.values()).sort((a, b) => {
    if (a.changeSeq !== b.changeSeq) return a.changeSeq - b.changeSeq;
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
  });

  const applied: TRow[] = [];
  const removed: string[] = [];

  for (const candidate of orderedCandidates) {
    const existing = working.get(candidate.uid);
    const knownTombstoneRev = nextTombstones.get(candidate.uid) ?? 0;
    const maxKnownRev = Math.max(existing?.rev ?? 0, knownTombstoneRev);

    if (candidate.rev < maxKnownRev) {
      continue;
    }

    if (candidate.rev === maxKnownRev) {
      const canAdvanceSameRev =
        Boolean(options?.allowSameRevHigherSeq) &&
        knownTombstoneRev < candidate.rev &&
        candidate.deletedAt === null &&
        existing !== undefined &&
        existing.deletedAt === null &&
        candidate.changeSeq > existing.changeSeq;

      if (!canAdvanceSameRev) {
        continue;
      }
    }

    if (candidate.deletedAt !== null) {
      nextTombstones.set(candidate.uid, candidate.rev);
      if (existing) {
        working.delete(candidate.uid);
        removed.push(candidate.uid);
      }
    } else {
      nextTombstones.delete(candidate.uid);
      const stored = structuredClone(candidate);
      working.set(candidate.uid, stored);
      applied.push(structuredClone(stored));
    }
  }

  // Canonicalize Map key order by uid so Map equality is invariant to chunk arrival order.
  const next = new Map<string, TRow>();
  const sortedUids = Array.from(working.keys()).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  for (const uid of sortedUids) {
    const row = working.get(uid);
    if (row) next.set(uid, row);
  }

  tombstoneRevWatermarks.set(next, nextTombstones);

  return { next, applied, removed };
}
