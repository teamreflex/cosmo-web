"use client";

import {
  type ObjektWithCollection,
  buildCalendar,
  getDays,
} from "@/lib/universal/como";
import type { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { cn } from "@/lib/utils";
import ArtistIcon from "../artist-icon";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type Props = {
  artists: CosmoArtistBFF[];
  transfers: ObjektWithCollection[];
};

const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ComoCalendar({ artists, transfers }: Props) {
  // run date functions in client
  const now = new Date();
  const days = getDays(now);
  const startOffset =
    (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  const offset = Array.from({ length: startOffset }, (_, i) => i + 1);
  const remainder = Array.from(
    { length: (7 - ((days.length + startOffset) % 7)) % 7 },
    (_, i) => i + 1
  );

  const calendar = buildCalendar(now, transfers);

  return (
    <div className="flex flex-col rounded-lg bg-accent border border-accent text-clip h-fit overflow-clip">
      {/* days of the week */}
      <div className="grid grid-cols-7 gap-px border-b border-accent">
        {week.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center font-bold bg-background/80 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* days of the month */}
      <div className="grid grid-cols-7 gap-px">
        {/* offset */}
        {offset.map((day) => (
          <div key={day} className="bg-background/80" />
        ))}

        {days.map((day) => (
          <div
            key={day}
            className={cn(
              "relative flex items-center flex-col gap-1 justify-center h-24 sm:h-20 bg-background/70 hover:bg-background/50 transition-colors",
              now.getDate() === day && "border border-cosmo"
            )}
          >
            <p className="absolute top-1 left-2 font-semibold text-sm">{day}</p>

            {artists
              .filter((a) => calendar[day]?.[a.contracts.Objekt.toLowerCase()])
              .map((a) => (
                <div className="contents" key={a.name}>
                  <div className="absolute top-1 right-1">
                    {calendar[day]?.[a.contracts.Objekt.toLowerCase()].carried >
                      0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Sparkles className="text-yellow-600 h-5 w-5" />
                          </TooltipTrigger>
                          <TooltipContent className="flex flex-col gap-1">
                            <p className="font-semibold">Carried over</p>

                            <div className="flex justify-center items-center gap-2">
                              <ArtistIcon artist={a.name} />
                              <span>
                                {calendar[day]?.[
                                  a.contracts.Objekt.toLowerCase()
                                ].carried ?? 0}
                              </span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <ArtistIcon artist={a.name} />
                    <span>
                      {calendar[day]?.[a.contracts.Objekt.toLowerCase()]
                        .count ?? 0}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ))}

        {/* remainder */}
        {remainder.map((day) => (
          <div key={day} className="bg-background/80" />
        ))}
      </div>
    </div>
  );
}
