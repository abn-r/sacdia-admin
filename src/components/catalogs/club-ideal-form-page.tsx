"use client";

/**
 * ClubIdealFormPage
 *
 * Full-page form for creating and editing club ideals.
 * This is a DEDICATED page — NOT a Dialog — because club-ideals exceeds the
 * ≤4 plain fields threshold (has: name, ideal, club_type_id relation,
 * ideal_order, active, and per-locale translations for name + ideal).
 *
 * DS Rule 2026-05-11: Dialog only for ≤4 plain fields, no relations/tabs.
 * Club-ideals has 6 fields + a relation + translations tabs → dedicated page.
 */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClubTypeOption = { value: number; label: string };

/** Minimal record shape returned by listAdminClubIdeals / getAdminClubIdeal. */
export type ClubIdealRecord = {
  club_ideal_id: number;
  name: string;
  ideal?: string | null;
  club_type_id?: number | null;
  ideal_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

type FormAction = (
  prev: GenericCatalogActionState,
  data: FormData,
) => Promise<GenericCatalogActionState>;

interface ClubIdealFormPageProps {
  mode: "create" | "edit";
  item?: ClubIdealRecord;
  clubTypes: ClubTypeOption[];
  action: FormAction;
}

// ─── SubmitButton ─────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const LIST_HREF = "/dashboard/catalogs/club-ideals";

export function ClubIdealFormPage({
  mode,
  item,
  clubTypes,
  action,
}: ClubIdealFormPageProps) {
  const t = useTranslations("catalogs.pages.clubIdeals");
  const tTrans = useTranslations("translations");

  const [actionState, formAction] = useActionState<
    GenericCatalogActionState,
    FormData
  >(action, {});

  // Controlled state for the active checkbox (needs hidden input for FormData)
  const [activeChecked, setActiveChecked] = useState<boolean>(
    item?.active !== false,
  );

  // Controlled translations state for non-es locales
  const [translations, setTranslations] = useState<CatalogTranslation[]>(
    Array.isArray(item?.translations) ? item.translations : [],
  );

  // Selected club_type_id (controlled to keep the Select value in sync)
  const [selectedClubTypeId, setSelectedClubTypeId] = useState<string>(
    item?.club_type_id ? String(item.club_type_id) : "",
  );

  const isEdit = mode === "edit";
  const pageTitle = isEdit ? t("editTitle") : t("createTitle");

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
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

      {/* ── Form ── */}
      <form action={formAction} className="space-y-8">
        {isEdit && item && (
          <input type="hidden" name="id" value={String(item.club_ideal_id)} />
        )}

        {/* Error banner */}
        {actionState.error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionState.error}
          </div>
        )}

        {/* ── Section 1: Spanish content (always visible) ── */}
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
            <Label htmlFor="ideal">
              {t("fieldIdeal")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ideal"
              name="ideal"
              rows={6}
              defaultValue={item?.ideal ?? ""}
              placeholder={t("fieldIdealPlaceholder")}
            />
          </div>
        </section>

        {/* ── Section 2: Relation + ordering ── */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {t("fieldClubType")} &amp; {t("fieldIdealOrder")}
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Club type */}
            <div className="space-y-2">
              <Label htmlFor="club_type_id">
                {t("fieldClubType")} <span className="text-destructive">*</span>
              </Label>
              {/* Hidden input carries the value for FormData */}
              <input type="hidden" name="club_type_id" value={selectedClubTypeId} />
              <Select
                value={selectedClubTypeId}
                onValueChange={setSelectedClubTypeId}
              >
                <SelectTrigger id="club_type_id">
                  <SelectValue placeholder={t("fieldClubTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {clubTypes.map((ct) => (
                    <SelectItem key={ct.value} value={String(ct.value)}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ideal order */}
            <div className="space-y-2">
              <Label htmlFor="ideal_order">
                {t("fieldIdealOrder")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ideal_order"
                name="ideal_order"
                type="number"
                min={1}
                required
                defaultValue={item?.ideal_order ?? ""}
                placeholder="1"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input type="hidden" name="active" value={activeChecked ? "on" : ""} />
            <Checkbox
              id="active"
              checked={activeChecked}
              onCheckedChange={(checked) => setActiveChecked(!!checked)}
            />
            <Label htmlFor="active">{t("fieldActive")}</Label>
          </div>
        </section>

        {/* ── Section 3: Translations for non-es locales ── */}
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
                Los campos en Español se editan en la sección de arriba.
              </p>
            }
            translations={translations}
            onTranslationsChange={setTranslations}
            includeDescription={{
              key: "ideal",
              label: tTrans("label_ideal"),
              multiline: true,
            }}
            fieldNamePrefix="translations"
          />
        </section>

        {/* ── Footer ── */}
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
