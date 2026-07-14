import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/es.json";
import { AnnualFolderEvidenceViewerDialog } from "./annual-folder-evidence-viewer-dialog";
import type { FolderEvidence } from "@/lib/api/annual-folders";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const imageEvidence: FolderEvidence = {
  evidence_id: "image-1",
  annual_folder_id: "folder-1",
  section_id: "section-1",
  file_url: "https://files.test/evidence.png?signature=123",
  file_name: "evidence.png",
  description: null,
  uploaded_at: null,
  uploaded_by: "Uploader",
};

const pdfEvidence: FolderEvidence = {
  ...imageEvidence,
  evidence_id: "pdf-1",
  file_url: "https://files.test/evidence.pdf?signature=123",
  file_name: "evidence.pdf",
};

describe("AnnualFolderEvidenceViewerDialog", () => {
  afterEach(() => cleanup());

  it("renders image evidence with zoom controls inside the panel", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AnnualFolderEvidenceViewerDialog
          evidence={imageEvidence}
          evidences={[imageEvidence]}
          onSelectEvidence={vi.fn()}
          onOpenChange={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Vista de imagen")).toBeInTheDocument();
    expect(screen.getByLabelText("Acercar")).toBeInTheDocument();
    expect(screen.getByAltText("evidence.png")).toBeInTheDocument();
  });

  it("renders PDF evidence in an embedded viewer", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AnnualFolderEvidenceViewerDialog
          evidence={pdfEvidence}
          evidences={[pdfEvidence]}
          onSelectEvidence={vi.fn()}
          onOpenChange={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Vista de PDF")).toBeInTheDocument();
    expect(screen.getByText("Cargando PDF…")).toBeInTheDocument();
  });
});
