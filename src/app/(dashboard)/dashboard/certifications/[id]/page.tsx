import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CertificationModulesTree } from "@/components/certifications/certification-modules-tree";
import { EnrolledUsersPanel } from "@/components/certifications/enrolled-users-panel";
import { ApiError } from "@/lib/api/client";
import { getCertificationById } from "@/lib/api/certifications";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ id: string }>;

type AnyRecord = Record<string, unknown>;

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

function normalizeCertification(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;

  // Handle { data: { ... } } and { data: { data: { ... } } } wrappers
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.certification_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }

  if (root.certification_id != null || root.name != null) return root;
  return null;
}

type NormalizedSection = {
  section_id: number;
  title: string;
  description: string | null;
  order: number | null;
  is_required: boolean;
};

type NormalizedModule = {
  module_id: number;
  title: string;
  description: string | null;
  order: number | null;
  sections: NormalizedSection[];
};

function normalizeModules(raw: unknown): NormalizedModule[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((mod: unknown) => {
    const m = (mod && typeof mod === "object" ? mod : {}) as AnyRecord;
    const sections = Array.isArray(m.sections)
      ? m.sections.map((sec: unknown) => {
          const s = (sec && typeof sec === "object" ? sec : {}) as AnyRecord;
          return {
            section_id: toPositiveNumber(s.section_id) ?? 0,
            title: toText(s.title) ?? toText(s.name) ?? `Sección ${s.section_id ?? "?"}`,
            description: toText(s.description),
            order: toPositiveNumber(s.order),
            is_required: s.is_required === true,
          };
        })
      : [];

    return {
      module_id: toPositiveNumber(m.module_id) ?? 0,
      title: toText(m.title) ?? toText(m.name) ?? `Módulo ${m.module_id ?? "?"}`,
      description: toText(m.description),
      order: toPositiveNumber(m.order),
      sections,
    };
  });
}

type NormalizedEnrollment = {
  user_id: string;
  enrollment_id?: number;
  certification_id: number;
  enrolled_at: string | null;
  completed_at: string | null;
  progress_percent: number | null;
  user?: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
};

function normalizeEnrollments(raw: unknown, certificationId: number): NormalizedEnrollment[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((enr: unknown) => {
    const e = (enr && typeof enr === "object" ? enr : {}) as AnyRecord;
    const userId =
      toText(e.user_id) ??
      toText((e.user as AnyRecord | undefined)?.user_id) ??
      "";

    const userObj = e.user && typeof e.user === "object" ? (e.user as AnyRecord) : null;

    return {
      user_id: userId,
      enrollment_id: toPositiveNumber(e.enrollment_id) ?? undefined,
      certification_id: certificationId,
      enrolled_at: toText(e.enrolled_at) ?? toText(e.created_at),
      completed_at: toText(e.completed_at),
      progress_percent:
        typeof e.progress_percent === "number"
          ? e.progress_percent
          : typeof e.progress === "number"
            ? e.progress
            : null,
      user: userObj
        ? {
            user_id: toText(userObj.user_id) ?? userId,
            first_name: toText(userObj.first_name) ?? undefined,
            last_name: toText(userObj.last_name) ?? undefined,
            email: toText(userObj.email) ?? undefined,
          }
        : undefined,
    };
  });
}

function extractEnrollments(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data;
    const nested = root.data;
    if (nested && typeof nested === "object" && Array.isArray((nested as AnyRecord).data)) {
      return (nested as AnyRecord).data as unknown[];
    }
  }
  return [];
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[170px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default async function CertificationDetailPage({ params }: { params: Params }) {
  await requireAdminUser();

  const { id } = await params;
  const certificationId = toPositiveNumber(id);
  if (!certificationId) notFound();

  let cert: AnyRecord;
  let modules: NormalizedModule[] = [];
  let enrollments: NormalizedEnrollment[] = [];
  let enrollmentsError: string | null = null;

  // Fetch certification detail
  try {
    const payload = await getCertificationById(certificationId);
    const normalized = normalizeCertification(payload);
    if (!normalized) notFound();
    cert = normalized;
    modules = normalizeModules(cert.modules ?? []);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  // Fetch enrollments — best effort, don't fail the page
  // NOTE: The backend doesn't have a direct "list enrollments by certification" endpoint.
  // The available endpoint is per-user. For an admin overview we rely on data embedded
  // in the certification detail response (if the backend includes it), or show a message.
  const enrollmentsRaw =
    cert.enrollments ?? cert.users ?? cert.enrolled_users ?? cert.enrolledUsers ?? null;

  if (Array.isArray(enrollmentsRaw)) {
    enrollments = normalizeEnrollments(enrollmentsRaw, certificationId);
  } else {
    enrollmentsError =
      "El endpoint de certificaciones no incluye la lista de usuarios inscritos en la respuesta de detalle. Consulta directamente desde el perfil de cada usuario.";
  }

  const name = toText(cert.name) ?? `Certificación #${certificationId}`;
  const description = toText(cert.description);
  const durationWeeks = toPositiveNumber(cert.duration_weeks ?? cert.durationWeeks);
  const isActive = cert.active !== false;
  const modulesCount = modules.length > 0 ? modules.length : toPositiveNumber(cert.modules_count);
  const totalSections = modules.reduce((acc, m) => acc + m.sections.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={name} description="Detalle de certificación">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/certifications">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      {/* Summary card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{name}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Badge variant={isActive ? "default" : "outline"}>
            {isActive ? "Activo" : "Inactivo"}
          </Badge>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="ID" value={certificationId} />
          <InfoRow
            label="Duración"
            value={durationWeeks != null ? `${durationWeeks} semanas` : "—"}
          />
          <InfoRow label="Módulos" value={modulesCount ?? "—"} />
          <InfoRow label="Secciones totales" value={totalSections > 0 ? totalSections : "—"} />
        </CardContent>
      </Card>

      {/* Tabs: Modules + Enrolled users */}
      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">
            Módulos y secciones
          </TabsTrigger>
          <TabsTrigger value="users">
            Usuarios inscritos
            {enrollments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enrollments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estructura del programa</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationModulesTree modules={modules} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuarios inscritos</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsError ? (
                <EndpointErrorBanner state="missing" detail={enrollmentsError} />
              ) : (
                <EnrolledUsersPanel
                  enrollments={enrollments}
                  certificationId={certificationId}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
