import { redirect } from "next/navigation";
import { Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoriesTable } from "./_components/categories-table";
import { NewCategoryButton } from "./_components/new-category-button";
import { listCategoriesAdmin } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import type { MaterialCategoryAdmin } from "@/lib/types/materials";

export default async function CategoriesPage() {
  const t = await getTranslations("materials.pages.categories");
  const user = await requireAdminUser();

  if (!hasPermission(user, "materiales:manage-inventory")) {
    redirect("/dashboard");
  }

  let categorias: MaterialCategoryAdmin[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    categorias = await listCategoriesAdmin();
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("loadError");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={t("title")}
          description={t("description")}
        />
        <NewCategoryButton />
      </div>

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && categorias.length === 0 && (
        <EmptyState
          icon={<Tag className="size-6 text-muted-foreground" aria-hidden="true" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {!loadError && categorias.length > 0 && (
        <CategoriesTable categorias={categorias} />
      )}
    </div>
  );
}
