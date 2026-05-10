import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { HonorForm } from "@/components/honors/honor-form";
import { ApiError } from "@/lib/api/client";
import { getHonorById } from "@/lib/api/honors";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { HONORS_UPDATE } from "@/lib/auth/permissions";
import { updateHonorAction } from "@/lib/honors/actions";
import { loadHonorCatalogOptions } from "@/lib/honors/catalogs";

type Params = Promise<{ honorId: string }>;

function pickHonorRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.honor_id !== undefined || root.id !== undefined) {
    return root;
  }
  const nested = root.data;
  if (nested && typeof nested === "object") {
    return nested as Record<string, unknown>;
  }
  return null;
}

export default async function EditHonorPage({ params }: { params: Params }) {
  const { honorId: rawHonorId } = await params;
  const honorId = Number(rawHonorId);
  if (!Number.isFinite(honorId) || honorId <= 0) {
    notFound();
  }

  const user = await requireAdminUser();
  const t = await getTranslations("honors.pages.edit");
  const roleSet = new Set(extractRoles(user));
  const isSuperAdmin = roleSet.has(SUPER_ADMIN_ROLE);
  const canEdit = isSuperAdmin || hasAnyPermission(user, [HONORS_UPDATE]);

  if (!canEdit) {
    notFound();
  }

  let honor: Record<string, unknown> | null = null;
  try {
    const payload = await getHonorById(honorId);
    honor = pickHonorRecord(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  if (!honor) {
    notFound();
  }

  const { categoryOptions, clubTypeOptions } = await loadHonorCatalogOptions();
  const boundUpdateAction = updateHonorAction.bind(null, honorId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/honors">
            <ArrowLeft className="size-4" />
            {t("backButton")}
          </Link>
        </Button>
      </PageHeader>

      <HonorForm
        mode="edit"
        initialItem={honor}
        categoryOptions={categoryOptions}
        clubTypeOptions={clubTypeOptions}
        formAction={boundUpdateAction}
      />
    </div>
  );
}
