"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoleLabel } from "@/lib/auth/role-labels";
import type { ClubSectionMember } from "@/lib/api/clubs";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface MemberRowProps {
  member: ClubSectionMember;
}

export function MemberRow({ member }: MemberRowProps) {
  const translateRole = useRoleLabel();
  const roleLabel =
    translateRole(member.role ?? member.role_display_name) ||
    member.role_display_name ||
    "—";

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
      <Avatar size="sm">
        {member.picture_url ? (
          <AvatarImage src={member.picture_url} alt={member.name} />
        ) : null}
        <AvatarFallback>{initials(member.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.name}</p>
        {member.current_class_name ? (
          <p className="truncate text-xs text-muted-foreground">
            {member.current_class_name}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 text-right text-xs font-medium text-muted-foreground">
        {roleLabel}
      </span>
    </div>
  );
}
