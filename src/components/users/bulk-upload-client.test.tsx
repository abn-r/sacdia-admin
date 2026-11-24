import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import * as XLSX from "xlsx";
import baseMessages from "../../../messages/es.json";

const { mockUpload, mockRefresh } = vi.hoisted(() => ({ mockUpload: vi.fn(), mockRefresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/api/admin-users", () => ({ bulkUploadAdminUsersFromClient: mockUpload }));

import { BulkUploadClient } from "@/components/users/bulk-upload-client";

// Supplied here so the test does not depend on the message files being merged.

const messages = baseMessages;

const data = {
  allowedRoles: ["coordinator", "user"],
  localFieldRequiredRoles: ["coordinator"],
  catalogs: {
    countries: [{ id: 1, name: "México" }],
    unions: [{ id: 10, name: "Unión Valle Alto", countryId: 1 }],
    localFields: [{ id: 100, name: "Asociación Valle Alto", unionId: 10 }],
  },
};

const HEADER = ["email", "name", "paternal_last_name", "maternal_last_name", "role", "country", "union", "local_field"];

function sheetFile(rows: string[][], name = "personas.xlsx"): File {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, ...rows]), "Usuarios");
  const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const file = new File([bytes], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  // jsdom's File has no arrayBuffer().
  if (!file.arrayBuffer) Object.defineProperty(file, "arrayBuffer", { value: async () => bytes });
  return file;
}

function renderClient() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages as never}>
      <BulkUploadClient {...data} />
    </NextIntlClientProvider>,
  );
}

async function upload(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(screen.getByLabelText("Elegir archivo", { selector: "input" }), file);
}

describe("BulkUploadClient", () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockRefresh.mockReset();
  });
  afterEach(cleanup);

  it("reviews every row of the file before sending and lists the errors in words", async () => {
    const user = userEvent.setup();
    renderClient();
    await upload(user, sheetFile([
      ["valeria.ortiz@correo.test", "Valeria", "Ortiz", "", "user", "", "Unión Valle Alto", ""],
      ["emilio.rangel@correo.test", "Emilio", "Rangel", "", "coordinator", "", "", ""],
      ["camila", "Camila", "Ibarra", "", "user", "", "Unión Fantasma", ""],
    ]));

    expect(await screen.findByText("Paso 2 de 3 · Revisar")).toBeInTheDocument();
    expect(screen.getByText("3 filas · 1 lista · 2 con errores")).toBeInTheDocument();
    expect(screen.getByText("Este rol necesita un campo local.")).toBeInTheDocument();
    expect(screen.getByText("El correo no es válido: camila.")).toBeInTheDocument();
    expect(screen.getByText("No encontramos la unión «Unión Fantasma».")).toBeInTheDocument();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("reviews past the fifth row (the old preview stopped at 5)", async () => {
    const user = userEvent.setup();
    renderClient();
    const rows = Array.from({ length: 12 }, (_, i) => [`p${i}@correo.test`, "Ana", "Ruiz", "", "user", "", "", ""]);
    await upload(user, sheetFile(rows));
    expect(await screen.findByText("12 filas · 12 listas · 0 con errores")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Todas/ }));
    expect(await screen.findByText("p11@correo.test")).toBeInTheDocument();
  });

  it("sends only the ready rows, with catalog ids, and reports per sheet row", async () => {
    mockUpload.mockImplementation(async (file: File) => {
      // jsdom's File has no arrayBuffer().
      const buffer = await new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });
      const wb = XLSX.read(buffer, { type: "array" });
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, defval: "" });
      expect(matrix).toEqual([
        ["email", "name", "paternal_last_name", "maternal_last_name", "role", "country_id", "union_id", "local_field_id"],
        ["valeria.ortiz@correo.test", "Valeria", "Ortiz", "", "user", 1, 10, ""],
      ]);
      return {
        total: 1,
        succeeded: 0,
        failed: 1,
        results: [{ row: 2, email: "valeria.ortiz@correo.test", status: "error", error_code: "EMAIL_ALREADY_IN_USE" }],
      };
    });
    const user = userEvent.setup();
    renderClient();
    await upload(user, sheetFile([
      ["camila", "Camila", "Ibarra", "", "user", "", "", ""],
      ["valeria.ortiz@correo.test", "Valeria", "Ortiz", "", "user", "", "Unión Valle Alto", ""],
    ]));

    await user.click(await screen.findByRole("button", { name: "Crear 1 usuario" }));

    expect(await screen.findByText("Paso 3 de 3 · Resultado")).toBeInTheDocument();
    // The API called it row 2 of the sent file; the person sees their own row 3.
    const row = (await screen.findByText("valeria.ortiz@correo.test")).closest("tr")!;
    expect(within(row).getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1 fila con errores de revisión no se envió.")).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("rejects a file with missing columns before reviewing anything", async () => {
    const user = userEvent.setup();
    renderClient();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["email", "name"], ["a@correo.test", "Ana"]]), "x");
    const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "malo.xlsx");
    Object.defineProperty(file, "arrayBuffer", { value: async () => bytes });
    await upload(user, file);
    expect(await screen.findByText("Faltan columnas: paternal_last_name, role. Descarga la plantilla para ver el formato.")).toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 3 · Archivo")).toBeInTheDocument();
  });

  it("keeps the review on screen with the reason when the send fails", async () => {
    mockUpload.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderClient();
    await upload(user, sheetFile([["a@correo.test", "Ana", "Ruiz", "", "user", "", "", ""]]));
    await user.click(await screen.findByRole("button", { name: "Crear 1 usuario" }));
    await waitFor(() => expect(screen.getByText("No pudimos enviar el archivo. Revisa tu conexión e inténtalo de nuevo.")).toBeInTheDocument());
    expect(screen.getByText("Paso 2 de 3 · Revisar")).toBeInTheDocument();
  });
});
