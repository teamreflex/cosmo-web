import {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoUpcomingGravity,
} from "@/lib/universal/cosmo/gravity";
import { isFuture, isPast } from "date-fns";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import GravityEventType from "./gravity-event-type";
import GravityUpcomingTimestamp from "./gravity-upcoming-timestamp";
import { PropsWithChildren } from "react";
import Countdown from "./ongoing/countdown";

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
      href={`/gravity/${gravity.artist}/${gravity.id}`}
      className="w-full bg-accent/50 rounded-lg border border-white/20 flex items-center hover:bg-accent/40 transition-colors gap-4 p-4 h-28"
    >
      <div className="h-[70px] aspect-square relative rounded">
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

          {gravity.result !== undefined ? (
            <p className="font-semibold">
              {gravity.result.totalComoUsed.toLocaleString()} COMO
            </p>
          ) : (
            <p className="font-semibold">Results coming soon</p>
          )}

          <GravityEventType type={gravity.type} />
        </div>

        <ChevronRight className="w-8 h-8 text-white/30 justify-self-end" />
      </div>
    </Link>
  );
}

function GravityUpcoming({ gravity }: { gravity: CosmoUpcomingGravity }) {
  return (
    <GravityUpcomingOrOngoing gravity={gravity}>
      <div className="bg-cosmo-text text-white w-full flex justify-center py-2 gap-2">
        <GravityUpcomingTimestamp at={gravity.entireStartDate} />
      </div>
    </GravityUpcomingOrOngoing>
  );
}

function GravityOngoing({ gravity }: { gravity: CosmoOngoingGravity }) {
  const currentPoll = gravity.polls.find((poll) => {
    return (
      new Date(poll.startDate) <= new Date() &&
      new Date(poll.endDate) >= new Date()
    );
  });

  return (
    <GravityUpcomingOrOngoing gravity={gravity}>
      <Countdown
        pollEndDate={currentPoll?.endDate}
        gravityEndDate={gravity.entireEndDate}
      />
    </GravityUpcomingOrOngoing>
  );
}

function GravityUpcomingOrOngoing({
  children,
  gravity,
}: PropsWithChildren<{ gravity: CosmoUpcomingGravity | CosmoOngoingGravity }>) {
  return (
    <Link
      href={`/gravity/${gravity.artist}/${gravity.id}`}
      className="w-full rounded-xl flex flex-col items-center overflow-hidden group"
    >
      <div className="relative w-full aspect-square">
        <Image
          className="absolute"
          src={gravity.bannerImageUrl}
          alt={gravity.title}
          fill={true}
        />

        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-t from-transparent to-cosmo/10 opacity-0 group-hover:opacity-100 transition-all" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-linear-to-t from-black to-transparent flex flex-col justify-end p-3 gap-3">
          <h2 className="text-2xl sm:text-4xl font-semibold">
            {gravity.title}
          </h2>
          <GravityEventType type={gravity.type} />
        </div>
      </div>
      {children}
    </Link>
  );
}
