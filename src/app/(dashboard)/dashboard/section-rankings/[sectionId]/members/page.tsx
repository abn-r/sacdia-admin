import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getSectionMembers } from "@/lib/api/section-rankings";
import { SectionMembersTable } from "./_components/section-members-table";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * TODO: replace with a real year selector once the ecclesiastical year
 * management feature is built. Same pattern as Task 17/18 list + breakdown pages.
 */
const DEFAULT_YEAR_ID = 2026;

// ─── Route params ─────────────────────────────────────────────────────────────

type Params = Promise<{ sectionId: string }>;
type SearchParams = Promise<{ year_id?: string }>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SectionMembersPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { sectionId: sectionIdRaw } = await params;
  const { year_id: yearIdRaw } = await searchParams;

  // Validate sectionId
  const sectionId = Number(sectionIdRaw);
  if (!Number.isFinite(sectionId) || sectionId <= 0) {
    notFound();
  }

  // Validate + fallback yearId
  const parsedYearId = yearIdRaw ? Number(yearIdRaw) : DEFAULT_YEAR_ID;
  const yearId =
    Number.isFinite(parsedYearId) && parsedYearId > 0
      ? parsedYearId
      : DEFAULT_YEAR_ID;

  let members: Awaited<ReturnType<typeof getSectionMembers>>;
  try {
    members = await getSectionMembers(sectionId, yearId);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Miembros de la sección"
        description={`Sección #${sectionId} · Año ${yearId} · ${members.length} ${members.length === 1 ? "miembro" : "miembros"}`}
        breadcrumbs={[
          {
            label: "Ranking de secciones",
            href: "/dashboard/section-rankings",
          },
          { label: `Sección #${sectionId}` },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/section-rankings">
            <ArrowLeft className="mr-2 size-4" />
            Volver a secciones
          </Link>
        </Button>
      </PageHeader>

      {/* ── Members table ── */}
      <SectionMembersTable data={members} yearId={yearId} />
    </div>
  );
}
