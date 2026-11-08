"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  succeedClubSectionDirectorAction,
  type ClubActionState,
} from "@/lib/clubs/actions";
import type { ClubSectionMember } from "@/lib/api/clubs";

function SuccessionSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button loading={pending} type="submit" size="sm" className="w-full">
      {label}
    </Button>
  );
}

export function SuccessionBlock({
  clubId,
  sectionId,
  currentYearId,
  currentAssignmentId,
  members,
}: {
  clubId: number;
  sectionId: number;
  currentYearId: number;
  currentAssignmentId: string;
  members: ClubSectionMember[];
}) {
  const t = useTranslations("clubs.detail.sections");
  const router = useRouter();
  const boundAction = succeedClubSectionDirectorAction.bind(null, clubId, sectionId);
  const [state, action] = useActionState(boundAction, {} as ClubActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectId = `successor-${sectionId}`;

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  // The irreversible change asks for confirmation in an AlertDialog first;
  // the confirmed submit goes through the form so useFormStatus still drives
  // the button's loading state.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    event.preventDefault();
    setConfirmOpen(true);
  }

  function confirmSuccession() {
    setConfirmOpen(false);
    confirmedRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-border/70 bg-card p-4">
      <p className="text-2xs font-semibold text-muted-foreground">
        {t("successionHeading", { year: currentYearId })}
      </p>
      <p className="text-2xs text-muted-foreground">{t("successionHint")}</p>

      <form
        ref={formRef}
        action={action}
        onSubmit={handleSubmit}
        className="space-y-2 border-t pt-3"
      >
        <input type="hidden" name="current_assignment_id" value={currentAssignmentId} />
        <input type="hidden" name="ecclesiastical_year_id" value={currentYearId} />

        <div className="space-y-1.5">
          <Label htmlFor={selectId}>{t("successorLabel")}</Label>
          <NativeSelect
            id={selectId}
            name="successor_user_id"
            required
            defaultValue=""
            className="w-full"
          >
            <NativeSelectOption value="" disabled>
              {t("succeedNow")}
            </NativeSelectOption>
            {members.map((member) => (
              <NativeSelectOption key={member.user_id} value={member.user_id}>
                {member.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {state.error ? (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-xs text-primary">{state.success}</p>
        ) : null}

        <SuccessionSubmitButton label={t("succeedNow")} />
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("succeedNow")}</AlertDialogTitle>
            <AlertDialogDescription>{t("succeedConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("succeedCancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive-solid" onClick={confirmSuccession}>
              {t("succeedConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
