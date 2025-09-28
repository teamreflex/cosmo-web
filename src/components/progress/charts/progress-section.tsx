import ProgressChart from "./chart.client";
import type { Stat } from "@/lib/universal/progress";
import {
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardHeader,
  ExpandableCardTitle,
} from "@/components/ui/expandable-card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  title: string;
  data: Stat[];
  colors: Record<string, string>;
};

export default function ProgressSection(props: Props) {
  const sorted = props.data.sort((a, b) => b.count - a.count);

  return (
    <div className="grid w-full grid-cols-2 justify-center gap-2">
      <div className="h-fit">
        <ExpandableCard>
          <ExpandableCardHeader>
            <ExpandableCardTitle>{props.title}</ExpandableCardTitle>
          </ExpandableCardHeader>
          <ExpandableCardContent className="flex flex-col divide-y divide-accent border-t border-accent">
            {sorted.map((stat, i) => (
              <div
                key={`class-${i}`}
                style={{
                  "--stat-color": props.colors[stat.name],
                }}
                className="flex h-10 items-center justify-between bg-(--stat-color)/10 px-6 transition-colors hover:bg-(--stat-color)/20"
              >
                <span className="text-sm font-semibold">{stat.name}</span>
                <span className="text-xs font-medium">
                  {stat.count.toLocaleString()}
                </span>
              </div>
            ))}
          </ExpandableCardContent>
        </ExpandableCard>
      </div>

      <div className="flex items-start justify-center">
        <ProgressChart data={sorted} colors={props.colors} />
      </div>
    </div>
  );
}

export function ProgressSectionSkeleton() {
  return (
    <div className="grid w-full grid-cols-2 justify-center gap-2">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="aspect-square size-64 rounded-full" />
    </div>
  );
}
