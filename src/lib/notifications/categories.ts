export const NOTIFICATION_CATEGORIES = [
  "activities",
  "achievements",
  "approvals",
  "invitations",
  "reminders",
  "investiture",
  "validation",
  "requests",
  "camporees",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const MOBILE_APP_CATEGORIES = [
  "activities",
  "achievements",
  "approvals",
  "invitations",
  "reminders",
] as const satisfies ReadonlyArray<NotificationCategory>;

export type NotificationCategorySetting = {
  id: NotificationCategory;
  mobileEnabled: boolean;
  defaultEnabled: boolean;
  mobileAppVisible: boolean;
};

export function buildDefaultCategorySettings(): NotificationCategorySetting[] {
  const mobileVisible = new Set<string>(MOBILE_APP_CATEGORIES);

  return NOTIFICATION_CATEGORIES.map((id) => ({
    id,
    mobileEnabled: mobileVisible.has(id),
    defaultEnabled: true,
    mobileAppVisible: mobileVisible.has(id),
  }));
}
