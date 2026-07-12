import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { pickMessages } from "@/lib/i18n/client-messages";

const INVESTITURE_CLIENT_NAMESPACES = [
  "shared",
  "investiture",
  "classes",
  "clubs",
  "users",
] as const;

interface InvestitureI18nProviderProps {
  children: ReactNode;
}

export async function InvestitureI18nProvider({
  children,
}: InvestitureI18nProviderProps) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(messages, INVESTITURE_CLIENT_NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
