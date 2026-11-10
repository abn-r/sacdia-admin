import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventAttachmentsSection } from "@/components/camporee-events/event-attachments-section";
import type { CamporeeEventAttachment } from "@/lib/api/camporee-events";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.name ? `${key}:${String(values.name)}` : key,
}));

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

vi.mock("@/lib/api/camporee-events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/camporee-events")>(
    "@/lib/api/camporee-events",
  );
  return {
    ...actual,
    listCamporeeEventAttachments: mocks.list,
    uploadCamporeeEventAttachment: mocks.upload,
    deleteCamporeeEventAttachment: mocks.remove,
  };
});

const pdf: CamporeeEventAttachment = {
  attachment_id: "a1",
  file_name: "reglamento.pdf",
  mime_type: "application/pdf",
  size_bytes: 2048,
  url: "https://signed/a1",
  created_at: "2026-11-01T00:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EventAttachmentsSection", () => {
  it("shows the empty state", () => {
    render(<EventAttachmentsSection eventId={1} />);
    expect(screen.getByText("empty")).toBeTruthy();
  });

  it("lists attachments with a link to the signed url", () => {
    render(<EventAttachmentsSection eventId={1} initialAttachments={[pdf]} />);
    expect(screen.getByText("reglamento.pdf")).toBeTruthy();
    expect(screen.getByText("2 KB")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("https://signed/a1");
  });

  it("rejects invalid type and oversized files without calling the API", async () => {
    render(<EventAttachmentsSection eventId={1} />);
    const input = screen.getByTestId("attachments-input");
    const bad = new File(["x"], "a.txt", { type: "text/plain" });
    const big = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [bad, big] } });
    await waitFor(() => expect(screen.getByText("errorType:a.txt")).toBeTruthy());
    expect(screen.getByText("errorSize:big.pdf")).toBeTruthy();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("uploads a valid file and refreshes", async () => {
    mocks.upload.mockResolvedValue({ ...pdf, attachment_id: "a2", file_name: "mapa.pdf" });
    mocks.list.mockResolvedValue([pdf]);
    render(<EventAttachmentsSection eventId={7} />);
    const file = new File(["x"], "mapa.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("attachments-input"), { target: { files: [file] } });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(7, file));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(7));
  });

  it("shows the server error message when upload fails", async () => {
    mocks.upload.mockRejectedValue(new Error("Archivo demasiado grande"));
    render(<EventAttachmentsSection eventId={1} />);
    const file = new File(["x"], "m.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("attachments-input"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("Archivo demasiado grande")).toBeTruthy());
  });

  it("confirms before deleting", async () => {
    mocks.remove.mockResolvedValue({ status: "success" });
    mocks.list.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<EventAttachmentsSection eventId={3} initialAttachments={[pdf]} />);
    await user.click(screen.getByRole("button", { name: "delete: reglamento.pdf" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "confirmDelete" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(3, "a1"));
  });
});
