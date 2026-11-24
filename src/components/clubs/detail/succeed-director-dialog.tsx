"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDetailAction } from "@/components/clubs/detail/use-detail-action";
import type { ClubSectionMember } from "@/lib/api/clubs";
import { succeedClubSectionDirectorAction } from "@/lib/clubs/actions";

export interface SucceedDirectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sectionId: number;
  currentYearId: number;
  currentYearLabel: string | null;
  currentAssignmentId: string;
  currentDirectorName: string;
  /** Section members other than the current director. */
  members: ClubSectionMember[];
}

/**
 * "Cambiar director ahora": ends the current director's term and names the
 * successor of the year in force. It is not the next-year designation.
 *
 * The API (`director-succession`) does not accept a reason, so none is asked
 * for here: asking for text that goes nowhere would be a lie. The change
 * is recorded in the club history with the actor.
 */
export function SucceedDirectorDialog({
  open,
  onOpenChange,
  clubId,
  sectionId,
  currentYearId,
  currentYearLabel,
  currentAssignmentId,
  currentDirectorName,
  members,
}: SucceedDirectorDialogProps) {
  const t = useTranslations("people.clubDetail.succeed");
  const run = useDetailAction();
  const [userId, setUserId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!userId) return;
    setPending(true);
    setError(null);
    try {
      await run(() => {
        const formData = new FormData();
        formData.set("current_assignment_id", currentAssignmentId);
        formData.set("successor_user_id", userId);
        formData.set("ecclesiastical_year_id", String(currentYearId));
        return succeedClubSectionDirectorAction(clubId, sectionId, {}, formData);
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {currentYearLabel
              ? t("description", { name: currentDirectorName, year: currentYearLabel })
              : t("descriptionNoYear", { name: currentDirectorName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="succeed-director-person">{t("person")}</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="succeed-director-person" className="w-full">
              <SelectValue placeholder={t("personPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">{t("historyNote")}</p>
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive-solid"
            onClick={() => void submit()}
            loading={pending}
            disabled={!userId}
          >
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
