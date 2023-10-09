import {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoUpcomingGravity,
} from "@/lib/server/cosmo";
import { isFuture, isPast } from "date-fns";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import GravityEventType from "./gravity-event-type";

export default function GravityItem({ gravity }: { gravity: CosmoGravity }) {
  if (isPast(new Date(gravity.entireEndDate))) {
    return <GravityPast gravity={gravity as CosmoPastGravity} />;
  }

  if (isFuture(new Date(gravity.entireStartDate))) {
    return <GravityUpcoming gravity={gravity as CosmoUpcomingGravity} />;
  }

  return <GravityOngoing gravity={gravity as CosmoOngoingGravity} />;
}

function GravityPast({ gravity }: { gravity: CosmoPastGravity }) {
  return (
    <Link
      href={`/gravity/${gravity.id}`}
      className="w-full bg-accent/50 rounded-lg border border-white/20 flex items-center hover:bg-accent/40 transition-colors gap-4 p-4"
    >
      <div className="h-[70px] w-[70px] aspect-square relative rounded">
        <Image
          className="rounded"
          src={gravity.bannerImageUrl}
          alt={gravity.title}
          fill={true}
        />
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <p className="text-xs opacity-75">{gravity.title}</p>
          <p className="font-semibold">{gravity.result.totalComoUsed} COMO</p>
          <GravityEventType type={gravity.type} />
        </div>

        <ChevronRight className="w-8 h-8 text-white/30 justify-self-end" />
      </div>
    </Link>
  );
}

function GravityUpcoming({ gravity }: { gravity: CosmoUpcomingGravity }) {
  return null;
}

function GravityOngoing({ gravity }: { gravity: CosmoOngoingGravity }) {
  return null;
}
