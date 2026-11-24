import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ptBR from "../../../messages/pt-BR.json";

const certificatesMessages = { es, en, fr, "pt-BR": ptBR };
import type { InstitutionalCertificateRequest } from "@/lib/api/institutional-certificate-requests";

const session = vi.hoisted(() => ({
  isSuperAdmin: true,
  roles: new Set<string>(["super-admin"]),
}));

const mockDownload = vi.hoisted(() => vi.fn());
const mockApprove = vi.hoisted(() => vi.fn());
const mockReject = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

// Tabs live in the URL: a tiny reactive store stands in for the router.
const nav = vi.hoisted(() => {
  let search = "";
  const subs = new Set<() => void>();
  return {
    get: () => search,
    set(next: string) {
      search = next;
      subs.forEach((fn) => fn());
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
});
vi.mock("next/navigation", async () => {
  const react = await import("react");
  return {
    useRouter: () => ({
      refresh: mockRefresh,
      push: vi.fn(),
      replace: (url: string) => nav.set(url.split("?")[1] ?? ""),
    }),
    usePathname: () => "/dashboard/institutional-certificate-requests",
    useSearchParams: () => new URLSearchParams(react.useSyncExternalStore(nav.subscribe, nav.get, nav.get)),
  };
});

vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({
    can: () => session.isSuperAdmin,
    canAny: () => session.isSuperAdmin,
    canAll: () => session.isSuperAdmin,
    isSuperAdmin: session.isSuperAdmin,
    hasCapability: () => session.isSuperAdmin,
    permissions: new Set<string>(),
    capabilities: new Set<string>(
      session.isSuperAdmin ? ["institutional_certificates.review"] : [],
    ),
    roles: session.roles,
  }),
}));

vi.mock("@/lib/api/certificate-bulk-imports", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/certificate-bulk-imports")>();
  return {
    ...original,
    getCertificateBulkImportFileDownloadUrl: (...args: unknown[]) =>
      mockDownload(...args),
  };
});

