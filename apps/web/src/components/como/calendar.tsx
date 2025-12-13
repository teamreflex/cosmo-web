import { IconSparkles } from "@tabler/icons-react";
import ArtistIcon from "../artist-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import type { ObjektWithCollection } from "@/lib/universal/como";
import { buildCalendar, getDays } from "@/lib/universal/como";
import { cn } from "@/lib/utils";
import { m } from "@/i18n/messages";

type Props = {
  artists: CosmoArtistBFF[];
  transfers: ObjektWithCollection[];
};

function getWeek() {
  return [
    m.como_calendar_mon(),
    m.como_calendar_tue(),
    m.como_calendar_wed(),
    m.como_calendar_thu(),
    m.como_calendar_fri(),
    m.como_calendar_sat(),
    m.como_calendar_sun(),
  ];
}

export default function ComoCalendar({ artists, transfers }: Props) {
  // run date functions in client
  const now = new Date();
  const days = getDays(now);
  const startOffset =
    (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  const offset = Array.from({ length: startOffset }, (_, i) => i + 1);
  const remainder = Array.from(
    { length: (7 - ((days.length + startOffset) % 7)) % 7 },
    (_, i) => i + 1,
  );

  const calendar = buildCalendar(now, transfers);
  const week = getWeek();

  return (
    <div className="flex h-fit flex-col overflow-hidden rounded-lg border border-secondary bg-secondary text-clip">
      {/* days of the week */}
      <div className="grid grid-cols-7 gap-px border-b border-secondary">
        {week.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center bg-background/80 py-2 font-bold"
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
              "relative flex h-24 flex-col items-center justify-center gap-1 bg-background/70 transition-colors hover:bg-background/50 sm:h-20",
              now.getDate() === day && "border border-cosmo",
            )}
          >
            <p className="absolute top-1 left-2 text-sm font-semibold">{day}</p>

            {artists
              .filter((a) => calendar[day]?.[a.id.toLowerCase()])
              .map((a) => (
                <div className="contents" key={a.name}>
                  <div className="absolute top-1 right-1">
                    {(calendar[day]?.[a.id.toLowerCase()]?.carried ?? 0) >
                      0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <IconSparkles className="h-5 w-5 text-yellow-600" />
                          </TooltipTrigger>
                          <TooltipContent className="flex flex-col gap-1">
                            <p className="font-semibold">
                              {m.como_carried_over()}
                            </p>

                            <div className="flex items-center justify-center gap-2">
                              <ArtistIcon artist={a.name} />
                              <span>
                                {calendar[day]?.[a.id.toLowerCase()]?.carried ??
                                  0}
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
                      {calendar[day]?.[a.id.toLowerCase()]?.count ?? 0}
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
