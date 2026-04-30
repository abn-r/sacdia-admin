import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ApiError } from "@/lib/api/client";
import { getMemberBreakdown } from "@/lib/api/member-rankings";
import { MemberRankingScoreBadge } from "@/app/(dashboard)/dashboard/member-rankings/_components/member-ranking-score-badge";
import { MemberBreakdownCard } from "./_components/member-breakdown-card";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * TODO: replace with a real year selector once the ecclesiastical year
 * management feature is built. Same pattern as Task 17 list page.
 */
const DEFAULT_YEAR_ID = 2026;

// ─── Route params ─────────────────────────────────────────────────────────────

type Params = Promise<{ enrollmentId: string }>;
type SearchParams = Promise<{ year_id?: string }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps investiture status raw strings to human-readable Spanish labels.
 * Falls back to the raw value so unknown statuses are still visible.
 */
function investitureStatusLabel(status: string | null): string {
  if (!status) return "Sin registro";

  const labels: Record<string, string> = {
    investido: "Investido",
    completed: "Completada",
    in_progress: "En proceso",
    pending: "Pendiente",
    not_started: "No iniciada",
  };

  return labels[status.toLowerCase()] ?? status;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MemberBreakdownPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { enrollmentId: enrollmentIdRaw } = await params;
  const { year_id: yearIdRaw } = await searchParams;

  const enrollmentId = Number(enrollmentIdRaw);
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
    notFound();
  }

  const parsedYearId = yearIdRaw ? Number(yearIdRaw) : DEFAULT_YEAR_ID;
  const yearId = Number.isFinite(parsedYearId) && parsedYearId > 0 ? parsedYearId : DEFAULT_YEAR_ID;

  let data: Awaited<ReturnType<typeof getMemberBreakdown>>;
  try {
    data = await getMemberBreakdown(enrollmentId, yearId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const memberName = data.user?.name ?? `Miembro #${enrollmentId}`;
  const sectionName = data.club_section?.name ?? data.section?.name ?? "sección desconocida";

  const calculatedAt = data.composite_calculated_at
    ? new Date(data.composite_calculated_at).toLocaleString("es-MX")
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title={`Detalle: ${memberName}`}
        description={`Sección ${sectionName} · Año ${yearId}`}
        breadcrumbs={[
          { label: "Rankings de miembros", href: "/dashboard/member-rankings" },
          { label: memberName },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/member-rankings">
            <ArrowLeft className="mr-2 size-4" />
            Volver a rankings
          </Link>
        </Button>
      </PageHeader>

      {/* ── Composite score summary ── */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Posición</p>
            <p className="text-2xl font-bold">
              {data.rank_position !== null ? `#${data.rank_position}` : "—"}
            </p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Puntaje compuesto</p>
            <MemberRankingScoreBadge score={data.composite_score_pct} className="text-base" />
          </div>
          {data.awarded_category?.name && (
            <>
              <div className="h-10 w-px bg-border" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Categoría</p>
                <p className="text-sm">{data.awarded_category.name}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Signal breakdown cards ── */}
      <div className="grid gap-6 md:grid-cols-3">
        <MemberBreakdownCard
          title="Clase"
          score={data.class_score_pct}
          weight={data.weights.class_pct}
          breakdown={
            <>
              <p>
                Secciones completadas:{" "}
                <span className="font-medium text-foreground">
                  {data.class_breakdown.completed_sections} /{" "}
                  {data.class_breakdown.required_sections}
                </span>
              </p>
              {data.class_breakdown.folder_status && (
                <p>
                  Folder:{" "}
                  <span className="font-medium text-foreground">
                    {data.class_breakdown.folder_status}
                  </span>
                </p>
              )}
            </>
          }
        />

        <MemberBreakdownCard
          title="Investidura"
          score={data.investiture_score_pct}
          weight={data.weights.investiture_pct}
          breakdown={
            <p>
              Estado:{" "}
              <span className="font-medium text-foreground">
                {investitureStatusLabel(data.investiture_breakdown.status)}
              </span>
            </p>
          }
        />

        <MemberBreakdownCard
          title="Camporees"
          score={data.camporee_score_pct}
          weight={data.weights.camporee_pct}
          breakdown={
            <>
              <p>
                Participación:{" "}
                <span className="font-medium text-foreground">
                  {data.camporee_breakdown.participated ? "Sí" : "No"}
                </span>
              </p>
              {data.camporee_breakdown.total_camporees !== null && (
                <p>
                  Camporees disponibles:{" "}
                  <span className="font-medium text-foreground">
                    {data.camporee_breakdown.total_camporees}
                  </span>
                </p>
              )}
            </>
          }
        />
      </div>

      {/* ── Weights applied ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesos aplicados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Fuente:{" "}
            <span className="font-medium text-foreground">{data.weights.source}</span>
          </p>
          <p>
            Clase{" "}
            <span className="font-medium text-foreground">{data.weights.class_pct}%</span>
            {" + "}Investidura{" "}
            <span className="font-medium text-foreground">{data.weights.investiture_pct}%</span>
            {" + "}Camporees{" "}
            <span className="font-medium text-foreground">{data.weights.camporee_pct}%</span>
          </p>
        </CardContent>
      </Card>

      {/* ── Last calculated timestamp ── */}
      <p className="text-sm text-muted-foreground">
        Última recalculación:{" "}
        {calculatedAt ?? <span className="italic">no registrada</span>}
      </p>
    </div>
  );
}
