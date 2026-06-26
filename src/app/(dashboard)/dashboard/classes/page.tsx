import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { ClassesList } from "@/components/classes/classes-list";
import type { ClassRow } from "@/components/classes/classes-list";
import { ClassExpirationCard } from "@/components/classes/class-expiration-card";
import { ApiError } from "@/lib/api/client";
import { listClasses } from "@/lib/api/classes";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CLASSES_MANAGE } from "@/lib/auth/permissions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function extractItems(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClassesPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("classes.pages.list");
  const tList = await getTranslations("classes.list");
  const canManageClasses = hasAnyPermission(user, [CLASSES_MANAGE]);

  // Build club type lookup map
  const clubTypeNameById = new Map<number, string>();
  let ecclesiasticalYears: Awaited<ReturnType<typeof listEcclesiasticalYears>> = [];
  try {
    const [clubTypes, years] = await Promise.all([
      listClubTypes(),
      listEcclesiasticalYears().catch(() => []),
    ]);
    ecclesiasticalYears = years;
    for (const ct of clubTypes) {
      if (typeof ct.club_type_id === "number" && typeof ct.name === "string" && ct.name.trim()) {
        clubTypeNameById.set(ct.club_type_id, ct.name.trim());
      }
    }
  } catch {
    // Catalog endpoint unavailable — display fallback IDs in the table.
  }

  let rows: ClassRow[] = [];
  let loadError: string | null = null;

  try {
    const payload = await listClasses({ page: 1, limit: 100 });
    const rawItems = extractItems(payload);

    rows = rawItems
      .map((item): ClassRow | null => {
        const classId = toPositiveNumber(item.class_id);
        if (!classId) return null;

        const clubTypeId = toPositiveNumber(item.club_type_id);
        const clubTypeName = clubTypeId
          ? (clubTypeNameById.get(clubTypeId) ?? `Tipo #${clubTypeId}`)
          : "—";

        // Backend returns `_count: { class_modules: N }` in the list payload.
        const count = (item._count as { class_modules?: unknown } | undefined)
          ?.class_modules;
        const modulesCount =
          typeof count === "number" && Number.isFinite(count) && count >= 0
            ? count
            : 0;

        return {
          class_id: classId,
          name:
            typeof item.name === "string" && item.name.trim()
              ? item.name.trim()
              : `Clase #${classId}`,
          description: typeof item.description === "string" ? item.description : null,
          club_type_id: clubTypeId ?? 0,
          club_type_name: clubTypeName,
          display_order: toPositiveNumber(item.display_order) ?? 0,
          available_from_year_id: toPositiveNumber(item.available_from_year_id),
          available_until_year_id: toPositiveNumber(item.available_until_year_id),
          min_duration_years: toPositiveNumber(item.min_duration_years) ?? 1,
          max_duration_years: toPositiveNumber(item.max_duration_years) ?? 1,
          modules_count: modulesCount,
          active: item.active !== false,
        };
      })
      .filter((row): row is ClassRow => row !== null)
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : t("loadFailed");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {canManageClasses && (
        <ClassExpirationCard ecclesiasticalYears={ecclesiasticalYears} />
      )}

      {!loadError && rows.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title={tList("empty_title")}
          description={tList("empty_description")}
        />
      )}

      {!loadError && rows.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{rows.length}</span>{" "}
            {rows.length === 1 ? t("countSingular") : t("countPlural")}
          </p>
          <ClassesList items={rows} />
        </>
      )}
    </div>
  );
}
