import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { preconnect } from "react-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import React from "react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import appCss from "../styles/tailwind.css?url";
import type { QueryClient } from "@tanstack/react-query";
import TanStackQueryDevtools from "@/components/devtools";
import Navbar from "@/components/navbar/navbar";
import TailwindIndicator from "@/components/tailwind-indicator";
import { env } from "@/lib/env/client";
import { currentAccountQuery, filterDataQuery } from "@/queries";
import { systemStatusQuery } from "@/lib/server/system";

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
  shellComponent: RootDocument,
  loader({ context }) {
    context.queryClient.ensureQueryData(filterDataQuery);
    context.queryClient.ensureQueryData(currentAccountQuery);
    context.queryClient.ensureQueryData(systemStatusQuery);
  },
});

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
