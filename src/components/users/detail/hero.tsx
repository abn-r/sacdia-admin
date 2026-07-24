import type { ReactNode } from "react";
import { Mail, MapPin, ArrowLeft, Shield, Users } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  metaLabels: {
    status: string;
    club: string;
    section: string;
    clubRole: string;
    systemRole: string;
  };
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
  metaLabels,
}: HeroProps) {
  const isActive = user.active !== false;
  const clubRole = primaryAssignment?.roleName?.trim() ?? null;
  const systemRoles = roleLabels.filter(
    (role) => role.trim() && role.trim().toLowerCase() !== clubRole?.toLowerCase(),
  );

  return (
    <Card className="gap-4 p-6 sm:p-7">
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

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/35 p-2.5 sm:gap-3 sm:p-3">
            <MetaChip label={metaLabels.status} tone={isActive ? "success" : "muted"} pulse={isActive}>
              {isActive ? statusActiveLabel : statusInactiveLabel}
            </MetaChip>

            {primaryAssignment?.clubName ? (
              <>
                <MetaDivider />
                <MetaChip label={metaLabels.club} icon={Users} tone="primary">
                  {primaryAssignment.clubName}
                </MetaChip>
              </>
            ) : null}

            {primaryAssignment?.sectionName ? (
              <>
                <MetaDivider />
                <MetaChip label={metaLabels.section} tone="primary">
                  {primaryAssignment.sectionName}
                </MetaChip>
              </>
            ) : null}

            {clubRole ? (
              <>
                <MetaDivider />
                <MetaChip label={metaLabels.clubRole} icon={Shield} tone="neutral">
                  {clubRole}
                </MetaChip>
              </>
            ) : null}

            {systemRoles.map((role) => (
              <span key={role} className="contents">
                <MetaDivider />
                <MetaChip label={metaLabels.systemRole} icon={Shield} tone="neutral">
                  {role}
                </MetaChip>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button asChild variant="outline" size="sm">
            <Link href={backHref} prefetch={false}>
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

type MetaChipTone = "success" | "primary" | "neutral" | "muted";

const metaChipToneClasses: Record<MetaChipTone, string> = {
  success: "border-primary/20 bg-primary/10 text-primary",
  primary: "border-border/80 bg-background text-foreground shadow-xs",
  neutral: "border-border/60 bg-background/80 text-foreground",
  muted: "border-border bg-muted/60 text-muted-foreground",
};

function MetaChip({
  label,
  icon: Icon,
  tone,
  pulse = false,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  tone: MetaChipTone;
  pulse?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        metaChipToneClasses[tone],
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0 opacity-80" /> : null}
      {pulse ? (
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
      ) : null}
      <span className="truncate">
        <span className="font-normal text-muted-foreground">{label}</span>
        <span className="mx-1 text-muted-foreground/50">·</span>
        <span>{children}</span>
      </span>
    </span>
  );
}

function MetaDivider() {
  return (
    <span
      aria-hidden
      className="hidden h-4 w-px shrink-0 bg-border/80 sm:inline-block"
    />
  );
}
