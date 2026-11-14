/**
 * Pure Invariant I7 delta application function (client-safe, zero node:* imports).
 * Rule: accept incoming row only if incoming.rev > maxKnownRev for that uid;
 * tombstones remove uid locally and prevent stale lower-rev events from resurrecting it.
 */

import type { SyncRow } from "./types.ts";

export interface ApplyChangesResult {
  next: Map<string, SyncRow>;
  applied: SyncRow[];
  removed: string[];
}

// Tracks highest tombstone revisions associated with previous Map snapshots so
// multi-chunk out-of-order deliveries remain order-independent without resurrecting deleted rows.
const tombstoneRevWatermarks = new WeakMap<
  ReadonlyMap<string, SyncRow>,
  Map<string, number>
>();

export function applyChanges(
  current: ReadonlyMap<string, SyncRow>,
  incoming: readonly SyncRow[]
): ApplyChangesResult {
  const working = new Map<string, SyncRow>();
  for (const [uid, row] of current.entries()) {
    working.set(uid, structuredClone(row));
  }

  const prevTombstones = tombstoneRevWatermarks.get(current);
  const nextTombstones = new Map<string, number>(prevTombstones ?? []);

  // Reduce incoming rows per uid to the highest rev (prefer tombstone on equal rev).
  const latestPerUid = new Map<string, SyncRow>();
  for (const row of incoming) {
    if (!row || !row.uid) continue;
    const prev = latestPerUid.get(row.uid);
    if (
      !prev ||
      row.rev > prev.rev ||
      (row.rev === prev.rev && row.deletedAt !== null && prev.deletedAt === null)
    ) {
      latestPerUid.set(row.uid, row);
    }
  }

  // Sort deterministically by changeSeq then uid so returned arrays are order-independent.
  const orderedCandidates = Array.from(latestPerUid.values()).sort((a, b) => {
    if (a.changeSeq !== b.changeSeq) return a.changeSeq - b.changeSeq;
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
  });

  const applied: SyncRow[] = [];
  const removed: string[] = [];

  for (const candidate of orderedCandidates) {
    const existing = working.get(candidate.uid);
    const knownTombstoneRev = nextTombstones.get(candidate.uid) ?? 0;
    const maxKnownRev = Math.max(existing?.rev ?? 0, knownTombstoneRev);

    if (candidate.rev <= maxKnownRev) {
      continue;
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
  const next = new Map<string, SyncRow>();
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
