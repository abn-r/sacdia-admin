import type { CatalogTranslation } from "@/lib/types/catalog-translation";

export type DivisionTranslationRow = {
  id: number;
  division_id: number;
  locale: string;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminDivision = {
  division_id: number;
  code: string;
  name: string;
  abbreviation: string;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
  translations: DivisionTranslationRow[];
};

export type DivisionPayload = {
  code: string;
  name: string;
  abbreviation: string;
  active?: boolean;
  translations?: CatalogTranslation[];
};
