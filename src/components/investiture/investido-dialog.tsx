"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Award, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { markAsInvestido } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvestidoDialogProps {
  open: boolean;
  enrollmentId: number;
  memberName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvestidoDialog({
  open,
  enrollmentId,
  memberName,
  onOpenChange,
  onSuccess,
}: InvestidoDialogProps) {
  const t = useTranslations("investiture");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comments: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await markAsInvestido(enrollmentId, {
        comments: values.comments || undefined,
      });

      toast.success(t("toasts.invested_member", { name: memberName }));
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("errors.unexpected");
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  });

  function handleClose(isOpen: boolean) {
    if (!isPending) {
      form.reset();
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="size-5 text-primary" />
            {t("investidoDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("investidoDialog.description", { memberName })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("investidoDialog.commentsLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("investidoDialog.commentsPlaceholder")}
                      rows={3}
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                {t("investidoDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {t("investidoDialog.confirm")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
