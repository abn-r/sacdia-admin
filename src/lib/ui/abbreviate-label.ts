/** Short label for compact UI (mobile chips, dense headers). */
export function abbreviateLabel(text: string, maxLength = 10): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  if (maxLength <= 1) return "…";
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

/** Compact ecclesiastical year labels, e.g. "2024-2025" → "24-25". */
export function abbreviateYearLabel(name: string): string {
  const match = name.match(/(\d{2,4})\D+(\d{2,4})/);
  if (match) {
    return `${match[1].slice(-2)}-${match[2].slice(-2)}`;
  }
  return abbreviateLabel(name, 8);
}
