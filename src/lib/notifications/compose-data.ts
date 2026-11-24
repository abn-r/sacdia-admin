import { getNotificationStats } from "@/lib/api/notifications";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import {
  listAuthorizedNotificationClubTargets,
  type NotificationClubTarget,
} from "@/lib/notifications/club-targets";

export type NotificationComposePermissions = {
  /** "Una persona" (`notifications:send`). */
  person: boolean;
  /** "Club o sección" (`notifications:club`). */
  club: boolean;
  /** "Todos" (`notifications:broadcast`). */
  everyone: boolean;
};

export type NotificationComposeData = {
  permissions: NotificationComposePermissions;
  clubTargets: NotificationClubTarget[];
  clubTargetsLoadError: boolean;
  /**
   * Devices a general broadcast reaches. The API has no per-audience count:
   * this is `activeTokens` from `/admin/notifications/stats`, i.e. every
   * registered device. `null` when the figure could not be loaded.
   */
  deviceCount: number | null;
};

export function resolveComposePermissions(user: AuthUser): NotificationComposePermissions {
  return {
    person: canCapability(user, "notifications-hub", "send_direct"),
    club: canCapability(user, "notifications-hub", "send_club"),
    everyone: canCapability(user, "notifications-hub", "broadcast"),
  };
}

export function canComposeAny(permissions: NotificationComposePermissions): boolean {
  return permissions.person || permissions.club || permissions.everyone;
}

/** Shared by `/notifications/new` and its intercepted modal. `null` = no permission to send. */
export async function loadNotificationComposeData(
  user: AuthUser,
): Promise<NotificationComposeData | null> {
  const permissions = resolveComposePermissions(user);
  if (!canComposeAny(permissions)) return null;

  let clubTargets: NotificationClubTarget[] = [];
  let clubTargetsLoadError = false;
  if (permissions.club) {
    try {
      clubTargets = await listAuthorizedNotificationClubTargets();
    } catch {
      clubTargetsLoadError = true;
    }
  }

  let deviceCount: number | null = null;
  if (permissions.everyone) {
    try {
      deviceCount = (await getNotificationStats(30)).activeTokens;
    } catch {
      deviceCount = null;
    }
  }

  return { permissions, clubTargets, clubTargetsLoadError, deviceCount };
}
