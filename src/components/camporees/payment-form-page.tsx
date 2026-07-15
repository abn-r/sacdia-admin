"use client";

/**
 * PaymentFormPage
 *
 * Full-page form for creating and editing camporee payments.
 * This is a DEDICATED page — NOT a Dialog — because camporee payments have
 * 6 form fields PLUS a voucher file upload section.
 *
 * DS Rule 2026-05-11: Dialog only for ≤4 plain fields, no relations/uploads/tabs.
 * Camporee payment has 6 fields + voucher upload → dedicated page is mandatory.
 *
 * Voucher upload notes:
 * - In CREATE mode: save payment first, then upload (backend doesn't accept
 *   voucher in POST body). If upload fails the payment still exists; user
 *   stays on the (now) edit page where they can retry.
 * - In EDIT mode: save fields first, then upload if a new file was selected.
 * - Voucher remove uses AlertDialog confirmation per DS rule.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  createPayment,
  removeCamporeePaymentVoucher,
  updatePayment,
  uploadCamporeePaymentVoucher,
} from "@/lib/api/camporees";
import type {
  CamporeeMember,
  CamporeePayment,
  PaymentType,
} from "@/lib/api/camporees";
import { ApiError } from "@/lib/api/client";
import { useFormatDate } from "@/lib/format-locale";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VOUCHER_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
const ALLOWED_ACCEPT = ALLOWED_MIME.join(",");

const PAYMENT_TYPES: PaymentType[] = ["inscription", "materials", "other"];

// ─── Schema ───────────────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"camporees.validation">>) {
  return z.object({
    member_id: z.string().min(1, t("member_required")),
    amount: z.coerce.number().positive(t("amount_positive")),
    payment_type: z.enum(["inscription", "materials", "other"] as const),
    reference: z.string().optional(),
    notes: z.string().optional(),
    paid_at: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PaymentFormPageProps {
  mode: "create" | "edit";
  camporeeId: number;
  initialMembers: CamporeeMember[];
  payment?: CamporeePayment;
  returnUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInputValue(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentFormPage({
  mode,
  camporeeId,
  initialMembers,
  payment,
  returnUrl,
}: PaymentFormPageProps) {
  const t = useTranslations("camporees");
  const tVal = useTranslations("camporees.validation");
  const tV = useTranslations("camporees.paymentVoucher");
  const formatDateLocale = useFormatDate();
  const router = useRouter();

  const isEditing = mode === "edit" && payment != null;
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      member_id: payment?.member_id ?? "",
      amount: payment?.amount ?? undefined,
      payment_type: (payment?.payment_type ?? "inscription") as PaymentType,
      reference: payment?.reference ?? "",
      notes: payment?.notes ?? "",
      paid_at: toDateInputValue(payment?.paid_at),
    },
  });

  // ─── Voucher state ────────────────────────────────────────────────────────
  // currentVoucher tracks the URL persisted on the server (mode=edit).
  // pendingFile tracks a newly selected File not yet uploaded.

  const [currentVoucherUrl, setCurrentVoucherUrl] = useState<string | null>(
    payment?.voucher_url ?? null,
  );
  const [currentVoucherUploadedAt, setCurrentVoucherUploadedAt] = useState<
    string | null
  >(payment?.voucher_uploaded_at ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate / cleanup object URL for image previews
  useEffect(() => {
    if (pendingFile && pendingFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(pendingFile);
      setPendingPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPendingPreviewUrl(null);
    return undefined;
  }, [pendingFile]);

  function validateFile(file: File): string | null {
    if (file.size > MAX_VOUCHER_BYTES) {
      return tV("errorTooLarge");
    }
    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      return tV("errorBadMime");
    }
    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPendingFile(null);
      setFileError(null);
      return;
    }
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileError(null);
    setPendingFile(file);
  }

  function clearPendingFile() {
    setPendingFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveVoucher() {
    if (!payment?.camporee_payment_id) return;
    setIsRemoving(true);
    try {
      const updated = await removeCamporeePaymentVoucher(
        camporeeId,
        payment.camporee_payment_id,
      );
      setCurrentVoucherUrl(updated.voucher_url ?? null);
      setCurrentVoucherUploadedAt(updated.voucher_uploaded_at ?? null);
      toast.success(tV("toastRemoved"));
    } catch (err: unknown) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : tV("errorRemoveFailed");
      toast.error(message);
    } finally {
      setIsRemoving(false);
      setRemoveDialogOpen(false);
    }
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const payloadBase = {
        amount: values.amount,
        payment_type: values.payment_type,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
        paid_at: values.paid_at || undefined,
      };

      let resolvedPaymentUuid: string | null =
        payment?.camporee_payment_id ?? null;

      if (isEditing && payment) {
        await updatePayment(payment.camporee_payment_id, payloadBase);
      } else {
        const created = (await createPayment(
          camporeeId,
          values.member_id,
          payloadBase,
        )) as Partial<CamporeePayment> | { data: Partial<CamporeePayment> } | null;

        // Backend may return the row directly, or wrapped in { data: ... }
        if (created && typeof created === "object") {
          const candidate =
            "camporee_payment_id" in created
              ? (created as Partial<CamporeePayment>)
              : ((created as { data?: Partial<CamporeePayment> }).data ?? null);
          if (candidate && typeof candidate.camporee_payment_id === "string") {
            resolvedPaymentUuid = candidate.camporee_payment_id;
          }
        }
      }

      // Upload voucher second (if user selected one)
      if (pendingFile) {
        if (!resolvedPaymentUuid) {
          // Cannot upload without a UUID. Surface a non-blocking error: the
          // payment row was saved; the user will see the (now editable) row
          // in the list and can attach the voucher from there.
          toast.error(tV("errorUploadFailed"));
        } else {
          try {
            const updated = await uploadCamporeePaymentVoucher(
              camporeeId,
              resolvedPaymentUuid,
              pendingFile,
            );
            setCurrentVoucherUrl(updated.voucher_url ?? null);
            setCurrentVoucherUploadedAt(updated.voucher_uploaded_at ?? null);
            clearPendingFile();
            toast.success(tV("toastUploaded"));
          } catch (err: unknown) {
            const message =
              err instanceof ApiError || err instanceof Error
                ? err.message
                : tV("errorUploadFailed");
            toast.error(message);
            // Stop here — keep form state so user can retry.
            return;
          }
        }
      }

      toast.success(
        isEditing ? t("toasts.payment_updated") : t("toasts.payment_created"),
      );
      router.push(returnUrl);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("errors.save_payment");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = isEditing
    ? t("paymentDialog.titleEdit")
    : t("paymentDialog.titleCreate");

  const submitLabel = isSubmitting
    ? isEditing
      ? t("paymentDialog.saving")
      : t("paymentDialog.registering")
    : isEditing
      ? t("paymentDialog.saveChanges")
      : t("paymentDialog.registerPayment");

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle}>
        <Button variant="outline" size="sm" asChild>
          <Link href={returnUrl}>
            <ArrowLeft className="size-4" />
            {t("paymentDialog.cancel")}
          </Link>
        </Button>
      </PageHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="mx-auto w-full max-w-2xl space-y-6"
        >
          {/* ── Datos del pago ─────────────────────────────────────────── */}
          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-xs space-y-4">
            {/* Member */}
            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("paymentDialog.labelMember")}{" "}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    {isEditing ? (
                      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        {payment?.member_name ?? payment?.member_id}
                      </p>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-required="true">
                          <SelectValue
                            placeholder={t("paymentDialog.placeholderMember")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {initialMembers.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.name ?? m.user_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("paymentDialog.labelAmount")}{" "}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      aria-required="true"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment type */}
            <FormField
              control={form.control}
              name="payment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("paymentDialog.labelPaymentType")}{" "}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(val) => field.onChange(val as PaymentType)}
                    >
                      <SelectTrigger aria-required="true">
                        <SelectValue
                          placeholder={t("paymentDialog.placeholderPaymentType")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((key) => {
                          const typeLabels: Record<PaymentType, string> = {
                            inscription: t("paymentDialog.paymentTypeInscription"),
                            materials: t("paymentDialog.paymentTypeMaterials"),
                            other: t("paymentDialog.paymentTypeOther"),
                          };
                          return (
                            <SelectItem key={key} value={key}>
                              {typeLabels[key]}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentDialog.labelReference")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("paymentDialog.placeholderReference")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Paid at */}
            <FormField
              control={form.control}
              name="paid_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentDialog.labelPaidAt")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentDialog.labelNotes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("paymentDialog.placeholderNotes")}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* ── Voucher ────────────────────────────────────────────────── */}
          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  {tV("sectionTitle")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tV("help")}
                </p>
              </div>
            </div>

            {/* Existing voucher (edit mode only) */}
            {currentVoucherUrl ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
                {isPdfUrl(currentVoucherUrl) ? (
                  <a
                    href={currentVoucherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="size-4" />
                    {tV("openPdf")}
                  </a>
                ) : (
                  <a
                    href={currentVoucherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    aria-label={tV("openInNewTab")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentVoucherUrl}
                      alt={tV("sectionTitle")}
                      className="max-h-48 w-auto rounded-md object-cover"
                    />
                  </a>
                )}

                {currentVoucherUploadedAt && (
                  <p className="text-xs text-muted-foreground">
                    {tV("uploadedAt", {
                      date: formatDateLocale(currentVoucherUploadedAt, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    })}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isRemoving}
                  >
                    <Upload className="size-4" />
                    {tV("replace")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRemoveDialogOpen(true)}
                    disabled={isSubmitting || isRemoving}
                  >
                    {isRemoving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    {tV("remove")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tV("empty")}</p>
            )}

            {/* Pending file preview (selected, not yet uploaded) */}
            {pendingFile && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
                  {pendingFile.type.startsWith("image/") ? (
                    <ImageIcon className="size-3.5" />
                  ) : (
                    <FileText className="size-3.5" />
                  )}
                  {tV("selected")}
                </div>
                {pendingPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingPreviewUrl}
                    alt={pendingFile.name}
                    className="max-h-40 w-auto rounded-md object-cover"
                  />
                ) : (
                  <div className="text-sm">
                    <p className="font-medium">{pendingFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(pendingFile.size)}
                    </p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearPendingFile}
                  disabled={isSubmitting}
                >
                  <Trash2 className="size-3.5" />
                  {tV("clearSelection")}
                </Button>
              </div>
            )}

            {/* File input (always rendered; visible when no current voucher) */}
            <div className={currentVoucherUrl ? "hidden" : "block"}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Upload className="size-4" />
                {pendingFile ? tV("replace") : tV("upload")}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />

            {fileError && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {fileError}
              </p>
            )}
          </section>

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" type="button" asChild disabled={isSubmitting}>
              <Link href={returnUrl}>{t("paymentDialog.cancel")}</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>

      {/* Voucher remove confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tV("removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tV("removeConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              {tV("removeConfirmCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveVoucher();
              }}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving && <Loader2 className="size-4 animate-spin" />}
              {tV("removeConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
