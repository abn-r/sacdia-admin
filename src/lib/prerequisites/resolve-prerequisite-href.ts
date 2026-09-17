import {
  canViewScreen,
  getScreen,
  resolveScreenPath,
  type AccessSubject,
} from "@/lib/auth/screen-catalog";

/** Href to the setup screen, or null when the actor cannot open it. */
export function resolvePrerequisiteHref(
  subject: AccessSubject,
  screenId: string,
): string | null {
  if (!canViewScreen(subject, screenId)) {
    return null;
  }
  const screen = getScreen(screenId);
  if (!screen) {
    return null;
  }
  return resolveScreenPath(screen) ?? null;
}
