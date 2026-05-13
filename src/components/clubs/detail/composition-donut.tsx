"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SectionView } from "./types";

interface CompositionDonutProps {
  sections: SectionView[];
  total: number;
}

const RADIUS = 62;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CompositionDonut({ sections, total }: CompositionDonutProps) {
  const t = useTranslations("clubs.pages.detail.donut");

  const safeTotal = Math.max(total, 1);
  let offset = 0;

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr]">
      <div className="relative mx-auto h-40 w-40">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="18"
          />
          {total === 0 && (
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke="var(--color-muted-foreground)"
              strokeOpacity="0.2"
              strokeWidth="18"
              strokeDasharray={`${CIRCUMFERENCE} 0`}
            />
          )}
          {total > 0 &&
            sections.map((s, i) => {
              const pct = s.members / safeTotal;
              const len = CIRCUMFERENCE * pct;
              const dash = `${len} ${CIRCUMFERENCE - len}`;
              const dashOffset = -offset;
              offset += len;
              return (
                <circle
                  key={s.kind + i}
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  className={s.meta.barBg.replace("bg-", "stroke-")}
                  stroke="currentColor"
                  strokeWidth="18"
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-2xl font-extrabold leading-none tracking-tight text-foreground">
              {total}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("centerLabel")}
            </div>
          </div>
        </div>
      </div>

      <ul className="grid gap-2">
        {sections.length === 0 && (
          <li className="text-sm text-muted-foreground">
            {t("noSections")}
          </li>
        )}
        {sections.map((s) => {
          const pct = total > 0 ? Math.round((s.members / safeTotal) * 100) : 0;
          return (
            <li
              key={s.kind + (s.sectionId ?? "")}
              className="grid grid-cols-[14px_1fr_auto_auto] items-center gap-3 border-b border-border/60 py-2 last:border-0"
            >
              <span
                className={cn("size-3 rounded-sm", s.meta.barBg)}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {s.label}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {s.range} · {s.unitsCount}u
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {pct}%
              </span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {s.members}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
