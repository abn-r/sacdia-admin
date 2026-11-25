import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { PeriodicReportStatusBadge } from "./report-status-badge";

function renderBadge(status: string) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PeriodicReportStatusBadge status={status} />
    </NextIntlClientProvider>,
  );
}

describe("PeriodicReportStatusBadge", () => {
  afterEach(cleanup);

  it("marks the open report and leaves the closed one as plain text", () => {
    renderBadge("draft");
    expect(screen.getByText("En curso").closest("[data-slot=badge]")).not.toBeNull();
    cleanup();

    renderBadge("finalized");
    expect(screen.getByText("Cerrado").closest("[data-slot=badge]")).toBeNull();
  });
});
