import BinderEditor from "@/components/binders/binder-editor";
import { Error } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { binderQuery } from "@/lib/queries/binders";
import { currentAccountQuery } from "@/lib/queries/core";
import { IconHeartBroken } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/@{$username}/binder/$slug")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  loader: async ({ context, params }) => {
    const [account, target] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(context.targetAccountOptions),
    ]);

    if (target.user === undefined) {
      throw notFound();
    }

    // this route is the owner's editor; everyone else goes to the profile
    if (account?.user.id !== target.user.id) {
      throw redirect({
        to: "/@{$username}",
        params: { username: params.username },
      });
    }

    const binder = await context.queryClient.ensureQueryData(
      binderQuery(target.user.id, params.slug),
    );
    if (binder === null) {
      throw notFound();
    }

    return {
      userId: target.user.id,
      name: binder.name,
      address: target.cosmo.address,
      lockedObjekts: target.lockedObjekts,
    };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData
        ? m.binder_editor_title({ name: loaderData.name })
        : m.binder_error_binder_not_found(),
    }),
});

function RouteComponent() {
  const { userId, address, lockedObjekts } = Route.useLoaderData();
  const { username, slug } = Route.useParams();
  const { data: binder } = useSuspenseQuery(binderQuery(userId, slug));

  // deleted from another tab since the editor loaded
  if (binder === null) {
    return <NotFoundComponent />;
  }

  return (
    <div className="container py-4">
      <BinderEditor
        binder={binder}
        owner={{
          userId,
          username,
          address,
          lockedTokenIds: new Set(lockedObjekts),
        }}
      />
    </div>
  );
}

function PendingComponent() {
  return (
    <div className="container py-4">
      <div className="grid overflow-hidden rounded-xl border border-border md:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] xl:grid-cols-[minmax(0,1fr)_minmax(300px,440px)]">
        <div className="flex flex-col gap-2.5 p-3 md:border-r md:border-border md:p-4.5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mx-auto aspect-[0.66] w-full max-w-[calc((100dvh-16rem)*0.647)] rounded-xl" />
        </div>
        <div className="hidden bg-muted/30 p-3 md:block">
          <Skeleton className="h-8.5 w-full" />
        </div>
      </div>
    </div>
  );
}

function ErrorComponent() {
  return <Error message={m.binder_editor_error_loading()} />;
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <IconHeartBroken className="h-24 w-24" />
      <p className="text-sm font-semibold">
        {m.binder_error_binder_not_found()}
      </p>
    </main>
  );
}
