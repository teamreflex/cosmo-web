import { Expand, Shrink } from "lucide-react";
import type { SeasonProgress } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";

type Props = {
  progress: SeasonProgress;
  isSelected: boolean;
  onExpand: () => void;
};

export default function ProgressClass({
  progress,
  isSelected,
  onExpand,
}: Props) {
  let owned = progress.progress;
  if (progress.total === progress.progress) {
    owned += progress.unobtainable;
  }

  const percentage = Math.floor((owned / progress.total) * 100);
  const isComplete = percentage >= 100;
  const width = Math.min(percentage, 100);
  const Icon = isSelected ? Shrink : Expand;

  return (
    <div
      className={cn(
        "group min-h-26 relative flex flex-col justify-between rounded-lg border p-4 bg-gradient-to-br from-cosmo/7 to-cosmo/2 hover:bg-cosmo/4 transition-colors shadow-sm overflow-hidden",
        isComplete ? "border-green-500/50" : "border-cosmo/50",
      )}
      onClick={onExpand}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{progress.class} Class</h3>
        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mt-1">
          <div className="font-medium">
            {owned}/{progress.total} ({percentage}%)
          </div>

          {isComplete && (
            <div className="text-xs px-2 py-0.5 bg-green-500/20 dark:text-green-300 text-foreground rounded-full">
              Complete
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
        <div
          className={cn("h-full", isComplete ? "bg-green-500" : "bg-cosmo")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
