/** Window event that asks the global search dialog (header, Cmd+J) to open. */
export const OPEN_SEARCH_EVENT = "sacdia:open-search";

/** Opens the global search dialog from anywhere on the client. */
export function openGlobalSearch(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}
