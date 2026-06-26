import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { pickMessages } from "@/lib/i18n/client-messages";

const EVIDENCE_REVIEW_CLIENT_NAMESPACES = [
  "shared",
  "evidence_review",
  "classes",
  "honors",
  "users",
] as const;

interface EvidenceReviewI18nProviderProps {
  children: ReactNode;
}

export async function EvidenceReviewI18nProvider({
  children,
}: EvidenceReviewI18nProviderProps) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(messages, EVIDENCE_REVIEW_CLIENT_NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
