"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { HourlyBreakdown } from "@/lib/universal/stats";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  data: Record<string, HourlyBreakdown[]>;
  selectedMembers: string[];
};

export default function MemberChart({ artists, data, selectedMembers }: Props) {
  const members = artists
    .flatMap((artist) => artist.artistMembers)
    .filter((m) => selectedMembers.includes(m.name));
  const config = members.reduce(
    (acc, member) => ({
      ...acc,
      [member.name.toLowerCase()]: {
        label: member.name,
        color: member.primaryColorHex,
      },
    }),
    {}
  ) satisfies ChartConfig;

  // get all hours from data
  const hours = new Set(
    Object.values(data).flatMap((breakdown) =>
      breakdown.map((b) => b.timestamp)
    )
  );

  const chartData = Array.from(hours).map((hour) => {
    const memberData: Record<string, number> = {};
    for (const [memberName, breakdown] of Object.entries(data)) {
      const memberBreakdown = breakdown.find((b) => b.timestamp === hour);
      memberData[memberName.toLowerCase()] = memberBreakdown?.count || 0;
    }

    return {
      hour: new Date(hour).toLocaleTimeString([], {
        hour: "numeric",
        hour12: true,
      }),
      ...memberData,
    };
  });

  return (
    <ChartContainer className="aspect-auto h-96" config={config}>
      <AreaChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} horizontal={false} />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value, index) => (index % 2 === 0 ? value : "")}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" limit={10} />}
        />
        {members.map((member) => (
          <Area
            key={member.id}
            dataKey={member.name.toLowerCase()}
            type="monotone"
            baseValue={0}
            fill={`var(--color-${member.name.toLowerCase()})`}
            fillOpacity={0.4}
            stroke={`var(--color-${member.name.toLowerCase()})`}
            stackId="a"
          />
        ))}

        <ChartLegend className="flex-wrap" content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
