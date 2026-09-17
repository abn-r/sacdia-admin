import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { UserRolesOverview } from "@/components/users/user-roles-overview";

function renderOverview(
  clubSections: React.ComponentProps<typeof UserRolesOverview>["clubSections"],
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserRolesOverview clubSections={clubSections} />
    </NextIntlClientProvider>,
  );
}

describe("UserRolesOverview", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders only the club-section card, not the old system-role sibling cards", () => {
    renderOverview([
      {
        id: "asg-1",
        clubName: "ACV",
        sectionName: "Aventureros",
        roleName: "Director",
      },
    ]);

    expect(screen.getByText("Roles por sección de club")).toBeInTheDocument();
    expect(screen.getByText("ACV")).toBeInTheDocument();
    expect(screen.getByText("Aventureros")).toBeInTheDocument();
    expect(screen.getByText("Director")).toBeInTheDocument();

    expect(screen.queryByText("Roles globales")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles administrativos")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles operativos")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles de sistema")).not.toBeInTheDocument();
  });

  it("shows a single empty copy when there are no club section roles", () => {
    renderOverview([]);

    expect(screen.getByText("Roles por sección de club")).toBeInTheDocument();
    expect(screen.getAllByText("Sin rol asignado")).toHaveLength(1);
    expect(screen.queryByText("Sin rol de sistema")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles globales")).not.toBeInTheDocument();
  });
});
