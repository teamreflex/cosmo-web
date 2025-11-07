import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { preconnect } from "react-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import React from "react";
import { FileQuestion, RefreshCcw } from "lucide-react";
import appCss from "../styles/tailwind.css?url";
import type { QueryClient } from "@tanstack/react-query";
import Navbar from "@/components/navbar/navbar";
import TailwindIndicator from "@/components/tailwind-indicator";
import { env } from "@/lib/env/client";
import { m } from "@/i18n/messages";
import {
  artistsQuery,
  currentAccountQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import { systemStatusQuery } from "@/lib/queries/system";
import { Button } from "@/components/ui/button";
import { getLocale } from "@/i18n/runtime";
import Devtools from "@/components/devtools";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  staleTime: Infinity,
  loader({ context }) {
    context.queryClient.prefetchQuery(currentAccountQuery);
    context.queryClient.prefetchQuery(systemStatusQuery);
    context.queryClient.prefetchQuery(selectedArtistsQuery);
    context.queryClient.prefetchQuery(artistsQuery);
  },
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: env.VITE_APP_NAME },
      {
        description: `${env.VITE_APP_NAME} - Objekt & gravity explorer for Cosmo`,
      },
      {
        keywords: [
          "kpop",
          "korea",
          "modhaus",
          "모드하우스",
          "cosmo",
          "objekt",
          "como",
          "gravity",
          "tripleS",
          "트리플에스",
          "artms",
          "artemis",
          "아르테미스",
          "아르테미스 스트래티지",
          "odd eye circle",
          "오드아이써클",
          "loona",
          "이달의 소녀",
          "idntt",
        ],
      },
    ],
    links: [
      {
        rel: "preload",
        href: "/HalvarBreit-Bd.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#020618" },
      { rel: "icon", href: "/favicon.ico" },
    ],
    scripts: [
      // umami analytics
      ...(env.VITE_UMAMI_ID && env.VITE_UMAMI_SCRIPT_URL
        ? [
            {
              src: env.VITE_UMAMI_SCRIPT_URL,
              async: true,
              "data-website-id": env.VITE_UMAMI_ID,
            },
          ]
        : []),
    ],
  }),
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  preconnect("https://imagedelivery.net");
  preconnect("https://resources.cosmo.fans");
  preconnect("https://static.cosmo.fans");
  if (env.VITE_SENTRY_DSN) {
    preconnect(new URL(env.VITE_SENTRY_DSN).origin);
  }

  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-inter overflow-y-scroll bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark">
          <div className="relative flex min-h-dvh flex-col">
            <Navbar />

            {/* content */}
            <div className="flex min-w-full flex-col text-foreground">
              {children}
            </div>
          </div>

          <Toaster />
          <TailwindIndicator />
        </ThemeProvider>

        <Devtools />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12">
      <FileQuestion className="h-24 w-24" />
      <p className="text-center text-sm font-semibold">
        {m.error_page_not_found()}
      </p>
    </div>
  );
}

function ErrorComponent() {
  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center gap-1.5">
      <h2 className="text-lg font-semibold">{m.error_something_wrong()}</h2>
      <p className="text-sm">
        {m.error_something_wrong_description({ appName: env.VITE_APP_NAME })}
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        <RefreshCcw className="mr-2" />
        <span>{m.error_reload()}</span>
      </Button>
    </main>
  );
}
