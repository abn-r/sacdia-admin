import type { CatalogTranslation } from "@/lib/types/catalog-translation";

export type ChurchTranslationRow = {
  id?: number;
  church_id?: number;
  locale: string;
  name: string | null;
};

export type AdminChurchApi = {
  church_id: number;
  name: string;
  active: boolean;
  districlub_type_id: number;
  created_at: string | null;
  modified_at: string | null;
  translations?: ChurchTranslationRow[];
};

export type AdminChurch = {
  church_id: number;
  name: string;
  active: boolean;
  district_id: number;
  created_at: string | null;
  modified_at: string | null;
  translations: ChurchTranslationRow[];
};

export type AdminChurchRow = AdminChurch & {
  district_name: string;
};

export type ChurchPayload = {
  name: string;
  district_id: number;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export type ChurchListFilters = {
  districtId?: number;
};

export function normalizeChurch(row: AdminChurchApi): AdminChurch {
  return {
    church_id: row.church_id,
    name: row.name,
    active: row.active,
    district_id: row.districlub_type_id,
    created_at: row.created_at,
    modified_at: row.modified_at,
    translations: row.translations ?? [],
  };
}
