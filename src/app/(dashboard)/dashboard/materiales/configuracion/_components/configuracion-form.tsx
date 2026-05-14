"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PriceInput } from "../../inventario/_components/price-input";
import { updateConfiguracion } from "@/lib/api/materiales";
import { ApiError } from "@/lib/api/client";
import type { MaterialConfig } from "@/lib/types/materiales";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  bank_name: z.string().min(1, "El nombre del banco es requerido").max(200),
  account_holder: z.string().min(1, "El titular de la cuenta es requerido").max(200),
  bank_account_clabe: z
    .string()
    .regex(/^\d{18}$/, "La CLABE debe tener exactamente 18 dígitos"),
  envio_centavos_default: z
    .number()
    .int()
    .min(0, "El costo de envío no puede ser negativo"),
  pickup_address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConfiguracionFormProps {
  config: MaterialConfig;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfiguracionForm({ config }: ConfiguracionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      bank_name: config.bank_name ?? "",
      account_holder: config.account_holder ?? "",
      bank_account_clabe: config.bank_account_clabe ?? "",
      envio_centavos_default: config.envio_centavos_default ?? 0,
      pickup_address: config.pickup_address ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateConfiguracion({
        bank_name: values.bank_name,
        account_holder: values.account_holder,
        bank_account_clabe: values.bank_account_clabe,
        envio_centavos_default: values.envio_centavos_default,
        pickup_address: values.pickup_address || undefined,
      });
      toast.success("Configuración actualizada correctamente.");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al actualizar la configuración.";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Bank section */}
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold tracking-tight">
            Datos bancarios
          </legend>

          {/* Bank name */}
          <FormField
            control={form.control}
            name="bank_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banco</FormLabel>
                <FormControl>
                  <Input placeholder="ej. BBVA Bancomer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account holder */}
          <FormField
            control={form.control}
            name="account_holder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titular de la cuenta</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre completo del titular" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CLABE */}
          <FormField
            control={form.control}
            name="bank_account_clabe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CLABE interbancaria</FormLabel>
                <FormControl>
                  <Input
                    placeholder="18 dígitos"
                    maxLength={18}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {/* Delivery section */}
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold tracking-tight">
            Opciones de entrega
          </legend>

          {/* Envío default */}
          <Controller
            control={form.control}
            name="envio_centavos_default"
            render={({ field, fieldState }) => (
              <div className="space-y-1.5">
                <Label htmlFor="envio_centavos_default">
                  Costo de envío predeterminado
                </Label>
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

          {/* Pickup address */}
          <FormField
            control={form.control}
            name="pickup_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Dirección de recoger{" "}
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Dirección completa para retiro en persona..."
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
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
