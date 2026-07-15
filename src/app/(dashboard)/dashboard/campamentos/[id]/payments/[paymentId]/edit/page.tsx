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
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ id: string; paymentId: string }>;
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

export default async function CamporeePaymentEditPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminUser();

  const { id, paymentId } = await params;
  const camporeeId = toPositiveNumber(id);
  if (!camporeeId) notFound();
  if (!paymentId || typeof paymentId !== "string") notFound();

  // Confirm camporee exists
  try {
    await getCamporeeById(camporeeId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  // Load payments and find the requested one. There is no single-payment GET
  // endpoint exposed by the admin client right now; the list endpoint returns
  // every payment row for the camporee, which scales fine for typical usage.
  let payment: CamporeePayment | null = null;
  try {
    const payload = await getCamporeePayments(camporeeId);
    const list = extractList<CamporeePayment>(payload);
    payment =
      list.find((p) => p.camporee_payment_id === paymentId) ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      notFound();
    }
    throw error;
  }

  if (!payment) notFound();

  // Fetch members for the dropdown (read-only in edit mode but kept for prop parity)
  let members: CamporeeMember[] = [];
  try {
    const payload: PaginatedCamporeeMembers = await listCamporeeMembers(
      camporeeId,
      { page: 1, limit: 200 },
    );
    members = payload.data ?? [];
  } catch {
    // silently degrade
  }

  return (
    <PaymentFormPage
      mode="edit"
      camporeeId={camporeeId}
      initialMembers={members}
      payment={payment}
      returnUrl={`/dashboard/campamentos/${camporeeId}?tab=payments`}
    />
  );
}
