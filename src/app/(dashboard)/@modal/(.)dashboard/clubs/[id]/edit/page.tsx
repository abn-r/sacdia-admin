import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { EditClubForm } from "@/components/clubs/edit-club-form";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { updateClubAction } from "@/lib/clubs/actions";
import { loadEditClubFormData } from "@/lib/clubs/edit-club-form-data";

type Params = Promise<{ id: string }>;

export default async function EditClubModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const t = await getTranslations("clubs.pages.edit");

  // Same gate as the full page and `loadEditClubFormData` (`clubs.update`).
  if (!canCapability(user, "clubs", "update")) {
    return <FormModalForbidden title={t("title")} description={t("description")} />;
  }

  // Missing club or out of the actor's scope: same forbidden frame (no existence leak).
  const data = await loadEditClubFormData(user, id);
  if (!data) {
    return <FormModalForbidden title={t("title")} description={t("description")} />;
  }

  return (
    <RouteFormModal title={t("title")} description={t("description")}>
      <EditClubForm {...data} formAction={updateClubAction.bind(null, data.clubId)} />
    </RouteFormModal>
  );
}
