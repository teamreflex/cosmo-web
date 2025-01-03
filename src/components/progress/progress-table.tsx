"use client";

import { SeasonProgress } from "@/lib/universal/progress";
import { useSuspenseQuery } from "@tanstack/react-query";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { ofetch } from "ofetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import ProgressSeason from "./progress-season";
import ProgressLeaderboard from "./progress-leaderboard";
import { baseUrl } from "@/lib/utils";

type Props = {
  address: string;
  member: string;
};

export default function ProgressTable({ address, member }: Props) {
  const [onlineType, setOnlineType] = useQueryState(
    "filter",
    parseAsStringEnum(["combined", "online", "offline"])
  );

  const { data } = useSuspenseQuery({
    queryKey: ["progress", address, member],
    queryFn: async () => {
      const url = new URL(
        `/api/progress/breakdown/${member}/${address}`,
        baseUrl()
      );
      return await ofetch<SeasonProgress[]>(url.toString());
    },
  });

  // used to invalidate the selected/expanded class
  const key = `${member}:${onlineType ?? "combined"}`;

  /**
   * filter out any season-class combos that have no totals and group by season.
   */
  const items = data
    .filter((progress) => progress.total > 0)
    .reduce((acc, progress) => {
      if (!acc[progress.season]) {
        acc[progress.season] = [];
      }

      // apply filter
      if (progress.type === "combined" && onlineType === null) {
        acc[progress.season].push(progress);
      } else if (progress.type === onlineType) {
        acc[progress.season].push(progress);
      }

      return acc;
    }, {} as Record<string, SeasonProgress[]>);

  // filter out any seasons that have no class/online type combinations
  const seasons = Object.entries(items).filter(
    ([_, classes]) => classes.length > 0
  );

  // calculate total progress
  let { progress, total, unobtainable } = Object.values(items)
    .flat()
    .reduce(
      (acc, progress) => ({
        progress: acc.progress + progress.progress,
        total: acc.total + progress.total,
        unobtainable: acc.unobtainable + progress.unobtainable,
      }),
      { progress: 0, total: 0, unobtainable: 0 }
    );

  // if the user has 100%, add their unobtainables in
  if (total === progress) {
    progress += unobtainable;
  }

  const percentage = Math.floor((progress / total) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-flow-row sm:items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col md:flex-row md:items-center md:gap-2">
            <h1 className="text-2xl md:text-3xl font-bold font-cosmo uppercase">
              {member}
            </h1>
            <p className="text-sm font-semibold">
              {progress}/{total} ({percentage}%)
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <ProgressLeaderboard member={member} />
            <FilterSelect
              value={onlineType ?? "combined"}
              update={setOnlineType}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {seasons.map(([season, classes]) => (
            <ProgressSeason
              key={`${key}:${season}`}
              season={season}
              classes={classes}
            />
          ))}
        </div>
      </div>
    </div>
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
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="combined">Combined</SelectItem>
        <SelectItem value="offline">Physical</SelectItem>
        <SelectItem value="online">Digital</SelectItem>
      </SelectContent>
    </Select>
  );
}
