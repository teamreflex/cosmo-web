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
import GravityUpcomingTimestamp from "./gravity-upcoming-timestamp";

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
  return (
    <Link
      href={`/gravity/${gravity.id}`}
      className="w-full rounded-lg flex flex-col items-center overflow-hidden group"
    >
      <div className="relative w-full aspect-square">
        <Image
          className="absolute"
          src={gravity.bannerImageUrl}
          alt={gravity.title}
          fill={true}
        />

        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-black to-transparent flex flex-col justify-end p-3 gap-3 group-hover:to-cosmo/5">
          <h2 className="text-2xl sm:text-4xl font-semibold">
            {gravity.title}
          </h2>
          <GravityEventType type={gravity.type} />
        </div>
      </div>
      <div className="bg-cosmo-text text-white w-full flex justify-center py-2 gap-2">
        <GravityUpcomingTimestamp at={gravity.entireStartDate} />
      </div>
    </Link>
  );
}

function GravityOngoing({ gravity }: { gravity: CosmoOngoingGravity }) {
  return null;
}
