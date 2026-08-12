"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  getPaymentOrderConfig,
  upsertPaymentOrderConfig,
  type PaymentOrderConfig,
} from "@/lib/api/field-payment-orders";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";

interface PaymentInstructionsPanelProps {
  /** Global admins must target an explicit local field. */
  requiresLocalFieldId?: boolean;
}

type FormState = {
  local_field_id: string;
  bank_name: string;
  bank_account: string;
  bank_clabe: string;
  bank_holder: string;
  cash_instructions: string;
  extra_notes: string;
};

const EMPTY_FORM: FormState = {
  local_field_id: "",
  bank_name: "",
  bank_account: "",
  bank_clabe: "",
  bank_holder: "",
  cash_instructions: "",
  extra_notes: "",
};

function toForm(config: PaymentOrderConfig): FormState {
  return {
    local_field_id: String(config.local_field_id),
    bank_name: config.bank_name ?? "",
    bank_account: config.bank_account ?? "",
    bank_clabe: config.bank_clabe ?? "",
    bank_holder: config.bank_holder ?? "",
    cash_instructions: config.cash_instructions ?? "",
    extra_notes: config.extra_notes ?? "",
  };
}

/**
 * Payment instructions per Local Field (bank transfer AND/OR field cashier),
 * printed on every payment order PDF.
 */
export function PaymentInstructionsPanel({
  requiresLocalFieldId = false,
}: PaymentInstructionsPanelProps) {
  const t = useTranslations("payment_orders");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!requiresLocalFieldId);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (localFieldId?: number) => {
      setLoading(true);
      try {
        const config = await getPaymentOrderConfig(localFieldId);
        setForm(toForm(config));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // No config yet for this local field — start with a blank form.
          setForm((previous) => ({
            ...EMPTY_FORM,
            local_field_id: previous.local_field_id,
          }));
        } else {
          toast.error(
            getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"),
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!requiresLocalFieldId) void load();
  }, [requiresLocalFieldId, load]);

  const set = (key: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const hasBank = Boolean(form.bank_account.trim() || form.bank_clabe.trim());
  const hasCash = Boolean(form.cash_instructions.trim());
  const localFieldMissing =
    requiresLocalFieldId && !form.local_field_id.trim();

  const save = async () => {
    setSaving(true);
    try {
      const config = await upsertPaymentOrderConfig({
        local_field_id: Number(form.local_field_id) || undefined,
        bank_name: form.bank_name.trim() || undefined,
        bank_account: form.bank_account.trim() || undefined,
        bank_clabe: form.bank_clabe.trim() || undefined,
        bank_holder: form.bank_holder.trim() || undefined,
        cash_instructions: form.cash_instructions.trim() || undefined,
        extra_notes: form.extra_notes.trim() || undefined,
        active: true,
      });
      setForm(toForm(config));
      toast.success(t("config.saved"));
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-muted-foreground text-sm">
        {t("config.description")}
      </p>

      {requiresLocalFieldId && (
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="config-local-field">
              {t("config.localField")}
            </Label>
            <Input
              id="config-local-field"
              type="number"
              min={1}
              value={form.local_field_id}
              onChange={set("local_field_id")}
              className="w-40"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={localFieldMissing || loading}
            onClick={() => void load(Number(form.local_field_id))}
          >
            {t("config.loadField")}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("tray.loading")}</p>
      ) : (
        <>
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 font-medium text-sm">
              {t("config.bankSection")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="config-bank-name">{t("config.bankName")}</Label>
                <Input
                  id="config-bank-name"
                  value={form.bank_name}
                  onChange={set("bank_name")}
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="config-bank-holder">
                  {t("config.bankHolder")}
                </Label>
                <Input
                  id="config-bank-holder"
                  value={form.bank_holder}
                  onChange={set("bank_holder")}
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="config-bank-account">
                  {t("config.bankAccount")}
                </Label>
                <Input
                  id="config-bank-account"
                  value={form.bank_account}
                  onChange={set("bank_account")}
                  maxLength={64}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="config-bank-clabe">
                  {t("config.bankClabe")}
                </Label>
                <Input
                  id="config-bank-clabe"
                  value={form.bank_clabe}
                  onChange={set("bank_clabe")}
                  maxLength={32}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 font-medium text-sm">
              {t("config.cashSection")}
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="config-cash-instructions">
                {t("config.cashInstructions")}
              </Label>
              <Textarea
                id="config-cash-instructions"
                value={form.cash_instructions}
                onChange={set("cash_instructions")}
                placeholder={t("config.cashPlaceholder")}
              />
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="config-extra-notes">{t("config.extraNotes")}</Label>
            <Textarea
              id="config-extra-notes"
              value={form.extra_notes}
              onChange={set("extra_notes")}
            />
          </div>

          {!hasBank && !hasCash && (
            <p className="text-destructive text-sm">
              {t("config.atLeastOneMethod")}
            </p>
          )}

          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || (!hasBank && !hasCash) || localFieldMissing}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t("config.save")}
          </Button>
        </>
      )}
    </div>
  );
}
