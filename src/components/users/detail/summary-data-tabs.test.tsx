import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UserDetailDataTab } from "@/components/users/detail/data-tab";
import { UserDetailSummaryTab } from "@/components/users/detail/summary-tab";
import { renderWithIntl } from "@/components/users/detail/test-utils";

describe("UserDetailDataTab", () => {
  afterEach(cleanup);

  it("renders each field once across the groups", () => {
    render(
      <UserDetailDataTab
        groups={[
          {
            title: "Datos completos",
            fields: [
              { k: "Nombre", v: "Mateo" },
              { k: "Correo", v: "mateo.herrera@correo.test" },
            ],
          },
          {
            title: "Ubicación",
            fields: [
              { k: "Unión", v: "Unión Valle" },
              { k: "Campo local", v: "Asociación Valle Alto" },
              { k: "Distrito", v: null, muted: true },
            ],
          },
        ]}
      />,
    );
    expect(screen.getAllByText("Unión")).toHaveLength(1);
    expect(screen.getAllByText("Campo local")).toHaveLength(1);
    expect(screen.getByText("Datos completos")).toBeInTheDocument();
    expect(screen.getByText("Ubicación")).toBeInTheDocument();
  });
});

describe("UserDetailSummaryTab", () => {
  afterEach(cleanup);

  const contacts = {
    title: "Contactos de emergencia",
    hasPayload: true,
    contacts: [
      { id: "c1", name: "Ana Herrera", phone: "5512345678", relationship: "Esposa", primary: true },
    ],
    principalLabel: "Principal",
    callLabel: "Llamar",
    emptyMessage: "Sin contactos",
    missingPayloadMessage: "No se pudieron cargar los contactos.",
  };

  it("keeps clubs, guardianships and contact only", () => {
    renderWithIntl(
      <UserDetailSummaryTab
        clubs={<div>bloque-clubes</div>}
        guardianships={<div>bloque-tutorias</div>}
        contacts={contacts}
      />,
    );
    expect(screen.getByText("bloque-clubes")).toBeInTheDocument();
    expect(screen.getByText("bloque-tutorias")).toBeInTheDocument();
    expect(screen.getByText("Ana Herrera")).toBeInTheDocument();
    expect(screen.queryByText("Salud")).toBeNull();
  });

  it("renders no contact block when the actor cannot read contacts", () => {
    renderWithIntl(<UserDetailSummaryTab clubs={<div>x</div>} contacts={null} />);
    expect(screen.queryByText("Contactos de emergencia")).toBeNull();
  });

  it("a failed contacts payload is a message, not an empty list", () => {
    renderWithIntl(
      <UserDetailSummaryTab
        clubs={<div>x</div>}
        contacts={{ ...contacts, hasPayload: false, contacts: [] }}
      />,
    );
    expect(screen.getByText("No se pudieron cargar los contactos.")).toBeInTheDocument();
    expect(screen.queryByText("Sin contactos")).toBeNull();
  });
});
