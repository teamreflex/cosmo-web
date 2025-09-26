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
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FileQuestion, RefreshCcw } from "lucide-react";
import appCss from "../styles/tailwind.css?url";
import type { QueryClient } from "@tanstack/react-query";
import TanStackQueryDevtools from "@/components/devtools";
import Navbar from "@/components/navbar/navbar";
import TailwindIndicator from "@/components/tailwind-indicator";
import { env } from "@/lib/env/client";
import { currentAccountQuery, filterDataQuery } from "@/queries";
import { systemStatusQuery } from "@/lib/server/system";
import { Button } from "@/components/ui/button";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
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
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      // umami analytics
      {
        src: env.VITE_UMAMI_SCRIPT_URL,
        async: true,
        "data-website-id": env.VITE_UMAMI_ID,
        strategy: "afterInteractive",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  loader({ context }) {
    context.queryClient.prefetchQuery(filterDataQuery);
    context.queryClient.prefetchQuery(currentAccountQuery);
    context.queryClient.prefetchQuery(systemStatusQuery);
  },
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  preconnect(new URL(env.VITE_SENTRY_DSN).origin);
  preconnect("https://imagedelivery.net");
  preconnect("https://resources.cosmo.fans");
  preconnect("https://static.cosmo.fans");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-inter antialiased bg-background text-foreground overflow-y-scroll">
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

        <TanStackDevtools
          config={{
            position: "bottom-left",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12">
      <FileQuestion className="w-24 h-24" />
      <p className="font-semibold text-sm text-center">Page not found</p>
    </div>
  );
}

function ErrorComponent() {
  return (
    <main className="flex flex-col gap-1.5 items-center justify-center h-dvh w-full">
      <h2 className="font-semibold text-lg">Something went wrong!</h2>
      <p className="text-sm">
        This means COSMO is under maintenance, experiencing heavy traffic, or a
        bug in {env.VITE_APP_NAME} needs to be fixed.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        <RefreshCcw className="mr-2" />
        <span>Reload</span>
      </Button>
    </main>
  );
}
