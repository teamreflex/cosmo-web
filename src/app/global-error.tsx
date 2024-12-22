"use client";

import "../styles/tailwind.css";
import { Inter } from "next/font/google";
import { env } from "@/env.mjs";
import { Button } from "@/components/ui/button";
import { LuRefreshCcw } from "react-icons/lu";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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

  return (
    <html>
      <head>
        <title>{env.NEXT_PUBLIC_APP_NAME}</title>
      </head>

      <body
        className={`dark ${inter.variable} font-sans bg-background text-foreground`}
      >
        <div className="flex flex-col gap-1.5 items-center justify-center h-dvh w-full">
          <h2 className="font-semibold text-lg">Something went wrong!</h2>
          <p className="text-sm">
            This means COSMO is under maintenance, experiencing heavy traffic,
            or a bug in {env.NEXT_PUBLIC_APP_NAME} needs to be fixed.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <LuRefreshCcw className="mr-2" />
            <span>Reload</span>
          </Button>
        </div>
      </body>
    </html>
  );
}
