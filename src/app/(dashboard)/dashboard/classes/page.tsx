import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { ClassesList } from "@/components/classes/classes-list";
import type { ClassRow } from "@/components/classes/classes-list";
import { ApiError } from "@/lib/api/client";
import { listClasses, listClassModules } from "@/lib/api/classes";
import { listClubTypes } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";

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
  await requireAdminUser();

  // Build club type lookup map
  const clubTypeNameById = new Map<number, string>();
  try {
    const clubTypes = await listClubTypes();
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

    // Fetch module counts for each class concurrently (best-effort).
    const moduleCountMap = new Map<number, number>();
    await Promise.allSettled(
      rawItems.map(async (item) => {
        const classId = toPositiveNumber(item.class_id);
        if (!classId) return;
        try {
          const modules = await listClassModules(classId);
          const list = Array.isArray(modules) ? modules : extractItems(modules);
          moduleCountMap.set(classId, list.length);
        } catch {
          // Keep 0 for this class if modules fetch fails.
        }
      }),
    );

    rows = rawItems
      .map((item): ClassRow | null => {
        const classId = toPositiveNumber(item.class_id);
        if (!classId) return null;

        const clubTypeId = toPositiveNumber(item.club_type_id);
        const clubTypeName = clubTypeId
          ? (clubTypeNameById.get(clubTypeId) ?? `Tipo #${clubTypeId}`)
          : "—";

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
          modules_count: moduleCountMap.get(classId) ?? 0,
          active: item.active !== false,
        };
      })
      .filter((row): row is ClassRow => row !== null)
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las clases progresivas.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clases progresivas"
        description="Catálogo de clases progresivas del sistema por tipo de club."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && rows.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No hay clases registradas"
          description="No se encontraron clases progresivas en el catálogo."
        />
      )}

      {!loadError && rows.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{rows.length}</span>{" "}
            {rows.length === 1 ? "clase encontrada" : "clases encontradas"}
          </p>
          <ClassesList items={rows} />
        </>
      )}
    </div>
  );
}
