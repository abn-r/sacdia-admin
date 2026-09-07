import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { canManageClubsByRole } from "@/lib/auth/permission-utils";
import { listClubTypes } from "@/lib/api/catalogs";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { createClubWithSectionsAction } from "@/lib/clubs/actions";
import { loadClubGeographyForTerritory } from "@/lib/clubs/territory-catalogs";
import {
  toChurchOptions,
  toClubTypeOptions,
  toDistrictOptions,
  toLocalFieldOptions,
} from "@/lib/clubs/create-form-options";

export default async function NewClubPage() {
  const user = await requireAdminUser();
  if (!canManageClubsByRole(user)) {
    redirect("/dashboard/clubs");
  }
  const t = await getTranslations("clubs.pages.new");

  const [{ localFields, districts, churches }, clubTypes] = await Promise.all([
    loadClubGeographyForTerritory(user),
    listClubTypes().catch(() => []),
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
        localFields={toLocalFieldOptions(localFields)}
        districts={toDistrictOptions(districts)}
        churches={toChurchOptions(churches)}
        clubTypes={toClubTypeOptions(
          clubTypes.map((item) => ({
            club_type_id: item.club_type_id,
            name: item.name,
            active: true,
          }) as Record<string, unknown>),
        )}
        formAction={createClubWithSectionsAction}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
        googleMapsMapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      />
    </div>
  );
}
