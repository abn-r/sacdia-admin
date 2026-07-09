import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppAlertListener } from "@/components/shared/app-alert-listener";
import { ThemeProvider } from "@/components/theme-provider";
import {
  ROOT_CLIENT_MESSAGE_NAMESPACES,
  pickMessages,
} from "@/lib/i18n/client-messages";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { PreferencesProvider } from "@/lib/preferences/preferences-provider";
import { ThemeBootScript } from "@/scripts/theme-boot";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shared.appMetadata");
  return {
    title: t("title"),
    description: t("description"),
    icons: { icon: "/logo.ico" },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const clientMessages = pickMessages(messages, ROOT_CLIENT_MESSAGE_NAMESPACES);
  const htmlLang = locale.startsWith("pt") ? "pt" : locale;
  const {
    theme_mode,
    theme_preset,
    content_layout,
    navbar_style,
    sidebar_variant,
    sidebar_collapsible,
  } = PREFERENCE_DEFAULTS;

  return (
    <html
      lang={htmlLang}
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      suppressHydrationWarning
    >
      <head>
        <ThemeBootScript />
      </head>
      <body className={`${fontVars} min-h-screen font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PreferencesProvider initialValues={PREFERENCE_DEFAULTS}>
            <NextIntlClientProvider locale={locale} messages={clientMessages}>
              <TooltipProvider delayDuration={300}>
                {children}
                <Suspense fallback={null}>
                  <AppAlertListener />
                </Suspense>
              </TooltipProvider>
              <Toaster position="top-center" richColors closeButton />
            </NextIntlClientProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
