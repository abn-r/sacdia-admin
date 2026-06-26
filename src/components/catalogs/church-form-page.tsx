"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
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

export type DistrictOption = { value: number; label: string };

export type ChurchRecord = {
  church_id: number;
  name: string;
  district_id?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

type FormAction = (
  prev: GenericCatalogActionState,
  data: FormData,
) => Promise<GenericCatalogActionState>;

interface ChurchFormPageProps {
  mode: "create" | "edit";
  item?: ChurchRecord;
  districts: DistrictOption[];
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

const LIST_HREF = "/dashboard/catalogs/geography/churches";

export function ChurchFormPage({
  mode,
  item,
  districts,
  action,
}: ChurchFormPageProps) {
  const t = useTranslations("catalogs.pages.churches");
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

  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    item?.district_id ? String(item.district_id) : "",
  );

  const isEdit = mode === "edit";
  const pageTitle = isEdit ? t("editTitle") : t("createTitle");

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[{ label: t("backToList"), href: LIST_HREF }]}
      />

      <form action={formAction} className="space-y-8">
        {isEdit && item && (
          <input type="hidden" name="id" value={String(item.church_id)} />
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
            <Label htmlFor="district_id">
              {t("fieldDistrict")} <span className="text-destructive">*</span>
            </Label>
            <input
              type="hidden"
              name="district_id"
              value={selectedDistrictId}
            />
            <Select
              value={selectedDistrictId}
              onValueChange={setSelectedDistrictId}
            >
              <SelectTrigger id="district_id">
                <SelectValue placeholder={t("fieldDistrictPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
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
