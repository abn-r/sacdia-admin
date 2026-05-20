"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TranslationsTabsField } from "@/components/forms/translations-tabs-field";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";
import type { GenericCatalogActionState } from "@/lib/generic-catalogs-i18n/actions";

export type CountryOption = { value: number; label: string };

export type UnionRecord = {
  union_id: number;
  name: string;
  abbreviation?: string | null;
  country_id?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

type FormAction = (
  prev: GenericCatalogActionState,
  data: FormData,
) => Promise<GenericCatalogActionState>;

interface UnionFormPageProps {
  mode: "create" | "edit";
  item?: UnionRecord;
  countries: CountryOption[];
  action: FormAction;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

const LIST_HREF = "/dashboard/catalogs/geography/unions";

export function UnionFormPage({
  mode,
  item,
  countries,
  action,
}: UnionFormPageProps) {
  const t = useTranslations("catalogs.pages.unions");
  const tTrans = useTranslations("translations");

  const [actionState, formAction] = useActionState<
    GenericCatalogActionState,
    FormData
  >(action, {});

  const [activeChecked, setActiveChecked] = useState<boolean>(
    item?.active !== false,
  );

  const [translations, setTranslations] = useState<CatalogTranslation[]>(
    Array.isArray(item?.translations) ? item.translations : [],
  );

  const [selectedCountryId, setSelectedCountryId] = useState<string>(
    item?.country_id ? String(item.country_id) : "",
  );

  const isEdit = mode === "edit";
  const pageTitle = isEdit ? t("editTitle") : t("createTitle");

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            href={LIST_HREF}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToList")}
          </Link>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight">{pageTitle}</h1>
      </div>

      <form action={formAction} className="space-y-8">
        {isEdit && item && (
          <input type="hidden" name="id" value={String(item.union_id)} />
        )}

        {actionState.error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionState.error}
          </div>
        )}

        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Español
          </h2>

          <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("fieldName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={50}
                defaultValue={item?.name ?? ""}
                placeholder={t("fieldNamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abbreviation">
                {t("fieldAbbreviation")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="abbreviation"
                name="abbreviation"
                required
                maxLength={8}
                defaultValue={item?.abbreviation ?? ""}
                placeholder={t("fieldAbbreviationPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country_id">
              {t("fieldCountry")} <span className="text-destructive">*</span>
            </Label>
            <input
              type="hidden"
              name="country_id"
              value={selectedCountryId}
            />
            <Select
              value={selectedCountryId}
              onValueChange={setSelectedCountryId}
            >
              <SelectTrigger id="country_id">
                <SelectValue placeholder={t("fieldCountryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.value} value={String(c.value)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="hidden"
              name="active"
              value={activeChecked ? "on" : ""}
            />
            <Checkbox
              id="active"
              checked={activeChecked}
              onCheckedChange={(checked) => setActiveChecked(!!checked)}
            />
            <Label htmlFor="active">{t("fieldActive")}</Label>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Traducciones
          </h2>
          <p className="text-sm text-muted-foreground">
            {tTrans("helper_optional")}
          </p>
          <TranslationsTabsField
            esContent={
              <p className="text-sm text-muted-foreground">
                El nombre en Español se edita en la sección de arriba.
              </p>
            }
            translations={translations}
            onTranslationsChange={setTranslations}
            includeDescription={false}
            fieldNamePrefix="translations"
          />
        </section>

        <div className="flex items-center justify-between gap-4 pt-2">
          <Button variant="outline" asChild>
            <Link href={LIST_HREF}>{t("buttonCancel")}</Link>
          </Button>
          <SubmitButton label={isEdit ? t("buttonSave") : t("buttonCreate")} />
        </div>
      </form>
    </div>
  );
}
