import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ConfigForm } from "./_components/config-form";
import { LocalFieldPicker } from "./_components/local-field-picker";
import { getConfig } from "@/lib/api/materials";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { resolveUserLocalField } from "@/lib/auth/user-local-field";
import { hasPermission } from "@/lib/auth/permission-utils";
import type {
  MaterialConfig,
  LocalFieldOption,
} from "@/lib/types/materials";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function resolveLfParam(raw: unknown): number | undefined {
  const n = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();

  if (!hasPermission(user, "materiales:configure")) {
    redirect("/dashboard");
  }

  const scope = resolveUserLocalField(user);
  const raw = await searchParams;
  const lfOverride = resolveLfParam(raw["local_field_id"]);

  // Effective target LF:
  //   LF-scoped users → their own LF
  //   Admin without override → null (must pick one in the UI)
  //   Admin with override → the override
  const targetLocalFieldId =
    scope.scope === "single" ? scope.localFieldId : (lfOverride ?? null);

  let config: MaterialConfig | null = null;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;
  let localFields: LocalFieldOption[] = [];

  // For unscoped admins we always fetch the list of LFs for the picker.
  if (scope.scope === "all") {
    try {
      const res = await apiRequest<{ data: LocalFieldOption[] }>(
        "/admin/local-fields",
      );
      localFields = res.data;
    } catch {
      // selector degrades gracefully (empty list) — error banner only on the
      // config fetch below.
    }
  }

  if (targetLocalFieldId != null) {
    try {
      config = await getConfig({ localFieldId: targetLocalFieldId });
    } catch (error) {
      if (error instanceof ApiError) {
        loadError = error.message;
        loadErrorStatus = error.status;
      } else {
        loadError = "Error al cargar la configuración.";
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de materiales"
        description="Datos bancarios y opciones de entrega por campo local."
      />

      {scope.scope === "all" && (
        <LocalFieldPicker
          currentLocalFieldId={targetLocalFieldId}
          localFields={localFields}
        />
      )}

      {/* Error state */}
      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {/* Unscoped admin without a selected LF — prompt to pick */}
      {scope.scope === "all" && targetLocalFieldId == null && !loadError && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Seleccioná un campo local para ver y editar su configuración.
        </div>
      )}

      {/* Form */}
      {config && targetLocalFieldId != null && (
        <ConfigForm
          config={config}
          localFieldId={targetLocalFieldId}
        />
      )}
    </div>
  );
}
