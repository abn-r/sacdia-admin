import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import {
  UserDetailResumenTab,
  type ResumenTabProps,
} from "./resumen-tab";

function stubHealthProps(): ResumenTabProps["healthProps"] {
  return {
    title: "Salud",
    emptyMessage: "Vacío",
    bloodLabel: "Sangre",
    bloodValue: "O+",
    allergiesLabel: "Alergias",
    diseasesLabel: "Enfermedades",
    medicinesLabel: "Medicinas",
    allergies: [],
    diseases: [],
    medicines: [],
    hasPayload: false,
  };
}

function renderResumen(
  showAccessFlags: boolean,
  extra: Partial<ResumenTabProps> = {},
) {
  return render(
    <UserDetailResumenTab
      identityTitle="Identidad"
      identityFieldsLeft={[{ k: "Nombre", v: "Ana" }]}
      identityFieldsRight={[]}
      pastoralTitle="Pastoral"
      pastoralEmpty="Sin asignaciones"
      assignments={[]}
      clubLabel="Club"
      sectionLabel="Sección"
      roleLabel="Rol"
      showHealth={false}
      healthProps={stubHealthProps()}
      rolesAccessTitle="Roles y accesos"
      rolesLabel="Roles de sistema"
      rolesEmpty="Sin roles"
      globalRoles={["Director de campo"]}
      showAccessFlags={showAccessFlags}
      accessAppLabel="App móvil"
      accessAppSub="Acceso al cliente móvil"
      accessPanelLabel="Panel admin"
      accessPanelSub="Acceso al panel administrativo"
      activeLabel="Estado"
      activeSub="Habilitado para iniciar sesión"
      accessApp
      accessPanel
      active
      showContacts={false}
      contactsProps={{
        hasPayload: false,
        contacts: [],
        title: "Contactos",
        principalLabel: "Principal",
        callLabel: "Llamar",
        emptyMessage: "Sin contactos",
        missingPayloadMessage: "Sin payload",
      }}
      showLegalRep={false}
      legalRepTitle="Representante legal (heredado)"
      legalRepLegacyNote="Registro heredado, solo lectura."
      legalRep={null}
      legalNameLabel="Nombre"
      legalPhoneLabel="Teléfono"
      legalRelationshipLabel="Parentesco"
      {...extra}
    />,
  );
}

describe("UserDetailResumenTab access flags", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows App / Panel / Estado for admin actors", () => {
    renderResumen(true);

    expect(screen.getByText("App móvil")).toBeInTheDocument();
    expect(screen.getByText("Panel admin")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Director de campo")).toBeInTheDocument();
  });

  it("hides App / Panel / Estado for non-admin actors and keeps system roles", () => {
    renderResumen(false);

    expect(screen.queryByText("App móvil")).not.toBeInTheDocument();
    expect(screen.queryByText("Panel admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Estado")).not.toBeInTheDocument();
    expect(screen.queryByText("Acceso al panel administrativo")).not.toBeInTheDocument();
    expect(screen.getByText("Director de campo")).toBeInTheDocument();
  });
});

describe("UserDetailResumenTab dependent profile", () => {
  afterEach(() => {
    cleanup();
  });

  it("replaces the login toggles with a 'no own access' notice", () => {
    renderResumen(true, {
      dependentAccess: {
        label: "Sin acceso propio",
        sub: "Gestionado por su tutor",
      },
    });

    expect(screen.getByTestId("dependent-no-access")).toBeInTheDocument();
    expect(screen.getByText("Sin acceso propio")).toBeInTheDocument();
    expect(screen.getByText("Gestionado por su tutor")).toBeInTheDocument();
    expect(screen.queryByText("App móvil")).not.toBeInTheDocument();
    expect(screen.queryByText("Acceso al cliente móvil")).not.toBeInTheDocument();
    expect(screen.queryByText("Habilitado para iniciar sesión")).not.toBeInTheDocument();
    // System roles stay visible
    expect(screen.getByText("Director de campo")).toBeInTheDocument();
  });

  it("shows the notice even when the actor cannot see the access flags", () => {
    renderResumen(false, {
      dependentAccess: { label: "Sin acceso propio", sub: "Gestionado por su tutor" },
    });
    expect(screen.getByTestId("dependent-no-access")).toBeInTheDocument();
  });

  it("keeps the toggles for regular accounts", () => {
    renderResumen(true, { dependentAccess: null });
    expect(screen.queryByTestId("dependent-no-access")).not.toBeInTheDocument();
    expect(screen.getByText("App móvil")).toBeInTheDocument();
  });
});

describe("UserDetailResumenTab legacy legal representative", () => {
  afterEach(() => {
    cleanup();
  });

  const legalRep = { fullName: "Rosa Díaz", phone: "555-0100", relationship: "Tía" };

  it("hides the whole section when there is no legacy row", () => {
    renderResumen(true, { showLegalRep: true, legalRep: null });
    expect(screen.queryByText("Representante legal (heredado)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Sin representante/)).not.toBeInTheDocument();
  });

  it("keeps showing an existing legacy row, labelled as legacy", () => {
    renderResumen(true, { showLegalRep: true, legalRep });
    expect(screen.getByText("Representante legal (heredado)")).toBeInTheDocument();
    expect(screen.getByText("Registro heredado, solo lectura.")).toBeInTheDocument();
    expect(screen.getByText("Rosa Díaz")).toBeInTheDocument();
  });

  it("stays hidden without the legal_representative capability", () => {
    renderResumen(true, { showLegalRep: false, legalRep });
    expect(screen.queryByText("Rosa Díaz")).not.toBeInTheDocument();
  });
});
