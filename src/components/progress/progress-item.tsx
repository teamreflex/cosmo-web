import { FinalProgress } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from "lucide-react";

type Props = {
  progress: FinalProgress;
  isSelected: boolean;
  onExpand: () => void;
};

export default function ProgressItem({
  progress,
  isSelected,
  onExpand,
}: Props) {
  const percentage = Math.floor((progress.progress / progress.total) * 100);

  return (
    <div
      onClick={onExpand}
      className={cn(
        "flex flex-row justify-between items-center rounded-lg py-3 px-4 border border-transparent bg-accent cursor-pointer h-20",
        percentage === 100 && "border-cosmo"
      )}
    >
      <div className="flex flex-col">
        <h4 className="text-lg font-semibold">{progress.class} Class</h4>

        <p>
          Progress: {progress.progress}/{progress.total} ({percentage}%)
        </p>
      </div>

      {isSelected ? <Minimize2 /> : <Maximize2 />}
    </div>
  );
}
