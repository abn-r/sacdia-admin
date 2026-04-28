import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0d9b2caae6c202b23b34dbebb49c8aaf@o4510840511528960.ingest.us.sentry.io/4510840513036288",
  environment: process.env.NODE_ENV,
  release:
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.SENTRY_RELEASE ||
    undefined,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Network request failed",
    "NetworkError",
    "AbortError",
  ],
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
