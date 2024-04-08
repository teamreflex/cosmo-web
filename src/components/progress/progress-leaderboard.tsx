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

type Props = {
  member: string;
};

export default function ProgressLeaderboard({ member }: Props) {
  const [open, setOpen] = useQueryState("leaderboard", parseAsNullableBoolean);
  const [onlineType, setOnlineType] = useQueryState(
    "filter",
    parseAsStringEnum(["combined", "online", "offline"])
  );

  function toggle() {
    setOpen((prev) => (prev === true ? null : true));
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
        <SheetContent className="overflow-y-scroll">
          <SheetHeader>
            <SheetTitle className="font-cosmo uppercase text-xl">
              Leaderboard
            </SheetTitle>
            <SheetDescription className="font-cosmo uppercase text-lg">
              {member}
            </SheetDescription>
          </SheetHeader>

          <div className="flex justify-between items-center border-b border-accent pb-4">
            <p className="font-semibold">Filter</p>
            <FilterSelect
              value={onlineType ?? "combined"}
              update={setOnlineType}
            />
          </div>

          <Suspense fallback={<LeaderboardSkeleton />}>
            <ProgressLeaderboardContent
              member={member}
              onlineType={onlineType}
            />
          </Suspense>
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
      <SelectTrigger className="w-32 drop-shadow-lg">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent
        ref={(ref) => {
          // fixes mobile touch-through bug in radix
          if (!ref) return;
          ref.ontouchstart = (e) => {
            e.preventDefault();
          };
        }}
      >
        <SelectItem value="combined">Combined</SelectItem>
        <SelectItem value="offline">Physical</SelectItem>
        <SelectItem value="online">Digital</SelectItem>
      </SelectContent>
    </Select>
  );
}
