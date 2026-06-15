import { Mail, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/users/user-avatar";
import { cn } from "@/lib/utils";
import type { AdminUserDetail } from "@/lib/api/admin-users";

interface HeroProps {
  user: AdminUserDetail;
  fullName: string;
  secondaryIdentityLabel: string;
  age: number | null;
  ageLabel?: string | null;
  primaryAssignment: ClubAssignmentSummary | null;
  roleLabels: string[];
  backHref: string;
  backLabel: string;
  statusActiveLabel: string;
  statusInactiveLabel: string;
}

export interface ClubAssignmentSummary {
  clubName: string | null;
  sectionName: string | null;
  roleName: string | null;
}

export function UserDetailHero({
  user,
  fullName,
  secondaryIdentityLabel,
  age,
  ageLabel,
  primaryAssignment,
  roleLabels,
  backHref,
  backLabel,
  statusActiveLabel,
  statusInactiveLabel,
}: HeroProps) {
  const isActive = user.active !== false;

  return (
    <Card className="relative gap-4 overflow-hidden p-6 sm:p-7">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-warning" />

      <div className="grid items-start gap-6 sm:grid-cols-[112px_1fr_auto]">
        <div className="relative">
          <UserAvatar
            src={user.user_image}
            name={fullName}
            email={secondaryIdentityLabel}
            size={104}
            className="rounded-2xl"
            priority
          />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[26px]">
            {fullName}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {secondaryIdentityLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {secondaryIdentityLabel}
              </span>
            ) : null}
            {user.local_field?.name ? (
              <>
                <Dot />
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {user.local_field.name}
                </span>
              </>
            ) : null}
            {age !== null ? (
              <>
                <Dot />
                <span>{ageLabel ?? `${age}`}</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={isActive ? "soft-success" : "outline"} className="gap-1.5">
              <span className={cn("size-1.5 rounded-full", isActive ? "bg-success" : "bg-muted-foreground")} />
              {isActive ? statusActiveLabel : statusInactiveLabel}
            </Badge>

            {primaryAssignment?.clubName ? (
              <Badge variant="soft-info">
                {primaryAssignment.clubName}
                {primaryAssignment.sectionName ? ` · ${primaryAssignment.sectionName}` : ""}
              </Badge>
            ) : null}

            {primaryAssignment?.roleName ? (
              <Badge variant="soft">{primaryAssignment.roleName}</Badge>
            ) : null}

            {roleLabels.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Dot() {
  return <span aria-hidden className="size-1 rounded-full bg-border" />;
}
