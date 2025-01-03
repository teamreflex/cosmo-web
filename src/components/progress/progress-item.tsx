import { SeasonProgress } from "@/lib/universal/progress";
import { Maximize2, Minimize2 } from "lucide-react";

type Props = {
  progress: SeasonProgress;
  isSelected: boolean;
  onExpand: () => void;
};

export default function ProgressItem({
  progress,
  isSelected,
  onExpand,
}: Props) {
  let owned = progress.progress;
  if (progress.total === progress.progress) {
    owned += progress.unobtainable;
  }

  const percentage = Math.floor((owned / progress.total) * 100);

  return (
    <div
      data-complete={percentage >= 100}
      onClick={onExpand}
      className="flex flex-row justify-between items-center rounded-lg py-3 px-4 border border-transparent data-[complete=true]:border-cosmo bg-accent cursor-pointer h-20"
    >
      <div className="flex flex-col">
        <h4 className="text-lg font-semibold">{progress.class} Class</h4>

        <p>
          Progress: {owned}/{progress.total} ({percentage}%)
        </p>
      </div>

      {isSelected ? <Minimize2 /> : <Maximize2 />}
    </div>
  );
}
