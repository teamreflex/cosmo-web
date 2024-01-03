"use client";

import { FinalProgress } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { parseAsStringEnum, useQueryState } from "next-usequerystate";
import { ofetch } from "ofetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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
      return await ofetch<FinalProgress[]>(`/api/progress/${address}`, {
        query: { member },
      });
    },
  });

  /**
   * filter out any season-class combos that have no totals and group by season.
   * lol this sucks
   */
  const items = data
    .filter((progress) => progress.total > 0)
    .reduce((acc, progress, _, arr) => {
      if (!acc[progress.season]) {
        acc[progress.season] = [];
      }

      // check if the class already exists in this season
      const classExists =
        acc[progress.season].findIndex((p) => p.class === progress.class) !==
        -1;

      // if filter is combined, merge both physical and digital progresses
      if (onlineType === null && classExists === false) {
        // find pairs
        const matching = arr.filter(
          (p) => p.season === progress.season && p.class === progress.class
        );

        // merge pairs
        acc[progress.season].push(
          matching.reduce(
            (acc, p) => {
              acc.total += p.total;
              acc.progress += p.progress;
              return acc;
            },
            { ...progress, total: 0, progress: 0 }
          )
        );
      }

      // apply filter
      if (progress.type === onlineType) {
        acc[progress.season].push(progress);
      }

      return acc;
    }, {} as Record<string, FinalProgress[]>);

  // filter out any seasons that have no class/online type combinations
  const seasons = Object.entries(items).filter(
    ([_, classes]) => classes.length > 0
  );

  return (
    <div className="grid grid-flow-row sm:items-center gap-4">
      <div className="flex items-center justify-between w-full">
        <h1 className="text-3xl font-bold font-cosmo uppercase">{member}</h1>
        <FilterSelect value={onlineType ?? "combined"} update={setOnlineType} />
      </div>

      <div className="flex flex-col gap-6">
        {seasons.map(([season, classes]) => (
          <ProgressSeason key={season} season={season} classes={classes} />
        ))}
      </div>
    </div>
  );
}

function ProgressSeason({
  season,
  classes,
}: {
  season: string;
  classes: FinalProgress[];
}) {
  const total = classes.reduce((acc, progress) => acc + progress.total, 0);
  const progress = classes.reduce(
    (acc, progress) => acc + progress.progress,
    0
  );
  const percentage = Math.round((progress / total) * 100);

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
      <div className="flex items-center justify-between col-span-3">
        <h3 className="text-xl font-bold font-cosmo uppercase">{season}</h3>
        <p className="text-sm font-semibold">
          {progress}/{total} ({percentage}%)
        </p>
      </div>

      {classes.map((p) => (
        <ProgressItem key={p.key} progress={p} />
      ))}
    </div>
  );
}

function ProgressItem({ progress }: { progress: FinalProgress }) {
  const percentage = Math.round((progress.progress / progress.total) * 100);
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg py-3 px-4 border border-transparent bg-accent",
        percentage === 100 && "border-cosmo"
      )}
    >
      <h4 className="text-lg font-semibold">{progress.class} Class</h4>

      <p>
        Progress: {progress.progress}/{progress.total} ({percentage}%)
      </p>
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
