import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarRange, MapPin, DollarSign, Hash } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { CamporeeInfoCard } from "@/components/camporees/camporee-info-card";
import { CamporeeDetailActions } from "@/components/camporees/camporee-detail-actions";
import { CamporeeDetailTabs } from "@/components/camporees/camporee-detail-tabs";
import { ApiError } from "@/lib/api/client";
import {
  getCamporeeById,
  listCamporeeMembers,
  getEnrolledClubs,
  getCamporeePayments,
  getCamporeePendingApprovals,
} from "@/lib/api/camporees";
import {
  listLocalCamporeeEvents,
  listCamporeeEventTemplates,
  type CamporeeEvent,
  type CamporeeEventTemplate,
} from "@/lib/api/camporee-events";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREE_EVENTS_DELETE,
  CAMPOREES_CREATE,
  CAMPOREES_UPDATE,
  CAMPOREES_DELETE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import type {
  Camporee,
  CamporeeMember,
  CamporeeClub,
  CamporeePayment,
  PendingApprovals,
  PaginationMeta,
} from "@/lib/api/camporees";

type Params = Promise<{ id: string }>;
type AnyRecord = Record<string, unknown>;

// ─── Normalizers ───────────────────────────────────────────────────────────────

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractCamporee(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.local_camporee_id != null || nested.camporee_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }
  if (root.local_camporee_id != null || root.camporee_id != null || root.name != null) return root;
  return null;
}

