"use client";

import {
  ObjektWithCollection,
  buildCalendar,
  getDays,
} from "@/lib/universal/como";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { cn } from "@/lib/utils";
import ArtistIcon from "../artist-icon";

type Props = {
  artists: CosmoArtist[];
  transfers: ObjektWithCollection[];
};

const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const days = getDays();
const now = new Date();
const startOffset = new Date(now.getFullYear(), now.getMonth(), 1).getDay() - 1;
const offset = Array.from({ length: startOffset }, (_, i) => i + 1);
const remainder = Array.from(
  { length: startOffset === 6 ? 6 : 5 - startOffset },
  (_, i) => i + 1
);

export default function ComoCalendar({ artists, transfers }: Props) {
  const calendar = buildCalendar(transfers);

  return (
    <div className="flex flex-col rounded-lg bg-accent border border-accent overflow-clip h-fit">
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
              "relative flex items-center justify-center h-24 sm:h-20 bg-background/70 hover:bg-background/50 transition-colors",
              now.getDate() === day && "border border-cosmo"
            )}
          >
            <div className="absolute top-1 left-2 font-semibold text-sm">
              {day}
            </div>

            <div className="flex flex-col gap-1">
              {artists
                .filter(
                  (a) => calendar[day]?.[a.contracts.Objekt.toLowerCase()]
                )
                .map((a) => (
                  <div key={a.name} className="flex items-center gap-2">
                    <ArtistIcon artist={a.name} />
                    <span>
                      {calendar[day]?.[a.contracts.Objekt.toLowerCase()] ?? 0}
                    </span>
                  </div>
                ))}
            </div>
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
