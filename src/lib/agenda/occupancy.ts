import type { Appointment, Doctor, DoctorAvailabilityBlock } from "@/types";

/**
 * "Ocupación de la semana" — honest, schema-backed alternative to a
 * business_hours-based occupancy stat (that one was explicitly
 * rejected for the Zen copilot redesign: most accounts never
 * configure business_hours, so it can't be computed honestly for
 * them — see copilot-insights-panel.tsx). This uses
 * `doctor_availability_blocks` instead — each doctor's own
 * self-declared availability (already a real, populated concept used
 * by "Mi disponibilidad") — as the denominator. A doctor who hasn't
 * declared any availability for the visible range simply has no
 * percentage (`percent: null`), rather than a fabricated 0%.
 */

export interface DoctorOccupancy {
  doctorId: string;
  doctorName: string;
  availableMinutes: number;
  bookedMinutes: number;
  percent: number | null;
}

export interface WeekOccupancy {
  overallPercent: number | null;
  bookedSlots: number;
  totalSlots: number;
  perDoctor: DoctorOccupancy[];
}

/** One "espacio" = 30 minutes — same granularity the "Nueva cita" quick
 *  action already rounds to (agenda-calendar-view.tsx's
 *  roundToNextHalfHour), so this isn't a unit invented just for this
 *  widget. */
const SLOT_MINUTES = 30;

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start) / 60_000;
}

export function computeWeekOccupancy(
  doctors: Doctor[],
  availabilityBlocks: DoctorAvailabilityBlock[],
  appointments: Appointment[],
  rangeStart: Date,
  rangeEnd: Date,
): WeekOccupancy {
  const rs = rangeStart.getTime();
  const re = rangeEnd.getTime();

  const perDoctor: DoctorOccupancy[] = doctors.map((doctor) => {
    const availableMinutes = availabilityBlocks
      .filter((b) => b.doctor_id === doctor.id)
      .reduce((sum, b) => sum + overlapMinutes(new Date(b.start_at).getTime(), new Date(b.end_at).getTime(), rs, re), 0);

    const bookedMinutes = appointments
      .filter((a) => a.doctor_id === doctor.id && a.status !== "cancelled")
      .reduce((sum, a) => sum + overlapMinutes(new Date(a.start_at).getTime(), new Date(a.end_at).getTime(), rs, re), 0);

    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      availableMinutes,
      bookedMinutes,
      percent: availableMinutes > 0 ? Math.round((bookedMinutes / availableMinutes) * 100) : null,
    };
  });

  // Only doctors with a declared schedule count toward the aggregate —
  // one who hasn't set anything up shouldn't silently drag the
  // account-wide number toward 0.
  const configured = perDoctor.filter((d) => d.availableMinutes > 0);
  const totalAvailable = configured.reduce((sum, d) => sum + d.availableMinutes, 0);
  const totalBooked = configured.reduce((sum, d) => sum + d.bookedMinutes, 0);

  return {
    overallPercent: totalAvailable > 0 ? Math.round((totalBooked / totalAvailable) * 100) : null,
    bookedSlots: Math.round(totalBooked / SLOT_MINUTES),
    totalSlots: Math.round(totalAvailable / SLOT_MINUTES),
    perDoctor,
  };
}

export interface FreeBlockCandidate {
  doctorId: string;
  doctorName: string;
  start: Date;
  end: Date;
  minutes: number;
}

const MIN_FREE_BLOCK_MINUTES = 60;

function pushCandidate(
  list: FreeBlockCandidate[],
  doctorId: string,
  doctorName: string,
  start: Date,
  end: Date,
  now: Date,
) {
  const effectiveStart = start < now ? now : start;
  const minutes = (end.getTime() - effectiveStart.getTime()) / 60_000;
  if (minutes >= MIN_FREE_BLOCK_MINUTES) {
    list.push({ doctorId, doctorName, start: effectiveStart, end, minutes });
  }
}

/**
 * Largest free gap (declared-available minus booked) across all
 * doctors in the visible range, if any is at least an hour long —
 * feeds the "ofrecer a lista de espera" suggestion. Gaps already in
 * the past are clipped to `now` (or dropped if they'd end up empty).
 */
export function findLargestFreeBlock(
  doctors: Doctor[],
  availabilityBlocks: DoctorAvailabilityBlock[],
  appointments: Appointment[],
  now: Date,
): FreeBlockCandidate | null {
  const candidates: FreeBlockCandidate[] = [];

  for (const doctor of doctors) {
    const blocks = availabilityBlocks
      .filter((b) => b.doctor_id === doctor.id)
      .map((b) => ({ start: new Date(b.start_at), end: new Date(b.end_at) }));
    const busy = appointments
      .filter((a) => a.doctor_id === doctor.id && a.status !== "cancelled")
      .map((a) => ({ start: new Date(a.start_at), end: new Date(a.end_at) }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const block of blocks) {
      let cursor = block.start;
      const overlapping = busy.filter((b) => b.end > block.start && b.start < block.end);
      for (const b of overlapping) {
        if (b.start > cursor) {
          pushCandidate(candidates, doctor.id, doctor.name, cursor, b.start < block.end ? b.start : block.end, now);
        }
        if (b.end > cursor) cursor = b.end;
      }
      if (cursor < block.end) {
        pushCandidate(candidates, doctor.id, doctor.name, cursor, block.end, now);
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (c.minutes > best.minutes ? c : best));
}
