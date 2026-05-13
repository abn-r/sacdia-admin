import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { canManageClubsByRole } from "@/lib/auth/permission-utils";
import { getSelectOptions } from "@/lib/catalogs/service";
import { ClubsBulkImport } from "@/components/clubs/clubs-bulk-import";
import { bulkCreateClubsAction } from "@/lib/clubs/actions";

export default async function ImportClubsPage() {
  const user = await requireAdminUser();
  if (!canManageClubsByRole(user)) {
    redirect("/dashboard/clubs");
  }

  const t = await getTranslations("clubs.pages.import");

  const [localFields, districts, churches] = await Promise.all([
    getSelectOptions("local-fields").catch(() => []),
    getSelectOptions("districts").catch(() => []),
    getSelectOptions("churches").catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clubs">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      <ClubsBulkImport
        localFields={localFields}
        districts={districts}
        churches={churches}
        submitAction={bulkCreateClubsAction}
      />
    </div>
  );
}
