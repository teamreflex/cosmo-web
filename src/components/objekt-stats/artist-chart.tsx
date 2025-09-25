import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { HourlyBreakdown } from "@/lib/universal/stats";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { artistColors } from "@/lib/utils";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  data: Record<string, HourlyBreakdown[]>;
};

export default function ArtistChart({ artists, data }: Props) {
  const config = artists.reduce(
    (acc, artist) => ({
      ...acc,
      [artist.id.toLowerCase()]: {
        label: artist.title,
        color: artistColors[artist.id],
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
    const artistData: Record<string, number> = {};
    for (const [artistId, breakdown] of Object.entries(data)) {
      const artistBreakdown = breakdown.find((b) => b.timestamp === hour);
      artistData[artistId.toLowerCase()] = artistBreakdown?.count || 0;
    }

    return {
      hour: new Date(hour).toLocaleTimeString([], {
        hour: "numeric",
        hour12: true,
      }),
      ...artistData,
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
          content={<ChartTooltipContent indicator="dot" />}
        />
        {artists.map((artist, index) => (
          <Area
            key={artist.id}
            dataKey={artist.id.toLowerCase()}
            type="monotone"
            baseValue={0}
            fill={`var(--color-${artist.id.toLowerCase()})`}
            fillOpacity={0.4}
            stroke={`var(--color-${artist.id.toLowerCase()})`}
            stackId={index}
          />
        ))}

        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
