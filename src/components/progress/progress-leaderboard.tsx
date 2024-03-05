"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { parseAsNullableBoolean } from "@/hooks/use-cosmo-filters";
import { useQueryState } from "nuqs";
import { Suspense } from "react";
import ProgressLeaderboardContent, {
  LeaderboardSkeleton,
} from "./progress-leaderboard-content";
import { Button } from "../ui/button";
import { Trophy } from "lucide-react";

type Props = {
  member: string;
};

export default function ProgressLeaderboard({ member }: Props) {
  const [open, setOpen] = useQueryState("leaderboard", parseAsNullableBoolean);

  function toggle() {
    setOpen((prev) => (prev === true ? null : true));
  }

  return (
    <Sheet open={open === true} onOpenChange={() => toggle()}>
      <SheetTrigger asChild>
        <Button className="rounded-full" variant="secondary" size="icon">
          <Trophy className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-cosmo uppercase text-xl">
            Leaderboard
          </SheetTitle>
          <SheetDescription className="font-cosmo uppercase text-lg">
            {member}
          </SheetDescription>
        </SheetHeader>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <ProgressLeaderboardContent member={member} />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}
