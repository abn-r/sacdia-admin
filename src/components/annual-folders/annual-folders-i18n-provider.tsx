import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { pickMessages } from "@/lib/i18n/client-messages";

const ANNUAL_FOLDERS_CLIENT_NAMESPACES = [
  "shared",
  "annual_folders",
  "clubs",
  "rankings",
  "scoring_categories",
] as const;

interface AnnualFoldersI18nProviderProps {
  children: ReactNode;
}

export async function AnnualFoldersI18nProvider({
  children,
}: AnnualFoldersI18nProviderProps) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(messages, ANNUAL_FOLDERS_CLIENT_NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
