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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { enrollClub } from "@/lib/api/camporees";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  club_section_id: z.coerce
    .number()
    .int("Debe ser un número entero")
    .positive("Debe ser mayor a cero"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EnrollClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporeeId: number;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnrollClubDialog({
  open,
  onOpenChange,
  camporeeId,
  onSuccess,
}: EnrollClubDialogProps) {
  const t = useTranslations("camporees");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      club_section_id: undefined,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      await enrollClub(camporeeId, { club_section_id: values.club_section_id });
      toast.success(t("toasts.club_enrolled"));
      onSuccess();
      handleOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.enroll_club");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("enrollDialog.title")}</DialogTitle>
          <DialogDescription>
            Ingresá el ID de sección del club para inscribirlo en este camporee.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Club section ID */}
            <FormField
              control={form.control}
              name="club_section_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("enrollDialog.labelSectionId")}{" "}
                    <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      placeholder={t("enrollDialog.placeholderSectionId")}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage role="alert" aria-live="polite" />
                  <FormDescription>
                    {t("enrollDialog.helpSectionId")}
                  </FormDescription>
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
                {t("enrollDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("enrollDialog.enrolling") : t("enrollDialog.enroll")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
