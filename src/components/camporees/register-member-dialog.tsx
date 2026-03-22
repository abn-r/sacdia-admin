"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerCamporeeMember } from "@/lib/api/camporees";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  user_id: z.string().uuid("El ID de usuario debe ser un UUID válido"),
  camporee_type: z.enum(["local", "union"]),
  club_name: z.string().optional(),
  insurance_id: z.coerce.number().int().positive().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface RegisterMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporeeId: number;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterMemberDialog({
  open,
  onOpenChange,
  camporeeId,
  onSuccess,
}: RegisterMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insuranceError, setInsuranceError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      user_id: "",
      camporee_type: "local",
      club_name: "",
      insurance_id: "",
    },
  });

  const camporeeType = watch("camporee_type");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setInsuranceError(null);
    }
    onOpenChange(nextOpen);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    setInsuranceError(null);
    try {
      await registerCamporeeMember(camporeeId, {
        user_id: values.user_id,
        camporee_type: values.camporee_type,
        club_name: values.club_name || undefined,
        insurance_id:
          values.insurance_id !== "" && values.insurance_id != null
            ? Number(values.insurance_id)
            : undefined,
      });
      toast.success("Miembro registrado en el camporee");
      onSuccess();
      handleOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo registrar al miembro";

      // Insurance-related errors get a dedicated callout
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar miembro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Insurance error callout */}
          {insuranceError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">Error de validación de seguro</p>
              <p className="mt-0.5">{insuranceError}</p>
            </div>
          )}

          {/* User ID */}
          <div className="space-y-1.5">
            <Label htmlFor="user_id">ID del usuario (UUID) *</Label>
            <Input
              id="user_id"
              {...register("user_id")}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
            />
            {errors.user_id && (
              <p className="text-xs text-destructive">
                {errors.user_id.message}
              </p>
            )}
          </div>

          {/* Tipo de camporee */}
          <div className="space-y-1.5">
            <Label>Tipo de camporee *</Label>
            <Select
              value={camporeeType}
              onValueChange={(val) =>
                setValue("camporee_type", val as "local" | "union")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="union">Unión</SelectItem>
              </SelectContent>
            </Select>
            {errors.camporee_type && (
              <p className="text-xs text-destructive">
                {errors.camporee_type.message}
              </p>
            )}
          </div>

          {/* Club name (required for union) */}
          <div className="space-y-1.5">
            <Label htmlFor="club_name">
              Nombre del club
              {camporeeType === "union" && (
                <span className="text-muted-foreground"> (requerido para Unión)</span>
              )}
            </Label>
            <Input
              id="club_name"
              {...register("club_name")}
              placeholder="Ej. Club Conquistadores Central"
            />
          </div>

          {/* Insurance ID */}
          <div className="space-y-1.5">
            <Label htmlFor="insurance_id">ID de póliza de seguro</Label>
            <Input
              id="insurance_id"
              type="number"
              min={1}
              {...register("insurance_id")}
              placeholder="Opcional"
            />
            <p className="text-xs text-muted-foreground">
              El registro fallará si el seguro no está validado.
            </p>
            {errors.insurance_id && (
              <p className="text-xs text-destructive">
                {errors.insurance_id.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar miembro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
