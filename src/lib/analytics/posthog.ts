import posthog from "posthog-js";

function analyticsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);
}

export function identifyAnalyticsUser(userId: string) {
  if (!analyticsEnabled() || userId.length === 0) {
    return;
  }

  posthog.identify(userId);
}

export function resetAnalyticsUser() {
  if (!analyticsEnabled()) {
    return;
  }

  posthog.reset();
}
