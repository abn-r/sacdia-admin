"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

import "./globals.css";

// global-error replaces the root layout, so there is no next-intl provider.
// This is the one place with inline strings: the catalog cannot be loaded here.
const COPY = {
  es: {
    title: "Algo salió mal",
    description:
      "El panel no pudo arrancar. Reintenta en un momento; si sigue, avisa a soporte con este código.",
    retry: "Reintentar",
    home: "Ir al inicio",
  },
  en: {
    title: "Something went wrong",
    description:
      "The panel could not start. Try again in a moment; if it keeps happening, tell support with this code.",
    retry: "Try again",
    home: "Go to home",
  },
  fr: {
    title: "Une erreur est survenue",
    description:
      "Le panneau n'a pas pu démarrer. Réessayez dans un instant ; si le problème persiste, prévenez le support avec ce code.",
    retry: "Réessayer",
    home: "Aller à l'accueil",
  },
  "pt-BR": {
    title: "Algo deu errado",
    description:
      "O painel não conseguiu iniciar. Tente novamente em instantes; se continuar, avise o suporte com este código.",
    retry: "Tentar novamente",
    home: "Ir para o início",
  },
} as const;

type Locale = keyof typeof COPY;
// Mirrors theme-boot.ts (cookie `theme_mode`: light | dark | system). That module
// is not imported because it pulls next/font through the preferences registry.
const THEME_SCRIPT = `(function(){try{var m=document.cookie.split("; ").find(function(c){return c.indexOf("theme_mode=")===0});m=m?decodeURIComponent(m.split("=")[1]):"light";var d=m==="dark"||(m==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

const LOCALE_COOKIE = "sacdia_admin_locale";

function matchLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  if (value in COPY) return value as Locale;
  const base = value.toLowerCase();
  if (base.startsWith("pt")) return "pt-BR";
  if (base.startsWith("en")) return "en";
  if (base.startsWith("fr")) return "fr";
  if (base.startsWith("es")) return "es";
  return null;
}

function detectLocale(): Locale {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  const fromCookie = match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
  return matchLocale(fromCookie) ?? matchLocale(navigator.language) ?? "es";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("es");
  const [time, setTime] = useState("");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    // Browser-only values (cookie, navigator): reading them during render would mismatch SSR.
    const detected = detectLocale();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocale(detected);
    setTime(
      new Date().toLocaleTimeString(detected, { hour: "2-digit", minute: "2-digit" }),
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const copy = COPY[locale];
  const detail = [error.digest ? `ref ${error.digest}` : null, time || null]
    .filter(Boolean)
    .join(" · ");

  return (
    <html lang={locale === "pt-BR" ? "pt" : locale} suppressHydrationWarning>
      <head>
        {/* Same boot script as the root layout: applies theme_mode from its cookie. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen items-center justify-center bg-background font-sans text-foreground antialiased">
        <main role="alert" className="flex max-w-[440px] flex-col items-center px-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image needs the app runtime that just failed */}
          <img src="/app-icon.jpg" alt="SACDIA" width={56} height={56} className="rounded-xl" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{copy.description}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {copy.retry}
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be broken here */}
            <a
              href="/dashboard"
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium"
            >
              {copy.home}
            </a>
          </div>
          {detail && (
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">{detail}</p>
          )}
        </main>
      </body>
    </html>
  );
}
