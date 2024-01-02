"use client";

import { FinalProgress } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";

type Props = {
  address: string;
  member: string;
};

export default function ProgressTable({ address, member }: Props) {
  const { data } = useSuspenseQuery({
    queryKey: ["progress", address, member],
    queryFn: async () => {
      return await ofetch<FinalProgress[]>(`/api/progress/${address}`, {
        query: { member },
      });
    },
  });

  /**
   * filter out any season-class combos that have no totals
   * and group by season
   */
  const items = data
    .filter((progress) => progress.total > 0)
    .reduce((acc, progress) => {
      if (!acc[progress.season]) {
        acc[progress.season] = [];
      }
      acc[progress.season].push(progress);
      return acc;
    }, {} as Record<string, FinalProgress[]>);

  return (
    <div className="flex flex-col sm:items-center gap-4">
      <h1 className="text-3xl font-bold font-cosmo uppercase">{member}</h1>

      <div className="flex flex-col gap-6">
        {Object.entries(items).map(([season, classes]) => (
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
