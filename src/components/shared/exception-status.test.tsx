import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ExceptionStatus } from "@/components/shared/exception-status";

afterEach(cleanup);

type S = "active" | "inactive" | "pending";
const labels: Record<S, string> = { active: "Activo", inactive: "Inactivo", pending: "Pendiente" };

describe("ExceptionStatus", () => {
  it("renders nothing for normal values", () => {
    const { container } = render(
      <ExceptionStatus<S> value="active" normal={["active"]} labels={labels} intents={{}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a badge for exceptions", () => {
    render(
      <ExceptionStatus<S>
        value="inactive"
        normal={["active"]}
        labels={labels}
        intents={{ inactive: "destructive" }}
      />,
    );
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });
});
