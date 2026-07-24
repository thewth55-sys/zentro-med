import { describe, it, expect } from "vitest";
import { seedDemoAccountData } from "./demo-seed";

// A single insert-result shape covers both call patterns this seeder
// uses: `await admin.from(t).insert(x)` (awaited directly) and
// `await admin.from(t).insert(x).select(cols).single()` (chained) —
// the object below is simultaneously thenable and chainable.
function chain(result: { data: unknown; error: unknown }) {
  return {
    select: () => chain(result),
    single: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
}

function makeAdmin() {
  const inserts: { table: string; payload: unknown }[] = [];

  const admin = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          inserts.push({ table, payload });
          if (table === "doctors") return chain({ data: { id: "doctor-1" }, error: null });
          if (table === "service_types") return chain({ data: { id: "service-1" }, error: null });
          if (table === "contacts") {
            const rows = (payload as { name: string }[]).map((p, i) => ({
              id: `contact-${i}`,
              name: p.name,
            }));
            return chain({ data: rows, error: null });
          }
          if (table === "conversations") {
            return chain({ data: { id: `conv-${inserts.length}` }, error: null });
          }
          return chain({ data: null, error: null });
        },
      };
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: admin as any, inserts };
}

describe("seedDemoAccountData", () => {
  it("seeds a doctor, service type, contacts, patient profiles, conversations+messages, and appointments", async () => {
    const { admin, inserts } = makeAdmin();

    await seedDemoAccountData(admin, { accountId: "acct-1", ownerUserId: "user-1" });

    const byTable = (table: string) => inserts.filter((i) => i.table === table);

    expect(byTable("doctors")).toHaveLength(1);
    expect(byTable("doctors")[0].payload).toMatchObject({ account_id: "acct-1" });

    expect(byTable("service_types")).toHaveLength(1);
    expect(byTable("service_types")[0].payload).toMatchObject({ account_id: "acct-1" });

    expect(byTable("contacts")).toHaveLength(1);
    const contactRows = byTable("contacts")[0].payload as Record<string, unknown>[];
    expect(contactRows).toHaveLength(6);
    for (const row of contactRows) {
      expect(row.account_id).toBe("acct-1");
      expect(row.user_id).toBe("user-1");
    }

    expect(byTable("patient_profiles")).toHaveLength(1);
    const patientRows = byTable("patient_profiles")[0].payload as Record<string, unknown>[];
    expect(patientRows).toHaveLength(6);
    for (const row of patientRows) {
      expect(row.account_id).toBe("acct-1");
      expect(row.assigned_doctor_id).toBe("doctor-1");
    }

    expect(byTable("conversations")).toHaveLength(3);
    for (const { payload } of byTable("conversations")) {
      expect(payload).toMatchObject({ account_id: "acct-1", user_id: "user-1" });
    }

    expect(byTable("messages")).toHaveLength(3);

    expect(byTable("appointments")).toHaveLength(1);
    const appointmentRows = byTable("appointments")[0].payload as Record<string, unknown>[];
    expect(appointmentRows).toHaveLength(6);
    for (const row of appointmentRows) {
      expect(row.account_id).toBe("acct-1");
      expect(row.doctor_id).toBe("doctor-1");
      expect(row.service_type_id).toBe("service-1");
    }
  });

  it("throws when a required insert fails", async () => {
    const { admin } = makeAdmin();
    const original = admin.from.bind(admin);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from = (table: string) => {
      if (table === "doctors") {
        return { insert: () => chain({ data: null, error: { message: "boom" } }) };
      }
      return original(table);
    };

    await expect(
      seedDemoAccountData(admin, { accountId: "acct-1", ownerUserId: "user-1" }),
    ).rejects.toThrow(/Failed to seed demo doctor/);
  });
});
