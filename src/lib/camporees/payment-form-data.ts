import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  getCamporeeById,
  getCamporeePayments,
  listCamporeeMembers,
} from "@/lib/api/camporees";
import type {
  CamporeeMember,
  CamporeePayment,
  PaginatedCamporeeMembers,
} from "@/lib/api/camporees";
import {
  LOCAL_CAMPOREE_MEMBERS_MAX_LIMIT,
  normalizeCamporeeMembers,
} from "@/lib/camporees/member-display";
import type { PaymentFormPageProps } from "@/components/camporees/payment-form-page";

type AnyRecord = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as T[];
  }
  return [];
}

/** Payments tab of the camporee detail (cancel / dismiss / full-page fallback). */
export function camporeePaymentsListHref(camporeeId: number | string) {
  return `/dashboard/campamentos/${camporeeId}?tab=payments`;
}

/** Confirms the camporee exists; 404/403 → notFound, anything else rethrows. */
async function assertCamporee(camporeeId: number) {
  try {
    await getCamporeeById(camporeeId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }
}

/** Members for the dropdown (best-effort; empty list is acceptable). */
async function loadMembers(camporeeId: number): Promise<CamporeeMember[]> {
  try {
    const payload: PaginatedCamporeeMembers = await listCamporeeMembers(
      camporeeId,
      // Backend CamporeeMembersListQueryDto @Max(100) — limit:200 returns 400.
      { page: 1, limit: LOCAL_CAMPOREE_MEMBERS_MAX_LIMIT },
    );
    return normalizeCamporeeMembers(payload.data ?? []);
  } catch {
    // silently degrade — form shows empty-members hint
    return [];
  }
}

/**
 * Props for `PaymentFormPage` (create), shared by the full page and the
 * intercepted modal. Calls `notFound()` for bad ids / missing camporee.
 */
export async function loadCreateCamporeePaymentFormData(
  idParam: string,
): Promise<PaymentFormPageProps> {
  const camporeeId = toPositiveNumber(idParam);
  if (!camporeeId) notFound();

  await assertCamporee(camporeeId);
  const members = await loadMembers(camporeeId);

  return {
    mode: "create",
    camporeeId,
    initialMembers: members,
    returnUrl: camporeePaymentsListHref(camporeeId),
  };
}

/**
 * Props for `PaymentFormPage` (edit), shared by the full page and the
 * intercepted modal. Calls `notFound()` for bad ids / missing records.
 */
export async function loadEditCamporeePaymentFormData(
  idParam: string,
  paymentId: string,
): Promise<PaymentFormPageProps> {
  const camporeeId = toPositiveNumber(idParam);
  if (!camporeeId) notFound();
  if (!paymentId || typeof paymentId !== "string") notFound();

  await assertCamporee(camporeeId);

  // Load payments and find the requested one. There is no single-payment GET
  // endpoint exposed by the admin client right now; the list endpoint returns
  // every payment row for the camporee, which scales fine for typical usage.
  let payment: CamporeePayment | null = null;
  try {
    const payload = await getCamporeePayments(camporeeId);
    const list = extractList<CamporeePayment>(payload);
    payment = list.find((p) => p.camporee_payment_id === paymentId) ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      notFound();
    }
    throw error;
  }

  if (!payment) notFound();

  // Members kept for prop parity (read-only in edit mode).
  const members = await loadMembers(camporeeId);

  return {
    mode: "edit",
    camporeeId,
    initialMembers: members,
    payment,
    returnUrl: camporeePaymentsListHref(camporeeId),
  };
}
