import { useSuspenseQueries } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import ProgressSeason from "./progress-season";
import ProgressLeaderboard from "./progress-leaderboard";
import type { SeasonProgress } from "@/lib/universal/progress";
import type { ValidOnlineType } from "@/lib/universal/cosmo/common";
import { filterDataQuery } from "@/lib/queries/core";
import { progressBreakdownQuery } from "@/lib/queries/progress";

type Props = {
  address: string;
  member: string;
  onlineType: ValidOnlineType | undefined;
  setOnlineType: (value: ValidOnlineType | undefined) => void;
};

export default function ProgressTable(props: Props) {
  const [progressQuery, seasonsQuery] = useSuspenseQueries({
    queries: [
      progressBreakdownQuery(props.address, props.member),
      filterDataQuery,
    ],
  });

  // used to invalidate the selected/expanded class
  const key = `${props.member}:${props.onlineType ?? "combined"}`;

  /**
   * filter out any season-class combos that have no totals and group by season.
   */
  const items = progressQuery.data
    .filter((progress) => progress.total > 0)
    .reduce(
      (acc, progress) => {
        if (!acc[progress.season]) {
          acc[progress.season] = [];
        }

        // apply filter
        if (progress.type === "combined" && props.onlineType === undefined) {
          acc[progress.season]?.push(progress);
        } else if (progress.type === props.onlineType) {
          acc[progress.season]?.push(progress);
        }

        return acc;
      },
      {} as Record<string, SeasonProgress[]>,
    );

  // filter out any seasons that have no class/online type combinations
  const seasons = Object.entries(items).filter(
    ([_, classes]) => classes.length > 0,
  );

  // calculate total progress
  // eslint-disable-next-line prefer-const
  let { progress, total, unobtainable } = Object.values(items)
    .flat()
    .reduce(
      (acc, p) => ({
        progress: acc.progress + p.progress,
        total: acc.total + p.total,
        unobtainable: acc.unobtainable + p.unobtainable,
      }),
      { progress: 0, total: 0, unobtainable: 0 },
    );

  // if the user has 100%, add their unobtainables in
  if (total === progress) {
    progress += unobtainable;
  }

  const percentage = Math.floor((progress / total) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-flow-row gap-4 sm:items-center">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center md:gap-2">
            <h1 className="font-cosmo text-2xl uppercase md:text-3xl">
              {props.member}
            </h1>
            <p className="text-sm font-semibold">
              {progress}/{total} ({percentage}%)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ProgressLeaderboard
              member={props.member}
              seasons={seasonsQuery.data.seasons}
            />
            <FilterSelect
              value={props.onlineType}
              update={props.setOnlineType}
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
  value: ValidOnlineType | undefined;
  update: (value: ValidOnlineType | undefined) => void;
}) {
  function set(v: string) {
    update(v === "combined" ? undefined : (v as ValidOnlineType));
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
