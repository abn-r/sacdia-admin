import { InventoryModal } from "@/components/inventory/inventory-modal";
import InventoryPage from "../page";

type Search = { club?: string | string[]; section?: string | string[] };

/** Direct load of /inventory/new: the list renders underneath, the form opens as the same modal. */
export default async function NewInventoryItemPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  return (
    <>
      <InventoryPage searchParams={Promise.resolve(search)} />
      <InventoryModal searchParams={search} dismissHref="/dashboard/inventory" />
    </>
  );
}
