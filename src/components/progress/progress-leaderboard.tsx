"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { parseAsNullableBoolean } from "@/hooks/use-cosmo-filters";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Fragment, Suspense } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ValidSeason, validSeasons } from "@/lib/universal/cosmo/common";
import { Separator } from "../ui/separator";

type Props = {
  member: string;
};

export default function ProgressLeaderboard({ member }: Props) {
  const [open, setOpen] = useQueryState("leaderboard", parseAsNullableBoolean);
  const [onlineType, setOnlineType] = useQueryState(
    "filter",
    parseAsStringEnum(["combined", "online", "offline"])
  );
  const [season, setSeason] = useQueryState(
    "season",
    parseAsStringEnum([...validSeasons])
  );

  function toggle() {
    setOpen((prev) => (prev === true ? null : true));
    if (open) {
      setSeason(null);
    }
  }

  return (
    <Fragment>
      <TooltipProvider delayDuration={0}>
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

      <Sheet open={open === true} onOpenChange={() => toggle()}>
        <SheetContent className="overflow-y-scroll outline-none">
          <SheetHeader>
            <SheetTitle className="font-cosmo uppercase text-xl">
              Leaderboard
            </SheetTitle>
            <SheetDescription className="font-cosmo uppercase text-lg">
              {member}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col">
            {/* filters */}
            <div className="flex items-center justify-center gap-2 pb-4 pt-2">
              <FilterSelect
                value={onlineType ?? "combined"}
                update={setOnlineType}
              />
              <SeasonSelect value={season ?? "all"} update={setSeason} />
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
    </Fragment>
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
      <SelectContent className="outline-none">
        <SelectItem value="combined">Combined</SelectItem>
        <SelectItem value="offline">Physical</SelectItem>
        <SelectItem value="online">Digital</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SeasonSelect({
  value,
  update,
}: {
  value: string;
  update: (value: ValidSeason | null) => void;
}) {
  function set(value: string) {
    update(value === "all" ? null : (value as ValidSeason));
  }

  return (
    <Select value={value} onValueChange={set}>
      <SelectTrigger>
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {validSeasons.map((season) => (
          <SelectItem key={season} value={season}>
            {season}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
