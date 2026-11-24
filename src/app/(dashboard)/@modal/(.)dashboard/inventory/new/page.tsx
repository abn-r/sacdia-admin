import { InventoryModal } from "@/components/inventory/inventory-modal";

export default async function NewInventoryItemModal({
  searchParams,
}: {
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  return <InventoryModal searchParams={await searchParams} />;
}
