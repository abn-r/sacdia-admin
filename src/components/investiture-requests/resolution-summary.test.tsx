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

  it("groups invested, rejected by the authorizer and rejected by the system", () => {
    renderSummary();
    const summary = screen.getByRole("region", { name: "Resultado de la resolución" });

    expect(within(summary).getByText("Investidos")).toBeInTheDocument();
    expect(within(summary).getByText("Ana Solís")).toBeInTheDocument();
    expect(within(summary).getByText("Rechazados por quien autoriza")).toBeInTheDocument();
    expect(within(summary).getByText("Luis Peña")).toBeInTheDocument();
    expect(within(summary).getByText("Rechazados por el sistema")).toBeInTheDocument();
    expect(within(summary).getByText("Texto largo del sistema")).toBeInTheDocument();
  });

  it("lists what was not applied: blocked with its mapped message and already resolved", () => {
    renderSummary();
    const summary = screen.getByRole("region", { name: "Resultado de la resolución" });

    expect(within(summary).getByText("Sin aplicar")).toBeInTheDocument();
    expect(within(summary).getByText("Marta Ruiz")).toBeInTheDocument();
    expect(
      within(summary).getByText(
        messages.investiture_requests.errors.date_outside_window,
      ),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Sara Lima")).toBeInTheDocument();
    expect(within(summary).getByText("Ya había sido resuelto")).toBeInTheDocument();
  });

  it("hides groups that came back empty", () => {
    renderSummary();
    expect(screen.queryByText("Retirados de la solicitud")).not.toBeInTheDocument();
  });
});
