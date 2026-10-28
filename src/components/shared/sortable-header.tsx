"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export interface SortableHeaderProps<TField extends string> {
  field: TField;
  activeField?: TField | null;
  direction?: SortDirection;
  onSort: (field: TField, direction: SortDirection) => void;
  children: ReactNode;
  /**
   * Visible column label used in the accessible name ("Sort by <label>").
   * Defaults to the text content of `children`; falls back to the field key
   * only when neither is available.
   */
  label?: string;
  align?: "left" | "right";
  className?: string;
}

/** Extracts the plain text of a ReactNode (strings, numbers, nested elements). */
export function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return Children.toArray(node).map(getNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }
  return "";
}

export function SortableHeader<TField extends string>({
  field,
  activeField,
  direction,
  onSort,
  children,
  label,
  align = "left",
  className,
}: SortableHeaderProps<TField>) {
  const t = useTranslations("shared.sortable");

  const columnLabel = (label ?? getNodeText(children)).trim() || field;

  const isActive = activeField === field;
  const nextDirection: SortDirection =
    isActive && direction === "asc" ? "desc" : "asc";

  const Icon = !isActive
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  const ariaLabel = isActive
    ? direction === "asc"
      ? t("sortedAscending", { field: columnLabel })
      : t("sortedDescending", { field: columnLabel })
    : t("sortBy", { field: columnLabel });

  return (
    <button
      type="button"
      onClick={() => onSort(field, nextDirection)}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        align === "right" && "ml-auto",
        isActive && "text-foreground",
        className,
      )}
    >
      <span>{children}</span>
      <Icon
        className={cn(
          "size-3.5 shrink-0 transition-opacity",
          isActive ? "opacity-100" : "opacity-50",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
