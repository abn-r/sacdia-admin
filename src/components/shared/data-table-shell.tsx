"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type DataTableShellProps = HTMLAttributes<HTMLDivElement>;

export function DataTableShell({
  className,
  children,
  ...props
}: DataTableShellProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const overflowing = el.scrollWidth > el.clientWidth + 1;
      if (!overflowing) {
        setAtStart(true);
        setAtEnd(true);
        return;
      }
      setAtStart(el.scrollLeft <= 0);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const maskStyle: React.CSSProperties = {};
  if (!atStart && !atEnd) {
    maskStyle.maskImage =
      "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)";
    maskStyle.WebkitMaskImage = maskStyle.maskImage;
  } else if (!atEnd) {
    maskStyle.maskImage =
      "linear-gradient(to right, black calc(100% - 24px), transparent)";
    maskStyle.WebkitMaskImage = maskStyle.maskImage;
  } else if (!atStart) {
    maskStyle.maskImage =
      "linear-gradient(to right, transparent, black 24px)";
    maskStyle.WebkitMaskImage = maskStyle.maskImage;
  }

  return (
    <div
      ref={scrollRef}
      data-scrolled-start={atStart}
      data-scrolled-end={atEnd}
      className={cn(
        "overflow-x-auto overflow-y-hidden rounded-xl border border-border/60 bg-card shadow-xs",
        className,
      )}
      style={maskStyle}
      {...props}
    >
      {children}
    </div>
  );
}
