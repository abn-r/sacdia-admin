import type { StatusIntent } from "@/components/ui/status-badge";

/**
 * Intent for boolean record states (active, access granted, completed).
 * The brand accent is reserved for actions, so an enabled flag reads as
 * success and a disabled one as neutral.
 */
export function flagStatusIntent(enabled: boolean): StatusIntent {
  return enabled ? "success" : "neutral";
}
