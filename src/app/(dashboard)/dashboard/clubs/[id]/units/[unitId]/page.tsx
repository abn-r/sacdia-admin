import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { UnitForm } from "@/components/units/unit-form";
import { requireAdminUser } from "@/lib/auth/session";
import { updateUnitAction } from "@/lib/units/actions";
import { getUnit } from "@/lib/api/units";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { Unit } from "@/lib/api/units";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ id: string; unitId: string }>;

type ClubMinimal = {
  club_id?: number;
  id?: number;
  name?: string;
  [key: string]: unknown;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EditUnitPage({ params }: { params: Params }) {
  await requireAdminUser();
  const { id, unitId } = await params;

  const clubId = Number(id);
  const unitIdNum = Number(unitId);

  if (!Number.isFinite(clubId) || clubId <= 0) {
    notFound();
  }
  if (!Number.isFinite(unitIdNum) || unitIdNum <= 0) {
    notFound();
  }

  let unit: Unit;
  let clubName = "Club";

  try {
    const [unitData, clubData] = await Promise.allSettled([
      getUnit(clubId, unitIdNum),
      apiRequest<unknown>(`/clubs/${clubId}`),
    ]);

    if (unitData.status === "rejected") {
      const err = unitData.reason;
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        notFound();
      }
      throw err;
    }

    unit = unitData.value;

    if (clubData.status === "fulfilled") {
      const payload = clubData.value;
      const res = payload as { data?: ClubMinimal } | ClubMinimal;
      const club = ("data" in res && res.data ? res.data : res) as ClubMinimal;
      clubName = club.name ?? "Club";
    }
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const boundAction = updateUnitAction.bind(null, clubId, unitIdNum);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar unidad"
        description={`Modificar los datos de "${unit.name}" en ${clubName}`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/clubs/${clubId}`}>
            <ArrowLeft className="mr-2 size-4" />
            Volver al club
          </Link>
        </Button>
      </PageHeader>

      <UnitForm mode="edit" clubId={clubId} initialData={unit} formAction={boundAction} />
    </div>
  );
}
