import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";

/**
 * "StatusBadge only marks the exception": renders nothing for the normal
 * values and a badge for everything else.
 */
export function ExceptionStatus<T extends string>({
  value,
  normal,
  labels,
  intents,
}: {
  value: T;
  normal: T[];
  labels: Record<T, string>;
  intents: Partial<Record<T, StatusIntent>>;
}) {
  if (normal.includes(value)) return null;
  return <StatusBadge intent={intents[value] ?? "neutral"} label={labels[value]} />;
}
