"use client";

import { CosmoActivityBadge } from "@/lib/universal/cosmo/activity";
import Image from "next/image";
import Timestamp from "../ui/timestamp";

type Props = {
  badge: CosmoActivityBadge;
};

export default function Badge({ badge }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-2/3 aspect-square">
        <Image
          src={badge["2DImage"].originalImage}
          fill={true}
          alt={badge.title}
        />
      </div>

      <div className="flex flex-col items-center">
        <div className="flex gap-4 items-center">
          <p className="font-bold">{badge.title}</p>
          {badge.claim !== undefined && (
            <Timestamp className="text-sm" timestamp={badge.claim.grantedAt} />
          )}
        </div>
        <p className="text-center text-sm">{badge.description}</p>
      </div>
    </div>
  );
}
