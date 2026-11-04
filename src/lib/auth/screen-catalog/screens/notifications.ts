import {
  NOTIFICATIONS_BROADCAST,
  NOTIFICATIONS_CLUB,
  NOTIFICATIONS_SEND,
} from "@/lib/auth/permissions";

import type { ScreenDefinition } from "../types";
import { capabilityAccess, viewOnlyScreen } from "./_helpers";

const NOTIFICATION_SENDER_PERMISSIONS = [
  NOTIFICATIONS_SEND,
  NOTIFICATIONS_BROADCAST,
  NOTIFICATIONS_CLUB,
];

export const notificationsScreens: ScreenDefinition[] = [
  {
    id: "notifications-hub",
    surfaces: ["admin"],
    // Hub: POST /notifications/{send,broadcast,club} —
    // notifications.controller.ts:118,136,155. Permission-only, no @GlobalRoles.
    viewAny: { permissions: [...NOTIFICATION_SENDER_PERMISSIONS] },
    capabilities: [
      {
        id: "send_direct",
        kind: "button",
        gate: { permissions: [NOTIFICATIONS_SEND] },
      },
      {
        id: "broadcast",
        kind: "button",
        gate: { permissions: [NOTIFICATIONS_BROADCAST] },
      },
      {
        id: "send_club",
        kind: "button",
        gate: { permissions: [NOTIFICATIONS_CLUB] },
      },
    ],
  },
  viewOnlyScreen("notifications-history", {
    permissions: [...NOTIFICATION_SENDER_PERMISSIONS],
  }),
  {
    // Platform configuration (`system.config.read`); PATCH settings share it.
    id: "notifications-categories",
    surfaces: ["admin"],
    viewAny: capabilityAccess("system.config.read"),
    capabilities: [
      { id: "update", kind: "button", gate: capabilityAccess("system.config.read") },
    ],
  },
];
