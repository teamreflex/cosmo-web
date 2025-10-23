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
    defineHead({ title: "Objekt Stats", canonical: "/objekts/stats" }),
});

function RouteComponent() {
  const { artists, selected } = Route.useLoaderData();
  const { data } = useSuspenseQuery(objektStatsQuery);

  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <h1 className="font-cosmo text-3xl uppercase">Stats</h1>
        <p className="-mt-2 text-sm font-semibold text-muted-foreground">
          Statistics update every hour
        </p>
      </div>

      {/* content */}
      <div className="flex flex-col gap-4">
        {/* totals */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Total Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.totalCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total objekts minted in last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Scanned Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.scannedCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Objekts scanned in last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Premier Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.premierCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Premier class objekts minted in last 24 hours (digital)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* hourly breakdown charts */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* artist breakdown chart */}
          <div className="flex flex-col gap-2">
            <div className="flex h-10 flex-row items-end gap-2">
              <h2 className="text-xl font-semibold">Artist Breakdown</h2>
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
        <h1 className="font-cosmo text-3xl uppercase">Stats</h1>
        <p className="-mt-2 text-sm font-semibold text-muted-foreground">
          Statistics update every hour
        </p>
      </div>

      {/* content */}
      <div className="flex flex-col gap-4">
        {/* totals */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Total Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-20" />
              <p className="text-xs text-muted-foreground">
                Total objekts minted in last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Scanned Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-20" />
              <p className="text-xs text-muted-foreground">
                Objekts scanned in last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-36">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Premier Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-7" />
              <p className="text-xs text-muted-foreground">
                Premier class objekts minted in last 24 hours (digital)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* hourly breakdown charts */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* artist breakdown chart */}
          <div className="flex flex-col gap-2">
            <div className="flex h-10 flex-row items-end gap-2">
              <h2 className="text-xl font-semibold">Artist Breakdown</h2>
            </div>
            <Skeleton className="h-108.5" />
          </div>

          {/* member breakdown chart */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-end justify-between gap-2">
              <h2 className="text-xl font-semibold">Member Breakdown</h2>
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
  return <Error message="Could not load objekt stats" />;
}
