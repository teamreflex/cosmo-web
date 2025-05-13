import { Metadata } from "next";
import { getArtistsWithMembers, getSelectedArtists } from "../data-fetching";
import { fetchGravities } from "@/lib/server/gravity";
import { ArtistProvider } from "@/hooks/use-artists";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Gravity } from "@/lib/server/db/schema";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import Link from "next/link";
import { isFuture } from "date-fns";
import GravityTimestamp from "@/components/gravity/timestamp";
import { CalendarDays } from "lucide-react";
import { CosmoGravityType } from "@/lib/universal/cosmo/gravity";
import { Badge } from "@/components/ui/badge";
import { PropsWithClassName } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gravity",
};

export default async function GravityPage() {
  const [artists, selected, gravities] = await Promise.all([
    getArtistsWithMembers(),
    getSelectedArtists(),
    fetchGravities(),
  ]);

  const toRender =
    selected.length > 0
      ? artists.filter((a) => selected.includes(a.id))
      : artists;

  return (
    <ArtistProvider artists={artists} selected={selected}>
      <main className="container flex flex-col py-2">
        <Tabs defaultValue={toRender[0].id}>
          {/* header */}
          <div className="flex flex-row items-center justify-between">
            <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>

            <TabsList>
              {toRender.map((artist) => (
                <TabsTrigger
                  key={artist.id}
                  value={artist.id}
                  className="gap-2"
                >
                  <Image
                    className="rounded-full aspect-square shrink-0"
                    src={artist.logoImageUrl}
                    alt={artist.title}
                    width={20}
                    height={20}
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
      className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-2 data-[state=inactive]:hidden"
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
    <Link href={href} className="[content-visibility:auto]">
      <Card
        data-recent={isRecent}
        className="relative aspect-square overflow-clip group data-[recent=true]:border-cosmo py-0"
      >
        <Image
          src={props.gravity.image}
          alt={props.gravity.title}
          fill={true}
          className="object-cover grayscale group-data-[recent=true]:grayscale-0 group-hover:grayscale-0 transition-all duration-300"
        />
        <CardContent className="isolate h-full w-full flex gap-2 items-end justify-start bg-gradient-to-t from-black/80 from-5% via-black/20 via-20% to-black/0 px-0">
          <div className="flex flex-row gap-2 items-center w-full p-2">
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
          Event
        </Badge>
      );
    case "grand-gravity":
      return (
        <Badge className={props.className} variant="grand-gravity">
          Grand
        </Badge>
      );
    default:
      return null;
  }
}
