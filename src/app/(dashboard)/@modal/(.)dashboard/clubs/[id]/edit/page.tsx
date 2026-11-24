import { redirect } from "next/navigation";
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

  // The actor can edit: a missing or out-of-scope club goes back to the list.
  const data = await loadEditClubFormData(user, id);
  if (!data) {
    redirect("/dashboard/clubs");
  }

  return (
    <RouteFormModal title={t("title")} description={data.name}>
      <EditClubForm {...data} formAction={updateClubAction.bind(null, data.clubId)} />
    </RouteFormModal>
  );
}
