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
    showLabel: "Mostrar",
    hideLabel: "Ocultar",
    protectedTitle: "Protegido",
    protectedDescription: "Desc",
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

function renderResumen(showAccessFlags: boolean) {
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
      legalRepTitle="Representante"
      legalRepEmpty="Sin representante"
      legalRep={null}
      legalNameLabel="Nombre"
      legalPhoneLabel="Teléfono"
      legalRelationshipLabel="Parentesco"
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
