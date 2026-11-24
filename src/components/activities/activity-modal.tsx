import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { ActivityForm } from "@/components/activities/activity-form";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { CLUB_CONTEXT_COOKIE } from "@/lib/club-context/scope";
import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import { loadActivityFormData } from "@/lib/activities/form-data";
import { ACTIVITIES_BASE_PATH } from "@/lib/activities/helpers";
import { todayKey } from "@/lib/activities/view";

type SearchValue = string | string[] | undefined;

/**
 * New / edit activity as a route modal. Shared by the intercepted routes and
 * the direct loads (which pass `dismissHref` and render the page underneath).
 */
export async function ActivityModal({
  searchParams,
  activityId,
  dismissHref,
}: {
  searchParams: { club?: SearchValue; section?: SearchValue };
  activityId?: number;
  dismissHref?: string;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("people.activities.form");
  const isEdit = activityId !== undefined;
  const title = isEdit ? t("titleEdit") : t("titleNew");

  // Only a missing permission is "forbidden"; a missing club or activity goes back to the list.
  if (!canCapability(user, "activities", isEdit ? "update" : "create")) {
    return <FormModalForbidden title={title} dismissHref={dismissHref} />;
  }

  const cookieStore = await cookies();
  const data = await loadActivityFormData(user, {
    searchParams,
    cookie: cookieStore.get(CLUB_CONTEXT_COOKIE)?.value ?? null,
    activityId,
  });
  if (!data) redirect(ACTIVITIES_BASE_PATH);

  const section = data.club.sections.find((s) => s.club_section_id === data.defaultSectionId);
  const context = [data.club.name, section ? getFinanceSectionLabel(section) : null].filter(Boolean).join(" · ");

  const listParams = new URLSearchParams({ club: String(data.club.club_id) });
  if (data.club.sections.length > 1) listParams.set("section", String(data.defaultSectionId));
  const listHref = `${ACTIVITIES_BASE_PATH}?${listParams.toString()}`;

  return (
    <RouteFormModal title={title} description={context} dismissHref={dismissHref}>
      <ActivityForm
        clubId={data.club.club_id}
        sections={data.club.sections}
        defaultSectionId={data.defaultSectionId}
        activity={data.activity}
        listHref={listHref}
        today={todayKey()}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
        googleMapsMapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      />
    </RouteFormModal>
  );
}
