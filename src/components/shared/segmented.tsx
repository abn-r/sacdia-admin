"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
};

/**
 * Pick one of a few options in a row (view, type, audience, modality, weekday).
 * For choosing only — never a progress indicator for steps.
 * A radio group: arrows move, one stop in the tab order. The chosen option is
 * the raised one; no color is needed to read the state.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  labelledBy,
  className,
  size = "default",
  fill = false,
  disabled = false,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name when there is no visible label wired with `labelledBy`. */
  label?: string;
  labelledBy?: string;
  className?: string;
  size?: "default" | "sm";
  /** Stretch to the container with equal-width options. */
  fill?: boolean;
  disabled?: boolean;
}) {
  function move(from: number, delta: number, group: HTMLElement | null) {
    const target = (from + delta + options.length) % options.length;
    const next = options[target];
    if (!next || next.disabled) return;
    onChange(next.value);
    (group?.children[target] as HTMLElement | undefined)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn(
        "items-center gap-1 rounded-lg bg-muted p-1",
        fill ? "flex w-full" : "inline-flex w-fit max-w-full",
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1, event.currentTarget.parentElement);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1, event.currentTarget.parentElement);
              }
            }}
            className={cn(
              "rounded-md font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
              size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm",
              fill && "min-h-8 flex-1 text-center",
              checked ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
