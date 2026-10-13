import SignIn from "@/components/auth/sign-in";
import { Error } from "@/components/error-boundary";
import TradeView, { TradeViewSkeleton } from "@/components/trades/trade-view";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { tradeQuery } from "@/lib/queries/trades";
import { sanitizeUuid } from "@/lib/universal/parsers";
import { IconHeartBroken, IconLogin2 } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/trade/$id")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  loader: async ({ context, params }) => {
    // discord users sometimes paste formatting onto the end of the URL
    const id = sanitizeUuid(params.id);
    if (!id) throw notFound();

    // a signed-out visitor gets the sign-in state, never the trade
    const account =
      await context.queryClient.ensureQueryData(currentAccountQuery);
    if (account === null) return { id, signedIn: false };

    // anyone but the trade's parties gets not found
    if ((await context.queryClient.ensureQueryData(tradeQuery(id))) === null) {
      throw notFound();
    }
    return { id, signedIn: true };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: m.trade_page_title(),
      canonical: loaderData ? `/trade/${loaderData.id}` : undefined,
      denyRobots: true,
    }),
});

function RouteComponent() {
  const { id, signedIn } = Route.useLoaderData();
  return signedIn ? <TradeDetail id={id} /> : <SignedOut />;
}

function TradeDetail({ id }: { id: string }) {
  const { data } = useSuspenseQuery(tradeQuery(id));

  // the cached answer can outlive the session that loaded it
  return data === null ? (
    <NotFoundComponent />
  ) : (
    <main className="flex flex-col">
      <TradeView trade={data.trade} viewer={data.viewer} />
    </main>
  );
}

function SignedOut() {
  const href = useLocation({ select: (location) => location.href });

  return (
    <main className="container flex flex-col py-6 md:py-12">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconLogin2 />
          </EmptyMedia>
          <EmptyTitle>{m.trade_page_signed_out_title()}</EmptyTitle>
          <EmptyDescription>{m.trade_page_signed_out_body()}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SignIn
            trigger={<Button variant="cosmo">{m.auth_sign_in()}</Button>}
            callbackURL={href}
          />
        </EmptyContent>
      </Empty>
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="flex flex-col">
      <TradeViewSkeleton />
    </main>
  );
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <IconHeartBroken className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.trade_error_trade_not_found()}</p>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.trade_page_error()} />;
}
