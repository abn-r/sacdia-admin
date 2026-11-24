import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { UserDetailAside } from "@/components/users/detail/aside";

describe("UserDetailAside", () => {
  afterEach(cleanup);

  it("renders each fact as a term/definition pair and the actions below", () => {
    render(
      <UserDetailAside
        facts={[
          { label: "Club", value: "Club Orión" },
          { label: "Panel", value: "Sin acceso", muted: true },
        ]}
        actions={<button type="button">Acción</button>}
      />,
    );
    expect(screen.getByText("Club").tagName).toBe("DT");
    expect(screen.getByText("Club Orión").tagName).toBe("DD");
    expect(screen.getByText("Sin acceso").className).toContain("text-muted-foreground");
    expect(screen.getByRole("button", { name: "Acción" })).toBeInTheDocument();
  });

  it("omits the actions block when there are none", () => {
    const { container } = render(<UserDetailAside facts={[{ label: "A", value: "B" }]} />);
    expect(container.querySelector(".border-t")).toBeNull();
  });
});
