"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { parseAsNullableBoolean } from "@/hooks/use-cosmo-filters";
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { Suspense } from "react";
import ProgressLeaderboardContent, {
  LeaderboardSkeleton,
} from "./progress-leaderboard-content";
import { Button } from "../ui/button";
import { Trophy } from "lucide-react";
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
import Image from "next/image";
import { FilterData } from "@/hooks/use-filter-data";
import { useArtists } from "@/hooks/use-artists";

type Props = {
  member: string;
  seasons: FilterData["seasons"];
};

export default function ProgressLeaderboard({ member, seasons }: Props) {
  const [open, setOpen] = useQueryState("leaderboard", parseAsNullableBoolean);
  const [onlineType, setOnlineType] = useQueryState(
    "filter",
    parseAsStringEnum(["combined", "online", "offline"])
  );
  const [season, setSeason] = useQueryState("season", parseAsString);

  function toggle() {
    setOpen((prev) => (prev === true ? null : true));
    if (open) {
      setSeason(null);
    }
  }

  return (
    <Sheet open={open === true} onOpenChange={() => toggle()}>
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

      <SheetContent className="overflow-y-scroll outline-hidden gap-0">
        <SheetHeader className="pb-0">
          <SheetTitle className="font-cosmo uppercase text-xl">
            Leaderboard
          </SheetTitle>
          <SheetDescription className="font-cosmo uppercase text-lg">
            {member}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col px-3">
          {/* filters */}
          <div className="flex items-center justify-center gap-2 pb-4 pt-2">
            <FilterSelect
              value={onlineType ?? "combined"}
              update={setOnlineType}
            />
            <SeasonSelect
              seasons={seasons}
              member={member}
              value={season ?? "all"}
              update={setSeason}
            />
          </div>

          <Separator orientation="horizontal" />

          <Suspense fallback={<LeaderboardSkeleton />}>
            <ProgressLeaderboardContent
              member={member}
              onlineType={onlineType}
              season={season}
            />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSelect({
  value,
  update,
}: {
  value: string;
  update: (value: string | null) => void;
}) {
  function set(value: string) {
    update(value === "combined" ? null : value);
  }

  return (
    <Select value={value} onValueChange={set}>
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
  update: (value: string | null) => void;
};

function SeasonSelect({ seasons, member, value, update }: SeasonSelectProps) {
  const { getArtist, selectedIds } = useArtists();

  function set(value: string) {
    update(value === "all" ? null : value);
  }

  const data = seasons
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
          .includes(member.toLowerCase())
    );

  return (
    <Select value={value} onValueChange={set}>
      <SelectTrigger>
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>

        {data.map(({ artist, seasons }) => (
          <SelectGroup key={artist.id}>
            <SelectLabel className="text-xs flex items-center gap-2">
              <Image
                className="rounded-full aspect-square"
                src={artist.logoImageUrl}
                alt={artist.title}
                width={16}
                height={16}
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
