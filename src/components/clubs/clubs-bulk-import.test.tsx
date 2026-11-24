import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ClubsBulkImport } from "@/components/clubs/clubs-bulk-import";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/clubs/import",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
});

const localFields = [
  { label: "Asociación Centro de Veracruz", value: 4 },
  { label: "Asociación de los Tuxtlas", value: 5 },
];
const districts = [
  { label: "Boca del Río", value: 1, parentId: 4 },
  { label: "Catemaco", value: 25, parentId: 5 },
];
const churches = [{ label: "ACV", value: 2, parentId: 1 }];

function renderImport(submitAction = vi.fn()) {
  const view = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClubsBulkImport
        localFields={localFields}
        districts={districts}
        churches={churches}
        submitAction={submitAction}
      />
    </NextIntlClientProvider>,
  );
  return { ...view, submitAction };
}

function upload(container: HTMLElement, csv: string) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([csv], "clubs.csv", { type: "text/csv" });
  // jsdom's File has no arrayBuffer(); give it the UTF-8 bytes (no BOM).
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new TextEncoder().encode(csv).buffer),
  });
  fireEvent.change(input, { target: { files: [file] } });
}

const header = "name,local_field,district,church";

function uploadSized(container: HTMLElement, name: string, size: number) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["x"], name, { type: "text/csv" });
  Object.defineProperty(file, "size", { value: size });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("ClubsBulkImport", () => {
  it("starts at step 1 with breadcrumbs and the limits, no Volver button", () => {
    renderImport();

    expect(screen.getByText("Paso 1 de 3 · Archivo")).toBeInTheDocument();
    expect(screen.getByText("Hasta 500 filas y 5 MB", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clubes" })).toHaveAttribute("href", "/dashboard/clubs");
    expect(screen.queryByText("Volver")).toBeNull();
  });

  it("rejects a file over 5 MB with a message that stays on screen", async () => {
    const { container } = renderImport();
    uploadSized(container, "clubes.csv", 6 * 1024 * 1024);

    expect(await screen.findByRole("alert")).toHaveTextContent("más de 5 MB");
    expect(screen.getByText("Paso 1 de 3 · Archivo")).toBeInTheDocument();
  });

  it("rejects a file with more than 500 rows", async () => {
    const { container } = renderImport();
    const body = Array.from({ length: 501 }, (_, i) => `Club ${i},ACV,Boca del Río,ACV`).join("\n");
    upload(container, `${header}\n${body}`);

    expect(await screen.findByRole("alert")).toHaveTextContent("501 filas");
  });

  it("reads accents from a UTF-8 CSV without BOM and ignores case and accents", async () => {
    const { container } = renderImport();
    upload(container, `${header}\nClub Uno,asociacion centro de veracruz,BOCA DEL RIO,acv`);

    expect((await screen.findAllByText("Lista")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Paso 2 de 3 · Revisar · clubs\.csv/)).toBeInTheDocument();
    expect(screen.getByText(/1 fila · 1 lista · 0 con errores/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar 1 club" })).toBeEnabled();
  });

  it("says in words what fails, tints the row and defaults to the errors tab", async () => {
    const { container } = renderImport();
    upload(
      container,
      `${header}\nClub Dos,Asociación Centro de Veracruz,Catemaco,ACV\nClub Tres,asociacion centro de veracruz,Boca del Río,ACV`,
    );

    // Table and mobile list both render; the table row is the one inside <tr>.
    const messages = await screen.findAllByText(
      /El distrito Catemaco no pertenece al campo local Asociación Centro de Veracruz/,
    );
    const row = messages.map((node) => node.closest("tr")).find(Boolean);
    expect(row).toHaveAttribute("data-state", "selected");
    expect(row?.className).not.toMatch(/destructive|red-/);
    // Errors tab only: the ready row is not listed until «Todas».
    expect(screen.queryByText("Club Tres")).toBeNull();
    expect(screen.getByRole("tab", { name: /Con errores/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Importar 1 club" })).toBeEnabled();
  });

  it("clears the preview after importing so rows are not sent twice, and shows the result step", async () => {
    const submitAction = vi.fn().mockResolvedValue({
      created: 1,
      failed: 0,
      forbidden: false,
      results: [{ rowNumber: 2, name: "Club Uno", ok: true, clubId: 18 }],
    });
    const { container } = renderImport(submitAction);
    upload(container, `${header}\nClub Uno,Asociación Centro de Veracruz,Boca del Río,ACV`);

    fireEvent.click(await screen.findByRole("button", { name: "Importar 1 club" }));

    await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("link", { name: "Ver club #18" })).toHaveAttribute(
      "href",
      "/dashboard/clubs/18",
    );
    expect(screen.getByText("Paso 3 de 3 · Resultado")).toBeInTheDocument();
    expect(screen.getByText("1 club creado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar 1/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Ir a clubes" })).toHaveAttribute("href", "/dashboard/clubs");
  });
});
