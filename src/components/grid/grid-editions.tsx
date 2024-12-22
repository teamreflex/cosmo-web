import { fetchEditions } from "@/lib/server/cosmo/grid";
import { LuChevronRight } from "react-icons/lu";
import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { CosmoGridEdition } from "@/lib/universal/cosmo/grid";
import { cn } from "@/lib/utils";
import { addWeeks, isWithinInterval, subWeeks } from "date-fns";
import { TokenPayload } from "@/lib/universal/auth";

type SeasonGroup = Record<string, CosmoGridEdition[]>;

type Props = {
  user: TokenPayload;
  artist: ValidArtist;
};

export default async function GridEditions({ user, artist }: Props) {
  const editions = await fetchEditions(user.accessToken, artist);

  const seasons = editions.reduce((acc, edition) => {
    const season = edition.season.title;
    if (!acc[season]) {
      acc[season] = [];
    }
    acc[season].push(edition);
    return acc;
  }, {} as SeasonGroup);
  const seasonTitles = Object.keys(seasons).sort();
  const defaultSeason = seasonTitles.at(-1) ?? "Atom01";

  return (
    <Tabs defaultValue={defaultSeason} className="w-full sm:w-1/2">
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
  const isNew = isWithinInterval(new Date(edition.createdAt), {
    start: subWeeks(new Date(), 1),
    end: addWeeks(new Date(), 1),
  });

  return (
    <Link
      href={`/grid/${edition.id}`}
      className="w-full h-28 bg-accent/50 rounded-lg border border-white/20 flex items-center hover:bg-accent/40 transition-colors gap-4 p-4"
    >
      <div className="h-[70px] w-[70px] aspect-square relative">
        {isNew && (
          <span className="absolute z-50 -top-1 -left-2 text-black bg-lime-300 border border-px border-foreground font-semibold rounded-full text-2xs px-2 py-px">
            New
          </span>
        )}
        <Image
          src={edition.image}
          alt={edition.title}
          fill={true}
          loading="eager"
        />
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <p className="font-bold">{edition.season.title}</p>
          <p>{edition.subtitle}</p>
          <p
            className={cn(
              "px-2 py-px text-sm rounded",
              edition.status.completedGrids === 0
                ? "bg-foreground/25 text-foreground/80"
                : "bg-cosmo-text text-cosmo-hover"
            )}
          >
            {edition.status.completedGrids} Special Objekts Collected
          </p>
        </div>

        <LuChevronRight className="w-8 h-8 text-white/30 justify-self-end" />
      </div>
    </Link>
  );
}

export function GridEditionsSkeleton() {
  return (
    <div className="flex flex-col gap-2 w-full sm:w-1/2 items-center">
      <div className="self-start bg-accent rounded-lg w-20 h-10 animate-pulse"></div>
      <div className="flex flex-col gap-2 w-full animate-pulse">
        <div className="bg-accent rounded-lg h-28"></div>
        <div className="bg-accent rounded-lg h-28"></div>
        <div className="bg-accent rounded-lg h-28"></div>
      </div>
    </div>
  );
}
