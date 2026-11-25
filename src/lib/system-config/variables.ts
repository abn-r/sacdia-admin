import type { SystemConfig } from "@/lib/api/system-config";

/**
 * Pure logic of the Variables screen: grouping by key prefix, the control that
 * fits each value type, validation and the diff sent on save. The backend
 * stores every value as a string and does not validate the type, so the screen
 * is the only guard.
 */

export type VariableControl = "boolean" | "number" | "json" | "text";

export interface VariableGroup {
  /** Key prefix (`investiture` for `investiture.reminder_days`). */
  prefix: string;
  configs: SystemConfig[];
}

export const GENERAL_GROUP = "general";

export function keyPrefix(key: string): string {
  const dot = key.indexOf(".");
  return dot > 0 ? key.slice(0, dot) : GENERAL_GROUP;
}

/** Groups keep the order of first appearance; keys inside a group keep theirs. */
export function groupVariables(configs: readonly SystemConfig[]): VariableGroup[] {
  const groups = new Map<string, SystemConfig[]>();
  for (const config of configs) {
    const prefix = keyPrefix(config.config_key);
    const list = groups.get(prefix);
    if (list) list.push(config);
    else groups.set(prefix, [config]);
  }
  return Array.from(groups, ([prefix, list]) => ({ prefix, configs: list }));
}

export function humanizePrefix(prefix: string): string {
  return prefix
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function controlFor(valueType: SystemConfig["value_type"]): VariableControl {
  switch (typeof valueType === "string" ? valueType.trim().toLowerCase() : "") {
    case "boolean":
    case "bool":
      return "boolean";
    case "number":
    case "integer":
    case "int":
    case "float":
      return "number";
    case "json":
    case "object":
    case "array":
      return "json";
    default:
      return "text";
  }
}

export type VariableErrorCode = "required" | "number" | "json";

export function validateVariable(control: VariableControl, raw: string): VariableErrorCode | null {
  const value = raw.trim();
  switch (control) {
    case "boolean":
      return null;
    case "number":
      if (value === "") return "required";
      return Number.isFinite(Number(value)) ? null : "number";
    case "json":
      if (value === "") return "required";
      try {
        JSON.parse(value);
        return null;
      } catch {
        return "json";
      }
    case "text":
      return value === "" ? "required" : null;
  }
}

export function isTruthyValue(raw: string): boolean {
  return raw.trim().toLowerCase() === "true";
}

export interface VariableChange {
  key: string;
  value: string;
}

/** Only the keys whose draft differs from the saved value, in list order. */
export function diffVariables(
  configs: readonly SystemConfig[],
  drafts: Readonly<Record<string, string>>,
): VariableChange[] {
  const changes: VariableChange[] = [];
  for (const config of configs) {
    const draft = drafts[config.config_key];
    if (draft === undefined || draft === config.config_value) continue;
    changes.push({ key: config.config_key, value: draft });
  }
  return changes;
}

/** Keys with a draft that does not pass validation (blocks saving). */
export function invalidVariables(
  configs: readonly SystemConfig[],
  drafts: Readonly<Record<string, string>>,
): Record<string, VariableErrorCode> {
  const errors: Record<string, VariableErrorCode> = {};
  for (const change of diffVariables(configs, drafts)) {
    const config = configs.find((c) => c.config_key === change.key);
    const code = validateVariable(controlFor(config?.value_type), change.value);
    if (code) errors[change.key] = code;
  }
  return errors;
}
