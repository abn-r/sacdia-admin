import { ApiError, apiRequest } from "@/lib/api/client";
import {
  getMyCoordinatorScope,
  type CoordinatorScopeSection,
} from "@/lib/api/coordination";
import type { MembershipReviewMode } from "@/lib/auth/membership-review-mode";
import { CLUB_MEMBERS_APPROVE, CONSENT_VERIFY } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

/**
 * `mode` is the review mode that applies to THAT section: `approve` only where
 * the viewer's club_members:approve comes from their own club context;
 * `verify-only` where the section is reached through a coordinator assignment
 * (the backend forces verify-only there, whatever the viewer holds elsewhere).
 */
export type ReviewSectionOption = {
  club_section_id: number;
  label: string;
  mode: MembershipReviewMode;
};

export type ReviewSectionOptions = {
  sections: ReviewSectionOption[];
  available: boolean;
  error?: string;
  /**
   * The coordination scope says the viewer is a coordinator with covered
   * sections: the aggregate consent queue (GET /coordination/me/consent-pending)
   * applies. False when the scope was not requested, failed, or is empty.
   */
  coordinatorQueue: boolean;
};

type ClubSection = {
  club_section_id: number;
  club_types?: { name?: string } | null;
  club_type?: { name?: string } | null;
  active: boolean;
};

type Club = {
  name?: string;
  sections?: ClubSection[];
  club_sections?: ClubSection[];
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "unexpected";
}

/**
 * Active sections of `GET /clubs`. That endpoint is NOT permission-scoped for
 * open-territory users (it pages the first clubs of the whole system), so it is
 * only a fallback for approvers who hold club_members:approve through a global
 * role or a direct grant, never for club-role holders or coordinators.
 */
async function fetchClubSectionOptions(): Promise<ReviewSectionOption[]> {
  const payload = await apiRequest<unknown>("/clubs");

  let clubs: Club[] = [];
  if (Array.isArray(payload)) {
    clubs = payload as Club[];
  } else if (payload && typeof payload === "object") {
    const res = payload as { data?: unknown };
    if (Array.isArray(res.data)) clubs = res.data as Club[];
  }

  const sections: ReviewSectionOption[] = [];
  for (const club of clubs) {
    const clubName = club.name ?? "Club";
    for (const section of club.club_sections ?? club.sections ?? []) {
      if (section.active && section.club_section_id) {
        const typeName = section.club_types?.name ?? section.club_type?.name ?? "Sección";
        sections.push({
          club_section_id: section.club_section_id,
          label: `${clubName} · ${typeName}`,
          mode: "approve",
        });
      }
    }
  }
  return sections;
}

/** Sections a coordinator covers, labelled like the club picker (`club · type`). Always verify-only. */
export function coordinatorScopeToSectionOptions(
  sections: CoordinatorScopeSection[],
): ReviewSectionOption[] {
  return sections.map((section) => ({
    club_section_id: section.club_section_id,
    label: `${section.club_name ?? "Club"} · ${section.club_type_name ?? section.name ?? "Sección"}`,
    mode: "verify-only",
  }));
}

/**
 * Review sections that come from the viewer's OWN club grants
 * (`authorization.grants.club_assignments`), as opposed to coordinator scope.
 */
