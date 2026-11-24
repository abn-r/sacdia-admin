import { listCategoriesAdmin, listInventory } from "@/lib/api/materials";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";
import {
  canPickLocalField,
  resolveUserLocalField,
  toLocalFieldOptions,
} from "@/lib/auth/user-local-field";
import type {
  LocalFieldOption,
  MaterialCategory,
  MaterialCategoryAdmin,
  MaterialProduct,
} from "@/lib/types/materials";

export type ProductFormData = {
  categories: MaterialCategory[];
  /** Empty when the actor is bound to one local field (the picker is hidden). */
  localFields: LocalFieldOption[];
  actorLocalFieldId: number | null;
  /** Present for edit, `null` for create. */
  product: MaterialProduct | null;
};

const SCAN_PAGE_SIZE = 100;
const SCAN_MAX_PAGES = 10;

/**
 * The backend has no `GET /materials/inventory/:id`, so the edit route finds
 * the product by walking the inventory list. Bounded: 10 pages of 100.
 */
async function findProductById(id: string, localFieldId?: number): Promise<MaterialProduct | null> {
  for (let page = 1; page <= SCAN_MAX_PAGES; page += 1) {
    const result = await listInventory({
      page,
      pageSize: SCAN_PAGE_SIZE,
      ...(localFieldId !== undefined ? { local_field_id: localFieldId } : {}),
    });
    const hit = result.data.find((p) => p.id === id);
    if (hit) return hit;
    if (page * SCAN_PAGE_SIZE >= result.total) break;
  }
  return null;
}

/** Same gate as the catalog screen: `materials-inventory.manage`. `null` = forbidden or missing. */
export async function loadProductFormData(
  user: AuthUser,
  productId?: string,
): Promise<ProductFormData | null> {
  if (!canCapability(user, "materials-inventory", "manage")) return null;

  const scope = resolveUserLocalField(user);
  const [categories, fields] = await Promise.all([
    listCategoriesAdmin().catch(() => [] as MaterialCategoryAdmin[]),
    canPickLocalField(scope) ? listLocalFieldsForTerritory(user).catch(() => []) : Promise.resolve([]),
  ]);

  let product: MaterialProduct | null = null;
  if (productId) {
    product = await findProductById(productId, scope.scope === "single" ? scope.localFieldId : undefined).catch(
      () => null,
    );
    if (!product) return null;
  }

  return {
    categories: categories.filter((c) => c.active),
    localFields: canPickLocalField(scope) ? toLocalFieldOptions(fields) : [],
    actorLocalFieldId: scope.scope === "single" ? scope.localFieldId : null,
    product,
  };
}

export type CategoryFormData = { categoria: MaterialCategoryAdmin | null };

/** `null` = forbidden or the category does not exist. */
export async function loadCategoryFormData(
  user: AuthUser,
  categoryId?: string,
): Promise<CategoryFormData | null> {
  if (!canCapability(user, "materials-inventory", "manage")) return null;
  if (!categoryId) return { categoria: null };
  const all = await listCategoriesAdmin().catch(() => [] as MaterialCategoryAdmin[]);
  const categoria = all.find((c) => c.id === categoryId) ?? null;
  return categoria ? { categoria } : null;
}
