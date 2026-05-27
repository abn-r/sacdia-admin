import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { listEntityItems } from "@/lib/catalogs/service";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { createClubWithSectionsAction } from "@/lib/clubs/actions";
import {
  toChurchOptions,
  toClubTypeOptions,
  toDistrictOptions,
  toLocalFieldOptions,
} from "@/lib/clubs/create-form-options";

export default async function NewClubPage() {
  await requireAdminUser();
  const t = await getTranslations("clubs.pages.new");

  const [localFieldItems, districtItems, churchItems, clubTypeItems] = await Promise.all([
    listEntityItems("local-fields").catch(() => []),
    listEntityItems("districts").catch(() => []),
    listEntityItems("churches").catch(() => []),
    listEntityItems("club-types").catch(() => []),
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
        localFields={toLocalFieldOptions(localFieldItems)}
        districts={toDistrictOptions(districtItems)}
        churches={toChurchOptions(churchItems)}
        clubTypes={toClubTypeOptions(clubTypeItems)}
        formAction={createClubWithSectionsAction}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
      />
    </div>
  );
}
