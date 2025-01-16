"use client";

import { CosmoActivityBadge } from "@/lib/universal/cosmo/activity/badges";
import Image from "next/image";

type Props = {
  badge: CosmoActivityBadge;
};

export default function Badge({ badge }: Props) {
  return (
    <div className="flex gap-4 items-center h-24">
      <div className="relative h-full aspect-square">
        <Image
          src={badge["2DImage"].originalImage}
          fill={true}
          alt={badge.title}
        />
      </div>

      <div className="flex flex-col">
        <h3 className="text-lg lg:text-xl font-bold">{badge.title}</h3>
        <p className="text-sm">{badge.description}</p>
      </div>
    </div>
  );
}
