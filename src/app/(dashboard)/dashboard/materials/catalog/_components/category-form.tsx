"use client";

import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { FormModalBody, FormModalFooter, useFormModal } from "@/components/shared/form-modal";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { createCategory, updateCategory } from "@/lib/api/materials";
import { useToastError } from "@/lib/feedback/toast-retry";
import { MATERIALS_CATALOG_HREF } from "@/lib/materials/routes";
import type { MaterialCategoryAdmin } from "@/lib/types/materials";

type Values = { slug: string; label: string; icon: string; sort_order: number; active: boolean };

/** Categories fall back to the Categorías tab, not the products tab. */
const LIST_HREF = `${MATERIALS_CATALOG_HREF}?tab=categories`;

export function CategoryForm({ categoria }: { categoria?: MaterialCategoryAdmin | null }) {
  const t = useTranslations("ops.materials.form.category");
  const tConfirm = useTranslations("shared.kit.confirm");
  const modal = useFormModal(LIST_HREF);
  const showError = useToastError();
  const isEdit = Boolean(categoria);

  const schema = useMemo(
    () =>
      z.object({
        slug: isEdit
          ? z.string()
          : z.string().trim().min(1, t("slugRequired")).max(100).regex(/^[a-z0-9-]+$/, t("slugFormat")),
        label: z.string().trim().min(1, t("nameRequired")).max(200),
        icon: z.string().max(100),
        sort_order: z.number().int().min(0),
        active: z.boolean(),
      }),
    [t, isEdit],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: {
      slug: categoria?.slug ?? "",
      label: categoria?.label ?? "",
      icon: categoria?.icon ?? "",
      sort_order: categoria?.sort_order ?? 0,
      active: categoria?.active ?? true,
    },
  });
  const { isSubmitting } = form.formState;

  async function onSubmit(values: Values) {
    try {
      if (categoria) {
        await updateCategory(categoria.id, {
          label: values.label,
          icon: values.icon || null,
          sort_order: values.sort_order,
          active: values.active,
        });
        toast.success(t("updated"));
      } else {
        await createCategory({
          slug: values.slug.trim(),
          label: values.label,
          icon: values.icon || null,
          sort_order: values.sort_order,
          active: values.active,
        });
        toast.success(t("created"));
      }
      modal.complete();
    } catch (err) {
      if (!isEdit && err instanceof ApiError && err.status === 409) {
        form.setError("slug", { message: t("slugTaken") });
        return;
      }
      showError({
        title: isEdit ? t("updateError") : t("createError"),
        ...(err instanceof ApiError && err.message ? { description: err.message } : {}),
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
        <FormModalBody>
          <div className="space-y-4">
            {isEdit ? (
              <div className="space-y-1.5">
                <Label>{t("slug")}</Label>
                <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">{categoria?.slug}</p>
                <p className="text-xs text-muted-foreground">{t("slugLocked")}</p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("slug")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("slugPlaceholder")} autoComplete="off" {...field} />
                    </FormControl>
                    <FormDescription>{t("slugHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("icon")} <span className="text-xs text-muted-foreground">({t("optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("iconPlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>{t("iconHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("order")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="tabular-nums"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit ? (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("active")}</FormLabel>
                      <FormDescription>{t("activeHint")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : null}
          </div>
        </FormModalBody>

        <FormModalFooter>
          <Button type="button" variant="outline" onClick={modal.close}>
            {tConfirm("cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? t("save") : t("create")}
          </Button>
        </FormModalFooter>
      </form>
    </Form>
  );
}
