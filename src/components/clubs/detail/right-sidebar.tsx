"use client";

import Link from "next/link";
import {
  Award,
  CalendarPlus,
  ClipboardList,
  Edit3,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  ClubLeadership,
  LeadershipMember,
  UpcomingEvent,
} from "@/lib/api/club-detail";

interface RightSidebarProps {
  clubId: number;
  pendingRequests?: number | null;
  upcomingEvents?: UpcomingEvent[] | null;
  isLoadingEvents?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ClubRightSidebar({
  clubId,
  pendingRequests,
  upcomingEvents,
  isLoadingEvents,
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
      <UpcomingEventsCard
        events={upcomingEvents ?? []}
        isLoading={!!isLoadingEvents}
      />
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
  return (
    <CardShell title="Acciones rápidas">
      <div className="grid gap-1">
        <ActionRow
          icon={<Edit3 className="size-3.5" />}
          label="Editar club"
          onClick={onEdit}
        />
        <ActionRow
          icon={<Plus className="size-3.5" />}
          label="Crear unidad"
          href={`/dashboard/clubs/${clubId}/units/new`}
        />
        <ActionRow
          icon={<Users className="size-3.5" />}
          label={
            pending != null
              ? `Aprobar solicitudes (${pending})`
              : "Revisar solicitudes"
          }
        />
        <ActionRow
          icon={<Layers className="size-3.5" />}
          label="Configurar secciones"
        />
        <ActionRow
          icon={<Award className="size-3.5" />}
          label="Ceremonia de investidura"
          disabled
        />
        <div className="my-1.5 h-px bg-border" />
        <ActionRow
          icon={<Trash2 className="size-3.5" />}
          label="Eliminar club"
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

function UpcomingEventsCard({
  events,
  isLoading,
}: {
  events: UpcomingEvent[];
  isLoading: boolean;
}) {
  return (
    <CardShell
      title="Próximos eventos"
      hint={events.length > 0 ? events.length : "—"}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : events.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-6 text-center">
          <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
            <CalendarPlus className="size-5" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            Sin agenda visible
          </p>
          <p className="max-w-[200px] text-xs text-muted-foreground">
            No hay actividades futuras registradas para este club.
          </p>
        </div>
      ) : (
        <ul className="grid gap-0">
          {events.map((ev) => {
            const date = ev.activity_date ? new Date(ev.activity_date) : null;
            const day = date ? date.getDate() : "—";
            const month = date
              ? date
                  .toLocaleString("es", { month: "short" })
                  .replace(".", "")
                  .toUpperCase()
              : "—";
            return (
              <li
                key={ev.activity_id}
                className="grid grid-cols-[56px_1fr] items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
              >
                <div className="rounded-xl bg-primary/10 px-2 py-2 text-center text-xs font-bold leading-tight text-primary">
                  <b className="block text-lg leading-none">{day}</b>
                  {month}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {ev.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {ev.section_name ?? "Club"}
                    {ev.kind ? ` · ${ev.kind}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

interface LeadershipPanelProps {
  leadership: ClubLeadership | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function LeadershipPanel({
  leadership,
  isLoading,
  error,
}: LeadershipPanelProps) {
  if (isLoading) {
    return (
      <CardShell title="Liderazgo">
        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      </CardShell>
    );
  }

  if (error || !leadership) {
    return (
      <CardShell title="Liderazgo">
        <p className="text-sm text-muted-foreground">
          No se pudo cargar el liderazgo del club.
        </p>
      </CardShell>
    );
  }

  const totalSecondary =
    leadership.deputies.length + leadership.secretaries.length;
  const hasAnyone =
    !!leadership.director || totalSecondary > 0 || leadership.others.length > 0;

  if (!hasAnyone) {
    return (
      <CardShell title="Liderazgo">
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-6 text-center">
          <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
            <ClipboardList className="size-5" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            Aún sin liderazgo asignado
          </p>
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Asigná director, subdirectores y secretarios desde las secciones
            del club.
          </p>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell
      title="Liderazgo"
      hint={
        <span className="text-[11px] text-muted-foreground">
          {1 + totalSecondary} activos
        </span>
      }
    >
      <div className="grid gap-3">
        {leadership.director && <DirectorRow member={leadership.director} />}

        {leadership.deputies.length > 0 && (
          <Group
            label="Subdirectores"
            members={leadership.deputies}
            tone="primary"
          />
        )}
        {leadership.secretaries.length > 0 && (
          <Group
            label="Secretaría"
            members={leadership.secretaries}
            tone="info"
          />
        )}
        {leadership.others.length > 0 && (
          <Group label="Otros roles" members={leadership.others} tone="muted" />
        )}
      </div>
    </CardShell>
  );
}

function DirectorRow({ member }: { member: LeadershipMember }) {
  const fullName = getFullName(member);
  return (
    <div className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
      <Avatar member={member} className="bg-primary text-primary-foreground" />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-primary">{fullName}</div>
        <div className="truncate text-[11px] text-primary/80">
          Director{member.section_name ? ` · ${member.section_name}` : ""}
        </div>
      </div>
    </div>
  );
}

function Group({
  label,
  members,
  tone,
}: {
  label: string;
  members: LeadershipMember[];
  tone: "primary" | "info" | "muted";
}) {
  const avatarTone =
    tone === "primary"
      ? "bg-primary/15 text-primary"
      : tone === "info"
        ? "bg-info/15 text-info"
        : "bg-muted text-muted-foreground";
  const labelTone =
    tone === "primary"
      ? "text-primary"
      : tone === "info"
        ? "text-info"
        : "text-muted-foreground";

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <ul className="grid gap-1.5">
        {members.map((member) => (
          <li
            key={member.assignment_id}
            className="grid grid-cols-[32px_1fr_auto] items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-2"
          >
            <Avatar member={member} className={avatarTone} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {getFullName(member)}
              </div>
              {member.section_name && (
                <div className="truncate text-[11px] text-muted-foreground">
                  {member.section_name}
                </div>
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                labelTone,
              )}
            >
              {humanizeRoleName(member.role_name)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Avatar({
  member,
  className,
}: {
  member: LeadershipMember;
  className?: string;
}) {
  if (member.user_image) {
    return (
      <img
        src={member.user_image}
        alt={getFullName(member)}
        className={cn(
          "grid size-8 place-items-center rounded-full object-cover",
          className,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "grid size-8 place-items-center rounded-full text-[11px] font-bold",
        className,
      )}
    >
      {getInitials(member)}
    </div>
  );
}

function getFullName(member: LeadershipMember): string {
  const parts = [member.name, member.paternal_last_name].filter(Boolean);
  const joined = parts.join(" ").trim();
  return joined || member.email || "—";
}

function getInitials(member: LeadershipMember): string {
  const first = member.name?.[0] ?? "";
  const last = member.paternal_last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function humanizeRoleName(roleName: string): string {
  return roleName
    .replace(/[_-]+/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
    .trim();
}
