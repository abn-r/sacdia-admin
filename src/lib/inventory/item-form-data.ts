import { listClubTypes } from "@/lib/api/catalogs";
import { listClubInventory, listInventoryCategories } from "@/lib/api/inventory";
import type { InstanceType, InventoryCategory, InventoryItem } from "@/lib/api/inventory";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { resolveClubContext } from "@/lib/club-context/scope";
import type { ClubContextClub } from "@/lib/club-context/types";
import type { FinanceClubSection } from "@/lib/finances/club-sections";
import { normalizeInventoryCategories } from "@/lib/inventory/categories";
import { clubTypeIdToInstanceType, extractArray } from "@/lib/inventory/club-sections";
import { normalizeInventoryItem } from "@/lib/inventory/normalize-item";

export type InventoryItemFormData = {
  club: ClubContextClub;
  section: FinanceClubSection;
  instanceType: InstanceType;
  categories: InventoryCategory[];
  item: InventoryItem | null;
};

type SearchValue = string | string[] | undefined;

/**
 * Data of the new / edit item modal, shared by the intercepted and the direct
 * route. `null` when the actor cannot do it or the section / item is unknown.
 */
export async function loadInventoryItemFormData(
  user: AuthUser,
  args: {
    searchParams: { club?: SearchValue; section?: SearchValue };
    cookie?: string | null;
    itemId?: number;
  },
): Promise<InventoryItemFormData | null> {
  const isEdit = args.itemId !== undefined;
  if (!canCapability(user, "club-inventory", isEdit ? "update" : "create")) return null;

  const clubTypes = await listClubTypes().catch(() => []);
  const loaded = await loadClubContextClubs(clubTypes);
  if (!loaded.ok) return null;

  const { club, section } = resolveClubContext({
    clubs: loaded.clubs,
    searchParams: args.searchParams,
    cookie: args.cookie,
  });
  if (!club || !section) return null;
  const instanceType = clubTypeIdToInstanceType(section.club_type_id);

  const [categoriesPayload, itemsPayload] = await Promise.all([
    listInventoryCategories().catch(() => []),
    isEdit
      ? listClubInventory(section.club_section_id, { instanceType }).catch(() => null)
      : Promise.resolve(null),
  ]);

  let item: InventoryItem | null = null;
  if (isEdit) {
    if (itemsPayload === null) return null;
    item =
      extractArray(itemsPayload)
        .map(normalizeInventoryItem)
        .find((candidate) => candidate.inventory_id === args.itemId) ?? null;
    if (!item) return null;
  }

  return {
    club,
    section,
    instanceType,
    categories: normalizeInventoryCategories(categoriesPayload),
    item,
  };
}
