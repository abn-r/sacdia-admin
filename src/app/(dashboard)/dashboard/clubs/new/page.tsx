import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FormPageFrame } from "@/components/shared/form-modal";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { requireAdminUser } from "@/lib/auth/session";
import { createClubWithSectionsAction } from "@/lib/clubs/actions";
import { loadCreateClubFormData } from "@/lib/clubs/create-club-form-data";

export default async function NewClubPage() {
  const user = await requireAdminUser();
  const data = await loadCreateClubFormData(user);
  if (!data) {
    redirect("/dashboard/clubs");
  }
  const t = await getTranslations("clubs.pages.new");

  return (
    <FormPageFrame title={t("title")} description={t("description")}>
      <CreateClubForm {...data} formAction={createClubWithSectionsAction} />
    </FormPageFrame>
  );
}