vi.mock("@/lib/api/institutional-certificate-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/institutional-certificate-requests")>();
  return {
    ...original,
    approveInstitutionalCertificateRequest: (...args: unknown[]) =>
      mockApprove(...args),
    rejectInstitutionalCertificateRequest: (...args: unknown[]) =>
      mockReject(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { InstitutionalCertificateRequestListPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-list-page";
import { InstitutionalCertificateRequestDetailPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-detail-page";

const pending: InstitutionalCertificateRequest = {
  request_id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-1",
  class_id: 9,
  asset_code: "GM-02",
  class_name: "Guía Mayor Avanzado",
  file_id: "file-1",
  batch_id: "batch-1",
  status: "PENDING_REVIEW",
  revision: 0,
  completed_at: "1991-03-03",
  applicant_name: "Ana Solís",
  approval_blockers: [],
  enrollment_created: false,
  events: [
    {
      event_id: "event-1",
      action: "REQUEST_SUBMITTED",
      revision: 0,
      created_at: "2026-09-22T12:00:00.000Z",
    },
  ],
};

const rejected: InstitutionalCertificateRequest = {
  ...pending,
  request_id: "22222222-2222-2222-2222-222222222222",
  asset_code: "GM-03",
  class_name: "Instructor",
  applicant_name: "Luis Peña",
  status: "REJECTED",
  decision_reason: "No coincide",
};

const messages = certificatesMessages.es;
const enMessages = certificatesMessages.en;
const frMessages = certificatesMessages.fr;

function renderWithMessages(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("institutional certificate inbox screens", () => {
  beforeEach(() => {
    nav.set("");
    session.isSuperAdmin = true;
    session.roles = new Set(["super-admin"]);
    mockDownload.mockResolvedValue({
      file_id: "file-1",
      download_url: "https://files.example/sealed/proof.jpg?signature=1",
      expires_in: 900,
    });
    mockApprove.mockResolvedValue({ status: "APPROVED", enrollment_created: false });
    mockReject.mockResolvedValue({ status: "REJECTED", enrollment_created: false });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("tells the state with tabs (no KPIs, no filter buttons) and links to the detail", async () => {
    const user = userEvent.setup();
    renderWithMessages(<InstitutionalCertificateRequestListPage requests={[pending, rejected]} total={2} />);

    expect(screen.getByRole("tab", { name: /Pendientes/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Rechazadas 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pendientes" })).not.toBeInTheDocument();
    expect(screen.queryByText("Todas las solicitudes")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ana Solís").length).toBeGreaterThan(0);
    expect(screen.queryByText("Luis Peña")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar solicitante o clase"), "ana");
    expect(screen.getAllByText("Ana Solís").length).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText("Buscar solicitante o clase"));

    await user.click(screen.getByRole("tab", { name: /Rechazadas/ }));
    expect(screen.getAllByText("Luis Peña").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ana Solís")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Pendientes/ }));
    const review = screen.getAllByRole("link", { name: /revisar/i })[0];
    expect(review).toHaveAttribute(
      "href",
      "/dashboard/institutional-certificate-requests/11111111-1111-1111-1111-111111111111",
    );
  });

  it("marks only the exception: a blocker count in info, no status on pending rows", () => {
    renderWithMessages(
      <InstitutionalCertificateRequestListPage
        requests={[{ ...pending, approval_blockers: ["a", "b"] }]}
        total={1}
      />,
    );
    expect(screen.getAllByText("2 bloqueos").length).toBeGreaterThan(0);
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
  });

  it("shows the empty state of the tab instead of an empty table", async () => {
    const user = userEvent.setup();
    renderWithMessages(<InstitutionalCertificateRequestListPage requests={[pending]} total={1} />);
    await user.click(screen.getByRole("tab", { name: /Aprobadas/ }));
    expect(screen.getByText("Sin solicitudes aprobadas")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("puts the decisions in the header and tells the timeline in plain language", async () => {
    renderWithMessages(<InstitutionalCertificateRequestDetailPage request={pending} />);
    expect(await screen.findByText("Solicitud enviada")).toBeInTheDocument();
    expect(screen.queryByText("REQUEST_SUBMITTED")).toBeNull();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Ana Solís");
    expect(screen.getByRole("button", { name: "Rechazar…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aprobar validación/i })).toBeInTheDocument();
  });

  it("shows the system block as an informative note, not as an alert", () => {
    renderWithMessages(
      <InstitutionalCertificateRequestDetailPage request={{ ...pending, approval_blockers: ["NO_REQUIREMENTS_2026"] }} />,
    );
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("NO_REQUIREMENTS_2026");
    expect(note).toHaveTextContent(/no rechaces/i);
    expect(note.className).not.toMatch(/amber|destructive/);
  });

  it("shows the signed proof and approves one request without calling it a class enrollment", async () => {
    const user = userEvent.setup();
    renderWithMessages(<InstitutionalCertificateRequestDetailPage request={pending} />);

    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith("batch-1", "file-1");
    });
    const proof = await screen.findByRole("img", { name: "Comprobante" });
    expect(proof).toHaveAttribute("src", "https://files.example/sealed/proof.jpg?signature=1");
    expect(screen.getByRole("link", { name: /^abrir$/i })).toHaveAttribute(
      "href",
      "https://files.example/sealed/proof.jpg?signature=1",
    );

    await user.click(screen.getByRole("button", { name: /aprobar validación/i }));
    expect(screen.getByText(/la aprobación no crea una inscripción de clase/i)).toBeInTheDocument();

    const approveButtons = screen.getAllByRole("button", { name: /aprobar validación/i });
    await user.click(approveButtons[approveButtons.length - 1]);
    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(pending.request_id, { expected_revision: 0 });
    });
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("shows an error with retry when the proof cannot be loaded, never an empty box", async () => {
    mockDownload.mockRejectedValueOnce(new Error("boom"));
    renderWithMessages(<InstitutionalCertificateRequestDetailPage request={pending} />);
    expect(await screen.findByText("Comprobante no disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("rejects one request with a reason and hides both actions from other roles", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithMessages(<InstitutionalCertificateRequestDetailPage request={pending} />);

    await user.click(screen.getByRole("button", { name: "Rechazar…" }));
    await user.type(screen.getByLabelText(/motivo de rechazo/i), "No coincide con la persona");
    const rejectButtons = screen.getAllByRole("button", { name: /^rechazar$/i });
    await user.click(rejectButtons[rejectButtons.length - 1]);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith(pending.request_id, {
        expected_revision: 0,
        reason: "No coincide con la persona",
      });
    });

    unmount();
    session.isSuperAdmin = false;
    session.roles = new Set(["director-lf"]);
    renderWithMessages(<InstitutionalCertificateRequestDetailPage request={pending} />);

    expect(screen.queryByRole("button", { name: /aprobar validación/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rechazar/i })).not.toBeInTheDocument();
  });

  it("renders the list from the active locale instead of hardcoded Spanish", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <InstitutionalCertificateRequestListPage requests={[pending, rejected]} total={2} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(/not class enrollment/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search applicant, class...")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Pending/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Applicant" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /review/i })).toHaveLength(1);
    await user.click(screen.getByRole("tab", { name: /All/ }));
    expect(screen.getAllByRole("link", { name: /review/i })).toHaveLength(2);
    expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);
  });

  it("localizes the no-results state in French", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <InstitutionalCertificateRequestListPage requests={[{ ...pending, approval_blockers: ["a", "b"] }]} total={1} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText("2 blocages").length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText("Rechercher un demandeur ou une classe"), "zzzz");
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
  });

  it("localizes the detail panel copy", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <InstitutionalCertificateRequestDetailPage request={pending} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("button", { name: "Reject…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve validation" })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Proof" })).toBeInTheDocument();
  });
});
