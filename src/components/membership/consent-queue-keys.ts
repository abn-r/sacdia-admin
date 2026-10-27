/** Query key of the coordinator's aggregate consent queue (one entry per offset). */
export const CONSENT_QUEUE_KEY = ["membership", "consent-queue"] as const;
/** Per-section lists (MembershipRequestsClientPage); stale once a form is verified. */
export const SECTION_LISTS_KEY = ["membership", "requests"] as const;
