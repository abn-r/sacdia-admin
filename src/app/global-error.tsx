"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// global-error replaces the root layout: no providers, fonts or app CSS, so
// the markup is self-contained with inline styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const button = {
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    border: "1px solid #d4d4d8",
  } as const;

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#18181b",
          background: "#fafafa",
        }}
      >
        <main role="alert" style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: 14, color: "#52525b", margin: "0 0 20px" }}>
            Ocurrió un error inesperado. Reintenta o vuelve al inicio.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{ ...button, background: "#18181b", color: "#fff", borderColor: "#18181b" }}
            >
              Reintentar
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be broken here */}
            <a href="/dashboard" style={{ ...button, color: "#18181b", background: "#fff" }}>
              Ir al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
