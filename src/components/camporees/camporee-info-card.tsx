import { Tent, CalendarRange, MapPin, DollarSign, Lock, LockOpen } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Camporee } from "@/lib/api/camporees";
import { isClubRegistrationClosed } from "@/lib/camporees/club-registration";
import {
  formatCalendarDate,
  formatMxnAmount,
  formatTimestamp,
} from "@/lib/format-locale";

interface CamporeeInfoCardProps {
  camporee: Camporee;
}

export async function CamporeeInfoCard({ camporee }: CamporeeInfoCardProps) {
  const t = await getTranslations("camporees.clubRegistration");
  const locale = await getLocale();
  const clubRegistrationClosed = isClubRegistrationClosed(
    camporee.club_registration_closed_at,
  );
  const closedAtLabel = clubRegistrationClosed
    ? formatTimestamp(camporee.club_registration_closed_at)
    : null;
  const clubTypeBadges: React.ReactNode[] = [];
  if (camporee.includes_adventurers) {
    clubTypeBadges.push(
      <Badge key="adv" variant="secondary">
        Aventureros
      </Badge>,
    );
  }
  if (camporee.includes_pathfinders) {
    clubTypeBadges.push(
      <Badge key="path" variant="secondary">
        Conquistadores
      </Badge>,
    );
  }
  if (camporee.includes_master_guides) {
    clubTypeBadges.push(
      <Badge key="mg" variant="secondary">
        Guías Mayores
      </Badge>,
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start gap-6">
          {/* Icon */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Tent className="size-6 text-primary" />
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold">{camporee.name}</h2>
              {camporee.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {camporee.description}
                </p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarRange className="size-3.5 shrink-0" />
                {formatCalendarDate(camporee.start_date, locale, "long")} —{" "}
                {formatCalendarDate(camporee.end_date, locale, "long")}
              </span>
              {camporee.local_camporee_place && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {camporee.local_camporee_place}
                </span>
              )}
              {camporee.registration_cost != null && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 shrink-0" />
                  {formatMxnAmount(camporee.registration_cost)}
                </span>
              )}
            </div>

            {/* Club type badges */}
            {clubTypeBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{clubTypeBadges}</div>
            )}
          </div>

          {/* Status badges */}
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={camporee.active !== false ? "soft-success" : "outline"}>
              {camporee.active !== false ? "Activo" : "Inactivo"}
            </Badge>
            <Badge
              variant={clubRegistrationClosed ? "outline" : "secondary"}
              className="h-auto max-w-[12rem] whitespace-normal py-1 text-right"
            >
              {clubRegistrationClosed ? (
                <Lock className="size-3" />
              ) : (
                <LockOpen className="size-3" />
              )}
              {clubRegistrationClosed ? t("statusClosed") : t("statusOpen")}
            </Badge>
            {closedAtLabel && (
              <span className="max-w-[16rem] text-right text-[11px] text-muted-foreground">
                {t("closedAt", { date: closedAtLabel })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
