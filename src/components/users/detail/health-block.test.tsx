import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { HealthBlock } from "./health-block";

describe("HealthBlock", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows health data immediately without a reveal gate", () => {
    render(
      <HealthBlock
        title="Salud"
        emptyMessage="Sin datos"
        bloodLabel="Tipo de sangre"
        bloodValue="O+"
        allergiesLabel="Alergias"
        diseasesLabel="Enfermedades"
        medicinesLabel="Medicinas"
        allergies={["Polen"]}
        diseases={[]}
        medicines={[]}
        hasPayload
      />,
    );

    expect(screen.getByText("O+")).toBeInTheDocument();
    expect(screen.getByText("Polen")).toBeInTheDocument();
    expect(screen.queryByText("Información protegida")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mostrar" })).not.toBeInTheDocument();
  });

  it("shows the empty message when there is no payload", () => {
    render(
      <HealthBlock
        title="Salud"
        emptyMessage="Sin datos de salud"
        bloodLabel="Tipo de sangre"
        bloodValue="—"
        allergiesLabel="Alergias"
        diseasesLabel="Enfermedades"
        medicinesLabel="Medicinas"
        allergies={[]}
        diseases={[]}
        medicines={[]}
        hasPayload={false}
      />,
    );

    expect(screen.getByText("Sin datos de salud")).toBeInTheDocument();
  });
});
