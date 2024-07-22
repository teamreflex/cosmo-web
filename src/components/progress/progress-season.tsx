import { FinalProgress } from "@/lib/universal/progress";
import { useEffect, useState } from "react";
import ProgressItem from "./progress-item";
import ProgressObjektGrid from "./progress-objekt-grid";

type Props = {
  season: string;
  classes: FinalProgress[];
  filter: string;
};

export default function ProgressSeason({ season, classes, filter }: Props) {
  const [selectedClass, setSelectedClass] = useState<FinalProgress>();

  // reset selected class when filter changes
  useEffect(() => {
    setSelectedClass(undefined);
  }, [filter]);

  const total = classes.reduce((acc, progress) => acc + progress.total, 0);
  const progress = classes.reduce(
    (acc, progress) => acc + progress.progress,
    0
  );
  const percentage = Math.floor((progress / total) * 100);

  function toggleSelected(item: FinalProgress) {
    setSelectedClass((prev) => {
      return prev?.key === item.key ? undefined : item;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
        <div className="flex items-center justify-between col-span-3">
          <h3 className="text-xl font-bold font-cosmo uppercase">{season}</h3>
          <p className="text-sm font-semibold">
            {progress}/{total} ({percentage}%)
          </p>
        </div>

        {classes.map((p) => (
          <ProgressItem
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
