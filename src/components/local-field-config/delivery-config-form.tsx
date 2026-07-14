"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/app/(dashboard)/dashboard/materials/inventory/_components/price-input";
import { updateConfig } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import type { MaterialConfig } from "@/lib/types/materials";

const schema = z.object({
  envio_centavos_default: z
    .number()
    .int()
    .min(0, "El costo de envío no puede ser negativo"),
  pickup_address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface DeliveryConfigFormProps {
  config: MaterialConfig;
  localFieldId: number;
}

export function DeliveryConfigForm({
  config,
  localFieldId,
}: DeliveryConfigFormProps) {
  const t = useTranslations("localFieldConfig.pages.delivery");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      envio_centavos_default: config.envio_centavos_default ?? 0,
      pickup_address: config.pickup_address ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateConfig(
        {
          envio_centavos_default: values.envio_centavos_default,
          pickup_address: values.pickup_address || undefined,
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
            {t("sectionTitle")}
          </legend>
          <p className="text-sm text-muted-foreground">{t("sectionDescription")}</p>

          <Controller
            control={form.control}
            name="envio_centavos_default"
            render={({ field, fieldState }) => (
              <div className="space-y-1.5">
                <Label htmlFor="envio_centavos_default">{t("shippingCost")}</Label>
                <PriceInput
                  id="envio_centavos_default"
                  valueCentavos={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  placeholder="0.00"
                />
                {fieldState.error && (
                  <p className="text-sm font-medium text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />

          <FormField
            control={form.control}
            name="pickup_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("pickupAddress")}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({t("optional")})
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("pickupAddressPlaceholder")}
                    className="resize-none"
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
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
