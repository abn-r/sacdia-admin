import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (token && apiHost) {
  posthog.init(token, {
    api_host: apiHost,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    disable_session_recording: true,
    autocapture: false,
  });
}