export type ClubGrantSections = {
  /** Sections where a club role carries club_members:approve. */
  approve: ReviewSectionOption[];
  /** Sections where a club role carries consent:verify (verify-only mode). */
  verify: ReviewSectionOption[];
  /**
   * club_members:approve comes from a global role or a direct grant (admins):
   * there is no club-grant list to use, so `GET /clubs` stays as the picker source.
   */
  approveViaUnscopedList: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasPermission(permissions: unknown, key: string): boolean {
  return (
    Array.isArray(permissions) &&
    permissions.some((p) => typeof p === "string" && p.trim().toLowerCase() === key)
  );
}

export function resolveClubGrantSections(user: AuthUser | null | undefined): ClubGrantSections {
  const grants = asRecord(user?.authorization?.grants);
  const approve: ReviewSectionOption[] = [];
  const verify: ReviewSectionOption[] = [];

  // The backend guard honours only the ACTIVE club assignment's section, so any
  // other club grant would offer a section that answers 403. No active
  // assignment means no club authority at all.
  const activeAssignmentId = user?.authorization?.active_assignment?.assignment_id ?? null;
  const assignments = Array.isArray(grants?.club_assignments) ? grants.club_assignments : [];
  for (const raw of assignments) {
    const grant = asRecord(raw);
    if (!grant) continue;
    if (!activeAssignmentId || grant.assignment_id !== activeAssignmentId) continue;
    // Coordinator authority comes from the scope, never from a club grant.
    if (typeof grant.role_name === "string" && /coordinator/i.test(grant.role_name)) continue;

    const sectionId = asRecord(grant.section)?.club_section_id;
    if (typeof sectionId !== "number" || !Number.isInteger(sectionId) || sectionId <= 0) continue;

    const typeName = asRecord(grant.section)?.club_type_name;
    const clubName = asRecord(grant.club)?.club_name;
    const label = `${typeof clubName === "string" && clubName ? clubName : "Club"} · ${
      typeof typeName === "string" && typeName ? typeName : "Sección"
    }`;

    if (hasPermission(grant.permissions, CLUB_MEMBERS_APPROVE)) {
      approve.push({ club_section_id: sectionId, label, mode: "approve" });
    }
    if (hasPermission(grant.permissions, CONSENT_VERIFY)) {
      verify.push({ club_section_id: sectionId, label, mode: "verify-only" });
    }
  }

  const globalRoles = Array.isArray(grants?.global_roles) ? grants.global_roles : [];
  const approveViaUnscopedList =
    hasPermission(grants?.direct_permissions, CLUB_MEMBERS_APPROVE) ||
    globalRoles.some((role) => hasPermission(asRecord(role)?.permissions, CLUB_MEMBERS_APPROVE));

  return { approve, verify, approveViaUnscopedList };
}

/**
 * Sections the review page offers, each tagged with its own review mode.
 *
 * - `approve` mode: only sections where the viewer's OWN club role carries
 *   club_members:approve (`clubGrants.approve`). Admins who approve through a
 *   global role or a direct grant have no club grants, so they keep the
 *   `GET /clubs` list (approve mode).
 * - Coordination scope sections (`GET /coordination/me/scope`) are always
 *   `verify-only`: the backend forces verify-only on the coordinator path. They
 *   are merged in `verify-only` mode and, in `approve` mode, when
 *   `includeCoordinatorScope` is set (a coordinator who also approves elsewhere).
 * - `verify-only` mode also lists sections where a club role carries
 *   consent:verify (`clubGrants.verify`).
 * - `GET /clubs` is NEVER used for verify-only viewers or for club-role holders:
 *   it is unscoped and would list unrelated clubs.
 * - Deduped by id in this priority: club approve grants and the unscoped
 *   approver list (approve), then club verify grants, then the coordinator
 *   scope. A section that is in both the viewer's club approve grants and the
 *   scope stays `approve` (club role authority); otherwise the scope's
 *   `verify-only` tag stands. A source may fail on its own; the page is
 *   unavailable only when a failing source leaves nothing to show.
 */
export async function loadReviewSectionOptions(
  mode: MembershipReviewMode,
  options: { includeCoordinatorScope?: boolean; clubGrants?: ClubGrantSections } = {},
): Promise<ReviewSectionOptions> {
  const grants: ClubGrantSections = options.clubGrants ?? {
    approve: [],
    verify: [],
    approveViaUnscopedList: false,
  };
  const withScope = mode === "verify-only" || options.includeCoordinatorScope === true;
  const withUnscopedList = mode === "approve" && grants.approveViaUnscopedList;

  const [scope, clubs] = await Promise.allSettled([
    withScope ? getMyCoordinatorScope() : Promise.resolve(null),
    withUnscopedList ? fetchClubSectionOptions() : Promise.resolve([] as ReviewSectionOption[]),
  ]);

  const merged = new Map<number, ReviewSectionOption>();
  const add = (list: ReviewSectionOption[]) => {
    for (const option of list) {
      if (!merged.has(option.club_section_id)) merged.set(option.club_section_id, option);
    }
  };

  if (mode === "approve") add(grants.approve);
  if (clubs.status === "fulfilled") add(clubs.value);
  if (mode === "verify-only") add(grants.verify);
  if (scope.status === "fulfilled" && scope.value) {
    add(coordinatorScopeToSectionOptions(scope.value.sections ?? []));
  }

  const coordinatorQueue =
    scope.status === "fulfilled" &&
    scope.value !== null &&
    scope.value.is_coordinator === true &&
    (scope.value.sections?.length ?? 0) > 0;

  const failure = [scope, clubs].find((r) => r.status === "rejected");
  if (failure && merged.size === 0) {
    return {
      sections: [],
      available: false,
      error: errorMessage((failure as PromiseRejectedResult).reason),
      coordinatorQueue,
    };
  }

  return { sections: [...merged.values()], available: true, coordinatorQueue };
}
