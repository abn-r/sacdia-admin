import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";
import { CLUB_CONTEXT_COOKIE } from "@/lib/club-context/scope";
import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import { loadInventoryItemFormData } from "@/lib/inventory/item-form-data";

type SearchValue = string | string[] | undefined;

/** New / edit inventory item as a route modal (intercepted route and direct load). */
export async function InventoryModal({
  searchParams,
  itemId,
  dismissHref,
}: {
  searchParams: { club?: SearchValue; section?: SearchValue };
  itemId?: number;
  dismissHref?: string;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("ops.club.inventory.form");
  const isEdit = itemId !== undefined;
  const title = isEdit ? t("titleEdit") : t("titleNew");
  const description = isEdit ? t("descriptionEdit") : t("descriptionNew");

  // Only a missing permission is "forbidden"; a missing club, section or item goes back to the list.
  if (!canCapability(user, "club-inventory", isEdit ? "update" : "create")) {
    return <FormModalForbidden title={title} description={description} dismissHref={dismissHref} />;
  }

  const cookieStore = await cookies();
  const data = await loadInventoryItemFormData(user, {
    searchParams,
    cookie: cookieStore.get(CLUB_CONTEXT_COOKIE)?.value ?? null,
    itemId,
  });
  if (!data) redirect("/dashboard/inventory");

  const listHref = `/dashboard/inventory?${new URLSearchParams({
    club: String(data.club.club_id),
    section: String(data.section.club_section_id),
  }).toString()}`;

  return (
    <RouteFormModal
      title={title}
      description={`${data.club.name} · ${getFinanceSectionLabel(data.section)}`}
      dismissHref={dismissHref}
    >
      <InventoryItemForm
        clubId={data.section.club_section_id}
        instanceType={data.instanceType}
        categories={data.categories}
        item={data.item}
        listHref={listHref}
      />
    </RouteFormModal>
  );
}
