"use client";

import { type ReactNode, useState } from "react";
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

// ─── Second-field configuration ───────────────────────────────────────────────

/** Describes the optional second translatable field shown in non-es tabs. */
export interface SecondFieldConfig {
  /** The FormData/JSON key for this field. */
  key: "description" | "ideal";
  /** Label shown above the input. */
  label: string;
  /** When true renders a Textarea; otherwise an Input. Default: true. */
  multiline?: boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TranslationsTabsFieldProps {
  /** Caller provides the es fields (any form pattern: FormData inputs or controlled). */
  esContent: ReactNode;
  /** Controlled translations array (non-es locales only). */
  translations: CatalogTranslation[];
  onTranslationsChange: (translations: CatalogTranslation[]) => void;
  /**
   * Whether to show a second field (description or ideal) in non-es tabs.
   * Default true — renders description with a Textarea.
   *
   * Pass false to suppress the second field.
   * Pass a `SecondFieldConfig` object to customise the key and label —
   * e.g. `{ key: 'ideal', label: 'Ideal', multiline: true }` for club-ideals.
   *
   * Backwards-compatible: existing consumers that pass `includeDescription={false}`
   * keep working unchanged (no second field rendered).
   */
  includeDescription?: boolean | SecondFieldConfig;
  /**
   * When set, emit hidden <input> elements for FormData mode.
   * The name format will be `{prefix}[N][locale]`, `{prefix}[N][name]`, etc.
   * Also emits a `translations_dirty` hidden input ('1' | '0') so server
   * actions can detect whether the admin actually touched a non-es tab.
   */
  fieldNamePrefix?: string;
  /** Disable all inputs (loading state). */
  disabled?: boolean;
  /**
   * Called when the dirty state changes — i.e. the first time the admin
   * directly edits a non-es input. Programmatic updates via
   * `onTranslationsChange` from the parent do NOT trigger this.
   */
  onDirtyChange?: (dirty: boolean) => void;
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
  field: "name" | "description" | "ideal",
  value: string,
): CatalogTranslation[] {
  const trimmed = value.trim();
  const existing = translations.find((t) => t.locale === locale);

  if (existing) {
    const updated = { ...existing, [field]: trimmed || null };
    // Remove entry entirely when all known fields are empty/null
    const hasName = Boolean(updated.name);
    const hasDescription = Boolean(updated.description);
    const hasIdeal = Boolean(updated.ideal);
    if (!hasName && !hasDescription && !hasIdeal) {
      return translations.filter((t) => t.locale !== locale);
    }
    return translations.map((t) => (t.locale === locale ? updated : t));
  }

  // No existing entry — create only if value is non-empty
  if (!trimmed) return translations;
  return [...translations, { locale, [field]: trimmed }];
}

/**
 * Resolves the `includeDescription` prop to a normalised descriptor.
 * Returns null when no second field should be shown.
 */
function resolveSecondField(
  includeDescription: boolean | SecondFieldConfig | undefined,
  descriptionLabel: string,
): SecondFieldConfig | null {
  if (includeDescription === false) return null;
  if (typeof includeDescription === "object") return includeDescription;
  // true or undefined — default to description Textarea
  return { key: "description", label: descriptionLabel, multiline: true };
}

// ─── Hidden inputs for FormData mode ─────────────────────────────────────────

function FormDataHiddenInputs({
  prefix,
  translations,
  secondField,
}: {
  prefix: string;
  translations: CatalogTranslation[];
  secondField: SecondFieldConfig | null;
}) {
  // Only emit entries that have at least one non-empty field
  const nonEmpty = translations.filter(
    (t) =>
      Boolean(t.name) ||
      Boolean(t.description) ||
      Boolean(t.ideal),
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
          {secondField?.key === "description" &&
            entry.description != null &&
            entry.description !== "" && (
              <input
                type="hidden"
                name={`${prefix}[${idx}][description]`}
                value={entry.description}
              />
            )}
          {secondField?.key === "ideal" &&
            entry.ideal != null &&
            entry.ideal !== "" && (
              <input
                type="hidden"
                name={`${prefix}[${idx}][ideal]`}
                value={entry.ideal}
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
  onDirtyChange,
}: TranslationsTabsFieldProps) {
  const t = useTranslations("translations");
  const [dirty, setDirty] = useState(false);

  const secondField = resolveSecondField(includeDescription, t("label_description"));

  function markDirty() {
    if (!dirty) {
      setDirty(true);
      onDirtyChange?.(true);
    }
  }

  function handleChange(
    locale: CatalogLocale,
    field: "name" | "description" | "ideal",
    value: string,
  ) {
    markDirty();
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

              {secondField && (
                <div className="space-y-2">
                  <Label htmlFor={`trans-${locale}-${secondField.key}`}>
                    {secondField.label}
                  </Label>
                  {secondField.multiline !== false ? (
                    <Textarea
                      id={`trans-${locale}-${secondField.key}`}
                      rows={3}
                      value={
                        secondField.key === "ideal"
                          ? (entry?.ideal ?? "")
                          : (entry?.description ?? "")
                      }
                      onChange={(e) =>
                        handleChange(locale, secondField.key, e.target.value)
                      }
                      disabled={disabled}
                      placeholder={`${secondField.label} (${LOCALE_LABELS[locale]})`}
                    />
                  ) : (
                    <Input
                      id={`trans-${locale}-${secondField.key}`}
                      value={
                        secondField.key === "ideal"
                          ? (entry?.ideal ?? "")
                          : (entry?.description ?? "")
                      }
                      onChange={(e) =>
                        handleChange(locale, secondField.key, e.target.value)
                      }
                      disabled={disabled}
                      placeholder={`${secondField.label} (${LOCALE_LABELS[locale]})`}
                    />
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        );
      })}

      {/* Hidden inputs for FormData serialization */}
      {fieldNamePrefix && (
        <>
          <input
            type="hidden"
            name="translations_dirty"
            value={dirty ? "1" : "0"}
          />
          <FormDataHiddenInputs
            prefix={fieldNamePrefix}
            translations={translations}
            secondField={secondField}
          />
        </>
      )}
    </Tabs>
  );
}
