"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
 * Renders a create/edit form in a dialog over its list.
 * - Intercepted route (client navigation): closing plays the exit animation, then `router.back()`.
 * - Direct load / refresh: the page renders the list underneath and passes `dismissHref`,
 *   so closing replaces the URL with the list instead of leaving the app.
 */
export function RouteFormModal({
  title,
  description,
  children,
  className,
  dismissHref,
}: FrameProps & { className?: string; dismissHref?: string }) {
  const router = useRouter();
  const t = useTranslations("shared.formModal");
  const [open, setOpen] = useState(true);

  const leave = useCallback(() => {
    if (dismissHref) {
      router.replace(dismissHref);
    } else {
      router.back();
    }
  }, [router, dismissHref]);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(leave, EXIT_MS);
  }, [leave]);

  const complete = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => {
      leave();
      router.refresh();
    }, EXIT_MS);
  }, [leave, router]);

  const value = useMemo(() => ({ inModal: true, close, complete }), [close, complete]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        // Land focus on the dialog itself, not the close button (a focus ring on
        // open reads as an error) nor the first field (opens the phone keyboard).
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        className={cn(
          "flex max-h-[min(90dvh,860px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          // Phones: a bottom sheet (full width, thumb-reachable actions) that slides up.
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92dvh] max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none",
          "max-sm:data-open:zoom-in-100 max-sm:data-open:slide-in-from-bottom-full max-sm:data-closed:zoom-out-100 max-sm:data-closed:slide-out-to-bottom-full max-sm:data-open:duration-300 max-sm:[animation-timing-function:var(--ease-drawer)]",
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
                  state === "active" && "bg-primary-solid text-primary-foreground",
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
 * from the side it came from; reduced motion keeps only the fade. The enter
 * animation is replayed in place (no remount), so uncontrolled inputs in
 * hidden steps keep their values for FormData submits.
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
  const contentRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const element = contentRef.current;
    if (!element || typeof element.getAnimations !== "function") return;
    for (const animation of element.getAnimations()) {
      animation.cancel();
      animation.play();
    }
  }, [stepKey, direction]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t px-6 py-5 [ol+&]:border-t-0">
      <div
        ref={contentRef}
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
    <footer className="flex items-center justify-between gap-4 border-t px-6 py-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
      <span className="text-sm text-muted-foreground tabular-nums">
        {step !== undefined && total !== undefined && total > 1
          ? t("stepOf", { current: step + 1, total })
          : null}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </footer>
  );
}
