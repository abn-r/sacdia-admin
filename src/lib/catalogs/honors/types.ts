import type { CatalogTranslation } from "@/lib/types/catalog-translation";

export type HonorTranslationRow = {
  locale: string;
  name: string | null;
  description: string | null;
};

export type AdminHonor = {
  honor_id: number;
  name: string;
  description: string | null;
  honor_image: string | null;
  material_url: string | null;
  honors_category_id: number;
  club_type_id: number;
  active: boolean;
  approval: number | null;
  skill_level: number | null;
  master_honors_id: number | null;
  year: string | null;
  translations: HonorTranslationRow[];
};

export type AdminHonorRow = AdminHonor & {
  honor_category_name: string;
  club_type_name: string;
};

export type HonorPayload = {
  name: string;
  description?: string;
  honor_image: string;
  material_url: string;
  honors_category_id: number;
  club_type_id: number;
  active?: boolean;
  approval?: number;
  skill_level?: number;
  master_honors_id?: number | null;
  year?: string;
  translations?: CatalogTranslation[];
};
