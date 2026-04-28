export type CatalogLocale = "pt-BR" | "en" | "fr";

export type CatalogTranslation = {
  locale: CatalogLocale;
  name?: string | null;
  description?: string | null;
};

export const CATALOG_LOCALES: CatalogLocale[] = ["pt-BR", "en", "fr"];
