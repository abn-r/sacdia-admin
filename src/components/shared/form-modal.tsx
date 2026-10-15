"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matches the dialog exit duration so the route pops after the close animation. */
const EXIT_MS = 150;

type FormModalContextValue = {
  /** True when the form renders inside an intercepted-route modal. */
  inModal: boolean;
  /** Leave the form: pops the modal route, or navigates to `fallbackHref` on a full page. */
  close: () => void;
  /** Leave the form after a successful save and refresh the list behind it. */
  complete: () => void;
};

const FormModalContext = createContext<FormModalContextValue | null>(null);

/**
 * Form-side hook. Forms call `close()` on cancel and `complete()` on success so
 * the same component works as an intercepted modal and as a full page.
 */
export function useFormModal(fallbackHref: string): FormModalContextValue {
  const ctx = useContext(FormModalContext);
  const router = useRouter();
  return useMemo(
    () =>
      ctx ?? {
        inModal: false,
        close: () => router.push(fallbackHref),
        complete: () => {
          router.push(fallbackHref);
          router.refresh();
        },
      },
    [ctx, router, fallbackHref],
  );
}

type FrameProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Intercepted-route wrapper: renders the form in a dialog over the list.
 * Closing (Esc, overlay, X, Cancel) plays the exit animation, then `router.back()`.
 */
export function RouteFormModal({
  title,
  description,
  children,
  className,
}: FrameProps & { className?: string }) {
  const router = useRouter();
  const t = useTranslations("shared.formModal");
  const [open, setOpen] = useState(true);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => router.back(), EXIT_MS);
  }, [router]);

  const complete = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => {
      router.back();
      router.refresh();
    }, EXIT_MS);
  }, [router]);

  const value = useMemo(() => ({ inModal: true, close, complete }), [close, complete]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(90dvh,860px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </div>
          <Button variant="outline" size="icon-sm" onClick={close} aria-label={t("close")}>
            <X />
          </Button>
        </header>
        <FormModalContext.Provider value={value}>{children}</FormModalContext.Provider>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Full-page fallback (hard navigation / refresh on `/new`): same frame as the
 * modal, centered as a card so both entry points look identical.
 */
export function FormPageFrame({ title, description, children }: FrameProps) {
  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-transparent bg-card shadow-card">
      <header className="px-6 pt-5 pb-4">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}

/** Numbered step strip under the header. Steps are labels only; navigation stays in the footer. */
export function FormModalSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-3 overflow-x-auto border-y bg-muted/50 px-6 py-3 text-sm">
      {steps.map((label, index) => {
        const state = index < current ? "done" : index === current ? "active" : "pending";
        return (
          <li key={label} className="flex shrink-0 items-center gap-3">
            {index > 0 ? <span aria-hidden="true" className="h-px w-6 bg-border" /> : null}
            <span
              className="flex items-center gap-2"
              aria-current={state === "active" ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums transition-colors duration-150",
                  state === "active" && "bg-primary text-primary-foreground",
                  state === "done" && "bg-primary/10 text-primary",
                  state === "pending" && "bg-background text-muted-foreground ring-1 ring-border",
                )}
              >
                {state === "done" ? <Check className="size-3" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "font-medium",
                  state === "pending" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Scrollable form body. Pass `stepKey` + `direction` so a step change slides in
 * from the side it came from; reduced motion keeps only the fade.
 */
export function FormModalBody({
  children,
  className,
  stepKey,
  direction = "forward",
}: {
  children: ReactNode;
  className?: string;
  stepKey?: string | number;
  direction?: "forward" | "back";
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t px-6 py-5 [ol+&]:border-t-0">
      <div
        key={stepKey}
        className={cn(
          stepKey !== undefined &&
            "animate-in fade-in-0 duration-200 [animation-timing-function:var(--ease-out-expo)]",
          stepKey !== undefined &&
            (direction === "back" ? "motion-safe:slide-in-from-left-2" : "motion-safe:slide-in-from-right-2"),
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Sticky footer: optional "Step X of Y" on the left, actions on the right. */
export function FormModalFooter({
  children,
  step,
  total,
}: {
  children: ReactNode;
  step?: number;
  total?: number;
}) {
  const t = useTranslations("shared.formModal");
  return (
    <footer className="flex items-center justify-between gap-4 border-t px-6 py-4">
      <span className="text-sm text-muted-foreground tabular-nums">
        {step !== undefined && total !== undefined && total > 1
          ? t("stepOf", { current: step + 1, total })
          : null}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </footer>
  );
}
