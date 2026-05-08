import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { getSelectOptions } from "@/lib/catalogs/service";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { createClubAction } from "@/lib/clubs/actions";

export default async function NewClubPage() {
  await requireAdminUser();
  const t = await getTranslations("clubs.pages.new");

  const [localFields, districts, churches] = await Promise.all([
    getSelectOptions("local-fields").catch(() => []),
    getSelectOptions("districts").catch(() => []),
    getSelectOptions("churches").catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clubs">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      <CreateClubForm
        localFields={localFields}
        districts={districts}
        churches={churches}
        formAction={createClubAction}
      />
    </div>
  );
}
