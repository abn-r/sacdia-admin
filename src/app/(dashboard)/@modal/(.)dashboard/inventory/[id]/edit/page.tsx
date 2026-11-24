import { notFound } from "next/navigation";
import { InventoryModal } from "@/components/inventory/inventory-modal";

export default async function EditInventoryItemModal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  const itemId = Number((await params).id);
  if (!Number.isInteger(itemId) || itemId <= 0) notFound();
  return <InventoryModal searchParams={await searchParams} itemId={itemId} />;
}
