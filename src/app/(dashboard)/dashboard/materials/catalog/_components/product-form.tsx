"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { FormModalBody, FormModalFooter, FormModalSteps, useFormModal } from "@/components/shared/form-modal";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { createProduct, updateProduct } from "@/lib/api/materials";
import { useToastError } from "@/lib/feedback/toast-retry";
import { MATERIALS_CATALOG_HREF } from "@/lib/materials/routes";
import type { LocalFieldOption, MaterialCategory, MaterialProduct } from "@/lib/types/materials";
import { PriceInput } from "@/components/materials/price-input";

// Matches the club_types seed (1 Aventureros, 2 Conquistadores, 3 Guías Mayores).
// TODO: replace with an API call when the admin has a programs endpoint.
const CLUB_TYPE_IDS = [1, 2, 3] as const;

type Values = {
  sku: string;
  title: string;
  description: string;
  local_field_id: number | undefined;
  club_type_id: number | undefined;
  material_category_id: string;
  price_centavos: number;
  stock: number;
  active: boolean;
};

const CREATE_STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof Values>> = [
  ["sku", "title", "description"],
  ["local_field_id", "club_type_id", "material_category_id", "price_centavos", "stock"],
];

interface ProductFormProps {
  categories: MaterialCategory[];
  localFields: LocalFieldOption[];
  actorLocalFieldId: number | null;
  /** Edit mode when present. */
  product?: MaterialProduct | null;
}

export function ProductForm({ categories, localFields, actorLocalFieldId, product }: ProductFormProps) {
  const t = useTranslations("ops.materials.form.product");
  const tModal = useTranslations("shared.formModal");
  const tConfirm = useTranslations("shared.kit.confirm");
  const modal = useFormModal(MATERIALS_CATALOG_HREF);
  const showError = useToastError();
  const isEdit = Boolean(product);
  const needsLocalField = !isEdit && localFields.length > 0;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const schema = useMemo(
    () =>
      z.object({
        sku: isEdit ? z.string() : z.string().trim().min(1, t("skuRequired")).max(64),
        title: z.string().trim().min(1, t("nameRequired")).max(200),
        description: z.string().optional(),
        local_field_id: needsLocalField
          ? z.number({ message: t("localFieldRequired") }).int().min(1, t("localFieldRequired"))
          : z.number().optional(),
        club_type_id: isEdit
          ? z.number().optional()
          : z.number({ message: t("programRequired") }).int().min(1, t("programRequired")),
        material_category_id: isEdit ? z.string() : z.string().min(1, t("categoryRequired")),
        price_centavos: z.number().int().min(1, t("priceMin")),
        stock: z.number().int().min(0),
        active: z.boolean(),
      }),
    [t, isEdit, needsLocalField],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: {
      sku: product?.sku ?? "",
      title: product?.title ?? "",
      description: product?.description ?? "",
      local_field_id: actorLocalFieldId ?? undefined,
      club_type_id: undefined,
      material_category_id: "",
      price_centavos: product?.price_centavos ?? 0,
      stock: 0,
      active: product?.active ?? true,
    },
  });
  const { isSubmitting } = form.formState;

  const steps = isEdit ? [t("stepEdit")] : [t("stepBasics"), t("stepSale")];
  const lastStep = steps.length - 1;

  async function goNext() {
    const fields = CREATE_STEP_FIELDS[step];
    const valid = fields ? await form.trigger([...fields]) : true;
    if (!valid) return;
    setDirection("forward");
    setStep((s) => Math.min(s + 1, lastStep));
  }

  async function onSubmit(values: Values) {
    try {
      if (product) {
        await updateProduct(product.id, {
          title: values.title,
          description: values.description || undefined,
          price_centavos: values.price_centavos,
          active: values.active,
        });
        toast.success(t("updated"));
      } else {
        await createProduct(
          {
            sku: values.sku.trim(),
            title: values.title,
            description: values.description || undefined,
            club_type_id: values.club_type_id as number,
            material_category_id: values.material_category_id,
            price_centavos: values.price_centavos,
            stock: values.stock,
          },
          values.local_field_id !== undefined ? { localFieldId: values.local_field_id } : {},
        );
        toast.success(t("created"));
      }
      modal.complete();
    } catch (err) {
      if (!isEdit && err instanceof ApiError && err.status === 409) {
        setDirection("back");
        setStep(0);
        form.setError("sku", { message: t("skuTaken") });
        return;
      }
      showError({
        title: isEdit ? t("updateError") : t("createError"),
        ...(err instanceof ApiError && err.message ? { description: err.message } : {}),
      });
    }
  }

  const onStep = (index: number) => (isEdit ? true : step === index);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
        {!isEdit ? <FormModalSteps steps={steps} current={step} /> : null}
        <FormModalBody stepKey={step} direction={direction}>
          <div className="space-y-4">
            {isEdit ? (
              <div className="space-y-1.5">
                <Label>{t("sku")}</Label>
                <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">{product?.sku}</p>
                <p className="text-xs text-muted-foreground">{t("skuLocked")}</p>
              </div>
            ) : null}

            {onStep(0) && !isEdit ? (
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sku")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("skuPlaceholder")} autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {onStep(0) ? (
              <>
                <FormField
                  control={form.control}
                  name="title"
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("description")} <span className="text-xs text-muted-foreground">({t("optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            {!isEdit && step === 1 ? (
              <>
                {needsLocalField ? (
                  <FormField
                    control={form.control}
                    name="local_field_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("localField")}</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectLocalField")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {localFields.map((lf) => (
                              <SelectItem key={lf.local_field_id} value={String(lf.local_field_id)}>
                                {lf.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                <FormField
                  control={form.control}
                  name="club_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("program")}</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectProgram")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLUB_TYPE_IDS.map((id) => (
                            <SelectItem key={id} value={String(id)}>
                              {t(`programs.${id}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="material_category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("category")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectCategory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            {isEdit || step === 1 ? (
              <Controller
                control={form.control}
                name="price_centavos"
                render={({ field, fieldState }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="materials-product-price">{t("price")}</Label>
                    <PriceInput
                      id="materials-product-price"
                      valueCentavos={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                    {fieldState.error ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
                  </div>
                )}
              />
            ) : null}

            {!isEdit && step === 1 ? (
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("initialStock")} <span className="text-xs text-muted-foreground">({t("optional")})</span>
                    </FormLabel>
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
            ) : null}

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

        <FormModalFooter step={step} total={steps.length}>
          {step === 0 ? (
            <Button type="button" variant="outline" onClick={modal.close}>
              {tConfirm("cancel")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setDirection("back");
                setStep((s) => Math.max(s - 1, 0));
              }}
            >
              {tModal("back")}
            </Button>
          )}
          {step < lastStep ? (
            <Button type="button" onClick={goNext}>
              {tModal("continue")}
            </Button>
          ) : (
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? t("save") : t("create")}
            </Button>
          )}
        </FormModalFooter>
      </form>
    </Form>
  );
}
