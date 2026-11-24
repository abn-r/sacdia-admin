"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
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
import { designateClubSectionDirectorAction } from "@/lib/clubs/actions";

export interface DesignateDirectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sectionId: number;
  sectionName: string;
  nextYearId: number;
  /** "2027"; null when the catalog could not name the year. */
  nextYearLabel: string | null;
  currentDirectorName: string | null;
  members: ClubSectionMember[];
  /** Existing designation to replace (the API needs its id and version). */
  existing: { userId: string; successionId: string | null; version: number | null } | null;
}

/**
 * Designating next year's director. The three reasons the plan may not
 * activate are stated up front, before the attempt, not as an error after it.
 */
export function DesignateDirectorDialog({
  open,
  onOpenChange,
  clubId,
  sectionId,
  sectionName,
  nextYearId,
  nextYearLabel,
  currentDirectorName,
  members,
  existing,
}: DesignateDirectorDialogProps) {
  const t = useTranslations("people.clubDetail.designate");
  const run = useDetailAction();
  const [userId, setUserId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = nextYearLabel ?? t("nextYearFallback");
  const chosen = members.find((member) => member.user_id === userId);
  const options = members.filter((member) => member.user_id !== existing?.userId);

  async function submit() {
    if (!userId) return;
    setPending(true);
    setError(null);
    try {
      await run(() => {
        const formData = new FormData();
        formData.set("user_id", userId);
        formData.set("ecclesiastical_year_id", String(nextYearId));
        if (existing) {
          formData.set("replace", "true");
          if (existing.successionId) formData.set("succession_id", existing.successionId);
          if (existing.version != null) formData.set("version", String(existing.version));
        }
        return designateClubSectionDirectorAction(clubId, sectionId, {}, formData);
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
          <DialogTitle>{t("title", { year })}</DialogTitle>
          <DialogDescription>{sectionName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="designate-director-person">{t("person")}</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="designate-director-person" className="w-full">
                <SelectValue placeholder={t("personPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2.5 rounded-lg bg-info/10 px-3 py-2.5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
            <p>
              {chosen
                ? currentDirectorName
                  ? t("infoChosen", { name: chosen.name, year, current: currentDirectorName })
                  : t("infoChosenNoCurrent", { name: chosen.name, year })
                : t("infoGeneric", { year })}
            </p>
          </div>

          <div role="note" className="flex gap-2.5 rounded-lg bg-warning/10 px-3 py-2.5 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">{t("reasonsIntro")}</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>{t("reasonActive")}</li>
                <li>{t("reasonGuideMajor")}</li>
                <li>{t("reasonConsent")}</li>
              </ul>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void submit()} loading={pending} disabled={!userId}>
            {existing ? t("replace") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
