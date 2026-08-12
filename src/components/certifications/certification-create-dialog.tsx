"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createCertification,
  type CreateCertificationResult,
} from "@/lib/api/certifications";

function buildSchema(t: ReturnType<typeof useTranslations<"certificationsAdmin.createDialog">>) {
  return z.object({
    name: z.string().min(3, t("validation.nameMin")).max(255, t("validation.nameMax")),
    description: z.string().max(2000, t("validation.descriptionMax")).optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface CertificationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: CreateCertificationResult) => void;
}

export function CertificationCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: CertificationCreateDialogProps) {
  const t = useTranslations("certificationsAdmin.createDialog");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = buildSchema(t);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const result = await createCertification({
        name: values.name,
        description: values.description || undefined,
      });
      toast.success(t("toasts.created"));
      onCreated(result);
      form.reset({ name: "", description: "" });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.createFailed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fieldName")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("fieldNamePlaceholder")} aria-required="true" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("fieldDescriptionPlaceholder")}
                      rows={3}
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
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
