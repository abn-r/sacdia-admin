"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  registerCamporeeMember,
  registerUnionCamporeeMember,
  type CamporeeRegisterMemberPayload,
} from "@/lib/api/camporees";
import {
  getMemberInsuranceFromClient,
  type InsuranceRecord,
} from "@/lib/api/insurance";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { MemberCombobox } from "@/components/units/member-combobox";
import { formatCalendarDate } from "@/lib/format-locale";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  user_id: z.string().uuid("Selecciona un miembro válido"),
  camporee_type: z.enum(["local", "union"]),
  club_name: z.string().optional(),
  insurance_id: z.coerce.number().int().positive().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  return formatCalendarDate(dateStr, "es", "numeric");
}

function isEligibleCamporeeInsurance(
  insurance: InsuranceRecord | null,
): insurance is InsuranceRecord {
  return Boolean(
    insurance?.active &&
      (insurance.insurance_type === "CAMPOREE" ||
        insurance.insurance_type === "GENERAL_ACTIVITIES"),
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface RegisterMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporeeId: number;
  isUnionCamporee?: boolean;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterMemberDialog({
  open,
  onOpenChange,
  camporeeId,
  isUnionCamporee = false,
  onSuccess,
}: RegisterMemberDialogProps) {
  const t = useTranslations("camporees");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insuranceError, setInsuranceError] = useState<string | null>(null);

  // Club → Member cascade state (not a form field — only used to scope the member list)
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  // Insurance auto-fill state
  const [selectedInsurance, setSelectedInsurance] =
    useState<InsuranceRecord | null>(null);
  const [insuranceFetching, setInsuranceFetching] = useState(false);
  const [noInsuranceWarning, setNoInsuranceWarning] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      user_id: "",
      camporee_type: isUnionCamporee ? "union" : "local",
      club_name: "",
      insurance_id: "",
    },
  });

  const camporeeType = form.watch("camporee_type");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({
        user_id: "",
        camporee_type: isUnionCamporee ? "union" : "local",
        club_name: "",
        insurance_id: "",
      });
      setInsuranceError(null);
      setSelectedClubId(null);
      setSelectedInsurance(null);
      setInsuranceFetching(false);
      setNoInsuranceWarning(false);
    }
    onOpenChange(nextOpen);
  }

  async function handleMemberChange(userId: string) {
    form.setValue("user_id", userId, { shouldValidate: true });
    // Clear previous insurance state
    setSelectedInsurance(null);
    setNoInsuranceWarning(false);
    form.setValue("insurance_id", "");

    if (!userId) return;

    // Auto-fetch insurance for the selected member
    setInsuranceFetching(true);
    try {
      const insurance = await getMemberInsuranceFromClient(userId);
      if (isEligibleCamporeeInsurance(insurance)) {
        setSelectedInsurance(insurance);
        form.setValue("insurance_id", insurance.insurance_id);
        setNoInsuranceWarning(false);
      } else {
        setSelectedInsurance(null);
        setNoInsuranceWarning(true);
      }
    } catch {
      // Non-fatal: show no-insurance warning rather than crashing the form
      setSelectedInsurance(null);
      setNoInsuranceWarning(true);
    } finally {
      setInsuranceFetching(false);
    }
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setInsuranceError(null);
    const insuranceId = Number(values.insurance_id);

    if (
      !selectedInsurance ||
      !isEligibleCamporeeInsurance(selectedInsurance) ||
      !Number.isInteger(insuranceId) ||
      insuranceId <= 0
    ) {
      setNoInsuranceWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CamporeeRegisterMemberPayload = {
        user_id: values.user_id,
        camporee_type: isUnionCamporee ? "union" : values.camporee_type,
        club_name: values.club_name || undefined,
        insurance_id: insuranceId,
      };
      if (isUnionCamporee) {
        await registerUnionCamporeeMember(camporeeId, payload);
      } else {
        await registerCamporeeMember(camporeeId, payload);
      }
      toast.success(t("toasts.member_registered"));
      onSuccess();
      handleOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.register_member");

      if (
        message.toLowerCase().includes("seguro") ||
        message.toLowerCase().includes("insurance") ||
        message.toLowerCase().includes("póliza")
      ) {
        setInsuranceError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled = isSubmitting || insuranceFetching || noInsuranceWarning;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("registerMemberDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("registerMemberDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Insurance error callout (submit-time) */}
            {insuranceError && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                <p className="font-medium">
                  {t("registerMemberDialog.insuranceErrorTitle")}
                </p>
                <p className="mt-0.5">{insuranceError}</p>
              </div>
            )}

            {/* Club selector (cascade filter — not a form field) */}
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">
                {t("registerMemberDialog.labelClub")}{" "}
                <span aria-hidden="true" className="text-destructive">*</span>
              </p>
              <ClubSelect
                value={selectedClubId}
                onChange={(clubId) => {
                  setSelectedClubId(clubId);
                  // Reset member when club changes
                  form.setValue("user_id", "");
                  setSelectedInsurance(null);
                  setNoInsuranceWarning(false);
                  form.setValue("insurance_id", "");
                }}
              />
            </div>

            {/* Member selector (scoped to club) */}
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("registerMemberDialog.labelMember")}{" "}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    {selectedClubId ? (
                      <MemberCombobox
                        clubId={selectedClubId}
                        value={field.value}
                        onChange={handleMemberChange}
                        placeholder={t("registerMemberDialog.placeholderMember")}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="h-9 w-full justify-start px-3 font-normal text-muted-foreground"
                      >
                        {t("registerMemberDialog.placeholderSelectClubFirst")}
                      </Button>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Insurance auto-fill status */}
            {insuranceFetching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t("registerMemberDialog.insuranceLoading")}
              </div>
            )}

            {!insuranceFetching && selectedInsurance && (
              <div className="rounded-md bg-muted/40 p-3 text-xs">
                <p className="font-medium">
                  {t("registerMemberDialog.insuranceActive")}:{" "}
                  {selectedInsurance.policy_number ?? String(selectedInsurance.insurance_id)}
                </p>
                <p className="text-muted-foreground">
                  {t("registerMemberDialog.insuranceExpires")}:{" "}
                  {formatDate(selectedInsurance.end_date)}
                </p>
              </div>
            )}

            {!insuranceFetching && noInsuranceWarning && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                <p className="font-medium">
                  {t("registerMemberDialog.noInsuranceTitle")}
                </p>
                <p className="mt-0.5">
                  {t("registerMemberDialog.noInsuranceDescription")}
                </p>
              </div>
            )}

            {isUnionCamporee ? (
              <input type="hidden" value="union" {...form.register("camporee_type")} />
            ) : (
              <FormField
                control={form.control}
                name="camporee_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("registerMemberDialog.labelCamporeeType")}{" "}
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(val) =>
                          field.onChange(val as "local" | "union")
                        }
                      >
                        <SelectTrigger aria-required="true">
                          <SelectValue
                            placeholder={t(
                              "registerMemberDialog.placeholderCamporeeType",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">
                            {t("registerMemberDialog.typeLocal")}
                          </SelectItem>
                          <SelectItem value="union">
                            {t("registerMemberDialog.typeUnion")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Club name (required for union) */}
            <FormField
              control={form.control}
              name="club_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("registerMemberDialog.labelClubName")}
                    {camporeeType === "union" && (
                      <span className="text-muted-foreground">
                        {" "}
                        {t(
                          "registerMemberDialog.clubNameRequiredForUnion",
                        )}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "registerMemberDialog.placeholderClubName",
                      )}
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
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("registerMemberDialog.cancel")}
              </Button>
              <Button type="submit" disabled={submitDisabled}>
                {isSubmitting
                  ? t("registerMemberDialog.registering")
                  : t("registerMemberDialog.register")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
