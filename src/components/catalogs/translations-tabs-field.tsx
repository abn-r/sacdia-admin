"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATALOG_LOCALES } from "@/lib/types/catalog-translation";

type TranslationsTabsFieldProps = {
  values: Record<string, string>;
  onChange: (locale: string, value: string) => void;
  descriptionValues?: Record<string, string>;
  onDescriptionChange?: (locale: string, value: string) => void;
  includeDescription?: boolean;
  disabled?: boolean;
};

const localeLabels: Record<string, string> = {
  "pt-BR": "Português",
  en: "English",
  fr: "Français",
};

export function TranslationsTabsField({
  values,
  onChange,
  descriptionValues = {},
  onDescriptionChange,
  includeDescription = false,
  disabled,
}: TranslationsTabsFieldProps) {
  const t = useTranslations("translations");

  return (
    <Tabs defaultValue={CATALOG_LOCALES[0]} className="w-full">
      <TabsList>
        {CATALOG_LOCALES.map((locale) => (
          <TabsTrigger key={locale} value={locale}>
            {localeLabels[locale] ?? locale}
          </TabsTrigger>
        ))}
      </TabsList>
      {CATALOG_LOCALES.map((locale) => (
        <TabsContent key={locale} value={locale} className="space-y-2 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`translation_${locale}_name`}>{t("label_name")}</Label>
            <Input
              id={`translation_${locale}_name`}
              name={`translation_${locale}_name`}
              value={values[locale] ?? ""}
              onChange={(event) => onChange(locale, event.target.value)}
              disabled={disabled}
              placeholder={t("helper_optional")}
            />
          </div>
          {includeDescription ? (
            <div className="space-y-2">
              <Label htmlFor={`translation_${locale}_description`}>{t("label_description")}</Label>
              <Input
                id={`translation_${locale}_description`}
                name={`translation_${locale}_description`}
                value={descriptionValues[locale] ?? ""}
                onChange={(event) => onDescriptionChange?.(locale, event.target.value)}
                disabled={disabled}
                placeholder={t("helper_optional")}
              />
            </div>
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
