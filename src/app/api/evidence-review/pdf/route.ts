import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { API_BASE_URL } from "@/lib/api/client";

export const dynamic = "force-dynamic";

type EvidenceType = "class" | "honor";

type EvidenceFile = {
  evidence_file_id: number;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
};

type EvidenceDetailResponse = {
  data?: {
    files?: EvidenceFile[];
  };
};

function parseInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function isEvidenceType(value: string | null): value is EvidenceType {
  return value === "class" || value === "honor";
}

function isPdfFile(file: EvidenceFile): boolean {
  const fileType = file.file_type?.toLowerCase() ?? "";
  if (fileType.includes("pdf")) return true;

  const value = `${file.file_name ?? ""} ${file.file_url}`.toLowerCase();
  return /\.pdf(?:$|[?#\s])/i.test(value);
}

function contentDispositionInline(fileName: string | null): string {
  const safeName = (fileName?.trim() || "evidencia.pdf").replace(/["\\]/g, "_");
  return `inline; filename="${safeName}"`;
}

function backendEvidenceDetailUrl(type: EvidenceType, id: number): string {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
  return new URL(`evidence-review/${type}/${id}`, base).toString();
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const evidenceId = parseInteger(request.nextUrl.searchParams.get("id"));
  const fileId = parseInteger(request.nextUrl.searchParams.get("fileId"));

  if (!isEvidenceType(type) || evidenceId == null || evidenceId <= 0 || fileId == null) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const detailResponse = await fetch(backendEvidenceDetailUrl(type, evidenceId), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!detailResponse.ok) {
    return NextResponse.json(
      { error: "No se pudo cargar el detalle de la evidencia" },
      { status: detailResponse.status },
    );
  }

  const detail = (await detailResponse.json()) as EvidenceDetailResponse;
  const file = detail.data?.files?.find((item) => item.evidence_file_id === fileId);

  if (!file) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  if (!isPdfFile(file)) {
    return NextResponse.json(
      { error: "El archivo solicitado no es PDF" },
      { status: 415 },
    );
  }

  const upstreamResponse = await fetch(file.file_url, {
    headers: { Accept: "application/pdf,*/*" },
    cache: "no-store",
    redirect: "follow",
  });

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { error: "No se pudo abrir el PDF" },
      { status: 502 },
    );
  }

  const pdfBytes = await upstreamResponse.arrayBuffer();
  if (pdfBytes.byteLength === 0) {
    return NextResponse.json({ error: "El PDF está vacío" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", contentDispositionInline(file.file_name));
  headers.set("Cache-Control", "no-store");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Content-Length", String(pdfBytes.byteLength));

  return new NextResponse(pdfBytes, {
    status: 200,
    headers,
  });
}
