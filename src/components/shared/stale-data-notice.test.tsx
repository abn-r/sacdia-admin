import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/es.json";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { StaleDataNotice } from "@/components/shared/stale-data-notice";

afterEach(() => {
  cleanup();
  refresh.mockClear();
});

function ui(props: Parameters<typeof StaleDataNotice>[0]) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      <StaleDataNotice {...props} />
    </NextIntlClientProvider>
  );
}

describe("StaleDataNotice", () => {
  it("shows the message with the localized time", () => {
    render(ui({ at: "2026-11-24T16:42:00Z" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /No pudimos actualizar\. Mostramos los datos de las .*10:42/,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry", async () => {
    const onRetry = vi.fn();
    render(ui({ at: new Date(), onRetry }));
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("refreshes the route with retry", async () => {
    render(ui({ at: new Date(), retry: true }));
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
