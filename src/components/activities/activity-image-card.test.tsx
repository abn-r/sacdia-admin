import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ActivityImageCard } from "./activity-image-card";

afterEach(cleanup);

describe("ActivityImageCard", () => {
  it("renders the image with its title", () => {
    render(<ActivityImageCard title="Imagen" src="https://r2.test/a.png" alt="Campamento" />);

    expect(screen.getByText("Imagen")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Campamento" })).toHaveAttribute(
      "src",
      "https://r2.test/a.png",
    );
  });

  it("hides the whole block when the image fails to load", () => {
    render(<ActivityImageCard title="Imagen" src="https://r2.test/a.png" alt="Campamento" />);

    fireEvent.error(screen.getByRole("img", { name: "Campamento" }));

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("Imagen")).toBeNull();
  });

  it("tries again when the image URL changes", () => {
    const { rerender } = render(
      <ActivityImageCard title="Imagen" src="https://r2.test/a.png" alt="Campamento" />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();

    rerender(<ActivityImageCard title="Imagen" src="https://r2.test/b.png" alt="Campamento" />);

    expect(screen.getByRole("img")).toHaveAttribute("src", "https://r2.test/b.png");
  });
});
