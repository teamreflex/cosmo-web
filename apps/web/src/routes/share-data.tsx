import DoneStep from "@/components/share-data/done-step";
import InfoStep from "@/components/share-data/info-step";
import GetRecaptcha from "@/components/share-data/qr-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { scrapeCandidatesQuery } from "@/lib/queries/share-data";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/share-data")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context }) => {
    const collections = await context.queryClient.ensureQueryData(
      scrapeCandidatesQuery,
    );

    return { collections };
  },
  head: () =>
    defineHead({ title: m.share_data_title(), canonical: "/share-data" }),
  component: RouteComponent,
});

type State =
  | { step: "info" }
  | { step: "auth" }
  | { step: "done"; updated: number };

function RouteComponent() {
  const { collections } = Route.useLoaderData();
  const [state, setState] = useState<State>({ step: "info" });

  if (collections.size === 0) {
    return (
      <div className="container flex max-w-sm flex-col gap-2 py-2">
        <Card>
          <CardContent>
            <p>No collections require COSMO updates.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex max-w-xl flex-col gap-2 py-2">
      <Card>
        <CardHeader>
          <CardTitle>{m.share_data_title()}</CardTitle>
        </CardHeader>
        <CardContent>
          {state.step === "info" && (
            <InfoStep onContinue={() => setState({ step: "auth" })} />
          )}

          {state.step === "auth" && (
            <GetRecaptcha
              onSuccess={(updated) => setState({ step: "done", updated })}
            />
          )}

          {state.step === "done" && <DoneStep updated={state.updated} />}
        </CardContent>
      </Card>
    </div>
  );
}
