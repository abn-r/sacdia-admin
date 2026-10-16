import { describe, expect, it, vi } from "vitest";
import { persistCamporeePayment } from "./persist-payment";

const payload = { amount: 100, payment_type: "inscription" };

function api(createdId = "pay-1") {
  return {
    create: vi.fn().mockResolvedValue({ data: { camporee_payment_id: createdId } }),
    update: vi.fn().mockResolvedValue({}),
  };
}

describe("persistCamporeePayment", () => {
  it("creates the payment once and returns its id", async () => {
    const a = api();
    const id = await persistCamporeePayment({ camporeeId: 7, memberId: "3", payload }, a);

    expect(id).toBe("pay-1");
    expect(a.create).toHaveBeenCalledTimes(1);
    expect(a.update).not.toHaveBeenCalled();
  });

  it("updates the saved row on a retry instead of creating a duplicate", async () => {
    const a = api();
    const firstId = await persistCamporeePayment({ camporeeId: 7, memberId: "3", payload }, a);
    // Voucher upload failed; the form resubmits with the id it saved.
    const retryId = await persistCamporeePayment(
      { camporeeId: 7, memberId: "3", payload, savedId: firstId },
      a,
    );

    expect(retryId).toBe("pay-1");
    expect(a.create).toHaveBeenCalledTimes(1);
    expect(a.update).toHaveBeenCalledWith("pay-1", payload);
  });

  it("updates the edited payment in edit mode", async () => {
    const a = api();
    const id = await persistCamporeePayment(
      { camporeeId: 7, memberId: "3", payload, editingId: "pay-9" },
      a,
    );

    expect(id).toBe("pay-9");
    expect(a.create).not.toHaveBeenCalled();
  });

  it("reads an unwrapped created row", async () => {
    const a = api();
    a.create.mockResolvedValueOnce({ camporee_payment_id: "pay-2" });

    await expect(
      persistCamporeePayment({ camporeeId: 7, memberId: "3", payload }, a),
    ).resolves.toBe("pay-2");
  });
});
