import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { PipelineClientPage } from "@/components/investiture/pipeline-client-page";
import { getPipelineEnrollments, type PipelineEnrollment } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import type { UserRole } from "@/components/investiture/pipeline-table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUserRole(roles: string[]): UserRole {
  const set = new Set(roles);
  // extractRoles() normalizes underscores to hyphens — compare with SUPER_ADMIN_ROLE
  if (set.has(SUPER_ADMIN_ROLE) || set.has("admin")) return "admin";
  if (set.has("coordinator")) return "coordinator";
  if (set.has("field")) return "field";
  return "director";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestiturePipelinePage() {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture");

  const roles = extractRoles(user);
  const userRole = resolveUserRole(roles);

  let enrollments: PipelineEnrollment[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    enrollments = await getPipelineEnrollments();
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("pagePipeline.errorFallback");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pagePipeline.title")}
        description={t("pagePipeline.description")}
      />

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && enrollments.length === 0 && (
        <EmptyState
          icon={Star}
          title={t("pagePipeline.emptyTitle")}
          description={t("pagePipeline.emptyDescription")}
        />
      )}

      {!loadError && enrollments.length > 0 && (
        <PipelineClientPage
          initialEnrollments={enrollments}
          userRole={userRole}
        />
      )}
    </div>
  );
}
