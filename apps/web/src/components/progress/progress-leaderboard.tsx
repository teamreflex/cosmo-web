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
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { IconTrophy } from "@tabler/icons-react";
import { Suspense } from "react";
import { Button } from "../ui/button";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ProgressLeaderboardContent, {
  LeaderboardSkeleton,
} from "./progress-leaderboard-content";

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
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className="rounded-full"
              variant="secondary"
              size="icon"
              onClick={() => toggle()}
              aria-label={m.aria_open_leaderboard()}
            />
          }
        >
          <IconTrophy className="h-5 w-5" />
        </TooltipTrigger>
        <TooltipContent side="left">{m.progress_leaderboard()}</TooltipContent>
      </Tooltip>

      <SheetContent className="gap-0 overflow-y-scroll outline-hidden">
        <SheetHeader className="pb-0">
          <SheetTitle className="font-cosmo text-xl uppercase">
            {m.progress_leaderboard()}
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
  const items = [
    { value: "combined", label: m.progress_filter_combined() },
    { value: "offline", label: m.filter_online_physical() },
    { value: "online", label: m.filter_online_digital() },
  ] satisfies { value: ValidOnlineType | "combined"; label: string }[];
  // no filter is the combined view
  const selected: ValidOnlineType | "combined" = props.value ?? "combined";

  return (
    <Select
      items={items}
      value={selected}
      onValueChange={(value: ValidOnlineType | "combined" | null) => {
        if (value !== null) {
          props.update(value === "combined" ? undefined : value);
        }
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="outline-hidden">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
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
    { value: "all", label: m.filter_type_all() },
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
      <SelectTrigger>
        <SelectValue placeholder={m.filter_sort()} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{m.filter_type_all()}</SelectItem>

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
