import type { MaterialEstado } from "@/lib/types/materials";

// ─── Queue tabs (one queue, one tab per step) ────────────────────────────────

export type InboxTab = "review" | "receipts" | "deliver" | "closed";

export const INBOX_TAB_ORDER: readonly InboxTab[] = ["review", "receipts", "deliver", "closed"];

/** Backend `estado` that each tab lists. `closed` is refined by `ClosedFilter`. */
export const INBOX_TAB_ESTADO: Record<Exclude<InboxTab, "closed">, MaterialEstado> = {
  review: "en_revision",
  receipts: "aprobada",
  deliver: "pagada",
};

export type ClosedFilter = "entregada" | "cancelada";

export function resolveClosedFilter(raw: unknown): ClosedFilter {
  return raw === "cancelada" ? "cancelada" : "entregada";
}

/**
 * Tab from `?tab=`, restricted to the tabs the actor can see. Falls back to the
 * first available one (so `?tab=receipts` without the validate permission lands
 * on a tab that exists instead of an empty page).
 */
export function resolveInboxTab(raw: unknown, available: readonly InboxTab[]): InboxTab | null {
  if (typeof raw === "string" && (available as readonly string[]).includes(raw)) {
    return raw as InboxTab;
  }
  return available[0] ?? null;
}

export function estadoForTab(tab: InboxTab, closed: ClosedFilter): MaterialEstado {
  return tab === "closed" ? closed : INBOX_TAB_ESTADO[tab];
}

// ─── Waiting time ────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** Whole days elapsed since `iso` (never negative; invalid dates count as 0). */
export function daysSince(iso: string, now: number = Date.now()): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

// ─── What is missing to advance ──────────────────────────────────────────────

export type OrderNextStep =
  | { key: "noLines" }
  | { key: "resolveLines"; count: number }
  | { key: "readyToApprove" }
  | { key: "awaitingReceipt" }
  | { key: "receiptToConfirm"; count: number }
  | { key: "readyToDeliver" }
  | { key: "delivered" }
  | { key: "cancelled" };

/**
 * The single next thing that has to happen to the order. The detail shows only
 * this (and the current state), never a fixed timeline of every step.
 */
export function orderNextStep(input: {
  estado: MaterialEstado;
  linesTotal: number;
  linesResolved: number;
  pendingReceipts: number;
}): OrderNextStep {
  switch (input.estado) {
    case "en_revision": {
      if (input.linesTotal === 0) return { key: "noLines" };
      const missing = Math.max(0, input.linesTotal - input.linesResolved);
      return missing > 0 ? { key: "resolveLines", count: missing } : { key: "readyToApprove" };
    }
    case "aprobada":
      return input.pendingReceipts > 0
        ? { key: "receiptToConfirm", count: input.pendingReceipts }
        : { key: "awaitingReceipt" };
    case "pagada":
      return { key: "readyToDeliver" };
    case "entregada":
      return { key: "delivered" };
    default:
      return { key: "cancelled" };
  }
}

// ─── Cancel consequence ──────────────────────────────────────────────────────

export type CancelConsequence = "close" | "restoreStock" | "refund";

/** What cancelling does, by current state; `null` when it cannot be cancelled. */
export function cancelConsequence(estado: MaterialEstado): CancelConsequence | null {
  switch (estado) {
    case "en_revision":
      return "close";
    case "aprobada":
      return "restoreStock";
    case "pagada":
      return "refund";
    default:
      return null;
  }
}

export function lineIsResolved(disponibilidad: string): boolean {
  return disponibilidad !== "pendiente";
}
