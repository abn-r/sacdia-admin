"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { FormModalBody, FormModalFooter, useFormModal } from "@/components/shared/form-modal";
import { FinanceEvidenceField } from "@/components/finances/finance-evidence-field";
import {
  POST_CLOSING_NOTE_MAX,
  createFinance,
  getFinanceCategories,
  updateFinance,
  uploadFinanceEvidence,
  type CreateFinancePayload,
  type Finance,
  type FinanceCategory,
} from "@/lib/api/finances";
import { financeAmountToDisplay, financeDisplayToApiAmount } from "@/lib/finances/amount";
import { getClosedPeriodErrorKey, normalizePostClosingNote } from "@/lib/finances/errors";
import { formatFinanceSectionOption, type FinanceClubSection } from "@/lib/finances/club-sections";
import { notifyFinancesChanged } from "@/lib/finances/events";
import { FINANCE_MONTH_KEYS, deriveYearMonth } from "@/lib/finances/period";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  month: z.coerce.number().min(1).max(12),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  finance_category_id: z.coerce.number().min(1),
  finance_date: z.string().min(1),
  post_closing_note: z.string().optional(),
  club_section_id: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Kind = "income" | "expense";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

export interface TransactionFormProps {
  clubId: number;
  sections: FinanceClubSection[];
  /** Section preselected when creating. */
  defaultSectionId?: number | null;
  /** If provided the form edits this movement. */
  finance?: Finance | null;
  /** Where Cancel / save return to. */
  listHref: string;
}

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function TransactionForm({
  clubId,
  sections,
  defaultSectionId,
  finance,
  listHref,
}: TransactionFormProps) {
  const isEdit = !!finance;
  const t = useTranslations("finances");
  const tc = useTranslations("ops.club.finances.form");
  const { close, complete } = useFormModal(listHref);

  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<File[]>([]);
  const [noteRevealed, setNoteRevealed] = useState(false);
  const [changeMonth, setChangeMonth] = useState(false);
  const [kind, setKind] = useState<Kind>(
    finance?.finances_categories?.type === 0 ? "income" : "expense",
  );
  const noteRequired = isEdit ? finance?.period_closed === true || noteRevealed : noteRevealed;

  const initialDate = finance?.finance_date ? finance.finance_date.split("T")[0] : todayLocal();
  const initialPeriod = deriveYearMonth(initialDate ?? "") ?? {
    year: currentYear,
    month: new Date().getMonth() + 1,
  };
  const initialSection =
    finance?.club_section_id ?? defaultSectionId ?? sections[0]?.club_section_id ?? undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      year: finance?.year ?? initialPeriod.year,
      month: finance?.month ?? initialPeriod.month,
      amount: finance ? financeAmountToDisplay(finance.amount) : undefined,
      description: finance?.description ?? "",
      finance_category_id: finance?.finance_category_id ?? undefined,
      finance_date: initialDate,
      post_closing_note: "",
      club_section_id: initialSection,
    },
  });

  useEffect(() => {
    let cancelled = false;
    getFinanceCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("toasts.categories_load_failed"));
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => (kind === "income" ? c.type === 0 : c.type === 1)),
    [categories, kind],
  );

  const watchedYear = form.watch("year");
  const watchedMonth = form.watch("month");
  const monthKey = FINANCE_MONTH_KEYS[(Number(watchedMonth) || 1) - 1];
  const periodLabel = monthKey ? `${t(`months.${monthKey}`)} ${watchedYear}` : String(watchedYear);

  function chooseKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    const selected = categories.find(
      (c) => c.finance_category_id === form.getValues("finance_category_id"),
    );
    if (selected && (next === "income" ? selected.type !== 0 : selected.type !== 1)) {
      form.setValue("finance_category_id", undefined as unknown as number);
    }
  }

  async function uploadPendingEvidences(financeId: number) {
    for (const file of pendingEvidenceFiles) {
      await uploadFinanceEvidence(financeId, file);
    }
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const rawNote = (values.post_closing_note ?? "").trim();
    const note = normalizePostClosingNote(values.post_closing_note);
    if ((noteRequired || rawNote.length > 0) && !note) {
      form.setError("post_closing_note", { message: t("validation.note_invalid") });
      return;
    }
    setIsSubmitting(true);
    try {
      if (isEdit && finance) {
        await updateFinance(finance.finance_id, {
          amount: financeDisplayToApiAmount(values.amount),
          description: values.description,
          finance_category_id: values.finance_category_id,
          finance_date: values.finance_date,
          ...(note ? { post_closing_note: note } : {}),
        });
        if (pendingEvidenceFiles.length > 0) await uploadPendingEvidences(finance.finance_id);
        toast.success(t("toasts.transaction_updated"));
      } else {
        const section = sections.find((s) => s.club_section_id === values.club_section_id);
        if (!values.club_section_id || !section) {
          toast.error(t("validation.section_required"));
          return;
        }
        const payload: CreateFinancePayload = {
          year: values.year,
          month: values.month,
          amount: financeDisplayToApiAmount(values.amount),
          description: values.description,
          club_type_id: section.club_type_id,
          finance_category_id: values.finance_category_id,
          finance_date: values.finance_date,
          club_section_id: values.club_section_id,
          ...(note ? { post_closing_note: note } : {}),
        };
        const created = await createFinance(clubId, payload);
        if (pendingEvidenceFiles.length > 0) await uploadPendingEvidences(created.finance_id);
        toast.success(t("toasts.transaction_created"));
      }
      notifyFinancesChanged();
      complete();
    } catch (err: unknown) {
      const closedKey = getClosedPeriodErrorKey(err);
      if (closedKey === "closed_note_required") {
        setNoteRevealed(true);
        form.setError("post_closing_note", { message: t("validation.note_invalid") });
      }
      toast.error(
        closedKey
          ? t(`errors.${closedKey}`)
          : err instanceof Error
            ? err.message
            : pendingEvidenceFiles.length > 0
              ? t("errors.upload_evidence_failed")
              : isEdit
                ? t("errors.update_transaction_failed")
                : t("errors.create_transaction_failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const required = (
    <span aria-hidden="true" className="ml-0.5 text-destructive">
      *
    </span>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <FormModalBody className="space-y-4">
          <div
            role="radiogroup"
            aria-label={tc("kindLabel")}
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {(["income", "expense"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={kind === value}
                onClick={() => chooseKind(value)}
                className={cn(
                  "h-8 rounded-md font-medium text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  kind === value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "income" ? tc("income") : tc("expense")}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.amountLabel")} {required}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      aria-required="true"
                      className="tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="finance_category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.categoryLabel")} {required}
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
                            loadingCategories ? t("form.categoryLoading") : t("form.categoryPlaceholder")
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visibleCategories.map((cat) => (
                        <SelectItem key={cat.finance_category_id} value={cat.finance_category_id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {kind === "income" ? tc("categoryHintIncome") : tc("categoryHintExpense")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="finance_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.dateLabel")} {required}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      aria-required="true"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        // Year and Month follow the date unless the month was changed by hand.
                        if (!changeMonth && !isEdit) {
                          const derived = deriveYearMonth(event.target.value);
                          if (derived) {
                            form.setValue("year", derived.year);
                            form.setValue("month", derived.month);
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {tc("countsIn", { period: periodLabel })}
                    {!isEdit && !changeMonth ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => setChangeMonth(true)}
                          className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {tc("changeMonth")}
                        </button>
                      </>
                    ) : null}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit ? (
              <FormField
                control={form.control}
                name="club_section_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.sectionLabel")} {required}
                    </FormLabel>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={sections.length <= 1}
                    >
                      <FormControl>
                        <SelectTrigger aria-required="true">
                          <SelectValue placeholder={t("form.sectionPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.length > 0 ? (
                          sections.map((s) => (
                            <SelectItem key={s.club_section_id} value={s.club_section_id.toString()}>
                              {formatFinanceSectionOption(s)}
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
            ) : null}
          </div>

          {changeMonth && !isEdit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.yearLabel")} {required}
                    </FormLabel>
                    <Select value={field.value?.toString() ?? ""} onValueChange={(v) => field.onChange(Number(v))}>
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
                      {t("form.monthLabel")} {required}
                    </FormLabel>
                    <Select value={field.value?.toString() ?? ""} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger aria-required="true">
                          <SelectValue placeholder={t("form.monthPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FINANCE_MONTH_KEYS.map((key, index) => (
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
          ) : null}

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

          {noteRequired ? (
            <FormField
              control={form.control}
              name="post_closing_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.noteLabel")} {required}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("form.notePlaceholder")}
                      className="min-h-[80px] resize-none"
                      maxLength={POST_CLOSING_NOTE_MAX}
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{t("form.noteHelper")}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FinanceEvidenceField
            existingEvidences={finance?.evidences ?? []}
            pendingFiles={pendingEvidenceFiles}
            onPendingFilesChange={setPendingEvidenceFiles}
            disabled={isSubmitting}
          />
        </FormModalBody>

        <FormModalFooter>
          <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
            {t("form.cancelButton")}
          </Button>
          <Button loading={isSubmitting} type="submit" disabled={loadingCategories}>
            {isEdit ? t("form.saveButton") : t("form.createButton")}
          </Button>
        </FormModalFooter>
      </form>
    </Form>
  );
}
