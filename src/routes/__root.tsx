import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import "./globals.css";
import { preconnect } from "react-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import React from "react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import appCss from "../styles.css?url";
import type { QueryClient } from "@tanstack/react-query";
import TanStackQueryDevtools from "@/components/devtools";
import Navbar from "@/components/navbar/navbar";
import TailwindIndicator from "@/components/tailwind-indicator";
import { env } from "@/env";
import { currentAccountQuery, filterDataQuery } from "@/queries";

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
  async loader({ context }) {
    await Promise.all([
      context.queryClient.ensureQueryData(filterDataQuery),
      context.queryClient.ensureQueryData(currentAccountQuery),
    ]);
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
