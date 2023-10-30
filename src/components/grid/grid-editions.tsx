import {
  CosmoGridEdition,
  ValidArtist,
  fetchEditions,
} from "@/lib/server/cosmo";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as R from "remeda";
import { decodeUser } from "@/app/data-fetching";

export default async function GridEditions({
  artist,
}: {
  artist: ValidArtist;
}) {
  const user = await decodeUser();
  const editions = await fetchEditions(user!.accessToken, artist);

  const seasons = R.groupBy(editions, (edition) => edition.season.title);
  const seasonTitles = Object.keys(seasons);

  return (
    <Tabs defaultValue="Atom01" className="w-full sm:w-1/2">
      <TabsList className="w-fit">
        {seasonTitles.map((s) => (
          <TabsTrigger value={s} key={s}>
            {s}
          </TabsTrigger>
        ))}
      </TabsList>

      {seasonTitles.map((s) => (
        <TabsContent value={s} key={s}>
          <div className="flex flex-col gap-2 w-full">
            {seasons[s].map((edition) => (
              <GridEdition key={edition.id} edition={edition} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function GridEdition({ edition }: { edition: CosmoGridEdition }) {
  return (
    <Link
      href={`/grid/${edition.id}`}
      className="w-full bg-accent/50 rounded-lg border border-white/20 flex items-center hover:bg-accent/40 transition-colors gap-4 p-4"
    >
      <div className="h-[70px] w-[70px] aspect-square relative">
        <Image src={edition.image} alt={edition.title} fill={true} />
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <p className="font-bold">{edition.season.title}</p>
          <p>{edition.subtitle}</p>
          <p className="bg-cosmo-text text-cosmo-hover px-2 text-sm rounded">
            {edition.status.completedGrids} Special Objekts Collected
          </p>
        </div>

        <ChevronRight className="w-8 h-8 text-white/30 justify-self-end" />
      </div>
    </Link>
  );
}

export function GridEditionsSkeleton() {
  return (
    <div className="flex flex-col gap-2 w-full sm:w-1/2 animate-pulse">
      <div className="bg-accent rounded-lg flex items-center h-20"></div>
      <div className="bg-accent rounded-lg flex items-center h-20"></div>
      <div className="bg-accent rounded-lg flex items-center h-20"></div>
    </div>
  );
}
