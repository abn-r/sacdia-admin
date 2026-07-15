import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  getCamporeeById,
  listCamporeeMembers,
} from "@/lib/api/camporees";
import type {
  CamporeeMember,
  PaginatedCamporeeMembers,
} from "@/lib/api/camporees";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ id: string }>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export default async function CamporeePaymentNewPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminUser();

  const { id } = await params;
  const camporeeId = toPositiveNumber(id);
  if (!camporeeId) notFound();

  // Confirm camporee exists
  try {
    await getCamporeeById(camporeeId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  // Fetch members for the dropdown (best-effort; empty list is acceptable)
  let members: CamporeeMember[] = [];
  try {
    const payload: PaginatedCamporeeMembers = await listCamporeeMembers(
      camporeeId,
      { page: 1, limit: 200 },
    );
    members = payload.data ?? [];
  } catch {
    // silently degrade — user can still submit if they know the member id
  }

  return (
    <PaymentFormPage
      mode="create"
      camporeeId={camporeeId}
      initialMembers={members}
      returnUrl={`/dashboard/campamentos/${camporeeId}?tab=payments`}
    />
  );
}
