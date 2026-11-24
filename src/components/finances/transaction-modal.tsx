import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { TransactionForm } from "@/components/finances/transaction-form";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";
import { CLUB_CONTEXT_COOKIE } from "@/lib/club-context/scope";
import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import { loadTransactionFormData } from "@/lib/finances/transaction-form-data";

type SearchValue = string | string[] | undefined;

/**
 * New / edit movement as a route modal. Shared by the intercepted route and the
 * direct load (which passes `dismissHref` and renders the list underneath).
 */
export async function TransactionModal({
  searchParams,
  financeId,
  dismissHref,
}: {
  searchParams: { club?: SearchValue; section?: SearchValue };
  financeId?: number;
  dismissHref?: string;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("finances.form");
  const isEdit = financeId !== undefined;
  const title = isEdit ? t("titleEdit") : t("titleNew");
  const description = isEdit ? t("descriptionEdit") : t("descriptionNew");

  // Only a missing permission is "forbidden"; a missing club or movement goes back to the list.
  if (!canCapability(user, "finances", isEdit ? "update" : "create")) {
    return <FormModalForbidden title={title} description={description} dismissHref={dismissHref} />;
  }

  const cookieStore = await cookies();
  const data = await loadTransactionFormData(user, {
    searchParams,
    cookie: cookieStore.get(CLUB_CONTEXT_COOKIE)?.value ?? null,
    financeId,
  });
  if (!data) redirect("/dashboard/finances");

  const section = data.sections.find((s) => s.club_section_id === data.defaultSectionId);
  const context = [data.club.name, section ? getFinanceSectionLabel(section) : null]
    .filter(Boolean)
    .join(" · ");
  const listParams = new URLSearchParams({ club: String(data.club.club_id) });
  if (data.defaultSectionId && data.sections.length > 1) {
    listParams.set("section", String(data.defaultSectionId));
  }
  const listHref = `/dashboard/finances?${listParams.toString()}`;

  return (
    <RouteFormModal title={title} description={context || description} dismissHref={dismissHref}>
      <TransactionForm
        clubId={data.club.club_id}
        sections={data.sections}
        defaultSectionId={data.defaultSectionId}
        finance={data.finance}
        listHref={listHref}
      />
    </RouteFormModal>
  );
}
