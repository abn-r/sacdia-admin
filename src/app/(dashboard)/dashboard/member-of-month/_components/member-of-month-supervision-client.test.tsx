import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock("@/components/member-of-month/evaluate-dialog", () => ({
  EvaluateMemberOfMonthDialog: () => null,
}));

import { MemberOfMonthSupervisionClient } from "./member-of-month-supervision-client";

function renderClient() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MemberOfMonthSupervisionClient
        initialData={{ items: [], total: 0, page: 1, limit: 20 } as never}
        clubTypes={[{ club_type_id: 1, name: "Conquistadores" }]}
        localFields={[
          { local_field_id: 4, name: "Asociación Centro de Occidente", union_id: 2 },
        ]}
        territoryScope={{ level: "all" }}
        searchParams={{}}
      />
    </NextIntlClientProvider>,
  );
}

describe("MemberOfMonthSupervisionClient filters", () => {
  afterEach(() => cleanup());

  it("labels every filter select visibly", () => {
    renderClient();

    for (const name of ["Tipo de club", "Campo local", "Año", "Mes", "Notificado"]) {
      const select = screen.getByRole("combobox", { name });
      expect(select).toBeInTheDocument();
      expect(screen.getByText(name, { selector: "label" })).toBeInTheDocument();
    }
  });

  it("does not pin the selects to fixed narrow widths that truncate their values", () => {
    renderClient();

    for (const name of ["Tipo de club", "Campo local", "Año", "Mes", "Notificado"]) {
      expect(screen.getByRole("combobox", { name })).toHaveClass("w-full");
    }
  });
});
