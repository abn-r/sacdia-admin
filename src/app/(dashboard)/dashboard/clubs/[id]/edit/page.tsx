import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EditClubForm } from "@/components/clubs/edit-club-form";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { updateClubAction } from "@/lib/clubs/actions";
import { loadEditClubFormData } from "@/lib/clubs/edit-club-form-data";
import ClubsPage from "../../page";

type Params = Promise<{ id: string }>;

/**
 * Direct load / refresh of /clubs/:id/edit: the list renders underneath and the
 * form opens as the same modal the intercepted route shows.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clubs.pages.edit");
  return { title: t("title") };
}

export default async function EditClubPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;

  if (!canCapability(user, "clubs", "update")) {
    redirect("/dashboard/clubs");
  }
  const data = await loadEditClubFormData(user, id);
  if (!data) {
    notFound();
  }
  const t = await getTranslations("clubs.pages.edit");

  return (
    <>
      <ClubsPage searchParams={Promise.resolve({})} />
      <RouteFormModal
        dismissHref="/dashboard/clubs"
        title={t("title")}
        description={t("description")}
      >
        <EditClubForm {...data} formAction={updateClubAction.bind(null, data.clubId)} />
      </RouteFormModal>
    </>
  );
}
