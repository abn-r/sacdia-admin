"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export interface SortableHeaderProps<TField extends string> {
  field: TField;
  activeField?: TField | null;
  direction?: SortDirection;
  onSort: (field: TField, direction: SortDirection) => void;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function SortableHeader<TField extends string>({
  field,
  activeField,
  direction,
  onSort,
  children,
  align = "left",
  className,
}: SortableHeaderProps<TField>) {
  const isActive = activeField === field;
  const nextDirection: SortDirection =
    isActive && direction === "asc" ? "desc" : "asc";

  const Icon = !isActive
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(field, nextDirection)}
      aria-label={
        isActive
          ? `Ordenado por ${field} ${direction === "asc" ? "ascendente" : "descendente"}. Click para invertir.`
          : `Ordenar por ${field}`
      }
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