function normalizeCamporee(raw: AnyRecord): Camporee {
  return {
    camporee_id: toPositiveNumber(raw.local_camporee_id ?? raw.camporee_id ?? raw.id) ?? undefined,
    id: toPositiveNumber(raw.id) ?? undefined,
    name: String(raw.name ?? ""),
    description: toText(raw.description),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    local_field_id: toPositiveNumber(raw.local_field_id) ?? undefined,
    includes_adventurers: raw.includes_adventurers === true,
    includes_pathfinders: raw.includes_pathfinders !== false,
    includes_master_guides: raw.includes_master_guides === true,
    local_camporee_place: toText(raw.local_camporee_place) ?? undefined,
    registration_cost: (() => {
      const v = raw.registration_cost;
      if (v == null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    })(),
    active: raw.active !== false,
    local_field: (() => {
      const lf = raw.local_fields as AnyRecord | undefined;
      if (!lf || typeof lf !== "object") return undefined;
      return {
        local_field_id: toPositiveNumber(lf.local_field_id) ?? undefined,
        name: toText(lf.name) ?? undefined,
        abbreviation: toText(lf.abbreviation) ?? undefined,
      };
    })(),
  };
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as T[];
  }
  return [];
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="flex min-w-[180px] items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        {label}
      </span>
      <span className="text-sm">
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function CamporeeDetailPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const { id } = await params;
  const camporeeId = toPositiveNumber(id);
  if (!camporeeId) notFound();

  let camporee: Camporee;
  let members: CamporeeMember[] = [];
  let membersMeta: PaginationMeta | undefined;
  let membersError: string | null = null;
  let clubs: CamporeeClub[] = [];
  let clubsError: string | null = null;
  let payments: CamporeePayment[] = [];
  let paymentsError: string | null = null;
  let pending: PendingApprovals = { clubs: [], members: [], payments: [] };
  let events: CamporeeEvent[] = [];
  let availableTemplates: CamporeeEventTemplate[] = [];

  // Fetch camporee detail
  try {
    const payload = await getCamporeeById(camporeeId);
    const raw = extractCamporee(payload);
    if (!raw) notFound();
    camporee = normalizeCamporee(raw);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const t = await getTranslations("camporees.pages.detail");

  // Fetch members — best effort
  try {
    const membersPayload = await listCamporeeMembers(camporeeId, { page: 1, limit: 50 });
    members = membersPayload.data;
    membersMeta = membersPayload.meta;
  } catch (err) {
    membersError =
      err instanceof ApiError
        ? err.message
        : t("loadFailed");
  }

  // Fetch enrolled clubs — best effort
  try {
    const clubsPayload = await getEnrolledClubs(camporeeId);
    clubs = extractList<CamporeeClub>(clubsPayload);
  } catch (err) {
    clubsError =
      err instanceof ApiError
        ? err.message
        : t("loadClubsFailed");
  }

  // Fetch payments — best effort
  try {
    const paymentsPayload = await getCamporeePayments(camporeeId);
    payments = extractList<CamporeePayment>(paymentsPayload);
  } catch (err) {
    paymentsError =
      err instanceof ApiError
        ? err.message
        : t("loadPaymentsFailed");
  }

  // Fetch pending approvals — best effort (non-blocking)
  try {
    const pendingPayload = await getCamporeePendingApprovals(camporeeId);
    if (pendingPayload && typeof pendingPayload === "object") {
      pending = pendingPayload as PendingApprovals;
    }
  } catch {
    // Silently ignore — pending count is informational only
  }

  // Fetch camporee events (instances) — best effort
  try {
    const eventsPayload = await listLocalCamporeeEvents(camporeeId, { limit: 100 });
    const eventsData = extractList<CamporeeEvent>(eventsPayload);
    events = eventsData.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  } catch {
    // Events are not blocking — tab shows empty state
  }

  // Fetch templates available for this local camporee — best effort
  // Local camporees can use local_field templates + their union's templates
  try {
    const templatesPayload = await listCamporeeEventTemplates({ limit: 200, active: true });
    availableTemplates = extractList<CamporeeEventTemplate>(templatesPayload);
  } catch {
    // silently degrade
  }

  const canCreateEvents = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  const canEditEvents = hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
  const canDeleteEvents = hasAnyPermission(user, [CAMPOREE_EVENTS_DELETE, CAMPOREES_DELETE]);

  return (
    <div className="space-y-6">
      <PageHeader title={camporee.name} description={t("description")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/camporees">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
        <CamporeeDetailActions camporee={camporee} />
      </PageHeader>

      {/* Summary card */}
      <CamporeeInfoCard camporee={camporee} />

      {/* Tabs */}
      <CamporeeDetailTabs
        camporeeId={camporeeId}
        initialMembers={members}
        initialMembersMeta={membersMeta}
        initialClubs={clubs}
        initialPayments={payments}
        initialPending={pending}
        membersError={membersError}
        clubsError={clubsError}
        paymentsError={paymentsError}
        initialEvents={events}
        availableTemplates={availableTemplates}
        canCreateEvents={canCreateEvents}
        canEditEvents={canEditEvents}
        canDeleteEvents={canDeleteEvents}
        infoContent={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                label={t("labelId")}
                value={camporee.camporee_id ?? camporee.id}
                icon={Hash}
              />
              <InfoRow
                label={t("labelStartDate")}
                value={formatDate(camporee.start_date)}
                icon={CalendarRange}
              />
              <InfoRow
                label={t("labelEndDate")}
                value={formatDate(camporee.end_date)}
                icon={CalendarRange}
              />
              <InfoRow
                label={t("labelPlace")}
                value={camporee.local_camporee_place ?? "—"}
                icon={MapPin}
              />
              <InfoRow
                label={t("labelCost")}
                value={
                  camporee.registration_cost != null
                    ? camporee.registration_cost.toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                        minimumFractionDigits: 2,
                      })
                    : "—"
                }
                icon={DollarSign}
              />
              <InfoRow
                label={t("labelLocalFieldId")}
                value={
                  camporee.local_field?.name ??
                  camporee.local_field?.abbreviation ??
                  camporee.local_field_id ??
                  "—"
                }
                icon={Hash}
              />
              <InfoRow
                label={t("labelIncludes")}
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {camporee.includes_adventurers && (
                      <Badge variant="secondary">Aventureros</Badge>
                    )}
                    {camporee.includes_pathfinders && (
                      <Badge variant="secondary">Conquistadores</Badge>
                    )}
                    {camporee.includes_master_guides && (
                      <Badge variant="secondary">Guías Mayores</Badge>
                    )}
                    {!camporee.includes_adventurers &&
                      !camporee.includes_pathfinders &&
                      !camporee.includes_master_guides && (
                        <span className="text-muted-foreground">—</span>
                      )}
                  </div>
                }
              />
              {camporee.description && (
                <InfoRow label={t("labelDescription")} value={camporee.description} />
              )}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
