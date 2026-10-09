import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { InvestiturePersonStatus } from "@/lib/api/investiture-requests";

vi.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ intent, label }: { intent: string; label: string }) => (
    <span data-testid="status-badge" data-intent={intent}>
      {label}
    </span>
  ),
}));

import { PersonStatusBadge } from "./person-status-badge";

function renderBadge(status: InvestiturePersonStatus) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PersonStatusBadge status={status} />
    </NextIntlClientProvider>,
  );
  return screen.getByTestId("status-badge");
}

describe("PersonStatusBadge", () => {
  afterEach(() => cleanup());

  it.each([
    ["PENDING", "En espera de autorización", "warning"],
    ["INVESTED", "Investido", "success"],
    ["REJECTED_BY_PERSON", "Rechazado", "destructive"],
    ["REJECTED_BY_SYSTEM", "Rechazado por el sistema", "destructive"],
    ["REMOVED", "Retirado de la solicitud", "neutral"],
    ["CLOSED_YEAR", "Año cerrado sin resolver", "neutral"],
  ] as const)("renders %s with its label and intent", (status, label, intent) => {
    const badge = renderBadge(status);
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveAttribute("data-intent", intent);
  });
});
