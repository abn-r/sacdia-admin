import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ClubsBulkImport } from "@/components/clubs/clubs-bulk-import";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
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

describe("ClubsBulkImport", () => {
  it("reads accents from a UTF-8 CSV without BOM and ignores case and accents", async () => {
    const { container } = renderImport();
    upload(container, `${header}\nClub Uno,asociacion centro de veracruz,BOCA DEL RIO,acv`);

    expect(await screen.findByText("Válida")).toBeInTheDocument();
    expect(screen.getByText("1 válidas · 0 con errores")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar 1 club" })).toBeEnabled();
  });

  it("rejects a district from another local field", async () => {
    const { container } = renderImport();
    upload(container, `${header}\nClub Dos,Asociación Centro de Veracruz,Catemaco,ACV`);

    expect(
      await screen.findByText(
        /El distrito Catemaco no pertenece al campo local Asociación Centro de Veracruz/,
      ),
    ).toBeInTheDocument();
  });

  it("clears the preview after importing so rows are not sent twice", async () => {
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
    expect(screen.queryByRole("button", { name: /Importar/ })).toBeNull();
  });
});
