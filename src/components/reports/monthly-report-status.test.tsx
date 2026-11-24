import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { MonthlyReportStatus } from "./monthly-report-status";
import type { MonthlyReportStatus as Status } from "@/lib/reports/status";

function renderStatus(status: Status) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MonthlyReportStatus status={status} />
    </NextIntlClientProvider>,
  );
}

describe("MonthlyReportStatus", () => {
  afterEach(cleanup);

  it.each([
    ["draft", "Borrador", true],
    ["generated", "Por enviar", true],
    ["submitted", "Enviado", false],
  ] as const)("%s reads «%s» (badge: %s)", (status, label, marked) => {
    renderStatus(status);
    const node = screen.getByText(label);
    expect(Boolean(node.closest("[data-slot=badge]"))).toBe(marked);
  });

  it("gives draft and to-send different marks so they never share a color", () => {
    const draft = renderStatus("draft").container.innerHTML;
    cleanup();
    const toSend = renderStatus("generated").container.innerHTML;
    expect(toSend).not.toBe(draft);
  });
});
