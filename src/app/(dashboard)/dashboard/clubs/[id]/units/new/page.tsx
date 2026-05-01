import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { UnitForm } from "@/components/units/unit-form";
import { requireAdminUser } from "@/lib/auth/session";
import { createUnitAction } from "@/lib/units/actions";
import { apiRequest, ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ id: string }>;

type ClubMinimal = {
  club_id?: number;
  id?: number;
  name?: string;
  [key: string]: unknown;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NewUnitPage({ params }: { params: Params }) {
  await requireAdminUser();
  const { id } = await params;

  const clubId = Number(id);
  if (!Number.isFinite(clubId) || clubId <= 0) {
    notFound();
  }

  let clubName = "Club";
  try {
    const payload = await apiRequest<unknown>(`/clubs/${clubId}`);
    const res = payload as { data?: ClubMinimal } | ClubMinimal;
    const club = ("data" in res && res.data ? res.data : res) as ClubMinimal;
    clubName = club.name ?? "Club";
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    // Non-critical — page still works without club name
  }

  const boundAction = createUnitAction.bind(null, clubId);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva unidad" description={`Agregar una nueva unidad a ${clubName}`}>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/clubs/${clubId}`}>
            <ArrowLeft className="mr-2 size-4" />
            Volver al club
          </Link>
        </Button>
      </PageHeader>

      <UnitForm mode="create" clubId={clubId} formAction={boundAction} />
    </div>
  );
}
