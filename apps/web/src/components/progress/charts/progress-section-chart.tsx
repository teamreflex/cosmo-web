import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Stat } from "@/lib/universal/progress";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

const RADIAN = Math.PI / 180;

type Props = {
  data: Stat[];
  colors: Record<string, string>;
};

export default function ProgressSectionChart(props: Props) {
  const data = useMemo(() => {
    const total = props.data.reduce((sum, entry) => sum + entry.count, 0);

    return props.data
      .filter((entry) => (entry.count / total) * 100 >= 1)
      .map((entry) => ({
        ...entry,
        color: props.colors[entry.name] || "var(--foreground)",
      }));
  }, [props.data, props.colors]);

  return (
    <ChartContainer config={{}} className="mx-auto aspect-square h-48 md:h-64">
      <PieChart className="outline-hidden">
        <Pie
          data={data}
          nameKey="name"
          dataKey="count"
          innerRadius="0%"
          outerRadius="80%"
          labelLine={false}
          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
            // only show label if slice is large enough for readability
            if (percent < 0.05) return null;

            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);

            return (
              <text
                className="pointer-events-none text-xs font-semibold drop-shadow"
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              stroke="none"
              className="cursor-pointer outline-hidden transition-transform duration-200 hover:scale-110"
              style={{
                transformOrigin: "50% 50%",
              }}
            />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
      </PieChart>
    </ChartContainer>
  );
}
