import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CatalogThumbnail } from "./catalog-thumbnail";

const PUB = "https://pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev";

describe("CatalogThumbnail", () => {
  afterEach(cleanup);

  it("routes public R2 images through the Next.js optimizer", () => {
    render(<CatalogThumbnail src={`${PUB}/honors/a.png`} alt="Honor" size={40} />);

    const img = screen.getByRole("img", { name: "Honor" });
    expect(img.getAttribute("src")).toContain("/_next/image?url=");
    expect(img).toHaveAttribute("width", "40");
    expect(img).toHaveAttribute("height", "40");
    expect(img).not.toHaveAttribute("loading", "eager");
  });

  it("optimizes local static assets", () => {
    render(<CatalogThumbnail src="/img/logos-clases/AV-01.png" alt="Logo" size={32} />);

    expect(screen.getByRole("img", { name: "Logo" }).getAttribute("src")).toContain(
      "/_next/image?url=%2Fimg%2Flogos-clases%2FAV-01.png",
    );
  });

  it.each([
    ["presigned URL", `${PUB}/a.png?X-Amz-Signature=abc`],
    ["blob URL", "blob:http://localhost:3001/1"],
    ["unknown host", "https://example.com/a.png"],
  ])("keeps the raw URL for %s", (_label, src) => {
    render(<CatalogThumbnail src={src} alt="x" size={40} />);

    expect(screen.getByRole("img", { name: "x" })).toHaveAttribute("src", src);
  });

  it("renders the default placeholder when src is empty", () => {
    const { container } = render(<CatalogThumbnail src={null} size={40} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-muted")).toBeInTheDocument();
  });

  it("renders a custom fallback, or nothing for null", () => {
    const { rerender } = render(
      <CatalogThumbnail src="" size={40} fallback={<b>fallback</b>} />,
    );
    expect(screen.getByText("fallback")).toBeInTheDocument();

    rerender(<CatalogThumbnail src="" size={40} fallback={null} />);
    expect(screen.queryByText("fallback")).not.toBeInTheDocument();
  });

  it("swaps to the placeholder when the image fails and retries on a new src", () => {
    const { container, rerender } = render(
      <CatalogThumbnail src={`${PUB}/broken.png`} alt="Honor" size={40} />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Honor" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-muted")).toBeInTheDocument();

    rerender(<CatalogThumbnail src={`${PUB}/ok.png`} alt="Honor" size={40} />);
    expect(screen.getByRole("img", { name: "Honor" })).toBeInTheDocument();
  });
});
