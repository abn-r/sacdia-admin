import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { UserAvatar } from "./user-avatar";

const PUB = "https://pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev";

describe("UserAvatar", () => {
  afterEach(cleanup);

  it("serves a presigned avatar URL as-is, bypassing the optimizer", () => {
    const src = `${PUB}/users/1/avatar.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc&X-Amz-Expires=3600`;
    render(<UserAvatar src={src} name="Ana Lopez" />);

    const img = screen.getByRole("img", { name: "Ana Lopez" });
    expect(img).toHaveAttribute("src", src);
    expect(img.getAttribute("src")).not.toContain("/_next/image");
  });

  it("optimizes a public allowed avatar URL", () => {
    render(<UserAvatar src={`${PUB}/users/1/avatar.jpg`} name="Ana Lopez" />);

    expect(
      screen.getByRole("img", { name: "Ana Lopez" }).getAttribute("src"),
    ).toContain("/_next/image?url=");
  });

  it("keeps the raw URL for hosts outside remotePatterns", () => {
    const src = "https://example.com/a.png";
    render(<UserAvatar src={src} name="Ana Lopez" />);

    expect(screen.getByRole("img", { name: "Ana Lopez" })).toHaveAttribute("src", src);
  });

  it("renders initials when there is no src", () => {
    render(<UserAvatar src={null} name="Ana Lopez" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("falls back to initials when the image fails to load", () => {
    render(<UserAvatar src={`${PUB}/users/1/avatar.jpg`} name="Ana Lopez" />);

    fireEvent.error(screen.getByRole("img", { name: "Ana Lopez" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
