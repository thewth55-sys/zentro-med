/**
 * Pure time-range helpers for the scheduling module — no I/O, safe to
 * unit test directly. Used by the deal-form Cita panel (conflict
 * warning) and, in later phases, the Agenda view and the Cal.com
 * availability push.
 */

export interface TimeRange {
  start_at: string;
  end_at: string;
}

/** True if two [start, end) ranges overlap at all. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return new Date(a.start_at) < new Date(b.end_at) && new Date(b.start_at) < new Date(a.end_at);
}

/**
 * True if `candidate` overlaps any range in `existing`. Used to warn
 * staff that a doctor or room is already booked for the time they're
 * about to assign — advisory only, not enforced by a DB constraint,
 * since double-booking might occasionally be a deliberate call.
 */
export function hasConflict(existing: TimeRange[], candidate: TimeRange): boolean {
  return existing.some((r) => rangesOverlap(r, candidate));
}

/**
 * Merges overlapping/adjacent ranges into the minimal covering set.
 * Used (Phase B) to turn every doctor's individual availability
 * blocks into the clinic's aggregate "someone is here" schedule
 * pushed to Cal.com.
 */
export function unionRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
  const merged: TimeRange[] = [{ ...sorted[0] }];
  for (const r of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (new Date(r.start_at) <= new Date(last.end_at)) {
      if (new Date(r.end_at) > new Date(last.end_at)) last.end_at = r.end_at;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}
