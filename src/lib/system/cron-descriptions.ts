/**
 * What a manual "Ejecutar ahora" will do, in the words of each scheduled job.
 * Maps a job name to a message key under `admin.system.runDescriptions`; jobs
 * the admin does not know yet fall back to the generic text.
 */

export const CRON_RUN_DESCRIPTION_KEYS = {
  "monthly-reports-auto-generate": "monthlyReports",
  "rankings-recalculate": "annualProgress",
  "data-export-cleanup": "dataExportCleanup",
  "member-of-month-auto-evaluate": "memberOfMonth",
  "finance-period-closing": "financePeriod",
  "activities-reminder": "activitiesReminder",
  "membership-requests-expiry": "membershipExpiry",
  "cleanup-expired-records": "cleanupExpired",
  "fcm-tokens-cleanup": "fcmCleanup",
  "annual-reports-auto-generate": "annualReports",
  "quarterly-reports-auto-generate": "quarterlyReports",
  "monthly-reports-reminders": "monthlyReportsReminders",
  "cron-alert-check": "cronAlertCheck",
  "fcm-tokens-stale-cleanup": "fcmStaleCleanup",
  "dependent-profiles-purge": "dependentProfilesPurge",
  "family-age-transitions": "familyAgeTransitions",
  "family-majority-release": "familyMajorityRelease",
  "pending-teen-guardian": "pendingTeenGuardian",
  "investiture-achievement-intent": "investitureAchievementIntent",
  "investiture-authorization-reminders": "investitureAuthReminders",
  "ecclesiastical-year-cut": "ecclesiasticalYearCut",
} as const;

export type CronRunDescriptionKey =
  | (typeof CRON_RUN_DESCRIPTION_KEYS)[keyof typeof CRON_RUN_DESCRIPTION_KEYS]
  | "generic";

export function getCronRunDescriptionKey(jobName: string): CronRunDescriptionKey {
  return Object.hasOwn(CRON_RUN_DESCRIPTION_KEYS, jobName)
    ? CRON_RUN_DESCRIPTION_KEYS[jobName as keyof typeof CRON_RUN_DESCRIPTION_KEYS]
    : "generic";
}

/** Jobs that notify real people again when re-run. Used to flag the dialog action. */
export function cronRunNotifiesPeople(jobName: string): boolean {
  return NOTIFYING.has(jobName);
}

const NOTIFYING: ReadonlySet<string> = new Set([
  "activities-reminder",
  "cron-alert-check",
  "monthly-reports-reminders",
  "member-of-month-auto-evaluate",
  "pending-teen-guardian",
  "family-age-transitions",
  "family-majority-release",
  "investiture-authorization-reminders",
  "ecclesiastical-year-cut",
]);

/** Name of the month before `now`, in the given locale (the month "Miembro del mes" evaluates). */
export function previousMonthName(now: Date, locale: string): string {
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 12));
  return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(prev);
}
