import type { ClassCounselorAssignment, ClubSectionMember } from "@/lib/api/clubs";

const ASSIGNABLE_ROLE_NAMES = new Set(["counselor", "secretary"]);

export type AssignableCounselorOption = {
  value: string;
  label: string;
  role: string;
};

export function normalizeCounselorRole(
  member: Pick<ClubSectionMember, "role" | "role_display_name">,
) {
  return (member.role ?? member.role_display_name ?? "").trim().toLowerCase();
}

export function toAssignableClassCounselorOptions(
  members: Array<Pick<ClubSectionMember, "user_id" | "name" | "role" | "role_display_name">>,
): AssignableCounselorOption[] {
  const seen = new Set<string>();

  return members
    .flatMap((member) => {
      const role = normalizeCounselorRole(member);
      if (!ASSIGNABLE_ROLE_NAMES.has(role) || seen.has(member.user_id)) {
        return [];
      }

      seen.add(member.user_id);
      return [{ value: member.user_id, label: member.name, role }];
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function assignmentUserName(assignment: ClassCounselorAssignment) {
  const user = assignment.users;
  const fullName = [
    user?.name,
    user?.paternal_last_name,
    user?.maternal_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || assignment.user_id;
}

export type ResponsibilityLabels = {
  primary: string;
  assistant: string;
  substitute: string;
  fallback: string;
};

export function responsibilityLabel(
  value: string | undefined,
  labels: ResponsibilityLabels,
) {
  if (value === "primary") return labels.primary;
  if (value === "assistant") return labels.assistant;
  if (value === "substitute") return labels.substitute;
  return labels.fallback;
}
