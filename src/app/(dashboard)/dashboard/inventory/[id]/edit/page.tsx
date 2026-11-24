import { notFound } from "next/navigation";
import { InventoryModal } from "@/components/inventory/inventory-modal";
import InventoryPage from "../../page";

type Search = { club?: string | string[]; section?: string | string[] };

/** Direct load of /inventory/[id]/edit: the list renders underneath, the form opens as the same modal. */
export default async function EditInventoryItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const itemId = Number((await params).id);
  if (!Number.isInteger(itemId) || itemId <= 0) notFound();
  const search = await searchParams;
  return (
    <>
      <InventoryPage searchParams={Promise.resolve(search)} />
      <InventoryModal searchParams={search} itemId={itemId} dismissHref="/dashboard/inventory" />
    </>
  );
}
