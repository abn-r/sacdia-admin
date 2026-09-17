"use client";

import { useActionState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  succeedClubSectionDirectorAction,
  type ClubActionState,
} from "@/lib/clubs/actions";
import type { ClubSectionMember } from "@/lib/api/clubs";

function SuccessionSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
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

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  function confirmSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(t("succeedConfirm"))) {
      event.preventDefault();
    }
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-border/70 bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("successionHeading", { year: currentYearId })}
      </p>
      <p className="text-[11px] text-muted-foreground">{t("successionHint")}</p>

      <form action={action} onSubmit={confirmSubmit} className="space-y-2 border-t pt-3">
        <input type="hidden" name="current_assignment_id" value={currentAssignmentId} />
        <input type="hidden" name="ecclesiastical_year_id" value={currentYearId} />

        <select
          name="successor_user_id"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          defaultValue=""
        >
          <option value="" disabled>
            {t("succeedNow")}
          </option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.name}
            </option>
          ))}
        </select>

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
    </div>
  );
}
