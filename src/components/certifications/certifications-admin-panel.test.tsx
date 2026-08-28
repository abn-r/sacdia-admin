/**
 * Integration tests for CertificationsAdminPanel.
 *
 * Covers the admin read endpoints integration:
 * - GET /admin/certifications on mount (list with version summaries).
 * - GET /admin/certifications/:id/versions/:versionId when opening a version
 *   (full tree hydrates the workbench).
 * - PUBLISHED/RETIRED versions open read-only (edit disabled, clone kept);
 *   DRAFT versions stay editable.
 *
 * `@/lib/api/certifications` is mocked at module boundary (same pattern as
 * certification-tree-editor.test.tsx). Vitest uses `globals: false` —
 * explicit `cleanup()` per `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type {
  AdminCertificationListItem,
  AdminCertificationVersionDetail,
} from "@/lib/api/certifications";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockListAdminCertifications = vi.fn<() => Promise<AdminCertificationListItem[]>>();
const mockGetCertificationVersionDetail =
  vi.fn<(certificationId: number, versionId: number) => Promise<AdminCertificationVersionDetail>>();
const mockCreateDraftVersion = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("@/lib/api/certifications", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/certifications")>();
  return {
    ...original,
    listAdminCertifications: () => mockListAdminCertifications(),
    getCertificationVersionDetail: (certificationId: number, versionId: number) =>
      mockGetCertificationVersionDetail(certificationId, versionId),
    createDraftVersion: (...args: unknown[]) => mockCreateDraftVersion(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import { CertificationsAdminPanel } from "@/components/certifications/certifications-admin-panel";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const listFixture: AdminCertificationListItem[] = [
  {
    certification_id: 1,
    name: "Guía Mayor",
    description: "Certificación de liderazgo",
    active: true,
    certification_versions: [
      {
        certification_version_id: 11,
        version_number: 2,
        status: "DRAFT",
        title: null,
        published_at: null,
        retired_at: null,
      },
      {
        certification_version_id: 10,
        version_number: 1,
        status: "PUBLISHED",
        title: "Versión inicial",
        published_at: "2026-07-01T00:00:00.000Z",
        retired_at: null,
      },
    ],
  },
];

function makeDetail(
  overrides: Partial<AdminCertificationVersionDetail>,
): AdminCertificationVersionDetail {
  return {
    certification_version_id: 10,
    certification_id: 1,
    version_number: 1,
    status: "PUBLISHED",
    title: "Versión inicial",
    description: null,
    min_duration_months: null,
    max_duration_months: null,
    published_at: "2026-07-01T00:00:00.000Z",
    retired_at: null,
    certification_eligibility_rules: [
      {
        eligibility_rule_id: 5,
        certification_version_id: 10,
        rule_type: "MIN_AGE",
        configuration: { min_age: 16 },
        sort_order: 0,
      },
    ],
    certification_modules: [
      {
        module_id: 2,
        certification_id: 1,
        certification_version_id: 10,
        name: "Módulo cargado",
        sort_order: 0,
        certification_sections: [
          {
            section_id: 3,
            module_id: 2,
            name: "Sección cargada",
            sort_order: 0,
            required: true,
            certification_requirement_components: [
              {
                component_id: 4,
                section_id: 3,
                component_type: "TEXT_RESPONSE",
                label: "Describe tu experiencia",
                configuration: {},
                sort_order: 0,
                required: true,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CertificationsAdminPanel certifications={[]} canConfigure canPublish />
    </NextIntlClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CertificationsAdminPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAdminCertifications.mockResolvedValue(listFixture);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the certification list with version summaries via GET on mount", async () => {
    renderPanel();

    await waitFor(() => {
      expect(mockListAdminCertifications).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Guía Mayor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /versión 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /versión 2/i })).toBeInTheDocument();
    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("opens a PUBLISHED version read-only after loading its tree via GET", async () => {
    mockGetCertificationVersionDetail.mockResolvedValue(makeDetail({ status: "PUBLISHED" }));

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /versión 1/i }));

    await waitFor(() => {
      expect(mockGetCertificationVersionDetail).toHaveBeenCalledWith(1, 10);
    });

    // Read-only banner + disabled metadata editing, clone still available.
    expect(await screen.findByText(/solo lectura/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^título$/i)).toBeDisabled();
    expect(screen.getByLabelText(/^título$/i)).toHaveValue("Versión inicial");
    expect(
      screen.queryByRole("button", { name: /guardar metadatos/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clonar/i })).toBeInTheDocument();

    // Eligibility rules from the GET payload render read-only (no add/save).
    expect(
      screen.queryByRole("button", { name: /agregar regla/i }),
    ).not.toBeInTheDocument();
  });

  it("opens a DRAFT version editable with the tree loaded via GET", async () => {
    mockGetCertificationVersionDetail.mockResolvedValue(
      makeDetail({
        certification_version_id: 11,
        version_number: 2,
        status: "DRAFT",
        title: "Borrador en curso",
        published_at: null,
      }),
    );

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /versión 2/i }));

    await waitFor(() => {
      expect(mockGetCertificationVersionDetail).toHaveBeenCalledWith(1, 11);
    });

    expect(await screen.findByLabelText(/^título$/i)).toBeEnabled();
    expect(screen.getByLabelText(/^título$/i)).toHaveValue("Borrador en curso");
    expect(screen.queryByText(/solo lectura/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar metadatos/i })).toBeInTheDocument();
  });

  it("shows an error toast when the version detail fails to load", async () => {
    mockGetCertificationVersionDetail.mockRejectedValue(new Error("Detalle no disponible"));

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /versión 1/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Detalle no disponible");
    });
    expect(screen.queryByText(/solo lectura/i)).not.toBeInTheDocument();
  });
});
