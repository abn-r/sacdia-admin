"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CakeSlice, PartyPopper, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { getBirthdayDismissalKey, isBirthdayToday } from "@/lib/birthday";

const CONFETTI_COLORS = [
  "#f59e0b",
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
];

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 7) * 120}ms`,
  duration: `${2100 + (index % 5) * 180}ms`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
}));

function subscribeBirthdayStorage(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener("sacdia-birthday-dismissal-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("sacdia-birthday-dismissal-change", onStoreChange);
  };
}

function getDismissalSnapshot(dismissalKey: string | null): string {
  if (!dismissalKey || typeof window === "undefined") {
    return "dismissed";
  }

  try {
    return localStorage.getItem(dismissalKey) ?? "";
  } catch {
    return "";
  }
}

function getUserIdentity(user: ReturnType<typeof useAuth>["user"]): string | null {
  if (!user) return null;

  const candidates = [user.user_id, user.id, user.email];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

export function BirthdayCelebrationModal() {
  const { user } = useAuth();
  const t = useTranslations("dashboardHub.birthday");
  const [closedForSession, setClosedForSession] = useState(false);

  const birthday = user?.birthday;
  const userId = getUserIdentity(user);

  const celebration = useMemo(() => {
    const today = new Date();

    return {
      isBirthday: isBirthdayToday(birthday, today),
      dismissalKey: getBirthdayDismissalKey({ userId, birthday, today }),
    };
  }, [birthday, userId]);

  const dismissalSnapshot = useSyncExternalStore(
    subscribeBirthdayStorage,
    () => getDismissalSnapshot(celebration.dismissalKey),
    () => "dismissed",
  );

  const open =
    celebration.isBirthday &&
    Boolean(celebration.dismissalKey) &&
    dismissalSnapshot !== "dismissed" &&
    !closedForSession;

  function closeForSession() {
    setClosedForSession(true);
  }

  function dismissForCurrentBirthday() {
    if (celebration.dismissalKey) {
      try {
        localStorage.setItem(celebration.dismissalKey, "dismissed");
        window.dispatchEvent(new Event("sacdia-birthday-dismissal-change"));
      } catch {
        // If localStorage is unavailable, still close for the current render.
      }
    }

    closeForSession();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      closeForSession();
    }
  }

  if (!celebration.isBirthday) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden border-amber-300/70 bg-card/95 p-0 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:max-w-[520px]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI_PIECES.map((piece) => (
            <span
              key={piece.id}
              className="birthday-confetti-piece"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                backgroundColor: piece.color,
              }}
            />
          ))}
        </div>

        <div className="relative space-y-6 px-6 pb-6 pt-8 text-center sm:px-8">
          <DialogHeader className="items-center text-center">
            <div className="relative flex size-24 items-center justify-center rounded-full border border-amber-300/70 bg-gradient-to-br from-amber-100 via-orange-50 to-white shadow-lg shadow-amber-500/20 dark:from-amber-300/20 dark:via-orange-500/10 dark:to-card">
              <div className="birthday-float flex size-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-700/20">
                <CakeSlice className="size-9" aria-hidden="true" />
              </div>
              <Sparkles
                className="birthday-sparkle absolute -right-1 top-2 size-6 text-amber-500"
                aria-hidden="true"
              />
              <PartyPopper
                className="birthday-sparkle absolute bottom-2 left-0 size-6 text-orange-500"
                aria-hidden="true"
              />
            </div>

            <DialogTitle className="birthday-gold-text text-4xl font-black tracking-tight sm:text-5xl">
              {t("title")}
            </DialogTitle>
            <DialogDescription
              className="mx-auto max-w-sm text-base leading-7 text-foreground/80"
            >
              {t("message")}
            </DialogDescription>
          </DialogHeader>

          <div className="mx-auto max-w-sm rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium leading-6 text-amber-950 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            {t("bibleMessage")}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              className="min-h-11 cursor-pointer bg-amber-600 text-white shadow-sm shadow-amber-800/20 hover:bg-amber-700 focus-visible:ring-amber-500"
              onClick={closeForSession}
            >
              {t("thanks")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "min-h-11 cursor-pointer border-amber-300 text-amber-900 hover:bg-amber-50",
                "dark:border-amber-400/30 dark:text-amber-100 dark:hover:bg-amber-400/10",
              )}
              onClick={dismissForCurrentBirthday}
            >
              {t("dismissToday")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
