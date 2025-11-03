import { Link, createFileRoute } from "@tanstack/react-router";
import { isFuture } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Gravity } from "@/lib/server/db/schema";
import type { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import type { CosmoGravityType } from "@/lib/universal/cosmo/gravity";
import type { PropsWithClassName } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Error } from "@/components/error-boundary";
import { gravitiesIndexQuery } from "@/lib/queries/gravity";
import { ArtistProvider } from "@/hooks/use-artists";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import GravityTimestamp from "@/components/gravity/timestamp";
import { Badge } from "@/components/ui/badge";
import { artistsQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { $fetchGravities } from "@/lib/server/gravity";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/gravity/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(gravitiesIndexQuery);

    const [artists, selected] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
    ]);

    const toRender =
      selected.length > 0
        ? artists.filter((a) => selected.includes(a.id))
        : artists;

    return {
      artists,
      selected,
      toRender,
    };
  },
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  head: () => defineHead({ title: m.gravity_header(), canonical: "/gravity" }),
});

function RouteComponent() {
  const { artists, selected, toRender } = Route.useLoaderData();
  const { data: gravities } = useSuspenseQuery({
    ...gravitiesIndexQuery,
    queryFn: useServerFn($fetchGravities),
  });

  return (
    <ArtistProvider artists={artists} selected={selected}>
      <main className="container flex flex-col py-2">
        <Tabs defaultValue={toRender[0]?.id}>
          {/* header */}
          <div className="flex flex-row items-center justify-between">
            <h1 className="font-cosmo text-3xl uppercase">
              {m.gravity_header()}
            </h1>

            <TabsList>
              {toRender.map((artist) => (
                <TabsTrigger
                  key={artist.id}
                  value={artist.id}
                  className="gap-2"
                >
                  <img
                    className="aspect-square size-5 shrink-0 rounded-full"
                    src={artist.logoImageUrl}
                    alt={artist.title}
                  />
                  {artist.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {toRender.map((artist) => (
            <ArtistTab
              key={artist.id}
              artist={artist}
              gravities={gravities[artist.id] ?? []}
            />
          ))}
        </Tabs>
      </main>
    </ArtistProvider>
  );
}

type ArtistTabProps = {
  artist: CosmoArtistBFF;
  gravities: Gravity[];
};

function ArtistTab({ artist, gravities }: ArtistTabProps) {
  return (
    <TabsContent
      key={artist.id}
      value={artist.id}
      className="grid grid-cols-1 gap-2 data-[state=inactive]:hidden md:grid-cols-3 xl:grid-cols-4"
      forceMount
    >
      {gravities.map((gravity) => (
        <GravityItem key={gravity.id} gravity={gravity} />
      ))}
    </TabsContent>
  );
}

function GravityItem(props: { gravity: Gravity }) {
  const href = `/gravity/${props.gravity.artist}/${props.gravity.cosmoId}`;
  const isRecent = isFuture(props.gravity.endDate);

  return (
    <Link to={href} className="[content-visibility:auto]">
      <Card
        data-recent={isRecent}
        className="group relative aspect-square overflow-clip py-0 data-[recent=true]:border-cosmo"
      >
        <img
          src={props.gravity.image}
          alt={props.gravity.title}
          className="absolute object-cover grayscale transition-all duration-300 group-hover:grayscale-0 group-data-[recent=true]:grayscale-0"
        />
        <CardContent className="isolate flex h-full w-full items-end justify-start gap-2 bg-gradient-to-t from-black/80 from-5% via-black/20 via-20% to-black/0 px-0">
          <div className="flex w-full flex-row items-center gap-2 p-2">
            <CalendarDays className="size-4 shrink-0" />
            <GravityTimestamp
              className="text-sm font-semibold"
              date={props.gravity.startDate}
            />
            <GravityBadge
              className="ml-auto"
              type={props.gravity.gravityType}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function GravityBadge(props: PropsWithClassName<{ type: CosmoGravityType }>) {
  switch (props.type) {
    case "event-gravity":
      return (
        <Badge className={props.className} variant="event-gravity">
          {m.gravity_badge_event()}
        </Badge>
      );
    case "grand-gravity":
      return (
        <Badge className={props.className} variant="grand-gravity">
          {m.gravity_badge_grand()}
        </Badge>
      );
    default:
      return null;
  }
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-row items-center justify-between">
        <h1 className="font-cosmo text-3xl uppercase">{m.gravity_header()}</h1>
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>

      <div className="relative mt-2 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
        <SkeletonGradient />
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-square w-full rounded-xl shadow-sm"
          />
        ))}
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.gravity_error_loading()} />;
}
