import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type {
  InvestitureRequestPerson,
  InvestitureResolution,
} from "@/lib/api/investiture-requests";
import { ResolutionSummary } from "./resolution-summary";

function person(id: string, name: string, extra: Partial<InvestitureRequestPerson> = {}) {
  return {
    person_id: id,
    user_id: `u-${id}`,
    user_name: name,
    class_id: 1,
    class_name: "Amigo",
    section_name: null,
    enrollment_id: 1,
    investiture_date: "2026-11-20",
    status: "PENDING",
    can_authorize: true,
    authorization_comment: null,
    rejection_reason: null,
    system_reason: null,
    resolution_code: null,
    resolved_by_id: null,
    resolved_by_name: null,
    date_changed_by_id: null,
    date_changed_at: null,
    ...extra,
  } as InvestitureRequestPerson;
}

const resolution: InvestitureResolution = {
  request_id: "r1",
  invested: [person("p1", "Ana Solís")],
  rejected_by_person: [person("p2", "Luis Peña")],
  rejected_by_system: [person("p3", "Pedro Díaz", { system_reason: "Texto largo del sistema" })],
  retired: [],
  blocked: [{ person_id: "p4", code: "INVESTITURE_REQUEST_DATE_OUTSIDE_WINDOW" }],
  already_resolved: [{ person_id: "p5", status: "INVESTED" }],
};

const knownPeople = [
  person("p4", "Marta Ruiz"),
  person("p5", "Sara Lima", { status: "INVESTED" }),
];

function renderSummary() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ResolutionSummary resolution={resolution} people={knownPeople} />
    </NextIntlClientProvider>,
  );
}

describe("ResolutionSummary", () => {
  afterEach(() => cleanup());

  it("counts what was invested, rejected by the authorizer and rejected by the system", () => {
    renderSummary();
    const summary = screen.getByRole("status");

    expect(within(summary).getByText("Decisiones aplicadas")).toBeInTheDocument();
    expect(
      within(summary).getByText("1 investida · 1 rechazada por ti · 1 rechazada por el sistema"),
    ).toBeInTheDocument();
  });

  it("explains that the system may reject on its own, only when it did", () => {
    renderSummary();
    expect(screen.getByText(/El sistema rechaza por su cuenta/)).toBeInTheDocument();
    cleanup();

    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ResolutionSummary
          resolution={{ ...resolution, rejected_by_system: [], blocked: [], already_resolved: [] }}
          people={knownPeople}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText(/El sistema rechaza por su cuenta/)).not.toBeInTheDocument();
  });

  it("lists what was not applied: blocked with its mapped message and already resolved", () => {
    renderSummary();
    const summary = screen.getByRole("status");

    expect(within(summary).getByText("Sin aplicar")).toBeInTheDocument();
    expect(within(summary).getByText("Marta Ruiz")).toBeInTheDocument();
    expect(
      within(summary).getByText(
        new RegExp(messages.investiture_requests.errors.date_outside_window),
      ),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Sara Lima")).toBeInTheDocument();
    expect(within(summary).getByText("Ya había sido resuelto")).toBeInTheDocument();
  });
});
