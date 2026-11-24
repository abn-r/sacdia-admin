import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import baseMessages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/users/users-list-row-actions", () => ({
  UsersListRowActions: ({ name }: { name: string }) => <button aria-label={`Acciones de ${name}`} />,
}));
vi.mock("next-intl/server", async () => {
  const base = (await import("../../../messages/es.json")).default;
  // Supplied here so the test does not depend on the message files being merged.
  const messages = base;
  const lookup = (namespace: string, key: string) => {
    let node: unknown = messages;
    for (const part of `${namespace}.${key}`.split(".")) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : undefined;
  };
  return {
    getTranslations: async (namespace: string) => {
      const t = (key: string, values?: Record<string, unknown>) =>
        (lookup(namespace, key) ?? `${namespace}.${key}`).replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? `{${n}}`));
      return Object.assign(t, { has: (key: string) => lookup(namespace, key) !== undefined });
    },
    getLocale: async () => "es",
  };
});

import { UsersTable } from "@/components/users/users-table";

const users = [
  {
    user_id: "u-1",
    email: "paola.nunez@correo.test",
    name: "Paola",
    paternal_last_name: "Núñez",
    active: true,
    roles: ["coordinator"],
    post_registration: { complete: true },
    created_at: "2026-04-02T10:00:00Z",
  },
  {
    user_id: "u-2",
    email: "sofia.cardenas@correo.test",
    name: "Sofía",
    paternal_last_name: "Cárdenas",
    active: true,
    roles: [],
    post_registration: { complete: false },
    created_at: "2026-11-09T10:00:00Z",
  },
  {
    user_id: "u-3",
    email: "iker.montes@correo.test",
    name: "Iker",
    paternal_last_name: "Montes",
    active: false,
    roles: [],
    post_registration: { complete: true },
    created_at: "2026-11-12T10:00:00Z",
  },
];

async function renderTable(props: Partial<React.ComponentProps<typeof UsersTable>> = {}) {
  const ui = await UsersTable({ users, showAdministrativeCompletion: true, ...props });
  return render(
    <NextIntlClientProvider locale="es" messages={baseMessages as never}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("UsersTable", () => {
  afterEach(cleanup);

  it("marks only the exceptions: Pendiente and Inactivo, never Activo or Completo", async () => {
    await renderTable();
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Pendiente")).toHaveLength(1);
    expect(within(table).getAllByText("Inactivo")).toHaveLength(1);
    expect(within(table).queryByText("Activo")).not.toBeInTheDocument();
    expect(within(table).queryByText("Completo")).not.toBeInTheDocument();
  });

  it("gives every row one actions menu", async () => {
    await renderTable();
    expect(within(screen.getByRole("table")).getAllByRole("button", { name: /Acciones de/ })).toHaveLength(3);
  });

  it("dates rows with the panel locale", async () => {
    await renderTable();
    expect(within(screen.getByRole("table")).getByText(/2 abr 2026/i)).toBeInTheDocument();
  });

  it("replaces the rows with the error inside the table frame, keeping the headers", async () => {
    await renderTable({ error: { kind: "error", detail: { at: "2026-11-24T10:00:00.000Z" } } });
    const table = screen.getByRole("table");
    expect(within(table).getByText("No pudimos cargar los usuarios")).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Usuario" })).toBeInTheDocument();
    expect(screen.queryByText("Paola Núñez")).not.toBeInTheDocument();
  });
});
