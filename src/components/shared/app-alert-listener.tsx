"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  APP_ALERT_PARAM_DESCRIPTION,
  APP_ALERT_PARAM_TITLE,
  APP_ALERT_PARAM_TYPE,
} from "@/lib/ui/app-alert-params";
import {
  isAppAlertType,
  showAppAlert,
} from "@/lib/ui/app-alerts";

export function AppAlertListener() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawTitle = searchParams.get(APP_ALERT_PARAM_TITLE);
    if (!rawTitle) return;

    const rawType = searchParams.get(APP_ALERT_PARAM_TYPE);
    const rawDescription = searchParams.get(APP_ALERT_PARAM_DESCRIPTION);
    const nextParams = new URLSearchParams(searchParams.toString());

    showAppAlert({
      type: isAppAlertType(rawType) ? rawType : "neutral",
      title: rawTitle,
      description: rawDescription || undefined,
    });

    nextParams.delete(APP_ALERT_PARAM_TYPE);
    nextParams.delete(APP_ALERT_PARAM_TITLE);
    nextParams.delete(APP_ALERT_PARAM_DESCRIPTION);

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
