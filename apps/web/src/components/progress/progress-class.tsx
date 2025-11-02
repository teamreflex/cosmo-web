import { Expand, Shrink } from "lucide-react";
import type { SeasonProgress } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import { m } from "@/i18n/messages";

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
        "group relative flex min-h-26 flex-col justify-between overflow-hidden rounded-lg border bg-gradient-to-br from-cosmo/7 to-cosmo/2 p-4 shadow-sm transition-colors hover:bg-cosmo/4",
        isComplete ? "border-green-500/50" : "border-cosmo/50",
      )}
      onClick={onExpand}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {m.progress_class({ class: progress.class })}
        </h3>
        <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>

      <div className="mt-4">
        <div className="mt-1 flex items-center justify-between">
          <div className="font-medium">
            {owned}/{progress.total} ({percentage}%)
          </div>

          {isComplete && (
            <div className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-foreground dark:text-green-300">
              {m.progress_complete()}
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-0 bottom-0 left-0 h-1 overflow-hidden rounded-b-lg bg-muted">
        <div
          className={cn("h-full", isComplete ? "bg-green-500" : "bg-cosmo")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
