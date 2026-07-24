import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

const ALLOWED_PDF_HOSTS = new Set([
  "5da196c051c48c7a4ebeea275a2b23d1.r2.cloudflarestorage.com",
  "pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev",
  "pub-c0e79f5fa4634581867fab5b0fed605c.r2.dev",
]);

type PdfProxyPayload = {
  url?: string;
  name?: string | null;
};

function isAllowedPdfUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_PDF_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function isPdfUrl(rawUrl: string): boolean {
  return /\.pdf(?:$|[?#\s])/i.test(rawUrl);
}

function contentDispositionInline(fileName: string | null): string {
  const safeName = (fileName?.trim() || "evidencia.pdf").replace(/["\\]/g, "_");
  return `inline; filename="${safeName}"`;
}

async function resolvePayload(
  request: NextRequest,
): Promise<PdfProxyPayload | null> {
  if (request.method === "POST") {
    try {
      return (await request.json()) as PdfProxyPayload;
    } catch {
      return null;
    }
  }

  return {
    url: request.nextUrl.searchParams.get("url") ?? undefined,
    name: request.nextUrl.searchParams.get("name"),
  };
}

async function proxyPdf(request: NextRequest) {
  const payload = await resolvePayload(request);
  const rawUrl = payload?.url?.trim();
  const fileName = payload?.name ?? null;

  if (!rawUrl || !isAllowedPdfUrl(rawUrl) || !isPdfUrl(rawUrl)) {
    return NextResponse.json({ error: "URL de PDF inválida" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const upstreamResponse = await fetch(rawUrl, {
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
  headers.set("Content-Disposition", contentDispositionInline(fileName));
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Length", String(pdfBytes.byteLength));

  return new NextResponse(pdfBytes, {
    status: 200,
    headers,
  });
}

export async function GET(request: NextRequest) {
  return proxyPdf(request);
}

export async function POST(request: NextRequest) {
  return proxyPdf(request);
}
