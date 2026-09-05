import { describe, expect, it } from "vitest";
import { computeWeekOccupancy, findLargestFreeBlock } from "./occupancy";
import type { Appointment, Doctor, DoctorAvailabilityBlock } from "@/types";

function doctor(id: string, name = "Dra. Test"): Doctor {
  return {
    id,
    account_id: "acc1",
    user_id: null,
    name,
    is_active: true,
    google_calendar_connected: false,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function block(doctorId: string, start: string, end: string): DoctorAvailabilityBlock {
  return {
    id: `${doctorId}-${start}`,
    account_id: "acc1",
    doctor_id: doctorId,
    start_at: start,
    end_at: end,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function appointment(doctorId: string, start: string, end: string, status: Appointment["status"] = "confirmed"): Appointment {
  return {
    id: `${doctorId}-${start}-appt`,
    account_id: "acc1",
    deal_id: null,
    contact_id: null,
    doctor_id: doctorId,
    room_id: null,
    service_type_id: null,
    start_at: start,
    end_at: end,
    status,
    source: "manual",
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("computeWeekOccupancy", () => {
  const rangeStart = new Date("2026-08-31T00:00:00Z");
  const rangeEnd = new Date("2026-09-07T00:00:00Z");

  it("computes percent booked against declared availability", () => {
    const doctors = [doctor("d1")];
    const blocks = [block("d1", "2026-09-01T09:00:00Z", "2026-09-01T13:00:00Z")]; // 4h available
    const appts = [appointment("d1", "2026-09-01T09:00:00Z", "2026-09-01T11:00:00Z")]; // 2h booked
    const result = computeWeekOccupancy(doctors, blocks, appts, rangeStart, rangeEnd);
    expect(result.perDoctor[0].percent).toBe(50);
    expect(result.overallPercent).toBe(50);
  });

  it("returns null percent for a doctor with no declared availability, instead of 0", () => {
    const doctors = [doctor("d1")];
    const result = computeWeekOccupancy(doctors, [], [], rangeStart, rangeEnd);
    expect(result.perDoctor[0].percent).toBeNull();
    expect(result.overallPercent).toBeNull();
  });

  it("excludes cancelled appointments from booked time", () => {
    const doctors = [doctor("d1")];
    const blocks = [block("d1", "2026-09-01T09:00:00Z", "2026-09-01T13:00:00Z")];
    const appts = [appointment("d1", "2026-09-01T09:00:00Z", "2026-09-01T11:00:00Z", "cancelled")];
    const result = computeWeekOccupancy(doctors, blocks, appts, rangeStart, rangeEnd);
    expect(result.perDoctor[0].bookedMinutes).toBe(0);
    expect(result.perDoctor[0].percent).toBe(0);
  });

  it("does not let an unconfigured doctor drag down the account-wide aggregate", () => {
    const doctors = [doctor("d1"), doctor("d2", "Dr. Sin horario")];
    const blocks = [block("d1", "2026-09-01T09:00:00Z", "2026-09-01T13:00:00Z")];
    const appts = [appointment("d1", "2026-09-01T09:00:00Z", "2026-09-01T13:00:00Z")]; // fully booked
    const result = computeWeekOccupancy(doctors, blocks, appts, rangeStart, rangeEnd);
    expect(result.overallPercent).toBe(100);
  });
});

describe("findLargestFreeBlock", () => {
  const now = new Date("2026-09-01T08:00:00Z");

  it("finds a gap inside an availability block not covered by an appointment", () => {
    const doctors = [doctor("d1", "Dr. Ulises")];
    const blocks = [block("d1", "2026-09-03T16:00:00Z", "2026-09-03T18:00:00Z")];
    const result = findLargestFreeBlock(doctors, blocks, [], now);
    expect(result?.doctorName).toBe("Dr. Ulises");
    expect(result?.minutes).toBe(120);
  });

  it("subtracts a booked appointment from the free gap", () => {
    const doctors = [doctor("d1")];
    const blocks = [block("d1", "2026-09-03T16:00:00Z", "2026-09-03T18:00:00Z")];
    const appts = [appointment("d1", "2026-09-03T16:00:00Z", "2026-09-03T17:00:00Z")];
    const result = findLargestFreeBlock(doctors, blocks, appts, now);
    expect(result?.minutes).toBe(60);
    expect(result?.start.toISOString()).toBe("2026-09-03T17:00:00.000Z");
  });

  it("ignores gaps shorter than the minimum threshold", () => {
    const doctors = [doctor("d1")];
    const blocks = [block("d1", "2026-09-03T16:00:00Z", "2026-09-03T16:30:00Z")];
    const result = findLargestFreeBlock(doctors, blocks, [], now);
    expect(result).toBeNull();
  });

  it("returns null when there are no doctors or blocks", () => {
    expect(findLargestFreeBlock([], [], [], now)).toBeNull();
  });
});
