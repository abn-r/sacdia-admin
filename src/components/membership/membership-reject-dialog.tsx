"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  FormMessage,
} from "@/components/ui/form";
import { ApiError } from "@/lib/api/client";
import {
  rejectMembershipRequest,
  type MembershipRequest,
} from "@/lib/api/membership-requests";

// ─── Schema ───────────────────────────────────────────────────────────────────

const rejectSchema = z.object({
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof rejectSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: MembershipRequest["users"]): string {
  if (!user) return "este usuario";
  const parts = [user.name, user.paternal_last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email ?? "este usuario";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MembershipRejectDialogProps {
  open: boolean;
  clubSectionId: number;
  request: MembershipRequest;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembershipRejectDialog({
  open,
  clubSectionId,
  request,
  onOpenChange,
  onSuccess,
}: MembershipRejectDialogProps) {
  const t = useTranslations("membership");
  const [isPending, setIsPending] = useState(false);
  const userName = getUserName(request.users);

  const form = useForm<FormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await rejectMembershipRequest(
        clubSectionId,
        request.assignment_id,
        values.reason || undefined,
      );

      toast.success(t("toasts.rejected", { name: userName }));
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("errors.reject");
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
            <XCircle className="size-5 text-destructive" />
            {t("dialogs.reject.title")}
          </DialogTitle>
          <DialogDescription>
            {t("dialogs.reject.description", { userName })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialogs.reject.reason_label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("dialogs.reject.reason_placeholder")}
                      rows={3}
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
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
                {t("dialogs.reject.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? t("dialogs.reject.confirming") : t("dialogs.reject.confirm")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
