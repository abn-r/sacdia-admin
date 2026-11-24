import {
  resolveOnboardingMode,
  type OnboardingMode,
  type PostRegistrationStatus,
} from "@/lib/api/post-registration";

/** Tab ids of the user detail (`?tab=`). `summary` is the default and leaves the URL clean. */
export const USER_DETAIL_TABS = [
  "summary",
  "data",
  "health",
  "access",
  "honors",
  "classes",
  "post-registration",
] as const;

export type UserDetailTab = (typeof USER_DETAIL_TABS)[number];

export const USER_DETAIL_DEFAULT_TAB: UserDetailTab = "summary";

export interface UserDetailTabGates {
  /** `users:health.read`. */
  canSeeHealth: boolean;
  /** Administrative completion read gate (post-registration). */
  canSeePostRegistration: boolean;
}

/** Tabs the actor may open, in display order. A gated tab never appears. */
export function availableUserDetailTabs(gates: UserDetailTabGates): UserDetailTab[] {
  return USER_DETAIL_TABS.filter((tab) => {
    if (tab === "health") return gates.canSeeHealth;
    if (tab === "post-registration") return gates.canSeePostRegistration;
    return true;
  });
}

/**
 * Resolves the raw `?tab=` value. Unknown values and tabs the actor cannot see
 * fall back to the summary, so a hand-typed URL never widens what is shown.
 */
export function resolveUserDetailTab(
  raw: string | string[] | undefined,
  available: readonly UserDetailTab[],
): UserDetailTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const found = available.find((tab) => tab === value);
  return found ?? USER_DETAIL_DEFAULT_TAB;
}

export type PostRegistrationStepKey = keyof PostRegistrationStatus["steps"];

export const POST_REGISTRATION_STEP_ORDER: readonly PostRegistrationStepKey[] = [
  "profilePicture",
  "personalInfo",
  "clubSelection",
];

/** Steps the account actually walks: `club` has all three, `club_exempt` skips the club, `panel_only` none. */
export function applicablePostRegistrationSteps(
  mode: OnboardingMode,
): PostRegistrationStepKey[] {
  if (mode === "panel_only") return [];
  if (mode === "club_exempt") return ["profilePicture", "personalInfo"];
  return [...POST_REGISTRATION_STEP_ORDER];
}

/** Only steps 1 and 2 can be forced from the panel; the club step needs the person's own data. */
export function isStepForceable(step: PostRegistrationStepKey): boolean {
  return step !== "clubSelection";
}

export type PostRegistrationSummary =
  | { state: "not_applicable"; missing: [] }
  | { state: "complete"; missing: [] }
  | { state: "pending"; missing: PostRegistrationStepKey[] };

/** Current state plus what is missing: the only thing the Post-registro tab shows. */
export function summarizePostRegistration(
  status: PostRegistrationStatus,
): PostRegistrationSummary {
  const mode = resolveOnboardingMode(status);
  if (mode === "panel_only") return { state: "not_applicable", missing: [] };
  const missing = applicablePostRegistrationSteps(mode).filter(
    (step) => !status.steps[step],
  );
  if (status.complete || missing.length === 0) return { state: "complete", missing: [] };
  return { state: "pending", missing };
}

export type AccessField = "access_app" | "access_panel" | "active";

/** Ids of the confirmation copy (`people.userDetail.access.confirm.<id>`). */
export type AccessChangeId =
  | "appOn"
  | "appOff"
  | "panelOn"
  | "panelOff"
  | "activeOn"
  | "activeOff";

export function accessChangeId(field: AccessField, next: boolean): AccessChangeId {
  const base = field === "access_app" ? "app" : field === "access_panel" ? "panel" : "active";
  return `${base}${next ? "On" : "Off"}` as AccessChangeId;
}

/** Turning an access off, or deactivating the account, is the risky direction. */
export function isRiskyAccessChange(next: boolean): boolean {
  return !next;
}

export type SectionLoad<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

/** Narrows a `Promise.allSettled` entry into a value or the error to translate. */
export function toSectionLoad<T>(result: PromiseSettledResult<T>): SectionLoad<T> {
  return result.status === "fulfilled"
    ? { ok: true, value: result.value }
    : { ok: false, error: result.reason };
}
