"use client";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/users/user-avatar";
import { useRoleLabel } from "@/lib/auth/role-labels";
import type { ClubSectionMember } from "@/lib/api/clubs";

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
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-3.5">
      <UserAvatar
        src={member.picture_url}
        name={member.name}
        size={40}
        className="rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
        {member.current_class_name ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {member.current_class_name}
          </p>
        ) : null}
      </div>
      <Badge variant="soft" className="shrink-0">
        {roleLabel}
      </Badge>
    </div>
  );
}
