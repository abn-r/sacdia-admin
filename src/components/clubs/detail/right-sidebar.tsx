"use client";

import Link from "next/link";
import {
  Award,
  CalendarPlus,
  ClipboardList,
  Edit3,
  Layers,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RightSidebarProps {
  clubId: number;
  pendingRequests?: number | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ClubRightSidebar({
  clubId,
  pendingRequests,
  onEdit,
  onDelete,
}: RightSidebarProps) {
  return (
    <aside className="grid gap-3">
      <ActionsCard
        clubId={clubId}
        pending={pendingRequests}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <UpcomingEventsCard />
    </aside>
  );
}

function CardShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="mb-3.5 flex items-center justify-between text-sm font-semibold text-foreground">
        {title}
        {hint && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {hint}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

function ActionsCard({
  clubId,
  pending,
  onEdit,
  onDelete,
}: {
  clubId: number;
  pending?: number | null;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("clubs.pages.detail.sidebar");

  return (
    <CardShell title={t("actionsTitle")}>
      <div className="grid gap-1">
        <ActionRow icon={<Edit3 className="size-3.5" />} label={t("actionEdit")} onClick={onEdit} />
        <ActionRow
          icon={<Plus className="size-3.5" />}
          label={t("actionCreateUnit")}
          href={`/dashboard/clubs/${clubId}/units/new`}
        />
        <ActionRow
          icon={<Users className="size-3.5" />}
          label={
            pending != null
              ? t("actionApproveRequests", { count: pending })
              : t("actionReviewRequests")
          }
        />
        <ActionRow
          icon={<Layers className="size-3.5" />}
          label={t("actionConfigureSections")}
        />
        <ActionRow
          icon={<Award className="size-3.5" />}
          label={t("actionInvestiture")}
          disabled
        />
        <div className="my-1.5 h-px bg-border" />
        <ActionRow
          icon={<Trash2 className="size-3.5" />}
          label={t("actionDelete")}
          danger
          onClick={onDelete}
        />
      </div>
    </CardShell>
  );
}

function ActionRow({
  icon,
  label,
  danger,
  onClick,
  href,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <span
      className={cn(
        "grid grid-cols-[28px_1fr] items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/60"
          : danger
            ? "text-destructive hover:border-destructive/30 hover:bg-destructive/5"
            : "text-foreground hover:border-border hover:bg-muted/60",
      )}
    >
      <span
        className={cn(
          "grid size-7 place-items-center rounded-md",
          danger
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block text-left"
    >
      {inner}
    </button>
  );
}

function UpcomingEventsCard() {
  const t = useTranslations("clubs.pages.detail.sidebar");

  return (
    <CardShell title={t("eventsTitle")} hint="—">
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-6 text-center">
        <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <CalendarPlus className="size-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">{t("eventsEmpty")}</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">
          {t("eventsDescription")}
        </p>
        <Button size="xs" variant="outline" disabled>
          {t("eventsSchedule")}
        </Button>
      </div>
    </CardShell>
  );
}

interface LeadershipPlaceholderProps {
  totalSections: number;
}

export function LeadershipPlaceholder({
  totalSections,
}: LeadershipPlaceholderProps) {
  const t = useTranslations("clubs.pages.detail.sidebar");

  return (
    <CardShell
      title={t("leadershipTitle")}
      hint={
        <span className="text-[11px] text-muted-foreground">
          {totalSections > 0 ? t("leadershipSections", { count: totalSections }) : "—"}
        </span>
      }
    >
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-6 text-center">
        <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <ClipboardList className="size-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">
          {t("leadershipEmpty")}
        </p>
        <p className="max-w-[220px] text-xs text-muted-foreground">
          {t("leadershipDescription")}
        </p>
      </div>
    </CardShell>
  );
}
