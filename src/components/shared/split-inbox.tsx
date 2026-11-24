"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SplitInboxProps<T> {
  items: T[];
  getId: (item: T) => string;
  /** Body of each row (number and selection tint are added by the inbox). */
  renderItem: (item: T, ctx: { index: number; selected: boolean }) => ReactNode;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  detail: ReactNode;
  footer?: ReactNode;
  emptyTitle?: string;
  listLabel?: string;
  className?: string;
}

export function SplitInbox<T>({
  items,
  getId,
  renderItem,
  selectedId,
  onSelect,
  detail,
  footer,
  emptyTitle,
  listLabel,
  className,
}: SplitInboxProps<T>) {
  const t = useTranslations("shared.kit.splitInbox");
  const baseId = useId();
  const selectedIndex = items.findIndex((item) => getId(item) === selectedId);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (items.length === 0) return;
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      selectedIndex < 0 ? (delta > 0 ? 0 : items.length - 1) : Math.min(items.length - 1, Math.max(0, selectedIndex + delta));
    const next = items[nextIndex];
    if (next !== undefined) onSelect(getId(next));
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
        {emptyTitle ?? t("empty")}
      </div>
    );
  }

  const activeOptionId = selectedIndex >= 0 ? `${baseId}-opt-${selectedIndex}` : undefined;

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <div
          role="listbox"
          tabIndex={0}
          aria-label={listLabel}
          aria-activedescendant={activeOptionId}
          onKeyDown={handleKeyDown}
          className="max-h-96 divide-y overflow-y-auto border-b outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:max-h-[70vh] lg:border-r lg:border-b-0"
        >
          {items.map((item, index) => {
            const id = getId(item);
            const selected = id === selectedId;
            return (
              <div
                key={id}
                id={`${baseId}-opt-${index}`}
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(id)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                  selected ? "bg-primary-soft text-primary-soft-foreground" : "hover:bg-muted/50",
                )}
              >
                <span className="w-6 shrink-0 pt-0.5 text-muted-foreground text-xs tabular-nums">{index + 1}</span>
                <div className="min-w-0 flex-1">{renderItem(item, { index, selected })}</div>
              </div>
            );
          })}
        </div>
        <div className="min-w-0 p-5">{detail}</div>
      </div>
      {footer && <div className="sticky bottom-0 border-t bg-card px-5 py-3">{footer}</div>}
    </div>
  );
}

export interface SplitInboxItemContentProps {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
}

/** Standard row body: title + muted subtitle on the left, status node on the right. */
export function SplitInboxItemContent({ title, subtitle, status }: SplitInboxItemContentProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{title}</p>
        {subtitle && <p className="truncate text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      {status && <div className="shrink-0">{status}</div>}
    </div>
  );
}

export interface SplitInboxFooterProps {
  /** Title of the next item; omit on the last one. */
  nextLabel?: string;
  onSaveNext: () => void;
  pending?: boolean;
  extra?: ReactNode;
}

export function SplitInboxFooter({ nextLabel, onSaveNext, pending = false, extra }: SplitInboxFooterProps) {
  const t = useTranslations("shared.kit.splitInbox");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 truncate text-muted-foreground text-sm">
        {nextLabel ? t("next", { title: nextLabel }) : null}
      </p>
      <div className="flex items-center gap-2">
        {extra}
        <Button type="button" onClick={onSaveNext} disabled={pending}>
          {t("saveNext")}
        </Button>
      </div>
    </div>
  );
}
