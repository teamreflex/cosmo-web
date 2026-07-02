import { Error } from "@/components/error-boundary";
import GridRenderer from "@/components/grid/grid-renderer";
import HelpDialog from "@/components/grid/help-dialog";
import Portal from "@/components/portal";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import TitleHeader from "@/components/ui/title-header";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { gridLedgerQuery } from "@/lib/queries/grid";
import { gridFrontendSchema } from "@/lib/universal/parsers";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@{$username}/grid")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  validateSearch: gridFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params, deps }) => {
    const [target, account] = await Promise.all([
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
      context.queryClient.ensureQueryData(currentAccountQuery),
    ]);

    // only prefetch when an artist is explicit; member-only resolves on render
    if (deps.searchParams.artist) {
      void context.queryClient.prefetchQuery(
        gridLedgerQuery(target.cosmo.address, deps.searchParams.artist),
      );
    }

    return { target, account };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.target.cosmo.username
        ? m.grid_title_with_username({
            username: loaderData.target.cosmo.username,
          })
        : m.grid_title(),
      canonical: `/@${loaderData?.target.cosmo.username}/grid`,
    }),
});

function RouteComponent() {
  const { target, account } = Route.useLoaderData();

  return (
    <section className="flex flex-col">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ProfileProvider target={target}>
          <GridRenderer address={target.cosmo.address} />
          <Portal to="#help">
            <HelpDialog />
          </Portal>
        </ProfileProvider>
      </UserStateProvider>
    </section>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      <TitleHeader title={m.grid_title()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <MemberFilterSkeleton />
          </div>
        </div>
      </TitleHeader>
    </div>
  );
}

function ErrorComponent() {
  return <Error message={m.grid_error_loading()} />;
}
