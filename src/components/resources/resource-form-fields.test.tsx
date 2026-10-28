import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/resources",
}));

import { ResourceFormFields } from "@/components/resources/resources-crud-page";

function renderForm(props: Partial<React.ComponentProps<typeof ResourceFormFields>> = {}) {
  const { container } = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <form data-testid="form">
        <ResourceFormFields
          categories={[]}
          clubTypes={[]}
          unions={[{ union_id: 20, name: "Unión Mexicana Interoceánica" } as never]}
          localFields={[]}
          allowedScopeLevels={["union"]}
          lockedScopeId={20}
          {...props}
        />
      </form>
    </NextIntlClientProvider>,
  );
  return new FormData(container.querySelector("form") as HTMLFormElement);
}

describe("ResourceFormFields scope", () => {
  afterEach(() => cleanup());

  // A disabled select is left out of the submitted form, so a role locked to
  // one scope level got "Selecciona un alcance válido" on every upload.
  it("submits the scope level when the role locks it", () => {
    const data = renderForm();

    expect(data.get("scope_level")).toBe("union");
    expect(data.get("scope_id")).toBe("20");
  });

  it("submits the locked local field scope too", () => {
    const data = renderForm({
      allowedScopeLevels: ["local_field"],
      lockedScopeId: 4,
      localFields: [{ local_field_id: 4, name: "ACV", union_id: 20 } as never],
    });

    expect(data.get("scope_level")).toBe("local_field");
    expect(data.get("scope_id")).toBe("4");
  });
});
