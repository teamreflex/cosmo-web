import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useArtists } from "@/hooks/use-artists";
import type { FilterData } from "@/hooks/use-filter-data";
import { useProgressFilters } from "@/hooks/use-progress-filters";
import { m } from "@/i18n/messages";
import { Suspense } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import ProgressLeaderboardContent, {
  LeaderboardSkeleton,
} from "./progress-leaderboard-content";
import ProgressTypeTabs from "./progress-type-tabs";

type Props = {
  address: string;
  member: string;
  seasons: FilterData["seasons"];
};

/**
 * The member's top collectors, opened from the rank card via the search params.
 */
export default function ProgressLeaderboard({
  address,
  member,
  seasons,
}: Props) {
  const { filters, setFilters, setFilter } = useProgressFilters();

  function close() {
    setFilters({ leaderboard: undefined, season: undefined });
  }

  return (
    <Sheet open={filters.leaderboard === true} onOpenChange={close}>
      <SheetContent className="gap-0 overflow-y-scroll outline-hidden sm:max-w-md">
        <SheetHeader className="flex-col-reverse gap-1.5 border-b p-5">
          <SheetTitle className="font-cosmo text-2xl leading-none uppercase">
            {member}
          </SheetTitle>
          <SheetDescription className="font-semibold">
            {m.progress_leaderboard()}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 border-b p-5 pt-4">
          <ProgressTypeTabs
            value={filters.filter ?? undefined}
            onChange={(value) => setFilter("filter", value)}
          />
          <SeasonSelect
            seasons={seasons}
            member={member}
            value={filters.season ?? "all"}
            update={(value) => setFilter("season", value)}
          />
        </div>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <ProgressLeaderboardContent
            address={address}
            member={member}
            onlineType={filters.filter ?? undefined}
            season={filters.season ?? undefined}
          />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}

type SeasonSelectProps = {
  seasons: FilterData["seasons"];
  member: string;
  value: string;
  update: (value: string | undefined) => void;
};

function SeasonSelect(props: SeasonSelectProps) {
  const { getArtist } = useArtists();

  const data = props.seasons
    .flatMap(({ artistId, seasons }) => {
      const artist = getArtist(artistId);
      return artist ? [{ artist, seasons }] : [];
    })
    .filter(({ artist }) =>
      artist.artistMembers
        .map((member) => member.name.toLowerCase())
        .includes(props.member.toLowerCase()),
    );
  const items = [
    { value: "all", label: m.progress_all_seasons() },
    ...data.flatMap(({ seasons }) =>
      seasons.map((season) => ({ value: season, label: season })),
    ),
  ];

  return (
    <Select
      items={items}
      value={props.value}
      onValueChange={(value) => {
        if (value !== null) props.update(value === "all" ? undefined : value);
      }}
    >
      <SelectTrigger
        aria-label={m.progress_season()}
        className="min-w-32 flex-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{m.progress_all_seasons()}</SelectItem>

        {data.map(({ artist, seasons }) => (
          <SelectGroup key={artist.id}>
            <SelectLabel className="flex items-center gap-2 text-xs">
              <img
                className="aspect-square size-4 rounded-full"
                src={artist.logoImageUrl}
                alt={artist.title}
              />
              {artist.title}
            </SelectLabel>
            {seasons.map((season) => (
              <SelectItem key={season} value={season}>
                {season}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
