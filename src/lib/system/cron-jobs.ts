/**
 * Scheduled (cron) jobs known to the admin: single source of truth for the
 * jobs page and the run history. Each job maps to a label key under the
 * `system_jobs.cronRuns` i18n namespace. Jobs missing here (e.g. added in the
 * backend later) must fall back to backend data / the raw name.
 */

export const CRON_JOB_LABEL_KEYS = {
  "monthly-reports-auto-generate":       "jobMonthlyReports",
  "rankings-recalculate":                "jobRankingsRecalculate",
  "data-export-cleanup":                 "jobDataExportCleanup",
  "member-of-month-auto-evaluate":       "jobMemberOfMonth",
  "finance-period-closing":              "jobFinancePeriod",
  "activities-reminder":                 "jobActivitiesReminder",
  "membership-requests-expiry":          "jobMembershipExpiry",
  "cleanup-expired-records":             "jobCleanupExpired",
  "fcm-tokens-cleanup":                  "jobFcmCleanup",
  "annual-reports-auto-generate":        "jobAnnualReports",
  "quarterly-reports-auto-generate":     "jobQuarterlyReports",
  "monthly-reports-reminders":           "jobMonthlyReportsReminders",
  "cron-alert-check":                    "jobCronAlertCheck",
  "fcm-tokens-stale-cleanup":            "jobFcmStaleCleanup",
  "dependent-profiles-purge":            "jobDependentProfilesPurge",
  "family-age-transitions":              "jobFamilyAgeTransitions",
  "pending-teen-guardian":               "jobPendingTeenGuardian",
  "investiture-achievement-intent":      "jobInvestitureAchievementIntent",
  "investiture-authorization-reminders": "jobInvestitureAuthReminders",
  "ecclesiastical-year-cut":             "jobEcclesiasticalYearCut",
} as const;

export type CronJobName = keyof typeof CRON_JOB_LABEL_KEYS;
export type CronJobLabelKey = (typeof CRON_JOB_LABEL_KEYS)[CronJobName];

export const CRON_JOB_NAMES = Object.keys(CRON_JOB_LABEL_KEYS) as CronJobName[];

/** Label key for a job name, or undefined when the job is not known to the admin. */
export function getCronJobLabelKey(jobName: string): CronJobLabelKey | undefined {
  return Object.hasOwn(CRON_JOB_LABEL_KEYS, jobName)
    ? CRON_JOB_LABEL_KEYS[jobName as CronJobName]
    : undefined;
}
