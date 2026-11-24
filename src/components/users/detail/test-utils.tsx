import React from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";

/** Text of a `people.userDetail.*` key; throws when the key is missing so tests catch it. */
export function ud(path: string): string {
  const found = path
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
      (messages as { people?: { userDetail?: unknown } }).people?.userDetail,
    );
  if (typeof found !== "string") throw new Error(`Missing message people.userDetail.${path}`);
  return found;
}

export function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} onError={() => {}}>
      {ui}
    </NextIntlClientProvider>,
  );
}
