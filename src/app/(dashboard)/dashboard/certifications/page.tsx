import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { CertificationsList } from "@/components/certifications/certifications-list";
import { ApiError } from "@/lib/api/client";
import { listCertifications } from "@/lib/api/certifications";
import { requireAdminUser } from "@/lib/auth/session";

type GenericRecord = Record<string, unknown>;

function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as GenericRecord[];
    const nested = root.data;
    if (nested && typeof nested === "object" && Array.isArray((nested as GenericRecord).data)) {
      return (nested as GenericRecord).data as GenericRecord[];
    }
  }
  return [];
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeCertification(item: GenericRecord) {
  const modulesRaw = item.modules;
  const modulesCount =
    toPositiveNumber(item.modules_count) ??
    toPositiveNumber(item.modulesCount) ??
    (Array.isArray(modulesRaw) ? modulesRaw.length : null);

  return {
    certification_id: toPositiveNumber(item.certification_id) ?? toPositiveNumber(item.id) ?? 0,
    name: typeof item.name === "string" ? item.name : `Certificación #${item.certification_id ?? "?"}`,
    description: typeof item.description === "string" ? item.description : null,
    duration_weeks:
      toPositiveNumber(item.duration_weeks) ?? toPositiveNumber(item.durationWeeks) ?? null,
    modules_count: modulesCount,
    active: item.active !== false,
  };
}

export default async function CertificationsPage() {
  await requireAdminUser();

  let items: ReturnType<typeof normalizeCertification>[] = [];
  let loadError: string | null = null;

  try {
    const payload = await listCertifications({ page: 1, limit: 100 });
    const raw = extractItems(payload);
    items = raw.map(normalizeCertification);
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las certificaciones.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificaciones"
        description="Consulta de certificaciones y progreso de usuarios inscritos."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && items.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No hay certificaciones"
          description="No se encontraron certificaciones registradas."
        />
      )}

      {!loadError && items.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{items.length}</span>{" "}
            {items.length === 1 ? "certificación encontrada" : "certificaciones encontradas"}
          </p>
          <CertificationsList items={items} />
        </>
      )}
    </div>
  );
}
