"use client";

import { load, trackPageview } from "fathom-client";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { env } from "@/env.mjs";

function TrackPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Load the Fathom script on mount
  useEffect(() => {
    load(env.NEXT_PUBLIC_FATHOM_ID, {
      includedDomains: [env.NEXT_PUBLIC_FATHOM_URL],
      auto: false,
    });
  }, []);

  // Record a pageview when route changes
  useEffect(() => {
    if (!pathname) return;

    const params = searchParams.toString();

    trackPageview({
      url: pathname + (params.length > 0 ? `?${params}` : ""),
      referrer: document.referrer,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function Fathom() {
  if (env.NEXT_PUBLIC_FATHOM_ID === "dev") return null;
  return (
    <Suspense fallback={null}>
      <TrackPageView />
    </Suspense>
  );
}
