import { describe, expect, it } from "vitest";
import {
  buildMemberPaymentRows,
  computePaymentBalance,
} from "@/components/camporees/camporee-payment-balance";
import type { CamporeeMember, CamporeePayment } from "@/lib/api/camporees";
import {
  getCamporeeMemberDisplayName,
  getSelectablePaymentMembers,
  normalizeCamporeeMember,
  normalizeCamporeeMembers,
} from "@/lib/camporees/member-display";

const members: CamporeeMember[] = [
  { user_id: "u1", name: "Ana", club_name: "Halcones", status: "approved" },
  { user_id: "u2", name: "Luis", club_name: "Halcones", status: "approved" },
  { user_id: "u3", name: "Rechazado", status: "rejected" },
];

const payments: CamporeePayment[] = [
  {
    camporee_payment_id: "p1",
    camporee_id: 1,
    member_id: "u1",
    amount: 450,
    payment_type: "inscription",
    status: "approved",
  },
  {
    camporee_payment_id: "p2",
    camporee_id: 1,
    member_id: "u2",
    amount: 200,
    payment_type: "inscription",
    status: "pending_approval",
  },
];

describe("camporee payment balance", () => {
  it("computes expected total from enrolled members × registration cost", () => {
    const balance = computePaymentBalance(members, payments, 450, 2);

    expect(balance.enrolledCount).toBe(2);
    expect(balance.expectedTotal).toBe(900);
    expect(balance.collectedApproved).toBe(450);
    expect(balance.collectedPending).toBe(200);
    expect(balance.outstanding).toBe(450);
  });

  it("marks members as paid, pending or unpaid", () => {
    const rows = buildMemberPaymentRows(members, payments, 450);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.member.user_id === "u1")?.status).toBe("paid");
    expect(rows.find((row) => row.member.user_id === "u2")?.status).toBe("pending");
  });

  it("does not count registered or pending_approval toward COBRADO", () => {
    // Product rule: only approved (or legacy missing status) counts as cobrado.
    // createPayment on-time → registered; late → pending_approval — neither is cobrado.
    // Keep Decimal string + nested camporee_member matching.
    const apiMembers: CamporeeMember[] = [
      {
        user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        camporee_member_id: 17,
        name: "Ana Pérez",
        status: "approved",
      },
      {
        user_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        camporee_member_id: 18,
        name: "Luis Gómez",
        status: "approved",
      },
    ];
    const apiPayments: CamporeePayment[] = [
      {
        camporee_payment_id: "pay-registered-1",
        camporee_member_id: 17,
        amount: "450.00",
        payment_type: "inscription",
        status: "registered",
        paid_at: "2026-07-01",
        camporee_member: {
          camporee_member_id: 17,
          camporee_id: 1,
          user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        },
      },
      {
        camporee_payment_id: "pay-pending-1",
        camporee_member_id: 18,
        amount: "450.00",
        payment_type: "inscription",
        status: "pending_approval",
        camporee_member: {
          camporee_member_id: 18,
          camporee_id: 1,
          user_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        },
      },
    ];

    const balance = computePaymentBalance(apiMembers, apiPayments, 450, 2);

    expect(balance.collectedApproved).toBe(0);
    expect(balance.collectedPending).toBe(450);
    expect(balance.expectedTotal).toBe(900);
    expect(balance.outstanding).toBe(900);
    expect(balance.rows.find((r) => r.member.user_id.startsWith("a1b2"))?.status).toBe(
      "unpaid",
    );
    expect(balance.rows.find((r) => r.member.user_id.startsWith("a1b2"))?.inscriptionPaid).toBe(
      0,
    );
    expect(balance.rows.find((r) => r.member.user_id.startsWith("b2c3"))?.status).toBe(
      "pending",
    );
  });

  it("counts approved payments toward COBRADO (Decimal + nested member)", () => {
    const apiMembers: CamporeeMember[] = [
      {
        user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        camporee_member_id: 17,
        name: "Ana Pérez",
        status: "approved",
      },
    ];
    const apiPayments: CamporeePayment[] = [
      {
        camporee_payment_id: "pay-approved-1",
        camporee_member_id: 17,
        amount: "450.00",
        payment_type: "inscription",
        status: "approved",
        camporee_member: {
          camporee_member_id: 17,
          camporee_id: 1,
          user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        },
      },
    ];

    const balance = computePaymentBalance(apiMembers, apiPayments, 450, 1);

    expect(balance.collectedApproved).toBe(450);
    expect(balance.outstanding).toBe(0);
    expect(balance.rows[0]?.status).toBe("paid");
    expect(balance.rows[0]?.inscriptionPaid).toBe(450);
  });

  it("builds display name from nested user profile instead of raw UUID", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const normalized = normalizeCamporeeMember({
      user_id: uuid,
      status: "approved",
      users: {
        user_id: uuid,
        name: "María",
        paternal_last_name: "Gómez",
        maternal_last_name: "Ruiz",
        email: "maria@example.com",
        user_image: "https://cdn.example/maria.jpg",
      },
    });

    expect(normalized.name).toBe("María Gómez Ruiz");
    expect(normalized.picture_url).toBe("https://cdn.example/maria.jpg");
    expect(normalized.email).toBe("maria@example.com");
    expect(getCamporeeMemberDisplayName(normalized, "Usuario")).toBe(
      "María Gómez Ruiz",
    );
  });

  it("never uses bare UUID as primary display label", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const label = getCamporeeMemberDisplayName(
      { user_id: uuid, name: uuid },
      "Usuario",
    );

    expect(label).toBe("Usuario (a1b2c3d4…)");
    expect(label).not.toBe(uuid);
  });

  it("keeps camporee_member_id for payment select values after normalize", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const normalized = normalizeCamporeeMembers([
      {
        camporee_member_id: 17,
        user_id: uuid,
        users: {
          user_id: uuid,
          name: "Ana",
          paternal_last_name: "Pérez",
          maternal_last_name: null,
          email: "ana@example.com",
        },
      },
      {
        // Missing enrollment id — cannot POST payments
        user_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        users: { name: "Sin id", paternal_last_name: "X" },
      },
    ]);

    const selectable = getSelectablePaymentMembers(normalized);
    expect(selectable).toHaveLength(1);
    expect(selectable[0]?.camporee_member_id).toBe(17);
    expect(selectable[0]?.name).toBe("Ana Pérez");
    expect(String(selectable[0]?.camporee_member_id)).toBe("17");
  });
});
