import { describe, it, expect } from "vitest";
import { normalizeApprovalStatus } from "./approval-status";

describe("normalizeApprovalStatus()", () => {
  it('returns null for null input', () => {
    expect(normalizeApprovalStatus(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeApprovalStatus(undefined)).toBeNull();
  });

  it('maps numeric 1 to "approved"', () => {
    expect(normalizeApprovalStatus(1)).toBe("approved");
  });

  it('maps boolean true to "approved"', () => {
    expect(normalizeApprovalStatus(true)).toBe("approved");
  });

  it('maps string "approved" to "approved"', () => {
    expect(normalizeApprovalStatus("approved")).toBe("approved");
  });

  it('maps numeric -1 to "rejected"', () => {
    expect(normalizeApprovalStatus(-1)).toBe("rejected");
  });

  it('maps string "rejected" to "rejected"', () => {
    expect(normalizeApprovalStatus("rejected")).toBe("rejected");
  });

  it('maps numeric 0 to "pending"', () => {
    expect(normalizeApprovalStatus(0)).toBe("pending");
  });

  it('maps boolean false to "pending"', () => {
    expect(normalizeApprovalStatus(false)).toBe("pending");
  });

  it('maps string "pending" to "pending"', () => {
    expect(normalizeApprovalStatus("pending")).toBe("pending");
  });

  it('passes through unrecognised strings as-is', () => {
    // e.g. a future status value the backend adds before the frontend catches up
    expect(normalizeApprovalStatus("suspended")).toBe("suspended");
  });
});
