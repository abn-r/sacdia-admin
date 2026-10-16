"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon?: LucideIcon;
  /** Navigation target. Takes precedence over onSelect. */
  href?: string;
  /** Open `href` in a new tab (files, external resources). */
  external?: boolean;
  onSelect?: () => void;
  /** Destructive actions render last, in red, after a separator. End the label with "…" when a confirmation follows. */
  destructive?: boolean;
  disabled?: boolean;
  /** Omit the action (e.g. missing permission) without building the array conditionally. */
  hidden?: boolean;
};

interface RowActionsProps {
  /** Entity name, used for the trigger's accessible label ("Acciones de {name}"). */
  label: string;
  actions: RowAction[];
  /**
   * Review queues only: up to two explicit decision buttons (e.g. Rechazar /
   * Aprobar) rendered before the menu. CRUD tables leave this empty — the row
   * name is the primary action.
   */
  primary?: ReactNode;
  className?: string;
}

/**
 * The single row-actions pattern for data tables (DESIGN-SYSTEM.md "Acciones
 * en tablas"): one "⋯" menu, right-aligned, non-destructive actions first and
 * destructive ones last after a separator. No hover-reveal, no loose icons.
 */
export function RowActions({ label, actions, primary, className }: RowActionsProps) {
  const t = useTranslations("shared.uiPrimitives");
  const visible = actions.filter((action) => !action.hidden);
  const regular = visible.filter((action) => !action.destructive);
  const destructive = visible.filter((action) => action.destructive);

  if (!primary && visible.length === 0) return null;

  return (
    <div className={cn("flex items-center justify-end gap-1.5", className)}>
      {primary}
      {visible.length > 0 ? (
        // Non-modal so an AlertDialog opened from an item doesn't inherit a locked body.
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("rowActions", { name: label })}
              className="text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {regular.map((action) => (
              <RowActionItem key={action.label} action={action} />
            ))}
            {regular.length > 0 && destructive.length > 0 ? <DropdownMenuSeparator /> : null}
            {destructive.map((action) => (
              <RowActionItem key={action.label} action={action} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

function RowActionItem({ action }: { action: RowAction }) {
  const Icon = action.icon;
  const content = (
    <Fragment>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {action.label}
    </Fragment>
  );

  if (action.href && !action.disabled) {
    return (
      <DropdownMenuItem asChild variant={action.destructive ? "destructive" : "default"}>
        {action.external ? (
          <a href={action.href} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        ) : (
          <Link href={action.href}>{content}</Link>
        )}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      variant={action.destructive ? "destructive" : "default"}
      disabled={action.disabled}
      onSelect={action.onSelect}
    >
      {content}
    </DropdownMenuItem>
  );
}

/**
 * Header cell for the row-actions column: no visible text (the "⋯" speaks for
 * itself), an accessible label, and a width that fits the trigger. Pass a wider
 * class when the row also shows `primary` decision buttons.
 */
export function RowActionsHead({ className }: { className?: string }) {
  const t = useTranslations("shared.uiPrimitives");
  return (
    <TableHead className={cn("w-12 text-right", className)}>
      <span className="sr-only">{t("rowActionsColumn")}</span>
    </TableHead>
  );
}
