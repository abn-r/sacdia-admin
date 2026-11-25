import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";

const api = vi.hoisted(() => ({ upload: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn() }));

vi.mock("sonner", () => ({ toast: { success: api.toastSuccess, error: api.toastError } }));
vi.mock("@/lib/api/honor-assets", () => ({ uploadHonorAsset: api.upload }));

import { HonorAssetField } from "./honor-asset-field";

function renderField(kind: "image" | "material", defaultValue?: string) {
  const { container } = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <form>
        <HonorAssetField
          kind={kind}
          id="f"
          name={kind === "image" ? "honor_image" : "material_url"}
          defaultValue={defaultValue}
          required
        />
      </form>
    </NextIntlClientProvider>,
  );
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  return { fileInput, form: container.querySelector("form") as HTMLFormElement };
}

describe("HonorAssetField", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("uploads the chosen image and puts its URL in the form field", async () => {
    api.upload.mockResolvedValueOnce("https://r2.example/honors/admin-uploads/a.png");
    const { fileInput, form } = renderField("image");
    expect(screen.getByRole("button", { name: /Subir archivo/ })).toBeTruthy();

    const file = new File(["png"], "insignia.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(new FormData(form).get("honor_image")).toBe(
        "https://r2.example/honors/admin-uploads/a.png",
      ),
    );
    expect(api.upload).toHaveBeenCalledWith("image", file);
    expect(api.toastSuccess).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Reemplazar/ })).toBeTruthy();
  });

  it("refuses a PDF as image without calling the API", () => {
    const { fileInput } = renderField("image");
    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "a.pdf", { type: "application/pdf" })] },
    });
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.toastError).toHaveBeenCalledWith("Tipo de archivo no permitido");
  });

  it("keeps the current URL when the upload fails", async () => {
    api.upload.mockRejectedValueOnce(new Error("R2 caído"));
    const { fileInput, form } = renderField("material", "https://r2.example/old.pdf");
    expect(screen.getByRole("link", { name: /Ver archivo/ }).getAttribute("href")).toBe(
      "https://r2.example/old.pdf",
    );

    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "a.pdf", { type: "application/pdf" })] },
    });

    await waitFor(() => expect(api.toastError).toHaveBeenCalled());
    expect(new FormData(form).get("material_url")).toBe("https://r2.example/old.pdf");
  });
});
