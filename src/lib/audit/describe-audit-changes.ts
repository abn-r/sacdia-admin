/**
 * Turns the `changes` JSON of an audit row into plain entries: what was
 * added, removed or changed. Backends write two shapes: a diff per field
 * (`{ name: { from, to } }`) and flat details (`{ permission_id: "..." }`).
 */

export type AuditChangeValue =
  | { kind: "text"; text: string }
  | { kind: "bool"; value: boolean }
  | { kind: "empty" };

export type AuditChangeEntry = {
  kind: "added" | "removed" | "changed" | "detail";
  /** Raw key as stored; the UI prettifies it. */
  field: string;
  from?: AuditChangeValue;
  to?: AuditChangeValue;
  value?: AuditChangeValue;
};

const MAX_TEXT = 160;

export function toChangeValue(raw: unknown): AuditChangeValue {
  if (raw === null || raw === undefined || raw === "") return { kind: "empty" };
  if (typeof raw === "boolean") return { kind: "bool", value: raw };
  if (typeof raw === "string") return { kind: "text", text: clip(raw) };
  if (typeof raw === "number" || typeof raw === "bigint") return { kind: "text", text: String(raw) };
  if (Array.isArray(raw)) {
    return raw.length === 0 ? { kind: "empty" } : { kind: "text", text: clip(raw.map(plain).join(", ")) };
  }
  return { kind: "text", text: clip(JSON.stringify(raw)) };
}

function plain(raw: unknown): string {
  return typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw);
}

function clip(text: string): string {
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDiffPair(value: unknown): value is { from?: unknown; to?: unknown } {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.length <= 2 && keys.every((k) => k === "from" || k === "to");
}

function isEmpty(raw: unknown): boolean {
  return raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0);
}

function sameItem(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function describeAuditChanges(changes: unknown): AuditChangeEntry[] {
  if (!isRecord(changes)) return [];
  const entries: AuditChangeEntry[] = [];

  for (const [field, raw] of Object.entries(changes)) {
    if (isDiffPair(raw)) {
      const { from, to } = raw;
      if (Array.isArray(from) || Array.isArray(to)) {
        const before = Array.isArray(from) ? from : [];
        const after = Array.isArray(to) ? to : [];
        for (const item of after) {
          if (!before.some((b) => sameItem(b, item))) {
            entries.push({ kind: "added", field, value: toChangeValue(item) });
          }
        }
        for (const item of before) {
          if (!after.some((a) => sameItem(a, item))) {
            entries.push({ kind: "removed", field, value: toChangeValue(item) });
          }
        }
        continue;
      }
      if (isEmpty(from) && isEmpty(to)) continue;
      if (isEmpty(from)) {
        entries.push({ kind: "added", field, value: toChangeValue(to) });
      } else if (isEmpty(to)) {
        entries.push({ kind: "removed", field, value: toChangeValue(from) });
      } else if (!sameItem(from, to)) {
        entries.push({ kind: "changed", field, from: toChangeValue(from), to: toChangeValue(to) });
      }
      continue;
    }

    // `{ added: [...], removed: [...] }` lists.
    if (isRecord(raw) && ("added" in raw || "removed" in raw)) {
      for (const item of Array.isArray(raw.added) ? raw.added : []) {
        entries.push({ kind: "added", field, value: toChangeValue(item) });
      }
      for (const item of Array.isArray(raw.removed) ? raw.removed : []) {
        entries.push({ kind: "removed", field, value: toChangeValue(item) });
      }
      continue;
    }

    if (isEmpty(raw)) continue;
    entries.push({ kind: "detail", field, value: toChangeValue(raw) });
  }

  return entries;
}

/** `permission_ids` / `memberOfMonth` -> `Permission ids` / `Member of month`. */
export function prettifyChangeField(field: string): string {
  const spaced = field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : field;
}
