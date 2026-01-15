import type { SeasonProgress } from "@/lib/universal/progress";
import { classSort } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useState } from "react";
import ProgressClass from "./progress-class";
import ProgressObjektGrid from "./progress-objekt-grid";

type Props = {
  artist: ValidArtist;
  season: string;
  classes: SeasonProgress[];
};

export default function ProgressSeason({ artist, season, classes }: Props) {
  const [selectedClass, setSelectedClass] = useState<SeasonProgress>();

  const total = classes.reduce((acc, progress) => acc + progress.total, 0);
  let progress = classes.reduce((acc, p) => acc + p.progress, 0);
  const unobtainable = classes.reduce((acc, p) => acc + p.unobtainable, 0);

  // if the user has 100%, add their unobtainables in
  if (total === progress) {
    progress += unobtainable;
  }

  const percentage = Math.floor((progress / total) * 100);

  function toggleSelected(item: SeasonProgress) {
    setSelectedClass((prev) => {
      return prev?.key === item.key ? undefined : item;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-cosmo text-xl uppercase">{season}</h3>
        <p className="text-sm font-semibold">
          {progress}/{total} ({percentage}%)
        </p>
      </div>

      <div
        style={{
          "--class-count": classes.length.toString(),
        }}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-[repeat(var(--class-count),_minmax(0,_1fr))]"
      >
        {classes
          .sort((a, b) => classSort(a.class, b.class, artist))
          .map((p) => (
            <ProgressClass
              key={p.key}
              progress={p}
              onExpand={() => toggleSelected(p)}
              isSelected={
                selectedClass !== undefined && selectedClass.key === p.key
              }
            />
          ))}
      </div>

      {selectedClass && (
        <ProgressObjektGrid
          title={selectedClass.class}
          collections={selectedClass.collections}
        />
      )}
    </div>
  );
}
