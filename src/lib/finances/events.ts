/**
 * Fired on `window` after a movement was created or edited in the route modal,
 * so the list underneath (which loads client-side) reloads. `router.refresh()`
 * alone does not re-run client fetches.
 */
export const FINANCES_CHANGED_EVENT = "sacdia:finances-changed";

export function notifyFinancesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FINANCES_CHANGED_EVENT));
}
