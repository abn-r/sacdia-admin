// Pure helpers shared by the request queues (server pages and client components).

/** From this many days a pending request is shown in amber. */
export const LONG_WAIT_DAYS = 14;

const DAY_MS = 86_400_000;

export function waitingDays(createdAt: string, now: number = Date.now()): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now - created) / DAY_MS));
}

export function isLongWait(createdAt: string, now?: number): boolean {
  return waitingDays(createdAt, now) >= LONG_WAIT_DAYS;
}
