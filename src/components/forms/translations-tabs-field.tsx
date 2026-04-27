"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type CatalogLocale,
  type CatalogTranslation,
  CATALOG_LOCALES,
} from "@/lib/types/catalog-translation";

// ─── Tab metadata ─────────────────────────────────────────────────────────────

const LOCALE_LABELS: Record<CatalogLocale, string> = {
  "pt-BR": "Português",
  en: "English",
  fr: "Français",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TranslationsTabsFieldProps {
  /** Caller provides the es fields (any form pattern: FormData inputs or controlled). */
  esContent: ReactNode;
  /** Controlled translations array (non-es locales only). */
  translations: CatalogTranslation[];
  onTranslationsChange: (translations: CatalogTranslation[]) => void;
  /** Whether to show the description textarea in non-es tabs. Default true. */
  includeDescription?: boolean;
  /**
   * When set, emit hidden <input> elements for FormData mode.
   * The name format will be `{prefix}[N][locale]`, `{prefix}[N][name]`, etc.
   */
  fieldNamePrefix?: string;
  /** Disable all inputs (loading state). */
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEntry(
  translations: CatalogTranslation[],
  locale: CatalogLocale,
): CatalogTranslation | undefined {
  return translations.find((t) => t.locale === locale);
}

function updateTranslations(
  translations: CatalogTranslation[],
  locale: CatalogLocale,
  field: "name" | "description",
  value: string,
): CatalogTranslation[] {
  const trimmed = value.trim();
  const existing = translations.find((t) => t.locale === locale);

  if (existing) {
    const updated = { ...existing, [field]: trimmed || null };
    // Remove entry entirely when both fields are empty/null
    const hasName = Boolean(updated.name);
    const hasDescription = Boolean(updated.description);
    if (!hasName && !hasDescription) {
      return translations.filter((t) => t.locale !== locale);
    }
    return translations.map((t) => (t.locale === locale ? updated : t));
  }

  // No existing entry — create only if value is non-empty
  if (!trimmed) return translations;
  return [...translations, { locale, [field]: trimmed }];
}

// ─── Hidden inputs for FormData mode ─────────────────────────────────────────

function FormDataHiddenInputs({
  prefix,
  translations,
  includeDescription,
}: {
  prefix: string;
  translations: CatalogTranslation[];
  includeDescription: boolean;
}) {
  // Only emit entries that have at least one non-empty field
  const nonEmpty = translations.filter(
    (t) => Boolean(t.name) || Boolean(t.description),
  );

  return (
    <>
      {nonEmpty.map((entry, idx) => (
        <span key={entry.locale}>
          <input
            type="hidden"
            name={`${prefix}[${idx}][locale]`}
            value={entry.locale}
          />
          {entry.name != null && entry.name !== "" && (
            <input
              type="hidden"
              name={`${prefix}[${idx}][name]`}
              value={entry.name}
            />
          )}
          {includeDescription &&
            entry.description != null &&
            entry.description !== "" && (
              <input
                type="hidden"
                name={`${prefix}[${idx}][description]`}
                value={entry.description}
              />
            )}
        </span>
      ))}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TranslationsTabsField({
  esContent,
  translations,
  onTranslationsChange,
  includeDescription = true,
  fieldNamePrefix,
  disabled = false,
}: TranslationsTabsFieldProps) {
  const t = useTranslations("translations");

  function handleChange(
    locale: CatalogLocale,
    field: "name" | "description",
    value: string,
  ) {
    onTranslationsChange(updateTranslations(translations, locale, field, value));
  }

  return (
    <Tabs defaultValue="es">
      <TabsList>
        <TabsTrigger value="es">Español</TabsTrigger>
        {CATALOG_LOCALES.map((locale) => (
          <TabsTrigger key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Spanish tab — renders caller-provided fields unchanged */}
      <TabsContent value="es" className="mt-4">
        {esContent}
      </TabsContent>

      {/* Non-es tabs */}
      {CATALOG_LOCALES.map((locale) => {
        const entry = getEntry(translations, locale);
        return (
          <TabsContent key={locale} value={locale} className="mt-4">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {t("helper_optional")}
              </p>

              <div className="space-y-2">
                <Label htmlFor={`trans-${locale}-name`}>{t("label_name")}</Label>
                <Input
                  id={`trans-${locale}-name`}
                  value={entry?.name ?? ""}
                  onChange={(e) => handleChange(locale, "name", e.target.value)}
                  disabled={disabled}
                  placeholder={`${t("label_name")} (${LOCALE_LABELS[locale]})`}
                />
              </div>

              {includeDescription && (
                <div className="space-y-2">
                  <Label htmlFor={`trans-${locale}-description`}>
                    {t("label_description")}
                  </Label>
                  <Textarea
                    id={`trans-${locale}-description`}
                    rows={3}
                    value={entry?.description ?? ""}
                    onChange={(e) =>
                      handleChange(locale, "description", e.target.value)
                    }
                    disabled={disabled}
                    placeholder={`${t("label_description")} (${LOCALE_LABELS[locale]})`}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        );
      })}

      {/* Hidden inputs for FormData serialization */}
      {fieldNamePrefix && (
        <FormDataHiddenInputs
          prefix={fieldNamePrefix}
          translations={translations}
          includeDescription={includeDescription}
        />
      )}
    </Tabs>
  );
}
