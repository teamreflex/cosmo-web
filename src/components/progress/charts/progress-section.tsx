"use client";

import {
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardHeader,
  ExpandableCardTitle,
} from "@/components/ui/expandable-card";
import ProgressChart from "./chart.client";
import type { Stat } from "@/lib/universal/progress";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  title: string;
  data: Stat[];
  colors: Record<string, string>;
};

export default function ProgressSection(props: Props) {
  const sorted = props.data.sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-2 justify-center gap-2 w-full">
      <div className="h-fit">
        <ExpandableCard>
          <ExpandableCardHeader>
            <ExpandableCardTitle>{props.title}</ExpandableCardTitle>
          </ExpandableCardHeader>
          <ExpandableCardContent className="flex flex-col border-t border-accent divide-y divide-accent">
            {sorted.map((stat, i) => (
              <div
                key={`class-${i}`}
                style={{
                  "--stat-color": props.colors[stat.name],
                }}
                className="flex items-center justify-between h-10 px-6 bg-(--stat-color)/10 hover:bg-(--stat-color)/20 transition-colors"
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
    <div className="grid grid-cols-2 justify-center gap-2 w-full">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="aspect-square size-64 rounded-full" />
    </div>
  );
}
