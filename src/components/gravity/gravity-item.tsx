import {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoUpcomingGravity,
} from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import { isFuture, isPast } from "date-fns";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
          <p>{gravity.result.totalComoUsed} COMO</p>
          <p
            className={cn(
              "px-2 py-1 text-xs font-semibold rounded w-fit",
              gravity.type === "grand-gravity" && "bg-cosmo-text text-cosmo",
              gravity.type === "event-gravity" && "bg-teal-300/80 text-teal-900"
            )}
          >
            {gravity.type === "grand-gravity" ? "Grand" : "Event"}
          </p>
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
