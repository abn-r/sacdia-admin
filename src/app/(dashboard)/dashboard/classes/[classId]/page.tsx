import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ClassModuleTree } from "@/components/classes/class-module-tree";
import { ClassStatusBadge } from "@/components/classes/class-status-badge";
import { ApiError } from "@/lib/api/client";
import { getClassById, listClasses } from "@/lib/api/classes";
import type { ClassModule, ClassSection } from "@/lib/api/classes";
import { listClubTypes } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ classId: string }>;

type AnyRecord = Record<string, unknown>;

type NormalizedSection = ClassSection & {
  section_id: number;
  title: string;
  description: string | null;
};

type NormalizedModule = ClassModule & {
  module_id: number;
  title: string;
  description: string | null;
  sections: NormalizedSection[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function normalizeClassPayload(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;

  // Handle { data: { ... } } wrapper
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.class_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }

  if (root.class_id != null || root.name != null) return root;
  return null;
}

function normalizeSection(raw: unknown, idx: number): NormalizedSection {
  const s = (raw && typeof raw === "object" ? raw : {}) as AnyRecord;
  return {
    section_id: toPositiveNumber(s.section_id) ?? idx + 1,
    title: toText(s.title) ?? toText(s.name) ?? `Sección ${s.section_id ?? idx + 1}`,
    description: toText(s.description),
    display_order: toPositiveNumber(s.display_order),
    active: s.active !== false,
    requirements: Array.isArray(s.requirements)
      ? s.requirements.map((req: unknown, rIdx: number) => {
          const r = (req && typeof req === "object" ? req : {}) as AnyRecord;
          return {
            requirement_id: toPositiveNumber(r.requirement_id) ?? rIdx + 1,
            description:
              toText(r.description) ?? toText(r.name) ?? `Requisito ${rIdx + 1}`,
            display_order: toPositiveNumber(r.display_order),
            active: r.active !== false,
          };
        })
      : undefined,
  };
}

function normalizeModules(raw: unknown): NormalizedModule[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((mod: unknown, idx: number) => {
    const m = (mod && typeof mod === "object" ? mod : {}) as AnyRecord;
    const sections = Array.isArray(m.sections)
      ? m.sections.map((sec: unknown, sIdx: number) => normalizeSection(sec, sIdx))
      : [];

    return {
      module_id: toPositiveNumber(m.module_id) ?? idx + 1,
      name: toText(m.name) ?? toText(m.title) ?? `Módulo ${m.module_id ?? idx + 1}`,
      title: toText(m.title) ?? toText(m.name) ?? `Módulo ${m.module_id ?? idx + 1}`,
      description: toText(m.description),
      display_order: toPositiveNumber(m.display_order),
      sections_count: sections.length > 0 ? sections.length : (toPositiveNumber(m.sections_count) ?? 0),
      active: m.active !== false,
      sections,
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[170px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClassDetailPage({ params }: { params: Params }) {
  await requireAdminUser();

  const { classId: classIdParam } = await params;
  const classId = toPositiveNumber(classIdParam);
  if (!classId) notFound();

  // Build club type lookup map (best-effort)
  const clubTypeNameById = new Map<number, string>();
  try {
    const clubTypes = await listClubTypes();
    for (const ct of clubTypes) {
      clubTypeNameById.set(ct.club_type_id, ct.name.trim());
    }
  } catch {
    // Fallback — show ID if lookup fails.
  }

  // Fetch sibling classes for breadcrumb context (best-effort — used for "previous/next" display)
  let allClassesCount = 0;
  try {
    const siblings = await listClasses({ limit: 1 });
    // We only need the total — just check if anything came back.
    void siblings;
    allClassesCount = 0; // actual count only shown on list page
  } catch {
    // Non-critical.
  }
  void allClassesCount;

  // Fetch class detail
  let classData: AnyRecord;
  let modules: NormalizedModule[] = [];
  let modulesError: string | null = null;

  try {
    const payload = await getClassById(classId);
    const normalized = normalizeClassPayload(payload);
    if (!normalized) notFound();
    classData = normalized;
    modules = normalizeModules(classData.modules ?? []);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  // If modules were not embedded in the detail response, show an informational note.
  if (modules.length === 0 && !classData.modules) {
    modulesError =
      "El endpoint de clases no retornó módulos en la respuesta de detalle. " +
      "Los módulos se cargan desde GET /classes/:id — verifica que el backend los incluya.";
  }

  // Derived display values
  const name = toText(classData.name) ?? `Clase #${classId}`;
  const description = toText(classData.description);
  const clubTypeId = toPositiveNumber(classData.club_type_id);
  const clubTypeName = clubTypeId
    ? (clubTypeNameById.get(clubTypeId) ?? `Tipo #${clubTypeId}`)
    : "—";
  const displayOrder = toPositiveNumber(classData.display_order);
  const isActive = classData.active !== false;
  const maxPoints = toPositiveNumber(classData.max_points ?? classData.maxPoints);
  const minPoints = toPositiveNumber(classData.minimum_points ?? classData.minimumPoints);
  const modulesCount = modules.length;
  const totalSections = modules.reduce((acc, m) => acc + m.sections.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={name} description="Detalle de clase progresiva">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/classes">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      {/* Hero card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{name}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{clubTypeName}</Badge>
            <ClassStatusBadge active={isActive} />
          </div>
        </CardContent>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Orden", value: displayOrder ?? "—" },
          { label: "Módulos", value: modulesCount > 0 ? modulesCount : "—" },
          { label: "Secciones totales", value: totalSections > 0 ? totalSections : "—" },
          {
            label: "Puntos requeridos",
            value: minPoints != null ? `${minPoints} / ${maxPoints ?? "—"}` : "—",
          },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="flex flex-col gap-1 pt-4 pb-4">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-2xl font-bold tabular-nums">{value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="ID" value={classId} />
          <InfoRow label="Tipo de club" value={clubTypeName} />
          <InfoRow label="Orden de visualización" value={displayOrder ?? "—"} />
          <InfoRow label="Estado" value={<ClassStatusBadge active={isActive} />} />
          {maxPoints != null && (
            <InfoRow label="Puntos máximos" value={maxPoints} />
          )}
          {minPoints != null && (
            <InfoRow label="Puntos mínimos" value={minPoints} />
          )}
        </CardContent>
      </Card>

      {/* Tabs: Estructura */}
      <Tabs defaultValue="structure">
        <TabsList>
          <TabsTrigger value="structure">
            Estructura del programa
            {modulesCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {modulesCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Módulos y secciones</CardTitle>
            </CardHeader>
            <CardContent>
              {modulesError ? (
                <EndpointErrorBanner state="missing" detail={modulesError} />
              ) : (
                <ClassModuleTree modules={modules} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
