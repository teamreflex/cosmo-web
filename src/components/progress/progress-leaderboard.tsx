import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import ProgressLeaderboardContent, {
  LeaderboardSkeleton,
} from "./progress-leaderboard-content";
import type { FilterData } from "@/hooks/use-filter-data";
import type { ValidOnlineType } from "@/lib/universal/cosmo/common";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useArtists } from "@/hooks/use-artists";
import { useProgressFilters } from "@/hooks/use-progress-filters";

type Props = {
  member: string;
  seasons: FilterData["seasons"];
};

export default function ProgressLeaderboard({ member, seasons }: Props) {
  const { filters, setFilters, setFilter } = useProgressFilters();

  const isOpen = filters.leaderboard === true;

  function toggle() {
    setFilters((prev) => ({
      ...prev,
      leaderboard: prev.leaderboard === true ? undefined : true,
      season: prev.leaderboard === true ? undefined : prev.season,
    }));
  }

  return (
    <Sheet open={isOpen} onOpenChange={() => toggle()}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="rounded-full"
              variant="secondary"
              size="icon"
              onClick={() => toggle()}
            >
              <Trophy className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Leaderboard</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent className="gap-0 overflow-y-scroll outline-hidden">
        <SheetHeader className="pb-0">
          <SheetTitle className="font-cosmo text-xl uppercase">
            Leaderboard
          </SheetTitle>
          <SheetDescription className="font-cosmo text-lg uppercase">
            {member}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col px-3">
          {/* filters */}
          <div className="flex items-center justify-center gap-2 pt-2 pb-4">
            <FilterSelect
              value={filters.filter ?? undefined}
              update={(value) => setFilter("filter", value)}
            />
            <SeasonSelect
              seasons={seasons}
              member={member}
              value={filters.season ?? "all"}
              update={(value) => setFilter("season", value)}
            />
          </div>

          <Separator orientation="horizontal" />

          <Suspense fallback={<LeaderboardSkeleton />}>
            <ProgressLeaderboardContent
              member={member}
              onlineType={filters.filter ?? undefined}
              season={filters.season ?? undefined}
            />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSelect(props: {
  value: ValidOnlineType | undefined;
  update: (value: ValidOnlineType | undefined) => void;
}) {
  function set(value: string) {
    props.update(value === "combined" ? undefined : (value as ValidOnlineType));
  }

  return (
    <Select value={props.value} onValueChange={set}>
      <SelectTrigger>
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent className="outline-hidden">
        <SelectItem value="combined">Combined</SelectItem>
        <SelectItem value="offline">Physical</SelectItem>
        <SelectItem value="online">Digital</SelectItem>
      </SelectContent>
    </Select>
  );
}

type SeasonSelectProps = {
  seasons: FilterData["seasons"];
  member: string;
  value: string;
  update: (value: string | undefined) => void;
};

function SeasonSelect(props: SeasonSelectProps) {
  const { getArtist, selectedIds } = useArtists();

  function set(value: string) {
    props.update(value === "all" ? undefined : value);
  }

  const data = props.seasons
    .map(({ artistId, seasons }) => {
      const artist = getArtist(artistId)!;
      return {
        artist,
        seasons,
      };
    })
    .filter(
      ({ artist }) =>
        selectedIds.includes(artist.id) &&
        artist.artistMembers
          .map((m) => m.name.toLowerCase())
          .includes(props.member.toLowerCase()),
    );

  return (
    <Select value={props.value} onValueChange={set}>
      <SelectTrigger>
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>

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
