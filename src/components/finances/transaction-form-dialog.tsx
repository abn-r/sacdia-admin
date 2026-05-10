"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  getFinanceCategories,
  createFinance,
  updateFinance,
  type Finance,
  type FinanceCategory,
  type CreateFinancePayload,
} from "@/lib/api/finances";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  year: z.coerce
    .number()
    .min(2000)
    .max(2100),
  month: z.coerce
    .number()
    .min(1)
    .max(12),
  amount: z.coerce
    .number()
    .positive(),
  description: z.string().optional(),
  finance_category_id: z.coerce
    .number()
    .min(1),
  finance_date: z.string().min(1),
  club_type_id: z.coerce.number().optional(),
  club_section_id: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  name: string;
  club_type?: { name?: string } | null;
};

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sections: ClubSection[];
  /** If provided, dialog is in edit mode */
  finance?: Finance | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionFormDialog({
  open,
  onOpenChange,
  clubId,
  sections,
  finance,
  onSuccess,
}: TransactionFormDialogProps) {
  const isEdit = !!finance;
  const t = useTranslations("finances");
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories on open
  useEffect(() => {
    if (!open) return;
    setLoadingCategories(true);
    getFinanceCategories()
      .then(setCategories)
      .catch(() => toast.error(t("toasts.categories_load_failed")))
      .finally(() => setLoadingCategories(false));
  }, [open, t]);

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      year: currentYear,
      month: new Date().getMonth() + 1,
      amount: undefined,
      description: "",
      finance_category_id: undefined,
      finance_date: today,
      club_type_id: undefined,
      club_section_id: undefined,
    },
  });

  // Reset when dialog opens/finance changes
  useEffect(() => {
    if (open) {
      form.reset({
        year: finance?.year ?? currentYear,
        month: finance?.month ?? new Date().getMonth() + 1,
        amount: finance ? finance.amount / 100 : undefined,
        description: finance?.description ?? "",
        finance_category_id: finance?.finance_category_id ?? undefined,
        finance_date: finance?.finance_date
          ? finance.finance_date.split("T")[0]
          : today,
        club_type_id: finance?.club_type_id ?? sections[0]?.club_type_id,
        club_section_id: finance?.club_section_id ?? sections[0]?.club_section_id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, finance]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && finance) {
        await updateFinance(finance.finance_id, {
          amount: Math.round(values.amount * 100),
          description: values.description,
          finance_category_id: values.finance_category_id,
          finance_date: values.finance_date,
        });
        toast.success(t("toasts.transaction_updated"));
      } else {
        if (!values.club_section_id || !values.club_type_id) {
          toast.error(t("validation.section_required"));
          return;
        }
        const payload: CreateFinancePayload = {
          year: values.year,
          month: values.month,
          amount: Math.round(values.amount * 100),
          description: values.description,
          club_type_id: values.club_type_id,
          finance_category_id: values.finance_category_id,
          finance_date: values.finance_date,
          club_section_id: values.club_section_id,
        };
        await createFinance(clubId, payload);
        toast.success(t("toasts.transaction_created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? t("errors.update_transaction_failed")
            : t("errors.create_transaction_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("form.titleEdit") : t("form.titleNew")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("form.descriptionEdit") : t("form.descriptionNew")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Categoría */}
            <FormField
              control={form.control}
              name="finance_category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.categoryLabel")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    disabled={loadingCategories}
                  >
                    <FormControl>
                      <SelectTrigger aria-required="true">
                        <SelectValue
                          placeholder={
                            loadingCategories
                              ? t("form.categoryLoading")
                              : t("form.categoryPlaceholder")
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.finance_category_id}
                          value={cat.finance_category_id.toString()}
                        >
                          {cat.name} —{" "}
                          {cat.type === 0
                            ? t("categoryType.income")
                            : t("categoryType.expense")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha */}
            <FormField
              control={form.control}
              name="finance_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.dateLabel")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monto */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.amountLabel")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Año y Mes */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.yearLabel")}{" "}
                      <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger aria-required="true">
                          <SelectValue placeholder={t("form.yearPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
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
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.monthLabel")}{" "}
                      <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger aria-required="true">
                          <SelectValue placeholder={t("form.monthPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_KEYS.map((key, index) => (
                          <SelectItem key={key} value={String(index + 1)}>
                            {t(`months.${key}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sección del club (solo al crear) */}
            {!isEdit && (
              <FormField
                control={form.control}
                name="club_section_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.sectionLabel")}{" "}
                      <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => {
                        const sectionId = Number(v);
                        field.onChange(sectionId);
                        const section = sections.find(
                          (s) => s.club_section_id === sectionId,
                        );
                        if (section) {
                          form.setValue("club_type_id", section.club_type_id);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger aria-required="true">
                          <SelectValue placeholder={t("form.sectionPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.length > 0 ? (
                          sections.map((s) => (
                            <SelectItem
                              key={s.club_section_id}
                              value={s.club_section_id.toString()}
                            >
                              {s.name}
                              {s.club_type?.name ? ` (${s.club_type.name})` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>
                            {t("form.sectionEmpty")}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("form.descriptionPlaceholder")}
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("form.cancelButton")}
              </Button>
              <Button type="submit" disabled={isSubmitting || loadingCategories}>
                {isSubmitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                {isEdit ? t("form.saveButton") : t("form.createButton")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
