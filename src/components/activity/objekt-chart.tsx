"use client";

import { CosmoActivityMyObjektMember } from "@/lib/universal/cosmo/activity/my-objekt";
import { PieChart, Pie, Cell } from "recharts";
import Hydrated from "../hydrated";

const RADIAN = Math.PI / 180;

type Props = {
  members: CosmoActivityMyObjektMember[];
};

export default function ObjektChart({ members }: Props) {
  return (
    <Hydrated>
      <PieChart className="outline-hidden" height={224} width={224}>
        <Pie
          data={members}
          nameKey="name"
          dataKey="count"
          innerRadius={60}
          outerRadius={100}
          labelLine={false}
          stroke="hsl(var(--accent))"
          strokeWidth={2}
          label={({
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            percent,
            index,
          }) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);

            return (
              <text
                className="text-xs font-semibold"
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
          {members.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              className="outline-hidden"
            />
          ))}
        </Pie>
      </PieChart>
    </Hydrated>
  );
}
