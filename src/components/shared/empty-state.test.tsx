import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  afterEach(() => cleanup());

  it("renders lucide forwardRef icons passed as component references", () => {
    const { container } = render(
      <EmptyState
        icon={FileText}
        title="Sin cargas pendientes"
        description="No hay cargas por certificado esperando revisión."
      />,
    );

    expect(screen.getByRole("heading", { name: "Sin cargas pendientes" })).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
