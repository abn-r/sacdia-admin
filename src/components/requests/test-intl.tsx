import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import esMessages from "../../../messages/es.json";

/** Spanish messages for the Solicitudes tests (real catalog). */
export const testMessages = esMessages;

export function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale="es"
      messages={testMessages}
      timeZone="America/Mexico_City"
      onError={(error) => {
        throw error;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
