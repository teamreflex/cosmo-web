"use client";

import { FinalProgress } from "@/lib/universal/progress";
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

type Props = {
  address: string;
  member: string;
};

export default function ProgressTable({ address, member }: Props) {
  const [onlineType, setOnlineType] = useQueryState(
    "filter",
    parseAsStringEnum(["combined", "online", "offline"])
  );

  // used to invalidate the selected/expanded class
  const key = `${member}:${onlineType ?? "combined"}`;

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
          <ProgressSeason
            key={season}
            season={season}
            classes={classes}
            filter={key}
          />
        ))}
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
