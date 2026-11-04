import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { createClubWithSectionsAction } from "@/lib/clubs/actions";
import { loadCreateClubFormData } from "@/lib/clubs/create-club-form-data";

export default async function NewClubModal() {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs.pages.new");

  // Same gate as the full page and `loadCreateClubFormData` (`clubs.create`).
  if (!canCapability(user, "clubs", "create")) {
    return <FormModalForbidden title={t("title")} description={t("description")} />;
  }

  const data = await loadCreateClubFormData(user);
  if (!data) {
    return <FormModalForbidden title={t("title")} description={t("description")} />;
  }

  return (
    <RouteFormModal title={t("title")} description={t("description")}>
      <CreateClubForm {...data} formAction={createClubWithSectionsAction} />
    </RouteFormModal>
  );
}
