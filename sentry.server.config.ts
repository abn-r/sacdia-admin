import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0d9b2caae6c202b23b34dbebb49c8aaf@o4510840511528960.ingest.us.sentry.io/4510840513036288",
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },
});
