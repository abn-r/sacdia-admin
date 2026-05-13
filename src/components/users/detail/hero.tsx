import { Mail, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserApprovalActions } from "@/components/users/user-approval-actions";
import { cn } from "@/lib/utils";
import type { AdminUserDetail } from "@/lib/api/admin-users";

interface HeroProps {
  user: AdminUserDetail;
  fullName: string;
  age: number | null;
  ageLabel?: string | null;
  primaryAssignment: ClubAssignmentSummary | null;
  roleLabels: string[];
  backHref: string;
  backLabel: string;
  statusActiveLabel: string;
  statusInactiveLabel: string;
  approvalPendingLabel: string;
  approvalApprovedLabel: string;
  approvalRejectedLabel: string;
  canUpdateApproval: boolean;
}

export interface ClubAssignmentSummary {
  clubName: string | null;
  sectionName: string | null;
  roleName: string | null;
}

type ApprovalState = "pending" | "approved" | "rejected" | "unknown";

function resolveApprovalState(value: AdminUserDetail["approval"]): ApprovalState {
  if (value === null || value === undefined || value === 0 || value === "pending") {
    return "pending";
  }
  if (value === 1 || value === true || value === "approved") {
    return "approved";
  }
  if (value === -1 || value === "rejected") {
    return "rejected";
  }
  return "unknown";
}

export function UserDetailHero({
  user,
  fullName,
  age,
  ageLabel,
  primaryAssignment,
  roleLabels,
  backHref,
  backLabel,
  statusActiveLabel,
  statusInactiveLabel,
  approvalPendingLabel,
  approvalApprovedLabel,
  approvalRejectedLabel,
  canUpdateApproval,
}: HeroProps) {
  const isActive = user.active !== false;
  const approvalState = resolveApprovalState(user.approval);

  return (
    <Card className="relative gap-4 overflow-hidden p-6 sm:p-7">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-warning" />

      <div className="grid items-start gap-6 sm:grid-cols-[112px_1fr_auto]">
        <div className="relative">
          <UserAvatar
            src={user.user_image}
            name={fullName}
            email={user.email}
            size={104}
            className="rounded-2xl"
            priority
          />
          {approvalState === "approved" ? (
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-background bg-success text-success-foreground shadow"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-11" />
              </svg>
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[26px]">
            {fullName}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {user.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {user.email}
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

            {approvalState === "pending" ? (
              <Badge variant="soft-warning">{approvalPendingLabel}</Badge>
            ) : approvalState === "approved" ? (
              <Badge variant="soft-success">{approvalApprovedLabel}</Badge>
            ) : approvalState === "rejected" ? (
              <Badge variant="destructive">{approvalRejectedLabel}</Badge>
            ) : null}

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
          {canUpdateApproval ? (
            <UserApprovalActions
              userId={user.user_id}
              currentApproval={user.approval}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function Dot() {
  return <span aria-hidden className="size-1 rounded-full bg-border" />;
}
