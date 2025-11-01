import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { artistsQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { objektStatsQuery } from "@/lib/queries/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ArtistChart from "@/components/objekt-stats/artist-chart";
import MemberBreakdown from "@/components/objekt-stats/member-breakdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Error } from "@/components/error-boundary";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/objekts/stats")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(objektStatsQuery);

    const [artists, selected] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
    ]);

    return {
      artists,
      selected,
    };
  },
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  head: () =>
    defineHead({ title: m.stats_header(), canonical: "/objekts/stats" }),
});

function RouteComponent() {
  const { artists, selected } = Route.useLoaderData();
  const { data } = useSuspenseQuery(objektStatsQuery);

  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <h1 className="font-cosmo text-3xl uppercase">{m.stats_header()}</h1>
        <p className="-mt-2 text-sm font-semibold text-muted-foreground">
          {m.stats_update_frequency()}
        </p>
      </div>

      {/* content */}
      <div className="flex flex-col gap-4">
        {/* totals */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                {m.stats_total_objekts()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.totalCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {m.stats_total_objekts_desc()}
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                {m.stats_scanned_objekts()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.scannedCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {m.stats_scanned_objekts_desc()}
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                {m.stats_premier_objekts()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.premierCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {m.stats_premier_objekts_desc()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* hourly breakdown charts */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* artist breakdown chart */}
          <div className="flex flex-col gap-2">
            <div className="flex h-10 flex-row items-end gap-2">
              <h2 className="text-xl font-semibold">{m.stats_artist_breakdown()}</h2>
            </div>

            <Card>
              <CardContent className="pt-6 pl-0">
                <ArtistChart artists={artists} data={data.artistBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* member breakdown chart */}
          <MemberBreakdown
            selectedArtists={selected}
            artists={artists}
            data={data.memberBreakdown}
          />
        </div>
      </div>
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <h1 className="font-cosmo text-3xl uppercase">{m.stats_header()}</h1>
        <p className="-mt-2 text-sm font-semibold text-muted-foreground">
          {m.stats_update_frequency()}
        </p>
      </div>

      {/* content */}
      <div className="flex flex-col gap-4">
        {/* totals */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                {m.stats_total_objekts()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-20" />
              <p className="text-xs text-muted-foreground">
                {m.stats_total_objekts_desc()}
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                {m.stats_scanned_objekts()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-20" />
              <p className="text-xs text-muted-foreground">
                {m.stats_scanned_objekts_desc()}
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                {m.stats_premier_objekts()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-7" />
              <p className="text-xs text-muted-foreground">
                {m.stats_premier_objekts_desc()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* hourly breakdown charts */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* artist breakdown chart */}
          <div className="flex flex-col gap-2">
            <div className="flex h-10 flex-row items-end gap-2">
              <h2 className="text-xl font-semibold">{m.stats_artist_breakdown()}</h2>
            </div>
            <Skeleton className="h-108.5" />
          </div>

          {/* member breakdown chart */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-end justify-between gap-2">
              <h2 className="text-xl font-semibold">{m.stats_member_breakdown()}</h2>
              <Skeleton className="h-9 w-30" />
            </div>
            <Skeleton className="h-108.5" />
          </div>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.stats_error_loading()} />;
}
