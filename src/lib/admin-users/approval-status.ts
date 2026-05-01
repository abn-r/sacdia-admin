/**
 * Server-safe helpers for user approval status.
 *
 * This module intentionally has NO "use client" directive so it can be
 * imported by Server Components, Server Actions, and Client Components alike.
 */

export type ApprovalStatus = "pending" | "approved" | "rejected";

export function normalizeApprovalStatus(
  raw: number | string | boolean | null | undefined,
): ApprovalStatus | null {
  if (raw === null || raw === undefined) return null;
  if (raw === "approved" || raw === 1 || raw === true) return "approved";
  if (raw === "rejected" || raw === -1) return "rejected";
  if (raw === "pending" || raw === 0 || raw === false) return "pending";
  if (typeof raw === "string") return raw as ApprovalStatus;
  return null;
}
