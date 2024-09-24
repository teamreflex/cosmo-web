"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import { env } from "@/env.mjs";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

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
  return (
    <html>
      <head>
        <title>{env.NEXT_PUBLIC_APP_NAME}</title>
      </head>

      <body
        className={`dark ${inter.variable} font-sans bg-background text-foreground`}
      >
        <div className="flex flex-col items-center justify-center h-dvh w-full">
          <h2 className="font-semibold text-lg">Something went wrong!</h2>
          <p className="text-sm">
            Either a bug needs to be fixed, COSMO is under maintenance or is
            under heavy load.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2" />
            <span>Reload</span>
          </Button>
        </div>
      </body>
    </html>
  );
}
