"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateConfig } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import type { MaterialConfig } from "@/lib/types/materials";

const schema = z.object({
  bank_name: z.string().min(1, "El nombre del banco es requerido").max(200),
  account_holder: z
    .string()
    .min(1, "El titular de la cuenta es requerido")
    .max(200),
  bank_account_clabe: z
    .string()
    .regex(/^\d{18}$/, "La CLABE debe tener exactamente 18 dígitos"),
});

type FormValues = z.infer<typeof schema>;

interface PaymentMethodsFormProps {
  config: MaterialConfig;
  localFieldId: number;
}

export function PaymentMethodsForm({
  config,
  localFieldId,
}: PaymentMethodsFormProps) {
  const t = useTranslations("localFieldConfig.pages.paymentMethods");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      bank_name: config.bank_name ?? "",
      account_holder: config.account_holder ?? "",
      bank_account_clabe: config.bank_account_clabe ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateConfig(
        {
          bank_name: values.bank_name,
          account_holder: values.account_holder,
          bank_account_clabe: values.bank_account_clabe,
        },
        { localFieldId },
      );
      toast.success(t("saveSuccess"));
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("saveError");
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <fieldset className="space-y-4 rounded-lg border bg-card p-5">
          <legend className="px-1 text-sm font-semibold tracking-tight">
            {t("transferTitle")}
          </legend>
          <p className="text-sm text-muted-foreground">{t("transferDescription")}</p>

          <FormField
            control={form.control}
            name="bank_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bankName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("bankNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account_holder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("accountHolder")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("accountHolderPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bank_account_clabe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("clabe")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("clabePlaceholder")}
                    maxLength={18}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="font-mono tracking-tight"
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("clabeHelp")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
